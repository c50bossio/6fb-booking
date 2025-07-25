"""
Configuration Management System for BookedBarber V2

Centralized configuration management with environment-specific settings,
validation, and type safety.
"""

import os
from typing import Optional, Dict, Any, List
from dataclasses import dataclass, field
from enum import Enum
import json
from pathlib import Path
from functools import lru_cache


class Environment(str, Enum):
    """Application environments"""
    DEVELOPMENT = "development"
    STAGING = "staging"
    PRODUCTION = "production"
    TESTING = "testing"


@dataclass
class DatabaseConfig:
    """Database configuration settings"""
    url: str
    pool_size: int = 10
    max_overflow: int = 20
    pool_timeout: int = 30
    pool_recycle: int = 3600
    echo: bool = False
    
    @classmethod
    def from_env(cls) -> 'DatabaseConfig':
        return cls(
            url=os.getenv("DATABASE_URL", "sqlite:///./app.db"),
            pool_size=int(os.getenv("DB_POOL_SIZE", "10")),
            max_overflow=int(os.getenv("DB_MAX_OVERFLOW", "20")),
            pool_timeout=int(os.getenv("DB_POOL_TIMEOUT", "30")),
            pool_recycle=int(os.getenv("DB_POOL_RECYCLE", "3600")),
            echo=os.getenv("DB_ECHO", "false").lower() == "true"
        )


@dataclass
class RedisConfig:
    """Redis configuration settings"""
    url: str
    decode_responses: bool = True
    socket_timeout: int = 5
    socket_connect_timeout: int = 5
    max_connections: int = 10
    
    @classmethod
    def from_env(cls) -> 'RedisConfig':
        return cls(
            url=os.getenv("REDIS_URL", "redis://localhost:6379/0"),
            decode_responses=os.getenv("REDIS_DECODE_RESPONSES", "true").lower() == "true",
            socket_timeout=int(os.getenv("REDIS_SOCKET_TIMEOUT", "5")),
            socket_connect_timeout=int(os.getenv("REDIS_CONNECT_TIMEOUT", "5")),
            max_connections=int(os.getenv("REDIS_MAX_CONNECTIONS", "10"))
        )


@dataclass
class StripeConfig:
    """Stripe payment configuration"""
    publishable_key: str
    secret_key: str
    webhook_secret: str
    connect_client_id: Optional[str] = None
    
    @classmethod
    def from_env(cls) -> 'StripeConfig':
        return cls(
            publishable_key=os.getenv("STRIPE_PUBLISHABLE_KEY", ""),
            secret_key=os.getenv("STRIPE_SECRET_KEY", ""),
            webhook_secret=os.getenv("STRIPE_WEBHOOK_SECRET", ""),
            connect_client_id=os.getenv("STRIPE_CONNECT_CLIENT_ID")
        )


@dataclass
class EmailConfig:
    """Email service configuration"""
    smtp_host: str
    smtp_port: int
    smtp_username: str
    smtp_password: str
    use_tls: bool = True
    use_ssl: bool = False
    from_email: str = ""
    from_name: str = "BookedBarber"
    
    @classmethod
    def from_env(cls) -> 'EmailConfig':
        return cls(
            smtp_host=os.getenv("SMTP_HOST", ""),
            smtp_port=int(os.getenv("SMTP_PORT", "587")),
            smtp_username=os.getenv("SMTP_USERNAME", ""),
            smtp_password=os.getenv("SMTP_PASSWORD", ""),
            use_tls=os.getenv("SMTP_USE_TLS", "true").lower() == "true",
            use_ssl=os.getenv("SMTP_USE_SSL", "false").lower() == "true",
            from_email=os.getenv("FROM_EMAIL", ""),
            from_name=os.getenv("FROM_NAME", "BookedBarber")
        )


@dataclass
class JWTConfig:
    """JWT authentication configuration"""
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    
    @classmethod
    def from_env(cls) -> 'JWTConfig':
        return cls(
            secret_key=os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production"),
            algorithm=os.getenv("JWT_ALGORITHM", "HS256"),
            access_token_expire_minutes=int(os.getenv("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "30")),
            refresh_token_expire_days=int(os.getenv("JWT_REFRESH_TOKEN_EXPIRE_DAYS", "7"))
        )


@dataclass
class CORSConfig:
    """CORS configuration"""
    allow_origins: List[str] = field(default_factory=lambda: ["http://localhost:3000"])
    allow_credentials: bool = True
    allow_methods: List[str] = field(default_factory=lambda: ["*"])
    allow_headers: List[str] = field(default_factory=lambda: ["*"])
    
    @classmethod
    def from_env(cls) -> 'CORSConfig':
        origins_str = os.getenv("CORS_ALLOW_ORIGINS", "http://localhost:3000")
        origins = [origin.strip() for origin in origins_str.split(",")]
        
        return cls(
            allow_origins=origins,
            allow_credentials=os.getenv("CORS_ALLOW_CREDENTIALS", "true").lower() == "true",
            allow_methods=os.getenv("CORS_ALLOW_METHODS", "*").split(","),
            allow_headers=os.getenv("CORS_ALLOW_HEADERS", "*").split(",")
        )


@dataclass
class LoggingConfig:
    """Logging configuration"""
    level: str = "INFO"
    format: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    file_path: Optional[str] = None
    max_file_size: int = 10 * 1024 * 1024  # 10MB
    backup_count: int = 5
    
    @classmethod
    def from_env(cls) -> 'LoggingConfig':
        return cls(
            level=os.getenv("LOG_LEVEL", "INFO"),
            format=os.getenv("LOG_FORMAT", "%(asctime)s - %(name)s - %(levelname)s - %(message)s"),
            file_path=os.getenv("LOG_FILE_PATH"),
            max_file_size=int(os.getenv("LOG_MAX_FILE_SIZE", str(10 * 1024 * 1024))),
            backup_count=int(os.getenv("LOG_BACKUP_COUNT", "5"))
        )


@dataclass
class SecurityConfig:
    """Security configuration"""
    allowed_hosts: List[str] = field(default_factory=lambda: ["*"])
    rate_limit_per_minute: int = 60
    max_upload_size: int = 10 * 1024 * 1024  # 10MB
    session_timeout_hours: int = 24
    
    @classmethod
    def from_env(cls) -> 'SecurityConfig':
        hosts_str = os.getenv("ALLOWED_HOSTS", "*")
        hosts = [host.strip() for host in hosts_str.split(",")]
        
        return cls(
            allowed_hosts=hosts,
            rate_limit_per_minute=int(os.getenv("RATE_LIMIT_PER_MINUTE", "60")),
            max_upload_size=int(os.getenv("MAX_UPLOAD_SIZE", str(10 * 1024 * 1024))),
            session_timeout_hours=int(os.getenv("SESSION_TIMEOUT_HOURS", "24"))
        )


@dataclass
class AppConfig:
    """Main application configuration"""
    name: str = "BookedBarber V2"
    version: str = "2.0.0"
    environment: Environment = Environment.DEVELOPMENT
    debug: bool = False
    host: str = "0.0.0.0"
    port: int = 8000
    reload: bool = False
    
    # Sub-configurations
    database: DatabaseConfig = field(default_factory=DatabaseConfig.from_env)
    redis: RedisConfig = field(default_factory=RedisConfig.from_env)
    stripe: StripeConfig = field(default_factory=StripeConfig.from_env)
    email: EmailConfig = field(default_factory=EmailConfig.from_env)
    jwt: JWTConfig = field(default_factory=JWTConfig.from_env)
    cors: CORSConfig = field(default_factory=CORSConfig.from_env)
    logging: LoggingConfig = field(default_factory=LoggingConfig.from_env)
    security: SecurityConfig = field(default_factory=SecurityConfig.from_env)
    
    @classmethod
    def from_env(cls) -> 'AppConfig':
        """Create configuration from environment variables"""
        env_str = os.getenv("ENVIRONMENT", "development")
        environment = Environment(env_str) if env_str in Environment.__members__.values() else Environment.DEVELOPMENT
        
        return cls(
            name=os.getenv("APP_NAME", "BookedBarber V2"),
            version=os.getenv("APP_VERSION", "2.0.0"),
            environment=environment,
            debug=os.getenv("DEBUG", "false").lower() == "true",
            host=os.getenv("HOST", "0.0.0.0"),
            port=int(os.getenv("PORT", "8000")),
            reload=os.getenv("RELOAD", "false").lower() == "true",
            database=DatabaseConfig.from_env(),
            redis=RedisConfig.from_env(),
            stripe=StripeConfig.from_env(),
            email=EmailConfig.from_env(),
            jwt=JWTConfig.from_env(),
            cors=CORSConfig.from_env(),
            logging=LoggingConfig.from_env(),
            security=SecurityConfig.from_env()
        )
    
    def is_production(self) -> bool:
        """Check if running in production environment"""
        return self.environment == Environment.PRODUCTION
    
    def is_development(self) -> bool:
        """Check if running in development environment"""
        return self.environment == Environment.DEVELOPMENT
    
    def is_testing(self) -> bool:
        """Check if running in testing environment"""
        return self.environment == Environment.TESTING
    
    def validate(self) -> List[str]:
        """Validate configuration and return list of errors"""
        errors = []
        
        # Database validation
        if not self.database.url:
            errors.append("DATABASE_URL is required")
        
        # JWT validation
        if not self.jwt.secret_key or self.jwt.secret_key == "your-secret-key-change-in-production":
            if self.is_production():
                errors.append("JWT_SECRET_KEY must be set in production")
        
        # Stripe validation (only in production)
        if self.is_production():
            if not self.stripe.secret_key:
                errors.append("STRIPE_SECRET_KEY is required in production")
            if not self.stripe.webhook_secret:
                errors.append("STRIPE_WEBHOOK_SECRET is required in production")
        
        # Email validation (only in production)
        if self.is_production():
            if not self.email.smtp_host:
                errors.append("SMTP_HOST is required in production")
            if not self.email.from_email:
                errors.append("FROM_EMAIL is required in production")
        
        return errors
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert configuration to dictionary (excluding sensitive data)"""
        config_dict = {}
        for key, value in self.__dict__.items():
            if isinstance(value, (str, int, bool, list)):
                if "secret" not in key.lower() and "password" not in key.lower():
                    config_dict[key] = value
            elif hasattr(value, '__dict__'):
                # Handle nested config objects
                nested_dict = {}
                for nested_key, nested_value in value.__dict__.items():
                    if "secret" not in nested_key.lower() and "password" not in nested_key.lower():
                        nested_dict[nested_key] = nested_value
                config_dict[key] = nested_dict
        return config_dict


class ConfigFactory:
    """Factory for creating and managing configuration instances"""
    
    _instance: Optional[AppConfig] = None
    _config_file_path: Optional[Path] = None
    
    @classmethod
    @lru_cache(maxsize=1)
    def get_config(cls, reload: bool = False) -> AppConfig:
        """Get application configuration (singleton)"""
        if cls._instance is None or reload:
            cls._instance = cls._load_config()
        return cls._instance
    
    @classmethod
    def _load_config(cls) -> AppConfig:
        """Load configuration from environment and validate"""
        config = AppConfig.from_env()
        
        # Load from config file if specified
        config_file = os.getenv("CONFIG_FILE")
        if config_file and Path(config_file).exists():
            cls._load_from_file(config, Path(config_file))
        
        # Validate configuration
        errors = config.validate()
        if errors:
            error_msg = "Configuration validation failed:\n" + "\n".join(f"- {error}" for error in errors)
            raise ValueError(error_msg)
        
        return config
    
    @classmethod
    def _load_from_file(cls, config: AppConfig, file_path: Path):
        """Load additional configuration from JSON file"""
        try:
            with open(file_path, 'r') as f:
                file_config = json.load(f)
            
            # Update config with file values
            for key, value in file_config.items():
                if hasattr(config, key):
                    setattr(config, key, value)
                    
        except (json.JSONDecodeError, IOError) as e:
            raise ValueError(f"Failed to load config file {file_path}: {e}")
    
    @classmethod
    def create_for_testing(cls, **overrides) -> AppConfig:
        """Create configuration for testing with overrides"""
        config = AppConfig.from_env()
        config.environment = Environment.TESTING
        config.debug = True
        
        # Apply overrides
        for key, value in overrides.items():
            if hasattr(config, key):
                setattr(config, key, value)
        
        return config
    
    @classmethod
    def reset(cls):
        """Reset cached configuration (useful for testing)"""
        cls._instance = None
        cls.get_config.cache_clear()


# Global configuration instance
def get_settings() -> AppConfig:
    """Get application settings"""
    return ConfigFactory.get_config()


# Environment-specific configuration presets
class ConfigPresets:
    """Pre-configured settings for different environments"""
    
    @staticmethod
    def development() -> Dict[str, str]:
        return {
            "ENVIRONMENT": "development",
            "DEBUG": "true",
            "RELOAD": "true",
            "DATABASE_URL": "sqlite:///./dev.db",
            "CORS_ALLOW_ORIGINS": "http://localhost:3000,http://localhost:3001",
            "LOG_LEVEL": "DEBUG"
        }
    
    @staticmethod
    def testing() -> Dict[str, str]:
        return {
            "ENVIRONMENT": "testing",
            "DEBUG": "true",
            "DATABASE_URL": "sqlite:///./test.db",
            "JWT_SECRET_KEY": "test-secret-key",
            "LOG_LEVEL": "WARNING"
        }
    
    @staticmethod
    def production() -> Dict[str, str]:
        return {
            "ENVIRONMENT": "production",
            "DEBUG": "false",
            "RELOAD": "false",
            "LOG_LEVEL": "INFO"
        }