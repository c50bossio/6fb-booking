"""
Stripe Connect Service
Handles Stripe Connect platform functionality for multi-vendor payments
"""

from typing import Dict, List, Optional, Any
import logging
import stripe
from config import settings

logger = logging.getLogger(__name__)


class StripeConnectService:
    """
    Service for managing Stripe Connect accounts and payments
    """
    
    def __init__(self):
        stripe.api_key = settings.stripe_secret_key
    
    async def create_express_account(self, user_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a Stripe Express account for a barbershop"""
        try:
            account = stripe.Account.create(
                type="express",
                country="US",
                email=user_data.get("email")
            )
            
            return {
                "success": True,
                "account_id": account.id,
                "account_type": account.type
            }
        except Exception as e:
            logger.error(f"Error creating Stripe Express account: {e}")
            return {"success": False, "error": str(e)}
    
    async def create_account_link(self, account_id: str, return_url: str, refresh_url: str) -> Dict[str, Any]:
        """Create an account link for onboarding"""
        try:
            account_link = stripe.AccountLink.create(
                account=account_id,
                return_url=return_url,
                refresh_url=refresh_url,
                type="account_onboarding"
            )
            
            return {
                "success": True,
                "onboarding_url": account_link.url
            }
        except Exception as e:
            logger.error(f"Error creating account link: {e}")
            return {"success": False, "error": str(e)}
    
    async def get_account_status(self, account_id: str) -> Dict[str, Any]:
        """Get the status of a Stripe Connect account"""
        try:
            account = stripe.Account.retrieve(account_id)
            
            return {
                "success": True,
                "account_id": account.id,
                "charges_enabled": account.charges_enabled,
                "payouts_enabled": account.payouts_enabled,
                "details_submitted": account.details_submitted
            }
        except Exception as e:
            logger.error(f"Error getting account status: {e}")
            return {"success": False, "error": str(e)}
    
    async def create_payment_intent(self, amount: int, currency: str, account_id: str, 
                                   application_fee: int) -> Dict[str, Any]:
        """Create a payment intent with application fee"""
        try:
            payment_intent = stripe.PaymentIntent.create(
                amount=amount,
                currency=currency,
                application_fee_amount=application_fee,
                stripe_account=account_id
            )
            
            return {
                "success": True,
                "payment_intent_id": payment_intent.id,
                "client_secret": payment_intent.client_secret
            }
        except Exception as e:
            logger.error(f"Error creating payment intent: {e}")
            return {"success": False, "error": str(e)}