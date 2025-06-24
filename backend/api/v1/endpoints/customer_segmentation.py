from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.orm import Session
from typing import Dict, List, Optional
from datetime import date, datetime
import logging

from config.database import get_db
from services.customer_segmentation_service import (
    CustomerSegmentationService,
    CustomerSegment,
    LoyaltyTier,
)
from services.segmentation_analytics_service import SegmentationAnalyticsService
from services.segmentation_marketing_service import (
    SegmentationMarketingService,
    CampaignType,
)
from utils.auth_decorators import require_auth
from models import Barber


router = APIRouter(prefix="/segmentation", tags=["Customer Segmentation"])
logger = logging.getLogger(__name__)


@router.get("/segments")
@require_auth
async def get_customer_segments(
    barber_id: int = Query(..., description="Barber ID"),
    force_refresh: bool = Query(False, description="Force refresh of segments"),
    db: Session = Depends(get_db),
):
    """
    Get all customer segments for a barber
    """
    try:
        service = CustomerSegmentationService(db)
        segments = service.segment_customers(barber_id, force_refresh)

        return {
            "success": True,
            "data": segments,
            "segments_available": list(CustomerSegment.__members__.keys()),
            "last_updated": datetime.utcnow().isoformat(),
        }
    except Exception as e:
        logger.error(f"Error getting customer segments: {e}")
        raise HTTPException(
            status_code=500, detail="Failed to retrieve customer segments"
        )


@router.get("/segments/{segment_name}")
@require_auth
async def get_segment_details(
    segment_name: str,
    barber_id: int = Query(..., description="Barber ID"),
    db: Session = Depends(get_db),
):
    """
    Get detailed information about a specific customer segment
    """
    try:
        # Validate segment name
        try:
            segment_enum = CustomerSegment(segment_name.lower())
        except ValueError:
            raise HTTPException(
                status_code=400, detail=f"Invalid segment name: {segment_name}"
            )

        service = CustomerSegmentationService(db)
        segments = service.segment_customers(barber_id)

        segment_data = segments.get(segment_name.lower(), [])

        # Get additional analytics for this segment
        analytics_service = SegmentationAnalyticsService(db)
        segment_analytics = analytics_service.get_segmentation_analytics(barber_id)

        segment_stats = segment_analytics.get("segments", {}).get(
            segment_name.lower(), {}
        )

        return {
            "success": True,
            "data": {
                "segment_name": segment_name,
                "customers": segment_data,
                "statistics": segment_stats,
                "total_customers": len(segment_data),
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting segment details: {e}")
        raise HTTPException(
            status_code=500, detail="Failed to retrieve segment details"
        )


@router.get("/vip-customers")
@require_auth
async def get_vip_customers(
    barber_id: int = Query(..., description="Barber ID"), db: Session = Depends(get_db)
):
    """
    Get all VIP customers with detailed analytics
    """
    try:
        service = CustomerSegmentationService(db)
        vip_customers = service.identify_vip_customers(barber_id)

        return {
            "success": True,
            "data": vip_customers,
            "total_vip_customers": len(vip_customers),
            "total_vip_value": sum(
                customer["total_spending"] for customer in vip_customers
            ),
        }
    except Exception as e:
        logger.error(f"Error getting VIP customers: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve VIP customers")


@router.get("/at-risk-customers")
@require_auth
async def get_at_risk_customers(
    barber_id: int = Query(..., description="Barber ID"),
    days_threshold: int = Query(
        45, description="Days since last visit to consider at-risk"
    ),
    db: Session = Depends(get_db),
):
    """
    Get customers who are at risk of churning
    """
    try:
        service = CustomerSegmentationService(db)
        # Update criteria if needed
        if days_threshold != 45:
            service.criteria.at_risk_days = days_threshold

        at_risk_customers = service.identify_at_risk_customers(barber_id)

        # Sort by risk score (highest first)
        at_risk_customers.sort(key=lambda x: x.get("risk_score", 0), reverse=True)

        return {
            "success": True,
            "data": at_risk_customers,
            "total_at_risk": len(at_risk_customers),
            "average_risk_score": (
                sum(c.get("risk_score", 0) for c in at_risk_customers)
                / len(at_risk_customers)
                if at_risk_customers
                else 0
            ),
            "total_value_at_risk": sum(
                c.get("total_spent", 0) for c in at_risk_customers
            ),
        }
    except Exception as e:
        logger.error(f"Error getting at-risk customers: {e}")
        raise HTTPException(
            status_code=500, detail="Failed to retrieve at-risk customers"
        )


@router.get("/new-customer-onboarding")
@require_auth
async def get_new_customer_onboarding(
    barber_id: int = Query(..., description="Barber ID"),
    days: int = Query(30, description="Number of days to analyze"),
    db: Session = Depends(get_db),
):
    """
    Get new customer onboarding analytics
    """
    try:
        service = CustomerSegmentationService(db)
        onboarding_data = service.track_new_customer_onboarding(barber_id, days)

        return {"success": True, "data": onboarding_data}
    except Exception as e:
        logger.error(f"Error getting onboarding data: {e}")
        raise HTTPException(
            status_code=500, detail="Failed to retrieve onboarding data"
        )


@router.get("/loyalty-tiers")
@require_auth
async def get_loyalty_tiers(
    barber_id: int = Query(..., description="Barber ID"), db: Session = Depends(get_db)
):
    """
    Get customer loyalty tier classifications
    """
    try:
        service = CustomerSegmentationService(db)
        loyalty_tiers = service.classify_loyalty_tiers(barber_id)

        # Calculate tier statistics
        tier_stats = {}
        total_customers = sum(len(customers) for customers in loyalty_tiers.values())

        for tier, customers in loyalty_tiers.items():
            tier_stats[tier] = {
                "count": len(customers),
                "percentage": (
                    round(len(customers) / total_customers * 100, 1)
                    if total_customers > 0
                    else 0
                ),
                "average_value": (
                    sum(c["analytics"].get("total_spent", 0) for c in customers)
                    / len(customers)
                    if customers
                    else 0
                ),
            }

        return {
            "success": True,
            "data": loyalty_tiers,
            "statistics": tier_stats,
            "available_tiers": [tier.value for tier in LoyaltyTier],
        }
    except Exception as e:
        logger.error(f"Error getting loyalty tiers: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve loyalty tiers")


@router.get("/analytics/overview")
@require_auth
async def get_segmentation_analytics_overview(
    barber_id: int = Query(..., description="Barber ID"), db: Session = Depends(get_db)
):
    """
    Get comprehensive segmentation analytics overview
    """
    try:
        service = CustomerSegmentationService(db)
        analytics = service.get_segmentation_analytics(barber_id)

        return {"success": True, "data": analytics}
    except Exception as e:
        logger.error(f"Error getting analytics overview: {e}")
        raise HTTPException(
            status_code=500, detail="Failed to retrieve analytics overview"
        )


@router.get("/analytics/clv")
@require_auth
async def get_customer_lifetime_value_analysis(
    barber_id: int = Query(..., description="Barber ID"), db: Session = Depends(get_db)
):
    """
    Get customer lifetime value analysis
    """
    try:
        service = SegmentationAnalyticsService(db)
        clv_analysis = service.calculate_customer_lifetime_value(barber_id)

        return {"success": True, "data": clv_analysis}
    except Exception as e:
        logger.error(f"Error getting CLV analysis: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve CLV analysis")


@router.get("/analytics/frequency")
@require_auth
async def get_booking_frequency_analysis(
    barber_id: int = Query(..., description="Barber ID"),
    days: int = Query(90, description="Analysis period in days"),
    db: Session = Depends(get_db),
):
    """
    Get booking frequency analysis
    """
    try:
        service = SegmentationAnalyticsService(db)
        # Update config if needed
        if days != 90:
            service.config.frequency_analysis_period = days

        frequency_analysis = service.analyze_booking_frequency(barber_id)

        return {"success": True, "data": frequency_analysis}
    except Exception as e:
        logger.error(f"Error getting frequency analysis: {e}")
        raise HTTPException(
            status_code=500, detail="Failed to retrieve frequency analysis"
        )


@router.get("/analytics/spending")
@require_auth
async def get_spending_patterns_analysis(
    barber_id: int = Query(..., description="Barber ID"), db: Session = Depends(get_db)
):
    """
    Get customer spending patterns analysis
    """
    try:
        service = SegmentationAnalyticsService(db)
        spending_analysis = service.analyze_spending_patterns(barber_id)

        return {"success": True, "data": spending_analysis}
    except Exception as e:
        logger.error(f"Error getting spending analysis: {e}")
        raise HTTPException(
            status_code=500, detail="Failed to retrieve spending analysis"
        )


@router.get("/analytics/service-preferences")
@require_auth
async def get_service_preferences_analysis(
    barber_id: int = Query(..., description="Barber ID"), db: Session = Depends(get_db)
):
    """
    Get service preferences analysis by segment
    """
    try:
        service = SegmentationAnalyticsService(db)
        service_analysis = service.analyze_service_preferences(barber_id)

        return {"success": True, "data": service_analysis}
    except Exception as e:
        logger.error(f"Error getting service preferences: {e}")
        raise HTTPException(
            status_code=500, detail="Failed to retrieve service preferences"
        )


@router.get("/analytics/seasonal")
@require_auth
async def get_seasonal_behavior_analysis(
    barber_id: int = Query(..., description="Barber ID"), db: Session = Depends(get_db)
):
    """
    Get seasonal booking behavior analysis
    """
    try:
        service = SegmentationAnalyticsService(db)
        seasonal_analysis = service.analyze_seasonal_behavior(barber_id)

        return {"success": True, "data": seasonal_analysis}
    except Exception as e:
        logger.error(f"Error getting seasonal analysis: {e}")
        raise HTTPException(
            status_code=500, detail="Failed to retrieve seasonal analysis"
        )


@router.get("/marketing/campaigns")
@require_auth
async def get_targeted_marketing_campaigns(
    barber_id: int = Query(..., description="Barber ID"),
    campaign_types: Optional[List[str]] = Query(
        None, description="Specific campaign types to generate"
    ),
    db: Session = Depends(get_db),
):
    """
    Generate targeted marketing campaigns based on customer segments
    """
    try:
        service = SegmentationMarketingService(db)

        # Convert string campaign types to enum if provided
        campaign_enums = None
        if campaign_types:
            try:
                campaign_enums = [CampaignType(ct.upper()) for ct in campaign_types]
            except ValueError as e:
                raise HTTPException(
                    status_code=400, detail=f"Invalid campaign type: {e}"
                )

        campaigns = service.create_targeted_campaigns(barber_id, campaign_enums)

        return {
            "success": True,
            "data": campaigns,
            "available_campaign_types": [ct.value for ct in CampaignType],
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating campaigns: {e}")
        raise HTTPException(
            status_code=500, detail="Failed to create targeted campaigns"
        )


@router.get("/marketing/promotions")
@require_auth
async def get_personalized_promotions(
    barber_id: int = Query(..., description="Barber ID"),
    client_id: Optional[int] = Query(
        None, description="Specific client ID for promotions"
    ),
    db: Session = Depends(get_db),
):
    """
    Generate personalized promotions for customers
    """
    try:
        service = SegmentationMarketingService(db)
        promotions = service.generate_personalized_promotions(barber_id, client_id)

        return {"success": True, "data": promotions}
    except Exception as e:
        logger.error(f"Error generating promotions: {e}")
        raise HTTPException(
            status_code=500, detail="Failed to generate personalized promotions"
        )


@router.get("/marketing/pricing-strategies")
@require_auth
async def get_segment_pricing_strategies(
    barber_id: int = Query(..., description="Barber ID"), db: Session = Depends(get_db)
):
    """
    Get pricing strategies for each customer segment
    """
    try:
        service = SegmentationMarketingService(db)
        pricing_strategies = service.get_segment_pricing_strategies(barber_id)

        return {"success": True, "data": pricing_strategies}
    except Exception as e:
        logger.error(f"Error getting pricing strategies: {e}")
        raise HTTPException(
            status_code=500, detail="Failed to retrieve pricing strategies"
        )


@router.get("/marketing/retention-campaigns")
@require_auth
async def get_retention_campaigns(
    barber_id: int = Query(..., description="Barber ID"), db: Session = Depends(get_db)
):
    """
    Create specific retention campaigns for at-risk customers
    """
    try:
        service = SegmentationMarketingService(db)
        retention_campaigns = service.create_retention_campaigns(barber_id)

        return {"success": True, "data": retention_campaigns}
    except Exception as e:
        logger.error(f"Error creating retention campaigns: {e}")
        raise HTTPException(
            status_code=500, detail="Failed to create retention campaigns"
        )


@router.post("/segments/update-criteria")
@require_auth
async def update_segment_criteria(
    barber_id: int = Query(..., description="Barber ID"),
    criteria: Dict = Body(..., description="Updated segmentation criteria"),
    db: Session = Depends(get_db),
):
    """
    Update segmentation criteria for a barber
    """
    try:
        service = CustomerSegmentationService(db)

        # Update criteria
        if "vip_min_spending" in criteria:
            service.criteria.vip_min_spending = float(criteria["vip_min_spending"])
        if "vip_min_visits" in criteria:
            service.criteria.vip_min_visits = int(criteria["vip_min_visits"])
        if "at_risk_days" in criteria:
            service.criteria.at_risk_days = int(criteria["at_risk_days"])
        if "loyal_min_visits" in criteria:
            service.criteria.loyal_min_visits = int(criteria["loyal_min_visits"])
        if "champion_min_spending" in criteria:
            service.criteria.champion_min_spending = float(
                criteria["champion_min_spending"]
            )

        # Re-segment customers with new criteria
        updated_segments = service.segment_customers(barber_id, force_refresh=True)

        return {
            "success": True,
            "message": "Segmentation criteria updated successfully",
            "updated_criteria": {
                "vip_min_spending": service.criteria.vip_min_spending,
                "vip_min_visits": service.criteria.vip_min_visits,
                "at_risk_days": service.criteria.at_risk_days,
                "loyal_min_visits": service.criteria.loyal_min_visits,
                "champion_min_spending": service.criteria.champion_min_spending,
            },
            "updated_segments": updated_segments,
        }
    except Exception as e:
        logger.error(f"Error updating criteria: {e}")
        raise HTTPException(
            status_code=500, detail="Failed to update segmentation criteria"
        )


@router.get("/customer/{client_id}/segment-history")
@require_auth
async def get_customer_segment_history(client_id: int, db: Session = Depends(get_db)):
    """
    Get segment history for a specific customer
    """
    try:
        # This would require segment history tracking in the database
        # For now, return current segment and analytics
        from models import Client

        client = db.query(Client).filter(Client.id == client_id).first()
        if not client:
            raise HTTPException(status_code=404, detail="Customer not found")

        service = CustomerSegmentationService(db)
        analytics = service._build_client_analytics(client)
        current_segment = service._classify_customer(analytics)

        return {
            "success": True,
            "data": {
                "client_id": client_id,
                "current_segment": current_segment.value,
                "analytics": analytics,
                "segment_history": [
                    {
                        "segment": current_segment.value,
                        "date": datetime.utcnow().isoformat(),
                        "analytics_snapshot": analytics,
                    }
                ],
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting segment history: {e}")
        raise HTTPException(
            status_code=500, detail="Failed to retrieve segment history"
        )


@router.post("/recalculate")
@require_auth
async def recalculate_all_segments(
    barber_id: int = Query(..., description="Barber ID"), db: Session = Depends(get_db)
):
    """
    Force recalculation of all customer segments
    """
    try:
        service = CustomerSegmentationService(db)

        # Force refresh all segments
        updated_segments = service.segment_customers(barber_id, force_refresh=True)

        # Get updated analytics
        analytics = service.get_segmentation_analytics(barber_id)

        return {
            "success": True,
            "message": "All customer segments recalculated successfully",
            "data": {
                "segments": updated_segments,
                "analytics": analytics,
                "recalculated_at": datetime.utcnow().isoformat(),
            },
        }
    except Exception as e:
        logger.error(f"Error recalculating segments: {e}")
        raise HTTPException(status_code=500, detail="Failed to recalculate segments")
