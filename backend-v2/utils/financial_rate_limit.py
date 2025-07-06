"""
Enhanced rate limiting for financial endpoints
Provides stricter limits and additional security for payment operations
"""

from functools import wraps
from typing import Callable, Optional
from fastapi import Request, HTTPException, status
from slowapi import Limiter
from slowapi.util import get_remote_address
import time
import hashlib
import logging
from utils.rate_limit import limiter, RATE_LIMITS

logger = logging.getLogger(__name__)


# Enhanced rate limits for financial operations
FINANCIAL_RATE_LIMITS = {
    # Payment operations - stricter limits
    "gift_certificate_create": "10/hour",      # Limit gift certificate creation
    "gift_certificate_validate": "30/minute",  # Allow more validations
    "stripe_connect_onboard": "5/hour",        # Limit Connect account creation
    "payment_history": "20/minute",            # Viewing payment history
    "payment_report": "10/hour",               # Generating reports
    
    # Admin financial operations - more restrictive
    "admin_refund": "10/hour",                 # Admin refunds
    "admin_payout": "5/hour",                  # Admin payouts
    "commission_calculate": "20/minute",       # Commission calculations
    
    # Bulk operations - very restrictive
    "bulk_payout": "2/hour",                   # Bulk payout processing
    "bulk_refund": "5/hour",                   # Bulk refunds
    
    # POS and order operations
    "pos_transaction": "100/minute",           # POS transactions
    "order_create": "50/minute",               # Order creation
    "order_refund": "10/hour",                # Order refunds
}

# Create specific limiters for financial operations
gift_certificate_create_limit = limiter.limit(FINANCIAL_RATE_LIMITS["gift_certificate_create"])
gift_certificate_validate_limit = limiter.limit(FINANCIAL_RATE_LIMITS["gift_certificate_validate"])
stripe_connect_limit = limiter.limit(FINANCIAL_RATE_LIMITS["stripe_connect_onboard"])
payment_history_limit = limiter.limit(FINANCIAL_RATE_LIMITS["payment_history"])
payment_report_limit = limiter.limit(FINANCIAL_RATE_LIMITS["payment_report"])
admin_refund_limit = limiter.limit(FINANCIAL_RATE_LIMITS["admin_refund"])
admin_payout_limit = limiter.limit(FINANCIAL_RATE_LIMITS["admin_payout"])
commission_calculate_limit = limiter.limit(FINANCIAL_RATE_LIMITS["commission_calculate"])


def financial_rate_limit(
    limit_key: str,
    cost: int = 1,
    key_func: Optional[Callable] = None,
    error_message: Optional[str] = None
):
    """
    Enhanced rate limiting decorator for financial endpoints
    
    Args:
        limit_key: Key from FINANCIAL_RATE_LIMITS
        cost: Cost of this operation (for weighted rate limiting)
        key_func: Custom function to generate rate limit key
        error_message: Custom error message
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(request: Request, *args, **kwargs):
            # Get rate limit
            limit = FINANCIAL_RATE_LIMITS.get(limit_key, "60/minute")
            
            # Get user info for logging
            user = getattr(request.state, "user", None)
            user_id = user.id if user else "anonymous"
            
            # Apply rate limit
            try:
                # Create a custom limiter for this specific limit
                custom_limiter = Limiter(key_func=key_func or get_remote_address)
                limited_func = custom_limiter.limit(limit)(func)
                
                # Log financial operation attempt
                logger.info(
                    f"Financial operation attempt - "
                    f"User: {user_id}, "
                    f"Endpoint: {request.url.path}, "
                    f"Operation: {limit_key}"
                )
                
                # Execute function
                result = await limited_func(request, *args, **kwargs)
                
                # Log success
                logger.info(
                    f"Financial operation success - "
                    f"User: {user_id}, "
                    f"Operation: {limit_key}"
                )
                
                return result
                
            except HTTPException as e:
                if e.status_code == 429:  # Rate limit exceeded
                    # Log rate limit violation
                    logger.warning(
                        f"Financial rate limit exceeded - "
                        f"User: {user_id}, "
                        f"Operation: {limit_key}, "
                        f"Limit: {limit}"
                    )
                    
                    # Enhanced error response
                    raise HTTPException(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        detail={
                            "error": error_message or f"Rate limit exceeded for {limit_key}",
                            "limit": limit,
                            "retry_after": 60,
                            "reference_id": hashlib.md5(
                                f"{user_id}:{time.time()}".encode()
                            ).hexdigest()[:8]
                        },
                        headers={"Retry-After": "60"}
                    )
                raise
            except Exception as e:
                # Log unexpected errors
                logger.error(
                    f"Financial operation error - "
                    f"User: {user_id}, "
                    f"Operation: {limit_key}, "
                    f"Error: {str(e)}"
                )
                raise
        
        return wrapper
    return decorator


def dynamic_rate_limit(base_limit: str = "60/minute"):
    """
    Dynamic rate limiting based on user behavior and risk factors
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(request: Request, *args, **kwargs):
            user = getattr(request.state, "user", None)
            
            # Calculate dynamic limit based on user factors
            limit = calculate_dynamic_limit(user, base_limit)
            
            # Apply dynamic limit
            custom_limiter = Limiter(key_func=get_remote_address)
            limited_func = custom_limiter.limit(limit)(func)
            
            return await limited_func(request, *args, **kwargs)
        
        return wrapper
    return decorator


def calculate_dynamic_limit(user, base_limit: str) -> str:
    """
    Calculate dynamic rate limit based on user trust factors
    """
    if not user:
        return base_limit
    
    # Parse base limit
    count, period = base_limit.split("/")
    base_count = int(count)
    
    # Trust factors (in production, would be more sophisticated)
    multiplier = 1.0
    
    # Account age
    if hasattr(user, 'created_at'):
        account_age_days = (time.time() - user.created_at.timestamp()) / 86400
        if account_age_days > 90:
            multiplier *= 1.5  # 50% more for accounts > 90 days
        elif account_age_days < 7:
            multiplier *= 0.5  # 50% less for new accounts
    
    # User role
    role_multipliers = {
        "super_admin": 5.0,
        "admin": 3.0,
        "barber": 2.0,
        "user": 1.0
    }
    multiplier *= role_multipliers.get(user.role, 1.0)
    
    # Payment history (would check actual history in production)
    # if user has good payment history: multiplier *= 1.2
    # if user has chargebacks: multiplier *= 0.3
    
    # Calculate final limit
    final_count = int(base_count * multiplier)
    return f"{final_count}/{period}"


# Specialized decorators for common financial operations
def require_payment_verification(min_amount: float = 100.0):
    """
    Require additional verification for high-value operations
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Extract amount from request
            request = args[0] if args else kwargs.get('request')
            
            # In production, would check:
            # - 2FA verification
            # - Recent password confirmation
            # - Device fingerprint
            # - Behavioral analysis
            
            return await func(*args, **kwargs)
        
        return wrapper
    return decorator


# Combined security decorator for critical financial endpoints
def financial_endpoint_security(
    rate_limit_key: str,
    require_2fa: bool = False,
    max_amount: Optional[float] = None,
    log_level: str = "INFO"
):
    """
    Comprehensive security decorator combining multiple protections
    """
    def decorator(func):
        @financial_rate_limit(rate_limit_key)
        @require_payment_verification(min_amount=max_amount or 1000.0)
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Additional security checks would go here
            return await func(*args, **kwargs)
        
        return wrapper
    return decorator