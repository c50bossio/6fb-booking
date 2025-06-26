"""
Appointment Series Models for Recurring Appointments
"""

from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    DateTime,
    Date,
    Time,
    Text,
    ForeignKey,
    Enum as SQLEnum,
    Numeric,
)
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.sqlite import JSON
from datetime import datetime, date, time
from enum import Enum
import uuid

from config.database import Base


class RecurrencePattern(str, Enum):
    """Recurrence pattern options"""

    WEEKLY = "weekly"
    BIWEEKLY = "biweekly"  # Every 2 weeks
    MONTHLY = "monthly"
    EVERY_4_WEEKS = "every_4_weeks"
    EVERY_6_WEEKS = "every_6_weeks"
    EVERY_8_WEEKS = "every_8_weeks"
    CUSTOM = "custom"


class SeriesStatus(str, Enum):
    """Series status options"""

    ACTIVE = "active"
    PAUSED = "paused"
    CANCELLED = "cancelled"
    COMPLETED = "completed"


class AppointmentSeries(Base):
    """
    Represents a series of recurring appointments
    """

    __tablename__ = "appointment_series"

    id = Column(Integer, primary_key=True, index=True)

    # Series identification
    series_token = Column(
        String(32), unique=True, index=True, nullable=False
    )  # Unique identifier for the series
    series_name = Column(
        String(100), nullable=True
    )  # Optional name like "Monthly Haircut"

    # Relationships
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    barber_id = Column(Integer, ForeignKey("barbers.id"), nullable=False)
    service_id = Column(Integer, ForeignKey("services.id"), nullable=False)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=False)

    # Recurrence configuration
    recurrence_pattern = Column(SQLEnum(RecurrencePattern), nullable=False)
    interval_weeks = Column(Integer, default=1)  # For custom patterns: every X weeks

    # Scheduling details
    preferred_time = Column(Time, nullable=False)  # Preferred time of day
    preferred_day_of_week = Column(
        Integer, nullable=True
    )  # 0=Monday, 6=Sunday (for weekly patterns)
    preferred_week_of_month = Column(Integer, nullable=True)  # 1-4 for monthly patterns
    duration_minutes = Column(Integer, nullable=False)

    # Series lifecycle
    start_date = Column(Date, nullable=False)  # When the series should start
    end_date = Column(Date, nullable=True)  # When the series should end (optional)
    max_appointments = Column(
        Integer, nullable=True
    )  # Maximum number of appointments (optional)

    # Status and settings
    status = Column(SQLEnum(SeriesStatus), default=SeriesStatus.ACTIVE)
    is_flexible_time = Column(
        Boolean, default=False
    )  # Allow slight time adjustments for availability
    advance_booking_days = Column(Integer, default=60)  # How far in advance to book
    auto_confirm = Column(
        Boolean, default=True
    )  # Auto-confirm or require manual approval

    # Pricing and payment
    series_discount_percent = Column(
        Numeric(5, 2), default=0.0
    )  # Discount for recurring series
    total_series_price = Column(
        Numeric(10, 2), nullable=True
    )  # Total price if pre-paid
    payment_frequency = Column(
        String(20), default="per_appointment"
    )  # per_appointment, monthly, upfront

    # Notifications
    reminder_days_before = Column(Integer, default=1)  # Days before to send reminder
    send_series_updates = Column(
        Boolean, default=True
    )  # Send updates about series changes

    # Business logic
    buffer_time_minutes = Column(
        Integer, default=15
    )  # Buffer time to find alternative slots
    max_reschedule_attempts = Column(
        Integer, default=3
    )  # Max attempts to reschedule if conflicts

    # Metadata
    notes = Column(Text, nullable=True)
    created_by_customer = Column(Boolean, default=True)  # Customer vs staff created
    special_instructions = Column(Text, nullable=True)

    # Tracking
    total_appointments_created = Column(Integer, default=0)
    total_appointments_completed = Column(Integer, default=0)
    total_appointments_cancelled = Column(Integer, default=0)
    last_appointment_date = Column(Date, nullable=True)
    next_appointment_date = Column(Date, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    paused_at = Column(DateTime, nullable=True)
    cancelled_at = Column(DateTime, nullable=True)

    # Relationships
    client = relationship("Client", back_populates="appointment_series")
    barber = relationship("Barber")
    service = relationship("Service")
    location = relationship("Location")
    appointments = relationship(
        "Appointment", back_populates="series", cascade="all, delete-orphan"
    )

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if not self.series_token:
            self.series_token = self._generate_series_token()

    def _generate_series_token(self):
        """Generate a unique series token"""
        import secrets
        import string

        alphabet = string.ascii_letters + string.digits
        return "".join(secrets.choice(alphabet) for _ in range(32))

    @property
    def discount_amount(self):
        """Calculate discount amount per appointment"""
        if self.series_discount_percent and self.service:
            return (self.service.base_price * self.series_discount_percent) / 100
        return 0.0

    @property
    def discounted_price_per_appointment(self):
        """Get discounted price per appointment"""
        if self.service:
            return self.service.base_price - self.discount_amount
        return 0.0

    @property
    def is_active(self):
        """Check if series is currently active"""
        return self.status == SeriesStatus.ACTIVE

    @property
    def completion_rate(self):
        """Calculate completion rate of the series"""
        if self.total_appointments_created == 0:
            return 0.0
        return (
            self.total_appointments_completed / self.total_appointments_created
        ) * 100

    def __repr__(self):
        return f"<AppointmentSeries(id={self.id}, pattern={self.recurrence_pattern}, status={self.status})>"


class SeriesExclusion(Base):
    """
    Represents dates/times to exclude from a recurring series
    (holidays, vacations, etc.)
    """

    __tablename__ = "series_exclusions"

    id = Column(Integer, primary_key=True, index=True)
    series_id = Column(Integer, ForeignKey("appointment_series.id"), nullable=False)

    # Exclusion details
    exclusion_date = Column(Date, nullable=False)  # Specific date to exclude
    exclusion_reason = Column(String(100), nullable=True)  # Holiday, vacation, etc.
    is_permanent = Column(Boolean, default=False)  # Permanent exclusion vs one-time

    # Alternative scheduling
    reschedule_to_date = Column(Date, nullable=True)  # Alternative date if rescheduled
    reschedule_to_time = Column(Time, nullable=True)  # Alternative time if rescheduled

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    created_by = Column(String(50), nullable=True)  # Who created the exclusion

    # Relationships
    series = relationship("AppointmentSeries")

    def __repr__(self):
        return f"<SeriesExclusion(date={self.exclusion_date}, reason={self.exclusion_reason})>"


class SeriesChangeLog(Base):
    """
    Log of all changes made to an appointment series
    """

    __tablename__ = "series_change_log"

    id = Column(Integer, primary_key=True, index=True)
    series_id = Column(Integer, ForeignKey("appointment_series.id"), nullable=False)

    # Change details
    change_type = Column(
        String(50), nullable=False
    )  # created, modified, paused, cancelled, etc.
    field_changed = Column(String(50), nullable=True)  # Which field was changed
    old_value = Column(Text, nullable=True)  # Previous value
    new_value = Column(Text, nullable=True)  # New value
    change_reason = Column(Text, nullable=True)  # Why the change was made

    # Context
    changed_by_type = Column(String(20), nullable=False)  # customer, staff, system
    changed_by_id = Column(Integer, nullable=True)  # ID of person who made change
    affected_appointments = Column(
        Integer, default=0
    )  # How many appointments were affected

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    series = relationship("AppointmentSeries")

    def __repr__(self):
        return f"<SeriesChangeLog(type={self.change_type}, field={self.field_changed})>"
