"""
Google OAuth Authentication Endpoints
Handles Google OAuth login/signup flow for user authentication
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Optional
import logging
from urllib.parse import urlencode
import httpx
import jwt

from config.database import get_db
from config.settings import settings
from models.user import User
from services.rbac_service import RBACService
from utils.logging import log_user_action
from utils.security import get_client_ip
from api.v1.auth import create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES
from pydantic import BaseModel

router = APIRouter()
logger = logging.getLogger(__name__)

# Google OAuth Configuration
GOOGLE_OAUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"

# OAuth scopes for user authentication
OAUTH_SCOPES = [
    "openid",
    "email", 
    "profile"
]

class GoogleOAuthCallbackRequest(BaseModel):
    code: str
    state: Optional[str] = None


@router.get("/connect")
async def google_oauth_connect(
    redirect_uri: Optional[str] = None,
    state: Optional[str] = None
):
    """
    Initiate Google OAuth flow for user authentication
    """
    if not settings.GOOGLE_OAUTH_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Google OAuth not configured"
        )
    
    # Use provided redirect URI or default
    callback_uri = redirect_uri or settings.GOOGLE_OAUTH_REDIRECT_URI
    
    # Build OAuth URL
    params = {
        "client_id": settings.GOOGLE_OAUTH_CLIENT_ID,
        "redirect_uri": callback_uri,
        "scope": " ".join(OAUTH_SCOPES),
        "response_type": "code",
        "access_type": "online",
        "prompt": "select_account",
    }
    
    if state:
        params["state"] = state
    
    oauth_url = f"{GOOGLE_OAUTH_URL}?{urlencode(params)}"
    
    logger.info(f"Initiating Google OAuth flow to: {oauth_url}")
    return {"auth_url": oauth_url}


@router.get("/callback")
async def google_oauth_callback(
    request: Request,
    code: str,
    state: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Handle Google OAuth callback and authenticate user
    """
    try:
        client_ip = get_client_ip(request)
        
        # Exchange code for access token
        token_data = await _exchange_code_for_token(code)
        
        # Get user info from Google
        user_info = await _get_google_user_info(token_data["access_token"])
        
        # Find or create user
        user = await _find_or_create_user(db, user_info)
        
        # Create JWT access token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user.email}, expires_delta=access_token_expires
        )
        
        # Update last login
        user.last_login = datetime.utcnow()
        db.commit()
        
        # Log successful login
        log_user_action(
            action="google_oauth_login",
            user_id=user.id,
            details={"email": user.email, "provider": "google"},
            ip_address=client_ip,
        )
        
        # Get user permissions
        rbac = RBACService(db)
        permissions = rbac.get_user_permissions(user)
        
        # Return authentication response
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "email": user.email,
                "full_name": f"{user.first_name} {user.last_name}",
                "role": user.role,
                "permissions": permissions,
                "primary_location_id": user.primary_location_id,
                "profile_image_url": user.profile_image_url,
                "auth_provider": user.auth_provider,
            },
        }
        
    except Exception as e:
        logger.error(f"Google OAuth callback error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"OAuth authentication failed: {str(e)}"
        )


@router.post("/callback")
async def google_oauth_callback_post(
    request: Request,
    callback_data: GoogleOAuthCallbackRequest,
    db: Session = Depends(get_db)
):
    """
    Handle Google OAuth callback via POST request (for frontend integration)
    """
    return await google_oauth_callback(
        request=request,
        code=callback_data.code,
        state=callback_data.state,
        db=db
    )


async def _exchange_code_for_token(code: str) -> dict:
    """
    Exchange authorization code for access token
    """
    token_payload = {
        "client_id": settings.GOOGLE_OAUTH_CLIENT_ID,
        "client_secret": settings.GOOGLE_OAUTH_CLIENT_SECRET,
        "code": code,
        "grant_type": "authorization_code",
        "redirect_uri": settings.GOOGLE_OAUTH_REDIRECT_URI,
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(GOOGLE_TOKEN_URL, data=token_payload)
        
        if response.status_code != 200:
            logger.error(f"Token exchange failed: {response.text}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to exchange authorization code for token"
            )
        
        return response.json()


async def _get_google_user_info(access_token: str) -> dict:
    """
    Get user information from Google using access token
    """
    headers = {"Authorization": f"Bearer {access_token}"}
    
    async with httpx.AsyncClient() as client:
        response = await client.get(GOOGLE_USERINFO_URL, headers=headers)
        
        if response.status_code != 200:
            logger.error(f"Failed to get user info: {response.text}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to get user information from Google"
            )
        
        return response.json()


async def _find_or_create_user(db: Session, user_info: dict) -> User:
    """
    Find existing user or create new user from Google user info
    """
    google_id = user_info.get("id")
    email = user_info.get("email")
    
    if not google_id or not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user information from Google"
        )
    
    # First, try to find user by Google ID
    user = db.query(User).filter(User.google_id == google_id).first()
    
    if user:
        # Update user info if found by Google ID
        user.profile_image_url = user_info.get("picture")
        user.is_verified = user_info.get("verified_email", False)
        db.commit()
        return user
    
    # If not found by Google ID, try to find by email
    user = db.query(User).filter(User.email == email).first()
    
    if user:
        # Link existing account with Google
        user.google_id = google_id
        user.auth_provider = "google"
        user.profile_image_url = user_info.get("picture")
        user.is_verified = user_info.get("verified_email", False)
        db.commit()
        
        log_user_action(
            action="account_linked_google",
            user_id=user.id,
            details={"email": user.email, "google_id": google_id},
        )
        
        return user
    
    # Create new user if not found
    new_user = User(
        email=email,
        google_id=google_id,
        first_name=user_info.get("given_name", ""),
        last_name=user_info.get("family_name", ""),
        auth_provider="google",
        profile_image_url=user_info.get("picture"),
        is_active=True,
        is_verified=user_info.get("verified_email", False),
        role="barber",  # Default role for new users
        hashed_password=None,  # No password for OAuth users
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Log user registration
    log_user_action(
        action="user_registered_google",
        user_id=new_user.id,
        details={
            "email": new_user.email,
            "role": new_user.role,
            "google_id": google_id,
        },
    )
    
    logger.info(f"Created new user via Google OAuth: {email}")
    return new_user


@router.post("/disconnect")
async def disconnect_google_oauth(
    user: User = Depends(lambda: None),  # Will be replaced with auth dependency
    db: Session = Depends(get_db)
):
    """
    Disconnect Google OAuth from user account
    Note: This endpoint would need authentication middleware
    """
    # This is a placeholder - in practice, you'd need to:
    # 1. Add authentication dependency
    # 2. Verify user can disconnect (has password or other auth method)
    # 3. Clear Google OAuth data
    
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Google OAuth disconnect not yet implemented"
    )