from sqlalchemy import Column, Integer, String, DateTime, Float, ForeignKey, Boolean, Text, JSON, Time, Enum
from sqlalchemy.orm import relationship
from db import Base
from datetime import datetime, timezone
import enum

# Helper function for UTC datetime
def utcnow():
    return datetime.now(timezone.utc).replace(tzinfo=None)

class CancellationReason(enum.Enum):
    CLIENT_REQUEST = "client_request"
    EMERGENCY = "emergency"
    ILLNESS = "illness"
    WEATHER = "weather"
    BARBER_UNAVAILABLE = "barber_unavailable"
    SCHEDULING_CONFLICT = "scheduling_conflict"
    NO_SHOW = "no_show"
    OTHER = "other"

class RefundType(enum.Enum):
    FULL_REFUND = "full_refund"
    PARTIAL_REFUND = "partial_refund"
    NO_REFUND = "no_refund"
    CREDIT_ONLY = "credit_only"

class CancellationPolicy(Base):
    """Configurable cancellation policies for different services and timeframes"""
    __tablename__ = "cancellation_policies"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Policy identification
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    is_default = Column(Boolean, default=False)
    
    # Service association (if None, applies to all services)
    service_id = Column(Integer, ForeignKey("services.id"), nullable=True)
    location_id = Column(Integer, ForeignKey("barbershop_locations.id"), nullable=True)
    
    # Time-based rules (hours before appointment)
    immediate_cancellation_hours = Column(Integer, default=0)  # 0-X hours: strictest rules
    short_notice_hours = Column(Integer, default=24)          # X-24 hours: moderate rules
    advance_notice_hours = Column(Integer, default=48)        # 24-48+ hours: lenient rules
    
    # Refund percentages for each timeframe (0.0 to 1.0)
    immediate_refund_percentage = Column(Float, default=0.0)   # 0% refund for immediate cancellation
    short_notice_refund_percentage = Column(Float, default=0.5) # 50% refund for short notice
    advance_refund_percentage = Column(Float, default=1.0)     # 100% refund for advance notice
    
    # Cancellation fees (flat amounts)
    immediate_cancellation_fee = Column(Float, default=0.0)
    short_notice_cancellation_fee = Column(Float, default=0.0)
    advance_cancellation_fee = Column(Float, default=0.0)
    
    # No-show policy
    no_show_fee = Column(Float, default=0.0)
    no_show_refund_percentage = Column(Float, default=0.0)
    
    # Emergency exceptions
    allow_emergency_exception = Column(Boolean, default=True)
    emergency_refund_percentage = Column(Float, default=1.0)  # 100% refund for emergencies
    emergency_requires_approval = Column(Boolean, default=True)
    
    # Business rules
    max_cancellations_per_month = Column(Integer, nullable=True)  # Limit frequent cancellations
    penalty_for_excess_cancellations = Column(Float, default=0.0)
    
    # Grace period for first-time clients
    first_time_client_grace = Column(Boolean, default=True)
    first_time_client_hours = Column(Integer, default=24)  # Extended cancellation window
    first_time_client_refund_percentage = Column(Float, default=1.0)
    
    # Waitlist management
    auto_offer_to_waitlist = Column(Boolean, default=True)
    waitlist_notification_hours = Column(Integer, default=2)  # How soon to notify waitlist
    
    # Metadata
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Policy configuration (JSON for advanced rules)
    advanced_rules = Column(JSON, nullable=True)  # For custom business logic
    
    # Relationships
    service = relationship("Service", backref="cancellation_policies")
    created_by = relationship("User", foreign_keys=[created_by_id])
    cancellations = relationship("AppointmentCancellation", back_populates="policy")

class AppointmentCancellation(Base):
    """Track cancellation details and refund calculations"""
    __tablename__ = "appointment_cancellations"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Basic cancellation info
    appointment_id = Column(Integer, ForeignKey("appointments.id"), nullable=False, unique=True)
    policy_id = Column(Integer, ForeignKey("cancellation_policies.id"), nullable=True)
    
    # Cancellation details
    cancelled_at = Column(DateTime, default=utcnow)
    cancelled_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Who cancelled
    reason = Column(Enum(CancellationReason), default=CancellationReason.CLIENT_REQUEST)
    reason_details = Column(Text, nullable=True)  # Additional explanation
    
    # Time calculations
    hours_before_appointment = Column(Float, nullable=False)  # Calculated hours before
    original_appointment_time = Column(DateTime, nullable=False)
    
    # Refund calculations
    original_amount = Column(Float, nullable=False)
    refund_type = Column(Enum(RefundType), nullable=False)
    refund_percentage = Column(Float, default=0.0)
    refund_amount = Column(Float, default=0.0)
    cancellation_fee = Column(Float, default=0.0)
    net_refund_amount = Column(Float, default=0.0)  # refund_amount - cancellation_fee
    
    # Policy application details
    policy_rule_applied = Column(String(50), nullable=True)  # Which rule was used
    is_emergency_exception = Column(Boolean, default=False)
    is_first_time_client_grace = Column(Boolean, default=False)
    requires_manual_approval = Column(Boolean, default=False)
    
    # Processing status
    refund_processed = Column(Boolean, default=False)
    refund_processed_at = Column(DateTime, nullable=True)
    refund_processed_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Payment/refund references
    original_payment_id = Column(Integer, ForeignKey("payments.id"), nullable=True)
    refund_id = Column(Integer, ForeignKey("refunds.id"), nullable=True)
    
    # Waitlist integration
    slot_offered_to_waitlist = Column(Boolean, default=False)
    waitlist_offered_at = Column(DateTime, nullable=True)
    slot_filled_from_waitlist = Column(Boolean, default=False)
    
    # Admin notes
    admin_notes = Column(Text, nullable=True)
    
    # Metadata
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
    
    # Relationships
    appointment = relationship("Appointment", backref="cancellation")
    policy = relationship("CancellationPolicy", back_populates="cancellations")
    cancelled_by = relationship("User", foreign_keys=[cancelled_by_id])
    refund_processed_by = relationship("User", foreign_keys=[refund_processed_by_id])
    original_payment = relationship("Payment")
    refund = relationship("Refund")

class WaitlistEntry(Base):
    """Manage waitlist for cancelled appointment slots"""
    __tablename__ = "waitlist_entries"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # User and preference details
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=True)
    
    # Service preferences
    service_id = Column(Integer, ForeignKey("services.id"), nullable=True)
    barber_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Preferred barber
    location_id = Column(Integer, ForeignKey("barbershop_locations.id"), nullable=True)
    
    # Time preferences
    preferred_date = Column(DateTime, nullable=True)  # Specific date preference
    earliest_acceptable_date = Column(DateTime, nullable=True)
    latest_acceptable_date = Column(DateTime, nullable=True)
    preferred_time_start = Column(Time, nullable=True)  # Preferred time window
    preferred_time_end = Column(Time, nullable=True)
    
    # Flexibility settings
    flexible_on_barber = Column(Boolean, default=True)
    flexible_on_time = Column(Boolean, default=True)
    flexible_on_date = Column(Boolean, default=False)
    
    # Notification preferences
    notify_via_sms = Column(Boolean, default=True)
    notify_via_email = Column(Boolean, default=True)
    notify_via_push = Column(Boolean, default=False)
    auto_book_if_available = Column(Boolean, default=False)  # Auto-book matching slots
    
    # Status tracking
    is_active = Column(Boolean, default=True)
    priority_score = Column(Integer, default=0)  # Higher score = higher priority
    times_notified = Column(Integer, default=0)
    last_notified_at = Column(DateTime, nullable=True)
    
    # Offer tracking
    current_offer_appointment_id = Column(Integer, ForeignKey("appointments.id"), nullable=True)
    offer_expires_at = Column(DateTime, nullable=True)
    declined_appointment_ids = Column(JSON, nullable=True)  # List of declined appointment IDs
    
    # Success tracking
    fulfilled_at = Column(DateTime, nullable=True)
    fulfilled_appointment_id = Column(Integer, ForeignKey("appointments.id"), nullable=True)
    
    # Metadata
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
    expires_at = Column(DateTime, nullable=True)  # Auto-remove after this date
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    client = relationship("Client")
    service = relationship("Service")
    preferred_barber = relationship("User", foreign_keys=[barber_id])
    current_offer = relationship("Appointment", foreign_keys=[current_offer_appointment_id])
    fulfilled_appointment = relationship("Appointment", foreign_keys=[fulfilled_appointment_id])

class CancellationPolicyHistory(Base):
    """Track changes to cancellation policies for audit purposes"""
    __tablename__ = "cancellation_policy_history"
    
    id = Column(Integer, primary_key=True, index=True)
    policy_id = Column(Integer, ForeignKey("cancellation_policies.id"), nullable=False)
    
    # Change tracking
    changed_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    change_reason = Column(String(255), nullable=True)
    
    # Before/after snapshots
    previous_config = Column(JSON, nullable=True)  # Snapshot before change
    new_config = Column(JSON, nullable=True)       # Snapshot after change
    
    # Metadata
    created_at = Column(DateTime, default=utcnow)
    
    # Relationships
    policy = relationship("CancellationPolicy")
    changed_by = relationship("User")