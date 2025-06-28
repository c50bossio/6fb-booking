"""
Authentication Rate Limiting Middleware
Provides comprehensive protection for authentication endpoints
"""

import time
from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from typing import Callable
from services.rate_limiting_service import rate_limiting_service
from utils.security import get_client_ip
from utils.secure_logging import get_secure_logger

logger = get_secure_logger(__name__)


class AuthRateLimitingMiddleware(BaseHTTPMiddleware):
    """
    Enhanced rate limiting middleware specifically for authentication endpoints
    """

    def __init__(
        self, app, enable_account_lockout: bool = True, enable_ip_blocking: bool = True
    ):
        super().__init__(app)
        self.enable_account_lockout = enable_account_lockout
        self.enable_ip_blocking = enable_ip_blocking

        # Authentication endpoint mappings
        self.auth_endpoints = {
            "/api/v1/auth/token": "login",
            "/api/v1/auth/login": "login",
            "/api/v1/auth/login-mfa": "mfa_verify",
            "/api/v1/auth/register": "register",
            "/api/v1/auth/forgot-password": "forgot_password",
            "/api/v1/auth/reset-password": "forgot_password",
            "/api/v1/auth/send-magic-link": "forgot_password",
        }

    def _get_endpoint_type(self, path: str) -> str:
        """Map request path to rate limiting endpoint type"""
        # Direct mapping
        if path in self.auth_endpoints:
            return self.auth_endpoints[path]

        # Pattern matching for dynamic paths
        if path.startswith("/api/v1/auth/"):
            if "login" in path:
                return "login"
            elif "register" in path:
                return "register"
            elif "forgot" in path or "reset" in path or "magic" in path:
                return "forgot_password"
            elif "mfa" in path:
                return "mfa_verify"

        return None

    def _extract_email_from_request(self, request: Request) -> str:
        """Safely extract email from request body for user-based rate limiting"""
        try:
            # This is a simplified extraction - in practice you'd need to handle
            # different content types and parse JSON safely
            if hasattr(request, "_body") and request._body:
                body = request._body.decode("utf-8")
                # Simple extraction for common patterns
                if '"email"' in body or '"username"' in body:
                    import json

                    try:
                        data = json.loads(body)
                        return data.get("email") or data.get("username", "")
                    except json.JSONDecodeError:
                        pass
        except Exception:
            pass
        return None

    async def dispatch(self, request: Request, call_next: Callable):
        """Apply rate limiting to authentication endpoints"""

        # Check if this is an auth endpoint
        endpoint_type = self._get_endpoint_type(request.url.path)
        if not endpoint_type:
            # Not an auth endpoint, continue normally
            return await call_next(request)

        # Skip OPTIONS requests (CORS preflight)
        if request.method == "OPTIONS":
            return await call_next(request)

        # Get client information
        client_ip = get_client_ip(request)

        # Try to extract email for user-based limiting
        email = None
        if request.method == "POST":
            # Read body for email extraction
            body = await request.body()
            request._body = body  # Store for later use

            # Recreate request with body
            async def receive():
                return {"type": "http.request", "body": body}

            request._receive = receive

            try:
                if body:
                    import json

                    data = json.loads(body.decode("utf-8"))
                    email = data.get("email") or data.get("username")
            except (json.JSONDecodeError, UnicodeDecodeError):
                pass

        # Check bypass token from headers
        bypass_token = request.headers.get("X-Admin-Bypass-Token")

        # Apply rate limiting
        try:
            allowed, headers = rate_limiting_service.check_rate_limit(
                endpoint=endpoint_type,
                ip_address=client_ip,
                email=email,
                bypass_token=bypass_token,
            )

            if not allowed:
                # Rate limit exceeded
                blocked_type = headers.get("X-RateLimit-Blocked", "rate_limit")

                error_messages = {
                    "rate_limit": "Too many requests. Please try again later.",
                    "ip": "Your IP address has been temporarily blocked due to suspicious activity.",
                    "account": f"Account temporarily locked due to multiple failed attempts. Please try again later.",
                }

                detail = error_messages.get(
                    blocked_type, "Access temporarily restricted."
                )

                # Log the block
                logger.warning(
                    f"Rate limit block: {blocked_type} for {endpoint_type} - IP: {client_ip}, Email: {email}"
                )

                return JSONResponse(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    content={
                        "detail": detail,
                        "blocked_type": blocked_type,
                        "retry_after": headers.get("Retry-After", "300"),
                    },
                    headers=headers,
                )

        except Exception as e:
            logger.error(f"Rate limiting error: {e}")
            # Don't block requests if rate limiting fails
            headers = {}

        # Process the request
        start_time = time.time()
        response = await call_next(request)

        # Record the attempt result for learning
        if email and endpoint_type == "login":
            success = response.status_code == 200
            user_agent = request.headers.get("user-agent")

            rate_limiting_service.record_login_attempt(
                ip_address=client_ip,
                email=email,
                success=success,
                user_agent=user_agent,
            )

            # Log authentication attempt
            if success:
                logger.info(f"Successful authentication: {email} from {client_ip}")
            else:
                logger.warning(f"Failed authentication: {email} from {client_ip}")

        # Add rate limit headers to successful responses
        if "headers" in locals():
            for header_name, header_value in headers.items():
                if not header_name.startswith("X-RateLimit-Blocked"):
                    response.headers[header_name] = header_value

        # Add timing information
        response.headers["X-Auth-Process-Time"] = str(time.time() - start_time)

        return response


def create_auth_rate_limiting_middleware(
    enable_account_lockout: bool = True, enable_ip_blocking: bool = True
) -> AuthRateLimitingMiddleware:
    """
    Factory function to create auth rate limiting middleware with configuration
    """

    def middleware_factory(app):
        return AuthRateLimitingMiddleware(
            app,
            enable_account_lockout=enable_account_lockout,
            enable_ip_blocking=enable_ip_blocking,
        )

    return middleware_factory
