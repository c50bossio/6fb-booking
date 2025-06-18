"""Payment models for Stripe integration."""
from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import Optional, Dict, Any, List

from sqlalchemy import (
    Column, String, Integer, Float, DateTime, Boolean, 
    ForeignKey, Text, JSON, Enum as SQLAlchemyEnum, Index,
    UniqueConstraint, CheckConstraint
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from models.base import Base


class PaymentStatus(str, Enum):
    """Payment status enumeration."""
    PENDING = "pending"
    PROCESSING = "processing"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"
    PARTIALLY_REFUNDED = "partially_refunded"
    REQUIRES_ACTION = "requires_action"


class PaymentMethodType(str, Enum):
    """Payment method type enumeration."""
    CARD = "card"
    BANK_ACCOUNT = "bank_account"
    APPLE_PAY = "apple_pay"
    GOOGLE_PAY = "google_pay"


class RefundStatus(str, Enum):
    """Refund status enumeration."""
    PENDING = "pending"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    CANCELLED = "cancelled"


class PaymentMethod(Base):
    """Model for storing customer payment methods."""
    __tablename__ = "payment_methods"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    stripe_payment_method_id = Column(String(255), unique=True, nullable=False, index=True)
    type = Column(SQLAlchemyEnum(PaymentMethodType), nullable=False)
    
    # Card details (last 4 digits, brand, etc.)
    last_four = Column(String(4))
    brand = Column(String(50))
    exp_month = Column(Integer)
    exp_year = Column(Integer)
    
    # Bank account details
    bank_name = Column(String(100))
    account_last_four = Column(String(4))
    
    # Metadata
    is_default = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="payment_methods")
    payments = relationship("Payment", back_populates="payment_method")
    
    # Indexes
    __table_args__ = (
        Index('idx_payment_methods_user_default', 'user_id', 'is_default'),
        Index('idx_payment_methods_user_active', 'user_id', 'is_active'),
        # Note: Unique constraint for one default per user is handled in service logic
    )


class Payment(Base):
    """Model for payment transactions."""
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    appointment_id = Column(Integer, ForeignKey("appointments.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    payment_method_id = Column(Integer, ForeignKey("payment_methods.id"))
    
    # Stripe identifiers
    stripe_payment_intent_id = Column(String(255), unique=True, nullable=False, index=True)
    stripe_charge_id = Column(String(255), unique=True, index=True)
    
    # Payment details
    amount = Column(Integer, nullable=False)  # Amount in cents
    currency = Column(String(3), default="USD", nullable=False)
    status = Column(SQLAlchemyEnum(PaymentStatus), nullable=False, default=PaymentStatus.PENDING, index=True)
    
    # Additional payment info
    description = Column(Text)
    meta_data = Column(JSON, default=dict)
    
    # Error handling
    failure_code = Column(String(50))
    failure_message = Column(Text)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    paid_at = Column(DateTime(timezone=True))
    
    # Relationships
    appointment = relationship("Appointment", back_populates="payments")
    user = relationship("User", back_populates="payments")
    payment_method = relationship("PaymentMethod", back_populates="payments")
    refunds = relationship("Refund", back_populates="payment")
    webhook_events = relationship("PaymentWebhookEvent", back_populates="payment")
    
    # Indexes
    __table_args__ = (
        Index('idx_payments_user_status', 'user_id', 'status'),
        Index('idx_payments_appointment', 'appointment_id'),
        Index('idx_payments_created_at', 'created_at'),
        CheckConstraint('amount > 0', name='check_positive_amount'),
    )
    
    @property
    def amount_decimal(self) -> Decimal:
        """Return amount as decimal dollars."""
        return Decimal(self.amount) / 100
    
    @property
    def refunded_amount(self) -> int:
        """Calculate total refunded amount in cents."""
        return sum(r.amount for r in self.refunds if r.status == RefundStatus.SUCCEEDED)
    
    @property
    def refundable_amount(self) -> int:
        """Calculate refundable amount in cents."""
        return self.amount - self.refunded_amount


class Refund(Base):
    """Model for payment refunds."""
    __tablename__ = "refunds"

    id = Column(Integer, primary_key=True, index=True)
    payment_id = Column(Integer, ForeignKey("payments.id"), nullable=False, index=True)
    
    # Stripe identifiers
    stripe_refund_id = Column(String(255), unique=True, nullable=False, index=True)
    
    # Refund details
    amount = Column(Integer, nullable=False)  # Amount in cents
    reason = Column(String(255))
    status = Column(SQLAlchemyEnum(RefundStatus), nullable=False, default=RefundStatus.PENDING, index=True)
    
    # Metadata
    meta_data = Column(JSON, default=dict)
    
    # Error handling
    failure_reason = Column(Text)
    
    # User who initiated the refund
    initiated_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    refunded_at = Column(DateTime(timezone=True))
    
    # Relationships
    payment = relationship("Payment", back_populates="refunds")
    initiated_by = relationship("User", foreign_keys=[initiated_by_id])
    
    # Indexes
    __table_args__ = (
        Index('idx_refunds_payment_status', 'payment_id', 'status'),
        Index('idx_refunds_created_at', 'created_at'),
        CheckConstraint('amount > 0', name='check_positive_refund_amount'),
    )


class PaymentWebhookEvent(Base):
    """Model for storing Stripe webhook events."""
    __tablename__ = "payment_webhook_events"

    id = Column(Integer, primary_key=True, index=True)
    stripe_event_id = Column(String(255), unique=True, nullable=False, index=True)
    event_type = Column(String(100), nullable=False, index=True)
    
    # Related payment (if applicable)
    payment_id = Column(Integer, ForeignKey("payments.id"), index=True)
    
    # Event data
    data = Column(JSON, nullable=False)
    
    # Processing status
    processed = Column(Boolean, default=False, nullable=False, index=True)
    processed_at = Column(DateTime(timezone=True))
    error = Column(Text)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    payment = relationship("Payment", back_populates="webhook_events")
    
    # Indexes
    __table_args__ = (
        Index('idx_webhook_events_type_processed', 'event_type', 'processed'),
        Index('idx_webhook_events_created_at', 'created_at'),
    )


class StripeCustomer(Base):
    """Model for mapping users to Stripe customers."""
    __tablename__ = "stripe_customers"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False, index=True)
    stripe_customer_id = Column(String(255), unique=True, nullable=False, index=True)
    
    # Customer details
    default_payment_method_id = Column(Integer, ForeignKey("payment_methods.id"))
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="stripe_customer", uselist=False)
    default_payment_method = relationship("PaymentMethod", foreign_keys=[default_payment_method_id])


class PaymentReport(Base):
    """Model for storing generated payment reports."""
    __tablename__ = "payment_reports"

    id = Column(Integer, primary_key=True, index=True)
    
    # Report details
    report_type = Column(String(50), nullable=False)  # daily, weekly, monthly, custom
    start_date = Column(DateTime(timezone=True), nullable=False)
    end_date = Column(DateTime(timezone=True), nullable=False)
    
    # Report data
    total_revenue = Column(Integer, nullable=False)  # In cents
    total_refunds = Column(Integer, nullable=False)  # In cents
    net_revenue = Column(Integer, nullable=False)  # In cents
    transaction_count = Column(Integer, nullable=False)
    refund_count = Column(Integer, nullable=False)
    
    # Detailed breakdown
    breakdown_by_barber = Column(JSON, default=dict)
    breakdown_by_service = Column(JSON, default=dict)
    breakdown_by_payment_method = Column(JSON, default=dict)
    
    # Report file
    file_path = Column(String(500))
    
    # Generated by
    generated_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    generated_by = relationship("User", foreign_keys=[generated_by_id])
    
    # Indexes
    __table_args__ = (
        Index('idx_payment_reports_dates', 'start_date', 'end_date'),
        Index('idx_payment_reports_type', 'report_type'),
        Index('idx_payment_reports_created_at', 'created_at'),
    )