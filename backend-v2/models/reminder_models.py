"""
SQLAlchemy models for the appointment reminder system
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, Date, Time, Text, Numeric, ForeignKey, Index
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime

from core.database import Base


class ReminderPreference(Base):
    """Client preferences for appointment reminders"""
    __tablename__ = "reminder_preferences"
    
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, index=True)
    sms_enabled = Column(Boolean, default=True)
    email_enabled = Column(Boolean, default=True)
    push_enabled = Column(Boolean, default=False)
    advance_hours = Column(Integer, default=24)  # How many hours before appointment
    preferred_time_start = Column(Time)  # Earliest time to send reminders (9 AM default)
    preferred_time_end = Column(Time)    # Latest time to send reminders (8 PM default)
    timezone = Column(String(50), default="UTC")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    client = relationship("Client", back_populates="reminder_preferences")
    
    def __repr__(self):
        return f"<ReminderPreference(client_id={self.client_id}, sms={self.sms_enabled}, email={self.email_enabled})>"


class ReminderSchedule(Base):
    """Scheduled reminders for appointments"""
    __tablename__ = "reminder_schedules"
    
    id = Column(Integer, primary_key=True, index=True)
    appointment_id = Column(Integer, ForeignKey("appointments.id", ondelete="CASCADE"), nullable=False, index=True)
    reminder_type = Column(String(20), nullable=False)  # '24_hour', '2_hour', 'followup'
    scheduled_for = Column(DateTime(timezone=True), nullable=False, index=True)
    status = Column(String(20), default="pending", index=True)  # 'pending', 'processing', 'sent', 'failed'
    delivery_attempts = Column(Integer, default=0)
    max_attempts = Column(Integer, default=3)
    next_retry = Column(DateTime(timezone=True))
    priority = Column(Integer, default=1)  # 1=high, 2=medium, 3=low
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    appointment = relationship("Appointment", back_populates="reminder_schedules")
    deliveries = relationship("ReminderDelivery", back_populates="schedule", cascade="all, delete-orphan")
    
    # Composite index for efficient processing queries
    __table_args__ = (
        Index('idx_reminder_schedules_processing', 'status', 'scheduled_for'),
    )
    
    def __repr__(self):
        return f"<ReminderSchedule(appointment_id={self.appointment_id}, type={self.reminder_type}, status={self.status})>"


class ReminderDelivery(Base):
    """Individual reminder delivery attempts and responses"""
    __tablename__ = "reminder_deliveries"
    
    id = Column(Integer, primary_key=True, index=True)
    schedule_id = Column(Integer, ForeignKey("reminder_schedules.id", ondelete="CASCADE"), nullable=False, index=True)
    channel = Column(String(10), nullable=False, index=True)  # 'sms', 'email', 'push'
    provider = Column(String(20))  # 'twilio', 'sendgrid', 'fcm'
    provider_message_id = Column(String(100), index=True)
    provider_response = Column(JSONB)  # Full provider response for debugging
    delivered_at = Column(DateTime(timezone=True), index=True)
    client_response = Column(String(20))  # 'confirmed', 'rescheduled', 'cancelled'
    response_at = Column(DateTime(timezone=True))
    delivery_status = Column(String(20), default="pending")  # 'pending', 'sent', 'delivered', 'failed'
    failure_reason = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    schedule = relationship("ReminderSchedule", back_populates="deliveries")
    
    # Composite index for response tracking
    __table_args__ = (
        Index('idx_reminder_deliveries_response', 'client_response', 'response_at'),
    )
    
    def __repr__(self):
        return f"<ReminderDelivery(schedule_id={self.schedule_id}, channel={self.channel}, status={self.delivery_status})>"


class ReminderTemplate(Base):
    """Customizable reminder message templates"""
    __tablename__ = "reminder_templates"
    
    id = Column(Integer, primary_key=True, index=True)
    template_name = Column(String(50), nullable=False)
    reminder_type = Column(String(20), nullable=False)  # '24_hour', '2_hour', 'followup'
    channel = Column(String(10), nullable=False)  # 'sms', 'email', 'push'
    subject_template = Column(Text)  # For email subject lines
    body_template = Column(Text, nullable=False)
    variables = Column(JSONB)  # Available template variables and descriptions
    shop_id = Column(Integer, ForeignKey("shops.id", ondelete="CASCADE"))  # Null = default template
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    shop = relationship("Shop")
    
    # Unique constraint for template name per shop
    __table_args__ = (
        Index('idx_reminder_templates_type_channel', 'reminder_type', 'channel'),
        Index('uq_reminder_templates_name_shop', 'template_name', 'shop_id', unique=True),
    )
    
    def __repr__(self):
        return f"<ReminderTemplate(name={self.template_name}, type={self.reminder_type}, channel={self.channel})>"


class ReminderAnalytics(Base):
    """Daily analytics for reminder system performance"""
    __tablename__ = "reminder_analytics"
    
    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False, index=True)
    shop_id = Column(Integer, ForeignKey("shops.id", ondelete="CASCADE"), index=True)
    barber_id = Column(Integer, ForeignKey("barbers.id", ondelete="CASCADE"), index=True)
    reminder_type = Column(String(20), nullable=False)
    channel = Column(String(10), nullable=False)
    total_sent = Column(Integer, default=0)
    total_delivered = Column(Integer, default=0)
    total_confirmed = Column(Integer, default=0)
    total_rescheduled = Column(Integer, default=0)
    total_cancelled = Column(Integer, default=0)
    no_show_prevented = Column(Integer, default=0)
    revenue_protected = Column(Numeric(10, 2), default=0)  # Estimated revenue saved
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    shop = relationship("Shop")
    barber = relationship("Barber")
    
    # Unique constraint for daily analytics
    __table_args__ = (
        Index('idx_reminder_analytics_shop_date', 'shop_id', 'date'),
        Index('idx_reminder_analytics_barber_date', 'barber_id', 'date'),
        Index('uq_reminder_analytics_daily', 'date', 'shop_id', 'barber_id', 'reminder_type', 'channel', unique=True),
    )
    
    def __repr__(self):
        return f"<ReminderAnalytics(date={self.date}, shop_id={self.shop_id}, type={self.reminder_type})>"


# Add relationship back-references to existing models (to be added to existing model files)
"""
Add these to your existing models:

# In Client model:
reminder_preferences = relationship("ReminderPreference", back_populates="client", uselist=False)

# In Appointment model:  
reminder_schedules = relationship("ReminderSchedule", back_populates="appointment")
reminder_confirmed = Column(Boolean, default=False)
confirmation_time = Column(DateTime(timezone=True))
reminder_opt_out = Column(Boolean, default=False)
last_reminder_sent = Column(DateTime(timezone=True))

# In Client model (additional fields):
device_token = Column(String(255))
push_notifications_enabled = Column(Boolean, default=False)
"""