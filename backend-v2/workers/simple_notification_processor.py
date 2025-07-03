#!/usr/bin/env python3
"""
Simple notification processor that runs without Celery/Redis
Can be run as a background process or scheduled job
"""

import sys
import time
import logging
from pathlib import Path
from datetime import datetime, timedelta
import signal
import threading

# Add parent directory to path to import modules
sys.path.append(str(Path(__file__).parent.parent))

from database import SessionLocal
from services.notification_service import notification_service
from config import settings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('notification_processor.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class NotificationProcessor:
    """Simple notification processor"""
    
    def __init__(self, process_interval=60, batch_size=50):
        self.process_interval = process_interval  # seconds
        self.batch_size = batch_size
        self.running = False
        self.thread = None
        
    def start(self):
        """Start the notification processor"""
        if self.running:
            logger.warning("Notification processor is already running")
            return
            
        self.running = True
        self.thread = threading.Thread(target=self._run_loop, daemon=True)
        self.thread.start()
        logger.info("Notification processor started")
        
    def stop(self):
        """Stop the notification processor"""
        if not self.running:
            return
            
        self.running = False
        if self.thread:
            self.thread.join(timeout=10)
        logger.info("Notification processor stopped")
        
    def _run_loop(self):
        """Main processing loop"""
        while self.running:
            try:
                self._process_notifications()
                self._send_appointment_reminders()
                
                # Sleep for the specified interval
                for _ in range(self.process_interval):
                    if not self.running:
                        break
                    time.sleep(1)
                    
            except Exception as e:
                logger.error(f"Error in processing loop: {e}")
                time.sleep(5)  # Short delay before retrying
                
    def _process_notifications(self):
        """Process pending notifications"""
        try:
            db = SessionLocal()
            try:
                result = notification_service.process_notification_queue(
                    db=db, 
                    batch_size=self.batch_size
                )
                
                if result['processed'] > 0:
                    logger.info(f"Processed notifications: {result}")
                    
            finally:
                db.close()
                
        except Exception as e:
            logger.error(f"Error processing notifications: {e}")
            
    def _send_appointment_reminders(self):
        """Send appointment reminders for upcoming appointments"""
        try:
            from models import Appointment, User, NotificationPreference, NotificationQueue
            from sqlalchemy import and_
            
            db = SessionLocal()
            try:
                # Get appointments that need reminders
                now = datetime.utcnow()
                
                # Look for appointments in the next 25 hours
                upcoming_appointments = db.query(Appointment).filter(
                    and_(
                        Appointment.start_time > now,
                        Appointment.start_time <= now + timedelta(hours=25),
                        Appointment.status.in_(['confirmed', 'pending', 'scheduled'])
                    )
                ).all()
                
                reminders_sent = 0
                
                for appointment in upcoming_appointments:
                    try:
                        # Get user preferences for reminder timing
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
                                
                                # Check if reminder already sent for this reminder hour
                                existing_reminder = db.query(NotificationQueue).filter(
                                    and_(
                                        NotificationQueue.appointment_id == appointment.id,
                                        NotificationQueue.template_name == "appointment_reminder",
                                        NotificationQueue.status.in_(['sent', 'pending']),
                                        # Check if scheduled within ±1 hour of expected reminder time
                                        NotificationQueue.scheduled_for >= now - timedelta(hours=1),
                                        NotificationQueue.scheduled_for <= now + timedelta(hours=1)
                                    )
                                ).first()
                                
                                if not existing_reminder:
                                    # Get client and barber information
                                    from models import Client
                                    client = None
                                    if appointment.client_id:
                                        client = db.query(Client).filter(Client.id == appointment.client_id).first()
                                    
                                    barber = db.query(User).filter(User.id == appointment.barber_id).first()
                                    
                                    # Create reminder context
                                    context = {
                                        "client_name": f"{client.first_name} {client.last_name}" if client else appointment.user.name,
                                        "service_name": appointment.service_name,
                                        "appointment_date": appointment.start_time.strftime("%B %d, %Y"),
                                        "appointment_time": appointment.start_time.strftime("%I:%M %p"),
                                        "duration": appointment.duration_minutes,
                                        "barber_name": barber.name if barber else None,
                                        "business_name": getattr(settings, 'business_name', getattr(settings, 'app_name', 'BookedBarber')),
                                        "business_address": getattr(settings, 'business_address', None),
                                        "business_phone": getattr(settings, 'business_phone', '(555) 123-4567'),
                                        "hours_until": int(hours_until),
                                        "current_year": datetime.now().year,
                                        "appointment_id": appointment.id
                                    }
                                    
                                    # Queue reminder
                                    notifications = notification_service.queue_notification(
                                        db=db,
                                        user=appointment.user,
                                        template_name="appointment_reminder",
                                        context=context,
                                        appointment_id=appointment.id
                                    )
                                    
                                    if notifications:
                                        reminders_sent += 1
                                        logger.info(f"Queued {reminder_hour}h reminder for appointment {appointment.id}")
                                    
                    except Exception as e:
                        logger.error(f"Error processing reminder for appointment {appointment.id}: {e}")
                        continue
                
                if reminders_sent > 0:
                    logger.info(f"Queued {reminders_sent} appointment reminders")
                    
            finally:
                db.close()
                
        except Exception as e:
            logger.error(f"Error sending appointment reminders: {e}")
            
    def cleanup_old_notifications(self, days_to_keep=30):
        """Clean up old notification records"""
        try:
            from models import NotificationQueue, NotificationStatus
            
            db = SessionLocal()
            try:
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
                
                if deleted_count > 0:
                    logger.info(f"Cleaned up {deleted_count} old notification records")
                return deleted_count
                
            finally:
                db.close()
                
        except Exception as e:
            logger.error(f"Error cleaning up old notifications: {e}")
            return 0
            
    def get_stats(self):
        """Get notification processing statistics"""
        try:
            db = SessionLocal()
            try:
                stats = notification_service.get_notification_stats(db, days=7)
                return stats
            finally:
                db.close()
        except Exception as e:
            logger.error(f"Error getting stats: {e}")
            return None

# Global processor instance
processor = NotificationProcessor()

def signal_handler(signum, frame):
    """Handle shutdown signals"""
    logger.info(f"Received signal {signum}, shutting down...")
    processor.stop()
    sys.exit(0)

def main():
    """Main function to run the processor"""
    logger.info("Starting Simple Notification Processor...")
    
    # Register signal handlers for graceful shutdown
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    try:
        # Start the processor
        processor.start()
        
        # Keep the main thread alive
        while processor.running:
            time.sleep(1)
            
    except KeyboardInterrupt:
        logger.info("Keyboard interrupt received")
    except Exception as e:
        logger.error(f"Error in main: {e}")
    finally:
        processor.stop()
        logger.info("Notification processor shutdown complete")

if __name__ == "__main__":
    main()