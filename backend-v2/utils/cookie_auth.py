"""
Cookie-based authentication utilities for enhanced security.

This module provides secure cookie-based authentication that improves security
over localStorage-based token storage by preventing XSS token theft.
"""

from fastapi import Request, Response, HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
from datetime import timedelta
import logging
from config import settings

logger = logging.getLogger(__name__)

# Cookie configuration
ACCESS_TOKEN_COOKIE = "access_token"
REFRESH_TOKEN_COOKIE = "refresh_token"
CSRF_TOKEN_COOKIE = "csrf_token"

class CookieBearer(HTTPBearer):
    """Custom HTTPBearer that checks both Authorization header and cookies."""
    
    def __init__(self, auto_error: bool = True):
        super().__init__(auto_error=auto_error)
    
    async def __call__(self, request: Request) -> Optional[HTTPAuthorizationCredentials]:
        # First try standard Authorization header
        try:
            credentials = await super().__call__(request)
            if credentials:
                return credentials
        except HTTPException:
            pass
        
        # Fall back to checking cookies
        token = request.cookies.get(ACCESS_TOKEN_COOKIE)
        if token:
            return HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
        
        if self.auto_error:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Not authenticated",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return None

# Global instance for dependency injection
cookie_security = CookieBearer()

def set_auth_cookies(
    response: Response,
    access_token: str,
    refresh_token: str,
    csrf_token: Optional[str] = None
) -> None:
    """
    Set secure authentication cookies.
    
    Args:
        response: FastAPI Response object
        access_token: JWT access token
        refresh_token: JWT refresh token  
        csrf_token: Optional CSRF token for additional protection
    """
    # Determine if we're in production (use HTTPS cookies)
    secure = getattr(settings, 'environment', 'development') == 'production'
    
    # Set access token cookie (short-lived, HttpOnly)
    response.set_cookie(
        key=ACCESS_TOKEN_COOKIE,
        value=access_token,
        httponly=True,
        secure=secure,
        samesite="lax",
        max_age=15 * 60,  # 15 minutes to match token expiry
        path="/"
    )
    
    # Set refresh token cookie (longer-lived, HttpOnly)
    response.set_cookie(
        key=REFRESH_TOKEN_COOKIE,
        value=refresh_token,
        httponly=True,
        secure=secure,
        samesite="lax",
        max_age=7 * 24 * 60 * 60,  # 7 days to match token expiry
        path="/"  # Available to all paths including /api/v2/auth/
    )
    
    # Set CSRF token cookie if provided (readable by JS for header inclusion)
    if csrf_token:
        response.set_cookie(
            key=CSRF_TOKEN_COOKIE,
            value=csrf_token,
            httponly=False,  # JS needs to read this for CSRF headers
            secure=secure,
            samesite="lax",
            max_age=15 * 60,  # Same as access token
            path="/"
        )
    
    logger.info("Authentication cookies set successfully")

def clear_auth_cookies(response: Response) -> None:
    """
    Clear all authentication cookies.
    
    Args:
        response: FastAPI Response object
    """
    # Clear access token cookie
    response.delete_cookie(
        key=ACCESS_TOKEN_COOKIE,
        path="/",
        samesite="lax"
    )
    
    # Clear refresh token cookie
    response.delete_cookie(
        key=REFRESH_TOKEN_COOKIE,
        path="/",
        samesite="lax"
    )
    
    # Clear CSRF token cookie
    response.delete_cookie(
        key=CSRF_TOKEN_COOKIE,
        path="/",
        samesite="lax"
    )
    
    logger.info("Authentication cookies cleared")

def get_refresh_token_from_cookie(request: Request) -> Optional[str]:
    """
    Extract refresh token from cookie.
    
    Args:
        request: FastAPI Request object
        
    Returns:
        Refresh token if found, None otherwise
    """
    return request.cookies.get(REFRESH_TOKEN_COOKIE)

def get_csrf_token_from_cookie(request: Request) -> Optional[str]:
    """
    Extract CSRF token from cookie.
    
    Args:
        request: FastAPI Request object
        
    Returns:
        CSRF token if found, None otherwise
    """
    return request.cookies.get(CSRF_TOKEN_COOKIE)

def verify_csrf_token(request: Request) -> bool:
    """
    Verify CSRF token from header matches cookie.
    
    Args:
        request: FastAPI Request object
        
    Returns:
        True if CSRF token is valid, False otherwise
    """
    # Skip CSRF check for GET requests (they should be idempotent)
    if request.method in ["GET", "HEAD", "OPTIONS"]:
        return True
    
    cookie_token = get_csrf_token_from_cookie(request)
    header_token = request.headers.get("X-CSRF-Token")
    
    if not cookie_token or not header_token:
        return False
    
    return cookie_token == header_token

def generate_csrf_token() -> str:
    """
    Generate a CSRF token.
    
    Returns:
        Random CSRF token string
    """
    import secrets
    return secrets.token_urlsafe(32)

class CSRFError(HTTPException):
    """Custom exception for CSRF token validation failures."""
    
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="CSRF token validation failed"
        )

def require_csrf_token(request: Request) -> bool:
    """
    Dependency that validates CSRF token.
    
    Args:
        request: FastAPI Request object
        
    Returns:
        True if CSRF token is valid
        
    Raises:
        CSRFError: If CSRF token validation fails
    """
    if not verify_csrf_token(request):
        logger.warning(
            f"CSRF token validation failed for {request.method} {request.url.path}",
            extra={
                "ip_address": request.client.host if request.client else "unknown",
                "user_agent": request.headers.get("user-agent", "Unknown")
            }
        )
        raise CSRFError()
    
    return True

def get_cookie_settings() -> dict:
    """
    Get current cookie configuration settings.
    
    Returns:
        Dictionary with cookie configuration
    """
    secure = getattr(settings, 'environment', 'development') == 'production'
    
    return {
        "secure": secure,
        "samesite": "lax",
        "httponly": True,
        "access_token_max_age": 15 * 60,
        "refresh_token_max_age": 7 * 24 * 60 * 60,
        "environment": getattr(settings, 'environment', 'development')
    }