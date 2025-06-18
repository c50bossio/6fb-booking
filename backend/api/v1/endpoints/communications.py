"""
Communications API endpoints for email and SMS functionality
"""
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from database import get_db
from models.user import User
from models.communication import (
    EmailLog, SMSLog, NotificationPreference, 
    EmailStatus, SMSStatus, CommunicationTemplate
)
from services.email_service import email_service
from services.sms_service import sms_service
from utils.auth_decorators import get_current_user, require_permissions
from utils.logging import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/communications", tags=["communications"])


# Email endpoints

@router.post("/email/send")
async def send_email(
    to_email: str,
    subject: str,
    template: str,
    context: Dict[str, Any],
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Send an email using a template"""
    try:
        # Check if user has permission to send emails
        if not current_user.has_permission("send_emails"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to send emails"
            )
        
        # Send email in background
        background_tasks.add_task(
            email_service.send_email,
            db=db,
            to_email=to_email,
            subject=subject,
            template_name=template,
            context=context
        )
        
        return {"message": "Email queued for sending", "status": "pending"}
        
    except Exception as e:
        logger.error(f"Error queuing email: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to queue email"
        )


@router.post("/email/bulk")
async def send_bulk_email(
    recipients: List[Dict[str, Any]],
    subject: str,
    template: str,
    common_context: Optional[Dict[str, Any]] = None,
    background_tasks: BackgroundTasks = None,
    current_user: User = Depends(require_permissions(["send_bulk_emails"])),
    db: Session = Depends(get_db)
):
    """Send bulk emails to multiple recipients"""
    try:
        # Send emails in background
        background_tasks.add_task(
            email_service.send_bulk_emails,
            db=db,
            recipients=recipients,
            subject=subject,
            template_name=template,
            common_context=common_context or {}
        )
        
        return {
            "message": "Bulk email queued for sending",
            "recipient_count": len(recipients),
            "status": "pending"
        }
        
    except Exception as e:
        logger.error(f"Error queuing bulk email: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to queue bulk email"
        )


@router.get("/email/history")
async def get_email_history(
    limit: int = 50,
    offset: int = 0,
    status: Optional[EmailStatus] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get email sending history"""
    try:
        query = db.query(EmailLog)
        
        # Filter by user if not admin
        if current_user.role not in ["admin", "super_admin"]:
            query = query.filter(EmailLog.user_id == current_user.id)
        
        # Filter by status if provided
        if status:
            query = query.filter(EmailLog.status == status)
        
        # Get total count
        total = query.count()
        
        # Get paginated results
        emails = query.order_by(EmailLog.created_at.desc()).offset(offset).limit(limit).all()
        
        return {
            "total": total,
            "emails": [email.to_dict() for email in emails],
            "limit": limit,
            "offset": offset
        }
        
    except Exception as e:
        logger.error(f"Error fetching email history: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch email history"
        )


# SMS endpoints

@router.post("/sms/send")
async def send_sms(
    to_number: str,
    message: str,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Send an SMS message"""
    try:
        # Check if user has permission to send SMS
        if not current_user.has_permission("send_sms"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to send SMS messages"
            )
        
        # Send SMS in background
        background_tasks.add_task(
            sms_service.send_sms,
            db=db,
            to_number=to_number,
            message=message
        )
        
        return {"message": "SMS queued for sending", "status": "pending"}
        
    except Exception as e:
        logger.error(f"Error queuing SMS: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to queue SMS"
        )


@router.post("/sms/bulk")
async def send_bulk_sms(
    recipients: List[Dict[str, Any]],
    message_template: str,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_permissions(["send_bulk_sms"])),
    db: Session = Depends(get_db)
):
    """Send bulk SMS to multiple recipients"""
    try:
        # Send SMS in background
        background_tasks.add_task(
            sms_service.send_bulk_sms,
            db=db,
            recipients=recipients,
            message_template=message_template
        )
        
        return {
            "message": "Bulk SMS queued for sending",
            "recipient_count": len(recipients),
            "status": "pending"
        }
        
    except Exception as e:
        logger.error(f"Error queuing bulk SMS: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to queue bulk SMS"
        )


@router.get("/sms/history")
async def get_sms_history(
    limit: int = 50,
    offset: int = 0,
    status: Optional[SMSStatus] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get SMS sending history"""
    try:
        query = db.query(SMSLog)
        
        # Filter by user if not admin
        if current_user.role not in ["admin", "super_admin"]:
            query = query.filter(SMSLog.user_id == current_user.id)
        
        # Filter by status if provided
        if status:
            query = query.filter(SMSLog.status == status)
        
        # Get total count
        total = query.count()
        
        # Get paginated results
        sms_messages = query.order_by(SMSLog.created_at.desc()).offset(offset).limit(limit).all()
        
        return {
            "total": total,
            "messages": [sms.to_dict() for sms in sms_messages],
            "limit": limit,
            "offset": offset
        }
        
    except Exception as e:
        logger.error(f"Error fetching SMS history: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch SMS history"
        )


# Notification preferences

@router.get("/preferences")
async def get_notification_preferences(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's notification preferences"""
    try:
        preferences = db.query(NotificationPreference).filter(
            NotificationPreference.user_id == current_user.id
        ).first()
        
        if not preferences:
            # Create default preferences
            preferences = NotificationPreference(user_id=current_user.id)
            db.add(preferences)
            db.commit()
            db.refresh(preferences)
        
        return preferences.to_dict()
        
    except Exception as e:
        logger.error(f"Error fetching notification preferences: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch notification preferences"
        )


@router.put("/preferences")
async def update_notification_preferences(
    preferences: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update user's notification preferences"""
    try:
        # Get existing preferences or create new
        user_preferences = db.query(NotificationPreference).filter(
            NotificationPreference.user_id == current_user.id
        ).first()
        
        if not user_preferences:
            user_preferences = NotificationPreference(user_id=current_user.id)
            db.add(user_preferences)
        
        # Update preferences
        for category, settings in preferences.items():
            if category == "email":
                for key, value in settings.items():
                    setattr(user_preferences, f"email_{key}", value)
            elif category == "sms":
                for key, value in settings.items():
                    setattr(user_preferences, f"sms_{key}", value)
            elif category == "push":
                for key, value in settings.items():
                    setattr(user_preferences, f"push_{key}", value)
            elif category == "reminders":
                user_preferences.reminder_hours_before = settings.get("hours_before", 24)
                user_preferences.second_reminder_hours = settings.get("second_reminder_hours", 2)
            elif category == "quiet_hours":
                user_preferences.quiet_hours_enabled = settings.get("enabled", False)
                user_preferences.quiet_hours_start = settings.get("start", 22)
                user_preferences.quiet_hours_end = settings.get("end", 8)
        
        db.commit()
        db.refresh(user_preferences)
        
        return user_preferences.to_dict()
        
    except Exception as e:
        logger.error(f"Error updating notification preferences: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update notification preferences"
        )


# Test endpoints

@router.post("/test/email")
async def test_email(
    template: str = "welcome",
    background_tasks: BackgroundTasks = None,
    current_user: User = Depends(require_permissions(["test_communications"])),
    db: Session = Depends(get_db)
):
    """Send a test email to the current user"""
    try:
        test_context = {
            "user": {
                "first_name": current_user.first_name,
                "email": current_user.email,
                "role": current_user.role
            }
        }
        
        if template == "appointment_confirmation":
            test_context["appointment"] = {
                "id": "TEST123",
                "client_name": current_user.full_name,
                "service_name": "Test Service",
                "barber_name": "Test Barber",
                "date": datetime.now().strftime("%B %d, %Y"),
                "time": "2:00 PM",
                "duration": 60,
                "location_name": "Test Location",
                "location_address": "123 Test St, Test City, TC 12345",
                "price": 50.00
            }
        elif template == "payment_receipt":
            test_context["payment"] = {
                "id": "PAY123",
                "receipt_number": "REC-2024-001",
                "customer_name": current_user.full_name,
                "date": datetime.now().strftime("%B %d, %Y"),
                "amount": 50.00,
                "payment_method": "Credit Card",
                "card_last_four": "4242",
                "service_name": "Test Service",
                "barber_name": "Test Barber",
                "service_date": datetime.now().strftime("%B %d, %Y"),
                "service_amount": 45.00,
                "tip_amount": 5.00
            }
        
        # Send test email
        background_tasks.add_task(
            email_service.send_email,
            db=db,
            to_email=current_user.email,
            subject=f"Test Email - {template.replace('_', ' ').title()}",
            template_name=template,
            context=test_context
        )
        
        return {"message": f"Test email ({template}) sent to {current_user.email}"}
        
    except Exception as e:
        logger.error(f"Error sending test email: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send test email"
        )


@router.post("/test/sms")
async def test_sms(
    phone_number: Optional[str] = None,
    background_tasks: BackgroundTasks = None,
    current_user: User = Depends(require_permissions(["test_communications"])),
    db: Session = Depends(get_db)
):
    """Send a test SMS"""
    try:
        # Use provided number or user's phone
        to_number = phone_number or current_user.phone
        
        if not to_number:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No phone number provided and user has no phone number on file"
            )
        
        # Send test SMS
        background_tasks.add_task(
            sms_service.send_sms,
            db=db,
            to_number=to_number,
            message=f"Test SMS from 6FB Platform. Time: {datetime.now().strftime('%I:%M %p')}"
        )
        
        return {"message": f"Test SMS sent to {to_number}"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending test SMS: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send test SMS"
        )


# Template management

@router.get("/templates")
async def get_communication_templates(
    channel: Optional[str] = None,
    current_user: User = Depends(require_permissions(["manage_templates"])),
    db: Session = Depends(get_db)
):
    """Get communication templates"""
    try:
        query = db.query(CommunicationTemplate).filter(
            CommunicationTemplate.is_active == True
        )
        
        if channel:
            query = query.filter(CommunicationTemplate.channel == channel)
        
        templates = query.all()
        
        return [template.to_dict() for template in templates]
        
    except Exception as e:
        logger.error(f"Error fetching templates: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch templates"
        )


@router.post("/templates")
async def create_communication_template(
    template_data: Dict[str, Any],
    current_user: User = Depends(require_permissions(["manage_templates"])),
    db: Session = Depends(get_db)
):
    """Create a new communication template"""
    try:
        template = CommunicationTemplate(
            name=template_data["name"],
            type=template_data["type"],
            channel=template_data["channel"],
            subject=template_data.get("subject"),
            content=template_data["content"],
            variables=template_data.get("variables", [])
        )
        
        db.add(template)
        db.commit()
        db.refresh(template)
        
        return template.to_dict()
        
    except Exception as e:
        logger.error(f"Error creating template: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create template"
        )