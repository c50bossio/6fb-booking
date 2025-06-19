"""
Sentry configuration for 6FB Booking Platform
"""
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.starlette import StarletteIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
import os

def init_sentry():
    """Initialize Sentry SDK with FastAPI integration"""
    SENTRY_DSN = os.getenv("SENTRY_DSN", "https://663e8aa2453ba7a088f58d345afb0897@o4509526697508864.ingest.us.sentry.io/4509526819012608")
    
    if not SENTRY_DSN:
        print("Warning: SENTRY_DSN not set. Sentry monitoring disabled.")
        return
    
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        integrations=[
            FastApiIntegration(
                transaction_style="endpoint",
                failed_request_status_codes={403, range(500, 599)}
            ),
            StarletteIntegration(
                transaction_style="endpoint",
            ),
            SqlalchemyIntegration(),
        ],
        
        # Set traces_sample_rate to 1.0 to capture 100%
        # of transactions for performance monitoring.
        # We recommend adjusting this value in production.
        traces_sample_rate=float(os.getenv("SENTRY_TRACES_SAMPLE_RATE", "0.1")),
        
        # Set profiles_sample_rate to 1.0 to profile 100%
        # of sampled transactions.
        # We recommend adjusting this value in production.
        profiles_sample_rate=float(os.getenv("SENTRY_PROFILES_SAMPLE_RATE", "0.1")),
        
        # Enable sending default PII (Personal Identifiable Information)
        # This includes request headers and IP addresses
        send_default_pii=True,
        
        # Environment
        environment=os.getenv("ENVIRONMENT", "development"),
        
        # Release tracking
        release=os.getenv("SENTRY_RELEASE", "6fb-booking@1.0.0"),
        
        # Additional options
        attach_stacktrace=True,
        send_default_pii=False,  # Don't send personally identifiable information
        
        # Before send hook to filter sensitive data
        before_send=before_send_filter,
    )

def before_send_filter(event, hint):
    """Filter sensitive data before sending to Sentry"""
    # Filter out sensitive headers
    if "request" in event and "headers" in event["request"]:
        sensitive_headers = ["authorization", "cookie", "x-api-key"]
        for header in sensitive_headers:
            if header in event["request"]["headers"]:
                event["request"]["headers"][header] = "[Filtered]"
    
    # Filter out sensitive data from exception values
    if "exception" in event and "values" in event["exception"]:
        for exception in event["exception"]["values"]:
            if "stacktrace" in exception and "frames" in exception["stacktrace"]:
                for frame in exception["stacktrace"]["frames"]:
                    if "vars" in frame:
                        # Filter sensitive variable names
                        sensitive_vars = ["password", "token", "secret", "api_key", "stripe_key"]
                        for var in list(frame["vars"].keys()):
                            if any(sensitive in var.lower() for sensitive in sensitive_vars):
                                frame["vars"][var] = "[Filtered]"
    
    return event