"""Sentry configuration and utilities for BookedBarber V2."""
import os
import logging
from typing import Dict, Any, Optional

# Import production Sentry config
try:
    import sys
    sys.path.append('/Users/bossio/6fb-booking/monitoring/sentry')
    from production_sentry_config import (
        initialize_sentry,
        capture_business_exception,
        capture_security_incident,
        SentryMetrics,
        production_sentry
    )
    SENTRY_AVAILABLE = True
except ImportError:
    SENTRY_AVAILABLE = False
    logging.warning("Production Sentry config not available, using stub implementation")

logger = logging.getLogger(__name__)

def configure_sentry():
    """Configure Sentry monitoring with production-grade settings."""
    if not SENTRY_AVAILABLE:
        logger.warning("Sentry not available - using stub implementation")
        return False
    
    try:
        initialize_sentry()
        logger.info("Production Sentry configuration loaded successfully")
        return True
    except Exception as e:
        logger.error(f"Failed to configure Sentry: {e}")
        return False

def add_user_context(user_data: Optional[Dict[str, Any]] = None):
    """Add user context to Sentry with enhanced business data."""
    if not SENTRY_AVAILABLE or not user_data:
        return
    
    try:
        # Use the global sentry_set_user function from production config
        if hasattr(__builtins__, 'sentry_set_user'):
            __builtins__.sentry_set_user(
                user_id=str(user_data.get('id', '')),
                email=user_data.get('email'),
                username=user_data.get('username'),
                role=user_data.get('role'),
                subscription_tier=user_data.get('subscription_tier', 'free'),
                business_name=user_data.get('business_name'),
                location_count=user_data.get('location_count', 0)
            )
    except Exception as e:
        logger.error(f"Failed to add user context to Sentry: {e}")

def add_business_context(business_data: Optional[Dict[str, Any]] = None):
    """Add business context to Sentry for better error tracking."""
    if not SENTRY_AVAILABLE or not business_data:
        return
    
    try:
        # Add business-specific breadcrumb
        if hasattr(__builtins__, 'sentry_add_breadcrumb'):
            __builtins__.sentry_add_breadcrumb(
                category="business_operation",
                message=business_data.get('operation', 'Unknown operation'),
                level="info",
                appointment_id=business_data.get('appointment_id'),
                barber_id=business_data.get('barber_id'),
                client_id=business_data.get('client_id'),
                payment_amount=business_data.get('payment_amount'),
                location_id=business_data.get('location_id'),
                service_type=business_data.get('service_type')
            )
    except Exception as e:
        logger.error(f"Failed to add business context to Sentry: {e}")

def capture_booking_error(exception: Exception, booking_context: Dict[str, Any]):
    """Capture booking-specific errors with enhanced context."""
    if not SENTRY_AVAILABLE:
        logger.error(f"Booking error (Sentry unavailable): {exception}")
        return
    
    try:
        capture_business_exception(exception, {
            "business_area": "booking",
            "appointment_id": booking_context.get('appointment_id'),
            "barber_id": booking_context.get('barber_id'),
            "client_id": booking_context.get('client_id'),
            "service_id": booking_context.get('service_id'),
            "booking_status": booking_context.get('status'),
            "error_category": "booking_failure"
        })
    except Exception as e:
        logger.error(f"Failed to capture booking error in Sentry: {e}")

def capture_payment_error(exception: Exception, payment_context: Dict[str, Any]):
    """Capture payment-specific errors with financial context."""
    if not SENTRY_AVAILABLE:
        logger.error(f"Payment error (Sentry unavailable): {exception}")
        return
    
    try:
        # Filter sensitive payment data
        safe_context = {
            "business_area": "payments",
            "payment_id": payment_context.get('payment_id'),
            "amount_cents": payment_context.get('amount_cents'),
            "currency": payment_context.get('currency', 'USD'),
            "payment_method_type": payment_context.get('payment_method_type'),
            "payment_status": payment_context.get('status'),
            "error_category": "payment_failure",
            "stripe_error_code": payment_context.get('stripe_error_code'),
            "user_id": payment_context.get('user_id')
        }
        
        capture_business_exception(exception, safe_context)
    except Exception as e:
        logger.error(f"Failed to capture payment error in Sentry: {e}")

def capture_security_event(event_type: str, details: Dict[str, Any]):
    """Capture security events and potential threats."""
    if not SENTRY_AVAILABLE:
        logger.warning(f"Security event (Sentry unavailable): {event_type}")
        return
    
    try:
        # Filter sensitive security data
        safe_details = {
            "user_id": details.get('user_id'),
            "ip_address": details.get('ip_address', 'unknown'),
            "user_agent": details.get('user_agent', 'unknown')[:200],  # Limit length
            "endpoint": details.get('endpoint'),
            "method": details.get('method'),
            "timestamp": details.get('timestamp'),
            "severity": details.get('severity', 'medium')
        }
        
        capture_security_incident(event_type, safe_details)
    except Exception as e:
        logger.error(f"Failed to capture security event in Sentry: {e}")

def track_business_metric(metric_name: str, value: float, tags: Optional[Dict[str, str]] = None):
    """Track business metrics through Sentry."""
    if not SENTRY_AVAILABLE:
        return
    
    try:
        SentryMetrics.capture_business_metric(metric_name, value, tags or {})
    except Exception as e:
        logger.error(f"Failed to track business metric in Sentry: {e}")

def track_performance_metric(operation: str, duration_ms: float, success: bool = True):
    """Track performance metrics through Sentry."""
    if not SENTRY_AVAILABLE:
        return
    
    try:
        SentryMetrics.capture_performance_metric(operation, duration_ms, success)
    except Exception as e:
        logger.error(f"Failed to track performance metric in Sentry: {e}")

def track_user_action(action: str, user_id: str, metadata: Optional[Dict[str, Any]] = None):
    """Track user actions for analytics and debugging."""
    if not SENTRY_AVAILABLE:
        return
    
    try:
        SentryMetrics.capture_user_action(action, user_id, metadata or {})
    except Exception as e:
        logger.error(f"Failed to track user action in Sentry: {e}")