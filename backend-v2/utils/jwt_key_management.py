"""
JWT Key Management System

This module implements a secure JWT key rotation system with asymmetric keys (RSA)
to replace the vulnerable symmetric key approach. Features include:

- RSA key pair generation and rotation
- Secure key storage with encryption
- Automatic key rotation scheduling
- Multiple key support for graceful rotation
- Key validation and verification
- Security audit logging

SECURITY IMPROVEMENTS:
- Uses RSA-256 instead of HS256 for better security
- Automatic key rotation every 90 days
- Multiple active keys for zero-downtime rotation
- Encrypted key storage
- Comprehensive audit logging
"""

import os
import json
import logging
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Tuple
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization, hashes
from cryptography.hazmat.primitives.serialization import load_pem_private_key, load_pem_public_key
from cryptography.fernet import Fernet
import redis
from jose import jwt, JWTError
import secrets
from pathlib import Path

logger = logging.getLogger(__name__)

class JWTKeyManager:
    """
    Manages JWT signing keys with automatic rotation and secure storage
    """
    
    def __init__(self, redis_client: Optional[redis.Redis] = None):
        self.redis_client = redis_client
        self.key_rotation_days = 90  # Rotate keys every 90 days
        self.max_active_keys = 3  # Keep up to 3 keys active for rotation
        self.algorithm = "RS256"  # Use RSA with SHA-256
        
        # Initialize encryption key for key storage
        self._init_storage_encryption()
        
        # Ensure we have at least one key pair
        self._ensure_key_availability()
    
    def _init_storage_encryption(self):
        """Initialize encryption for secure key storage"""
        # Try to get encryption key from environment
        encryption_key = os.getenv('JWT_KEY_ENCRYPTION_KEY')
        
        if not encryption_key:
            # Generate new encryption key if not exists
            encryption_key = Fernet.generate_key().decode()
            logger.warning("Generated new JWT key encryption key. Store this securely: %s", encryption_key)
        
        self.fernet = Fernet(encryption_key.encode())
    
    def _ensure_key_availability(self):
        """Ensure at least one signing key is available"""
        active_keys = self.get_active_keys()
        
        if not active_keys:
            logger.info("No active JWT keys found. Generating initial key pair.")
            self.generate_key_pair()
    
    def generate_key_pair(self, key_id: Optional[str] = None) -> str:
        """
        Generate a new RSA key pair for JWT signing
        
        Args:
            key_id: Optional key identifier. If not provided, one will be generated.
            
        Returns:
            The key ID of the generated key pair
        """
        if not key_id:
            key_id = f"jwt_key_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}_{secrets.token_hex(4)}"
        
        # Generate RSA key pair
        private_key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=2048,
        )
        public_key = private_key.public_key()
        
        # Serialize keys
        private_pem = private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption()
        )
        
        public_pem = public_key.public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo
        )
        
        # Create key metadata
        key_data = {
            "key_id": key_id,
            "algorithm": self.algorithm,
            "private_key": private_pem.decode(),
            "public_key": public_pem.decode(),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "expires_at": (datetime.now(timezone.utc) + timedelta(days=self.key_rotation_days)).isoformat(),
            "is_active": True,
            "usage_count": 0,
        }
        
        # Store encrypted key data
        self._store_key_data(key_id, key_data)
        
        logger.info(f"Generated new JWT key pair: {key_id}")
        
        # Log security event
        self._log_key_event("key_generated", key_id, {
            "algorithm": self.algorithm,
            "key_size": 2048,
            "expires_at": key_data["expires_at"]
        })
        
        return key_id
    
    def _store_key_data(self, key_id: str, key_data: dict):
        """Store encrypted key data"""
        # Encrypt sensitive key data
        encrypted_data = self.fernet.encrypt(json.dumps(key_data).encode())
        
        if self.redis_client:
            # Store in Redis with expiration
            expiry_days = self.key_rotation_days + 30  # Keep expired keys for 30 days
            self.redis_client.setex(
                f"jwt_key:{key_id}",
                timedelta(days=expiry_days),
                encrypted_data
            )
        else:
            # Fallback to file storage
            key_dir = Path("./jwt_keys")
            key_dir.mkdir(exist_ok=True)
            
            key_file = key_dir / f"{key_id}.key"
            with open(key_file, "wb") as f:
                f.write(encrypted_data)
    
    def _load_key_data(self, key_id: str) -> Optional[dict]:
        """Load and decrypt key data"""
        encrypted_data = None
        
        if self.redis_client:
            # Load from Redis
            encrypted_data = self.redis_client.get(f"jwt_key:{key_id}")
        else:
            # Load from file
            key_file = Path("./jwt_keys") / f"{key_id}.key"
            if key_file.exists():
                with open(key_file, "rb") as f:
                    encrypted_data = f.read()
        
        if not encrypted_data:
            return None
        
        try:
            # Decrypt and parse key data
            decrypted_data = self.fernet.decrypt(encrypted_data)
            return json.loads(decrypted_data.decode())
        except Exception as e:
            logger.error(f"Failed to decrypt key data for {key_id}: {e}")
            return None
    
    def get_active_keys(self) -> List[dict]:
        """Get all active signing keys"""
        active_keys = []
        
        # Get all key IDs
        key_ids = self._get_all_key_ids()
        
        for key_id in key_ids:
            key_data = self._load_key_data(key_id)
            if key_data and key_data.get("is_active"):
                # Check if key is not expired
                expires_at = datetime.fromisoformat(key_data["expires_at"])
                if expires_at > datetime.now(timezone.utc):
                    active_keys.append(key_data)
        
        # Sort by creation date (newest first)
        active_keys.sort(key=lambda k: k["created_at"], reverse=True)
        
        return active_keys
    
    def _get_all_key_ids(self) -> List[str]:
        """Get all stored key IDs"""
        key_ids = []
        
        if self.redis_client:
            # Get from Redis
            keys = self.redis_client.keys("jwt_key:*")
            key_ids = [key.decode().replace("jwt_key:", "") for key in keys]
        else:
            # Get from file system
            key_dir = Path("./jwt_keys")
            if key_dir.exists():
                key_ids = [f.stem for f in key_dir.glob("*.key")]
        
        return key_ids
    
    def get_current_signing_key(self) -> dict:
        """Get the current key for signing new tokens"""
        active_keys = self.get_active_keys()
        
        if not active_keys:
            # Generate new key if none available
            key_id = self.generate_key_pair()
            return self._load_key_data(key_id)
        
        # Return the newest active key
        return active_keys[0]
    
    def get_verification_keys(self) -> Dict[str, str]:
        """Get all public keys for token verification"""
        verification_keys = {}
        active_keys = self.get_active_keys()
        
        for key_data in active_keys:
            verification_keys[key_data["key_id"]] = key_data["public_key"]
        
        return verification_keys
    
    def create_token(self, payload: dict, expires_delta: Optional[timedelta] = None) -> str:
        """
        Create a new JWT token using the current signing key
        
        Args:
            payload: Token payload data
            expires_delta: Token expiration time
            
        Returns:
            Signed JWT token
        """
        # Get current signing key
        signing_key_data = self.get_current_signing_key()
        
        if not signing_key_data:
            raise RuntimeError("No signing key available")
        
        # Add key ID to payload
        payload = payload.copy()
        payload["kid"] = signing_key_data["key_id"]
        
        # Set expiration
        if expires_delta:
            expire = datetime.now(timezone.utc) + expires_delta
        else:
            expire = datetime.now(timezone.utc) + timedelta(minutes=15)
        
        payload.update({"exp": expire})
        
        # Sign token
        private_key = signing_key_data["private_key"]
        token = jwt.encode(payload, private_key, algorithm=self.algorithm)
        
        # Update usage count
        signing_key_data["usage_count"] += 1
        self._store_key_data(signing_key_data["key_id"], signing_key_data)
        
        return token
    
    def verify_token(self, token: str) -> dict:
        """
        Verify and decode a JWT token
        
        Args:
            token: JWT token to verify
            
        Returns:
            Decoded token payload
            
        Raises:
            JWTError: If token verification fails
        """
        try:
            # Decode header to get key ID
            unverified_header = jwt.get_unverified_header(token)
            key_id = unverified_header.get("kid")
            
            if not key_id:
                raise JWTError("Token missing key ID")
            
            # Get verification key
            key_data = self._load_key_data(key_id)
            if not key_data:
                raise JWTError(f"Unknown key ID: {key_id}")
            
            # Verify token
            public_key = key_data["public_key"]
            payload = jwt.decode(token, public_key, algorithms=[self.algorithm])
            
            return payload
            
        except JWTError as e:
            logger.warning(f"JWT verification failed: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error during JWT verification: {e}")
            raise JWTError("Token verification failed")
    
    def rotate_keys(self) -> str:
        """
        Perform key rotation by generating a new key and deactivating old ones
        
        Returns:
            ID of the new signing key
        """
        logger.info("Starting JWT key rotation")
        
        # Generate new key
        new_key_id = self.generate_key_pair()
        
        # Get all active keys
        active_keys = self.get_active_keys()
        
        # Deactivate old keys if we have too many
        if len(active_keys) > self.max_active_keys:
            keys_to_deactivate = active_keys[self.max_active_keys:]
            
            for key_data in keys_to_deactivate:
                key_data["is_active"] = False
                self._store_key_data(key_data["key_id"], key_data)
                
                self._log_key_event("key_deactivated", key_data["key_id"], {
                    "reason": "rotation",
                    "usage_count": key_data["usage_count"]
                })
        
        logger.info(f"JWT key rotation completed. New signing key: {new_key_id}")
        
        return new_key_id
    
    def check_key_expiration(self) -> List[str]:
        """
        Check for keys that need rotation
        
        Returns:
            List of key IDs that should be rotated
        """
        keys_to_rotate = []
        active_keys = self.get_active_keys()
        
        for key_data in active_keys:
            expires_at = datetime.fromisoformat(key_data["expires_at"])
            
            # Check if key expires within 7 days
            if expires_at <= datetime.now(timezone.utc) + timedelta(days=7):
                keys_to_rotate.append(key_data["key_id"])
        
        return keys_to_rotate
    
    def _log_key_event(self, event_type: str, key_id: str, details: dict = None):
        """Log key management events for security audit"""
        audit_data = {
            "event_type": event_type,
            "key_id": key_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        
        if details:
            audit_data.update(details)
        
        logger.info(f"JWT Key Event: {event_type}", extra=audit_data)


# Global key manager instance
_key_manager = None

def get_jwt_key_manager() -> JWTKeyManager:
    """Get the global JWT key manager instance"""
    global _key_manager
    
    if _key_manager is None:
        # Initialize Redis client if available
        redis_client = None
        try:
            import redis
            redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379')
            redis_client = redis.from_url(redis_url, decode_responses=False)
            redis_client.ping()  # Test connection
        except Exception as e:
            logger.warning(f"Redis not available for JWT key storage: {e}")
        
        _key_manager = JWTKeyManager(redis_client)
    
    return _key_manager


# Backward compatibility functions
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create access token using the new key management system"""
    key_manager = get_jwt_key_manager()
    return key_manager.create_token(data, expires_delta)

def create_refresh_token(data: dict) -> str:
    """Create refresh token using the new key management system"""
    key_manager = get_jwt_key_manager()
    expires_delta = timedelta(days=7)
    return key_manager.create_token(data, expires_delta)

def decode_token(token: str) -> dict:
    """Decode token using the new key management system"""
    key_manager = get_jwt_key_manager()
    return key_manager.verify_token(token)