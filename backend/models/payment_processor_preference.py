"""
Payment Processor Preference Model
Allows barbers to configure their preferred payment processor
"""

from sqlalchemy import Column, String, Boolean, Float, Integer, ForeignKey, JSON, Enum
from sqlalchemy.orm import relationship
import enum
from .base import BaseModel


class PaymentProcessor(enum.Enum):
    """Available payment processors"""

    STRIPE = "stripe"
    SQUARE = "square"
    BOTH = "both"  # Can accept payments through both


class ProcessorPreference(BaseModel):
    """Barber payment processor preferences and configuration"""

    __tablename__ = "processor_preferences"

    # Barber relationship
    barber_id = Column(Integer, ForeignKey("barbers.id"), nullable=False, unique=True)

    # Primary processor selection
    primary_processor = Column(Enum(PaymentProcessor), default=PaymentProcessor.STRIPE)

    # Active processors (can have both enabled)
    stripe_enabled = Column(Boolean, default=True)
    square_enabled = Column(Boolean, default=False)

    # Processor-specific settings
    stripe_settings = Column(JSON, default=dict)  # Custom Stripe settings
    square_settings = Column(JSON, default=dict)  # Custom Square settings

    # Fee preferences (for comparison)
    stripe_effective_rate = Column(Float)  # Calculated effective rate based on usage
    square_effective_rate = Column(Float)  # Calculated effective rate based on usage

    # Volume thresholds for optimal processor selection
    monthly_volume_threshold = Column(
        Float, default=10000
    )  # Switch recommendation threshold
    average_transaction_size = Column(Float)  # Used for fee calculations

    # Auto-switching preferences
    auto_switch_enabled = Column(Boolean, default=False)
    auto_switch_rules = Column(JSON, default=dict)  # Rules for automatic switching

    # Analytics preferences
    unified_analytics = Column(Boolean, default=True)  # Show combined analytics
    comparison_view = Column(Boolean, default=True)  # Show processor comparison

    # Notification preferences
    fee_alert_threshold = Column(Float, default=3.0)  # Alert if fees exceed this %
    processor_issue_alerts = Column(Boolean, default=True)

    # Relationships
    barber = relationship("Barber", back_populates="processor_preference")
    processor_metrics = relationship("ProcessorMetrics", back_populates="preference")

    def __repr__(self):
        return f"<ProcessorPreference(barber_id={self.barber_id}, primary={self.primary_processor.value})>"


class ProcessorMetrics(BaseModel):
    """Track performance metrics for each processor"""

    __tablename__ = "processor_metrics"

    # Reference to preference
    preference_id = Column(
        Integer, ForeignKey("processor_preferences.id"), nullable=False
    )
    processor = Column(Enum(PaymentProcessor), nullable=False)

    # Performance metrics
    total_transactions = Column(Integer, default=0)
    total_volume = Column(Float, default=0.0)
    total_fees = Column(Float, default=0.0)
    average_processing_time = Column(Float)  # seconds

    # Success rates
    success_rate = Column(Float, default=100.0)
    failed_transactions = Column(Integer, default=0)
    disputed_transactions = Column(Integer, default=0)

    # Payout metrics
    total_payouts = Column(Integer, default=0)
    average_payout_time = Column(Float)  # hours
    instant_payout_count = Column(Integer, default=0)
    instant_payout_fees = Column(Float, default=0.0)

    # Monthly breakdown (stored as JSON)
    monthly_metrics = Column(JSON, default=dict)

    # Relationships
    preference = relationship("ProcessorPreference", back_populates="processor_metrics")

    def __repr__(self):
        return f"<ProcessorMetrics(processor={self.processor.value}, volume={self.total_volume})>"
