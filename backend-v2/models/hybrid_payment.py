"""
Hybrid Payment System Models
Supports both centralized and decentralized payment processing
"""

from sqlalchemy import Column, Integer, String, DateTime, Float, ForeignKey, Boolean, Text, JSON, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import enum
from datetime import datetime, timezone

# Helper function for UTC datetime
def utcnow():
    return datetime.now(timezone.utc).replace(tzinfo=None)


class PaymentMode(str, enum.Enum):
    """Payment processing mode for barbers"""
    CENTRALIZED = "centralized"      # Platform processes all payments
    DECENTRALIZED = "decentralized"  # Barber processes payments directly
    HYBRID = "hybrid"                # Mix of both modes


class ExternalPaymentProcessor(str, enum.Enum):
    """Supported external payment processors"""
    STRIPE = "stripe"                # Stripe (both centralized and external)
    SQUARE = "square"                # Square POS and online
    PAYPAL = "paypal"                # PayPal Business
    CLOVER = "clover"                # Clover POS
    TOAST = "toast"                  # Toast POS
    SHOPIFY = "shopify"              # Shopify Payments
    CUSTOM = "custom"                # Custom integration


class CollectionType(str, enum.Enum):
    """Type of platform collection from barber"""
    COMMISSION = "commission"        # Commission on services
    BOOTH_RENT = "booth_rent"        # Booth rental fees
    PLATFORM_FEE = "platform_fee"   # Platform usage fees
    LATE_FEE = "late_fee"           # Late payment fees
    ADJUSTMENT = "adjustment"        # Manual adjustments


class CollectionStatus(str, enum.Enum):
    """Status of platform collection"""
    PENDING = "pending"              # Not yet due
    DUE = "due"                     # Due for collection
    PROCESSING = "processing"        # Collection in progress
    COLLECTED = "collected"          # Successfully collected
    FAILED = "failed"               # Collection failed
    DISPUTED = "disputed"           # Barber disputed collection
    WAIVED = "waived"               # Fee waived by admin


class ConnectionStatus(str, enum.Enum):
    """Status of external payment processor connection"""
    PENDING = "pending"              # Connection initiated
    CONNECTED = "connected"          # Successfully connected
    EXPIRED = "expired"              # Connection expired
    DISCONNECTED = "disconnected"    # Manually disconnected
    ERROR = "error"                  # Connection error


class PaymentProcessorConnection(Base):
    """External payment processor connections for barbers"""
    __tablename__ = "payment_processor_connections"
    
    id = Column(Integer, primary_key=True, index=True)
    barber_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    processor_type = Column(Enum(ExternalPaymentProcessor), nullable=False)
    account_id = Column(String(255), nullable=False)  # External account identifier
    account_name = Column(String(255), nullable=True)  # Display name for account
    status = Column(Enum(ConnectionStatus), default=ConnectionStatus.PENDING, nullable=False)
    
    # Connection configuration and credentials (encrypted)
    connection_data = Column(JSON, nullable=True)  # OAuth tokens, API keys, etc.
    webhook_url = Column(String(500), nullable=True)  # Webhook endpoint for this connection
    webhook_secret = Column(String(255), nullable=True)  # Webhook signature secret
    
    # Capabilities and settings
    supports_payments = Column(Boolean, default=True)
    supports_refunds = Column(Boolean, default=True)
    supports_recurring = Column(Boolean, default=False)
    default_currency = Column(String(3), default="USD")
    processing_fees = Column(JSON, nullable=True)  # Fee structure information
    
    # Operational data
    last_sync_at = Column(DateTime, nullable=True)
    last_transaction_at = Column(DateTime, nullable=True)
    total_transactions = Column(Integer, default=0)
    total_volume = Column(Float, default=0.0)
    
    # Audit fields
    connected_at = Column(DateTime, default=utcnow)
    disconnected_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
    
    # Error tracking
    last_error = Column(Text, nullable=True)
    error_count = Column(Integer, default=0)
    
    # Relationships
    barber = relationship("User", foreign_keys=[barber_id])
    external_transactions = relationship("ExternalTransaction", back_populates="connection", cascade="all, delete-orphan")
    platform_collections = relationship("PlatformCollection", back_populates="connection")


class ExternalTransaction(Base):
    """Transactions processed by external payment processors"""
    __tablename__ = "external_transactions"
    
    id = Column(Integer, primary_key=True, index=True)
    connection_id = Column(Integer, ForeignKey("payment_processor_connections.id"), nullable=False, index=True)
    appointment_id = Column(Integer, ForeignKey("appointments.id"), nullable=True, index=True)
    
    # External transaction identifiers
    external_transaction_id = Column(String(255), nullable=False, index=True)
    external_charge_id = Column(String(255), nullable=True)
    external_customer_id = Column(String(255), nullable=True)
    
    # Transaction details
    amount = Column(Float, nullable=False)
    currency = Column(String(3), default="USD")
    processing_fee = Column(Float, default=0.0)
    net_amount = Column(Float, nullable=False)  # Amount after processing fees
    
    # Payment details
    payment_method = Column(String(50), nullable=True)  # card, apple_pay, google_pay, etc.
    last_four = Column(String(4), nullable=True)
    brand = Column(String(20), nullable=True)  # visa, mastercard, etc.
    
    # Status and timing
    status = Column(String(20), nullable=False)  # pending, completed, failed, refunded
    processed_at = Column(DateTime, nullable=True)
    refunded_at = Column(DateTime, nullable=True)
    refund_amount = Column(Float, default=0.0)
    
    # Commission calculation
    commission_rate = Column(Float, nullable=True)
    commission_amount = Column(Float, default=0.0)
    commission_collected = Column(Boolean, default=False)
    
    # Metadata from external processor
    external_metadata = Column(JSON, nullable=True)
    
    # Audit fields
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
    
    # Relationships
    connection = relationship("PaymentProcessorConnection", back_populates="external_transactions")
    appointment = relationship("Appointment", foreign_keys=[appointment_id])
    platform_collections = relationship("PlatformCollection", back_populates="external_transaction")


class PlatformCollection(Base):
    """Platform collections from barbers (commission, rent, fees)"""
    __tablename__ = "platform_collections"
    
    id = Column(Integer, primary_key=True, index=True)
    barber_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    connection_id = Column(Integer, ForeignKey("payment_processor_connections.id"), nullable=True, index=True)
    external_transaction_id = Column(Integer, ForeignKey("external_transactions.id"), nullable=True, index=True)
    
    # Collection details
    collection_type = Column(Enum(CollectionType), nullable=False)
    amount = Column(Float, nullable=False)
    currency = Column(String(3), default="USD")
    description = Column(Text, nullable=True)
    
    # Reference information
    reference_id = Column(String(255), nullable=True)  # Related appointment, order, etc.
    reference_type = Column(String(50), nullable=True)  # appointment, order, manual
    period_start = Column(DateTime, nullable=True)      # For recurring collections
    period_end = Column(DateTime, nullable=True)
    
    # Collection timing
    due_date = Column(DateTime, nullable=False)
    grace_period_days = Column(Integer, default=7)
    status = Column(Enum(CollectionStatus), default=CollectionStatus.PENDING, nullable=False)
    
    # Processing details
    collection_method = Column(String(50), nullable=True)  # ach, wire, stripe_transfer, manual
    collection_account = Column(String(255), nullable=True)  # Account used for collection
    external_collection_id = Column(String(255), nullable=True)  # External system reference
    
    # Timing
    collected_at = Column(DateTime, nullable=True)
    failed_at = Column(DateTime, nullable=True)
    retry_count = Column(Integer, default=0)
    next_retry_at = Column(DateTime, nullable=True)
    
    # Failure handling
    failure_reason = Column(Text, nullable=True)
    dispute_reason = Column(Text, nullable=True)
    waived_reason = Column(Text, nullable=True)
    waived_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Audit fields
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
    
    # Relationships
    barber = relationship("User", foreign_keys=[barber_id])
    connection = relationship("PaymentProcessorConnection", back_populates="platform_collections")
    external_transaction = relationship("ExternalTransaction", back_populates="platform_collections")
    waived_by = relationship("User", foreign_keys=[waived_by_id])


class HybridPaymentConfig(Base):
    """Configuration for hybrid payment system per barber"""
    __tablename__ = "hybrid_payment_configs"
    
    id = Column(Integer, primary_key=True, index=True)
    barber_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True, index=True)
    
    # Payment mode configuration
    payment_mode = Column(Enum(PaymentMode), default=PaymentMode.CENTRALIZED, nullable=False)
    primary_processor = Column(Enum(ExternalPaymentProcessor), nullable=True)
    fallback_to_platform = Column(Boolean, default=True)  # Fallback to platform if external fails
    
    # Collection preferences
    collection_method = Column(String(50), default="ach")  # ach, wire, stripe_transfer
    collection_frequency = Column(String(20), default="weekly")  # daily, weekly, monthly
    collection_day = Column(Integer, nullable=True)  # Day of week/month for collection
    auto_collection = Column(Boolean, default=True)
    
    # Thresholds and limits
    minimum_collection_amount = Column(Float, default=10.0)
    collection_buffer_days = Column(Integer, default=3)  # Days to wait before collection
    maximum_outstanding = Column(Float, default=1000.0)  # Max outstanding amount before suspension
    
    # Notification preferences
    notify_before_collection = Column(Boolean, default=True)
    notification_days_ahead = Column(Integer, default=2)
    collection_email = Column(String(255), nullable=True)
    collection_phone = Column(String(20), nullable=True)
    
    # Bank account information for collections
    bank_account_config = Column(JSON, nullable=True)  # Encrypted bank details
    backup_payment_method = Column(String(255), nullable=True)  # Card on file, etc.
    
    # Feature flags
    enable_installments = Column(Boolean, default=False)
    enable_early_payment_discount = Column(Boolean, default=False)
    early_payment_discount_rate = Column(Float, default=0.02)  # 2% discount
    
    # Audit fields
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
    last_collection_at = Column(DateTime, nullable=True)
    
    # Relationships
    barber = relationship("User", foreign_keys=[barber_id])


class PaymentModeHistory(Base):
    """Track payment mode changes for auditing"""
    __tablename__ = "payment_mode_history"
    
    id = Column(Integer, primary_key=True, index=True)
    barber_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    # Change details
    previous_mode = Column(Enum(PaymentMode), nullable=True)
    new_mode = Column(Enum(PaymentMode), nullable=False)
    change_reason = Column(Text, nullable=True)
    changed_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Impact tracking
    effective_date = Column(DateTime, default=utcnow)
    pending_collections_affected = Column(Integer, default=0)
    active_connections_affected = Column(Integer, default=0)
    
    # Audit fields
    created_at = Column(DateTime, default=utcnow)
    
    # Relationships
    barber = relationship("User", foreign_keys=[barber_id])
    changed_by = relationship("User", foreign_keys=[changed_by_id])