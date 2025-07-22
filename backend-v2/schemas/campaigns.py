"""
Automated Campaign Engine Response Schemas - V2 API
===================================================

Pydantic schemas for the Automated Campaign Engine V2 API responses.
These schemas define the structure of campaign execution, analytics, and 
tracking data returned to the frontend for the Six Figure Barber system.
"""

from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from enum import Enum

from services.automated_campaign_service import (
    CampaignExecution,
    CampaignBatch, 
    CampaignAnalytics,
    CampaignChannel,
    DeliveryStatus,
    CampaignPersonalization
)


class CampaignChannelResponse(str, Enum):
    """Campaign channels for API responses"""
    EMAIL = "email"
    SMS = "sms"
    PUSH = "push"
    IN_APP = "in_app"


class DeliveryStatusResponse(str, Enum):
    """Delivery status for API responses"""
    PENDING = "pending"
    SCHEDULED = "scheduled"
    SENT = "sent"
    DELIVERED = "delivered"
    OPENED = "opened"
    CLICKED = "clicked"
    RESPONDED = "responded"
    FAILED = "failed"
    BOUNCED = "bounced"
    UNSUBSCRIBED = "unsubscribed"


class CampaignPersonalizationResponse(str, Enum):
    """Personalization levels for API responses"""
    BASIC = "basic"
    ADVANCED = "advanced"
    PREMIUM = "premium"


class CampaignExecutionResponse(BaseModel):
    """Campaign execution response for individual campaigns"""
    
    execution_id: str = Field(..., description="Execution identifier")
    campaign_id: str = Field(..., description="Campaign identifier")
    client_id: int = Field(..., description="Client identifier")
    client_name: Optional[str] = Field(None, description="Client name")
    channel: CampaignChannelResponse = Field(..., description="Delivery channel")
    status: DeliveryStatusResponse = Field(..., description="Current delivery status")
    
    scheduled_at: datetime = Field(..., description="Scheduled delivery time")
    sent_at: Optional[datetime] = Field(None, description="Actual send time")
    delivered_at: Optional[datetime] = Field(None, description="Delivery confirmation time")
    opened_at: Optional[datetime] = Field(None, description="First open time")
    clicked_at: Optional[datetime] = Field(None, description="First click time")
    responded_at: Optional[datetime] = Field(None, description="Response time")
    
    message_content: str = Field(..., description="Campaign message content")
    subject_line: Optional[str] = Field(None, description="Email subject line")
    
    delivery_cost: float = Field(..., description="Cost of campaign delivery")
    tracking_data: Dict[str, Any] = Field(default_factory=dict, description="Tracking metadata")
    
    # Performance metrics
    interaction_metrics: Dict[str, bool] = Field(default_factory=dict, description="Interaction tracking")
    
    created_at: datetime = Field(..., description="Creation timestamp")
    
    class Config:
        from_attributes = True
        
    @classmethod
    def from_execution(cls, execution: CampaignExecution) -> "CampaignExecutionResponse":
        """Convert CampaignExecution service object to API response"""
        return cls(
            execution_id=execution.execution_id,
            campaign_id=execution.campaign_id,
            client_id=execution.client_id,
            client_name=None,  # Would be populated from client lookup
            channel=CampaignChannelResponse(execution.channel.value),
            status=DeliveryStatusResponse(execution.status.value),
            
            scheduled_at=execution.scheduled_at,
            sent_at=execution.sent_at,
            delivered_at=execution.delivered_at,
            opened_at=execution.opened_at,
            clicked_at=execution.clicked_at,
            responded_at=execution.responded_at,
            
            message_content=execution.message_content,
            subject_line=execution.subject_line,
            
            delivery_cost=execution.delivery_cost,
            tracking_data=execution.tracking_data,
            
            interaction_metrics={
                "opened": execution.opened_at is not None,
                "clicked": execution.clicked_at is not None,
                "responded": execution.responded_at is not None
            },
            
            created_at=execution.created_at
        )


class CampaignBatchResponse(BaseModel):
    """Campaign batch execution response"""
    
    batch_id: str = Field(..., description="Batch identifier")
    campaign_ids: List[str] = Field(..., description="Campaign IDs in batch")
    channel: CampaignChannelResponse = Field(..., description="Delivery channel")
    
    scheduled_at: datetime = Field(..., description="Batch scheduled time")
    batch_size: int = Field(..., description="Number of campaigns in batch")
    delivery_rate_limit: int = Field(..., description="Rate limit per minute")
    execution_status: str = Field(..., description="Batch execution status")
    
    total_sent: int = Field(..., description="Total campaigns sent")
    total_delivered: int = Field(..., description="Total campaigns delivered")
    total_failed: int = Field(..., description="Total campaigns failed")
    
    batch_metrics: Dict[str, Any] = Field(default_factory=dict, description="Batch performance metrics")
    created_at: datetime = Field(..., description="Batch creation time")
    
    class Config:
        from_attributes = True
        
    @classmethod
    def from_batch(cls, batch: CampaignBatch) -> "CampaignBatchResponse":
        """Convert CampaignBatch service object to API response"""
        return cls(
            batch_id=batch.batch_id,
            campaign_ids=batch.campaign_ids,
            channel=CampaignChannelResponse(batch.channel.value),
            
            scheduled_at=batch.scheduled_at,
            batch_size=batch.batch_size,
            delivery_rate_limit=batch.delivery_rate_limit,
            execution_status=batch.execution_status,
            
            total_sent=batch.total_sent,
            total_delivered=batch.total_delivered,
            total_failed=batch.total_failed,
            
            batch_metrics=batch.batch_metrics,
            created_at=batch.created_at
        )


class CampaignAnalyticsResponse(BaseModel):
    """Campaign performance analytics response"""
    
    campaign_id: str = Field(..., description="Campaign identifier")
    
    # Delivery metrics
    total_sent: int = Field(..., description="Total campaigns sent")
    delivery_rate: float = Field(..., description="Delivery success rate (0-1)")
    
    # Engagement metrics
    open_rate: float = Field(..., description="Email/message open rate (0-1)")
    click_rate: float = Field(..., description="Click-through rate (0-1)")
    response_rate: float = Field(..., description="Response rate (0-1)")
    conversion_rate: float = Field(..., description="Booking conversion rate (0-1)")
    unsubscribe_rate: float = Field(..., description="Unsubscribe rate (0-1)")
    
    # Financial metrics
    revenue_generated: float = Field(..., description="Revenue generated from campaign")
    campaign_cost: float = Field(..., description="Total campaign cost")
    roi_percentage: float = Field(..., description="Return on investment percentage")
    
    # Optimization insights
    best_performing_variant: Optional[str] = Field(None, description="Best A/B test variant")
    optimal_send_time: Optional[datetime] = Field(None, description="Optimal send time")
    audience_insights: Dict[str, Any] = Field(default_factory=dict, description="Audience behavior insights")
    improvement_recommendations: List[str] = Field(default_factory=list, description="Performance improvement suggestions")
    
    class Config:
        from_attributes = True
        
    @classmethod
    def from_analytics(cls, analytics: CampaignAnalytics) -> "CampaignAnalyticsResponse":
        """Convert CampaignAnalytics service object to API response"""
        return cls(
            campaign_id=analytics.campaign_id,
            
            total_sent=analytics.total_sent,
            delivery_rate=analytics.delivery_rate,
            
            open_rate=analytics.open_rate,
            click_rate=analytics.click_rate,
            response_rate=analytics.response_rate,
            conversion_rate=analytics.conversion_rate,
            unsubscribe_rate=analytics.unsubscribe_rate,
            
            revenue_generated=analytics.revenue_generated,
            campaign_cost=analytics.campaign_cost,
            roi_percentage=analytics.roi_percentage,
            
            best_performing_variant=analytics.best_performing_variant,
            optimal_send_time=analytics.optimal_send_time,
            audience_insights=analytics.audience_insights,
            improvement_recommendations=analytics.improvement_recommendations
        )


class CampaignChannelInfo(BaseModel):
    """Campaign channel information"""
    
    channel: str = Field(..., description="Channel identifier")
    name: str = Field(..., description="Channel display name")
    description: str = Field(..., description="Channel description")
    
    cost_per_message: float = Field(..., description="Cost per message")
    average_delivery_rate: float = Field(..., description="Average delivery rate")
    average_open_rate: float = Field(..., description="Average open rate")
    average_click_rate: float = Field(..., description="Average click rate")
    
    best_use_cases: List[str] = Field(..., description="Best use cases for this channel")
    personalization_features: List[str] = Field(..., description="Available personalization features")
    rate_limit_per_minute: int = Field(..., description="Rate limit per minute")
    
    class Config:
        from_attributes = True


class CampaignPersonalizationInfo(BaseModel):
    """Campaign personalization level information"""
    
    level: str = Field(..., description="Personalization level")
    name: str = Field(..., description="Display name")
    description: str = Field(..., description="Level description")
    
    features: List[str] = Field(..., description="Available features")
    cost_multiplier: float = Field(..., description="Cost multiplier for this level")
    average_engagement_boost: float = Field(..., description="Average engagement improvement")
    processing_time_seconds: float = Field(..., description="Average processing time")
    
    class Config:
        from_attributes = True


# Request schemas

class CampaignExecutionRequest(BaseModel):
    """Request schema for executing a single campaign"""
    
    campaign_id: str = Field(..., description="Campaign to execute")
    channel: CampaignChannelResponse = Field(..., description="Delivery channel")
    personalization_level: CampaignPersonalizationResponse = Field(
        CampaignPersonalizationResponse.ADVANCED,
        description="Personalization level"
    )
    schedule_immediately: bool = Field(True, description="Execute immediately or use optimal timing")
    
    class Config:
        from_attributes = True


class CampaignBatchRequest(BaseModel):
    """Request schema for executing batch campaigns"""
    
    campaign_ids: Optional[List[str]] = Field(None, description="Specific campaigns to execute")
    channel: CampaignChannelResponse = Field(..., description="Delivery channel for all campaigns")
    batch_size: int = Field(50, ge=1, le=100, description="Maximum campaigns per batch")
    personalization_level: CampaignPersonalizationResponse = Field(
        CampaignPersonalizationResponse.ADVANCED,
        description="Personalization level for all campaigns"
    )
    
    class Config:
        from_attributes = True


class CampaignInteractionRequest(BaseModel):
    """Request schema for tracking campaign interactions"""
    
    execution_id: str = Field(..., description="Campaign execution to track")
    interaction_type: str = Field(..., description="Type of interaction (opened, clicked, responded)")
    interaction_data: Optional[Dict[str, Any]] = Field(None, description="Additional interaction data")
    timestamp: Optional[datetime] = Field(None, description="Interaction timestamp")
    
    class Config:
        from_attributes = True


# Response wrapper schemas (for consistency)

CampaignChannelResponse = CampaignChannelInfo
CampaignPersonalizationResponse = CampaignPersonalizationInfo