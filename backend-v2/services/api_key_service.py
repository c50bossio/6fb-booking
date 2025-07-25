"""
API Key management service for secure service-to-service communication.
Handles creation, validation, rotation, and revocation of API keys.
"""

import secrets
import hashlib
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_
import logging

from models.integration import Integration, IntegrationType
from utils.audit_logger_bypass import get_audit_logger

logger = logging.getLogger(__name__)
audit_logger = get_audit_logger()


class APIKeyService:
    """Service for managing API keys."""
    
    # API key prefix by type for easy identification
    KEY_PREFIXES = {
        "webhook": "whk_",
        "integration": "int_",
        "internal": "srv_",
        "partner": "ptr_",
        "test": "test_"
    }
    
    @staticmethod
    def generate_api_key(key_type: str = "integration", prefix_override: Optional[str] = None) -> Dict[str, str]:
        """
        Generate a new API key with type-specific prefix.
        
        Returns:
            Dict containing 'key' (full key) and 'key_hash' (for storage)
        """
        prefix = prefix_override or APIKeyService.KEY_PREFIXES.get(key_type, "key_")
        
        # Generate random key (32 bytes = 256 bits)
        random_part = secrets.token_urlsafe(32)
        
        # Full key with prefix
        full_key = f"{prefix}{random_part}"
        
        # Hash for storage (never store plain API keys)
        key_hash = hashlib.sha256(full_key.encode()).hexdigest()
        
        return {
            "key": full_key,
            "key_hash": key_hash,
            "prefix": prefix,
            "type": key_type
        }
    
    @staticmethod
    def create_api_key(
        user_id: int,
        name: str,
        key_type: str,
        permissions: List[str],
        expires_in_days: Optional[int] = None,
        metadata: Optional[Dict[str, Any]] = None,
        db: Session = None
    ) -> Dict[str, Any]:
        """
        Create a new API key for a user or integration.
        """
        from models.api_key import APIKey, APIKeyStatus
        
        try:
            # Generate the key
            key_data = APIKeyService.generate_api_key(key_type)
            
            # Set expiration
            expires_at = None
            if expires_in_days:
                expires_at = datetime.utcnow() + timedelta(days=expires_in_days)
            
            # Create database record
            api_key = APIKey(
                user_id=user_id,
                name=name,
                key_hash=key_data["key_hash"],
                key_prefix=key_data["key"][:12] + "...",  # Store prefix for identification
                key_type=key_type,
                permissions=permissions,
                status=APIKeyStatus.ACTIVE,
                expires_at=expires_at,
                metadata=metadata or {},
                last_used_at=None,
                created_at=datetime.utcnow()
            )
            
            db.add(api_key)
            db.commit()
            db.refresh(api_key)
            
            # Log creation
            audit_logger.log_security_event(
                "api_key_created",
                details={
                    "key_id": api_key.id,
                    "key_type": key_type,
                    "user_id": user_id,
                    "name": name,
                    "permissions": permissions
                }
            )
            
            return {
                "id": api_key.id,
                "key": key_data["key"],  # Only returned on creation
                "name": name,
                "type": key_type,
                "permissions": permissions,
                "expires_at": expires_at,
                "created_at": api_key.created_at,
                "message": "Store this key securely. It will not be shown again."
            }
            
        except Exception as e:
            logger.error(f"Error creating API key: {str(e)}")
            db.rollback()
            raise
    
    @staticmethod
    def validate_api_key(
        api_key: str,
        required_permissions: Optional[List[str]] = None,
        db: Session = None
    ) -> Optional[Dict[str, Any]]:
        """
        Validate an API key and check permissions.
        
        Returns:
            Dict with key info if valid, None if invalid
        """
        from models.api_key import APIKey, APIKeyStatus
        
        try:
            # Hash the provided key
            key_hash = hashlib.sha256(api_key.encode()).hexdigest()
            
            # Find the key in database
            api_key_record = db.query(APIKey).filter(
                and_(
                    APIKey.key_hash == key_hash,
                    APIKey.status == APIKeyStatus.ACTIVE
                )
            ).first()
            
            if not api_key_record:
                audit_logger.log_security_event(
                    "api_key_invalid",
                    severity="warning",
                    details={"key_prefix": api_key[:12] if len(api_key) > 12 else "unknown"}
                )
                return None
            
            # Check expiration
            if api_key_record.expires_at and api_key_record.expires_at < datetime.utcnow():
                api_key_record.status = APIKeyStatus.EXPIRED
                db.commit()
                
                audit_logger.log_security_event(
                    "api_key_expired",
                    details={"key_id": api_key_record.id}
                )
                return None
            
            # Check permissions if required
            if required_permissions:
                missing_permissions = set(required_permissions) - set(api_key_record.permissions)
                if missing_permissions:
                    audit_logger.log_security_event(
                        "api_key_insufficient_permissions",
                        details={
                            "key_id": api_key_record.id,
                            "required": required_permissions,
                            "missing": list(missing_permissions)
                        }
                    )
                    return None
            
            # Update last used timestamp
            api_key_record.last_used_at = datetime.utcnow()
            api_key_record.usage_count += 1
            db.commit()
            
            return {
                "id": api_key_record.id,
                "user_id": api_key_record.user_id,
                "name": api_key_record.name,
                "type": api_key_record.key_type,
                "permissions": api_key_record.permissions,
                "metadata": api_key_record.metadata
            }
            
        except Exception as e:
            logger.error(f"Error validating API key: {str(e)}")
            return None
    
    @staticmethod
    def rotate_api_key(
        key_id: int,
        user_id: int,
        db: Session
    ) -> Dict[str, Any]:
        """
        Rotate an existing API key (revoke old, create new).
        """
        from models.api_key import APIKey, APIKeyStatus
        
        try:
            # Get existing key
            existing_key = db.query(APIKey).filter(
                and_(
                    APIKey.id == key_id,
                    APIKey.user_id == user_id
                )
            ).first()
            
            if not existing_key:
                raise ValueError("API key not found")
            
            # Generate new key
            key_data = APIKeyService.generate_api_key(existing_key.key_type)
            
            # Create new key with same settings
            new_key = APIKey(
                user_id=user_id,
                name=f"{existing_key.name} (Rotated)",
                key_hash=key_data["key_hash"],
                key_prefix=key_data["key"][:12] + "...",
                key_type=existing_key.key_type,
                permissions=existing_key.permissions,
                status=APIKeyStatus.ACTIVE,
                expires_at=existing_key.expires_at,
                metadata={
                    **existing_key.metadata,
                    "rotated_from": existing_key.id,
                    "rotated_at": datetime.utcnow().isoformat()
                },
                created_at=datetime.utcnow()
            )
            
            # Revoke old key
            existing_key.status = APIKeyStatus.REVOKED
            existing_key.revoked_at = datetime.utcnow()
            existing_key.revoked_reason = "Key rotation"
            
            db.add(new_key)
            db.commit()
            db.refresh(new_key)
            
            # Log rotation
            audit_logger.log_security_event(
                "api_key_rotated",
                details={
                    "old_key_id": existing_key.id,
                    "new_key_id": new_key.id,
                    "user_id": user_id
                }
            )
            
            return {
                "id": new_key.id,
                "key": key_data["key"],
                "name": new_key.name,
                "type": new_key.key_type,
                "permissions": new_key.permissions,
                "expires_at": new_key.expires_at,
                "created_at": new_key.created_at,
                "message": "API key rotated successfully. Store the new key securely."
            }
            
        except Exception as e:
            logger.error(f"Error rotating API key: {str(e)}")
            db.rollback()
            raise
    
    @staticmethod
    def revoke_api_key(
        key_id: int,
        user_id: int,
        reason: str,
        db: Session
    ) -> bool:
        """
        Revoke an API key.
        """
        from models.api_key import APIKey, APIKeyStatus
        
        try:
            api_key = db.query(APIKey).filter(
                and_(
                    APIKey.id == key_id,
                    APIKey.user_id == user_id
                )
            ).first()
            
            if not api_key:
                return False
            
            api_key.status = APIKeyStatus.REVOKED
            api_key.revoked_at = datetime.utcnow()
            api_key.revoked_reason = reason
            
            db.commit()
            
            # Log revocation
            audit_logger.log_security_event(
                "api_key_revoked",
                details={
                    "key_id": key_id,
                    "user_id": user_id,
                    "reason": reason
                }
            )
            
            return True
            
        except Exception as e:
            logger.error(f"Error revoking API key: {str(e)}")
            db.rollback()
            return False
    
    @staticmethod
    def list_api_keys(
        user_id: int,
        include_revoked: bool = False,
        db: Session = None
    ) -> List[Dict[str, Any]]:
        """
        List all API keys for a user.
        """
        from models.api_key import APIKey, APIKeyStatus
        
        try:
            query = db.query(APIKey).filter(APIKey.user_id == user_id)
            
            if not include_revoked:
                query = query.filter(APIKey.status != APIKeyStatus.REVOKED)
            
            api_keys = query.order_by(APIKey.created_at.desc()).all()
            
            return [
                {
                    "id": key.id,
                    "name": key.name,
                    "key_prefix": key.key_prefix,
                    "type": key.key_type,
                    "status": key.status.value,
                    "permissions": key.permissions,
                    "last_used_at": key.last_used_at,
                    "usage_count": key.usage_count,
                    "expires_at": key.expires_at,
                    "created_at": key.created_at,
                    "revoked_at": key.revoked_at,
                    "revoked_reason": key.revoked_reason
                }
                for key in api_keys
            ]
            
        except Exception as e:
            logger.error(f"Error listing API keys: {str(e)}")
            return []
    
    @staticmethod
    def cleanup_expired_keys(db: Session) -> int:
        """
        Clean up expired API keys. Should be run periodically.
        """
        from models.api_key import APIKey, APIKeyStatus
        
        try:
            expired_keys = db.query(APIKey).filter(
                and_(
                    APIKey.expires_at < datetime.utcnow(),
                    APIKey.status == APIKeyStatus.ACTIVE
                )
            ).all()
            
            count = len(expired_keys)
            
            for key in expired_keys:
                key.status = APIKeyStatus.EXPIRED
            
            db.commit()
            
            if count > 0:
                logger.info(f"Cleaned up {count} expired API keys")
            
            return count
            
        except Exception as e:
            logger.error(f"Error cleaning up expired keys: {str(e)}")
            db.rollback()
            return 0
    
    @staticmethod
    def get_integration_api_key(
        integration_id: int,
        db: Session
    ) -> Optional[str]:
        """
        Get or create an API key for an integration.
        """
        try:
            # Check if integration exists
            integration = db.query(Integration).filter(
                Integration.id == integration_id
            ).first()
            
            if not integration:
                return None
            
            # Check if API key already exists in metadata
            if integration.config and "api_key_id" in integration.config:
                # Return None - keys are never retrieved, only validated
                return None
            
            # Create new API key for integration
            permissions = APIKeyService._get_integration_permissions(integration.integration_type)
            
            key_result = APIKeyService.create_api_key(
                user_id=integration.user_id,
                name=f"{integration.integration_type.value} Integration",
                key_type="integration",
                permissions=permissions,
                expires_in_days=365,  # 1 year
                metadata={
                    "integration_id": integration_id,
                    "integration_type": integration.integration_type.value
                },
                db=db
            )
            
            # Store key ID in integration config
            if not integration.config:
                integration.config = {}
            integration.config["api_key_id"] = key_result["id"]
            db.commit()
            
            return key_result["key"]
            
        except Exception as e:
            logger.error(f"Error getting integration API key: {str(e)}")
            return None
    
    @staticmethod
    def _get_integration_permissions(integration_type: IntegrationType) -> List[str]:
        """
        Get default permissions for an integration type.
        """
        base_permissions = ["webhook:receive"]
        
        type_permissions = {
            IntegrationType.SHOPIFY: [
                "products:read", "products:write",
                "orders:read", "orders:write",
                "inventory:read", "inventory:write"
            ],
            IntegrationType.GOOGLE_CALENDAR: [
                "appointments:read", "appointments:write",
                "availability:read"
            ],
            IntegrationType.GOOGLE_MY_BUSINESS: [
                "reviews:read", "reviews:write",
                "locations:read"
            ],
            IntegrationType.SQUARE: [
                "payments:read", "payments:write",
                "inventory:read", "inventory:write"
            ],
            IntegrationType.QUICKBOOKS: [
                "invoices:read", "invoices:write",
                "customers:read", "reports:read"
            ],
            IntegrationType.MAILCHIMP: [
                "contacts:read", "contacts:write",
                "campaigns:read", "campaigns:write"
            ],
            IntegrationType.META: [
                "ads:read", "ads:write",
                "pixels:read", "analytics:read"
            ]
        }
        
        return base_permissions + type_permissions.get(integration_type, [])