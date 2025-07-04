from sqlalchemy import Column, String, Date, Integer, ForeignKey, Float, Text, Boolean
from sqlalchemy.orm import relationship
from .base import BaseModel
from utils.encryption import EncryptedString, EncryptedText, SearchableEncryptedString


class Client(BaseModel):
    """Client model - represents customers of the barber"""

    __tablename__ = "clients"

    # Basic Info
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    # SECURITY ENHANCEMENT: Encrypt sensitive PII fields
    email = Column(
        SearchableEncryptedString(500), index=True
    )  # Encrypted but searchable
    phone = Column(
        SearchableEncryptedString(100), index=True
    )  # Encrypted but searchable
    date_of_birth = Column(
        Date
    )  # Consider encrypting if not needed for age calculations

    # Relationship
    barber_id = Column(Integer, ForeignKey("barbers.id"), nullable=False)
    barber = relationship("Barber", back_populates="clients")

    # Customer Classification (derived from visit patterns)
    customer_type = Column(String(20), default="new")  # new, returning, vip, at_risk
    total_visits = Column(Integer, default=0)
    total_spent = Column(Float, default=0.0)
    average_ticket = Column(Float, default=0.0)

    # Visit Patterns
    first_visit_date = Column(Date)
    last_visit_date = Column(Date)
    visit_frequency_days = Column(Integer)  # Average days between visits

    # Engagement Metrics
    no_show_count = Column(Integer, default=0)
    cancellation_count = Column(Integer, default=0)
    referral_count = Column(Integer, default=0)  # How many customers they referred

    # Preferences and Notes
    preferred_services = Column(Text)  # JSON string of preferred services
    # SECURITY ENHANCEMENT: Encrypt sensitive notes
    notes = Column(EncryptedText)  # Contains private customer information
    tags = Column(String(500))  # Comma-separated tags

    # Communication Preferences
    sms_enabled = Column(Boolean, default=True)
    email_enabled = Column(Boolean, default=True)
    marketing_enabled = Column(Boolean, default=True)

    # Relationships
    appointments = relationship("Appointment", back_populates="client")
    reviews = relationship("Review", back_populates="client")
    appointment_series = relationship("AppointmentSeries", back_populates="client")

    def __repr__(self):
        return f"<Client(name={self.first_name} {self.last_name}, type={self.customer_type})>"

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"

    @property
    def lifetime_value(self):
        """Calculate customer lifetime value based on visit patterns"""
        if self.visit_frequency_days and self.visit_frequency_days > 0:
            visits_per_year = 365 / self.visit_frequency_days
            return self.average_ticket * visits_per_year
        return self.average_ticket
