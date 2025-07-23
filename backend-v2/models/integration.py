"""
Integration model for managing third-party service integrations.
Handles OAuth tokens, configurations, and health monitoring.
"""

from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, JSON, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import enum
import sys
import os

# Add parent directory to path to resolve imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db import Base
from utils.encryption import EncryptedText


def utcnow():
    """Helper function for UTC datetime (replaces deprecated utcnow())"""
    return datetime.now(timezone.utc).replace(tzinfo=None)


class IntegrationType(enum.Enum):
    """Supported integration types"""
    GOOGLE_CALENDAR = "google_calendar"
    GOOGLE_MY_BUSINESS = "google_my_business"
    GOOGLE_ADS = "google_ads"
    META_BUSINESS = "meta_business"
    STRIPE = "stripe"
    SENDGRID = "sendgrid"
    TWILIO = "twilio"
    SQUARE = "square"
    SHOPIFY = "shopify"
    ACUITY = "acuity"
    BOOKSY = "booksy"
    EMAIL_MARKETING = "email_marketing"
    SMS_MARKETING = "sms_marketing"
    CUSTOM = "custom"


class IntegrationStatus(enum.Enum):
    """Integration health status"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    ERROR = "error"
    PENDING = "pending"
    EXPIRED = "expired"
    SUSPENDED = "suspended"


class Integration(Base):
    """
    Stores integration configurations and OAuth tokens for third-party services.
    Uses encryption for sensitive data like tokens and credentials.
    """
    __tablename__ = "integrations"
    
    # Primary fields
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    integration_type = Column(SQLEnum(IntegrationType, values_callable=lambda obj: [e.value for e in obj]), nullable=False)
    name = Column(String(255), nullable=False)  # User-friendly name
    
    # OAuth and authentication
    access_token = Column(EncryptedText, nullable=True)  # Encrypted OAuth access token
    refresh_token = Column(EncryptedText, nullable=True)  # Encrypted OAuth refresh token
    token_expires_at = Column(DateTime, nullable=True)  # Token expiration time
    
    # API credentials (for non-OAuth integrations)
    api_key = Column(EncryptedText, nullable=True)  # Encrypted API key
    api_secret = Column(EncryptedText, nullable=True)  # Encrypted API secret
    webhook_secret = Column(EncryptedText, nullable=True)  # For webhook validation
    
    # Configuration
    config = Column(JSON, default=dict)  # Integration-specific settings
    scopes = Column(JSON, default=list)  # OAuth scopes granted
    webhook_url = Column(String(500), nullable=True)  # Our webhook endpoint for this integration
    
    # Status and health
    status = Column(SQLEnum(IntegrationStatus, values_callable=lambda obj: [e.value for e in obj]), default=IntegrationStatus.PENDING)
    last_sync_at = Column(DateTime, nullable=True)
    last_error = Column(Text, nullable=True)
    error_count = Column(Integer, default=0)
    health_check_data = Column(JSON, default=dict)  # Latest health check results
    last_health_check = Column(DateTime, nullable=True)  # When health check was last performed
    
    # Metadata
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
    
    # Relationships
    user = relationship("User", backref="integrations")
    
    def __repr__(self):
        return f"<Integration(id={self.id}, type={self.integration_type.value}, user_id={self.user_id}, status={self.status.value})>"
    
    def is_token_expired(self) -> bool:
        """Check if the OAuth token is expired"""
        if not self.token_expires_at:
            return False
        return datetime.utcnow() > self.token_expires_at
    
    def mark_error(self, error_message: str):
        """Mark integration as having an error"""
        self.status = IntegrationStatus.ERROR
        self.last_error = error_message
        self.error_count += 1
        self.updated_at = utcnow()
    
    def mark_active(self):
        """Mark integration as active and clear errors"""
        self.status = IntegrationStatus.ACTIVE
        self.last_error = None
        self.error_count = 0
        self.updated_at = utcnow()
    
    def update_health_check(self, health_data: dict):
        """Update health check data"""
        self.health_check_data = health_data
        self.last_health_check = utcnow()
        self.updated_at = utcnow()
        
        # Update status based on health check
        if health_data.get("healthy", False):
            self.mark_active()
        else:
            self.mark_error(health_data.get("error", "Health check failed"))