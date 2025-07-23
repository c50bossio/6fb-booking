"""
Staff invitation model for BookedBarber.

This model handles invitations sent by organization owners/managers
to invite staff members (barbers, receptionists) to join their organization.
"""

from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Enum, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timedelta
import secrets
import enum

from db import Base


class InvitationStatus(enum.Enum):
    """Status of an invitation"""
    PENDING = "pending"
    ACCEPTED = "accepted"
    EXPIRED = "expired"
    CANCELLED = "cancelled"


class InvitationRole(enum.Enum):
    """Roles that can be assigned through invitations"""
    BARBER = "barber"
    RECEPTIONIST = "receptionist"
    SHOP_MANAGER = "shop_manager"


class StaffInvitation(Base):
    """Model for staff invitations"""
    __tablename__ = "staff_invitations"
    
    # Primary key
    id = Column(Integer, primary_key=True, index=True)
    
    # Invitation details
    token = Column(String(64), unique=True, nullable=False, index=True)
    email = Column(String(255), nullable=False, index=True)
    first_name = Column(String(100), nullable=True)
    last_name = Column(String(100), nullable=True)
    
    # Role and permissions
    invited_role = Column(Enum(InvitationRole), nullable=False)
    message = Column(Text, nullable=True)  # Optional personal message
    
    # Organization relationship
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    organization = relationship("Organization", back_populates="invitations")
    
    # Inviter information
    invited_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    invited_by = relationship("User", foreign_keys=[invited_by_id])
    
    # Status tracking
    status = Column(Enum(InvitationStatus), default=InvitationStatus.PENDING, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    accepted_at = Column(DateTime, nullable=True)
    
    # User who accepted (if any)
    accepted_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    accepted_by = relationship("User", foreign_keys=[accepted_by_id])
    
    # Security
    email_sent_at = Column(DateTime, nullable=True)
    email_send_count = Column(Integer, default=0)
    last_viewed_at = Column(DateTime, nullable=True)
    
    def __init__(self, **kwargs):
        """Initialize invitation with secure token and expiration"""
        super().__init__(**kwargs)
        
        # Generate secure token if not provided
        if not self.token:
            self.token = self.generate_secure_token()
        
        # Set expiration to 7 days if not provided
        if not self.expires_at:
            self.expires_at = datetime.utcnow() + timedelta(days=7)
    
    @staticmethod
    def generate_secure_token(length: int = 32) -> str:
        """Generate a cryptographically secure invitation token"""
        return secrets.token_urlsafe(length)
    
    @property
    def is_expired(self) -> bool:
        """Check if invitation has expired"""
        return datetime.utcnow() > self.expires_at
    
    @property
    def is_valid(self) -> bool:
        """Check if invitation is valid for use"""
        return (
            self.status == InvitationStatus.PENDING and
            not self.is_expired
        )
    
    @property
    def days_until_expiry(self) -> int:
        """Get days until invitation expires"""
        if self.is_expired:
            return 0
        delta = self.expires_at - datetime.utcnow()
        return delta.days
    
    def mark_as_viewed(self) -> None:
        """Mark invitation as viewed"""
        self.last_viewed_at = datetime.utcnow()
    
    def accept(self, user_id: int) -> None:
        """Accept the invitation"""
        self.status = InvitationStatus.ACCEPTED
        self.accepted_at = datetime.utcnow()
        self.accepted_by_id = user_id
    
    def cancel(self) -> None:
        """Cancel the invitation"""
        self.status = InvitationStatus.CANCELLED
    
    def extend_expiration(self, days: int = 7) -> None:
        """Extend invitation expiration"""
        self.expires_at = datetime.utcnow() + timedelta(days=days)
        if self.status == InvitationStatus.EXPIRED:
            self.status = InvitationStatus.PENDING
    
    def to_dict(self) -> dict:
        """Convert invitation to dictionary"""
        return {
            "id": self.id,
            "email": self.email,
            "first_name": self.first_name,
            "last_name": self.last_name,
            "role": self.invited_role.value,
            "organization_id": self.organization_id,
            "organization_name": self.organization.name if self.organization else None,
            "status": self.status.value,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "days_until_expiry": self.days_until_expiry,
            "invited_by_name": self.invited_by.name if self.invited_by else None,
            "message": self.message
        }
    
    def __repr__(self):
        return f"<StaffInvitation(id={self.id}, email={self.email}, role={self.invited_role.value}, status={self.status.value})>"