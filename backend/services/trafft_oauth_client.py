"""
Real Trafft OAuth API Client
Handles OAuth 2.0 authentication and API calls to Trafft
"""

import aiohttp
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
import json

logger = logging.getLogger(__name__)


class TrafftOAuthError(Exception):
    """Exception raised for Trafft OAuth API errors"""

    pass


class TrafftOAuthClient:
    """
    Real Trafft OAuth API client for production use
    """

    def __init__(self, client_id: str, client_secret: str, base_url: str):
        self.client_id = client_id
        self.client_secret = client_secret
        self.base_url = base_url.rstrip("/")
        self.access_token = None
        self.refresh_token = None
        self.token_expires_at = None
        self.session = None

    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()

    async def authenticate(self) -> Dict[str, Any]:
        """
        Exchange client credentials for access token using OAuth 2.0 Client Credentials flow
        """
        try:
            # Trafft API authentication endpoint
            auth_url = f"{self.base_url}/oauth/token"

            auth_data = {
                "grant_type": "client_credentials",
                "client_id": self.client_id,
                "client_secret": self.client_secret,
                "scope": "read write",  # Adjust scopes as needed
            }

            headers = {
                "Content-Type": "application/x-www-form-urlencoded",
                "Accept": "application/json",
            }

            logger.info(f"Authenticating with Trafft API at {auth_url}")

            async with self.session.post(
                auth_url, data=auth_data, headers=headers
            ) as response:
                if response.status == 200:
                    token_data = await response.json()

                    self.access_token = token_data.get("access_token")
                    self.refresh_token = token_data.get("refresh_token")
                    expires_in = token_data.get("expires_in", 3600)

                    self.token_expires_at = datetime.now() + timedelta(
                        seconds=expires_in
                    )

                    logger.info("Successfully authenticated with Trafft API")
                    return token_data
                else:
                    error_text = await response.text()
                    logger.error(
                        f"Authentication failed: {response.status} - {error_text}"
                    )
                    raise TrafftOAuthError(
                        f"Authentication failed: {response.status} - {error_text}"
                    )

        except aiohttp.ClientError as e:
            logger.error(f"Network error during authentication: {e}")
            raise TrafftOAuthError(f"Network error: {e}")

    async def _ensure_valid_token(self):
        """Ensure we have a valid access token"""
        if not self.access_token or (
            self.token_expires_at and datetime.now() >= self.token_expires_at
        ):
            await self.authenticate()

    async def _make_api_call(
        self, method: str, endpoint: str, **kwargs
    ) -> Dict[str, Any]:
        """Make authenticated API call to Trafft"""
        await self._ensure_valid_token()

        url = f"{self.base_url}/api/v1{endpoint}"
        headers = kwargs.get("headers", {})
        headers.update(
            {
                "Authorization": f"Bearer {self.access_token}",
                "Accept": "application/json",
                "Content-Type": "application/json",
            }
        )
        kwargs["headers"] = headers

        logger.debug(f"Making {method} request to {url}")

        async with self.session.request(method, url, **kwargs) as response:
            if response.status in [200, 201]:
                return await response.json()
            elif response.status == 401:
                # Token expired, try to refresh
                logger.warning("Token expired, re-authenticating...")
                await self.authenticate()
                headers["Authorization"] = f"Bearer {self.access_token}"

                # Retry the request
                async with self.session.request(
                    method, url, **kwargs
                ) as retry_response:
                    if retry_response.status in [200, 201]:
                        return await retry_response.json()
                    else:
                        error_text = await retry_response.text()
                        raise TrafftOAuthError(
                            f"API call failed: {retry_response.status} - {error_text}"
                        )
            else:
                error_text = await response.text()
                raise TrafftOAuthError(
                    f"API call failed: {response.status} - {error_text}"
                )

    async def get_locations(self) -> List[Dict[str, Any]]:
        """Get all locations from Trafft"""
        try:
            result = await self._make_api_call("GET", "/locations")
            return result.get("data", [])
        except Exception as e:
            logger.error(f"Failed to get locations: {e}")
            raise TrafftOAuthError(f"Failed to get locations: {e}")

    async def get_employees(self) -> List[Dict[str, Any]]:
        """Get all employees/staff from Trafft"""
        try:
            result = await self._make_api_call("GET", "/employees")
            return result.get("data", [])
        except Exception as e:
            logger.error(f"Failed to get employees: {e}")
            raise TrafftOAuthError(f"Failed to get employees: {e}")

    async def get_services(self) -> List[Dict[str, Any]]:
        """Get all services from Trafft"""
        try:
            result = await self._make_api_call("GET", "/services")
            return result.get("data", [])
        except Exception as e:
            logger.error(f"Failed to get services: {e}")
            raise TrafftOAuthError(f"Failed to get services: {e}")

    async def get_appointments(
        self, start_date: datetime, end_date: datetime
    ) -> List[Dict[str, Any]]:
        """Get appointments within date range"""
        try:
            params = {
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
            }
            result = await self._make_api_call("GET", "/appointments", params=params)
            return result.get("data", [])
        except Exception as e:
            logger.error(f"Failed to get appointments: {e}")
            raise TrafftOAuthError(f"Failed to get appointments: {e}")

    async def get_customers(self) -> List[Dict[str, Any]]:
        """Get all customers from Trafft"""
        try:
            result = await self._make_api_call("GET", "/customers")
            return result.get("data", [])
        except Exception as e:
            logger.error(f"Failed to get customers: {e}")
            raise TrafftOAuthError(f"Failed to get customers: {e}")

    async def register_webhook(
        self, webhook_url: str, events: List[str], secret: str
    ) -> Dict[str, Any]:
        """Register webhook with Trafft"""
        try:
            webhook_data = {
                "url": webhook_url,
                "events": events,
                "secret": secret,
                "active": True,
            }

            result = await self._make_api_call("POST", "/webhooks", json=webhook_data)
            logger.info(f"Webhook registered successfully: {webhook_url}")
            return result
        except Exception as e:
            logger.error(f"Failed to register webhook: {e}")
            raise TrafftOAuthError(f"Failed to register webhook: {e}")

    async def test_connection(self) -> Dict[str, Any]:
        """Test the API connection and return account info"""
        try:
            await self.authenticate()

            # Get basic account info to verify connection
            locations = await self.get_locations()
            employees = await self.get_employees()
            services = await self.get_services()

            return {
                "connected": True,
                "locations_count": len(locations),
                "employees_count": len(employees),
                "services_count": len(services),
                "locations": locations[:3],  # First 3 for preview
                "employees": employees[:3],  # First 3 for preview
                "services": services[:3],  # First 3 for preview
            }
        except Exception as e:
            logger.error(f"Connection test failed: {e}")
            raise TrafftOAuthError(f"Connection test failed: {e}")
