"""
Payment Rate Limits Router

This router provides endpoints for monitoring and managing payment rate limits.
It includes status checking, violation history, and administrative controls.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta

from database import get_db
from dependencies import get_current_user, get_current_admin_user
from dependencies.payment_rate_limiter import (
    get_payment_rate_limiter, 
    get_rate_limit_status
)
from services.advanced_payment_rate_limiter import AdvancedPaymentRateLimiter
from models import User
from utils.rate_limit import default_rate_limit
from utils.logging_config import get_audit_logger

router = APIRouter(
    prefix="/payment-rate-limits",
    tags=["payment-rate-limits"]
)

audit_logger = get_audit_logger()


@router.get("/status")
@default_rate_limit
async def get_payment_rate_limit_status(
    request: Request,
    current_user: Optional[User] = Depends(get_current_user),
    rate_limit_status: Dict[str, Any] = Depends(get_rate_limit_status)
) -> Dict[str, Any]:
    """
    Get current payment rate limit status for the authenticated user.
    
    Returns information about current usage, limits, and remaining capacity.
    """
    try:
        # Log the status check for audit purposes
        audit_logger.log_security_event(
            event_type="payment_rate_limit_status_check",
            user_id=current_user.id if current_user else None,
            details={
                "ip_address": request.client.host if hasattr(request, 'client') and request.client else "unknown",
                "environment": rate_limit_status.get("environment", "unknown")
            }
        )
        
        return {
            "success": True,
            "data": rate_limit_status,
            "message": "Rate limit status retrieved successfully"
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve rate limit status: {str(e)}"
        )


@router.get("/violations")
@default_rate_limit
async def get_payment_rate_limit_violations(
    request: Request,
    hours: int = 24,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get recent payment rate limit violations for the current user.
    
    This helps users understand why their payments might be blocked.
    """
    if hours > 168:  # Limit to 1 week
        hours = 168
    
    try:
        # For now, return placeholder data - in production you'd query
        # a violations table or Redis logs
        violations = []
        
        # This would typically query stored violation data
        # violations = get_user_violations(current_user.id, hours)
        
        return {
            "success": True,
            "data": {
                "user_id": current_user.id,
                "violations": violations,
                "period_hours": hours,
                "total_violations": len(violations)
            },
            "message": f"Rate limit violations for last {hours} hours retrieved"
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve violations: {str(e)}"
        )


@router.post("/test-limits")
@default_rate_limit
async def test_payment_rate_limits(
    request: Request,
    test_amount: float = 100.0,
    current_user: User = Depends(get_current_user),
    rate_limiter: AdvancedPaymentRateLimiter = Depends(get_payment_rate_limiter)
) -> Dict[str, Any]:
    """
    Test payment rate limits with a simulated payment (development/staging only).
    
    This endpoint allows testing rate limiting logic without actual payments.
    """
    # Only allow in development/staging environments
    config = rate_limiter.config
    if config.environment == 'production':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Rate limit testing not available in production"
        )
    
    try:
        from decimal import Decimal
        
        # Simulate payment method info
        payment_method_info = {
            "type": "test_card",
            "last4": "4242",
            "brand": "visa",
            "exp_month": "12",
            "exp_year": "2025"
        }
        
        # Test rate limit check
        allowed, violation_type, message = await rate_limiter.check_payment_rate_limit(
            request=request,
            user=current_user,
            amount=Decimal(str(test_amount)),
            payment_method_info=payment_method_info,
            appointment_id=None
        )
        
        # Log the test
        audit_logger.log_security_event(
            event_type="payment_rate_limit_test",
            user_id=current_user.id,
            details={
                "test_amount": test_amount,
                "allowed": allowed,
                "violation_type": violation_type.value if violation_type else None,
                "message": message,
                "environment": config.environment
            }
        )
        
        return {
            "success": True,
            "data": {
                "test_amount": test_amount,
                "allowed": allowed,
                "violation_type": violation_type.value if violation_type else None,
                "message": message,
                "environment": config.environment,
                "limits": {
                    "requests_per_minute": rate_limiter.rate_limits.requests_per_minute,
                    "requests_per_hour": rate_limiter.rate_limits.requests_per_hour,
                    "max_amount_per_hour": float(rate_limiter.rate_limits.max_amount_per_hour),
                    "max_amount_per_day": float(rate_limiter.rate_limits.max_amount_per_day)
                }
            },
            "message": "Rate limit test completed"
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Rate limit test failed: {str(e)}"
        )


@router.get("/admin/overview")
@default_rate_limit
async def get_admin_rate_limit_overview(
    request: Request,
    hours: int = 24,
    admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get payment rate limit overview for administrators.
    
    Shows system-wide rate limiting statistics and violations.
    """
    try:
        # This would typically aggregate rate limiting data across all users
        overview_data = {
            "period_hours": hours,
            "total_users_with_violations": 0,
            "total_violations": 0,
            "violation_types": {
                "frequency_exceeded": 0,
                "amount_exceeded": 0,
                "velocity_anomaly": 0,
                "pattern_suspicious": 0,
                "payment_method_abuse": 0,
                "geographic_anomaly": 0
            },
            "blocked_payments": 0,
            "allowed_payments": 0,
            "top_violating_ips": [],
            "rate_limit_effectiveness": {
                "blocked_fraudulent_attempts": 0,
                "false_positives": 0,
                "system_performance_impact": "low"
            }
        }
        
        # Log admin access
        audit_logger.log_admin_event(
            event_type="admin_rate_limit_overview_access",
            admin_user_id=str(admin_user.id),
            target_user_id=None,
            action="view_rate_limit_overview",
            details={
                "period_hours": hours,
                "admin_role": admin_user.role
            }
        )
        
        return {
            "success": True,
            "data": overview_data,
            "message": "Rate limit overview retrieved successfully"
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve rate limit overview: {str(e)}"
        )


@router.post("/admin/clear-violations/{user_id}")
@default_rate_limit
async def clear_user_rate_limit_violations(
    request: Request,
    user_id: int,
    reason: str,
    admin_user: User = Depends(get_current_admin_user),
    rate_limiter: AdvancedPaymentRateLimiter = Depends(get_payment_rate_limiter),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Clear rate limit violations for a specific user (admin only).
    
    This allows administrators to reset rate limiting for legitimate users
    who may have been falsely flagged.
    """
    try:
        # Verify user exists
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Clear violations from rate limiter
        # This would typically clear Redis keys and violation records
        cleared_count = 0  # Placeholder for actual clearing logic
        
        # Log admin action
        audit_logger.log_admin_event(
            event_type="admin_clear_rate_limit_violations",
            admin_user_id=str(admin_user.id),
            target_user_id=str(user_id),
            action="clear_rate_limit_violations",
            details={
                "reason": reason,
                "violations_cleared": cleared_count,
                "target_user_email": user.email
            }
        )
        
        return {
            "success": True,
            "data": {
                "user_id": user_id,
                "violations_cleared": cleared_count,
                "reason": reason,
                "cleared_at": datetime.utcnow().isoformat(),
                "cleared_by": admin_user.id
            },
            "message": f"Rate limit violations cleared for user {user_id}"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to clear rate limit violations: {str(e)}"
        )


@router.get("/admin/configuration")
@default_rate_limit
async def get_rate_limit_configuration(
    request: Request,
    admin_user: User = Depends(get_current_admin_user),
    rate_limiter: AdvancedPaymentRateLimiter = Depends(get_payment_rate_limiter)
) -> Dict[str, Any]:
    """
    Get current payment rate limit configuration (admin only).
    
    Shows the active rate limiting rules and thresholds.
    """
    try:
        config_data = {
            "environment": rate_limiter.config.environment,
            "rate_limits": {
                "requests_per_minute": rate_limiter.rate_limits.requests_per_minute,
                "requests_per_hour": rate_limiter.rate_limits.requests_per_hour,
                "requests_per_day": rate_limiter.rate_limits.requests_per_day,
                "max_amount_per_hour": float(rate_limiter.rate_limits.max_amount_per_hour),
                "max_amount_per_day": float(rate_limiter.rate_limits.max_amount_per_day),
                "max_transactions_per_card": rate_limiter.rate_limits.max_transactions_per_card,
                "cooldown_after_failure": rate_limiter.rate_limits.cooldown_after_failure,
                "suspicious_pattern_threshold": rate_limiter.rate_limits.suspicious_pattern_threshold
            },
            "redis_available": rate_limiter.redis_client is not None,
            "memory_fallback_active": rate_limiter.redis_client is None
        }
        
        # Log admin access
        audit_logger.log_admin_event(
            event_type="admin_rate_limit_config_access",
            admin_user_id=str(admin_user.id),
            target_user_id=None,
            action="view_rate_limit_config",
            details={
                "environment": rate_limiter.config.environment,
                "admin_role": admin_user.role
            }
        )
        
        return {
            "success": True,
            "data": config_data,
            "message": "Rate limit configuration retrieved successfully"
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve rate limit configuration: {str(e)}"
        )


@router.get("/health")
async def get_rate_limiting_health(
    request: Request
) -> Dict[str, Any]:
    """
    Get health status of the payment rate limiting system.
    
    This endpoint does not require authentication and can be used for monitoring.
    """
    try:
        from services.redis_service import get_redis_client
        
        redis_client = get_redis_client()
        redis_healthy = False
        
        if redis_client:
            try:
                redis_client.ping()
                redis_healthy = True
            except Exception:
                pass
        
        health_status = {
            "service": "payment_rate_limiting",
            "status": "healthy" if redis_healthy else "degraded",
            "redis_available": redis_healthy,
            "fallback_mode": not redis_healthy,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        return {
            "success": True,
            "data": health_status,
            "message": "Rate limiting health check completed"
        }
        
    except Exception as e:
        return {
            "success": False,
            "data": {
                "service": "payment_rate_limiting",
                "status": "unhealthy",
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            },
            "message": "Rate limiting health check failed"
        }