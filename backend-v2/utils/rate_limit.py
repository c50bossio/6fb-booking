"""
Rate limiting for API endpoints to prevent abuse
"""
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi import Request, Response
from fastapi.responses import JSONResponse

# Create limiter instance using client IP address
limiter = Limiter(key_func=get_remote_address)

# Rate limit configurations
RATE_LIMITS = {
    "login": "5/minute",           # 5 login attempts per minute
    "register": "3/hour",          # 3 registrations per hour
    "password_reset": "3/hour",    # 3 password reset requests per hour
    "refresh": "10/minute",        # 10 refresh requests per minute
    "default": "60/minute"         # Default for other endpoints
}

def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded) -> Response:
    """Custom handler for rate limit exceeded errors"""
    response = JSONResponse(
        status_code=429,
        content={
            "detail": f"Rate limit exceeded: {exc.detail}",
            "retry_after": exc.retry_after if hasattr(exc, 'retry_after') else 60
        }
    )
    response.headers["Retry-After"] = str(exc.retry_after if hasattr(exc, 'retry_after') else 60)
    return response

# Pre-configured decorators for common use cases
login_rate_limit = limiter.limit(RATE_LIMITS["login"])
register_rate_limit = limiter.limit(RATE_LIMITS["register"])
password_reset_rate_limit = limiter.limit(RATE_LIMITS["password_reset"])
refresh_rate_limit = limiter.limit(RATE_LIMITS["refresh"])
default_rate_limit = limiter.limit(RATE_LIMITS["default"])