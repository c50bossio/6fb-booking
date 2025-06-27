"""
CSRF Protection Middleware
Provides CSRF protection for POS and other sensitive endpoints
"""

from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from typing import Callable, Optional
import logging

from services.pos_security_service import POSSecurityService
from config.database import SessionLocal

logger = logging.getLogger(__name__)

# Endpoints that require CSRF protection
CSRF_PROTECTED_PATHS = [
    "/api/v1/pos/",
    "/api/v1/barber-pin/change",
    "/api/v1/barber-pin/reset",
    "/api/v1/payments/",
    "/api/v1/barber-payments/",
]

# Methods that require CSRF protection
CSRF_PROTECTED_METHODS = ["POST", "PUT", "DELETE", "PATCH"]


class CSRFProtectionMiddleware(BaseHTTPMiddleware):
    """
    Middleware for CSRF protection on sensitive endpoints
    """

    def __init__(self, app, strict_mode: bool = True):
        super().__init__(app)
        self.strict_mode = strict_mode

    def _requires_csrf_protection(self, request: Request) -> bool:
        """
        Determine if request requires CSRF protection
        """
        # Skip CSRF for GET, HEAD, OPTIONS
        if request.method not in CSRF_PROTECTED_METHODS:
            return False

        # Check if path requires protection
        path = request.url.path
        for protected_path in CSRF_PROTECTED_PATHS:
            if path.startswith(protected_path):
                return True

        return False

    def _get_session_token(self, request: Request) -> Optional[str]:
        """
        Extract session token from Authorization header
        """
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            return auth_header.split(" ")[1]
        return None

    async def dispatch(self, request: Request, call_next: Callable):
        # Check if CSRF protection is required
        if not self._requires_csrf_protection(request):
            return await call_next(request)

        # Extract CSRF token from header
        csrf_token = request.headers.get("X-CSRF-Token")

        # In strict mode, always require CSRF token
        if self.strict_mode and not csrf_token:
            logger.warning(
                f"CSRF token missing for {request.method} {request.url.path}"
            )
            return JSONResponse(
                status_code=status.HTTP_403_FORBIDDEN,
                content={
                    "detail": "CSRF token required",
                    "error_code": "CSRF_TOKEN_MISSING",
                },
            )

        # If we have a CSRF token, validate it
        if csrf_token:
            session_token = self._get_session_token(request)

            if not session_token:
                return JSONResponse(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    content={
                        "detail": "Session token required for CSRF validation",
                        "error_code": "SESSION_TOKEN_MISSING",
                    },
                )

            # Validate CSRF token using security service
            db = SessionLocal()
            try:
                security_service = POSSecurityService(db)

                if not security_service.validate_csrf_token(session_token, csrf_token):
                    logger.warning(
                        f"Invalid CSRF token for {request.method} {request.url.path}"
                    )
                    return JSONResponse(
                        status_code=status.HTTP_403_FORBIDDEN,
                        content={
                            "detail": "Invalid CSRF token",
                            "error_code": "CSRF_TOKEN_INVALID",
                        },
                    )
            finally:
                db.close()

        # Process request
        response = await call_next(request)

        # Add CSRF header to indicate protection is active
        response.headers["X-CSRF-Protection"] = "active"

        return response


class DoubleSubmitCSRFMiddleware(BaseHTTPMiddleware):
    """
    Alternative CSRF protection using double-submit cookie pattern
    Useful for stateless applications
    """

    def __init__(
        self, app, cookie_name: str = "csrf_token", header_name: str = "X-CSRF-Token"
    ):
        super().__init__(app)
        self.cookie_name = cookie_name
        self.header_name = header_name

    async def dispatch(self, request: Request, call_next: Callable):
        # Skip CSRF for safe methods
        if request.method in ["GET", "HEAD", "OPTIONS"]:
            return await call_next(request)

        # Get CSRF token from cookie and header
        cookie_token = request.cookies.get(self.cookie_name)
        header_token = request.headers.get(self.header_name)

        # Both must be present and match
        if not cookie_token or not header_token or cookie_token != header_token:
            return JSONResponse(
                status_code=status.HTTP_403_FORBIDDEN,
                content={
                    "detail": "CSRF validation failed",
                    "error_code": "CSRF_VALIDATION_FAILED",
                },
            )

        # Process request
        response = await call_next(request)

        return response
