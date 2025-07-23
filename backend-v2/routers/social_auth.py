"""
Social Authentication Router for OAuth 2.0 providers (Google, Facebook)
Handles OAuth callbacks and user authentication via social providers.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Dict, Any
import logging

from database import get_db
from services.social_auth_service import SocialAuthService

# Configure logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth/social", tags=["social-authentication"])

class SocialAuthCallbackRequest(BaseModel):
    """Request model for OAuth callback"""
    code: str
    redirect_uri: str
    state: str = None

class SocialAuthResponse(BaseModel):
    """Response model for successful social authentication"""
    access_token: str
    token_type: str = "bearer"
    user_id: int
    email: str
    is_new_user: bool

@router.post("/{provider}/callback", response_model=SocialAuthResponse)
async def social_auth_callback(
    provider: str,
    request: SocialAuthCallbackRequest,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Handle OAuth callback from social providers (Google, Facebook)
    
    Args:
        provider: OAuth provider name ('google' or 'facebook')
        request: OAuth callback data with authorization code
        db: Database session
        
    Returns:
        JWT token and user information
        
    Raises:
        HTTPException: If OAuth flow fails or provider is invalid
    """
    try:
        # Validate provider
        if provider.lower() not in ['google', 'facebook']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported OAuth provider: {provider}"
            )
        
        # Initialize social auth service
        social_auth_service = SocialAuthService(db)
        
        # Exchange authorization code for user info and create/login user
        auth_result = await social_auth_service.authenticate_user(
            provider=provider.lower(),
            code=request.code,
            redirect_uri=request.redirect_uri,
            state=request.state
        )
        
        logger.info(f"Successful {provider} OAuth authentication for user {auth_result['user_id']}")
        
        return SocialAuthResponse(
            access_token=auth_result["access_token"],
            token_type="bearer",
            user_id=auth_result["user_id"],
            email=auth_result["email"],
            is_new_user=auth_result["is_new_user"]
        )
        
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        logger.error(f"OAuth {provider} callback failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"OAuth authentication failed: {str(e)}"
        )

@router.get("/{provider}/login-url")
async def get_oauth_login_url(
    provider: str,
    redirect_uri: str,
    state: str = None,
    db: Session = Depends(get_db)
) -> Dict[str, str]:
    """
    Generate OAuth login URL for social provider
    
    Args:
        provider: OAuth provider name ('google' or 'facebook')
        redirect_uri: URI to redirect to after OAuth
        state: Optional state parameter for CSRF protection
        
    Returns:
        OAuth authorization URL
    """
    try:
        # Validate provider
        if provider.lower() not in ['google', 'facebook']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported OAuth provider: {provider}"
            )
        
        # Initialize social auth service
        social_auth_service = SocialAuthService(db)
        
        # Generate OAuth URL
        oauth_url = await social_auth_service.get_oauth_url(
            provider=provider.lower(),
            redirect_uri=redirect_uri,
            state=state
        )
        
        return {
            "oauth_url": oauth_url,
            "provider": provider.lower(),
            "state": state
        }
        
    except Exception as e:
        logger.error(f"Failed to generate {provider} OAuth URL: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate OAuth URL: {str(e)}"
        )