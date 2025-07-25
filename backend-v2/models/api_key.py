"""
API Key model for secure service-to-service authentication.
"""

from sqlalchemy import Column, Integer, String, DateTime, JSON, Enum, ForeignKey, Index
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

from db import Base


class APIKeyStatus(enum.Enum):
    """API key status enumeration."""
    ACTIVE = "active"
    EXPIRED = "expired"
    REVOKED = "revoked"
    SUSPENDED = "suspended"


class APIKey(Base):
    """
    API Key model for service authentication.
    
    Stores hashed API keys with associated permissions and metadata.
    Never stores plain text keys - only hashes.
    """
    __tablename__ = "api_keys"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # User/owner information
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    user = relationship("User", back_populates="api_keys", foreign_keys=[user_id])
    
    # Key information
    name = Column(String(255), nullable=False)
    key_hash = Column(String(64), nullable=False, unique=True, index=True)  # SHA-256 hash
    key_prefix = Column(String(20), nullable=False)  # For display (e.g., "whk_abc123...")
    key_type = Column(String(50), nullable=False)  # webhook, integration, internal, etc.
    
    # Permissions and access control
    permissions = Column(JSON, nullable=False, default=list)  # List of permission strings
    allowed_ips = Column(JSON, nullable=True)  # Optional IP allowlist
    allowed_origins = Column(JSON, nullable=True)  # Optional origin allowlist
    
    # Status and lifecycle
    status = Column(Enum(APIKeyStatus), nullable=False, default=APIKeyStatus.ACTIVE)
    expires_at = Column(DateTime, nullable=True)
    last_used_at = Column(DateTime, nullable=True)
    usage_count = Column(Integer, default=0)
    
    # Metadata and configuration
    key_metadata = Column(JSON, nullable=True)  # Additional key metadata
    rate_limit_override = Column(Integer, nullable=True)  # Custom rate limit if needed
    
    # Audit fields
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    revoked_at = Column(DateTime, nullable=True)
    revoked_reason = Column(String(500), nullable=True)
    revoked_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Indexes for performance
    __table_args__ = (
        Index('idx_api_keys_user_status', 'user_id', 'status'),
        Index('idx_api_keys_type_status', 'key_type', 'status'),
        Index('idx_api_keys_expires_at', 'expires_at'),
    )
    
    def __repr__(self):
        return f"<APIKey(id={self.id}, name='{self.name}', type='{self.key_type}', status='{self.status.value}')>"
    
    @property
    def is_active(self) -> bool:
        """Check if key is currently active and valid."""
        if self.status != APIKeyStatus.ACTIVE:
            return False
        
        if self.expires_at and self.expires_at < datetime.utcnow():
            return False
        
        return True
    
    @property
    def is_expired(self) -> bool:
        """Check if key has expired."""
        return self.expires_at is not None and self.expires_at < datetime.utcnow()
    
    def has_permission(self, permission: str) -> bool:
        """Check if key has a specific permission."""
        if not self.is_active:
            return False
        
        # Check for wildcard permissions
        if "*" in self.permissions or "admin:*" in self.permissions:
            return True
        
        # Check specific permission
        if permission in self.permissions:
            return True
        
        # Check for wildcard in permission category
        permission_parts = permission.split(":")
        if len(permission_parts) == 2:
            category_wildcard = f"{permission_parts[0]}:*"
            if category_wildcard in self.permissions:
                return True
        
        return False
    
    def has_all_permissions(self, permissions: list) -> bool:
        """Check if key has all specified permissions."""
        return all(self.has_permission(p) for p in permissions)
    
    def has_any_permission(self, permissions: list) -> bool:
        """Check if key has any of the specified permissions."""
        return any(self.has_permission(p) for p in permissions)
    
    def check_ip_allowed(self, ip_address: str) -> bool:
        """Check if IP address is allowed for this key."""
        if not self.allowed_ips:
            return True  # No IP restrictions
        
        return ip_address in self.allowed_ips
    
    def check_origin_allowed(self, origin: str) -> bool:
        """Check if origin is allowed for this key."""
        if not self.allowed_origins:
            return True  # No origin restrictions
        
        # Check exact match or wildcard
        for allowed_origin in self.allowed_origins:
            if allowed_origin == origin:
                return True
            if allowed_origin.startswith("*.") and origin.endswith(allowed_origin[1:]):
                return True
        
        return False