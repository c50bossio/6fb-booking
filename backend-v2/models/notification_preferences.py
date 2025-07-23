from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, JSON, Text, Index
from sqlalchemy.orm import relationship
from db import Base
from datetime import datetime, timezone
import secrets
import hashlib

# Helper function for UTC datetime
def utcnow():
    return datetime.now(timezone.utc).replace(tzinfo=None)

class NotificationPreferences(Base):
    """Enhanced user notification preferences with granular control"""
    __tablename__ = "notification_preferences_v2"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    
    # Global preferences
    email_enabled = Column(Boolean, default=True)
    sms_enabled = Column(Boolean, default=True)
    timezone = Column(String(50), default='UTC')  # User's timezone for notifications
    
    # Email notification types
    email_appointment_confirmation = Column(Boolean, default=True)
    email_appointment_reminder = Column(Boolean, default=True)
    email_appointment_changes = Column(Boolean, default=True)
    email_appointment_cancellation = Column(Boolean, default=True)
    email_payment_confirmation = Column(Boolean, default=True)
    email_payment_failed = Column(Boolean, default=True)
    email_marketing = Column(Boolean, default=False)
    email_news_updates = Column(Boolean, default=False)
    email_promotional = Column(Boolean, default=False)
    email_system_alerts = Column(Boolean, default=True)
    
    # SMS notification types
    sms_appointment_confirmation = Column(Boolean, default=True)
    sms_appointment_reminder = Column(Boolean, default=True)
    sms_appointment_changes = Column(Boolean, default=True)
    sms_appointment_cancellation = Column(Boolean, default=True)
    sms_payment_confirmation = Column(Boolean, default=False)
    sms_payment_failed = Column(Boolean, default=True)
    sms_marketing = Column(Boolean, default=False)
    sms_promotional = Column(Boolean, default=False)
    sms_system_alerts = Column(Boolean, default=False)
    
    # Frequency settings
    email_frequency = Column(String(20), default="immediate")  # immediate, daily, weekly, never
    sms_frequency = Column(String(20), default="immediate")    # immediate, daily, never
    
    # Reminder timing preferences (JSON array of hours before appointment)
    reminder_hours = Column(JSON, default=[24, 2])  # Default: 24h and 2h before
    
    # Advanced preferences
    quiet_hours_enabled = Column(Boolean, default=False)
    quiet_hours_start = Column(String(5), default="22:00")  # HH:MM format
    quiet_hours_end = Column(String(5), default="08:00")    # HH:MM format
    weekend_notifications = Column(Boolean, default=True)
    
    # GDPR compliance
    consent_given_at = Column(DateTime, default=utcnow)
    consent_ip_address = Column(String(45), nullable=True)  # IPv6 compatible
    last_updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
    data_processing_consent = Column(Boolean, default=True)
    marketing_consent = Column(Boolean, default=False)
    
    # Unsubscribe token for one-click unsubscribe
    unsubscribe_token = Column(String(64), unique=True, index=True)
    
    # Metadata
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
    
    # Relationships
    user = relationship("User", backref="enhanced_notification_preferences")
    audit_logs = relationship("NotificationPreferenceAudit", back_populates="preferences", cascade="all, delete-orphan")
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if not self.unsubscribe_token:
            self.unsubscribe_token = self.generate_unsubscribe_token()
    
    def generate_unsubscribe_token(self) -> str:
        """Generate a unique unsubscribe token"""
        random_string = secrets.token_urlsafe(32)
        # Create a hash that includes user_id for added security
        token_data = f"{self.user_id}:{random_string}:{utcnow().isoformat()}"
        return hashlib.sha256(token_data.encode()).hexdigest()[:64]
    
    def should_send_notification(self, notification_type: str, channel: str = "email") -> bool:
        """
        Check if a notification should be sent based on user preferences
        
        Args:
            notification_type: Type of notification (e.g., 'appointment_confirmation')
            channel: Notification channel ('email' or 'sms')
        
        Returns:
            bool: True if notification should be sent
        """
        # Check if channel is enabled
        if channel == "email" and not self.email_enabled:
            return False
        elif channel == "sms" and not self.sms_enabled:
            return False
        
        # Check frequency settings
        frequency_attr = f"{channel}_frequency"
        frequency = getattr(self, frequency_attr, "immediate")
        if frequency == "never":
            return False
        
        # Check specific notification type preferences
        pref_attr = f"{channel}_{notification_type}"
        if hasattr(self, pref_attr):
            return getattr(self, pref_attr, False)
        
        # Default to True for unknown notification types if channel is enabled
        return True
    
    def get_reminder_hours(self) -> list:
        """Get reminder hours as a list, with fallback to default"""
        if self.reminder_hours and isinstance(self.reminder_hours, list):
            return self.reminder_hours
        return [24, 2]  # Default fallback
    
    def is_quiet_time(self, check_time: datetime = None) -> bool:
        """
        Check if the given time falls within user's quiet hours
        
        Args:
            check_time: Time to check (defaults to current time in user's timezone)
        
        Returns:
            bool: True if it's quiet time
        """
        if not self.quiet_hours_enabled:
            return False
        
        if not check_time:
            check_time = datetime.now()
        
        # Parse quiet hours
        start_hour, start_min = map(int, self.quiet_hours_start.split(':'))
        end_hour, end_min = map(int, self.quiet_hours_end.split(':'))
        
        current_time = check_time.time()
        start_time = datetime.min.time().replace(hour=start_hour, minute=start_min)
        end_time = datetime.min.time().replace(hour=end_hour, minute=end_min)
        
        # Handle overnight quiet hours (e.g., 22:00 to 08:00)
        if start_time > end_time:
            return current_time >= start_time or current_time <= end_time
        else:
            return start_time <= current_time <= end_time
    
    def to_dict(self) -> dict:
        """Convert preferences to dictionary for API responses"""
        return {
            "user_id": self.user_id,
            "email_enabled": self.email_enabled,
            "sms_enabled": self.sms_enabled,
            "timezone": self.timezone,
            "email_preferences": {
                "appointment_confirmation": self.email_appointment_confirmation,
                "appointment_reminder": self.email_appointment_reminder,
                "appointment_changes": self.email_appointment_changes,
                "appointment_cancellation": self.email_appointment_cancellation,
                "payment_confirmation": self.email_payment_confirmation,
                "payment_failed": self.email_payment_failed,
                "marketing": self.email_marketing,
                "news_updates": self.email_news_updates,
                "promotional": self.email_promotional,
                "system_alerts": self.email_system_alerts,
                "frequency": self.email_frequency
            },
            "sms_preferences": {
                "appointment_confirmation": self.sms_appointment_confirmation,
                "appointment_reminder": self.sms_appointment_reminder,
                "appointment_changes": self.sms_appointment_changes,
                "appointment_cancellation": self.sms_appointment_cancellation,
                "payment_confirmation": self.sms_payment_confirmation,
                "payment_failed": self.sms_payment_failed,
                "marketing": self.sms_marketing,
                "promotional": self.sms_promotional,
                "system_alerts": self.sms_system_alerts,
                "frequency": self.sms_frequency
            },
            "advanced_settings": {
                "reminder_hours": self.get_reminder_hours(),
                "quiet_hours_enabled": self.quiet_hours_enabled,
                "quiet_hours_start": self.quiet_hours_start,
                "quiet_hours_end": self.quiet_hours_end,
                "weekend_notifications": self.weekend_notifications
            },
            "compliance": {
                "consent_given_at": self.consent_given_at.isoformat() if self.consent_given_at else None,
                "data_processing_consent": self.data_processing_consent,
                "marketing_consent": self.marketing_consent,
                "last_updated_at": self.last_updated_at.isoformat() if self.last_updated_at else None
            }
        }


class NotificationPreferenceAudit(Base):
    """Audit log for notification preference changes (GDPR compliance)"""
    __tablename__ = "notification_preference_audit"
    
    id = Column(Integer, primary_key=True, index=True)
    preferences_id = Column(Integer, ForeignKey("notification_preferences_v2.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Change tracking
    field_changed = Column(String(100), nullable=False)
    old_value = Column(Text, nullable=True)
    new_value = Column(Text, nullable=True)
    change_reason = Column(String(200), nullable=True)  # user_update, admin_update, system_update
    
    # Metadata
    changed_at = Column(DateTime, default=utcnow)
    changed_by_ip = Column(String(45), nullable=True)
    user_agent = Column(String(500), nullable=True)
    
    # Relationships
    preferences = relationship("NotificationPreferences", back_populates="audit_logs")
    user = relationship("User", backref="notification_preference_audits")


class UnsubscribeRequest(Base):
    """Track unsubscribe requests for compliance"""
    __tablename__ = "unsubscribe_requests"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # May be null for non-users
    email_address = Column(String(255), nullable=False, index=True)
    phone_number = Column(String(20), nullable=True, index=True)
    
    # Unsubscribe details
    unsubscribe_type = Column(String(50), nullable=False)  # email_all, sms_all, marketing_only, etc.
    token_used = Column(String(64), nullable=True)  # The token used for unsubscribe
    method = Column(String(20), nullable=False)  # one_click, preference_center, api, manual
    
    # Context
    campaign_id = Column(String(100), nullable=True)  # If unsubscribed from specific campaign
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(500), nullable=True)
    
    # Status
    status = Column(String(20), default="active")  # active, reverted
    processed_at = Column(DateTime, default=utcnow)
    reverted_at = Column(DateTime, nullable=True)
    
    # Metadata
    created_at = Column(DateTime, default=utcnow)
    
    # Relationships
    user = relationship("User", backref="unsubscribe_requests")


class NotificationChannel(Base):
    """Define available notification channels and their settings"""
    __tablename__ = "notification_channels"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False)  # email, sms, push, webhook
    display_name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    
    # Channel settings
    is_active = Column(Boolean, default=True)
    requires_consent = Column(Boolean, default=False)
    supports_marketing = Column(Boolean, default=True)
    supports_transactional = Column(Boolean, default=True)
    
    # Rate limiting
    rate_limit_per_hour = Column(Integer, nullable=True)
    rate_limit_per_day = Column(Integer, nullable=True)
    
    # Configuration
    configuration = Column(JSON, nullable=True)  # Channel-specific config
    
    # Metadata
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)


class NotificationTemplate(Base):
    """Enhanced notification templates with better organization"""
    __tablename__ = "notification_templates_v2"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    display_name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    
    # Template type and category
    template_type = Column(String(20), nullable=False)  # email, sms, push
    category = Column(String(50), nullable=False)       # transactional, marketing, system
    
    # Content
    subject = Column(String(200), nullable=True)  # For email templates
    body_text = Column(Text, nullable=False)      # Plain text version
    body_html = Column(Text, nullable=True)       # HTML version (for email)
    
    # Template variables and validation
    variables = Column(JSON, default=list)        # Available variables
    required_variables = Column(JSON, default=list)  # Required variables
    sample_data = Column(JSON, default=dict)      # Sample data for preview
    
    # Localization
    language = Column(String(10), default="en")   # Language code
    fallback_template_id = Column(Integer, ForeignKey("notification_templates_v2.id"), nullable=True)
    
    # Settings
    is_active = Column(Boolean, default=True)
    is_system_template = Column(Boolean, default=False)  # Can't be deleted by users
    requires_approval = Column(Boolean, default=False)   # For custom templates
    
    # Usage tracking
    usage_count = Column(Integer, default=0)
    last_used_at = Column(DateTime, nullable=True)
    
    # Metadata
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Relationships
    created_by = relationship("User", backref="created_notification_templates")
    fallback_template = relationship("NotificationTemplate", remote_side=[id])
    
    # Indexes for performance
    __table_args__ = (
        Index('idx_template_type_category', 'template_type', 'category'),
        Index('idx_template_active_name', 'is_active', 'name'),
    )