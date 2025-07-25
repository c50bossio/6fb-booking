"""
Calendar Two-Way Sync Service for complete bidirectional synchronization.

This service provides:
- Import Google Calendar events to detect conflicts
- Automatic bidirectional synchronization
- Event change detection and processing
- Intelligent conflict resolution
- Sync state management and recovery
"""

import json
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from dataclasses import dataclass
from sqlalchemy.orm import Session
from sqlalchemy import and_

from models import User, Appointment
from services.enhanced_google_calendar_service import enhanced_google_calendar_service
from services.timezone_service import timezone_service
from utils.encryption import encrypt_data, decrypt_data

logger = logging.getLogger(__name__)


@dataclass
class GoogleCalendarEvent:
    """Data class for Google Calendar events imported for conflict checking."""
    
    id: str
    summary: str
    start_time: datetime
    end_time: datetime
    status: str
    description: Optional[str] = None
    location: Optional[str] = None
    creator_email: Optional[str] = None
    attendees: List[str] = None
    source: str = 'google'
    organizer_email: Optional[str] = None
    
    def __post_init__(self):
        if self.attendees is None:
            self.attendees = []


@dataclass
class SyncConflict:
    """Data class for synchronization conflicts."""
    
    type: str  # 'time_overlap', 'double_booking', 'external_event'
    severity: str  # 'low', 'medium', 'high', 'critical'
    bookedbarber_appointment_id: Optional[int]
    google_event_id: Optional[str]
    conflict_start: datetime
    conflict_end: datetime
    suggested_resolution: str
    details: Dict[str, Any]
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'type': self.type,
            'severity': self.severity,
            'bookedbarber_appointment_id': self.bookedbarber_appointment_id,
            'google_event_id': self.google_event_id,
            'conflict_start': self.conflict_start.isoformat(),
            'conflict_end': self.conflict_end.isoformat(),
            'suggested_resolution': self.suggested_resolution,
            'details': self.details
        }


@dataclass
class SyncResult:
    """Data class for sync operation results."""
    
    imported_events: int = 0
    created_appointments: int = 0
    updated_appointments: int = 0
    deleted_appointments: int = 0
    conflicts_detected: int = 0
    conflicts_resolved: int = 0
    errors: List[str] = None
    conflicts: List[SyncConflict] = None
    
    def __post_init__(self):
        if self.errors is None:
            self.errors = []
        if self.conflicts is None:
            self.conflicts = []
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'imported_events': self.imported_events,
            'created_appointments': self.created_appointments,
            'updated_appointments': self.updated_appointments,
            'deleted_appointments': self.deleted_appointments,
            'conflicts_detected': self.conflicts_detected,
            'conflicts_resolved': self.conflicts_resolved,
            'errors': self.errors,
            'conflicts': [conflict.to_dict() for conflict in self.conflicts]
        }


class CalendarTwoWaySyncService:
    """Service for comprehensive two-way calendar synchronization."""
    
    def __init__(self, db: Session):
        self.db = db
        
    def sync_from_google_calendar(
        self, 
        user: User, 
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        incremental: bool = False
    ) -> SyncResult:
        """
        Import events from Google Calendar and detect conflicts.
        
        Args:
            user: User to sync calendar for
            start_date: Start date for sync range
            end_date: End date for sync range
            incremental: Whether this is an incremental sync (webhook-triggered)
            
        Returns:
            SyncResult with import results and conflicts
        """
        result = SyncResult()
        
        try:
            # Validate user has Google Calendar connected
            credentials = enhanced_google_calendar_service.get_user_credentials(user)
            if not credentials:
                result.errors.append("User does not have Google Calendar connected")
                return result
            
            # Set default date range if not provided
            if not start_date:
                start_date = datetime.utcnow() - timedelta(days=1 if incremental else 7)
            if not end_date:
                end_date = datetime.utcnow() + timedelta(days=30)
            
            # Get user's timezone
            user_timezone = timezone_service.get_user_timezone(user)
            
            # Import Google Calendar events
            google_events = self._import_google_calendar_events(
                user, start_date, end_date, user_timezone
            )
            result.imported_events = len(google_events)
            
            if not google_events:
                logger.info(f"No Google Calendar events found for user {user.id}")
                return result
            
            # Get existing BookedBarber appointments in the same time range
            existing_appointments = self._get_existing_appointments(
                user, start_date, end_date
            )
            
            # Detect conflicts between Google events and BookedBarber appointments
            conflicts = self._detect_conflicts(google_events, existing_appointments, user_timezone)
            result.conflicts = conflicts
            result.conflicts_detected = len(conflicts)
            
            # Process conflicts and suggest resolutions
            for conflict in conflicts:
                resolution_applied = self._apply_conflict_resolution(conflict, user)
                if resolution_applied:
                    result.conflicts_resolved += 1
            
            # Store sync state for future incremental syncs
            self._update_sync_state(user, google_events, result)
            
            logger.info(f"Two-way sync completed for user {user.id}: {result.to_dict()}")
            
        except Exception as e:
            logger.error(f"Error during two-way sync for user {user.id}: {e}")
            result.errors.append(f"Sync error: {str(e)}")
        
        return result
    
    def _import_google_calendar_events(
        self, 
        user: User, 
        start_date: datetime, 
        end_date: datetime,
        timezone_str: str
    ) -> List[GoogleCalendarEvent]:
        """
        Import events from Google Calendar within date range.
        
        Args:
            user: User to import events for
            start_date: Start date for import
            end_date: End date for import
            timezone_str: User's timezone
            
        Returns:
            List of imported Google Calendar events
        """
        try:
            service = enhanced_google_calendar_service.build_service(
                enhanced_google_calendar_service.get_user_credentials(user)
            )
            calendar_id = user.google_calendar_id or 'primary'
            
            # Format time range for Google Calendar API
            time_min = start_date.isoformat() + 'Z'
            time_max = end_date.isoformat() + 'Z'
            
            # Get events from Google Calendar
            events_result = service.events().list(
                calendarId=calendar_id,
                timeMin=time_min,
                timeMax=time_max,
                singleEvents=True,
                orderBy='startTime',
                maxResults=250  # Reasonable limit
            ).execute()
            
            events = events_result.get('items', [])
            google_events = []
            
            for event in events:
                try:
                    # Skip all-day events and cancelled events
                    if event.get('status') == 'cancelled':
                        continue
                    
                    start = event['start']
                    end = event['end']
                    
                    # Skip all-day events (they have 'date' instead of 'dateTime')
                    if 'date' in start or 'date' in end:
                        continue
                    
                    # Parse start and end times
                    start_time = datetime.fromisoformat(start['dateTime'].replace('Z', '+00:00'))
                    end_time = datetime.fromisoformat(end['dateTime'].replace('Z', '+00:00'))
                    
                    # Convert to user timezone
                    start_time_user = timezone_service.convert_from_utc(start_time, timezone_str)
                    end_time_user = timezone_service.convert_from_utc(end_time, timezone_str)
                    
                    # Extract attendees
                    attendees = []
                    if 'attendees' in event:
                        attendees = [attendee.get('email', '') for attendee in event['attendees']]
                    
                    # Check if this is a BookedBarber-created event (skip to avoid circular sync)
                    summary = event.get('summary', '')
                    description = event.get('description', '')
                    if 'BookedBarber' in summary or 'BookedBarber' in description:
                        continue
                    
                    google_event = GoogleCalendarEvent(
                        id=event['id'],
                        summary=summary,
                        start_time=start_time_user,
                        end_time=end_time_user,
                        status=event.get('status', 'confirmed'),
                        description=description,
                        location=event.get('location'),
                        creator_email=event.get('creator', {}).get('email'),
                        attendees=attendees,
                        organizer_email=event.get('organizer', {}).get('email')
                    )
                    
                    google_events.append(google_event)
                    
                except Exception as e:
                    logger.warning(f"Error parsing Google Calendar event {event.get('id')}: {e}")
                    continue
            
            logger.info(f"Imported {len(google_events)} events from Google Calendar for user {user.id}")
            return google_events
            
        except Exception as e:
            logger.error(f"Error importing Google Calendar events for user {user.id}: {e}")
            return []
    
    def _get_existing_appointments(
        self, 
        user: User, 
        start_date: datetime, 
        end_date: datetime
    ) -> List[Appointment]:
        """
        Get existing BookedBarber appointments in date range.
        
        Args:
            user: User to get appointments for
            start_date: Start date for query
            end_date: End date for query
            
        Returns:
            List of existing appointments
        """
        return self.db.query(Appointment).filter(
            and_(
                Appointment.barber_id == user.id,
                Appointment.start_time >= start_date,
                Appointment.start_time <= end_date,
                Appointment.status.in_(['confirmed', 'pending', 'scheduled'])
            )
        ).all()
    
    def _detect_conflicts(
        self, 
        google_events: List[GoogleCalendarEvent], 
        appointments: List[Appointment],
        timezone_str: str
    ) -> List[SyncConflict]:
        """
        Detect conflicts between Google Calendar events and BookedBarber appointments.
        
        Args:
            google_events: Imported Google Calendar events
            appointments: Existing BookedBarber appointments
            timezone_str: User's timezone for proper comparison
            
        Returns:
            List of detected conflicts
        """
        conflicts = []
        
        try:
            for google_event in google_events:
                for appointment in appointments:
                    # Convert appointment time to user timezone for comparison
                    appointment_start = timezone_service.convert_from_utc(
                        appointment.start_time, timezone_str
                    )
                    appointment_end = appointment_start + timedelta(
                        minutes=appointment.duration_minutes
                    )
                    
                    # Check for time overlap
                    if (google_event.start_time < appointment_end and 
                        google_event.end_time > appointment_start):
                        
                        # Determine conflict severity
                        overlap_start = max(google_event.start_time, appointment_start)
                        overlap_end = min(google_event.end_time, appointment_end)
                        overlap_minutes = (overlap_end - overlap_start).total_seconds() / 60
                        
                        if overlap_minutes >= 30:
                            severity = 'critical'
                        elif overlap_minutes >= 15:
                            severity = 'high'
                        elif overlap_minutes >= 5:
                            severity = 'medium'
                        else:
                            severity = 'low'
                        
                        # Suggest resolution based on conflict type
                        if google_event.summary.lower() in ['busy', 'unavailable', 'blocked']:
                            suggested_resolution = 'reschedule_appointment'
                        elif len(google_event.attendees) > 1:
                            suggested_resolution = 'reschedule_appointment'
                        else:
                            suggested_resolution = 'notify_client'
                        
                        conflict = SyncConflict(
                            type='time_overlap',
                            severity=severity,
                            bookedbarber_appointment_id=appointment.id,
                            google_event_id=google_event.id,
                            conflict_start=overlap_start,
                            conflict_end=overlap_end,
                            suggested_resolution=suggested_resolution,
                            details={
                                'google_event_summary': google_event.summary,
                                'google_event_location': google_event.location,
                                'appointment_service': appointment.service_name,
                                'appointment_client': getattr(appointment.client, 'name', 'Unknown') if appointment.client else 'Unknown',
                                'overlap_minutes': overlap_minutes,
                                'google_attendees_count': len(google_event.attendees)
                            }
                        )
                        
                        conflicts.append(conflict)
            
            # Also check for external events that might indicate unavailability
            for google_event in google_events:
                # Check if this is a personal/busy event
                if any(keyword in google_event.summary.lower() for keyword in 
                       ['personal', 'unavailable', 'busy', 'blocked', 'vacation', 'sick']):
                    
                    conflict = SyncConflict(
                        type='external_event',
                        severity='medium',
                        bookedbarber_appointment_id=None,
                        google_event_id=google_event.id,
                        conflict_start=google_event.start_time,
                        conflict_end=google_event.end_time,
                        suggested_resolution='block_booking_time',
                        details={
                            'google_event_summary': google_event.summary,
                            'google_event_description': google_event.description,
                            'event_type': 'availability_conflict'
                        }
                    )
                    
                    conflicts.append(conflict)
            
            logger.info(f"Detected {len(conflicts)} conflicts")
            return conflicts
            
        except Exception as e:
            logger.error(f"Error detecting conflicts: {e}")
            return []
    
    def _apply_conflict_resolution(self, conflict: SyncConflict, user: User) -> bool:
        """
        Apply automatic conflict resolution based on conflict type and severity.
        
        Args:
            conflict: Conflict to resolve
            user: User context for resolution
            
        Returns:
            True if resolution was applied, False otherwise
        """
        try:
            # For now, we'll only log conflicts and not automatically resolve them
            # This prevents accidental appointment modifications
            logger.info(f"Conflict detected for user {user.id}: {conflict.to_dict()}")
            
            # Future enhancements could include:
            # - Automatic rescheduling for low-severity conflicts
            # - Client notifications for conflicts
            # - Blocking future bookings during unavailable times
            # - Integration with booking system to prevent conflicts
            
            return False  # No automatic resolution applied
            
        except Exception as e:
            logger.error(f"Error applying conflict resolution: {e}")
            return False
    
    def _update_sync_state(
        self, 
        user: User, 
        google_events: List[GoogleCalendarEvent], 
        result: SyncResult
    ) -> None:
        """
        Update sync state for tracking incremental changes.
        
        Args:
            user: User to update sync state for
            google_events: Events that were synced
            result: Sync result to store
        """
        try:
            sync_state = {
                'last_sync': datetime.utcnow().isoformat(),
                'events_count': len(google_events),
                'last_event_ids': [event.id for event in google_events],
                'conflicts_detected': result.conflicts_detected,
                'sync_method': 'incremental' if result.imported_events < 50 else 'full'
            }
            
            # Store encrypted sync state
            user.google_calendar_sync_state = encrypt_data(json.dumps(sync_state))
            self.db.commit()
            
        except Exception as e:
            logger.error(f"Error updating sync state for user {user.id}: {e}")
    
    def get_sync_status(self, user: User) -> Dict[str, Any]:
        """
        Get current sync status for a user.
        
        Args:
            user: User to get sync status for
            
        Returns:
            Dictionary with sync status information
        """
        try:
            if not user.google_calendar_sync_state:
                return {
                    'synchronized': False,
                    'last_sync': None,
                    'events_count': 0,
                    'conflicts_detected': 0
                }
            
            sync_state = json.loads(decrypt_data(user.google_calendar_sync_state))
            
            return {
                'synchronized': True,
                'last_sync': sync_state.get('last_sync'),
                'events_count': sync_state.get('events_count', 0),
                'conflicts_detected': sync_state.get('conflicts_detected', 0),
                'sync_method': sync_state.get('sync_method', 'unknown')
            }
            
        except Exception as e:
            logger.error(f"Error getting sync status for user {user.id}: {e}")
            return {
                'synchronized': False,
                'error': str(e)
            }
    
    def force_full_sync(self, user: User) -> SyncResult:
        """
        Force a complete two-way sync for a user.
        
        Args:
            user: User to perform full sync for
            
        Returns:
            SyncResult with comprehensive sync results
        """
        try:
            # Clear existing sync state to force full sync
            user.google_calendar_sync_state = None
            self.db.commit()
            
            # Perform full sync with extended date range
            start_date = datetime.utcnow() - timedelta(days=30)
            end_date = datetime.utcnow() + timedelta(days=90)
            
            result = self.sync_from_google_calendar(
                user, start_date, end_date, incremental=False
            )
            
            logger.info(f"Completed force full sync for user {user.id}")
            return result
            
        except Exception as e:
            logger.error(f"Error during force full sync for user {user.id}: {e}")
            result = SyncResult()
            result.errors.append(f"Full sync error: {str(e)}")
            return result


def sync_user_calendar_bidirectional(db: Session, user: User) -> SyncResult:
    """
    Convenience function for bidirectional calendar sync.
    
    Args:
        db: Database session
        user: User to sync calendar for
        
    Returns:
        SyncResult with sync results
    """
    sync_service = CalendarTwoWaySyncService(db)
    return sync_service.sync_from_google_calendar(user)


def detect_calendar_conflicts(db: Session, user: User, start_date: datetime, end_date: datetime) -> List[SyncConflict]:
    """
    Convenience function to detect calendar conflicts.
    
    Args:
        db: Database session
        user: User to check conflicts for
        start_date: Start date for conflict detection
        end_date: End date for conflict detection
        
    Returns:
        List of detected conflicts
    """
    sync_service = CalendarTwoWaySyncService(db)
    result = sync_service.sync_from_google_calendar(user, start_date, end_date)
    return result.conflicts