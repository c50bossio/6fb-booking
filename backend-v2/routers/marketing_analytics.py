"""
Marketing Analytics API endpoints for BookedBarber V2.

Provides marketing-specific analytics endpoints including:
- Marketing performance overview
- Channel attribution and ROI
- Landing page analytics
- Conversion funnel analysis
- Campaign performance tracking
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel

from database import get_db
from dependencies import get_current_user
from models import User
from models.organization import UserOrganization
from services.marketing_analytics_service import MarketingAnalyticsService
from utils.error_handling import safe_endpoint
from utils.role_permissions import Permission, get_permission_checker
from utils.marketing_rate_limit import check_marketing_rate_limit

router = APIRouter(prefix="/marketing/analytics", tags=["marketing-analytics"])


class DateRangeRequest(BaseModel):
    """Request model for date range queries"""
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


class MarketingOverviewResponse(BaseModel):
    """Response model for marketing overview"""
    overview: Dict[str, Any]
    landing_page: Dict[str, Any]
    channels: List[Dict[str, Any]]
    funnel: Dict[str, Any]
    integrations: Dict[str, Any]
    trends: Dict[str, Any]


class CampaignPerformanceResponse(BaseModel):
    """Response model for campaign performance"""
    campaign_id: Optional[str]
    date_range: Dict[str, str]
    summary: Dict[str, Any]
    utm_breakdown: Dict[str, Any]


def get_user_organization_id(user: User, db: Session) -> int:
    """Get the organization ID for the current user"""
    user_org = db.query(UserOrganization).filter(
        UserOrganization.user_id == user.id
    ).first()
    
    if not user_org:
        raise HTTPException(
            status_code=404, 
            detail="User is not associated with any organization"
        )
    
    return user_org.organization_id


@router.get("/overview", response_model=MarketingOverviewResponse)
@safe_endpoint
async def get_marketing_overview(
    request: Request,
    date_range: Optional[DateRangeRequest] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    permissions = Depends(get_permission_checker([Permission.VIEW_ADVANCED_ANALYTICS]))
):
    """
    Get comprehensive marketing analytics overview.
    
    Returns marketing performance metrics including:
    - Total conversions and revenue
    - Landing page performance
    - Channel attribution
    - Conversion funnel analysis
    - Integration health status
    - Performance trends
    """
    
    # Get user's organization
    organization_id = get_user_organization_id(current_user, db)
    
    # Check rate limit
    await check_marketing_rate_limit(
        request=request,
        endpoint="overview",
        user_id=current_user.id,
        organization_id=organization_id
    )
    
    # Initialize analytics service
    analytics_service = MarketingAnalyticsService(db)
    
    # Parse date range
    date_range_tuple = None
    if date_range and date_range.start_date and date_range.end_date:
        date_range_tuple = (date_range.start_date, date_range.end_date)
    
    # Get marketing overview
    overview_data = await analytics_service.get_marketing_overview(
        organization_id=organization_id,
        date_range=date_range_tuple
    )
    
    return MarketingOverviewResponse(**overview_data)


@router.get("/campaigns/{campaign_id}", response_model=CampaignPerformanceResponse)
@safe_endpoint
async def get_campaign_performance(
    campaign_id: str,
    date_range: Optional[DateRangeRequest] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    permissions = Depends(get_permission_checker([Permission.VIEW_ADVANCED_ANALYTICS]))
):
    """
    Get detailed performance metrics for a specific campaign.
    
    Returns campaign-specific analytics including:
    - Total events and conversions
    - Revenue attribution
    - UTM parameter breakdown
    - Conversion rates by source/medium
    """
    
    # Get user's organization
    organization_id = get_user_organization_id(current_user, db)
    
    # Initialize analytics service
    analytics_service = MarketingAnalyticsService(db)
    
    # Parse date range
    date_range_tuple = None
    if date_range and date_range.start_date and date_range.end_date:
        date_range_tuple = (date_range.start_date, date_range.end_date)
    
    # Get campaign performance
    campaign_data = await analytics_service.get_campaign_performance(
        organization_id=organization_id,
        campaign_id=campaign_id,
        date_range=date_range_tuple
    )
    
    return CampaignPerformanceResponse(**campaign_data)


@router.get("/campaigns", response_model=List[Dict[str, Any]])
@safe_endpoint
async def get_all_campaigns_performance(
    date_range: Optional[DateRangeRequest] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    permissions = Depends(get_permission_checker([Permission.VIEW_ADVANCED_ANALYTICS]))
):
    """
    Get performance metrics for all campaigns.
    
    Returns a list of all campaigns with their performance metrics.
    """
    
    # Get user's organization
    organization_id = get_user_organization_id(current_user, db)
    
    # Initialize analytics service
    analytics_service = MarketingAnalyticsService(db)
    
    # Parse date range
    date_range_tuple = None
    if date_range and date_range.start_date and date_range.end_date:
        date_range_tuple = (date_range.start_date, date_range.end_date)
    
    # Get all campaigns performance (campaign_id=None gets all)
    all_campaigns_data = await analytics_service.get_campaign_performance(
        organization_id=organization_id,
        campaign_id=None,
        date_range=date_range_tuple
    )
    
    return [all_campaigns_data]


@router.get("/channels", response_model=List[Dict[str, Any]])
@safe_endpoint
async def get_channel_performance(
    date_range: Optional[DateRangeRequest] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    permissions = Depends(get_permission_checker([Permission.VIEW_ADVANCED_ANALYTICS]))
):
    """
    Get performance metrics by marketing channel.
    
    Returns channel-specific performance including:
    - Visits and conversions by channel
    - Revenue attribution
    - ROI calculations
    - Cost per acquisition
    """
    
    # Get user's organization
    organization_id = get_user_organization_id(current_user, db)
    
    # Initialize analytics service
    analytics_service = MarketingAnalyticsService(db)
    
    # Parse date range
    date_range_tuple = None
    if date_range and date_range.start_date and date_range.end_date:
        date_range_tuple = (date_range.start_date, date_range.end_date)
    
    # Get marketing overview to extract channel data
    overview_data = await analytics_service.get_marketing_overview(
        organization_id=organization_id,
        date_range=date_range_tuple
    )
    
    return overview_data.get("channels", [])


@router.get("/funnel", response_model=Dict[str, Any])
@safe_endpoint
async def get_conversion_funnel(
    date_range: Optional[DateRangeRequest] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    permissions = Depends(get_permission_checker([Permission.VIEW_ADVANCED_ANALYTICS]))
):
    """
    Get conversion funnel analysis.
    
    Returns funnel metrics including:
    - Conversion rates between stages
    - Stage volumes
    - Biggest drop-off points
    - Optimization opportunities
    """
    
    # Get user's organization
    organization_id = get_user_organization_id(current_user, db)
    
    # Initialize analytics service
    analytics_service = MarketingAnalyticsService(db)
    
    # Parse date range
    date_range_tuple = None
    if date_range and date_range.start_date and date_range.end_date:
        date_range_tuple = (date_range.start_date, date_range.end_date)
    
    # Get marketing overview to extract funnel data
    overview_data = await analytics_service.get_marketing_overview(
        organization_id=organization_id,
        date_range=date_range_tuple
    )
    
    return overview_data.get("funnel", {})


@router.get("/integrations/health", response_model=Dict[str, Any])
@safe_endpoint
async def get_integration_health(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    permissions = Depends(get_permission_checker([Permission.VIEW_ADVANCED_ANALYTICS]))
):
    """
    Get marketing integration health status.
    
    Returns health status for:
    - Google My Business integration
    - Meta Business integration
    - Google Ads integration
    - Overall integration health score
    """
    
    # Get user's organization
    organization_id = get_user_organization_id(current_user, db)
    
    # Initialize analytics service
    analytics_service = MarketingAnalyticsService(db)
    
    # Get marketing overview to extract integration health
    overview_data = await analytics_service.get_marketing_overview(
        organization_id=organization_id,
        date_range=None
    )
    
    return overview_data.get("integrations", {})


@router.get("/trends", response_model=Dict[str, Any])
@safe_endpoint
async def get_performance_trends(
    days: int = Query(30, ge=7, le=365, description="Number of days to analyze"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    permissions = Depends(get_permission_checker([Permission.VIEW_ADVANCED_ANALYTICS]))
):
    """
    Get performance trends over time.
    
    Returns trend data including:
    - Daily conversion and revenue data
    - Growth rate calculations
    - Trend direction indicators
    - Performance comparison periods
    """
    
    # Get user's organization
    organization_id = get_user_organization_id(current_user, db)
    
    # Initialize analytics service
    analytics_service = MarketingAnalyticsService(db)
    
    # Calculate date range
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)
    date_range_tuple = (start_date, end_date)
    
    # Get marketing overview to extract trends
    overview_data = await analytics_service.get_marketing_overview(
        organization_id=organization_id,
        date_range=date_range_tuple
    )
    
    return overview_data.get("trends", {})


@router.get("/export", response_model=Dict[str, Any])
@safe_endpoint
async def export_marketing_data(
    format: str = Query("csv", regex="^(csv|json|pdf)$"),
    date_range: Optional[DateRangeRequest] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    permissions = Depends(get_permission_checker([Permission.VIEW_ADVANCED_ANALYTICS]))
):
    """
    Export marketing analytics data.
    
    Supports export formats:
    - CSV: Spreadsheet-friendly format
    - JSON: Machine-readable format
    - PDF: Report-friendly format
    """
    
    # Get user's organization
    organization_id = get_user_organization_id(current_user, db)
    
    # Initialize analytics service
    analytics_service = MarketingAnalyticsService(db)
    
    # Parse date range
    date_range_tuple = None
    if date_range and date_range.start_date and date_range.end_date:
        date_range_tuple = (date_range.start_date, date_range.end_date)
    
    # Get complete marketing overview
    overview_data = await analytics_service.get_marketing_overview(
        organization_id=organization_id,
        date_range=date_range_tuple
    )
    
    # TODO: Implement actual export logic based on format
    # For now, return the data with export metadata
    
    return {
        "format": format,
        "generated_at": datetime.utcnow().isoformat(),
        "data": overview_data,
        "export_url": f"/api/v2/marketing/analytics/export/download?format={format}",
        "message": f"Marketing analytics data prepared for {format.upper()} export"
    }


@router.get("/realtime", response_model=Dict[str, Any])
@safe_endpoint
async def get_realtime_metrics(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    permissions = Depends(get_permission_checker([Permission.VIEW_ADVANCED_ANALYTICS]))
):
    """
    Get real-time marketing metrics.
    
    Returns live metrics including:
    - Active visitors on landing pages
    - Recent conversions (last 24 hours)
    - Integration sync status
    - Current campaign performance
    """
    
    # Get user's organization
    organization_id = get_user_organization_id(current_user, db)
    
    # Check rate limit (higher limit for real-time endpoint)
    await check_marketing_rate_limit(
        request=request,
        endpoint="realtime",
        user_id=current_user.id,
        organization_id=organization_id
    )
    
    # Initialize analytics service
    analytics_service = MarketingAnalyticsService(db)
    
    # Get last 24 hours data
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(hours=24)
    date_range_tuple = (start_date, end_date)
    
    # Get real-time overview
    overview_data = await analytics_service.get_marketing_overview(
        organization_id=organization_id,
        date_range=date_range_tuple
    )
    
    # Add real-time specific metrics
    realtime_data = {
        "last_24_hours": overview_data["overview"],
        "integration_status": overview_data["integrations"],
        "active_campaigns": len(overview_data["channels"]),
        "recent_conversions": overview_data["trends"]["daily_data"][-1:] if overview_data["trends"]["daily_data"] else [],
        "updated_at": datetime.utcnow().isoformat()
    }
    
    return realtime_data