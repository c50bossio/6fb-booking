from sqlalchemy import (
    Column,
    String,
    Date,
    DateTime,
    Integer,
    ForeignKey,
    Float,
    Text,
    Boolean,
)
from sqlalchemy.orm import relationship
from .base import BaseModel


class Appointment(BaseModel):
    """
    Appointment model - core of 6FB tracking system
    Based on current 6FB tracking spreadsheet structure
    """

    __tablename__ = "appointments"

    # Basic Appointment Info
    appointment_date = Column(Date, nullable=False, index=True)
    appointment_time = Column(DateTime)
    duration_minutes = Column(Integer, default=60)

    # Relationships
    barber_id = Column(Integer, ForeignKey("barbers.id"), nullable=False)
    barber = relationship("Barber", back_populates="appointments")

    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    client = relationship("Client", back_populates="appointments")

    # Payment relationships
    payments = relationship("Payment", back_populates="appointment")
    square_payments = relationship("SquarePayment", back_populates="appointment")

    # Review relationship
    review = relationship("Review", back_populates="appointment", uselist=False)

    # 6FB Core Tracking Fields (matching current spreadsheet)
    service_revenue = Column(
        Float, default=0.0, nullable=False
    )  # "Service Revenue" column
    tip_amount = Column(Float, default=0.0)  # "Tip" column
    product_revenue = Column(Float, default=0.0)  # "Product Revenue" column

    # Customer Classification (for 6FB analysis)
    customer_type = Column(
        String(20), nullable=False
    )  # "New" or "Returning" - matches spreadsheet
    reference_source = Column(String(100))  # "Reference" column - booking source

    # Status and Completion
    status = Column(
        String(20), default="scheduled"
    )  # scheduled, completed, cancelled, no_show
    is_completed = Column(Boolean, default=False)
    completion_time = Column(DateTime)

    # Service Details
    service_name = Column(String(200))
    service_category = Column(String(100))
    add_ons = Column(Text)  # JSON string of additional services

    # Payment Information
    payment_method = Column(String(50))  # cash, card, digital
    payment_status = Column(String(20), default="pending")  # pending, paid, refunded
    deposit_amount = Column(Float, default=0.0)
    payment_processor = Column(String(50))  # stripe, square

    # Notes and Tags
    barber_notes = Column(Text)
    client_notes = Column(Text)
    tags = Column(String(500))  # Comma-separated tags

    # Booking Metadata
    booking_source = Column(String(50))  # website, phone, walk_in, referral, social
    booking_device = Column(String(50))  # mobile, desktop, tablet
    booking_time = Column(DateTime)  # When the appointment was booked

    # Google Calendar Integration
    google_calendar_event_id = Column(String(255))  # Store Google Calendar event ID

    # Quality Metrics
    client_satisfaction = Column(Integer)  # 1-5 rating
    service_rating = Column(Integer)  # 1-5 rating

    def __repr__(self):
        return f"<Appointment(date={self.appointment_date}, client={self.client.full_name if self.client else 'Unknown'}, revenue=${self.total_revenue})>"

    @property
    def total_revenue(self):
        """Calculate total revenue for this appointment (service + tip + products)"""
        return (
            (self.service_revenue or 0)
            + (self.tip_amount or 0)
            + (self.product_revenue or 0)
        )

    @property
    def tip_percentage(self):
        """Calculate tip as percentage of service revenue"""
        if self.service_revenue and self.service_revenue > 0:
            return (self.tip_amount or 0) / self.service_revenue * 100
        return 0

    @property
    def revenue_per_hour(self):
        """Calculate revenue per hour for this appointment"""
        if self.duration_minutes and self.duration_minutes > 0:
            hours = self.duration_minutes / 60
            return self.total_revenue / hours
        return self.total_revenue
