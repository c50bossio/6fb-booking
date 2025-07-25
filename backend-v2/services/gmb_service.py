"""
Google My Business (GMB) API service for BookedBarber V2.
Handles OAuth flow, location management, review fetching, and business data sync.
"""

import os
import logging
from typing import Dict, List, Tuple, Any
from datetime import datetime, timedelta
import httpx
from sqlalchemy.orm import Session
from fastapi import HTTPException

from models.review import Review, ReviewPlatform, ReviewSentiment
from models.integration import Integration
from schemas_new.review import GMBLocation, ReviewCreate
from utils.encryption import decrypt_text


# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class GMBService:
    """Google My Business API service with OAuth and review management"""
    
    def __init__(self):
        self.client_id = os.getenv("GOOGLE_CLIENT_ID")
        self.client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
        self.oauth_base_url = "https://accounts.google.com/o/oauth2/v2/auth"
        self.token_url = "https://oauth2.googleapis.com/token"
        self.gmb_base_url = "https://mybusinessbusinessinformation.googleapis.com/v1"
        self.reviews_base_url = "https://mybusiness.googleapis.com/v4"
        
        # GMB OAuth scopes
        self.scopes = [
            "https://www.googleapis.com/auth/business.manage",
            "https://www.googleapis.com/auth/plus.business.manage"
        ]
        
        if not all([self.client_id, self.client_secret]):
            logger.warning("Google OAuth credentials not configured")
    
    def get_oauth_url(self, redirect_uri: str, state: str = None) -> str:
        """Generate OAuth authorization URL for GMB access"""
        if not self.client_id:
            raise HTTPException(
                status_code=500,
                detail="Google OAuth not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET."
            )
        
        params = {
            "client_id": self.client_id,
            "response_type": "code",
            "scope": " ".join(self.scopes),
            "redirect_uri": redirect_uri,
            "access_type": "offline",
            "prompt": "consent",
        }
        
        if state:
            params["state"] = state
        
        query_string = "&".join([f"{k}={v}" for k, v in params.items()])
        return f"{self.oauth_base_url}?{query_string}"
    
    async def exchange_code_for_tokens(self, code: str, redirect_uri: str) -> Dict[str, Any]:
        """Exchange authorization code for access and refresh tokens"""
        if not all([self.client_id, self.client_secret]):
            raise HTTPException(
                status_code=500,
                detail="Google OAuth credentials not configured"
            )
        
        token_data = {
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": redirect_uri,
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(self.token_url, data=token_data)
            
        if response.status_code != 200:
            logger.error(f"Token exchange failed: {response.text}")
            raise HTTPException(
                status_code=400,
                detail=f"Failed to exchange code for tokens: {response.text}"
            )
        
        return response.json()
    
    async def refresh_access_token(self, refresh_token: str) -> Dict[str, Any]:
        """Refresh an expired access token using refresh token"""
        if not all([self.client_id, self.client_secret]):
            raise HTTPException(
                status_code=500,
                detail="Google OAuth credentials not configured"
            )
        
        token_data = {
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "refresh_token": refresh_token,
            "grant_type": "refresh_token",
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(self.token_url, data=token_data)
            
        if response.status_code != 200:
            logger.error(f"Token refresh failed: {response.text}")
            raise HTTPException(
                status_code=400,
                detail=f"Failed to refresh token: {response.text}"
            )
        
        return response.json()
    
    async def get_access_token(self, integration: Integration) -> str:
        """Get valid access token, refreshing if necessary"""
        if not integration.access_token:
            raise HTTPException(
                status_code=400,
                detail="No access token available for GMB integration"
            )
        
        # Check if token is expired
        if integration.is_token_expired():
            if not integration.refresh_token:
                raise HTTPException(
                    status_code=400,
                    detail="Access token expired and no refresh token available"
                )
            
            # Refresh the token
            try:
                refresh_token = decrypt_text(integration.refresh_token)
                token_response = await self.refresh_access_token(refresh_token)
                
                # Update integration with new token
                from utils.encryption import encrypt_text
                integration.access_token = encrypt_text(token_response["access_token"])
                if "refresh_token" in token_response:
                    integration.refresh_token = encrypt_text(token_response["refresh_token"])
                
                # Update expiration time
                expires_in = token_response.get("expires_in", 3600)
                integration.token_expires_at = datetime.utcnow() + timedelta(seconds=expires_in)
                integration.mark_active()
                
                return token_response["access_token"]
            except Exception as e:
                logger.error(f"Failed to refresh GMB token: {str(e)}")
                integration.mark_error(f"Token refresh failed: {str(e)}")
                raise HTTPException(
                    status_code=400,
                    detail="Failed to refresh access token"
                )
        
        return decrypt_text(integration.access_token)
    
    async def get_authenticated_client(self, integration: Integration) -> httpx.AsyncClient:
        """Get authenticated HTTP client for GMB API calls"""
        access_token = await self.get_access_token(integration)
        
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        }
        
        return httpx.AsyncClient(headers=headers, timeout=30.0)
    
    async def get_business_accounts(self, integration: Integration) -> List[Dict[str, Any]]:
        """Get all business accounts accessible by the authenticated user"""
        try:
            async with await self.get_authenticated_client(integration) as client:
                response = await client.get(f"{self.gmb_base_url}/accounts")
                
            if response.status_code == 200:
                data = response.json()
                return data.get("accounts", [])
            else:
                logger.error(f"Failed to get business accounts: {response.text}")
                return []
                
        except Exception as e:
            logger.error(f"Error getting business accounts: {str(e)}")
            integration.mark_error(f"Failed to get business accounts: {str(e)}")
            return []
    
    async def get_business_locations(self, integration: Integration, account_id: str = None) -> List[GMBLocation]:
        """Get all business locations for an account"""
        try:
            # If no account_id provided, get the first available account
            if not account_id:
                accounts = await self.get_business_accounts(integration)
                if not accounts:
                    raise HTTPException(status_code=404, detail="No business accounts found")
                account_id = accounts[0]["name"]
            
            async with await self.get_authenticated_client(integration) as client:
                response = await client.get(f"{self.gmb_base_url}/{account_id}/locations")
                
            if response.status_code != 200:
                logger.error(f"Failed to get locations: {response.text}")
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Failed to get business locations: {response.text}"
                )
            
            data = response.json()
            locations = []
            
            for location_data in data.get("locations", []):
                # Extract location details
                location_id = location_data.get("name", "").split("/")[-1]
                address_components = location_data.get("address", {})
                
                # Build address string
                address_parts = []
                if address_components.get("addressLines"):
                    address_parts.extend(address_components["addressLines"])
                if address_components.get("locality"):
                    address_parts.append(address_components["locality"])
                if address_components.get("administrativeArea"):
                    address_parts.append(address_components["administrativeArea"])
                if address_components.get("postalCode"):
                    address_parts.append(address_components["postalCode"])
                
                location = GMBLocation(
                    location_id=location_id,
                    name=location_data.get("title", ""),
                    address=", ".join(address_parts),
                    phone=location_data.get("phoneNumbers", {}).get("primaryPhone"),
                    website=location_data.get("websiteUri"),
                    category=location_data.get("primaryCategory", {}).get("displayName"),
                    is_verified=location_data.get("metadata", {}).get("canHaveBusinessCalls", False),
                    is_published=location_data.get("metadata", {}).get("canReceiveCustomerPosts", False)
                )
                locations.append(location)
            
            return locations
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error getting business locations: {str(e)}")
            integration.mark_error(f"Failed to get business locations: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Error getting business locations: {str(e)}"
            )
    
    async def get_business_locations_raw(self, access_token: str) -> List[Dict[str, Any]]:
        """Get business locations using raw access token (for verification)"""
        try:
            headers = {"Authorization": f"Bearer {access_token}"}
            async with httpx.AsyncClient() as client:
                # First get accounts
                accounts_response = await client.get(
                    f"{self.gmb_base_url}/accounts",
                    headers=headers
                )
                
                if accounts_response.status_code != 200:
                    return []
                
                accounts_data = accounts_response.json()
                accounts = accounts_data.get("accounts", [])
                
                if not accounts:
                    return []
                
                # Get locations for the first account
                account_id = accounts[0]["name"]
                locations_response = await client.get(
                    f"{self.gmb_base_url}/{account_id}/locations",
                    headers=headers
                )
                
                if locations_response.status_code != 200:
                    return []
                
                locations_data = locations_response.json()
                return locations_data.get("locations", [])
                
        except Exception as e:
            logger.warning(f"Failed to get business locations for verification: {e}")
            return []
    
    async def get_location_reviews(
        self,
        integration: Integration,
        location_id: str,
        page_size: int = 50,
        order_by: str = "createTime desc"
    ) -> List[Dict[str, Any]]:
        """Get reviews for a specific business location"""
        try:
            # Construct the location name for the API
            location_name = f"locations/{location_id}"
            
            async with await self.get_authenticated_client(integration) as client:
                params = {
                    "pageSize": min(page_size, 50),  # GMB API limit
                    "orderBy": order_by
                }
                
                response = await client.get(
                    f"{self.reviews_base_url}/{location_name}/reviews",
                    params=params
                )
                
            if response.status_code != 200:
                if response.status_code == 403:
                    logger.warning(f"Insufficient permissions to access reviews for location {location_id}")
                    return []
                else:
                    logger.error(f"Failed to get reviews: {response.text}")
                    raise HTTPException(
                        status_code=response.status_code,
                        detail=f"Failed to get reviews: {response.text}"
                    )
            
            data = response.json()
            return data.get("reviews", [])
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error getting location reviews: {str(e)}")
            integration.mark_error(f"Failed to get reviews: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Error getting reviews: {str(e)}"
            )
    
    async def respond_to_review(
        self,
        integration: Integration,
        location_id: str,
        review_id: str,
        response_text: str
    ) -> Dict[str, Any]:
        """Respond to a customer review"""
        try:
            location_name = f"locations/{location_id}"
            review_name = f"{location_name}/reviews/{review_id}"
            
            response_data = {
                "comment": response_text
            }
            
            async with await self.get_authenticated_client(integration) as client:
                response = await client.put(
                    f"{self.reviews_base_url}/{review_name}/reply",
                    json=response_data
                )
                
            if response.status_code not in [200, 201]:
                logger.error(f"Failed to respond to review: {response.text}")
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Failed to respond to review: {response.text}"
                )
            
            return response.json()
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error responding to review: {str(e)}")
            integration.mark_error(f"Failed to respond to review: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Error responding to review: {str(e)}"
            )
    
    async def sync_reviews_for_location(
        self,
        db: Session,
        integration: Integration,
        location_id: str,
        days_back: int = 30
    ) -> Tuple[int, int, List[str]]:
        """
        Sync reviews for a specific location from GMB.
        Returns: (new_reviews_count, updated_reviews_count, errors)
        """
        try:
            # Get reviews from GMB API
            gmb_reviews = await self.get_location_reviews(integration, location_id)
            
            new_count = 0
            updated_count = 0
            errors = []
            
            for gmb_review in gmb_reviews:
                try:
                    # Parse GMB review data
                    review_data = self._parse_gmb_review(gmb_review, location_id, integration.user_id)
                    
                    # Check if review already exists
                    existing_review = db.query(Review).filter_by(
                        external_review_id=review_data["external_review_id"],
                        platform=ReviewPlatform.GOOGLE
                    ).first()
                    
                    if existing_review:
                        # Update existing review
                        self._update_review_from_data(existing_review, review_data)
                        updated_count += 1
                    else:
                        # Create new review
                        review_create = ReviewCreate(**review_data)
                        new_review = Review(
                            user_id=integration.user_id,
                            **review_create.dict()
                        )
                        
                        # Perform basic sentiment analysis
                        self._analyze_review_sentiment(new_review)
                        
                        db.add(new_review)
                        new_count += 1
                    
                except Exception as e:
                    error_msg = f"Failed to process review {gmb_review.get('reviewId', 'unknown')}: {str(e)}"
                    errors.append(error_msg)
                    logger.error(error_msg)
            
            # Commit all changes
            db.commit()
            
            # Update integration sync timestamp
            integration.last_sync_at = datetime.utcnow()
            integration.mark_active()
            db.commit()
            
            return new_count, updated_count, errors
            
        except Exception as e:
            db.rollback()
            error_msg = f"Failed to sync reviews for location {location_id}: {str(e)}"
            logger.error(error_msg)
            integration.mark_error(error_msg)
            db.commit()
            raise HTTPException(
                status_code=500,
                detail=error_msg
            )
    
    def _parse_gmb_review(self, gmb_review: Dict[str, Any], location_id: str, user_id: int) -> Dict[str, Any]:
        """Parse GMB review data into our review schema format"""
        # Extract review ID from name field
        review_id = gmb_review.get("name", "").split("/")[-1]
        
        # Parse review date
        create_time = gmb_review.get("createTime", "")
        review_date = datetime.fromisoformat(create_time.replace("Z", "+00:00")) if create_time else datetime.utcnow()
        
        # Get reviewer information
        reviewer = gmb_review.get("reviewer", {})
        reviewer_name = reviewer.get("displayName", "Anonymous")
        reviewer_photo = reviewer.get("profilePhotoUrl")
        
        # Parse rating (GMB uses enum values)
        rating_map = {
            "ONE": 1,
            "TWO": 2,
            "THREE": 3,
            "FOUR": 4,
            "FIVE": 5
        }
        rating = rating_map.get(gmb_review.get("starRating"), 5)
        
        # Get review text
        review_text = gmb_review.get("comment")
        
        return {
            "platform": ReviewPlatform.GOOGLE,
            "external_review_id": review_id,
            "business_id": location_id,
            "reviewer_name": reviewer_name,
            "reviewer_photo_url": reviewer_photo,
            "rating": rating,
            "review_text": review_text,
            "review_date": review_date,
            "review_url": f"https://www.google.com/maps/reviews/{review_id}",
            "platform_data": gmb_review,
            "is_verified": True,  # GMB reviews are considered verified
            "last_synced_at": datetime.utcnow()
        }
    
    def _update_review_from_data(self, review: Review, data: Dict[str, Any]):
        """Update existing review with new data from GMB"""
        # Update fields that might change
        if "review_text" in data:
            review.review_text = data["review_text"]
        if "rating" in data:
            review.rating = data["rating"]
        if "reviewer_photo_url" in data:
            review.reviewer_photo_url = data["reviewer_photo_url"]
        if "platform_data" in data:
            review.platform_data = data["platform_data"]
        
        review.last_synced_at = datetime.utcnow()
        review.updated_at = datetime.utcnow()
        
        # Re-analyze sentiment if text changed
        if "review_text" in data:
            self._analyze_review_sentiment(review)
    
    def _analyze_review_sentiment(self, review: Review):
        """Basic sentiment analysis for reviews"""
        if not review.review_text:
            review.sentiment = ReviewSentiment.UNKNOWN
            return
        
        # Simple keyword-based sentiment analysis
        text = review.review_text.lower()
        
        positive_words = [
            "excellent", "amazing", "great", "wonderful", "fantastic", "awesome",
            "love", "perfect", "best", "recommend", "professional", "clean",
            "friendly", "skilled", "talented", "satisfied", "happy", "pleased"
        ]
        
        negative_words = [
            "terrible", "awful", "horrible", "worst", "hate", "bad", "poor",
            "unprofessional", "dirty", "rude", "disappointed", "unsatisfied",
            "overpriced", "expensive", "slow", "late", "cancelled", "frustrated"
        ]
        
        positive_count = sum(1 for word in positive_words if word in text)
        negative_count = sum(1 for word in negative_words if word in text)
        
        # Combine keyword analysis with rating
        if review.rating >= 4 and positive_count > negative_count:
            review.sentiment = ReviewSentiment.POSITIVE
            review.sentiment_score = min(0.8, (positive_count * 0.2) + (review.rating - 3) * 0.3)
        elif review.rating <= 2 or negative_count > positive_count:
            review.sentiment = ReviewSentiment.NEGATIVE
            review.sentiment_score = max(-0.8, -(negative_count * 0.2) - (3 - review.rating) * 0.3)
        else:
            review.sentiment = ReviewSentiment.NEUTRAL
            review.sentiment_score = 0.0
        
        # Set confidence based on text length and keyword matches
        text_length_factor = min(1.0, len(text) / 200)  # Longer reviews = higher confidence
        keyword_factor = min(1.0, (positive_count + negative_count) / 5)  # More keywords = higher confidence
        review.sentiment_confidence = (text_length_factor + keyword_factor) / 2
        
        # Store keywords that influenced sentiment
        found_keywords = []
        for word in positive_words:
            if word in text:
                found_keywords.append(f"+{word}")
        for word in negative_words:
            if word in text:
                found_keywords.append(f"-{word}")
        
        review.sentiment_keywords = found_keywords[:10]  # Limit to top 10
    
    async def test_connection(self, integration: Integration) -> Dict[str, Any]:
        """Test the GMB integration connection"""
        try:
            accounts = await self.get_business_accounts(integration)
            
            if accounts:
                # Try to get locations for the first account
                locations = await self.get_business_locations(integration)
                
                return {
                    "healthy": True,
                    "message": f"Connected successfully. Found {len(accounts)} account(s) and {len(locations)} location(s).",
                    "accounts_count": len(accounts),
                    "locations_count": len(locations),
                    "accounts": [{"name": acc.get("accountName"), "id": acc.get("name")} for acc in accounts[:3]]
                }
            else:
                return {
                    "healthy": False,
                    "message": "No business accounts found. Please ensure proper permissions are granted.",
                    "accounts_count": 0,
                    "locations_count": 0
                }
                
        except Exception as e:
            return {
                "healthy": False,
                "message": f"Connection test failed: {str(e)}",
                "error": str(e)
            }