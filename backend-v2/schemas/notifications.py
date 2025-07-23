"""
Smart Notifications Response Schemas - V2 API
==============================================

Pydantic schemas for the Smart Notifications & Alerts System V2 API responses.
These schemas define the structure of intelligent notification data returned
to the frontend for the Six Figure Barber business intelligence features.
"""

from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from enum import Enum

from services.smart_notifications_service import (
    SmartNotification, 
    NotificationSummary, 
    NotificationPriority, 
    NotificationType
)


class NotificationPriorityResponse(str, Enum):
    """Notification priority levels for API responses"""
    LOW = "low"
    MEDIUM = "medium" 
    HIGH = "high"
    URGENT = "urgent"


class NotificationTypeResponse(str, Enum):
    """Notification types for API responses"""
    AT_RISK_CLIENT = "at_risk_client"
    PRICING_OPPORTUNITY = "pricing_opportunity"
    MILESTONE_ACHIEVEMENT = "milestone_achievement"
    SERVICE_PERFORMANCE = "service_performance"
    REVENUE_OPPORTUNITY = "revenue_opportunity"
    BUSINESS_COACHING = "business_coaching"
    SIX_FIGURE_PROGRESS = "six_figure_progress"
    CLIENT_OUTREACH = "client_outreach"


class SmartNotificationResponse(BaseModel):
    """Smart notification response model for V2 API"""
    
    id: str = Field(..., description="Unique notification identifier")
    user_id: int = Field(..., description="User ID this notification belongs to")
    type: NotificationTypeResponse = Field(..., description="Type of notification")
    priority: NotificationPriorityResponse = Field(..., description="Priority level")
    title: str = Field(..., description="Notification title")
    message: str = Field(..., description="Notification message content")
    action_items: List[str] = Field(default_factory=list, description="Actionable recommendations")
    data: Dict[str, Any] = Field(default_factory=dict, description="Supporting notification data")
    created_at: datetime = Field(..., description="When notification was created")
    expires_at: Optional[datetime] = Field(None, description="When notification expires")
    is_read: bool = Field(default=False, description="Whether notification has been read")
    is_actionable: bool = Field(default=True, description="Whether notification requires action")
    estimated_impact: Optional[str] = Field(None, description="Estimated revenue/business impact")
    next_review_date: Optional[datetime] = Field(None, description="When to review this notification again")
    
    class Config:
        from_attributes = True
        
    @classmethod
    def from_notification(cls, notification: SmartNotification) -> "SmartNotificationResponse":
        """Convert SmartNotification service object to API response"""
        return cls(
            id=notification.id,
            user_id=notification.user_id,
            type=NotificationTypeResponse(notification.type.value),
            priority=NotificationPriorityResponse(notification.priority.value),
            title=notification.title,
            message=notification.message,
            action_items=notification.action_items,
            data=notification.data,
            created_at=notification.created_at,
            expires_at=notification.expires_at,
            is_read=notification.is_read,
            is_actionable=notification.is_actionable,
            estimated_impact=notification.estimated_impact,
            next_review_date=notification.next_review_date
        )


class NotificationSummaryResponse(BaseModel):
    """Notification summary response for V2 API dashboard"""
    
    total_notifications: int = Field(..., description="Total number of notifications")
    unread_count: int = Field(..., description="Number of unread notifications")
    urgent_count: int = Field(..., description="Number of urgent notifications")
    high_priority_count: int = Field(..., description="Number of high priority notifications")
    notifications_by_type: Dict[str, int] = Field(default_factory=dict, description="Count by notification type")
    estimated_total_revenue_impact: float = Field(..., description="Estimated total revenue impact from all notifications")
    top_priority_actions: List[str] = Field(default_factory=list, description="Top priority actionable items")
    
    class Config:
        from_attributes = True
        
    @classmethod  
    def from_summary(cls, summary: NotificationSummary) -> "NotificationSummaryResponse":
        """Convert NotificationSummary service object to API response"""
        return cls(
            total_notifications=summary.total_notifications,
            unread_count=summary.unread_count,
            urgent_count=summary.urgent_count,
            high_priority_count=summary.high_priority_count,
            notifications_by_type=summary.notifications_by_type,
            estimated_total_revenue_impact=summary.estimated_total_revenue_impact,
            top_priority_actions=summary.top_priority_actions
        )


class NotificationUpdateRequest(BaseModel):
    """Request schema for updating notification status"""
    
    is_read: Optional[bool] = Field(None, description="Mark notification as read/unread")
    
    class Config:
        from_attributes = True


class NotificationFilterRequest(BaseModel):
    """Request schema for filtering notifications"""
    
    priority: Optional[NotificationPriorityResponse] = Field(None, description="Filter by priority")
    notification_type: Optional[NotificationTypeResponse] = Field(None, description="Filter by type")
    unread_only: bool = Field(default=False, description="Show only unread notifications")
    actionable_only: bool = Field(default=False, description="Show only actionable notifications")
    days_back: Optional[int] = Field(7, ge=1, le=365, description="Days of history to include")
    
    class Config:
        from_attributes = True


class NotificationTypeInfo(BaseModel):
    """Information about a notification type"""
    
    value: str = Field(..., description="Notification type value")
    label: str = Field(..., description="Human-readable label")
    description: str = Field(..., description="Description of this notification type")
    typical_priority: NotificationPriorityResponse = Field(..., description="Typical priority for this type")
    icon: str = Field(..., description="Icon identifier for UI")
    
    class Config:
        from_attributes = True


class NotificationTypesResponse(BaseModel):
    """Response containing all available notification types and their metadata"""
    
    notification_types: List[NotificationTypeInfo] = Field(..., description="Available notification types")
    priority_levels: List[Dict[str, str]] = Field(..., description="Available priority levels")
    
    class Config:
        from_attributes = True


class NotificationGenerationRequest(BaseModel):
    """Request to regenerate notifications"""
    
    analysis_period_days: int = Field(30, ge=7, le=365, description="Days of data to analyze")
    force_refresh: bool = Field(default=False, description="Force refresh of all cached data")
    
    class Config:
        from_attributes = True


class NotificationGenerationResponse(BaseModel):
    """Response for notification generation"""
    
    success: bool = Field(..., description="Whether generation was successful")
    message: str = Field(..., description="Status message")
    notification_count: int = Field(..., description="Number of notifications generated")
    analysis_period_days: int = Field(..., description="Days of data analyzed")
    generation_time_ms: Optional[float] = Field(None, description="Time taken to generate notifications in milliseconds")
    
    class Config:
        from_attributes = True


class SmartNotificationDetailResponse(BaseModel):
    """Detailed notification response with additional context"""
    
    notification: SmartNotificationResponse = Field(..., description="The notification details")
    related_data: Dict[str, Any] = Field(default_factory=dict, description="Additional context data")
    recommended_actions: List[str] = Field(default_factory=list, description="Detailed action recommendations")
    business_impact: Dict[str, Any] = Field(default_factory=dict, description="Business impact analysis")
    
    class Config:
        from_attributes = True