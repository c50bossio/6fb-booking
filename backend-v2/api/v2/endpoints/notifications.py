"""
Smart Notifications API V2 - Six Figure Barber Intelligence
===========================================================

V2 API endpoints for the intelligent notifications system that transforms
passive analytics into proactive business intelligence.

This addresses the user's requirement: "There should be nothing V1, only V2."
All endpoints use the /api/v2/ prefix as requested.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import time

from database import get_db
from models import User
from utils.auth import get_current_user
from services.smart_notifications_service import SmartNotificationsService
from schemas.notifications import (
    SmartNotificationResponse,
    NotificationSummaryResponse,
    NotificationUpdateRequest,
    NotificationFilterRequest,
    NotificationTypesResponse,
    NotificationTypeInfo,
    NotificationGenerationRequest,
    NotificationGenerationResponse,
    NotificationPriorityResponse,
    NotificationTypeResponse
)

router = APIRouter(prefix="/api/v2/notifications", tags=["notifications-v2"])

@router.get("/", response_model=List[SmartNotificationResponse])
async def get_smart_notifications(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    analysis_period_days: int = Query(30, ge=7, le=365, description="Days of data to analyze"),
    priority: Optional[str] = Query(None, description="Filter by priority: urgent, high, medium, low"),
    notification_type: Optional[str] = Query(None, description="Filter by type"),
    unread_only: bool = Query(False, description="Show only unread notifications"),
    actionable_only: bool = Query(False, description="Show only actionable notifications")
):
    """
    Get smart notifications for the authenticated user
    
    Returns intelligent, actionable notifications based on business metrics analysis.
    Notifications are prioritized by potential revenue impact and urgency aligned
    with Six Figure Barber methodology.
    """
    try:
        notifications_service = SmartNotificationsService(db)
        notifications = notifications_service.generate_smart_notifications(
            user_id=user.id,
            analysis_period_days=analysis_period_days
        )
        
        # Apply filters
        if priority:
            notifications = [n for n in notifications if n.priority.value == priority.lower()]
        
        if notification_type:
            notifications = [n for n in notifications if n.type.value == notification_type.lower()]
        
        if unread_only:
            notifications = [n for n in notifications if not n.is_read]
            
        if actionable_only:
            notifications = [n for n in notifications if n.is_actionable]
        
        return [SmartNotificationResponse.from_notification(n) for n in notifications]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch notifications: {str(e)}")

@router.get("/summary", response_model=NotificationSummaryResponse)
async def get_notification_summary(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get notification summary with key metrics and top priority actions
    
    Provides a high-level overview of all notifications including:
    - Total notification counts by priority
    - Estimated revenue impact
    - Top priority actionable items for Six Figure success
    """
    try:
        notifications_service = SmartNotificationsService(db)
        summary = notifications_service.get_notification_summary(user_id=user.id)
        
        return NotificationSummaryResponse.from_summary(summary)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch notification summary: {str(e)}")

@router.put("/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Mark a notification as read
    
    Updates the read status of a specific notification for the authenticated user.
    This helps track which business intelligence alerts have been reviewed.
    """
    try:
        notifications_service = SmartNotificationsService(db)
        success = notifications_service.mark_notification_read(
            notification_id=notification_id,
            user_id=user.id
        )
        
        if not success:
            raise HTTPException(status_code=404, detail="Notification not found")
        
        return {"success": True, "message": "Notification marked as read"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update notification: {str(e)}")

@router.delete("/{notification_id}")
async def dismiss_notification(
    notification_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Dismiss a notification
    
    Removes a notification from the user's notification list.
    Use this when the notification is no longer relevant or has been acted upon.
    """
    try:
        notifications_service = SmartNotificationsService(db)
        success = notifications_service.dismiss_notification(
            notification_id=notification_id,
            user_id=user.id
        )
        
        if not success:
            raise HTTPException(status_code=404, detail="Notification not found")
        
        return {"success": True, "message": "Notification dismissed"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to dismiss notification: {str(e)}")

@router.get("/types", response_model=NotificationTypesResponse)
async def get_notification_types():
    """
    Get available notification types and priority levels
    
    Returns metadata about all available notification types and their
    typical priorities for building the frontend UI.
    """
    notification_types = [
        NotificationTypeInfo(
            value="at_risk_client",
            label="At-Risk Client",
            description="High-value clients who haven't booked recently and may churn",
            typical_priority=NotificationPriorityResponse.URGENT,
            icon="user-exclamation"
        ),
        NotificationTypeInfo(
            value="pricing_opportunity",
            label="Pricing Opportunity", 
            description="Services that can be priced higher based on performance data",
            typical_priority=NotificationPriorityResponse.HIGH,
            icon="dollar-sign"
        ),
        NotificationTypeInfo(
            value="milestone_achievement",
            label="Milestone Achievement",
            description="Six Figure Barber milestone celebrations and achievements",
            typical_priority=NotificationPriorityResponse.HIGH,
            icon="trophy"
        ),
        NotificationTypeInfo(
            value="service_performance",
            label="Service Performance",
            description="Service-specific performance alerts and warnings",
            typical_priority=NotificationPriorityResponse.MEDIUM,
            icon="chart-bar"
        ),
        NotificationTypeInfo(
            value="revenue_opportunity",
            label="Revenue Opportunity",
            description="Opportunities to increase revenue through bundling or upselling",
            typical_priority=NotificationPriorityResponse.MEDIUM,
            icon="trending-up"
        ),
        NotificationTypeInfo(
            value="business_coaching",
            label="Business Coaching",
            description="Six Figure Barber methodology guidance and coaching tips",
            typical_priority=NotificationPriorityResponse.MEDIUM,
            icon="lightbulb"
        ),
        NotificationTypeInfo(
            value="six_figure_progress",
            label="Six Figure Progress",
            description="Progress tracking toward Six Figure revenue goals",
            typical_priority=NotificationPriorityResponse.MEDIUM,
            icon="target"
        ),
        NotificationTypeInfo(
            value="client_outreach",
            label="Client Outreach",
            description="Client re-engagement and retention opportunities",
            typical_priority=NotificationPriorityResponse.HIGH,
            icon="mail"
        )
    ]
    
    priority_levels = [
        {
            "value": "urgent",
            "label": "Urgent",
            "description": "Requires immediate attention within 24 hours",
            "color": "red"
        },
        {
            "value": "high",
            "label": "High",
            "description": "Important, should be addressed within a few days",
            "color": "orange"
        },
        {
            "value": "medium",
            "label": "Medium", 
            "description": "Moderate importance, address within a week",
            "color": "blue"
        },
        {
            "value": "low",
            "label": "Low",
            "description": "Low priority, can be addressed when convenient",
            "color": "gray"
        }
    ]
    
    return NotificationTypesResponse(
        notification_types=notification_types,
        priority_levels=priority_levels
    )

@router.post("/generate", response_model=NotificationGenerationResponse)
async def regenerate_notifications(
    request: NotificationGenerationRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Force regeneration of smart notifications
    
    Manually triggers a fresh analysis and generation of notifications.
    Useful for testing or when immediate updates are needed after
    business changes or new data.
    """
    try:
        start_time = time.time()
        
        notifications_service = SmartNotificationsService(db)
        notifications = notifications_service.generate_smart_notifications(
            user_id=user.id,
            analysis_period_days=request.analysis_period_days
        )
        
        generation_time_ms = (time.time() - start_time) * 1000
        
        return NotificationGenerationResponse(
            success=True,
            message=f"Successfully generated {len(notifications)} smart notifications",
            notification_count=len(notifications),
            analysis_period_days=request.analysis_period_days,
            generation_time_ms=generation_time_ms
        )
        
    except Exception as e:
        return NotificationGenerationResponse(
            success=False,
            message=f"Failed to regenerate notifications: {str(e)}",
            notification_count=0,
            analysis_period_days=request.analysis_period_days
        )

@router.get("/health")
async def notification_health_check():
    """
    Health check endpoint for the smart notifications system
    
    Returns status information about the notifications service.
    """
    return {
        "status": "healthy",
        "service": "Smart Notifications V2",
        "version": "2.0.0",
        "features": [
            "Six Figure Business Intelligence",
            "At-Risk Client Detection", 
            "Pricing Optimization Alerts",
            "Revenue Opportunity Identification",
            "Milestone Achievement Tracking"
        ]
    }