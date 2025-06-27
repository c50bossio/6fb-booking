"""
MFA Settings Model
Multi-Factor Authentication settings for users
"""

from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    DateTime,
    Text,
    ForeignKey,
    JSON,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from config.database import Base
from utils.encryption import EncryptedString, EncryptedText


class MFASettings(Base):
    """Multi-Factor Authentication settings for users"""
    
    __tablename__ = "mfa_settings"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    is_enabled = Column(Boolean, default=False, nullable=False)
    secret_key = Column(EncryptedString(255), nullable=True)  # TOTP secret
    backup_codes = Column(EncryptedText, nullable=True)  # JSON of backup codes
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_used_at = Column(DateTime(timezone=True), nullable=True)
    
    # Device trust settings
    trusted_devices = Column(JSON, default=list)  # List of trusted device fingerprints
    require_for_api = Column(Boolean, default=True)
    require_for_admin = Column(Boolean, default=True)
    
    # Backup code tracking
    backup_codes_used = Column(JSON, default=list)  # Track which backup codes have been used
    
    # Relationship back to user (commented out temporarily)
    # user = relationship("User", back_populates="mfa_settings")
    
    def __repr__(self):
        return f"<MFASettings(user_id={self.user_id}, enabled={self.is_enabled})>"