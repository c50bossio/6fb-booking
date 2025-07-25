#!/usr/bin/env python3
"""
Environment Configuration Validator for 6FB Booking Platform v2
Validates environment variables and configuration for deployment readiness
"""

import os
import sys
import json
from typing import Dict, Any
from datetime import datetime
import re

class EnvironmentValidator:
    def __init__(self):
        self.errors = []
        self.warnings = []
        self.info = []
        self.environment = os.getenv('ENVIRONMENT', 'development')
        
    def validate_all(self) -> Dict[str, Any]:
        """Run all validation checks"""
        print(f"🔍 Validating environment configuration for: {self.environment}")
        print("=" * 60)
        
        # Run all validation methods
        self._validate_core_settings()
        self._validate_database()
        self._validate_security()
        self._validate_stripe()
        self._validate_cors()
        self._validate_external_services()
        self._validate_deployment_platform()
        
        return self._generate_report()
    
    def _validate_core_settings(self):
        """Validate core application settings"""
        print("📋 Validating core settings...")
        
        # Environment validation
        env = os.getenv('ENVIRONMENT', 'development')
        if env not in ['development', 'staging', 'production']:
            self.errors.append(f"Invalid ENVIRONMENT value: {env}")
        
        # App name
        app_name = os.getenv('APP_NAME', '')
        if not app_name:
            self.warnings.append("APP_NAME not set")
        
        # Log level
        log_level = os.getenv('LOG_LEVEL', 'INFO')
        if log_level not in ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL']:
            self.warnings.append(f"Invalid LOG_LEVEL: {log_level}")
        
        print("  ✅ Core settings validated")
    
    def _validate_database(self):
        """Validate database configuration"""
        print("🗄️  Validating database configuration...")
        
        database_url = os.getenv('DATABASE_URL', '')
        if not database_url:
            self.errors.append("DATABASE_URL is required")
            return
        
        # Check database type
        if database_url.startswith('sqlite'):
            if self.environment == 'production':
                self.warnings.append("SQLite not recommended for production")
            self.info.append("Using SQLite database")
        elif database_url.startswith('postgresql'):
            self.info.append("Using PostgreSQL database")
            # Validate PostgreSQL URL format
            if not self._validate_postgresql_url(database_url):
                self.errors.append("Invalid PostgreSQL URL format")
        else:
            self.warnings.append(f"Unknown database type: {database_url[:20]}...")
        
        print("  ✅ Database configuration validated")
    
    def _validate_security(self):
        """Validate security configuration"""
        print("🔐 Validating security settings...")
        
        # Secret key validation
        secret_key = os.getenv('SECRET_KEY', '')
        if not secret_key:
            self.errors.append("SECRET_KEY is required")
        elif secret_key == 'your-secret-key-here' or len(secret_key) < 32:
            self.errors.append("SECRET_KEY must be at least 32 characters and not default value")
        elif secret_key == 'your-secret-key-here-generate-with-openssl-rand-hex-32':
            self.errors.append("SECRET_KEY is still the template default")
        
        # JWT settings
        jwt_algorithm = os.getenv('JWT_ALGORITHM', 'HS256')
        if jwt_algorithm not in ['HS256', 'HS384', 'HS512']:
            self.warnings.append(f"Unusual JWT algorithm: {jwt_algorithm}")
        
        # Production security checks
        if self.environment == 'production':
            ssl_redirect = os.getenv('SECURE_SSL_REDIRECT', 'false').lower()
            if ssl_redirect != 'true':
                self.warnings.append("SECURE_SSL_REDIRECT should be true in production")
        
        print("  ✅ Security settings validated")
    
    def _validate_stripe(self):
        """Validate Stripe configuration"""
        print("💳 Validating Stripe configuration...")
        
        secret_key = os.getenv('STRIPE_SECRET_KEY', '')
        publishable_key = os.getenv('STRIPE_PUBLISHABLE_KEY', '')
        webhook_secret = os.getenv('STRIPE_WEBHOOK_SECRET', '')
        
        if not secret_key:
            self.errors.append("STRIPE_SECRET_KEY is required")
        else:
            # Check for test vs live keys
            if secret_key.startswith('sk_test_'):
                if self.environment == 'production':
                    self.errors.append("Using test Stripe key in production")
                else:
                    self.info.append("Using Stripe test key")
            elif secret_key.startswith('sk_live_'):
                if self.environment != 'production':
                    self.warnings.append("Using live Stripe key in non-production")
                else:
                    self.info.append("Using Stripe live key")
            elif secret_key == 'sk_test_4eC39HqLyjWDarjtT1zdp7dc':
                self.warnings.append("Using Stripe's example test key")
        
        if not publishable_key:
            self.warnings.append("STRIPE_PUBLISHABLE_KEY not set")
        
        if not webhook_secret:
            self.warnings.append("STRIPE_WEBHOOK_SECRET not set")
        
        print("  ✅ Stripe configuration validated")
    
    def _validate_cors(self):
        """Validate CORS configuration"""
        print("🌐 Validating CORS configuration...")
        
        allowed_origins = os.getenv('ALLOWED_ORIGINS', '')
        if not allowed_origins:
            self.warnings.append("ALLOWED_ORIGINS not set")
        else:
            origins = [origin.strip() for origin in allowed_origins.split(',')]
            
            for origin in origins:
                if origin == 'http://localhost:3000' and self.environment == 'production':
                    self.warnings.append("localhost origin found in production CORS")
                elif not origin.startswith(('http://', 'https://')):
                    self.errors.append(f"Invalid CORS origin format: {origin}")
        
        print("  ✅ CORS configuration validated")
    
    def _validate_external_services(self):
        """Validate external service configurations"""
        print("🔗 Validating external services...")
        
        # Email service
        sendgrid_key = os.getenv('SENDGRID_API_KEY', '')
        smtp_server = os.getenv('SMTP_SERVER', '')
        
        if not sendgrid_key and not smtp_server:
            self.warnings.append("No email service configured")
        elif sendgrid_key and not sendgrid_key.startswith('SG.'):
            self.warnings.append("Invalid SendGrid API key format")
        
        # SMS service
        twilio_sid = os.getenv('TWILIO_ACCOUNT_SID', '')
        twilio_token = os.getenv('TWILIO_AUTH_TOKEN', '')
        
        if not twilio_sid and not twilio_token:
            self.warnings.append("No SMS service configured")
        elif twilio_sid and not twilio_sid.startswith('AC'):
            self.warnings.append("Invalid Twilio Account SID format")
        
        # Google Calendar
        google_client_id = os.getenv('GOOGLE_CLIENT_ID', '')
        google_client_secret = os.getenv('GOOGLE_CLIENT_SECRET', '')
        
        if not google_client_id and not google_client_secret:
            self.info.append("Google Calendar integration not configured")
        elif bool(google_client_id) != bool(google_client_secret):
            self.errors.append("Both GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET required")
        
        # Redis
        redis_url = os.getenv('REDIS_URL', '')
        if not redis_url:
            self.warnings.append("REDIS_URL not configured")
        
        print("  ✅ External services validated")
    
    def _validate_deployment_platform(self):
        """Validate deployment platform specific settings"""
        print("🚀 Validating deployment platform...")
        
        # Check for Railway
        if os.getenv('RAILWAY_PUBLIC_DOMAIN'):
            self.info.append("Railway deployment detected")
            
        # Check for Render
        if os.getenv('RENDER_SERVICE_ID') or os.getenv('RENDER_EXTERNAL_URL'):
            self.info.append("Render deployment detected")
            
        # Check for Vercel
        if os.getenv('VERCEL_URL'):
            self.info.append("Vercel deployment detected")
            
        # Port configuration
        port = os.getenv('PORT', '8000')
        try:
            port_int = int(port)
            if port_int < 1 or port_int > 65535:
                self.errors.append(f"Invalid PORT value: {port}")
        except ValueError:
            self.errors.append(f"PORT must be a number: {port}")
        
        print("  ✅ Deployment platform validated")
    
    def _validate_postgresql_url(self, url: str) -> bool:
        """Validate PostgreSQL URL format"""
        pattern = r'^postgresql://[^:]+:[^@]+@[^:]+:\d+/[^/]+$'
        return bool(re.match(pattern, url))
    
    def _generate_report(self) -> Dict[str, Any]:
        """Generate validation report"""
        print("\n" + "=" * 60)
        print("📊 VALIDATION REPORT")
        print("=" * 60)
        
        # Summary
        total_issues = len(self.errors) + len(self.warnings)
        if len(self.errors) == 0:
            if len(self.warnings) == 0:
                print("✅ PASSED: Configuration is ready for deployment")
                status = "PASSED"
            else:
                print("⚠️  PASSED WITH WARNINGS: Configuration is deployable but has warnings")
                status = "WARNING"
        else:
            print("❌ FAILED: Configuration has critical errors that must be fixed")
            status = "FAILED"
        
        print(f"\nErrors: {len(self.errors)}")
        print(f"Warnings: {len(self.warnings)}")
        print(f"Info: {len(self.info)}")
        
        # Detailed report
        if self.errors:
            print("\n❌ ERRORS (Must fix before deployment):")
            for i, error in enumerate(self.errors, 1):
                print(f"  {i}. {error}")
        
        if self.warnings:
            print("\n⚠️  WARNINGS (Recommended to fix):")
            for i, warning in enumerate(self.warnings, 1):
                print(f"  {i}. {warning}")
        
        if self.info:
            print("\nℹ️  INFORMATION:")
            for i, info in enumerate(self.info, 1):
                print(f"  {i}. {info}")
        
        # Return structured report
        report = {
            'status': status,
            'environment': self.environment,
            'timestamp': datetime.now().isoformat(),
            'summary': {
                'errors': len(self.errors),
                'warnings': len(self.warnings),
                'info': len(self.info),
                'total_issues': total_issues
            },
            'errors': self.errors,
            'warnings': self.warnings,
            'info': self.info,
            'deployable': len(self.errors) == 0
        }
        
        return report

def main():
    """Main validation function"""
    print("🔧 6FB Booking Platform v2 - Environment Validator")
    print("=" * 60)
    
    # Load environment from .env file if it exists
    env_file = '.env'
    if os.path.exists(env_file):
        print(f"📁 Loading environment from {env_file}")
        with open(env_file, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    os.environ[key] = value
    
    # Run validation
    validator = EnvironmentValidator()
    report = validator.validate_all()
    
    # Save report to file
    report_file = f"environment_validation_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(report_file, 'w') as f:
        json.dump(report, f, indent=2)
    
    print(f"\n📄 Full report saved to: {report_file}")
    
    # Exit with appropriate code
    if report['status'] == 'FAILED':
        sys.exit(1)
    elif report['status'] == 'WARNING':
        sys.exit(2)
    else:
        sys.exit(0)

if __name__ == '__main__':
    main()