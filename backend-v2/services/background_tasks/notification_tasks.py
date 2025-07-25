"""
Background tasks for notifications and communications.
Handles email, SMS, and push notifications asynchronously.
"""

import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta

from services.celery_app import celery_app
from services.notification_service import NotificationService
from db import SessionLocal
from models import Appointment, User
from config import settings

logger = logging.getLogger(__name__)

# Initialize notification service
notification_service = NotificationService()

@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def send_email_notification(self, recipient_email: str, subject: str, content: str, 
                          template_name: Optional[str] = None, template_data: Optional[Dict] = None):
    """
    Send email notification asynchronously.
    
    Args:
        recipient_email: Email address to send to
        subject: Email subject
        content: Email content (plain text or HTML)
        template_name: Optional template name for formatted emails
        template_data: Data for template rendering
    """
    try:
        logger.info(f"📧 Sending email to {recipient_email}: {subject}")
        
        # Use template if provided
        if template_name and template_data:
            result = notification_service.send_template_email(
                recipient_email, template_name, template_data, subject
            )
        else:
            result = notification_service.send_email(recipient_email, subject, content)
        
        if result.get('success'):
            logger.info(f"✅ Email sent successfully to {recipient_email}")
            return {
                'status': 'success',
                'recipient': recipient_email,
                'message_id': result.get('message_id'),
                'timestamp': datetime.utcnow().isoformat()
            }
        else:
            raise Exception(f"Email sending failed: {result.get('error')}")
            
    except Exception as e:
        logger.error(f"❌ Email sending failed: {e}")
        
        # Retry with exponential backoff
        try:
            self.retry(countdown=60 * (2 ** self.request.retries))
        except self.MaxRetriesExceededError:
            logger.error(f"❌ Max retries exceeded for email to {recipient_email}")
            return {
                'status': 'failed',
                'recipient': recipient_email,
                'error': str(e),
                'timestamp': datetime.utcnow().isoformat()
            }

@celery_app.task(bind=True, max_retries=3, default_retry_delay=30)
def send_sms_notification(self, phone_number: str, message: str, 
                         appointment_id: Optional[int] = None):
    """
    Send SMS notification asynchronously.
    
    Args:
        phone_number: Phone number to send to
        message: SMS message content
        appointment_id: Optional appointment ID for tracking
    """
    try:
        logger.info(f"📱 Sending SMS to {phone_number}: {message[:50]}...")
        
        result = notification_service.send_sms(phone_number, message)
        
        if result.get('success'):
            logger.info(f"✅ SMS sent successfully to {phone_number}")
            return {
                'status': 'success',
                'recipient': phone_number,
                'message_sid': result.get('message_sid'),
                'appointment_id': appointment_id,
                'timestamp': datetime.utcnow().isoformat()
            }
        else:
            raise Exception(f"SMS sending failed: {result.get('error')}")
            
    except Exception as e:
        logger.error(f"❌ SMS sending failed: {e}")
        
        # Retry with exponential backoff
        try:
            self.retry(countdown=30 * (2 ** self.request.retries))
        except self.MaxRetriesExceededError:
            logger.error(f"❌ Max retries exceeded for SMS to {phone_number}")
            return {
                'status': 'failed',
                'recipient': phone_number,
                'error': str(e),
                'timestamp': datetime.utcnow().isoformat()
            }

@celery_app.task
def send_appointment_reminder(appointment_id: int, reminder_type: str = "24h"):
    """
    Send appointment reminder notification.
    
    Args:
        appointment_id: ID of the appointment
        reminder_type: Type of reminder (24h, 2h, 1h)
    """
    try:
        db = SessionLocal()
        
        # Get appointment with related data
        appointment = db.query(Appointment).filter(
            Appointment.id == appointment_id
        ).first()
        
        if not appointment:
            logger.warning(f"⚠️ Appointment {appointment_id} not found for reminder")
            return {'status': 'not_found', 'appointment_id': appointment_id}
        
        # Check if appointment is still in the future
        if appointment.start_time <= datetime.utcnow():
            logger.info(f"ℹ️ Appointment {appointment_id} is in the past, skipping reminder")
            return {'status': 'past_appointment', 'appointment_id': appointment_id}
        
        # Get client information
        client = appointment.client if hasattr(appointment, 'client') else None
        if not client:
            logger.warning(f"⚠️ No client found for appointment {appointment_id}")
            return {'status': 'no_client', 'appointment_id': appointment_id}
        
        # Format reminder message
        time_until = {
            "24h": "tomorrow",
            "2h": "in 2 hours", 
            "1h": "in 1 hour"
        }.get(reminder_type, reminder_type)
        
        subject = f"Appointment Reminder - {time_until}"
        message = f"""
        Hi {client.name},
        
        This is a reminder that you have an appointment {time_until}:
        
        📅 Date: {appointment.start_time.strftime('%B %d, %Y')}
        🕐 Time: {appointment.start_time.strftime('%I:%M %p')}
        💼 Service: {appointment.service.name if hasattr(appointment, 'service') else 'N/A'}
        🏪 Location: {settings.business_name}
        
        Please arrive 10 minutes early. If you need to reschedule, contact us at {settings.business_phone}.
        
        Thank you!
        {settings.business_name}
        """
        
        results = []
        
        # Send email reminder if email is available
        if client.email:
            email_task = send_email_notification.delay(
                client.email, subject, message.strip(), 
                template_name="appointment_reminder",
                template_data={
                    'client_name': client.name,
                    'appointment_time': appointment.start_time.strftime('%I:%M %p'),
                    'appointment_date': appointment.start_time.strftime('%B %d, %Y'),
                    'service_name': appointment.service.name if hasattr(appointment, 'service') else 'N/A',
                    'business_name': settings.business_name,
                    'business_phone': settings.business_phone,
                    'time_until': time_until
                }
            )
            results.append({'type': 'email', 'task_id': email_task.id})
        
        # Send SMS reminder if phone is available and SMS is enabled
        if client.phone and settings.enable_sms_notifications:
            sms_message = f"Reminder: Your appointment is {time_until} at {appointment.start_time.strftime('%I:%M %p')} for {appointment.service.name if hasattr(appointment, 'service') else 'your service'}. {settings.business_name}"
            
            sms_task = send_sms_notification.delay(
                client.phone, sms_message, appointment_id
            )
            results.append({'type': 'sms', 'task_id': sms_task.id})
        
        logger.info(f"✅ Reminder sent for appointment {appointment_id} ({reminder_type})")
        
        return {
            'status': 'success',
            'appointment_id': appointment_id,
            'reminder_type': reminder_type,
            'notifications_sent': results,
            'timestamp': datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to send reminder for appointment {appointment_id}: {e}")
        return {
            'status': 'error',
            'appointment_id': appointment_id,
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }
    finally:
        if 'db' in locals():
            db.close()

@celery_app.task
def send_appointment_reminders():
    """
    Scheduled task to send appointment reminders based on configured intervals.
    Runs every 5 minutes to check for appointments needing reminders.
    """
    try:
        db = SessionLocal()
        current_time = datetime.utcnow()
        sent_count = 0
        
        # Send reminders based on configured intervals
        for hours in settings.appointment_reminder_hours:
            reminder_time = current_time + timedelta(hours=hours)
            
            # Find appointments that need reminders
            appointments = db.query(Appointment).filter(
                Appointment.start_time >= reminder_time - timedelta(minutes=5),
                Appointment.start_time <= reminder_time + timedelta(minutes=5),
                Appointment.status.in_(['confirmed', 'pending'])
            ).all()
            
            for appointment in appointments:
                # Check if reminder was already sent
                # (In production, you'd track this in a separate table)
                reminder_type = f"{hours}h"
                
                send_appointment_reminder.delay(appointment.id, reminder_type)
                sent_count += 1
        
        logger.info(f"✅ Scheduled {sent_count} appointment reminders")
        
        return {
            'status': 'success',
            'reminders_scheduled': sent_count,
            'timestamp': datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to schedule appointment reminders: {e}")
        return {
            'status': 'error',
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }
    finally:
        if 'db' in locals():
            db.close()

@celery_app.task(bind=True, max_retries=2)
def send_bulk_notifications(self, notification_batch: List[Dict[str, Any]]):
    """
    Send bulk notifications efficiently.
    
    Args:
        notification_batch: List of notification dictionaries with type, recipient, content
    """
    try:
        results = []
        
        for notification in notification_batch:
            notif_type = notification.get('type')
            recipient = notification.get('recipient')
            content = notification.get('content')
            
            if notif_type == 'email':
                task = send_email_notification.delay(
                    recipient, 
                    notification.get('subject', 'Notification'),
                    content,
                    notification.get('template_name'),
                    notification.get('template_data')
                )
                results.append({'type': 'email', 'recipient': recipient, 'task_id': task.id})
                
            elif notif_type == 'sms':
                task = send_sms_notification.delay(recipient, content)
                results.append({'type': 'sms', 'recipient': recipient, 'task_id': task.id})
        
        logger.info(f"✅ Bulk notifications scheduled: {len(results)} notifications")
        
        return {
            'status': 'success',
            'total_notifications': len(notification_batch),
            'scheduled_notifications': results,
            'timestamp': datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"❌ Bulk notification scheduling failed: {e}")
        
        # Retry once after 2 minutes
        try:
            self.retry(countdown=120)
        except self.MaxRetriesExceededError:
            logger.error("❌ Max retries exceeded for bulk notification")
            return {
                'status': 'failed',
                'error': str(e),
                'timestamp': datetime.utcnow().isoformat()
            }

@celery_app.task
def send_welcome_email(user_id: int):
    """
    Send welcome email to new user.
    
    Args:
        user_id: ID of the new user
    """
    try:
        db = SessionLocal()
        
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            logger.warning(f"⚠️ User {user_id} not found for welcome email")
            return {'status': 'not_found', 'user_id': user_id}
        
        subject = f"Welcome to {settings.business_name}!"
        
        # Send welcome email
        task = send_email_notification.delay(
            user.email,
            subject,
            "",  # Content will be generated from template
            template_name="welcome_email",
            template_data={
                'user_name': user.name if hasattr(user, 'name') else user.email,
                'business_name': settings.business_name,
                'business_phone': settings.business_phone,
                'dashboard_url': f"{settings.frontend_url}/dashboard"
            }
        )
        
        logger.info(f"✅ Welcome email scheduled for user {user_id}")
        
        return {
            'status': 'success',
            'user_id': user_id,
            'email_task_id': task.id,
            'timestamp': datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to send welcome email for user {user_id}: {e}")
        return {
            'status': 'error',
            'user_id': user_id,
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }
    finally:
        if 'db' in locals():
            db.close()

# Health check for notification tasks
@celery_app.task
def notification_health_check():
    """Health check for notification system"""
    try:
        # Test basic notification service functionality
        health_status = {
            'status': 'healthy',
            'email_service': notification_service.email_enabled,
            'sms_service': notification_service.sms_enabled,
            'timestamp': datetime.utcnow().isoformat()
        }
        
        return health_status
        
    except Exception as e:
        logger.error(f"❌ Notification health check failed: {e}")
        return {
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }