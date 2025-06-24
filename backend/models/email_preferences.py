"""
Email Preferences Database Model
Stores client email preferences, subscription status, and segmentation data
"""

from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    DateTime,
    JSON,
    Text,
    ForeignKey,
)
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

from .base import Base


class EmailPreferences(Base):
    """Email preferences for clients"""

    __tablename__ = "email_preferences"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), unique=True, nullable=False)
    email_address = Column(String(255), nullable=False, index=True)

    # Subscription status
    is_subscribed = Column(Boolean, default=True, nullable=False)
    subscription_source = Column(
        String(100), default="signup"
    )  # signup, import, manual
    subscription_date = Column(DateTime, default=datetime.utcnow)
    unsubscribed_date = Column(DateTime, nullable=True)
    unsubscribe_reason = Column(String(255), nullable=True)

    # Frequency preferences
    frequency_preference = Column(
        String(50), default="weekly"
    )  # daily, weekly, monthly, special_only
    max_emails_per_week = Column(Integer, default=3)

    # Campaign preferences
    campaign_preferences = Column(
        JSON, default=dict
    )  # {"welcome": True, "promotional": False, etc.}

    # Segmentation data
    segment_tags = Column(
        JSON, default=list
    )  # ["vip", "new_customer", "high_value", etc.]
    client_tier = Column(String(50), default="standard")  # standard, premium, vip
    preferred_time = Column(
        String(20), default="morning"
    )  # morning, afternoon, evening
    timezone = Column(String(50), default="UTC")

    # Tokens and security
    unsubscribe_token = Column(String(64), unique=True, nullable=False, index=True)
    preferences_token = Column(String(64), unique=True, nullable=False, index=True)

    # Tracking
    last_email_sent = Column(DateTime, nullable=True)
    total_emails_sent = Column(Integer, default=0)
    total_emails_opened = Column(Integer, default=0)
    total_emails_clicked = Column(Integer, default=0)

    # Bounces and complaints
    bounce_count = Column(Integer, default=0)
    complaint_count = Column(Integer, default=0)
    last_bounce_date = Column(DateTime, nullable=True)
    last_complaint_date = Column(DateTime, nullable=True)

    # Notes and custom data
    notes = Column(Text, nullable=True)
    custom_fields = Column(JSON, default=dict)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # Relationships
    client = relationship("Client", back_populates="email_preferences")


class EmailDeliveryLog(Base):
    """Log of email deliveries and interactions"""

    __tablename__ = "email_delivery_log"

    id = Column(Integer, primary_key=True, index=True)

    # Email details
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    email_address = Column(String(255), nullable=False)
    campaign_id = Column(String(100), nullable=True, index=True)
    template_id = Column(String(100), nullable=False, index=True)

    # Delivery status
    status = Column(
        String(50), default="pending"
    )  # pending, sent, delivered, opened, clicked, bounced, failed
    delivery_id = Column(String(100), unique=True, nullable=False, index=True)
    external_message_id = Column(String(255), nullable=True)  # SendGrid message ID

    # Content
    subject_line = Column(String(255), nullable=False)
    personalization_data = Column(JSON, default=dict)

    # Timestamps
    sent_at = Column(DateTime, nullable=True)
    delivered_at = Column(DateTime, nullable=True)
    opened_at = Column(DateTime, nullable=True)
    first_clicked_at = Column(DateTime, nullable=True)
    last_clicked_at = Column(DateTime, nullable=True)
    bounced_at = Column(DateTime, nullable=True)
    complained_at = Column(DateTime, nullable=True)
    unsubscribed_at = Column(DateTime, nullable=True)

    # Interaction tracking
    open_count = Column(Integer, default=0)
    click_count = Column(Integer, default=0)
    links_clicked = Column(JSON, default=list)  # List of clicked links

    # Error details
    error_message = Column(Text, nullable=True)
    bounce_type = Column(String(50), nullable=True)  # hard, soft, complaint
    bounce_reason = Column(String(255), nullable=True)

    # Tracking data
    user_agent = Column(String(500), nullable=True)
    ip_address = Column(String(45), nullable=True)
    location_data = Column(JSON, default=dict)  # Country, city, etc.

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # Relationships
    client = relationship("Client")


class EmailCampaignModel(Base):
    """Database model for email campaigns"""

    __tablename__ = "email_campaigns"

    id = Column(String(100), primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)

    # Campaign details
    campaign_type = Column(String(50), nullable=False, index=True)
    template_id = Column(String(100), nullable=False)
    status = Column(String(50), default="draft", index=True)

    # Configuration
    target_audience = Column(JSON, default=dict)
    scheduling = Column(JSON, default=dict)
    automation_triggers = Column(JSON, default=list)
    personalization_rules = Column(JSON, default=dict)
    analytics_tracking = Column(JSON, default=dict)

    # Performance metrics
    send_count = Column(Integer, default=0)
    delivered_count = Column(Integer, default=0)
    open_count = Column(Integer, default=0)
    click_count = Column(Integer, default=0)
    bounce_count = Column(Integer, default=0)
    complaint_count = Column(Integer, default=0)
    unsubscribe_count = Column(Integer, default=0)

    # Calculated rates (updated by background job)
    open_rate = Column(Integer, default=0)  # Stored as percentage * 100
    click_rate = Column(Integer, default=0)
    bounce_rate = Column(Integer, default=0)
    unsubscribe_rate = Column(Integer, default=0)

    # Execution tracking
    last_sent = Column(DateTime, nullable=True)
    next_scheduled = Column(DateTime, nullable=True)
    total_executions = Column(Integer, default=0)

    # Ownership and metadata
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # Relationships
    creator = relationship("User")


class EmailTemplateModel(Base):
    """Database model for email templates"""

    __tablename__ = "email_templates"

    id = Column(String(100), primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)

    # Template content
    subject = Column(String(255), nullable=False)
    html_content_path = Column(
        String(500), nullable=False
    )  # Path to HTML template file
    text_content_path = Column(String(500), nullable=True)  # Path to text template file

    # Template metadata
    campaign_type = Column(String(50), nullable=False, index=True)
    personalization_fields = Column(JSON, default=list)
    required_fields = Column(JSON, default=list)

    # Template settings
    is_active = Column(Boolean, default=True)
    is_system_template = Column(Boolean, default=False)  # Cannot be deleted
    version = Column(String(20), default="1.0")

    # Usage tracking
    usage_count = Column(Integer, default=0)
    last_used = Column(DateTime, nullable=True)

    # Performance tracking
    average_open_rate = Column(Integer, default=0)  # Stored as percentage * 100
    average_click_rate = Column(Integer, default=0)

    # Ownership and metadata
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # Relationships
    creator = relationship("User")


class EmailSegment(Base):
    """Email segmentation for targeted campaigns"""

    __tablename__ = "email_segments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)

    # Segment criteria
    criteria = Column(JSON, nullable=False)  # Complex filtering criteria

    # Segment metadata
    is_dynamic = Column(Boolean, default=True)  # Automatically updated
    client_count = Column(Integer, default=0)

    # Performance tracking
    average_open_rate = Column(Integer, default=0)
    average_click_rate = Column(Integer, default=0)

    # Ownership
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # Relationships
    creator = relationship("User")


class EmailSuppressionList(Base):
    """Email addresses that should not receive emails"""

    __tablename__ = "email_suppression_list"

    id = Column(Integer, primary_key=True, index=True)
    email_address = Column(String(255), unique=True, nullable=False, index=True)

    # Suppression details
    suppression_type = Column(
        String(50), nullable=False
    )  # unsubscribe, bounce, complaint, manual
    reason = Column(String(255), nullable=True)
    source_campaign_id = Column(String(100), nullable=True)

    # Bounce details (if applicable)
    bounce_type = Column(String(50), nullable=True)  # hard, soft
    bounce_subtype = Column(String(100), nullable=True)

    # Metadata
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=True)
    suppressed_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    client = relationship("Client")
    suppressed_by_user = relationship("User")
