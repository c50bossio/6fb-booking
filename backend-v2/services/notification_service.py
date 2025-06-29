from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import logging
import asyncio
import json
from jinja2 import Template, Environment, FileSystemLoader
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, Attachment, FileContent, FileName, FileType, Disposition
from twilio.rest import Client as TwilioClient
from twilio.base.exceptions import TwilioRestException
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc
from contextlib import asynccontextmanager
import redis
import celery
from pathlib import Path

from config import settings
from models import (
    User, Appointment, NotificationTemplate, NotificationPreference,
    NotificationQueue, NotificationStatus, Client
)
from database import get_db

logger = logging.getLogger(__name__)

# Initialize Redis for queueing
try:
    redis_client = redis.from_url(settings.redis_url)
except Exception as e:
    logger.warning(f"Redis connection failed: {e}. Falling back to database queueing.")
    redis_client = None


class NotificationService:
    def __init__(self):
        # Initialize SendGrid with enhanced configuration
        if settings.sendgrid_api_key and settings.sendgrid_api_key != "":
            self.sendgrid_client = SendGridAPIClient(settings.sendgrid_api_key)
            logger.info("SendGrid client initialized successfully")
        else:
            self.sendgrid_client = None
            logger.warning("SendGrid API key not configured")
        
        # Initialize Twilio with enhanced configuration
        if (settings.twilio_account_sid and settings.twilio_auth_token and 
            settings.twilio_account_sid != "" and settings.twilio_auth_token != ""):
            self.twilio_client = TwilioClient(
                settings.twilio_account_sid,
                settings.twilio_auth_token
            )
            logger.info("Twilio client initialized successfully")
        else:
            self.twilio_client = None
            logger.warning("Twilio credentials not configured")
        
        # Initialize template engine
        template_dir = Path(__file__).parent.parent / "templates" / "notifications"
        template_dir.mkdir(parents=True, exist_ok=True)
        self.jinja_env = Environment(
            loader=FileSystemLoader(str(template_dir)),
            autoescape=True
        )
        
        # Statistics tracking
        self.stats = {
            'emails_sent': 0,
            'emails_failed': 0,
            'sms_sent': 0,
            'sms_failed': 0,
            'last_reset': datetime.utcnow()
        }
    
    def render_template(self, template: NotificationTemplate, context: Dict[str, Any]) -> Dict[str, str]:
        """Render a notification template with the given context"""
        try:
            # Render body
            body_template = Template(template.body)
            rendered_body = body_template.render(**context)
            
            result = {"body": rendered_body}
            
            # Render subject for emails
            if template.template_type == "email" and template.subject:
                subject_template = Template(template.subject)
                result["subject"] = subject_template.render(**context)
            
            return result
        except Exception as e:
            logger.error(f"Error rendering template {template.name}: {str(e)}")
            raise
    
    def send_email(self, to_email: str, subject: str, body: str, 
                   template_id: Optional[str] = None, 
                   attachments: Optional[List[Dict]] = None,
                   retry_count: int = 0) -> Dict[str, Any]:
        """Send an email using SendGrid with enhanced error handling and features"""
        if not self.sendgrid_client:
            error_msg = "SendGrid client not initialized"
            logger.error(error_msg)
            return {"success": False, "error": error_msg, "retry_count": retry_count}
        
        try:
            # Validate email address
            if not to_email or '@' not in to_email:
                raise ValueError(f"Invalid email address: {to_email}")
            
            # Create message
            message = Mail(
                from_email=(settings.sendgrid_from_email, settings.sendgrid_from_name),
                to_emails=to_email,
                subject=subject,
                html_content=body
            )
            
            # Add template ID if provided (for SendGrid dynamic templates)
            if template_id:
                message.template_id = template_id
            
            # Add attachments if provided
            if attachments:
                for attachment_data in attachments:
                    attachment = Attachment(
                        FileContent(attachment_data.get('content', '')),
                        FileName(attachment_data.get('filename', 'attachment')),
                        FileType(attachment_data.get('type', 'application/octet-stream')),
                        Disposition(attachment_data.get('disposition', 'attachment'))
                    )
                    message.add_attachment(attachment)
            
            # Send email
            response = self.sendgrid_client.send(message)
            
            if response.status_code in [200, 202]:
                self.stats['emails_sent'] += 1
                logger.info(f"Email sent successfully to {to_email}, status: {response.status_code}")
                return {
                    "success": True, 
                    "status_code": response.status_code,
                    "message_id": getattr(response, 'message_id', None),
                    "retry_count": retry_count
                }
            else:
                raise Exception(f"SendGrid returned status {response.status_code}: {response.body}")
                
        except Exception as e:
            self.stats['emails_failed'] += 1
            error_msg = f"Error sending email to {to_email}: {str(e)}"
            logger.error(error_msg)
            
            # Determine if we should retry
            should_retry = (
                retry_count < settings.notification_retry_attempts and
                self._is_retryable_error(str(e))
            )
            
            return {
                "success": False, 
                "error": error_msg, 
                "retry_count": retry_count,
                "should_retry": should_retry
            }
    
    def send_sms(self, to_phone: str, body: str, retry_count: int = 0) -> Dict[str, Any]:
        """Send an SMS using Twilio with enhanced error handling"""
        if not self.twilio_client:
            error_msg = "Twilio client not initialized"
            logger.error(error_msg)
            return {"success": False, "error": error_msg, "retry_count": retry_count}
        
        try:
            # Validate and format phone number
            formatted_phone = self._format_phone_number(to_phone)
            if not formatted_phone:
                raise ValueError(f"Invalid phone number format: {to_phone}")
            
            # Validate SMS body length (Twilio limit is 1600 characters)
            if len(body) > 1600:
                logger.warning(f"SMS body truncated from {len(body)} to 1600 characters")
                body = body[:1597] + "..."
            
            # Send SMS
            message = self.twilio_client.messages.create(
                body=body,
                from_=settings.twilio_phone_number,
                to=formatted_phone
            )
            
            self.stats['sms_sent'] += 1
            logger.info(f"SMS sent successfully to {formatted_phone}, SID: {message.sid}")
            return {
                "success": True, 
                "message_sid": message.sid,
                "status": message.status,
                "retry_count": retry_count
            }
            
        except TwilioRestException as e:
            self.stats['sms_failed'] += 1
            error_msg = f"Twilio error sending SMS to {to_phone}: {e.msg} (Code: {e.code})"
            logger.error(error_msg)
            
            # Determine if we should retry based on Twilio error code
            should_retry = (
                retry_count < settings.notification_retry_attempts and
                self._is_retryable_twilio_error(e.code)
            )
            
            return {
                "success": False, 
                "error": error_msg, 
                "twilio_code": e.code,
                "retry_count": retry_count,
                "should_retry": should_retry
            }
            
        except Exception as e:
            self.stats['sms_failed'] += 1
            error_msg = f"Error sending SMS to {to_phone}: {str(e)}"
            logger.error(error_msg)
            
            should_retry = (
                retry_count < settings.notification_retry_attempts and
                self._is_retryable_error(str(e))
            )
            
            return {
                "success": False, 
                "error": error_msg, 
                "retry_count": retry_count,
                "should_retry": should_retry
            }
    
    def queue_notification(
        self,
        db: Session,
        user: User,
        template_name: str,
        context: Dict[str, Any],
        scheduled_for: Optional[datetime] = None,
        appointment_id: Optional[int] = None
    ) -> List[NotificationQueue]:
        """Queue notifications based on user preferences"""
        # Get template
        template_email = db.query(NotificationTemplate).filter(
            and_(
                NotificationTemplate.name == template_name,
                NotificationTemplate.template_type == "email",
                NotificationTemplate.is_active == True
            )
        ).first()
        
        template_sms = db.query(NotificationTemplate).filter(
            and_(
                NotificationTemplate.name == template_name,
                NotificationTemplate.template_type == "sms",
                NotificationTemplate.is_active == True
            )
        ).first()
        
        if not template_email and not template_sms:
            logger.error(f"No active templates found for {template_name}")
            return []
        
        # Get user preferences
        preferences = db.query(NotificationPreference).filter(
            NotificationPreference.user_id == user.id
        ).first()
        
        # Default preferences if not set
        if not preferences:
            preferences = NotificationPreference(
                user_id=user.id,
                email_enabled=True,
                sms_enabled=True,
                email_appointment_confirmation=True,
                sms_appointment_confirmation=True,
                email_appointment_reminder=True,
                sms_appointment_reminder=True,
                email_appointment_changes=True,
                sms_appointment_changes=True
            )
            db.add(preferences)
            db.commit()
        
        queued_notifications = []
        
        # Check if email should be sent
        should_send_email = False
        if preferences.email_enabled and template_email and user.email:
            if "confirmation" in template_name and preferences.email_appointment_confirmation:
                should_send_email = True
            elif "reminder" in template_name and preferences.email_appointment_reminder:
                should_send_email = True
            elif "change" in template_name and preferences.email_appointment_changes:
                should_send_email = True
            elif "confirmation" not in template_name and "reminder" not in template_name and "change" not in template_name:
                should_send_email = True  # Other notification types
        
        if should_send_email:
            rendered = self.render_template(template_email, context)
            notification = NotificationQueue(
                user_id=user.id,
                appointment_id=appointment_id,
                notification_type="email",
                template_name=template_name,
                recipient=user.email,
                subject=rendered.get("subject", ""),
                body=rendered["body"],
                scheduled_for=scheduled_for or datetime.utcnow(),
                status=NotificationStatus.PENDING
            )
            db.add(notification)
            queued_notifications.append(notification)
        
        # Check if SMS should be sent
        should_send_sms = False
        if preferences.sms_enabled and template_sms and user.phone:
            if "confirmation" in template_name and preferences.sms_appointment_confirmation:
                should_send_sms = True
            elif "reminder" in template_name and preferences.sms_appointment_reminder:
                should_send_sms = True
            elif "change" in template_name and preferences.sms_appointment_changes:
                should_send_sms = True
            elif "confirmation" not in template_name and "reminder" not in template_name and "change" not in template_name:
                should_send_sms = True  # Other notification types
        
        if should_send_sms:
            rendered = self.render_template(template_sms, context)
            notification = NotificationQueue(
                user_id=user.id,
                appointment_id=appointment_id,
                notification_type="sms",
                template_name=template_name,
                recipient=user.phone,
                body=rendered["body"],
                scheduled_for=scheduled_for or datetime.utcnow(),
                status=NotificationStatus.PENDING
            )
            db.add(notification)
            queued_notifications.append(notification)
        
        db.commit()
        return queued_notifications
    
    def schedule_appointment_reminders(self, db: Session, appointment: Appointment):
        """Schedule reminder notifications for an appointment"""
        # Get user preferences
        preferences = db.query(NotificationPreference).filter(
            NotificationPreference.user_id == appointment.user_id
        ).first()
        
        reminder_hours = preferences.reminder_hours if preferences else settings.appointment_reminder_hours
        
        # Create context for templates
        client = db.query(Client).filter(Client.id == appointment.client_id).first() if appointment.client_id else None
        context = {
            "user_name": appointment.user.name,
            "client_name": f"{client.first_name} {client.last_name}" if client else "Guest",
            "service_name": appointment.service_name,
            "appointment_date": appointment.start_time.strftime("%B %d, %Y"),
            "appointment_time": appointment.start_time.strftime("%I:%M %p"),
            "duration": appointment.duration_minutes,
            "price": appointment.price,
            "business_name": settings.app_name
        }
        
        # Schedule reminders
        for hours_before in reminder_hours:
            reminder_time = appointment.start_time - timedelta(hours=hours_before)
            if reminder_time > datetime.utcnow():
                self.queue_notification(
                    db=db,
                    user=appointment.user,
                    template_name="appointment_reminder",
                    context=context,
                    scheduled_for=reminder_time,
                    appointment_id=appointment.id
                )
    
    def process_notification_queue(self, db: Session, batch_size: int = 50):
        """Process pending notifications in the queue with enhanced error handling"""
        # Get pending notifications that are due
        pending = db.query(NotificationQueue).filter(
            and_(
                NotificationQueue.status == NotificationStatus.PENDING,
                NotificationQueue.scheduled_for <= datetime.utcnow(),
                NotificationQueue.attempts < settings.notification_retry_attempts
            )
        ).order_by(NotificationQueue.scheduled_for).limit(batch_size).all()
        
        processed_count = 0
        success_count = 0
        failed_count = 0
        
        for notification in pending:
            processed_count += 1
            result = None
            
            try:
                if notification.notification_type == "email":
                    result = self.send_email(
                        notification.recipient,
                        notification.subject or "",
                        notification.body,
                        retry_count=notification.attempts
                    )
                elif notification.notification_type == "sms":
                    result = self.send_sms(
                        notification.recipient,
                        notification.body,
                        retry_count=notification.attempts
                    )
                else:
                    result = {"success": False, "error": f"Unknown notification type: {notification.notification_type}"}
                
                # Update notification based on result
                if result and result.get("success"):
                    notification.status = NotificationStatus.SENT
                    notification.sent_at = datetime.utcnow()
                    notification.notification_metadata = json.dumps(result)
                    success_count += 1
                    logger.info(f"Notification {notification.id} sent successfully")
                else:
                    # Handle failure
                    notification.attempts += 1
                    notification.error_message = result.get("error", "Unknown error") if result else "No result returned"
                    
                    # Check if we should retry
                    should_retry = result.get("should_retry", False) if result else False
                    
                    if notification.attempts >= settings.notification_retry_attempts or not should_retry:
                        notification.status = NotificationStatus.FAILED
                        failed_count += 1
                        logger.error(f"Notification {notification.id} failed permanently: {notification.error_message}")
                    else:
                        # Schedule retry with exponential backoff
                        retry_delay = settings.notification_retry_delay_seconds * (2 ** (notification.attempts - 1))
                        notification.scheduled_for = datetime.utcnow() + timedelta(seconds=retry_delay)
                        logger.warning(f"Notification {notification.id} scheduled for retry in {retry_delay} seconds")
                    
                    notification.notification_metadata = json.dumps(result) if result else None
                    
            except Exception as e:
                notification.attempts += 1
                notification.error_message = f"Unexpected error: {str(e)}"
                
                if notification.attempts >= settings.notification_retry_attempts:
                    notification.status = NotificationStatus.FAILED
                    failed_count += 1
                else:
                    # Schedule retry
                    retry_delay = settings.notification_retry_delay_seconds * (2 ** (notification.attempts - 1))
                    notification.scheduled_for = datetime.utcnow() + timedelta(seconds=retry_delay)
                
                logger.error(f"Exception processing notification {notification.id}: {str(e)}")
            
            # Update the notification in database
            notification.updated_at = datetime.utcnow()
            
        # Commit all changes
        db.commit()
        
        logger.info(f"Processed {processed_count} notifications: {success_count} successful, {failed_count} failed")
        return {"processed": processed_count, "successful": success_count, "failed": failed_count}
    
    def cancel_appointment_notifications(self, db: Session, appointment_id: int):
        """Cancel all pending notifications for an appointment"""
        cancelled_count = db.query(NotificationQueue).filter(
            and_(
                NotificationQueue.appointment_id == appointment_id,
                NotificationQueue.status == NotificationStatus.PENDING
            )
        ).update({
            NotificationQueue.status: NotificationStatus.CANCELLED,
            NotificationQueue.updated_at: datetime.utcnow()
        })
        db.commit()
        logger.info(f"Cancelled {cancelled_count} notifications for appointment {appointment_id}")
        return cancelled_count
    
    def get_notification_history(self, db: Session, user_id: Optional[int] = None, 
                               appointment_id: Optional[int] = None, 
                               limit: int = 100) -> List[NotificationQueue]:
        """Get notification history with filtering options"""
        query = db.query(NotificationQueue)
        
        if user_id:
            query = query.filter(NotificationQueue.user_id == user_id)
        if appointment_id:
            query = query.filter(NotificationQueue.appointment_id == appointment_id)
        
        return query.order_by(desc(NotificationQueue.created_at)).limit(limit).all()
    
    def get_notification_stats(self, db: Session, days: int = 7) -> Dict[str, Any]:
        """Get notification statistics for the last N days"""
        since_date = datetime.utcnow() - timedelta(days=days)
        
        # Database stats
        db_stats = db.query(
            NotificationQueue.status,
            NotificationQueue.notification_type,
            db.func.count(NotificationQueue.id).label('count')
        ).filter(
            NotificationQueue.created_at >= since_date
        ).group_by(
            NotificationQueue.status, 
            NotificationQueue.notification_type
        ).all()
        
        # Process stats
        stats = {
            'period_days': days,
            'since_date': since_date.isoformat(),
            'email': {'sent': 0, 'failed': 0, 'pending': 0, 'cancelled': 0},
            'sms': {'sent': 0, 'failed': 0, 'pending': 0, 'cancelled': 0},
            'service_stats': self.stats.copy()
        }
        
        for status, notification_type, count in db_stats:
            if notification_type in stats:
                status_key = status.value if hasattr(status, 'value') else str(status).lower()
                if status_key in stats[notification_type]:
                    stats[notification_type][status_key] = count
        
        return stats
    
    def _format_phone_number(self, phone: str) -> Optional[str]:
        """Format phone number to E.164 format"""
        if not phone:
            return None
        
        # Remove all non-digit characters
        digits_only = ''.join(filter(str.isdigit, phone))
        
        # Handle different formats
        if len(digits_only) == 10:  # US number without country code
            return f'+1{digits_only}'
        elif len(digits_only) == 11 and digits_only.startswith('1'):  # US number with country code
            return f'+{digits_only}'
        elif phone.startswith('+'):
            return phone  # Already formatted
        else:
            # Try to determine country code or return None for invalid formats
            logger.warning(f"Unable to format phone number: {phone}")
            return None
    
    def _is_retryable_error(self, error_msg: str) -> bool:
        """Determine if an error is retryable"""
        retryable_patterns = [
            'timeout', 'connection', 'network', 'temporary', 'rate limit',
            'service unavailable', '502', '503', '504', '429'
        ]
        error_lower = error_msg.lower()
        return any(pattern in error_lower for pattern in retryable_patterns)
    
    def _is_retryable_twilio_error(self, error_code: int) -> bool:
        """Determine if a Twilio error code is retryable"""
        # Retryable Twilio error codes
        retryable_codes = {
            20429,  # Too Many Requests
            30001,  # Queue overflow
            30002,  # Account suspended
            30003,  # Unreachable destination handset
            30004,  # Message blocked
            30005,  # Unknown destination handset
            30006,  # Landline or unreachable carrier
        }
        
        # Non-retryable codes (don't retry these)
        non_retryable_codes = {
            21211,  # Invalid 'To' Phone Number
            21212,  # Invalid 'From' Phone Number
            21610,  # Attempt to send to unsubscribed recipient
            21614,  # 'To' number is not a valid mobile number
        }
        
        if error_code in non_retryable_codes:
            return False
        elif error_code in retryable_codes:
            return True
        else:
            # Default to retryable for unknown codes (except validation errors)
            return error_code < 21000 or error_code > 22000
    
    def bulk_queue_notifications(self, db: Session, notifications: List[Dict[str, Any]]) -> List[NotificationQueue]:
        """Queue multiple notifications in bulk for better performance"""
        queued_notifications = []
        
        for notification_data in notifications:
            try:
                notifications = self.queue_notification(
                    db=db,
                    user=notification_data['user'],
                    template_name=notification_data['template_name'],
                    context=notification_data['context'],
                    scheduled_for=notification_data.get('scheduled_for'),
                    appointment_id=notification_data.get('appointment_id')
                )
                queued_notifications.extend(notifications)
            except Exception as e:
                logger.error(f"Error queuing bulk notification: {str(e)}")
                continue
        
        logger.info(f"Bulk queued {len(queued_notifications)} notifications")
        return queued_notifications


# Singleton instance
notification_service = NotificationService()