"""
OAuth Service for BookedBarber V2
Complete OAuth integration for Google and Facebook login
"""

import os
import json
import secrets
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
from urllib.parse import urlencode, parse_qs, urlparse
import aiohttp
from fastapi import HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import and_

from models import User, UnifiedUserRole
from utils.auth import create_access_token, create_refresh_token
from config import settings

logger = logging.getLogger(__name__)

class OAuthProvider:
    """OAuth provider configuration"""
    
    def __init__(self, name: str, config: Dict[str, Any]):
        self.name = name
        self.client_id = config.get('client_id')
        self.client_secret = config.get('client_secret')
        self.redirect_uri = config.get('redirect_uri')
        self.auth_url = config.get('auth_url')
        self.token_url = config.get('token_url')
        self.user_info_url = config.get('user_info_url')
        self.scope = config.get('scope', [])

class OAuthService:
    """Centralized OAuth management for all providers"""
    
    def __init__(self, db: Session):
        self.db = db
        self.providers = self._init_providers()
        
        # State storage (in production, use Redis)
        self._oauth_states: Dict[str, Dict[str, Any]] = {}
    
    def _init_providers(self) -> Dict[str, OAuthProvider]:
        """Initialize OAuth providers from configuration"""
        
        base_url = settings.frontend_url or "http://localhost:3000"
        
        providers = {
            'google': OAuthProvider('google', {
                'client_id': os.getenv('GOOGLE_CLIENT_ID'),
                'client_secret': os.getenv('GOOGLE_CLIENT_SECRET'),
                'redirect_uri': f"http://localhost:8000/api/google-calendar/oauth/callback",
                'auth_url': 'https://accounts.google.com/o/oauth2/v2/auth',
                'token_url': 'https://oauth2.googleapis.com/token',
                'user_info_url': 'https://www.googleapis.com/oauth2/v2/userinfo',
                'scope': ['openid', 'email', 'profile']
            }),
            'facebook': OAuthProvider('facebook', {
                'client_id': os.getenv('FACEBOOK_APP_ID'),
                'client_secret': os.getenv('FACEBOOK_APP_SECRET'),
                'redirect_uri': f"http://localhost:8000/auth/callback",
                'auth_url': 'https://www.facebook.com/v18.0/dialog/oauth',
                'token_url': 'https://graph.facebook.com/v18.0/oauth/access_token',
                'user_info_url': 'https://graph.facebook.com/v18.0/me',
                'scope': ['email', 'public_profile']
            })
        }
        
        # Filter out providers without credentials
        configured_providers = {}
        for name, provider in providers.items():
            if provider.client_id and provider.client_secret:
                configured_providers[name] = provider
                logger.info(f"✅ OAuth provider configured: {name}")
            else:
                logger.warning(f"⚠️ OAuth provider not configured (missing credentials): {name}")
        
        return configured_providers
    
    async def initiate_oauth(self, provider: str, user_id: Optional[int] = None) -> Dict[str, Any]:
        """
        Initiate OAuth flow for specified provider
        
        Args:
            provider: OAuth provider name (google, facebook)
            user_id: Optional user ID for account linking
            
        Returns:
            Dict containing authorization_url and state
        """
        
        if provider not in self.providers:
            raise HTTPException(
                status_code=400,
                detail=f"OAuth provider '{provider}' not configured"
            )
        
        oauth_provider = self.providers[provider]
        
        # Generate secure state parameter
        state = secrets.token_urlsafe(32)
        
        # Store state information
        self._oauth_states[state] = {
            'provider': provider,
            'user_id': user_id,
            'created_at': datetime.now(),
            'expires_at': datetime.now() + timedelta(minutes=10)
        }
        
        # Build authorization URL
        auth_params = {
            'client_id': oauth_provider.client_id,
            'redirect_uri': oauth_provider.redirect_uri,
            'scope': ' '.join(oauth_provider.scope),
            'response_type': 'code',
            'state': state,
            'access_type': 'offline',  # For Google refresh tokens
            'prompt': 'consent'  # Force consent screen
        }
        
        # Provider-specific parameters
        if provider == 'facebook':
            auth_params['display'] = 'popup'
        
        authorization_url = f"{oauth_provider.auth_url}?{urlencode(auth_params)}"
        
        logger.info(f"OAuth flow initiated for {provider} with state {state}")
        
        return {
            'authorization_url': authorization_url,
            'state': state,
            'provider': provider,
            'expires_in': 600  # 10 minutes
        }
    
    async def handle_callback(self, provider: str, code: str, state: str) -> Dict[str, Any]:
        """
        Handle OAuth callback and complete authentication
        
        Args:
            provider: OAuth provider name
            code: Authorization code from provider
            state: State parameter for CSRF protection
            
        Returns:
            Dict containing user info and tokens
        """
        
        # Validate state parameter
        if state not in self._oauth_states:
            raise HTTPException(status_code=400, detail="Invalid or expired OAuth state")
        
        state_info = self._oauth_states[state]
        
        # Check state expiration
        if datetime.now() > state_info['expires_at']:
            del self._oauth_states[state]
            raise HTTPException(status_code=400, detail="OAuth state expired")
        
        # Validate provider matches
        if state_info['provider'] != provider:
            raise HTTPException(status_code=400, detail="Provider mismatch")
        
        if provider not in self.providers:
            raise HTTPException(status_code=400, detail=f"Provider '{provider}' not configured")
        
        oauth_provider = self.providers[provider]
        
        try:
            # Exchange code for access token
            token_data = await self._exchange_code_for_token(oauth_provider, code)
            
            # Get user information
            user_info = await self._get_user_info(oauth_provider, token_data['access_token'])
            
            # Find or create user
            user = await self._find_or_create_user(provider, user_info, state_info.get('user_id'))
            
            # Generate JWT tokens
            access_token = create_access_token(data={"sub": str(user.id)})
            refresh_token = create_refresh_token(data={"sub": str(user.id)})
            
            auth_tokens = {
                'access_token': access_token,
                'refresh_token': refresh_token,
                'expires_in': 1800  # 30 minutes
            }
            
            # Clean up state
            del self._oauth_states[state]
            
            logger.info(f"OAuth authentication successful for {provider} user {user.email}")
            
            return {
                'user': {
                    'id': user.id,
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'role': user.role.value,
                    'is_verified': user.is_verified
                },
                'access_token': auth_tokens['access_token'],
                'refresh_token': auth_tokens['refresh_token'],
                'token_type': 'bearer',
                'expires_in': auth_tokens['expires_in'],
                'oauth_provider': provider
            }
            
        except Exception as e:
            logger.error(f"OAuth callback failed for {provider}: {e}")
            if state in self._oauth_states:
                del self._oauth_states[state]
            raise HTTPException(status_code=400, detail=f"OAuth authentication failed: {str(e)}")
    
    async def _exchange_code_for_token(self, provider: OAuthProvider, code: str) -> Dict[str, Any]:
        """Exchange authorization code for access token"""
        
        token_data = {
            'client_id': provider.client_id,
            'client_secret': provider.client_secret,
            'code': code,
            'grant_type': 'authorization_code',
            'redirect_uri': provider.redirect_uri
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(
                provider.token_url,
                data=token_data,
                headers={'Accept': 'application/json'}
            ) as response:
                
                if response.status != 200:
                    error_text = await response.text()
                    raise Exception(f"Token exchange failed: {error_text}")
                
                token_response = await response.json()
                
                if 'error' in token_response:
                    raise Exception(f"Token error: {token_response.get('error_description', token_response['error'])}")
                
                return token_response
    
    async def _get_user_info(self, provider: OAuthProvider, access_token: str) -> Dict[str, Any]:
        """Get user information from OAuth provider"""
        
        headers = {'Authorization': f'Bearer {access_token}'}
        
        # Provider-specific user info requests
        if provider.name == 'facebook':
            user_info_url = f"{provider.user_info_url}?fields=id,name,email,first_name,last_name,picture"
        else:
            user_info_url = provider.user_info_url
        
        async with aiohttp.ClientSession() as session:
            async with session.get(user_info_url, headers=headers) as response:
                
                if response.status != 200:
                    error_text = await response.text()
                    raise Exception(f"User info request failed: {error_text}")
                
                return await response.json()
    
    async def _find_or_create_user(self, provider: str, user_info: Dict[str, Any], linking_user_id: Optional[int] = None) -> User:
        """Find existing user or create new one from OAuth info"""
        
        # Extract standardized user data
        if provider == 'google':
            email = user_info.get('email')
            first_name = user_info.get('given_name', '')
            last_name = user_info.get('family_name', '')
            provider_id = user_info.get('id')
            is_verified = user_info.get('verified_email', False)
        elif provider == 'facebook':
            email = user_info.get('email')
            first_name = user_info.get('first_name', '')
            last_name = user_info.get('last_name', '')
            provider_id = user_info.get('id')
            is_verified = True  # Facebook emails are pre-verified
        else:
            raise Exception(f"Unsupported provider: {provider}")
        
        if not email:
            raise Exception("Email not provided by OAuth provider")
        
        # Check if linking to existing account
        if linking_user_id:
            user = self.db.query(User).filter(User.id == linking_user_id).first()
            if user:
                # Update user with OAuth info if missing
                if not user.first_name and first_name:
                    user.first_name = first_name
                if not user.last_name and last_name:
                    user.last_name = last_name
                if not user.is_verified and is_verified:
                    user.is_verified = True
                
                self.db.commit()
                return user
        
        # Look for existing user by email
        existing_user = self.db.query(User).filter(User.email == email).first()
        
        if existing_user:
            # Update verification status if OAuth provider confirms email
            if is_verified and not existing_user.is_verified:
                existing_user.is_verified = True
                self.db.commit()
            
            return existing_user
        
        # Create new user
        new_user = User(
            email=email,
            first_name=first_name,
            last_name=last_name,
            role=UnifiedUserRole.CLIENT,  # Default role for OAuth users
            is_verified=is_verified,
            is_active=True,
            created_at=datetime.now()
        )
        
        self.db.add(new_user)
        self.db.commit()
        self.db.refresh(new_user)
        
        logger.info(f"Created new user via {provider} OAuth: {email}")
        
        return new_user
    
    def get_configured_providers(self) -> List[Dict[str, Any]]:
        """Get list of configured OAuth providers"""
        
        return [
            {
                'name': name,
                'display_name': name.title(),
                'configured': True
            }
            for name in self.providers.keys()
        ]
    
    async def cleanup_expired_states(self):
        """Clean up expired OAuth states"""
        
        current_time = datetime.now()
        expired_states = [
            state for state, info in self._oauth_states.items()
            if current_time > info['expires_at']
        ]
        
        for state in expired_states:
            del self._oauth_states[state]
        
        if expired_states:
            logger.info(f"Cleaned up {len(expired_states)} expired OAuth states")
    
    async def refresh_token(self, provider: str, refresh_token: str) -> Dict[str, Any]:
        """Refresh OAuth access token (mainly for Google)"""
        
        if provider not in self.providers:
            raise HTTPException(status_code=400, detail=f"Provider '{provider}' not configured")
        
        oauth_provider = self.providers[provider]
        
        if provider != 'google':
            raise HTTPException(status_code=400, detail="Token refresh only supported for Google")
        
        refresh_data = {
            'client_id': oauth_provider.client_id,
            'client_secret': oauth_provider.client_secret,
            'refresh_token': refresh_token,
            'grant_type': 'refresh_token'
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(
                oauth_provider.token_url,
                data=refresh_data,
                headers={'Accept': 'application/json'}
            ) as response:
                
                if response.status != 200:
                    error_text = await response.text()
                    raise HTTPException(status_code=400, detail=f"Token refresh failed: {error_text}")
                
                token_response = await response.json()
                
                if 'error' in token_response:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Token refresh error: {token_response.get('error_description', token_response['error'])}"
                    )
                
                return token_response

# OAuth configuration validation
def validate_oauth_config() -> Dict[str, bool]:
    """Validate OAuth provider configurations"""
    
    config_status = {
        'google': bool(os.getenv('GOOGLE_CLIENT_ID') and os.getenv('GOOGLE_CLIENT_SECRET')),
        'facebook': bool(os.getenv('FACEBOOK_APP_ID') and os.getenv('FACEBOOK_APP_SECRET'))
    }
    
    return config_status

# Environment setup helper
def create_oauth_env_template() -> str:
    """Create OAuth environment variables template"""
    
    template = """
# OAuth Configuration for BookedBarber V2
# Add these to your .env file

# Google OAuth (Google Cloud Console)
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here

# Facebook OAuth (Facebook Developer Console)
FACEBOOK_APP_ID=your_facebook_app_id_here
FACEBOOK_APP_SECRET=your_facebook_app_secret_here

# Frontend URL (for redirect URIs)
FRONTEND_URL=http://localhost:3000
"""
    
    return template