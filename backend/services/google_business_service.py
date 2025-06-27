"""
Google Business Profile API Integration Service
Handles OAuth flow, profile management, and data synchronization
with Google My Business API
"""

import logging
import httpx
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
import asyncio
from urllib.parse import urlencode

logger = logging.getLogger(__name__)


class GoogleBusinessService:
    """Service for Google My Business API integration"""

    def __init__(self):
        self.base_url = "https://mybusinessbusinessinformation.googleapis.com/v1"
        self.account_management_url = (
            "https://mybusinessaccountmanagement.googleapis.com/v1"
        )
        self.posts_url = "https://mybusinesscontent.googleapis.com/v1"
        self.insights_url = "https://mybusinessbusinessinformation.googleapis.com/v1"

        # OAuth configuration
        self.oauth_url = "https://accounts.google.com/o/oauth2/v2/auth"
        self.token_url = "https://oauth2.googleapis.com/token"
        self.revoke_url = "https://oauth2.googleapis.com/revoke"

        # Required scopes for Google My Business
        self.scopes = [
            "https://www.googleapis.com/auth/business.manage",
            "https://www.googleapis.com/auth/plus.business.manage",
        ]

    # OAuth Flow Methods

    def generate_oauth_url(self, client_id: str, redirect_uri: str, state: str) -> str:
        """Generate OAuth authorization URL"""
        params = {
            "client_id": client_id,
            "redirect_uri": redirect_uri,
            "scope": " ".join(self.scopes),
            "response_type": "code",
            "access_type": "offline",
            "prompt": "consent",
            "state": state,
        }

        return f"{self.oauth_url}?{urlencode(params)}"

    async def exchange_code_for_tokens(
        self, code: str, client_id: str, client_secret: str, redirect_uri: str
    ) -> Dict[str, Any]:
        """Exchange authorization code for access and refresh tokens"""
        try:
            data = {
                "code": code,
                "client_id": client_id,
                "client_secret": client_secret,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code",
            }

            async with httpx.AsyncClient() as client:
                response = await client.post(self.token_url, data=data)
                response.raise_for_status()

                token_data = response.json()
                return {
                    "access_token": token_data.get("access_token"),
                    "refresh_token": token_data.get("refresh_token"),
                    "expires_in": token_data.get("expires_in", 3600),
                    "token_type": token_data.get("token_type", "Bearer"),
                }

        except httpx.HTTPError as e:
            logger.error(f"Error exchanging code for tokens: {str(e)}")
            raise Exception(f"OAuth token exchange failed: {str(e)}")

    async def refresh_access_token(
        self, refresh_token: str, client_id: str, client_secret: str
    ) -> Dict[str, Any]:
        """Refresh access token using refresh token"""
        try:
            data = {
                "refresh_token": refresh_token,
                "client_id": client_id,
                "client_secret": client_secret,
                "grant_type": "refresh_token",
            }

            async with httpx.AsyncClient() as client:
                response = await client.post(self.token_url, data=data)
                response.raise_for_status()

                token_data = response.json()
                return {
                    "access_token": token_data.get("access_token"),
                    "expires_in": token_data.get("expires_in", 3600),
                    "token_type": token_data.get("token_type", "Bearer"),
                }

        except httpx.HTTPError as e:
            logger.error(f"Error refreshing access token: {str(e)}")
            raise Exception(f"Token refresh failed: {str(e)}")

    # API Methods

    async def _make_api_request(
        self,
        method: str,
        url: str,
        access_token: str,
        data: Optional[Dict] = None,
        params: Optional[Dict] = None,
    ) -> Optional[Dict[str, Any]]:
        """Make authenticated API request to Google My Business"""
        try:
            headers = {
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
            }

            async with httpx.AsyncClient(timeout=30.0) as client:
                if method.upper() == "GET":
                    response = await client.get(url, headers=headers, params=params)
                elif method.upper() == "POST":
                    response = await client.post(
                        url, headers=headers, json=data, params=params
                    )
                elif method.upper() == "PATCH":
                    response = await client.patch(
                        url, headers=headers, json=data, params=params
                    )
                elif method.upper() == "DELETE":
                    response = await client.delete(url, headers=headers, params=params)
                else:
                    raise ValueError(f"Unsupported HTTP method: {method}")

                if response.status_code == 401:
                    logger.warning("Access token expired or invalid")
                    return None

                response.raise_for_status()

                if response.status_code == 204:  # No content
                    return {"success": True}

                return response.json()

        except httpx.HTTPError as e:
            logger.error(f"API request failed: {str(e)}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error in API request: {str(e)}")
            return None

    async def get_accounts(self, access_token: str) -> List[Dict[str, Any]]:
        """Get list of Google My Business accounts"""
        url = f"{self.account_management_url}/accounts"
        response = await self._make_api_request("GET", url, access_token)

        if response and "accounts" in response:
            return response["accounts"]
        return []

    async def get_locations(
        self, access_token: str, account_name: str
    ) -> List[Dict[str, Any]]:
        """Get list of business locations for an account"""
        url = f"{self.base_url}/{account_name}/locations"
        params = {"readMask": "name,title,phoneNumbers,categories,profile"}

        response = await self._make_api_request("GET", url, access_token, params=params)

        if response and "locations" in response:
            return response["locations"]
        return []

    async def get_business_profile(
        self, location_name: str, access_token: str
    ) -> Optional[Dict[str, Any]]:
        """Get detailed business profile information"""
        url = f"{self.base_url}/{location_name}"
        params = {
            "readMask": "name,title,phoneNumbers,categories,profile,regularHours,specialHours,metadata"
        }

        response = await self._make_api_request("GET", url, access_token, params=params)

        if response:
            # Transform API response to our format
            profile_data = {
                "business_name": response.get("title", ""),
                "business_description": response.get("profile", {}).get(
                    "description", ""
                ),
                "primary_category": self._extract_primary_category(
                    response.get("categories", [])
                ),
                "secondary_categories": self._extract_secondary_categories(
                    response.get("categories", [])
                ),
                "business_phone": self._extract_phone_number(
                    response.get("phoneNumbers", [])
                ),
                "business_hours": self._transform_hours(
                    response.get("regularHours", {})
                ),
                "special_hours": self._transform_special_hours(
                    response.get("specialHours", [])
                ),
                "is_verified": response.get("metadata", {}).get(
                    "canModifyServiceList", False
                ),
                "is_published": response.get("metadata", {}).get("canDelete", False),
                "google_place_id": response.get("name", "").split("/")[-1],
            }

            return profile_data

        return None

    async def update_business_profile(
        self, location_name: str, access_token: str, profile_data: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Update business profile information"""
        url = f"{self.base_url}/{location_name}"

        # Transform our data format to Google API format
        update_data = self._transform_to_google_format(profile_data)

        params = {
            "updateMask": "title,phoneNumbers,categories,profile.description,regularHours"
        }

        response = await self._make_api_request(
            "PATCH", url, access_token, data=update_data, params=params
        )

        return response

    async def get_reviews(
        self, location_name: str, access_token: str, page_token: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get customer reviews for a location"""
        url = f"{self.base_url}/{location_name}/reviews"
        params = {}

        if page_token:
            params["pageToken"] = page_token

        response = await self._make_api_request("GET", url, access_token, params=params)

        if response:
            return {
                "reviews": response.get("reviews", []),
                "next_page_token": response.get("nextPageToken"),
                "total_review_count": response.get("totalReviewCount", 0),
                "average_rating": response.get("averageRating", 0.0),
            }

        return {
            "reviews": [],
            "next_page_token": None,
            "total_review_count": 0,
            "average_rating": 0.0,
        }

    async def reply_to_review(
        self, review_name: str, access_token: str, reply_text: str
    ) -> Optional[Dict[str, Any]]:
        """Reply to a customer review"""
        url = f"{self.base_url}/{review_name}/reply"

        data = {"comment": reply_text}

        response = await self._make_api_request("PUT", url, access_token, data=data)
        return response

    async def get_insights(
        self, location_name: str, access_token: str, start_date: str, end_date: str
    ) -> Dict[str, Any]:
        """Get business insights and analytics"""
        url = f"{self.insights_url}/{location_name}/locations:reportInsights"

        data = {
            "locationNames": [location_name],
            "basicRequest": {
                "timeRange": {
                    "startTime": f"{start_date}T00:00:00Z",
                    "endTime": f"{end_date}T23:59:59Z",
                },
                "metricRequests": [
                    {"metric": "ALL"},  # Get all available metrics
                ],
            },
        }

        response = await self._make_api_request("POST", url, access_token, data=data)

        if response and "locationMetrics" in response:
            metrics = (
                response["locationMetrics"][0] if response["locationMetrics"] else {}
            )
            return self._transform_insights(metrics)

        return {
            "total_views": 0,
            "total_searches": 0,
            "total_calls": 0,
            "total_directions": 0,
            "total_website_clicks": 0,
        }

    # Helper Methods

    def _extract_primary_category(self, categories: List[Dict]) -> str:
        """Extract primary business category"""
        for category in categories:
            if category.get("primaryCategory"):
                return category.get("displayName", "")

        # If no primary category found, return first category
        if categories:
            return categories[0].get("displayName", "")

        return ""

    def _extract_secondary_categories(self, categories: List[Dict]) -> List[str]:
        """Extract secondary business categories"""
        secondary = []
        for category in categories:
            if not category.get("primaryCategory"):
                display_name = category.get("displayName", "")
                if display_name:
                    secondary.append(display_name)
        return secondary

    def _extract_phone_number(self, phone_numbers: List[Dict]) -> str:
        """Extract primary phone number"""
        for phone in phone_numbers:
            if phone.get("type") == "PRIMARY":
                return phone.get("number", "")

        # If no primary phone, return first phone number
        if phone_numbers:
            return phone_numbers[0].get("number", "")

        return ""

    def _transform_hours(self, regular_hours: Dict) -> Dict[str, Any]:
        """Transform Google API hours format to our format"""
        if not regular_hours or "periods" not in regular_hours:
            return {}

        hours = {}
        day_mapping = {
            "MONDAY": "monday",
            "TUESDAY": "tuesday",
            "WEDNESDAY": "wednesday",
            "THURSDAY": "thursday",
            "FRIDAY": "friday",
            "SATURDAY": "saturday",
            "SUNDAY": "sunday",
        }

        for period in regular_hours["periods"]:
            if "openDay" in period and "openTime" in period:
                day = day_mapping.get(period["openDay"])
                if day:
                    open_time = self._format_time(period["openTime"])
                    close_time = self._format_time(period.get("closeTime", {}))

                    hours[day] = {
                        "open": open_time,
                        "close": close_time,
                        "is_open": True,
                    }

        return hours

    def _transform_special_hours(self, special_hours: List[Dict]) -> List[Dict]:
        """Transform special hours format"""
        transformed = []

        for special in special_hours:
            if "date" in special:
                transformed.append(
                    {
                        "date": special["date"],
                        "is_closed": special.get("isClosed", False),
                        "periods": special.get("periods", []),
                    }
                )

        return transformed

    def _format_time(self, time_dict: Dict) -> str:
        """Format time from Google API format to HH:MM"""
        if not time_dict:
            return ""

        hours = time_dict.get("hours", 0)
        minutes = time_dict.get("minutes", 0)

        return f"{hours:02d}:{minutes:02d}"

    def _transform_to_google_format(
        self, profile_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Transform our profile format to Google API format"""
        google_data = {}

        if "business_name" in profile_data:
            google_data["title"] = profile_data["business_name"]

        if "business_description" in profile_data:
            google_data["profile"] = {
                "description": profile_data["business_description"]
            }

        if "business_phone" in profile_data:
            google_data["phoneNumbers"] = [
                {"number": profile_data["business_phone"], "type": "PRIMARY"}
            ]

        # Add more transformations as needed

        return google_data

    def _transform_insights(self, metrics: Dict) -> Dict[str, Any]:
        """Transform insights data from Google API format"""
        insights = {
            "total_views": 0,
            "total_searches": 0,
            "total_calls": 0,
            "total_directions": 0,
            "total_website_clicks": 0,
            "photo_views": 0,
            "photos_count": 0,
        }

        if "metricValues" in metrics:
            for metric in metrics["metricValues"]:
                metric_type = metric.get("metric")
                total_value = metric.get("totalValue", {}).get("value", 0)

                if metric_type == "VIEWS_MAPS":
                    insights["total_views"] += int(total_value)
                elif metric_type == "VIEWS_SEARCH":
                    insights["total_searches"] += int(total_value)
                elif metric_type == "ACTIONS_PHONE":
                    insights["total_calls"] = int(total_value)
                elif metric_type == "ACTIONS_DRIVING_DIRECTIONS":
                    insights["total_directions"] = int(total_value)
                elif metric_type == "ACTIONS_WEBSITE":
                    insights["total_website_clicks"] = int(total_value)

        return insights

    async def validate_access_token(self, access_token: str) -> bool:
        """Validate if access token is still valid"""
        try:
            accounts = await self.get_accounts(access_token)
            return accounts is not None
        except Exception:
            return False


# Dependency injection function
def get_google_business_service() -> GoogleBusinessService:
    """Dependency injection for GoogleBusinessService"""
    return GoogleBusinessService()
