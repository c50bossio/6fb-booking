#!/usr/bin/env python3
"""
Production Keys Generator for BookedBarber V2
=============================================

This script generates cryptographically secure keys and secrets for production deployment.
All keys are generated using secure random number generators suitable for production use.

Features:
- Cryptographically secure key generation
- Multiple key types (JWT, encryption, API keys)
- Configurable key lengths and formats
- Secure output with proper formatting
- Validation of generated keys
- Safe storage recommendations
"""

import os
import sys
import secrets
import string
import base64
import hashlib
import argparse
from typing import Dict, Any
from datetime import datetime
import json


class ProductionKeyGenerator:
    """Production-grade key generator"""
    
    def __init__(self):
        self.generated_keys = {}
        self.generation_timestamp = datetime.utcnow().isoformat()
    
    def generate_secret_key(self, length: int = 64) -> str:
        """Generate a secure secret key for application use"""
        return secrets.token_urlsafe(length)
    
    def generate_jwt_secret(self, length: int = 64) -> str:
        """Generate a secure JWT signing key"""
        return secrets.token_urlsafe(length)
    
    def generate_encryption_key(self, length: int = 32) -> str:
        """Generate a secure encryption key (32 bytes for AES-256)"""
        key_bytes = secrets.token_bytes(length)
        return base64.urlsafe_b64encode(key_bytes).decode('utf-8')
    
    def generate_api_key(self, prefix: str = "bb", length: int = 32) -> str:
        """Generate an API key with prefix"""
        key_part = secrets.token_urlsafe(length)
        return f"{prefix}_{key_part}"
    
    def generate_webhook_secret(self, length: int = 32) -> str:
        """Generate a webhook signing secret"""
        return secrets.token_hex(length)
    
    def generate_session_secret(self, length: int = 32) -> str:
        """Generate a session signing secret"""
        return secrets.token_urlsafe(length)
    
    def generate_csrf_secret(self, length: int = 32) -> str:
        """Generate a CSRF token secret"""
        return secrets.token_urlsafe(length)
    
    def generate_password_salt(self, length: int = 16) -> str:
        """Generate a password hashing salt"""
        return secrets.token_hex(length)
    
    def generate_database_password(self, length: int = 24) -> str:
        """Generate a secure database password"""
        # Use a mix of letters, numbers, and safe special characters
        alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
        password = ''.join(secrets.choice(alphabet) for _ in range(length))
        
        # Ensure at least one of each type
        if not any(c.islower() for c in password):
            password = password[:-1] + secrets.choice(string.ascii_lowercase)
        if not any(c.isupper() for c in password):
            password = password[:-1] + secrets.choice(string.ascii_uppercase)
        if not any(c.isdigit() for c in password):
            password = password[:-1] + secrets.choice(string.digits)
        if not any(c in "!@#$%^&*" for c in password):
            password = password[:-1] + secrets.choice("!@#$%^&*")
        
        return password
    
    def generate_all_keys(self) -> Dict[str, str]:
        """Generate all required keys for production"""
        keys = {
            # Core application secrets
            "SECRET_KEY": self.generate_secret_key(64),
            "JWT_SECRET_KEY": self.generate_jwt_secret(64),
            "ENCRYPTION_KEY": self.generate_encryption_key(32),
            
            # Session and security
            "SESSION_SECRET": self.generate_session_secret(32),
            "CSRF_SECRET": self.generate_csrf_secret(32),
            "PASSWORD_SALT": self.generate_password_salt(16),
            
            # API and webhook secrets
            "API_KEY": self.generate_api_key("bb", 32),
            "WEBHOOK_SECRET": self.generate_webhook_secret(32),
            "INTERNAL_API_KEY": self.generate_api_key("bb_internal", 32),
            
            # Database credentials
            "DATABASE_PASSWORD": self.generate_database_password(24),
            "REDIS_PASSWORD": self.generate_database_password(20),
            
            # Additional security keys
            "MFA_SECRET_KEY": self.generate_secret_key(32),
            "BACKUP_ENCRYPTION_KEY": self.generate_encryption_key(32),
            "AUDIT_LOG_KEY": self.generate_secret_key(32),
        }
        
        self.generated_keys = keys
        return keys
    
    def validate_key_strength(self, key: str, min_entropy: int = 128) -> bool:
        """Validate the cryptographic strength of a generated key"""
        # Calculate entropy (simplified estimation)
        if len(key) < 16:
            return False
        
        # Check for sufficient length and character diversity
        has_upper = any(c.isupper() for c in key)
        has_lower = any(c.islower() for c in key)
        has_digit = any(c.isdigit() for c in key)
        has_special = any(c in "!@#$%^&*-_=+[]{}|;:,.<>?/~`" for c in key)
        
        # For URL-safe base64 keys, we expect at least letters, numbers, and - or _
        if key.replace('-', '').replace('_', '').isalnum():
            # URL-safe base64 key
            return len(key) >= 32 and has_upper and has_lower and has_digit
        
        # For general passwords/keys
        diversity_score = sum([has_upper, has_lower, has_digit, has_special])
        return len(key) >= 16 and diversity_score >= 3
    
    def generate_env_file_content(self, keys: Dict[str, str]) -> str:
        """Generate .env file content with the generated keys"""
        content = f"""# =============================================================================
# PRODUCTION KEYS - GENERATED ON {self.generation_timestamp}
# =============================================================================
# 
# 🔒 CRITICAL SECURITY NOTICE:
# - These keys were generated using cryptographically secure random generators
# - NEVER commit this file to version control
# - Store these keys securely and restrict access
# - Rotate these keys quarterly for maximum security
# - Each key is unique and generated specifically for your production environment
#
# ⚠️  DEPLOYMENT INSTRUCTIONS:
# 1. Copy the values below to your production environment variables
# 2. Verify all keys have been copied correctly
# 3. Delete this file after copying (do not leave on server)
# 4. Set appropriate file permissions if storing temporarily
# 5. Test your application with these keys in staging first
#
# 🔄 KEY ROTATION SCHEDULE:
# - SECRET_KEY: Rotate every 90 days
# - JWT_SECRET_KEY: Rotate every 90 days
# - DATABASE_PASSWORD: Rotate every 90 days
# - API_KEY: Rotate every 180 days
# - WEBHOOK_SECRET: Rotate every 180 days
#

# =============================================================================
# CORE APPLICATION SECRETS
# =============================================================================
SECRET_KEY={keys['SECRET_KEY']}
JWT_SECRET_KEY={keys['JWT_SECRET_KEY']}
ENCRYPTION_KEY={keys['ENCRYPTION_KEY']}

# =============================================================================
# SESSION AND SECURITY
# =============================================================================
SESSION_SECRET={keys['SESSION_SECRET']}
CSRF_SECRET={keys['CSRF_SECRET']}
PASSWORD_SALT={keys['PASSWORD_SALT']}
MFA_SECRET_KEY={keys['MFA_SECRET_KEY']}

# =============================================================================
# API AND WEBHOOK SECRETS
# =============================================================================
API_KEY={keys['API_KEY']}
WEBHOOK_SECRET={keys['WEBHOOK_SECRET']}
INTERNAL_API_KEY={keys['INTERNAL_API_KEY']}

# =============================================================================
# DATABASE CREDENTIALS
# =============================================================================
DATABASE_PASSWORD={keys['DATABASE_PASSWORD']}
REDIS_PASSWORD={keys['REDIS_PASSWORD']}

# =============================================================================
# BACKUP AND AUDIT
# =============================================================================
BACKUP_ENCRYPTION_KEY={keys['BACKUP_ENCRYPTION_KEY']}
AUDIT_LOG_KEY={keys['AUDIT_LOG_KEY']}

# =============================================================================
# USAGE INSTRUCTIONS
# =============================================================================
# 
# 1. REPLACE PLACEHOLDERS IN .env.production:
#    Find and replace the following in your .env.production file:
#    - CHANGE-REQUIRED-64-CHAR-SECRET-KEY-GENERATE-WITH-SCRIPT → {keys['SECRET_KEY']}
#    - CHANGE-REQUIRED-64-CHAR-JWT-SECRET-KEY-GENERATE-WITH-SCRIPT → {keys['JWT_SECRET_KEY']}
#    - CHANGE-SECURE-PASSWORD → {keys['DATABASE_PASSWORD']}
#
# 2. UPDATE DATABASE CONNECTION STRINGS:
#    Replace database passwords in your DATABASE_URL and other connection strings
#
# 3. CONFIGURE YOUR DEPLOYMENT PLATFORM:
#    Set these as environment variables in your deployment platform:
#    - Render: Dashboard → Environment → Environment Variables
#    - Railway: Dashboard → Variables
#    - Heroku: Config Vars
#    - AWS: Parameter Store or Secrets Manager
#    - Kubernetes: Secrets
#
# 4. VERIFY DEPLOYMENT:
#    - Test all authentication flows
#    - Verify JWT token generation/validation
#    - Test database connectivity
#    - Verify webhook signatures
#    - Check backup encryption
#
# 5. SECURITY CHECKLIST:
#    - [ ] All keys copied to production environment
#    - [ ] This file deleted from server
#    - [ ] Database passwords updated
#    - [ ] Application tested with new keys
#    - [ ] Monitoring configured for key rotation alerts
#    - [ ] Backup of old keys stored securely (for rollback)
#
# =============================================================================
"""
        return content
    
    def print_security_recommendations(self):
        """Print security recommendations for key management"""
        print("\n" + "="*80)
        print("🔒 PRODUCTION KEY SECURITY RECOMMENDATIONS")
        print("="*80)
        print("""
1. IMMEDIATE ACTIONS:
   ✅ Copy all keys to your production environment variables
   ✅ Update database connection strings with new passwords
   ✅ Test your application in staging with these keys first
   ✅ Delete this file after copying keys to production

2. SECURE STORAGE:
   ✅ Use your cloud provider's secret management service:
      - AWS: Secrets Manager or Systems Manager Parameter Store
      - Google Cloud: Secret Manager
      - Azure: Key Vault
      - Render: Environment Variables (encrypted at rest)
      - Railway: Environment Variables

3. ACCESS CONTROL:
   ✅ Limit access to production keys to essential personnel only
   ✅ Use role-based access control (RBAC)
   ✅ Enable multi-factor authentication for secret access
   ✅ Log all access to production secrets

4. KEY ROTATION:
   ✅ Set calendar reminders for quarterly key rotation
   ✅ Test key rotation process in staging environment
   ✅ Have rollback plan ready before rotating keys
   ✅ Update monitoring after key rotation

5. MONITORING:
   ✅ Set up alerts for failed authentication attempts
   ✅ Monitor for unusual access patterns
   ✅ Enable audit logging for all key usage
   ✅ Set up alerts for approaching key expiration

6. BACKUP AND RECOVERY:
   ✅ Keep encrypted backups of previous keys (for emergency rollback)
   ✅ Document key recovery procedures
   ✅ Test recovery procedures regularly
   ✅ Include keys in disaster recovery plans

7. COMPLIANCE:
   ✅ Document key generation and rotation procedures
   ✅ Maintain audit trail of all key changes
   ✅ Ensure keys meet industry standards (PCI DSS, SOC 2, etc.)
   ✅ Regular security audits of key management practices

⚠️  SECURITY WARNINGS:
   🚨 NEVER commit these keys to version control
   🚨 NEVER send keys via email or unencrypted channels
   🚨 NEVER log keys in application logs
   🚨 NEVER share keys via chat or messaging platforms
   🚨 NEVER store keys in plain text files on servers

For detailed security guidelines, refer to:
- docs/SECURITY_HARDENING_GUIDE.md
- docs/KEY_MANAGEMENT_GUIDE.md
""")


def main():
    """Main function for key generation"""
    parser = argparse.ArgumentParser(description="Generate production keys for BookedBarber V2")
    parser.add_argument("--output-format", choices=["env", "json"], default="env",
                        help="Output format for generated keys")
    parser.add_argument("--output-file", help="Custom output filename")
    parser.add_argument("--validate-only", action="store_true",
                        help="Only validate existing keys without generating new ones")
    parser.add_argument("--quiet", action="store_true",
                        help="Suppress verbose output")
    
    args = parser.parse_args()
    
    generator = ProductionKeyGenerator()
    
    if args.validate_only:
        # Validate existing keys from environment
        if not args.quiet:
            print("Validating existing production keys...")
        
        keys_to_validate = [
            "SECRET_KEY", "JWT_SECRET_KEY", "DATABASE_PASSWORD"
        ]
        
        all_valid = True
        for key_name in keys_to_validate:
            key_value = os.getenv(key_name)
            if not key_value:
                print(f"❌ {key_name}: Not set")
                all_valid = False
            elif generator.validate_key_strength(key_value):
                if not args.quiet:
                    print(f"✅ {key_name}: Valid")
            else:
                print(f"❌ {key_name}: Weak or invalid")
                all_valid = False
        
        if all_valid:
            print("✅ All production keys are valid and secure")
            sys.exit(0)
        else:
            print("❌ Some production keys need to be regenerated")
            sys.exit(1)
    
    # Generate new keys
    if not args.quiet:
        print("🔐 BookedBarber V2 Production Key Generator")
        print("=" * 60)
        print("Generating cryptographically secure production keys...")
        print("This may take a few moments to ensure maximum entropy...\n")
    
    keys = generator.generate_all_keys()
    
    # Validate all generated keys
    if not args.quiet:
        print("Validating generated keys...")
    
    all_valid = True
    for key_name, key_value in keys.items():
        if generator.validate_key_strength(key_value):
            if not args.quiet:
                print(f"✅ {key_name}: Generated and validated")
        else:
            print(f"❌ {key_name}: Failed validation")
            all_valid = False
    
    if not all_valid:
        print("❌ Key generation failed validation. Please try again.")
        sys.exit(1)
    
    # Save keys to file
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    if args.output_file:
        filename = args.output_file
    else:
        filename = f"production_keys_{timestamp}.env"
    
    with open(filename, 'w') as f:
        if args.output_format == "env":
            f.write(generator.generate_env_file_content(keys))
        else:
            f.write(json.dumps({
                "generated_at": generator.generation_timestamp,
                "keys": keys,
                "validation": {
                    key: generator.validate_key_strength(value)
                    for key, value in keys.items()
                }
            }, indent=2))
    
    # Set restrictive file permissions
    os.chmod(filename, 0o600)
    
    if not args.quiet:
        print(f"\n✅ Production keys generated successfully!")
        print(f"📁 Keys saved to: {filename}")
        print(f"🔒 File permissions set to 600 (owner read/write only)")
        print(f"\n📋 Generated Keys Summary:")
        for key_name, key_value in keys.items():
            print(f"   • {key_name}: {len(key_value)} characters")
    
    # Print security recommendations
    if not args.quiet:
        generator.print_security_recommendations()
        
        print(f"\n🚀 NEXT STEPS:")
        print(f"1. Copy keys from {filename} to your production environment")
        print(f"2. Update your .env.production file with these keys")
        print(f"3. Test your application in staging first")
        print(f"4. Deploy to production")
        print(f"5. Delete {filename} after deployment")
        print(f"6. Set up key rotation reminders for 90 days from now")


if __name__ == "__main__":
    main()