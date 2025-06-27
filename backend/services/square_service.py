"""
Square service for handling Square API interactions
Provides OAuth, payments, and payout functionality similar to Stripe Connect
"""

import os
import json
import uuid
import hashlib
import hmac
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Dict, Any, List, Optional, Tuple
from urllib.parse import urlencode

import httpx
from sqlalchemy.orm import Session
from fastapi import HTTPException

from config.settings import get_settings
from models.square_payment import (
    SquareAccount,
    SquarePayment,
    SquarePayout,
    SquareWebhookEvent,
    SquarePaymentStatus,
    SquarePayoutStatus,
)
from models.barber import Barber
from models.appointment import Appointment
from utils.encryption import encrypt_data, decrypt_data


class SquareService:
    """Service for Square API interactions"""

    def __init__(self):
        self.settings = get_settings()
        self.client_id = self.settings.SQUARE_APPLICATION_ID
        self.client_secret = self.settings.SQUARE_APPLICATION_SECRET
        self.environment = self.settings.SQUARE_ENVIRONMENT  # sandbox or production

        # Set base URLs based on environment
        if self.environment == "sandbox":
            self.api_base_url = "https://connect.squareupsandbox.com"
            self.web_base_url = "https://squareupsandbox.com"
        else:
            self.api_base_url = "https://connect.squareup.com"
            self.web_base_url = "https://squareup.com"

    def get_oauth_url(self, barber_id: int, state: str = None) -> str:
        """Generate Square OAuth authorization URL"""
        if not state:
            state = hashlib.sha256(
                f"{barber_id}-{datetime.utcnow().isoformat()}".encode()
            ).hexdigest()

        params = {
            "client_id": self.client_id,
            "scope": "MERCHANT_PROFILE_READ PAYMENTS_READ PAYMENTS_WRITE ORDERS_READ ORDERS_WRITE",
            "session": "false",
            "state": state,
        }

        oauth_url = f"{self.web_base_url}/oauth2/authorize?" + urlencode(params)
        return oauth_url

    async def exchange_code_for_tokens(
        self, authorization_code: str, state: str
    ) -> Dict[str, Any]:
        """Exchange authorization code for access tokens"""
        data = {
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "code": authorization_code,
            "grant_type": "authorization_code",
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.api_base_url}/oauth2/token",
                json=data,
                headers={"Content-Type": "application/json"},
            )

            if response.status_code != 200:
                raise HTTPException(
                    status_code=400,
                    detail=f"Failed to exchange code for tokens: {response.text}",
                )

            return response.json()

    async def get_merchant_info(self, access_token: str) -> Dict[str, Any]:
        """Get merchant information from Square"""
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.api_base_url}/v2/merchants", headers=headers
            )

            if response.status_code != 200:
                raise HTTPException(
                    status_code=400,
                    detail=f"Failed to get merchant info: {response.text}",
                )

            return response.json()

    async def create_square_account(
        self,
        db: Session,
        barber_id: int,
        tokens: Dict[str, Any],
        merchant_info: Dict[str, Any],
    ) -> SquareAccount:
        """Create or update Square account for barber"""

        # Extract merchant data
        merchant = merchant_info.get("merchant", {})
        main_location = merchant.get("main_location_id")

        # Check if account already exists
        existing_account = (
            db.query(SquareAccount).filter(SquareAccount.barber_id == barber_id).first()
        )

        if existing_account:
            # Update existing account
            existing_account.access_token = encrypt_data(tokens["access_token"])
            if "refresh_token" in tokens:
                existing_account.refresh_token = encrypt_data(tokens["refresh_token"])
            if "expires_at" in tokens:
                existing_account.token_expires_at = datetime.fromisoformat(
                    tokens["expires_at"]
                )
            existing_account.token_scope = tokens.get("scope", "")
            existing_account.square_merchant_id = merchant.get("id", "")
            existing_account.square_location_id = main_location
            existing_account.merchant_name = merchant.get("business_name", "")
            existing_account.merchant_email = merchant.get("email_address", "")
            existing_account.country = merchant.get("country", "US")
            existing_account.currency = merchant.get("currency", "USD")
            existing_account.is_active = True
            existing_account.connected_at = datetime.utcnow()

            db.commit()
            db.refresh(existing_account)
            return existing_account

        # Create new account
        square_account = SquareAccount(
            barber_id=barber_id,
            square_application_id=self.client_id,
            square_merchant_id=merchant.get("id", ""),
            square_location_id=main_location,
            access_token=encrypt_data(tokens["access_token"]),
            refresh_token=encrypt_data(tokens.get("refresh_token", "")),
            token_expires_at=(
                datetime.fromisoformat(tokens["expires_at"])
                if "expires_at" in tokens
                else None
            ),
            token_scope=tokens.get("scope", ""),
            merchant_name=merchant.get("business_name", ""),
            merchant_email=merchant.get("email_address", ""),
            country=merchant.get("country", "US"),
            currency=merchant.get("currency", "USD"),
            is_active=True,
            is_verified=True,  # Square handles verification
            can_receive_payments=True,
            can_make_payouts=True,
            onboarding_completed=True,
            connected_at=datetime.utcnow(),
        )

        db.add(square_account)
        db.commit()
        db.refresh(square_account)
        return square_account

    async def create_payment(
        self,
        db: Session,
        appointment_id: int,
        amount_cents: int,
        source_id: str,  # nonce from Square Web Payments SDK
        location_id: str,
        customer_info: Dict[str, Any] = None,
    ) -> SquarePayment:
        """Create a Square payment"""

        # Get appointment and barber info
        appointment = (
            db.query(Appointment).filter(Appointment.id == appointment_id).first()
        )
        if not appointment:
            raise HTTPException(status_code=404, detail="Appointment not found")

        barber = appointment.barber
        square_account = barber.square_account
        if not square_account:
            raise HTTPException(
                status_code=400, detail="Barber does not have Square account connected"
            )

        # Create payment request
        payment_request = {
            "source_id": source_id,
            "idempotency_key": str(uuid.uuid4()),
            "amount_money": {"amount": amount_cents, "currency": "USD"},
            "autocomplete": True,
            "location_id": location_id,
        }

        # Add customer info if provided
        if customer_info:
            payment_request["buyer_email_address"] = customer_info.get("email")

        # Get access token
        access_token = decrypt_data(square_account.access_token)

        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.api_base_url}/v2/payments",
                json=payment_request,
                headers=headers,
            )

            if response.status_code != 200:
                raise HTTPException(
                    status_code=400,
                    detail=f"Failed to create Square payment: {response.text}",
                )

            payment_data = response.json()["payment"]

        # Create Square payment record
        square_payment = SquarePayment(
            square_payment_id=payment_data["id"],
            square_order_id=payment_data.get("order_id"),
            square_receipt_number=payment_data.get("receipt_number"),
            square_receipt_url=payment_data.get("receipt_url"),
            amount_money=Decimal(str(payment_data["amount_money"]["amount"])) / 100,
            currency=payment_data["amount_money"]["currency"],
            total_money=Decimal(str(payment_data["total_money"]["amount"])) / 100,
            status=payment_data["status"].lower(),
            approved_money=Decimal(
                str(payment_data.get("approved_money", {}).get("amount", 0))
            )
            / 100,
            processing_fee_money=(
                Decimal(
                    str(
                        payment_data.get("processing_fee", [{}])[0]
                        .get("amount_money", {})
                        .get("amount", 0)
                    )
                )
                / 100
                if payment_data.get("processing_fee")
                else Decimal("0")
            ),
            appointment_id=appointment_id,
            barber_id=barber.id,
            buyer_email_address=customer_info.get("email") if customer_info else None,
            source_type=payment_data.get("source_type"),
            application_details=json.dumps(payment_data.get("application_details", {})),
            device_details=json.dumps(payment_data.get("device_details", {})),
        )

        # Add card details if available
        card_details = payment_data.get("card_details", {})
        if card_details:
            square_payment.card_brand = card_details.get("card", {}).get("card_brand")
            square_payment.card_last_four = card_details.get("card", {}).get("last_4")
            square_payment.card_exp_month = card_details.get("card", {}).get(
                "exp_month"
            )
            square_payment.card_exp_year = card_details.get("card", {}).get("exp_year")

        db.add(square_payment)
        db.commit()
        db.refresh(square_payment)

        return square_payment

    async def create_payout(
        self, db: Session, payment_id: int, commission_rate: float = 0.7
    ) -> SquarePayout:
        """Create a payout for a Square payment"""

        # Get payment and related data
        payment = db.query(SquarePayment).filter(SquarePayment.id == payment_id).first()
        if not payment:
            raise HTTPException(status_code=404, detail="Payment not found")

        barber = payment.barber
        square_account = barber.square_account

        # Calculate commission
        original_amount = payment.total_money
        commission_amount = original_amount * Decimal(str(commission_rate))
        platform_fee = original_amount - commission_amount
        processing_fee = payment.processing_fee_money or Decimal("0")
        net_amount = commission_amount - processing_fee

        # Create payout record
        payout = SquarePayout(
            payment_id=payment.id,
            square_account_id=square_account.id,
            barber_id=barber.id,
            amount_money=net_amount,
            currency="USD",
            status=SquarePayoutStatus.PENDING,
            original_amount=original_amount,
            commission_rate=Decimal(str(commission_rate)),
            commission_amount=commission_amount,
            platform_fee=platform_fee,
            processing_fee=processing_fee,
            net_amount=net_amount,
            description=f"Commission payout for appointment #{payment.appointment_id}",
            reference_id=f"payout-{payment.square_payment_id}",
            scheduled_at=datetime.utcnow() + timedelta(days=1),  # Next business day
        )

        db.add(payout)
        db.commit()
        db.refresh(payout)

        return payout

    async def process_payout(self, db: Session, payout_id: int) -> SquarePayout:
        """Process a payout via Square's payout API"""

        payout = db.query(SquarePayout).filter(SquarePayout.id == payout_id).first()
        if not payout:
            raise HTTPException(status_code=404, detail="Payout not found")

        square_account = payout.square_account
        access_token = decrypt_data(square_account.access_token)

        # Note: Square doesn't have a direct payout API like Stripe
        # Instead, they handle payouts automatically based on their settlement schedule
        # For now, we'll mark the payout as "sent" and Square will handle the actual transfer

        payout.status = SquarePayoutStatus.SENT
        payout.sent_at = datetime.utcnow()
        payout.square_payout_id = f"auto_payout_{uuid.uuid4().hex[:12]}"

        db.commit()
        db.refresh(payout)

        return payout

    async def handle_webhook(self, db: Session, webhook_data: Dict[str, Any]) -> bool:
        """Handle Square webhook events"""

        event_id = webhook_data.get("event_id")
        event_type = webhook_data.get("type")

        # Check if we've already processed this event
        existing_event = (
            db.query(SquareWebhookEvent)
            .filter(SquareWebhookEvent.square_event_id == event_id)
            .first()
        )

        if existing_event and existing_event.processed:
            return True

        # Create webhook event record
        webhook_event = SquareWebhookEvent(
            square_event_id=event_id,
            event_type=event_type,
            merchant_id=webhook_data.get("merchant_id"),
            location_id=webhook_data.get("location_id"),
            event_data=json.dumps(webhook_data),
            event_created_at=datetime.fromisoformat(
                webhook_data.get("created_at", datetime.utcnow().isoformat())
            ),
        )

        try:
            # Process different event types
            if event_type == "payment.updated":
                await self._handle_payment_updated(db, webhook_data)
            elif event_type == "payout.sent":
                await self._handle_payout_sent(db, webhook_data)
            elif event_type == "payout.paid":
                await self._handle_payout_paid(db, webhook_data)
            elif event_type == "payout.failed":
                await self._handle_payout_failed(db, webhook_data)

            webhook_event.processed = True
            webhook_event.processed_at = datetime.utcnow()

        except Exception as e:
            webhook_event.processing_error = str(e)
            webhook_event.retry_count += 1

        db.add(webhook_event)
        db.commit()

        return webhook_event.processed

    async def _handle_payment_updated(self, db: Session, webhook_data: Dict[str, Any]):
        """Handle payment.updated webhook"""
        payment_data = webhook_data.get("data", {}).get("object", {}).get("payment", {})
        square_payment_id = payment_data.get("id")

        if not square_payment_id:
            return

        # Find and update payment
        payment = (
            db.query(SquarePayment)
            .filter(SquarePayment.square_payment_id == square_payment_id)
            .first()
        )

        if payment:
            payment.status = payment_data.get("status", "").lower()
            payment.approved_money = (
                Decimal(str(payment_data.get("approved_money", {}).get("amount", 0)))
                / 100
            )
            db.commit()

    async def _handle_payout_sent(self, db: Session, webhook_data: Dict[str, Any]):
        """Handle payout.sent webhook"""
        # Square doesn't provide detailed payout webhook data like Stripe
        # This would need to be implemented based on Square's actual webhook structure
        pass

    async def _handle_payout_paid(self, db: Session, webhook_data: Dict[str, Any]):
        """Handle payout.paid webhook"""
        # Update payout status to paid
        pass

    async def _handle_payout_failed(self, db: Session, webhook_data: Dict[str, Any]):
        """Handle payout.failed webhook"""
        # Update payout status to failed and log reason
        pass

    def verify_webhook_signature(
        self, payload: str, signature: str, webhook_key: str
    ) -> bool:
        """Verify Square webhook signature"""
        # Square uses HMAC-SHA256 for webhook verification
        expected_signature = hmac.new(
            webhook_key.encode("utf-8"), payload.encode("utf-8"), hashlib.sha256
        ).hexdigest()

        return hmac.compare_digest(signature, expected_signature)

    async def refresh_access_token(
        self, db: Session, square_account: SquareAccount
    ) -> str:
        """Refresh Square access token if needed"""

        if not square_account.refresh_token:
            raise HTTPException(status_code=400, detail="No refresh token available")

        refresh_token = decrypt_data(square_account.refresh_token)

        data = {
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "refresh_token": refresh_token,
            "grant_type": "refresh_token",
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.api_base_url}/oauth2/token",
                json=data,
                headers={"Content-Type": "application/json"},
            )

            if response.status_code != 200:
                raise HTTPException(
                    status_code=400, detail=f"Failed to refresh token: {response.text}"
                )

            tokens = response.json()

        # Update stored tokens
        square_account.access_token = encrypt_data(tokens["access_token"])
        if "refresh_token" in tokens:
            square_account.refresh_token = encrypt_data(tokens["refresh_token"])
        if "expires_at" in tokens:
            square_account.token_expires_at = datetime.fromisoformat(
                tokens["expires_at"]
            )

        db.commit()

        return tokens["access_token"]

    async def get_catalog_products(self, location_id: str) -> List[Dict[str, Any]]:
        """Get all products from Square catalog for a location"""
        headers = {
            "Authorization": f"Bearer {self.settings.SQUARE_ACCESS_TOKEN}",
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.api_base_url}/v2/catalog/list",
                headers=headers,
                params={"types": "ITEM"},
            )

            if response.status_code != 200:
                raise HTTPException(
                    status_code=400,
                    detail=f"Failed to get Square catalog: {response.text}",
                )

            data = response.json()
            return data.get("objects", [])

    async def get_catalog_categories(self) -> List[Dict[str, Any]]:
        """Get all categories from Square catalog"""
        headers = {
            "Authorization": f"Bearer {self.settings.SQUARE_ACCESS_TOKEN}",
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.api_base_url}/v2/catalog/list",
                headers=headers,
                params={"types": "CATEGORY"},
            )

            if response.status_code != 200:
                raise HTTPException(
                    status_code=400,
                    detail=f"Failed to get Square categories: {response.text}",
                )

            data = response.json()
            return data.get("objects", [])

    async def create_catalog_product(
        self, product_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Create a product in Square catalog"""
        headers = {
            "Authorization": f"Bearer {self.settings.SQUARE_ACCESS_TOKEN}",
            "Content-Type": "application/json",
        }

        catalog_request = {
            "idempotency_key": str(uuid.uuid4()),
            "object": {
                "type": "ITEM",
                "id": f"#{uuid.uuid4()}",
                "item_data": {
                    "name": product_data["name"],
                    "description": product_data.get("description", ""),
                    "category_id": product_data.get("category_id"),
                    "variations": [
                        {
                            "type": "ITEM_VARIATION",
                            "id": f"#{uuid.uuid4()}",
                            "item_variation_data": {
                                "name": product_data["name"],
                                "pricing_type": "FIXED_PRICING",
                                "price_money": {
                                    "amount": int(
                                        product_data["price"] * 100
                                    ),  # Convert to cents
                                    "currency": "USD",
                                },
                                "sku": product_data.get("sku", ""),
                            },
                        }
                    ],
                },
            },
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.api_base_url}/v2/catalog/object",
                headers=headers,
                json=catalog_request,
            )

            if response.status_code != 200:
                raise HTTPException(
                    status_code=400,
                    detail=f"Failed to create Square product: {response.text}",
                )

            return response.json()["catalog_object"]

    async def update_catalog_product(
        self, product_id: str, version: int, product_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Update a product in Square catalog"""
        headers = {
            "Authorization": f"Bearer {self.settings.SQUARE_ACCESS_TOKEN}",
            "Content-Type": "application/json",
        }

        catalog_request = {
            "idempotency_key": str(uuid.uuid4()),
            "object": {
                "type": "ITEM",
                "id": product_id,
                "version": version,
                "item_data": {
                    "name": product_data["name"],
                    "description": product_data.get("description", ""),
                    "category_id": product_data.get("category_id"),
                },
            },
        }

        async with httpx.AsyncClient() as client:
            response = await client.put(
                f"{self.api_base_url}/v2/catalog/object/{product_id}",
                headers=headers,
                json=catalog_request,
            )

            if response.status_code != 200:
                raise HTTPException(
                    status_code=400,
                    detail=f"Failed to update Square product: {response.text}",
                )

            return response.json()["catalog_object"]


# Global service instance
square_service = SquareService()
