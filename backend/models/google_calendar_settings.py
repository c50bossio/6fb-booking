"""
Google Calendar Settings Model
Stores user preferences and settings for Google Calendar integration
"""

from sqlalchemy import Column, String, Boolean, Integer, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from .base import BaseModel


class GoogleCalendarSettings(BaseModel):
    """
    Google Calendar integration settings for barbers
    """

    __tablename__ = "google_calendar_settings"

    # Foreign key to barber
    barber_id = Column(Integer, ForeignKey("barbers.id"), nullable=False, unique=True)
    barber = relationship("Barber", back_populates="google_calendar_settings")

    # Connection status
    is_connected = Column(Boolean, default=False)
    connection_date = Column(DateTime)
    last_sync_date = Column(DateTime)

    # OAuth information
    google_email = Column(String(255))  # The connected Google account email
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
    last_error = Column(Text)
    error_count = Column(Integer, default=0)

    def __repr__(self):
        return f"<GoogleCalendarSettings(barber_id={self.barber_id}, connected={self.is_connected})>"


class GoogleCalendarSyncLog(BaseModel):
    """
    Log of Google Calendar sync operations for tracking and debugging
    """

    __tablename__ = "google_calendar_sync_logs"

    # Foreign keys
    barber_id = Column(Integer, ForeignKey("barbers.id"), nullable=False)
    appointment_id = Column(Integer, ForeignKey("appointments.id"), nullable=True)

    # Sync details
    operation = Column(String(20), nullable=False)  # create, update, delete, import
    direction = Column(String(20), nullable=False)  # to_google, from_google, bidirectional
    status = Column(String(20), nullable=False)  # success, failed, partial
    
    # Google Calendar details
    google_event_id = Column(String(255))
    google_calendar_id = Column(String(255))

    # Error information
    error_message = Column(Text)
    retry_count = Column(Integer, default=0)

    # Metadata
    sync_data = Column(Text)  # JSON string of synced data
    response_data = Column(Text)  # JSON string of API response

    # Relationships
    barber = relationship("Barber")
    appointment = relationship("Appointment")

    def __repr__(self):
        return f"<GoogleCalendarSyncLog(barber_id={self.barber_id}, operation={self.operation}, status={self.status})>"