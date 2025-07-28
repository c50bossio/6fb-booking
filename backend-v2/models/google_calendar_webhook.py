"""
Google Calendar Webhook Models for BookedBarber V2
Handles webhook subscriptions, notifications, and sync tracking for real-time integration
"""

from sqlalchemy import Column, String, Boolean, Integer, ForeignKey, DateTime, Text, BigInteger
from sqlalchemy.orm import relationship
from datetime import datetime, timezone, timedelta
import sys
import os

# Add parent directory to path to resolve imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db import Base


def utcnow():
    """Helper function for UTC datetime (replaces deprecated utcnow())"""
    return datetime.now(timezone.utc).replace(tzinfo=None)


class GoogleCalendarWebhookSubscription(Base):
    """
    Tracks Google Calendar webhook subscriptions for real-time notifications
    Each user can have multiple subscriptions for different calendars
    """

    __tablename__ = "google_calendar_webhook_subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    
    # Foreign key to users table
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    user = relationship("User", back_populates="calendar_webhook_subscriptions")
    
    # Google Calendar subscription details
    google_subscription_id = Column(String(255), nullable=False, unique=True, index=True)
    google_calendar_id = Column(String(255), nullable=False, index=True)  # Which calendar is being watched
    google_resource_id = Column(String(255), nullable=False)  # Google's resource ID for this subscription
    
    # Webhook configuration
    webhook_url = Column(String(500), nullable=False)  # Our webhook endpoint URL
    webhook_token = Column(String(255), nullable=True)  # Optional token for additional security
    
    # Subscription lifecycle
    expiration_time = Column(DateTime, nullable=False, index=True)  # When subscription expires
    created_at = Column(DateTime, default=utcnow, nullable=False)
    last_renewed_at = Column(DateTime, default=utcnow)
    
    # Status tracking
    is_active = Column(Boolean, default=True, index=True)
    last_notification_received = Column(DateTime, nullable=True)
    notification_count = Column(Integer, default=0)
    
    # Error tracking
    error_count = Column(Integer, default=0)
    last_error = Column(Text, nullable=True)
    last_error_at = Column(DateTime, nullable=True)
    
    # Sync tracking
    sync_token = Column(String(255), nullable=True)  # For incremental sync
    last_sync_at = Column(DateTime, nullable=True)
    
    def __repr__(self):
        return f"<GoogleCalendarWebhookSubscription(user_id={self.user_id}, calendar_id={self.google_calendar_id}, active={self.is_active})>"
    
    @property
    def is_expired(self):
        """Check if subscription has expired"""
        return self.expiration_time < utcnow()
    
    @property
    def expires_soon(self):
        """Check if subscription expires within 24 hours"""
        return self.expiration_time < utcnow() + timedelta(hours=24)


class GoogleCalendarWebhookNotification(Base):
    """
    Tracks individual webhook notifications received from Google Calendar
    Used for debugging, replay, and ensuring idempotency
    """

    __tablename__ = "google_calendar_webhook_notifications"

    id = Column(Integer, primary_key=True, index=True)
    
    # Foreign key to subscription
    subscription_id = Column(Integer, ForeignKey("google_calendar_webhook_subscriptions.id"), nullable=False, index=True)
    subscription = relationship("GoogleCalendarWebhookSubscription")
    
    # Google notification details
    google_channel_id = Column(String(255), nullable=False, index=True)
    google_resource_id = Column(String(255), nullable=False, index=True)
    google_resource_uri = Column(String(500), nullable=True)
    google_resource_state = Column(String(50), nullable=True)  # exists, not_exists, sync
    
    # Message details
    message_number = Column(BigInteger, nullable=True, index=True)  # Google's message sequence number
    expiration_time = Column(DateTime, nullable=True)
    
    # Processing status
    received_at = Column(DateTime, default=utcnow, nullable=False, index=True)
    processed_at = Column(DateTime, nullable=True)
    status = Column(String(20), default="pending", nullable=False, index=True)  # pending, processing, processed, failed
    
    # Sync results
    sync_triggered = Column(Boolean, default=False)
    events_processed = Column(Integer, default=0)
    events_created = Column(Integer, default=0)
    events_updated = Column(Integer, default=0)
    events_deleted = Column(Integer, default=0)
    
    # Error tracking
    error_message = Column(Text, nullable=True)
    retry_count = Column(Integer, default=0)
    
    # Raw data for debugging
    raw_headers = Column(Text, nullable=True)  # JSON string of HTTP headers
    raw_body = Column(Text, nullable=True)  # Raw request body
    
    def __repr__(self):
        return f"<GoogleCalendarWebhookNotification(id={self.id}, channel_id={self.google_channel_id}, status={self.status})>"


class GoogleCalendarSyncEvent(Base):
    """
    Tracks individual calendar event synchronization operations
    Provides detailed audit trail for webhook-triggered syncs
    """

    __tablename__ = "google_calendar_sync_events"

    id = Column(Integer, primary_key=True, index=True)
    
    # Foreign keys
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    notification_id = Column(Integer, ForeignKey("google_calendar_webhook_notifications.id"), nullable=True, index=True)
    appointment_id = Column(Integer, ForeignKey("appointments.id"), nullable=True, index=True)
    
    # Event details
    google_event_id = Column(String(255), nullable=False, index=True)
    google_calendar_id = Column(String(255), nullable=False)
    
    # Sync operation
    operation_type = Column(String(20), nullable=False, index=True)  # create, update, delete, import
    sync_direction = Column(String(20), nullable=False, index=True)  # from_google, to_google, bidirectional
    
    # Event data
    event_summary = Column(String(500), nullable=True)
    event_start_time = Column(DateTime, nullable=True)
    event_end_time = Column(DateTime, nullable=True)
    event_status = Column(String(50), nullable=True)  # confirmed, tentative, cancelled
    
    # Sync results
    sync_status = Column(String(20), nullable=False, index=True)  # success, failed, skipped, conflict
    conflict_resolution = Column(String(50), nullable=True)  # google_wins, local_wins, merged, manual_required
    
    # Timestamps
    detected_at = Column(DateTime, default=utcnow, nullable=False)
    processed_at = Column(DateTime, nullable=True)
    
    # Error details
    error_message = Column(Text, nullable=True)
    
    # Change tracking
    changes_detected = Column(Text, nullable=True)  # JSON string of detected changes
    applied_changes = Column(Text, nullable=True)  # JSON string of changes applied
    
    # Relationships
    user = relationship("User")
    notification = relationship("GoogleCalendarWebhookNotification")
    appointment = relationship("Appointment")
    
    def __repr__(self):
        return f"<GoogleCalendarSyncEvent(id={self.id}, operation={self.operation_type}, status={self.sync_status})>"


class GoogleCalendarConflictResolution(Base):
    """
    Tracks conflict resolution for overlapping changes between Google Calendar and BookedBarber
    Helps maintain data integrity and provides audit trail for manual review
    """

    __tablename__ = "google_calendar_conflict_resolutions"

    id = Column(Integer, primary_key=True, index=True)
    
    # Foreign keys
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    sync_event_id = Column(Integer, ForeignKey("google_calendar_sync_events.id"), nullable=False, index=True)
    appointment_id = Column(Integer, ForeignKey("appointments.id"), nullable=True, index=True)
    
    # Conflict details
    conflict_type = Column(String(50), nullable=False, index=True)  # time_overlap, data_mismatch, deletion_conflict
    google_event_id = Column(String(255), nullable=False)
    
    # Conflicting data
    google_data = Column(Text, nullable=True)  # JSON string of Google Calendar data
    local_data = Column(Text, nullable=True)  # JSON string of BookedBarber data
    
    # Resolution details
    resolution_strategy = Column(String(50), nullable=False)  # auto_google, auto_local, manual, skip
    resolution_reason = Column(Text, nullable=True)
    resolved_by = Column(String(50), nullable=True)  # system, user_id, or admin
    
    # Timestamps
    detected_at = Column(DateTime, default=utcnow, nullable=False)
    resolved_at = Column(DateTime, nullable=True)
    
    # Status
    status = Column(String(20), default="pending", nullable=False, index=True)  # pending, resolved, escalated
    requires_manual_review = Column(Boolean, default=False, index=True)
    
    # Resolution data
    final_data = Column(Text, nullable=True)  # JSON string of final resolved data
    notes = Column(Text, nullable=True)
    
    # Relationships
    user = relationship("User")
    sync_event = relationship("GoogleCalendarSyncEvent")
    appointment = relationship("Appointment")
    
    def __repr__(self):
        return f"<GoogleCalendarConflictResolution(id={self.id}, type={self.conflict_type}, status={self.status})>"