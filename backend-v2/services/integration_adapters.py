"""
Adapter classes to make existing integration services compatible with BaseIntegrationService.
This allows existing services to work with the IntegrationServiceFactory pattern.
"""

from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from datetime import datetime, timezone
import os
import logging

from services.integration_service import BaseIntegrationService
from services.gmb_service import GMBService as GMBServiceImpl
from services.google_calendar_service import GoogleCalendarService as GCalServiceImpl
from services.stripe_integration_service import StripeIntegrationService as StripeServiceImpl
from models.integration import IntegrationType, Integration, IntegrationStatus
from schemas_new.integration import IntegrationHealthCheck

logger = logging.getLogger(__name__)


class GMBServiceAdapter(BaseIntegrationService):
    """Adapter for Google My Business service"""
    
    def __init__(self, db: Session):
        super().__init__(db)
        self._impl = GMBServiceImpl()
    
    @property
    def integration_type(self) -> IntegrationType:
        return IntegrationType.GOOGLE_MY_BUSINESS
    
    @property
    def oauth_authorize_url(self) -> str:
        return self._impl.oauth_base_url
    
    @property
    def oauth_token_url(self) -> str:
        return self._impl.token_url
    
    @property
    def required_scopes(self) -> List[str]:
        return self._impl.scopes
    
    @property
    def client_id(self) -> str:
        return self._impl.client_id or ""
    
    @property
    def client_secret(self) -> str:
        return self._impl.client_secret or ""
    
    @property
    def default_redirect_uri(self) -> str:
        return os.getenv("GMB_REDIRECT_URI", "http://localhost:3000/integrations/callback")
    
    async def exchange_code_for_tokens(self, code: str, redirect_uri: str) -> Dict[str, Any]:
        """Exchange authorization code for tokens"""
        return await self._impl.exchange_code_for_tokens(code, redirect_uri)
    
    async def refresh_access_token(self, refresh_token: str) -> Dict[str, Any]:
        """Refresh access token"""
        return await self._impl.refresh_access_token(refresh_token)
    
    async def verify_connection(self, access_token: str) -> bool:
        """Verify connection with access token"""
        try:
            # Try to get business locations to verify the token works
            locations = await self._impl.get_business_locations_raw(access_token)
            return len(locations) >= 0  # Even 0 locations means valid token
        except Exception as e:
            logger.warning(f"GMB connection verification failed: {e}")
            return False
    
    async def perform_health_check(self, integration: Integration) -> IntegrationHealthCheck:
        """Check health of GMB integration"""
        try:
            # Basic health check - verify token exists
            if integration.access_token:
                return IntegrationHealthCheck(
                    integration_id=integration.id,
                    integration_type=self.integration_type,
                    name=integration.name,
                    status=integration.status,
                    healthy=True,
                    last_check=datetime.now(timezone.utc).isoformat(),
                    details={"message": "Integration appears healthy"}
                )
            else:
                return IntegrationHealthCheck(
                    integration_id=integration.id,
                    integration_type=self.integration_type,
                    name=integration.name,
                    status=integration.status,
                    healthy=False,
                    last_check=datetime.now(timezone.utc).isoformat(),
                    error="No access token found"
                )
        except Exception as e:
            return IntegrationHealthCheck(
                integration_id=integration.id,
                integration_type=self.integration_type,
                name=integration.name,
                status=integration.status,
                healthy=False,
                last_check=datetime.now(timezone.utc).isoformat(),
                error=str(e)
            )


class GoogleCalendarServiceAdapter(BaseIntegrationService):
    """Adapter for Google Calendar service"""
    
    def __init__(self, db: Session):
        super().__init__(db)
        self._impl = GCalServiceImpl(db)
    
    @property
    def integration_type(self) -> IntegrationType:
        return IntegrationType.GOOGLE_CALENDAR
    
    @property
    def oauth_authorize_url(self) -> str:
        return "https://accounts.google.com/o/oauth2/v2/auth"
    
    @property
    def oauth_token_url(self) -> str:
        return "https://oauth2.googleapis.com/token"
    
    @property
    def required_scopes(self) -> List[str]:
        return ["https://www.googleapis.com/auth/calendar"]
    
    @property
    def client_id(self) -> str:
        return os.getenv("GOOGLE_CLIENT_ID", "")
    
    @property
    def client_secret(self) -> str:
        return os.getenv("GOOGLE_CLIENT_SECRET", "")
    
    @property
    def default_redirect_uri(self) -> str:
        return os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:3000/integrations/callback")
    
    async def exchange_code_for_tokens(self, code: str, redirect_uri: str) -> Dict[str, Any]:
        """Exchange authorization code for tokens"""
        # TODO: Implement actual OAuth token exchange
        return {
            "access_token": "dummy_gcal_access_token",
            "refresh_token": "dummy_gcal_refresh_token",
            "expires_in": 3600
        }
    
    async def refresh_access_token(self, refresh_token: str) -> Dict[str, Any]:
        """Refresh access token"""
        # TODO: Implement actual token refresh
        return {
            "access_token": "refreshed_gcal_access_token",
            "expires_in": 3600
        }
    
    async def verify_connection(self, access_token: str) -> bool:
        """Verify connection with access token"""
        # TODO: Implement actual connection verification
        return bool(access_token)
    
    async def perform_health_check(self, integration: Integration) -> IntegrationHealthCheck:
        """Check health of Google Calendar integration"""
        try:
            # Check if we can access the calendar
            if hasattr(self._impl, 'test_connection'):
                success = await self._impl.test_connection(integration.user_id)
                return IntegrationHealthCheck(
                    integration_id=integration.id,
                    integration_type=self.integration_type,
                    name=integration.name,
                    status=integration.status,
                    healthy=success,
                    last_check=datetime.now(timezone.utc).isoformat(),
                    details={"message": "Connection test successful" if success else "Connection test failed"}
                )
            else:
                # Basic check
                return IntegrationHealthCheck(
                    integration_id=integration.id,
                    integration_type=self.integration_type,
                    name=integration.name,
                    status=integration.status,
                    healthy=bool(integration.access_token),
                    last_check=datetime.now(timezone.utc).isoformat(),
                    details={"message": "Token check only"}
                )
        except Exception as e:
            return IntegrationHealthCheck(
                integration_id=integration.id,
                integration_type=self.integration_type,
                name=integration.name,
                status=integration.status,
                healthy=False,
                last_check=datetime.now(timezone.utc).isoformat(),
                error=str(e)
            )


class StripeServiceAdapter(BaseIntegrationService):
    """Adapter for Stripe service"""
    
    def __init__(self, db: Session):
        super().__init__(db)
        self._impl = StripeServiceImpl(db)
    
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
        return ["read_write"]
    
    @property
    def client_id(self) -> str:
        return os.getenv("STRIPE_CLIENT_ID", "")
    
    @property
    def client_secret(self) -> str:
        return os.getenv("STRIPE_SECRET_KEY", "")
    
    @property
    def default_redirect_uri(self) -> str:
        return os.getenv("STRIPE_REDIRECT_URI", "http://localhost:3000/integrations/callback")
    
    async def exchange_code_for_tokens(self, code: str, redirect_uri: str) -> Dict[str, Any]:
        """Exchange authorization code for tokens"""
        # TODO: Implement actual OAuth token exchange with Stripe
        return {
            "stripe_user_id": "acct_dummy_stripe_id",
            "access_token": "dummy_stripe_access_token",
            "refresh_token": "dummy_stripe_refresh_token"
        }
    
    async def refresh_access_token(self, refresh_token: str) -> Dict[str, Any]:
        """Refresh access token"""
        # TODO: Implement actual token refresh
        return {
            "access_token": "refreshed_stripe_access_token",
            "expires_in": 3600
        }
    
    async def verify_connection(self, access_token: str) -> bool:
        """Verify connection with access token"""
        # TODO: Implement actual connection verification
        return bool(access_token)
    
    async def perform_health_check(self, integration: Integration) -> IntegrationHealthCheck:
        """Check health of Stripe integration"""
        try:
            # For Stripe, we would check if the account is still connected
            # This is a simplified version
            return IntegrationHealthCheck(
                integration_id=integration.id,
                integration_type=self.integration_type,
                name=integration.name,
                status=integration.status,
                healthy=bool(integration.stripe_account_id),
                last_check=datetime.now(timezone.utc).isoformat(),
                details={"account_id": integration.stripe_account_id} if integration.stripe_account_id else {}
            )
        except Exception as e:
            return IntegrationHealthCheck(
                integration_id=integration.id,
                integration_type=self.integration_type,
                name=integration.name,
                status=integration.status,
                healthy=False,
                last_check=datetime.now(timezone.utc).isoformat(),
                error=str(e)
            )


# Additional adapters for other integration types
class SendGridServiceAdapter(BaseIntegrationService):
    """Adapter for SendGrid email service"""
    
    def __init__(self, db: Session):
        super().__init__(db)
    
    @property
    def integration_type(self) -> IntegrationType:
        return IntegrationType.SENDGRID
    
    @property
    def oauth_authorize_url(self) -> str:
        # SendGrid uses API keys, not OAuth
        return ""
    
    @property
    def oauth_token_url(self) -> str:
        return ""
    
    @property
    def required_scopes(self) -> List[str]:
        return []
    
    @property
    def client_id(self) -> str:
        return ""
    
    @property
    def client_secret(self) -> str:
        return ""
    
    @property
    def default_redirect_uri(self) -> str:
        return ""
    
    async def exchange_code_for_tokens(self, code: str, redirect_uri: str) -> Dict[str, Any]:
        """SendGrid uses API keys, not OAuth"""
        raise NotImplementedError("SendGrid uses API key authentication, not OAuth")
    
    async def refresh_access_token(self, refresh_token: str) -> Dict[str, Any]:
        """SendGrid uses API keys, not OAuth"""
        raise NotImplementedError("SendGrid uses API key authentication, not OAuth")
    
    async def verify_connection(self, access_token: str) -> bool:
        """Verify API key is valid"""
        # TODO: Implement actual API key verification
        return bool(access_token)
    
    async def perform_health_check(self, integration: Integration) -> IntegrationHealthCheck:
        """Check health of SendGrid integration"""
        return IntegrationHealthCheck(
            integration_id=integration.id,
            integration_type=self.integration_type,
            name=integration.name,
            status=integration.status,
            healthy=bool(integration.api_key),
            last_check=datetime.now(timezone.utc).isoformat(),
            details={"has_api_key": bool(integration.api_key)}
        )


class TwilioServiceAdapter(BaseIntegrationService):
    """Adapter for Twilio SMS service"""
    
    def __init__(self, db: Session):
        super().__init__(db)
    
    @property
    def integration_type(self) -> IntegrationType:
        return IntegrationType.TWILIO
    
    @property
    def oauth_authorize_url(self) -> str:
        # Twilio uses API keys, not OAuth
        return ""
    
    @property
    def oauth_token_url(self) -> str:
        return ""
    
    @property
    def required_scopes(self) -> List[str]:
        return []
    
    @property
    def client_id(self) -> str:
        return ""
    
    @property
    def client_secret(self) -> str:
        return ""
    
    @property
    def default_redirect_uri(self) -> str:
        return ""
    
    async def exchange_code_for_tokens(self, code: str, redirect_uri: str) -> Dict[str, Any]:
        """Twilio uses API keys, not OAuth"""
        raise NotImplementedError("Twilio uses API key authentication, not OAuth")
    
    async def refresh_access_token(self, refresh_token: str) -> Dict[str, Any]:
        """Twilio uses API keys, not OAuth"""
        raise NotImplementedError("Twilio uses API key authentication, not OAuth")
    
    async def verify_connection(self, access_token: str) -> bool:
        """Verify API credentials are valid"""
        # TODO: Implement actual credential verification
        return bool(access_token)
    
    async def perform_health_check(self, integration: Integration) -> IntegrationHealthCheck:
        """Check health of Twilio integration"""
        return IntegrationHealthCheck(
            integration_id=integration.id,
            integration_type=self.integration_type,
            name=integration.name,
            status=integration.status,
            healthy=bool(integration.api_key and integration.api_secret),
            last_check=datetime.now(timezone.utc).isoformat(),
            details={"has_credentials": bool(integration.api_key and integration.api_secret)}
        )