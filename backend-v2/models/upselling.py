"""
Database models for upselling tracking and conversion analysis.
Tracks upselling attempts, conversions, and performance metrics following Six Figure Barber methodology.
"""

from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, 
    ForeignKey, Text, Enum, Index, JSON, UniqueConstraint, Numeric
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from db import Base


class UpsellStatus(str, enum.Enum):
    """Status of upselling attempt"""
    IMPLEMENTED = "implemented"      # Barber clicked "Implement"
    AUTOMATION_SENT = "automation_sent"  # Email/SMS sent to client
    CLIENT_CONTACTED = "client_contacted"  # Follow-up completed
    CONVERTED = "converted"          # Client booked suggested service
    DECLINED = "declined"            # Client explicitly declined
    EXPIRED = "expired"              # Opportunity expired without action


class UpsellChannel(str, enum.Enum):
    """Channel used for upselling communication"""
    IN_PERSON = "in_person"          # During appointment
    EMAIL = "email"                  # Email campaign
    SMS = "sms"                      # Text message
    PHONE_CALL = "phone_call"        # Direct phone call
    BOOKING_PAGE = "booking_page"    # During online booking
    APP_NOTIFICATION = "app_notification"  # Push notification


class UpsellAttempt(Base):
    """
    Tracks when a barber implements an upselling strategy.
    Records the attempt and triggers automation/tracking.
    """
    __tablename__ = "upsell_attempts"

    id = Column(Integer, primary_key=True, index=True)
    
    # Core identification
    barber_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    client_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    # Upselling details
    current_service = Column(String(255), nullable=False)
    suggested_service = Column(String(255), nullable=False)
    potential_revenue = Column(Numeric(10, 2), nullable=False)
    confidence_score = Column(Float, nullable=False)  # 0-100
    
    # Six Figure Barber methodology data
    client_tier = Column(String(50))  # VIP, Regular, New, etc.
    relationship_score = Column(Float)  # 0-10
    reasons = Column(JSON)  # List of reasons why upsell was suggested
    methodology_alignment = Column(String(100))  # Which 6FB principle this supports
    
    # Implementation details
    status = Column(Enum(UpsellStatus), default=UpsellStatus.IMPLEMENTED, nullable=False)
    channel = Column(Enum(UpsellChannel), nullable=False)
    implementation_notes = Column(Text)
    automation_triggered = Column(Boolean, default=False)
    
    # Tracking metadata
    opportunity_id = Column(String(100), index=True)  # Links to frontend opportunity
    source_analysis = Column(JSON)  # Data that generated the opportunity
    
    # Timestamps
    implemented_at = Column(DateTime, default=func.now(), nullable=False)
    automation_sent_at = Column(DateTime)
    follow_up_completed_at = Column(DateTime)
    expires_at = Column(DateTime)  # When opportunity expires
    
    # Analytics
    session_id = Column(String(100))  # For grouping related attempts
    device_info = Column(JSON)
    
    # Relationships
    barber = relationship("User", foreign_keys=[barber_id], back_populates="upsell_attempts_as_barber")
    client = relationship("User", foreign_keys=[client_id], back_populates="upsell_attempts_as_client")
    conversions = relationship("UpsellConversion", back_populates="attempt")
    
    # Indexes for performance
    __table_args__ = (
        Index('idx_upsell_attempt_barber_date', 'barber_id', 'implemented_at'),
        Index('idx_upsell_attempt_client_date', 'client_id', 'implemented_at'),
        Index('idx_upsell_attempt_status', 'status'),
        Index('idx_upsell_opportunity', 'opportunity_id'),
    )


class UpsellConversion(Base):
    """
    Tracks the outcome of upselling attempts.
    Records whether client accepted offer and booked suggested service.
    """
    __tablename__ = "upsell_conversions"

    id = Column(Integer, primary_key=True, index=True)
    
    # Links to attempt
    attempt_id = Column(Integer, ForeignKey("upsell_attempts.id"), nullable=False, index=True)
    
    # Conversion details
    converted = Column(Boolean, nullable=False)
    conversion_channel = Column(Enum(UpsellChannel))
    actual_service_booked = Column(String(255))
    actual_revenue = Column(Numeric(10, 2))
    revenue_difference = Column(Numeric(10, 2))  # Difference from suggested
    
    # Appointment information
    appointment_id = Column(Integer, ForeignKey("appointments.id"), index=True)
    booking_date = Column(DateTime)
    service_date = Column(DateTime)
    
    # Six Figure Barber metrics
    client_satisfaction_score = Column(Float)  # Post-service rating
    relationship_improvement = Column(Float)  # Change in relationship score
    retention_impact = Column(String(50))  # How it affected client retention
    
    # Timing analysis
    time_to_conversion = Column(Integer)  # Hours from attempt to booking
    touches_required = Column(Integer)    # Number of follow-ups needed
    
    # Feedback and notes
    client_feedback = Column(Text)
    conversion_notes = Column(Text)
    barber_insights = Column(Text)
    
    # Timestamps
    converted_at = Column(DateTime)
    recorded_at = Column(DateTime, default=func.now(), nullable=False)
    
    # Relationships
    attempt = relationship("UpsellAttempt", back_populates="conversions")
    appointment = relationship("Appointment", back_populates="upsell_conversions")
    
    # Indexes for analytics
    __table_args__ = (
        Index('idx_conversion_attempt', 'attempt_id'),
        Index('idx_conversion_date', 'converted_at'),
        Index('idx_conversion_success', 'converted'),
        Index('idx_conversion_appointment', 'appointment_id'),
    )


class UpsellAnalytics(Base):
    """
    Aggregated analytics for upselling performance.
    Pre-calculated metrics for dashboard and reporting.
    """
    __tablename__ = "upsell_analytics"

    id = Column(Integer, primary_key=True, index=True)
    
    # Aggregation scope
    barber_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    period_start = Column(DateTime, nullable=False)
    period_end = Column(DateTime, nullable=False)
    period_type = Column(String(20), nullable=False)  # daily, weekly, monthly
    
    # Attempt metrics
    total_attempts = Column(Integer, default=0)
    total_opportunities_identified = Column(Integer, default=0)
    implementation_rate = Column(Float, default=0.0)  # % of opportunities implemented
    
    # Conversion metrics
    total_conversions = Column(Integer, default=0)
    conversion_rate = Column(Float, default=0.0)  # % of attempts that converted
    average_time_to_conversion = Column(Float, default=0.0)  # Hours
    
    # Revenue metrics
    total_potential_revenue = Column(Numeric(12, 2), default=0)
    total_actual_revenue = Column(Numeric(12, 2), default=0)
    revenue_realization_rate = Column(Float, default=0.0)  # % of potential achieved
    average_upsell_value = Column(Numeric(10, 2), default=0)
    
    # Six Figure Barber methodology metrics
    relationship_score_improvement = Column(Float, default=0.0)
    client_tier_upgrades = Column(Integer, default=0)
    retention_rate_impact = Column(Float, default=0.0)
    methodology_compliance_score = Column(Float, default=0.0)
    
    # Channel performance
    best_performing_channel = Column(Enum(UpsellChannel))
    channel_performance = Column(JSON)  # Breakdown by channel
    
    # Service analysis
    most_successful_upsells = Column(JSON)  # Top performing service combinations
    service_performance = Column(JSON)    # Success rates by service type
    
    # Timestamps
    calculated_at = Column(DateTime, default=func.now(), nullable=False)
    last_updated = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    barber = relationship("User", back_populates="upsell_analytics")
    
    # Unique constraint for period aggregation
    __table_args__ = (
        UniqueConstraint('barber_id', 'period_start', 'period_end', 'period_type'),
        Index('idx_analytics_barber_period', 'barber_id', 'period_start', 'period_end'),
        Index('idx_analytics_period_type', 'period_type'),
    )


# Add relationship back-references to User model (to be added to models.py)
"""
Add these to the User model in models.py:

# Upselling relationships
upsell_attempts_as_barber = relationship("UpsellAttempt", foreign_keys="UpsellAttempt.barber_id", back_populates="barber")
upsell_attempts_as_client = relationship("UpsellAttempt", foreign_keys="UpsellAttempt.client_id", back_populates="client")
upsell_analytics = relationship("UpsellAnalytics", back_populates="barber")
"""

# Add relationship to Appointment model (to be added to models.py)
"""
Add this to the Appointment model in models.py:

# Upselling tracking
upsell_conversions = relationship("UpsellConversion", back_populates="appointment")
"""