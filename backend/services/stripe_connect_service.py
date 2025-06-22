"""
Stripe Connect Service for Barber Payouts
Industry standard solution for marketplace payments
"""

import os
from typing import Dict, Optional, List
from datetime import datetime
from decimal import Decimal
import stripe

from config.settings import Settings


class StripeConnectService:
    """
    Stripe Connect Express - The industry standard for marketplace payouts
    - Used by: Uber, Lyft, DoorDash, Instacart, etc.
    - Onboarding: 5-10 minutes for barbers
    - Fees: 0.25% + $0.25 per payout (much cheaper than 1.75% instant fees)
    - Speed: Instant to 2 business days
    - Compliance: Stripe handles all tax forms (1099s)
    """

    def __init__(self):
        self.settings = Settings()
        stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
        self.stripe = stripe

    def create_oauth_link(self, state: str) -> str:
        """
        Create OAuth link for barbers to connect their EXISTING Stripe account
        This is much simpler - they just authorize your platform to send them money
        """
        # Stripe OAuth URL for connecting existing accounts
        base_url = "https://connect.stripe.com/oauth/authorize"

        params = {
            "response_type": "code",
            "client_id": os.getenv(
                "STRIPE_CONNECT_CLIENT_ID"
            ),  # Your platform's client ID
            "scope": "read_write",  # Allows you to create transfers to their account
            "state": state,  # Security token to prevent CSRF
            "stripe_user[email]": "",  # Pre-fill email if desired
            "stripe_user[country]": "US",
        }

        # Build OAuth URL
        query_string = "&".join([f"{k}={v}" for k, v in params.items() if v])
        return f"{base_url}?{query_string}"

    def complete_oauth_connection(self, authorization_code: str) -> Dict:
        """
        Complete OAuth flow after barber authorizes the connection
        Exchange authorization code for their Stripe account ID
        """
        try:
            response = self.stripe.OAuth.token(
                grant_type="authorization_code",
                code=authorization_code,
            )

            return {
                "stripe_user_id": response.stripe_user_id,  # Their connected account ID
                "access_token": response.access_token,
                "scope": response.scope,
                "livemode": response.livemode,
            }

        except stripe.error.StripeError as e:
            raise Exception(f"OAuth error: {str(e)}")

    def disconnect_account(self, stripe_user_id: str) -> bool:
        """
        Disconnect a barber's Stripe account from your platform
        """
        try:
            self.stripe.OAuth.deauthorize(
                client_id=os.getenv("STRIPE_CONNECT_CLIENT_ID"),
                stripe_user_id=stripe_user_id,
            )
            return True
        except stripe.error.StripeError as e:
            raise Exception(f"Disconnect error: {str(e)}")

    def check_account_status(self, account_id: str) -> Dict:
        """
        Check if barber has completed onboarding
        """
        try:
            account = self.stripe.Account.retrieve(account_id)

            return {
                "account_id": account.id,
                "details_submitted": account.details_submitted,
                "payouts_enabled": account.payouts_enabled,
                "charges_enabled": account.charges_enabled,
                "requirements": {
                    "currently_due": (
                        account.requirements.currently_due
                        if account.requirements
                        else []
                    ),
                    "eventually_due": (
                        account.requirements.eventually_due
                        if account.requirements
                        else []
                    ),
                },
            }

        except stripe.error.StripeError as e:
            raise Exception(f"Stripe error: {str(e)}")

    def get_account_details(self, account_id: str) -> Dict:
        """
        Get detailed information about a connected account
        """
        try:
            account = self.stripe.Account.retrieve(account_id)

            # Convert account object to dictionary to safely access attributes
            account_dict = {
                "id": account.id,
                "type": getattr(account, "type", "unknown"),
                "country": getattr(account, "country", "unknown"),
                "email": getattr(account, "email", None),
                "details_submitted": getattr(account, "details_submitted", False),
                "payouts_enabled": getattr(account, "payouts_enabled", False),
                "charges_enabled": getattr(account, "charges_enabled", False),
                "created": getattr(account, "created", None),
                "business_type": getattr(account, "business_type", None),
                "capabilities": getattr(account, "capabilities", {}),
            }

            # Handle requirements separately
            if hasattr(account, "requirements") and account.requirements:
                account_dict["requirements"] = {
                    "currently_due": getattr(account.requirements, "currently_due", []),
                    "eventually_due": getattr(
                        account.requirements, "eventually_due", []
                    ),
                }
            else:
                account_dict["requirements"] = {
                    "currently_due": [],
                    "eventually_due": [],
                }

            return account_dict

        except stripe.error.StripeError as e:
            raise Exception(f"Stripe error: {str(e)}")

    def create_direct_transfer(
        self, account_id: str, amount: Decimal, metadata: Optional[Dict] = None
    ) -> Dict:
        """
        Send money directly to barber's Stripe account
        They receive it according to their own payout schedule
        This is the simplest approach - one API call and done!
        """
        try:
            # Convert to cents
            amount_cents = int(amount * 100)

            # Single transfer directly to their account
            transfer = self.stripe.Transfer.create(
                amount=amount_cents,
                currency="usd",
                destination=account_id,  # Their connected account
                description="Commission payout from 6FB",
                metadata=metadata or {},
            )

            return {
                "transfer_id": transfer.id,
                "amount": float(transfer.amount) / 100,
                "created": datetime.fromtimestamp(transfer.created),
                "destination": transfer.destination,
                "status": "completed",  # Transfers are instant to their Stripe balance
            }

        except stripe.error.StripeError as e:
            raise Exception(f"Transfer error: {str(e)}")

    def create_transfer(
        self, account_id: str, amount: Decimal, metadata: Optional[Dict] = None
    ) -> Dict:
        """
        Transfer money from platform account to connected account
        This is how we pay barbers their commission
        """
        try:
            # Convert to cents
            amount_cents = int(amount * 100)

            transfer = self.stripe.Transfer.create(
                amount=amount_cents,
                currency="usd",
                destination=account_id,
                metadata=metadata or {},
            )

            return {
                "transfer_id": transfer.id,
                "amount": float(transfer.amount) / 100,
                "created": datetime.fromtimestamp(transfer.created),
                "destination": transfer.destination,
            }

        except stripe.error.StripeError as e:
            raise Exception(f"Stripe error: {str(e)}")

    def create_instant_payout(
        self, account_id: str, amount: Decimal, metadata: Optional[Dict] = None
    ) -> Dict:
        """
        Create instant payout (arrives within 30 minutes)
        Costs 1% extra fee but great for barber satisfaction
        """
        try:
            # First transfer to connected account
            transfer = self.create_transfer(account_id, amount, metadata)

            # Then create instant payout
            amount_cents = int(amount * 100)

            payout = self.stripe.Payout.create(
                amount=amount_cents,
                currency="usd",
                method="instant",
                metadata=metadata or {},
                stripe_account=account_id,
            )

            return {
                "transfer_id": transfer["transfer_id"],
                "payout_id": payout.id,
                "amount": float(payout.amount) / 100,
                "fee": float(payout.amount) * 0.01,  # 1% instant fee
                "arrival_date": "Within 30 minutes",
                "status": payout.status,
            }

        except stripe.error.StripeError as e:
            raise Exception(f"Stripe error: {str(e)}")

    def get_balance(self, account_id: str) -> Dict:
        """
        Get connected account balance
        """
        try:
            balance = self.stripe.Balance.retrieve(stripe_account=account_id)

            available = sum(b.amount for b in balance.available if b.currency == "usd")
            pending = sum(b.amount for b in balance.pending if b.currency == "usd")

            return {
                "available": float(available) / 100,
                "pending": float(pending) / 100,
                "currency": "usd",
            }

        except stripe.error.StripeError as e:
            raise Exception(f"Stripe error: {str(e)}")

    def create_login_link(self, account_id: str) -> str:
        """
        Create a link for barber to access their Stripe Express dashboard
        They can see payouts, tax forms, update bank info
        """
        try:
            login_link = self.stripe.Account.create_login_link(account_id)
            return login_link.url

        except stripe.error.StripeError as e:
            raise Exception(f"Stripe error: {str(e)}")

    def list_payouts(self, account_id: str, limit: int = 10) -> List[Dict]:
        """
        List recent payouts for a connected account
        """
        try:
            payouts = self.stripe.Payout.list(limit=limit, stripe_account=account_id)

            return [
                {
                    "id": payout.id,
                    "amount": float(payout.amount) / 100,
                    "arrival_date": datetime.fromtimestamp(payout.arrival_date),
                    "status": payout.status,
                    "method": payout.method,
                }
                for payout in payouts.data
            ]

        except stripe.error.StripeError as e:
            raise Exception(f"Stripe error: {str(e)}")

    def handle_webhook(
        self, payload: str, sig_header: str, webhook_secret: str
    ) -> Dict:
        """
        Handle Stripe webhooks for account updates
        """
        try:
            event = self.stripe.Webhook.construct_event(
                payload, sig_header, webhook_secret
            )

            # Handle different event types
            if event["type"] == "account.updated":
                account = event["data"]["object"]
                return {
                    "type": "account_updated",
                    "account_id": account["id"],
                    "payouts_enabled": account["payouts_enabled"],
                    "details_submitted": account["details_submitted"],
                }

            elif event["type"] == "payout.created":
                payout = event["data"]["object"]
                return {
                    "type": "payout_created",
                    "payout_id": payout["id"],
                    "amount": float(payout["amount"]) / 100,
                    "arrival_date": datetime.fromtimestamp(payout["arrival_date"]),
                }

            elif event["type"] == "payout.paid":
                payout = event["data"]["object"]
                return {
                    "type": "payout_paid",
                    "payout_id": payout["id"],
                    "amount": float(payout["amount"]) / 100,
                }

            elif event["type"] == "payout.failed":
                payout = event["data"]["object"]
                return {
                    "type": "payout_failed",
                    "payout_id": payout["id"],
                    "failure_message": payout.get("failure_message"),
                }

            return {"type": event["type"], "handled": False}

        except Exception as e:
            raise Exception(f"Webhook error: {str(e)}")

    def transfer_to_barber(
        self, barber_id: int, amount: float, instant: bool = False
    ) -> bool:
        """
        Transfer funds to barber using their preferred method
        Used by the automated payout scheduler
        """
        try:
            from models.barber import Barber
            from config.database import get_db

            db = next(get_db())
            barber = db.query(Barber).filter(Barber.id == barber_id).first()

            if not barber:
                raise Exception(f"Barber {barber_id} not found")

            if not barber.stripe_account_id:
                raise Exception(f"Barber {barber_id} has no Stripe account connected")

            metadata = {
                "barber_id": str(barber_id),
                "barber_name": barber.name,
                "payout_type": "automated_commission",
            }

            if instant:
                # Create instant payout
                result = self.create_instant_payout(
                    account_id=barber.stripe_account_id,
                    amount=Decimal(str(amount)),
                    metadata=metadata,
                )
            else:
                # Create standard transfer (goes to their Stripe balance)
                result = self.create_direct_transfer(
                    account_id=barber.stripe_account_id,
                    amount=Decimal(str(amount)),
                    metadata=metadata,
                )

            db.close()
            return True

        except Exception as e:
            print(f"Error transferring to barber {barber_id}: {str(e)}")
            return False
