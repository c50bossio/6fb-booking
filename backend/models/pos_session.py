from sqlalchemy import Column, String, Boolean, Integer, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
from .base import BaseModel


class POSSession(BaseModel):
    """Model for tracking active POS sessions for barbers"""

    __tablename__ = "pos_sessions"

    # Session identifiers
    session_token = Column(String(255), unique=True, index=True, nullable=False)
    barber_id = Column(Integer, ForeignKey("barbers.id"), nullable=False)

    # Session metadata
    device_info = Column(String(500), nullable=True)  # Browser/device information
    ip_address = Column(String(45), nullable=True)  # IPv4/IPv6 address
    location_info = Column(String(255), nullable=True)  # Location context if available

    # Session status
    is_active = Column(Boolean, default=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    last_activity = Column(
        DateTime(timezone=True), default=func.now(), onupdate=func.now()
    )

    # Security tracking
    login_method = Column(String(50), default="pin")  # "pin", "emergency", etc.
    logout_reason = Column(
        String(100), nullable=True
    )  # "manual", "timeout", "security"

    # Relationships
    barber = relationship("Barber", back_populates="pos_sessions")

    def __repr__(self):
        return f"<POSSession(barber_id={self.barber_id}, active={self.is_active}, expires={self.expires_at})>"
