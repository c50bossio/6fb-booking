"""
Payment Rate Limiter Dependency

This module provides FastAPI dependency functions that integrate the Advanced Payment Rate Limiter
with payment endpoints. It works alongside existing basic rate limiting to provide enhanced
security for payment operations.
"""

import logging
from typing import Dict, Any, Optional, Tuple
from decimal import Decimal
from fastapi import Request, HTTPException, status, Depends
from sqlalchemy.orm import Session

from database import get_db
from services.advanced_payment_rate_limiter import AdvancedPaymentRateLimiter, RateLimitViolationType
from services.redis_service import get_redis_client
from models import User
from dependencies import get_current_user
from utils.logging_config import get_audit_logger

logger = logging.getLogger(__name__)
audit_logger = get_audit_logger()


class PaymentRateLimitDependency:
    """
    Dependency class that provides advanced payment rate limiting functionality
    as a FastAPI dependency with proper session and user context management.
    """
    
    def __init__(self):
        self.redis_client = None
        self.rate_limiter = None
    
    def __call__(
        self,
        request: Request,
        db: Session = Depends(get_db),
        user: Optional[User] = None  # Will be injected when available
    ) -> AdvancedPaymentRateLimiter:
        """
        Create and return an AdvancedPaymentRateLimiter instance for the current request context.
        """
        try:
            # Initialize Redis client if not already done
            if not self.redis_client:
                self.redis_client = get_redis_client()
            
            # Create rate limiter instance for this request
            rate_limiter = AdvancedPaymentRateLimiter(db, self.redis_client)
            
            return rate_limiter
            
        except Exception as e:
            logger.error(f"Failed to initialize payment rate limiter: {e}")
            # Return a basic instance that will work without Redis
            return AdvancedPaymentRateLimiter(db, None)


# Global dependency instance
payment_rate_limiter_dependency = PaymentRateLimitDependency()


async def check_payment_intent_rate_limit(
    request: Request,
    amount: float,
    booking_id: int,
    rate_limiter: AdvancedPaymentRateLimiter = Depends(payment_rate_limiter_dependency),
    user: User = Depends(get_current_user)
) -> None:
    """
    Advanced rate limit check for payment intent creation.
    
    This function is designed to be used as a FastAPI dependency that runs
    BEFORE the payment intent endpoint logic.
    """
    try:
        # Extract payment method info from request body if available
        payment_method_info = await _extract_payment_method_info(request)
        
        # Perform comprehensive rate limit check
        allowed, violation_type, message = await rate_limiter.check_payment_rate_limit(
            request=request,
            user=user,
            amount=Decimal(str(amount)),
            payment_method_info=payment_method_info,
            appointment_id=booking_id
        )
        
        if not allowed:
            # Log the violation for audit purposes
            audit_logger.log_security_event(
                event_type="payment_rate_limit_blocked",
                user_id=user.id if user else None,
                details={
                    "violation_type": violation_type.value if violation_type else "unknown",
                    "message": message,
                    "amount": amount,
                    "booking_id": booking_id,
                    "ip_address": _get_client_ip(request)
                }
            )
            
            # Return appropriate HTTP error based on violation type
            status_code, error_detail = _get_error_response(violation_type, message)
            raise HTTPException(status_code=status_code, detail=error_detail)
            
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.error(f"Payment rate limit check failed: {e}")
        # Fail open - allow the request to proceed but log the error
        logger.warning("Payment rate limiting bypassed due to internal error")


async def check_payment_confirmation_rate_limit(
    request: Request,
    payment_intent_id: str,
    booking_id: int,
    rate_limiter: AdvancedPaymentRateLimiter = Depends(payment_rate_limiter_dependency),
    user: User = Depends(get_current_user)
) -> None:
    """
    Advanced rate limit check for payment confirmation.
    
    This is a lighter check focused on confirmation-specific patterns.
    """
    try:
        # For confirmation, we check with a nominal amount since the actual amount
        # was already validated during payment intent creation
        allowed, violation_type, message = await rate_limiter.check_payment_rate_limit(
            request=request,
            user=user,
            amount=Decimal("1.00"),  # Nominal amount for confirmation check
            payment_method_info={"type": "confirmation_check"},
            appointment_id=booking_id
        )
        
        if not allowed:
            # Log confirmation rate limit violation
            audit_logger.log_security_event(
                event_type="payment_confirmation_rate_limit_blocked",
                user_id=user.id if user else None,
                details={
                    "violation_type": violation_type.value if violation_type else "unknown",
                    "message": message,
                    "payment_intent_id": payment_intent_id,
                    "booking_id": booking_id,
                    "ip_address": _get_client_ip(request)
                }
            )
            
            status_code, error_detail = _get_error_response(violation_type, message)
            raise HTTPException(status_code=status_code, detail=error_detail)
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Payment confirmation rate limit check failed: {e}")
        # Fail open for confirmations since they're critical to complete


async def record_payment_result_dependency(
    request: Request,
    user: User,
    amount: float,
    status: str,
    failure_reason: Optional[str] = None,
    rate_limiter: AdvancedPaymentRateLimiter = Depends(payment_rate_limiter_dependency)
) -> None:
    """
    Record payment result for future rate limiting analysis.
    
    This should be called AFTER payment processing to update the rate limiter's
    understanding of payment patterns and failures.
    """
    try:
        await rate_limiter.record_payment_result(
            request=request,
            user=user,
            amount=Decimal(str(amount)),
            status=status,
            failure_reason=failure_reason
        )
    except Exception as e:
        logger.error(f"Failed to record payment result for rate limiting: {e}")
        # Don't fail the request if we can't record the result


async def get_rate_limit_status(
    request: Request,
    rate_limiter: AdvancedPaymentRateLimiter = Depends(payment_rate_limiter_dependency),
    user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get current rate limit status for the user/IP.
    
    This can be used for debugging or to show rate limit information to users.
    """
    try:
        return await rate_limiter.get_rate_limit_status(request, user)
    except Exception as e:
        logger.error(f"Failed to get rate limit status: {e}")
        return {"error": f"Unable to retrieve rate limit status: {str(e)}"}


# Helper functions

async def _extract_payment_method_info(request: Request) -> Dict[str, Any]:
    """
    Extract payment method information from the request for fingerprinting.
    
    This safely extracts payment method details without exposing sensitive data.
    """
    try:
        # For now, return basic info - in production you'd extract from request body
        # but be careful not to log sensitive payment details
        return {
            "type": "card",  # Default assumption
            "user_agent": request.headers.get("User-Agent", "unknown"),
            "source": "api_request"
        }
    except Exception:
        return {"type": "unknown"}


def _get_client_ip(request: Request) -> str:
    """Extract client IP address from request."""
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip
    
    if hasattr(request.client, 'host'):
        return request.client.host
    
    return "unknown"


def _get_error_response(
    violation_type: Optional[RateLimitViolationType],
    message: Optional[str]
) -> Tuple[int, str]:
    """
    Get appropriate HTTP status code and error message based on violation type.
    """
    if not violation_type:
        return status.HTTP_429_TOO_MANY_REQUESTS, "Rate limit exceeded"
    
    if violation_type == RateLimitViolationType.FREQUENCY_EXCEEDED:
        return status.HTTP_429_TOO_MANY_REQUESTS, message or "Too many payment requests"
    
    elif violation_type == RateLimitViolationType.AMOUNT_EXCEEDED:
        return status.HTTP_429_TOO_MANY_REQUESTS, message or "Payment amount limits exceeded"
    
    elif violation_type in [
        RateLimitViolationType.VELOCITY_ANOMALY,
        RateLimitViolationType.PATTERN_SUSPICIOUS,
        RateLimitViolationType.GEOGRAPHIC_ANOMALY
    ]:
        return status.HTTP_403_FORBIDDEN, message or "Payment blocked for security reasons"
    
    elif violation_type == RateLimitViolationType.PAYMENT_METHOD_ABUSE:
        return status.HTTP_429_TOO_MANY_REQUESTS, message or "Payment method usage limit exceeded"
    
    else:
        return status.HTTP_429_TOO_MANY_REQUESTS, message or "Rate limit exceeded"


# Alternative dependency functions for different endpoint types

def get_payment_rate_limiter(
    request: Request,
    db: Session = Depends(get_db)
) -> AdvancedPaymentRateLimiter:
    """
    Simple dependency to get a rate limiter instance.
    
    Use this when you need direct access to the rate limiter
    without automatic checking.
    """
    return payment_rate_limiter_dependency(request, db)


# Context manager for manual rate limiting
class PaymentRateLimitContext:
    """
    Context manager for manual payment rate limiting in service classes.
    
    Usage:
        async with PaymentRateLimitContext(request, user, amount, payment_info) as limiter:
            # Payment processing code here
            pass
    """
    
    def __init__(
        self,
        request: Request,
        db: Session,
        user: Optional[User],
        amount: Decimal,
        payment_method_info: Dict[str, Any],
        appointment_id: Optional[int] = None
    ):
        self.request = request
        self.db = db
        self.user = user
        self.amount = amount
        self.payment_method_info = payment_method_info
        self.appointment_id = appointment_id
        self.rate_limiter = None
        self.payment_allowed = False
    
    async def __aenter__(self):
        """Initialize rate limiter and perform checks."""
        self.rate_limiter = AdvancedPaymentRateLimiter(self.db)
        
        allowed, violation_type, message = await self.rate_limiter.check_payment_rate_limit(
            request=self.request,
            user=self.user,
            amount=self.amount,
            payment_method_info=self.payment_method_info,
            appointment_id=self.appointment_id
        )
        
        if not allowed:
            status_code, error_detail = _get_error_response(violation_type, message)
            raise HTTPException(status_code=status_code, detail=error_detail)
        
        self.payment_allowed = True
        return self.rate_limiter
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Record the payment result."""
        if self.rate_limiter and self.payment_allowed:
            # Determine payment status based on exception
            payment_status = "failed" if exc_type else "success"
            failure_reason = str(exc_val) if exc_type else None
            
            try:
                await self.rate_limiter.record_payment_result(
                    request=self.request,
                    user=self.user,
                    amount=self.amount,
                    status=payment_status,
                    failure_reason=failure_reason
                )
            except Exception as e:
                logger.error(f"Failed to record payment result in context manager: {e}")