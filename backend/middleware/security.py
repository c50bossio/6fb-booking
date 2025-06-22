"""
Security middleware for FastAPI application
"""

from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from typing import Callable
import time

from utils.security import (
    get_client_ip,
    check_api_rate_limit,
    check_endpoint_rate_limit,
)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add security headers to all responses"""

    async def dispatch(self, request: Request, call_next: Callable):
        response = await call_next(request)

        # Add security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # Content Security Policy to prevent extension injection attempts
        # This policy allows the app to function while preventing extensions from injecting content
        csp_directives = [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://cdn.jsdelivr.net",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "font-src 'self' https://fonts.gstatic.com",
            "img-src 'self' data: https: blob:",
            "connect-src 'self' https://api.stripe.com https://m.stripe.network https://*.sentry.io http://localhost:* ws://localhost:*",
            "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'",
            "upgrade-insecure-requests",
        ]

        # In development, be more permissive
        if request.app.state.settings.ENVIRONMENT == "development":
            csp_directives = [
                "default-src 'self'",
                "script-src 'self' 'unsafe-inline' 'unsafe-eval' https: http://localhost:*",
                "style-src 'self' 'unsafe-inline' https: http://localhost:*",
                "font-src 'self' https: http://localhost:* data:",
                "img-src 'self' data: https: http://localhost:* blob:",
                "connect-src 'self' https: http://localhost:* ws://localhost:* wss://localhost:*",
                "frame-src 'self' https: http://localhost:*",
                "object-src 'none'",
                "base-uri 'self'",
                "form-action 'self'",
            ]

        response.headers["Content-Security-Policy"] = "; ".join(csp_directives)

        # Permissions Policy (formerly Feature Policy) to control browser features
        permissions_policy = [
            "accelerometer=()",
            "camera=()",
            "geolocation=()",
            "gyroscope=()",
            "magnetometer=()",
            "microphone=()",
            "payment=(self)",
            "usb=()",
        ]
        response.headers["Permissions-Policy"] = ", ".join(permissions_policy)

        # Only add HSTS in production
        if request.app.state.settings.ENVIRONMENT == "production":
            response.headers["Strict-Transport-Security"] = (
                "max-age=31536000; includeSubDomains"
            )

        return response


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Apply granular rate limiting to API endpoints"""

    def _get_endpoint_type(self, path: str) -> str:
        """Determine endpoint type for rate limiting"""
        if path == "/health":
            return "health"
        elif path.startswith("/api/v1/auth"):
            return "login"
        elif path.startswith("/api/v1/payments") or path.startswith("/api/v1/webhooks"):
            return "payment"
        elif path.startswith("/api/v1/appointments"):
            return "booking"
        elif "webhook" in path.lower():
            return "webhook"
        else:
            return "api"

    async def dispatch(self, request: Request, call_next: Callable):
        # Skip rate limiting for docs endpoints only
        if request.url.path in ["/docs", "/redoc", "/openapi.json", "/"]:
            return await call_next(request)

        # Get client identifier and endpoint type
        client_ip = get_client_ip(request)
        endpoint_type = self._get_endpoint_type(request.url.path)

        try:
            # Check rate limit and get headers
            rate_limit_headers = check_endpoint_rate_limit(client_ip, endpoint_type)
        except HTTPException as exc:
            return JSONResponse(
                status_code=exc.status_code,
                content={"detail": exc.detail},
                headers=exc.headers if hasattr(exc, "headers") else {},
            )

        # Process request
        response = await call_next(request)

        # Add rate limit headers to response
        for header_name, header_value in rate_limit_headers.items():
            response.headers[header_name] = header_value

        return response


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Log all requests for monitoring"""

    async def dispatch(self, request: Request, call_next: Callable):
        start_time = time.time()

        # Log request
        client_ip = get_client_ip(request)

        # Process request
        response = await call_next(request)

        # Calculate request duration
        duration = time.time() - start_time

        # Log response (in production, use proper logging)
        if request.app.state.settings.ENVIRONMENT == "development":
            print(
                f"{request.method} {request.url.path} - {response.status_code} - {duration:.3f}s - {client_ip}"
            )

        # Add timing header
        response.headers["X-Process-Time"] = str(duration)

        return response
