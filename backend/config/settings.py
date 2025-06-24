"""
Production-ready settings configuration for 6FB Booking Platform
Enhanced with comprehensive validation, environment-specific configurations,
and production deployment requirements.
"""

from pydantic_settings import BaseSettings
from pydantic import Field, validator, SecretStr
from typing import List, Optional, Union, Literal
import os
import secrets
import logging
from functools import lru_cache
from urllib.parse import urlparse
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
load_dotenv(".env.auth")  # Load auth-specific environment variables

logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    """
    Production-ready settings with comprehensive validation
    and environment-specific configurations
    """

    # =============================================================================
    # CORE SECURITY SETTINGS
    # =============================================================================
    SECRET_KEY: SecretStr = Field(
        default_factory=lambda: os.getenv("SECRET_KEY", ""),
        description="Main application secret key - must be cryptographically secure",
    )
    JWT_SECRET_KEY: SecretStr = Field(
        default_factory=lambda: os.getenv("JWT_SECRET_KEY", ""),
        description="JWT secret key - must be different from SECRET_KEY",
    )
    JWT_ALGORITHM: str = Field(default="HS256", description="JWT signing algorithm")
    ALGORITHM: str = Field(default="HS256", description="Alias for JWT_ALGORITHM")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(
        default=1440, description="JWT token expiration in minutes"
    )

    # =============================================================================
    # DATABASE CONFIGURATION
    # =============================================================================
    DATABASE_URL: str = Field(
        default_factory=lambda: os.getenv("DATABASE_URL", "sqlite:///./6fb_booking.db"),
        description="Database connection URL",
    )

    # Database connection pool settings (PostgreSQL)
    DB_POOL_SIZE: int = Field(default=20, description="Database connection pool size")
    DB_MAX_OVERFLOW: int = Field(default=30, description="Max overflow connections")
    DB_POOL_TIMEOUT: int = Field(default=30, description="Connection pool timeout")
    DB_POOL_RECYCLE: int = Field(default=3600, description="Connection recycle time")
    DB_POOL_PRE_PING: bool = Field(
        default=True, description="Enable connection pre-ping"
    )

    # =============================================================================
    # PAYMENT PROCESSING
    # =============================================================================
    # Stripe Configuration
    STRIPE_SECRET_KEY: str = Field(
        default_factory=lambda: os.getenv("STRIPE_SECRET_KEY", ""),
        description="Stripe secret key for payment processing",
    )
    STRIPE_PUBLISHABLE_KEY: str = Field(
        default_factory=lambda: os.getenv("STRIPE_PUBLISHABLE_KEY", ""),
        description="Stripe publishable key",
    )
    STRIPE_WEBHOOK_SECRET: str = Field(
        default_factory=lambda: os.getenv("STRIPE_WEBHOOK_SECRET", ""),
        description="Stripe webhook signature secret",
    )
    STRIPE_CONNECT_CLIENT_ID: str = Field(
        default_factory=lambda: os.getenv("STRIPE_CONNECT_CLIENT_ID", ""),
        description="Stripe Connect client ID",
    )

    # Square Integration (OAuth & Payouts)
    SQUARE_APPLICATION_ID: Optional[str] = Field(
        default_factory=lambda: os.getenv("SQUARE_APPLICATION_ID"),
        description="Square application ID for OAuth",
    )
    SQUARE_APPLICATION_SECRET: Optional[str] = Field(
        default_factory=lambda: os.getenv("SQUARE_APPLICATION_SECRET"),
        description="Square application secret for OAuth",
    )
    SQUARE_ENVIRONMENT: Literal["sandbox", "production"] = Field(
        default="sandbox", description="Square environment"
    )
    SQUARE_WEBHOOK_SECRET: Optional[str] = Field(
        default_factory=lambda: os.getenv("SQUARE_WEBHOOK_SECRET"),
        description="Square webhook signature secret",
    )
    SQUARE_ACCESS_TOKEN: Optional[str] = Field(
        default_factory=lambda: os.getenv("SQUARE_ACCESS_TOKEN"),
        description="Square access token (for non-OAuth operations)",
    )

    # Tremendous Payouts (Optional)
    TREMENDOUS_API_KEY: str = Field(
        default_factory=lambda: os.getenv("TREMENDOUS_API_KEY", ""),
        description="Tremendous API key for flexible payouts",
    )
    TREMENDOUS_TEST_MODE: bool = Field(
        default=True, description="Enable Tremendous test mode"
    )
    TREMENDOUS_WEBHOOK_SECRET: str = Field(
        default_factory=lambda: os.getenv("TREMENDOUS_WEBHOOK_SECRET", ""),
        description="Tremendous webhook secret",
    )
    TREMENDOUS_FUNDING_SOURCE_ID: str = Field(
        default_factory=lambda: os.getenv("TREMENDOUS_FUNDING_SOURCE_ID", ""),
        description="Tremendous funding source ID",
    )
    TREMENDOUS_CAMPAIGN_ID: str = Field(
        default_factory=lambda: os.getenv("TREMENDOUS_CAMPAIGN_ID", ""),
        description="Tremendous campaign ID",
    )

    # =============================================================================
    # EMAIL & COMMUNICATION SERVICES
    # =============================================================================
    # SMTP Configuration (Gmail/Google Workspace)
    SMTP_HOST: str = Field(default="smtp.gmail.com", description="SMTP server hostname")
    SMTP_PORT: int = Field(default=587, description="SMTP server port")
    SMTP_USERNAME: Optional[str] = Field(
        default_factory=lambda: os.getenv("SMTP_USERNAME"),
        description="SMTP username/email",
    )
    SMTP_PASSWORD: Optional[str] = Field(
        default_factory=lambda: os.getenv("SMTP_PASSWORD"),
        description="SMTP password or app password",
    )

    # SendGrid Configuration (Production recommended)
    SENDGRID_API_KEY: Optional[str] = Field(
        default_factory=lambda: os.getenv("SENDGRID_API_KEY"),
        description="SendGrid API key for email delivery",
    )

    # Mailgun Configuration (Alternative)
    MAILGUN_API_KEY: Optional[str] = Field(
        default_factory=lambda: os.getenv("MAILGUN_API_KEY"),
        description="Mailgun API key",
    )
    MAILGUN_DOMAIN: Optional[str] = Field(
        default_factory=lambda: os.getenv("MAILGUN_DOMAIN"),
        description="Mailgun domain",
    )

    # Email settings
    EMAIL_FROM_ADDRESS: Optional[str] = Field(
        default_factory=lambda: os.getenv("FROM_EMAIL"),
        description="From email address",
    )
    EMAIL_FROM_NAME: str = Field(default="6FB Platform", description="From email name")

    # Legacy email settings for backward compatibility
    SMTP_SERVER: str = Field(
        default_factory=lambda: os.getenv("SMTP_SERVER", "smtp.gmail.com"),
        description="Legacy SMTP server setting",
    )
    FROM_EMAIL: Optional[str] = Field(
        default_factory=lambda: os.getenv("FROM_EMAIL"),
        description="Legacy from email setting",
    )

    # Twilio SMS Configuration
    TWILIO_ACCOUNT_SID: Optional[str] = Field(
        default_factory=lambda: os.getenv("TWILIO_ACCOUNT_SID"),
        description="Twilio account SID",
    )
    TWILIO_AUTH_TOKEN: Optional[str] = Field(
        default_factory=lambda: os.getenv("TWILIO_AUTH_TOKEN"),
        description="Twilio auth token",
    )
    TWILIO_PHONE_NUMBER: Optional[str] = Field(
        default_factory=lambda: os.getenv("TWILIO_PHONE_NUMBER"),
        description="Twilio phone number for SMS",
    )

    @property
    def email_enabled(self) -> bool:
        """Check if any email service is properly configured"""
        return bool(
            (self.SMTP_USERNAME and self.SMTP_PASSWORD)
            or self.SENDGRID_API_KEY
            or (self.MAILGUN_API_KEY and self.MAILGUN_DOMAIN)
        )

    @property
    def sms_enabled(self) -> bool:
        """Check if SMS service is properly configured"""
        return bool(self.TWILIO_ACCOUNT_SID and self.TWILIO_AUTH_TOKEN)

    # =============================================================================
    # GOOGLE INTEGRATIONS
    # =============================================================================
    # Google Calendar Integration
    GOOGLE_CALENDAR_CLIENT_ID: Optional[str] = Field(
        default_factory=lambda: os.getenv("GOOGLE_CALENDAR_CLIENT_ID"),
        description="Google Calendar OAuth client ID",
    )
    GOOGLE_CALENDAR_CLIENT_SECRET: Optional[str] = Field(
        default_factory=lambda: os.getenv("GOOGLE_CALENDAR_CLIENT_SECRET"),
        description="Google Calendar OAuth client secret",
    )
    GOOGLE_CALENDAR_REDIRECT_URI: str = Field(
        default="http://localhost:8000/api/v1/google-calendar/oauth/callback",
        description="Google Calendar OAuth redirect URI",
    )

    # Google Analytics
    GOOGLE_ANALYTICS_ID: Optional[str] = Field(
        default_factory=lambda: os.getenv("GOOGLE_ANALYTICS_ID"),
        description="Google Analytics tracking ID",
    )
    GA4_MEASUREMENT_ID: Optional[str] = Field(
        default_factory=lambda: os.getenv("GA4_MEASUREMENT_ID"),
        description="Google Analytics 4 measurement ID",
    )

    # =============================================================================
    # CACHING & SESSION STORAGE
    # =============================================================================
    # Redis Configuration
    REDIS_URL: str = Field(
        default="redis://localhost:6379", description="Redis connection URL"
    )
    REDIS_PASSWORD: Optional[str] = Field(
        default_factory=lambda: os.getenv("REDIS_PASSWORD"),
        description="Redis authentication password",
    )
    REDIS_DB: int = Field(default=0, description="Redis database number")

    # =============================================================================
    # ENVIRONMENT & DEPLOYMENT SETTINGS
    # =============================================================================
    ENVIRONMENT: Literal["development", "staging", "production"] = Field(
        default="development", description="Application environment"
    )
    DEBUG: bool = Field(default=False, description="Enable debug mode")
    RELOAD: bool = Field(default=False, description="Enable auto-reload")

    # Frontend and CORS
    FRONTEND_URL: str = Field(
        default="http://localhost:3000", description="Frontend application URL"
    )
    CORS_ORIGINS: List[str] = Field(default=[], description="Allowed CORS origins")

    # =============================================================================
    # MONITORING & OBSERVABILITY
    # =============================================================================
    # Sentry Configuration
    SENTRY_DSN: Optional[str] = Field(
        default_factory=lambda: os.getenv("SENTRY_DSN"),
        description="Sentry DSN for error tracking",
    )
    SENTRY_ENVIRONMENT: str = Field(
        default_factory=lambda: os.getenv("SENTRY_ENVIRONMENT", "development"),
        description="Sentry environment name",
    )
    SENTRY_TRACES_SAMPLE_RATE: float = Field(
        default=0.1, description="Sentry traces sample rate"
    )

    # UptimeRobot Integration
    UPTIME_ROBOT_API_KEY: Optional[str] = Field(
        default_factory=lambda: os.getenv("UPTIME_ROBOT_API_KEY"),
        description="UptimeRobot API key for monitoring",
    )

    # =============================================================================
    # SECURITY & RATE LIMITING
    # =============================================================================
    # Rate limiting
    RATE_LIMIT_PER_MINUTE: int = Field(
        default=60, description="Rate limit per minute per IP"
    )
    RATE_LIMIT_BURST: int = Field(default=100, description="Rate limit burst capacity")

    # Login-specific rate limiting (environment-aware)
    LOGIN_RATE_LIMIT_ATTEMPTS: int = Field(
        default_factory=lambda: int(
            os.getenv(
                "LOGIN_RATE_LIMIT_ATTEMPTS",
                (
                    "20"
                    if os.getenv("ENVIRONMENT", "development") == "development"
                    else "5"
                ),
            )
        ),
        description="Maximum login attempts allowed",
    )
    LOGIN_RATE_LIMIT_WINDOW: int = Field(
        default_factory=lambda: int(os.getenv("LOGIN_RATE_LIMIT_WINDOW", "300")),
        description="Login rate limit window in seconds",
    )

    # Security headers
    SECURITY_HEADERS_ENABLED: bool = Field(
        default=True, description="Enable security headers"
    )
    CONTENT_SECURITY_POLICY_ENABLED: bool = Field(
        default=True, description="Enable Content Security Policy"
    )

    # Trusted proxies for rate limiting
    TRUSTED_PROXIES: List[str] = Field(
        default_factory=lambda: os.getenv("TRUSTED_PROXIES", "127.0.0.1,::1").split(
            ","
        ),
        description="Trusted proxy IP addresses",
    )

    # =============================================================================
    # FILE STORAGE & UPLOADS
    # =============================================================================
    UPLOAD_DIR: str = Field(default="uploads", description="Upload directory path")
    MAX_UPLOAD_SIZE: int = Field(
        default=10 * 1024 * 1024, description="Maximum upload size in bytes (10MB)"
    )

    # AWS S3 Configuration (Optional)
    AWS_ACCESS_KEY_ID: Optional[str] = Field(
        default_factory=lambda: os.getenv("AWS_ACCESS_KEY_ID"),
        description="AWS access key ID",
    )
    AWS_SECRET_ACCESS_KEY: Optional[str] = Field(
        default_factory=lambda: os.getenv("AWS_SECRET_ACCESS_KEY"),
        description="AWS secret access key",
    )
    AWS_S3_BUCKET: Optional[str] = Field(
        default_factory=lambda: os.getenv("AWS_S3_BUCKET"),
        description="AWS S3 bucket name",
    )
    AWS_S3_REGION: str = Field(default="us-east-1", description="AWS S3 region")

    # =============================================================================
    # LOGGING CONFIGURATION
    # =============================================================================
    LOG_LEVEL: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = Field(
        default="INFO", description="Application log level"
    )
    LOG_FORMAT: Literal["json", "text"] = Field(
        default="json", description="Log format"
    )
    LOG_RETENTION_DAYS: int = Field(default=30, description="Log retention in days")

    # Specific logger levels
    SQLALCHEMY_LOG_LEVEL: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = Field(
        default="WARNING", description="SQLAlchemy log level"
    )
    UVICORN_LOG_LEVEL: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = Field(
        default="INFO", description="Uvicorn log level"
    )

    # =============================================================================
    # PERFORMANCE & SCALABILITY
    # =============================================================================
    # Worker configuration
    WORKERS: int = Field(default=4, description="Number of worker processes")
    WORKER_CLASS: str = Field(
        default="uvicorn.workers.UvicornWorker", description="Worker class"
    )
    WORKER_CONNECTIONS: int = Field(default=1000, description="Worker connections")
    MAX_REQUESTS: int = Field(default=10000, description="Max requests per worker")
    MAX_REQUESTS_JITTER: int = Field(default=1000, description="Max requests jitter")

    # Request timeout settings
    REQUEST_TIMEOUT: int = Field(default=30, description="Request timeout in seconds")
    KEEP_ALIVE: int = Field(default=2, description="Keep alive timeout")

    # =============================================================================
    # FEATURE FLAGS
    # =============================================================================
    FEATURE_GOOGLE_CALENDAR_SYNC: bool = Field(
        default=True, description="Enable Google Calendar sync"
    )
    FEATURE_PAYMENT_SPLITS: bool = Field(
        default=True, description="Enable payment splits"
    )
    FEATURE_ANALYTICS_DASHBOARD: bool = Field(
        default=True, description="Enable analytics dashboard"
    )
    FEATURE_AUTOMATED_REMINDERS: bool = Field(
        default=True, description="Enable automated reminders"
    )

    # =============================================================================
    # BACKUP & DISASTER RECOVERY
    # =============================================================================
    BACKUP_ENABLED: bool = Field(default=False, description="Enable automated backups")
    BACKUP_SCHEDULE: str = Field(
        default="0 2 * * *", description="Backup schedule (cron format)"
    )
    BACKUP_RETENTION_DAYS: int = Field(
        default=30, description="Backup retention in days"
    )
    BACKUP_S3_BUCKET: Optional[str] = Field(
        default_factory=lambda: os.getenv("BACKUP_S3_BUCKET"),
        description="S3 bucket for backups",
    )

    # =============================================================================
    # PAGINATION & API LIMITS
    # =============================================================================
    DEFAULT_PAGE_SIZE: int = Field(default=50, description="Default pagination size")
    MAX_PAGE_SIZE: int = Field(default=100, description="Maximum pagination size")

    # =============================================================================
    # VALIDATORS
    # =============================================================================
    @validator("SECRET_KEY")
    def validate_secret_key(cls, v):
        """Validate SECRET_KEY is secure"""
        if isinstance(v, SecretStr):
            secret_value = v.get_secret_value()
        else:
            secret_value = str(v)

        if not secret_value or secret_value in [
            "your-secret-key-change-this",
            "GENERATE_SECURE_64_CHAR_KEY_HERE",
            "change-this-key",
        ]:
            raise ValueError(
                "SECRET_KEY must be set to a secure random value. "
                "Generate one with: python3 -c 'import secrets; print(secrets.token_urlsafe(64))'"
            )

        if len(secret_value) < 32:
            raise ValueError("SECRET_KEY must be at least 32 characters long")

        return v

    @validator("JWT_SECRET_KEY")
    def validate_jwt_secret_key(cls, v):
        """Validate JWT_SECRET_KEY is secure and different from SECRET_KEY"""
        if isinstance(v, SecretStr):
            secret_value = v.get_secret_value()
        else:
            secret_value = str(v)

        if not secret_value or secret_value in [
            "your-secret-key-change-this",
            "GENERATE_DIFFERENT_SECURE_64_CHAR_KEY_HERE",
            "change-this-key",
        ]:
            raise ValueError(
                "JWT_SECRET_KEY must be set to a secure random value different from SECRET_KEY"
            )

        if len(secret_value) < 32:
            raise ValueError("JWT_SECRET_KEY must be at least 32 characters long")

        return v

    @validator("DATABASE_URL")
    def validate_database_url(cls, v):
        """Validate database URL format"""
        if not v:
            raise ValueError("DATABASE_URL cannot be empty")

        # Handle Render's postgres:// URLs
        if v.startswith("postgres://"):
            v = v.replace("postgres://", "postgresql://", 1)

        # Parse URL to validate format
        try:
            parsed = urlparse(v)
            if not parsed.scheme:
                raise ValueError(
                    "DATABASE_URL must include a scheme (postgresql://, sqlite://, etc.)"
                )
        except Exception as e:
            raise ValueError(f"Invalid DATABASE_URL format: {e}")

        return v

    @validator("STRIPE_SECRET_KEY")
    def validate_stripe_secret_key(cls, v, values):
        """Validate Stripe secret key format in production"""
        environment = values.get("ENVIRONMENT", "development")

        if environment == "production" and v:
            if not v.startswith("sk_live_"):
                logger.warning(
                    "Using test Stripe key in production environment. "
                    "Make sure to use live keys (sk_live_) for production."
                )
        elif environment in ["development", "staging"] and v:
            if not v.startswith("sk_test_"):
                logger.warning(
                    "Using live Stripe key in development/staging. "
                    "Consider using test keys (sk_test_) for development."
                )

        return v

    @validator("TRUSTED_PROXIES", pre=True)
    def validate_trusted_proxies(cls, v):
        """Parse TRUSTED_PROXIES from string or list"""
        if isinstance(v, str):
            return [proxy.strip() for proxy in v.split(",") if proxy.strip()]
        elif isinstance(v, list):
            return v
        return ["127.0.0.1", "::1"]

    def model_post_init(self, __context) -> None:
        """Post-initialization validation and warnings"""
        # Handle ALLOWED_ORIGINS parsing
        self._setup_allowed_origins()

        # Production environment checks
        if self.ENVIRONMENT == "production":
            self._validate_production_config()

        # Development warnings
        elif self.ENVIRONMENT == "development":
            self._show_development_warnings()

    def _setup_allowed_origins(self):
        """Setup CORS_ORIGINS from environment variable or defaults"""
        # Start with defaults
        default_origins = [
            "http://localhost:3000",
            "http://localhost:3001",
            self.FRONTEND_URL,
        ]

        # Add origins from environment variable
        env_origins = os.getenv("ALLOWED_ORIGINS", "")
        if env_origins:
            env_origins_list = [
                origin.strip() for origin in env_origins.split(",") if origin.strip()
            ]
            default_origins.extend(env_origins_list)

        # Add all known Vercel patterns - this will solve the random URL problem
        vercel_patterns = [
            "https://bookbarber-6fb.vercel.app",  # Main deployment
            "https://bookbarber.vercel.app",  # Alternative
        ]
        default_origins.extend(vercel_patterns)

        # Remove duplicates and set
        self.CORS_ORIGINS = list(set(default_origins))

    def is_allowed_origin(self, origin: str) -> bool:
        """Check if origin is allowed, including wildcard patterns"""
        if not origin:
            return False

        # Check exact matches first
        if origin in self.CORS_ORIGINS:
            return True

        # Check Vercel deployment patterns
        if origin.startswith("https://") and origin.endswith(".vercel.app"):
            # Allow any subdomain of vercel.app that starts with bookbarber
            domain_part = origin.replace("https://", "").replace(".vercel.app", "")
            if domain_part.startswith("bookbarber"):
                return True

        return False

    def _validate_production_config(self):
        """Validate production-specific requirements"""
        errors = []
        warnings = []

        # Required for production
        if "sqlite" in self.DATABASE_URL.lower():
            errors.append(
                "SQLite database not recommended for production. Use PostgreSQL."
            )

        if not self.email_enabled:
            warnings.append(
                "No email service configured. Email notifications will be disabled."
            )

        if not self.SENTRY_DSN:
            warnings.append(
                "Sentry DSN not configured. Error tracking will be disabled."
            )

        if self.DEBUG:
            errors.append("DEBUG mode should be disabled in production")

        if self.RELOAD:
            errors.append("RELOAD should be disabled in production")

        # Log warnings
        for warning in warnings:
            logger.warning(f"Production config warning: {warning}")

        # Raise errors
        if errors:
            raise ValueError(f"Production configuration errors: {'; '.join(errors)}")

    def _show_development_warnings(self):
        """Show development-specific warnings"""
        if not self.email_enabled:
            logger.info(
                "Email service not configured. Using console output for development."
            )

        if "sqlite" in self.DATABASE_URL.lower():
            logger.info("Using SQLite database for development.")

    # =============================================================================
    # COMPUTED PROPERTIES
    # =============================================================================
    @property
    def is_production(self) -> bool:
        """Check if running in production environment"""
        return self.ENVIRONMENT == "production"

    @property
    def is_development(self) -> bool:
        """Check if running in development environment"""
        return self.ENVIRONMENT == "development"

    @property
    def database_type(self) -> str:
        """Get database type from DATABASE_URL"""
        if "postgresql" in self.DATABASE_URL or "postgres" in self.DATABASE_URL:
            return "postgresql"
        elif "sqlite" in self.DATABASE_URL:
            return "sqlite"
        elif "mysql" in self.DATABASE_URL:
            return "mysql"
        else:
            return "unknown"

    @property
    def payment_enabled(self) -> bool:
        """Check if payment processing is configured"""
        return bool(self.STRIPE_SECRET_KEY and self.STRIPE_PUBLISHABLE_KEY)

    @property
    def square_enabled(self) -> bool:
        """Check if Square integration is configured"""
        return bool(self.SQUARE_APPLICATION_ID and self.SQUARE_APPLICATION_SECRET)

    @property
    def monitoring_enabled(self) -> bool:
        """Check if monitoring is configured"""
        return bool(self.SENTRY_DSN)

    @property
    def google_integrations_enabled(self) -> bool:
        """Check if Google integrations are configured"""
        return bool(
            self.GOOGLE_CALENDAR_CLIENT_ID and self.GOOGLE_CALENDAR_CLIENT_SECRET
        )

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "allow"
        # Pydantic v2 configuration
        validate_assignment = True
        use_enum_values = True


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()


# Global settings instance
settings = get_settings()


# Environment-specific configuration helpers
def get_database_config() -> dict:
    """Get database configuration based on environment and database type"""
    config = {
        "echo": not settings.is_production,
        "echo_pool": not settings.is_production,
    }

    if settings.database_type == "postgresql":
        config.update(
            {
                "pool_size": settings.DB_POOL_SIZE,
                "max_overflow": settings.DB_MAX_OVERFLOW,
                "pool_timeout": settings.DB_POOL_TIMEOUT,
                "pool_recycle": settings.DB_POOL_RECYCLE,
                "pool_pre_ping": settings.DB_POOL_PRE_PING,
            }
        )
    elif settings.database_type == "sqlite":
        config.update(
            {
                "connect_args": {
                    "check_same_thread": False,
                    "timeout": 20,
                },
                "pool_pre_ping": True,
            }
        )

    return config


def get_cors_config() -> dict:
    """Get CORS configuration"""
    return {
        "allow_origins": settings.CORS_ORIGINS,
        "allow_credentials": True,
        "allow_methods": ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        "allow_headers": [
            "Authorization",
            "Content-Type",
            "X-Requested-With",
            "Accept",
            "Origin",
            "Access-Control-Request-Method",
            "Access-Control-Request-Headers",
        ],
    }


def get_security_config() -> dict:
    """Get security configuration"""
    return {
        "rate_limit_per_minute": settings.RATE_LIMIT_PER_MINUTE,
        "rate_limit_burst": settings.RATE_LIMIT_BURST,
        "security_headers_enabled": settings.SECURITY_HEADERS_ENABLED,
        "csp_enabled": settings.CONTENT_SECURITY_POLICY_ENABLED,
        "trusted_proxies": settings.TRUSTED_PROXIES,
    }


def validate_startup_requirements():
    """Validate all startup requirements are met"""
    errors = []
    warnings = []

    # Critical validations
    try:
        # This will trigger all validators
        settings.model_validate(settings.model_dump())
    except ValueError as e:
        errors.append(f"Settings validation failed: {e}")

    # Payment configuration check
    if not settings.payment_enabled and settings.ENVIRONMENT == "production":
        errors.append("Payment processing must be configured for production")

    # Database connectivity (basic URL validation)
    if not settings.DATABASE_URL:
        errors.append("DATABASE_URL must be configured")

    # Log warnings
    for warning in warnings:
        logger.warning(warning)

    # Raise critical errors
    if errors:
        error_msg = "Startup validation failed:\n" + "\n".join(
            f"- {error}" for error in errors
        )
        logger.error(error_msg)
        raise RuntimeError(error_msg)

    logger.info(
        f"Settings validated successfully for {settings.ENVIRONMENT} environment"
    )
    return True
