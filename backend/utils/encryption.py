"""
Field-level encryption utilities for sensitive customer data
Implements AES encryption for PII data at rest
"""

import os
import base64
import hashlib
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from sqlalchemy import TypeDecorator, String, Text
from typing import Optional
import logging

logger = logging.getLogger(__name__)

class EncryptionManager:
    """Manages encryption/decryption of sensitive data"""
    
    def __init__(self):
        self._fernet = None
        self._initialize_encryption()
    
    def _initialize_encryption(self):
        """Initialize encryption key from environment or generate new one"""
        # Get encryption key from environment
        encryption_key = os.getenv('DATA_ENCRYPTION_KEY')
        
        if not encryption_key:
            # Generate a key derived from a master password
            master_password = os.getenv('MASTER_PASSWORD')
            if not master_password:
                raise ValueError(
                    "Either DATA_ENCRYPTION_KEY or MASTER_PASSWORD must be set. "
                    "Generate with: python3 -c 'from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())'"
                )
            
            # Derive key from master password
            salt = b'6fb_booking_salt_2025'  # Use consistent salt
            kdf = PBKDF2HMAC(
                algorithm=hashes.SHA256(),
                length=32,
                salt=salt,
                iterations=100000,
            )
            key = base64.urlsafe_b64encode(kdf.derive(master_password.encode()))
            self._fernet = Fernet(key)
        else:
            # Use provided encryption key
            self._fernet = Fernet(encryption_key.encode())
    
    def encrypt(self, data: str) -> str:
        """Encrypt a string value"""
        if not data:
            return data
        
        try:
            encrypted_data = self._fernet.encrypt(data.encode())
            return base64.urlsafe_b64encode(encrypted_data).decode()
        except Exception as e:
            logger.error(f"Encryption failed: {e}")
            raise ValueError("Failed to encrypt data")
    
    def decrypt(self, encrypted_data: str) -> str:
        """Decrypt a string value"""
        if not encrypted_data:
            return encrypted_data
        
        try:
            decoded_data = base64.urlsafe_b64decode(encrypted_data.encode())
            decrypted_data = self._fernet.decrypt(decoded_data)
            return decrypted_data.decode()
        except Exception as e:
            logger.error(f"Decryption failed: {e}")
            # Return empty string instead of raising error to handle corrupted data gracefully
            return ""
    
    def hash_for_search(self, data: str) -> str:
        """Create searchable hash of data (one-way)"""
        if not data:
            return data
        
        # Create a hash that can be used for searching while preserving privacy
        return hashlib.sha256(data.lower().encode()).hexdigest()[:16]

# Global encryption manager instance (lazy-loaded)
_encryption_manager = None

def get_encryption_manager() -> EncryptionManager:
    """Get the global encryption manager instance (lazy initialization)"""
    global _encryption_manager
    if _encryption_manager is None:
        _encryption_manager = EncryptionManager()
    return _encryption_manager

class EncryptedString(TypeDecorator):
    """SQLAlchemy column type for encrypted string fields"""
    impl = String
    cache_ok = True
    
    def process_bind_param(self, value, dialect):
        """Encrypt value before storing in database"""
        if value is not None:
            return get_encryption_manager().encrypt(value)
        return value
    
    def process_result_value(self, value, dialect):
        """Decrypt value after retrieving from database"""
        if value is not None:
            return get_encryption_manager().decrypt(value)
        return value

class EncryptedText(TypeDecorator):
    """SQLAlchemy column type for encrypted text fields"""
    impl = Text
    cache_ok = True
    
    def process_bind_param(self, value, dialect):
        """Encrypt value before storing in database"""
        if value is not None:
            return get_encryption_manager().encrypt(value)
        return value
    
    def process_result_value(self, value, dialect):
        """Decrypt value after retrieving from database"""
        if value is not None:
            return get_encryption_manager().decrypt(value)
        return value

class SearchableEncryptedString(TypeDecorator):
    """
    SQLAlchemy column type for encrypted strings that need to be searchable
    Stores both encrypted value and searchable hash
    """
    impl = String
    cache_ok = True
    
    def process_bind_param(self, value, dialect):
        """Encrypt value and create search hash"""
        if value is not None:
            encrypted_value = get_encryption_manager().encrypt(value)
            search_hash = get_encryption_manager().hash_for_search(value)
            # Store both encrypted value and hash (separated by |)
            return f"{encrypted_value}|{search_hash}"
        return value
    
    def process_result_value(self, value, dialect):
        """Decrypt value (ignore search hash)"""
        if value is not None and '|' in value:
            encrypted_value = value.split('|')[0]
            return encryption_manager.decrypt(encrypted_value)
        elif value is not None:
            # Handle legacy data without hash
            return get_encryption_manager().decrypt(value)
        return value

def mask_email(email: str) -> str:
    """Mask email address for display purposes"""
    if not email or '@' not in email:
        return email
    
    local, domain = email.split('@', 1)
    if len(local) <= 2:
        masked_local = '*' * len(local)
    else:
        masked_local = local[0] + '*' * (len(local) - 2) + local[-1]
    
    return f"{masked_local}@{domain}"

def mask_phone(phone: str) -> str:
    """Mask phone number for display purposes"""
    if not phone:
        return phone
    
    # Remove non-digit characters
    digits = ''.join(filter(str.isdigit, phone))
    
    if len(digits) >= 10:
        # Show last 4 digits
        return f"***-***-{digits[-4:]}"
    elif len(digits) >= 4:
        return f"***-{digits[-4:]}"
    else:
        return "***"

def sanitize_for_display(data: dict, fields_to_mask: list = None) -> dict:
    """Sanitize sensitive data for API responses"""
    if fields_to_mask is None:
        fields_to_mask = ['email', 'phone', 'ssn', 'notes']
    
    sanitized = data.copy()
    
    for field in fields_to_mask:
        if field in sanitized:
            if field == 'email':
                sanitized[field] = mask_email(sanitized[field])
            elif field == 'phone':
                sanitized[field] = mask_phone(sanitized[field])
            elif field in ['ssn', 'notes']:
                # Completely hide sensitive fields
                sanitized[field] = '[PROTECTED]'
    
    return sanitized

def create_search_hash(value: str) -> str:
    """Create searchable hash for encrypted fields"""
    return get_encryption_manager().hash_for_search(value)

def search_encrypted_field(query, field, search_term: str):
    """
    Search in encrypted field using hash comparison
    Use this for searching encrypted fields
    """
    search_hash = create_search_hash(search_term)
    # Assuming field stores "encrypted_value|search_hash"
    return query.filter(field.like(f"%|{search_hash}%"))

# Utility functions for manual encryption/decryption
def encrypt_data(data: str) -> str:
    """Manually encrypt data"""
    return get_encryption_manager().encrypt(data)

def decrypt_data(encrypted_data: str) -> str:
    """Manually decrypt data"""
    return get_encryption_manager().decrypt(encrypted_data)

# Data migration utilities
def migrate_plaintext_to_encrypted(db_session, model_class, field_name: str):
    """
    Utility to migrate existing plaintext data to encrypted format
    Use with caution - backup database first!
    """
    logger.warning(f"Starting migration of {model_class.__name__}.{field_name} to encrypted format")
    
    # Get all records with non-null plaintext data
    records = db_session.query(model_class).filter(
        getattr(model_class, field_name).isnot(None)
    ).all()
    
    migrated_count = 0
    for record in records:
        plaintext_value = getattr(record, field_name)
        
        # Skip if already encrypted (contains base64 characters and length suggests encryption)
        if len(plaintext_value) > 50 and any(c in plaintext_value for c in ['+', '/', '=']):
            continue
        
        # Encrypt the plaintext value
        try:
            encrypted_value = get_encryption_manager().encrypt(plaintext_value)
            setattr(record, field_name, encrypted_value)
            migrated_count += 1
        except Exception as e:
            logger.error(f"Failed to migrate record {record.id}: {e}")
    
    db_session.commit()
    logger.info(f"Migrated {migrated_count} records for {model_class.__name__}.{field_name}")
    
    return migrated_count