"""
Customer Retention and Loyalty Program API Endpoints for BookedBarber V2

Provides comprehensive retention management aligned with Six Figure Barber methodology:
- Loyalty points management and tracking
- Client retention analytics and insights
- Automated retention campaigns
- Tier progression and reward systems
- Revenue optimization through retention
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from fastapi import APIRouter, Depends, HTTPException, Query, Path
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from db import get_db
from utils.auth import get_current_user
from services.customer_retention_service import customer_retention_service, LoyaltyTier, RetentionStatus, CampaignType
from models import User
from utils.rate_limiter import rate_limiter

logger = logging.getLogger(__name__)
security = HTTPBearer()

router = APIRouter(
    prefix="/customer-retention",
    tags=["Customer Retention & Loyalty"],
    dependencies=[Depends(security)]
)

# ================================================================================
# REQUEST/RESPONSE MODELS
# ================================================================================

class RetentionMetricsResponse(BaseModel):
    """Client retention metrics response"""
    client_id: int
    lifetime_value: float
    visit_frequency: float
    last_visit_days_ago: int
    tier: str
    status: str
    points_balance: int
    next_reward_threshold: int
    churn_risk_score: float
    
    class Config:
        from_attributes = True

class AwardPointsRequest(BaseModel):
    """Request to award loyalty points to a client"""
    client_id: int = Field(..., description="Client ID to award points to")
    activity_type: str = Field(..., description="Type of activity that earned points")
    base_points: int = Field(..., gt=0, description="Base points to award (before tier multiplier)")
    context: Optional[Dict[str, Any]] = Field(None, description="Additional context data")

class AwardPointsResponse(BaseModel):
    """Response after awarding loyalty points"""
    success: bool
    points_awarded: int
    client_tier: str
    new_balance: int
    tier_upgraded: bool = False

class RedeemPointsRequest(BaseModel):
    """Request to redeem loyalty points for rewards"""
    client_id: int = Field(..., description="Client ID redeeming points")
    points_to_redeem: int = Field(..., gt=0, description="Points to redeem")
    reward_type: str = Field(..., description="Type of reward being redeemed")
    reward_details: Dict[str, Any] = Field(..., description="Reward configuration details")

class CreateCampaignRequest(BaseModel):
    """Request to create a retention campaign"""
    client_ids: List[int] = Field(..., description="List of client IDs to target")
    campaign_type: str = Field(..., description="Type of retention campaign")
    custom_config: Optional[Dict[str, Any]] = Field(None, description="Custom campaign configuration")

class CreateCampaignResponse(BaseModel):
    """Response after creating retention campaign"""
    campaign_id: str
    clients_targeted: int
    estimated_reach: int

class ClientLoyaltyDashboardResponse(BaseModel):
    """Complete loyalty dashboard data for a client"""
    client_id: int
    loyalty_tier: str
    points_balance: int
    lifetime_value: float
    tier_progress: Dict[str, Any]
    available_rewards: List[Dict[str, Any]]
    recent_transactions: List[Dict[str, Any]]
    active_campaigns: List[Dict[str, Any]]
    retention_insights: Dict[str, Any]

# ================================================================================
# CLIENT RETENTION ANALYTICS ENDPOINTS
# ================================================================================

@router.get(
    "/analytics/client/{client_id}",
    response_model=RetentionMetricsResponse,
    summary="Get client retention metrics",
    description="Analyze retention metrics for a specific client including loyalty tier, churn risk, and points balance"
)
async def get_client_retention_metrics(
    client_id: int = Path(..., description="Client ID to analyze"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get comprehensive retention analysis for a client"""
    try:
        # Rate limiting
        await rate_limiter.check_rate_limit(f"retention_metrics_{current_user.id}", max_requests=100, window_minutes=60)
        
        # Verify user has access to this client's data
        client = db.query(User).filter(User.id == client_id).first()
        if not client:
            raise HTTPException(status_code=404, detail="Client not found")
        
        # TODO: Add proper permission checks based on user role and organization
        
        # Get retention metrics
        metrics = await customer_retention_service.analyze_client_retention(db, client_id)
        
        return RetentionMetricsResponse(
            client_id=metrics.client_id,
            lifetime_value=metrics.lifetime_value,
            visit_frequency=metrics.visit_frequency,
            last_visit_days_ago=metrics.last_visit_days_ago,
            tier=metrics.tier.value,
            status=metrics.status.value,
            points_balance=metrics.points_balance,
            next_reward_threshold=metrics.next_reward_threshold,
            churn_risk_score=metrics.churn_risk_score
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get retention metrics for client {client_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to analyze client retention")

@router.get(
    "/dashboard/client/{client_id}",
    response_model=ClientLoyaltyDashboardResponse,
    summary="Get client loyalty dashboard",
    description="Get complete loyalty program dashboard data for a client including rewards, transactions, and insights"
)
async def get_client_loyalty_dashboard(
    client_id: int = Path(..., description="Client ID for dashboard"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get comprehensive loyalty dashboard for a client"""
    try:
        # Rate limiting
        await rate_limiter.check_rate_limit(f"loyalty_dashboard_{current_user.id}", max_requests=50, window_minutes=60)
        
        # Get dashboard data
        dashboard_data = await customer_retention_service.get_client_loyalty_dashboard(db, client_id)
        
        return ClientLoyaltyDashboardResponse(**dashboard_data)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get loyalty dashboard for client {client_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to load loyalty dashboard")

# ================================================================================
# LOYALTY POINTS MANAGEMENT ENDPOINTS
# ================================================================================

@router.post(
    "/points/award",
    response_model=AwardPointsResponse,
    summary="Award loyalty points",
    description="Award loyalty points to a client for specific activities (booking completion, referrals, etc.)"
)
async def award_loyalty_points(
    request: AwardPointsRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Award loyalty points to a client"""
    try:
        # Rate limiting
        await rate_limiter.check_rate_limit(f"award_points_{current_user.id}", max_requests=200, window_minutes=60)
        
        # Award points with tier multiplier
        points_awarded = await customer_retention_service.award_loyalty_points(
            db=db,
            client_id=request.client_id,
            activity_type=request.activity_type,
            base_points=request.base_points,
            context=request.context
        )
        
        # Get updated client metrics
        metrics = await customer_retention_service.analyze_client_retention(db, request.client_id)
        
        return AwardPointsResponse(
            success=True,
            points_awarded=points_awarded,
            client_tier=metrics.tier.value,
            new_balance=metrics.points_balance,
            tier_upgraded=False  # TODO: Implement tier upgrade detection
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to award points to client {request.client_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to award loyalty points")

@router.post(
    "/points/redeem",
    summary="Redeem loyalty points",
    description="Redeem loyalty points for rewards (discounts, upgrades, free services)"
)
async def redeem_loyalty_points(
    request: RedeemPointsRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Redeem loyalty points for rewards"""
    try:
        # Rate limiting
        await rate_limiter.check_rate_limit(f"redeem_points_{current_user.id}", max_requests=100, window_minutes=60)
        
        # Process redemption
        result = await customer_retention_service.redeem_loyalty_points(
            db=db,
            client_id=request.client_id,
            points_to_redeem=request.points_to_redeem,
            reward_type=request.reward_type,
            reward_details=request.reward_details
        )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to redeem points for client {request.client_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to redeem loyalty points")

# ================================================================================
# RETENTION CAMPAIGN MANAGEMENT ENDPOINTS
# ================================================================================

@router.post(
    "/campaigns/create",
    response_model=CreateCampaignResponse,
    summary="Create retention campaign",
    description="Create personalized retention campaign targeting specific clients based on their retention status"
)
async def create_retention_campaign(
    request: CreateCampaignRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create targeted retention campaign"""
    try:
        # Rate limiting
        await rate_limiter.check_rate_limit(f"create_campaign_{current_user.id}", max_requests=20, window_minutes=60)
        
        # Validate campaign type
        try:
            campaign_type = CampaignType(request.campaign_type)
        except ValueError:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid campaign type. Must be one of: {[e.value for e in CampaignType]}"
            )
        
        # Create campaign
        campaign_id = await customer_retention_service.create_retention_campaign(
            db=db,
            client_ids=request.client_ids,
            campaign_type=campaign_type,
            custom_config=request.custom_config
        )
        
        return CreateCampaignResponse(
            campaign_id=campaign_id,
            clients_targeted=len(request.client_ids),
            estimated_reach=len(request.client_ids)  # Simplified - could be more sophisticated
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create retention campaign: {e}")
        raise HTTPException(status_code=500, detail="Failed to create retention campaign")

# ================================================================================
# BULK OPERATIONS AND ANALYTICS ENDPOINTS
# ================================================================================

@router.get(
    "/analytics/summary",
    summary="Get retention analytics summary",
    description="Get high-level retention analytics for the business including tier distribution and churn risk"
)
async def get_retention_analytics_summary(
    date_range_days: int = Query(30, description="Number of days to analyze", ge=1, le=365),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get business-wide retention analytics summary"""
    try:
        # Rate limiting
        await rate_limiter.check_rate_limit(f"retention_summary_{current_user.id}", max_requests=20, window_minutes=60)
        
        # TODO: Implement comprehensive analytics aggregation
        # This would include:
        # - Tier distribution across all clients
        # - Average lifetime value by tier
        # - Churn risk distribution
        # - Points redemption patterns
        # - Campaign effectiveness metrics
        
        return {
            "message": "Retention analytics summary endpoint - implementation pending",
            "date_range_days": date_range_days,
            "note": "This will provide comprehensive business-wide retention insights"
        }
        
    except Exception as e:
        logger.error(f"Failed to get retention analytics summary: {e}")
        raise HTTPException(status_code=500, detail="Failed to load retention analytics")

@router.get(
    "/tiers/distribution",
    summary="Get loyalty tier distribution",
    description="Get distribution of clients across loyalty tiers with progression insights"
)
async def get_loyalty_tier_distribution(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get loyalty tier distribution across all clients"""
    try:
        # Rate limiting
        await rate_limiter.check_rate_limit(f"tier_distribution_{current_user.id}", max_requests=30, window_minutes=60)
        
        # TODO: Implement tier distribution analytics
        # This would include:
        # - Count of clients in each tier
        # - Average progression time between tiers
        # - Revenue contribution by tier
        # - Tier-specific retention rates
        
        return {
            "message": "Loyalty tier distribution endpoint - implementation pending",
            "tiers": [tier.value for tier in LoyaltyTier],
            "note": "This will provide detailed tier distribution and progression analytics"
        }
        
    except Exception as e:
        logger.error(f"Failed to get tier distribution: {e}")
        raise HTTPException(status_code=500, detail="Failed to load tier distribution")

# ================================================================================
# CAMPAIGN TEMPLATES AND CONFIGURATION ENDPOINTS
# ================================================================================

@router.get(
    "/campaigns/templates",
    summary="Get campaign templates",
    description="Get available retention campaign templates with Six Figure Barber methodology integration"
)
async def get_campaign_templates(
    current_user: User = Depends(get_current_user)
):
    """Get available retention campaign templates"""
    try:
        # Rate limiting
        await rate_limiter.check_rate_limit(f"campaign_templates_{current_user.id}", max_requests=50, window_minutes=60)
        
        templates = {
            "welcome_series": {
                "name": "Welcome Series",
                "description": "Onboard new clients with Six Figure Barber value proposition",
                "target_criteria": {"tier": "newcomer", "status": "active"},
                "message_sequence": ["welcome_email", "value_proposition", "booking_reminder"],
                "duration_days": 7,
                "expected_conversion_rate": 0.25
            },
            "tier_upgrade": {
                "name": "Tier Upgrade Celebration",
                "description": "Celebrate and reinforce tier progression with rewards",
                "target_criteria": {"tier_upgrade": True},
                "message_sequence": ["congratulations", "tier_benefits", "exclusive_offer"],
                "duration_days": 3,
                "expected_conversion_rate": 0.35
            },
            "win_back": {
                "name": "Win-Back Campaign",
                "description": "Re-engage lapsed clients with compelling offers",
                "target_criteria": {"status": ["lapsed", "churned"]},
                "message_sequence": ["miss_you", "special_offer", "last_chance"],
                "duration_days": 14,
                "expected_conversion_rate": 0.15
            },
            "vip_experience": {
                "name": "VIP Experience Enhancement",
                "description": "Deepen engagement with premium clients",
                "target_criteria": {"tier": ["vip", "platinum"]},
                "message_sequence": ["exclusive_access", "premium_services", "referral_program"],
                "duration_days": 30,
                "expected_conversion_rate": 0.45
            }
        }
        
        return {
            "templates": templates,
            "methodology_alignment": "All templates align with Six Figure Barber principles of value creation and premium positioning",
            "customization_options": ["messaging", "timing", "incentives", "targeting_criteria"]
        }
        
    except Exception as e:
        logger.error(f"Failed to get campaign templates: {e}")
        raise HTTPException(status_code=500, detail="Failed to load campaign templates")