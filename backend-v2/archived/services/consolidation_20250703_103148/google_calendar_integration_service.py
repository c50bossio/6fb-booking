"""
Google Calendar integration service implementation.
Extends the base integration service for Google Calendar specific functionality.
"""

from typing import Dict, Any, List, Tuple, Optional
import aiohttp
import logging

from models.integration import Integration, IntegrationType
from services.integration_service import BaseIntegrationService, IntegrationServiceFactory
from config import settings

logger = logging.getLogger(__name__)


class GoogleCalendarIntegrationService(BaseIntegrationService):
    """Google Calendar specific integration service"""
    
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
        return [
            "https://www.googleapis.com/auth/calendar",
            "https://www.googleapis.com/auth/calendar.events"
        ]
    
    @property
    def client_id(self) -> str:
        return settings.GOOGLE_CALENDAR_CLIENT_ID
    
    @property
    def client_secret(self) -> str:
        return settings.GOOGLE_CALENDAR_CLIENT_SECRET
    
    @property
    def default_redirect_uri(self) -> str:
        return f"{settings.BACKEND_URL}/api/v1/integrations/callback?integration_type=google_calendar"
    
    async def exchange_code_for_tokens(self, code: str, redirect_uri: str) -> Dict[str, Any]:
        """Exchange authorization code for access and refresh tokens"""
        async with aiohttp.ClientSession() as session:
            data = {
                "code": code,
                "client_id": self.client_id,
                "client_secret": self.client_secret,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code"
            }
            
            async with session.post(self.oauth_token_url, data=data) as response:
                if response.status != 200:
                    error_text = await response.text()
                    logger.error(f"Token exchange failed: {error_text}")
                    raise Exception(f"Failed to exchange code for tokens: {error_text}")
                
                return await response.json()
    
    async def refresh_access_token(self, refresh_token: str) -> Dict[str, Any]:
        """Refresh the access token using the refresh token"""
        async with aiohttp.ClientSession() as session:
            data = {
                "refresh_token": refresh_token,
                "client_id": self.client_id,
                "client_secret": self.client_secret,
                "grant_type": "refresh_token"
            }
            
            async with session.post(self.oauth_token_url, data=data) as response:
                if response.status != 200:
                    error_text = await response.text()
                    logger.error(f"Token refresh failed: {error_text}")
                    raise Exception(f"Failed to refresh token: {error_text}")
                
                return await response.json()
    
    async def verify_connection(self, integration: Integration) -> Tuple[bool, Optional[str]]:
        """Verify that the Google Calendar connection is valid"""
        if not integration.access_token:
            return False, "No access token available"
        
        # Test the connection by fetching calendar list
        async with aiohttp.ClientSession() as session:
            headers = {
                "Authorization": f"Bearer {integration.access_token}"
            }
            
            async with session.get(
                "https://www.googleapis.com/calendar/v3/users/me/calendarList",
                headers=headers
            ) as response:
                if response.status == 200:
                    return True, None
                elif response.status == 401:
                    return False, "Authentication failed - token may be expired"
                else:
                    error_text = await response.text()
                    return False, f"Connection test failed: {error_text}"
    
    async def list_calendars(self, integration: Integration) -> List[Dict[str, Any]]:
        """List all calendars accessible by the integration"""
        # Ensure token is fresh
        await self.refresh_token_if_needed(integration)
        
        async with aiohttp.ClientSession() as session:
            headers = {
                "Authorization": f"Bearer {integration.access_token}"
            }
            
            async with session.get(
                "https://www.googleapis.com/calendar/v3/users/me/calendarList",
                headers=headers
            ) as response:
                if response.status != 200:
                    error_text = await response.text()
                    raise Exception(f"Failed to list calendars: {error_text}")
                
                data = await response.json()
                return data.get("items", [])
    
    async def create_event(
        self, 
        integration: Integration, 
        calendar_id: str,
        event_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Create a calendar event"""
        # Ensure token is fresh
        await self.refresh_token_if_needed(integration)
        
        async with aiohttp.ClientSession() as session:
            headers = {
                "Authorization": f"Bearer {integration.access_token}",
                "Content-Type": "application/json"
            }
            
            async with session.post(
                f"https://www.googleapis.com/calendar/v3/calendars/{calendar_id}/events",
                headers=headers,
                json=event_data
            ) as response:
                if response.status not in [200, 201]:
                    error_text = await response.text()
                    raise Exception(f"Failed to create event: {error_text}")
                
                return await response.json()
    
    async def update_event(
        self,
        integration: Integration,
        calendar_id: str,
        event_id: str,
        event_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Update a calendar event"""
        # Ensure token is fresh
        await self.refresh_token_if_needed(integration)
        
        async with aiohttp.ClientSession() as session:
            headers = {
                "Authorization": f"Bearer {integration.access_token}",
                "Content-Type": "application/json"
            }
            
            async with session.put(
                f"https://www.googleapis.com/calendar/v3/calendars/{calendar_id}/events/{event_id}",
                headers=headers,
                json=event_data
            ) as response:
                if response.status != 200:
                    error_text = await response.text()
                    raise Exception(f"Failed to update event: {error_text}")
                
                return await response.json()
    
    async def delete_event(
        self,
        integration: Integration,
        calendar_id: str,
        event_id: str
    ) -> bool:
        """Delete a calendar event"""
        # Ensure token is fresh
        await self.refresh_token_if_needed(integration)
        
        async with aiohttp.ClientSession() as session:
            headers = {
                "Authorization": f"Bearer {integration.access_token}"
            }
            
            async with session.delete(
                f"https://www.googleapis.com/calendar/v3/calendars/{calendar_id}/events/{event_id}",
                headers=headers
            ) as response:
                if response.status != 204:
                    error_text = await response.text()
                    raise Exception(f"Failed to delete event: {error_text}")
                
                return True


# Register the service with the factory
IntegrationServiceFactory.register(
    IntegrationType.GOOGLE_CALENDAR,
    GoogleCalendarIntegrationService
)