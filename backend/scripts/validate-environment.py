#!/usr/bin/env python3
"""
Environment Validation Script for 6FB Booking Platform
Validates all configuration settings and dependencies for deployment
"""

import sys
import os
import logging
from typing import List, Dict, Any
from urllib.parse import urlparse

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config.settings import settings, validate_startup_requirements
from config.environment import env_config

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)


class EnvironmentValidator:
    """Comprehensive environment validation"""

    def __init__(self):
        self.errors: List[str] = []
        self.warnings: List[str] = []
        self.info: List[str] = []

    def validate_all(self) -> bool:
        """Run all validation checks"""
        print("🔍 Starting Environment Validation for 6FB Booking Platform")
        print("=" * 60)
        
        try:
            self.validate_core_settings()
            self.validate_database_config()
            self.validate_security_settings()
            self.validate_payment_config()
            self.validate_email_config()
            self.validate_monitoring_config()
            self.validate_performance_settings()
            self.validate_feature_flags()
            self.validate_external_dependencies()
            
            self.print_results()
            return len(self.errors) == 0
            
        except Exception as e:
            self.errors.append(f"Validation script error: {str(e)}")
            self.print_results()
            return False

    def validate_core_settings(self):
        """Validate core application settings"""
        print("\n📋 Validating Core Settings...")
        
        # Environment
        if settings.ENVIRONMENT not in ["development", "staging", "production"]:
            self.errors.append(f"Invalid ENVIRONMENT: {settings.ENVIRONMENT}")
        else:
            self.info.append(f"Environment: {settings.ENVIRONMENT}")
        
        # Secret keys
        try:
            secret_key = settings.SECRET_KEY.get_secret_value()
            if len(secret_key) < 32:
                self.errors.append("SECRET_KEY must be at least 32 characters long")
            else:
                self.info.append("SECRET_KEY: ✅ Valid length")
        except Exception as e:
            self.errors.append(f"SECRET_KEY validation failed: {e}")
        
        try:
            jwt_key = settings.JWT_SECRET_KEY.get_secret_value()
            if len(jwt_key) < 32:
                self.errors.append("JWT_SECRET_KEY must be at least 32 characters long")
            else:
                self.info.append("JWT_SECRET_KEY: ✅ Valid length")
        except Exception as e:
            self.errors.append(f"JWT_SECRET_KEY validation failed: {e}")

    def validate_database_config(self):
        """Validate database configuration"""
        print("\n🗄️ Validating Database Configuration...")
        
        db_url = settings.DATABASE_URL
        self.info.append(f"Database type: {settings.database_type}")
        
        # Parse database URL
        try:
            parsed = urlparse(db_url)
            self.info.append(f"Database scheme: {parsed.scheme}")
            
            if settings.is_production and "sqlite" in db_url.lower():
                self.errors.append("SQLite database not recommended for production")
            
            # Validate PostgreSQL settings
            if "postgresql" in db_url or "postgres" in db_url:
                if settings.DB_POOL_SIZE < 5:
                    self.warnings.append("DB_POOL_SIZE is very low, consider increasing")
                if settings.DB_MAX_OVERFLOW < 10:
                    self.warnings.append("DB_MAX_OVERFLOW is low, consider increasing")
                
                self.info.append(f"Pool size: {settings.DB_POOL_SIZE}")
                self.info.append(f"Max overflow: {settings.DB_MAX_OVERFLOW}")
                
        except Exception as e:
            self.errors.append(f"Invalid DATABASE_URL format: {e}")

    def validate_security_settings(self):
        """Validate security configuration"""
        print("\n🔒 Validating Security Settings...")
        
        # Rate limiting
        if settings.RATE_LIMIT_PER_MINUTE < 10:
            self.warnings.append("Rate limit is very low, may affect user experience")
        elif settings.RATE_LIMIT_PER_MINUTE > 1000:
            self.warnings.append("Rate limit is very high, may not prevent abuse")
        
        self.info.append(f"Rate limit: {settings.RATE_LIMIT_PER_MINUTE}/minute")
        
        # Security headers
        if settings.SECURITY_HEADERS_ENABLED:
            self.info.append("Security headers: ✅ Enabled")
        else:
            self.warnings.append("Security headers disabled")
        
        # CORS
        if settings.is_production and "*" in settings.ALLOWED_ORIGINS:
            self.errors.append("Wildcard CORS origins not allowed in production")
        
        self.info.append(f"CORS origins: {len(settings.ALLOWED_ORIGINS)} configured")

    def validate_payment_config(self):
        """Validate payment processing configuration"""
        print("\n💳 Validating Payment Configuration...")
        
        if settings.payment_enabled:
            # Stripe configuration
            if settings.STRIPE_SECRET_KEY:
                if settings.is_production and not settings.STRIPE_SECRET_KEY.startswith("sk_live_"):
                    self.warnings.append("Using test Stripe key in production")
                elif not settings.is_production and settings.STRIPE_SECRET_KEY.startswith("sk_live_"):
                    self.warnings.append("Using live Stripe key in development")
                
                self.info.append("Stripe: ✅ Configured")
            
            if settings.STRIPE_WEBHOOK_SECRET:
                self.info.append("Stripe webhooks: ✅ Configured")
            else:
                self.warnings.append("Stripe webhook secret not configured")
            
            # Square configuration (optional)
            if settings.SQUARE_ACCESS_TOKEN:
                self.info.append("Square: ✅ Configured")
            
        else:
            if settings.is_production:
                self.errors.append("Payment processing must be configured for production")
            else:
                self.warnings.append("Payment processing not configured")

    def validate_email_config(self):
        """Validate email service configuration"""
        print("\n📧 Validating Email Configuration...")
        
        if settings.email_enabled:
            if settings.SENDGRID_API_KEY:
                self.info.append("SendGrid: ✅ Configured")
            elif settings.MAILGUN_API_KEY and settings.MAILGUN_DOMAIN:
                self.info.append("Mailgun: ✅ Configured")
            elif settings.SMTP_USERNAME and settings.SMTP_PASSWORD:
                self.info.append("SMTP: ✅ Configured")
            
            if not settings.EMAIL_FROM_ADDRESS:
                self.warnings.append("FROM_EMAIL not set")
        else:
            if settings.is_production:
                self.warnings.append("No email service configured for production")
            else:
                self.info.append("Email service not configured (development mode)")

    def validate_monitoring_config(self):
        """Validate monitoring and observability configuration"""
        print("\n📊 Validating Monitoring Configuration...")
        
        if settings.monitoring_enabled:
            self.info.append("Sentry: ✅ Configured")
            
            if settings.SENTRY_TRACES_SAMPLE_RATE > 1.0:
                self.errors.append("Sentry traces sample rate cannot exceed 1.0")
            elif settings.is_production and settings.SENTRY_TRACES_SAMPLE_RATE > 0.2:
                self.warnings.append("High Sentry traces sample rate in production")
        else:
            if settings.is_production:
                self.warnings.append("Monitoring (Sentry) not configured for production")
            else:
                self.info.append("Monitoring not configured (development mode)")
        
        # Logging configuration
        if settings.LOG_LEVEL == "DEBUG" and settings.is_production:
            self.warnings.append("DEBUG log level in production may impact performance")
        
        self.info.append(f"Log level: {settings.LOG_LEVEL}")
        self.info.append(f"Log format: {settings.LOG_FORMAT}")

    def validate_performance_settings(self):
        """Validate performance and scalability settings"""
        print("\n⚡ Validating Performance Settings...")
        
        # Worker configuration
        if settings.WORKERS < 1:
            self.errors.append("WORKERS must be at least 1")
        elif settings.WORKERS > 16:
            self.warnings.append("High number of workers may cause resource issues")
        
        self.info.append(f"Workers: {settings.WORKERS}")
        
        # Request limits
        if settings.MAX_REQUESTS < 1000:
            self.warnings.append("MAX_REQUESTS is low, workers will restart frequently")
        
        self.info.append(f"Max requests per worker: {settings.MAX_REQUESTS}")
        
        # Timeouts
        if settings.REQUEST_TIMEOUT < 10:
            self.warnings.append("REQUEST_TIMEOUT is very low")
        elif settings.REQUEST_TIMEOUT > 120:
            self.warnings.append("REQUEST_TIMEOUT is very high")
        
        self.info.append(f"Request timeout: {settings.REQUEST_TIMEOUT}s")

    def validate_feature_flags(self):
        """Validate feature flag configuration"""
        print("\n🚩 Validating Feature Flags...")
        
        features = env_config.feature_flags
        enabled_features = [name for name, enabled in features.items() if enabled]
        disabled_features = [name for name, enabled in features.items() if not enabled]
        
        self.info.append(f"Enabled features: {', '.join(enabled_features)}")
        
        if disabled_features:
            self.info.append(f"Disabled features: {', '.join(disabled_features)}")

    def validate_external_dependencies(self):
        """Validate external service dependencies"""
        print("\n🌐 Validating External Dependencies...")
        
        # Redis configuration
        if settings.REDIS_URL:
            self.info.append("Redis: ✅ Configured")
            
            if settings.REDIS_PASSWORD:
                self.info.append("Redis authentication: ✅ Enabled")
            else:
                self.warnings.append("Redis authentication not configured")
        else:
            self.warnings.append("Redis not configured")
        
        # Google integrations
        if settings.google_integrations_enabled:
            self.info.append("Google Calendar: ✅ Configured")
        else:
            self.info.append("Google integrations not configured")

    def print_results(self):
        """Print validation results"""
        print("\n" + "=" * 60)
        print("📋 VALIDATION RESULTS")
        print("=" * 60)
        
        # Print info messages
        if self.info:
            print("\n✅ CONFIGURATION INFO:")
            for msg in self.info:
                print(f"   ℹ️  {msg}")
        
        # Print warnings
        if self.warnings:
            print("\n⚠️  WARNINGS:")
            for msg in self.warnings:
                print(f"   ⚠️  {msg}")
        
        # Print errors
        if self.errors:
            print("\n❌ ERRORS:")
            for msg in self.errors:
                print(f"   ❌ {msg}")
        
        # Summary
        print(f"\n📊 SUMMARY:")
        print(f"   ✅ Info: {len(self.info)}")
        print(f"   ⚠️  Warnings: {len(self.warnings)}")
        print(f"   ❌ Errors: {len(self.errors)}")
        
        if self.errors:
            print(f"\n❌ VALIDATION FAILED - {len(self.errors)} error(s) must be fixed")
            return False
        elif self.warnings:
            print(f"\n⚠️  VALIDATION PASSED WITH WARNINGS - Review {len(self.warnings)} warning(s)")
            return True
        else:
            print(f"\n✅ VALIDATION PASSED - All checks successful!")
            return True


def main():
    """Main validation function"""
    validator = EnvironmentValidator()
    
    try:
        # Run startup requirements validation first
        print("🔧 Running startup requirements validation...")
        validate_startup_requirements()
        print("✅ Startup requirements validation passed")
        
        # Run comprehensive validation
        success = validator.validate_all()
        
        # Exit with appropriate code
        sys.exit(0 if success else 1)
        
    except Exception as e:
        print(f"\n❌ VALIDATION SCRIPT ERROR: {str(e)}")
        sys.exit(1)


if __name__ == "__main__":
    main()