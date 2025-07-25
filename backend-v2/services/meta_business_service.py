"""
Meta Business API service for BookedBarber V2.
Handles OAuth flow, Facebook/Instagram ads management, conversion tracking,
audience management, and business profile integration.
"""

import os
import json
import logging
import hashlib
import hmac
from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime, timedelta
import httpx
from sqlalchemy.orm import Session
from fastapi import HTTPException
from urllib.parse import urlencode

from models.integration import Integration
from models import Appointment, Client
from location_models import BarbershopLocation
from utils.encryption import encrypt_text, decrypt_text


# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class MetaBusinessService:
    """Meta Business API service with OAuth, ads management, and conversion tracking"""
    
    def __init__(self):
        self.app_id = os.getenv("META_APP_ID")
        self.app_secret = os.getenv("META_APP_SECRET")
        self.oauth_base_url = "https://www.facebook.com/v18.0/dialog/oauth"
        self.token_url = "https://graph.facebook.com/v18.0/oauth/access_token"
        self.graph_base_url = "https://graph.facebook.com/v18.0"
        self.business_base_url = "https://business.facebook.com/v18.0"
        
        # Meta Business scopes
        self.scopes = [
            "business_management",
            "ads_management", 
            "ads_read",
            "pages_manage_metadata",
            "pages_manage_posts",
            "pages_read_engagement",
            "instagram_basic",
            "instagram_manage_insights",
            "instagram_content_publish",
            "public_profile",
            "email",
            "catalog_management",
            "leads_retrieval"
        ]
        
        # Rate limiting configuration
        self.rate_limit_window = 3600  # 1 hour in seconds
        self.rate_limit_calls = 200  # Calls per hour
        self.rate_limit_tracker = {}
        
        if not all([self.app_id, self.app_secret]):
            logger.warning("Meta Business OAuth credentials not configured")
    
    def get_oauth_url(self, redirect_uri: str, state: str = None) -> str:
        """Generate OAuth authorization URL for Meta Business access"""
        if not self.app_id:
            raise HTTPException(
                status_code=500,
                detail="Meta Business OAuth not configured. Please set META_APP_ID and META_APP_SECRET."
            )
        
        params = {
            "client_id": self.app_id,
            "redirect_uri": redirect_uri,
            "scope": ",".join(self.scopes),
            "response_type": "code",
            "auth_type": "rerequest",  # Force permission review
        }
        
        if state:
            params["state"] = state
        
        query_string = urlencode(params)
        return f"{self.oauth_base_url}?{query_string}"
    
    async def exchange_code_for_tokens(self, code: str, redirect_uri: str) -> Dict[str, Any]:
        """Exchange authorization code for access tokens"""
        if not all([self.app_id, self.app_secret]):
            raise HTTPException(
                status_code=500,
                detail="Meta Business OAuth credentials not configured"
            )
        
        params = {
            "client_id": self.app_id,
            "client_secret": self.app_secret,
            "code": code,
            "redirect_uri": redirect_uri,
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.get(self.token_url, params=params)
            
        if response.status_code != 200:
            logger.error(f"Token exchange failed: {response.text}")
            raise HTTPException(
                status_code=400,
                detail=f"Failed to exchange code for tokens: {response.text}"
            )
        
        token_data = response.json()
        
        # Exchange short-lived token for long-lived token
        long_lived_token = await self._exchange_for_long_lived_token(token_data["access_token"])
        
        return {
            "access_token": long_lived_token["access_token"],
            "token_type": "bearer",
            "expires_in": long_lived_token.get("expires_in", 5184000),  # 60 days default
        }
    
    async def _exchange_for_long_lived_token(self, short_lived_token: str) -> Dict[str, Any]:
        """Exchange short-lived token for long-lived token (60 days)"""
        params = {
            "grant_type": "fb_exchange_token",
            "client_id": self.app_id,
            "client_secret": self.app_secret,
            "fb_exchange_token": short_lived_token,
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{self.graph_base_url}/oauth/access_token", params=params)
            
        if response.status_code != 200:
            logger.error(f"Long-lived token exchange failed: {response.text}")
            raise HTTPException(
                status_code=400,
                detail=f"Failed to get long-lived token: {response.text}"
            )
        
        return response.json()
    
    async def refresh_access_token(self, current_token: str) -> Dict[str, Any]:
        """Refresh an expiring access token"""
        # Meta tokens are refreshed by exchanging for new long-lived tokens
        return await self._exchange_for_long_lived_token(current_token)
    
    async def get_access_token(self, integration: Integration) -> str:
        """Get valid access token, refreshing if necessary"""
        if not integration.access_token:
            raise HTTPException(
                status_code=400,
                detail="No access token available for Meta Business integration"
            )
        
        # Check if token is expired or expiring soon (within 7 days)
        if integration.is_token_expired() or (
            integration.token_expires_at and 
            integration.token_expires_at < datetime.utcnow() + timedelta(days=7)
        ):
            try:
                current_token = decrypt_text(integration.access_token)
                token_response = await self.refresh_access_token(current_token)
                
                # Update integration with new token
                integration.access_token = encrypt_text(token_response["access_token"])
                
                # Update expiration time
                expires_in = token_response.get("expires_in", 5184000)
                integration.token_expires_at = datetime.utcnow() + timedelta(seconds=expires_in)
                integration.mark_active()
                
                return token_response["access_token"]
            except Exception as e:
                logger.error(f"Failed to refresh Meta token: {str(e)}")
                integration.mark_error(f"Token refresh failed: {str(e)}")
                raise HTTPException(
                    status_code=400,
                    detail="Failed to refresh access token"
                )
        
        return decrypt_text(integration.access_token)
    
    def _check_rate_limit(self, integration_id: int):
        """Check and update rate limit for API calls"""
        current_time = datetime.utcnow().timestamp()
        window_start = current_time - self.rate_limit_window
        
        if integration_id not in self.rate_limit_tracker:
            self.rate_limit_tracker[integration_id] = []
        
        # Remove old entries outside the window
        self.rate_limit_tracker[integration_id] = [
            timestamp for timestamp in self.rate_limit_tracker[integration_id]
            if timestamp > window_start
        ]
        
        # Check if we've exceeded the limit
        if len(self.rate_limit_tracker[integration_id]) >= self.rate_limit_calls:
            raise HTTPException(
                status_code=429,
                detail=f"Rate limit exceeded. Maximum {self.rate_limit_calls} calls per hour."
            )
        
        # Add current call
        self.rate_limit_tracker[integration_id].append(current_time)
    
    async def get_authenticated_client(self, integration: Integration) -> httpx.AsyncClient:
        """Get authenticated HTTP client for Meta API calls"""
        self._check_rate_limit(integration.id)
        access_token = await self.get_access_token(integration)
        
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        }
        
        return httpx.AsyncClient(headers=headers, timeout=30.0)
    
    async def get_user_info(self, integration: Integration) -> Dict[str, Any]:
        """Get basic user information"""
        try:
            async with await self.get_authenticated_client(integration) as client:
                response = await client.get(
                    f"{self.graph_base_url}/me",
                    params={"fields": "id,name,email"}
                )
                
            if response.status_code == 200:
                return response.json()
            else:
                logger.error(f"Failed to get user info: {response.text}")
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Failed to get user info: {response.text}"
                )
                
        except Exception as e:
            logger.error(f"Error getting user info: {str(e)}")
            integration.mark_error(f"Failed to get user info: {str(e)}")
            raise
    
    async def get_ad_accounts(self, integration: Integration) -> List[Dict[str, Any]]:
        """Get all ad accounts accessible by the user"""
        try:
            async with await self.get_authenticated_client(integration) as client:
                response = await client.get(
                    f"{self.graph_base_url}/me/adaccounts",
                    params={
                        "fields": "id,name,account_id,account_status,currency,timezone_name,business",
                        "limit": 100
                    }
                )
                
            if response.status_code == 200:
                data = response.json()
                return data.get("data", [])
            else:
                logger.error(f"Failed to get ad accounts: {response.text}")
                return []
                
        except Exception as e:
            logger.error(f"Error getting ad accounts: {str(e)}")
            integration.mark_error(f"Failed to get ad accounts: {str(e)}")
            return []
    
    async def get_facebook_pages(self, integration: Integration) -> List[Dict[str, Any]]:
        """Get all Facebook pages managed by the user"""
        try:
            async with await self.get_authenticated_client(integration) as client:
                response = await client.get(
                    f"{self.graph_base_url}/me/accounts",
                    params={
                        "fields": "id,name,access_token,category,cover,picture,fan_count",
                        "limit": 100
                    }
                )
                
            if response.status_code == 200:
                data = response.json()
                return data.get("data", [])
            else:
                logger.error(f"Failed to get Facebook pages: {response.text}")
                return []
                
        except Exception as e:
            logger.error(f"Error getting Facebook pages: {str(e)}")
            integration.mark_error(f"Failed to get Facebook pages: {str(e)}")
            return []
    
    async def get_instagram_accounts(self, integration: Integration, page_id: str) -> List[Dict[str, Any]]:
        """Get Instagram business accounts connected to a Facebook page"""
        try:
            async with await self.get_authenticated_client(integration) as client:
                response = await client.get(
                    f"{self.graph_base_url}/{page_id}",
                    params={
                        "fields": "instagram_business_account{id,username,name,profile_picture_url,followers_count,media_count}",
                    }
                )
                
            if response.status_code == 200:
                data = response.json()
                ig_account = data.get("instagram_business_account")
                return [ig_account] if ig_account else []
            else:
                logger.error(f"Failed to get Instagram accounts: {response.text}")
                return []
                
        except Exception as e:
            logger.error(f"Error getting Instagram accounts: {str(e)}")
            return []
    
    async def create_campaign(
        self,
        integration: Integration,
        ad_account_id: str,
        name: str,
        objective: str,
        status: str = "PAUSED",
        budget_optimization: bool = True
    ) -> Dict[str, Any]:
        """Create a new advertising campaign"""
        try:
            campaign_data = {
                "name": name,
                "objective": objective,
                "status": status,
                "campaign_budget_optimization": budget_optimization,
            }
            
            async with await self.get_authenticated_client(integration) as client:
                response = await client.post(
                    f"{self.graph_base_url}/act_{ad_account_id}/campaigns",
                    json=campaign_data
                )
                
            if response.status_code in [200, 201]:
                return response.json()
            else:
                logger.error(f"Failed to create campaign: {response.text}")
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Failed to create campaign: {response.text}"
                )
                
        except Exception as e:
            logger.error(f"Error creating campaign: {str(e)}")
            integration.mark_error(f"Failed to create campaign: {str(e)}")
            raise
    
    async def create_custom_audience(
        self,
        integration: Integration,
        ad_account_id: str,
        name: str,
        description: str,
        customer_data: List[Dict[str, Any]],
        schema: List[str]
    ) -> Dict[str, Any]:
        """Create a custom audience from customer data"""
        try:
            # Create the audience first
            audience_data = {
                "name": name,
                "description": description,
                "subtype": "CUSTOM",
                "customer_file_source": "PARTNER_PROVIDED"
            }
            
            async with await self.get_authenticated_client(integration) as client:
                response = await client.post(
                    f"{self.graph_base_url}/act_{ad_account_id}/customaudiences",
                    json=audience_data
                )
                
            if response.status_code not in [200, 201]:
                logger.error(f"Failed to create custom audience: {response.text}")
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Failed to create custom audience: {response.text}"
                )
            
            audience = response.json()
            audience_id = audience["id"]
            
            # Hash and add customer data
            hashed_data = self._hash_customer_data(customer_data, schema)
            
            # Add users to the audience
            await self._add_users_to_audience(
                integration,
                audience_id,
                hashed_data,
                schema
            )
            
            return audience
            
        except Exception as e:
            logger.error(f"Error creating custom audience: {str(e)}")
            integration.mark_error(f"Failed to create custom audience: {str(e)}")
            raise
    
    def _hash_customer_data(self, customer_data: List[Dict[str, Any]], schema: List[str]) -> List[List[str]]:
        """Hash customer data according to Meta's requirements"""
        hashed_data = []
        
        for customer in customer_data:
            hashed_row = []
            for field in schema:
                value = customer.get(field, "")
                
                if value and field in ["email", "phone", "fn", "ln", "zip", "ct", "st", "country"]:
                    # Normalize and hash according to Meta's requirements
                    if field == "email":
                        value = value.lower().strip()
                    elif field == "phone":
                        # Remove non-numeric characters
                        value = "".join(filter(str.isdigit, value))
                    elif field in ["fn", "ln", "ct", "st"]:  # first name, last name, city, state
                        value = value.lower().strip()
                    elif field == "country":
                        value = value.lower().strip()[:2]  # Use 2-letter country code
                    
                    # Hash with SHA256
                    hashed_value = hashlib.sha256(value.encode()).hexdigest()
                    hashed_row.append(hashed_value)
                else:
                    hashed_row.append(value)
            
            hashed_data.append(hashed_row)
        
        return hashed_data
    
    async def _add_users_to_audience(
        self,
        integration: Integration,
        audience_id: str,
        hashed_data: List[List[str]],
        schema: List[str]
    ):
        """Add hashed user data to a custom audience"""
        # Split data into batches (Meta recommends max 10,000 per request)
        batch_size = 10000
        
        for i in range(0, len(hashed_data), batch_size):
            batch = hashed_data[i:i + batch_size]
            
            payload = {
                "schema": schema,
                "data": batch,
            }
            
            async with await self.get_authenticated_client(integration) as client:
                response = await client.post(
                    f"{self.graph_base_url}/{audience_id}/users",
                    json=payload
                )
                
            if response.status_code not in [200, 201]:
                logger.error(f"Failed to add users to audience: {response.text}")
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Failed to add users to audience: {response.text}"
                )
    
    async def create_lookalike_audience(
        self,
        integration: Integration,
        ad_account_id: str,
        name: str,
        source_audience_id: str,
        country: str,
        ratio: float = 0.01  # 1% lookalike
    ) -> Dict[str, Any]:
        """Create a lookalike audience based on a custom audience"""
        try:
            lookalike_data = {
                "name": name,
                "subtype": "LOOKALIKE",
                "origin_audience_id": source_audience_id,
                "lookalike_spec": json.dumps({
                    "type": "similarity",
                    "country": country,
                    "ratio": ratio
                })
            }
            
            async with await self.get_authenticated_client(integration) as client:
                response = await client.post(
                    f"{self.graph_base_url}/act_{ad_account_id}/customaudiences",
                    json=lookalike_data
                )
                
            if response.status_code in [200, 201]:
                return response.json()
            else:
                logger.error(f"Failed to create lookalike audience: {response.text}")
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Failed to create lookalike audience: {response.text}"
                )
                
        except Exception as e:
            logger.error(f"Error creating lookalike audience: {str(e)}")
            integration.mark_error(f"Failed to create lookalike audience: {str(e)}")
            raise
    
    async def send_conversion_event(
        self,
        integration: Integration,
        pixel_id: str,
        event_name: str,
        event_time: datetime,
        user_data: Dict[str, Any],
        custom_data: Dict[str, Any] = None,
        event_id: str = None,
        action_source: str = "website",
        test_event_code: str = None
    ) -> Dict[str, Any]:
        """Send a conversion event via Conversions API with enhanced privacy and deduplication"""
        try:
            # Hash user data for privacy compliance
            hashed_user_data = self._hash_user_data_for_conversions(user_data)
            
            # Build event data with enhanced parameters
            event_data = {
                "event_name": event_name,
                "event_time": int(event_time.timestamp()),
                "action_source": action_source,
                "user_data": hashed_user_data,
            }
            
            # Add custom data if provided
            if custom_data:
                # Clean and validate custom data
                cleaned_custom_data = self._clean_custom_data(custom_data)
                if cleaned_custom_data:
                    event_data["custom_data"] = cleaned_custom_data
            
            # Add event ID for deduplication
            if event_id:
                event_data["event_id"] = event_id
            
            # Add test event code if in debug mode
            if test_event_code:
                event_data["test_event_code"] = test_event_code
            
            # Send to Conversions API
            payload = {
                "data": [event_data],
                "access_token": await self.get_access_token(integration)
            }
            
            # Add test event code to payload if provided
            if test_event_code:
                payload["test_event_code"] = test_event_code
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.graph_base_url}/{pixel_id}/events",
                    json=payload
                )
                
            if response.status_code in [200, 201]:
                result = response.json()
                
                # Log success in debug mode
                if os.getenv("META_CONVERSIONS_API_DEBUG", "false").lower() == "true":
                    logger.info(f"Conversion event sent successfully: {event_name} (ID: {event_id})")
                
                return result
            else:
                logger.error(f"Failed to send conversion event: {response.text}")
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Failed to send conversion event: {response.text}"
                )
                
        except Exception as e:
            logger.error(f"Error sending conversion event: {str(e)}")
            raise

    async def send_conversion_events_batch(
        self,
        integration: Integration,
        pixel_id: str,
        events: List[Dict[str, Any]],
        test_event_code: str = None
    ) -> Dict[str, Any]:
        """Send multiple conversion events in a single batch for better performance"""
        try:
            processed_events = []
            
            for event in events:
                # Extract event data
                event_name = event.get("event_name")
                event_time = event.get("event_time", datetime.utcnow())
                user_data = event.get("user_data", {})
                custom_data = event.get("custom_data", {})
                event_id = event.get("event_id")
                action_source = event.get("action_source", "website")
                
                # Ensure event_time is datetime
                if isinstance(event_time, (int, float)):
                    event_time = datetime.fromtimestamp(event_time)
                elif isinstance(event_time, str):
                    event_time = datetime.fromisoformat(event_time.replace('Z', '+00:00'))
                
                # Hash user data
                hashed_user_data = self._hash_user_data_for_conversions(user_data)
                
                # Build event data
                event_data = {
                    "event_name": event_name,
                    "event_time": int(event_time.timestamp()),
                    "action_source": action_source,
                    "user_data": hashed_user_data,
                }
                
                # Add custom data if provided
                if custom_data:
                    cleaned_custom_data = self._clean_custom_data(custom_data)
                    if cleaned_custom_data:
                        event_data["custom_data"] = cleaned_custom_data
                
                # Add event ID for deduplication
                if event_id:
                    event_data["event_id"] = event_id
                
                processed_events.append(event_data)
            
            # Send batch to Conversions API
            payload = {
                "data": processed_events,
                "access_token": await self.get_access_token(integration)
            }
            
            # Add test event code if provided
            if test_event_code:
                payload["test_event_code"] = test_event_code
            
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    f"{self.graph_base_url}/{pixel_id}/events",
                    json=payload
                )
                
            if response.status_code in [200, 201]:
                result = response.json()
                
                # Log batch success
                if os.getenv("META_CONVERSIONS_API_DEBUG", "false").lower() == "true":
                    logger.info(f"Batch conversion events sent successfully: {len(processed_events)} events")
                
                return result
            else:
                logger.error(f"Failed to send batch conversion events: {response.text}")
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Failed to send batch conversion events: {response.text}"
                )
                
        except Exception as e:
            logger.error(f"Error sending batch conversion events: {str(e)}")
            raise

    def _hash_user_data_for_conversions(self, user_data: Dict[str, Any]) -> Dict[str, Any]:
        """Hash user data according to Meta's Conversions API requirements"""
        hashed_user_data = {}
        
        for key, value in user_data.items():
            if not value:
                continue
                
            # Fields that should be hashed
            if key in ["em", "ph", "fn", "ln", "db", "ge", "ct", "st", "zp", "country"]:
                # Normalize the value before hashing
                if key == "em":  # email
                    normalized_value = str(value).lower().strip()
                elif key == "ph":  # phone
                    # Remove all non-digit characters
                    normalized_value = "".join(filter(str.isdigit, str(value)))
                elif key in ["fn", "ln"]:  # first name, last name
                    normalized_value = str(value).lower().strip()
                elif key in ["ct", "st"]:  # city, state
                    normalized_value = str(value).lower().strip()
                elif key == "country":
                    # Convert to 2-letter country code
                    normalized_value = str(value).lower().strip()[:2]
                elif key == "db":  # date of birth (YYYYMMDD format)
                    normalized_value = str(value).replace("-", "").replace("/", "")
                elif key == "ge":  # gender (m/f)
                    normalized_value = str(value).lower().strip()[:1]
                elif key == "zp":  # zip code
                    normalized_value = str(value).strip()
                else:
                    normalized_value = str(value).lower().strip()
                
                # Hash the normalized value
                if normalized_value:
                    hashed_user_data[key] = hashlib.sha256(normalized_value.encode()).hexdigest()
                    
            # Fields that should NOT be hashed
            elif key in ["client_ip_address", "client_user_agent", "fbc", "fbp", "external_id"]:
                hashed_user_data[key] = str(value)
        
        return hashed_user_data

    def _clean_custom_data(self, custom_data: Dict[str, Any]) -> Dict[str, Any]:
        """Clean and validate custom data for Conversions API"""
        cleaned_data = {}
        
        # Standard e-commerce fields
        ecommerce_fields = [
            "currency", "value", "content_ids", "content_type", "content_name",
            "content_category", "num_items", "order_id", "predicted_ltv",
            "search_string", "status"
        ]
        
        for field in ecommerce_fields:
            if field in custom_data and custom_data[field] is not None:
                value = custom_data[field]
                
                # Validate and convert value
                if field == "value" and isinstance(value, (int, float, str)):
                    try:
                        cleaned_data[field] = float(value)
                    except (ValueError, TypeError):
                        continue
                elif field == "num_items" and isinstance(value, (int, str)):
                    try:
                        cleaned_data[field] = int(value)
                    except (ValueError, TypeError):
                        continue
                elif field == "content_ids" and isinstance(value, (list, tuple)):
                    cleaned_data[field] = [str(item) for item in value if item is not None]
                elif field == "status" and isinstance(value, bool):
                    cleaned_data[field] = value
                elif isinstance(value, (str, int, float)):
                    cleaned_data[field] = str(value)
        
        # Add custom barbershop fields
        barbershop_fields = [
            "appointment_id", "barber_id", "service_id", "service_name",
            "duration_minutes", "location_id", "user_role", "payment_method"
        ]
        
        for field in barbershop_fields:
            if field in custom_data and custom_data[field] is not None:
                cleaned_data[field] = str(custom_data[field])
        
        return cleaned_data

    async def validate_conversion_event(
        self,
        integration: Integration,
        pixel_id: str,
        event_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Validate a conversion event using Meta's validation endpoint"""
        try:
            payload = {
                "data": [event_data],
                "access_token": await self.get_access_token(integration)
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"https://graph.facebook.com/v18.0/{pixel_id}/events",
                    params={"debug": "1"},
                    json=payload
                )
                
            if response.status_code == 200:
                return response.json()
            else:
                logger.error(f"Failed to validate conversion event: {response.text}")
                return {"valid": False, "error": response.text}
                
        except Exception as e:
            logger.error(f"Error validating conversion event: {str(e)}")
            return {"valid": False, "error": str(e)}
    
    async def upload_offline_events(
        self,
        integration: Integration,
        offline_event_set_id: str,
        events: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Upload offline conversion events (e.g., in-store purchases)"""
        try:
            # Process and hash event data
            processed_events = []
            for event in events:
                user_data = event.get("user_data", {})
                hashed_user_data = {}
                
                # Hash user identifiers
                for key, value in user_data.items():
                    if value and key in ["email", "phone", "fn", "ln"]:
                        if key == "email":
                            value = value.lower().strip()
                        elif key == "phone":
                            value = "".join(filter(str.isdigit, value))
                        else:
                            value = value.lower().strip()
                        
                        hashed_user_data[key] = hashlib.sha256(value.encode()).hexdigest()
                
                processed_event = {
                    "event_name": event.get("event_name", "Purchase"),
                    "event_time": event.get("event_time"),
                    "user_data": hashed_user_data,
                    "custom_data": event.get("custom_data", {}),
                    "currency": event.get("currency", "USD"),
                    "value": event.get("value", 0),
                }
                
                if "order_id" in event:
                    processed_event["order_id"] = event["order_id"]
                
                processed_events.append(processed_event)
            
            # Upload events
            payload = {
                "upload_tag": f"bookedbarber_offline_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
                "data": processed_events
            }
            
            async with await self.get_authenticated_client(integration) as client:
                response = await client.post(
                    f"{self.graph_base_url}/{offline_event_set_id}/events",
                    json=payload
                )
                
            if response.status_code in [200, 201]:
                return response.json()
            else:
                logger.error(f"Failed to upload offline events: {response.text}")
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Failed to upload offline events: {response.text}"
                )
                
        except Exception as e:
            logger.error(f"Error uploading offline events: {str(e)}")
            integration.mark_error(f"Failed to upload offline events: {str(e)}")
            raise
    
    async def get_ad_account_insights(
        self,
        integration: Integration,
        ad_account_id: str,
        date_preset: str = "last_30d",
        fields: List[str] = None,
        breakdowns: List[str] = None
    ) -> Dict[str, Any]:
        """Get advertising insights and performance data"""
        try:
            if not fields:
                fields = [
                    "impressions", "clicks", "spend", "cpm", "cpc", "ctr",
                    "conversions", "conversion_rate", "cost_per_conversion",
                    "reach", "frequency", "actions"
                ]
            
            params = {
                "fields": ",".join(fields),
                "date_preset": date_preset,
                "level": "account",
            }
            
            if breakdowns:
                params["breakdowns"] = ",".join(breakdowns)
            
            async with await self.get_authenticated_client(integration) as client:
                response = await client.get(
                    f"{self.graph_base_url}/act_{ad_account_id}/insights",
                    params=params
                )
                
            if response.status_code == 200:
                data = response.json()
                return data.get("data", [])
            else:
                logger.error(f"Failed to get ad insights: {response.text}")
                return []
                
        except Exception as e:
            logger.error(f"Error getting ad insights: {str(e)}")
            integration.mark_error(f"Failed to get ad insights: {str(e)}")
            return []
    
    async def get_pixel_stats(
        self,
        integration: Integration,
        pixel_id: str,
        aggregation: str = "event_type"
    ) -> Dict[str, Any]:
        """Get Facebook Pixel statistics"""
        try:
            params = {
                "aggregation": aggregation,
                "start_time": int((datetime.utcnow() - timedelta(days=7)).timestamp()),
                "end_time": int(datetime.utcnow().timestamp()),
            }
            
            async with await self.get_authenticated_client(integration) as client:
                response = await client.get(
                    f"{self.graph_base_url}/{pixel_id}/stats",
                    params=params
                )
                
            if response.status_code == 200:
                return response.json()
            else:
                logger.error(f"Failed to get pixel stats: {response.text}")
                return {}
                
        except Exception as e:
            logger.error(f"Error getting pixel stats: {str(e)}")
            return {}
    
    async def create_instagram_post(
        self,
        integration: Integration,
        instagram_account_id: str,
        image_url: str,
        caption: str,
        location_id: Optional[str] = None,
        user_tags: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """Create a post on Instagram business account"""
        try:
            # First, create a media container
            container_params = {
                "image_url": image_url,
                "caption": caption,
            }
            
            if location_id:
                container_params["location_id"] = location_id
            
            if user_tags:
                container_params["user_tags"] = json.dumps(user_tags)
            
            async with await self.get_authenticated_client(integration) as client:
                # Create media container
                container_response = await client.post(
                    f"{self.graph_base_url}/{instagram_account_id}/media",
                    params=container_params
                )
                
                if container_response.status_code not in [200, 201]:
                    logger.error(f"Failed to create media container: {container_response.text}")
                    raise HTTPException(
                        status_code=container_response.status_code,
                        detail=f"Failed to create media container: {container_response.text}"
                    )
                
                container = container_response.json()
                creation_id = container["id"]
                
                # Publish the media
                publish_response = await client.post(
                    f"{self.graph_base_url}/{instagram_account_id}/media_publish",
                    params={"creation_id": creation_id}
                )
                
                if publish_response.status_code not in [200, 201]:
                    logger.error(f"Failed to publish Instagram post: {publish_response.text}")
                    raise HTTPException(
                        status_code=publish_response.status_code,
                        detail=f"Failed to publish Instagram post: {publish_response.text}"
                    )
                
                return publish_response.json()
                
        except Exception as e:
            logger.error(f"Error creating Instagram post: {str(e)}")
            integration.mark_error(f"Failed to create Instagram post: {str(e)}")
            raise
    
    async def get_instagram_insights(
        self,
        integration: Integration,
        instagram_account_id: str,
        metrics: List[str] = None,
        period: str = "day"
    ) -> Dict[str, Any]:
        """Get Instagram business account insights"""
        try:
            if not metrics:
                metrics = [
                    "impressions", "reach", "profile_views",
                    "website_clicks", "follower_count"
                ]
            
            params = {
                "metric": ",".join(metrics),
                "period": period,
            }
            
            async with await self.get_authenticated_client(integration) as client:
                response = await client.get(
                    f"{self.graph_base_url}/{instagram_account_id}/insights",
                    params=params
                )
                
            if response.status_code == 200:
                data = response.json()
                return data.get("data", [])
            else:
                logger.error(f"Failed to get Instagram insights: {response.text}")
                return []
                
        except Exception as e:
            logger.error(f"Error getting Instagram insights: {str(e)}")
            return []
    
    def verify_webhook_signature(self, payload: bytes, signature: str) -> bool:
        """Verify webhook signature from Meta"""
        if not self.app_secret:
            logger.warning("App secret not configured, cannot verify webhook signature")
            return False
        
        expected_signature = hmac.new(
            self.app_secret.encode(),
            payload,
            hashlib.sha256
        ).hexdigest()
        
        return hmac.compare_digest(f"sha256={expected_signature}", signature)
    
    async def sync_booking_conversions(
        self,
        db: Session,
        integration: Integration,
        pixel_id: str,
        start_date: datetime,
        end_date: datetime
    ) -> Tuple[int, List[str]]:
        """
        Sync booking conversions to Meta for better ad optimization.
        Returns: (conversion_count, errors)
        """
        try:
            # Get bookings within date range
            bookings = db.query(Appointment).filter(
                Appointment.user_id == integration.user_id,
                Appointment.created_at >= start_date,
                Appointment.created_at <= end_date,
                Appointment.status.in_(["confirmed", "completed"])
            ).all()
            
            conversion_count = 0
            errors = []
            
            for booking in bookings:
                try:
                    # Get customer info
                    customer = booking.client
                    
                    # Prepare user data for hashing
                    user_data = {
                        "em": customer.email if customer else None,
                        "ph": customer.phone if customer else None,
                        "fn": customer.first_name if customer else None,
                        "ln": customer.last_name if customer else None,
                    }
                    
                    # Remove None values
                    user_data = {k: v for k, v in user_data.items() if v}
                    
                    # Prepare custom data
                    custom_data = {
                        "value": float(booking.total_price) if booking.total_price else 0,
                        "currency": "USD",
                        "content_type": "product",
                        "content_ids": [f"service_{booking.service_id}"],
                        "content_name": booking.service.name if booking.service else "Booking",
                    }
                    
                    # Send conversion event
                    await self.send_conversion_event(
                        integration=integration,
                        pixel_id=pixel_id,
                        event_name="Purchase",
                        event_time=booking.created_at,
                        user_data=user_data,
                        custom_data=custom_data,
                        event_id=f"booking_{booking.id}",
                        action_source="system"
                    )
                    
                    conversion_count += 1
                    
                except Exception as e:
                    error_msg = f"Failed to sync booking {booking.id}: {str(e)}"
                    errors.append(error_msg)
                    logger.error(error_msg)
            
            return conversion_count, errors
            
        except Exception as e:
            error_msg = f"Failed to sync booking conversions: {str(e)}"
            logger.error(error_msg)
            raise HTTPException(
                status_code=500,
                detail=error_msg
            )
    
    async def create_customer_audience_from_bookings(
        self,
        db: Session,
        integration: Integration,
        ad_account_id: str,
        name: str,
        description: str,
        min_bookings: int = 1,
        days_back: int = 180
    ) -> Dict[str, Any]:
        """Create a custom audience from customers who have made bookings"""
        try:
            # Get customers with bookings
            cutoff_date = datetime.utcnow() - timedelta(days=days_back)
            
            # Query for clients with minimum bookings
            clients = db.query(Client).join(Appointment).filter(
                Appointment.created_at >= cutoff_date,
                Appointment.status.in_(["confirmed", "completed"]),
                Appointment.location_id.in_(
                    db.query(BarbershopLocation.id).filter(BarbershopLocation.owner_id == integration.user_id)
                )
            ).group_by(Client.id).having(
                db.func.count(Appointment.id) >= min_bookings
            ).all()
            
            # Prepare customer data
            customer_data = []
            schema = ["email", "phone", "fn", "ln"]
            
            for client in clients:
                data = {
                    "email": client.email,
                    "phone": client.phone,
                    "fn": client.first_name,
                    "ln": client.last_name,
                }
                customer_data.append(data)
            
            # Create custom audience
            audience = await self.create_custom_audience(
                integration=integration,
                ad_account_id=ad_account_id,
                name=name,
                description=description,
                customer_data=customer_data,
                schema=schema
            )
            
            return audience
            
        except Exception as e:
            error_msg = f"Failed to create customer audience: {str(e)}"
            logger.error(error_msg)
            raise HTTPException(
                status_code=500,
                detail=error_msg
            )
    
    async def test_connection(self, integration: Integration) -> Dict[str, Any]:
        """Test the Meta Business integration connection"""
        try:
            # Get user info
            user_info = await self.get_user_info(integration)
            
            # Get ad accounts
            ad_accounts = await self.get_ad_accounts(integration)
            
            # Get Facebook pages
            pages = await self.get_facebook_pages(integration)
            
            # Check for Instagram accounts on first page
            instagram_accounts = []
            if pages:
                ig_accounts = await self.get_instagram_accounts(integration, pages[0]["id"])
                instagram_accounts.extend(ig_accounts)
            
            return {
                "healthy": True,
                "message": f"Connected successfully as {user_info.get('name', 'Unknown')}",
                "user_name": user_info.get("name"),
                "user_id": user_info.get("id"),
                "ad_accounts_count": len(ad_accounts),
                "pages_count": len(pages),
                "instagram_accounts_count": len(instagram_accounts),
                "ad_accounts": [
                    {
                        "id": acc.get("account_id"),
                        "name": acc.get("name"),
                        "currency": acc.get("currency"),
                        "status": acc.get("account_status")
                    }
                    for acc in ad_accounts[:3]
                ],
                "pages": [
                    {
                        "id": page.get("id"),
                        "name": page.get("name"),
                        "category": page.get("category"),
                        "fan_count": page.get("fan_count")
                    }
                    for page in pages[:3]
                ]
            }
            
        except Exception as e:
            return {
                "healthy": False,
                "message": f"Connection test failed: {str(e)}",
                "error": str(e)
            }


# Singleton instance
meta_business_service = MetaBusinessService()