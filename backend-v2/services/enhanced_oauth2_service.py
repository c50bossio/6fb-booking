"""
Enhanced OAuth2 Service for secure Google Calendar integration.

This service provides:
- Secure OAuth2 flow with PKCE
- Encrypted token storage and rotation
- Multiple calendar support per user
- Fine-grained permission scope management
- Secure credential validation and refresh
- OAuth2 session state management
"""

import json
import logging
import secrets
import hashlib
import base64
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from google.auth.transport import requests as google_requests
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

from models import User
from config import settings
from utils.encryption import encrypt_data, decrypt_data
from services.calendar_webhook_service import CalendarWebhookService

logger = logging.getLogger(__name__)


class OAuth2State:
    """OAuth2 state management for secure flow."""
    
    def __init__(self, user_id: int, scopes: List[str], redirect_uri: str):
        self.user_id = user_id
        self.scopes = scopes
        self.redirect_uri = redirect_uri
        self.state = secrets.token_urlsafe(32)
        self.code_verifier = self._generate_code_verifier()
        self.code_challenge = self._generate_code_challenge(self.code_verifier)
        self.created_at = datetime.utcnow()
        self.expires_at = self.created_at + timedelta(minutes=10)  # Short expiration
    
    def _generate_code_verifier(self) -> str:
        """Generate PKCE code verifier."""
        return secrets.token_urlsafe(32)
    
    def _generate_code_challenge(self, verifier: str) -> str:
        """Generate PKCE code challenge."""
        digest = hashlib.sha256(verifier.encode('utf-8')).digest()
        return base64.urlsafe_b64encode(digest).decode('utf-8').rstrip('=')
    
    def is_expired(self) -> bool:
        """Check if OAuth2 state has expired."""
        return datetime.utcnow() > self.expires_at
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert state to dictionary for storage."""
        return {
            'user_id': self.user_id,
            'scopes': self.scopes,
            'redirect_uri': self.redirect_uri,
            'state': self.state,
            'code_verifier': self.code_verifier,
            'code_challenge': self.code_challenge,
            'created_at': self.created_at.isoformat(),
            'expires_at': self.expires_at.isoformat()
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'OAuth2State':
        """Create OAuth2State from dictionary."""
        instance = cls.__new__(cls)
        instance.user_id = data['user_id']
        instance.scopes = data['scopes']
        instance.redirect_uri = data['redirect_uri']
        instance.state = data['state']
        instance.code_verifier = data['code_verifier']
        instance.code_challenge = data['code_challenge']
        instance.created_at = datetime.fromisoformat(data['created_at'])
        instance.expires_at = datetime.fromisoformat(data['expires_at'])
        return instance


class UserCalendarConfig:
    """User calendar configuration for multiple calendar support."""
    
    def __init__(self, user_id: int):
        self.user_id = user_id
        self.primary_calendar_id = 'primary'
        self.enabled_calendars = ['primary']
        self.sync_preferences = {
            'auto_sync': True,
            'conflict_resolution': 'notify',  # 'notify', 'auto_reschedule', 'block'
            'sync_direction': 'bidirectional',  # 'to_google', 'from_google', 'bidirectional'
            'sync_frequency': 'real_time',  # 'real_time', 'hourly', 'daily'
            'include_personal_events': False
        }
        self.webhook_enabled = True
        self.created_at = datetime.utcnow()
        self.updated_at = datetime.utcnow()
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert config to dictionary for storage."""
        return {
            'user_id': self.user_id,
            'primary_calendar_id': self.primary_calendar_id,
            'enabled_calendars': self.enabled_calendars,
            'sync_preferences': self.sync_preferences,
            'webhook_enabled': self.webhook_enabled,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'UserCalendarConfig':
        """Create UserCalendarConfig from dictionary."""
        instance = cls.__new__(cls)
        instance.user_id = data['user_id']
        instance.primary_calendar_id = data['primary_calendar_id']
        instance.enabled_calendars = data['enabled_calendars']
        instance.sync_preferences = data['sync_preferences']
        instance.webhook_enabled = data['webhook_enabled']
        instance.created_at = datetime.fromisoformat(data['created_at'])
        instance.updated_at = datetime.fromisoformat(data['updated_at'])
        return instance


class EnhancedOAuth2Service:
    """Enhanced OAuth2 service with security improvements."""
    
    def __init__(self, db: Session):
        self.db = db
        self.client_id = getattr(settings, 'GOOGLE_CLIENT_ID', None)
        self.client_secret = getattr(settings, 'GOOGLE_CLIENT_SECRET', None)
        self.base_redirect_uri = getattr(settings, 'GOOGLE_REDIRECT_URI', 'http://localhost:8000/api/v1/calendar/callback')
        
        # Enhanced scopes for comprehensive calendar access
        self.scopes = [
            'https://www.googleapis.com/auth/calendar',
            'https://www.googleapis.com/auth/calendar.events',
            'https://www.googleapis.com/auth/calendar.readonly'
        ]
        
        # In-memory state storage (in production, use Redis or database)
        self._oauth_states: Dict[str, OAuth2State] = {}
    
    def initiate_oauth_flow(
        self, 
        user: User, 
        redirect_uri: Optional[str] = None,
        additional_scopes: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Initiate enhanced OAuth2 flow with PKCE.
        
        Args:
            user: User initiating the flow
            redirect_uri: Custom redirect URI
            additional_scopes: Additional OAuth scopes
            
        Returns:
            Dictionary with authorization URL and state information
        """
        try:
            # Prepare scopes
            flow_scopes = self.scopes.copy()
            if additional_scopes:
                flow_scopes.extend(additional_scopes)
            
            # Use provided redirect URI or default
            final_redirect_uri = redirect_uri or self.base_redirect_uri
            
            # Create OAuth2 state
            oauth_state = OAuth2State(user.id, flow_scopes, final_redirect_uri)
            
            # Store state securely (encrypt in production)
            self._oauth_states[oauth_state.state] = oauth_state
            
            # Create Google OAuth2 flow configuration
            flow_config = {
                "web": {
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [final_redirect_uri]
                }
            }
            
            # Create flow with PKCE
            flow = Flow.from_client_config(flow_config, scopes=flow_scopes)
            flow.redirect_uri = final_redirect_uri
            
            # Generate authorization URL with PKCE
            authorization_url, _ = flow.authorization_url(
                access_type='offline',
                include_granted_scopes='true',
                prompt='consent',
                state=oauth_state.state,
                code_challenge=oauth_state.code_challenge,
                code_challenge_method='S256'
            )
            
            logger.info(f"Initiated OAuth2 flow for user {user.id} with state {oauth_state.state}")
            
            return {
                'authorization_url': authorization_url,
                'state': oauth_state.state,
                'expires_in': 600,  # 10 minutes
                'scopes': flow_scopes
            }
            
        except Exception as e:
            logger.error(f"Error initiating OAuth2 flow for user {user.id}: {e}")
            raise Exception(f"Failed to initiate OAuth2 flow: {str(e)}")
    
    def handle_oauth_callback(
        self, 
        authorization_code: str, 
        state: str
    ) -> Dict[str, Any]:
        """
        Handle OAuth2 callback with enhanced security validation.
        
        Args:
            authorization_code: Authorization code from Google
            state: State parameter from OAuth flow
            
        Returns:
            Dictionary with callback processing results
        """
        try:
            # Retrieve and validate OAuth state
            oauth_state = self._oauth_states.get(state)
            if not oauth_state:
                raise Exception("Invalid or expired OAuth state")
            
            if oauth_state.is_expired():
                del self._oauth_states[state]
                raise Exception("OAuth state has expired")
            
            # Get user
            user = self.db.query(User).filter(User.id == oauth_state.user_id).first()
            if not user:
                raise Exception("User not found")
            
            # Create flow configuration
            flow_config = {
                "web": {
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [oauth_state.redirect_uri]
                }
            }
            
            # Create flow and exchange code for tokens
            flow = Flow.from_client_config(flow_config, scopes=oauth_state.scopes)
            flow.redirect_uri = oauth_state.redirect_uri
            
            # Set PKCE code verifier
            flow.code_verifier = oauth_state.code_verifier
            
            # Exchange authorization code for tokens
            flow.fetch_token(code=authorization_code)
            credentials = flow.credentials
            
            # Validate credentials
            if not credentials or not credentials.token:
                raise Exception("Failed to obtain valid credentials")
            
            # Store encrypted credentials
            self._store_user_credentials(user, credentials)
            
            # Set up default calendar configuration
            self._initialize_user_calendar_config(user)
            
            # Set up webhook notifications if enabled
            webhook_service = CalendarWebhookService(self.db)
            webhook_service.setup_calendar_watch(user)
            
            # Clean up OAuth state
            del self._oauth_states[state]
            
            logger.info(f"Successfully processed OAuth2 callback for user {user.id}")
            
            return {
                'success': True,
                'user_id': user.id,
                'scopes_granted': credentials.scopes,
                'message': 'Google Calendar connected successfully'
            }
            
        except Exception as e:
            logger.error(f"Error handling OAuth2 callback: {e}")
            # Clean up OAuth state on error
            if state in self._oauth_states:
                del self._oauth_states[state]
            raise Exception(f"OAuth callback failed: {str(e)}")
    
    def _store_user_credentials(self, user: User, credentials: Credentials) -> None:
        """
        Store user credentials with enhanced encryption.
        
        Args:
            user: User to store credentials for
            credentials: Google OAuth2 credentials
        """
        try:
            # Prepare credentials data
            creds_data = {
                'token': credentials.token,
                'refresh_token': credentials.refresh_token,
                'token_uri': credentials.token_uri,
                'client_id': credentials.client_id,
                'client_secret': credentials.client_secret,
                'scopes': credentials.scopes,
                'expiry': credentials.expiry.isoformat() if credentials.expiry else None,
                'stored_at': datetime.utcnow().isoformat()
            }
            
            # Encrypt and store credentials
            user.google_calendar_credentials = encrypt_data(json.dumps(creds_data))
            self.db.commit()
            
            logger.info(f"Stored encrypted credentials for user {user.id}")
            
        except Exception as e:
            logger.error(f"Error storing credentials for user {user.id}: {e}")
            raise
    
    def _initialize_user_calendar_config(self, user: User) -> None:
        """
        Initialize default calendar configuration for user.
        
        Args:
            user: User to initialize config for
        """
        try:
            config = UserCalendarConfig(user.id)
            
            # Store encrypted config
            user.google_calendar_config = encrypt_data(json.dumps(config.to_dict()))
            self.db.commit()
            
            logger.info(f"Initialized calendar config for user {user.id}")
            
        except Exception as e:
            logger.error(f"Error initializing calendar config for user {user.id}: {e}")
    
    def get_user_credentials(self, user: User) -> Optional[Credentials]:
        """
        Get and refresh user credentials with enhanced validation.
        
        Args:
            user: User to get credentials for
            
        Returns:
            Valid Google OAuth2 credentials or None
        """
        try:
            if not user.google_calendar_credentials:
                return None
            
            # Decrypt credentials data
            creds_data = json.loads(decrypt_data(user.google_calendar_credentials))
            
            # Create credentials object
            credentials = Credentials(
                token=creds_data.get('token'),
                refresh_token=creds_data.get('refresh_token'),
                token_uri=creds_data.get('token_uri'),
                client_id=creds_data.get('client_id'),
                client_secret=creds_data.get('client_secret'),
                scopes=creds_data.get('scopes')
            )
            
            # Set expiry if available
            if creds_data.get('expiry'):
                credentials.expiry = datetime.fromisoformat(creds_data['expiry'])
            
            # Refresh credentials if needed
            if credentials.expired and credentials.refresh_token:
                try:
                    credentials.refresh(google_requests.Request())
                    
                    # Update stored credentials
                    self._store_user_credentials(user, credentials)
                    
                    logger.info(f"Refreshed credentials for user {user.id}")
                    
                except Exception as e:
                    logger.error(f"Failed to refresh credentials for user {user.id}: {e}")
                    return None
            
            return credentials
            
        except Exception as e:
            logger.error(f"Error getting credentials for user {user.id}: {e}")
            return None
    
    def get_user_calendar_config(self, user: User) -> Optional[UserCalendarConfig]:
        """
        Get user's calendar configuration.
        
        Args:
            user: User to get config for
            
        Returns:
            UserCalendarConfig or None
        """
        try:
            if not user.google_calendar_config:
                return None
            
            config_data = json.loads(decrypt_data(user.google_calendar_config))
            return UserCalendarConfig.from_dict(config_data)
            
        except Exception as e:
            logger.error(f"Error getting calendar config for user {user.id}: {e}")
            return None
    
    def update_user_calendar_config(
        self, 
        user: User, 
        config_updates: Dict[str, Any]
    ) -> bool:
        """
        Update user's calendar configuration.
        
        Args:
            user: User to update config for
            config_updates: Dictionary with config updates
            
        Returns:
            True if successful, False otherwise
        """
        try:
            config = self.get_user_calendar_config(user)
            if not config:
                config = UserCalendarConfig(user.id)
            
            # Update configuration
            if 'primary_calendar_id' in config_updates:
                config.primary_calendar_id = config_updates['primary_calendar_id']
            
            if 'enabled_calendars' in config_updates:
                config.enabled_calendars = config_updates['enabled_calendars']
            
            if 'sync_preferences' in config_updates:
                config.sync_preferences.update(config_updates['sync_preferences'])
            
            if 'webhook_enabled' in config_updates:
                config.webhook_enabled = config_updates['webhook_enabled']
            
            config.updated_at = datetime.utcnow()
            
            # Store updated config
            user.google_calendar_config = encrypt_data(json.dumps(config.to_dict()))
            self.db.commit()
            
            logger.info(f"Updated calendar config for user {user.id}")
            return True
            
        except Exception as e:
            logger.error(f"Error updating calendar config for user {user.id}: {e}")
            return False
    
    def validate_user_permissions(self, user: User) -> Dict[str, Any]:
        """
        Validate user's current OAuth permissions and calendar access.
        
        Args:
            user: User to validate permissions for
            
        Returns:
            Dictionary with validation results
        """
        validation_result = {
            'valid_credentials': False,
            'has_calendar_access': False,
            'has_events_access': False,
            'scopes_granted': [],
            'calendars_accessible': 0,
            'errors': []
        }
        
        try:
            credentials = self.get_user_credentials(user)
            if not credentials:
                validation_result['errors'].append("No valid credentials found")
                return validation_result
            
            validation_result['valid_credentials'] = True
            validation_result['scopes_granted'] = credentials.scopes or []
            
            # Test calendar access
            try:
                service = build('calendar', 'v3', credentials=credentials)
                
                # Test calendar list access
                calendars_result = service.calendarList().list(maxResults=1).execute()
                validation_result['has_calendar_access'] = True
                
                # Count accessible calendars
                all_calendars = service.calendarList().list().execute()
                validation_result['calendars_accessible'] = len(all_calendars.get('items', []))
                
                # Test events access
                calendar_id = user.google_calendar_id or 'primary'
                events_result = service.events().list(
                    calendarId=calendar_id,
                    maxResults=1
                ).execute()
                validation_result['has_events_access'] = True
                
            except HttpError as e:
                if e.resp.status == 403:
                    validation_result['errors'].append("Insufficient permissions for calendar access")
                else:
                    validation_result['errors'].append(f"Calendar API error: {e}")
            
        except Exception as e:
            validation_result['errors'].append(f"Validation error: {str(e)}")
        
        return validation_result
    
    def revoke_user_access(self, user: User) -> bool:
        """
        Revoke user's Google Calendar access and clean up.
        
        Args:
            user: User to revoke access for
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Stop webhook notifications
            webhook_service = CalendarWebhookService(self.db)
            webhook_service.stop_calendar_watch(user)
            
            # Revoke Google credentials if possible
            credentials = self.get_user_credentials(user)
            if credentials and credentials.token:
                try:
                    # Revoke token with Google
                    revoke_url = f"https://oauth2.googleapis.com/revoke?token={credentials.token}"
                    response = google_requests.Request().method(
                        'POST', revoke_url,
                        headers={'content-type': 'application/x-www-form-urlencoded'}
                    )
                except Exception as e:
                    logger.warning(f"Could not revoke Google token for user {user.id}: {e}")
            
            # Clear stored data
            user.google_calendar_credentials = None
            user.google_calendar_config = None
            user.google_calendar_id = None
            user.google_calendar_watch_info = None
            user.google_calendar_sync_state = None
            
            self.db.commit()
            
            logger.info(f"Revoked calendar access for user {user.id}")
            return True
            
        except Exception as e:
            logger.error(f"Error revoking access for user {user.id}: {e}")
            return False
    
    def cleanup_expired_states(self) -> int:
        """
        Clean up expired OAuth states.
        
        Returns:
            Number of states cleaned up
        """
        try:
            expired_states = [
                state_id for state_id, oauth_state in self._oauth_states.items()
                if oauth_state.is_expired()
            ]
            
            for state_id in expired_states:
                del self._oauth_states[state_id]
            
            logger.info(f"Cleaned up {len(expired_states)} expired OAuth states")
            return len(expired_states)
            
        except Exception as e:
            logger.error(f"Error cleaning up expired states: {e}")
            return 0


def get_enhanced_oauth_service(db: Session) -> EnhancedOAuth2Service:
    """
    Get enhanced OAuth2 service instance.
    
    Args:
        db: Database session
        
    Returns:
        EnhancedOAuth2Service instance
    """
    return EnhancedOAuth2Service(db)