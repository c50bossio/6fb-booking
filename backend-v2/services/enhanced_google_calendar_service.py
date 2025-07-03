"""
Enhanced Google Calendar Service with comprehensive timezone support.
Replaces the existing Google Calendar service with proper timezone handling.
"""

import json
import logging
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any, Tuple
from dataclasses import dataclass

from google.auth.transport import requests as google_requests
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from sqlalchemy.orm import Session
import pytz

from models import User, Appointment
from config import settings
from services.timezone_service import timezone_service
from utils.auth import get_password_hash

logger = logging.getLogger(__name__)


@dataclass
class CalendarEvent:
    """Data class for calendar events with timezone support."""
    id: Optional[str]
    summary: str
    description: Optional[str]
    start_time: datetime
    end_time: datetime
    timezone: str
    location: Optional[str] = None
    attendees: Optional[List[str]] = None
    google_event_id: Optional[str] = None
    user_timezone: Optional[str] = None  # Original user timezone
    business_timezone: Optional[str] = None  # Business timezone


@dataclass
class FreeBusyResponse:
    """Data class for free/busy query responses with timezone info."""
    start_time: datetime
    end_time: datetime
    timezone: str
    busy_periods: List[Tuple[datetime, datetime]]


class EnhancedGoogleCalendarService:
    """Enhanced Google Calendar integration with comprehensive timezone support."""
    
    def __init__(self):
        self.scopes = [
            'https://www.googleapis.com/auth/calendar',
            'https://www.googleapis.com/auth/calendar.events'
        ]
        self.client_id = getattr(settings, 'GOOGLE_CLIENT_ID', None)
        self.client_secret = getattr(settings, 'GOOGLE_CLIENT_SECRET', None)
        self.redirect_uri = getattr(settings, 'GOOGLE_REDIRECT_URI', 'http://localhost:8000/api/v1/auth/google/callback')
    
    def build_service(self, credentials: Credentials):
        """Build Google Calendar service with credentials."""
        try:
            return build('calendar', 'v3', credentials=credentials)
        except Exception as e:
            logger.error(f"Failed to build Google Calendar service: {e}")
            raise
    
    def get_user_credentials(self, user: User) -> Optional[Credentials]:
        """Get stored credentials for a user."""
        if not user.google_calendar_credentials:
            return None
        
        try:
            creds_info = json.loads(user.google_calendar_credentials)
            credentials = Credentials.from_authorized_user_info(creds_info)
            
            # Refresh credentials if needed
            if credentials.expired and credentials.refresh_token:
                credentials.refresh(google_requests.Request())
                # Update stored credentials
                user.google_calendar_credentials = credentials.to_json()
            
            return credentials
        except Exception as e:
            logger.error(f"Failed to get user credentials for user {user.id}: {e}")
            return None
    
    def create_event_from_appointment(
        self, 
        db: Session,
        appointment: Appointment, 
        user: User,
        include_timezone_info: bool = True
    ) -> Optional[CalendarEvent]:
        """Create a calendar event from an appointment with timezone handling."""
        
        try:
            # Get user's timezone
            user_timezone = timezone_service.get_user_timezone(user)
            
            # Get business timezone
            business_timezone = timezone_service.get_business_timezone(db, appointment.location_id)
            
            # Convert appointment time from UTC to user timezone for display
            if appointment.start_time.tzinfo is None:
                start_time_utc = pytz.UTC.localize(appointment.start_time)
            else:
                start_time_utc = appointment.start_time
            
            start_time_user = timezone_service.convert_from_utc(
                dt=start_time_utc,
                to_tz=user_timezone,
                log_conversion=True,
                db=db,
                user_id=user.id,
                appointment_id=appointment.id,
                conversion_type='calendar_sync'
            )
            
            end_time_user = start_time_user + timedelta(minutes=appointment.duration_minutes)
            
            # Create event summary with timezone info if requested
            summary = f"{appointment.service_name}"
            if appointment.client:
                summary += f" - {appointment.client.first_name} {appointment.client.last_name}"
            
            # Create enhanced description with timezone information
            description_parts = []
            
            if appointment.notes:
                description_parts.append(f"Notes: {appointment.notes}")
            
            if include_timezone_info:
                description_parts.extend([
                    f"",
                    f"Timezone Information:",
                    f"• Your time: {start_time_user.strftime('%I:%M %p %Z')}",
                    f"• Business time: {timezone_service.convert_from_utc(start_time_utc, business_timezone).strftime('%I:%M %p %Z')}",
                    f"• Duration: {appointment.duration_minutes} minutes",
                    f"• Status: {appointment.status}"
                ])
            
            if appointment.price:
                description_parts.append(f"• Price: ${appointment.price}")
            
            description = "\n".join(description_parts) if description_parts else None
            
            # Get location information
            location_name = None
            if appointment.location_id:
                try:
                    from models import BarbershopLocation
                    location = db.query(BarbershopLocation).filter(
                        BarbershopLocation.id == appointment.location_id
                    ).first()
                    if location:
                        location_name = f"{location.name}, {location.address}" if hasattr(location, 'address') else location.name
                except Exception as e:
                    logger.warning(f"Could not get location info for appointment {appointment.id}: {e}")
            
            return CalendarEvent(
                id=str(appointment.id),
                summary=summary,
                description=description,
                start_time=start_time_user,
                end_time=end_time_user,
                timezone=user_timezone,
                location=location_name,
                google_event_id=appointment.google_event_id,
                user_timezone=user_timezone,
                business_timezone=business_timezone
            )
            
        except Exception as e:
            logger.error(f"Failed to create calendar event from appointment {appointment.id}: {e}")
            return None
    
    def sync_appointment_to_google(
        self, 
        db: Session,
        appointment: Appointment, 
        user: User,
        operation: str = 'create'
    ) -> bool:
        """Sync an appointment to Google Calendar with timezone support.
        
        Args:
            db: Database session
            appointment: Appointment to sync
            user: User whose calendar to sync to
            operation: 'create', 'update', or 'delete'
        """
        
        try:
            credentials = self.get_user_credentials(user)
            if not credentials:
                logger.warning(f"No Google Calendar credentials for user {user.id}")
                return False
            
            service = self.build_service(credentials)
            calendar_id = user.google_calendar_id or 'primary'
            
            if operation == 'delete':
                return self._delete_google_event(service, calendar_id, appointment.google_event_id)
            
            # Create calendar event
            event_data = self.create_event_from_appointment(db, appointment, user)
            if not event_data:
                logger.error(f"Failed to create event data for appointment {appointment.id}")
                return False
            
            # Convert to Google Calendar format with proper timezone
            google_event = self._convert_to_google_event(event_data)
            
            if operation == 'create':
                response = service.events().insert(calendarId=calendar_id, body=google_event).execute()
                appointment.google_event_id = response.get('id')
                db.commit()
                logger.info(f"Created Google Calendar event {response.get('id')} for appointment {appointment.id}")
                
            elif operation == 'update' and appointment.google_event_id:
                response = service.events().update(
                    calendarId=calendar_id,
                    eventId=appointment.google_event_id,
                    body=google_event
                ).execute()
                logger.info(f"Updated Google Calendar event {appointment.google_event_id} for appointment {appointment.id}")
            
            return True
            
        except HttpError as e:
            logger.error(f"Google Calendar API error for appointment {appointment.id}: {e}")
            return False
        except Exception as e:
            logger.error(f"Failed to sync appointment {appointment.id} to Google Calendar: {e}")
            return False
    
    def _convert_to_google_event(self, event_data: CalendarEvent) -> Dict[str, Any]:
        """Convert CalendarEvent to Google Calendar API format with timezone."""
        
        # Format datetime for Google Calendar API (RFC3339 with timezone)
        start_time_str = event_data.start_time.isoformat()
        end_time_str = event_data.end_time.isoformat()
        
        google_event = {
            'summary': event_data.summary,
            'start': {
                'dateTime': start_time_str,
                'timeZone': event_data.timezone,
            },
            'end': {
                'dateTime': end_time_str,
                'timeZone': event_data.timezone,
            },
        }
        
        if event_data.description:
            google_event['description'] = event_data.description
        
        if event_data.location:
            google_event['location'] = event_data.location
        
        if event_data.attendees:
            google_event['attendees'] = [{'email': email} for email in event_data.attendees]
        
        return google_event
    
    def _delete_google_event(self, service, calendar_id: str, event_id: Optional[str]) -> bool:
        """Delete an event from Google Calendar."""
        if not event_id:
            return True  # Nothing to delete
        
        try:
            service.events().delete(calendarId=calendar_id, eventId=event_id).execute()
            logger.info(f"Deleted Google Calendar event {event_id}")
            return True
        except HttpError as e:
            if e.resp.status == 404:
                logger.info(f"Google Calendar event {event_id} already deleted")
                return True
            logger.error(f"Failed to delete Google Calendar event {event_id}: {e}")
            return False
        except Exception as e:
            logger.error(f"Failed to delete Google Calendar event {event_id}: {e}")
            return False
    
    def get_free_busy(
        self, 
        user: User, 
        start_time: datetime, 
        end_time: datetime,
        timezone_str: str
    ) -> Optional[FreeBusyResponse]:
        """Get free/busy information for a user's calendar with timezone support."""
        
        try:
            credentials = self.get_user_credentials(user)
            if not credentials:
                return None
            
            service = self.build_service(credentials)
            calendar_id = user.google_calendar_id or 'primary'
            
            # Convert times to RFC3339 format with timezone
            tz = pytz.timezone(timezone_str)
            if start_time.tzinfo is None:
                start_time = tz.localize(start_time)
            if end_time.tzinfo is None:
                end_time = tz.localize(end_time)
            
            body = {
                'timeMin': start_time.isoformat(),
                'timeMax': end_time.isoformat(),
                'timeZone': timezone_str,
                'items': [{'id': calendar_id}]
            }
            
            response = service.freebusy().query(body=body).execute()
            
            # Parse busy periods
            busy_periods = []
            calendar_busy = response.get('calendars', {}).get(calendar_id, {}).get('busy', [])
            
            for period in calendar_busy:
                busy_start = datetime.fromisoformat(period['start'].replace('Z', '+00:00'))
                busy_end = datetime.fromisoformat(period['end'].replace('Z', '+00:00'))
                
                # Convert to requested timezone
                busy_start_tz = timezone_service.convert_datetime(busy_start, 'UTC', timezone_str)
                busy_end_tz = timezone_service.convert_datetime(busy_end, 'UTC', timezone_str)
                
                busy_periods.append((busy_start_tz, busy_end_tz))
            
            return FreeBusyResponse(
                start_time=start_time,
                end_time=end_time,
                timezone=timezone_str,
                busy_periods=busy_periods
            )
            
        except Exception as e:
            logger.error(f"Failed to get free/busy for user {user.id}: {e}")
            return None
    
    def sync_user_appointments(self, db: Session, user: User) -> Tuple[int, int]:
        """Sync all user appointments to Google Calendar.
        
        Returns:
            Tuple of (successful_syncs, failed_syncs)
        """
        
        try:
            # Get all active appointments for the user
            appointments = db.query(Appointment).filter(
                Appointment.user_id == user.id,
                Appointment.status.in_(['scheduled', 'confirmed']),
                Appointment.start_time >= datetime.utcnow()
            ).all()
            
            successful_syncs = 0
            failed_syncs = 0
            
            for appointment in appointments:
                try:
                    # Determine operation based on whether event already exists
                    operation = 'update' if appointment.google_event_id else 'create'
                    
                    success = self.sync_appointment_to_google(db, appointment, user, operation)
                    if success:
                        successful_syncs += 1
                    else:
                        failed_syncs += 1
                        
                except Exception as e:
                    logger.error(f"Failed to sync appointment {appointment.id}: {e}")
                    failed_syncs += 1
            
            logger.info(f"Synced {successful_syncs}/{len(appointments)} appointments for user {user.id}")
            return successful_syncs, failed_syncs
            
        except Exception as e:
            logger.error(f"Failed to sync appointments for user {user.id}: {e}")
            return 0, 0
    
    def validate_calendar_access(self, user: User) -> bool:
        """Validate that the user has valid calendar access."""
        
        try:
            credentials = self.get_user_credentials(user)
            if not credentials:
                return False
            
            service = self.build_service(credentials)
            
            # Try to access the calendar list
            calendar_list = service.calendarList().list(maxResults=1).execute()
            return True
            
        except Exception as e:
            logger.error(f"Calendar access validation failed for user {user.id}: {e}")
            return False
    
    def get_user_calendars(self, user: User) -> List[Dict[str, str]]:
        """Get list of user's calendars with timezone information."""
        
        try:
            credentials = self.get_user_credentials(user)
            if not credentials:
                return []
            
            service = self.build_service(credentials)
            
            calendar_list = service.calendarList().list().execute()
            calendars = []
            
            for calendar in calendar_list.get('items', []):
                calendars.append({
                    'id': calendar['id'],
                    'summary': calendar['summary'],
                    'timezone': calendar.get('timeZone', 'UTC'),
                    'primary': calendar.get('primary', False),
                    'access_role': calendar.get('accessRole', 'reader')
                })
            
            return calendars
            
        except Exception as e:
            logger.error(f"Failed to get calendars for user {user.id}: {e}")
            return []
    
    def set_user_calendar(self, db: Session, user: User, calendar_id: str) -> bool:
        """Set the user's default calendar for appointments."""
        
        try:
            # Validate calendar access
            credentials = self.get_user_credentials(user)
            if not credentials:
                return False
            
            service = self.build_service(credentials)
            
            # Check if calendar exists and is accessible
            try:
                calendar = service.calendars().get(calendarId=calendar_id).execute()
                user.google_calendar_id = calendar_id
                db.commit()
                logger.info(f"Set calendar {calendar_id} for user {user.id}")
                return True
            except HttpError as e:
                if e.resp.status == 404:
                    logger.error(f"Calendar {calendar_id} not found for user {user.id}")
                return False
                
        except Exception as e:
            logger.error(f"Failed to set calendar for user {user.id}: {e}")
            return False


# Global service instance
enhanced_google_calendar_service = EnhancedGoogleCalendarService()


# Convenience functions for backward compatibility
def sync_appointment_to_google(db: Session, appointment: Appointment, user: User) -> bool:
    """Convenience function for syncing appointment to Google Calendar."""
    return enhanced_google_calendar_service.sync_appointment_to_google(
        db=db, 
        appointment=appointment, 
        user=user, 
        operation='create'
    )


def update_google_calendar_event(db: Session, appointment: Appointment, user: User) -> bool:
    """Convenience function for updating Google Calendar event."""
    return enhanced_google_calendar_service.sync_appointment_to_google(
        db=db, 
        appointment=appointment, 
        user=user, 
        operation='update'
    )


def delete_google_calendar_event(db: Session, appointment: Appointment, user: User) -> bool:
    """Convenience function for deleting Google Calendar event."""
    return enhanced_google_calendar_service.sync_appointment_to_google(
        db=db, 
        appointment=appointment, 
        user=user, 
        operation='delete'
    )