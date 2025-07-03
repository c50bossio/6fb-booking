from pydantic_settings import BaseSettings
from pydantic import ConfigDict, validator
import os
import logging
from utils.secret_management import get_secret

# Configure logging for security warnings
logger = logging.getLogger(__name__)

class Settings(BaseSettings):
    """
    Secure configuration settings for 6FB Booking API
    
    SECURITY NOTICE: All sensitive credentials must be provided via environment variables.
    This file contains NO hardcoded secrets or API keys.
    """
    model_config = ConfigDict(env_file=".env", extra="ignore")
    
    # Database
    database_url: str = "sqlite:///./6fb_booking.db"
    
    # App settings
    app_name: str = "6FB Booking API"
    debug: bool = True
    
    # Security & Authentication - CRITICAL: These must be set via environment variables
    secret_key: str = ""  # REQUIRED: Set SECRET_KEY environment variable
    jwt_secret_key: str = ""  # REQUIRED: Set JWT_SECRET_KEY environment variable 
    jwt_algorithm: str = "HS256"
    jwt_expiration_delta: str = "30"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    bcrypt_rounds: int = 12
    
    # CORS and URLs
    cors_origins: str = '["http://localhost:3000", "http://localhost:8000"]'
    frontend_url: str = "http://localhost:3000"
    backend_url: str = "http://localhost:8000"
    
    # Stripe settings - CRITICAL: Set via environment variables only
    stripe_secret_key: str = ""  # REQUIRED: Set STRIPE_SECRET_KEY environment variable
    stripe_publishable_key: str = ""  # REQUIRED: Set STRIPE_PUBLISHABLE_KEY environment variable
    stripe_webhook_secret: str = ""  # REQUIRED: Set STRIPE_WEBHOOK_SECRET environment variable
    
    # Google Calendar OAuth2 settings
    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = "http://localhost:8000/api/calendar/callback"
    google_calendar_scopes: list = [
        "https://www.googleapis.com/auth/calendar",
        "https://www.googleapis.com/auth/calendar.events"
    ]
    
    # Booking Configuration
    booking_min_lead_time_minutes: int = 15  # Minimum time before appointment can be booked
    booking_max_advance_days: int = 30       # Maximum days in advance bookings allowed
    booking_same_day_cutoff: str = "17:00"   # No same-day bookings after this time
    
    # Business Information
    business_name: str = "BookedBarber"
    business_phone: str = "(555) 123-4567"
    business_email: str = "info@bookedbarber.com"
    business_address: str = "123 Main St, City, State 12345"
    
    # Optional settings
    environment: str = "development"
    log_level: str = "INFO"
    allowed_origins: str = "http://localhost:3000"
    
    # Email Configuration (SendGrid) - CRITICAL: Set via environment variables only
    sendgrid_api_key: str = ""  # REQUIRED: Set SENDGRID_API_KEY environment variable
    sendgrid_from_email: str = "support@bookedbarber.com"  # Update this to your verified sender
    sendgrid_from_name: str = "BookedBarber"
    
    # SMS Configuration (Twilio) - CRITICAL: Set via environment variables only  
    twilio_account_sid: str = ""  # REQUIRED: Set TWILIO_ACCOUNT_SID environment variable
    twilio_auth_token: str = ""  # REQUIRED: Set TWILIO_AUTH_TOKEN environment variable
    twilio_phone_number: str = ""  # REQUIRED: Set TWILIO_PHONE_NUMBER environment variable
    
    # Redis Configuration
    redis_url: str = "redis://localhost:6379/0"
    
    # Google Analytics 4 (GA4) Configuration
    ga4_measurement_id: str = ""  # GA4 Measurement ID (G-XXXXXXXXXX)
    ga4_api_secret: str = ""  # GA4 Measurement Protocol API Secret
    ga4_measurement_protocol_url: str = "https://www.google-analytics.com/mp/collect"
    ga4_measurement_protocol_debug_url: str = "https://www.google-analytics.com/debug/mp/collect"
    ga4_debug_mode: bool = True
    ga4_collect_geo_data: bool = True
    ga4_collect_advertising_id: bool = False
    ga4_allow_google_signals: bool = True
    ga4_allow_ad_personalization: bool = False
    ga4_anonymize_ip: bool = True
    ga4_respect_dnt: bool = True
    ga4_consent_mode: bool = True
    ga4_cookie_domain: str = "auto"
    ga4_cookie_expires: int = 7776000  # 90 days
    ga4_cookie_prefix: str = "_ga4_"
    ga4_enhanced_measurement: bool = True
    ga4_track_scrolls: bool = True
    ga4_track_outbound_clicks: bool = True
    ga4_track_site_search: bool = True
    ga4_track_video_engagement: bool = True
    ga4_track_file_downloads: bool = True
    ga4_custom_dimensions: str = ""  # JSON string of custom dimensions mapping
    ga4_ecommerce_tracking: bool = True
    ga4_conversion_tracking: bool = True
    ga4_enhanced_ecommerce: bool = True
    ga4_data_retention_months: int = 26
    ga4_reset_on_new_activity: bool = True
    ga4_sampling_rate: float = 1.0
    ga4_event_timeout: int = 2000
    ga4_page_load_timeout: int = 5000
    ga4_realtime_reporting: bool = True
    ga4_realtime_threshold: int = 10
    ga4_cross_domain_tracking: bool = False
    ga4_cross_domain_linker: list = []
    ga4_test_mode: bool = True
    ga4_validate_events: bool = True
    ga4_log_events: bool = True
    ga4_batch_events: bool = True
    ga4_batch_size: int = 10
    ga4_batch_timeout: int = 1000
    
    # Google Tag Manager (GTM) Configuration
    gtm_container_id: str = ""  # GTM Container ID (GTM-XXXXXXX)
    gtm_container_public_id: str = ""  # GTM Container Public ID
    gtm_server_container_url: str = ""  # Server-side container URL
    gtm_server_container_api_key: str = ""  # Server-side container API key
    gtm_measurement_protocol_url: str = "https://www.googletagmanager.com/gtm.js"
    gtm_server_side_url: str = ""  # Server-side GTM URL
    gtm_debug_mode: bool = True  # Enable debug mode for development
    gtm_preview_mode: bool = False  # Enable preview mode for testing
    gtm_consent_mode: bool = True  # Enable consent mode for GDPR/CCPA
    gtm_anonymize_ip: bool = True  # Anonymize IP addresses for privacy
    gtm_respect_dnt: bool = True  # Respect Do Not Track headers
    gtm_enhanced_ecommerce: bool = True  # Enable enhanced e-commerce tracking
    gtm_ecommerce_tracking: bool = True  # Enable e-commerce tracking
    gtm_conversion_tracking: bool = True  # Enable conversion tracking
    gtm_cross_domain_tracking: bool = False  # Enable cross-domain tracking
    gtm_event_timeout: int = 2000  # Event timeout in milliseconds
    gtm_page_load_timeout: int = 5000  # Page load timeout in milliseconds
    gtm_batch_events: bool = True  # Batch events for better performance
    gtm_batch_size: int = 10  # Number of events to batch
    gtm_batch_timeout: int = 1000  # Batch timeout in milliseconds
    gtm_custom_dimensions: str = ""  # JSON string of custom dimensions mapping
    gtm_custom_metrics: str = ""  # JSON string of custom metrics mapping
    gtm_secure_cookies: bool = True  # Use secure cookies
    gtm_same_site_cookies: str = "Lax"  # SameSite cookie attribute
    gtm_cookie_domain: str = "auto"  # Cookie domain (auto for current domain)
    gtm_cookie_expires: int = 7776000  # Cookie expiration (90 days)
    gtm_cookie_prefix: str = "_gtm_"  # Cookie prefix
    gtm_datalayer_name: str = "dataLayer"  # DataLayer variable name
    gtm_datalayer_limit: int = 150  # Maximum dataLayer entries
    gtm_datalayer_timeout: int = 5000  # DataLayer timeout in milliseconds
    gtm_ga4_integration: bool = True  # Enable GA4 integration via GTM
    gtm_ga4_measurement_id: str = ""  # GA4 Measurement ID (if using GTM for GA4)
    gtm_ga4_config_command: bool = True  # Use gtag config command for GA4
    gtm_server_side_tagging: bool = False  # Enable server-side tagging
    gtm_server_side_endpoint: str = ""  # Server-side endpoint URL
    gtm_server_side_api_key: str = ""  # Server-side API key
    gtm_server_side_container_id: str = ""  # Server-side container ID
    gtm_conversion_linker: bool = True  # Enable conversion linker
    gtm_conversion_linker_domains: list = []  # Domains for conversion linker
    gtm_test_mode: bool = True  # Enable test mode for development
    gtm_validate_events: bool = True  # Validate events before sending
    gtm_log_events: bool = True  # Log events to console/logs
    gtm_enable_monitoring: bool = True  # Enable GTM monitoring
    gtm_async_loading: bool = True  # Load GTM asynchronously
    gtm_defer_loading: bool = False  # Defer GTM loading
    gtm_lazy_loading: bool = False  # Enable lazy loading for GTM
    gtm_error_handling: bool = True  # Enable error handling
    gtm_error_reporting: bool = True  # Enable error reporting
    gtm_fallback_tracking: bool = True  # Enable fallback tracking
    
    # Notification Settings
    appointment_reminder_hours: list[int] = [24, 2]  # Send reminders 24h and 2h before
    notification_retry_attempts: int = 3
    notification_retry_delay_seconds: int = 60
    enable_email_notifications: bool = True
    enable_sms_notifications: bool = True
    
    @validator('secret_key')
    def validate_secret_key(cls, v):
        """Ensure secret key is set and secure"""
        if not v or v in ["your-secret-key-here", "test-secret-key", ""]:
            if os.getenv('ENVIRONMENT', 'development') == 'production':
                raise ValueError("SECRET_KEY must be set to a secure value in production")
            logger.warning("Using default secret key - NOT SECURE for production")
        return v
    
    @validator('sendgrid_api_key')
    def validate_sendgrid_key(cls, v):
        """Validate SendGrid API key format and security"""
        if v and not v.startswith('SG.'):
            raise ValueError("Invalid SendGrid API key format")
        return v
    
    @validator('twilio_account_sid') 
    def validate_twilio_sid(cls, v):
        """Validate Twilio Account SID format"""
        if v and not v.startswith('AC'):
            raise ValueError("Invalid Twilio Account SID format")
        return v
    
    @validator('stripe_secret_key')
    def validate_stripe_key(cls, v):
        """Validate Stripe secret key format"""
        if v and not (v.startswith('sk_test_') or v.startswith('sk_live_')):
            raise ValueError("Invalid Stripe secret key format")
        return v
    
    def is_production(self) -> bool:
        """Check if running in production environment"""
        return self.environment.lower() == 'production'
    
    def validate_required_credentials(self) -> list[str]:
        """Validate that all required credentials are set. Returns list of missing credentials."""
        missing = []
        
        if not self.secret_key:
            missing.append("SECRET_KEY")
        if not self.jwt_secret_key:
            missing.append("JWT_SECRET_KEY")
            
        # Only require these if features are enabled
        if self.enable_email_notifications and not self.sendgrid_api_key:
            missing.append("SENDGRID_API_KEY (required for email notifications)")
        if self.enable_sms_notifications and not self.twilio_account_sid:
            missing.append("TWILIO_ACCOUNT_SID (required for SMS notifications)")
        if self.enable_sms_notifications and not self.twilio_auth_token:
            missing.append("TWILIO_AUTH_TOKEN (required for SMS notifications)")
            
        return missing
    
    def load_secrets_securely(self):
        """Load secrets using secure secret management."""
        try:
            # Load critical secrets with fallback
            if not self.secret_key:
                self.secret_key = get_secret('SECRET_KEY', required=False) or ""
            if not self.jwt_secret_key:
                self.jwt_secret_key = get_secret('JWT_SECRET_KEY', required=False) or ""
            if not self.stripe_secret_key:
                self.stripe_secret_key = get_secret('STRIPE_SECRET_KEY', required=False) or ""
            if not self.stripe_publishable_key:
                self.stripe_publishable_key = get_secret('STRIPE_PUBLISHABLE_KEY', required=False) or ""
            if not self.stripe_webhook_secret:
                self.stripe_webhook_secret = get_secret('STRIPE_WEBHOOK_SECRET', required=False) or ""
                
            logger.info("Secrets loaded securely from environment variables")
            
        except Exception as e:
            logger.error(f"Error loading secrets: {e}")
            if self.is_production():
                raise ValueError("Failed to load required secrets in production environment")


# Instantiate settings and load secrets
settings = Settings()
settings.load_secrets_securely()

# Startup validation for critical security settings
def validate_startup_security():
    """Validate security settings at application startup"""
    missing_credentials = settings.validate_required_credentials()
    
    if missing_credentials:
        error_msg = f"SECURITY ERROR: Missing required credentials: {', '.join(missing_credentials)}"
        logger.error(error_msg)
        
        if settings.is_production():
            raise ValueError(f"Production startup failed: {error_msg}")
        else:
            logger.warning(f"Development mode: {error_msg}")
            logger.warning("Application will start but some features may not work")
    
    # Additional security checks
    if settings.is_production():
        if settings.debug:
            logger.warning("DEBUG mode is enabled in production - this is a security risk")
        
        if "localhost" in settings.allowed_origins:
            logger.warning("Localhost is allowed in CORS origins in production")
            
        if settings.database_url.startswith("sqlite"):
            logger.warning("Using SQLite in production - consider PostgreSQL for better performance")

# Run startup validation
validate_startup_security()