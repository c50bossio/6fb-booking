"""
Secure secret management utilities for BookedBarber V2.
Provides methods to load secrets from environment variables and external secret stores.
"""

import os
import secrets
from typing import Optional, Dict
import logging

logger = logging.getLogger(__name__)


class SecretManager:
    """
    Secure secret management class for handling sensitive configuration.
    
    Priority order:
    1. Environment variables
    2. AWS Secrets Manager (if configured)
    3. HashiCorp Vault (if configured)
    4. Fallback to None (requires explicit handling)
    """
    
    def __init__(self):
        self.required_secrets = {
            'SECRET_KEY': 'JWT and session encryption key',
            'JWT_SECRET_KEY': 'JWT token signing key',
            'STRIPE_SECRET_KEY': 'Stripe API secret key',
            'STRIPE_PUBLISHABLE_KEY': 'Stripe API publishable key',
            'STRIPE_WEBHOOK_SECRET': 'Stripe webhook signature verification',
        }
        
    def get_secret(self, key: str, required: bool = True) -> Optional[str]:
        """
        Get a secret value with secure fallback mechanisms.
        
        Args:
            key: Secret key name
            required: Whether the secret is required for operation
            
        Returns:
            Secret value or None if not found and not required
            
        Raises:
            ValueError: If required secret is missing
        """
        # Try environment variable first
        value = os.getenv(key)
        
        if value:
            # Validate the secret isn't a placeholder
            if self._is_placeholder(value):
                logger.warning(f"Secret {key} appears to be a placeholder value")
                value = None
            else:
                logger.debug(f"Loaded secret {key} from environment variable")
                return value
        
        # Try AWS Secrets Manager if configured
        value = self._get_from_aws_secrets(key)
        if value:
            logger.debug(f"Loaded secret {key} from AWS Secrets Manager")
            return value
            
        # Try HashiCorp Vault if configured
        value = self._get_from_vault(key)
        if value:
            logger.debug(f"Loaded secret {key} from HashiCorp Vault")
            return value
            
        # Handle missing required secrets
        if required:
            raise ValueError(
                f"Required secret '{key}' not found. "
                f"Set the {key} environment variable or configure external secret store."
            )
            
        logger.warning(f"Optional secret {key} not found")
        return None
    
    def _is_placeholder(self, value: str) -> bool:
        """Check if a value is a placeholder that should be replaced."""
        placeholders = [
            'your-secret-key-here',
            'your-jwt-secret-key-here',
            'placeholder_generate_secure_key_for_production',
            'placeholder_generate_jwt_secret_for_production',
            'required_generate_with_python_secrets_minimum_64_chars',
            'your_test_secret_key_from_stripe_dashboard',
            'your_test_publishable_key_from_stripe_dashboard',
            'your_test_webhook_secret_from_stripe_dashboard',
            'required_sk_live_your_live_secret_key_from_stripe',
            'required_pk_live_your_live_publishable_key_from_stripe',
            'required_whsec_your_live_webhook_secret_from_stripe',
            'required_postgresql_connection_string_here',
            'required_comma_separated_https_domains_only',
            'required_https_frontend_domain',
            'required_https_api_domain',
            'required_sg_production_api_key_from_sendgrid',
            'required_ac_production_account_sid_from_twilio',
            'required_production_auth_token_from_twilio',
            'required_verified_phone_number_from_twilio',
            'change-this',
            'placeholder',
            'example',
            'test-key',
            'sk_test_example',
            'pk_test_example',
        ]
        return any(placeholder in value.lower() for placeholder in placeholders)
    
    def _get_from_aws_secrets(self, key: str) -> Optional[str]:
        """Get secret from AWS Secrets Manager."""
        try:
            import boto3
            import json
            
            # Check if AWS is configured
            region = os.getenv('AWS_REGION', 'us-east-1')
            secret_name = os.getenv('AWS_SECRET_NAME', 'bookedbarber/production')
            
            if not secret_name:
                return None
                
            session = boto3.Session()
            client = session.client(
                service_name='secretsmanager',
                region_name=region
            )
            
            response = client.get_secret_value(SecretId=secret_name)
            secrets_dict = response.get('SecretString', {})
            
            if isinstance(secrets_dict, str):
                secrets_dict = json.loads(secrets_dict)
                
            return secrets_dict.get(key)
            
        except Exception as e:
            logger.debug(f"AWS Secrets Manager not available: {e}")
            return None
    
    def _get_from_vault(self, key: str) -> Optional[str]:
        """Get secret from HashiCorp Vault."""
        try:
            import hvac
            
            vault_url = os.getenv('VAULT_URL')
            vault_token = os.getenv('VAULT_TOKEN')
            vault_path = os.getenv('VAULT_SECRET_PATH', 'secret/bookedbarber')
            
            if not vault_url or not vault_token:
                return None
                
            client = hvac.Client(url=vault_url, token=vault_token)
            
            if not client.is_authenticated():
                logger.warning("Vault authentication failed")
                return None
                
            response = client.secrets.kv.v2.read_secret_version(path=vault_path)
            secrets_dict = response['data']['data']
            
            return secrets_dict.get(key)
            
        except (ImportError, Exception) as e:
            logger.debug(f"HashiCorp Vault not available: {e}")
            return None
    
    def generate_secure_key(self, length: int = 64) -> str:
        """Generate a cryptographically secure key."""
        return secrets.token_urlsafe(length)
    
    def validate_secrets(self) -> Dict[str, bool]:
        """
        Validate all required secrets are available and secure.
        
        Returns:
            Dictionary mapping secret names to validation status
        """
        results = {}
        
        for secret_name, description in self.required_secrets.items():
            try:
                value = self.get_secret(secret_name, required=False)
                if value:
                    results[secret_name] = not self._is_placeholder(value)
                else:
                    results[secret_name] = False
            except Exception as e:
                logger.error(f"Error validating secret {secret_name}: {e}")
                results[secret_name] = False
                
        return results
    
    def get_development_keys(self) -> Dict[str, str]:
        """
        Get or generate development keys for local development.
        These should never be used in production.
        """
        dev_keys = {}
        
        # Generate secure development keys if not set
        dev_keys['SECRET_KEY'] = os.getenv('SECRET_KEY') or self.generate_secure_key()
        dev_keys['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY') or self.generate_secure_key()
        
        # Stripe keys should always come from environment or external store
        dev_keys['STRIPE_SECRET_KEY'] = os.getenv('STRIPE_SECRET_KEY')
        dev_keys['STRIPE_PUBLISHABLE_KEY'] = os.getenv('STRIPE_PUBLISHABLE_KEY')
        dev_keys['STRIPE_WEBHOOK_SECRET'] = os.getenv('STRIPE_WEBHOOK_SECRET')
        
        return dev_keys


# Global instance
secret_manager = SecretManager()


def get_secret(key: str, required: bool = True) -> Optional[str]:
    """Convenience function to get a secret."""
    return secret_manager.get_secret(key, required)


def validate_all_secrets() -> bool:
    """Validate all secrets are properly configured."""
    results = secret_manager.validate_secrets()
    all_valid = all(results.values())
    
    if not all_valid:
        missing = [key for key, valid in results.items() if not valid]
        logger.error(f"Missing or invalid secrets: {missing}")
        
    return all_valid


if __name__ == "__main__":
    # CLI for secret management
    import sys
    
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == "validate":
            results = secret_manager.validate_secrets()
            print("Secret validation results:")
            for key, valid in results.items():
                status = "✓" if valid else "✗"
                print(f"  {status} {key}")
            sys.exit(0 if all(results.values()) else 1)
            
        elif command == "generate":
            key_type = sys.argv[2] if len(sys.argv) > 2 else "general"
            length = 64 if key_type == "jwt" else 32
            print(secret_manager.generate_secure_key(length))
            
        else:
            print("Usage: python secret_management.py [validate|generate [jwt|general]]")
            sys.exit(1)
    else:
        # Default: validate secrets
        results = secret_manager.validate_secrets()
        if not all(results.values()):
            print("❌ Some secrets are missing or invalid")
            sys.exit(1)
        else:
            print("✅ All secrets are properly configured")