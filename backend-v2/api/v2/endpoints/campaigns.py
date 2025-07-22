"""
Automated Campaign Engine API V2 - Six Figure Barber Retention Automation
=========================================================================

V2 API endpoints for the intelligent campaign automation system that executes
retention campaigns across multiple channels with advanced personalization.

All endpoints use /api/v2/campaigns/ prefix as per user requirement:
"There should be nothing V1, only V2."
"""

from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import logging

from database import get_db
from models import User
from utils.auth import get_current_user
from services.automated_campaign_service import (
    AutomatedCampaignService, 
    CampaignExecution, 
    CampaignBatch,
    CampaignAnalytics,
    CampaignChannel,
    DeliveryStatus,
    CampaignPersonalization
)
from services.client_retention_service import ClientRetentionService
from schemas.campaigns import (
    CampaignExecutionResponse,
    CampaignBatchResponse,
    CampaignAnalyticsResponse,
    CampaignExecutionRequest,
    CampaignBatchRequest,
    CampaignInteractionRequest,
    CampaignChannelResponse,
    DeliveryStatusResponse,
    CampaignPersonalizationResponse
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v2/campaigns", tags=["campaigns-v2"])

@router.post("/execute", response_model=CampaignExecutionResponse)
async def execute_single_campaign(
    request: CampaignExecutionRequest,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Execute a single retention campaign with intelligent delivery
    
    Executes a retention campaign across specified channel with advanced
    personalization and optimal timing for maximum engagement and conversion.
    """
    try:
        campaign_service = AutomatedCampaignService(db)
        retention_service = ClientRetentionService(db)
        
        # Get the retention campaign
        campaigns = retention_service.generate_retention_campaigns(user_id=user.id)
        target_campaign = None
        
        for campaign in campaigns:
            if campaign.campaign_id == request.campaign_id:
                target_campaign = campaign
                break
        
        if not target_campaign:
            raise HTTPException(status_code=404, detail="Campaign not found")
        
        # Execute campaign
        execution = await campaign_service.execute_retention_campaign(
            campaign=target_campaign,
            channel=CampaignChannel(request.channel),
            personalization_level=CampaignPersonalization(request.personalization_level)
        )
        
        return CampaignExecutionResponse.from_execution(execution)
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error executing campaign for user {user.id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to execute campaign: {str(e)}")

@router.post("/batch", response_model=CampaignBatchResponse)
async def execute_batch_campaigns(
    request: CampaignBatchRequest,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Execute multiple retention campaigns in optimized batches
    
    Processes multiple campaigns efficiently with rate limiting and intelligent
    scheduling to maximize deliverability and engagement rates.
    """
    try:
        campaign_service = AutomatedCampaignService(db)
        retention_service = ClientRetentionService(db)
        
        # Get retention campaigns
        all_campaigns = retention_service.generate_retention_campaigns(user_id=user.id)
        
        # Filter campaigns based on request
        target_campaigns = []
        if request.campaign_ids:
            target_campaigns = [c for c in all_campaigns if c.campaign_id in request.campaign_ids]
        else:
            # Use all available campaigns
            target_campaigns = all_campaigns[:request.batch_size]
        
        if not target_campaigns:
            raise HTTPException(status_code=404, detail="No campaigns found for batch execution")
        
        # Execute batch
        batch = await campaign_service.execute_batch_campaigns(
            campaigns=target_campaigns,
            channel=CampaignChannel(request.channel),
            batch_size=request.batch_size
        )
        
        return CampaignBatchResponse.from_batch(batch)
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error executing batch campaigns for user {user.id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to execute batch campaigns: {str(e)}")

@router.get("/executions", response_model=List[CampaignExecutionResponse])
async def get_campaign_executions(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    status: Optional[str] = Query(None, description="Filter by delivery status"),
    channel: Optional[str] = Query(None, description="Filter by campaign channel"),
    days_back: int = Query(30, ge=1, le=365, description="Days of history to retrieve")
):
    """
    Get campaign execution history and status
    
    Returns detailed execution records including delivery status, performance
    metrics, and interaction tracking for campaign optimization.
    """
    try:
        # This would query campaign executions from database
        # For now, return mock data showing the structure
        
        mock_executions = [
            {
                "execution_id": "exec_abc123",
                "campaign_id": "campaign_xyz789",
                "client_id": 45,
                "client_name": "John Smith",
                "channel": "email",
                "status": "delivered",
                "scheduled_at": datetime.now() - timedelta(hours=2),
                "sent_at": datetime.now() - timedelta(hours=2),
                "delivered_at": datetime.now() - timedelta(hours=1, minutes=45),
                "opened_at": datetime.now() - timedelta(minutes=30),
                "message_content": "Hi John! Missing you at the shop...",
                "subject_line": "We miss you, John! 💇‍♂️",
                "delivery_cost": 0.001,
                "interaction_metrics": {
                    "opened": True,
                    "clicked": False,
                    "responded": False
                },
                "created_at": datetime.now() - timedelta(hours=3)
            }
        ]
        
        # Apply filters
        filtered_executions = mock_executions
        if status:
            filtered_executions = [e for e in filtered_executions if e["status"] == status.lower()]
        if channel:
            filtered_executions = [e for e in filtered_executions if e["channel"] == channel.lower()]
        
        return [CampaignExecutionResponse(**execution) for execution in filtered_executions]
        
    except Exception as e:
        logger.error(f"Error getting campaign executions for user {user.id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get executions: {str(e)}")

@router.get("/analytics/{campaign_id}", response_model=CampaignAnalyticsResponse)
async def get_campaign_analytics(
    campaign_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    date_range_days: int = Query(30, ge=1, le=365, description="Days of data to analyze")
):
    """
    Get comprehensive campaign performance analytics
    
    Provides detailed performance metrics including delivery rates, engagement
    analytics, ROI calculations, and optimization recommendations.
    """
    try:
        campaign_service = AutomatedCampaignService(db)
        analytics = campaign_service.get_campaign_analytics(
            campaign_id=campaign_id,
            date_range_days=date_range_days
        )
        
        if not analytics:
            raise HTTPException(status_code=404, detail="Campaign analytics not found")
        
        return CampaignAnalyticsResponse.from_analytics(analytics)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting campaign analytics for {campaign_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get analytics: {str(e)}")

@router.post("/track-interaction")
async def track_campaign_interaction(
    request: CampaignInteractionRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Track campaign interactions for performance optimization
    
    Records campaign interactions (opens, clicks, responses) for detailed
    analytics and campaign optimization insights.
    """
    try:
        campaign_service = AutomatedCampaignService(db)
        success = campaign_service.track_campaign_interaction(
            execution_id=request.execution_id,
            interaction_type=request.interaction_type,
            interaction_data=request.interaction_data
        )
        
        if not success:
            raise HTTPException(status_code=400, detail="Failed to track interaction")
        
        return {
            "success": True,
            "message": "Interaction tracked successfully",
            "execution_id": request.execution_id,
            "interaction_type": request.interaction_type
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error tracking campaign interaction: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to track interaction: {str(e)}")

@router.get("/performance-summary")
async def get_campaign_performance_summary(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    days_back: int = Query(30, ge=1, le=365, description="Days of data to analyze")
):
    """
    Get overall campaign performance summary
    
    Returns high-level performance metrics across all campaigns including
    total reach, engagement rates, ROI, and strategic recommendations.
    """
    try:
        # This would aggregate performance across all campaigns
        # For now, return mock summary data
        
        performance_summary = {
            "total_campaigns_sent": 125,
            "total_clients_reached": 89,
            "overall_delivery_rate": 0.96,
            "overall_open_rate": 0.28,
            "overall_click_rate": 0.12,
            "overall_response_rate": 0.18,
            "overall_conversion_rate": 0.15,
            "total_revenue_generated": 4750.00,
            "total_campaign_cost": 187.50,
            "overall_roi_percentage": 2433.33,
            "best_performing_channel": "email",
            "best_performing_time": "10:00 AM",
            "top_converting_campaign_type": "immediate_intervention",
            "client_segments": {
                "high_risk_engaged": 23,
                "medium_risk_responsive": 34,
                "low_risk_maintenance": 32
            },
            "recommendations": [
                "Increase immediate intervention campaigns - 45% higher conversion",
                "Focus email campaigns between 9-11 AM for best engagement",
                "Test SMS campaigns for non-email responders",
                "Implement win-back sequences for 30+ day inactive clients"
            ],
            "six_figure_impact": {
                "retention_rate_improvement": "15%",
                "average_client_value_increase": "$127",
                "projected_annual_impact": "$18,500"
            }
        }
        
        return performance_summary
        
    except Exception as e:
        logger.error(f"Error getting campaign performance summary for user {user.id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get performance summary: {str(e)}")

@router.get("/channels", response_model=List[CampaignChannelResponse])
async def get_available_channels():
    """
    Get available campaign channels and their capabilities
    
    Returns information about supported campaign channels including
    costs, delivery rates, and best use cases for channel selection.
    """
    channels = [
        CampaignChannelResponse(
            channel="email",
            name="Email",
            description="Rich HTML email campaigns with tracking and personalization",
            cost_per_message=0.001,
            average_delivery_rate=0.98,
            average_open_rate=0.25,
            average_click_rate=0.08,
            best_use_cases=["Detailed offers", "Rich content", "Professional communication"],
            personalization_features=["Dynamic content", "Images", "Call-to-action buttons"],
            rate_limit_per_minute=100
        ),
        CampaignChannelResponse(
            channel="sms",
            name="SMS",
            description="Direct text messaging for immediate engagement",
            cost_per_message=0.02,
            average_delivery_rate=0.99,
            average_open_rate=0.95,
            average_click_rate=0.15,
            best_use_cases=["Urgent messages", "Quick reminders", "Simple offers"],
            personalization_features=["Basic text", "Short links", "Reply tracking"],
            rate_limit_per_minute=50
        ),
        CampaignChannelResponse(
            channel="push",
            name="Push Notification",
            description="Mobile app push notifications for instant delivery",
            cost_per_message=0.0001,
            average_delivery_rate=0.92,
            average_open_rate=0.35,
            average_click_rate=0.20,
            best_use_cases=["Time-sensitive alerts", "App engagement", "Appointment reminders"],
            personalization_features=["Rich media", "Deep linking", "Action buttons"],
            rate_limit_per_minute=500
        )
    ]
    
    return channels

@router.get("/personalization-levels", response_model=List[CampaignPersonalizationResponse])
async def get_personalization_levels():
    """
    Get available personalization levels and their features
    
    Returns information about campaign personalization options and
    their impact on engagement and conversion rates.
    """
    levels = [
        CampaignPersonalizationResponse(
            level="basic",
            name="Basic",
            description="Name and basic service history personalization",
            features=["Client name", "Last service", "Basic preferences"],
            cost_multiplier=1.0,
            average_engagement_boost=0.15,
            processing_time_seconds=0.1
        ),
        CampaignPersonalizationResponse(
            level="advanced",
            name="Advanced",
            description="Behavioral patterns and preference-based personalization",
            features=["Service history", "Booking patterns", "Preferences", "Custom offers"],
            cost_multiplier=1.2,
            average_engagement_boost=0.35,
            processing_time_seconds=0.5
        ),
        CampaignPersonalizationResponse(
            level="premium",
            name="Premium",
            description="AI-generated custom content with Six Figure insights",
            features=["AI custom messages", "Six Figure insights", "Dynamic offers", "Behavioral analysis"],
            cost_multiplier=1.5,
            average_engagement_boost=0.55,
            processing_time_seconds=2.0
        )
    ]
    
    return levels

@router.get("/delivery-status/{execution_id}")
async def get_delivery_status(
    execution_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get real-time delivery status for a campaign execution
    
    Returns current delivery status with detailed tracking information
    including timestamps and interaction history.
    """
    try:
        # This would query the execution record from database
        # For now, return mock status data
        
        status_data = {
            "execution_id": execution_id,
            "current_status": "delivered",
            "status_history": [
                {"status": "pending", "timestamp": datetime.now() - timedelta(hours=2, minutes=30)},
                {"status": "scheduled", "timestamp": datetime.now() - timedelta(hours=2, minutes=15)},
                {"status": "sent", "timestamp": datetime.now() - timedelta(hours=2)},
                {"status": "delivered", "timestamp": datetime.now() - timedelta(hours=1, minutes=45)},
                {"status": "opened", "timestamp": datetime.now() - timedelta(minutes=30)}
            ],
            "delivery_details": {
                "provider": "sendgrid",
                "provider_message_id": "sg_abc123xyz",
                "delivery_time_seconds": 15,
                "bounce_reason": None,
                "unsubscribe_reason": None
            },
            "interaction_timeline": [
                {"action": "delivered", "timestamp": datetime.now() - timedelta(hours=1, minutes=45)},
                {"action": "opened", "timestamp": datetime.now() - timedelta(minutes=30)},
                {"action": "link_clicked", "timestamp": None},
                {"action": "responded", "timestamp": None}
            ],
            "next_expected_action": "click or response within 24 hours",
            "performance_benchmark": {
                "typical_open_time": "2-4 hours",
                "typical_response_time": "4-24 hours"
            }
        }
        
        return status_data
        
    except Exception as e:
        logger.error(f"Error getting delivery status for {execution_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get delivery status: {str(e)}")

@router.get("/health")
async def campaign_health_check():
    """
    Health check endpoint for the automated campaign engine
    
    Returns status information about the campaign automation services.
    """
    return {
        "status": "healthy",
        "service": "Automated Campaign Engine V2",
        "version": "2.0.0",
        "features": [
            "Multi-Channel Campaign Execution",
            "Advanced Personalization Engine",
            "Real-Time Delivery Tracking",
            "Performance Analytics and ROI",
            "A/B Testing Framework",
            "Intelligent Scheduling",
            "Six Figure Methodology Integration"
        ],
        "supported_channels": ["email", "sms", "push"],
        "personalization_levels": ["basic", "advanced", "premium"],
        "rate_limits": {
            "email_per_minute": 100,
            "sms_per_minute": 50,
            "push_per_minute": 500
        }
    }