"""
Environment-specific configuration management for 6FB Booking Platform
Handles configuration differences between development, staging, and production
"""

import os
import logging
from typing import Dict, Any, Optional
from functools import lru_cache

from .settings import settings

logger = logging.getLogger(__name__)


class EnvironmentConfig:
    """Environment-specific configuration manager"""
    
    def __init__(self):
        self.environment = settings.ENVIRONMENT
        self.is_development = settings.is_development
        self.is_production = settings.is_production
        
    @property
    def database_config(self) -> Dict[str, Any]:
        """Get database configuration based on environment"""
        base_config = {
            "echo": not self.is_production,
            "echo_pool": not self.is_production,
        }
        
        if settings.database_type == "postgresql":
            # Production PostgreSQL configuration
            if self.is_production:
                base_config.update({
                    "pool_size": settings.DB_POOL_SIZE,
                    "max_overflow": settings.DB_MAX_OVERFLOW,
                    "pool_timeout": settings.DB_POOL_TIMEOUT,
                    "pool_recycle": settings.DB_POOL_RECYCLE,
                    "pool_pre_ping": settings.DB_POOL_PRE_PING,
                    "connect_args": {
                        "sslmode": "require",
                        "connect_timeout": 10,
                        "application_name": "6fb_booking_prod",
                    }
                })
            else:
                # Development/Staging PostgreSQL configuration
                base_config.update({
                    "pool_size": 5,
                    "max_overflow": 10,
                    "pool_timeout": 30,
                    "pool_recycle": 3600,
                    "pool_pre_ping": True,
                    "connect_args": {
                        "sslmode": "prefer",
                        "connect_timeout": 10,
                        "application_name": f"6fb_booking_{self.environment}",
                    }
                })
        elif settings.database_type == "sqlite":
            # SQLite configuration (development only)
            base_config.update({
                "connect_args": {
                    "check_same_thread": False,
                    "timeout": 20,
                    "isolation_level": None,
                },
                "pool_pre_ping": True,
            })
            
            if self.is_production:
                logger.warning("SQLite database detected in production - consider using PostgreSQL")
        
        return base_config
    
    @property
    def logging_config(self) -> Dict[str, Any]:
        """Get logging configuration based on environment"""
        if self.is_production:
            return {
                "level": logging.INFO,
                "format": "json",
                "handlers": ["console", "file", "error_file"],
                "structured": True,
                "retention_days": 30,
            }
        else:
            return {
                "level": logging.DEBUG,
                "format": "text",
                "handlers": ["console", "file"],
                "structured": False,
                "retention_days": 7,
            }
    
    @property
    def security_config(self) -> Dict[str, Any]:
        """Get security configuration based on environment"""
        base_config = {
            "rate_limiting_enabled": True,
            "security_headers_enabled": settings.SECURITY_HEADERS_ENABLED,
            "csp_enabled": settings.CONTENT_SECURITY_POLICY_ENABLED,
        }
        
        if self.is_production:
            base_config.update({
                "rate_limit_per_minute": settings.RATE_LIMIT_PER_MINUTE,
                "rate_limit_burst": settings.RATE_LIMIT_BURST,
                "strict_transport_security": True,
                "content_type_nosniff": True,
                "x_frame_options": "DENY",
                "x_content_type_options": "nosniff",
                "referrer_policy": "strict-origin-when-cross-origin",
            })
        else:
            base_config.update({
                "rate_limit_per_minute": 120,  # More lenient for development
                "rate_limit_burst": 200,
                "strict_transport_security": False,
                "content_type_nosniff": True,
                "x_frame_options": "SAMEORIGIN",
                "x_content_type_options": "nosniff",
                "referrer_policy": "same-origin",
            })
        
        return base_config
    
    @property
    def cors_config(self) -> Dict[str, Any]:
        """Get CORS configuration based on environment"""
        if self.is_production:
            return {
                "allow_origins": settings.ALLOWED_ORIGINS,
                "allow_credentials": True,
                "allow_methods": ["GET", "POST", "PUT", "DELETE", "PATCH"],
                "allow_headers": [
                    "Authorization",
                    "Content-Type",
                    "X-Requested-With",
                    "Accept",
                    "Origin",
                ],
                "expose_headers": ["X-Total-Count"],
                "max_age": 86400,  # 24 hours
            }
        else:
            return {
                "allow_origins": ["*"],  # Allow all origins in development
                "allow_credentials": True,
                "allow_methods": ["*"],
                "allow_headers": ["*"],
                "expose_headers": ["*"],
                "max_age": 600,  # 10 minutes
            }
    
    @property
    def cache_config(self) -> Dict[str, Any]:
        """Get cache configuration based on environment"""
        if self.is_production:
            return {
                "enabled": True,
                "backend": "redis",
                "redis_url": settings.REDIS_URL,
                "default_timeout": 3600,  # 1 hour
                "key_prefix": "6fb_prod:",
                "serializer": "json",
            }
        else:
            return {
                "enabled": True,
                "backend": "memory",  # Use in-memory cache for development
                "default_timeout": 300,  # 5 minutes
                "key_prefix": f"6fb_{self.environment}:",
                "serializer": "pickle",
            }
    
    @property
    def monitoring_config(self) -> Dict[str, Any]:
        """Get monitoring configuration based on environment"""
        base_config = {
            "sentry_enabled": bool(settings.SENTRY_DSN),
            "metrics_enabled": True,
            "health_checks_enabled": True,
        }
        
        if self.is_production:
            base_config.update({
                "sentry_dsn": settings.SENTRY_DSN,
                "sentry_traces_sample_rate": settings.SENTRY_TRACES_SAMPLE_RATE,
                "sentry_environment": "production",
                "performance_monitoring": True,
                "error_reporting": True,
                "uptime_monitoring": True,
            })
        else:
            base_config.update({
                "sentry_dsn": settings.SENTRY_DSN,
                "sentry_traces_sample_rate": 1.0,  # Sample all traces in development
                "sentry_environment": self.environment,
                "performance_monitoring": False,
                "error_reporting": bool(settings.SENTRY_DSN),
                "uptime_monitoring": False,
            })
        
        return base_config
    
    @property
    def worker_config(self) -> Dict[str, Any]:
        """Get worker configuration based on environment"""
        if self.is_production:
            return {
                "workers": settings.WORKERS,
                "worker_class": settings.WORKER_CLASS,
                "worker_connections": settings.WORKER_CONNECTIONS,
                "max_requests": settings.MAX_REQUESTS,
                "max_requests_jitter": settings.MAX_REQUESTS_JITTER,
                "timeout": settings.REQUEST_TIMEOUT,
                "keep_alive": settings.KEEP_ALIVE,
                "preload_app": True,
                "worker_tmp_dir": "/tmp",
            }
        else:
            return {
                "workers": 1,
                "worker_class": "uvicorn.workers.UvicornWorker",
                "worker_connections": 100,
                "max_requests": 1000,
                "max_requests_jitter": 100,
                "timeout": 60,
                "keep_alive": 2,
                "preload_app": False,
                "reload": True,  # Enable reload in development
            }
    
    @property
    def feature_flags(self) -> Dict[str, bool]:
        """Get feature flags based on environment"""
        return {
            "google_calendar_sync": settings.FEATURE_GOOGLE_CALENDAR_SYNC,
            "payment_splits": settings.FEATURE_PAYMENT_SPLITS,
            "analytics_dashboard": settings.FEATURE_ANALYTICS_DASHBOARD,
            "automated_reminders": settings.FEATURE_AUTOMATED_REMINDERS,
            "debug_toolbar": not self.is_production,
            "api_docs": not self.is_production,  # Disable API docs in production
            "admin_panel": True,
            "backup_system": settings.BACKUP_ENABLED,
        }
    
    @property
    def email_config(self) -> Dict[str, Any]:
        """Get email configuration based on environment"""
        base_config = {
            "enabled": settings.email_enabled,
            "from_name": settings.EMAIL_FROM_NAME,
            "from_email": settings.EMAIL_FROM_ADDRESS,
        }
        
        if settings.SENDGRID_API_KEY:
            base_config.update({
                "backend": "sendgrid",
                "api_key": settings.SENDGRID_API_KEY,
                "sandbox_mode": not self.is_production,
            })
        elif settings.MAILGUN_API_KEY:
            base_config.update({
                "backend": "mailgun",
                "api_key": settings.MAILGUN_API_KEY,
                "domain": settings.MAILGUN_DOMAIN,
            })
        elif settings.SMTP_USERNAME:
            base_config.update({
                "backend": "smtp",
                "host": settings.SMTP_HOST,
                "port": settings.SMTP_PORT,
                "username": settings.SMTP_USERNAME,
                "password": settings.SMTP_PASSWORD,
                "use_tls": True,
            })
        else:
            base_config.update({
                "backend": "console",  # Console output for development
                "enabled": not self.is_production,
            })
        
        return base_config
    
    def get_all_config(self) -> Dict[str, Any]:
        """Get all environment-specific configuration"""
        return {
            "environment": self.environment,
            "database": self.database_config,
            "logging": self.logging_config,
            "security": self.security_config,
            "cors": self.cors_config,
            "cache": self.cache_config,
            "monitoring": self.monitoring_config,
            "workers": self.worker_config,
            "features": self.feature_flags,
            "email": self.email_config,
        }
    
    def validate_environment_requirements(self) -> bool:
        """Validate environment-specific requirements"""
        errors = []
        warnings = []
        
        # Production-specific validations
        if self.is_production:
            if settings.database_type == "sqlite":
                errors.append("SQLite database not suitable for production")
            
            if not settings.payment_enabled:
                warnings.append("Payment processing not configured")
                
            if not settings.email_enabled:
                warnings.append("Email service not configured")
                
            if not settings.monitoring_enabled:
                warnings.append("Monitoring (Sentry) not configured")
                
            if settings.DEBUG:
                errors.append("DEBUG mode must be disabled in production")
        
        # Development-specific validations
        elif self.is_development:
            if not settings.email_enabled:
                logger.info("Email service not configured - using console output")
        
        # Log warnings
        for warning in warnings:
            logger.warning(f"Environment warning: {warning}")
        
        # Check for errors
        if errors:
            for error in errors:
                logger.error(f"Environment error: {error}")
            return False
        
        logger.info(f"Environment validation passed for {self.environment}")
        return True


@lru_cache()
def get_environment_config() -> EnvironmentConfig:
    """Get cached environment configuration instance"""
    return EnvironmentConfig()


# Global environment configuration instance
env_config = get_environment_config()


# Convenience functions for common configurations
def get_database_config() -> Dict[str, Any]:
    """Get database configuration for current environment"""
    return env_config.database_config


def get_cors_config() -> Dict[str, Any]:
    """Get CORS configuration for current environment"""
    return env_config.cors_config


def get_security_config() -> Dict[str, Any]:
    """Get security configuration for current environment"""
    return env_config.security_config


def is_feature_enabled(feature: str) -> bool:
    """Check if a feature is enabled in current environment"""
    return env_config.feature_flags.get(feature, False)