"""
Communication Analytics Router

Provides unified analytics endpoints for all communication channels:
- Email performance metrics
- SMS engagement tracking  
- Marketing campaign analytics
- Review response effectiveness
- Cross-channel insights and comparisons
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any
from datetime import date, datetime, timedelta
import logging

from database import get_db
from routers.auth import get_current_user
from models import User
from services.unified_communication_analytics import (
    UnifiedCommunicationAnalytics, 
    get_unified_communication_analytics,
    UnifiedCommunicationSummary
)
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/communication-analytics",
    tags=["communication-analytics"]
)


@router.get("/overview", response_model=Dict[str, Any])
async def get_communication_overview(
    start_date: Optional[date] = Query(None, description="Start date for analytics (defaults to 30 days ago)"),
    end_date: Optional[date] = Query(None, description="End date for analytics (defaults to today)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    analytics_service: UnifiedCommunicationAnalytics = Depends(get_unified_communication_analytics)
):
    """
    Get comprehensive communication analytics overview across all channels.
    
    Provides insights into:
    - Email and SMS performance
    - Marketing campaign effectiveness
    - Review response engagement
    - Cross-channel comparison metrics
    - ROI and cost analysis
    """
    try:
        # Set default date range if not provided
        if not end_date:
            end_date = date.today()
        if not start_date:
            start_date = end_date - timedelta(days=30)
        
        # Validate date range
        if start_date > end_date:
            raise HTTPException(
                status_code=400,
                detail="Start date cannot be after end date"
            )
        
        # Get comprehensive analytics
        summary = analytics_service.get_communication_overview(
            db=db,
            user_id=current_user.id,
            start_date=start_date,
            end_date=end_date
        )
        
        # Convert dataclass to dict for JSON response
        result = {
            "date_range": {
                "start_date": summary.date_range[0].isoformat(),
                "end_date": summary.date_range[1].isoformat()
            },
            "overview": {
                "total_messages_sent": summary.total_messages_sent,
                "total_engagement_events": summary.total_engagement_events,
                "overall_engagement_rate": round(summary.overall_engagement_rate, 2),
                "cost_per_engagement": round(summary.cost_per_engagement, 2)
            },
            "channel_breakdown": [
                {
                    "channel": metric.channel,
                    "sent_count": metric.sent_count,
                    "delivered_count": metric.delivered_count,
                    "opened_count": metric.opened_count,
                    "clicked_count": metric.clicked_count,
                    "failed_count": metric.failed_count,
                    "bounce_rate": round(metric.bounce_rate, 2),
                    "engagement_rate": round(metric.engagement_rate, 2),
                    "conversion_rate": round(metric.conversion_rate, 2),
                    "revenue_attributed": round(metric.total_revenue_attributed, 2)
                }
                for metric in summary.channel_breakdown
            ],
            "top_campaigns": summary.top_performing_campaigns,
            "insights": {
                "client_preferences": summary.client_communication_preferences,
                "automation_breakdown": summary.automated_vs_manual,
                "roi_by_channel": summary.roi_by_channel
            }
        }
        
        logger.info(f"Communication analytics overview generated for user {current_user.id}")
        return result
        
    except Exception as e:
        logger.error(f"Error generating communication analytics: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to generate communication analytics"
        )


@router.get("/channel/{channel_name}", response_model=Dict[str, Any])
async def get_channel_details(
    channel_name: str,
    start_date: Optional[date] = Query(None, description="Start date for analytics"),
    end_date: Optional[date] = Query(None, description="End date for analytics"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    analytics_service: UnifiedCommunicationAnalytics = Depends(get_unified_communication_analytics)
):
    """
    Get detailed analytics for a specific communication channel.
    
    Supported channels: email, sms, campaigns, reviews
    """
    try:
        # Validate channel name
        valid_channels = ["email", "sms", "campaigns", "reviews"]
        if channel_name not in valid_channels:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid channel. Must be one of: {', '.join(valid_channels)}"
            )
        
        # Set default date range
        if not end_date:
            end_date = date.today()
        if not start_date:
            start_date = end_date - timedelta(days=30)
        
        # Get overview first to extract channel-specific data
        summary = analytics_service.get_communication_overview(
            db=db,
            user_id=current_user.id,
            start_date=start_date,
            end_date=end_date
        )
        
        # Find the requested channel metrics
        channel_metrics = None
        for metric in summary.channel_breakdown:
            if metric.channel == channel_name:
                channel_metrics = metric
                break
        
        if not channel_metrics:
            raise HTTPException(
                status_code=404,
                detail=f"No data found for channel: {channel_name}"
            )
        
        # Build detailed response
        result = {
            "channel": channel_name,
            "date_range": {
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat()
            },
            "metrics": {
                "sent_count": channel_metrics.sent_count,
                "delivered_count": channel_metrics.delivered_count,
                "opened_count": channel_metrics.opened_count,
                "clicked_count": channel_metrics.clicked_count,
                "failed_count": channel_metrics.failed_count,
                "bounce_rate": round(channel_metrics.bounce_rate, 2),
                "engagement_rate": round(channel_metrics.engagement_rate, 2),
                "conversion_rate": round(channel_metrics.conversion_rate, 2),
                "revenue_attributed": round(channel_metrics.total_revenue_attributed, 2)
            },
            "performance": {
                "delivery_rate": round(
                    (channel_metrics.delivered_count / channel_metrics.sent_count * 100) 
                    if channel_metrics.sent_count > 0 else 0, 2
                ),
                "open_rate": round(
                    (channel_metrics.opened_count / channel_metrics.sent_count * 100) 
                    if channel_metrics.sent_count > 0 else 0, 2
                ),
                "click_through_rate": round(
                    (channel_metrics.clicked_count / channel_metrics.opened_count * 100) 
                    if channel_metrics.opened_count > 0 else 0, 2
                )
            }
        }
        
        # Add channel-specific insights
        if channel_name == "email":
            result["insights"] = {
                "best_send_time": "10:00 AM",  # Placeholder
                "optimal_frequency": "2-3 times per week",
                "top_subject_lines": ["Appointment Reminder", "Special Offer", "Booking Confirmation"]
            }
        elif channel_name == "sms":
            result["insights"] = {
                "character_limit_optimization": "Keep under 160 characters for best results",
                "response_time": "Average 2-3 minutes",
                "peak_engagement_hours": "9 AM - 6 PM"
            }
        elif channel_name == "campaigns":
            result["insights"] = {
                "best_performing_type": "Promotional campaigns",
                "optimal_list_size": "250-500 recipients",
                "a_b_test_recommendations": ["Subject line testing", "Send time optimization"]
            }
        elif channel_name == "reviews":
            result["insights"] = {
                "response_time_target": "Within 24 hours",
                "sentiment_analysis": "85% positive responses",
                "keywords_to_include": ["Thank you", "Appreciate", "Welcome back"]
            }
        
        logger.info(f"Detailed {channel_name} analytics generated for user {current_user.id}")
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating {channel_name} analytics: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate {channel_name} analytics"
        )


@router.get("/trends", response_model=Dict[str, Any])
async def get_communication_trends(
    days: int = Query(30, description="Number of days for trend analysis"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get communication trends and patterns over time.
    
    Provides insights into:
    - Engagement rate trends
    - Channel performance over time
    - Seasonal patterns
    - Growth metrics
    """
    try:
        # Calculate date range
        end_date = date.today()
        start_date = end_date - timedelta(days=days)
        
        # For now, return structured placeholder data
        # In a real implementation, this would analyze historical data
        
        trends_data = {
            "date_range": {
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "days_analyzed": days
            },
            "engagement_trends": {
                "email": {
                    "current_rate": 23.5,
                    "previous_period_rate": 21.2,
                    "change_percentage": 10.8,
                    "trend": "increasing"
                },
                "sms": {
                    "current_rate": 89.3,
                    "previous_period_rate": 87.1,
                    "change_percentage": 2.5,
                    "trend": "stable"
                },
                "campaigns": {
                    "current_rate": 15.7,
                    "previous_period_rate": 18.3,
                    "change_percentage": -14.2,
                    "trend": "decreasing"
                }
            },
            "volume_trends": {
                "total_messages": {
                    "current_period": 1247,
                    "previous_period": 1089,
                    "change_percentage": 14.5
                },
                "daily_average": {
                    "current_period": round(1247 / days, 1),
                    "previous_period": round(1089 / days, 1)
                }
            },
            "insights": [
                "Email engagement is improving with better subject lines",
                "SMS maintains high engagement but consider frequency optimization",
                "Campaign performance declined - test new content strategies",
                f"Overall message volume increased by 14.5% over {days} days"
            ],
            "recommendations": [
                "Continue current email optimization strategy",
                "A/B test SMS timing for better engagement",
                "Refresh campaign templates and targeting",
                "Consider automated triggered messaging"
            ]
        }
        
        logger.info(f"Communication trends analysis generated for user {current_user.id}")
        return trends_data
        
    except Exception as e:
        logger.error(f"Error generating communication trends: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to generate communication trends analysis"
        )


@router.get("/comparison", response_model=Dict[str, Any])
async def compare_channels(
    start_date: Optional[date] = Query(None, description="Start date for comparison"),
    end_date: Optional[date] = Query(None, description="End date for comparison"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    analytics_service: UnifiedCommunicationAnalytics = Depends(get_unified_communication_analytics)
):
    """
    Compare performance across all communication channels.
    
    Provides side-by-side channel comparison with:
    - Engagement rate comparison
    - Cost effectiveness analysis
    - ROI comparison
    - Conversion rate analysis
    """
    try:
        # Set default date range
        if not end_date:
            end_date = date.today()
        if not start_date:
            start_date = end_date - timedelta(days=30)
        
        # Get analytics summary
        summary = analytics_service.get_communication_overview(
            db=db,
            user_id=current_user.id,
            start_date=start_date,
            end_date=end_date
        )
        
        # Build comparison matrix
        channels = {}
        for metric in summary.channel_breakdown:
            channels[metric.channel] = {
                "engagement_rate": metric.engagement_rate,
                "conversion_rate": metric.conversion_rate,
                "cost_per_message": round(
                    summary.cost_per_engagement / (metric.engagement_rate / 100) 
                    if metric.engagement_rate > 0 else 0, 2
                ),
                "roi": summary.roi_by_channel.get(metric.channel, 0),
                "volume": metric.sent_count,
                "revenue": metric.total_revenue_attributed
            }
        
        # Calculate rankings
        rankings = {
            "highest_engagement": max(channels.items(), key=lambda x: x[1]["engagement_rate"])[0],
            "highest_conversion": max(channels.items(), key=lambda x: x[1]["conversion_rate"])[0],
            "best_roi": max(channels.items(), key=lambda x: x[1]["roi"])[0],
            "highest_volume": max(channels.items(), key=lambda x: x[1]["volume"])[0],
            "most_cost_effective": min(
                channels.items(), 
                key=lambda x: x[1]["cost_per_message"] if x[1]["cost_per_message"] > 0 else float('inf')
            )[0]
        }
        
        result = {
            "date_range": {
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat()
            },
            "channel_comparison": channels,
            "rankings": rankings,
            "recommendations": {
                "primary_channel": rankings["best_roi"],
                "growth_opportunity": min(channels.items(), key=lambda x: x[1]["engagement_rate"])[0],
                "cost_optimization": "Consider shifting budget to " + rankings["most_cost_effective"],
                "volume_scaling": "Increase volume in " + rankings["highest_conversion"]
            },
            "summary": {
                "total_channels_active": len(channels),
                "best_performer": rankings["best_roi"],
                "improvement_needed": min(channels.items(), key=lambda x: x[1]["engagement_rate"])[0]
            }
        }
        
        logger.info(f"Channel comparison analysis generated for user {current_user.id}")
        return result
        
    except Exception as e:
        logger.error(f"Error generating channel comparison: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to generate channel comparison analysis"
        )