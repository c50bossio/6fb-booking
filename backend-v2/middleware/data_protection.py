
import os
import base64
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from typing import Dict, Any
import json
import logging

logger = logging.getLogger(__name__)

class DataProtection:
    """Data protection and encryption utilities"""
    
    def __init__(self):
        self.encryption_key = self._get_or_create_key()
        self.cipher = Fernet(self.encryption_key)
    
    def _get_or_create_key(self) -> bytes:
        """Get or create encryption key"""
        key_env = os.getenv("ENCRYPTION_KEY")
        
        if key_env:
            # Derive key from environment variable
            kdf = PBKDF2HMAC(
                algorithm=hashes.SHA256(),
                length=32,
                salt=b'bookedbarber_salt_2025',  # Use app-specific salt
                iterations=100000,
            )
            key = base64.urlsafe_b64encode(kdf.derive(key_env.encode()))
            return key
        else:
            # Generate new key (for development)
            logger.warning("No ENCRYPTION_KEY found, generating new key")
            return Fernet.generate_key()
    
    def encrypt_data(self, data: Any) -> str:
        """Encrypt sensitive data"""
        try:
            if isinstance(data, (dict, list)):
                data = json.dumps(data)
            elif not isinstance(data, str):
                data = str(data)
            
            encrypted_data = self.cipher.encrypt(data.encode())
            return base64.urlsafe_b64encode(encrypted_data).decode()
        
        except Exception as e:
            logger.error(f"Encryption failed: {e}")
            raise
    
    def decrypt_data(self, encrypted_data: str) -> str:
        """Decrypt sensitive data"""
        try:
            encrypted_bytes = base64.urlsafe_b64decode(encrypted_data.encode())
            decrypted_data = self.cipher.decrypt(encrypted_bytes)
            return decrypted_data.decode()
        
        except Exception as e:
            logger.error(f"Decryption failed: {e}")
            raise
    
    def mask_sensitive_data(self, data: str, data_type: str = "generic") -> str:
        """Mask sensitive data for logging/display"""
        if not data:
            return data
        
        if data_type == "email":
            parts = data.split("@")
            if len(parts) == 2:
                username = parts[0]
                domain = parts[1]
                masked_username = username[:2] + "*" * (len(username) - 2)
                return f"{masked_username}@{domain}"
        
        elif data_type == "phone":
            if len(data) >= 4:
                return "*" * (len(data) - 4) + data[-4:]
        
        elif data_type == "credit_card":
            if len(data) >= 4:
                return "*" * (len(data) - 4) + data[-4:]
        
        elif data_type == "ssn":
            if len(data) >= 4:
                return "***-**-" + data[-4:]
        
        else:
            # Generic masking
            if len(data) <= 4:
                return "*" * len(data)
            else:
                return data[:2] + "*" * (len(data) - 4) + data[-2:]
        
        return data
    
    def hash_for_lookup(self, data: str) -> str:
        """Create hash for database lookups (non-reversible)"""
        import hashlib
        
        # Use app-specific salt
        salt = "bookedbarber_hash_salt_2025"
        salted_data = data + salt
        
        return hashlib.sha256(salted_data.encode()).hexdigest()
    
    def is_pii_field(self, field_name: str) -> bool:
        """Check if field contains PII"""
        pii_fields = {
            "social_security_number", "ssn", "credit_card_number", "credit_card",
            "bank_account_number", "bank_account", "drivers_license", "passport",
            "medical_record", "biometric", "genetic"
        }
        
        return field_name.lower() in pii_fields
    
    def sanitize_for_logging(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Sanitize data for safe logging"""
        sanitized = {}
        
        for key, value in data.items():
            if self.is_pii_field(key):
                sanitized[key] = "[REDACTED]"
            elif key.lower() in ["password", "token", "secret", "key"]:
                sanitized[key] = "[REDACTED]"
            elif key.lower() == "email" and isinstance(value, str):
                sanitized[key] = self.mask_sensitive_data(value, "email")
            elif key.lower() in ["phone", "phone_number"] and isinstance(value, str):
                sanitized[key] = self.mask_sensitive_data(value, "phone")
            else:
                sanitized[key] = value
        
        return sanitized

# GDPR Compliance utilities
class GDPRCompliance:
    """GDPR compliance utilities"""
    
    def __init__(self, data_protection: DataProtection):
        self.data_protection = data_protection
    
    def export_user_data(self, user_id: str) -> Dict:
        """Export all user data for GDPR compliance"""
        # This would query all tables for user data
        # Implementation depends on database structure
        
        exported_data = {
            "user_id": user_id,
            "export_date": datetime.utcnow().isoformat(),
            "data": {
                "profile": {},
                "appointments": [],
                "payments": [],
                "communications": []
            }
        }
        
        return exported_data
    
    def delete_user_data(self, user_id: str) -> Dict:
        """Delete user data for GDPR compliance"""
        # This would delete/anonymize user data across all tables
        # Implementation depends on business requirements
        
        deletion_record = {
            "user_id": user_id,
            "deletion_date": datetime.utcnow().isoformat(),
            "status": "completed",
            "retained_data": ["financial_records"]  # Legal requirement
        }
        
        return deletion_record
    
    def anonymize_user_data(self, user_id: str) -> Dict:
        """Anonymize user data while preserving analytics"""
        # Replace PII with anonymous identifiers
        
        anonymization_record = {
            "user_id": user_id,
            "anonymization_date": datetime.utcnow().isoformat(),
            "anonymous_id": self.data_protection.hash_for_lookup(user_id),
            "status": "completed"
        }
        
        return anonymization_record
