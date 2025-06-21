"""
Barber Payment and Commission Models
Handles booth rent, service commissions, and product sales commissions
"""

from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    DateTime,
    Boolean,
    ForeignKey,
    Enum,
    Text,
    Numeric,
)
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
import enum

from config.database import Base


class PaymentModelType(enum.Enum):
    """Payment model types for barbers"""

    BOOTH_RENT = "booth_rent"  # Fixed rent payment
    COMMISSION = "commission"  # Percentage of services
    HYBRID = "hybrid"  # Rent + commission
    PRODUCT_ONLY = "product_only"  # Only product commissions


class PaymentStatus(enum.Enum):
    """Payment status options"""

    PENDING = "pending"
    PAID = "paid"
    OVERDUE = "overdue"
    PARTIAL = "partial"
    CANCELLED = "cancelled"


class BarberPaymentModel(Base):
    """Defines how each barber gets paid at specific locations"""

    __tablename__ = "barber_payment_models"

    id = Column(Integer, primary_key=True, index=True)
    barber_id = Column(Integer, ForeignKey("barbers.id"), nullable=False)
    location_id = Column(
        Integer, ForeignKey("locations.id"), nullable=True
    )  # Specific to location

    # Payment model configuration
    payment_type = Column(Enum(PaymentModelType), nullable=False)

    # Booth rent settings
    booth_rent_amount = Column(Numeric(10, 2), default=0.00)  # Weekly/monthly rent
    rent_frequency = Column(String(20), default="weekly")  # weekly, monthly
    rent_due_day = Column(Integer, default=1)  # Day of week/month

    # Service commission settings
    service_commission_rate = Column(Float, default=0.0)  # 0.0 to 1.0 (0% to 100%)
    minimum_service_payout = Column(Numeric(10, 2), default=0.00)

    # Product commission settings
    product_commission_rate = Column(Float, default=0.15)  # Default 15%
    minimum_product_payout = Column(Numeric(10, 2), default=0.00)

    # Stripe Connect integration
    stripe_connect_account_id = Column(
        String(100), nullable=True
    )  # Barber's Stripe Connect account ID
    stripe_onboarding_completed = Column(Boolean, default=False)  # Completed onboarding
    stripe_payouts_enabled = Column(Boolean, default=False)  # Can receive payouts
    enable_instant_payouts = Column(
        Boolean, default=False
    )  # Allow instant payouts (1% fee)

    # RentRedi integration (optional for booth rent)
    rentredi_tenant_id = Column(String(100), nullable=True)
    rentredi_property_id = Column(String(100), nullable=True)

    # Square integration
    square_location_id = Column(String(100), nullable=True)
    square_employee_id = Column(String(100), nullable=True)
    square_merchant_id = Column(
        String(100), nullable=True
    )  # Barber's Square merchant account
    square_access_token = Column(
        String(500), nullable=True
    )  # Encrypted Square access token
    square_account_verified = Column(
        Boolean, default=False
    )  # Account verification status

    # Settings
    active = Column(Boolean, default=True)
    auto_collect_rent = Column(Boolean, default=True)
    auto_pay_commissions = Column(Boolean, default=False)
    payout_method = Column(String(50), nullable=True)  # ach, zelle, venmo, check

    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    notes = Column(Text, nullable=True)

    # Relationships
    barber = relationship("Barber", back_populates="payment_models")
    location = relationship("Location", back_populates="barber_payment_models")
    rent_payments = relationship("BoothRentPayment", back_populates="payment_model")
    commission_payments = relationship(
        "CommissionPayment", back_populates="payment_model"
    )


class BoothRentPayment(Base):
    """Individual booth rent payments"""

    __tablename__ = "booth_rent_payments"

    id = Column(Integer, primary_key=True, index=True)
    payment_model_id = Column(
        Integer, ForeignKey("barber_payment_models.id"), nullable=False
    )
    barber_id = Column(Integer, ForeignKey("barbers.id"), nullable=False)

    # Payment details
    amount_due = Column(Numeric(10, 2), nullable=False)
    amount_paid = Column(Numeric(10, 2), default=0.00)
    due_date = Column(DateTime, nullable=False)
    paid_date = Column(DateTime, nullable=True)

    # Period covered
    period_start = Column(DateTime, nullable=False)
    period_end = Column(DateTime, nullable=False)

    # Status and tracking
    status = Column(Enum(PaymentStatus), default=PaymentStatus.PENDING)
    payment_method = Column(String(50), nullable=True)  # rentredi, manual, card, etc.

    # RentRedi integration
    rentredi_payment_id = Column(String(100), nullable=True)
    rentredi_transaction_id = Column(String(100), nullable=True)

    # Late fees
    late_fee_amount = Column(Numeric(10, 2), default=0.00)
    grace_period_days = Column(Integer, default=3)

    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    notes = Column(Text, nullable=True)

    # Relationships
    payment_model = relationship("BarberPaymentModel", back_populates="rent_payments")
    barber = relationship("Barber")


class ProductSale(Base):
    """Track product sales for commission calculation"""

    __tablename__ = "product_sales"

    id = Column(Integer, primary_key=True, index=True)
    barber_id = Column(Integer, ForeignKey("barbers.id"), nullable=False)

    # Product details
    product_name = Column(String(200), nullable=False)
    product_sku = Column(String(100), nullable=True)
    category = Column(String(100), nullable=True)  # pomade, tools, accessories

    # Sale details
    sale_price = Column(Numeric(10, 2), nullable=False)
    cost_price = Column(Numeric(10, 2), nullable=True)
    quantity = Column(Integer, default=1)
    total_amount = Column(Numeric(10, 2), nullable=False)

    # Commission
    commission_rate = Column(Float, nullable=False)  # Rate used for this sale
    commission_amount = Column(Numeric(10, 2), nullable=False)
    commission_paid = Column(Boolean, default=False)

    # Square integration
    square_transaction_id = Column(String(100), nullable=True)
    square_payment_id = Column(String(100), nullable=True)
    square_location_id = Column(String(100), nullable=True)

    # Customer info (optional)
    customer_name = Column(String(200), nullable=True)
    customer_email = Column(String(200), nullable=True)
    appointment_id = Column(Integer, ForeignKey("appointments.id"), nullable=True)

    # Metadata
    sale_date = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    notes = Column(Text, nullable=True)

    # Relationships
    barber = relationship("Barber")


class CommissionPayment(Base):
    """Commission payments to barbers (services + products)"""

    __tablename__ = "commission_payments"

    id = Column(Integer, primary_key=True, index=True)
    payment_model_id = Column(
        Integer, ForeignKey("barber_payment_models.id"), nullable=False
    )
    barber_id = Column(Integer, ForeignKey("barbers.id"), nullable=False)

    # Payment period
    period_start = Column(DateTime, nullable=False)
    period_end = Column(DateTime, nullable=False)

    # Service commissions
    service_revenue = Column(Numeric(10, 2), default=0.00)
    service_commission_rate = Column(Float, default=0.0)
    service_commission_amount = Column(Numeric(10, 2), default=0.00)

    # Product commissions
    product_revenue = Column(Numeric(10, 2), default=0.00)
    product_commission_rate = Column(Float, default=0.0)
    product_commission_amount = Column(Numeric(10, 2), default=0.00)

    # Totals
    total_commission = Column(Numeric(10, 2), nullable=False)
    total_paid = Column(Numeric(10, 2), default=0.00)

    # Payment details
    status = Column(Enum(PaymentStatus), default=PaymentStatus.PENDING)
    payment_method = Column(String(50), nullable=True)
    paid_date = Column(DateTime, nullable=True)

    # Stripe payout details
    stripe_transfer_id = Column(
        String(100), nullable=True
    )  # Transfer to connected account
    stripe_payout_id = Column(String(100), nullable=True)  # Payout to bank
    payout_status = Column(String(50), nullable=True)  # pending, paid, failed, canceled
    payout_arrival_date = Column(DateTime, nullable=True)
    shop_owner_amount = Column(Numeric(10, 2), default=0.00)  # Shop owner's portion
    barber_amount = Column(Numeric(10, 2), default=0.00)  # Barber's portion

    # Adjustments
    adjustment_amount = Column(Numeric(10, 2), default=0.00)
    adjustment_reason = Column(String(200), nullable=True)

    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    notes = Column(Text, nullable=True)

    # Relationships
    payment_model = relationship(
        "BarberPaymentModel", back_populates="commission_payments"
    )
    barber = relationship("Barber")


class PaymentIntegration(Base):
    """Store integration settings for payment services"""

    __tablename__ = "payment_integrations"

    id = Column(Integer, primary_key=True, index=True)

    # Stripe Connect configuration
    stripe_platform_fee_percent = Column(
        Float, default=0.25
    )  # Platform fee (0.25% + $0.25)
    stripe_instant_fee_percent = Column(Float, default=1.0)  # Instant payout fee
    stripe_webhook_configured = Column(Boolean, default=False)
    last_payout_sync = Column(DateTime, nullable=True)

    # RentRedi configuration (optional for booth rent)
    rentredi_api_key = Column(String(200), nullable=True)
    rentredi_environment = Column(String(20), default="sandbox")  # sandbox, production
    rentredi_webhook_secret = Column(String(200), nullable=True)

    # Square configuration for product sales
    square_application_id = Column(String(200), nullable=True)
    square_access_token = Column(String(200), nullable=True)
    square_environment = Column(String(20), default="sandbox")  # sandbox, production
    square_webhook_signature_key = Column(String(200), nullable=True)

    # General settings
    auto_sync_enabled = Column(Boolean, default=True)
    sync_frequency_hours = Column(Integer, default=24)
    last_sync_at = Column(DateTime, nullable=True)

    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
