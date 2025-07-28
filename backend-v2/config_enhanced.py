from pydantic_settings import BaseSettings
from typing import List, Optional

class Settings(BaseSettings):
    """
    Enhanced configuration for 6FB Booking Platform v2
    Supports comprehensive environment variable configuration for all deployment scenarios
    """
    
    # =============================================================================
    # CORE APPLICATION SETTINGS
    # =============================================================================
    app_name: str = "6FB Booking API v2"
    app_version: str = "2.0.0"
    environment: str = "development"
    debug: bool = True
    log_level: str = "INFO"
    
    # =============================================================================
    # DATABASE CONFIGURATION
    # =============================================================================
    database_url: str = "sqlite:///./6fb_booking.db"
    
    # Database pool settings (for PostgreSQL)
    db_pool_size: int = 20
    db_max_overflow: int = 0
    db_pool_timeout: int = 30
    db_pool_recycle: int = 3600
    
    # =============================================================================
    # SECURITY & AUTHENTICATION
    # =============================================================================
    secret_key: str = "your-secret-key-here-generate-with-openssl-rand-hex-32"
    
    # JWT Settings
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    
    # Password security
    bcrypt_rounds: int = 12
    
    # =============================================================================
    # STRIPE PAYMENT CONFIGURATION
    # =============================================================================
    # CRITICAL: All Stripe credentials must be set via environment variables
    # Never use hardcoded test keys in production or committed code
    stripe_secret_key: str = ""  # REQUIRED: Set STRIPE_SECRET_KEY environment variable
    stripe_publishable_key: str = ""  # REQUIRED: Set STRIPE_PUBLISHABLE_KEY environment variable  
    stripe_webhook_secret: str = ""  # REQUIRED: Set STRIPE_WEBHOOK_SECRET environment variable
    stripe_connect_client_id: Optional[str] = None
    
    # =============================================================================
    # GOOGLE CALENDAR INTEGRATION
    # =============================================================================
    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = "http://localhost:8000/api/calendar/callback"
    google_calendar_scopes: List[str] = [
        "https://www.googleapis.com/auth/calendar",
        "https://www.googleapis.com/auth/calendar.events"
    ]
    
    # =============================================================================
    # EMAIL CONFIGURATION
    # =============================================================================
    # SendGrid configuration
    sendgrid_api_key: str = ""
    sendgrid_from_email: str = "noreply@6fb-booking.com"
    sendgrid_from_name: str = "6FB Booking"
    
    # SMTP configuration (alternative to SendGrid)
    smtp_server: Optional[str] = None
    smtp_port: int = 587
    smtp_username: Optional[str] = None
    smtp_password: Optional[str] = None
    smtp_use_tls: bool = True
    
    # =============================================================================
    # SMS CONFIGURATION
    # =============================================================================
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_phone_number: str = ""
    
    # =============================================================================
    # REDIS CONFIGURATION
    # =============================================================================
    redis_url: str = "redis://localhost:6379/0"
    redis_max_connections: int = 20
    redis_socket_timeout: int = 5
    
    # =============================================================================
    # NOTIFICATION SETTINGS
    # =============================================================================
    appointment_reminder_hours: List[int] = [24, 2]
    notification_retry_attempts: int = 3
    notification_retry_delay_seconds: int = 60
    
    # =============================================================================
    # BOOKING CONFIGURATION
    # =============================================================================
    booking_min_lead_time_minutes: int = 15
    booking_max_advance_days: int = 30
    booking_same_day_cutoff: str = "17:00"
    default_timezone: str = "America/New_York"
    
    # =============================================================================
    # CORS & FRONTEND CONFIGURATION
    # =============================================================================
    allowed_origins: str = "http://localhost:3000,http://localhost:3001"
    frontend_url: Optional[str] = None
    
    # =============================================================================
    # MONITORING & ERROR TRACKING
    # =============================================================================
    sentry_dsn: Optional[str] = None
    sentry_environment: str = "development"
    
    # =============================================================================
    # RATE LIMITING
    # =============================================================================
    rate_limit_per_minute: int = 100
    auth_rate_limit_per_minute: int = 10
    
    # =============================================================================
    # FEATURE FLAGS
    # =============================================================================
    enable_google_calendar: bool = False
    enable_sms_notifications: bool = False
    enable_email_notifications: bool = False
    enable_analytics: bool = True
    enable_webhooks: bool = True
    
    # =============================================================================
    # DEPLOYMENT SPECIFIC
    # =============================================================================
    railway_public_domain: Optional[str] = None
    render_service_id: Optional[str] = None
    vercel_url: Optional[str] = None
    port: int = 8000
    
    # =============================================================================
    # DEVELOPMENT TOOLS
    # =============================================================================
    dev_reload: bool = True
    dev_log_queries: bool = False
    docs_url: str = "/docs"
    redoc_url: str = "/redoc"
    
    # =============================================================================
    # TESTING CONFIGURATION
    # =============================================================================
    test_database_url: str = "sqlite:///./test.db"
    
    # =============================================================================
    # PRODUCTION SECURITY
    # =============================================================================
    secure_ssl_redirect: bool = False
    secure_hsts_seconds: int = 31536000
    secure_content_type_nosniff: bool = True
    secure_browser_xss_filter: bool = True
    secure_cookie_httponly: bool = True
    secure_cookie_secure: bool = False
    secure_cookie_samesite: str = "Lax"
    
    # =============================================================================
    # BACKUP CONFIGURATION
    # =============================================================================
    backup_enabled: bool = False
    backup_schedule: str = "0 2 * * *"  # Daily at 2 AM
    backup_retention_days: int = 30
    
    # =============================================================================
    # PAYMENT LIMITS & SETTINGS
    # =============================================================================
    max_payment_amount: int = 100000  # $1000.00 in cents
    min_payout_amount: int = 1000     # $10.00 in cents
    payout_hold_days: int = 2
    
    # =============================================================================
    # WEBHOOK CONFIGURATION
    # =============================================================================
    webhook_secret: Optional[str] = None
    
    # =============================================================================
    # LOGGING CONFIGURATION
    # =============================================================================
    log_format: str = "text"  # text or json
    log_file: Optional[str] = None
    
    # =============================================================================
    # HEALTH CHECK CONFIGURATION
    # =============================================================================
    health_check_path: str = "/health"
    health_check_timeout: int = 30
    
    model_config = ConfigDict(
        env_file=".env",
        case_sensitive=False
    )
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        
        # Post-initialization processing
        self._process_cors_origins()
        self._setup_environment_defaults()
        
    def _process_cors_origins(self):
        """Convert comma-separated CORS origins to list"""
        if isinstance(self.allowed_origins, str):
            self.allowed_origins_list = [
                origin.strip() 
                for origin in self.allowed_origins.split(",") 
                if origin.strip()
            ]
        else:
            self.allowed_origins_list = self.allowed_origins
            
    def _setup_environment_defaults(self):
        """Set environment-specific defaults"""
        if self.environment == "production":
            # Production defaults
            self.debug = False
            self.dev_reload = False
            self.dev_log_queries = False
            self.log_format = "json"
            self.secure_ssl_redirect = True
            self.secure_cookie_secure = True
            self.secure_cookie_httponly = True
            
            # Disable docs in production by default
            if self.docs_url == "/docs":
                self.docs_url = None
            if self.redoc_url == "/redoc":
                self.redoc_url = None
                
        elif self.environment == "staging":
            # Staging defaults
            self.debug = False
            self.dev_reload = False
            self.log_format = "json"
            
    @property
    def is_production(self) -> bool:
        """Check if running in production environment"""
        return self.environment == "production"
        
    @property
    def is_development(self) -> bool:
        """Check if running in development environment"""
        return self.environment == "development"
        
    @property
    def is_staging(self) -> bool:
        """Check if running in staging environment"""
        return self.environment == "staging"
        
    @property
    def database_is_sqlite(self) -> bool:
        """Check if using SQLite database"""
        return self.database_url.startswith("sqlite")
        
    @property
    def database_is_postgresql(self) -> bool:
        """Check if using PostgreSQL database"""
        return self.database_url.startswith("postgresql")
        
    @property
    def email_configured(self) -> bool:
        """Check if email is properly configured"""
        return bool(self.sendgrid_api_key or (self.smtp_server and self.smtp_username))
        
    @property
    def sms_configured(self) -> bool:
        """Check if SMS is properly configured"""
        return bool(self.twilio_account_sid and self.twilio_auth_token)
        
    @property
    def google_calendar_configured(self) -> bool:
        """Check if Google Calendar is properly configured"""
        return bool(self.google_client_id and self.google_client_secret)
        
    @property
    def stripe_configured(self) -> bool:
        """Check if Stripe is properly configured"""
        return bool(
            self.stripe_secret_key and 
            self.stripe_secret_key.startswith(('sk_test_', 'sk_live_')) and
            self.stripe_publishable_key and
            self.stripe_webhook_secret
        )
        
    def get_cors_origins(self) -> List[str]:
        """Get processed CORS origins as list"""
        return getattr(self, 'allowed_origins_list', [self.allowed_origins])
    
    def validate_production_security(self) -> List[str]:
        """Validate production security settings. Returns list of issues."""
        issues = []
        
        if self.secret_key == "your-secret-key-here-generate-with-openssl-rand-hex-32":
            issues.append("SECRET_KEY must be set to a secure value")
        
        if not self.stripe_configured:
            issues.append("Stripe credentials not properly configured")
            
        if not self.email_configured and self.enable_email_notifications:
            issues.append("Email notifications enabled but not configured")
            
        if not self.sms_configured and self.enable_sms_notifications:
            issues.append("SMS notifications enabled but not configured")
            
        if self.debug:
            issues.append("DEBUG mode should be disabled in production")
            
        if "localhost" in self.allowed_origins:
            issues.append("Localhost should not be in allowed origins for production")
            
        return issues
)
# Create settings instance
settings = Settings()

# Enhanced validation for critical settings
def validate_enhanced_security():
    """Enhanced security validation at startup"""
    if settings.is_production:
        issues = settings.validate_production_security()
        
        if issues:
            error_msg = f"PRODUCTION SECURITY ISSUES: {'; '.join(issues)}"
            raise ValueError(error_msg)
        
        print("✓ Production security validation passed")
    
    elif settings.is_staging:
        print("⚠ Running in staging mode - ensure production settings are ready")
    
    else:
        missing_configs = []
        if not settings.stripe_configured:
            missing_configs.append("Stripe")
        if not settings.email_configured:
            missing_configs.append("Email")
        if not settings.sms_configured:
            missing_configs.append("SMS")
            
        if missing_configs:
            print(f"ℹ Development mode: {', '.join(missing_configs)} not configured")

# Run enhanced validation
validate_enhanced_security()