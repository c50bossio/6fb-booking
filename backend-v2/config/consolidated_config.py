"""
Consolidated Configuration Management

This module consolidates and replaces all duplicate configuration files:
- config.py
- config_enhanced.py
- core/config.py
- config/redis_config.py
- config/cdn_config.py
- config/ssl_config.py
- config/security_config.py
- config/sentry.py
- config/production_sentry_config.py
- And 15+ other configuration modules

REDUCTION: 20+ config files → 1 unified configuration system (95% reduction)
"""

import os
import secrets
from typing import Dict, List, Optional, Any, Union
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

class Environment(Enum):
    """Application environments"""
    DEVELOPMENT = "development"
    STAGING = "staging"
    PRODUCTION = "production"
    TESTING = "testing"

class DatabaseType(Enum):
    """Supported database types"""
    SQLITE = "sqlite"
    POSTGRESQL = "postgresql"
    MYSQL = "mysql"

class CacheBackend(Enum):
    """Cache backend types"""
    REDIS = "redis"
    MEMORY = "memory"
    DUMMY = "dummy"

class LogLevel(Enum):
    """Logging levels"""
    DEBUG = "DEBUG"
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    CRITICAL = "CRITICAL"

@dataclass
class DatabaseConfig:
    """Database configuration"""
    type: DatabaseType = DatabaseType.SQLITE
    host: str = "localhost"
    port: int = 5432
    name: str = "6fb_booking"
    user: str = "postgres"
    password: str = ""
    echo: bool = False
    pool_size: int = 10
    max_overflow: int = 20
    pool_timeout: int = 30
    pool_recycle: int = 3600
    
    @property
    def url(self) -> str:
        """Generate database URL"""
        if self.type == DatabaseType.SQLITE:
            return f"sqlite:///./{self.name}.db"
        elif self.type == DatabaseType.POSTGRESQL:
            return f"postgresql://{self.user}:{self.password}@{self.host}:{self.port}/{self.name}"
        elif self.type == DatabaseType.MYSQL:
            return f"mysql://{self.user}:{self.password}@{self.host}:{self.port}/{self.name}"
        else:
            raise ValueError(f"Unsupported database type: {self.type}")

@dataclass
class RedisConfig:
    """Redis configuration"""
    host: str = "localhost"
    port: int = 6379
    db: int = 0
    password: Optional[str] = None
    socket_timeout: int = 5
    socket_connect_timeout: int = 5
    socket_keepalive: bool = True
    socket_keepalive_options: Dict[str, int] = field(default_factory=dict)
    max_connections: int = 50
    retry_on_timeout: bool = True
    health_check_interval: int = 30
    
    @property
    def url(self) -> str:
        """Generate Redis URL"""
        auth = f":{self.password}@" if self.password else ""
        return f"redis://{auth}{self.host}:{self.port}/{self.db}"

@dataclass
class SecurityConfig:
    """Security configuration"""
    secret_key: str = field(default_factory=lambda: secrets.token_urlsafe(32))
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 30
    password_reset_expire_hours: int = 1
    email_verification_expire_hours: int = 24
    max_login_attempts: int = 5
    lockout_duration_minutes: int = 15
    require_email_verification: bool = True
    enable_mfa: bool = False
    enable_rate_limiting: bool = True
    cors_origins: List[str] = field(default_factory=lambda: ["*"])
    cors_credentials: bool = True
    cors_methods: List[str] = field(default_factory=lambda: ["*"])
    cors_headers: List[str] = field(default_factory=lambda: ["*"])

@dataclass
class EmailConfig:
    """Email configuration"""
    provider: str = "sendgrid"  # sendgrid, smtp, ses
    smtp_server: str = "smtp.sendgrid.net"
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    from_email: str = "noreply@bookedbarber.com"
    from_name: str = "BookedBarber"
    use_tls: bool = True
    use_ssl: bool = False
    sendgrid_api_key: str = ""
    ses_access_key_id: str = ""
    ses_secret_access_key: str = ""
    ses_region: str = "us-east-1"

@dataclass
class SMSConfig:
    """SMS configuration"""
    provider: str = "twilio"  # twilio, aws_sns
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_phone_number: str = ""
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    aws_region: str = "us-east-1"

@dataclass
class StorageConfig:
    """File storage configuration"""
    provider: str = "local"  # local, s3, gcs
    local_path: str = "./uploads"
    s3_bucket: str = ""
    s3_access_key_id: str = ""
    s3_secret_access_key: str = ""
    s3_region: str = "us-east-1"
    gcs_bucket: str = ""
    gcs_credentials_path: str = ""
    max_file_size: int = 10 * 1024 * 1024  # 10MB
    allowed_extensions: List[str] = field(default_factory=lambda: [".jpg", ".jpeg", ".png", ".pdf"])

@dataclass
class PaymentConfig:
    """Payment processing configuration"""
    stripe_publishable_key: str = ""
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""
    enable_connect: bool = True
    currency: str = "USD"
    commission_rate: float = 0.029  # 2.9%
    fixed_fee: float = 0.30  # $0.30

@dataclass
class CacheConfig:
    """Caching configuration"""
    backend: CacheBackend = CacheBackend.REDIS
    redis: RedisConfig = field(default_factory=RedisConfig)
    default_ttl: int = 300  # 5 minutes
    analytics_ttl: int = 600  # 10 minutes
    slots_ttl: int = 300  # 5 minutes
    user_session_ttl: int = 1800  # 30 minutes

@dataclass
class LoggingConfig:
    """Logging configuration"""
    level: LogLevel = LogLevel.INFO
    format: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    file_path: Optional[str] = None
    max_file_size: int = 10 * 1024 * 1024  # 10MB
    backup_count: int = 5
    enable_console: bool = True
    enable_file: bool = False
    
@dataclass
class MonitoringConfig:
    """Monitoring and observability configuration"""
    sentry_dsn: str = ""
    sentry_environment: str = ""
    sentry_traces_sample_rate: float = 0.1
    enable_prometheus: bool = False
    prometheus_port: int = 8090
    enable_health_checks: bool = True
    health_check_interval: int = 30

@dataclass
class APIConfig:
    """API configuration"""
    title: str = "BookedBarber API"
    description: str = "Six Figure Barber Methodology Platform API"
    version: str = "2.0.0"
    docs_url: str = "/docs"
    redoc_url: str = "/redoc"
    openapi_url: str = "/openapi.json"
    rate_limit_per_minute: int = 60
    max_request_size: int = 16 * 1024 * 1024  # 16MB
    enable_swagger: bool = True

@dataclass
class CDNConfig:
    """CDN configuration"""
    provider: str = "cloudflare"  # cloudflare, aws, local
    base_url: str = ""
    api_token: str = ""
    zone_id: str = ""
    enable_compression: bool = True
    cache_ttl: int = 86400  # 24 hours
    enable_ssl: bool = True

class ConsolidatedConfig:
    """
    Main configuration class that consolidates all application settings
    """
    
    def __init__(self, environment: Environment = None):
        self.environment = environment or self._detect_environment()
        self._load_configuration()
    
    def _detect_environment(self) -> Environment:
        """Auto-detect environment from environment variables"""
        env_name = os.getenv("ENVIRONMENT", "development").lower()
        try:
            return Environment(env_name)
        except ValueError:
            logger.warning(f"Unknown environment '{env_name}', defaulting to development")
            return Environment.DEVELOPMENT
    
    def _load_configuration(self):
        """Load configuration based on environment"""
        # Database configuration
        self.database = DatabaseConfig(
            type=DatabaseType(os.getenv("DB_TYPE", "sqlite")),
            host=os.getenv("DB_HOST", "localhost"),
            port=int(os.getenv("DB_PORT", "5432")),
            name=os.getenv("DB_NAME", "6fb_booking"),
            user=os.getenv("DB_USER", "postgres"),
            password=os.getenv("DB_PASSWORD", ""),
            echo=os.getenv("DB_ECHO", "false").lower() == "true",
            pool_size=int(os.getenv("DB_POOL_SIZE", "10"))
        )
        
        # Redis configuration
        self.redis = RedisConfig(
            host=os.getenv("REDIS_HOST", "localhost"),
            port=int(os.getenv("REDIS_PORT", "6379")),
            db=int(os.getenv("REDIS_DB", "0")),
            password=os.getenv("REDIS_PASSWORD"),
            max_connections=int(os.getenv("REDIS_MAX_CONNECTIONS", "50"))
        )
        
        # Security configuration
        self.security = SecurityConfig(
            secret_key=os.getenv("SECRET_KEY", secrets.token_urlsafe(32)),
            algorithm=os.getenv("ALGORITHM", "HS256"),
            access_token_expire_minutes=int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30")),
            refresh_token_expire_days=int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "30")),
            max_login_attempts=int(os.getenv("MAX_LOGIN_ATTEMPTS", "5")),
            require_email_verification=os.getenv("REQUIRE_EMAIL_VERIFICATION", "true").lower() == "true",
            enable_mfa=os.getenv("ENABLE_MFA", "false").lower() == "true",
            cors_origins=os.getenv("CORS_ORIGINS", "*").split(",")
        )
        
        # Email configuration
        self.email = EmailConfig(
            provider=os.getenv("EMAIL_PROVIDER", "sendgrid"),
            smtp_server=os.getenv("SMTP_SERVER", "smtp.sendgrid.net"),
            smtp_port=int(os.getenv("SMTP_PORT", "587")),
            smtp_username=os.getenv("SMTP_USERNAME", ""),
            smtp_password=os.getenv("SMTP_PASSWORD", ""),
            from_email=os.getenv("FROM_EMAIL", "noreply@bookedbarber.com"),
            sendgrid_api_key=os.getenv("SENDGRID_API_KEY", ""),
            use_tls=os.getenv("EMAIL_USE_TLS", "true").lower() == "true"
        )
        
        # SMS configuration
        self.sms = SMSConfig(
            provider=os.getenv("SMS_PROVIDER", "twilio"),
            twilio_account_sid=os.getenv("TWILIO_ACCOUNT_SID", ""),
            twilio_auth_token=os.getenv("TWILIO_AUTH_TOKEN", ""),
            twilio_phone_number=os.getenv("TWILIO_PHONE_NUMBER", "")
        )
        
        # Storage configuration
        self.storage = StorageConfig(
            provider=os.getenv("STORAGE_PROVIDER", "local"),
            local_path=os.getenv("STORAGE_LOCAL_PATH", "./uploads"),
            s3_bucket=os.getenv("S3_BUCKET", ""),
            s3_access_key_id=os.getenv("S3_ACCESS_KEY_ID", ""),
            s3_secret_access_key=os.getenv("S3_SECRET_ACCESS_KEY", ""),
            max_file_size=int(os.getenv("MAX_FILE_SIZE", str(10 * 1024 * 1024)))
        )
        
        # Payment configuration
        self.payment = PaymentConfig(
            stripe_publishable_key=os.getenv("STRIPE_PUBLISHABLE_KEY", ""),
            stripe_secret_key=os.getenv("STRIPE_SECRET_KEY", ""),
            stripe_webhook_secret=os.getenv("STRIPE_WEBHOOK_SECRET", ""),
            enable_connect=os.getenv("STRIPE_ENABLE_CONNECT", "true").lower() == "true",
            currency=os.getenv("CURRENCY", "USD"),
            commission_rate=float(os.getenv("COMMISSION_RATE", "0.029"))
        )
        
        # Cache configuration
        self.cache = CacheConfig(
            backend=CacheBackend(os.getenv("CACHE_BACKEND", "redis")),
            redis=self.redis,
            default_ttl=int(os.getenv("CACHE_DEFAULT_TTL", "300")),
            analytics_ttl=int(os.getenv("CACHE_ANALYTICS_TTL", "600"))
        )
        
        # Logging configuration
        self.logging = LoggingConfig(
            level=LogLevel(os.getenv("LOG_LEVEL", "INFO")),
            file_path=os.getenv("LOG_FILE_PATH"),
            enable_console=os.getenv("LOG_ENABLE_CONSOLE", "true").lower() == "true",
            enable_file=os.getenv("LOG_ENABLE_FILE", "false").lower() == "true"
        )
        
        # Monitoring configuration
        self.monitoring = MonitoringConfig(
            sentry_dsn=os.getenv("SENTRY_DSN", ""),
            sentry_environment=self.environment.value,
            sentry_traces_sample_rate=float(os.getenv("SENTRY_TRACES_SAMPLE_RATE", "0.1")),
            enable_prometheus=os.getenv("ENABLE_PROMETHEUS", "false").lower() == "true",
            enable_health_checks=os.getenv("ENABLE_HEALTH_CHECKS", "true").lower() == "true"
        )
        
        # API configuration
        self.api = APIConfig(
            title=os.getenv("API_TITLE", "BookedBarber API"),
            version=os.getenv("API_VERSION", "2.0.0"),
            docs_url=os.getenv("API_DOCS_URL", "/docs"),
            rate_limit_per_minute=int(os.getenv("RATE_LIMIT_PER_MINUTE", "60")),
            enable_swagger=os.getenv("ENABLE_SWAGGER", "true").lower() == "true"
        )
        
        # CDN configuration
        self.cdn = CDNConfig(
            provider=os.getenv("CDN_PROVIDER", "local"),
            base_url=os.getenv("CDN_BASE_URL", ""),
            api_token=os.getenv("CDN_API_TOKEN", ""),
            enable_compression=os.getenv("CDN_ENABLE_COMPRESSION", "true").lower() == "true",
            enable_ssl=os.getenv("CDN_ENABLE_SSL", "true").lower() == "true"
        )
        
        # Environment-specific overrides
        self._apply_environment_overrides()
    
    def _apply_environment_overrides(self):
        """Apply environment-specific configuration overrides"""
        if self.environment == Environment.DEVELOPMENT:
            self.database.echo = True
            self.logging.level = LogLevel.DEBUG
            self.api.enable_swagger = True
            self.security.cors_origins = ["*"]
            
        elif self.environment == Environment.STAGING:
            self.database.echo = False
            self.logging.level = LogLevel.INFO
            self.api.enable_swagger = True
            self.monitoring.enable_health_checks = True
            
        elif self.environment == Environment.PRODUCTION:
            self.database.echo = False
            self.logging.level = LogLevel.WARNING
            self.api.enable_swagger = False
            self.security.enable_rate_limiting = True
            self.monitoring.enable_health_checks = True
            self.monitoring.enable_prometheus = True
            
        elif self.environment == Environment.TESTING:
            self.database.type = DatabaseType.SQLITE
            self.database.name = "test_6fb_booking"
            self.cache.backend = CacheBackend.DUMMY
            self.logging.level = LogLevel.ERROR
            self.security.enable_rate_limiting = False
    
    def get_database_url(self) -> str:
        """Get database connection URL"""
        return self.database.url
    
    def get_redis_url(self) -> str:
        """Get Redis connection URL"""
        return self.redis.url
    
    def is_development(self) -> bool:
        """Check if running in development environment"""
        return self.environment == Environment.DEVELOPMENT
    
    def is_production(self) -> bool:
        """Check if running in production environment"""
        return self.environment == Environment.PRODUCTION
    
    def is_testing(self) -> bool:
        """Check if running in testing environment"""
        return self.environment == Environment.TESTING
    
    def validate_config(self) -> List[str]:
        """Validate configuration and return list of issues"""
        issues = []
        
        # Database validation
        if self.database.type == DatabaseType.POSTGRESQL and not self.database.password:
            issues.append("PostgreSQL password is required")
        
        # Redis validation
        if self.cache.backend == CacheBackend.REDIS and not self.redis.host:
            issues.append("Redis host is required when using Redis cache")
        
        # Email validation
        if self.email.provider == "sendgrid" and not self.email.sendgrid_api_key:
            issues.append("SendGrid API key is required")
        elif self.email.provider == "smtp" and not self.email.smtp_password:
            issues.append("SMTP password is required")
        
        # Payment validation
        if self.is_production() and not self.payment.stripe_secret_key:
            issues.append("Stripe secret key is required in production")
        
        # Security validation
        if len(self.security.secret_key) < 32:
            issues.append("Secret key should be at least 32 characters")
        
        return issues
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert configuration to dictionary (excluding sensitive data)"""
        return {
            "environment": self.environment.value,
            "database": {
                "type": self.database.type.value,
                "host": self.database.host,
                "port": self.database.port,
                "name": self.database.name
            },
            "cache": {
                "backend": self.cache.backend.value,
                "default_ttl": self.cache.default_ttl
            },
            "api": {
                "title": self.api.title,
                "version": self.api.version,
                "enable_swagger": self.api.enable_swagger
            }
        }

# Global configuration instance
config = ConsolidatedConfig()

# Backward compatibility aliases
SECRET_KEY = config.security.secret_key
ALGORITHM = config.security.algorithm
ACCESS_TOKEN_EXPIRE_MINUTES = config.security.access_token_expire_minutes
DATABASE_URL = config.database.url
REDIS_URL = config.redis.url

# Export everything
__all__ = [
    "ConsolidatedConfig", "Environment", "DatabaseType", "CacheBackend",
    "DatabaseConfig", "RedisConfig", "SecurityConfig", "EmailConfig",
    "SMSConfig", "StorageConfig", "PaymentConfig", "CacheConfig",
    "LoggingConfig", "MonitoringConfig", "APIConfig", "CDNConfig",
    "config", "SECRET_KEY", "ALGORITHM", "ACCESS_TOKEN_EXPIRE_MINUTES",
    "DATABASE_URL", "REDIS_URL"
]