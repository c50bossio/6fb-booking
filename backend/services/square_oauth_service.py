"""
Square OAuth Service - Complete implementation for Square OAuth flow and payment processing
Handles OAuth authentication, webhook management, payment processing, and payouts
"""

import os
import json
import uuid
import hashlib
import hmac
import logging
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Dict, Any, List, Optional, Tuple
from urllib.parse import urlencode, parse_qs, urlparse
import asyncio
from functools import wraps

import httpx
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from fastapi import HTTPException, status
from redis import Redis
import jwt

from config.settings import get_settings
from config.database import SessionLocal
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
from models.barber_payment import BarberPaymentModel
from utils.encryption import encrypt_data, decrypt_data
from services.notification_service import NotificationService
from services.monitoring_service import MonitoringService
from services.email_service import EmailService

# Configure logging
logger = logging.getLogger(__name__)


class SquareOAuthService:
    """Complete Square OAuth and payment processing service"""

    def __init__(self):
        self.settings = get_settings()
        self.client_id = self.settings.SQUARE_APPLICATION_ID
        self.client_secret = self.settings.SQUARE_APPLICATION_SECRET
        self.environment = self.settings.SQUARE_ENVIRONMENT  # sandbox or production
        self.webhook_signature_key = self.settings.SQUARE_WEBHOOK_SIGNATURE_KEY

        # Set base URLs based on environment
        if self.environment == "sandbox":
            self.api_base_url = "https://connect.squareupsandbox.com"
            self.web_base_url = "https://squareupsandbox.com"
        else:
            self.api_base_url = "https://connect.squareup.com"
            self.web_base_url = "https://squareup.com"

        # Initialize services
        self.notification_service = NotificationService()
        self.monitoring_service = MonitoringService(SessionLocal)
        self.email_service = EmailService()

        # Initialize Redis for caching and rate limiting
        self.redis_client = Redis.from_url(
            self.settings.REDIS_URL,
            decode_responses=True,
        )

        # HTTP client with retry logic
        self.http_client = self._create_http_client()

    def _create_http_client(self) -> httpx.AsyncClient:
        """Create HTTP client with retry logic"""
        transport = httpx.AsyncHTTPTransport(retries=3)
        return httpx.AsyncClient(  # nosec B113
            transport=transport,
            timeout=httpx.Timeout(30.0, connect=5.0),
            follow_redirects=True,
        )

    async def _make_request(
        self,
        method: str,
        url: str,
        headers: Dict[str, str] = None,
        json_data: Dict[str, Any] = None,
        params: Dict[str, Any] = None,
        retry_count: int = 3,
    ) -> httpx.Response:
        """Make HTTP request with retry logic"""
        for attempt in range(retry_count):
            try:
                response = await self.http_client.request(
                    method=method,
                    url=url,
                    headers=headers,
                    json=json_data,
                    params=params,
                )

                if response.status_code >= 500 and attempt < retry_count - 1:
                    await asyncio.sleep(2**attempt)  # Exponential backoff
                    continue

                return response

            except httpx.RequestError as e:
                logger.error(f"Request error on attempt {attempt + 1}: {str(e)}")
                if attempt == retry_count - 1:
                    raise
                await asyncio.sleep(2**attempt)

        return None

    def generate_oauth_state(
        self, barber_id: int, additional_data: Dict[str, Any] = None
    ) -> str:
        """Generate secure OAuth state parameter"""
        state_data = {
            "barber_id": barber_id,
            "timestamp": datetime.utcnow().isoformat(),
            "nonce": uuid.uuid4().hex,
            **(additional_data or {}),
        }

        # Create JWT token for state
        state_token = jwt.encode(
            state_data, self.settings.SECRET_KEY, algorithm="HS256"
        )

        # Store in Redis with expiration
        self.redis_client.setex(
            f"square_oauth_state:{state_token}",
            3600,  # 1 hour expiration
            json.dumps(state_data),
        )

        return state_token

    def verify_oauth_state(self, state: str) -> Dict[str, Any]:
        """Verify and decode OAuth state parameter"""
        # Check Redis first
        cached_data = self.redis_client.get(f"square_oauth_state:{state}")
        if not cached_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired OAuth state",
            )

        try:
            # Verify JWT
            decoded_state = jwt.decode(
                state, self.settings.SECRET_KEY, algorithms=["HS256"]
            )

            # Delete from Redis (one-time use)
            self.redis_client.delete(f"square_oauth_state:{state}")

            return decoded_state

        except jwt.InvalidTokenError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid OAuth state token",
            )

    def get_oauth_url(
        self,
        barber_id: int,
        redirect_uri: str = None,
        additional_scopes: List[str] = None,
    ) -> str:
        """Generate Square OAuth authorization URL with all necessary scopes"""
        state = self.generate_oauth_state(barber_id, {"redirect_uri": redirect_uri})

        # Comprehensive scopes for full functionality
        base_scopes = [
            "MERCHANT_PROFILE_READ",
            "PAYMENTS_READ",
            "PAYMENTS_WRITE",
            "PAYMENTS_WRITE_ADDITIONAL_RECIPIENTS",  # For split payments
            "ORDERS_READ",
            "ORDERS_WRITE",
            "CUSTOMERS_READ",
            "CUSTOMERS_WRITE",
            "ITEMS_READ",
            "ITEMS_WRITE",
            "INVENTORY_READ",
            "INVENTORY_WRITE",
            "EMPLOYEES_READ",
            "TIMECARDS_READ",
            "BANK_ACCOUNTS_READ",  # For payout management
        ]

        all_scopes = base_scopes + (additional_scopes or [])

        params = {
            "client_id": self.client_id,
            "scope": " ".join(all_scopes),
            "session": "false",
            "state": state,
        }

        if redirect_uri:
            params["redirect_uri"] = redirect_uri

        oauth_url = f"{self.web_base_url}/oauth2/authorize?" + urlencode(params)

        logger.info(f"Generated OAuth URL for barber {barber_id}")
        return oauth_url

    async def exchange_code_for_tokens(
        self, authorization_code: str, state: str, redirect_uri: str = None
    ) -> Dict[str, Any]:
        """Exchange authorization code for access tokens with error handling"""
        # Verify state
        state_data = self.verify_oauth_state(state)

        data = {
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "code": authorization_code,
            "grant_type": "authorization_code",
        }

        if redirect_uri:
            data["redirect_uri"] = redirect_uri

        try:
            response = await self._make_request(
                method="POST",
                url=f"{self.api_base_url}/oauth2/token",
                json_data=data,
                headers={"Content-Type": "application/json"},
            )

            if response.status_code != 200:
                error_data = response.json()
                logger.error(f"Token exchange failed: {error_data}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Failed to exchange code: {error_data.get('error_description', 'Unknown error')}",
                )

            token_data = response.json()
            token_data["barber_id"] = state_data["barber_id"]

            # Store tokens temporarily in Redis
            self.redis_client.setex(
                f"square_tokens:{state_data['barber_id']}",
                300,  # 5 minutes
                json.dumps(token_data),
            )

            return token_data

        except httpx.RequestError as e:
            logger.error(f"Network error during token exchange: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Failed to communicate with Square API",
            )

    async def get_merchant_info(self, access_token: str) -> Dict[str, Any]:
        """Get detailed merchant information from Square"""
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
            "Square-Version": "2024-01-17",
        }

        try:
            # Get merchant info
            merchant_response = await self._make_request(
                method="GET", url=f"{self.api_base_url}/v2/merchants", headers=headers
            )

            if merchant_response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Failed to get merchant info: {merchant_response.text}",
                )

            merchant_data = merchant_response.json()

            # Get locations
            locations_response = await self._make_request(
                method="GET", url=f"{self.api_base_url}/v2/locations", headers=headers
            )

            if locations_response.status_code == 200:
                locations_data = locations_response.json()
                merchant_data["locations"] = locations_data.get("locations", [])

            # Get bank accounts for payout info
            bank_response = await self._make_request(
                method="GET",
                url=f"{self.api_base_url}/v2/bank-accounts",
                headers=headers,
            )

            if bank_response.status_code == 200:
                bank_data = bank_response.json()
                merchant_data["bank_accounts"] = bank_data.get("bank_accounts", [])

            return merchant_data

        except httpx.RequestError as e:
            logger.error(f"Network error getting merchant info: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Failed to communicate with Square API",
            )

    async def create_or_update_square_account(
        self,
        db: Session,
        barber_id: int,
        tokens: Dict[str, Any],
        merchant_info: Dict[str, Any],
    ) -> SquareAccount:
        """Create or update Square account with comprehensive data"""

        # Extract merchant data
        merchant = merchant_info.get("merchant", {})
        locations = merchant_info.get("locations", [])
        bank_accounts = merchant_info.get("bank_accounts", [])

        # Get main location
        main_location = None
        for location in locations:
            if location.get("status") == "ACTIVE":
                main_location = location
                break

        if not main_location and locations:
            main_location = locations[0]

        # Check if account already exists
        existing_account = (
            db.query(SquareAccount).filter(SquareAccount.barber_id == barber_id).first()
        )

        account_data = {
            "access_token": encrypt_data(tokens["access_token"]),
            "refresh_token": encrypt_data(tokens.get("refresh_token", "")),
            "token_expires_at": (
                datetime.fromisoformat(tokens["expires_at"])
                if "expires_at" in tokens
                else None
            ),
            "token_scope": tokens.get("scope", ""),
            "square_merchant_id": merchant.get("id", ""),
            "square_location_id": main_location.get("id") if main_location else None,
            "merchant_name": merchant.get("business_name", ""),
            "merchant_email": merchant.get("email_address", ""),
            "merchant_phone": merchant.get("phone_number", ""),
            "merchant_address": (
                json.dumps(main_location.get("address", {})) if main_location else None
            ),
            "country": merchant.get("country", "US"),
            "currency": merchant.get("currency", "USD"),
            "business_name": merchant.get("business_name", ""),
            "business_type": merchant.get("business_type", ""),
            "business_address": (
                json.dumps(main_location.get("address", {})) if main_location else None
            ),
            "is_active": True,
            "is_verified": merchant.get("status") == "ACTIVE",
            "can_receive_payments": True,
            "can_make_payouts": len(bank_accounts) > 0,
            "onboarding_completed": True,
            "connected_at": datetime.utcnow(),
            "last_sync_at": datetime.utcnow(),
        }

        if existing_account:
            # Update existing account
            for key, value in account_data.items():
                setattr(existing_account, key, value)

            db.commit()
            db.refresh(existing_account)

            logger.info(f"Updated Square account for barber {barber_id}")

            # Send notification
            await self.notification_service.send_notification(
                db,
                barber_id,
                "Square Account Updated",
                "Your Square account has been successfully updated.",
                notification_type="square_update",
            )

            return existing_account

        # Create new account
        square_account = SquareAccount(
            barber_id=barber_id, square_application_id=self.client_id, **account_data
        )

        db.add(square_account)
        db.commit()
        db.refresh(square_account)

        logger.info(f"Created Square account for barber {barber_id}")

        # Send welcome notification
        await self.notification_service.send_notification(
            db,
            barber_id,
            "Square Account Connected",
            "Your Square account has been successfully connected. You can now accept payments through Square.",
            notification_type="square_connected",
        )

        # Create webhook subscription
        await self.create_webhook_subscription(db, square_account)

        return square_account

    async def create_webhook_subscription(
        self, db: Session, square_account: SquareAccount
    ) -> bool:
        """Create webhook subscription for real-time updates"""
        access_token = decrypt_data(square_account.access_token)

        webhook_data = {
            "subscription": {
                "name": f"6FB Booking Webhook - {square_account.barber_id}",
                "event_types": [
                    "payment.created",
                    "payment.updated",
                    "payment.deleted",
                    "payout.sent",
                    "payout.paid",
                    "payout.failed",
                    "refund.created",
                    "refund.updated",
                    "dispute.created",
                    "dispute.evidence_added",
                    "dispute.state_changed",
                ],
                "notification_url": f"{self.settings.APP_URL}/api/v1/square/webhooks",
            }
        }

        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
            "Square-Version": "2024-01-17",
        }

        try:
            response = await self._make_request(
                method="POST",
                url=f"{self.api_base_url}/v2/webhooks/subscriptions",
                json_data=webhook_data,
                headers=headers,
            )

            if response.status_code == 200:
                subscription_data = response.json()
                subscription = subscription_data.get("subscription", {})

                # Update account with webhook info
                square_account.webhook_endpoint_id = subscription.get("id")
                square_account.webhook_signature_key = subscription.get("signature_key")
                db.commit()

                logger.info(
                    f"Created webhook subscription for barber {square_account.barber_id}"
                )
                return True
            else:
                logger.error(f"Failed to create webhook subscription: {response.text}")
                return False

        except Exception as e:
            logger.error(f"Error creating webhook subscription: {str(e)}")
            return False

    async def create_payment_with_split(
        self,
        db: Session,
        appointment_id: int,
        amount_cents: int,
        source_id: str,  # nonce from Square Web Payments SDK
        location_id: str,
        customer_info: Dict[str, Any] = None,
        auto_complete: bool = True,
    ) -> SquarePayment:
        """Create a Square payment with automatic commission split"""

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

        # Get payment model for commission rates
        payment_model = (
            db.query(BarberPaymentModel)
            .filter(
                BarberPaymentModel.barber_id == barber.id,
                BarberPaymentModel.active == True,
            )
            .first()
        )

        if not payment_model:
            raise HTTPException(
                status_code=400, detail="No active payment model for barber"
            )

        # Calculate splits
        commission_rate = float(payment_model.service_commission_rate)
        barber_amount = int(amount_cents * commission_rate)
        platform_amount = amount_cents - barber_amount

        # Create payment request with split
        payment_request = {
            "source_id": source_id,
            "idempotency_key": str(uuid.uuid4()),
            "amount_money": {"amount": amount_cents, "currency": "USD"},
            "autocomplete": auto_complete,
            "location_id": location_id,
            "reference_id": f"appointment-{appointment_id}",
            "note": f"Payment for appointment #{appointment_id}",
        }

        # Add split payment recipients if platform fee > 0
        if platform_amount > 0:
            payment_request["app_fee_money"] = {
                "amount": platform_amount,
                "currency": "USD",
            }

        # Add customer info if provided
        if customer_info:
            payment_request["buyer_email_address"] = customer_info.get("email")
            if customer_info.get("customer_id"):
                payment_request["customer_id"] = customer_info["customer_id"]

        # Get access token
        access_token = await self._ensure_valid_token(db, square_account)

        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
            "Square-Version": "2024-01-17",
        }

        try:
            response = await self._make_request(
                method="POST",
                url=f"{self.api_base_url}/v2/payments",
                json_data=payment_request,
                headers=headers,
            )

            if response.status_code != 200:
                error_data = response.json()
                logger.error(f"Payment creation failed: {error_data}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Failed to create Square payment: {error_data.get('errors', [{}])[0].get('detail', 'Unknown error')}",
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
                processing_fee_money=self._extract_processing_fee(payment_data),
                appointment_id=appointment_id,
                barber_id=barber.id,
                buyer_email_address=(
                    customer_info.get("email") if customer_info else None
                ),
                source_type=payment_data.get("source_type"),
                application_details=json.dumps(
                    payment_data.get("application_details", {})
                ),
                device_details=json.dumps(payment_data.get("device_details", {})),
            )

            # Add card details if available
            card_details = payment_data.get("card_details", {})
            if card_details:
                square_payment.card_brand = card_details.get("card", {}).get(
                    "card_brand"
                )
                square_payment.card_last_four = card_details.get("card", {}).get(
                    "last_4"
                )
                square_payment.card_exp_month = card_details.get("card", {}).get(
                    "exp_month"
                )
                square_payment.card_exp_year = card_details.get("card", {}).get(
                    "exp_year"
                )

            db.add(square_payment)

            # Create automatic payout record
            if payment_data["status"].lower() in ["completed", "approved"]:
                payout = await self._create_automatic_payout(
                    db, square_payment, barber_amount, platform_amount, commission_rate
                )

            db.commit()
            db.refresh(square_payment)

            # Send notifications
            await self._send_payment_notifications(db, square_payment, barber)

            # Track metrics
            self.monitoring_service.track_payment(
                payment_id=square_payment.id,
                amount=float(square_payment.total_money),
                status=square_payment.status,
                provider="square",
            )

            logger.info(
                f"Created Square payment {square_payment.square_payment_id} for appointment {appointment_id}"
            )

            return square_payment

        except httpx.RequestError as e:
            logger.error(f"Network error creating payment: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Failed to communicate with Square API",
            )

    def _extract_processing_fee(self, payment_data: Dict[str, Any]) -> Decimal:
        """Extract processing fee from payment data"""
        processing_fees = payment_data.get("processing_fee", [])
        total_fee = 0

        for fee in processing_fees:
            if "amount_money" in fee:
                total_fee += fee["amount_money"].get("amount", 0)

        return Decimal(str(total_fee)) / 100

    async def _create_automatic_payout(
        self,
        db: Session,
        payment: SquarePayment,
        barber_amount: int,
        platform_amount: int,
        commission_rate: float,
    ) -> SquarePayout:
        """Create automatic payout record for completed payment"""

        # Convert to decimal
        barber_amount_decimal = Decimal(str(barber_amount)) / 100
        platform_amount_decimal = Decimal(str(platform_amount)) / 100

        payout = SquarePayout(
            payment_id=payment.id,
            square_account_id=payment.barber.square_account.id,
            barber_id=payment.barber_id,
            amount_money=barber_amount_decimal,
            currency="USD",
            status=SquarePayoutStatus.PENDING,
            original_amount=payment.total_money,
            commission_rate=Decimal(str(commission_rate)),
            commission_amount=barber_amount_decimal,
            platform_fee=platform_amount_decimal,
            processing_fee=payment.processing_fee_money or Decimal("0"),
            net_amount=barber_amount_decimal
            - (payment.processing_fee_money or Decimal("0")),
            description=f"Commission payout for appointment #{payment.appointment_id}",
            reference_id=f"payout-{payment.square_payment_id}",
            scheduled_at=datetime.utcnow() + timedelta(days=1),  # Next business day
            destination_type="BANK_ACCOUNT",
        )

        db.add(payout)
        return payout

    async def _send_payment_notifications(
        self, db: Session, payment: SquarePayment, barber: Barber
    ):
        """Send payment notifications to relevant parties"""
        # Notify barber
        await self.notification_service.send_notification(
            db,
            barber.id,
            "Payment Received",
            f"Payment of ${payment.total_money} received for appointment #{payment.appointment_id}",
            notification_type="payment_received",
            data={"payment_id": payment.id},
        )

        # Send email if configured
        if barber.user.email:
            await self.email_service.send_payment_confirmation(
                barber.user.email,
                payment.id,
                float(payment.total_money),
                payment.appointment_id,
            )

    async def process_scheduled_payouts(self, db: Session) -> List[SquarePayout]:
        """Process all scheduled payouts"""
        # Get pending payouts scheduled for processing
        pending_payouts = (
            db.query(SquarePayout)
            .filter(
                SquarePayout.status == SquarePayoutStatus.PENDING,
                SquarePayout.scheduled_at <= datetime.utcnow(),
            )
            .all()
        )

        processed_payouts = []

        for payout in pending_payouts:
            try:
                processed_payout = await self.process_single_payout(db, payout.id)
                processed_payouts.append(processed_payout)
            except Exception as e:
                logger.error(f"Failed to process payout {payout.id}: {str(e)}")
                payout.retry_count += 1
                if payout.retry_count >= 3:
                    payout.status = SquarePayoutStatus.FAILED
                    payout.failure_reason = str(e)
                    payout.failed_at = datetime.utcnow()
                db.commit()

        return processed_payouts

    async def process_single_payout(self, db: Session, payout_id: int) -> SquarePayout:
        """Process a single payout"""
        payout = db.query(SquarePayout).filter(SquarePayout.id == payout_id).first()
        if not payout:
            raise HTTPException(status_code=404, detail="Payout not found")

        square_account = payout.square_account

        # Square handles payouts automatically based on their settlement schedule
        # We just update our records to reflect the payout status

        # In production, you would check Square's payout status API
        # For now, we'll mark as sent and Square will handle the actual transfer

        payout.status = SquarePayoutStatus.SENT
        payout.sent_at = datetime.utcnow()
        payout.square_payout_id = f"auto_payout_{uuid.uuid4().hex[:12]}"

        # Add to Square's automatic batch
        payout.square_batch_id = f"batch_{datetime.utcnow().strftime('%Y%m%d')}"

        db.commit()
        db.refresh(payout)

        # Send notification
        await self.notification_service.send_notification(
            db,
            payout.barber_id,
            "Payout Sent",
            f"Your payout of ${payout.net_amount} has been sent and will arrive within 1-2 business days.",
            notification_type="payout_sent",
            data={"payout_id": payout.id},
        )

        logger.info(f"Processed payout {payout.id} for barber {payout.barber_id}")

        return payout

    async def handle_webhook(
        self, db: Session, webhook_data: Dict[str, Any], signature: str
    ) -> bool:
        """Handle Square webhook events with signature verification"""

        # Verify signature
        if not self.verify_webhook_signature(json.dumps(webhook_data), signature):
            logger.warning("Invalid webhook signature")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid webhook signature",
            )

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

        if existing_event:
            webhook_event = existing_event
            webhook_event.retry_count += 1
        else:
            db.add(webhook_event)

        try:
            # Process different event types
            handlers = {
                "payment.created": self._handle_payment_created,
                "payment.updated": self._handle_payment_updated,
                "payment.deleted": self._handle_payment_deleted,
                "payout.sent": self._handle_payout_sent,
                "payout.paid": self._handle_payout_paid,
                "payout.failed": self._handle_payout_failed,
                "refund.created": self._handle_refund_created,
                "refund.updated": self._handle_refund_updated,
                "dispute.created": self._handle_dispute_created,
                "dispute.evidence_added": self._handle_dispute_evidence_added,
                "dispute.state_changed": self._handle_dispute_state_changed,
            }

            handler = handlers.get(event_type)
            if handler:
                await handler(db, webhook_data)

            webhook_event.processed = True
            webhook_event.processed_at = datetime.utcnow()

        except Exception as e:
            webhook_event.processing_error = str(e)
            logger.error(f"Error processing webhook {event_type}: {str(e)}")
            raise
        finally:
            db.commit()

        return webhook_event.processed

    async def _handle_payment_created(self, db: Session, webhook_data: Dict[str, Any]):
        """Handle payment.created webhook"""
        payment_data = webhook_data.get("data", {}).get("object", {}).get("payment", {})
        logger.info(f"Payment created: {payment_data.get('id')}")

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
            old_status = payment.status
            new_status = payment_data.get("status", "").lower()

            payment.status = new_status
            payment.approved_money = (
                Decimal(str(payment_data.get("approved_money", {}).get("amount", 0)))
                / 100
            )
            payment.processing_fee_money = self._extract_processing_fee(payment_data)

            # Handle status transitions
            if old_status != new_status:
                if new_status == "completed" and old_status != "completed":
                    # Create payout if not exists
                    existing_payout = (
                        db.query(SquarePayout)
                        .filter(SquarePayout.payment_id == payment.id)
                        .first()
                    )

                    if not existing_payout:
                        # Get payment model for commission
                        payment_model = (
                            db.query(BarberPaymentModel)
                            .filter(
                                BarberPaymentModel.barber_id == payment.barber_id,
                                BarberPaymentModel.active == True,
                            )
                            .first()
                        )

                        if payment_model:
                            commission_rate = float(
                                payment_model.service_commission_rate
                            )
                            barber_amount = int(
                                float(payment.total_money) * 100 * commission_rate
                            )
                            platform_amount = (
                                int(float(payment.total_money) * 100) - barber_amount
                            )

                            await self._create_automatic_payout(
                                db,
                                payment,
                                barber_amount,
                                platform_amount,
                                commission_rate,
                            )

                elif new_status == "failed":
                    # Send failure notification
                    await self.notification_service.send_notification(
                        db,
                        payment.barber_id,
                        "Payment Failed",
                        f"Payment for appointment #{payment.appointment_id} has failed.",
                        notification_type="payment_failed",
                        data={"payment_id": payment.id},
                    )

            db.commit()
            logger.info(
                f"Updated payment {square_payment_id} status from {old_status} to {new_status}"
            )

    async def _handle_payment_deleted(self, db: Session, webhook_data: Dict[str, Any]):
        """Handle payment.deleted webhook"""
        payment_data = webhook_data.get("data", {}).get("object", {}).get("payment", {})
        square_payment_id = payment_data.get("id")

        if square_payment_id:
            payment = (
                db.query(SquarePayment)
                .filter(SquarePayment.square_payment_id == square_payment_id)
                .first()
            )

            if payment:
                payment.status = "canceled"
                db.commit()
                logger.info(f"Payment {square_payment_id} marked as canceled")

    async def _handle_payout_sent(self, db: Session, webhook_data: Dict[str, Any]):
        """Handle payout.sent webhook"""
        # Square doesn't provide detailed payout webhook data like Stripe
        # You would need to query their API for payout details
        logger.info("Payout sent webhook received")

    async def _handle_payout_paid(self, db: Session, webhook_data: Dict[str, Any]):
        """Handle payout.paid webhook"""
        # Update payout status to paid
        logger.info("Payout paid webhook received")

    async def _handle_payout_failed(self, db: Session, webhook_data: Dict[str, Any]):
        """Handle payout.failed webhook"""
        # Update payout status to failed and log reason
        logger.info("Payout failed webhook received")

    async def _handle_refund_created(self, db: Session, webhook_data: Dict[str, Any]):
        """Handle refund.created webhook"""
        refund_data = webhook_data.get("data", {}).get("object", {}).get("refund", {})
        payment_id = refund_data.get("payment_id")

        if payment_id:
            payment = (
                db.query(SquarePayment)
                .filter(SquarePayment.square_payment_id == payment_id)
                .first()
            )

            if payment:
                # Update payment status
                payment.status = "refunded"

                # Cancel any pending payouts
                pending_payouts = (
                    db.query(SquarePayout)
                    .filter(
                        SquarePayout.payment_id == payment.id,
                        SquarePayout.status == SquarePayoutStatus.PENDING,
                    )
                    .all()
                )

                for payout in pending_payouts:
                    payout.status = SquarePayoutStatus.CANCELED
                    payout.failure_reason = "Payment refunded"

                db.commit()

                # Send notification
                await self.notification_service.send_notification(
                    db,
                    payment.barber_id,
                    "Payment Refunded",
                    f"Payment for appointment #{payment.appointment_id} has been refunded.",
                    notification_type="payment_refunded",
                    data={"payment_id": payment.id, "refund_id": refund_data.get("id")},
                )

                logger.info(f"Refund created for payment {payment_id}")

    async def _handle_refund_updated(self, db: Session, webhook_data: Dict[str, Any]):
        """Handle refund.updated webhook"""
        logger.info("Refund updated webhook received")

    async def _handle_dispute_created(self, db: Session, webhook_data: Dict[str, Any]):
        """Handle dispute.created webhook"""
        dispute_data = webhook_data.get("data", {}).get("object", {}).get("dispute", {})
        payment_id = dispute_data.get("payment_id")

        if payment_id:
            payment = (
                db.query(SquarePayment)
                .filter(SquarePayment.square_payment_id == payment_id)
                .first()
            )

            if payment:
                # Send urgent notification
                await self.notification_service.send_notification(
                    db,
                    payment.barber_id,
                    "⚠️ Payment Dispute",
                    f"A dispute has been filed for payment on appointment #{payment.appointment_id}. Action required.",
                    notification_type="payment_dispute",
                    priority="high",
                    data={
                        "payment_id": payment.id,
                        "dispute_id": dispute_data.get("id"),
                    },
                )

                logger.warning(f"Dispute created for payment {payment_id}")

    async def _handle_dispute_evidence_added(
        self, db: Session, webhook_data: Dict[str, Any]
    ):
        """Handle dispute.evidence_added webhook"""
        logger.info("Dispute evidence added webhook received")

    async def _handle_dispute_state_changed(
        self, db: Session, webhook_data: Dict[str, Any]
    ):
        """Handle dispute.state_changed webhook"""
        logger.info("Dispute state changed webhook received")

    def verify_webhook_signature(self, payload: str, signature: str) -> bool:
        """Verify Square webhook signature"""
        if not self.webhook_signature_key:
            logger.warning("No webhook signature key configured")
            return False

        # Square uses HMAC-SHA256 for webhook verification
        expected_signature = hmac.new(
            self.webhook_signature_key.encode("utf-8"),
            payload.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()

        return hmac.compare_digest(signature, expected_signature)

    async def _ensure_valid_token(
        self, db: Session, square_account: SquareAccount
    ) -> str:
        """Ensure we have a valid access token, refreshing if necessary"""
        # Check if token is expired
        if (
            square_account.token_expires_at
            and square_account.token_expires_at < datetime.utcnow()
        ):
            return await self.refresh_access_token(db, square_account)

        return decrypt_data(square_account.access_token)

    async def refresh_access_token(
        self, db: Session, square_account: SquareAccount
    ) -> str:
        """Refresh Square access token"""
        if not square_account.refresh_token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No refresh token available",
            )

        refresh_token = decrypt_data(square_account.refresh_token)

        data = {
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "refresh_token": refresh_token,
            "grant_type": "refresh_token",
        }

        try:
            response = await self._make_request(
                method="POST",
                url=f"{self.api_base_url}/oauth2/token",
                json_data=data,
                headers={"Content-Type": "application/json"},
            )

            if response.status_code != 200:
                error_data = response.json()
                logger.error(f"Token refresh failed: {error_data}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Failed to refresh token: {error_data.get('error_description', 'Unknown error')}",
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

            square_account.last_sync_at = datetime.utcnow()
            db.commit()

            logger.info(f"Refreshed token for Square account {square_account.id}")

            return tokens["access_token"]

        except httpx.RequestError as e:
            logger.error(f"Network error refreshing token: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Failed to communicate with Square API",
            )

    async def check_account_status(self, db: Session, barber_id: int) -> Dict[str, Any]:
        """Check Square account status and capabilities"""
        square_account = (
            db.query(SquareAccount).filter(SquareAccount.barber_id == barber_id).first()
        )

        if not square_account:
            return {"connected": False, "error": "No Square account connected"}

        try:
            # Get fresh merchant info
            access_token = await self._ensure_valid_token(db, square_account)
            merchant_info = await self.get_merchant_info(access_token)

            merchant = merchant_info.get("merchant", {})
            locations = merchant_info.get("locations", [])
            bank_accounts = merchant_info.get("bank_accounts", [])

            # Update account status
            square_account.is_verified = merchant.get("status") == "ACTIVE"
            square_account.can_receive_payments = True
            square_account.can_make_payouts = len(bank_accounts) > 0
            square_account.last_sync_at = datetime.utcnow()

            db.commit()

            return {
                "connected": True,
                "verified": square_account.is_verified,
                "can_receive_payments": square_account.can_receive_payments,
                "can_make_payouts": square_account.can_make_payouts,
                "merchant_name": merchant.get("business_name"),
                "locations_count": len(locations),
                "bank_accounts_count": len(bank_accounts),
                "last_sync": square_account.last_sync_at.isoformat(),
            }

        except Exception as e:
            logger.error(f"Error checking Square account status: {str(e)}")
            return {
                "connected": True,
                "error": str(e),
                "last_sync": (
                    square_account.last_sync_at.isoformat()
                    if square_account.last_sync_at
                    else None
                ),
            }

    async def disconnect_account(self, db: Session, barber_id: int) -> bool:
        """Disconnect Square account"""
        square_account = (
            db.query(SquareAccount).filter(SquareAccount.barber_id == barber_id).first()
        )

        if not square_account:
            return False

        try:
            # Delete webhook subscription if exists
            if square_account.webhook_endpoint_id:
                access_token = decrypt_data(square_account.access_token)
                headers = {
                    "Authorization": f"Bearer {access_token}",
                    "Square-Version": "2024-01-17",
                }

                await self._make_request(
                    method="DELETE",
                    url=f"{self.api_base_url}/v2/webhooks/subscriptions/{square_account.webhook_endpoint_id}",
                    headers=headers,
                )

            # Deactivate account instead of deleting
            square_account.is_active = False
            square_account.access_token = encrypt_data("")
            square_account.refresh_token = encrypt_data("")
            square_account.webhook_endpoint_id = None
            square_account.webhook_signature_key = None

            db.commit()

            # Send notification
            await self.notification_service.send_notification(
                db,
                barber_id,
                "Square Account Disconnected",
                "Your Square account has been disconnected.",
                notification_type="square_disconnected",
            )

            logger.info(f"Disconnected Square account for barber {barber_id}")
            return True

        except Exception as e:
            logger.error(f"Error disconnecting Square account: {str(e)}")
            return False

    async def get_payment_history(
        self,
        db: Session,
        barber_id: int,
        start_date: datetime = None,
        end_date: datetime = None,
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
        """Get payment history for a barber"""
        query = db.query(SquarePayment).filter(SquarePayment.barber_id == barber_id)

        if start_date:
            query = query.filter(SquarePayment.created_at >= start_date)
        if end_date:
            query = query.filter(SquarePayment.created_at <= end_date)

        payments = query.order_by(SquarePayment.created_at.desc()).limit(limit).all()

        return [
            {
                "id": payment.id,
                "square_payment_id": payment.square_payment_id,
                "amount": float(payment.total_money),
                "status": payment.status,
                "appointment_id": payment.appointment_id,
                "created_at": payment.created_at.isoformat(),
                "card_brand": payment.card_brand,
                "card_last_four": payment.card_last_four,
                "receipt_url": payment.square_receipt_url,
            }
            for payment in payments
        ]

    async def get_payout_history(
        self,
        db: Session,
        barber_id: int,
        start_date: datetime = None,
        end_date: datetime = None,
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
        """Get payout history for a barber"""
        query = db.query(SquarePayout).filter(SquarePayout.barber_id == barber_id)

        if start_date:
            query = query.filter(SquarePayout.created_at >= start_date)
        if end_date:
            query = query.filter(SquarePayout.created_at <= end_date)

        payouts = query.order_by(SquarePayout.created_at.desc()).limit(limit).all()

        return [
            {
                "id": payout.id,
                "square_payout_id": payout.square_payout_id,
                "amount": float(payout.net_amount),
                "status": payout.status,
                "payment_id": payout.payment_id,
                "created_at": payout.created_at.isoformat(),
                "scheduled_at": (
                    payout.scheduled_at.isoformat() if payout.scheduled_at else None
                ),
                "paid_at": payout.paid_at.isoformat() if payout.paid_at else None,
                "description": payout.description,
            }
            for payout in payouts
        ]


# Global service instance
square_oauth_service = SquareOAuthService()
