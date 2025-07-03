from pydantic_settings import BaseSettings
from pydantic import ConfigDict, validator
import os
import logging

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


# Instantiate settings
settings = Settings()

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