"""
Google Calendar Webhook Service for BookedBarber V2
Manages webhook subscriptions, processes notifications, and handles real-time synchronization
"""

import json
import logging
import uuid
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from googleapiclient.errors import HttpError

from models import (
    User, Appointment, GoogleCalendarSettings, GoogleCalendarWebhookSubscription,
    GoogleCalendarWebhookNotification, GoogleCalendarSyncEvent, 
    GoogleCalendarConflictResolution, GoogleCalendarSyncLog
)
from services.google_calendar_service import GoogleCalendarService, GoogleCalendarError
from core.security import generate_webhook_token
import os

logger = logging.getLogger(__name__)


class GoogleCalendarWebhookService:
    """Service for managing Google Calendar webhook subscriptions and real-time sync."""
    
    def __init__(self, db: Session):
        self.db = db
        self.calendar_service = GoogleCalendarService(db)
        self.webhook_base_url = os.getenv("WEBHOOK_BASE_URL", "https://app.bookedbarber.com")
        self.webhook_ttl_hours = int(os.getenv("WEBHOOK_TTL_HOURS", "24"))  # Default 24 hours
        
    def subscribe_to_calendar_events(self, user: User, calendar_id: str = "primary") -> GoogleCalendarWebhookSubscription:
        """
        Subscribe to Google Calendar events for real-time notifications.
        
        Args:
            user: The user to create subscription for
            calendar_id: The Google Calendar ID to watch (default: "primary")
            
        Returns:
            GoogleCalendarWebhookSubscription: The created subscription
            
        Raises:
            GoogleCalendarError: If subscription fails
        """
        try:
            # Check if user has valid Google Calendar credentials
            if not user.google_calendar_credentials:
                raise GoogleCalendarError("User does not have Google Calendar connected")
            
            # Get Google Calendar service
            service = self.calendar_service.get_calendar_service(user)
            
            # Generate unique subscription ID and token
            subscription_id = str(uuid.uuid4())
            webhook_token = generate_webhook_token()
            
            # Calculate expiration time (Google Calendar webhooks have max TTL)
            expiration_time = datetime.utcnow() + timedelta(hours=self.webhook_ttl_hours)
            expiration_timestamp = int(expiration_time.timestamp() * 1000)  # Google expects milliseconds
            
            # Construct webhook URL
            webhook_url = f"{self.webhook_base_url}/api/v2/webhooks/google-calendar"
            
            # Create watch request
            watch_request = {
                'id': subscription_id,
                'type': 'web_hook',
                'address': webhook_url,
                'token': webhook_token,
                'expiration': expiration_timestamp
            }
            
            # Call Google Calendar API to create watch
            watch_response = service.events().watch(
                calendarId=calendar_id,
                body=watch_request
            ).execute()
            
            # Create database record
            subscription = GoogleCalendarWebhookSubscription(
                user_id=user.id,
                google_subscription_id=subscription_id,
                google_calendar_id=calendar_id,
                google_resource_id=watch_response['resourceId'],
                webhook_url=webhook_url,
                webhook_token=webhook_token,
                expiration_time=expiration_time,
                is_active=True
            )
            
            self.db.add(subscription)
            self.db.commit()
            
            logger.info(f"Created Google Calendar webhook subscription {subscription_id} for user {user.id}")
            
            return subscription
            
        except HttpError as e:
            error_msg = f"Google Calendar API error creating subscription: {e}"
            logger.error(error_msg)
            raise GoogleCalendarError(error_msg)
        except Exception as e:
            error_msg = f"Error creating webhook subscription: {str(e)}"
            logger.error(error_msg)
            raise GoogleCalendarError(error_msg)
    
    def renew_subscription(self, subscription: GoogleCalendarWebhookSubscription) -> bool:
        """
        Renew an expiring webhook subscription.
        
        Args:
            subscription: The subscription to renew
            
        Returns:
            bool: True if renewal successful, False otherwise
        """
        try:
            # Get user
            user = self.db.query(User).filter(User.id == subscription.user_id).first()
            if not user:
                logger.error(f"User {subscription.user_id} not found for subscription renewal")
                return False
            
            # First, unsubscribe from old subscription
            self.unsubscribe_from_calendar_events(subscription, user)
            
            # Create new subscription
            new_subscription = self.subscribe_to_calendar_events(user, subscription.google_calendar_id)
            
            # Deactivate old subscription
            subscription.is_active = False
            self.db.commit()
            
            logger.info(f"Renewed webhook subscription {subscription.id} -> {new_subscription.id}")
            
            return True
            
        except Exception as e:
            logger.error(f"Error renewing subscription {subscription.id}: {str(e)}")
            return False
    
    def unsubscribe_from_calendar_events(self, subscription: GoogleCalendarWebhookSubscription, user: Optional[User] = None) -> bool:
        """
        Unsubscribe from Google Calendar events.
        
        Args:
            subscription: The subscription to cancel
            user: The user (optional, will be fetched if not provided)
            
        Returns:
            bool: True if unsubscription successful, False otherwise
        """
        try:
            if not user:
                user = self.db.query(User).filter(User.id == subscription.user_id).first()
                if not user:
                    logger.error(f"User {subscription.user_id} not found for unsubscription")
                    return False
            
            # Get Google Calendar service
            service = self.calendar_service.get_calendar_service(user)
            
            # Call Google Calendar API to stop the watch
            service.channels().stop(body={
                'id': subscription.google_subscription_id,
                'resourceId': subscription.google_resource_id
            }).execute()
            
            # Update subscription status
            subscription.is_active = False
            self.db.commit()
            
            logger.info(f"Unsubscribed from Google Calendar webhook {subscription.google_subscription_id}")
            
            return True
            
        except HttpError as e:
            if e.resp.status == 404:
                # Subscription already doesn't exist, mark as inactive
                subscription.is_active = False
                self.db.commit()
                logger.warning(f"Subscription {subscription.google_subscription_id} already stopped")
                return True
            
            logger.error(f"Google Calendar API error stopping subscription: {e}")
            return False
        except Exception as e:
            logger.error(f"Error unsubscribing from webhook: {str(e)}")
            return False
    
    def get_active_subscriptions(self, user_id: Optional[int] = None) -> List[GoogleCalendarWebhookSubscription]:
        """
        Get active webhook subscriptions.
        
        Args:
            user_id: Optional user ID to filter by
            
        Returns:
            List[GoogleCalendarWebhookSubscription]: Active subscriptions
        """
        query = self.db.query(GoogleCalendarWebhookSubscription).filter(
            GoogleCalendarWebhookSubscription.is_active == True
        )
        
        if user_id:
            query = query.filter(GoogleCalendarWebhookSubscription.user_id == user_id)
        
        return query.all()
    
    def get_expiring_subscriptions(self, hours_ahead: int = 2) -> List[GoogleCalendarWebhookSubscription]:
        """
        Get subscriptions that are expiring soon and need renewal.
        
        Args:
            hours_ahead: How many hours ahead to check for expiration
            
        Returns:
            List[GoogleCalendarWebhookSubscription]: Expiring subscriptions
        """
        expiration_threshold = datetime.utcnow() + timedelta(hours=hours_ahead)
        
        return self.db.query(GoogleCalendarWebhookSubscription).filter(
            GoogleCalendarWebhookSubscription.is_active == True,
            GoogleCalendarWebhookSubscription.expiration_time <= expiration_threshold
        ).all()
    
    async def handle_sync_notification(
        self, 
        notification: GoogleCalendarWebhookNotification, 
        subscription: GoogleCalendarWebhookSubscription
    ) -> Dict[str, Any]:
        """
        Handle initial sync notification from Google Calendar.
        
        Args:
            notification: The webhook notification
            subscription: The webhook subscription
            
        Returns:
            Dict[str, Any]: Processing results
        """
        try:
            logger.info(f"Processing sync notification for subscription {subscription.id}")
            
            # Get user
            user = self.db.query(User).filter(User.id == subscription.user_id).first()
            if not user:
                return {"status": "error", "error": "User not found"}
            
            # Perform full calendar sync
            sync_result = await self._perform_incremental_sync(user, subscription.google_calendar_id)
            
            return {
                "status": "success",
                "sync_triggered": True,
                "events_processed": sync_result.get("events_processed", 0),
                "events_created": sync_result.get("events_created", 0),
                "events_updated": sync_result.get("events_updated", 0),
                "events_deleted": sync_result.get("events_deleted", 0)
            }
            
        except Exception as e:
            logger.error(f"Error handling sync notification: {str(e)}")
            return {"status": "error", "error": str(e)}
    
    async def handle_change_notification(
        self, 
        notification: GoogleCalendarWebhookNotification, 
        subscription: GoogleCalendarWebhookSubscription
    ) -> Dict[str, Any]:
        """
        Handle event change notification from Google Calendar.
        
        Args:
            notification: The webhook notification
            subscription: The webhook subscription
            
        Returns:
            Dict[str, Any]: Processing results
        """
        try:
            logger.info(f"Processing change notification for subscription {subscription.id}")
            
            # Get user
            user = self.db.query(User).filter(User.id == subscription.user_id).first()
            if not user:
                return {"status": "error", "error": "User not found"}
            
            # Perform incremental sync to get the changes
            sync_result = await self._perform_incremental_sync(user, subscription.google_calendar_id, subscription.sync_token)
            
            # Update sync token for next incremental sync
            if sync_result.get("next_sync_token"):
                subscription.sync_token = sync_result["next_sync_token"]
                self.db.commit()
            
            return {
                "status": "success",
                "sync_triggered": True,
                "events_processed": sync_result.get("events_processed", 0),
                "events_created": sync_result.get("events_created", 0),
                "events_updated": sync_result.get("events_updated", 0),
                "events_deleted": sync_result.get("events_deleted", 0)
            }
            
        except Exception as e:
            logger.error(f"Error handling change notification: {str(e)}")
            return {"status": "error", "error": str(e)}
    
    async def handle_deletion_notification(
        self, 
        notification: GoogleCalendarWebhookNotification, 
        subscription: GoogleCalendarWebhookSubscription
    ) -> Dict[str, Any]:
        """
        Handle resource deletion notification from Google Calendar.
        
        Args:
            notification: The webhook notification
            subscription: The webhook subscription
            
        Returns:
            Dict[str, Any]: Processing results
        """
        try:
            logger.info(f"Processing deletion notification for subscription {subscription.id}")
            
            # Mark subscription as inactive
            subscription.is_active = False
            self.db.commit()
            
            return {
                "status": "success",
                "sync_triggered": False,
                "events_processed": 0,
                "message": "Resource deleted, subscription deactivated"
            }
            
        except Exception as e:
            logger.error(f"Error handling deletion notification: {str(e)}")
            return {"status": "error", "error": str(e)}
    
    async def _perform_incremental_sync(
        self, 
        user: User, 
        calendar_id: str, 
        sync_token: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Perform incremental sync of Google Calendar events.
        
        Args:
            user: The user to sync for
            calendar_id: The calendar ID to sync
            sync_token: Optional sync token for incremental sync
            
        Returns:
            Dict[str, Any]: Sync results
        """
        try:
            # Get Google Calendar service
            service = self.calendar_service.get_calendar_service(user)
            
            # Prepare sync request
            request_params = {
                'calendarId': calendar_id,
                'singleEvents': True,
                'showDeleted': True  # Include deleted events for proper sync
            }
            
            if sync_token:
                request_params['syncToken'] = sync_token
            else:
                # If no sync token, sync events from last 30 days
                time_min = (datetime.utcnow() - timedelta(days=30)).isoformat() + 'Z'
                request_params['timeMin'] = time_min
            
            # Execute the sync request
            events_result = service.events().list(**request_params).execute()
            
            events = events_result.get('items', [])
            next_sync_token = events_result.get('nextSyncToken')
            
            # Process each event
            sync_stats = {
                'events_processed': len(events),
                'events_created': 0,
                'events_updated': 0,
                'events_deleted': 0,
                'next_sync_token': next_sync_token
            }
            
            for event in events:
                try:
                    result = await self._process_calendar_event(user, event, calendar_id)
                    if result['action'] == 'created':
                        sync_stats['events_created'] += 1
                    elif result['action'] == 'updated':
                        sync_stats['events_updated'] += 1
                    elif result['action'] == 'deleted':
                        sync_stats['events_deleted'] += 1
                        
                except Exception as e:
                    logger.error(f"Error processing event {event.get('id', 'unknown')}: {str(e)}")
                    continue
            
            logger.info(f"Incremental sync completed for user {user.id}: {sync_stats}")
            
            return sync_stats
            
        except HttpError as e:
            if 'Sync token is no longer valid' in str(e):
                # Sync token expired, perform full sync
                logger.warning(f"Sync token expired for user {user.id}, performing full sync")
                return await self._perform_incremental_sync(user, calendar_id, None)
            
            logger.error(f"Google Calendar API error during incremental sync: {e}")
            raise GoogleCalendarError(f"API error during sync: {e}")
        except Exception as e:
            logger.error(f"Error during incremental sync: {str(e)}")
            raise GoogleCalendarError(f"Sync error: {str(e)}")
    
    async def _process_calendar_event(self, user: User, google_event: Dict[str, Any], calendar_id: str) -> Dict[str, Any]:
        """
        Process a single Google Calendar event for synchronization.
        
        Args:
            user: The user the event belongs to
            google_event: The Google Calendar event data
            calendar_id: The calendar ID
            
        Returns:
            Dict[str, Any]: Processing result with action taken
        """
        try:
            event_id = google_event['id']
            event_status = google_event.get('status', 'confirmed')
            
            # Check if event is deleted
            if event_status == 'cancelled':
                return await self._handle_deleted_event(user, event_id, calendar_id)
            
            # Check if this is a BookedBarber-created event (avoid sync loops)
            event_summary = google_event.get('summary', '')
            if event_summary.startswith('Appointment:') or 'BookedBarber' in event_summary:
                # This is likely our own event, skip processing
                return {'action': 'skipped', 'reason': 'bookedbarber_event'}
            
            # Look for existing appointment with this Google event ID
            existing_appointment = self.db.query(Appointment).filter(
                Appointment.google_event_id == event_id,
                Appointment.user_id == user.id
            ).first()
            
            if existing_appointment:
                # Update existing appointment
                return await self._update_appointment_from_google(existing_appointment, google_event)
            else:
                # Create new appointment from Google event
                return await self._create_appointment_from_google(user, google_event, calendar_id)
            
        except Exception as e:
            logger.error(f"Error processing calendar event {google_event.get('id', 'unknown')}: {str(e)}")
            return {'action': 'error', 'error': str(e)}
    
    async def _handle_deleted_event(self, user: User, event_id: str, calendar_id: str) -> Dict[str, Any]:
        """Handle a deleted Google Calendar event."""
        try:
            # Find appointment with this Google event ID
            appointment = self.db.query(Appointment).filter(
                Appointment.google_event_id == event_id,
                Appointment.user_id == user.id
            ).first()
            
            if appointment:
                # Create sync event record
                sync_event = GoogleCalendarSyncEvent(
                    user_id=user.id,
                    google_event_id=event_id,
                    google_calendar_id=calendar_id,
                    operation_type='delete',
                    sync_direction='from_google',
                    sync_status='success'
                )
                self.db.add(sync_event)
                
                # Mark appointment as cancelled or delete based on settings
                appointment.status = 'cancelled'
                appointment.google_event_id = None
                
                self.db.commit()
                
                logger.info(f"Cancelled appointment {appointment.id} due to Google Calendar deletion")
                
                return {'action': 'deleted', 'appointment_id': appointment.id}
            else:
                return {'action': 'skipped', 'reason': 'no_matching_appointment'}
            
        except Exception as e:
            logger.error(f"Error handling deleted event {event_id}: {str(e)}")
            return {'action': 'error', 'error': str(e)}
    
    async def _create_appointment_from_google(self, user: User, google_event: Dict[str, Any], calendar_id: str) -> Dict[str, Any]:
        """Create a new appointment from a Google Calendar event."""
        # This would implement logic to create appointments from external Google events
        # For now, we'll skip creating appointments from external events to avoid clutter
        # This can be enabled based on user preferences
        
        return {'action': 'skipped', 'reason': 'external_event_creation_disabled'}
    
    async def _update_appointment_from_google(self, appointment: Appointment, google_event: Dict[str, Any]) -> Dict[str, Any]:
        """Update an existing appointment from Google Calendar changes."""
        try:
            # Extract event details
            start_time = google_event.get('start', {})
            end_time = google_event.get('end', {})
            
            # Parse datetime
            if 'dateTime' in start_time:
                new_start_time = datetime.fromisoformat(start_time['dateTime'].replace('Z', '+00:00'))
            else:
                return {'action': 'skipped', 'reason': 'all_day_event'}
            
            if 'dateTime' in end_time:
                new_end_time = datetime.fromisoformat(end_time['dateTime'].replace('Z', '+00:00'))
            else:
                return {'action': 'skipped', 'reason': 'all_day_event'}
            
            # Check if appointment details have changed
            changes_detected = []
            
            if appointment.start_time != new_start_time.replace(tzinfo=None):
                changes_detected.append('start_time')
                appointment.start_time = new_start_time.replace(tzinfo=None)
            
            # Calculate duration
            new_duration = int((new_end_time - new_start_time).total_seconds() / 60)
            if appointment.duration_minutes != new_duration:
                changes_detected.append('duration')
                appointment.duration_minutes = new_duration
            
            # Update summary/notes if changed
            new_summary = google_event.get('summary', '')
            if appointment.notes != new_summary:
                changes_detected.append('notes')
                appointment.notes = new_summary
            
            if changes_detected:
                # Create sync event record
                sync_event = GoogleCalendarSyncEvent(
                    user_id=appointment.user_id,
                    appointment_id=appointment.id,
                    google_event_id=google_event['id'],
                    google_calendar_id=google_event.get('organizer', {}).get('email', 'primary'),
                    operation_type='update',
                    sync_direction='from_google',
                    sync_status='success',
                    changes_detected=json.dumps(changes_detected)
                )
                self.db.add(sync_event)
                
                self.db.commit()
                
                logger.info(f"Updated appointment {appointment.id} from Google Calendar changes: {changes_detected}")
                
                return {'action': 'updated', 'appointment_id': appointment.id, 'changes': changes_detected}
            else:
                return {'action': 'skipped', 'reason': 'no_changes'}
            
        except Exception as e:
            logger.error(f"Error updating appointment from Google event: {str(e)}")
            return {'action': 'error', 'error': str(e)}
    
    def cleanup_expired_subscriptions(self) -> int:
        """
        Clean up expired webhook subscriptions.
        
        Returns:
            int: Number of subscriptions cleaned up
        """
        try:
            expired_subscriptions = self.db.query(GoogleCalendarWebhookSubscription).filter(
                GoogleCalendarWebhookSubscription.is_active == True,
                GoogleCalendarWebhookSubscription.expiration_time < datetime.utcnow()
            ).all()
            
            cleaned_count = 0
            for subscription in expired_subscriptions:
                subscription.is_active = False
                cleaned_count += 1
            
            self.db.commit()
            
            if cleaned_count > 0:
                logger.info(f"Cleaned up {cleaned_count} expired webhook subscriptions")
            
            return cleaned_count
            
        except Exception as e:
            logger.error(f"Error cleaning up expired subscriptions: {str(e)}")
            return 0