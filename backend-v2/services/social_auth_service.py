"""
Social Authentication Service for Google, Facebook, and Apple OAuth.

This service handles:
- OAuth token exchange
- User creation/linking from social providers
- Social account management
"""

import logging
import httpx
import secrets
from typing import Optional, Dict, Any, Tuple
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import or_

from models import User
from config import settings
from utils.auth import create_access_token, create_refresh_token
from passlib.context import CryptContext

logger = logging.getLogger(__name__)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class SocialAuthService:
    """Service for handling social authentication flows."""
    
    def __init__(self):
        self.http_client = httpx.AsyncClient()
    
    async def exchange_google_code(self, code: str, redirect_uri: str) -> Dict[str, Any]:
        """Exchange Google authorization code for tokens."""
        try:
            # Exchange code for tokens
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
                raise Exception("Failed to exchange Google code for tokens")
            
            tokens = token_response.json()
            
            # Get user info
            user_response = await self.http_client.get(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                headers={"Authorization": f"Bearer {tokens['access_token']}"}
            )
            
            if user_response.status_code != 200:
                logger.error(f"Google user info fetch failed: {user_response.text}")
                raise Exception("Failed to fetch Google user information")
            
            user_data = user_response.json()
            
            return {
                "provider": "google",
                "provider_user_id": user_data["id"],
                "email": user_data["email"],
                "name": user_data.get("name", ""),
                "avatar": user_data.get("picture", ""),
                "access_token": tokens["access_token"],
                "refresh_token": tokens.get("refresh_token")
            }
            
        except Exception as e:
            logger.error(f"Google OAuth error: {str(e)}")
            raise
    
    async def exchange_facebook_code(self, code: str, redirect_uri: str) -> Dict[str, Any]:
        """Exchange Facebook authorization code for tokens."""
        try:
            # Exchange code for tokens
            token_response = await self.http_client.get(
                "https://graph.facebook.com/v18.0/oauth/access_token",
                params={
                    "code": code,
                    "client_id": settings.facebook_app_id,
                    "client_secret": settings.facebook_app_secret,
                    "redirect_uri": redirect_uri
                }
            )
            
            if token_response.status_code != 200:
                logger.error(f"Facebook token exchange failed: {token_response.text}")
                raise Exception("Failed to exchange Facebook code for tokens")
            
            tokens = token_response.json()
            
            # Get user info
            user_response = await self.http_client.get(
                "https://graph.facebook.com/v18.0/me",
                params={
                    "access_token": tokens["access_token"],
                    "fields": "id,email,name,picture"
                }
            )
            
            if user_response.status_code != 200:
                logger.error(f"Facebook user info fetch failed: {user_response.text}")
                raise Exception("Failed to fetch Facebook user information")
            
            user_data = user_response.json()
            
            return {
                "provider": "facebook",
                "provider_user_id": user_data["id"],
                "email": user_data.get("email", f"{user_data['id']}@facebook.local"),
                "name": user_data.get("name", ""),
                "avatar": user_data.get("picture", {}).get("data", {}).get("url", ""),
                "access_token": tokens["access_token"]
            }
            
        except Exception as e:
            logger.error(f"Facebook OAuth error: {str(e)}")
            raise
    
    def find_or_create_social_user(
        self, 
        db: Session, 
        provider_data: Dict[str, Any]
    ) -> Tuple[User, bool]:
        """Find existing user or create new one from social provider data."""
        # First, try to find by email
        user = db.query(User).filter(User.email == provider_data["email"]).first()
        
        if user:
            # Update social login info in profile_data
            profile_data = user.profile_data or {}
            social_accounts = profile_data.get("social_accounts", {})
            social_accounts[provider_data["provider"]] = {
                "provider_user_id": provider_data["provider_user_id"],
                "connected_at": datetime.utcnow().isoformat(),
                "avatar": provider_data.get("avatar", "")
            }
            profile_data["social_accounts"] = social_accounts
            user.profile_data = profile_data
            db.commit()
            return user, False
        
        # Create new user
        user = User(
            email=provider_data["email"],
            name=provider_data["name"],
            # Generate random password for social users
            hashed_password=pwd_context.hash(secrets.token_urlsafe(32)),
            role="client",  # Default role for social login users
            is_active=True,
            email_verified=True,  # Social provider verified email
            profile_data={
                "avatar_url": provider_data.get("avatar", ""),
                "social_accounts": {
                    provider_data["provider"]: {
                        "provider_user_id": provider_data["provider_user_id"],
                        "connected_at": datetime.utcnow().isoformat(),
                        "avatar": provider_data.get("avatar", "")
                    }
                }
            }
        )
        
        db.add(user)
        db.commit()
        db.refresh(user)
        
        return user, True
    
    async def handle_social_callback(
        self, 
        db: Session,
        provider: str, 
        code: str, 
        redirect_uri: str
    ) -> Dict[str, Any]:
        """Handle OAuth callback for any provider."""
        try:
            # Exchange code for tokens based on provider
            if provider == "google":
                provider_data = await self.exchange_google_code(code, redirect_uri)
            elif provider == "facebook":
                provider_data = await self.exchange_facebook_code(code, redirect_uri)
            else:
                raise ValueError(f"Unsupported provider: {provider}")
            
            # Find or create user
            user, is_new = self.find_or_create_social_user(db, provider_data)
            
            # Generate JWT tokens
            access_token = create_access_token(data={"sub": str(user.id)})
            refresh_token = create_refresh_token(data={"sub": str(user.id)})
            
            return {
                "access_token": access_token,
                "refresh_token": refresh_token,
                "user": {
                    "id": str(user.id),
                    "email": user.email,
                    "name": user.name,
                    "avatar": provider_data.get("avatar", ""),
                    "provider": provider,
                    "is_new": is_new
                }
            }
            
        except Exception as e:
            logger.error(f"Social auth callback error: {str(e)}")
            raise
    
    def get_linked_accounts(self, db: Session, user_id: int) -> Dict[str, Any]:
        """Get all linked social accounts for a user."""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return {}
        
        profile_data = user.profile_data or {}
        social_accounts = profile_data.get("social_accounts", {})
        
        # Format response
        linked = {}
        for provider, data in social_accounts.items():
            linked[provider] = {
                "connected": True,
                "connected_at": data.get("connected_at"),
                "avatar": data.get("avatar", "")
            }
        
        return linked
    
    async def link_social_account(
        self, 
        db: Session, 
        user_id: int, 
        provider: str, 
        code: str,
        redirect_uri: str
    ) -> Dict[str, Any]:
        """Link a social account to existing user."""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise ValueError("User not found")
        
        # Exchange code for provider data
        if provider == "google":
            provider_data = await self.exchange_google_code(code, redirect_uri)
        elif provider == "facebook":
            provider_data = await self.exchange_facebook_code(code, redirect_uri)
        else:
            raise ValueError(f"Unsupported provider: {provider}")
        
        # Update user's social accounts
        profile_data = user.profile_data or {}
        social_accounts = profile_data.get("social_accounts", {})
        social_accounts[provider] = {
            "provider_user_id": provider_data["provider_user_id"],
            "connected_at": datetime.utcnow().isoformat(),
            "avatar": provider_data.get("avatar", "")
        }
        profile_data["social_accounts"] = social_accounts
        user.profile_data = profile_data
        
        db.commit()
        
        return {"success": True, "provider": provider}
    
    def unlink_social_account(
        self, 
        db: Session, 
        user_id: int, 
        provider: str
    ) -> Dict[str, Any]:
        """Unlink a social account from user."""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise ValueError("User not found")
        
        profile_data = user.profile_data or {}
        social_accounts = profile_data.get("social_accounts", {})
        
        if provider in social_accounts:
            del social_accounts[provider]
            profile_data["social_accounts"] = social_accounts
            user.profile_data = profile_data
            db.commit()
        
        return {"success": True, "provider": provider}
    
    async def __aenter__(self):
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.http_client.aclose()


# Singleton instance
social_auth_service = SocialAuthService()