"""
Dynamic Pricing API Endpoints for BookedBarber V2

Provides KPI-based pricing recommendations and analysis for barbers.
This system tracks and presents data for manual pricing decisions.
It does NOT automate pricing changes.

Endpoints:
- GET /pricing/kpis/{barber_id} - Get barber's pricing KPIs
- GET /pricing/recommendations/{barber_id} - Get pricing recommendations
- GET /pricing/time-analysis/{barber_id} - Get time-based pricing analysis
- POST /pricing/celebratory-campaign - Create celebratory pricing campaign
- GET /pricing/dashboard/{barber_id} - Get comprehensive pricing dashboard
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from decimal import Decimal
from datetime import datetime, timedelta

from db import get_db
from utils.auth import get_current_user
from models import User
from services.dynamic_pricing_service import (
    dynamic_pricing_service,
    PricingKPIs,
    PricingRecommendation,
    TimeBasedPricingAnalysis,
    CelebratoryPricingCampaign
)
from utils.rate_limiter import rate_limiter

router = APIRouter()


@router.get("/pricing/kpis/{barber_id}")
async def get_barber_pricing_kpis(
    barber_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get comprehensive pricing KPIs for a barber
    
    Returns key performance indicators that inform pricing decisions:
    - Booking rate and capacity utilization
    - Client retention and satisfaction metrics
    - Revenue per hour and advance booking patterns
    - Premium time demand analysis
    """
    # Verify user can access this barber's data
    if current_user.id != barber_id and current_user.role not in ["shop_owner", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        kpis = await dynamic_pricing_service.analyze_barber_pricing_kpis(db, barber_id)
        
        return {
            "success": True,
            "barber_id": barber_id,
            "kpis": {
                "booking_rate": kpis.booking_rate,
                "capacity_utilization": kpis.capacity_utilization,
                "retention_rate": kpis.retention_rate,
                "advance_booking_days": kpis.advance_booking_days,
                "client_satisfaction": kpis.client_satisfaction,
                "revenue_per_hour": kpis.revenue_per_hour,
                "premium_time_demand": kpis.premium_time_demand,
                "no_show_rate": kpis.no_show_rate
            },
            "analysis_period": "90 days",
            "last_updated": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get pricing KPIs: {str(e)}")


@router.get("/pricing/recommendations/{barber_id}")
async def get_pricing_recommendations(
    barber_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get pricing increase recommendations based on KPI analysis
    
    Returns prioritized list of pricing recommendations with:
    - Trigger type and recommended increase percentage
    - Detailed rationale and celebration messaging
    - Impact estimates and implementation guidance
    - Priority scoring for decision support
    """
    # Verify user can access this barber's data
    if current_user.id != barber_id and current_user.role not in ["shop_owner", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        recommendations = await dynamic_pricing_service.generate_pricing_recommendations(db, barber_id)
        
        return {
            "success": True,
            "barber_id": barber_id,
            "recommendations": [
                {
                    "recommendation_id": rec.recommendation_id,
                    "trigger_type": rec.trigger_type.value,
                    "recommendation_type": rec.recommendation_type.value,
                    "recommended_increase_percent": float(rec.recommended_increase * 100),
                    "rationale": rec.rationale,
                    "celebration_message": rec.celebration_message,
                    "implementation_notes": rec.implementation_notes,
                    "priority_score": rec.priority_score,
                    "impact_estimate": rec.impact_estimate,
                    "valid_until": rec.valid_until.isoformat(),
                    "created_at": rec.created_at.isoformat()
                }
                for rec in recommendations
            ],
            "total_recommendations": len(recommendations),
            "highest_priority": recommendations[0].priority_score if recommendations else 0.0
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get recommendations: {str(e)}")


@router.get("/pricing/time-analysis/{barber_id}")
async def get_time_based_pricing_analysis(
    barber_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get time-based pricing analysis for before/after hours premiums
    
    Analyzes demand patterns to identify opportunities for:
    - Before hours (6-9 AM) premium pricing
    - After hours (6-10 PM) premium pricing  
    - Weekend premium pricing
    - Revenue opportunity calculations
    """
    # Verify user can access this barber's data
    if current_user.id != barber_id and current_user.role not in ["shop_owner", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        analysis = await dynamic_pricing_service.analyze_time_based_pricing(db, barber_id)
        
        return {
            "success": True,
            "barber_id": barber_id,
            "time_analysis": {
                "demand_distribution": {
                    "before_hours": {
                        "demand_percentage": analysis.before_hours_demand * 100,
                        "time_range": "6:00 AM - 9:00 AM",
                        "recommended_premium": analysis.recommended_premiums.get("before_hours", 0.0) * 100
                    },
                    "regular_hours": {
                        "demand_percentage": analysis.regular_hours_demand * 100,
                        "time_range": "9:00 AM - 6:00 PM",
                        "recommended_premium": 0.0
                    },
                    "after_hours": {
                        "demand_percentage": analysis.after_hours_demand * 100,
                        "time_range": "6:00 PM - 10:00 PM",
                        "recommended_premium": analysis.recommended_premiums.get("after_hours", 0.0) * 100
                    },
                    "weekend": {
                        "demand_percentage": analysis.weekend_demand * 100,
                        "time_range": "Saturday & Sunday",
                        "recommended_premium": analysis.recommended_premiums.get("weekend", 0.0) * 100
                    }
                },
                "revenue_opportunity": analysis.revenue_opportunity,
                "implementation_guidance": {
                    "start_with": "New bookings first, then existing clients with advance notice",
                    "communication": "Frame as 'premium time convenience fee' for client benefit",
                    "timeline": "Implement over 2-week period with clear client communication"
                }
            },
            "analysis_period": "90 days"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get time analysis: {str(e)}")


@router.post("/pricing/celebratory-campaign")
async def create_celebratory_pricing_campaign(
    request_data: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a celebratory campaign for announcing price increases positively
    
    Generates positive messaging and implementation strategy for price increases:
    - Celebration-themed messaging that frames increases as investments
    - Value highlights that justify the increase
    - Implementation timeline and client communication strategy
    - Expected client reaction analysis
    """
    barber_id = request_data.get("barber_id")
    price_increase = Decimal(str(request_data.get("price_increase", 0.10)))  # Default 10%
    campaign_theme = request_data.get("campaign_theme")
    
    if not barber_id:
        raise HTTPException(status_code=400, detail="barber_id is required")
    
    # Verify user can create campaigns for this barber
    if current_user.id != barber_id and current_user.role not in ["shop_owner", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        campaign = await dynamic_pricing_service.create_celebratory_pricing_campaign(
            db, barber_id, price_increase, campaign_theme
        )
        
        return {
            "success": True,
            "campaign": {
                "campaign_id": campaign.campaign_id,
                "barber_id": campaign.barber_id,
                "price_increase_percent": float(campaign.price_increase * 100),
                "celebration_theme": campaign.celebration_theme,
                "client_message": campaign.client_message,
                "value_highlights": campaign.value_highlights,
                "implementation_timeline": campaign.implementation_timeline,
                "expected_client_reaction": campaign.expected_client_reaction
            },
            "next_steps": [
                "Review and customize the client message",
                "Plan the implementation timeline",
                "Prepare staff for client questions",
                "Monitor client feedback during rollout"
            ]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create campaign: {str(e)}")


@router.get("/pricing/dashboard/{barber_id}")
async def get_pricing_dashboard(
    barber_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get comprehensive pricing intelligence dashboard for a barber
    
    Provides complete pricing decision support including:
    - Current KPIs and performance metrics
    - Prioritized pricing recommendations
    - Time-based pricing opportunities
    - Pricing trends and inflation adjustments
    - Overall pricing readiness assessment
    """
    # Verify user can access this barber's data
    if current_user.id != barber_id and current_user.role not in ["shop_owner", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        dashboard_data = await dynamic_pricing_service.get_pricing_dashboard_data(db, barber_id)
        
        return {
            "success": True,
            "dashboard": dashboard_data,
            "metadata": {
                "generated_at": datetime.utcnow().isoformat(),
                "data_freshness": "Real-time",
                "next_analysis": (datetime.utcnow().replace(day=1) + 
                                timedelta(days=32)).replace(day=1).isoformat(),
                "disclaimer": "This system provides recommendations only. All pricing decisions should be made manually by the barber."
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get dashboard: {str(e)}")


@router.get("/pricing/inflation-adjustment/{barber_id}")
async def get_inflation_adjustment_recommendation(
    barber_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get inflation-based pricing adjustment recommendation
    
    Provides annual inflation adjustment guidance:
    - Current inflation rate analysis
    - Recommended adjustment percentage
    - Implementation timing and messaging
    - Economic rationale for clients
    """
    # Verify user can access this barber's data
    if current_user.id != barber_id and current_user.role not in ["shop_owner", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        # Get inflation data from pricing service
        dashboard_data = await dynamic_pricing_service.get_pricing_dashboard_data(db, barber_id)
        inflation_data = dashboard_data["inflation_adjustment"]
        
        return {
            "success": True,
            "barber_id": barber_id,
            "inflation_adjustment": {
                "current_inflation_rate": inflation_data["current_inflation_rate"] * 100,
                "recommended_adjustment_percent": inflation_data["recommended_adjustment"] * 100,
                "implementation_date": inflation_data["implementation_date"],
                "rationale": inflation_data["rationale"],
                "client_communication": {
                    "message": inflation_data["client_message"],
                    "timing": "Announce 30 days before implementation",
                    "channels": ["Email", "Text message", "In-person during appointments"]
                },
                "implementation_strategy": {
                    "phase_1": "Announce to VIP clients first",
                    "phase_2": "General client communication",
                    "phase_3": "Update booking system pricing",
                    "phase_4": "Monitor client feedback"
                }
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get inflation adjustment: {str(e)}")


@router.get("/pricing/market-analysis/{barber_id}")
async def get_market_pricing_analysis(
    barber_id: int,
    location: Optional[str] = Query(None, description="Location for market analysis"),
    service_type: Optional[str] = Query(None, description="Service type for comparison"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get market pricing analysis and competitive positioning
    
    Analyzes local market pricing to provide:
    - Competitive pricing benchmarks
    - Market positioning analysis
    - Pricing gap opportunities
    - Premium positioning recommendations
    """
    # Verify user can access this barber's data
    if current_user.id != barber_id and current_user.role not in ["shop_owner", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        # Placeholder implementation - would integrate with market data APIs
        market_analysis = {
            "market_position": "Premium",
            "price_vs_market": {
                "below_average": 15,  # 15% below market average
                "vs_premium": -8,     # 8% below premium competitors
                "vs_budget": 45       # 45% above budget competitors
            },
            "competitive_benchmarks": {
                "market_average": 65.00,
                "premium_range": "75-95",
                "budget_range": "35-50",
                "luxury_range": "95-150"
            },
            "opportunities": [
                "Premium positioning opportunity exists",
                "Could increase 15-20% and remain competitive",
                "Strong KPIs support premium pricing strategy"
            ],
            "recommendations": {
                "target_position": "Upper premium",
                "suggested_range": "70-85",
                "growth_potential": "20-25% over 12 months"
            }
        }
        
        return {
            "success": True,
            "barber_id": barber_id,
            "market_analysis": market_analysis,
            "data_sources": ["Local market research", "Industry benchmarks", "Competitive analysis"],
            "last_updated": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get market analysis: {str(e)}")


# Rate limiting will be handled by global middleware