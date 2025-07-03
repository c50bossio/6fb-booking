"""
Multi-Factor Authentication (MFA) models for TOTP-based 2FA.
Supports time-based one-time passwords (TOTP) with backup codes.
"""

from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Index
from sqlalchemy.orm import relationship
from datetime import datetime
import secrets
import string

from database import Base


class UserMFASecret(Base):
    """
    Stores MFA secrets for users using TOTP (Time-based One-Time Password).
    """
    __tablename__ = "user_mfa_secrets"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # User relationship
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    user = relationship("User", backref="mfa_secret", uselist=False)
    
    # TOTP Secret (encrypted)
    secret = Column(String(255), nullable=False)  # Base32 encoded secret for TOTP
    
    # MFA Configuration
    is_enabled = Column(Boolean, default=False, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)  # Verified initial setup
    
    # Recovery information
    recovery_email = Column(String(255), nullable=True)  # Alternative email for recovery
    recovery_phone = Column(String(50), nullable=True)   # Alternative phone for recovery
    
    # Usage tracking
    last_used_at = Column(DateTime, nullable=True)
    failed_attempts = Column(Integer, default=0, nullable=False)
    last_failed_at = Column(DateTime, nullable=True)
    
    # Audit fields
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    enabled_at = Column(DateTime, nullable=True)
    disabled_at = Column(DateTime, nullable=True)
    
    # Indexes for performance
    __table_args__ = (
        Index('idx_mfa_user_enabled', 'user_id', 'is_enabled'),
    )
    
    def __repr__(self):
        return f"<UserMFASecret(user_id={self.user_id}, enabled={self.is_enabled})>"


class MFABackupCode(Base):
    """
    Stores backup codes for MFA recovery.
    Each user gets a set of one-time use backup codes.
    """
    __tablename__ = "mfa_backup_codes"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # User relationship
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    user = relationship("User", backref="mfa_backup_codes")
    
    # Backup code (hashed)
    code_hash = Column(String(255), nullable=False)  # SHA-256 hash of the code
    
    # Usage tracking
    is_used = Column(Boolean, default=False, nullable=False)
    used_at = Column(DateTime, nullable=True)
    
    # Audit fields
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)  # Optional expiration
    
    # Indexes for performance
    __table_args__ = (
        Index('idx_backup_codes_user_unused', 'user_id', 'is_used'),
        Index('idx_backup_codes_hash', 'code_hash'),
    )
    
    def __repr__(self):
        return f"<MFABackupCode(user_id={self.user_id}, used={self.is_used})>"
    
    @staticmethod
    def generate_backup_code(length: int = 8) -> str:
        """Generate a secure backup code."""
        # Use alphanumeric characters excluding similar looking ones
        alphabet = string.ascii_uppercase + string.digits
        # Remove confusing characters: 0, O, I, 1
        alphabet = alphabet.replace('0', '').replace('O', '').replace('I', '').replace('1', '')
        
        # Generate code in format: XXXX-XXXX
        code_parts = []
        for _ in range(2):
            part = ''.join(secrets.choice(alphabet) for _ in range(4))
            code_parts.append(part)
        
        return '-'.join(code_parts)


class MFADeviceTrust(Base):
    """
    Stores trusted devices for MFA to reduce prompts on recognized devices.
    """
    __tablename__ = "mfa_device_trusts"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # User relationship
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    user = relationship("User", backref="mfa_trusted_devices")
    
    # Device identification
    device_fingerprint = Column(String(255), nullable=False)  # Hash of device characteristics
    device_name = Column(String(255), nullable=True)  # User-friendly name
    browser = Column(String(100), nullable=True)
    platform = Column(String(100), nullable=True)
    
    # Trust information
    trust_token = Column(String(255), nullable=False, unique=True)  # Secure random token
    trusted_until = Column(DateTime, nullable=False)  # Expiration of trust
    
    # Usage tracking
    last_used_at = Column(DateTime, nullable=True)
    usage_count = Column(Integer, default=0, nullable=False)
    
    # Security
    ip_address = Column(String(45), nullable=True)  # Last known IP
    location = Column(String(255), nullable=True)   # Approximate location
    
    # Audit fields
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    revoked_at = Column(DateTime, nullable=True)
    revoked_reason = Column(String(255), nullable=True)
    
    # Indexes for performance
    __table_args__ = (
        Index('idx_device_trust_user', 'user_id', 'trusted_until'),
        Index('idx_device_trust_token', 'trust_token'),
        Index('idx_device_trust_fingerprint', 'user_id', 'device_fingerprint'),
    )
    
    def __repr__(self):
        return f"<MFADeviceTrust(user_id={self.user_id}, device='{self.device_name}')>"
    
    @property
    def is_valid(self) -> bool:
        """Check if the device trust is still valid."""
        if self.revoked_at:
            return False
        return self.trusted_until > datetime.utcnow()


class MFAEvent(Base):
    """
    Audit log for MFA-related events.
    """
    __tablename__ = "mfa_events"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # User relationship
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    user = relationship("User", backref="mfa_events")
    
    # Event information
    event_type = Column(String(50), nullable=False)  # enabled, disabled, verified, failed, backup_used, etc.
    event_status = Column(String(50), nullable=False)  # success, failure
    event_details = Column(String(500), nullable=True)
    
    # Context
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(500), nullable=True)
    device_fingerprint = Column(String(255), nullable=True)
    
    # Timestamp
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    
    # Indexes for performance and auditing
    __table_args__ = (
        Index('idx_mfa_events_user', 'user_id', 'created_at'),
        Index('idx_mfa_events_type', 'event_type', 'created_at'),
    )
    
    def __repr__(self):
        return f"<MFAEvent(user_id={self.user_id}, type='{self.event_type}', status='{self.event_status}')>"