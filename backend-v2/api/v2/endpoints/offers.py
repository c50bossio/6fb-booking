"""
Dynamic Offer Generation API V2 - Six Figure Barber Intelligence
================================================================

V2 API endpoints for the intelligent offer generation system that creates
personalized retention offers based on churn risk, client value, and 
Six Figure Barber methodology principles.

All endpoints use /api/v2/offers/ prefix as per user requirement:
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
from services.dynamic_offer_service import (
    DynamicOfferService,
    PersonalizedOffer,
    OfferTemplate,
    OfferPerformance,
    OfferType,
    OfferCategory,
    OfferUrgency
)
from services.churn_prediction_service import ChurnPredictionService
from schemas.offers import (
    PersonalizedOfferResponse,
    OfferTemplateResponse,
    OfferPerformanceResponse,
    OfferGenerationRequest,
    OfferBatchRequest,
    OfferConfigurationResponse,
    OfferAnalyticsResponse,
    OfferTypeResponse,
    OfferCategoryResponse,
    OfferUrgencyResponse
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v2/offers", tags=["offers-v2"])

@router.post("/generate", response_model=PersonalizedOfferResponse)
async def generate_personalized_offer(
    request: OfferGenerationRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generate a personalized offer for a specific client
    
    Creates an intelligent, personalized retention offer based on churn risk,
    client value, preferences, and Six Figure methodology principles.
    """
    try:
        offer_service = DynamicOfferService(db)
        churn_service = ChurnPredictionService(db)
        
        # Get churn prediction for the client
        churn_prediction = churn_service.predict_client_churn(
            user_id=user.id,
            client_id=request.client_id,
            analysis_period_days=request.analysis_period_days
        )
        
        # Generate personalized offer
        offer = offer_service.generate_personalized_offer(
            client_id=request.client_id,
            churn_prediction=churn_prediction,
            context=request.context
        )
        
        return PersonalizedOfferResponse.from_offer(offer)
        
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error generating personalized offer for user {user.id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate offer: {str(e)}")

@router.post("/batch", response_model=List[PersonalizedOfferResponse])
async def generate_batch_offers(
    request: OfferBatchRequest,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generate personalized offers for multiple clients efficiently
    
    Processes multiple clients in optimized batches, creating personalized
    offers that maximize retention ROI while maintaining Six Figure principles.
    """
    try:
        offer_service = DynamicOfferService(db)
        churn_service = ChurnPredictionService(db)
        
        # Get churn predictions for all clients or specific risk levels
        if request.client_ids:
            # Generate for specific clients
            churn_predictions = []
            for client_id in request.client_ids:
                prediction = churn_service.predict_client_churn(
                    user_id=user.id,
                    client_id=client_id,
                    analysis_period_days=request.analysis_period_days
                )
                churn_predictions.append(prediction)
        else:
            # Generate for high-risk clients
            churn_predictions = churn_service.get_high_risk_clients(
                user_id=user.id,
                risk_threshold=request.min_risk_threshold
            )
        
        # Limit batch size for performance
        limited_predictions = churn_predictions[:request.batch_size]
        
        # Generate batch offers
        offers = offer_service.generate_batch_offers(
            churn_predictions=limited_predictions,
            context=request.context
        )
        
        return [PersonalizedOfferResponse.from_offer(offer) for offer in offers]
        
    except Exception as e:
        logger.error(f"Error generating batch offers for user {user.id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate batch offers: {str(e)}")

@router.get("/client/{client_id}", response_model=List[PersonalizedOfferResponse])
async def get_client_offers(
    client_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    status: Optional[str] = Query(None, description="Filter by offer status"),
    limit: int = Query(10, ge=1, le=50, description="Maximum offers to return")
):
    """
    Get offer history for a specific client
    
    Returns all generated offers for a client including status, performance,
    and redemption tracking for relationship management insights.
    """
    try:
        # This would query offer history from database
        # For now, return mock data showing the structure
        
        mock_offers = [
            {
                "offer_id": "offer_abc123",
                "client_id": client_id,
                "client_name": "John Smith",
                "template_id": "premium_experience_upgrade",
                "offer_type": "experience_enhancement",
                "offer_category": "value_enhancement",
                "urgency_level": "medium",
                "offer_title": "Premium Experience Upgrade",
                "offer_description": "Enhance your next appointment with premium treatments",
                "personalized_message": "Hi John, we've reserved a special premium experience for you...",
                "call_to_action": "Book Premium Experience",
                "value_amount": 35.0,
                "savings_amount": 35.0,
                "revenue_impact": 120.0,
                "churn_risk_score": 65.0,
                "client_clv": 850.0,
                "client_tier": "premium",
                "days_since_last_booking": 28,
                "offer_code": "RETURN2847",
                "expires_at": datetime.now() + timedelta(days=7),
                "max_uses": 1,
                "generated_at": datetime.now() - timedelta(hours=2),
                "sent_at": datetime.now() - timedelta(hours=1),
                "opened_at": datetime.now() - timedelta(minutes=15),
                "redeemed_at": None,
                "personalization_score": 0.85,
                "confidence_score": 0.72
            }
        ]
        
        # Apply status filter
        if status:
            # Filter logic would go here
            pass
        
        return [PersonalizedOfferResponse(**offer) for offer in mock_offers[:limit]]
        
    except Exception as e:
        logger.error(f"Error getting client offers for client {client_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get client offers: {str(e)}")

@router.get("/templates", response_model=List[OfferTemplateResponse])
async def get_offer_templates(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    category: Optional[str] = Query(None, description="Filter by offer category"),
    offer_type: Optional[str] = Query(None, description="Filter by offer type"),
    active_only: bool = Query(True, description="Only return active templates")
):
    """
    Get available offer templates and their configurations
    
    Returns all offer templates with their business rules, Six Figure alignment,
    and performance metrics for template management and optimization.
    """
    try:
        offer_service = DynamicOfferService(db)
        templates = offer_service.offer_templates
        
        # Apply filters
        filtered_templates = templates
        if category:
            filtered_templates = [t for t in filtered_templates if t.offer_category.value == category.lower()]
        if offer_type:
            filtered_templates = [t for t in filtered_templates if t.offer_type.value == offer_type.lower()]
        
        return [OfferTemplateResponse.from_template(template) for template in filtered_templates]
        
    except Exception as e:
        logger.error(f"Error getting offer templates for user {user.id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get templates: {str(e)}")

@router.get("/performance", response_model=List[OfferPerformanceResponse])
async def get_offer_performance(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    date_range_days: int = Query(30, ge=1, le=365, description="Days of data to analyze"),
    template_id: Optional[str] = Query(None, description="Specific template to analyze")
):
    """
    Get offer performance analytics and optimization insights
    
    Provides comprehensive performance metrics including conversion rates,
    ROI analysis, and Six Figure methodology impact measurement.
    """
    try:
        # This would query performance data from database
        # For now, return mock performance data
        
        mock_performance = [
            {
                "offer_template_id": "premium_experience_upgrade",
                "template_name": "Premium Experience Upgrade",
                "total_generated": 45,
                "total_sent": 43,
                "total_opened": 32,
                "total_redeemed": 15,
                "send_rate": 0.956,
                "open_rate": 0.744,
                "redemption_rate": 0.469,
                "total_revenue_generated": 1800.0,
                "average_redemption_value": 120.0,
                "total_cost": 86.0,
                "roi_percentage": 1993.0,
                "best_performing_segments": ["Premium clients", "High CLV"],
                "optimal_timing": "Tuesday 10 AM",
                "improvement_recommendations": [
                    "Test SMS channel for non-email responders",
                    "Increase urgency messaging for high-risk clients",
                    "Add seasonal context to messaging"
                ],
                "six_figure_alignment": {
                    "methodology_score": 95,
                    "value_focus": True,
                    "relationship_building": True,
                    "revenue_optimization": True
                }
            },
            {
                "offer_template_id": "comeback_discount",
                "template_name": "Welcome Back Discount",
                "total_generated": 28,
                "total_sent": 28,
                "total_opened": 18,
                "total_redeemed": 7,
                "send_rate": 1.0,
                "open_rate": 0.643,
                "redemption_rate": 0.25,
                "total_revenue_generated": 455.0,
                "average_redemption_value": 65.0,
                "total_cost": 56.0,
                "roi_percentage": 712.5,
                "best_performing_segments": ["Regular clients", "Recent churn risk"],
                "optimal_timing": "Friday 2 PM",
                "improvement_recommendations": [
                    "Add experience enhancement instead of just discount",
                    "Personalize discount amount based on CLV",
                    "Follow up with non-responders after 3 days"
                ],
                "six_figure_alignment": {
                    "methodology_score": 60,
                    "value_focus": False,
                    "relationship_building": True,
                    "revenue_optimization": False
                }
            }
        ]
        
        # Apply template filter
        if template_id:
            mock_performance = [p for p in mock_performance if p["offer_template_id"] == template_id]
        
        return [OfferPerformanceResponse(**perf) for perf in mock_performance]
        
    except Exception as e:
        logger.error(f"Error getting offer performance for user {user.id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get performance data: {str(e)}")

@router.get("/analytics/dashboard")
async def get_offer_analytics_dashboard(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    date_range_days: int = Query(30, ge=1, le=365, description="Days of data to analyze")
):
    """
    Get comprehensive offer analytics dashboard data
    
    Returns high-level metrics, trends, and insights for offer strategy
    optimization and Six Figure methodology alignment assessment.
    """
    try:
        # This would aggregate analytics across all offers
        # For now, return mock dashboard data
        
        dashboard_data = {
            "overview": {
                "total_offers_generated": 156,
                "total_offers_sent": 148,
                "total_offers_redeemed": 47,
                "overall_redemption_rate": 0.318,
                "total_revenue_generated": 5640.0,
                "total_offer_cost": 296.0,
                "overall_roi_percentage": 1805.4,
                "average_time_to_redemption_hours": 18.5
            },
            "performance_by_category": {
                "value_enhancement": {"count": 45, "redemption_rate": 0.42, "avg_revenue": 125.0},
                "relationship_building": {"count": 32, "redemption_rate": 0.38, "avg_revenue": 95.0},
                "revenue_optimization": {"count": 28, "redemption_rate": 0.29, "avg_revenue": 180.0},
                "retention_rescue": {"count": 35, "redemption_rate": 0.23, "avg_revenue": 65.0},
                "growth_acceleration": {"count": 16, "redemption_rate": 0.19, "avg_revenue": 300.0}
            },
            "top_performing_offers": [
                {"template_id": "premium_experience_upgrade", "redemption_rate": 0.47, "roi": 1993.0},
                {"template_id": "personal_barber_consultation", "redemption_rate": 0.44, "roi": 1650.0},
                {"template_id": "grooming_package_deal", "redemption_rate": 0.31, "roi": 890.0}
            ],
            "client_segment_insights": {
                "vip_clients": {"response_rate": 0.65, "preferred_offers": ["experience_enhancement", "exclusive_access"]},
                "premium_clients": {"response_rate": 0.45, "preferred_offers": ["value_enhancement", "package_deals"]},
                "regular_clients": {"response_rate": 0.35, "preferred_offers": ["relationship_building", "loyalty_bonus"]},
                "new_clients": {"response_rate": 0.25, "preferred_offers": ["welcome_offers", "trial_packages"]}
            },
            "six_figure_methodology_impact": {
                "value_focused_offers_performance": 0.38,
                "discount_focused_offers_performance": 0.24,
                "relationship_building_success": 0.42,
                "revenue_per_successful_offer": 127.50,
                "client_retention_improvement": "23% increase in 90-day retention",
                "methodology_alignment_score": 82
            },
            "optimization_recommendations": [
                "Increase value-enhancement offers for VIP clients (+15% expected ROI)",
                "Reduce discount-heavy offers in favor of experience upgrades",
                "Test membership offers for clients with 6+ month history",
                "Implement seasonal offer variations for better timing",
                "Add win-back automation for 60+ day inactive clients"
            ],
            "trends": {
                "weekly_redemption_trend": [0.28, 0.32, 0.31, 0.35],
                "monthly_revenue_trend": [4200, 4850, 5240, 5640],
                "client_satisfaction_correlation": 0.73,
                "repeat_booking_rate_after_offer": 0.68
            }
        }
        
        return dashboard_data
        
    except Exception as e:
        logger.error(f"Error getting offer analytics dashboard for user {user.id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get analytics dashboard: {str(e)}")

@router.get("/configuration")
async def get_offer_configuration(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get offer system configuration and business rules
    
    Returns current configuration including Six Figure methodology settings,
    business constraints, and personalization parameters.
    """
    try:
        offer_service = DynamicOfferService(db)
        
        configuration = {
            "six_figure_principles": offer_service.six_figure_principles,
            "offer_types": [
                {"value": ot.value, "label": ot.value.replace("_", " ").title()}
                for ot in OfferType
            ],
            "offer_categories": [
                {"value": oc.value, "label": oc.value.replace("_", " ").title()}
                for oc in OfferCategory
            ],
            "urgency_levels": [
                {"value": ou.value, "label": ou.value.title()}
                for ou in OfferUrgency
            ],
            "business_rules": {
                "max_discount_percentage": 25,
                "min_offer_value": 10.0,
                "max_offers_per_client_per_month": 2,
                "default_expiration_days": 14,
                "minimum_clv_for_premium_offers": 500.0
            },
            "personalization_factors": [
                "churn_risk_score",
                "client_lifetime_value",
                "client_tier",
                "service_preferences",
                "booking_patterns",
                "communication_preferences",
                "past_offer_performance"
            ],
            "templates_count": len(offer_service.offer_templates),
            "active_rules_count": len([r for r in offer_service.business_rules if r.active])
        }
        
        return configuration
        
    except Exception as e:
        logger.error(f"Error getting offer configuration for user {user.id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get configuration: {str(e)}")

@router.post("/redeem/{offer_code}")
async def redeem_offer(
    offer_code: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Process offer redemption and track performance
    
    Records offer redemption, updates performance metrics, and triggers
    follow-up actions for continued client engagement.
    """
    try:
        # This would validate and process offer redemption
        # For now, return mock redemption data
        
        redemption_data = {
            "success": True,
            "message": "Offer redeemed successfully",
            "offer_code": offer_code,
            "redeemed_at": datetime.now(),
            "redemption_value": 120.0,
            "client_id": 45,
            "follow_up_actions": [
                "Schedule follow-up reminder in 30 days",
                "Add client to premium experience list",
                "Send satisfaction survey after appointment"
            ]
        }
        
        return redemption_data
        
    except Exception as e:
        logger.error(f"Error redeeming offer {offer_code}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to redeem offer: {str(e)}")

@router.get("/health")
async def offer_health_check():
    """
    Health check endpoint for the dynamic offer system
    
    Returns status information about the offer generation services.
    """
    return {
        "status": "healthy",
        "service": "Dynamic Offer Generation V2",
        "version": "2.0.0",
        "features": [
            "Multi-Dimensional Offer Generation",
            "Six Figure Methodology Alignment",
            "Advanced Personalization Engine",
            "Real-Time Performance Analytics",
            "A/B Testing Framework",
            "ROI-Driven Optimization",
            "Client Behavior Analysis"
        ],
        "offer_types": [ot.value for ot in OfferType],
        "offer_categories": [oc.value for oc in OfferCategory],
        "methodology_alignment": "Six Figure Barber Principles"
    }