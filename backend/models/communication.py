"""
Communication models for email and SMS tracking
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, JSON, ForeignKey, Enum, Text, Float
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

from models.base import Base


class EmailStatus(str, enum.Enum):
    """Email delivery status"""
    SENT = "sent"
    DELIVERED = "delivered"
    OPENED = "opened"
    CLICKED = "clicked"
    BOUNCED = "bounced"
    FAILED = "failed"
    SPAM = "spam"


class SMSStatus(str, enum.Enum):
    """SMS delivery status"""
    SENT = "sent"
    DELIVERED = "delivered"
    FAILED = "failed"
    UNDELIVERED = "undelivered"


class CommunicationType(str, enum.Enum):
    """Types of communications"""
    APPOINTMENT_CONFIRMATION = "appointment_confirmation"
    APPOINTMENT_REMINDER = "appointment_reminder"
    APPOINTMENT_CANCELLATION = "appointment_cancellation"
    PAYMENT_RECEIPT = "payment_receipt"
    WELCOME = "welcome"
    PASSWORD_RESET = "password_reset"
    MARKETING = "marketing"
    NOTIFICATION = "notification"
    CUSTOM = "custom"


class EmailLog(Base):
    """Email communication log"""
    __tablename__ = "email_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    recipient = Column(String(255), nullable=False, index=True)
    subject = Column(String(500), nullable=False)
    template = Column(String(100), nullable=False)
    status = Column(Enum(EmailStatus), default=EmailStatus.SENT, nullable=False, index=True)
    
    # Tracking
    sent_at = Column(DateTime, nullable=True)
    delivered_at = Column(DateTime, nullable=True)
    opened_at = Column(DateTime, nullable=True)
    clicked_at = Column(DateTime, nullable=True)
    bounced_at = Column(DateTime, nullable=True)
    
    # Error handling
    error_message = Column(Text, nullable=True)
    
    # Metadata
    email_metadata = Column(JSON, default={})
    message_id = Column(String(255), nullable=True, index=True)  # Email provider message ID
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="email_logs")
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "recipient": self.recipient,
            "subject": self.subject,
            "template": self.template,
            "status": self.status.value,
            "sent_at": self.sent_at.isoformat() if self.sent_at else None,
            "delivered_at": self.delivered_at.isoformat() if self.delivered_at else None,
            "opened_at": self.opened_at.isoformat() if self.opened_at else None,
            "clicked_at": self.clicked_at.isoformat() if self.clicked_at else None,
            "bounced_at": self.bounced_at.isoformat() if self.bounced_at else None,
            "error_message": self.error_message,
            "metadata": self.email_metadata,
            "created_at": self.created_at.isoformat()
        }


class SMSLog(Base):
    """SMS communication log"""
    __tablename__ = "sms_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    recipient = Column(String(20), nullable=False, index=True)
    message = Column(Text, nullable=False)
    status = Column(Enum(SMSStatus), default=SMSStatus.SENT, nullable=False, index=True)
    
    # Tracking
    sent_at = Column(DateTime, nullable=True)
    delivered_at = Column(DateTime, nullable=True)
    
    # Error handling
    error_message = Column(Text, nullable=True)
    
    # Provider information
    twilio_sid = Column(String(100), nullable=True, index=True)
    cost = Column(Float, nullable=True)
    
    # Metadata
    sms_metadata = Column(JSON, default={})
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="sms_logs")
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "recipient": self.recipient,
            "message": self.message,
            "status": self.status.value,
            "sent_at": self.sent_at.isoformat() if self.sent_at else None,
            "delivered_at": self.delivered_at.isoformat() if self.delivered_at else None,
            "error_message": self.error_message,
            "twilio_sid": self.twilio_sid,
            "cost": self.cost,
            "metadata": self.sms_metadata,
            "created_at": self.created_at.isoformat()
        }


class NotificationPreference(Base):
    """User notification preferences"""
    __tablename__ = "notification_preferences"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True, index=True)
    
    # Email preferences
    email_appointment_confirmation = Column(Boolean, default=True)
    email_appointment_reminder = Column(Boolean, default=True)
    email_appointment_cancellation = Column(Boolean, default=True)
    email_payment_receipt = Column(Boolean, default=True)
    email_marketing = Column(Boolean, default=False)
    email_performance_reports = Column(Boolean, default=True)
    email_team_updates = Column(Boolean, default=True)
    
    # SMS preferences
    sms_appointment_confirmation = Column(Boolean, default=True)
    sms_appointment_reminder = Column(Boolean, default=True)
    sms_appointment_cancellation = Column(Boolean, default=True)
    sms_payment_confirmation = Column(Boolean, default=False)
    sms_marketing = Column(Boolean, default=False)
    
    # Push notification preferences
    push_enabled = Column(Boolean, default=True)
    push_appointment_updates = Column(Boolean, default=True)
    push_performance_alerts = Column(Boolean, default=True)
    push_team_updates = Column(Boolean, default=True)
    
    # Reminder timing preferences
    reminder_hours_before = Column(Integer, default=24)  # Hours before appointment
    second_reminder_hours = Column(Integer, default=2)   # Second reminder timing
    
    # Quiet hours
    quiet_hours_enabled = Column(Boolean, default=False)
    quiet_hours_start = Column(Integer, default=22)  # 10 PM
    quiet_hours_end = Column(Integer, default=8)     # 8 AM
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="notification_preferences", uselist=False)
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "email": {
                "appointment_confirmation": self.email_appointment_confirmation,
                "appointment_reminder": self.email_appointment_reminder,
                "appointment_cancellation": self.email_appointment_cancellation,
                "payment_receipt": self.email_payment_receipt,
                "marketing": self.email_marketing,
                "performance_reports": self.email_performance_reports,
                "team_updates": self.email_team_updates
            },
            "sms": {
                "appointment_confirmation": self.sms_appointment_confirmation,
                "appointment_reminder": self.sms_appointment_reminder,
                "appointment_cancellation": self.sms_appointment_cancellation,
                "payment_confirmation": self.sms_payment_confirmation,
                "marketing": self.sms_marketing
            },
            "push": {
                "enabled": self.push_enabled,
                "appointment_updates": self.push_appointment_updates,
                "performance_alerts": self.push_performance_alerts,
                "team_updates": self.push_team_updates
            },
            "reminders": {
                "hours_before": self.reminder_hours_before,
                "second_reminder_hours": self.second_reminder_hours
            },
            "quiet_hours": {
                "enabled": self.quiet_hours_enabled,
                "start": self.quiet_hours_start,
                "end": self.quiet_hours_end
            },
            "updated_at": self.updated_at.isoformat()
        }


class CommunicationTemplate(Base):
    """Reusable communication templates"""
    __tablename__ = "communication_templates"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    type = Column(Enum(CommunicationType), nullable=False, index=True)
    channel = Column(String(20), nullable=False)  # email, sms
    
    # Template content
    subject = Column(String(500), nullable=True)  # For emails
    content = Column(Text, nullable=False)
    variables = Column(JSON, default=[])  # List of template variables
    
    # Status
    is_active = Column(Boolean, default=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            "id": self.id,
            "name": self.name,
            "type": self.type.value,
            "channel": self.channel,
            "subject": self.subject,
            "content": self.content,
            "variables": self.variables,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat()
        }