"""
CSRF Protection Middleware for BookedBarber V2

This middleware enforces CSRF token validation on all state-changing requests
to prevent Cross-Site Request Forgery attacks.
"""

from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
import logging

from utils.cookie_auth import verify_csrf_token

logger = logging.getLogger(__name__)

class CSRFMiddleware(BaseHTTPMiddleware):
    """
    Middleware to enforce CSRF token validation on state-changing requests.
    
    This middleware:
    1. Validates CSRF tokens on all POST, PUT, DELETE, PATCH requests
    2. Exempts safe methods (GET, HEAD, OPTIONS) 
    3. Exempts auth endpoints (login generates the initial CSRF token)
    4. Returns 403 Forbidden for invalid/missing CSRF tokens
    """
    
    # Paths that are exempt from CSRF validation
    EXEMPT_PATHS = {
        "/api/v2/auth/login",     # Login endpoint generates CSRF token
        "/api/v2/auth/register",  # Registration endpoint 
        "/api/v2/auth/refresh",   # Refresh endpoint uses cookies only
        "/api/v2/webhooks/",      # Webhook endpoints (external callers)
        "/docs",                  # API documentation
        "/openapi.json",          # OpenAPI spec
        "/health",                # Health check endpoint
    }
    
    def __init__(self, app):
        super().__init__(app)
        logger.info("CSRF Protection Middleware initialized")
    
    async def dispatch(self, request: Request, call_next):
        """
        Validate CSRF token on state-changing requests.
        
        Args:
            request: The incoming HTTP request
            call_next: The next middleware/handler in the chain
            
        Returns:
            Response from the next handler, or 403 if CSRF validation fails
        """
        # Skip CSRF validation for safe methods
        if request.method in ["GET", "HEAD", "OPTIONS"]:
            return await call_next(request)
        
        # Skip CSRF validation for exempt paths
        request_path = request.url.path
        if any(request_path.startswith(exempt) for exempt in self.EXEMPT_PATHS):
            logger.debug(f"CSRF validation skipped for exempt path: {request_path}")
            return await call_next(request)
        
        # Validate CSRF token for state-changing requests
        if not verify_csrf_token(request):
            logger.warning(
                f"CSRF token validation failed for {request.method} {request_path} "
                f"from {request.client.host if request.client else 'unknown'}"
            )
            
            # Log detailed CSRF failure information for security monitoring
            csrf_cookie = request.cookies.get("csrf_token")
            csrf_header = request.headers.get("X-CSRF-Token")
            
            logger.warning(
                f"CSRF Details - Cookie present: {bool(csrf_cookie)}, "
                f"Header present: {bool(csrf_header)}, "
                f"Tokens match: {csrf_cookie == csrf_header if csrf_cookie and csrf_header else False}"
            )
            
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="CSRF token validation failed. Please refresh the page and try again.",
                headers={
                    "X-CSRF-Error": "true",
                    "X-Error-Type": "csrf_validation_failed"
                }
            )
        
        logger.debug(f"CSRF validation passed for {request.method} {request_path}")
        return await call_next(request)