"""Sentry configuration and utilities."""
import logging

logger = logging.getLogger(__name__)

def configure_sentry():
    """Configure Sentry monitoring - stub implementation."""
    logger.info("Sentry configuration called - stub implementation")
    return False  # Return False to indicate Sentry is not configured

def add_user_context(user_data=None):
    """Add user context to Sentry - stub implementation."""
    logger.debug("Sentry user context would be added here")
    pass

def add_business_context(business_data=None):
    """Add business context to Sentry - stub implementation."""
    logger.debug("Sentry business context would be added here")
    pass