"""
Calendar Synchronization Queue Worker for BookedBarber V2
Handles Google Calendar integration and calendar event management
"""

import os
import sys
from pathlib import Path

# Add parent directory to path to import modules
sys.path.append(str(Path(__file__).parent.parent))

from celery import Celery
from datetime import datetime, timedelta
import logging
import json
from contextlib import contextmanager
from typing import Dict, Any, List, Optional

from db import SessionLocal
from config import settings
from models import User, Appointment
from models.message_queue import MessageQueue, MessageStatus, MessageQueueType, MessagePriority
from services.google_calendar_service import google_calendar_service
from services.notification_service import notification_service
from services.sentry_monitoring import celery_monitor

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Import Sentry monitoring if available
try:
    SENTRY_MONITORING_AVAILABLE = True
except ImportError:
    SENTRY_MONITORING_AVAILABLE = False


@contextmanager
def get_db_session():
    """Context manager for database sessions"""
    db = SessionLocal()
    try:
        yield db
    except Exception as e:
        logger.error(f"Database error: {e}")
        db.rollback()
        raise
    finally:
        db.close()


def monitor_task(task_name: str):
    """Decorator for monitoring tasks with Sentry"""
    def decorator(func):
        if SENTRY_MONITORING_AVAILABLE:
            return celery_monitor.monitor_task_execution(task_name)(func)
        return func
    return decorator


# Import from main celery app
from celery_app import celery_app


@celery_app.task(bind=True, max_retries=3)
@monitor_task("sync_google_calendar")
def sync_google_calendar(self, user_id: int, sync_direction: str = "bidirectional"):
    """
    Synchronize appointments with Google Calendar
    """
    try:
        with get_db_session() as db:
            # Get user
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                logger.error(f"User not found: {user_id}")
                return {"status": "error", "message": "User not found"}
            
            # Check if user has Google Calendar integration enabled
            if not _has_google_calendar_integration(user):
                logger.info(f"User {user_id} does not have Google Calendar integration")
                return {"status": "skipped", "reason": "No Google Calendar integration"}
            
            sync_results = {
                "appointments_synced": 0,
                "events_created": 0,
                "events_updated": 0,
                "events_deleted": 0,
                "conflicts_detected": 0,
                "errors": []
            }
            
            if sync_direction in ["bidirectional", "to_google"]:
                # Sync appointments to Google Calendar
                to_google_result = _sync_appointments_to_google(db, user)
                sync_results["events_created"] += to_google_result.get("created", 0)
                sync_results["events_updated"] += to_google_result.get("updated", 0)
                sync_results["errors"].extend(to_google_result.get("errors", []))
            
            if sync_direction in ["bidirectional", "from_google"]:
                # Sync events from Google Calendar
                from_google_result = _sync_events_from_google(db, user)
                sync_results["appointments_synced"] += from_google_result.get("synced", 0)
                sync_results["conflicts_detected"] += from_google_result.get("conflicts", 0)
                sync_results["errors"].extend(from_google_result.get("errors", []))
            
            # Update last sync timestamp
            _update_last_sync_timestamp(db, user_id)
            
            logger.info(f"Calendar sync completed for user {user_id}: {sync_results}")
            return {
                "status": "completed",
                "user_id": user_id,
                "sync_direction": sync_direction,
                "results": sync_results
            }
            
    except Exception as e:
        logger.error(f"Error syncing Google Calendar for user {user_id}: {e}")
        
        if self.request.retries < self.max_retries:
            countdown = 300 * (2 ** self.request.retries)  # Exponential backoff
            raise self.retry(countdown=countdown, exc=e)
        else:
            raise


@celery_app.task(bind=True, max_retries=3)
@monitor_task("create_calendar_event")
def create_calendar_event(self, appointment_id: int, calendar_data: Dict[str, Any] = None):
    """
    Create a calendar event for an appointment
    """
    try:
        with get_db_session() as db:
            # Get appointment
            appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
            if not appointment:
                logger.error(f"Appointment not found: {appointment_id}")
                return {"status": "error", "message": "Appointment not found"}
            
            # Check if user has calendar integration
            if not _has_google_calendar_integration(appointment.user):
                logger.info(f"User {appointment.user_id} does not have calendar integration")
                return {"status": "skipped", "reason": "No calendar integration"}
            
            # Create calendar event
            event_data = _prepare_calendar_event_data(appointment, calendar_data or {})
            
            try:
                calendar_event = google_calendar_service.create_event(
                    user=appointment.user,
                    event_data=event_data
                )
                
                # Store calendar event ID
                appointment.google_calendar_event_id = calendar_event.get('id')
                db.commit()
                
                logger.info(f"Calendar event created for appointment {appointment_id}")
                return {
                    "status": "created",
                    "appointment_id": appointment_id,
                    "calendar_event_id": calendar_event.get('id'),
                    "calendar_link": calendar_event.get('htmlLink')
                }
                
            except Exception as e:
                logger.error(f"Error creating calendar event: {e}")
                return {
                    "status": "error",
                    "appointment_id": appointment_id,
                    "error": str(e)
                }
            
    except Exception as e:
        logger.error(f"Error in create_calendar_event task: {e}")
        
        if self.request.retries < self.max_retries:
            countdown = 180 * (2 ** self.request.retries)
            raise self.retry(countdown=countdown, exc=e)
        else:
            raise


@celery_app.task(bind=True, max_retries=3)
@monitor_task("update_calendar_event")
def update_calendar_event(self, appointment_id: int, calendar_data: Dict[str, Any] = None):
    """
    Update an existing calendar event for an appointment
    """
    try:
        with get_db_session() as db:
            # Get appointment
            appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
            if not appointment:
                logger.error(f"Appointment not found: {appointment_id}")
                return {"status": "error", "message": "Appointment not found"}
            
            # Check if appointment has calendar event
            if not appointment.google_calendar_event_id:
                logger.info(f"Appointment {appointment_id} has no calendar event to update")
                # Try to create one instead
                return create_calendar_event.apply_async(args=[appointment_id, calendar_data]).get()
            
            # Check if user has calendar integration
            if not _has_google_calendar_integration(appointment.user):
                logger.info(f"User {appointment.user_id} no longer has calendar integration")
                return {"status": "skipped", "reason": "No calendar integration"}
            
            # Update calendar event
            event_data = _prepare_calendar_event_data(appointment, calendar_data or {})
            
            try:
                calendar_event = google_calendar_service.update_event(
                    user=appointment.user,
                    event_id=appointment.google_calendar_event_id,
                    event_data=event_data
                )
                
                logger.info(f"Calendar event updated for appointment {appointment_id}")
                return {
                    "status": "updated",
                    "appointment_id": appointment_id,
                    "calendar_event_id": appointment.google_calendar_event_id,
                    "calendar_link": calendar_event.get('htmlLink')
                }
                
            except Exception as e:
                logger.error(f"Error updating calendar event: {e}")
                
                # If event doesn't exist, try to create a new one
                if "not found" in str(e).lower():
                    appointment.google_calendar_event_id = None
                    db.commit()
                    return create_calendar_event.apply_async(args=[appointment_id, calendar_data]).get()
                
                return {
                    "status": "error",
                    "appointment_id": appointment_id,
                    "error": str(e)
                }
            
    except Exception as e:
        logger.error(f"Error in update_calendar_event task: {e}")
        
        if self.request.retries < self.max_retries:
            countdown = 180 * (2 ** self.request.retries)
            raise self.retry(countdown=countdown, exc=e)
        else:
            raise


@celery_app.task(bind=True, max_retries=3)
@monitor_task("delete_calendar_event")
def delete_calendar_event(self, appointment_id: int):
    """
    Delete a calendar event for an appointment
    """
    try:
        with get_db_session() as db:
            # Get appointment
            appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
            if not appointment:
                logger.error(f"Appointment not found: {appointment_id}")
                return {"status": "error", "message": "Appointment not found"}
            
            # Check if appointment has calendar event
            if not appointment.google_calendar_event_id:
                logger.info(f"Appointment {appointment_id} has no calendar event to delete")
                return {"status": "skipped", "reason": "No calendar event"}
            
            # Check if user has calendar integration
            if not _has_google_calendar_integration(appointment.user):
                logger.info(f"User {appointment.user_id} no longer has calendar integration")
                # Clear the event ID and return
                appointment.google_calendar_event_id = None
                db.commit()
                return {"status": "skipped", "reason": "No calendar integration"}
            
            # Delete calendar event
            try:
                google_calendar_service.delete_event(
                    user=appointment.user,
                    event_id=appointment.google_calendar_event_id
                )
                
                # Clear calendar event ID
                appointment.google_calendar_event_id = None
                db.commit()
                
                logger.info(f"Calendar event deleted for appointment {appointment_id}")
                return {
                    "status": "deleted",
                    "appointment_id": appointment_id
                }
                
            except Exception as e:
                logger.error(f"Error deleting calendar event: {e}")
                
                # If event doesn't exist, clear the ID anyway
                if "not found" in str(e).lower():
                    appointment.google_calendar_event_id = None
                    db.commit()
                    return {
                        "status": "cleared",
                        "appointment_id": appointment_id,
                        "note": "Event not found, ID cleared"
                    }
                
                return {
                    "status": "error",
                    "appointment_id": appointment_id,
                    "error": str(e)
                }
            
    except Exception as e:
        logger.error(f"Error in delete_calendar_event task: {e}")
        
        if self.request.retries < self.max_retries:
            countdown = 180 * (2 ** self.request.retries)
            raise self.retry(countdown=countdown, exc=e)
        else:
            raise


@celery_app.task(bind=True, max_retries=3)
@monitor_task("handle_calendar_webhook")
def handle_calendar_webhook(self, webhook_data: Dict[str, Any], user_id: int):
    """
    Handle Google Calendar webhook notifications
    """
    try:
        with get_db_session() as db:
            # Get user
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                logger.error(f"User not found: {user_id}")
                return {"status": "error", "message": "User not found"}
            
            # Parse webhook data
            resource_id = webhook_data.get('resourceId')
            resource_state = webhook_data.get('resourceState')
            
            if resource_state == 'sync':
                # Initial sync notification - no action needed
                logger.info(f"Calendar sync notification for user {user_id}")
                return {"status": "sync_notification", "user_id": user_id}
            
            # Get calendar events that changed
            try:
                changed_events = google_calendar_service.get_recent_events(
                    user=user,
                    since=datetime.utcnow() - timedelta(hours=1)
                )
                
                processed_events = 0
                conflicts_detected = 0
                
                for event in changed_events:
                    try:
                        result = _process_calendar_event_change(db, user, event)
                        if result.get('processed'):
                            processed_events += 1
                        if result.get('conflict'):
                            conflicts_detected += 1
                            
                    except Exception as e:
                        logger.error(f"Error processing calendar event {event.get('id')}: {e}")
                        continue
                
                logger.info(f"Calendar webhook processed for user {user_id}: {processed_events} events")
                return {
                    "status": "processed",
                    "user_id": user_id,
                    "events_processed": processed_events,
                    "conflicts_detected": conflicts_detected
                }
                
            except Exception as e:
                logger.error(f"Error getting calendar events for user {user_id}: {e}")
                return {
                    "status": "error",
                    "user_id": user_id,
                    "error": str(e)
                }
            
    except Exception as e:
        logger.error(f"Error handling calendar webhook: {e}")
        
        if self.request.retries < self.max_retries:
            countdown = 300 * (2 ** self.request.retries)
            raise self.retry(countdown=countdown, exc=e)
        else:
            raise


@celery_app.task(bind=True, max_retries=2)
@monitor_task("detect_calendar_conflicts")
def detect_calendar_conflicts(self, user_id: int, appointment_id: int = None):
    """
    Detect scheduling conflicts between appointments and calendar events
    """
    try:
        with get_db_session() as db:
            # Get user
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                logger.error(f"User not found: {user_id}")
                return {"status": "error", "message": "User not found"}
            
            # Check if user has calendar integration
            if not _has_google_calendar_integration(user):
                return {"status": "skipped", "reason": "No calendar integration"}
            
            conflicts = []
            
            # Get appointments to check
            if appointment_id:
                appointments = db.query(Appointment).filter(
                    Appointment.id == appointment_id
                ).all()
            else:
                # Check upcoming appointments
                appointments = db.query(Appointment).filter(
                    and_(
                        Appointment.user_id == user_id,
                        Appointment.start_time >= datetime.utcnow(),
                        Appointment.status.in_(['confirmed', 'pending'])
                    )
                ).all()
            
            for appointment in appointments:
                try:
                    # Get calendar events during appointment time
                    calendar_events = google_calendar_service.get_events_in_timerange(
                        user=user,
                        start_time=appointment.start_time,
                        end_time=appointment.end_time or (appointment.start_time + timedelta(hours=1))
                    )
                    
                    for event in calendar_events:
                        # Skip events that are this appointment
                        if event.get('id') == appointment.google_calendar_event_id:
                            continue
                        
                        # Check for time overlap
                        if _has_time_overlap(appointment, event):
                            conflicts.append({
                                "appointment_id": appointment.id,
                                "calendar_event_id": event.get('id'),
                                "calendar_event_summary": event.get('summary'),
                                "conflict_type": "time_overlap",
                                "appointment_time": appointment.start_time.isoformat(),
                                "event_time": event.get('start', {}).get('dateTime')
                            })
                    
                except Exception as e:
                    logger.error(f"Error checking conflicts for appointment {appointment.id}: {e}")
                    continue
            
            # Notify about conflicts if any found
            if conflicts:
                _notify_calendar_conflicts(db, user, conflicts)
            
            logger.info(f"Calendar conflict detection completed for user {user_id}: {len(conflicts)} conflicts")
            return {
                "status": "completed",
                "user_id": user_id,
                "conflicts_detected": len(conflicts),
                "conflicts": conflicts
            }
            
    except Exception as e:
        logger.error(f"Error detecting calendar conflicts: {e}")
        
        if self.request.retries < self.max_retries:
            countdown = 300 * (2 ** self.request.retries)
            raise self.retry(countdown=countdown, exc=e)
        else:
            raise


# Helper functions
def _has_google_calendar_integration(user: User) -> bool:
    """Check if user has Google Calendar integration enabled"""
    # Check if user has Google OAuth credentials and calendar sync enabled
    return (
        hasattr(user, 'google_calendar_enabled') and user.google_calendar_enabled and
        hasattr(user, 'google_oauth_token') and user.google_oauth_token
    )


def _sync_appointments_to_google(db, user: User) -> Dict[str, Any]:
    """Sync appointments to Google Calendar"""
    
    result = {"created": 0, "updated": 0, "errors": []}
    
    try:
        # Get recent appointments that need syncing
        recent_appointments = db.query(Appointment).filter(
            and_(
                Appointment.user_id == user.id,
                Appointment.start_time >= datetime.utcnow() - timedelta(days=1),
                Appointment.status.in_(['confirmed', 'pending'])
            )
        ).all()
        
        for appointment in recent_appointments:
            try:
                if appointment.google_calendar_event_id:
                    # Update existing event
                    event_data = _prepare_calendar_event_data(appointment)
                    google_calendar_service.update_event(
                        user=user,
                        event_id=appointment.google_calendar_event_id,
                        event_data=event_data
                    )
                    result["updated"] += 1
                else:
                    # Create new event
                    event_data = _prepare_calendar_event_data(appointment)
                    calendar_event = google_calendar_service.create_event(
                        user=user,
                        event_data=event_data
                    )
                    appointment.google_calendar_event_id = calendar_event.get('id')
                    result["created"] += 1
                    
            except Exception as e:
                error_msg = f"Error syncing appointment {appointment.id}: {str(e)}"
                logger.error(error_msg)
                result["errors"].append(error_msg)
        
        db.commit()
        
    except Exception as e:
        logger.error(f"Error in _sync_appointments_to_google: {e}")
        result["errors"].append(str(e))
    
    return result


def _sync_events_from_google(db, user: User) -> Dict[str, Any]:
    """Sync events from Google Calendar"""
    
    result = {"synced": 0, "conflicts": 0, "errors": []}
    
    try:
        # Get recent calendar events
        calendar_events = google_calendar_service.get_recent_events(
            user=user,
            since=datetime.utcnow() - timedelta(days=1)
        )
        
        for event in calendar_events:
            try:
                # Check if this is an existing appointment
                existing_appointment = db.query(Appointment).filter(
                    Appointment.google_calendar_event_id == event.get('id')
                ).first()
                
                if existing_appointment:
                    # Update existing appointment if needed
                    if _should_update_appointment_from_event(existing_appointment, event):
                        _update_appointment_from_event(existing_appointment, event)
                        result["synced"] += 1
                else:
                    # Check if we should create a new appointment from this event
                    if _should_create_appointment_from_event(event):
                        conflicts = _check_appointment_conflicts(db, user, event)
                        if conflicts:
                            result["conflicts"] += len(conflicts)
                        else:
                            _create_appointment_from_event(db, user, event)
                            result["synced"] += 1
                
            except Exception as e:
                error_msg = f"Error syncing calendar event {event.get('id')}: {str(e)}"
                logger.error(error_msg)
                result["errors"].append(error_msg)
        
        db.commit()
        
    except Exception as e:
        logger.error(f"Error in _sync_events_from_google: {e}")
        result["errors"].append(str(e))
    
    return result


def _prepare_calendar_event_data(appointment: Appointment, additional_data: Dict[str, Any] = None) -> Dict[str, Any]:
    """Prepare calendar event data from appointment"""
    
    event_data = {
        'summary': f"Appointment: {appointment.service_name}",
        'description': f"BookedBarber appointment\nService: {appointment.service_name}",
        'start': {
            'dateTime': appointment.start_time.isoformat(),
            'timeZone': 'UTC',
        },
        'end': {
            'dateTime': (appointment.end_time or (appointment.start_time + timedelta(hours=1))).isoformat(),
            'timeZone': 'UTC',
        },
        'reminders': {
            'useDefault': False,
            'overrides': [
                {'method': 'email', 'minutes': 24 * 60},  # 24 hours
                {'method': 'popup', 'minutes': 60},       # 1 hour
            ],
        },
    }
    
    # Add barber information if available
    if appointment.barber:
        event_data['description'] += f"\nBarber: {appointment.barber.name}"
    
    # Add location if available
    if hasattr(appointment, 'location') and appointment.location:
        event_data['location'] = appointment.location
    
    # Merge additional data
    if additional_data:
        event_data.update(additional_data)
    
    return event_data


def _update_last_sync_timestamp(db, user_id: int):
    """Update the last calendar sync timestamp for user"""
    user = db.query(User).filter(User.id == user_id).first()
    if user:
        user.last_calendar_sync = datetime.utcnow()
        db.commit()


def _process_calendar_event_change(db, user: User, event: Dict[str, Any]) -> Dict[str, Any]:
    """Process a changed calendar event"""
    
    result = {"processed": False, "conflict": False}
    
    try:
        # Find existing appointment
        appointment = db.query(Appointment).filter(
            Appointment.google_calendar_event_id == event.get('id')
        ).first()
        
        if appointment:
            # Update existing appointment
            if event.get('status') == 'cancelled':
                appointment.status = 'cancelled'
            else:
                # Update appointment details from event
                _update_appointment_from_event(appointment, event)
            
            result["processed"] = True
            
        else:
            # Check if we should create new appointment
            if _should_create_appointment_from_event(event):
                conflicts = _check_appointment_conflicts(db, user, event)
                if conflicts:
                    result["conflict"] = True
                else:
                    _create_appointment_from_event(db, user, event)
                    result["processed"] = True
        
        db.commit()
        
    except Exception as e:
        logger.error(f"Error processing calendar event change: {e}")
        result["error"] = str(e)
    
    return result


def _has_time_overlap(appointment: Appointment, event: Dict[str, Any]) -> bool:
    """Check if appointment and calendar event have time overlap"""
    
    try:
        # Parse event times
        event_start_str = event.get('start', {}).get('dateTime')
        event_end_str = event.get('end', {}).get('dateTime')
        
        if not event_start_str:
            return False
        
        event_start = datetime.fromisoformat(event_start_str.replace('Z', '+00:00'))
        event_end = datetime.fromisoformat(event_end_str.replace('Z', '+00:00')) if event_end_str else event_start + timedelta(hours=1)
        
        # Check for overlap
        apt_start = appointment.start_time
        apt_end = appointment.end_time or (appointment.start_time + timedelta(hours=1))
        
        return not (apt_end <= event_start or apt_start >= event_end)
        
    except Exception as e:
        logger.error(f"Error checking time overlap: {e}")
        return False


def _notify_calendar_conflicts(db, user: User, conflicts: List[Dict[str, Any]]):
    """Notify user about calendar conflicts"""
    
    try:
        notification_service.queue_notification(
            db=db,
            user=user,
            template_name="calendar_conflicts",
            context={
                "user_name": user.name,
                "conflicts_count": len(conflicts),
                "conflicts": conflicts
            }
        )
        
        logger.info(f"Calendar conflict notification sent to user {user.id}")
        
    except Exception as e:
        logger.error(f"Error sending calendar conflict notification: {e}")


# Placeholder helper functions (would need full implementation)
def _should_update_appointment_from_event(appointment: Appointment, event: Dict[str, Any]) -> bool:
    """Check if appointment should be updated from calendar event"""
    return True  # Simplified - would check for actual changes


def _update_appointment_from_event(appointment: Appointment, event: Dict[str, Any]):
    """Update appointment from calendar event"""
    # Implementation would update appointment fields based on event data
    pass


def _should_create_appointment_from_event(event: Dict[str, Any]) -> bool:
    """Check if appointment should be created from calendar event"""
    # Only create appointments for events that look like bookings
    summary = event.get('summary', '').lower()
    return 'appointment' in summary or 'booking' in summary


def _check_appointment_conflicts(db, user: User, event: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Check for conflicts with existing appointments"""
    # Implementation would check for scheduling conflicts
    return []


def _create_appointment_from_event(db, user: User, event: Dict[str, Any]):
    """Create appointment from calendar event"""
    # Implementation would create new appointment from event data
    pass


# Health check task
@celery_app.task
def calendar_worker_health_check():
    """Health check for calendar worker"""
    with get_db_session() as db:
        # Check users with calendar integration
        users_with_calendar = db.query(User).filter(
            User.google_calendar_enabled == True
        ).count()
        
        # Check recent sync activity
        recent_syncs = db.query(User).filter(
            User.last_calendar_sync >= datetime.utcnow() - timedelta(hours=24)
        ).count()
    
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "worker_type": "calendar_worker",
        "integration_stats": {
            "users_with_calendar_integration": users_with_calendar,
            "recent_syncs_24h": recent_syncs
        },
        "google_calendar_service_available": hasattr(google_calendar_service, 'get_service'),
        "worker_id": os.getpid()
    }