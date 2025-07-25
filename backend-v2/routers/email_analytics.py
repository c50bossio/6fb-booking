"""
Email Analytics API endpoints for BookedBarber
"""
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime
import logging

from db import get_db
from utils.auth import get_current_user
from models import User
from services.email_analytics import get_email_analytics_service
from schemas import (
    EmailMetricsResponse,
    EmailCampaignResponse,
    EmailEngagementResponse,
    TopClickedUrlsResponse
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/email-analytics", tags=["email-analytics"])

@router.post("/webhook/sendgrid", include_in_schema=False)
async def sendgrid_webhook(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Webhook endpoint for SendGrid events
    
    This endpoint receives SendGrid event webhook data and processes it
    for email analytics. Events include: delivered, opened, clicked, bounced, etc.
    """
    try:
        # Parse webhook payload
        webhook_data = await request.json()
        
        # SendGrid sends events as an array
        events = webhook_data if isinstance(webhook_data, list) else [webhook_data]
        
        analytics_service = get_email_analytics_service(db)
        processed_count = 0
        
        for event in events:
            if analytics_service.process_sendgrid_event(event):
                processed_count += 1
        
        logger.info(f"Processed {processed_count}/{len(events)} SendGrid events")
        
        return {
            "status": "success",
            "processed": processed_count,
            "total": len(events)
        }
    
    except Exception as e:
        logger.error(f"Error processing SendGrid webhook: {str(e)}")
        raise HTTPException(status_code=500, detail="Error processing webhook")

@router.get("/metrics", response_model=EmailMetricsResponse)
async def get_email_metrics(
    start_date: Optional[datetime] = Query(None, description="Start date for metrics"),
    end_date: Optional[datetime] = Query(None, description="End date for metrics"),
    notification_type: Optional[str] = Query(None, description="Filter by notification type"),
    user_id: Optional[int] = Query(None, description="Filter by user ID"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get email performance metrics
    
    Returns comprehensive email analytics including:
    - Send, delivery, open, click rates
    - Bounce and unsubscribe rates
    - Time period analysis
    """
    # Check permissions
    if current_user.role not in ["admin", "super_admin"]:
        if user_id and user_id != current_user.id:
            raise HTTPException(
                status_code=403, 
                detail="Cannot access other users' analytics"
            )
        user_id = current_user.id
    
    analytics_service = get_email_analytics_service(db)
    metrics = analytics_service.get_email_metrics(
        start_date=start_date,
        end_date=end_date,
        notification_type=notification_type,
        user_id=user_id
    )
    
    return EmailMetricsResponse(**metrics)

@router.get("/campaigns", response_model=List[EmailCampaignResponse])
async def get_campaigns(
    limit: int = Query(20, description="Number of campaigns to return"),
    offset: int = Query(0, description="Offset for pagination"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get list of email campaigns with performance metrics"""
    if current_user.role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    from models import EmailCampaign
    
    campaigns = db.query(EmailCampaign).order_by(
        EmailCampaign.created_at.desc()
    ).offset(offset).limit(limit).all()
    
    analytics_service = get_email_analytics_service(db)
    campaign_data = []
    
    for campaign in campaigns:
        performance = analytics_service.get_campaign_performance(campaign.id)
        if performance:
            campaign_data.append(EmailCampaignResponse(**performance))
    
    return campaign_data

@router.get("/campaigns/{campaign_id}", response_model=EmailCampaignResponse)
async def get_campaign_performance(
    campaign_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get detailed performance metrics for a specific campaign"""
    if current_user.role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    analytics_service = get_email_analytics_service(db)
    performance = analytics_service.get_campaign_performance(campaign_id)
    
    if not performance:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    return EmailCampaignResponse(**performance)

@router.get("/top-urls", response_model=TopClickedUrlsResponse)
async def get_top_clicked_urls(
    limit: int = Query(10, description="Number of URLs to return"),
    start_date: Optional[datetime] = Query(None, description="Start date"),
    end_date: Optional[datetime] = Query(None, description="End date"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get most clicked URLs in emails"""
    if current_user.role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    analytics_service = get_email_analytics_service(db)
    urls = analytics_service.get_top_clicked_urls(
        limit=limit,
        start_date=start_date,
        end_date=end_date
    )
    
    return TopClickedUrlsResponse(urls=[
        {
            "url": url,
            "clicks": clicks,
            "unique_clicks": unique_clicks
        }
        for url, clicks, unique_clicks in urls
    ])

@router.get("/notification-types", response_model=Dict[str, Any])
async def get_notification_type_performance(
    start_date: Optional[datetime] = Query(None, description="Start date"),
    end_date: Optional[datetime] = Query(None, description="End date"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get performance metrics by notification type"""
    if current_user.role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    analytics_service = get_email_analytics_service(db)
    performance = analytics_service.get_notification_type_performance(
        start_date=start_date,
        end_date=end_date
    )
    
    return {"notification_types": performance}

@router.get("/engagement/{user_id}", response_model=EmailEngagementResponse)
async def get_user_engagement(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get engagement score for a specific user"""
    # Check permissions
    if current_user.role not in ["admin", "super_admin"]:
        if user_id != current_user.id:
            raise HTTPException(
                status_code=403, 
                detail="Cannot access other users' engagement data"
            )
    
    analytics_service = get_email_analytics_service(db)
    engagement = analytics_service.get_user_engagement_score(user_id)
    
    return EmailEngagementResponse(**engagement)

@router.post("/campaigns", response_model=EmailCampaignResponse)
async def create_campaign(
    name: str,
    template_name: str,
    subject: str,
    sent_count: int = 0,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new email campaign for tracking"""
    if current_user.role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    analytics_service = get_email_analytics_service(db)
    campaign = analytics_service.create_campaign(
        name=name,
        template_name=template_name,
        subject=subject,
        sent_count=sent_count
    )
    
    performance = analytics_service.get_campaign_performance(campaign.id)
    return EmailCampaignResponse(**performance)

@router.get("/dashboard", response_model=Dict[str, Any])
async def get_analytics_dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get comprehensive analytics dashboard data
    
    Returns:
    - Overall metrics for last 30 days
    - Top performing notification types
    - Recent campaign performance
    - Engagement trends
    """
    if current_user.role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    analytics_service = get_email_analytics_service(db)
    
    # Get overall metrics for last 30 days
    overall_metrics = analytics_service.get_email_metrics()
    
    # Get notification type performance
    notification_performance = analytics_service.get_notification_type_performance()
    
    # Get top clicked URLs
    top_urls = analytics_service.get_top_clicked_urls(limit=5)
    
    # Get recent campaigns
    from models import EmailCampaign
    recent_campaigns = db.query(EmailCampaign).order_by(
        EmailCampaign.created_at.desc()
    ).limit(5).all()
    
    campaign_performance = []
    for campaign in recent_campaigns:
        perf = analytics_service.get_campaign_performance(campaign.id)
        if perf:
            campaign_performance.append(perf)
    
    return {
        "overall_metrics": overall_metrics,
        "notification_performance": notification_performance,
        "top_urls": [
            {"url": url, "clicks": clicks, "unique_clicks": unique_clicks}
            for url, clicks, unique_clicks in top_urls
        ],
        "recent_campaigns": campaign_performance,
        "last_updated": datetime.utcnow().isoformat()
    }