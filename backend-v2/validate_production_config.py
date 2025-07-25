#!/usr/bin/env python3
"""
Production Environment Configuration Validator
==============================================

This script validates that all critical environment variables are properly
configured for production deployment of BookedBarber V2.

Usage:
    python validate_production_config.py

Exit codes:
    0: All configurations are production-ready
    1: Critical configurations are missing or insecure
"""

import os
import sys
import secrets
from typing import Dict


class ProductionConfigValidator:
    """Validates production environment configuration."""
    
    def __init__(self):
        self.errors = []
        self.warnings = []
        
    def validate_environment_basics(self) -> None:
        """Validate basic environment settings."""
        environment = os.getenv('ENVIRONMENT', '')
        debug = os.getenv('DEBUG', 'true').lower()
        log_level = os.getenv('LOG_LEVEL', 'DEBUG')
        
        if environment != 'production':
            self.errors.append("ENVIRONMENT must be set to 'production'")
            
        if debug != 'false':
            self.errors.append("DEBUG must be set to 'false' in production")
            
        if log_level not in ['WARNING', 'ERROR', 'CRITICAL']:
            self.warnings.append(f"LOG_LEVEL should be WARNING/ERROR/CRITICAL, not '{log_level}'")
    
    def validate_security_keys(self) -> None:
        """Validate cryptographic keys are secure."""
        secret_key = os.getenv('SECRET_KEY', '')
        jwt_secret = os.getenv('JWT_SECRET_KEY', '')
        
        if not secret_key:
            self.errors.append("SECRET_KEY is required")
        elif len(secret_key) < 32:
            self.errors.append("SECRET_KEY must be at least 32 characters long")
        elif secret_key.startswith(('dev-', 'test-', 'PLACEHOLDER')):
            self.errors.append("SECRET_KEY cannot be a development/test value")
            
        if not jwt_secret:
            self.errors.append("JWT_SECRET_KEY is required")
        elif len(jwt_secret) < 32:
            self.errors.append("JWT_SECRET_KEY must be at least 32 characters long")
        elif jwt_secret.startswith(('dev-', 'test-', 'PLACEHOLDER')):
            self.errors.append("JWT_SECRET_KEY cannot be a development/test value")
    
    def validate_database_config(self) -> None:
        """Validate database configuration."""
        database_url = os.getenv('DATABASE_URL', '')
        
        if not database_url:
            self.errors.append("DATABASE_URL is required")
        elif database_url.startswith('sqlite:'):
            self.errors.append("Production must use PostgreSQL, not SQLite")
        elif not database_url.startswith('postgresql:'):
            self.warnings.append("DATABASE_URL should use PostgreSQL for production")
            
        # Check pool settings
        pool_size = os.getenv('DB_POOL_SIZE', '5')
        try:
            if int(pool_size) < 10:
                self.warnings.append("DB_POOL_SIZE should be at least 10 for production load")
        except ValueError:
            self.warnings.append("DB_POOL_SIZE must be a valid integer")
    
    def validate_external_services(self) -> None:
        """Validate external service configurations."""
        # Stripe
        stripe_key = os.getenv('STRIPE_SECRET_KEY', '')
        if not stripe_key:
            self.warnings.append("STRIPE_SECRET_KEY not configured")
        elif stripe_key.startswith('sk_test_'):
            self.errors.append("STRIPE_SECRET_KEY must be a live key (sk_live_...), not test key")
        elif not stripe_key.startswith('sk_live_'):
            self.warnings.append("STRIPE_SECRET_KEY should start with 'sk_live_' for production")
            
        # SendGrid
        sendgrid_key = os.getenv('SENDGRID_API_KEY', '')
        if not sendgrid_key:
            self.warnings.append("SENDGRID_API_KEY not configured")
        elif sendgrid_key.startswith(('dev-', 'test-')):
            self.errors.append("SENDGRID_API_KEY cannot be a development/test value")
            
        # Sentry
        sentry_dsn = os.getenv('SENTRY_DSN', '')
        sentry_env = os.getenv('SENTRY_ENVIRONMENT', '')
        if not sentry_dsn:
            self.warnings.append("SENTRY_DSN not configured - error tracking disabled")
        else:
            if not sentry_dsn.startswith('https://'):
                self.errors.append("SENTRY_DSN must be a valid HTTPS URL")
        
        if sentry_env != 'production':
            self.warnings.append("SENTRY_ENVIRONMENT should be 'production'")
    
    def validate_cors_settings(self) -> None:
        """Validate CORS configuration."""
        cors_origins = os.getenv('CORS_ORIGINS', '')
        
        if not cors_origins:
            self.warnings.append("CORS_ORIGINS not configured")
        elif 'localhost' in cors_origins or '127.0.0.1' in cors_origins:
            self.errors.append("CORS_ORIGINS cannot include localhost in production")
        elif not all(origin.startswith('https://') for origin in cors_origins.split(',')):
            self.errors.append("All CORS_ORIGINS must use HTTPS in production")
    
    def generate_secure_keys(self) -> Dict[str, str]:
        """Generate cryptographically secure keys."""
        return {
            'SECRET_KEY': secrets.token_urlsafe(64),
            'JWT_SECRET_KEY': secrets.token_urlsafe(64)
        }
    
    def run_validation(self) -> bool:
        """Run all validations and return success status."""
        print("🔍 BookedBarber V2 - Production Configuration Validator")
        print("=" * 60)
        
        self.validate_environment_basics()
        self.validate_security_keys()
        self.validate_database_config()
        self.validate_external_services()
        self.validate_cors_settings()
        
        # Report results
        if self.errors:
            print("❌ CRITICAL ERRORS (must fix before production):")
            for error in self.errors:
                print(f"   • {error}")
            print()
        
        if self.warnings:
            print("⚠️  WARNINGS (recommended to fix):")
            for warning in self.warnings:
                print(f"   • {warning}")
            print()
        
        if not self.errors and not self.warnings:
            print("✅ All production configurations are valid!")
            print("🚀 Ready for production deployment!")
            return True
        elif not self.errors:
            print("✅ Critical configurations are valid")
            print("⚠️  Consider addressing warnings before production deployment")
            return True
        else:
            print("❌ Production deployment blocked by critical errors")
            print("\n🔧 To generate secure keys, run:")
            keys = self.generate_secure_keys()
            for key, value in keys.items():
                print(f"   export {key}='{value}'")
            return False


def main():
    """Main entry point."""
    validator = ProductionConfigValidator()
    success = validator.run_validation()
    
    if not success:
        sys.exit(1)
    
    print("\n🎉 Production configuration validation completed successfully!")
    sys.exit(0)


if __name__ == "__main__":
    main()