"""
Stripe integration service implementation.
Extends the base integration service for Stripe specific functionality.
"""

from typing import Dict, Any, List, Tuple, Optional
import aiohttp
import logging

from models.integration import Integration, IntegrationType
from services.integration_service import BaseIntegrationService, IntegrationServiceFactory
from config import settings

logger = logging.getLogger(__name__)


class StripeIntegrationService(BaseIntegrationService):
    """Stripe specific integration service"""
    
    @property
    def integration_type(self) -> IntegrationType:
        return IntegrationType.STRIPE
    
    @property
    def oauth_authorize_url(self) -> str:
        return "https://connect.stripe.com/oauth/authorize"
    
    @property
    def oauth_token_url(self) -> str:
        return "https://connect.stripe.com/oauth/token"
    
    @property
    def required_scopes(self) -> List[str]:
        # Stripe uses 'read_write' scope
        return ["read_write"]
    
    @property
    def client_id(self) -> str:
        return settings.STRIPE_CLIENT_ID
    
    @property
    def client_secret(self) -> str:
        return settings.STRIPE_SECRET_KEY
    
    @property
    def default_redirect_uri(self) -> str:
        return f"{settings.BACKEND_URL}/api/v1/integrations/callback?integration_type=stripe"
    
    async def exchange_code_for_tokens(self, code: str, redirect_uri: str) -> Dict[str, Any]:
        """Exchange authorization code for Stripe account ID"""
        async with aiohttp.ClientSession() as session:
            data = {
                "grant_type": "authorization_code",
                "code": code,
                "client_secret": self.client_secret
            }
            
            async with session.post(self.oauth_token_url, data=data) as response:
                if response.status != 200:
                    error_text = await response.text()
                    logger.error(f"Stripe OAuth failed: {error_text}")
                    raise Exception(f"Failed to connect Stripe account: {error_text}")
                
                result = await response.json()
                
                # Stripe returns stripe_user_id instead of access_token
                return {
                    "access_token": result.get("stripe_user_id"),  # Store account ID as token
                    "refresh_token": result.get("refresh_token"),
                    "scope": result.get("scope", "read_write"),
                    "token_type": "stripe_account"
                }
    
    async def refresh_access_token(self, refresh_token: str) -> Dict[str, Any]:
        """Stripe doesn't use refresh tokens - return existing data"""
        # Stripe Connect doesn't expire tokens, so no refresh needed
        return {
            "access_token": refresh_token,  # Return the same account ID
            "token_type": "stripe_account"
        }
    
    async def verify_connection(self, integration: Integration) -> Tuple[bool, Optional[str]]:
        """Verify that the Stripe connection is valid"""
        if not integration.access_token:
            return False, "No Stripe account ID available"
        
        # Test the connection by fetching account details
        async with aiohttp.ClientSession() as session:
            headers = {
                "Authorization": f"Bearer {self.client_secret}",
                "Stripe-Account": integration.access_token  # Connected account ID
            }
            
            async with session.get(
                "https://api.stripe.com/v1/accounts/" + integration.access_token,
                headers=headers
            ) as response:
                if response.status == 200:
                    return True, None
                elif response.status == 401:
                    return False, "Authentication failed - invalid account"
                else:
                    error_text = await response.text()
                    return False, f"Connection test failed: {error_text}"
    
    async def get_account_details(self, integration: Integration) -> Dict[str, Any]:
        """Get Stripe account details"""
        async with aiohttp.ClientSession() as session:
            headers = {
                "Authorization": f"Bearer {self.client_secret}"
            }
            
            async with session.get(
                f"https://api.stripe.com/v1/accounts/{integration.access_token}",
                headers=headers
            ) as response:
                if response.status != 200:
                    error_text = await response.text()
                    raise Exception(f"Failed to get account details: {error_text}")
                
                return await response.json()
    
    async def create_payout(
        self,
        integration: Integration,
        amount: int,
        currency: str = "usd",
        description: Optional[str] = None
    ) -> Dict[str, Any]:
        """Create a payout for the connected account"""
        async with aiohttp.ClientSession() as session:
            headers = {
                "Authorization": f"Bearer {self.client_secret}",
                "Stripe-Account": integration.access_token
            }
            
            data = {
                "amount": amount,
                "currency": currency
            }
            if description:
                data["description"] = description
            
            async with session.post(
                "https://api.stripe.com/v1/payouts",
                headers=headers,
                data=data
            ) as response:
                if response.status not in [200, 201]:
                    error_text = await response.text()
                    raise Exception(f"Failed to create payout: {error_text}")
                
                return await response.json()
    
    async def list_balance_transactions(
        self,
        integration: Integration,
        limit: int = 10,
        starting_after: Optional[str] = None
    ) -> Dict[str, Any]:
        """List balance transactions for the connected account"""
        async with aiohttp.ClientSession() as session:
            headers = {
                "Authorization": f"Bearer {self.client_secret}",
                "Stripe-Account": integration.access_token
            }
            
            params = {"limit": limit}
            if starting_after:
                params["starting_after"] = starting_after
            
            async with session.get(
                "https://api.stripe.com/v1/balance_transactions",
                headers=headers,
                params=params
            ) as response:
                if response.status != 200:
                    error_text = await response.text()
                    raise Exception(f"Failed to list transactions: {error_text}")
                
                return await response.json()


# Register the service with the factory
IntegrationServiceFactory.register(
    IntegrationType.STRIPE,
    StripeIntegrationService
)