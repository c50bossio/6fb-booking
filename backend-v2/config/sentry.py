"""
Complete Sentry Configuration for BookedBarber V2
================================================

This module provides comprehensive Sentry integration for:
- Error tracking and performance monitoring
- Business-specific error categorization
- Database and Celery task monitoring
- Custom breadcrumbs and context
"""

import os
import logging
from typing import Dict, Any, Optional
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
from sentry_sdk.integrations.redis import RedisIntegration
from sentry_sdk.integrations.celery import CeleryIntegration
from sentry_sdk.integrations.logging import LoggingIntegration

logger = logging.getLogger(__name__)

def configure_sentry() -> bool:
    """
    Configure Sentry monitoring with comprehensive integrations.
    
    Returns:
        bool: True if Sentry was successfully configured, False otherwise
    """
    
    # Get Sentry configuration from environment
    sentry_dsn = os.getenv('SENTRY_DSN', '').strip()
    sentry_environment = os.getenv('SENTRY_ENVIRONMENT', 'development')
    sentry_release = os.getenv('SENTRY_RELEASE', get_app_version())
    
    # Check if Sentry is configured
    if not sentry_dsn:
        logger.info("🔕 Sentry DSN not configured - error tracking disabled")
        return False
    
    try:
        # Configure logging integration
        logging_integration = LoggingIntegration(
            level=logging.INFO,  # Capture info and above as breadcrumbs
            event_level=logging.ERROR  # Send error and above as events
        )
        
        # Configure all integrations
        integrations = [
            FastApiIntegration(auto_session_tracking=True),
            SqlalchemyIntegration(),
            RedisIntegration(),
            CeleryIntegration(monitor_beat_tasks=True),
            logging_integration
        ]
        
        # Initialize Sentry
        sentry_sdk.init(
            dsn=sentry_dsn,
            environment=sentry_environment,
            release=sentry_release,
            integrations=integrations,
            
            # Sampling configuration
            sample_rate=float(os.getenv('SENTRY_SAMPLE_RATE', '1.0')),
            traces_sample_rate=float(os.getenv('SENTRY_TRACES_SAMPLE_RATE', '0.1')),
            profiles_sample_rate=float(os.getenv('SENTRY_PROFILES_SAMPLE_RATE', '0.1')),
            
            # Debug and privacy settings
            debug=os.getenv('SENTRY_DEBUG', 'false').lower() == 'true',
            send_default_pii=os.getenv('SENTRY_SEND_DEFAULT_PII', 'false').lower() == 'true',
            
            # Custom configuration
            attach_stacktrace=True,
            auto_session_tracking=True,
            
            # Event processors
            before_send=before_send_filter,
            before_send_transaction=before_send_transaction_filter,
        )
        
        # Set global tags
        sentry_sdk.set_tag("application", "bookedbarber-v2")
        sentry_sdk.set_tag("component", "backend")
        
        # Add initial context
        sentry_sdk.set_context("application", {
            "name": "BookedBarber V2",
            "version": sentry_release,
            "environment": sentry_environment,
            "component": "backend"
        })
        
        logger.info(f"✅ Sentry configured successfully - Environment: {sentry_environment}, Release: {sentry_release}")
        return True
        
    except Exception as e:
        logger.error(f"❌ Failed to configure Sentry: {e}")
        return False

def get_app_version() -> str:
    """Get application version from environment or git."""
    # Try environment variable first
    version = os.getenv('APP_VERSION', '')
    if version:
        return version
    
    # Try to get from git
    try:
        import subprocess
        result = subprocess.run(
            ['git', 'rev-parse', '--short', 'HEAD'],
            capture_output=True,
            text=True,
            timeout=5
        )
        if result.returncode == 0:
            return f"git-{result.stdout.strip()}"
    except Exception:
        pass
    
    return "unknown"

def before_send_filter(event: Dict[str, Any], hint: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Filter and enhance events before sending to Sentry.
    
    Args:
        event: The Sentry event
        hint: Additional context about the event
        
    Returns:
        Modified event or None to drop the event
    """
    
    # Don't send certain test/development errors
    if event.get('environment') == 'development':
        # Filter out common development noise
        exception = hint.get('exc_info', [None, None, None])[1]
        if exception:
            # Skip Redis connection errors in development
            if 'redis' in str(exception).lower() and 'connection' in str(exception).lower():
                return None
            
            # Skip test-related errors
            if any(keyword in str(exception).lower() for keyword in ['test_', 'pytest', 'mock']):
                return None
    
    # Enhance event with business context
    if 'request' in event.get('contexts', {}):
        request_data = event['contexts']['request']
        
        # Add business context based on URL patterns
        url = request_data.get('url', '')
        if '/api/v2/appointments' in url:
            event.setdefault('tags', {})['business_area'] = 'appointments'
        elif '/api/v2/payments' in url:
            event.setdefault('tags', {})['business_area'] = 'payments'
        elif '/api/v2/auth' in url:
            event.setdefault('tags', {})['business_area'] = 'authentication'
        elif '/api/v2/analytics' in url:
            event.setdefault('tags', {})['business_area'] = 'analytics'
    
    # Add severity based on error type
    exception = hint.get('exc_info', [None, None, None])[1]
    if exception:
        error_type = type(exception).__name__
        if error_type in ['StripeError', 'PaymentError']:
            event.setdefault('tags', {})['severity'] = 'critical'
        elif error_type in ['ValidationError', 'HTTPException']:
            event.setdefault('tags', {})['severity'] = 'low'
        else:
            event.setdefault('tags', {})['severity'] = 'medium'
    
    return event

def before_send_transaction_filter(event: Dict[str, Any], hint: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Filter performance transactions before sending to Sentry.
    
    Args:
        event: The Sentry transaction event
        hint: Additional context
        
    Returns:
        Modified event or None to drop the transaction
    """
    
    # Don't track health check transactions (too noisy)
    if event.get('transaction', '').endswith('/health'):
        return None
    
    # Don't track static file requests
    if any(path in event.get('transaction', '') for path in ['/static/', '/assets/', '/favicon.ico']):
        return None
    
    return event

def add_user_context(user_data: Dict[str, Any]) -> None:
    """
    Add user context to Sentry scope.
    
    Args:
        user_data: Dictionary containing user information
    """
    sentry_sdk.set_user({
        "id": user_data.get("id"),
        "email": user_data.get("email"),
        "username": user_data.get("name", user_data.get("email", "unknown")),
        "role": user_data.get("role"),
        "barber_id": user_data.get("barber_id"),
        "organization_id": user_data.get("organization_id")
    })
    
    # Add business-specific tags
    sentry_sdk.set_tag("user_role", user_data.get("role", "unknown"))
    if user_data.get("organization_id"):
        sentry_sdk.set_tag("organization", str(user_data["organization_id"]))

def add_business_context(business_data: Dict[str, Any]) -> None:
    """
    Add business context to Sentry scope.
    
    Args:
        business_data: Dictionary containing business operation information
    """
    sentry_sdk.set_context("business_operation", {
        "operation_type": business_data.get("operation_type"),
        "resource_type": business_data.get("resource_type"),
        "resource_id": business_data.get("resource_id"),
        "location_id": business_data.get("location_id"),
        "barber_id": business_data.get("barber_id"),
        "client_id": business_data.get("client_id"),
        "amount": business_data.get("amount"),
        "currency": business_data.get("currency")
    })

def capture_booking_error(exception: Exception, booking_data: Optional[Dict[str, Any]] = None) -> None:
    """
    Capture booking-related errors with enhanced context.
    
    Args:
        exception: The exception to capture
        booking_data: Optional booking context data
    """
    with sentry_sdk.push_scope() as scope:
        scope.set_tag("error_category", "booking")
        scope.set_level("error")
        
        if booking_data:
            scope.set_context("booking_error", {
                "appointment_id": booking_data.get("appointment_id"),
                "client_id": booking_data.get("client_id"),
                "barber_id": booking_data.get("barber_id"),
                "service_type": booking_data.get("service_type"),
                "scheduled_time": booking_data.get("scheduled_time"),
                "duration_minutes": booking_data.get("duration_minutes"),
                "error_stage": booking_data.get("error_stage", "unknown")
            })
        
        sentry_sdk.capture_exception(exception)

def capture_payment_error(exception: Exception, payment_data: Optional[Dict[str, Any]] = None) -> None:
    """
    Capture payment-related errors with enhanced context.
    
    Args:
        exception: The exception to capture
        payment_data: Optional payment context data
    """
    with sentry_sdk.push_scope() as scope:
        scope.set_tag("error_category", "payment")
        scope.set_level("error")
        
        if payment_data:
            # Mask sensitive data
            safe_payment_data = {
                "payment_intent_id": payment_data.get("payment_intent_id"),
                "amount_cents": payment_data.get("amount_cents"),
                "currency": payment_data.get("currency"),
                "client_id": payment_data.get("client_id"),
                "barber_id": payment_data.get("barber_id"),
                "payment_method_type": payment_data.get("payment_method_type"),
                "error_stage": payment_data.get("error_stage", "unknown"),
                # Never include: card numbers, CVV, full payment method details
            }
            
            scope.set_context("payment_error", safe_payment_data)
        
        sentry_sdk.capture_exception(exception)

def capture_integration_error(exception: Exception, integration_data: Optional[Dict[str, Any]] = None) -> None:
    """
    Capture integration-related errors (Stripe, SendGrid, Twilio, etc.).
    
    Args:
        exception: The exception to capture
        integration_data: Optional integration context data
    """
    with sentry_sdk.push_scope() as scope:
        scope.set_tag("error_category", "integration")
        scope.set_level("warning")  # Usually less critical than business logic errors
        
        if integration_data:
            scope.set_context("integration_error", {
                "service_name": integration_data.get("service_name"),
                "operation": integration_data.get("operation"),
                "endpoint": integration_data.get("endpoint"),
                "response_code": integration_data.get("response_code"),
                "request_id": integration_data.get("request_id"),
                "error_code": integration_data.get("error_code")
            })
        
        sentry_sdk.capture_exception(exception)

def add_performance_breadcrumb(operation: str, duration_ms: int, **extra_data) -> None:
    """
    Add performance-related breadcrumb.
    
    Args:
        operation: The operation being performed
        duration_ms: Duration in milliseconds
        **extra_data: Additional data to include
    """
    level = "info"
    if duration_ms > 5000:  # > 5 seconds
        level = "warning"
    elif duration_ms > 10000:  # > 10 seconds
        level = "error"
    
    sentry_sdk.add_breadcrumb(
        message=f"Performance: {operation}",
        category="performance",
        level=level,
        data={
            "operation": operation,
            "duration_ms": duration_ms,
            **extra_data
        }
    )

def add_business_breadcrumb(action: str, resource_type: str, resource_id: str, **extra_data) -> None:
    """
    Add business logic breadcrumb.
    
    Args:
        action: The business action (create, update, delete, etc.)
        resource_type: Type of resource (appointment, payment, user, etc.)
        resource_id: ID of the resource
        **extra_data: Additional business context
    """
    sentry_sdk.add_breadcrumb(
        message=f"Business: {action} {resource_type}",
        category="business",
        level="info",
        data={
            "action": action,
            "resource_type": resource_type,
            "resource_id": resource_id,
            **extra_data
        }
    )

# Export main functions
__all__ = [
    'configure_sentry',
    'add_user_context',
    'add_business_context', 
    'capture_booking_error',
    'capture_payment_error',
    'capture_integration_error',
    'add_performance_breadcrumb',
    'add_business_breadcrumb'
]