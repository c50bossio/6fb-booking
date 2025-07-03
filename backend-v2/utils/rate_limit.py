"""
Rate limiting for API endpoints to prevent abuse
"""
import os
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi import Request, Response
from fastapi.responses import JSONResponse
from config import settings

# Create limiter instance using client IP address
# Disable rate limiting in test environment
def get_rate_limit_key(request: Request) -> str:
    """Get rate limit key. Returns None in test environment to disable rate limiting."""
    if settings.environment == "test" or os.environ.get("TESTING", "").lower() == "true":
        return None  # Disable rate limiting in test environment
    return get_remote_address(request)

limiter = Limiter(key_func=get_rate_limit_key)

# Rate limit configurations
# Use higher limits in development for easier testing
is_development = settings.environment == "development" or os.environ.get("ENVIRONMENT") == "development"

RATE_LIMITS = {
    "login": "50/minute" if is_development else "5/minute",           # More attempts in dev
    "register": "20/hour" if is_development else "3/hour",          # More registrations in dev
    "password_reset": "20/hour" if is_development else "3/hour",    # More resets in dev
    "refresh": "50/minute" if is_development else "10/minute",        # More refreshes in dev
    "payment_intent": "50/minute" if is_development else "10/minute", # More payments in dev
    "payment_confirm": "50/minute" if is_development else "15/minute",# More confirmations in dev
    "refund": "20/hour" if is_development else "5/hour",           # More refunds in dev
    "payout": "20/hour" if is_development else "10/hour",          # Payout operations
    "order_create": "100/minute" if is_development else "30/minute", # Order creation
    "pos_transaction": "150/minute" if is_development else "50/minute", # POS transactions
    "commission_report": "60/minute" if is_development else "20/minute", # Commission reports
    "stripe_connect": "30/hour" if is_development else "10/hour",   # Stripe Connect operations
    # Booking/Appointment rate limits
    "booking_create": "50/hour" if is_development else "30/hour",   # Authenticated booking creation
    "guest_booking": "10/hour" if is_development else "3/hour",     # Stricter limit for guest bookings
    "booking_slots": "100/minute" if is_development else "60/minute", # Checking availability
    "booking_reschedule": "30/hour" if is_development else "20/hour", # Rescheduling appointments
    "booking_cancel": "30/hour" if is_development else "20/hour",   # Cancelling appointments
    "default": "200/minute" if is_development else "60/minute"         # Higher default in dev
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
payment_intent_rate_limit = limiter.limit(RATE_LIMITS["payment_intent"])
payment_confirm_rate_limit = limiter.limit(RATE_LIMITS["payment_confirm"])
refund_rate_limit = limiter.limit(RATE_LIMITS["refund"])
payout_rate_limit = limiter.limit(RATE_LIMITS["payout"])
order_create_rate_limit = limiter.limit(RATE_LIMITS["order_create"])
pos_transaction_rate_limit = limiter.limit(RATE_LIMITS["pos_transaction"])
commission_report_rate_limit = limiter.limit(RATE_LIMITS["commission_report"])
stripe_connect_rate_limit = limiter.limit(RATE_LIMITS["stripe_connect"])
# Booking/Appointment rate limits
booking_create_rate_limit = limiter.limit(RATE_LIMITS["booking_create"])
guest_booking_rate_limit = limiter.limit(RATE_LIMITS["guest_booking"])
booking_slots_rate_limit = limiter.limit(RATE_LIMITS["booking_slots"])
booking_reschedule_rate_limit = limiter.limit(RATE_LIMITS["booking_reschedule"])
booking_cancel_rate_limit = limiter.limit(RATE_LIMITS["booking_cancel"])
default_rate_limit = limiter.limit(RATE_LIMITS["default"])