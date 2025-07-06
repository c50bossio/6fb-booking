"""
Google Calendar Settings Model for BookedBarber V2
Stores user preferences and settings for Google Calendar integration
Migrated from V1 with V2 architecture adaptations
"""

from sqlalchemy import Column, String, Boolean, Integer, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import sys
import os

# Add parent directory to path to resolve imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import Base


def utcnow():
    """Helper function for UTC datetime (replaces deprecated utcnow())"""
    return datetime.now(timezone.utc).replace(tzinfo=None)


class GoogleCalendarSettings(Base):
    """
    Google Calendar integration settings for barbers in V2 system
    Migrated from V1 with V2 architecture adaptations
    """

    __tablename__ = "google_calendar_settings"

    id = Column(Integer, primary_key=True, index=True)
    
    # Foreign key to users table (V2 uses users instead of barbers)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True, index=True)
    user = relationship("User", back_populates="google_calendar_settings")

    # Connection status
    is_connected = Column(Boolean, default=False, index=True)
    connection_date = Column(DateTime, nullable=True)
    last_sync_date = Column(DateTime, nullable=True)

    # OAuth information
    google_email = Column(String(255), nullable=True)  # The connected Google account email
    calendar_id = Column(String(255), default="primary")  # Which calendar to sync to

    # Sync preferences
    auto_sync_enabled = Column(Boolean, default=True)
    sync_on_create = Column(Boolean, default=True)
    sync_on_update = Column(Boolean, default=True)
    sync_on_delete = Column(Boolean, default=True)

    # What to sync
    sync_all_appointments = Column(Boolean, default=True)
    sync_only_confirmed = Column(Boolean, default=False)
    sync_only_paid = Column(Boolean, default=False)

    # Event customization
    include_client_email = Column(Boolean, default=True)
    include_client_phone = Column(Boolean, default=True)
    include_service_price = Column(Boolean, default=False)
    include_notes = Column(Boolean, default=True)

    # Notification settings
    enable_reminders = Column(Boolean, default=True)
    reminder_email_minutes = Column(Integer, default=1440)  # 24 hours
    reminder_popup_minutes = Column(Integer, default=15)

    # Privacy settings
    event_visibility = Column(String(20), default="private")  # private, public, default
    show_client_name = Column(Boolean, default=True)
    show_service_details = Column(Boolean, default=True)

    # Timezone preference
    timezone = Column(String(50), default="America/New_York")

    # Error tracking
    last_error = Column(Text, nullable=True)
    error_count = Column(Integer, default=0)

    # Audit fields
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    def __repr__(self):
        return f"<GoogleCalendarSettings(user_id={self.user_id}, connected={self.is_connected})>"


class GoogleCalendarSyncLog(Base):
    """
    Log of Google Calendar sync operations for tracking and debugging
    Migrated from V1 with V2 architecture adaptations
    """

    __tablename__ = "google_calendar_sync_logs"

    id = Column(Integer, primary_key=True, index=True)

    # Foreign keys
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    appointment_id = Column(Integer, ForeignKey("appointments.id"), nullable=True, index=True)

    # Sync details
    operation = Column(String(20), nullable=False, index=True)  # create, update, delete, import
    direction = Column(
        String(20), nullable=False, index=True
    )  # to_google, from_google, bidirectional
    status = Column(String(20), nullable=False, index=True)  # success, failed, partial

    # Google Calendar details
    google_event_id = Column(String(255), nullable=True, index=True)
    google_calendar_id = Column(String(255), nullable=True)

    # Error information
    error_message = Column(Text, nullable=True)
    retry_count = Column(Integer, default=0)

    # Metadata
    sync_data = Column(Text, nullable=True)  # JSON string of synced data
    response_data = Column(Text, nullable=True)  # JSON string of API response

    # Audit fields
    created_at = Column(DateTime, default=utcnow, index=True)

    # Relationships
    user = relationship("User")
    appointment = relationship("Appointment")

    def __repr__(self):
        return f"<GoogleCalendarSyncLog(user_id={self.user_id}, operation={self.operation}, status={self.status})>"