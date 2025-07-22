"""
OAuth API endpoints for BookedBarber V2
Google and Facebook OAuth integration
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from typing import Dict, Any, List
import logging

from database import get_db
from services.oauth_service import OAuthService, validate_oauth_config, create_oauth_env_template
from models import User

# Simple auth dependency for OAuth (optional user)
from typing import Optional
def get_current_user_optional() -> Optional[User]:
    return None

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/oauth", tags=["OAuth Authentication"])

@router.get("/providers", response_model=List[Dict[str, Any]])
async def get_oauth_providers(db: Session = Depends(get_db)):
    """Get list of configured OAuth providers"""
    
    oauth_service = OAuthService(db)
    providers = oauth_service.get_configured_providers()
    
    # Add configuration status
    config_status = validate_oauth_config()
    for provider in providers:
        provider['configured'] = config_status.get(provider['name'], False)
    
    return providers

@router.get("/config/status")
async def get_oauth_config_status():
    """Get OAuth configuration status for setup"""
    
    config_status = validate_oauth_config()
    
    return {
        'providers': config_status,
        'total_configured': sum(config_status.values()),
        'setup_complete': all(config_status.values()),
        'missing_providers': [name for name, configured in config_status.items() if not configured]
    }

@router.get("/config/template")
async def get_oauth_env_template():
    """Get OAuth environment variables template"""
    
    template = create_oauth_env_template()
    
    return {
        'template': template,
        'instructions': [
            "1. Add these variables to your .env file",
            "2. Get Google credentials from Google Cloud Console",
            "3. Get Facebook credentials from Facebook Developer Console", 
            "4. Set up redirect URIs in provider consoles",
            "5. Restart the application"
        ]
    }

@router.post("/initiate/{provider}")
async def initiate_oauth(
    provider: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """
    Initiate OAuth flow for specified provider
    
    Args:
        provider: OAuth provider (google, facebook)
        current_user: Optional current user for account linking
    """
    
    oauth_service = OAuthService(db)
    
    try:
        result = await oauth_service.initiate_oauth(
            provider=provider,
            user_id=current_user.id if current_user else None
        )
        
        logger.info(f"OAuth flow initiated for {provider}")
        
        return result
        
    except Exception as e:
        logger.error(f"Failed to initiate OAuth for {provider}: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/callback/{provider}")
async def oauth_callback_with_provider(
    provider: str,
    code: str = Query(..., description="Authorization code"),
    state: str = Query(..., description="CSRF state parameter"),
    error: str = Query(None, description="OAuth error"),
    error_description: str = Query(None, description="OAuth error description"),
    db: Session = Depends(get_db)
):
    """
    Handle OAuth callback from provider
    
    Args:
        provider: OAuth provider
        code: Authorization code
        state: CSRF protection state
        error: OAuth error if any
        error_description: Detailed error description
    """
    
    # Handle OAuth errors
    if error:
        error_msg = error_description or error
        logger.error(f"OAuth error from {provider}: {error_msg}")
        
        # Redirect to frontend with error
        frontend_url = "http://localhost:3000"  # In production, use settings
        error_url = f"{frontend_url}/auth/oauth-error?error={error}&provider={provider}"
        return RedirectResponse(url=error_url)
    
    oauth_service = OAuthService(db)
    
    try:
        # Complete OAuth flow
        result = await oauth_service.handle_callback(provider, code, state)
        
        # Redirect to frontend with tokens
        frontend_url = "http://localhost:3000"
        success_url = f"{frontend_url}/auth/oauth-success"
        
        # In a real app, you'd handle tokens more securely
        # For now, redirect to a success page that will handle the tokens
        response = RedirectResponse(url=success_url)
        
        # Set secure HTTP-only cookies for tokens
        response.set_cookie(
            key="access_token",
            value=result['access_token'],
            httponly=True,
            secure=True,
            samesite="lax",
            max_age=result['expires_in']
        )
        
        response.set_cookie(
            key="refresh_token", 
            value=result['refresh_token'],
            httponly=True,
            secure=True,
            samesite="lax",
            max_age=60 * 60 * 24 * 7  # 7 days
        )
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"OAuth callback failed for {provider}: {e}")
        
        # Redirect to frontend with error
        frontend_url = "http://localhost:3000"
        error_url = f"{frontend_url}/auth/oauth-error?error=callback_failed&provider={provider}"
        return RedirectResponse(url=error_url)

@router.post("/refresh/{provider}")
async def refresh_oauth_token(
    provider: str,
    refresh_token: str,
    db: Session = Depends(get_db)
):
    """
    Refresh OAuth access token
    
    Args:
        provider: OAuth provider
        refresh_token: Refresh token
    """
    
    oauth_service = OAuthService(db)
    
    try:
        result = await oauth_service.refresh_token(provider, refresh_token)
        
        return {
            'access_token': result['access_token'],
            'token_type': 'bearer',
            'expires_in': result.get('expires_in', 3600)
        }
        
    except Exception as e:
        logger.error(f"Token refresh failed for {provider}: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/link/{provider}")
async def link_oauth_account(
    provider: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """
    Link OAuth account to existing user account
    
    Args:
        provider: OAuth provider to link
        current_user: Currently authenticated user
    """
    
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    oauth_service = OAuthService(db)
    
    try:
        result = await oauth_service.initiate_oauth(
            provider=provider,
            user_id=current_user.id
        )
        
        return {
            'authorization_url': result['authorization_url'],
            'message': f'Visit the authorization URL to link your {provider} account'
        }
        
    except Exception as e:
        logger.error(f"Failed to initiate account linking for {provider}: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/unlink/{provider}")
async def unlink_oauth_account(
    provider: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """
    Unlink OAuth account from user account
    
    Args:
        provider: OAuth provider to unlink
        current_user: Currently authenticated user
    """
    
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    # This would typically involve removing OAuth tokens from database
    # For now, return success message
    
    return {
        'message': f'{provider} account unlinked successfully',
        'provider': provider,
        'user_id': current_user.id
    }

@router.get("/debug/states")
async def debug_oauth_states(db: Session = Depends(get_db)):
    """Debug endpoint to view OAuth states (development only)"""
    
    oauth_service = OAuthService(db)
    
    # Clean up expired states first
    await oauth_service.cleanup_expired_states()
    
    return {
        'active_states': len(oauth_service._oauth_states),
        'states': {
            state: {
                'provider': info['provider'],
                'created_at': info['created_at'].isoformat(),
                'expires_at': info['expires_at'].isoformat(),
                'has_user_id': info.get('user_id') is not None
            }
            for state, info in oauth_service._oauth_states.items()
        }
    }