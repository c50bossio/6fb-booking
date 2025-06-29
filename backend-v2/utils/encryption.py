"""
Encryption utilities for sensitive data fields
Based on V1 implementation for consistent data security
"""
import os
import base64
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from sqlalchemy.types import TypeDecorator, String, Text
import hashlib


def get_encryption_key():
    """Get or generate encryption key from environment"""
    # Get key from environment or use a default for development
    key_string = os.getenv("ENCRYPTION_KEY", "dev-encryption-key-change-in-production")
    
    # Derive a proper key from the string
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=b'stable-salt-v1',  # Using stable salt for consistent key derivation
        iterations=100000,
    )
    key = base64.urlsafe_b64encode(kdf.derive(key_string.encode()))
    return key


# Global cipher instance
cipher = Fernet(get_encryption_key())


class EncryptedString(TypeDecorator):
    """SQLAlchemy type for encrypted string fields"""
    impl = String
    cache_ok = True
    
    def process_bind_param(self, value, dialect):
        if value is not None:
            # Encrypt the value
            return cipher.encrypt(value.encode()).decode()
        return value
    
    def process_result_value(self, value, dialect):
        if value is not None:
            # Decrypt the value
            return cipher.decrypt(value.encode()).decode()
        return value


class EncryptedText(TypeDecorator):
    """SQLAlchemy type for encrypted text fields"""
    impl = Text
    cache_ok = True
    
    def process_bind_param(self, value, dialect):
        if value is not None:
            # Encrypt the value
            return cipher.encrypt(value.encode()).decode()
        return value
    
    def process_result_value(self, value, dialect):
        if value is not None:
            # Decrypt the value
            return cipher.decrypt(value.encode()).decode()
        return value


class SearchableEncryptedString(TypeDecorator):
    """
    SQLAlchemy type for encrypted string fields that need to be searchable.
    Stores both encrypted value and a hash for exact match searches.
    """
    impl = String
    cache_ok = True
    
    def process_bind_param(self, value, dialect):
        if value is not None:
            # Create a hash for searching (using SHA256)
            search_hash = hashlib.sha256(value.lower().encode()).hexdigest()[:16]
            # Encrypt the actual value
            encrypted = cipher.encrypt(value.encode()).decode()
            # Store both hash and encrypted value separated by |
            return f"{search_hash}|{encrypted}"
        return value
    
    def process_result_value(self, value, dialect):
        if value is not None:
            # Split hash and encrypted value
            parts = value.split('|', 1)
            if len(parts) == 2:
                # Return only the decrypted value
                return cipher.decrypt(parts[1].encode()).decode()
            # Fallback for data without hash
            return cipher.decrypt(value.encode()).decode()
        return value
    
    @staticmethod
    def create_search_hash(value):
        """Create search hash for a value to use in queries"""
        if value:
            return hashlib.sha256(value.lower().encode()).hexdigest()[:16]
        return None


def encrypt_data(data: str) -> str:
    """Encrypt a string value"""
    if data is not None:
        return cipher.encrypt(data.encode()).decode()
    return data


def decrypt_data(encrypted_data: str) -> str:
    """Decrypt a string value"""
    if encrypted_data is not None:
        return cipher.decrypt(encrypted_data.encode()).decode()
    return encrypted_data