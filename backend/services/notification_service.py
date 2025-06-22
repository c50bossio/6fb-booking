"""
Notification service for real-time updates and email notifications
"""
from typing import Dict, List, Optional
from sqlalchemy.orm import Session
from datetime import datetime
import asyncio
import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from models.user import User
from models.notification import Notification, NotificationType
from websocket.connection_manager import manager
from utils.logging import get_logger

logger = get_logger(__name__)


class NotificationService:
    """Service for managing notifications and email"""
    
    def __init__(self):
        # Email configuration
        self.smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.smtp_username = os.getenv("SMTP_USERNAME")
        self.smtp_password = os.getenv("SMTP_PASSWORD")
        self.from_email = os.getenv("FROM_EMAIL", "noreply@6fb.com")
    
    def send_email(self, to_email: str, subject: str, message: str, html_message: str = None) -> bool:
        """Send email notification"""
        try:
            if not self.smtp_username or not self.smtp_password:
                logger.warning("SMTP credentials not configured, skipping email")
                return False
            
            # Create message
            msg = MIMEMultipart('alternative')
            msg['From'] = self.from_email
            msg['To'] = to_email
            msg['Subject'] = subject
            
            # Add text part
            text_part = MIMEText(message, 'plain')
            msg.attach(text_part)
            
            # Add HTML part if provided
            if html_message:
                html_part = MIMEText(html_message, 'html')
                msg.attach(html_part)
            
            # Send email
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_username, self.smtp_password)
                server.send_message(msg)
            
            logger.info(f"Email sent successfully to {to_email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {str(e)}")
            return False
    
    @staticmethod
    async def send_appointment_notification(
        db: Session,
        user_id: int,
        appointment_data: dict,
        notification_type: str
    ):
        """Send appointment-related notifications"""
        
        # Create notification record
        notification = Notification(
            user_id=user_id,
            type=notification_type,
            title=f"Appointment {notification_type.replace('_', ' ').title()}",
            message=appointment_data.get("message", ""),
            data=appointment_data,
            is_read=False
        )
        db.add(notification)
        db.commit()
        
        # Send real-time notification
        await manager.send_notification(
            user_id=user_id,
            notification_type="appointment",
            data={
                "id": notification.id,
                "type": notification_type,
                "appointment_id": appointment_data.get("appointment_id"),
                "title": notification.title,
                "message": notification.message,
                "data": appointment_data
            }
        )
        
        logger.info(f"Sent appointment notification to user {user_id}: {notification_type}")
    
    @staticmethod
    async def send_performance_alert(
        db: Session,
        user_id: int,
        metric_type: str,
        current_value: float,
        threshold: float,
        trend: str
    ):
        """Send performance-related alerts"""
        
        message = f"Your {metric_type} is {trend} ({current_value:.1f})"
        
        # Create notification record
        notification = Notification(
            user_id=user_id,
            type=NotificationType.PERFORMANCE_ALERT,
            title="Performance Alert",
            message=message,
            data={
                "metric_type": metric_type,
                "current_value": current_value,
                "threshold": threshold,
                "trend": trend
            },
            is_read=False
        )
        db.add(notification)
        db.commit()
        
        # Send real-time notification
        await manager.send_notification(
            user_id=user_id,
            notification_type="performance_alert",
            data={
                "id": notification.id,
                "metric_type": metric_type,
                "current_value": current_value,
                "threshold": threshold,
                "trend": trend,
                "message": message
            }
        )
    
    @staticmethod
    async def send_team_update(
        db: Session,
        location_id: int,
        update_type: str,
        data: dict
    ):
        """Send team-wide updates to a location"""
        
        # Get all users at the location
        users = db.query(User).filter(
            User.primary_location_id == location_id,
            User.is_active == True
        ).all()
        
        # Create notifications for each user
        for user in users:
            notification = Notification(
                user_id=user.id,
                type=NotificationType.TEAM_UPDATE,
                title=f"Team Update: {update_type.replace('_', ' ').title()}",
                message=data.get("message", ""),
                data=data,
                is_read=False
            )
            db.add(notification)
        
        db.commit()
        
        # Send location-wide broadcast
        await manager.send_location_message(
            message={
                "type": "team_update",
                "update_type": update_type,
                "data": data,
                "timestamp": datetime.utcnow().isoformat()
            },
            location_id=location_id
        )
    
    @staticmethod
    async def send_training_notification(
        db: Session,
        user_id: int,
        module_name: str,
        notification_type: str,
        data: dict
    ):
        """Send training-related notifications"""
        
        # Create notification record
        notification = Notification(
            user_id=user_id,
            type=NotificationType.TRAINING,
            title=f"Training: {module_name}",
            message=data.get("message", ""),
            data={
                "module_name": module_name,
                "notification_type": notification_type,
                **data
            },
            is_read=False
        )
        db.add(notification)
        db.commit()
        
        # Send real-time notification
        await manager.send_notification(
            user_id=user_id,
            notification_type="training",
            data={
                "id": notification.id,
                "module_name": module_name,
                "type": notification_type,
                "data": data
            }
        )
    
    @staticmethod
    async def send_revenue_milestone(
        db: Session,
        user_id: int,
        milestone_type: str,
        amount: float,
        period: str
    ):
        """Send revenue milestone notifications"""
        
        message = f"Congratulations! You've reached ${amount:,.2f} in {period} revenue!"
        
        # Create notification record
        notification = Notification(
            user_id=user_id,
            type=NotificationType.ACHIEVEMENT,
            title="Revenue Milestone Achieved! 🎉",
            message=message,
            data={
                "milestone_type": milestone_type,
                "amount": amount,
                "period": period
            },
            is_read=False,
            priority="high"
        )
        db.add(notification)
        db.commit()
        
        # Send real-time notification with celebration
        await manager.send_notification(
            user_id=user_id,
            notification_type="achievement",
            data={
                "id": notification.id,
                "type": "revenue_milestone",
                "amount": amount,
                "period": period,
                "message": message,
                "celebration": True
            }
        )
    
    @staticmethod
    def get_user_notifications(
        db: Session,
        user_id: int,
        unread_only: bool = False,
        limit: int = 50
    ) -> List[Notification]:
        """Get notifications for a user"""
        
        query = db.query(Notification).filter(
            Notification.user_id == user_id
        )
        
        if unread_only:
            query = query.filter(Notification.is_read == False)
        
        return query.order_by(
            Notification.created_at.desc()
        ).limit(limit).all()
    
    @staticmethod
    def mark_as_read(
        db: Session,
        notification_id: int,
        user_id: int
    ) -> bool:
        """Mark a notification as read"""
        
        notification = db.query(Notification).filter(
            Notification.id == notification_id,
            Notification.user_id == user_id
        ).first()
        
        if notification:
            notification.is_read = True
            notification.read_at = datetime.utcnow()
            db.commit()
            return True
        
        return False
    
    @staticmethod
    def mark_all_as_read(db: Session, user_id: int):
        """Mark all notifications as read for a user"""
        
        db.query(Notification).filter(
            Notification.user_id == user_id,
            Notification.is_read == False
        ).update({
            "is_read": True,
            "read_at": datetime.utcnow()
        })
        db.commit()


# Example usage in other services
async def notify_appointment_booked(db: Session, appointment: dict):
    """Example: Notify when appointment is booked"""
    notification_service = NotificationService()
    
    # Notify barber
    await notification_service.send_appointment_notification(
        db=db,
        user_id=appointment["barber_user_id"],
        appointment_data={
            "appointment_id": appointment["id"],
            "client_name": appointment["client_name"],
            "service": appointment["service_name"],
            "time": appointment["appointment_time"],
            "message": f"New appointment booked with {appointment['client_name']}"
        },
        notification_type="new_booking"
    )
    
    # Notify receptionist if applicable
    if appointment.get("receptionist_user_id"):
        await notification_service.send_appointment_notification(
            db=db,
            user_id=appointment["receptionist_user_id"],
            appointment_data={
                "appointment_id": appointment["id"],
                "barber_name": appointment["barber_name"],
                "client_name": appointment["client_name"],
                "message": f"Appointment booked for {appointment['barber_name']}"
            },
            notification_type="booking_created"
        )