#!/usr/bin/env python3
"""
Celery worker for processing notification queue
"""

import os
import sys
from pathlib import Path

# Add parent directory to path to import modules
sys.path.append(str(Path(__file__).parent.parent))

from celery import Celery
from datetime import datetime, timedelta
import logging
from contextlib import contextmanager

from db import SessionLocal
from services.notification_service import notification_service
from config import settings

# Import Sentry monitoring if available
try:
    from services.sentry_monitoring import celery_monitor
    SENTRY_MONITORING_AVAILABLE = True
except ImportError:
    SENTRY_MONITORING_AVAILABLE = False
    logger.info("Sentry monitoring not available for Celery tasks")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create Celery app
celery_app = Celery(
    'notification_worker',
    broker=settings.redis_url,
    backend=settings.redis_url
)

# Set up Sentry monitoring for Celery if available
if SENTRY_MONITORING_AVAILABLE:
    try:
        celery_monitor.setup_celery_monitoring(celery_app)
        logger.info("Sentry Celery monitoring enabled")
    except Exception as e:
        logger.warning(f"Failed to set up Sentry Celery monitoring: {e}")

# Celery configuration
celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    
    # Task routing
    task_routes={
        'notification_worker.process_notification_queue': {'queue': 'notifications'},
        'notification_worker.send_immediate_notification': {'queue': 'urgent_notifications'},
        'notification_worker.cleanup_old_notifications': {'queue': 'maintenance'}
    },
    
    # Beat schedule for periodic tasks
    beat_schedule={
        'process-notification-queue': {
            'task': 'notification_worker.process_notification_queue',
            'schedule': 60.0,  # Every minute
            'options': {'queue': 'notifications'}
        },
        'cleanup-old-notifications': {
            'task': 'notification_worker.cleanup_old_notifications',
            'schedule': 3600.0,  # Every hour
            'options': {'queue': 'maintenance'}
        },
        'send-appointment-reminders': {
            'task': 'notification_worker.send_appointment_reminders',
            'schedule': 300.0,  # Every 5 minutes
            'options': {'queue': 'notifications'}
        }
    },
    
    # Worker configuration
    worker_prefetch_multiplier=1,
    task_acks_late=True,
    worker_max_tasks_per_child=1000,
)

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

@celery_app.task(bind=True, max_retries=3)
@celery_monitor.monitor_task_execution("process_notification_queue") if SENTRY_MONITORING_AVAILABLE else lambda func: func
def process_notification_queue(self, batch_size=50):
    """
    Process pending notifications in the queue
    """
    try:
        with get_db_session() as db:
            result = notification_service.process_notification_queue(
                db=db, 
                batch_size=batch_size
            )
            
            logger.info(f"Processed notification queue: {result}")
            return result
            
    except Exception as e:
        logger.error(f"Error processing notification queue: {e}")
        
        # Retry with exponential backoff
        if self.request.retries < self.max_retries:
            countdown = 2 ** self.request.retries
            logger.info(f"Retrying in {countdown} seconds...")
            raise self.retry(countdown=countdown, exc=e)
        else:
            logger.error(f"Max retries exceeded for processing notification queue")
            raise

@celery_app.task(bind=True, max_retries=3)
@celery_monitor.monitor_task_execution("send_immediate_notification") if SENTRY_MONITORING_AVAILABLE else lambda func: func
def send_immediate_notification(self, user_id, template_name, context, notification_type=None):
    """
    Send an immediate notification (high priority)
    """
    try:
        from models import User
        
        with get_db_session() as db:
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                logger.error(f"User {user_id} not found")
                return {"success": False, "error": "User not found"}
            
            # Queue the notification
            notifications = notification_service.queue_notification(
                db=db,
                user=user,
                template_name=template_name,
                context=context
            )
            
            # Process immediately
            result = notification_service.process_notification_queue(db=db, batch_size=10)
            
            logger.info(f"Sent immediate notification to user {user_id}: {result}")
            return {
                "success": True,
                "notifications_queued": len(notifications),
                "processing_result": result
            }
            
    except Exception as e:
        logger.error(f"Error sending immediate notification: {e}")
        
        if self.request.retries < self.max_retries:
            countdown = 2 ** self.request.retries
            raise self.retry(countdown=countdown, exc=e)
        else:
            raise

@celery_app.task(bind=True)
def send_appointment_reminders(self):
    """
    Send appointment reminders for upcoming appointments
    """
    try:
        from models import Appointment, NotificationPreference
        from sqlalchemy import and_
        
        with get_db_session() as db:
            # Get appointments that need reminders
            now = datetime.utcnow()
            
            # Look for appointments in the next 25 hours (to catch 24h reminders)
            # and next 3 hours (to catch 2h reminders)
            upcoming_appointments = db.query(Appointment).filter(
                and_(
                    Appointment.start_time > now,
                    Appointment.start_time <= now + timedelta(hours=25),
                    Appointment.status.in_(['confirmed', 'pending'])
                )
            ).all()
            
            reminders_sent = 0
            
            for appointment in upcoming_appointments:
                try:
                    # Get user preferences
                    preferences = db.query(NotificationPreference).filter(
                        NotificationPreference.user_id == appointment.user_id
                    ).first()
                    
                    reminder_hours = preferences.reminder_hours if preferences else [24, 2]
                    
                    # Check if we need to send any reminders
                    time_until = appointment.start_time - now
                    hours_until = time_until.total_seconds() / 3600
                    
                    for reminder_hour in reminder_hours:
                        # Send reminder if we're within the reminder window (±15 minutes)
                        if abs(hours_until - reminder_hour) <= 0.25:  # 15 minutes tolerance
                            
                            # Check if reminder already sent
                            from models import NotificationQueue
                            existing_reminder = db.query(NotificationQueue).filter(
                                and_(
                                    NotificationQueue.appointment_id == appointment.id,
                                    NotificationQueue.template_name == "appointment_reminder",
                                    NotificationQueue.status.in_(['sent', 'pending'])
                                )
                            ).first()
                            
                            if not existing_reminder:
                                # Create reminder context
                                context = {
                                    "client_name": appointment.user.name,
                                    "service_name": appointment.service_name,
                                    "appointment_date": appointment.start_time.strftime("%B %d, %Y"),
                                    "appointment_time": appointment.start_time.strftime("%I:%M %p"),
                                    "duration": appointment.duration_minutes,
                                    "hours_until": int(hours_until),
                                    "business_name": settings.app_name
                                }
                                
                                # Queue reminder
                                notification_service.queue_notification(
                                    db=db,
                                    user=appointment.user,
                                    template_name="appointment_reminder",
                                    context=context,
                                    appointment_id=appointment.id
                                )
                                
                                reminders_sent += 1
                                logger.info(f"Queued reminder for appointment {appointment.id}")
                                
                except Exception as e:
                    logger.error(f"Error processing reminder for appointment {appointment.id}: {e}")
                    continue
            
            # Process the queued reminders
            if reminders_sent > 0:
                result = notification_service.process_notification_queue(db=db, batch_size=100)
                logger.info(f"Sent {reminders_sent} appointment reminders: {result}")
            
            return {"reminders_queued": reminders_sent}
            
    except Exception as e:
        logger.error(f"Error sending appointment reminders: {e}")
        raise

@celery_app.task(bind=True)
def cleanup_old_notifications(self, days_to_keep=30):
    """
    Clean up old notification records
    """
    try:
        from models import NotificationQueue, NotificationStatus
        
        with get_db_session() as db:
            cutoff_date = datetime.utcnow() - timedelta(days=days_to_keep)
            
            # Delete old sent/failed/cancelled notifications
            deleted_count = db.query(NotificationQueue).filter(
                and_(
                    NotificationQueue.created_at < cutoff_date,
                    NotificationQueue.status.in_([
                        NotificationStatus.SENT,
                        NotificationStatus.FAILED,
                        NotificationStatus.CANCELLED
                    ])
                )
            ).delete()
            
            db.commit()
            
            logger.info(f"Cleaned up {deleted_count} old notification records")
            return {"deleted_count": deleted_count}
            
    except Exception as e:
        logger.error(f"Error cleaning up old notifications: {e}")
        raise

@celery_app.task(bind=True)
def send_bulk_notifications(self, user_ids, template_name, context, scheduled_for=None):
    """
    Send notifications to multiple users
    """
    try:
        from models import User
        
        with get_db_session() as db:
            users = db.query(User).filter(User.id.in_(user_ids)).all()
            
            if not users:
                logger.warning(f"No users found for IDs: {user_ids}")
                return {"success": False, "error": "No users found"}
            
            # Prepare bulk notification data
            notification_data = []
            for user in users:
                notification_data.append({
                    "user": user,
                    "template_name": template_name,
                    "context": context,
                    "scheduled_for": datetime.fromisoformat(scheduled_for) if scheduled_for else None
                })
            
            # Queue bulk notifications
            notifications = notification_service.bulk_queue_notifications(
                db=db,
                notifications=notification_data
            )
            
            logger.info(f"Queued {len(notifications)} bulk notifications")
            
            # Process immediately if not scheduled for later
            if not scheduled_for:
                result = notification_service.process_notification_queue(db=db, batch_size=100)
                return {
                    "success": True,
                    "notifications_queued": len(notifications),
                    "processing_result": result
                }
            else:
                return {
                    "success": True,
                    "notifications_queued": len(notifications),
                    "scheduled_for": scheduled_for
                }
            
    except Exception as e:
        logger.error(f"Error sending bulk notifications: {e}")
        
        if self.request.retries < self.max_retries:
            countdown = 2 ** self.request.retries
            raise self.retry(countdown=countdown, exc=e)
        else:
            raise

# Health check task
@celery_app.task
def health_check():
    """Health check task to verify worker is functioning"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "worker_id": os.getpid()
    }

if __name__ == '__main__':
    # Run the worker
    celery_app.start()