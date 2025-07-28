"""
CSRF Protection Middleware

This middleware provides comprehensive CSRF (Cross-Site Request Forgery) protection
for all state-changing HTTP methods. It ensures that all POST, PUT, PATCH, and DELETE
requests include valid CSRF tokens.

SECURITY FEATURES:
- Validates CSRF tokens for all state-changing requests
- Generates secure CSRF tokens
- Integrates with cookie-based authentication
- Provides detailed security logging
- Configurable exemption patterns for specific endpoints
"""

from fastapi import Request, HTTPException, status
from fastapi.responses import Response
from starlette.middleware.base import BaseHTTPMiddleware
from typing import List, Optional, Set
import logging
import re
from utils.cookie_auth import verify_csrf_token, generate_csrf_token

logger = logging.getLogger(__name__)

class CSRFProtectionMiddleware(BaseHTTPMiddleware):
    """
    CSRF Protection Middleware for FastAPI
    
    Validates CSRF tokens for all state-changing HTTP methods.
    Exempt endpoints can be configured via patterns.
    """
    
    def __init__(
        self,
        app,
        exempt_patterns: Optional[List[str]] = None,
        safe_methods: Optional[Set[str]] = None
    ):
        super().__init__(app)
        
        # HTTP methods that don't modify state (exempt from CSRF)
        self.safe_methods = safe_methods or {"GET", "HEAD", "OPTIONS", "TRACE"}
        
        # Endpoint patterns exempt from CSRF protection
        self.exempt_patterns = exempt_patterns or [
            r"^/docs.*",  # Swagger docs
            r"^/redoc.*",  # ReDoc
            r"^/openapi\.json$",  # OpenAPI schema
            r"^/health.*",  # Health checks
            r"^/api/v2/auth/login$",  # Login endpoint (bootstraps CSRF)
            r"^/api/v2/auth/register.*",  # Registration endpoints
            r"^/api/v2/auth/forgot-password$",  # Password reset
            r"^/api/v2/auth/reset-password$",  # Password reset confirmation
            r"^/api/v2/auth/verify-email$",  # Email verification
            r"^/api/v2/webhooks/.*",  # Webhook endpoints (have other auth)
        ]
        
        # Compile regex patterns for efficiency
        self.compiled_patterns = [re.compile(pattern) for pattern in self.exempt_patterns]
    
    async def dispatch(self, request: Request, call_next):
        """
        Process request and validate CSRF token if required
        """
        
        # Skip CSRF check for safe methods
        if request.method in self.safe_methods:
            response = await call_next(request)
            return self._add_csrf_header(response)
        
        # Skip CSRF check for exempt endpoints
        if self._is_exempt_endpoint(request.url.path):
            response = await call_next(request)
            return self._add_csrf_header(response)
        
        # Validate CSRF token for state-changing requests
        if not verify_csrf_token(request):
            logger.warning(
                f"CSRF token validation failed for {request.method} {request.url.path}",
                extra={
                    "ip_address": request.client.host if request.client else "unknown",
                    "user_agent": request.headers.get("user-agent", "Unknown"),
                    "method": request.method,
                    "path": request.url.path,
                    "has_csrf_cookie": bool(request.cookies.get("csrf_token")),
                    "has_csrf_header": bool(request.headers.get("X-CSRF-Token")),
                }
            )
            
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="CSRF token validation failed. Please refresh the page and try again.",
                headers={
                    "X-CSRF-Required": "true",
                    "X-Security-Error": "csrf_validation_failed"
                }
            )
        
        # Process request
        response = await call_next(request)
        return self._add_csrf_header(response)
    
    def _is_exempt_endpoint(self, path: str) -> bool:
        """
        Check if endpoint is exempt from CSRF protection
        """
        return any(pattern.match(path) for pattern in self.compiled_patterns)
    
    def _add_csrf_header(self, response: Response) -> Response:
        """
        Add CSRF token to response headers for client consumption
        """
        try:
            # Generate new CSRF token for the response
            csrf_token = generate_csrf_token()
            response.headers["X-CSRF-Token"] = csrf_token
            
            # Also set as cookie (will be updated by cookie_auth if needed)
            # This ensures the client always has a valid CSRF token
            response.set_cookie(
                key="csrf_token",
                value=csrf_token,
                httponly=False,  # JS needs to read this for headers
                secure=True,  # HTTPS only in production
                samesite="lax",
                max_age=15 * 60,  # 15 minutes
                path="/"
            )
            
        except Exception as e:
            logger.error(f"Failed to add CSRF token to response: {e}")
        
        return response


class CSRFException(HTTPException):
    """Custom exception for CSRF validation failures"""
    
    def __init__(self, detail: str = "CSRF token validation failed"):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=detail,
            headers={
                "X-CSRF-Required": "true",
                "X-Security-Error": "csrf_validation_failed"
            }
        )


def get_csrf_protection_middleware(
    exempt_patterns: Optional[List[str]] = None
) -> CSRFProtectionMiddleware:
    """
    Factory function to create CSRF protection middleware with custom configuration
    
    Args:
        exempt_patterns: List of regex patterns for endpoints exempt from CSRF
        
    Returns:
        Configured CSRFProtectionMiddleware instance
    """
    return CSRFProtectionMiddleware(
        app=None,  # Will be set by FastAPI
        exempt_patterns=exempt_patterns
    )


# Security audit configuration
CSRF_AUDIT_CONFIG = {
    "log_all_checks": True,  # Log all CSRF validations
    "log_failures_only": False,  # Set to True to reduce log volume
    "alert_on_multiple_failures": True,  # Alert on repeated failures from same IP
    "failure_threshold": 5,  # Number of failures before alert
    "failure_window_minutes": 15,  # Time window for failure counting
}


def log_csrf_audit_event(
    event_type: str,
    request: Request,
    details: dict = None
):
    """
    Log CSRF-related security events for audit purposes
    """
    audit_data = {
        "event_type": event_type,
        "ip_address": request.client.host if request.client else "unknown",
        "user_agent": request.headers.get("user-agent", "Unknown"),
        "method": request.method,
        "path": request.url.path,
        "timestamp": logging.Formatter().formatTime(logging.LogRecord(
            name="csrf_audit", level=logging.INFO, pathname="", lineno=0,
            msg="", args=(), exc_info=None
        )),
    }
    
    if details:
        audit_data.update(details)
    
    logger.info(f"CSRF Audit: {event_type}", extra=audit_data)