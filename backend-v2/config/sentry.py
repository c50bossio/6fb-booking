"""
Comprehensive Sentry Error Tracking Configuration for BookedBarber V2
=====================================================================

This module provides comprehensive Sentry configuration with:
- Environment detection and performance monitoring
- Custom integrations for FastAPI, SQLAlchemy, Redis, and Celery
- Enhanced error filtering and custom fingerprinting
- User context and business logic tagging
- Release tracking and deployment monitoring
"""

import os
import logging
from typing import Dict, Any, Optional, Callable
from urllib.parse import urlparse

import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.starlette import StarletteIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
from sentry_sdk.integrations.redis import RedisIntegration
from sentry_sdk.integrations.celery import CeleryIntegration
from sentry_sdk.integrations.logging import LoggingIntegration


logger = logging.getLogger(__name__)


class SentryConfig:
    """Centralized Sentry configuration management."""
    
    def __init__(self):
        self.dsn = os.getenv("SENTRY_DSN")
        self.environment = os.getenv("SENTRY_ENVIRONMENT", os.getenv("ENVIRONMENT", "development"))
        self.debug = os.getenv("SENTRY_DEBUG", "false").lower() == "true"
        self.release = self._get_release_version()
        self.sample_rate = float(os.getenv("SENTRY_SAMPLE_RATE", "1.0"))
        self.traces_sample_rate = float(os.getenv("SENTRY_TRACES_SAMPLE_RATE", "0.1"))
        self.profiles_sample_rate = float(os.getenv("SENTRY_PROFILES_SAMPLE_RATE", "0.1"))
        self.max_breadcrumbs = int(os.getenv("SENTRY_MAX_BREADCRUMBS", "100"))
        self.attach_stacktrace = os.getenv("SENTRY_ATTACH_STACKTRACE", "true").lower() == "true"
        self.send_default_pii = os.getenv("SENTRY_SEND_DEFAULT_PII", "false").lower() == "true"
        self.include_local_variables = os.getenv("SENTRY_INCLUDE_LOCAL_VARIABLES", "true").lower() == "true"
        
    def _get_release_version(self) -> Optional[str]:
        """Get release version from various sources."""
        # Try environment variables first
        release = os.getenv("SENTRY_RELEASE")
        if release:
            return release
            
        # Try app version
        app_version = os.getenv("APP_VERSION")
        if app_version:
            return f"bookedbarber-v2@{app_version}"
            
        # Try git commit hash
        git_commit = os.getenv("GIT_COMMIT_SHA", os.getenv("VERCEL_GIT_COMMIT_SHA", os.getenv("RAILWAY_GIT_COMMIT_SHA")))
        if git_commit:
            return f"bookedbarber-v2@{git_commit[:7]}"
            
        return None
    
    def is_enabled(self) -> bool:
        """Check if Sentry should be enabled."""
        return bool(self.dsn) and self.dsn.strip() != ""


def before_send_filter(event: Dict[str, Any], hint: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Filter and modify events before sending to Sentry.
    
    This function:
    - Filters out known non-critical errors
    - Redacts sensitive information
    - Adds custom fingerprinting for error grouping
    - Enhances error context
    """
    
    # Get exception info
    exc_info = hint.get('exc_info')
    if exc_info:
        exc_type, exc_value, exc_traceback = exc_info
        exc_name = exc_type.__name__ if exc_type else "Unknown"
        exc_msg = str(exc_value) if exc_value else ""
        
        # Filter out known non-critical errors
        if _should_ignore_error(exc_name, exc_msg):
            return None
            
        # Add custom fingerprinting for better error grouping
        event['fingerprint'] = _get_custom_fingerprint(exc_name, exc_msg, event)
    
    # Redact sensitive information
    event = _redact_sensitive_data(event)
    
    # Add business context
    event = _add_business_context(event)
    
    return event


def before_send_transaction_filter(event: Dict[str, Any], hint: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Filter performance transactions before sending to Sentry.
    
    This helps reduce noise and focus on important performance metrics.
    """
    
    # Get transaction name
    transaction_name = event.get('transaction', '')
    
    # Filter out health check and static asset requests
    if transaction_name in ['/health', '/docs', '/redoc', '/openapi.json']:
        return None
        
    # Filter out very fast transactions (< 100ms) for non-critical endpoints
    duration = event.get('contexts', {}).get('trace', {}).get('duration')
    if duration and duration < 0.1 and '/api/v1/health' in transaction_name:
        return None
    
    return event


def _should_ignore_error(exc_name: str, exc_msg: str) -> bool:
    """Determine if an error should be ignored."""
    
    # Ignore common client-side errors
    ignored_errors = {
        'ConnectionError': [
            'Connection aborted',
            'Remote end closed connection',
            'Connection reset by peer'
        ],
        'TimeoutError': [
            'Request timeout',
            'Read timeout'
        ],
        'ValueError': [
            'Invalid JSON',
            'Invalid UUID'
        ],
        'HTTPException': [
            '404',  # Not found errors
            '401',  # Unauthorized (expected for auth endpoints)
            '403'   # Forbidden (expected for authorization)
        ]
    }
    
    if exc_name in ignored_errors:
        for ignore_pattern in ignored_errors[exc_name]:
            if ignore_pattern.lower() in exc_msg.lower():
                return True
    
    return False


def _get_custom_fingerprint(exc_name: str, exc_msg: str, event: Dict[str, Any]) -> list:
    """Generate custom fingerprint for better error grouping."""
    
    # Default fingerprint
    fingerprint = ['{{ default }}']
    
    # Custom fingerprinting for database errors
    if 'sqlalchemy' in exc_msg.lower() or 'database' in exc_msg.lower():
        fingerprint = ['database-error', exc_name]
        
    # Custom fingerprinting for payment errors
    elif 'stripe' in exc_msg.lower() or 'payment' in exc_msg.lower():
        fingerprint = ['payment-error', exc_name]
        
    # Custom fingerprinting for integration errors
    elif any(service in exc_msg.lower() for service in ['google', 'sendgrid', 'twilio']):
        service = next((s for s in ['google', 'sendgrid', 'twilio'] if s in exc_msg.lower()), 'unknown')
        fingerprint = ['integration-error', service, exc_name]
    
    # Custom fingerprinting for booking errors
    elif 'booking' in exc_msg.lower() or 'appointment' in exc_msg.lower():
        fingerprint = ['booking-error', exc_name]
    
    return fingerprint


def _redact_sensitive_data(event: Dict[str, Any]) -> Dict[str, Any]:
    """Redact sensitive information from Sentry events."""
    
    # Fields to redact completely
    sensitive_fields = {
        'password', 'secret', 'token', 'key', 'auth', 'credential',
        'ssn', 'social_security', 'credit_card', 'card_number',
        'cvv', 'cvc', 'pin', 'account_number'
    }
    
    # Redact from request data
    if 'request' in event and 'data' in event['request']:
        event['request']['data'] = _redact_dict(event['request']['data'], sensitive_fields)
    
    # Redact from extra context
    if 'extra' in event:
        event['extra'] = _redact_dict(event['extra'], sensitive_fields)
    
    # Redact from user context
    if 'user' in event:
        for field in ['email', 'phone']:
            if field in event['user']:
                value = event['user'][field]
                if isinstance(value, str) and len(value) > 4:
                    event['user'][field] = value[:2] + '*' * (len(value) - 4) + value[-2:]
    
    return event


def _redact_dict(data: Any, sensitive_fields: set) -> Any:
    """Recursively redact sensitive fields from dictionary."""
    
    if isinstance(data, dict):
        redacted = {}
        for key, value in data.items():
            if any(sensitive in key.lower() for sensitive in sensitive_fields):
                redacted[key] = '[REDACTED]'
            else:
                redacted[key] = _redact_dict(value, sensitive_fields)
        return redacted
    elif isinstance(data, list):
        return [_redact_dict(item, sensitive_fields) for item in data]
    else:
        return data


def _add_business_context(event: Dict[str, Any]) -> Dict[str, Any]:
    """Add business-specific context to Sentry events."""
    
    # Add custom tags for better filtering
    if 'tags' not in event:
        event['tags'] = {}
    
    # Add application context
    event['tags']['application'] = 'bookedbarber-v2'
    event['tags']['component'] = 'backend'
    
    # Add environment-specific tags
    environment = os.getenv("ENVIRONMENT", "development")
    event['tags']['environment'] = environment
    
    # Add deployment context
    if os.getenv("RAILWAY_ENVIRONMENT"):
        event['tags']['deployment_platform'] = 'railway'
    elif os.getenv("VERCEL_ENV"):
        event['tags']['deployment_platform'] = 'vercel'
    elif os.getenv("RENDER_SERVICE_ID"):
        event['tags']['deployment_platform'] = 'render'
    
    return event


def configure_sentry() -> bool:
    """
    Configure and initialize Sentry with comprehensive settings.
    
    Returns:
        bool: True if Sentry was successfully configured, False otherwise
    """
    
    config = SentryConfig()
    
    # Skip configuration if disabled
    if not config.is_enabled():
        logger.info("Sentry is disabled (no DSN provided)")
        return False
    
    try:
        # Configure logging integration with appropriate levels
        logging_integration = LoggingIntegration(
            level=logging.INFO,        # Capture info and above as breadcrumbs
            event_level=logging.ERROR  # Send errors as events
        )
        
        # Configure FastAPI integration
        fastapi_integration = FastApiIntegration(
            auto_enable=True,
            transaction_style="endpoint"
        )
        
        # Configure SQLAlchemy integration
        sqlalchemy_integration = SqlalchemyIntegration()
        
        # Configure Redis integration
        redis_integration = RedisIntegration()
        
        # Configure Celery integration
        celery_integration = CeleryIntegration(
            monitor_beat_tasks=True,
            propagate_traces=True
        )
        
        # Get environment-specific configuration
        environment_config = _get_environment_config(config.environment)
        
        # Initialize Sentry
        sentry_sdk.init(
            dsn=config.dsn,
            environment=config.environment,
            release=config.release,
            debug=config.debug,
            
            # Sampling rates
            sample_rate=environment_config.get('sample_rate', config.sample_rate),
            traces_sample_rate=environment_config.get('traces_sample_rate', config.traces_sample_rate),
            profiles_sample_rate=environment_config.get('profiles_sample_rate', config.profiles_sample_rate),
            
            # Event processing
            before_send=before_send_filter,
            before_send_transaction=before_send_transaction_filter,
            
            # Breadcrumbs and context
            max_breadcrumbs=config.max_breadcrumbs,
            attach_stacktrace=config.attach_stacktrace,
            send_default_pii=config.send_default_pii,
            include_local_variables=config.include_local_variables,
            
            # Integrations
            integrations=[
                logging_integration,
                fastapi_integration,
                StarletteIntegration(),
                sqlalchemy_integration,
                redis_integration,
                celery_integration,
            ],
            
            # Additional options
            auto_enabling_integrations=False,  # Only use explicit integrations
            default_integrations=False,       # Disable default integrations
        )
        
        # Set global tags
        sentry_sdk.set_tag("service", "bookedbarber-backend")
        sentry_sdk.set_tag("version", config.release or "unknown")
        
        # Set initial context
        sentry_sdk.set_context("application", {
            "name": "BookedBarber V2",
            "component": "backend",
            "framework": "FastAPI",
            "python_version": os.getenv("PYTHON_VERSION", "unknown")
        })
        
        logger.info(f"Sentry initialized successfully for environment: {config.environment}")
        
        # Test Sentry configuration if in development
        if config.environment == "development" and config.debug:
            sentry_sdk.capture_message("Sentry configuration test", level="info")
            logger.info("Sentry test message sent")
        
        return True
        
    except Exception as e:
        logger.error(f"Failed to initialize Sentry: {e}")
        return False


def _get_environment_config(environment: str) -> Dict[str, Any]:
    """Get environment-specific Sentry configuration."""
    
    configs = {
        "development": {
            "sample_rate": 1.0,
            "traces_sample_rate": 1.0,
            "profiles_sample_rate": 1.0,
        },
        "staging": {
            "sample_rate": 1.0,
            "traces_sample_rate": 0.5,
            "profiles_sample_rate": 0.5,
        },
        "production": {
            "sample_rate": 0.8,  # Sample 80% of errors
            "traces_sample_rate": 0.1,  # Sample 10% of transactions
            "profiles_sample_rate": 0.05,  # Sample 5% of profiles
        }
    }
    
    return configs.get(environment, configs["development"])


def add_user_context(user_id: Optional[int] = None, user_email: Optional[str] = None, 
                    user_role: Optional[str] = None, location_id: Optional[int] = None) -> None:
    """Add user context to Sentry scope."""
    
    sentry_sdk.set_user({
        "id": user_id,
        "email": user_email,
        "role": user_role,
        "location_id": location_id
    })


def add_business_context(appointment_id: Optional[int] = None, payment_id: Optional[int] = None,
                        service_type: Optional[str] = None, integration_type: Optional[str] = None) -> None:
    """Add business-specific context to Sentry scope."""
    
    context = {}
    
    if appointment_id:
        context["appointment_id"] = appointment_id
        
    if payment_id:
        context["payment_id"] = payment_id
        
    if service_type:
        context["service_type"] = service_type
        
    if integration_type:
        context["integration_type"] = integration_type
    
    if context:
        sentry_sdk.set_context("business", context)


def capture_booking_error(error: Exception, appointment_id: Optional[int] = None, 
                         user_id: Optional[int] = None, location_id: Optional[int] = None) -> str:
    """Capture booking-related errors with enhanced context."""
    
    with sentry_sdk.push_scope() as scope:
        scope.set_tag("error_category", "booking")
        
        if appointment_id:
            scope.set_tag("appointment_id", appointment_id)
            
        if user_id:
            scope.set_tag("user_id", user_id)
            
        if location_id:
            scope.set_tag("location_id", location_id)
            
        scope.set_context("booking_error", {
            "appointment_id": appointment_id,
            "user_id": user_id,
            "location_id": location_id,
            "error_type": type(error).__name__
        })
        
        return sentry_sdk.capture_exception(error)


def capture_payment_error(error: Exception, payment_id: Optional[str] = None,
                         amount: Optional[float] = None, currency: Optional[str] = None,
                         stripe_error_code: Optional[str] = None) -> str:
    """Capture payment-related errors with enhanced context."""
    
    with sentry_sdk.push_scope() as scope:
        scope.set_tag("error_category", "payment")
        
        if payment_id:
            scope.set_tag("payment_id", payment_id)
            
        if stripe_error_code:
            scope.set_tag("stripe_error_code", stripe_error_code)
            
        scope.set_context("payment_error", {
            "payment_id": payment_id,
            "amount": amount,
            "currency": currency,
            "stripe_error_code": stripe_error_code,
            "error_type": type(error).__name__
        })
        
        return sentry_sdk.capture_exception(error)


def capture_integration_error(error: Exception, integration_type: str,
                             operation: Optional[str] = None, external_id: Optional[str] = None) -> str:
    """Capture integration-related errors with enhanced context."""
    
    with sentry_sdk.push_scope() as scope:
        scope.set_tag("error_category", "integration")
        scope.set_tag("integration_type", integration_type)
        
        if operation:
            scope.set_tag("integration_operation", operation)
            
        scope.set_context("integration_error", {
            "integration_type": integration_type,
            "operation": operation,
            "external_id": external_id,
            "error_type": type(error).__name__
        })
        
        return sentry_sdk.capture_exception(error)


def monitor_performance(transaction_name: str) -> Callable:
    """
    Decorator to monitor performance of specific operations.
    
    Usage:
        @monitor_performance("booking_creation")
        def create_booking():
            # ... booking logic
    """
    
    def decorator(func):
        def wrapper(*args, **kwargs):
            with sentry_sdk.start_transaction(op="function", name=transaction_name):
                return func(*args, **kwargs)
        return wrapper
    return decorator


# Health check function for monitoring
def sentry_health_check() -> Dict[str, Any]:
    """Check Sentry configuration health."""
    
    config = SentryConfig()
    
    return {
        "enabled": config.is_enabled(),
        "dsn_configured": bool(config.dsn),
        "environment": config.environment,
        "release": config.release,
        "sample_rate": config.sample_rate,
        "traces_sample_rate": config.traces_sample_rate
    }


# Export main configuration function
__all__ = [
    'configure_sentry',
    'add_user_context',
    'add_business_context', 
    'capture_booking_error',
    'capture_payment_error',
    'capture_integration_error',
    'monitor_performance',
    'sentry_health_check'
]