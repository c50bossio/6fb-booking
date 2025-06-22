"""
Sentry configuration for 6FB Booking Platform
"""

import os
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.logging import LoggingIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
from sentry_sdk.integrations.redis import RedisIntegration
import logging

logger = logging.getLogger(__name__)


def init_sentry():
    """Initialize Sentry error tracking"""
    # Get Sentry DSN from environment
    sentry_dsn = os.getenv("SENTRY_DSN")
    environment = os.getenv("ENVIRONMENT", "development")
    
    if not sentry_dsn:
        logger.info("Sentry DSN not configured, skipping Sentry initialization")
        return
    
    try:
        # Configure logging integration
        logging_integration = LoggingIntegration(
            level=logging.INFO,        # Capture info and above as breadcrumbs
            event_level=logging.ERROR   # Send errors as events
        )
        
        # Initialize Sentry
        sentry_sdk.init(
            dsn=sentry_dsn,
            environment=environment,
            integrations=[
                FastApiIntegration(
                    transaction_style="endpoint",
                    failed_request_status_codes={400, 401, 403, 404, 422, 500},
                ),
                logging_integration,
                SqlalchemyIntegration(),
                RedisIntegration(),
            ],
            # Set traces_sample_rate to capture performance data
            traces_sample_rate=0.1 if environment == "production" else 1.0,
            # Profile sample rate for performance monitoring
            profiles_sample_rate=0.1 if environment == "production" else 1.0,
            # Sample rate for error events
            sample_rate=1.0,
            # Release tracking
            release=os.getenv("RELEASE_VERSION", "unknown"),
            # Additional options
            attach_stacktrace=True,
            send_default_pii=False,  # Don't send personally identifiable information
            before_send=before_send_filter,
            # Performance monitoring
            enable_tracing=True,
            # Set user context
            before_send_transaction=before_send_transaction_filter,
        )
        
        logger.info(f"Sentry initialized successfully for {environment} environment")
        
    except Exception as e:
        logger.error(f"Failed to initialize Sentry: {str(e)}")


def before_send_filter(event, hint):
    """Filter events before sending to Sentry"""
    # Don't send events in development unless explicitly enabled
    if os.getenv("ENVIRONMENT", "development") == "development":
        if not os.getenv("SENTRY_FORCE_ENABLE", "").lower() == "true":
            return None
    
    # Filter out sensitive data from request data
    if "request" in event and "data" in event["request"]:
        sensitive_fields = ["password", "token", "secret", "api_key", "access_token", 
                          "stripe_secret", "jwt_secret", "webhook_secret"]
        request_data = event["request"]["data"]
        
        if isinstance(request_data, dict):
            for field in sensitive_fields:
                if field in request_data:
                    request_data[field] = "[FILTERED]"
    
    # Add custom tags
    event.setdefault("tags", {})
    event["tags"]["component"] = "backend"
    event["tags"]["service"] = "6fb-booking"
    
    return event


def before_send_transaction_filter(event, hint):
    """Filter transaction events before sending to Sentry"""
    # Skip transactions for health checks and static files
    if "transaction" in event:
        transaction_name = event["transaction"]
        if any(skip in transaction_name.lower() for skip in ["/health", "/favicon", "/static"]):
            return None
    
    return event


def capture_payment_error(error: Exception, payment_context: dict):
    """Capture payment-related errors with additional context"""
    with sentry_sdk.push_scope() as scope:
        scope.set_tag("error_type", "payment")
        scope.set_context("payment", {
            "amount": payment_context.get("amount"),
            "payment_method": payment_context.get("payment_method"),
            "barber_id": payment_context.get("barber_id"),
            "appointment_id": payment_context.get("appointment_id"),
        })
        sentry_sdk.capture_exception(error)


def capture_booking_error(error: Exception, booking_context: dict):
    """Capture booking-related errors with additional context"""
    with sentry_sdk.push_scope() as scope:
        scope.set_tag("error_type", "booking")
        scope.set_context("booking", {
            "service_id": booking_context.get("service_id"),
            "barber_id": booking_context.get("barber_id"),
            "client_id": booking_context.get("client_id"),
            "requested_time": booking_context.get("requested_time"),
        })
        sentry_sdk.capture_exception(error)