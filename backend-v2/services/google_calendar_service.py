"""
Google Calendar Service for V2 Integration

This service handles:
- OAuth2 authentication flow
- Two-way synchronization between V2 and Google Calendar
- Event management (create, update, delete)
- Availability checking
- Timezone conversions
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

from models import User, Appointment
from utils.timezone import get_user_timezone, format_datetime_for_google

logger = logging.getLogger(__name__)


@dataclass
class CalendarEvent:
    """Data class for calendar events."""
    id: Optional[str]
    summary: str
    description: Optional[str]
    start_time: datetime
    end_time: datetime
    timezone: str
    location: Optional[str] = None
    attendees: Optional[List[str]] = None
    google_event_id: Optional[str] = None


@dataclass
class FreeBusyResponse:
    """Data class for free/busy query responses."""
    start_time: datetime
    end_time: datetime
    calendar_id: str
    busy_periods: List[Tuple[datetime, datetime]]


class GoogleCalendarError(Exception):
    """Custom exception for Google Calendar operations."""


class GoogleCalendarService:
    """Service for managing Google Calendar integration."""
    
    def __init__(self, db: Session):
        self.db = db
        self.logger = logging.getLogger(__name__)
    
    def get_user_credentials(self, user: User) -> Optional[Credentials]:
        """Get and validate user's Google Calendar credentials."""
        if not user.google_calendar_credentials:
            return None
        
        try:
            creds_data = json.loads(user.google_calendar_credentials)
            credentials = Credentials(
                token=creds_data.get("token"),
                refresh_token=creds_data.get("refresh_token"),
                token_uri=creds_data.get("token_uri"),
                client_id=creds_data.get("client_id"),
                client_secret=creds_data.get("client_secret"),
                scopes=creds_data.get("scopes")
            )
            
            # Refresh token if expired
            if credentials.expired and credentials.refresh_token:
                credentials.refresh(google_requests.Request())
                
                # Update stored credentials
                self._update_user_credentials(user, credentials)
            
            return credentials
            
        except Exception as e:
            self.logger.error(f"Error getting credentials for user {user.id}: {str(e)}")
            return None
    
    def _update_user_credentials(self, user: User, credentials: Credentials):
        """Update user's stored credentials."""
        user.google_calendar_credentials = json.dumps({
            "token": credentials.token,
            "refresh_token": credentials.refresh_token,
            "token_uri": credentials.token_uri,
            "client_id": credentials.client_id,
            "client_secret": credentials.client_secret,
            "scopes": credentials.scopes
        })
        self.db.commit()
    
    def get_calendar_service(self, user: User):
        """Get Google Calendar service for user."""
        credentials = self.get_user_credentials(user)
        if not credentials:
            raise GoogleCalendarError("No valid credentials found")
        
        return build('calendar', 'v3', credentials=credentials)
    
    def list_calendars(self, user: User) -> List[Dict[str, Any]]:
        """List user's calendars."""
        try:
            service = self.get_calendar_service(user)
            calendars_result = service.calendarList().list().execute()
            calendars = calendars_result.get('items', [])
            
            return [
                {
                    "id": cal['id'],
                    "summary": cal['summary'],
                    "primary": cal.get('primary', False),
                    "accessRole": cal['accessRole'],
                    "timeZone": cal.get('timeZone', 'UTC')
                }
                for cal in calendars
            ]
        except HttpError as e:
            self.logger.error(f"Google Calendar API error: {e}")
            raise GoogleCalendarError(f"Failed to list calendars: {e}")
    
    def create_event(self, user: User, event: CalendarEvent, calendar_id: Optional[str] = None) -> str:
        """Create a new calendar event."""
        try:
            service = self.get_calendar_service(user)
            calendar_id = calendar_id or user.google_calendar_id or 'primary'
            
            # Convert times to user's timezone
            user_tz = get_user_timezone(user)
            start_time_str = format_datetime_for_google(event.start_time, user_tz)
            end_time_str = format_datetime_for_google(event.end_time, user_tz)
            
            google_event = {
                'summary': event.summary,
                'description': event.description or '',
                'start': {
                    'dateTime': start_time_str,
                    'timeZone': user_tz,
                },
                'end': {
                    'dateTime': end_time_str,
                    'timeZone': user_tz,
                },
            }
            
            if event.location:
                google_event['location'] = event.location
            
            if event.attendees:
                google_event['attendees'] = [{'email': email} for email in event.attendees]
            
            result = service.events().insert(calendarId=calendar_id, body=google_event).execute()
            
            self.logger.info(f"Created Google Calendar event: {result['id']}")
            return result['id']
            
        except HttpError as e:
            self.logger.error(f"Error creating calendar event: {e}")
            raise GoogleCalendarError(f"Failed to create event: {e}")
    
    def update_event(self, user: User, event_id: str, event: CalendarEvent, calendar_id: Optional[str] = None) -> bool:
        """Update an existing calendar event."""
        try:
            service = self.get_calendar_service(user)
            calendar_id = calendar_id or user.google_calendar_id or 'primary'
            
            # Get existing event
            existing_event = service.events().get(calendarId=calendar_id, eventId=event_id).execute()
            
            # Convert times to user's timezone
            user_tz = get_user_timezone(user)
            start_time_str = format_datetime_for_google(event.start_time, user_tz)
            end_time_str = format_datetime_for_google(event.end_time, user_tz)
            
            # Update event data
            existing_event.update({
                'summary': event.summary,
                'description': event.description or '',
                'start': {
                    'dateTime': start_time_str,
                    'timeZone': user_tz,
                },
                'end': {
                    'dateTime': end_time_str,
                    'timeZone': user_tz,
                },
            })
            
            if event.location:
                existing_event['location'] = event.location
            
            if event.attendees:
                existing_event['attendees'] = [{'email': email} for email in event.attendees]
            
            service.events().update(
                calendarId=calendar_id, 
                eventId=event_id, 
                body=existing_event
            ).execute()
            
            self.logger.info(f"Updated Google Calendar event: {event_id}")
            return True
            
        except HttpError as e:
            self.logger.error(f"Error updating calendar event: {e}")
            raise GoogleCalendarError(f"Failed to update event: {e}")
    
    def delete_event(self, user: User, event_id: str, calendar_id: Optional[str] = None) -> bool:
        """Delete a calendar event."""
        try:
            service = self.get_calendar_service(user)
            calendar_id = calendar_id or user.google_calendar_id or 'primary'
            
            service.events().delete(calendarId=calendar_id, eventId=event_id).execute()
            
            self.logger.info(f"Deleted Google Calendar event: {event_id}")
            return True
            
        except HttpError as e:
            if e.resp.status == 404:
                self.logger.warning(f"Event {event_id} not found for deletion")
                return True  # Event already deleted
            
            self.logger.error(f"Error deleting calendar event: {e}")
            raise GoogleCalendarError(f"Failed to delete event: {e}")
    
    def get_free_busy(self, user: User, start_time: datetime, end_time: datetime, 
                     calendar_ids: Optional[List[str]] = None) -> FreeBusyResponse:
        """Get free/busy information for specified time range."""
        try:
            service = self.get_calendar_service(user)
            
            if not calendar_ids:
                calendar_ids = [user.google_calendar_id or 'primary']
            
            # Convert times to RFC3339 format
            user_tz = get_user_timezone(user)
            start_time_str = format_datetime_for_google(start_time, user_tz)
            end_time_str = format_datetime_for_google(end_time, user_tz)
            
            body = {
                'timeMin': start_time_str,
                'timeMax': end_time_str,
                'items': [{'id': cal_id} for cal_id in calendar_ids]
            }
            
            result = service.freebusy().query(body=body).execute()
            
            busy_periods = []
            for calendar_id in calendar_ids:
                calendar_busy = result['calendars'].get(calendar_id, {}).get('busy', [])
                for busy_period in calendar_busy:
                    busy_start = datetime.fromisoformat(busy_period['start'].replace('Z', '+00:00'))
                    busy_end = datetime.fromisoformat(busy_period['end'].replace('Z', '+00:00'))
                    busy_periods.append((busy_start, busy_end))
            
            return FreeBusyResponse(
                start_time=start_time,
                end_time=end_time,
                calendar_id=calendar_ids[0],
                busy_periods=busy_periods
            )
            
        except HttpError as e:
            self.logger.error(f"Error getting free/busy info: {e}")
            raise GoogleCalendarError(f"Failed to get availability: {e}")
    
    def is_time_available(self, user: User, start_time: datetime, end_time: datetime) -> bool:
        """Check if a specific time slot is available."""
        try:
            # Add buffer to check for overlapping appointments
            buffer_start = start_time - timedelta(minutes=15)
            buffer_end = end_time + timedelta(minutes=15)
            
            free_busy = self.get_free_busy(user, buffer_start, buffer_end)
            
            # Check if the requested time overlaps with any busy periods
            for busy_start, busy_end in free_busy.busy_periods:
                if (start_time < busy_end and end_time > busy_start):
                    return False
            
            return True
            
        except GoogleCalendarError:
            # If we can't check Google Calendar, assume available
            self.logger.warning(f"Could not check Google Calendar availability for user {user.id}")
            return True
    
    def sync_appointment_to_google(self, appointment: Appointment) -> Optional[str]:
        """Sync a V2 appointment to Google Calendar with webhook support."""
        if not appointment.barber or not appointment.barber.google_calendar_credentials:
            return None
        
        try:
            # Check if webhook subscription exists for real-time sync
            webhook_subscription = self._get_or_create_webhook_subscription(appointment.barber)
            
            # Create calendar event from appointment
            event = CalendarEvent(
                id=None,
                summary=f"Appointment: {appointment.service_name}",
                description=f"Client: {appointment.client.name if appointment.client else 'Unknown'}\n"
                           f"Service: {appointment.service_name}\n"
                           f"Duration: {appointment.duration_minutes} minutes\n"
                           f"Price: ${appointment.price}\n"
                           f"Notes: {appointment.notes or 'None'}\n"
                           f"BookedBarber ID: {appointment.id}",  # Add identifier for webhook processing
                start_time=appointment.start_time,
                end_time=appointment.start_time + timedelta(minutes=appointment.duration_minutes),
                timezone=get_user_timezone(appointment.barber),
                attendees=[appointment.client.email] if appointment.client and appointment.client.email else None
            )
            
            google_event_id = self.create_event(appointment.barber, event)
            
            # Store the Google event ID in the appointment
            appointment.google_event_id = google_event_id
            self.db.commit()
            
            # Log sync operation
            self._log_sync_operation(
                user_id=appointment.barber.id,
                appointment_id=appointment.id,
                operation="create",
                direction="to_google",
                google_event_id=google_event_id,
                status="success"
            )
            
            return google_event_id
            
        except Exception as e:
            self.logger.error(f"Error syncing appointment {appointment.id} to Google: {str(e)}")
            
            # Log failed sync operation
            self._log_sync_operation(
                user_id=appointment.barber.id,
                appointment_id=appointment.id,
                operation="create",
                direction="to_google",
                status="failed",
                error_message=str(e)
            )
            
            return None
    
    def update_appointment_in_google(self, appointment: Appointment) -> bool:
        """Update a V2 appointment in Google Calendar with enhanced logging."""
        if not appointment.barber or not appointment.barber.google_calendar_credentials:
            return False
        
        if not hasattr(appointment, 'google_event_id') or not appointment.google_event_id:
            # No Google event ID, try to create instead
            return self.sync_appointment_to_google(appointment) is not None
        
        try:
            # Create updated calendar event
            event = CalendarEvent(
                id=appointment.google_event_id,
                summary=f"Appointment: {appointment.service_name}",
                description=f"Client: {appointment.client.name if appointment.client else 'Unknown'}\n"
                           f"Service: {appointment.service_name}\n"
                           f"Duration: {appointment.duration_minutes} minutes\n"
                           f"Price: ${appointment.price}\n"
                           f"Notes: {appointment.notes or 'None'}\n"
                           f"BookedBarber ID: {appointment.id}",  # Add identifier for webhook processing
                start_time=appointment.start_time,
                end_time=appointment.start_time + timedelta(minutes=appointment.duration_minutes),
                timezone=get_user_timezone(appointment.barber),
                attendees=[appointment.client.email] if appointment.client and appointment.client.email else None
            )
            
            result = self.update_event(appointment.barber, appointment.google_event_id, event)
            
            # Log sync operation
            self._log_sync_operation(
                user_id=appointment.barber.id,
                appointment_id=appointment.id,
                operation="update",
                direction="to_google",
                google_event_id=appointment.google_event_id,
                status="success" if result else "failed",
                error_message=None if result else "Update operation failed"
            )
            
            return result
            
        except Exception as e:
            self.logger.error(f"Error updating appointment {appointment.id} in Google: {str(e)}")
            
            # Log failed sync operation
            self._log_sync_operation(
                user_id=appointment.barber.id,
                appointment_id=appointment.id,
                operation="update",
                direction="to_google",
                google_event_id=appointment.google_event_id,
                status="failed",
                error_message=str(e)
            )
            
            return False
    
    def delete_appointment_from_google(self, appointment: Appointment) -> bool:
        """Delete a V2 appointment from Google Calendar with enhanced logging."""
        if not appointment.barber or not appointment.barber.google_calendar_credentials:
            return False
        
        if not hasattr(appointment, 'google_event_id') or not appointment.google_event_id:
            return True  # Nothing to delete
        
        try:
            google_event_id = appointment.google_event_id  # Store before clearing
            result = self.delete_event(appointment.barber, appointment.google_event_id)
            
            # Clear the Google event ID
            appointment.google_event_id = None
            self.db.commit()
            
            # Log sync operation
            self._log_sync_operation(
                user_id=appointment.barber.id,
                appointment_id=appointment.id,
                operation="delete",
                direction="to_google",
                google_event_id=google_event_id,
                status="success" if result else "failed",
                error_message=None if result else "Delete operation failed"
            )
            
            return result
            
        except Exception as e:
            self.logger.error(f"Error deleting appointment {appointment.id} from Google: {str(e)}")
            
            # Log failed sync operation
            self._log_sync_operation(
                user_id=appointment.barber.id,
                appointment_id=appointment.id,
                operation="delete",
                direction="to_google",
                google_event_id=appointment.google_event_id,
                status="failed",
                error_message=str(e)
            )
            
            return False
    
    def sync_all_appointments_to_google(self, user: User, start_date: datetime, end_date: datetime) -> Dict[str, Any]:
        """Sync all user's appointments to Google Calendar for a date range."""
        if not user.google_calendar_credentials:
            raise GoogleCalendarError("User does not have Google Calendar connected")
        
        # Get appointments in date range
        appointments = self.db.query(Appointment).filter(
            Appointment.barber_id == user.id,
            Appointment.start_time >= start_date,
            Appointment.start_time <= end_date,
            Appointment.status.in_(['confirmed', 'pending'])
        ).all()
        
        results = {
            'synced': 0,
            'failed': 0,
            'skipped': 0,
            'errors': []
        }
        
        for appointment in appointments:
            try:
                # Check if already synced
                if hasattr(appointment, 'google_event_id') and appointment.google_event_id:
                    results['skipped'] += 1
                    continue
                
                google_event_id = self.sync_appointment_to_google(appointment)
                if google_event_id:
                    results['synced'] += 1
                else:
                    results['failed'] += 1
                    results['errors'].append(f"Failed to sync appointment {appointment.id}")
                    
            except Exception as e:
                results['failed'] += 1
                results['errors'].append(f"Error syncing appointment {appointment.id}: {str(e)}")
        
        return results
    
    def validate_calendar_integration(self, user: User) -> Dict[str, Any]:
        """Validate that Google Calendar integration is working properly."""
        validation_results = {
            'connected': False,
            'valid_credentials': False,
            'can_list_calendars': False,
            'can_create_events': False,
            'selected_calendar': None,
            'errors': []
        }
        
        try:
            # Check if connected
            if not user.google_calendar_credentials:
                validation_results['errors'].append("No Google Calendar credentials found")
                return validation_results
            
            validation_results['connected'] = True
            
            # Check credentials
            credentials = self.get_user_credentials(user)
            if not credentials:
                validation_results['errors'].append("Invalid or expired credentials")
                return validation_results
            
            validation_results['valid_credentials'] = True
            
            # Check calendar access
            calendars = self.list_calendars(user)
            validation_results['can_list_calendars'] = True
            
            # Check selected calendar
            if user.google_calendar_id:
                selected_cal = next((cal for cal in calendars if cal['id'] == user.google_calendar_id), None)
                if selected_cal:
                    validation_results['selected_calendar'] = selected_cal
                else:
                    validation_results['errors'].append("Selected calendar not found")
            
            # Test event creation (create and immediately delete)
            try:
                test_event = CalendarEvent(
                    id=None,
                    summary="Test Event - V2 Integration",
                    description="This is a test event created by V2 booking system",
                    start_time=datetime.utcnow() + timedelta(hours=1),
                    end_time=datetime.utcnow() + timedelta(hours=2),
                    timezone=get_user_timezone(user)
                )
                
                event_id = self.create_event(user, test_event)
                validation_results['can_create_events'] = True
                
                # Clean up test event
                self.delete_event(user, event_id)
                
            except Exception as e:
                validation_results['errors'].append(f"Cannot create events: {str(e)}")
        
        except Exception as e:
            validation_results['errors'].append(f"Validation error: {str(e)}")
        
        return validation_results
    
    def _get_or_create_webhook_subscription(self, user: User):
        """Get or create webhook subscription for user's Google Calendar."""
        try:
            from models import GoogleCalendarWebhookSubscription
            
            # Check for existing active subscription
            subscription = self.db.query(GoogleCalendarWebhookSubscription).filter(
                GoogleCalendarWebhookSubscription.user_id == user.id,
                GoogleCalendarWebhookSubscription.is_active == True,
                GoogleCalendarWebhookSubscription.expiration_time > datetime.utcnow()
            ).first()
            
            if subscription:
                return subscription
            
            # Create new subscription if none exists or expired
            from services.google_calendar_webhook_service import GoogleCalendarWebhookService
            webhook_service = GoogleCalendarWebhookService(self.db)
            
            try:
                subscription = webhook_service.subscribe_to_calendar_events(user)
                self.logger.info(f"Created webhook subscription for user {user.id}")
                return subscription
            except Exception as e:
                self.logger.warning(f"Could not create webhook subscription for user {user.id}: {str(e)}")
                return None
                
        except Exception as e:
            self.logger.warning(f"Error managing webhook subscription for user {user.id}: {str(e)}")
            return None
    
    def _log_sync_operation(
        self, 
        user_id: int, 
        operation: str, 
        direction: str, 
        status: str,
        appointment_id: Optional[int] = None,
        google_event_id: Optional[str] = None,
        error_message: Optional[str] = None
    ):
        """Log synchronization operation for audit trail."""
        try:
            from models import GoogleCalendarSyncLog
            
            sync_log = GoogleCalendarSyncLog(
                user_id=user_id,
                appointment_id=appointment_id,
                operation=operation,
                direction=direction,
                status=status,
                google_event_id=google_event_id,
                google_calendar_id="primary",
                error_message=error_message
            )
            
            self.db.add(sync_log)
            # Don't commit here - let the calling method handle commits
            
        except Exception as e:
            self.logger.error(f"Error logging sync operation: {str(e)}")
    
    def enable_real_time_sync(self, user: User) -> bool:
        """Enable real-time synchronization for a user by creating webhook subscription."""
        try:
            subscription = self._get_or_create_webhook_subscription(user)
            return subscription is not None
        except Exception as e:
            self.logger.error(f"Error enabling real-time sync for user {user.id}: {str(e)}")
            return False
    
    def disable_real_time_sync(self, user: User) -> bool:
        """Disable real-time synchronization for a user by removing webhook subscriptions."""
        try:
            from models import GoogleCalendarWebhookSubscription
            from services.google_calendar_webhook_service import GoogleCalendarWebhookService
            
            # Get all active subscriptions for user
            subscriptions = self.db.query(GoogleCalendarWebhookSubscription).filter(
                GoogleCalendarWebhookSubscription.user_id == user.id,
                GoogleCalendarWebhookSubscription.is_active == True
            ).all()
            
            webhook_service = GoogleCalendarWebhookService(self.db)
            success_count = 0
            
            for subscription in subscriptions:
                if webhook_service.unsubscribe_from_calendar_events(subscription, user):
                    success_count += 1
            
            self.logger.info(f"Disabled {success_count} webhook subscriptions for user {user.id}")
            return success_count == len(subscriptions)
            
        except Exception as e:
            self.logger.error(f"Error disabling real-time sync for user {user.id}: {str(e)}")
            return False
    
    def get_sync_status(self, user: User) -> Dict[str, Any]:
        """Get comprehensive sync status for a user."""
        try:
            from models import GoogleCalendarWebhookSubscription, GoogleCalendarSyncLog
            
            # Check webhook subscriptions
            active_subscriptions = self.db.query(GoogleCalendarWebhookSubscription).filter(
                GoogleCalendarWebhookSubscription.user_id == user.id,
                GoogleCalendarWebhookSubscription.is_active == True
            ).count()
            
            # Get recent sync logs
            recent_syncs = self.db.query(GoogleCalendarSyncLog).filter(
                GoogleCalendarSyncLog.user_id == user.id,
                GoogleCalendarSyncLog.created_at >= datetime.utcnow() - timedelta(days=7)
            ).count()
            
            recent_errors = self.db.query(GoogleCalendarSyncLog).filter(
                GoogleCalendarSyncLog.user_id == user.id,
                GoogleCalendarSyncLog.status == "failed",
                GoogleCalendarSyncLog.created_at >= datetime.utcnow() - timedelta(days=7)
            ).count()
            
            return {
                "real_time_enabled": active_subscriptions > 0,
                "active_subscriptions": active_subscriptions,
                "recent_syncs": recent_syncs,
                "recent_errors": recent_errors,
                "error_rate": recent_errors / max(recent_syncs, 1),
                "last_sync": self.db.query(GoogleCalendarSyncLog).filter(
                    GoogleCalendarSyncLog.user_id == user.id
                ).order_by(GoogleCalendarSyncLog.created_at.desc()).first()
            }
            
        except Exception as e:
            self.logger.error(f"Error getting sync status for user {user.id}: {str(e)}")
            return {
                "real_time_enabled": False,
                "active_subscriptions": 0,
                "recent_syncs": 0,
                "recent_errors": 0,
                "error_rate": 0,
                "last_sync": None
            }