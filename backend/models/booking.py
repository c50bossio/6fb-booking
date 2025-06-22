"""
Booking System Models
Enhanced booking functionality for 6FB platform
"""

from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    Boolean,
    DateTime,
    Date,
    Time,
    Text,
    ForeignKey,
    JSON,
    Enum as SQLEnum,
    UniqueConstraint,
    CheckConstraint,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .base import BaseModel
import enum


class ServiceCategory(BaseModel):
    """Categories for organizing services (e.g., Haircut, Beard, Color, etc.)"""

    __tablename__ = "service_categories"

    # Basic Information
    name = Column(String(100), nullable=False, unique=True)
    slug = Column(String(100), nullable=False, unique=True)  # URL-friendly name
    description = Column(Text)

    # Display Settings
    display_order = Column(Integer, default=0)
    icon = Column(String(100))  # Icon identifier for UI
    color = Column(String(7))  # Hex color for UI display

    # Status
    is_active = Column(Boolean, default=True)

    # Relationships
    services = relationship("Service", back_populates="category")

    def __repr__(self):
        return f"<ServiceCategory(name='{self.name}')>"


class Service(BaseModel):
    """Individual services offered by barbers"""

    __tablename__ = "services"

    # Basic Information
    name = Column(String(200), nullable=False)
    description = Column(Text)
    category_id = Column(Integer, ForeignKey("service_categories.id"), nullable=False)

    # Pricing
    base_price = Column(Float, nullable=False)
    min_price = Column(Float)  # For variable pricing
    max_price = Column(Float)  # For variable pricing

    # Duration
    duration_minutes = Column(Integer, nullable=False, default=60)
    buffer_minutes = Column(
        Integer, default=0
    )  # Clean-up/prep time between appointments

    # Deposit Settings
    requires_deposit = Column(Boolean, default=False)
    deposit_type = Column(String(20))  # 'percentage' or 'fixed'
    deposit_amount = Column(
        Float, default=0.0
    )  # Either percentage (0-100) or fixed amount

    # Service Settings
    is_addon = Column(Boolean, default=False)  # Can be added to other services
    can_overlap = Column(Boolean, default=False)  # Can be booked during other services
    max_advance_days = Column(Integer, default=90)  # How far in advance can be booked
    min_advance_hours = Column(Integer, default=2)  # Minimum hours before appointment

    # Location/Barber Availability
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=True)
    barber_id = Column(Integer, ForeignKey("barbers.id"), nullable=True)

    # Display Settings
    display_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    is_featured = Column(Boolean, default=False)

    # SEO/Marketing
    tags = Column(JSON)  # Array of tags for search/filtering
    meta_description = Column(Text)  # For online booking SEO

    # Relationships
    category = relationship("ServiceCategory", back_populates="services")
    location = relationship("Location")
    barber = relationship("Barber")

    # Constraints
    __table_args__ = (
        CheckConstraint("base_price >= 0", name="check_positive_price"),
        CheckConstraint("duration_minutes > 0", name="check_positive_duration"),
        CheckConstraint("deposit_amount >= 0", name="check_positive_deposit"),
    )

    def __repr__(self):
        return f"<Service(name='{self.name}', price=${self.base_price})>"


class DayOfWeek(enum.Enum):
    """Days of the week enumeration"""

    MONDAY = 0
    TUESDAY = 1
    WEDNESDAY = 2
    THURSDAY = 3
    FRIDAY = 4
    SATURDAY = 5
    SUNDAY = 6


class BarberAvailability(BaseModel):
    """Weekly schedule patterns for barbers"""

    __tablename__ = "barber_availability"

    # Barber/Location
    barber_id = Column(Integer, ForeignKey("barbers.id"), nullable=False)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=False)

    # Schedule Pattern
    day_of_week = Column(SQLEnum(DayOfWeek), nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)

    # Break Times (optional)
    break_start = Column(Time)
    break_end = Column(Time)

    # Availability Settings
    is_available = Column(Boolean, default=True)
    max_bookings = Column(Integer)  # Max appointments for this time slot

    # Date Range (for temporary schedules)
    effective_from = Column(Date)
    effective_until = Column(Date)

    # Relationships
    barber = relationship("Barber")
    location = relationship("Location")

    # Constraints
    __table_args__ = (
        UniqueConstraint(
            "barber_id",
            "location_id",
            "day_of_week",
            "start_time",
            name="unique_barber_schedule",
        ),
        CheckConstraint("end_time > start_time", name="check_valid_hours"),
        CheckConstraint(
            "break_end > break_start OR break_start IS NULL", name="check_valid_break"
        ),
    )

    def __repr__(self):
        return f"<BarberAvailability(barber_id={self.barber_id}, day={self.day_of_week.name})>"


class BookingRule(BaseModel):
    """Shop-specific booking policies"""

    __tablename__ = "booking_rules"

    # Scope
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=True)
    barber_id = Column(Integer, ForeignKey("barbers.id"), nullable=True)
    service_id = Column(Integer, ForeignKey("services.id"), nullable=True)

    # Rule Type
    rule_type = Column(
        String(50), nullable=False
    )  # 'cancellation', 'reschedule', 'booking_window', etc.
    rule_name = Column(String(100), nullable=False)
    description = Column(Text)

    # Rule Parameters (JSON for flexibility)
    parameters = Column(JSON, nullable=False)
    # Examples:
    # Cancellation: {"hours_before": 24, "fee_type": "percentage", "fee_amount": 50}
    # Booking Window: {"min_hours": 2, "max_days": 30}
    # Blackout Dates: {"dates": ["2024-12-25", "2024-01-01"], "recurring": true}

    # Priority (higher number = higher priority)
    priority = Column(Integer, default=0)

    # Status
    is_active = Column(Boolean, default=True)
    effective_from = Column(DateTime)
    effective_until = Column(DateTime)

    # Relationships
    location = relationship("Location")
    barber = relationship("Barber")
    service = relationship("Service")

    def __repr__(self):
        return f"<BookingRule(type='{self.rule_type}', name='{self.rule_name}')>"


class ReviewRating(enum.Enum):
    """Review rating scale"""

    ONE_STAR = 1
    TWO_STARS = 2
    THREE_STARS = 3
    FOUR_STARS = 4
    FIVE_STARS = 5


class Review(BaseModel):
    """Customer reviews for appointments"""

    __tablename__ = "reviews"

    # Review Subject
    appointment_id = Column(
        Integer, ForeignKey("appointments.id"), nullable=False, unique=True
    )
    barber_id = Column(Integer, ForeignKey("barbers.id"), nullable=False)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=False)

    # Ratings
    overall_rating = Column(SQLEnum(ReviewRating), nullable=False)
    service_rating = Column(SQLEnum(ReviewRating))
    cleanliness_rating = Column(SQLEnum(ReviewRating))
    punctuality_rating = Column(SQLEnum(ReviewRating))
    value_rating = Column(SQLEnum(ReviewRating))

    # Review Content
    title = Column(String(200))
    comment = Column(Text)

    # Response
    barber_response = Column(Text)
    barber_response_date = Column(DateTime)

    # Verification
    is_verified = Column(Boolean, default=False)  # Verified purchase
    verification_date = Column(DateTime)

    # Display Settings
    is_featured = Column(Boolean, default=False)
    is_hidden = Column(Boolean, default=False)  # Hidden by admin
    hide_reason = Column(String(200))

    # Media
    photos = Column(JSON)  # Array of photo URLs

    # Relationships
    appointment = relationship("Appointment")
    barber = relationship("Barber")
    client = relationship("Client")
    location = relationship("Location")

    def __repr__(self):
        return f"<Review(appointment_id={self.appointment_id}, rating={self.overall_rating.value})>"

    @property
    def average_rating(self):
        """Calculate average of all rating categories"""
        ratings = [self.overall_rating.value]
        if self.service_rating:
            ratings.append(self.service_rating.value)
        if self.cleanliness_rating:
            ratings.append(self.cleanliness_rating.value)
        if self.punctuality_rating:
            ratings.append(self.punctuality_rating.value)
        if self.value_rating:
            ratings.append(self.value_rating.value)
        return sum(ratings) / len(ratings)


# Additional booking-related models that might be useful


class BookingSlot(BaseModel):
    """Pre-calculated available booking slots for performance"""

    __tablename__ = "booking_slots"

    barber_id = Column(Integer, ForeignKey("barbers.id"), nullable=False)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=False)
    service_id = Column(Integer, ForeignKey("services.id"), nullable=False)

    slot_date = Column(Date, nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)

    is_available = Column(Boolean, default=True)
    is_blocked = Column(Boolean, default=False)
    block_reason = Column(String(200))

    # Relationships
    barber = relationship("Barber")
    location = relationship("Location")
    service = relationship("Service")

    # Constraints
    __table_args__ = (
        UniqueConstraint(
            "barber_id",
            "location_id",
            "slot_date",
            "start_time",
            name="unique_booking_slot",
        ),
    )


class WaitList(BaseModel):
    """Wait list for fully booked services"""

    __tablename__ = "wait_lists"

    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    barber_id = Column(Integer, ForeignKey("barbers.id"), nullable=True)
    service_id = Column(Integer, ForeignKey("services.id"), nullable=False)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=False)

    preferred_date = Column(Date, nullable=False)
    preferred_time_start = Column(Time)
    preferred_time_end = Column(Time)

    flexibility_days = Column(Integer, default=0)  # How many days flexible

    status = Column(String(20), default="waiting")  # waiting, notified, booked, expired
    notification_sent_at = Column(DateTime)
    expires_at = Column(DateTime)

    # Relationships
    client = relationship("Client")
    barber = relationship("Barber")
    service = relationship("Service")
    location = relationship("Location")
