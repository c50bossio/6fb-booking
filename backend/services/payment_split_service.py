"""
Payment Split Service - Automatically split payments between shop and barbers
Barbers connect their own Square or Stripe accounts
Shop automatically keeps commission/booth rent
"""

import os
from typing import Dict, Optional, List
from datetime import datetime
from decimal import Decimal
import stripe
from square.client import Client as SquareClient

from config.settings import Settings


class PaymentSplitService:
    """
    Handles automatic payment splitting:
    1. Customer pays full amount
    2. Shop keeps commission/booth rent
    3. Barber gets the rest instantly

    Works with both Square and Stripe
    """

    def __init__(self):
        self.settings = Settings()

        # Initialize Stripe
        stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
        self.stripe = stripe

        # Initialize Square
        self.square_client = SquareClient(
            access_token=os.getenv("SQUARE_ACCESS_TOKEN"),
            environment=os.getenv("SQUARE_ENVIRONMENT", "sandbox"),
        )

    # ===== STRIPE SPLIT PAYMENTS =====

    def create_stripe_payment_with_split(self, payment_data: Dict) -> Dict:
        """
        Create a payment that automatically splits between shop and barber
        Using Stripe Connect's destination charges
        """
        try:
            amount_cents = int(payment_data["amount"] * 100)
            barber_amount_cents = int(payment_data["barber_amount"] * 100)
            shop_fee_cents = amount_cents - barber_amount_cents

            # Create payment intent with automatic transfer to barber
            payment_intent = self.stripe.PaymentIntent.create(
                amount=amount_cents,
                currency="usd",
                payment_method=payment_data.get("payment_method_id"),
                customer=payment_data.get("customer_id"),
                description=payment_data.get("description", "Service payment"),
                # Automatic transfer to barber's Stripe account
                transfer_data={
                    "destination": payment_data["barber_stripe_account_id"],
                    "amount": barber_amount_cents,  # Amount barber receives
                },
                # Shop keeps the difference as application fee
                application_fee_amount=shop_fee_cents,
                metadata={
                    "barber_id": str(payment_data["barber_id"]),
                    "appointment_id": str(payment_data.get("appointment_id", "")),
                    "service_type": payment_data.get("service_type", "haircut"),
                    "commission_rate": str(payment_data["commission_rate"]),
                },
                confirm=True,
                return_url=payment_data.get(
                    "return_url", "https://yourdomain.com/success"
                ),
            )

            return {
                "payment_intent_id": payment_intent.id,
                "status": payment_intent.status,
                "amount": float(payment_intent.amount) / 100,
                "barber_amount": float(barber_amount_cents) / 100,
                "shop_fee": float(shop_fee_cents) / 100,
                "transfer_created": True,
            }

        except stripe.error.StripeError as e:
            raise Exception(f"Stripe payment error: {str(e)}")

    def create_stripe_connect_oauth_url(self, barber_id: int, state: str) -> str:
        """
        Generate OAuth URL for barber to connect their Stripe account
        """
        base_url = "https://connect.stripe.com/oauth/authorize"

        params = {
            "response_type": "code",
            "client_id": os.getenv("STRIPE_CONNECT_CLIENT_ID"),
            "scope": "read_write",
            "state": f"{barber_id}:{state}",
            "stripe_user[country]": "US",
            "stripe_user[business_type]": "individual",
        }

        query_string = "&".join([f"{k}={v}" for k, v in params.items() if v])
        return f"{base_url}?{query_string}"

    def complete_stripe_oauth(self, code: str) -> Dict:
        """
        Complete Stripe OAuth connection
        """
        try:
            response = self.stripe.OAuth.token(
                grant_type="authorization_code",
                code=code,
            )

            # Response is a dictionary, not an object
            return {
                "stripe_account_id": response.get("stripe_user_id"),
                "access_token": response.get("access_token"),
                "livemode": response.get("livemode", False),
            }
        except Exception as e:
            raise Exception(f"Stripe OAuth error: {str(e)}")

    # ===== SQUARE SPLIT PAYMENTS =====

    def create_square_payment_with_split(self, payment_data: Dict) -> Dict:
        """
        Create a Square payment that splits between shop and barber
        Note: Square doesn't have automatic splits like Stripe,
        so we process payment then transfer
        """
        try:
            # First, process the full payment
            result = self.square_client.payments.create_payment(
                body={
                    "source_id": payment_data[
                        "source_id"
                    ],  # Card nonce or customer card
                    "idempotency_key": payment_data.get("idempotency_key"),
                    "amount_money": {
                        "amount": int(payment_data["amount"] * 100),
                        "currency": "USD",
                    },
                    "location_id": payment_data["location_id"],
                    "note": payment_data.get("description", "Service payment"),
                    "reference_id": str(payment_data.get("appointment_id", "")),
                    "customer_id": payment_data.get("customer_id"),
                }
            )

            if result.is_success():
                payment = result.body["payment"]

                # Calculate split
                total_amount = float(payment["amount_money"]["amount"]) / 100
                barber_amount = payment_data["barber_amount"]
                shop_fee = total_amount - barber_amount

                # TODO: Create transfer to barber's Square account
                # Square requires separate API for transfers between accounts

                return {
                    "payment_id": payment["id"],
                    "status": payment["status"],
                    "amount": total_amount,
                    "barber_amount": barber_amount,
                    "shop_fee": shop_fee,
                    "transfer_pending": True,  # Will process in background
                }
            else:
                raise Exception(f"Square payment failed: {result.errors}")

        except Exception as e:
            raise Exception(f"Square payment error: {str(e)}")

    def create_square_oauth_url(self, barber_id: int, state: str) -> str:
        """
        Generate OAuth URL for barber to connect their Square account
        """
        base_url = "https://connect.squareup.com/oauth2/authorize"

        params = {
            "client_id": os.getenv("SQUARE_APPLICATION_ID"),
            "scope": "MERCHANT_PROFILE_READ PAYMENTS_READ PAYMENTS_WRITE",
            "state": f"{barber_id}:{state}",
            "session": "false",
        }

        query_string = "&".join([f"{k}={v}" for k, v in params.items() if v])
        return f"{base_url}?{query_string}"

    def complete_square_oauth(self, code: str) -> Dict:
        """
        Complete Square OAuth connection
        """
        try:
            result = self.square_client.o_auth.obtain_token(
                body={
                    "client_id": os.getenv("SQUARE_APPLICATION_ID"),
                    "client_secret": os.getenv("SQUARE_APPLICATION_SECRET"),
                    "code": code,
                    "grant_type": "authorization_code",
                }
            )

            if result.is_success():
                return {
                    "access_token": result.body["access_token"],
                    "merchant_id": result.body["merchant_id"],
                    "expires_at": result.body.get("expires_at"),
                }
            else:
                raise Exception(f"Square OAuth failed: {result.errors}")

        except Exception as e:
            raise Exception(f"Square OAuth error: {str(e)}")

    # ===== COMMISSION CALCULATIONS =====

    def calculate_split(
        self, total_amount: Decimal, barber_payment_model: Dict
    ) -> Dict:
        """
        Calculate how much shop keeps vs barber gets
        """
        total = Decimal(str(total_amount))

        if barber_payment_model["payment_type"] == "commission":
            # Commission model: shop keeps percentage
            commission_rate = Decimal(
                str(barber_payment_model["service_commission_rate"])
            )
            shop_amount = total * commission_rate
            barber_amount = total - shop_amount

        elif barber_payment_model["payment_type"] == "booth_rent":
            # Booth rent: barber keeps everything minus weekly/monthly rent
            # Rent is handled separately, so barber gets full amount here
            shop_amount = Decimal("0")
            barber_amount = total

        elif barber_payment_model["payment_type"] == "hybrid":
            # Hybrid: commission + booth rent
            commission_rate = Decimal(
                str(barber_payment_model["service_commission_rate"])
            )
            shop_amount = total * commission_rate
            barber_amount = total - shop_amount
            # Booth rent charged separately

        else:
            # Default: no split
            shop_amount = Decimal("0")
            barber_amount = total

        return {
            "total": float(total),
            "shop_amount": float(shop_amount),
            "barber_amount": float(barber_amount),
            "commission_rate": float(
                barber_payment_model.get("service_commission_rate", 0)
            ),
        }

    def process_booth_rent_charge(
        self, barber_stripe_account: str, rent_amount: Decimal
    ) -> Dict:
        """
        Charge booth rent directly from barber's Stripe account
        This happens weekly/monthly based on agreement
        """
        try:
            # Create a direct charge on the connected account
            charge = self.stripe.Charge.create(
                amount=int(rent_amount * 100),
                currency="usd",
                description="Weekly booth rent",
                # Charge the connected account directly
                stripe_account=barber_stripe_account,
                # Transfer to platform
                destination={
                    "account": os.getenv("STRIPE_PLATFORM_ACCOUNT_ID"),
                    "amount": int(rent_amount * 100),
                },
            )

            return {
                "charge_id": charge.id,
                "amount": float(charge.amount) / 100,
                "status": charge.status,
                "paid": charge.paid,
            }

        except stripe.error.StripeError as e:
            raise Exception(f"Booth rent charge error: {str(e)}")
