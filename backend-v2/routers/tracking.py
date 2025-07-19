"""
API endpoints for conversion tracking and attribution.
Handles event tracking, analytics, and platform configuration.
Includes Meta Pixel and Conversions API integration.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Request, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta

from database import get_db
from dependencies import get_current_user, check_user_role
from models import User
from models.tracking import (
    ConversionEvent, TrackingConfiguration, ConversionGoal, 
    CampaignTracking, AttributionModel
)
from schemas_new.tracking import (
    ConversionEventCreate, ConversionEventResponse,
    AttributionReport, ConversionAnalytics,
    TrackingConfigUpdate, TrackingConfigResponse,
    ConversionGoalCreate, ConversionGoalResponse,
    CampaignTrackingCreate, CampaignTrackingResponse,
    PlatformTestRequest, PlatformTestResponse
)
from services.conversion_tracking_service import ConversionTrackingService
from utils.rate_limiter import RateLimiter

# Import Meta tracking endpoints
from routers.meta_tracking import router as meta_tracking_router


router = APIRouter(
    prefix="/api/v2/tracking",
    tags=["tracking"],
    responses={404: {"description": "Not found"}},
)

# Include Meta tracking router
router.include_router(meta_tracking_router, prefix="", tags=["meta-tracking"])

# Initialize services
tracking_service = ConversionTrackingService()
rate_limiter = RateLimiter(requests_per_minute=100)  # Limit tracking requests


@router.post("/event", response_model=ConversionEventResponse)
async def track_conversion_event(
    event_data: ConversionEventCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Track a conversion event.
    
    Supports deduplication, attribution assignment, and multi-platform syncing.
    Events are automatically sent to configured platforms (GTM, Meta, etc.).
    """
    # Rate limiting
    await rate_limiter.check_rate_limit(request, str(current_user.id))
    
    # Add request metadata if not provided
    if not event_data.ip_address:
        event_data.ip_address = request.client.host
    if not event_data.user_agent:
        event_data.user_agent = request.headers.get("user-agent")
    
    try:
        event = await tracking_service.track_event(
            db=db,
            user_id=current_user.id,
            event_data=event_data
        )
        return event
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/events/batch", response_model=List[ConversionEventResponse])
async def track_conversion_events_batch(
    events: List[ConversionEventCreate],
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Track multiple conversion events in batch.
    
    Useful for offline conversions or bulk imports.
    Maximum 100 events per batch.
    """
    if len(events) > 100:
        raise HTTPException(
            status_code=400,
            detail="Maximum 100 events per batch"
        )
    
    # Rate limiting (count as multiple requests)
    await rate_limiter.check_rate_limit(request, str(current_user.id), count=len(events))
    
    tracked_events = []
    errors = []
    
    for i, event_data in enumerate(events):
        try:
            # Add request metadata if not provided
            if not event_data.ip_address:
                event_data.ip_address = request.client.host
            if not event_data.user_agent:
                event_data.user_agent = request.headers.get("user-agent")
            
            event = await tracking_service.track_event(
                db=db,
                user_id=current_user.id,
                event_data=event_data
            )
            tracked_events.append(event)
        except Exception as e:
            errors.append({
                "index": i,
                "event_name": event_data.event_name,
                "error": str(e)
            })
    
    if errors:
        # Return partial success with error details
        return {
            "tracked": tracked_events,
            "errors": errors
        }
    
    return tracked_events


@router.get("/analytics", response_model=ConversionAnalytics)
async def get_conversion_analytics(
    start_date: Optional[datetime] = Query(None, description="Start date for analytics"),
    end_date: Optional[datetime] = Query(None, description="End date for analytics"),
    group_by: str = Query("day", description="Grouping period: day, week, month"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get comprehensive conversion analytics.
    
    Includes channel performance, top converting pages, and conversion funnel data.
    Defaults to last 30 days if no date range specified.
    """
    analytics = await tracking_service.get_conversion_analytics(
        db=db,
        user_id=current_user.id,
        start_date=start_date,
        end_date=end_date,
        group_by=group_by
    )
    return analytics


@router.get("/attribution", response_model=AttributionReport)
async def get_attribution_report(
    model: AttributionModel = Query(AttributionModel.DATA_DRIVEN, description="Attribution model to use"),
    start_date: Optional[datetime] = Query(None, description="Start date for report"),
    end_date: Optional[datetime] = Query(None, description="End date for report"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Generate attribution report using different models.
    
    Supports last-click, first-click, linear, time-decay, position-based, and data-driven models.
    Shows how conversion credit is distributed across channels.
    """
    report = await tracking_service.get_attribution_report(
        db=db,
        user_id=current_user.id,
        model=model,
        start_date=start_date,
        end_date=end_date
    )
    return report


@router.get("/config", response_model=TrackingConfigResponse)
async def get_tracking_configuration(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get current tracking configuration."""
    config = db.query(TrackingConfiguration).filter(
        TrackingConfiguration.user_id == current_user.id
    ).first()
    
    if not config:
        # Return default configuration
        config = TrackingConfiguration(
            user_id=current_user.id,
            gtm_enabled=False,
            meta_enabled=False,
            google_ads_enabled=False,
            attribution_window_days=30,
            default_attribution_model=AttributionModel.DATA_DRIVEN,
            enable_enhanced_conversions=True,
            hash_user_data=True
        )
    
    return config


@router.put("/config", response_model=TrackingConfigResponse)
async def update_tracking_configuration(
    config_update: TrackingConfigUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update tracking configuration.
    
    Configure platform settings, attribution windows, and privacy preferences.
    """
    config = await tracking_service.update_tracking_config(
        db=db,
        user_id=current_user.id,
        config_update=config_update
    )
    return config


@router.post("/config/test", response_model=PlatformTestResponse)
async def test_platform_connection(
    test_request: PlatformTestRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Test connection to a tracking platform.
    
    Validates credentials and configuration without saving.
    """
    result = await tracking_service.test_platform_connection(
        platform=test_request.platform,
        config=test_request.config
    )
    return PlatformTestResponse(**result)


# Conversion Goals endpoints

@router.get("/goals", response_model=List[ConversionGoalResponse])
async def get_conversion_goals(
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all conversion goals for the user."""
    query = db.query(ConversionGoal).filter(
        ConversionGoal.user_id == current_user.id
    )
    
    if is_active is not None:
        query = query.filter(ConversionGoal.is_active == is_active)
    
    goals = query.order_by(ConversionGoal.created_at.desc()).all()
    return goals


@router.post("/goals", response_model=ConversionGoalResponse)
async def create_conversion_goal(
    goal_data: ConversionGoalCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new conversion goal."""
    # Check for duplicate goal name
    existing = db.query(ConversionGoal).filter(
        ConversionGoal.user_id == current_user.id,
        ConversionGoal.name == goal_data.name
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Goal with name '{goal_data.name}' already exists"
        )
    
    goal = ConversionGoal(
        user_id=current_user.id,
        **goal_data.dict()
    )
    
    db.add(goal)
    db.commit()
    db.refresh(goal)
    
    return goal


@router.put("/goals/{goal_id}", response_model=ConversionGoalResponse)
async def update_conversion_goal(
    goal_id: int,
    goal_update: ConversionGoalCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a conversion goal."""
    goal = db.query(ConversionGoal).filter(
        ConversionGoal.id == goal_id,
        ConversionGoal.user_id == current_user.id
    ).first()
    
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    # Check for duplicate name if name is being changed
    if goal_update.name != goal.name:
        existing = db.query(ConversionGoal).filter(
            ConversionGoal.user_id == current_user.id,
            ConversionGoal.name == goal_update.name,
            ConversionGoal.id != goal_id
        ).first()
        
        if existing:
            raise HTTPException(
                status_code=400,
                detail=f"Goal with name '{goal_update.name}' already exists"
            )
    
    # Update goal
    for field, value in goal_update.dict().items():
        setattr(goal, field, value)
    
    db.commit()
    db.refresh(goal)
    
    return goal


@router.delete("/goals/{goal_id}")
async def delete_conversion_goal(
    goal_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a conversion goal."""
    goal = db.query(ConversionGoal).filter(
        ConversionGoal.id == goal_id,
        ConversionGoal.user_id == current_user.id
    ).first()
    
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    db.delete(goal)
    db.commit()
    
    return {"message": "Goal deleted successfully"}


# Campaign Tracking endpoints

@router.get("/campaigns", response_model=List[CampaignTrackingResponse])
async def get_campaign_tracking(
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    source: Optional[str] = Query(None, description="Filter by campaign source"),
    start_date: Optional[datetime] = Query(None, description="Filter campaigns starting after this date"),
    end_date: Optional[datetime] = Query(None, description="Filter campaigns ending before this date"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get campaign tracking data with optional filters."""
    query = db.query(CampaignTracking).filter(
        CampaignTracking.user_id == current_user.id
    )
    
    if is_active is not None:
        query = query.filter(CampaignTracking.is_active == is_active)
    
    if source:
        query = query.filter(CampaignTracking.campaign_source == source)
    
    if start_date:
        query = query.filter(CampaignTracking.start_date >= start_date)
    
    if end_date:
        query = query.filter(CampaignTracking.end_date <= end_date)
    
    campaigns = query.order_by(CampaignTracking.created_at.desc()).all()
    return campaigns


@router.post("/campaigns", response_model=CampaignTrackingResponse)
async def create_campaign_tracking(
    campaign_data: CampaignTrackingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create campaign tracking record."""
    # Check for duplicate campaign
    existing = db.query(CampaignTracking).filter(
        CampaignTracking.user_id == current_user.id,
        CampaignTracking.campaign_id == campaign_data.campaign_id,
        CampaignTracking.campaign_source == campaign_data.campaign_source
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Campaign '{campaign_data.campaign_id}' from {campaign_data.campaign_source} already exists"
        )
    
    campaign = CampaignTracking(
        user_id=current_user.id,
        **campaign_data.dict()
    )
    
    db.add(campaign)
    db.commit()
    db.refresh(campaign)
    
    return campaign


@router.put("/campaigns/{campaign_id}/metrics")
async def update_campaign_metrics(
    campaign_id: int,
    impressions: Optional[int] = None,
    clicks: Optional[int] = None,
    conversions: Optional[int] = None,
    conversion_value: Optional[float] = None,
    total_cost: Optional[float] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update campaign performance metrics."""
    campaign = db.query(CampaignTracking).filter(
        CampaignTracking.id == campaign_id,
        CampaignTracking.user_id == current_user.id
    ).first()
    
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    # Update provided metrics
    if impressions is not None:
        campaign.impressions = impressions
    if clicks is not None:
        campaign.clicks = clicks
    if conversions is not None:
        campaign.conversions = conversions
    if conversion_value is not None:
        campaign.conversion_value = conversion_value
    if total_cost is not None:
        campaign.total_cost = total_cost
    
    # Recalculate derived metrics
    campaign.calculate_metrics()
    campaign.last_sync_at = datetime.utcnow()
    
    db.commit()
    db.refresh(campaign)
    
    return campaign


@router.post("/campaigns/sync")
async def sync_campaign_data(
    source: Optional[str] = Query(None, description="Specific source to sync"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Sync campaign data from external platforms.
    
    This endpoint would typically integrate with Google Ads, Meta Ads, etc.
    to pull latest campaign performance data.
    """
    # This is a placeholder for actual platform integrations
    # In production, this would call respective platform APIs
    
    synced_count = 0
    errors = []
    
    # Get campaigns to sync
    query = db.query(CampaignTracking).filter(
        CampaignTracking.user_id == current_user.id,
        CampaignTracking.is_active == True
    )
    
    if source:
        query = query.filter(CampaignTracking.campaign_source == source)
    
    campaigns = query.all()
    
    for campaign in campaigns:
        try:
            # Placeholder for actual sync logic
            # In production, this would:
            # 1. Call platform API (Google Ads, Meta, etc.)
            # 2. Get latest metrics
            # 3. Update campaign record
            
            campaign.last_sync_at = datetime.utcnow()
            synced_count += 1
            
        except Exception as e:
            errors.append({
                "campaign_id": campaign.campaign_id,
                "source": campaign.campaign_source,
                "error": str(e)
            })
    
    db.commit()
    
    return {
        "synced": synced_count,
        "errors": errors,
        "message": f"Synced {synced_count} campaigns"
    }


# Health check endpoint
@router.get("/health")
async def tracking_health_check(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Check health of tracking integrations."""
    config = db.query(TrackingConfiguration).filter(
        TrackingConfiguration.user_id == current_user.id
    ).first()
    
    health_status = {
        "gtm": {
            "configured": bool(config and config.gtm_container_id),
            "enabled": bool(config and config.gtm_enabled)
        },
        "meta": {
            "configured": bool(config and config.meta_pixel_id),
            "enabled": bool(config and config.meta_enabled)
        },
        "google_ads": {
            "configured": bool(config and config.google_ads_conversion_id),
            "enabled": bool(config and config.google_ads_enabled)
        }
    }
    
    # Get recent tracking activity
    recent_events = db.query(ConversionEvent).filter(
        ConversionEvent.user_id == current_user.id,
        ConversionEvent.created_at >= datetime.utcnow() - timedelta(days=1)
    ).count()
    
    return {
        "status": "healthy",
        "integrations": health_status,
        "events_last_24h": recent_events,
        "timestamp": datetime.utcnow()
    }