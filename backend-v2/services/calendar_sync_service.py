"""
Calendar Sync Service for automatic two-way synchronization.

This service provides:
- Automatic sync when appointments are created/updated/deleted
- Background sync jobs for bulk operations
- Conflict resolution for double-bookings
- Sync status tracking and error handling
"""

import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_

from models import User, Appointment
from services.google_calendar_service import GoogleCalendarService, GoogleCalendarError
from utils.timezone import get_user_timezone

logger = logging.getLogger(__name__)


class CalendarSyncService:
    """Service for automatic calendar synchronization."""
    
    def __init__(self, db: Session):
        self.db = db
        self.google_service = GoogleCalendarService(db)
        self.logger = logging.getLogger(__name__)
    
    def sync_appointment_created(self, appointment: Appointment) -> bool:
        """
        Automatically sync when a new appointment is created.
        
        Args:
            appointment: The newly created appointment
            
        Returns:
            bool: True if sync successful, False otherwise
        """
        if not appointment.barber or not appointment.barber.google_calendar_credentials:
            self.logger.info(f"Skipping sync for appointment {appointment.id} - no Google Calendar integration")
            return True
        
        try:
            # Check if barber has automatic sync enabled (you might want to add this setting)
            # For now, we'll sync all appointments
            
            google_event_id = self.google_service.sync_appointment_to_google(appointment)
            
            if google_event_id:
                self.logger.info(f"Successfully synced appointment {appointment.id} to Google Calendar: {google_event_id}")
                return True
            else:
                self.logger.error(f"Failed to sync appointment {appointment.id} to Google Calendar")
                return False
                
        except GoogleCalendarError as e:
            self.logger.error(f"Google Calendar error syncing appointment {appointment.id}: {str(e)}")
            return False
        except Exception as e:
            self.logger.error(f"Unexpected error syncing appointment {appointment.id}: {str(e)}")
            return False
    
    def sync_appointment_updated(self, appointment: Appointment) -> bool:
        """
        Automatically sync when an appointment is updated.
        
        Args:
            appointment: The updated appointment
            
        Returns:
            bool: True if sync successful, False otherwise
        """
        if not appointment.barber or not appointment.barber.google_calendar_credentials:
            return True
        
        try:
            if hasattr(appointment, 'google_event_id') and appointment.google_event_id:
                # Update existing event
                success = self.google_service.update_appointment_in_google(appointment)
                if success:
                    self.logger.info(f"Successfully updated appointment {appointment.id} in Google Calendar")
                return success
            else:
                # Create new event if none exists
                return self.sync_appointment_created(appointment)
                
        except GoogleCalendarError as e:
            self.logger.error(f"Google Calendar error updating appointment {appointment.id}: {str(e)}")
            return False
        except Exception as e:
            self.logger.error(f"Unexpected error updating appointment {appointment.id}: {str(e)}")
            return False
    
    def sync_appointment_deleted(self, appointment: Appointment) -> bool:
        """
        Automatically sync when an appointment is deleted.
        
        Args:
            appointment: The deleted appointment
            
        Returns:
            bool: True if sync successful, False otherwise
        """
        if not appointment.barber or not appointment.barber.google_calendar_credentials:
            return True
        
        try:
            success = self.google_service.delete_appointment_from_google(appointment)
            if success:
                self.logger.info(f"Successfully deleted appointment {appointment.id} from Google Calendar")
            return success
            
        except GoogleCalendarError as e:
            self.logger.error(f"Google Calendar error deleting appointment {appointment.id}: {str(e)}")
            return False
        except Exception as e:
            self.logger.error(f"Unexpected error deleting appointment {appointment.id}: {str(e)}")
            return False
    
    def check_calendar_conflicts(self, appointment: Appointment) -> List[Dict[str, Any]]:
        """
        Check for conflicts between V2 appointment and Google Calendar.
        
        Args:
            appointment: The appointment to check
            
        Returns:
            List of conflicts found
        """
        if not appointment.barber or not appointment.barber.google_calendar_credentials:
            return []
        
        conflicts = []
        
        try:
            # Get appointment time range with buffer
            start_time = appointment.start_time
            end_time = start_time + timedelta(minutes=appointment.duration_minutes)
            
            # Add buffer time
            buffer_start = start_time - timedelta(minutes=getattr(appointment, 'buffer_time_before', 0))
            buffer_end = end_time + timedelta(minutes=getattr(appointment, 'buffer_time_after', 0))
            
            # Check Google Calendar availability
            free_busy = self.google_service.get_free_busy(
                appointment.barber, 
                buffer_start, 
                buffer_end
            )
            
            # Check for overlapping busy periods
            for busy_start, busy_end in free_busy.busy_periods:
                if (start_time < busy_end and end_time > busy_start):
                    conflicts.append({
                        'type': 'google_calendar_conflict',
                        'appointment_id': appointment.id,
                        'appointment_start': start_time.isoformat(),
                        'appointment_end': end_time.isoformat(),
                        'conflict_start': busy_start.isoformat(),
                        'conflict_end': busy_end.isoformat(),
                        'message': f"Appointment conflicts with Google Calendar event from {busy_start} to {busy_end}"
                    })
            
            # Also check for overlapping V2 appointments
            overlapping_appointments = self.db.query(Appointment).filter(
                and_(
                    Appointment.barber_id == appointment.barber_id,
                    Appointment.id != appointment.id,
                    Appointment.status.in_(['confirmed', 'pending']),
                    or_(
                        and_(
                            Appointment.start_time < end_time,
                            Appointment.start_time >= start_time
                        ),
                        and_(
                            Appointment.start_time + timedelta(minutes=Appointment.duration_minutes) > start_time,
                            Appointment.start_time + timedelta(minutes=Appointment.duration_minutes) <= end_time
                        ),
                        and_(
                            Appointment.start_time <= start_time,
                            Appointment.start_time + timedelta(minutes=Appointment.duration_minutes) >= end_time
                        )
                    )
                )
            ).all()
            
            for overlap_apt in overlapping_appointments:
                overlap_end = overlap_apt.start_time + timedelta(minutes=overlap_apt.duration_minutes)
                conflicts.append({
                    'type': 'v2_appointment_conflict',
                    'appointment_id': appointment.id,
                    'conflicting_appointment_id': overlap_apt.id,
                    'appointment_start': start_time.isoformat(),
                    'appointment_end': end_time.isoformat(),
                    'conflict_start': overlap_apt.start_time.isoformat(),
                    'conflict_end': overlap_end.isoformat(),
                    'message': f"Appointment conflicts with existing V2 appointment #{overlap_apt.id}"
                })
            
        except Exception as e:
            self.logger.error(f"Error checking conflicts for appointment {appointment.id}: {str(e)}")
            conflicts.append({
                'type': 'conflict_check_error',
                'appointment_id': appointment.id,
                'message': f"Could not check for conflicts: {str(e)}"
            })
        
        return conflicts
    
    def bulk_sync_user_appointments(self, user: User, start_date: datetime, end_date: datetime) -> Dict[str, Any]:
        """
        Bulk sync all user appointments in a date range.
        
        Args:
            user: The user/barber to sync
            start_date: Start date for sync
            end_date: End date for sync
            
        Returns:
            Dictionary with sync results
        """
        if not user.google_calendar_credentials:
            return {
                'error': 'User does not have Google Calendar connected',
                'synced': 0,
                'failed': 0,
                'conflicts': []
            }
        
        # Get appointments in date range
        appointments = self.db.query(Appointment).filter(
            and_(
                Appointment.barber_id == user.id,
                Appointment.start_time >= start_date,
                Appointment.start_time <= end_date,
                Appointment.status.in_(['confirmed', 'pending'])
            )
        ).all()
        
        results = {
            'synced': 0,
            'failed': 0,
            'conflicts': [],
            'errors': []
        }
        
        for appointment in appointments:
            try:
                # Check for conflicts first
                conflicts = self.check_calendar_conflicts(appointment)
                if conflicts:
                    results['conflicts'].extend(conflicts)
                
                # Attempt to sync
                if hasattr(appointment, 'google_event_id') and appointment.google_event_id:
                    # Update existing
                    if self.sync_appointment_updated(appointment):
                        results['synced'] += 1
                    else:
                        results['failed'] += 1
                        results['errors'].append(f"Failed to update appointment {appointment.id}")
                else:
                    # Create new
                    if self.sync_appointment_created(appointment):
                        results['synced'] += 1
                    else:
                        results['failed'] += 1
                        results['errors'].append(f"Failed to create appointment {appointment.id}")
                        
            except Exception as e:
                results['failed'] += 1
                results['errors'].append(f"Error syncing appointment {appointment.id}: {str(e)}")
        
        return results
    
    def get_sync_status_for_user(self, user: User) -> Dict[str, Any]:
        """
        Get sync status for a user's appointments.
        
        Args:
            user: The user to check
            
        Returns:
            Dictionary with sync status information
        """
        if not user.google_calendar_credentials:
            return {
                'connected': False,
                'total_appointments': 0,
                'synced_appointments': 0,
                'unsynced_appointments': 0,
                'sync_percentage': 0
            }
        
        # Get all confirmed/pending appointments for the user
        total_appointments = self.db.query(Appointment).filter(
            and_(
                Appointment.barber_id == user.id,
                Appointment.status.in_(['confirmed', 'pending']),
                Appointment.start_time >= datetime.utcnow() - timedelta(days=30)  # Last 30 days
            )
        ).count()
        
        # Get synced appointments (those with google_event_id)
        synced_appointments = self.db.query(Appointment).filter(
            and_(
                Appointment.barber_id == user.id,
                Appointment.status.in_(['confirmed', 'pending']),
                Appointment.start_time >= datetime.utcnow() - timedelta(days=30),
                Appointment.google_event_id.isnot(None)
            )
        ).count()
        
        unsynced_appointments = total_appointments - synced_appointments
        sync_percentage = (synced_appointments / total_appointments * 100) if total_appointments > 0 else 100
        
        return {
            'connected': True,
            'total_appointments': total_appointments,
            'synced_appointments': synced_appointments,
            'unsynced_appointments': unsynced_appointments,
            'sync_percentage': round(sync_percentage, 1)
        }
    
    def cleanup_orphaned_events(self, user: User) -> Dict[str, Any]:
        """
        Clean up Google Calendar events that no longer have corresponding V2 appointments.
        
        Args:
            user: The user to clean up
            
        Returns:
            Dictionary with cleanup results
        """
        if not user.google_calendar_credentials:
            return {'error': 'User does not have Google Calendar connected'}
        
        results = {
            'deleted': 0,
            'errors': []
        }
        
        try:
            # Get all appointments with Google event IDs
            appointments_with_events = self.db.query(Appointment).filter(
                and_(
                    Appointment.barber_id == user.id,
                    Appointment.google_event_id.isnot(None)
                )
            ).all()
            
            # Get current Google Calendar events
            calendar_service = self.google_service.get_calendar_service(user)
            calendar_id = user.google_calendar_id or 'primary'
            
            # Get events from Google Calendar created by our app
            now = datetime.utcnow().isoformat() + 'Z'
            events_result = calendar_service.events().list(
                calendarId=calendar_id,
                timeMin=now,
                q='V2 booking system',  # Assuming we add this to event descriptions
                singleEvents=True,
                orderBy='startTime'
            ).execute()
            
            google_events = events_result.get('items', [])
            
            # Find events that exist in Google but not in our database
            our_event_ids = {apt.google_event_id for apt in appointments_with_events if apt.google_event_id}
            
            for event in google_events:
                if event['id'] not in our_event_ids:
                    try:
                        calendar_service.events().delete(
                            calendarId=calendar_id,
                            eventId=event['id']
                        ).execute()
                        results['deleted'] += 1
                        self.logger.info(f"Deleted orphaned Google Calendar event: {event['id']}")
                    except Exception as e:
                        results['errors'].append(f"Failed to delete event {event['id']}: {str(e)}")
            
        except Exception as e:
            results['errors'].append(f"Error during cleanup: {str(e)}")
        
        return results


def register_sync_hooks():
    """
    Register calendar sync hooks with the booking service.
    This should be called during application startup.
    """
    # This would be integrated with your booking service
    # to automatically trigger sync operations when appointments
    # are created, updated, or deleted.
    pass