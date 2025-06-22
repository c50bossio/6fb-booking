"""
Google Calendar Integration Service
Handles synchronization between the 6FB booking system and Google Calendar
"""
import os
import pickle
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from google.auth.transport.requests import Request
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials
from google.auth.exceptions import RefreshError
import logging

from config.settings import get_settings
from models.appointment import Appointment
from models.barber import Barber

logger = logging.getLogger(__name__)
settings = get_settings()

class GoogleCalendarService:
    """
    Google Calendar integration service for syncing appointments
    """
    
    # Calendar API scopes
    SCOPES = ['https://www.googleapis.com/auth/calendar']
    
    def __init__(self):
        self.credentials_cache = {}
        self._ensure_credentials_directory()
    
    def _ensure_credentials_directory(self):
        """Ensure the credentials directory exists"""
        creds_dir = os.path.join(os.getcwd(), 'credentials')
        if not os.path.exists(creds_dir):
            os.makedirs(creds_dir)
    
    def _get_credentials_file_path(self, barber_id: int) -> str:
        """Get the file path for storing barber's credentials"""
        return f"credentials/barber_{barber_id}_calendar_token.pickle"
    
    def _get_oauth_config(self) -> Dict[str, Any]:
        """Get OAuth configuration from environment variables"""
        return {
            "web": {
                "client_id": os.getenv("GOOGLE_CALENDAR_CLIENT_ID"),
                "client_secret": os.getenv("GOOGLE_CALENDAR_CLIENT_SECRET"),
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [
                    os.getenv("GOOGLE_CALENDAR_REDIRECT_URI", "http://localhost:8000/api/v1/calendar/oauth/callback")
                ]
            }
        }
    
    def get_authorization_url(self, barber_id: int, state: Optional[str] = None) -> str:
        """
        Generate Google OAuth authorization URL for barber
        """
        try:
            oauth_config = self._get_oauth_config()
            if not oauth_config["web"]["client_id"]:
                raise ValueError("Google Calendar OAuth not configured. Please set GOOGLE_CALENDAR_CLIENT_ID and GOOGLE_CALENDAR_CLIENT_SECRET environment variables.")
            
            flow = Flow.from_client_config(
                oauth_config,
                scopes=self.SCOPES,
                state=state or str(barber_id)
            )
            
            flow.redirect_uri = oauth_config["web"]["redirect_uris"][0]
            
            auth_url, _ = flow.authorization_url(
                access_type='offline',
                include_granted_scopes='true',
                prompt='consent'  # Force consent to get refresh token
            )
            
            return auth_url
            
        except Exception as e:
            logger.error(f"Error generating authorization URL for barber {barber_id}: {str(e)}")
            raise
    
    def handle_oauth_callback(self, barber_id: int, authorization_code: str) -> bool:
        """
        Handle OAuth callback and store credentials
        """
        try:
            oauth_config = self._get_oauth_config()
            flow = Flow.from_client_config(
                oauth_config,
                scopes=self.SCOPES,
                state=str(barber_id)
            )
            
            flow.redirect_uri = oauth_config["web"]["redirect_uris"][0]
            flow.fetch_token(code=authorization_code)
            
            # Store credentials
            credentials = flow.credentials
            self._save_credentials(barber_id, credentials)
            
            logger.info(f"Successfully connected Google Calendar for barber {barber_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error handling OAuth callback for barber {barber_id}: {str(e)}")
            return False
    
    def _save_credentials(self, barber_id: int, credentials: Credentials):
        """Save credentials to file and cache"""
        credentials_file = self._get_credentials_file_path(barber_id)
        
        with open(credentials_file, 'wb') as token:
            pickle.dump(credentials, token)
        
        self.credentials_cache[barber_id] = credentials
    
    def _load_credentials(self, barber_id: int) -> Optional[Credentials]:
        """Load credentials from cache or file"""
        # Check cache first
        if barber_id in self.credentials_cache:
            return self.credentials_cache[barber_id]
        
        # Load from file
        credentials_file = self._get_credentials_file_path(barber_id)
        
        if not os.path.exists(credentials_file):
            return None
        
        try:
            with open(credentials_file, 'rb') as token:
                credentials = pickle.load(token)
            
            # Refresh if expired
            if credentials and credentials.expired and credentials.refresh_token:
                credentials.refresh(Request())
                self._save_credentials(barber_id, credentials)
            
            self.credentials_cache[barber_id] = credentials
            return credentials
            
        except (FileNotFoundError, pickle.UnpicklingError, RefreshError) as e:
            logger.warning(f"Could not load credentials for barber {barber_id}: {str(e)}")
            return None
    
    def is_connected(self, barber_id: int) -> bool:
        """Check if barber has connected Google Calendar"""
        credentials = self._load_credentials(barber_id)
        return credentials is not None and credentials.valid
    
    def disconnect(self, barber_id: int) -> bool:
        """Disconnect Google Calendar for barber"""
        try:
            credentials_file = self._get_credentials_file_path(barber_id)
            
            if os.path.exists(credentials_file):
                os.remove(credentials_file)
            
            if barber_id in self.credentials_cache:
                del self.credentials_cache[barber_id]
            
            logger.info(f"Disconnected Google Calendar for barber {barber_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error disconnecting Google Calendar for barber {barber_id}: {str(e)}")
            return False
    
    def get_calendar_service(self, barber_id: int):
        """Get authenticated Google Calendar service"""
        credentials = self._load_credentials(barber_id)
        
        if not credentials or not credentials.valid:
            raise ValueError(f"No valid Google Calendar credentials for barber {barber_id}")
        
        return build('calendar', 'v3', credentials=credentials)
    
    def create_calendar_event(self, barber_id: int, appointment: Appointment) -> Optional[str]:
        """
        Create Google Calendar event from appointment
        Returns the Google Calendar event ID if successful
        """
        try:
            if not self.is_connected(barber_id):
                logger.warning(f"Google Calendar not connected for barber {barber_id}")
                return None
            
            service = self.get_calendar_service(barber_id)
            
            # Combine date and time
            start_datetime = datetime.combine(
                appointment.appointment_date,
                appointment.appointment_time.time() if appointment.appointment_time else datetime.now().time()
            )
            
            # Calculate end time
            duration = appointment.service_duration or 60
            end_datetime = start_datetime + timedelta(minutes=duration)
            
            # Create event
            event = {
                'summary': f'{appointment.service_name} - {appointment.client_name}',
                'description': self._format_appointment_description(appointment),
                'start': {
                    'dateTime': start_datetime.isoformat(),
                    'timeZone': 'America/New_York',  # TODO: Use barber's timezone
                },
                'end': {
                    'dateTime': end_datetime.isoformat(),
                    'timeZone': 'America/New_York',
                },
                'attendees': [],
                'reminders': {
                    'useDefault': False,
                    'overrides': [
                        {'method': 'email', 'minutes': 24 * 60},  # 1 day before
                        {'method': 'popup', 'minutes': 15},       # 15 minutes before
                    ],
                },
            }
            
            # Add client email if available
            if appointment.client_email:
                event['attendees'].append({
                    'email': appointment.client_email,
                    'displayName': appointment.client_name
                })
            
            # Insert event
            created_event = service.events().insert(
                calendarId='primary',
                body=event,
                sendUpdates='all' if appointment.client_email else 'none'
            ).execute()
            
            event_id = created_event.get('id')
            logger.info(f"Created Google Calendar event {event_id} for appointment {appointment.id}")
            
            return event_id
            
        except Exception as e:
            logger.error(f"Error creating Google Calendar event for appointment {appointment.id}: {str(e)}")
            return None
    
    def update_calendar_event(self, barber_id: int, event_id: str, appointment: Appointment) -> bool:
        """Update existing Google Calendar event"""
        try:
            if not self.is_connected(barber_id):
                logger.warning(f"Google Calendar not connected for barber {barber_id}")
                return False
            
            service = self.get_calendar_service(barber_id)
            
            # Get existing event
            existing_event = service.events().get(
                calendarId='primary',
                eventId=event_id
            ).execute()
            
            # Update event fields
            start_datetime = datetime.combine(
                appointment.appointment_date,
                appointment.appointment_time.time() if appointment.appointment_time else datetime.now().time()
            )
            
            duration = appointment.service_duration or 60
            end_datetime = start_datetime + timedelta(minutes=duration)
            
            existing_event.update({
                'summary': f'{appointment.service_name} - {appointment.client_name}',
                'description': self._format_appointment_description(appointment),
                'start': {
                    'dateTime': start_datetime.isoformat(),
                    'timeZone': 'America/New_York',
                },
                'end': {
                    'dateTime': end_datetime.isoformat(),
                    'timeZone': 'America/New_York',
                },
            })
            
            # Update attendees
            attendees = []
            if appointment.client_email:
                attendees.append({
                    'email': appointment.client_email,
                    'displayName': appointment.client_name
                })
            existing_event['attendees'] = attendees
            
            # Update event
            service.events().update(
                calendarId='primary',
                eventId=event_id,
                body=existing_event,
                sendUpdates='all' if appointment.client_email else 'none'
            ).execute()
            
            logger.info(f"Updated Google Calendar event {event_id} for appointment {appointment.id}")
            return True
            
        except Exception as e:
            logger.error(f"Error updating Google Calendar event {event_id}: {str(e)}")
            return False
    
    def delete_calendar_event(self, barber_id: int, event_id: str) -> bool:
        """Delete Google Calendar event"""
        try:
            if not self.is_connected(barber_id):
                logger.warning(f"Google Calendar not connected for barber {barber_id}")
                return False
            
            service = self.get_calendar_service(barber_id)
            
            service.events().delete(
                calendarId='primary',
                eventId=event_id,
                sendUpdates='all'
            ).execute()
            
            logger.info(f"Deleted Google Calendar event {event_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error deleting Google Calendar event {event_id}: {str(e)}")
            return False
    
    def sync_appointment(self, appointment: Appointment, action: str = 'create') -> Optional[str]:
        """
        Sync appointment with Google Calendar
        Actions: 'create', 'update', 'delete'
        """
        try:
            barber_id = appointment.barber_id
            
            if not self.is_connected(barber_id):
                logger.debug(f"Google Calendar not connected for barber {barber_id}, skipping sync")
                return None
            
            if action == 'create':
                return self.create_calendar_event(barber_id, appointment)
            
            elif action == 'update' and hasattr(appointment, 'google_calendar_event_id') and appointment.google_calendar_event_id:
                success = self.update_calendar_event(barber_id, appointment.google_calendar_event_id, appointment)
                return appointment.google_calendar_event_id if success else None
            
            elif action == 'delete' and hasattr(appointment, 'google_calendar_event_id') and appointment.google_calendar_event_id:
                success = self.delete_calendar_event(barber_id, appointment.google_calendar_event_id)
                return None if success else appointment.google_calendar_event_id
            
            return None
            
        except Exception as e:
            logger.error(f"Error syncing appointment {appointment.id} with Google Calendar: {str(e)}")
            return None
    
    def _format_appointment_description(self, appointment: Appointment) -> str:
        """Format appointment description for Google Calendar"""
        description_parts = [
            f"Service: {appointment.service_name}",
            f"Client: {appointment.client_name}",
        ]
        
        if appointment.client_phone:
            description_parts.append(f"Phone: {appointment.client_phone}")
        
        if appointment.client_email:
            description_parts.append(f"Email: {appointment.client_email}")
        
        if appointment.service_price:
            description_parts.append(f"Price: ${appointment.service_price}")
        
        if appointment.notes:
            description_parts.append(f"Notes: {appointment.notes}")
        
        description_parts.append(f"Booking ID: {appointment.id}")
        
        return "\n".join(description_parts)
    
    def get_calendar_events(self, barber_id: int, start_date: datetime, end_date: datetime) -> List[Dict[str, Any]]:
        """Get Google Calendar events for a date range"""
        try:
            if not self.is_connected(barber_id):
                return []
            
            service = self.get_calendar_service(barber_id)
            
            events_result = service.events().list(
                calendarId='primary',
                timeMin=start_date.isoformat() + 'Z',
                timeMax=end_date.isoformat() + 'Z',
                singleEvents=True,
                orderBy='startTime'
            ).execute()
            
            events = events_result.get('items', [])
            
            return events
            
        except Exception as e:
            logger.error(f"Error getting Google Calendar events for barber {barber_id}: {str(e)}")
            return []
    
    def get_connection_status(self, barber_id: int) -> Dict[str, Any]:
        """Get detailed connection status for barber"""
        try:
            credentials = self._load_credentials(barber_id)
            
            if not credentials:
                return {
                    'connected': False,
                    'status': 'not_connected',
                    'message': 'Google Calendar not connected'
                }
            
            if not credentials.valid:
                return {
                    'connected': False,
                    'status': 'invalid_credentials',
                    'message': 'Google Calendar credentials are invalid'
                }
            
            if credentials.expired:
                return {
                    'connected': True,
                    'status': 'expired',
                    'message': 'Google Calendar credentials expired but can be refreshed'
                }
            
            return {
                'connected': True,
                'status': 'active',
                'message': 'Google Calendar connected and active'
            }
            
        except Exception as e:
            return {
                'connected': False,
                'status': 'error',
                'message': f'Error checking connection status: {str(e)}'
            }

# Global instance
google_calendar_service = GoogleCalendarService()