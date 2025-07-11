"""Guest booking model for unauthenticated public bookings."""

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, Text, Float, JSON, Index
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime, timezone


def utcnow():
    """Helper function for UTC datetime."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


class GuestBooking(Base):
    """Model for guest bookings made through public booking pages."""
    __tablename__ = "guest_bookings"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Guest information
    guest_name = Column(String, nullable=False, index=True)
    guest_email = Column(String, nullable=False, index=True)
    guest_phone = Column(String, nullable=False)
    
    # Booking details
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    barber_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Optional if org has multiple barbers
    service_id = Column(Integer, ForeignKey("services.id"), nullable=False)
    appointment_datetime = Column(DateTime, nullable=False)
    appointment_timezone = Column(String(50), nullable=False)  # Timezone of the appointment
    duration_minutes = Column(Integer, nullable=False)
    
    # Pricing
    service_price = Column(Float, nullable=False)
    deposit_amount = Column(Float, default=0.0)
    
    # Status tracking
    status = Column(String, default="pending")  # pending, confirmed, completed, cancelled
    confirmation_code = Column(String, unique=True, index=True)  # Unique code for lookup
    
    # Payment information
    payment_intent_id = Column(String, nullable=True)  # Stripe payment intent
    payment_status = Column(String, default="pending")  # pending, paid, refunded
    
    # Conversion tracking
    converted_to_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # If guest creates account
    converted_to_appointment_id = Column(Integer, ForeignKey("appointments.id"), nullable=True)
    conversion_date = Column(DateTime, nullable=True)
    
    # Marketing/tracking
    referral_source = Column(String, nullable=True)  # utm_source or referrer
    booking_page_url = Column(String, nullable=True)  # Which page they booked from
    user_agent = Column(Text, nullable=True)  # Browser/device info
    ip_address = Column(String, nullable=True)  # For fraud prevention
    
    # Additional preferences
    notes = Column(Text, nullable=True)
    marketing_consent = Column(Boolean, default=False)
    reminder_preference = Column(String, default="email")  # email, sms, both, none
    
    # Timestamps
    created_at = Column(DateTime, default=utcnow, index=True)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
    
    # Relationships
    organization = relationship("Organization", back_populates="guest_bookings")
    barber = relationship("User", foreign_keys=[barber_id])
    service = relationship("Service")
    converted_user = relationship("User", foreign_keys=[converted_to_user_id])
    converted_appointment = relationship("Appointment")
    
    # Indexes for performance
    __table_args__ = (
        Index('idx_guest_email_org', 'guest_email', 'organization_id'),
        Index('idx_guest_phone_org', 'guest_phone', 'organization_id'),
        Index('idx_appointment_date_org', 'appointment_datetime', 'organization_id'),
        Index('idx_status_org', 'status', 'organization_id'),
    )
    
    @property
    def is_converted(self):
        """Check if guest booking has been converted to user account."""
        return self.converted_to_user_id is not None
    
    @property
    def can_modify(self):
        """Check if booking can still be modified."""
        return self.status in ["pending", "confirmed"]
    
    def __repr__(self):
        return f"<GuestBooking(id={self.id}, guest='{self.guest_name}', org={self.organization_id}, status='{self.status}')>"


class GuestBookingNotification(Base):
    """Track notifications sent for guest bookings."""
    __tablename__ = "guest_booking_notifications"
    
    id = Column(Integer, primary_key=True, index=True)
    guest_booking_id = Column(Integer, ForeignKey("guest_bookings.id"), nullable=False)
    
    notification_type = Column(String, nullable=False)  # confirmation, reminder, follow_up
    channel = Column(String, nullable=False)  # email, sms
    
    # Status
    sent_at = Column(DateTime, nullable=True)
    delivered_at = Column(DateTime, nullable=True)
    failed_at = Column(DateTime, nullable=True)
    error_message = Column(Text, nullable=True)
    
    # Content
    subject = Column(String, nullable=True)  # For emails
    content = Column(Text, nullable=False)
    
    # Tracking
    opened_at = Column(DateTime, nullable=True)  # For emails
    clicked_at = Column(DateTime, nullable=True)  # For emails with links
    
    # Timestamps
    created_at = Column(DateTime, default=utcnow)
    
    # Relationships
    guest_booking = relationship("GuestBooking")
    
    __table_args__ = (
        Index('idx_guest_booking_type', 'guest_booking_id', 'notification_type'),
    )