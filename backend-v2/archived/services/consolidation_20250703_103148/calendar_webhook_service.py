"""
Google Calendar Webhook Service for real-time notifications.

This service handles:
- Google Calendar push notifications setup
- Webhook validation and processing
- Real-time event change detection
- Automatic two-way synchronization
- Event conflict resolution
"""

import json
import logging
import uuid
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session

from models import User
from services.enhanced_google_calendar_service import enhanced_google_calendar_service
from config import settings
from utils.encryption import encrypt_data, decrypt_data

logger = logging.getLogger(__name__)


class CalendarWebhook:
    """Data class for calendar webhook notifications."""
    
    def __init__(self, data: Dict[str, Any]):
        self.channel_id = data.get('channelId')
        self.resource_id = data.get('resourceId')
        self.resource_uri = data.get('resourceUri')
        self.resource_state = data.get('resourceState')
        self.changed = data.get('changed')
        self.sync_token = data.get('syncToken')
        self.user_id = self._extract_user_id_from_channel_id()
    
    def _extract_user_id_from_channel_id(self) -> Optional[int]:
        """Extract user ID from channel ID format: user_{id}_{uuid}"""
        if not self.channel_id:
            return None
        try:
            parts = self.channel_id.split('_')
            if len(parts) >= 2 and parts[0] == 'user':
                return int(parts[1])
        except (ValueError, IndexError):
            logger.warning(f"Could not extract user ID from channel ID: {self.channel_id}")
        return None


class CalendarWebhookService:
    """Service for managing Google Calendar webhook notifications."""
    
    def __init__(self, db: Session):
        self.db = db
        self.webhook_secret = getattr(settings, 'GOOGLE_WEBHOOK_SECRET', None)
        self.webhook_url = getattr(settings, 'GOOGLE_WEBHOOK_URL', 'http://localhost:8000/api/v1/calendar/webhook')
        
    def setup_calendar_watch(self, user: User) -> Optional[str]:
        """
        Set up push notifications for a user's Google Calendar.
        
        Args:
            user: User to set up notifications for
            
        Returns:
            Channel ID if successful, None otherwise
        """
        try:
            credentials = enhanced_google_calendar_service.get_user_credentials(user)
            if not credentials:
                logger.error(f"No credentials found for user {user.id}")
                return None
            
            service = enhanced_google_calendar_service.build_service(credentials)
            calendar_id = user.google_calendar_id or 'primary'
            
            # Generate unique channel ID
            channel_id = f"user_{user.id}_{uuid.uuid4().hex[:8]}"
            
            # Set up watch request
            watch_request = {
                'id': channel_id,
                'type': 'web_hook',
                'address': self.webhook_url,
                'params': {
                    'ttl': '3600'  # 1 hour TTL
                }
            }
            
            # Add webhook secret token for verification
            if self.webhook_secret:
                watch_request['token'] = self.webhook_secret
            
            # Execute watch request
            watch_result = service.events().watch(
                calendarId=calendar_id,
                body=watch_request
            ).execute()
            
            # Store watch information in user model
            watch_info = {
                'channel_id': channel_id,
                'resource_id': watch_result.get('resourceId'),
                'expiration': watch_result.get('expiration'),
                'created_at': datetime.utcnow().isoformat()
            }
            
            # Encrypt and store watch info
            user.google_calendar_watch_info = encrypt_data(json.dumps(watch_info))
            self.db.commit()
            
            logger.info(f"Set up calendar watch for user {user.id} with channel {channel_id}")
            return channel_id
            
        except Exception as e:
            logger.error(f"Failed to set up calendar watch for user {user.id}: {e}")
            return None
    
    def stop_calendar_watch(self, user: User) -> bool:
        """
        Stop push notifications for a user's Google Calendar.
        
        Args:
            user: User to stop notifications for
            
        Returns:
            True if successful, False otherwise
        """
        try:
            if not user.google_calendar_watch_info:
                return True  # No watch to stop
            
            # Decrypt watch info
            watch_info = json.loads(decrypt_data(user.google_calendar_watch_info))
            
            credentials = enhanced_google_calendar_service.get_user_credentials(user)
            if not credentials:
                logger.warning(f"No credentials found for user {user.id}, clearing watch info")
                user.google_calendar_watch_info = None
                self.db.commit()
                return True
            
            service = enhanced_google_calendar_service.build_service(credentials)
            
            # Stop the watch channel
            stop_request = {
                'id': watch_info['channel_id'],
                'resourceId': watch_info['resource_id']
            }
            
            service.channels().stop(body=stop_request).execute()
            
            # Clear watch info from user
            user.google_calendar_watch_info = None
            self.db.commit()
            
            logger.info(f"Stopped calendar watch for user {user.id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to stop calendar watch for user {user.id}: {e}")
            # Clear watch info even if stop failed
            user.google_calendar_watch_info = None
            self.db.commit()
            return False
    
    def refresh_calendar_watch(self, user: User) -> bool:
        """
        Refresh calendar watch before expiration.
        
        Args:
            user: User to refresh watch for
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Stop existing watch
            self.stop_calendar_watch(user)
            
            # Set up new watch
            channel_id = self.setup_calendar_watch(user)
            return channel_id is not None
            
        except Exception as e:
            logger.error(f"Failed to refresh calendar watch for user {user.id}: {e}")
            return False
    
    def verify_webhook_signature(self, headers: Dict[str, str], body: bytes) -> bool:
        """
        Verify webhook signature for security.
        
        Args:
            headers: Request headers
            body: Request body
            
        Returns:
            True if signature is valid, False otherwise
        """
        if not self.webhook_secret:
            logger.warning("No webhook secret configured, skipping signature verification")
            return True
        
        try:
            # Get signature from headers
            signature = headers.get('X-Goog-Channel-Token')
            if signature != self.webhook_secret:
                logger.error("Invalid webhook token")
                return False
            
            return True
            
        except Exception as e:
            logger.error(f"Error verifying webhook signature: {e}")
            return False
    
    def process_webhook_notification(self, headers: Dict[str, str], body: bytes) -> bool:
        """
        Process incoming webhook notification from Google Calendar.
        
        Args:
            headers: Request headers
            body: Request body
            
        Returns:
            True if processed successfully, False otherwise
        """
        try:
            # Verify webhook signature
            if not self.verify_webhook_signature(headers, body):
                logger.error("Webhook signature verification failed")
                return False
            
            # Extract webhook data from headers
            webhook_data = {
                'channelId': headers.get('X-Goog-Channel-ID'),
                'resourceId': headers.get('X-Goog-Resource-ID'),
                'resourceUri': headers.get('X-Goog-Resource-URI'),
                'resourceState': headers.get('X-Goog-Resource-State'),
                'changed': headers.get('X-Goog-Changed'),
                'syncToken': headers.get('X-Goog-Channel-Token')
            }
            
            webhook = CalendarWebhook(webhook_data)
            
            # Log the notification
            logger.info(f"Received calendar webhook notification for channel {webhook.channel_id}, state: {webhook.resource_state}")
            
            # Skip sync notifications and only process actual changes
            if webhook.resource_state == 'sync':
                logger.info("Skipping sync notification")
                return True
            
            # Get user from channel ID
            if not webhook.user_id:
                logger.error(f"Could not extract user ID from channel {webhook.channel_id}")
                return False
            
            user = self.db.query(User).filter(User.id == webhook.user_id).first()
            if not user:
                logger.error(f"User {webhook.user_id} not found")
                return False
            
            # Process the calendar change
            return self._process_calendar_change(user, webhook)
            
        except Exception as e:
            logger.error(f"Error processing webhook notification: {e}")
            return False
    
    def _process_calendar_change(self, user: User, webhook: CalendarWebhook) -> bool:
        """
        Process calendar change notification and sync with our appointments.
        
        Args:
            user: User whose calendar changed
            webhook: Webhook notification data
            
        Returns:
            True if processed successfully, False otherwise
        """
        try:
            # Import the two-way sync service
            from services.calendar_twoway_sync_service import CalendarTwoWaySyncService
            
            sync_service = CalendarTwoWaySyncService(self.db)
            
            # Trigger incremental sync for the user
            sync_result = sync_service.sync_from_google_calendar(user, incremental=True)
            
            logger.info(f"Processed calendar change for user {user.id}: {sync_result}")
            return True
            
        except Exception as e:
            logger.error(f"Error processing calendar change for user {user.id}: {e}")
            return False
    
    def get_watch_status(self, user: User) -> Dict[str, Any]:
        """
        Get current watch status for a user.
        
        Args:
            user: User to check watch status for
            
        Returns:
            Dictionary with watch status information
        """
        try:
            if not user.google_calendar_watch_info:
                return {
                    'active': False,
                    'channel_id': None,
                    'expiration': None,
                    'expires_soon': False
                }
            
            # Decrypt watch info
            watch_info = json.loads(decrypt_data(user.google_calendar_watch_info))
            
            # Check if watch is expiring soon (within 1 hour)
            expiration_timestamp = int(watch_info['expiration']) / 1000  # Convert from milliseconds
            expiration_datetime = datetime.fromtimestamp(expiration_timestamp)
            expires_soon = expiration_datetime < datetime.utcnow() + timedelta(hours=1)
            
            return {
                'active': True,
                'channel_id': watch_info['channel_id'],
                'expiration': expiration_datetime.isoformat(),
                'expires_soon': expires_soon,
                'resource_id': watch_info.get('resource_id'),
                'created_at': watch_info.get('created_at')
            }
            
        except Exception as e:
            logger.error(f"Error getting watch status for user {user.id}: {e}")
            return {
                'active': False,
                'error': str(e)
            }
    
    def maintain_active_watches(self) -> Dict[str, Any]:
        """
        Maintain active watches by refreshing those that are expiring soon.
        This should be called periodically by a background job.
        
        Returns:
            Dictionary with maintenance results
        """
        results = {
            'checked': 0,
            'refreshed': 0,
            'failed': 0,
            'errors': []
        }
        
        try:
            # Get all users with active watch info
            users_with_watches = self.db.query(User).filter(
                User.google_calendar_watch_info.isnot(None)
            ).all()
            
            for user in users_with_watches:
                results['checked'] += 1
                
                try:
                    watch_status = self.get_watch_status(user)
                    
                    if watch_status.get('expires_soon'):
                        logger.info(f"Refreshing expiring watch for user {user.id}")
                        if self.refresh_calendar_watch(user):
                            results['refreshed'] += 1
                        else:
                            results['failed'] += 1
                            results['errors'].append(f"Failed to refresh watch for user {user.id}")
                    
                except Exception as e:
                    results['failed'] += 1
                    results['errors'].append(f"Error maintaining watch for user {user.id}: {str(e)}")
            
            logger.info(f"Watch maintenance complete: {results}")
            return results
            
        except Exception as e:
            logger.error(f"Error during watch maintenance: {e}")
            results['errors'].append(f"Watch maintenance error: {str(e)}")
            return results


def setup_calendar_watch_for_user(db: Session, user: User) -> bool:
    """
    Convenience function to set up calendar watch for a user.
    
    Args:
        db: Database session
        user: User to set up watch for
        
    Returns:
        True if successful, False otherwise
    """
    webhook_service = CalendarWebhookService(db)
    channel_id = webhook_service.setup_calendar_watch(user)
    return channel_id is not None


def stop_calendar_watch_for_user(db: Session, user: User) -> bool:
    """
    Convenience function to stop calendar watch for a user.
    
    Args:
        db: Database session
        user: User to stop watch for
        
    Returns:
        True if successful, False otherwise
    """
    webhook_service = CalendarWebhookService(db)
    return webhook_service.stop_calendar_watch(user)