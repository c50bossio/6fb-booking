"""
Customer Model
Customer model for 6FB booking platform
"""

from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    DateTime,
    Text,
    ForeignKey,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from config.database import Base


class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)

    # Basic Information
    email = Column(String(500), unique=True, index=True, nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    phone = Column(String(20), nullable=True)

    # Authentication
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    last_login = Column(DateTime, nullable=True)

    # Preferences
    newsletter_subscription = Column(Boolean, default=True)
    preferred_barber_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    preferred_location_id = Column(Integer, ForeignKey("locations.id"), nullable=True)

    # Profile
    avatar_url = Column(String(500), nullable=True)
    notes = Column(Text, nullable=True)  # Internal notes for staff

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    preferred_barber = relationship("User", foreign_keys=[preferred_barber_id])
    preferred_location = relationship("Location", foreign_keys=[preferred_location_id])

    # Booking relationships
    appointments = relationship("Appointment", back_populates="customer")

    # Payment relationships
    payment_methods = relationship("CustomerPaymentMethod", back_populates="customer")
    payments = relationship("Payment", foreign_keys="Payment.customer_id")

    def __repr__(self):
        return (
            f"<Customer(id={self.id}, email='{self.email}', name='{self.full_name}')>"
        )

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"


class CustomerPaymentMethod(Base):
    __tablename__ = "customer_payment_methods"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)

    # Payment method details
    type = Column(String(50), nullable=False)  # card, apple_pay, google_pay, etc.
    provider = Column(String(50), nullable=False)  # stripe, square, etc.
    provider_payment_method_id = Column(String(255), nullable=False)

    # Card details (if applicable)
    last_four = Column(String(4), nullable=True)
    brand = Column(String(50), nullable=True)  # visa, mastercard, etc.
    exp_month = Column(Integer, nullable=True)
    exp_year = Column(Integer, nullable=True)

    # Status
    is_default = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    customer = relationship("Customer", back_populates="payment_methods")

    def __repr__(self):
        return f"<CustomerPaymentMethod(id={self.id}, customer_id={self.customer_id}, type='{self.type}')>"
