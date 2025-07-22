"""
Staging configuration utilities for BookedBarber V2.
Provides staging-specific settings and environment isolation.
"""

import os
from typing import Dict, Any, Optional

def get_staging_config() -> Dict[str, Any]:
    """Get staging-specific configuration"""
    return {
        "environment": "staging",
        "stripe_webhook_secret": os.getenv("STRIPE_WEBHOOK_SECRET_STAGING", "whsec_staging_secret"),
        "twilio_webhook_secret": os.getenv("TWILIO_WEBHOOK_SECRET_STAGING", "staging_twilio_secret"),
        "base_url": os.getenv("STAGING_BASE_URL", "http://localhost:8001"),
        "debug_mode": True,
        "enhanced_logging": True,
        "safe_mode": True,  # Prevents affecting production data
        "webhook_timeout": 30,  # seconds
        "max_retries": 3
    }

def get_staging_webhook_urls() -> Dict[str, str]:
    """Get staging webhook URLs for different services"""
    base_url = get_staging_config()["base_url"]
    
    return {
        "stripe": f"{base_url}/staging/webhooks/stripe",
        "sms": f"{base_url}/staging/webhooks/sms", 
        "test": f"{base_url}/staging/webhooks/test",
        "validate": f"{base_url}/staging/webhooks/validate"
    }

def is_staging_environment() -> bool:
    """Check if running in staging environment"""
    return os.getenv("ENVIRONMENT", "development") == "staging"

def get_staging_database_url() -> str:
    """Get staging database URL"""
    return os.getenv("STAGING_DATABASE_URL", "sqlite:///./staging_6fb_booking.db")

def get_staging_redis_url() -> str:
    """Get staging Redis URL"""
    return os.getenv("STAGING_REDIS_URL", "redis://localhost:6379/1")
