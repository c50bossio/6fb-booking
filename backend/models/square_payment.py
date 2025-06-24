"""
Square payment models for handling Square payments and payouts
"""

from sqlalchemy import Column, Integer, String, Numeric, DateTime, Boolean, Text, ForeignKey, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from enum import Enum
import enum

from config.database import Base


class SquarePaymentStatus(str, enum.Enum):
    """Square payment status enum"""
    PENDING = "pending"
    APPROVED = "approved"
    COMPLETED = "completed"
    CANCELED = "canceled"
    FAILED = "failed"


class SquarePayoutStatus(str, enum.Enum):
    """Square payout status enum"""
    PENDING = "pending"
    SENT = "sent"
    PAID = "paid"
    FAILED = "failed"
    CANCELED = "canceled"


class SquarePayment(Base):
    """Model for Square payments"""
    __tablename__ = "square_payments"

    id = Column(Integer, primary_key=True, index=True)
    
    # Square payment details
    square_payment_id = Column(String(255), unique=True, index=True, nullable=False)
    square_order_id = Column(String(255), index=True)
    square_receipt_number = Column(String(255))
    square_receipt_url = Column(String(500))
    
    # Payment information
    amount_money = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(3), default="USD")
    tip_money = Column(Numeric(10, 2), default=0)
    total_money = Column(Numeric(10, 2), nullable=False)
    
    # Status and processing
    status = Column(String(50), default=SquarePaymentStatus.PENDING)
    approved_money = Column(Numeric(10, 2))
    processing_fee_money = Column(Numeric(10, 2))
    
    # Card details (if applicable)
    card_brand = Column(String(50))
    card_last_four = Column(String(4))
    card_exp_month = Column(Integer)
    card_exp_year = Column(Integer)
    
    # Buyer information
    buyer_email_address = Column(String(255))
    billing_address = Column(Text)  # JSON string
    shipping_address = Column(Text)  # JSON string
    
    # Relationships
    appointment_id = Column(Integer, ForeignKey("appointments.id"), index=True)
    barber_id = Column(Integer, ForeignKey("barbers.id"), index=True)
    
    # Metadata
    source_type = Column(String(50))  # WEB, MOBILE, etc.
    application_details = Column(Text)  # JSON string
    device_details = Column(Text)  # JSON string
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    appointment = relationship("Appointment", back_populates="square_payments")
    barber = relationship("Barber", back_populates="square_payments")
    payouts = relationship("SquarePayout", back_populates="payment")

    # Indexes for performance
    __table_args__ = (
        Index('idx_square_payment_status_created', 'status', 'created_at'),
        Index('idx_square_payment_barber_date', 'barber_id', 'created_at'),
        Index('idx_square_payment_appointment', 'appointment_id'),
    )


class SquareAccount(Base):
    """Model for Square merchant accounts linked to barbers"""
    __tablename__ = "square_accounts"

    id = Column(Integer, primary_key=True, index=True)
    
    # Barber relationship
    barber_id = Column(Integer, ForeignKey("barbers.id"), unique=True, index=True)
    
    # Square account details
    square_application_id = Column(String(255), nullable=False)
    square_merchant_id = Column(String(255), nullable=False, index=True)
    square_location_id = Column(String(255), index=True)
    
    # OAuth tokens
    access_token = Column(Text, nullable=False)  # Encrypted
    refresh_token = Column(Text)  # Encrypted
    token_expires_at = Column(DateTime(timezone=True))
    token_scope = Column(String(500))
    
    # Merchant information
    merchant_name = Column(String(255))
    merchant_email = Column(String(255))
    merchant_phone = Column(String(50))
    merchant_address = Column(Text)  # JSON string
    country = Column(String(2), default="US")
    currency = Column(String(3), default="USD")
    
    # Business information
    business_name = Column(String(255))
    business_type = Column(String(100))
    business_address = Column(Text)  # JSON string
    
    # Account status
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    can_receive_payments = Column(Boolean, default=False)
    can_make_payouts = Column(Boolean, default=False)
    
    # Onboarding status
    onboarding_completed = Column(Boolean, default=False)
    onboarding_url = Column(String(500))
    requirements_pending = Column(Text)  # JSON array of pending requirements
    
    # Webhooks
    webhook_endpoint_id = Column(String(255))
    webhook_signature_key = Column(String(255))
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    connected_at = Column(DateTime(timezone=True))
    last_sync_at = Column(DateTime(timezone=True))
    
    # Relationships
    barber = relationship("Barber", back_populates="square_account")
    payouts = relationship("SquarePayout", back_populates="square_account")
    
    # Indexes
    __table_args__ = (
        Index('idx_square_account_merchant', 'square_merchant_id'),
        Index('idx_square_account_active', 'is_active', 'is_verified'),
    )


class SquarePayout(Base):
    """Model for Square payouts to barbers"""
    __tablename__ = "square_payouts"

    id = Column(Integer, primary_key=True, index=True)
    
    # Square payout details
    square_payout_id = Column(String(255), unique=True, index=True)
    square_batch_id = Column(String(255), index=True)
    
    # Payout information
    amount_money = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(3), default="USD")
    
    # Status and processing
    status = Column(String(50), default=SquarePayoutStatus.PENDING)
    
    # Relationships
    payment_id = Column(Integer, ForeignKey("square_payments.id"), index=True)
    square_account_id = Column(Integer, ForeignKey("square_accounts.id"), index=True)
    barber_id = Column(Integer, ForeignKey("barbers.id"), index=True)
    
    # Commission details
    original_amount = Column(Numeric(10, 2), nullable=False)
    commission_rate = Column(Numeric(5, 4), nullable=False)  # e.g., 0.7000 for 70%
    commission_amount = Column(Numeric(10, 2), nullable=False)
    platform_fee = Column(Numeric(10, 2), default=0)
    
    # Processing details
    processing_fee = Column(Numeric(10, 2), default=0)
    net_amount = Column(Numeric(10, 2), nullable=False)
    
    # Square payout details
    payout_fee = Column(Numeric(10, 2), default=0)
    destination_type = Column(String(50))  # BANK_ACCOUNT, DEBIT_CARD, etc.
    destination_details = Column(Text)  # JSON string
    
    # Timing
    scheduled_at = Column(DateTime(timezone=True))
    sent_at = Column(DateTime(timezone=True))
    paid_at = Column(DateTime(timezone=True))
    failed_at = Column(DateTime(timezone=True))
    
    # Error handling
    failure_reason = Column(String(500))
    failure_code = Column(String(100))
    retry_count = Column(Integer, default=0)
    
    # Metadata
    description = Column(String(500))
    reference_id = Column(String(255), index=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    payment = relationship("SquarePayment", back_populates="payouts")
    square_account = relationship("SquareAccount", back_populates="payouts")
    barber = relationship("Barber", back_populates="square_payouts")
    
    # Indexes for performance
    __table_args__ = (
        Index('idx_square_payout_status_created', 'status', 'created_at'),
        Index('idx_square_payout_barber_date', 'barber_id', 'created_at'),
        Index('idx_square_payout_account', 'square_account_id'),
    )


class SquareWebhookEvent(Base):
    """Model for Square webhook events"""
    __tablename__ = "square_webhook_events"

    id = Column(Integer, primary_key=True, index=True)
    
    # Square event details
    square_event_id = Column(String(255), unique=True, index=True, nullable=False)
    event_type = Column(String(100), nullable=False, index=True)
    merchant_id = Column(String(255), index=True)
    location_id = Column(String(255), index=True)
    
    # Event data
    event_data = Column(Text, nullable=False)  # JSON string of the full event
    api_version = Column(String(50))
    
    # Processing status
    processed = Column(Boolean, default=False)
    processed_at = Column(DateTime(timezone=True))
    processing_error = Column(Text)
    retry_count = Column(Integer, default=0)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    event_created_at = Column(DateTime(timezone=True))
    
    # Indexes
    __table_args__ = (
        Index('idx_square_webhook_type_processed', 'event_type', 'processed'),
        Index('idx_square_webhook_merchant', 'merchant_id', 'created_at'),
    )