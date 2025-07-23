#!/usr/bin/env python3
"""
Environment Key Validation Script for BookedBarber V2
Validates that appropriate keys are used in each environment.
"""

import os
import sys
import re
from pathlib import Path
from typing import Dict, List, Tuple, Optional

class EnvironmentValidator:
    """Validates environment configuration for proper key usage."""
    
    def __init__(self, env_file: str):
        self.env_file = env_file
        self.environment = self._detect_environment()
        self.config = self._load_env_file()
        
    def _detect_environment(self) -> str:
        """Detect environment from filename or content."""
        if 'staging' in self.env_file.lower():
            return 'staging'
        elif 'production' in self.env_file.lower():
            return 'production'
        elif 'development' in self.env_file.lower() or 'dev' in self.env_file.lower():
            return 'development'
        
        # Check ENVIRONMENT variable in file
        try:
            with open(self.env_file, 'r') as f:
                content = f.read()
                env_match = re.search(r'^ENVIRONMENT=(.+)$', content, re.MULTILINE)
                if env_match:
                    return env_match.group(1).strip()
        except FileNotFoundError:
            pass
            
        return 'unknown'
    
    def _load_env_file(self) -> Dict[str, str]:
        """Load environment variables from file."""
        config = {}
        try:
            with open(self.env_file, 'r') as f:
                for line_num, line in enumerate(f, 1):
                    line = line.strip()
                    if line and not line.startswith('#') and '=' in line:
                        key, value = line.split('=', 1)
                        config[key.strip()] = value.strip()
        except FileNotFoundError:
            print(f"❌ Environment file not found: {self.env_file}")
            return {}
        
        return config
    
    def validate_stripe_keys(self) -> List[str]:
        """Validate Stripe key configuration."""
        errors = []
        
        stripe_secret = self.config.get('STRIPE_SECRET_KEY', '')
        stripe_publishable = self.config.get('STRIPE_PUBLISHABLE_KEY', '')
        stripe_webhook = self.config.get('STRIPE_WEBHOOK_SECRET', '')
        
        if self.environment == 'production':
            # Production must use live keys
            if not stripe_secret.startswith('sk_live_'):
                errors.append("❌ Production MUST use live Stripe secret key (sk_live_*)")
            if not stripe_publishable.startswith('pk_live_'):
                errors.append("❌ Production MUST use live Stripe publishable key (pk_live_*)")
            if stripe_webhook.startswith('whsec_test_'):
                errors.append("❌ Production MUST NOT use test webhook secret")
                
        elif self.environment in ['staging', 'development']:
            # Staging/Development should use test keys
            if not stripe_secret.startswith('sk_test_'):
                errors.append(f"⚠️  {self.environment.title()} should use test Stripe secret key (sk_test_*)")
            if not stripe_publishable.startswith('pk_test_'):
                errors.append(f"⚠️  {self.environment.title()} should use test Stripe publishable key (pk_test_*)")
        
        return errors
    
    def validate_oauth_configuration(self) -> List[str]:
        """Validate OAuth app configuration."""
        errors = []
        
        google_client_id = self.config.get('GOOGLE_CLIENT_ID', '')
        meta_client_id = self.config.get('META_CLIENT_ID', '')
        
        if self.environment == 'production':
            # Production should have separate OAuth apps
            if 'staging' in google_client_id.lower() or 'test' in google_client_id.lower():
                errors.append("❌ Production MUST use production Google OAuth app")
            if 'staging' in meta_client_id.lower() or 'test' in meta_client_id.lower():
                errors.append("❌ Production MUST use production Meta OAuth app")
                
        elif self.environment == 'staging':
            # Staging should have separate staging OAuth apps
            if 'production' in google_client_id.lower():
                errors.append("⚠️  Staging should use staging-specific Google OAuth app")
            if 'production' in meta_client_id.lower():
                errors.append("⚠️  Staging should use staging-specific Meta OAuth app")
        
        return errors
    
    def validate_email_configuration(self) -> List[str]:
        """Validate email service configuration."""
        errors = []
        
        sendgrid_key = self.config.get('SENDGRID_API_KEY', '')
        from_email = self.config.get('SENDGRID_FROM_EMAIL', '')
        
        if self.environment == 'production':
            if 'test' in sendgrid_key.lower() or 'staging' in sendgrid_key.lower():
                errors.append("❌ Production MUST use live SendGrid API key")
            if 'staging' in from_email.lower() or 'test' in from_email.lower():
                errors.append("❌ Production MUST use production email address")
                
        elif self.environment == 'staging':
            if 'staging' not in from_email.lower() and from_email:
                errors.append("⚠️  Staging should use staging-specific from email")
                
        return errors
    
    def validate_sms_configuration(self) -> List[str]:
        """Validate SMS service configuration."""
        errors = []
        
        twilio_sid = self.config.get('TWILIO_ACCOUNT_SID', '')
        twilio_phone = self.config.get('TWILIO_PHONE_NUMBER', '')
        
        if self.environment == 'production':
            if twilio_sid.startswith('ACtest') or 'test' in twilio_sid.lower():
                errors.append("❌ Production MUST use live Twilio account SID")
            if twilio_phone == '+15005550006':  # Twilio test number
                errors.append("❌ Production MUST use real Twilio phone number")
                
        elif self.environment in ['staging', 'development']:
            if not twilio_sid.startswith('ACtest') and twilio_sid:
                errors.append(f"⚠️  {self.environment.title()} should use Twilio test credentials")
                
        return errors
    
    def validate_security_keys(self) -> List[str]:
        """Validate security key configuration."""
        errors = []
        
        secret_key = self.config.get('SECRET_KEY', '')
        jwt_secret = self.config.get('JWT_SECRET_KEY', '')
        
        # Check for placeholder values
        if 'PLACEHOLDER' in secret_key.upper() or 'GENERATE' in secret_key.upper():
            errors.append("❌ SECRET_KEY contains placeholder - generate secure key")
        if 'PLACEHOLDER' in jwt_secret.upper() or 'GENERATE' in jwt_secret.upper():
            errors.append("❌ JWT_SECRET_KEY contains placeholder - generate secure key")
            
        # Check key strength
        if len(secret_key) < 32:
            errors.append("❌ SECRET_KEY must be at least 32 characters")
        if len(jwt_secret) < 32:
            errors.append("❌ JWT_SECRET_KEY must be at least 32 characters")
            
        # Production keys should be different from common patterns
        if self.environment == 'production':
            weak_patterns = ['password', '123456', 'secret', 'key']
            for pattern in weak_patterns:
                if pattern in secret_key.lower():
                    errors.append(f"❌ SECRET_KEY contains weak pattern: {pattern}")
                if pattern in jwt_secret.lower():
                    errors.append(f"❌ JWT_SECRET_KEY contains weak pattern: {pattern}")
                    
        return errors
    
    def validate_domain_configuration(self) -> List[str]:
        """Validate domain and CORS configuration."""
        errors = []
        
        allowed_origins = self.config.get('ALLOWED_ORIGINS', '')
        frontend_url = self.config.get('FRONTEND_URL', '')
        
        if self.environment == 'production':
            # Production should only allow HTTPS domains
            if 'localhost' in allowed_origins or 'http://' in allowed_origins:
                errors.append("❌ Production MUST NOT allow localhost or HTTP origins")
            if not frontend_url.startswith('https://'):
                errors.append("❌ Production frontend URL must use HTTPS")
                
        elif self.environment in ['staging', 'development']:
            # Development can use localhost
            if self.environment == 'development' and 'localhost' not in allowed_origins:
                errors.append("⚠️  Development should include localhost in allowed origins")
                
        return errors
    
    def validate_tracking_configuration(self) -> List[str]:
        """Validate analytics and tracking configuration."""
        errors = []
        
        ga_measurement_id = self.config.get('GTM_MEASUREMENT_ID', '')
        meta_pixel_id = self.config.get('META_PIXEL_ID', '')
        
        if self.environment == 'production':
            if 'test' in ga_measurement_id.lower() or 'staging' in ga_measurement_id.lower():
                errors.append("❌ Production MUST use production Google Analytics measurement ID")
            if 'test' in meta_pixel_id.lower() or 'staging' in meta_pixel_id.lower():
                errors.append("❌ Production MUST use production Meta Pixel ID")
                
        elif self.environment == 'staging':
            if 'production' in ga_measurement_id.lower():
                errors.append("⚠️  Staging should use staging-specific Google Analytics ID")
            if 'production' in meta_pixel_id.lower():
                errors.append("⚠️  Staging should use staging-specific Meta Pixel ID")
                
        return errors
    
    def validate_database_configuration(self) -> List[str]:
        """Validate database configuration."""
        errors = []
        
        database_url = self.config.get('DATABASE_URL', '')
        
        if self.environment == 'production':
            if database_url.startswith('sqlite:'):
                errors.append("❌ Production MUST use PostgreSQL, not SQLite")
            if 'localhost' in database_url:
                errors.append("❌ Production MUST NOT use localhost database")
            if not database_url.startswith('postgresql://'):
                errors.append("❌ Production database URL must use PostgreSQL")
                
        elif self.environment == 'staging':
            # Staging can use SQLite for local testing or PostgreSQL for cloud
            pass
            
        return errors
    
    def validate_all(self) -> Tuple[List[str], List[str]]:
        """Run all validations and return errors and warnings."""
        all_errors = []
        all_warnings = []
        
        validators = [
            self.validate_stripe_keys,
            self.validate_oauth_configuration,
            self.validate_email_configuration,
            self.validate_sms_configuration,
            self.validate_security_keys,
            self.validate_domain_configuration,
            self.validate_tracking_configuration,
            self.validate_database_configuration,
        ]
        
        for validator in validators:
            results = validator()
            for result in results:
                if result.startswith('❌'):
                    all_errors.append(result)
                elif result.startswith('⚠️'):
                    all_warnings.append(result)
                    
        return all_errors, all_warnings
    
    def generate_secure_keys(self) -> Dict[str, str]:
        """Generate secure keys for environment."""
        import secrets
        
        return {
            'SECRET_KEY': secrets.token_urlsafe(64),
            'JWT_SECRET_KEY': secrets.token_urlsafe(64),
        }

def main():
    """Main validation function."""
    if len(sys.argv) != 2:
        print("Usage: python validate-environment-keys.py <env-file>")
        print("Example: python validate-environment-keys.py backend-v2/.env.production")
        sys.exit(1)
    
    env_file = sys.argv[1]
    
    if not os.path.exists(env_file):
        print(f"❌ Environment file not found: {env_file}")
        sys.exit(1)
    
    validator = EnvironmentValidator(env_file)
    
    print(f"🔍 Validating environment configuration...")
    print(f"📁 File: {env_file}")
    print(f"🌍 Environment: {validator.environment}")
    print()
    
    errors, warnings = validator.validate_all()
    
    if warnings:
        print("⚠️  WARNINGS:")
        for warning in warnings:
            print(f"  {warning}")
        print()
    
    if errors:
        print("❌ ERRORS:")
        for error in errors:
            print(f"  {error}")
        print()
        print("🚨 Environment validation FAILED. Fix errors before deployment.")
        sys.exit(1)
    else:
        print("✅ Environment validation PASSED.")
        if warnings:
            print("⚠️  Please review warnings above.")
        else:
            print("🎉 No issues found - environment is properly configured!")
    
    # Offer to generate secure keys if needed
    if 'PLACEHOLDER' in str(validator.config.values()).upper():
        print()
        response = input("🔑 Generate secure keys? (y/N): ")
        if response.lower() == 'y':
            secure_keys = validator.generate_secure_keys()
            print("\n🔐 Generated secure keys:")
            for key, value in secure_keys.items():
                print(f"{key}={value}")
            print("\n⚠️  Store these keys securely and update your environment file.")

if __name__ == '__main__':
    main()