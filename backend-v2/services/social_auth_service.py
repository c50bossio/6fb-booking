"""
Social Authentication Service
Handles OAuth 2.0 token exchange and user management for social providers.
"""

import httpx
import logging
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
import secrets
import string

from config import settings
from models import User
from utils.auth import get_password_hash, create_access_token

logger = logging.getLogger(__name__)

class SocialAuthService:
    """Service for handling OAuth 2.0 social authentication"""
    
    def __init__(self, db: Session):
        self.db = db
        self.http_client = httpx.AsyncClient()
        # No need for auth service - we'll use utils directly
    
    async def authenticate_user(
        self,
        provider: str,
        code: str,
        redirect_uri: str,
        state: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Complete OAuth flow: exchange code for user info and authenticate
        
        Args:
            provider: OAuth provider ('google' or 'facebook')
            code: Authorization code from OAuth callback
            redirect_uri: Original redirect URI used in OAuth request
            state: Optional state parameter for CSRF validation
            
        Returns:
            Dictionary with access_token, user_id, email, is_new_user
        """
        try:
            # Exchange authorization code for user information
            if provider == 'google':
                user_info = await self.exchange_google_code(code, redirect_uri)
            elif provider == 'facebook':
                user_info = await self.exchange_facebook_code(code, redirect_uri)
            else:
                raise ValueError(f"Unsupported provider: {provider}")
            
            # Create or get existing user
            user, is_new_user = await self.create_or_get_user(user_info, provider)
            
            # Generate JWT token
            access_token = create_access_token(data={"sub": str(user.id)})
            
            return {
                "access_token": access_token,
                "user_id": user.id,
                "email": user.email,
                "is_new_user": is_new_user
            }
            
        except Exception as e:
            logger.error(f"Social auth failed for {provider}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"OAuth authentication failed: {str(e)}"
            )
    
    async def exchange_google_code(self, code: str, redirect_uri: str) -> Dict[str, Any]:
        """Exchange Google authorization code for user info"""
        try:
            # Exchange code for access token
            token_response = await self.http_client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "code": code,
                    "client_id": settings.google_client_id,
                    "client_secret": settings.google_client_secret,
                    "redirect_uri": redirect_uri,
                    "grant_type": "authorization_code"
                }
            )
            
            if token_response.status_code != 200:
                logger.error(f"Google token exchange failed: {token_response.text}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Failed to exchange Google authorization code"
                )
            
            token_data = token_response.json()
            access_token = token_data.get("access_token")
            
            # Get user info from Google
            user_response = await self.http_client.get(
                "https://www.googleapis.com/userinfo/v2/me",
                headers={"Authorization": f"Bearer {access_token}"}
            )
            
            if user_response.status_code != 200:
                logger.error(f"Google user info failed: {user_response.text}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Failed to get Google user information"
                )
            
            user_data = user_response.json()
            
            return {
                "email": user_data.get("email"),
                "first_name": user_data.get("given_name", ""),
                "last_name": user_data.get("family_name", ""),
                "google_id": user_data.get("id"),
                "picture": user_data.get("picture"),
                "verified_email": user_data.get("verified_email", False)
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Google OAuth exchange error: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Google OAuth processing failed"
            )
    
    async def exchange_facebook_code(self, code: str, redirect_uri: str) -> Dict[str, Any]:
        """Exchange Facebook authorization code for user info"""
        try:
            # Exchange code for access token
            token_response = await self.http_client.get(
                "https://graph.facebook.com/v18.0/oauth/access_token",
                params={
                    "client_id": settings.facebook_app_id,
                    "client_secret": settings.facebook_app_secret,
                    "redirect_uri": redirect_uri,
                    "code": code
                }
            )
            
            if token_response.status_code != 200:
                logger.error(f"Facebook token exchange failed: {token_response.text}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Failed to exchange Facebook authorization code"
                )
            
            token_data = token_response.json()
            access_token = token_data.get("access_token")
            
            # Get user info from Facebook
            user_response = await self.http_client.get(
                "https://graph.facebook.com/me",
                params={
                    "fields": "id,email,first_name,last_name,picture",
                    "access_token": access_token
                }
            )
            
            if user_response.status_code != 200:
                logger.error(f"Facebook user info failed: {user_response.text}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Failed to get Facebook user information"
                )
            
            user_data = user_response.json()
            
            return {
                "email": user_data.get("email"),
                "first_name": user_data.get("first_name", ""),
                "last_name": user_data.get("last_name", ""),
                "facebook_id": user_data.get("id"),
                "picture": user_data.get("picture", {}).get("data", {}).get("url"),
                "verified_email": True  # Facebook emails are generally verified
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Facebook OAuth exchange error: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Facebook OAuth processing failed"
            )
    
    async def create_or_get_user(self, user_info: Dict[str, Any], provider: str) -> tuple[User, bool]:
        """Create new user or get existing user from social auth info"""
        try:
            email = user_info.get("email")
            if not email:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email is required for social authentication"
                )
            
            # Check if user already exists
            existing_user = self.db.query(User).filter(User.email == email).first()
            
            if existing_user:
                logger.info(f"Existing user login via {provider}: {email}")
                return existing_user, False
            
            # Create new user
            # Generate random password (user won't use it, they'll use social auth)
            random_password = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(32))
            
            new_user = User(
                email=email,
                first_name=user_info.get("first_name", ""),
                last_name=user_info.get("last_name", ""),
                password_hash=get_password_hash(random_password),  # Won't be used
                is_verified=user_info.get("verified_email", True),  # Social auth emails are typically verified
                role="client"  # Default role for social auth users
            )
            
            self.db.add(new_user)
            self.db.commit()
            self.db.refresh(new_user)
            
            logger.info(f"New user created via {provider}: {email}")
            return new_user, True
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"User creation/retrieval failed: {str(e)}")
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create or retrieve user"
            )
    
    async def get_oauth_url(
        self,
        provider: str,
        redirect_uri: str,
        state: Optional[str] = None
    ) -> str:
        """Generate OAuth authorization URL for provider"""
        try:
            if provider == 'google':
                base_url = "https://accounts.google.com/o/oauth2/v2/auth"
                params = {
                    "client_id": settings.google_client_id,
                    "redirect_uri": redirect_uri,
                    "response_type": "code",
                    "scope": "openid email profile",
                    "access_type": "offline"
                }
            elif provider == 'facebook':
                base_url = "https://www.facebook.com/v18.0/dialog/oauth"
                params = {
                    "client_id": settings.facebook_app_id,
                    "redirect_uri": redirect_uri,
                    "response_type": "code",
                    "scope": "email"
                }
            else:
                raise ValueError(f"Unsupported provider: {provider}")
            
            if state:
                params["state"] = state
            
            # Build URL with parameters
            param_string = "&".join([f"{k}={v}" for k, v in params.items()])
            return f"{base_url}?{param_string}"
            
        except Exception as e:
            logger.error(f"Failed to generate {provider} OAuth URL: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to generate OAuth URL: {str(e)}"
            )
    
    async def __aenter__(self):
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.http_client.aclose()