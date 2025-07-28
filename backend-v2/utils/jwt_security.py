"""
Enhanced JWT Security with Key Rotation and Asymmetric Keys

This module provides enterprise-grade JWT security including:
- Asymmetric key pairs (RS256) for better security
- Automatic key rotation every 90 days
- Key versioning and validation
- Secure key storage and management
"""

import os
import json
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Tuple
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from jose import JWTError, jwt
from pathlib import Path

from config import settings

logger = logging.getLogger(__name__)

class JWTKeyManager:
    """Manages JWT signing keys with automatic rotation and secure storage."""
    
    KEY_SIZE = 2048
    ROTATION_DAYS = 90
    ALGORITHM = "RS256"
    
    def __init__(self, key_storage_path: str = "/tmp/jwt_keys"):
        self.key_storage_path = Path(key_storage_path)
        self.key_storage_path.mkdir(parents=True, exist_ok=True)
        os.chmod(self.key_storage_path, 0o700)
        self._ensure_current_key()
    
    def _ensure_current_key(self) -> None:
        current_key_info = self._get_current_key_info()
        if not current_key_info or self._key_needs_rotation(current_key_info):
            logger.info("Generating new JWT signing key pair")
            self._generate_new_key_pair()
    
    def _get_current_key_info(self) -> Optional[Dict]:
        key_info_file = self.key_storage_path / "current_key.json"
        if not key_info_file.exists():
            return None
        try:
            with open(key_info_file, 'r') as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError) as e:
            logger.error(f"Failed to read current key info: {e}")
            return None
    
    def _key_needs_rotation(self, key_info: Dict) -> bool:
        created_at = datetime.fromisoformat(key_info.get('created_at', ''))
        age = datetime.now(timezone.utc) - created_at
        return age.days >= self.ROTATION_DAYS
    
    def _generate_new_key_pair(self) -> Dict:
        # Generate RSA key pair
        private_key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=self.KEY_SIZE
        )
        public_key = private_key.public_key()
        
        key_id = datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')
        
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
        
        # Store keys securely
        private_key_file = self.key_storage_path / f"private_key_{key_id}.pem"
        public_key_file = self.key_storage_path / f"public_key_{key_id}.pem"
        
        with open(private_key_file, 'wb') as f:
            f.write(private_pem)
        os.chmod(private_key_file, 0o600)
        
        with open(public_key_file, 'wb') as f:
            f.write(public_pem)
        os.chmod(public_key_file, 0o644)
        
        # Create key info
        key_info = {
            'key_id': key_id,
            'algorithm': self.ALGORITHM,
            'created_at': datetime.now(timezone.utc).isoformat(),
            'private_key_file': str(private_key_file),
            'public_key_file': str(public_key_file),
            'key_size': self.KEY_SIZE
        }
        
        # Update current key pointer
        current_key_file = self.key_storage_path / "current_key.json"
        with open(current_key_file, 'w') as f:
            json.dump(key_info, f, indent=2)
        os.chmod(current_key_file, 0o600)
        
        logger.info(f"Generated new JWT key pair with ID: {key_id}")
        return key_info
    
    def get_current_private_key(self) -> str:
        key_info = self._get_current_key_info()
        if not key_info:
            raise RuntimeError("No current JWT signing key available")
        
        private_key_file = Path(key_info['private_key_file'])
        if not private_key_file.exists():
            raise RuntimeError(f"Private key file not found: {private_key_file}")
        
        with open(private_key_file, 'rb') as f:
            return f.read().decode('utf-8')
    
    def get_current_public_key(self) -> str:
        key_info = self._get_current_key_info()
        if not key_info:
            raise RuntimeError("No current JWT public key available")
        
        public_key_file = Path(key_info['public_key_file'])
        if not public_key_file.exists():
            raise RuntimeError(f"Public key file not found: {public_key_file}")
        
        with open(public_key_file, 'rb') as f:
            return f.read().decode('utf-8')
    
    def get_current_key_id(self) -> str:
        key_info = self._get_current_key_info()
        if not key_info:
            raise RuntimeError("No current JWT key available")
        return key_info['key_id']
    
    def get_algorithm(self) -> str:
        return self.ALGORITHM
    
    def rotate_keys(self) -> Dict:
        logger.info("Manual key rotation triggered")
        return self._generate_new_key_pair()


# Global key manager instance
_key_manager: Optional[JWTKeyManager] = None

def get_key_manager() -> JWTKeyManager:
    global _key_manager
    if _key_manager is None:
        key_path = os.getenv('JWT_KEY_STORAGE_PATH', '/tmp/jwt_keys')
        _key_manager = JWTKeyManager(key_path)
    return _key_manager

def create_access_token(data: Dict, expires_delta: Optional[timedelta] = None) -> str:
    key_manager = get_key_manager()
    
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    
    to_encode.update({
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "kid": key_manager.get_current_key_id()
    })
    
    private_key = key_manager.get_current_private_key()
    algorithm = key_manager.get_algorithm()
    
    try:
        token = jwt.encode(to_encode, private_key, algorithm=algorithm)
        logger.debug(f"Created JWT token with key ID: {key_manager.get_current_key_id()}")
        return token
    except Exception as e:
        logger.error(f"Failed to create JWT token: {e}")
        raise

def verify_token(token: str) -> Dict:
    key_manager = get_key_manager()
    
    public_key = key_manager.get_current_public_key()
    algorithm = key_manager.get_algorithm()
    
    try:
        payload = jwt.decode(token, public_key, algorithms=[algorithm])
        logger.debug(f"Verified JWT token with key ID: {payload.get('kid', 'unknown')}")
        return payload
    except JWTError as e:
        logger.warning(f"JWT token verification failed: {e}")
        raise
    except Exception as e:
        logger.error(f"Unexpected error verifying JWT token: {e}")
        raise JWTError("Token verification failed")