"""
Subscription Service for handling trial and paid subscriptions with Stripe
"""

import stripe
import logging
from typing import Dict, Any, Optional
from datetime import datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from config.settings import get_settings
from models.user import User, SubscriptionStatus
from services.stripe_service import StripeService
from utils.transaction_manager import TransactionManager, IsolationLevel

logger = logging.getLogger(__name__)
settings = get_settings()

# Use Stripe test keys for development and testing
stripe.api_key = (
    settings.STRIPE_SECRET_KEY or "sk_test_51234567890abcdef"
)  # Fallback test key


class SubscriptionService:
    """Service for handling user subscriptions and trials"""

    def __init__(self, db: Session):
        self.db = db
        self.stripe_service = StripeService(db)

    async def start_trial(self, user: User, trial_days: int = 30) -> bool:
        """Start a trial period for a user with Stripe test integration"""
        try:
            if user.trial_used:
                raise ValueError("User has already used their trial period")

            # Start the trial using the User model method
            user.start_trial(trial_days)

            # Create or get Stripe test customer for trial tracking
            stripe_customer_id = await self.stripe_service.create_or_get_customer(user)
            user.customer_id = stripe_customer_id

            # Create a test subscription for trial tracking (using Stripe test mode)
            try:
                # Create a test subscription that will automatically cancel after trial
                subscription = stripe.Subscription.create(
                    customer=stripe_customer_id,
                    items=[
                        {
                            "price": settings.STRIPE_TRIAL_PRICE_ID
                            or "price_test_trial_monthly",  # Test price ID
                        }
                    ],
                    trial_period_days=trial_days,
                    cancel_at_trial_end=True,  # Auto-cancel when trial ends
                    metadata={
                        "user_id": str(user.id),
                        "subscription_type": "trial",
                        "platform": "6FB",
                    },
                    # Use test mode - no actual charges
                    idempotency_key=f"trial_{user.id}_{int(datetime.now().timestamp())}",
                )

                user.subscription_id = subscription.id
                logger.info(
                    f"Created Stripe test trial subscription {subscription.id} for user {user.id}"
                )

            except stripe.error.StripeError as e:
                # Log the error but don't fail the trial start
                logger.warning(
                    f"Failed to create Stripe test subscription for trial: {str(e)}"
                )
                # Trial still starts without Stripe tracking

            self.db.commit()

            logger.info(f"Started {trial_days}-day trial for user {user.id}")
            return True

        except Exception as e:
            logger.error(f"Error starting trial for user {user.id}: {str(e)}")
            self.db.rollback()
            raise

    async def upgrade_to_paid(
        self, user: User, price_id: str, payment_method_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Upgrade user from trial to paid subscription"""
        try:
            if (
                not user.is_trial_active()
                and user.subscription_status != SubscriptionStatus.TRIAL
            ):
                raise ValueError("User must have an active trial to upgrade")

            # Get or create Stripe customer
            stripe_customer_id = await self.stripe_service.create_or_get_customer(user)

            # If payment method provided, attach it to customer
            if payment_method_id:
                stripe.PaymentMethod.attach(
                    payment_method_id, customer=stripe_customer_id
                )

                # Set as default payment method
                stripe.Customer.modify(
                    stripe_customer_id,
                    invoice_settings={"default_payment_method": payment_method_id},
                )

            # Cancel existing trial subscription if it exists
            if user.subscription_id:
                try:
                    stripe.Subscription.cancel(user.subscription_id)
                except stripe.error.StripeError as e:
                    logger.warning(f"Failed to cancel trial subscription: {str(e)}")

            # Create new paid subscription
            subscription_params = {
                "customer": stripe_customer_id,
                "items": [{"price": price_id}],
                "metadata": {
                    "user_id": str(user.id),
                    "subscription_type": "paid",
                    "platform": "6FB",
                    "upgraded_from_trial": "true",
                },
                "idempotency_key": f"upgrade_{user.id}_{int(datetime.now().timestamp())}",
            }

            if payment_method_id:
                subscription_params["default_payment_method"] = payment_method_id

            subscription = stripe.Subscription.create(**subscription_params)

            # Update user subscription status
            user.activate_subscription(subscription.id)
            user.customer_id = stripe_customer_id

            self.db.commit()

            logger.info(
                f"Upgraded user {user.id} to paid subscription {subscription.id}"
            )

            return {
                "subscription_id": subscription.id,
                "status": subscription.status,
                "current_period_end": subscription.current_period_end,
                "latest_invoice": subscription.latest_invoice,
            }

        except Exception as e:
            logger.error(f"Error upgrading user {user.id} to paid: {str(e)}")
            self.db.rollback()
            raise

    async def cancel_subscription(self, user: User, reason: str = None) -> bool:
        """Cancel user's subscription"""
        try:
            if not user.subscription_id:
                raise ValueError("User does not have an active subscription")

            # Cancel with Stripe
            subscription = stripe.Subscription.cancel(
                user.subscription_id,
                cancellation_details={"comment": reason or "Cancelled by user"},
            )

            # Update user status
            user.subscription_status = SubscriptionStatus.CANCELLED

            self.db.commit()

            logger.info(f"Cancelled subscription for user {user.id}")
            return True

        except Exception as e:
            logger.error(f"Error cancelling subscription for user {user.id}: {str(e)}")
            self.db.rollback()
            raise

    async def check_trial_expiration(self, user: User) -> Dict[str, Any]:
        """Check trial expiration status and return detailed info"""
        if not user.trial_end_date:
            return {
                "has_trial": False,
                "is_expired": False,
                "days_remaining": 0,
                "status": "no_trial",
            }

        now = datetime.now(timezone.utc)
        is_expired = now > user.trial_end_date
        days_remaining = max(0, (user.trial_end_date - now).days)

        return {
            "has_trial": True,
            "is_expired": is_expired,
            "days_remaining": days_remaining,
            "trial_end_date": user.trial_end_date,
            "status": (
                user.subscription_status.value
                if user.subscription_status
                else "unknown"
            ),
        }

    async def get_subscription_info(self, user: User) -> Dict[str, Any]:
        """Get complete subscription information for a user"""
        try:
            subscription_info = {
                "subscription_status": (
                    user.subscription_status.value if user.subscription_status else None
                ),
                "trial_start_date": user.trial_start_date,
                "trial_end_date": user.trial_end_date,
                "trial_used": user.trial_used,
                "is_trial_active": user.is_trial_active(),
                "is_subscription_active": user.is_subscription_active(),
                "days_remaining_in_trial": user.days_remaining_in_trial(),
                "customer_id": user.customer_id,
                "subscription_id": user.subscription_id,
            }

            # Get Stripe subscription details if available
            if user.subscription_id:
                try:
                    stripe_subscription = stripe.Subscription.retrieve(
                        user.subscription_id
                    )
                    subscription_info.update(
                        {
                            "stripe_status": stripe_subscription.status,
                            "current_period_start": datetime.fromtimestamp(
                                stripe_subscription.current_period_start
                            ),
                            "current_period_end": datetime.fromtimestamp(
                                stripe_subscription.current_period_end
                            ),
                            "cancel_at_period_end": stripe_subscription.cancel_at_period_end,
                            "canceled_at": (
                                datetime.fromtimestamp(stripe_subscription.canceled_at)
                                if stripe_subscription.canceled_at
                                else None
                            ),
                        }
                    )
                except stripe.error.StripeError as e:
                    logger.warning(f"Failed to retrieve Stripe subscription: {str(e)}")
                    subscription_info["stripe_error"] = str(e)

            return subscription_info

        except Exception as e:
            logger.error(
                f"Error getting subscription info for user {user.id}: {str(e)}"
            )
            raise

    async def handle_subscription_webhook(self, event: stripe.Event) -> bool:
        """Handle Stripe subscription webhook events"""
        try:
            subscription = event.data.object

            # Find user by customer ID
            user = (
                self.db.query(User)
                .filter(User.customer_id == subscription.customer)
                .first()
            )

            if not user:
                logger.warning(f"User not found for customer {subscription.customer}")
                return False

            if event.type == "customer.subscription.updated":
                await self._handle_subscription_updated(user, subscription)
            elif event.type == "customer.subscription.deleted":
                await self._handle_subscription_deleted(user, subscription)
            elif event.type == "customer.subscription.trial_will_end":
                await self._handle_trial_will_end(user, subscription)
            elif event.type == "invoice.payment_failed":
                await self._handle_payment_failed(user, subscription)
            elif event.type == "invoice.payment_succeeded":
                await self._handle_payment_succeeded(user, subscription)

            return True

        except Exception as e:
            logger.error(f"Error handling subscription webhook: {str(e)}")
            raise

    async def _handle_subscription_updated(
        self, user: User, subscription: Dict[str, Any]
    ):
        """Handle subscription update webhook"""
        if subscription["status"] == "active":
            user.subscription_status = SubscriptionStatus.ACTIVE
        elif subscription["status"] == "canceled":
            user.subscription_status = SubscriptionStatus.CANCELLED
        elif subscription["status"] == "past_due":
            user.subscription_status = SubscriptionStatus.PAST_DUE

        self.db.commit()
        logger.info(
            f"Updated subscription status for user {user.id} to {user.subscription_status}"
        )

    async def _handle_subscription_deleted(
        self, user: User, subscription: Dict[str, Any]
    ):
        """Handle subscription deletion webhook"""
        user.subscription_status = SubscriptionStatus.CANCELLED
        user.subscription_id = None
        self.db.commit()
        logger.info(f"Subscription deleted for user {user.id}")

    async def _handle_trial_will_end(self, user: User, subscription: Dict[str, Any]):
        """Handle trial ending soon webhook"""
        logger.info(f"Trial will end soon for user {user.id}")
        # Could trigger email notification here

    async def _handle_payment_failed(self, user: User, subscription: Dict[str, Any]):
        """Handle failed payment webhook"""
        user.subscription_status = SubscriptionStatus.PAST_DUE
        self.db.commit()
        logger.warning(f"Payment failed for user {user.id}")

    async def _handle_payment_succeeded(self, user: User, subscription: Dict[str, Any]):
        """Handle successful payment webhook"""
        if user.subscription_status == SubscriptionStatus.PAST_DUE:
            user.subscription_status = SubscriptionStatus.ACTIVE
            self.db.commit()
            logger.info(
                f"Payment succeeded, reactivated subscription for user {user.id}"
            )

    @staticmethod
    def get_test_price_ids() -> Dict[str, str]:
        """Get Stripe test price IDs for different subscription tiers"""
        return {
            "monthly_basic": "price_test_monthly_basic_29",
            "monthly_pro": "price_test_monthly_pro_59",
            "monthly_premium": "price_test_monthly_premium_99",
            "yearly_basic": "price_test_yearly_basic_290",
            "yearly_pro": "price_test_yearly_pro_590",
            "yearly_premium": "price_test_yearly_premium_990",
        }

    @staticmethod
    def get_test_payment_methods() -> Dict[str, str]:
        """Get Stripe test payment method IDs for testing"""
        return {
            "visa_success": "pm_card_visa",
            "visa_declined": "pm_card_visa_debit",
            "mastercard_success": "pm_card_mastercard",
            "amex_success": "pm_card_amex",
            "discover_success": "pm_card_discover",
        }
