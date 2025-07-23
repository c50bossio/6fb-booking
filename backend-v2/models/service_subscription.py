"""
Service Subscription Models for Recurring Services

This module defines models for service subscriptions that allow barbers to offer:
- Monthly service packages (e.g., "Bi-weekly Cuts")
- Prepaid service bundles (e.g., "5 Cuts for $200") 
- Maintenance plans (e.g., "Monthly Beard Trim")
- VIP memberships with perks

Integrates with Stripe for automated billing and payment processing.
"""

from sqlalchemy import Column, Integer, String, DateTime, Float, ForeignKey, Boolean, Text, JSON, Enum, Index
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime, timezone
import enum

def utcnow():
    return datetime.now(timezone.utc).replace(tzinfo=None)


class SubscriptionType(enum.Enum):
    """Types of service subscriptions"""
    MONTHLY_PLAN = "monthly_plan"          # Monthly recurring service plan
    SERVICE_BUNDLE = "service_bundle"      # Prepaid service bundle
    MAINTENANCE_PLAN = "maintenance_plan"  # Regular maintenance services
    VIP_MEMBERSHIP = "vip_membership"      # VIP membership with perks
    CUSTOM_PACKAGE = "custom_package"      # Custom tailored package


class SubscriptionStatus(enum.Enum):
    """Subscription status lifecycle"""
    DRAFT = "draft"                  # Being created/configured
    ACTIVE = "active"               # Active and billing
    PAUSED = "paused"               # Temporarily suspended
    CANCELLED = "cancelled"         # Cancelled by client/barber
    EXPIRED = "expired"             # Natural expiration
    PAST_DUE = "past_due"          # Payment failed


class BillingInterval(enum.Enum):
    """How often the subscription bills"""
    WEEKLY = "weekly"
    BIWEEKLY = "biweekly" 
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    ANNUALLY = "annually"
    ONE_TIME = "one_time"           # For prepaid bundles


class ServiceSubscriptionTemplate(Base):
    """
    Templates for service subscriptions that barbers can offer.
    These are the "menu" of subscription packages available.
    """
    __tablename__ = "service_subscription_templates"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Basic Information
    name = Column(String, nullable=False)                    # "Monthly Cuts Package"
    description = Column(Text, nullable=True)                # Detailed description
    subscription_type = Column(Enum(SubscriptionType), nullable=False)
    
    # Pricing and Billing
    price = Column(Float, nullable=False)                    # Subscription price
    original_price = Column(Float, nullable=True)            # Original price for discounts
    billing_interval = Column(Enum(BillingInterval), nullable=False)
    
    # Service Allocation
    services_per_period = Column(Integer, default=1)         # How many services per billing period
    rollover_unused = Column(Boolean, default=False)        # Can unused services roll over?
    max_rollover = Column(Integer, nullable=True)            # Max services that can rollover
    
    # Validity and Restrictions
    duration_months = Column(Integer, nullable=True)         # Contract duration (null = ongoing)
    min_commitment_months = Column(Integer, default=1)       # Minimum commitment
    early_cancellation_fee = Column(Float, default=0.0)     # Fee for early cancellation
    
    # Scheduling Rules
    min_days_between_services = Column(Integer, default=1)   # Minimum spacing between appointments
    max_advance_booking_days = Column(Integer, default=90)   # How far ahead can they book
    blackout_dates = Column(JSON, nullable=True)             # Dates when subscription can't be used
    
    # Perks and Benefits
    priority_booking = Column(Boolean, default=False)        # Jump ahead in queue
    discount_on_additional = Column(Float, default=0.0)     # % discount on additional services
    free_product_samples = Column(Boolean, default=False)   # Include product samples
    vip_perks = Column(JSON, nullable=True)                 # Additional perks as JSON
    
    # Business Rules
    is_active = Column(Boolean, default=True)                # Template is available
    max_subscribers = Column(Integer, nullable=True)         # Limit total subscribers
    requires_approval = Column(Boolean, default=False)       # Barber must approve subscription
    
    # Attribution
    barber_id = Column(Integer, ForeignKey("users.id"), nullable=False)  # Barber offering this
    location_id = Column(Integer, nullable=True)             # Location if multi-location
    
    # Metadata
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
    
    # Relationships
    barber = relationship("User", backref="subscription_templates")
    subscriptions = relationship("ServiceSubscription", back_populates="template")
    template_services = relationship("SubscriptionTemplateService", back_populates="template")
    
    def get_total_value(self):
        """Calculate the total value of services included in this subscription"""
        total = 0.0
        for template_service in self.template_services:
            service_value = template_service.service.base_price * template_service.quantity_per_period
            total += service_value
        return total
    
    def get_savings_amount(self):
        """Calculate how much client saves vs individual service prices"""
        total_value = self.get_total_value()
        return max(0, total_value - self.price)
    
    def get_savings_percentage(self):
        """Calculate percentage savings"""
        total_value = self.get_total_value()
        if total_value > 0:
            return (self.get_savings_amount() / total_value) * 100
        return 0


class SubscriptionTemplateService(Base):
    """
    Junction table defining which services are included in a subscription template
    and how many of each service per billing period.
    """
    __tablename__ = "subscription_template_services"
    
    id = Column(Integer, primary_key=True, index=True)
    template_id = Column(Integer, ForeignKey("service_subscription_templates.id"), nullable=False)
    service_id = Column(Integer, ForeignKey("services.id"), nullable=False)
    quantity_per_period = Column(Integer, default=1)         # How many of this service per period
    
    # Relationships
    template = relationship("ServiceSubscriptionTemplate", back_populates="template_services")
    service = relationship("Service")


class ServiceSubscription(Base):
    """
    Active service subscription for a specific client.
    Tracks usage, payments, and subscription lifecycle.
    """
    __tablename__ = "service_subscriptions"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Core Relationships
    client_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    barber_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    template_id = Column(Integer, ForeignKey("service_subscription_templates.id"), nullable=False)
    
    # Status and Lifecycle
    status = Column(Enum(SubscriptionStatus), default=SubscriptionStatus.DRAFT)
    started_at = Column(DateTime, nullable=True)             # When subscription became active
    cancelled_at = Column(DateTime, nullable=True)          # When it was cancelled
    expires_at = Column(DateTime, nullable=True)            # When it naturally expires
    next_billing_date = Column(DateTime, nullable=True)     # Next payment date
    
    # Payment Integration
    stripe_subscription_id = Column(String, nullable=True)   # Stripe subscription ID
    stripe_customer_id = Column(String, nullable=True)      # Stripe customer ID
    
    # Service Usage Tracking
    services_used_current_period = Column(Integer, default=0)  # Used this billing period
    services_rolled_over = Column(Integer, default=0)          # Rolled over from previous periods
    total_services_available = Column(Integer, default=0)      # Total available (including rollovers)
    
    # Billing and Financials
    current_period_start = Column(DateTime, nullable=True)   # Start of current billing period
    current_period_end = Column(DateTime, nullable=True)     # End of current billing period
    last_payment_date = Column(DateTime, nullable=True)     # Last successful payment
    last_payment_amount = Column(Float, nullable=True)      # Amount of last payment
    failed_payment_count = Column(Integer, default=0)       # Consecutive failed payments
    
    # Customizations (can override template values)
    custom_price = Column(Float, nullable=True)             # Override template price
    custom_services_per_period = Column(Integer, nullable=True)  # Override service allocation
    custom_notes = Column(Text, nullable=True)              # Special notes or modifications
    
    # Metadata
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
    
    # Relationships
    client = relationship("User", foreign_keys=[client_id], backref="service_subscriptions")
    barber = relationship("User", foreign_keys=[barber_id], backref="offered_subscriptions")
    template = relationship("ServiceSubscriptionTemplate", back_populates="subscriptions")
    usage_records = relationship("SubscriptionUsageRecord", back_populates="subscription")
    
    @property
    def effective_price(self):
        """Get the effective price (custom or template price)"""
        return self.custom_price if self.custom_price is not None else self.template.price
    
    @property
    def effective_services_per_period(self):
        """Get effective services per period (custom or template)"""
        return self.custom_services_per_period if self.custom_services_per_period is not None else self.template.services_per_period
    
    @property
    def services_remaining_current_period(self):
        """Calculate services remaining in current billing period"""
        return max(0, self.total_services_available - self.services_used_current_period)
    
    def can_book_service(self, service_id: int) -> bool:
        """Check if client can book a specific service with this subscription"""
        if self.status != SubscriptionStatus.ACTIVE:
            return False
        
        if self.services_remaining_current_period <= 0:
            return False
        
        # Check if this service is included in the template
        for template_service in self.template.template_services:
            if template_service.service_id == service_id:
                return True
        
        return False
    
    def use_service(self, service_id: int, appointment_id: int, db):
        """Record usage of a service from this subscription"""
        if not self.can_book_service(service_id):
            raise ValueError("Cannot use service - subscription doesn't allow it")
        
        # Create usage record
        usage_record = SubscriptionUsageRecord(
            subscription_id=self.id,
            service_id=service_id,
            appointment_id=appointment_id,
            used_at=utcnow()
        )
        db.add(usage_record)
        
        # Update usage counters
        self.services_used_current_period += 1
        self.updated_at = utcnow()
        
        db.commit()
        return usage_record


class SubscriptionUsageRecord(Base):
    """
    Track individual service usage from subscriptions.
    Links appointments to subscription consumption.
    """
    __tablename__ = "subscription_usage_records"
    
    id = Column(Integer, primary_key=True, index=True)
    
    subscription_id = Column(Integer, ForeignKey("service_subscriptions.id"), nullable=False)
    service_id = Column(Integer, ForeignKey("services.id"), nullable=False)
    appointment_id = Column(Integer, ForeignKey("appointments.id"), nullable=True)  # May be null for manual records
    
    used_at = Column(DateTime, default=utcnow)               # When service was consumed
    billing_period_start = Column(DateTime, nullable=True)  # Which billing period this counted against
    billing_period_end = Column(DateTime, nullable=True)
    
    # Value tracking
    service_value = Column(Float, nullable=True)            # Value of service at time of use
    discount_applied = Column(Float, default=0.0)          # Any additional discount applied
    
    # Metadata
    notes = Column(Text, nullable=True)                     # Notes about this usage
    refunded = Column(Boolean, default=False)              # If this usage was refunded
    refunded_at = Column(DateTime, nullable=True)
    
    # Relationships
    subscription = relationship("ServiceSubscription", back_populates="usage_records")
    service = relationship("Service")
    appointment = relationship("Appointment")


class SubscriptionBillingEvent(Base):
    """
    Track billing events for subscriptions - payments, failures, refunds, etc.
    """
    __tablename__ = "subscription_billing_events"
    
    id = Column(Integer, primary_key=True, index=True)
    
    subscription_id = Column(Integer, ForeignKey("service_subscriptions.id"), nullable=False)
    
    # Event Details
    event_type = Column(String, nullable=False)             # payment, failure, refund, cancellation, etc.
    amount = Column(Float, nullable=True)                   # Amount involved
    currency = Column(String(3), default="USD")            # Currency code
    
    # Payment Details
    stripe_invoice_id = Column(String, nullable=True)       # Stripe invoice ID
    stripe_payment_intent_id = Column(String, nullable=True)  # Stripe payment intent
    payment_method = Column(String, nullable=True)          # Payment method used
    
    # Period Information
    billing_period_start = Column(DateTime, nullable=True)  # Period this billing event covers
    billing_period_end = Column(DateTime, nullable=True)
    
    # Status and Results
    success = Column(Boolean, nullable=False)               # Whether event succeeded
    error_message = Column(Text, nullable=True)             # Error message if failed
    retry_count = Column(Integer, default=0)                # Number of retries
    
    # Metadata
    occurred_at = Column(DateTime, default=utcnow)
    event_metadata = Column(JSON, nullable=True)            # Additional event data
    
    # Relationships
    subscription = relationship("ServiceSubscription")


# Indexes for better performance
Index('idx_service_subscriptions_client_status', 'client_id', 'status')
Index('idx_service_subscriptions_barber_status', 'barber_id', 'status')
Index('idx_service_subscriptions_next_billing', 'next_billing_date', 'status')
Index('idx_subscription_usage_subscription_date', 'subscription_id', 'used_at')
Index('idx_subscription_billing_events_subscription', 'subscription_id', 'occurred_at')