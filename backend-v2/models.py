from sqlalchemy import Column, Integer, String, DateTime, Float, ForeignKey, Boolean, Text, JSON, Time, Enum, Table, Date
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime, timedelta, time
import enum
from utils.encryption import EncryptedString, EncryptedText, SearchableEncryptedString

# Webhook models will be defined at the end of this file

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    name = Column(String)
    phone = Column(String, nullable=True)  # For SMS notifications
    hashed_password = Column(String)
    role = Column(String, default="user")  # user, barber, admin
    timezone = Column(String(50), default='UTC')
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Stripe Connect fields for barbers
    stripe_account_id = Column(String, nullable=True)  # Stripe Connect account ID
    stripe_account_status = Column(String, nullable=True)  # active, pending, restricted
    commission_rate = Column(Float, default=0.20)  # Default 20% commission
    
    # Google Calendar integration
    google_calendar_credentials = Column(Text, nullable=True)  # JSON encoded OAuth credentials
    google_calendar_id = Column(String, nullable=True)  # Selected calendar ID for sync
    
    # Relationships
    appointments = relationship("Appointment", back_populates="user", foreign_keys="Appointment.user_id")
    payments = relationship("Payment", back_populates="user", foreign_keys="Payment.user_id")
    password_reset_tokens = relationship("PasswordResetToken", back_populates="user")
    payouts = relationship("Payout", back_populates="barber")
    gift_certificates_created = relationship("GiftCertificate", back_populates="created_by")
    # Location relationships (will be added via migration)
    # locations = relationship("BarbershopLocation", secondary="barber_locations", back_populates="barbers")
    # location_id = Column(Integer, ForeignKey("barbershop_locations.id"), nullable=True)

class Appointment(Base):
    __tablename__ = "appointments"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    barber_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # The assigned barber
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=True)
    service_id = Column(Integer, ForeignKey("services.id"), nullable=True)  # Link to new Service model
    # location_id = Column(Integer, ForeignKey("barbershop_locations.id"), nullable=True)  # Location where service performed (added via migration)
    service_name = Column(String)  # Keep for backwards compatibility
    start_time = Column(DateTime)
    duration_minutes = Column(Integer)
    price = Column(Float)
    status = Column(String, default="pending")  # pending, confirmed, cancelled, completed, no_show
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Buffer times for enhanced booking
    buffer_time_before = Column(Integer, default=0)  # Minutes of buffer before appointment
    buffer_time_after = Column(Integer, default=0)   # Minutes of buffer after appointment
    notes = Column(Text, nullable=True)  # Appointment notes
    
    # Google Calendar integration
    google_event_id = Column(String, nullable=True)  # Google Calendar event ID for sync
    
    # Recurring appointment tracking
    recurring_pattern_id = Column(Integer, ForeignKey("recurring_appointment_patterns.id"), nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="appointments", foreign_keys=[user_id])
    barber = relationship("User", foreign_keys=[barber_id])
    client = relationship("Client", back_populates="appointments", foreign_keys=[client_id])
    service = relationship("Service", backref="appointments")
    payment = relationship("Payment", back_populates="appointment", uselist=False)
    recurring_pattern = relationship("RecurringAppointmentPattern", backref="appointments")

class Payment(Base):
    __tablename__ = "payments"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    appointment_id = Column(Integer, ForeignKey("appointments.id"))
    barber_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    # location_id = Column(Integer, ForeignKey("barbershop_locations.id"), nullable=True)  # Location where payment made (added via migration)
    amount = Column(Float)
    status = Column(String, default="pending")  # pending, completed, failed, refunded, partially_refunded
    stripe_payment_id = Column(String, nullable=True)
    stripe_payment_intent_id = Column(String, nullable=True)
    
    # Payment splits
    platform_fee = Column(Float, default=0)  # Platform commission amount
    barber_amount = Column(Float, default=0)  # Amount for barber after commission
    commission_rate = Column(Float, default=0.20)  # Commission rate at time of payment
    
    # Refund tracking
    refund_amount = Column(Float, default=0)
    refund_reason = Column(String, nullable=True)
    refunded_at = Column(DateTime, nullable=True)
    stripe_refund_id = Column(String, nullable=True)
    
    # Gift certificate usage
    gift_certificate_id = Column(Integer, ForeignKey("gift_certificates.id"), nullable=True)
    gift_certificate_amount_used = Column(Float, default=0)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="payments", foreign_keys=[user_id])
    barber = relationship("User", foreign_keys=[barber_id], overlaps="user,payments")
    appointment = relationship("Appointment", back_populates="payment")
    refunds = relationship("Refund", back_populates="payment")
    gift_certificate = relationship("GiftCertificate", back_populates="payments_used")

class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    token = Column(String, unique=True, index=True)
    expires_at = Column(DateTime)
    used = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="password_reset_tokens")
    
    def is_expired(self):
        """Check if token has expired"""
        return datetime.utcnow() > self.expires_at
    
    def is_valid(self):
        """Check if token is valid (not used and not expired)"""
        return not self.used and not self.is_expired()


class BookingSettings(Base):
    __tablename__ = "booking_settings"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Business identification (ready for multi-tenant)
    business_id = Column(Integer, default=1)  # Default single business
    business_name = Column(String, default="Default Business")
    business_timezone = Column(String(50), default="America/New_York")  # Business timezone
    
    # Lead time configuration
    min_lead_time_minutes = Column(Integer, default=15)  # Minimum booking advance time
    max_advance_days = Column(Integer, default=30)       # Maximum days ahead for booking
    same_day_cutoff_time = Column(Time, nullable=True)   # No same-day bookings after this time
    
    # Business hours
    business_start_time = Column(Time, default=time(9, 0))   # 9:00 AM
    business_end_time = Column(Time, default=time(17, 0))    # 5:00 PM
    slot_duration_minutes = Column(Integer, default=30)      # 30-minute slots
    
    # Feature flags
    show_soonest_available = Column(Boolean, default=True)   # Highlight next available slot
    allow_same_day_booking = Column(Boolean, default=True)   # Allow booking for today
    require_advance_booking = Column(Boolean, default=False) # Require booking X hours/days ahead
    
    # Business type presets
    business_type = Column(String, default="general")  # hair_salon, medical, restaurant, consultation
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def get_min_booking_time(self, timezone_str: str = None) -> datetime:
        """Calculate the minimum time a booking can be made for
        
        Args:
            timezone_str: Timezone string (e.g., 'America/New_York'). If None, uses business timezone.
            
        Returns:
            Timezone-aware datetime for minimum booking time
        """
        import pytz
        
        # Use business timezone if none specified
        tz = pytz.timezone(timezone_str or self.business_timezone)
        now = datetime.now(tz)
        min_time = now + timedelta(minutes=self.min_lead_time_minutes)
        
        # Check same-day cutoff
        if self.same_day_cutoff_time and not self.allow_same_day_booking:
            today_cutoff = tz.localize(datetime.combine(now.date(), self.same_day_cutoff_time))
            if now >= today_cutoff:
                # Too late for same-day, move to next business day
                next_day = now.date() + timedelta(days=1)
                min_time = tz.localize(datetime.combine(next_day, self.business_start_time))
        
        return min_time
    
    def get_max_booking_time(self, timezone_str: str = None) -> datetime:
        """Calculate the maximum time a booking can be made for
        
        Args:
            timezone_str: Timezone string. If None, uses business timezone.
            
        Returns:
            Timezone-aware datetime for maximum booking time
        """
        import pytz
        
        tz = pytz.timezone(timezone_str or self.business_timezone)
        return datetime.now(tz) + timedelta(days=self.max_advance_days)
    
    @classmethod
    def get_default_settings(cls):
        """Get default booking settings, create if doesn't exist"""
        return cls(
            business_id=1,
            business_name="Default Business",
            business_timezone="America/New_York",
            min_lead_time_minutes=15,
            max_advance_days=30,
            same_day_cutoff_time=time(17, 0),  # 5 PM
            business_start_time=time(9, 0),    # 9 AM
            business_end_time=time(17, 0),     # 5 PM
            slot_duration_minutes=30,
            show_soonest_available=True,
            allow_same_day_booking=True,
            business_type="general"
        )


class Client(Base):
    __tablename__ = "clients"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Basic Information (encrypted for PII)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    email = Column(SearchableEncryptedString(500), unique=True, index=True)  # Encrypted but searchable
    phone = Column(SearchableEncryptedString(100), index=True, nullable=True)  # Encrypted but searchable
    date_of_birth = Column(Date, nullable=True)
    
    # Customer Classification
    customer_type = Column(String, default="new")  # new, returning, vip, at_risk
    total_visits = Column(Integer, default=0)
    total_spent = Column(Float, default=0.0)
    average_ticket = Column(Float, default=0.0)
    visit_frequency_days = Column(Integer, nullable=True)
    
    # Engagement Metrics
    no_show_count = Column(Integer, default=0)
    cancellation_count = Column(Integer, default=0)
    referral_count = Column(Integer, default=0)
    first_visit_date = Column(DateTime, nullable=True)
    last_visit_date = Column(DateTime, nullable=True)
    
    # Preferences
    preferred_services = Column(JSON, default=list)  # List of service IDs/names
    notes = Column(EncryptedText, nullable=True)  # Encrypted for privacy
    tags = Column(String(500), nullable=True)  # Comma-separated tags
    preferred_barber_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Barber relationship (for backwards compatibility with V1)
    barber_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # The barber who manages this client
    
    # Communication Preferences
    communication_preferences = Column(JSON, default=dict)  # {sms: true, email: true, marketing: false}
    sms_enabled = Column(Boolean, default=True)
    email_enabled = Column(Boolean, default=True)
    marketing_enabled = Column(Boolean, default=True)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by_id = Column(Integer, ForeignKey("users.id"))
    
    # Relationships
    appointments = relationship("Appointment", back_populates="client", foreign_keys="Appointment.client_id")
    preferred_barber = relationship("User", foreign_keys=[preferred_barber_id])
    created_by = relationship("User", foreign_keys=[created_by_id])


class Refund(Base):
    __tablename__ = "refunds"
    
    id = Column(Integer, primary_key=True, index=True)
    payment_id = Column(Integer, ForeignKey("payments.id"))
    amount = Column(Float)
    reason = Column(String)
    status = Column(String, default="pending")  # pending, completed, failed
    stripe_refund_id = Column(String, nullable=True)
    initiated_by_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    processed_at = Column(DateTime, nullable=True)
    
    # Relationships
    payment = relationship("Payment", back_populates="refunds")
    initiated_by = relationship("User")


class Payout(Base):
    __tablename__ = "payouts"
    
    id = Column(Integer, primary_key=True, index=True)
    barber_id = Column(Integer, ForeignKey("users.id"))
    amount = Column(Float)
    status = Column(String, default="pending")  # pending, processing, completed, failed
    period_start = Column(DateTime)
    period_end = Column(DateTime)
    payment_count = Column(Integer, default=0)
    stripe_payout_id = Column(String, nullable=True)
    stripe_transfer_id = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    processed_at = Column(DateTime, nullable=True)
    
    # Relationships
    barber = relationship("User", back_populates="payouts", foreign_keys=[barber_id])


class GiftCertificate(Base):
    __tablename__ = "gift_certificates"
    
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, index=True)  # Unique redemption code
    amount = Column(Float)
    balance = Column(Float)  # Remaining balance
    status = Column(String, default="active")  # active, used, expired, cancelled
    
    # Purchase details
    purchaser_name = Column(String)
    purchaser_email = Column(String)
    recipient_name = Column(String, nullable=True)
    recipient_email = Column(String, nullable=True)
    message = Column(Text, nullable=True)
    
    # Validity
    valid_from = Column(DateTime, default=datetime.utcnow)
    valid_until = Column(DateTime)
    
    # Tracking
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    stripe_payment_intent_id = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    used_at = Column(DateTime, nullable=True)
    
    # Relationships
    created_by = relationship("User", back_populates="gift_certificates_created")
    payments_used = relationship("Payment", back_populates="gift_certificate")
    
    def is_valid(self):
        """Check if gift certificate is valid for use"""
        if self.status != "active":
            return False
        if self.balance <= 0:
            return False
        if datetime.utcnow() < self.valid_from:
            return False
        if datetime.utcnow() > self.valid_until:
            return False
        return True


# Service Categories Enum
class ServiceCategoryEnum(enum.Enum):
    HAIRCUT = "haircut"
    SHAVE = "shave"
    BEARD = "beard"
    HAIR_TREATMENT = "hair_treatment"
    STYLING = "styling"
    COLOR = "color"
    PACKAGE = "package"
    OTHER = "other"


# Association table for service packages
service_package_items = Table(
    'service_package_items',
    Base.metadata,
    Column('package_id', Integer, ForeignKey('services.id'), primary_key=True),
    Column('service_id', Integer, ForeignKey('services.id'), primary_key=True),
    Column('quantity', Integer, default=1),
    Column('order', Integer, default=0)  # Order of services in the package
)


# Association table for barber services with custom pricing
barber_services = Table(
    'barber_services',
    Base.metadata,
    Column('barber_id', Integer, ForeignKey('users.id'), primary_key=True),
    Column('service_id', Integer, ForeignKey('services.id'), primary_key=True),
    Column('custom_price', Float, nullable=True),  # Barber-specific pricing
    Column('custom_duration', Integer, nullable=True),  # Barber-specific duration
    Column('is_available', Boolean, default=True)
)


class Service(Base):
    __tablename__ = "services"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Basic Information
    name = Column(String, nullable=False, index=True)
    description = Column(Text, nullable=True)
    category = Column(Enum(ServiceCategoryEnum), nullable=False, index=True)
    sku = Column(String, unique=True, nullable=True)  # Service SKU for inventory/tracking
    
    # Pricing
    base_price = Column(Float, nullable=False)
    min_price = Column(Float, nullable=True)  # For variable pricing
    max_price = Column(Float, nullable=True)  # For variable pricing
    
    # Duration
    duration_minutes = Column(Integer, nullable=False, default=30)
    buffer_time_minutes = Column(Integer, default=0)  # Clean-up/prep time between appointments
    
    # Availability
    is_active = Column(Boolean, default=True, index=True)
    is_bookable_online = Column(Boolean, default=True)
    max_advance_booking_days = Column(Integer, nullable=True)  # Override global settings
    min_advance_booking_hours = Column(Integer, nullable=True)  # Override global settings
    
    # Package Information (for service bundles)
    is_package = Column(Boolean, default=False)
    package_discount_percent = Column(Float, nullable=True)
    package_discount_amount = Column(Float, nullable=True)
    
    # Display
    display_order = Column(Integer, default=0)
    image_url = Column(String, nullable=True)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by_id = Column(Integer, ForeignKey("users.id"))
    
    # Relationships
    created_by = relationship("User", foreign_keys=[created_by_id])
    pricing_rules = relationship("ServicePricingRule", back_populates="service", cascade="all, delete-orphan")
    booking_rules = relationship("ServiceBookingRule", back_populates="service", cascade="all, delete-orphan")
    
    # Package relationships
    package_items = relationship(
        "Service",
        secondary=service_package_items,
        primaryjoin=id == service_package_items.c.package_id,
        secondaryjoin=id == service_package_items.c.service_id,
        backref="included_in_packages"
    )
    
    # Barber relationships
    barbers = relationship(
        "User",
        secondary=barber_services,
        backref="services_offered"
    )
    
    def get_price_for_barber(self, barber_id: int, db):
        """Get the price for this service when performed by a specific barber"""
        # Check for custom barber pricing
        result = db.execute(
            barber_services.select().where(
                (barber_services.c.barber_id == barber_id) &
                (barber_services.c.service_id == self.id)
            )
        ).first()
        
        if result and result.custom_price:
            return result.custom_price
        return self.base_price
    
    def get_duration_for_barber(self, barber_id: int, db):
        """Get the duration for this service when performed by a specific barber"""
        # Check for custom barber duration
        result = db.execute(
            barber_services.select().where(
                (barber_services.c.barber_id == barber_id) &
                (barber_services.c.service_id == self.id)
            )
        ).first()
        
        if result and result.custom_duration:
            return result.custom_duration
        return self.duration_minutes


class ServicePricingRule(Base):
    """Dynamic pricing rules for services based on various factors"""
    __tablename__ = "service_pricing_rules"
    
    id = Column(Integer, primary_key=True, index=True)
    service_id = Column(Integer, ForeignKey("services.id"), nullable=False)
    
    # Rule Type
    rule_type = Column(String, nullable=False)  # time_of_day, day_of_week, date_range, demand
    
    # Conditions
    start_time = Column(Time, nullable=True)  # For time-based rules
    end_time = Column(Time, nullable=True)
    day_of_week = Column(Integer, nullable=True)  # 0-6 for Monday-Sunday
    start_date = Column(Date, nullable=True)  # For seasonal pricing
    end_date = Column(Date, nullable=True)
    
    # Pricing Adjustment
    price_adjustment_type = Column(String, nullable=False)  # percentage, fixed
    price_adjustment_value = Column(Float, nullable=False)  # +/- percentage or amount
    
    # Priority (higher priority rules override lower)
    priority = Column(Integer, default=0)
    
    # Metadata
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    service = relationship("Service", back_populates="pricing_rules")
    
    def apply_to_price(self, base_price: float) -> float:
        """Apply this pricing rule to a base price"""
        if not self.is_active:
            return base_price
            
        if self.price_adjustment_type == "percentage":
            return base_price * (1 + self.price_adjustment_value / 100)
        else:  # fixed
            return base_price + self.price_adjustment_value


class ServiceBookingRule(Base):
    """Booking rules and restrictions for services"""
    __tablename__ = "service_booking_rules"
    
    id = Column(Integer, primary_key=True, index=True)
    service_id = Column(Integer, ForeignKey("services.id"), nullable=False)
    
    # Rule Type
    rule_type = Column(String, nullable=False)  # requires_consultation, age_restriction, etc.
    
    # Conditions
    min_age = Column(Integer, nullable=True)
    max_age = Column(Integer, nullable=True)
    requires_consultation = Column(Boolean, default=False)
    requires_patch_test = Column(Boolean, default=False)  # For color services
    patch_test_hours_before = Column(Integer, default=48)
    
    # Booking Restrictions
    max_bookings_per_day = Column(Integer, nullable=True)  # Per client
    min_days_between_bookings = Column(Integer, nullable=True)  # For treatments
    blocked_days_of_week = Column(JSON, nullable=True)  # [0, 6] for no Monday/Sunday
    
    # Dependencies
    required_service_ids = Column(JSON, nullable=True)  # Services that must be booked together
    incompatible_service_ids = Column(JSON, nullable=True)  # Services that can't be booked together
    
    # Metadata
    is_active = Column(Boolean, default=True)
    message = Column(Text, nullable=True)  # Custom message to show when rule applies
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    service = relationship("Service", back_populates="booking_rules")


class NotificationTemplate(Base):
    __tablename__ = "notification_templates"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)  # e.g., "appointment_confirmation", "appointment_reminder"
    template_type = Column(String)  # "email" or "sms"
    subject = Column(String, nullable=True)  # For email only
    body = Column(Text)  # Jinja2 template
    variables = Column(JSON)  # List of available variables for this template
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class NotificationPreference(Base):
    __tablename__ = "notification_preferences"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    
    # Email preferences
    email_enabled = Column(Boolean, default=True)
    email_appointment_confirmation = Column(Boolean, default=True)
    email_appointment_reminder = Column(Boolean, default=True)
    email_appointment_changes = Column(Boolean, default=True)
    email_marketing = Column(Boolean, default=False)
    
    # SMS preferences
    sms_enabled = Column(Boolean, default=True)
    sms_appointment_confirmation = Column(Boolean, default=True)
    sms_appointment_reminder = Column(Boolean, default=True)
    sms_appointment_changes = Column(Boolean, default=True)
    sms_marketing = Column(Boolean, default=False)
    
    # Reminder timing preferences (hours before appointment)
    reminder_hours = Column(JSON, default=[24, 2])  # Default: 24h and 2h before
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", backref="notification_preferences")


class NotificationStatus(enum.Enum):
    PENDING = "pending"
    SENT = "sent"
    FAILED = "failed"
    CANCELLED = "cancelled"


class NotificationQueue(Base):
    __tablename__ = "notification_queue"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    appointment_id = Column(Integer, ForeignKey("appointments.id"), nullable=True)
    notification_type = Column(String)  # "email" or "sms"
    template_name = Column(String)  # Reference to NotificationTemplate.name
    recipient = Column(String)  # Email address or phone number
    subject = Column(String, nullable=True)  # For emails
    body = Column(Text)  # Rendered template
    status = Column(Enum(NotificationStatus), default=NotificationStatus.PENDING)
    scheduled_for = Column(DateTime)  # When to send
    sent_at = Column(DateTime, nullable=True)  # When actually sent
    attempts = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)
    notification_metadata = Column(JSON, nullable=True)  # Additional data
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", backref="notifications")
    appointment = relationship("Appointment", backref="notifications")


# SMS Conversation Models for Direct Customer Communication
class SMSConversation(Base):
    """SMS conversation threads with customers - tracks ongoing text message conversations"""
    __tablename__ = "sms_conversations"
    
    id = Column(Integer, primary_key=True, index=True)
    customer_phone = Column(String, nullable=False, index=True)  # Customer's actual phone number
    customer_name = Column(String, nullable=True)  # Customer name if known
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=True)  # Link to client if exists
    barber_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Assigned barber
    
    # Conversation status
    status = Column(String, default="active")  # active, archived, blocked
    last_message_at = Column(DateTime, nullable=True)  # Last message in conversation
    last_message_from = Column(String, nullable=True)  # 'customer' or 'business'
    
    # Message counts
    total_messages = Column(Integer, default=0)
    unread_customer_messages = Column(Integer, default=0)  # Messages from customer not read by business
    
    # Conversation metadata
    tags = Column(JSON, nullable=True)  # Tags for organizing conversations
    notes = Column(Text, nullable=True)  # Internal notes about customer
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    client = relationship("Client", backref="sms_conversations")
    barber = relationship("User", backref="assigned_sms_conversations", foreign_keys=[barber_id])
    messages = relationship("SMSMessage", back_populates="conversation", cascade="all, delete-orphan")


class SMSMessageDirection(enum.Enum):
    INBOUND = "inbound"   # Message from customer to business
    OUTBOUND = "outbound" # Message from business to customer


class SMSMessageStatus(enum.Enum):
    QUEUED = "queued"
    SENT = "sent"
    DELIVERED = "delivered"
    FAILED = "failed"
    READ = "read"  # For tracking read receipts if available


class SMSMessage(Base):
    """Individual SMS messages within conversations - tracks each text message"""
    __tablename__ = "sms_messages"
    
    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("sms_conversations.id"), nullable=False)
    
    # Message content
    body = Column(Text, nullable=False)  # The actual SMS message text
    direction = Column(Enum(SMSMessageDirection), nullable=False)  # inbound or outbound
    
    # Phone numbers (E.164 format)
    from_phone = Column(String, nullable=False)  # Sender's phone number
    to_phone = Column(String, nullable=False)    # Recipient's phone number
    
    # Twilio tracking
    twilio_sid = Column(String, nullable=True, index=True)  # Twilio message SID
    status = Column(Enum(SMSMessageStatus), default=SMSMessageStatus.QUEUED)
    
    # Business user who sent (for outbound messages)
    sent_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Delivery tracking
    sent_at = Column(DateTime, nullable=True)
    delivered_at = Column(DateTime, nullable=True)
    read_at = Column(DateTime, nullable=True)  # When business read incoming message
    failed_at = Column(DateTime, nullable=True)
    
    # Error handling
    error_code = Column(String, nullable=True)  # Twilio error code if failed
    error_message = Column(Text, nullable=True)  # Error description
    
    # Message metadata
    message_metadata = Column(JSON, nullable=True)  # Additional Twilio data, attachments, etc.
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    conversation = relationship("SMSConversation", back_populates="messages")
    sent_by_user = relationship("User", backref="sent_sms_messages", foreign_keys=[sent_by_user_id])


# Barber Availability Models
class BarberAvailability(Base):
    """Regular weekly availability schedule for barbers"""
    __tablename__ = "barber_availability"
    
    id = Column(Integer, primary_key=True, index=True)
    barber_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Day of week (0=Monday, 6=Sunday)
    day_of_week = Column(Integer, nullable=False, index=True)
    
    # Time range
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    
    # Whether this schedule is active
    is_active = Column(Boolean, default=True)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    barber = relationship("User", backref="availability_schedule")


class BarberTimeOff(Base):
    """Time off/vacation schedule for barbers"""
    __tablename__ = "barber_time_off"
    
    id = Column(Integer, primary_key=True, index=True)
    barber_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Date range for time off
    start_date = Column(Date, nullable=False, index=True)
    end_date = Column(Date, nullable=False, index=True)
    
    # Optional: specific times if not full days
    start_time = Column(Time, nullable=True)
    end_time = Column(Time, nullable=True)
    
    # Reason/notes
    reason = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    
    # Status
    status = Column(String, default="approved")  # requested, approved, cancelled
    approved_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    barber = relationship("User", foreign_keys=[barber_id], backref="time_off_requests")
    approved_by = relationship("User", foreign_keys=[approved_by_id])


class BarberSpecialAvailability(Base):
    """Special/override availability for specific dates"""
    __tablename__ = "barber_special_availability"
    
    id = Column(Integer, primary_key=True, index=True)
    barber_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Specific date
    date = Column(Date, nullable=False, index=True)
    
    # Time slots (can have multiple per date)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    
    # Type of special availability
    availability_type = Column(String, default="available")  # available, unavailable
    
    # Optional notes
    notes = Column(Text, nullable=True)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    barber = relationship("User", backref="special_availability")


# Recurring Appointment Models
class RecurringAppointmentPattern(Base):
    """Patterns for recurring appointments"""
    __tablename__ = "recurring_appointment_patterns"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    barber_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=True)
    service_id = Column(Integer, ForeignKey("services.id"), nullable=True)
    
    # Pattern details
    pattern_type = Column(String, nullable=False)  # daily, weekly, biweekly, monthly
    
    # For weekly/biweekly: days of week (stored as comma-separated or JSON)
    days_of_week = Column(JSON, nullable=True)  # [1, 3, 5] for Mon, Wed, Fri
    
    # For monthly: day of month or week position
    day_of_month = Column(Integer, nullable=True)  # 15 for 15th of each month
    week_of_month = Column(Integer, nullable=True)  # 1-4 for 1st-4th week
    
    # Time and duration
    preferred_time = Column(Time, nullable=False)
    duration_minutes = Column(Integer, nullable=False)
    
    # Recurrence range
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=True)  # NULL means no end
    occurrences = Column(Integer, nullable=True)  # Alternative to end_date
    
    # Status and metadata
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id], backref="recurring_patterns")
    barber = relationship("User", foreign_keys=[barber_id])
    client = relationship("Client", backref="recurring_patterns")
    service = relationship("Service", backref="recurring_patterns")
    # appointments = relationship("Appointment", backref="recurring_pattern")  # Disabled for current schema


# Update Appointment model to link to recurring pattern
# Add to the Appointment model after line 50 (after created_at)
# recurring_pattern_id = Column(Integer, ForeignKey("recurring_appointment_patterns.id"), nullable=True)


# Enhanced Booking Rules
class BookingRule(Base):
    """Global booking rules and constraints"""
    __tablename__ = "booking_rules"
    
    id = Column(Integer, primary_key=True, index=True)
    business_id = Column(Integer, default=1)  # For multi-tenant support
    
    # Rule details
    rule_name = Column(String, nullable=False, unique=True)
    rule_type = Column(String, nullable=False)  # min_duration, max_duration, buffer_time, etc.
    
    # Rule parameters (flexible JSON for different rule types)
    rule_params = Column(JSON, nullable=False)
    
    # Applicability
    applies_to = Column(String, default="all")  # all, service, barber, client_type
    service_ids = Column(JSON, nullable=True)  # List of service IDs if applies_to='service'
    barber_ids = Column(JSON, nullable=True)  # List of barber IDs if applies_to='barber'
    client_types = Column(JSON, nullable=True)  # List of client types if applies_to='client_type'
    
    # Priority and status
    priority = Column(Integer, default=0)  # Higher priority rules override lower
    is_active = Column(Boolean, default=True)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Relationships
    created_by = relationship("User", backref="created_booking_rules")


# ================================================================================
# WEBHOOK MODELS
# ================================================================================

class WebhookAuthType(enum.Enum):
    """Authentication types for webhook endpoints"""
    none = "none"
    bearer = "bearer"
    basic = "basic"
    hmac = "hmac"
    api_key = "api_key"


class WebhookStatus(enum.Enum):
    """Status types for webhook deliveries"""
    pending = "pending"
    success = "success"
    failed = "failed"
    retrying = "retrying"


class WebhookEventType(enum.Enum):
    """Event types that can trigger webhooks"""
    appointment_created = "appointment.created"
    appointment_updated = "appointment.updated"
    appointment_cancelled = "appointment.cancelled"
    appointment_completed = "appointment.completed"
    payment_succeeded = "payment.succeeded"
    payment_failed = "payment.failed"
    payment_refunded = "payment.refunded"
    client_created = "client.created"
    client_updated = "client.updated"
    user_registered = "user.registered"


class WebhookEndpoint(Base):
    """Webhook endpoint configuration"""
    __tablename__ = "webhook_endpoints"
    
    id = Column(String, primary_key=True)
    url = Column(String, nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    events = Column(JSON, nullable=False)  # List of event types to subscribe to
    
    # Authentication configuration
    auth_type = Column(Enum(WebhookAuthType), default=WebhookAuthType.none)
    auth_config = Column(JSON, nullable=True)  # Auth configuration (tokens, keys, etc.)
    headers = Column(JSON, nullable=True)  # Custom headers to send
    secret = Column(String, nullable=True)  # Secret for HMAC signing
    
    # Endpoint settings
    is_active = Column(Boolean, default=True)
    max_retries = Column(Integer, default=3)
    retry_delay_seconds = Column(Integer, default=300)  # 5 minutes
    timeout_seconds = Column(Integer, default=30)
    
    # Audit fields
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(String, ForeignKey("users.id"), nullable=True)
    
    # Statistics
    total_deliveries = Column(Integer, default=0)
    successful_deliveries = Column(Integer, default=0)
    failed_deliveries = Column(Integer, default=0)
    last_triggered_at = Column(DateTime, nullable=True)
    last_success_at = Column(DateTime, nullable=True)
    last_failure_at = Column(DateTime, nullable=True)
    
    # Relationships
    logs = relationship("WebhookLog", back_populates="endpoint", cascade="all, delete-orphan")
    creator = relationship("User", foreign_keys=[created_by])
    
    @property
    def success_rate(self) -> float:
        """Calculate success rate percentage"""
        if self.total_deliveries == 0:
            return 0.0
        return (self.successful_deliveries / self.total_deliveries) * 100
    
    def increment_stats(self, success: bool):
        """Increment delivery statistics"""
        self.total_deliveries += 1
        self.last_triggered_at = datetime.utcnow()
        
        if success:
            self.successful_deliveries += 1
            self.last_success_at = datetime.utcnow()
        else:
            self.failed_deliveries += 1
            self.last_failure_at = datetime.utcnow()


class WebhookLog(Base):
    """Webhook delivery log"""
    __tablename__ = "webhook_logs"
    
    id = Column(String, primary_key=True)
    endpoint_id = Column(String, ForeignKey("webhook_endpoints.id"), nullable=False)
    
    # Event information
    event_type = Column(String, nullable=False)
    event_id = Column(String, nullable=True)  # ID of the resource that triggered the event
    
    # Delivery status
    status = Column(Enum(WebhookStatus), default=WebhookStatus.pending)
    status_code = Column(Integer, nullable=True)  # HTTP status code from response
    
    # Request details
    request_url = Column(String, nullable=False)
    request_method = Column(String, default="POST")
    request_headers = Column(JSON, nullable=True)
    request_body = Column(JSON, nullable=True)
    
    # Response details
    response_headers = Column(JSON, nullable=True)
    response_body = Column(Text, nullable=True)
    response_time_ms = Column(Integer, nullable=True)
    
    # Error handling
    error_message = Column(Text, nullable=True)
    retry_count = Column(Integer, default=0)
    next_retry_at = Column(DateTime, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    delivered_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    
    # Relationships
    endpoint = relationship("WebhookEndpoint", back_populates="logs")
    
    @property
    def is_completed(self) -> bool:
        """Check if webhook delivery is completed (success or final failure)"""
        return self.status in [WebhookStatus.success, WebhookStatus.failed] and self.completed_at is not None
    
    @property
    def can_retry(self) -> bool:
        """Check if webhook can be retried"""
        if not self.endpoint:
            return False
        return (
            self.status in [WebhookStatus.failed, WebhookStatus.retrying] and
            self.retry_count < self.endpoint.max_retries and
            datetime.utcnow() >= (self.next_retry_at or datetime.utcnow())
        )
    
    def mark_delivered(self, status_code: int, response_body: str = None, response_headers: dict = None, response_time_ms: int = None):
        """Mark webhook as delivered with response details"""
        self.delivered_at = datetime.utcnow()
        self.status_code = status_code
        self.response_body = response_body
        self.response_headers = response_headers
        self.response_time_ms = response_time_ms
        
        # Determine status based on response code
        if 200 <= status_code < 300:
            self.status = WebhookStatus.success
            self.completed_at = datetime.utcnow()
        else:
            self.status = WebhookStatus.failed
            if self.can_retry:
                self.schedule_retry()
            else:
                self.completed_at = datetime.utcnow()
    
    def mark_failed(self, error_message: str):
        """Mark webhook as failed with error message"""
        self.status = WebhookStatus.failed
        self.error_message = error_message
        self.delivered_at = datetime.utcnow()
        
        if self.can_retry:
            self.schedule_retry()
        else:
            self.completed_at = datetime.utcnow()
    
    def schedule_retry(self):
        """Schedule next retry attempt"""
        if self.endpoint and self.retry_count < self.endpoint.max_retries:
            self.retry_count += 1
            self.status = WebhookStatus.retrying
            
            # Calculate exponential backoff: base_delay * (2 ^ retry_count)
            delay_seconds = self.endpoint.retry_delay_seconds * (2 ** (self.retry_count - 1))
            self.next_retry_at = datetime.utcnow() + timedelta(seconds=delay_seconds)
        else:
            self.status = WebhookStatus.failed
            self.completed_at = datetime.utcnow()
