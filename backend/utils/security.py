"""
Security utilities and middleware
"""

from fastapi import HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional, Dict, Any
import time
from collections import defaultdict
from datetime import datetime, timedelta
import re
import hmac
import hashlib


class RateLimiter:
    """Enhanced in-memory rate limiter with headers and logging"""

    def __init__(
        self, max_requests: int = 10, window_seconds: int = 60, name: str = "default"
    ):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.name = name
        self.requests: Dict[str, list] = defaultdict(list)

    def is_allowed(self, identifier: str) -> tuple[bool, dict]:
        """Check if request is allowed based on rate limit
        Returns: (allowed, headers_dict)
        """
        now = time.time()

        # Clean old requests
        self.requests[identifier] = [
            req_time
            for req_time in self.requests[identifier]
            if now - req_time < self.window_seconds
        ]

        current_count = len(self.requests[identifier])
        remaining = max(0, self.max_requests - current_count)
        reset_time = int(now + self.window_seconds)

        # Create rate limit headers
        headers = {
            "X-RateLimit-Limit": str(self.max_requests),
            "X-RateLimit-Remaining": str(remaining),
            "X-RateLimit-Reset": str(reset_time),
            "X-RateLimit-Window": str(self.window_seconds),
        }

        # Check if under limit
        if current_count < self.max_requests:
            self.requests[identifier].append(now)
            return True, headers

        # Rate limit exceeded
        retry_after = self.get_reset_time(identifier)
        headers["Retry-After"] = str(retry_after)
        return False, headers

    def get_reset_time(self, identifier: str) -> int:
        """Get time until rate limit resets"""
        if not self.requests[identifier]:
            return 0

        oldest_request = min(self.requests[identifier])
        reset_time = int(oldest_request + self.window_seconds - time.time())
        return max(0, reset_time)


# Global rate limiters with enhanced configurations
login_rate_limiter = RateLimiter(
    max_requests=5, window_seconds=300, name="login"
)  # 5 attempts per 5 minutes
api_rate_limiter = RateLimiter(
    max_requests=100, window_seconds=60, name="api"
)  # 100 requests per minute
health_rate_limiter = RateLimiter(
    max_requests=200, window_seconds=60, name="health"
)  # 200 health checks per minute
payment_rate_limiter = RateLimiter(
    max_requests=30, window_seconds=60, name="payment"
)  # 30 payment requests per minute
webhook_rate_limiter = RateLimiter(
    max_requests=500, window_seconds=60, name="webhook"
)  # 500 webhook requests per minute
booking_rate_limiter = RateLimiter(
    max_requests=50, window_seconds=60, name="booking"
)  # 50 booking requests per minute


def check_login_rate_limit(identifier: str) -> dict:
    """Check login rate limit and return headers"""
    allowed, headers = login_rate_limiter.is_allowed(identifier)
    if not allowed:
        reset_time = login_rate_limiter.get_reset_time(identifier)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Too many login attempts. Please try again in {reset_time} seconds.",
            headers=headers,
        )
    return headers


def check_api_rate_limit(identifier: str) -> dict:
    """Check API rate limit and return headers"""
    allowed, headers = api_rate_limiter.is_allowed(identifier)
    if not allowed:
        reset_time = api_rate_limiter.get_reset_time(identifier)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit exceeded. Please try again in {reset_time} seconds.",
            headers=headers,
        )
    return headers


def check_endpoint_rate_limit(identifier: str, endpoint_type: str) -> dict:
    """Check rate limit for specific endpoint types"""
    import logging

    logger = logging.getLogger(__name__)

    # Select appropriate rate limiter based on endpoint type
    if endpoint_type == "health":
        limiter = health_rate_limiter
    elif endpoint_type == "payment":
        limiter = payment_rate_limiter
    elif endpoint_type == "webhook":
        limiter = webhook_rate_limiter
    elif endpoint_type == "booking":
        limiter = booking_rate_limiter
    elif endpoint_type == "login":
        limiter = login_rate_limiter
    else:
        limiter = api_rate_limiter

    allowed, headers = limiter.is_allowed(identifier)
    if not allowed:
        reset_time = limiter.get_reset_time(identifier)
        logger.warning(
            f"Rate limit exceeded for {endpoint_type} endpoint. IP: {identifier}, Limiter: {limiter.name}"
        )
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit exceeded for {endpoint_type} requests. Please try again in {reset_time} seconds.",
            headers=headers,
        )
    return headers


def validate_password_strength(password: str) -> tuple[bool, Optional[str]]:
    """
    Validate password strength
    Returns: (is_valid, error_message)
    """
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"

    if not re.search(r"[A-Z]", password):
        return False, "Password must contain at least one uppercase letter"

    if not re.search(r"[a-z]", password):
        return False, "Password must contain at least one lowercase letter"

    if not re.search(r"\d", password):
        return False, "Password must contain at least one number"

    if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
        return False, "Password must contain at least one special character"

    return True, None


def sanitize_output(data: Any) -> Any:
    """Remove sensitive fields from output"""
    if isinstance(data, dict):
        # Fields to remove from output
        sensitive_fields = {"password", "hashed_password", "token", "secret"}

        # Create a copy to avoid modifying the original
        cleaned = {}
        for key, value in data.items():
            if key.lower() not in sensitive_fields:
                cleaned[key] = sanitize_output(value)
        return cleaned

    elif isinstance(data, list):
        return [sanitize_output(item) for item in data]

    else:
        return data


def get_client_ip(request: Request) -> str:
    """Get client IP address from request"""
    # Check for proxy headers
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()

    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip

    # Fallback to direct connection
    if request.client:
        return request.client.host

    return "unknown"


def verify_square_webhook(payload: str, signature: str, webhook_secret: str) -> bool:
    """
    Verify Square webhook signature
    Square uses HMAC-SHA256 for webhook verification
    """
    if not webhook_secret or not signature or not payload:
        return False
    
    try:
        # Square uses HMAC-SHA256 for webhook verification
        expected_signature = hmac.new(
            webhook_secret.encode('utf-8'),
            payload.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        
        return hmac.compare_digest(signature, expected_signature)
    except Exception:
        return False
