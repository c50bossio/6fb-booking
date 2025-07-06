from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime, timedelta, timezone

from database import get_db
from models import (
    User, NotificationTemplate, NotificationPreference, 
    NotificationQueue, NotificationStatus
)
from schemas import (
    NotificationPreferenceCreate, NotificationPreferenceResponse,
    NotificationTemplateResponse, NotificationHistoryResponse,
    NotificationStatsResponse
)
from utils.auth import get_current_user
from services.notification_service import NotificationService
import logging

logger = logging.getLogger(__name__)

# Create notification service instance
notification_service = NotificationService()

router = APIRouter(prefix="/notifications", tags=["notifications"])

@router.get("/preferences", response_model=NotificationPreferenceResponse)
async def get_notification_preferences(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's notification preferences"""
    preferences = db.query(NotificationPreference).filter(
        NotificationPreference.user_id == current_user.id
    ).first()
    
    if not preferences:
        # Create default preferences
        preferences = NotificationPreference(
            user_id=current_user.id,
            email_enabled=True,
            sms_enabled=True,
            email_appointment_confirmation=True,
            sms_appointment_confirmation=True,
            email_appointment_reminder=True,
            sms_appointment_reminder=True,
            email_appointment_changes=True,
            sms_appointment_changes=True,
            reminder_hours=[24, 2]
        )
        db.add(preferences)
        db.commit()
        db.refresh(preferences)
    
    return preferences

@router.put("/preferences", response_model=NotificationPreferenceResponse)
async def update_notification_preferences(
    preferences_data: NotificationPreferenceCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update current user's notification preferences"""
    preferences = db.query(NotificationPreference).filter(
        NotificationPreference.user_id == current_user.id
    ).first()
    
    if not preferences:
        preferences = NotificationPreference(user_id=current_user.id)
        db.add(preferences)
    
    # Update preferences
    for field, value in preferences_data.model_dump(exclude_unset=True).items():
        setattr(preferences, field, value)
    
    preferences.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(preferences)
    
    logger.info(f"Updated notification preferences for user {current_user.id}")
    return preferences

@router.get("/templates", response_model=List[NotificationTemplateResponse])
async def get_notification_templates(
    template_type: Optional[str] = Query(None, description="Filter by template type (email/sms)"),
    active_only: bool = Query(True, description="Return only active templates"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get available notification templates"""
    query = db.query(NotificationTemplate)
    
    if template_type:
        query = query.filter(NotificationTemplate.template_type == template_type)
    
    if active_only:
        query = query.filter(NotificationTemplate.is_active == True)
    
    templates = query.order_by(NotificationTemplate.name, NotificationTemplate.template_type).all()
    return templates

@router.get("/history", response_model=List[NotificationHistoryResponse])
async def get_notification_history(
    limit: int = Query(50, le=200, description="Maximum number of notifications to return"),
    appointment_id: Optional[int] = Query(None, description="Filter by appointment ID"),
    notification_type: Optional[str] = Query(None, description="Filter by type (email/sms)"),
    status: Optional[str] = Query(None, description="Filter by status"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get notification history for current user"""
    notifications = notification_service.get_notification_history(
        db=db,
        user_id=current_user.id,
        appointment_id=appointment_id,
        limit=limit
    )
    
    # Filter by additional criteria if provided
    if notification_type:
        notifications = [n for n in notifications if n.notification_type == notification_type]
    
    if status:
        notifications = [n for n in notifications if n.status.value == status]
    
    return notifications

@router.get("/stats", response_model=NotificationStatsResponse)
async def get_notification_stats(
    days: int = Query(7, ge=1, le=90, description="Number of days to include in stats"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get notification statistics"""
    # Check if user is admin/barber to see global stats
    if current_user.role in ['admin', 'barber']:
        stats = notification_service.get_notification_stats(db=db, days=days)
    else:
        # Regular users only see their own stats
        since_date = datetime.now(timezone.utc) - timedelta(days=days)
        user_notifications = db.query(NotificationQueue).filter(
            NotificationQueue.user_id == current_user.id,
            NotificationQueue.created_at >= since_date
        ).all()
        
        stats = {
            'period_days': days,
            'since_date': since_date.isoformat(),
            'email': {'sent': 0, 'failed': 0, 'pending': 0, 'cancelled': 0},
            'sms': {'sent': 0, 'failed': 0, 'pending': 0, 'cancelled': 0},
            'user_specific': True
        }
        
        for notification in user_notifications:
            ntype = notification.notification_type
            nstatus = notification.status.value if hasattr(notification.status, 'value') else str(notification.status).lower()
            
            if ntype in stats and nstatus in stats[ntype]:
                stats[ntype][nstatus] += 1
    
    return stats

@router.post("/test-email")
async def send_test_email(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Send a test email notification"""
    if not current_user.email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User does not have an email address"
        )
    
    # Create test context
    context = {
        "client_name": current_user.name or "Test User",
        "service_name": "Test Service",
        "appointment_date": "Tomorrow",
        "appointment_time": "2:00 PM",
        "duration": 30,
        "price": 50.00,
        "business_name": "6FB Booking Test",
        "current_year": datetime.now().year
    }
    
    try:
        # Queue test notification
        notifications = notification_service.queue_notification(
            db=db,
            user=current_user,
            template_name="appointment_confirmation",
            context=context
        )
        
        # Process immediately for testing
        result = notification_service.process_notification_queue(db=db, batch_size=10)
        
        return {
            "message": "Test email queued and processed",
            "notifications_queued": len(notifications),
            "processing_result": result
        }
    except Exception as e:
        logger.error(f"Error sending test email: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send test email: {str(e)}"
        )

@router.post("/test-sms")
async def send_test_sms(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Send a test SMS notification"""
    if not current_user.phone:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User does not have a phone number"
        )
    
    # Create test context
    context = {
        "client_name": current_user.name or "Test User",
        "service_name": "Test Service",
        "appointment_date": "Tomorrow",
        "appointment_time": "2:00 PM",
        "price": 50.00,
        "business_name": "6FB Booking Test",
        "business_phone": "(555) 123-4567"
    }
    
    try:
        # Queue test notification
        notifications = notification_service.queue_notification(
            db=db,
            user=current_user,
            template_name="appointment_confirmation",
            context=context
        )
        
        # Process immediately for testing
        result = notification_service.process_notification_queue(db=db, batch_size=10)
        
        return {
            "message": "Test SMS queued and processed",
            "notifications_queued": len(notifications),
            "processing_result": result
        }
    except Exception as e:
        logger.error(f"Error sending test SMS: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send test SMS: {str(e)}"
        )

@router.post("/process-queue")
async def process_notification_queue(
    batch_size: int = Query(50, ge=1, le=200, description="Number of notifications to process"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Manually process the notification queue (admin only)"""
    if current_user.role not in ['admin', 'barber']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions"
        )
    
    try:
        result = notification_service.process_notification_queue(db=db, batch_size=batch_size)
        return {
            "message": "Notification queue processed",
            "result": result
        }
    except Exception as e:
        logger.error(f"Error processing notification queue: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process queue: {str(e)}"
        )

@router.delete("/history/{notification_id}")
async def cancel_notification(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Cancel a pending notification"""
    notification = db.query(NotificationQueue).filter(
        NotificationQueue.id == notification_id,
        NotificationQueue.user_id == current_user.id,
        NotificationQueue.status == NotificationStatus.PENDING
    ).first()
    
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found or cannot be cancelled"
        )
    
    notification.status = NotificationStatus.CANCELLED
    notification.updated_at = datetime.now(timezone.utc)
    db.commit()
    
    logger.info(f"Cancelled notification {notification_id} by user {current_user.id}")
    return {"message": "Notification cancelled successfully"}