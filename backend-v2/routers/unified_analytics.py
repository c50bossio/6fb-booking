"""
Unified Analytics Router for BookedBarber V2

This router consolidates all analytics functionality into a single, well-organized API:
- Core analytics (revenue, appointments, clients)
- AI-powered analytics (benchmarking, predictions, insights)
- Marketing analytics (campaigns, channels, attribution)
- Six Figure Barber methodology metrics
- Business intelligence and reporting

Replaces the previous separate routers:
- analytics.py (core analytics)
- ai_analytics.py (AI analytics)
- marketing_analytics.py (marketing analytics)
- email_analytics.py (email analytics - archived)
"""

from datetime import datetime, date
from typing import Dict, List, Optional, Any
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
import logging

from db import get_db
from dependencies import get_current_user
from models import User
from models.consent import ConsentType, ConsentStatus
from schemas import DateRange

# Import all services
from services.analytics_service import AnalyticsService
from services.marketing_analytics_service import MarketingAnalyticsService
from services.ai_benchmarking_service import AIBenchmarkingService
from services.predictive_modeling_service import PredictiveModelingService
from services.upselling_conversion_detector import UpsellConversionDetector
from services.intelligent_analytics_service import IntelligentAnalyticsService

# Import comprehensive business intelligence services
from services.ml_client_lifetime_value_service import MLClientLifetimeValueService, ClientLTV, ClientSegmentAnalysis
from services.revenue_optimization_engine import RevenueOptimizationEngine, RevenueOptimizationPlan
from services.six_figure_methodology_tracker import SixFigureMethodologyTracker, SixFigureComprehensiveReport
from services.realtime_business_dashboard import RealTimeBusinessDashboard, DashboardConfiguration

# Import utilities
from utils.error_handling import safe_endpoint
from utils.role_permissions import Permission, get_permission_checker
from utils.marketing_rate_limit import check_marketing_rate_limit

router = APIRouter(prefix="/analytics", tags=["analytics"])
logger = logging.getLogger(__name__)

# ====================
# REQUEST/RESPONSE MODELS
# ====================

class DateRangeRequest(BaseModel):
    """Request model for date range queries"""
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None

class BenchmarkRequest(BaseModel):
    """Request model for AI benchmark comparisons"""
    metric_type: str = Field(..., description="Type of metric: revenue, appointments, efficiency")
    date_range_start: Optional[date] = None
    date_range_end: Optional[date] = None

class PredictionRequest(BaseModel):
    """Request model for AI predictions"""
    prediction_type: str = Field(..., description="Type: revenue_forecast, churn_prediction, demand_patterns, pricing_optimization")
    months_ahead: Optional[int] = Field(6, description="Months to predict ahead (for forecasting)")
    include_seasonal: Optional[bool] = Field(True, description="Include seasonal adjustments")

class ConsentUpdateRequest(BaseModel):
    """Request model for updating AI analytics consent"""
    consent_types: List[str] = Field(..., description="List of consent types to grant")

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

class BusinessHealthResponse(BaseModel):
    """Response model for business health score"""
    overall_score: float
    level: str
    components: Dict[str, float]
    trends: Dict[str, str]
    risk_factors: List[str]
    opportunities: List[str]

class PredictiveInsightResponse(BaseModel):
    """Response model for predictive insights"""
    title: str
    description: str
    confidence: float
    impact_score: float
    category: str
    predicted_outcome: str
    recommended_actions: List[str]
    time_horizon: str

class SmartAlertResponse(BaseModel):
    """Response model for smart alerts"""
    title: str
    message: str
    priority: str
    category: str
    metric_name: str
    current_value: float
    threshold_value: float
    trend: str
    suggested_actions: List[str]
    expires_at: datetime

# ====================
# BUSINESS INTELLIGENCE RESPONSE MODELS
# ====================

class ClientLTVResponse(BaseModel):
    """Response model for client lifetime value prediction"""
    client_id: int
    predicted_ltv: float
    confidence_score: float
    segment: str
    churn_risk: str
    churn_probability: float
    projected_6_month_value: float
    projected_12_month_value: float
    engagement_score: float
    recommendation_actions: List[str]

class ClientSegmentResponse(BaseModel):
    """Response model for client segment analysis"""
    segment: str
    client_count: int
    total_ltv: float
    average_ltv: float
    churn_rate: float
    revenue_contribution_percentage: float
    recommended_strategies: List[str]
    growth_opportunities: List[str]

class RevenueOptimizationResponse(BaseModel):
    """Response model for revenue optimization plan"""
    total_potential_increase: float
    monthly_revenue_target: float
    six_figure_compliance_score: float
    pricing_recommendations: List[Dict[str, Any]]
    upsell_opportunities: List[Dict[str, Any]]
    bundle_recommendations: List[Dict[str, Any]]
    capacity_insights: List[Dict[str, Any]]
    implementation_roadmap: List[Dict[str, Any]]
    risk_assessment: Dict[str, Any]

class SixFigureMethodologyResponse(BaseModel):
    """Response model for Six Figure methodology analysis"""
    overall_compliance_score: float
    methodology_scores: List[Dict[str, Any]]
    pathway_analysis: Dict[str, Any]
    growth_metrics: Dict[str, Any]
    efficiency_analysis: Dict[str, Any]
    strategic_recommendations: List[str]
    implementation_priorities: List[Dict[str, Any]]
    success_probability: float

class RealTimeDashboardResponse(BaseModel):
    """Response model for real-time dashboard summary"""
    summary: Dict[str, Any]
    top_kpis: List[Dict[str, Any]]
    urgent_alerts: List[Dict[str, Any]]
    top_opportunities: List[Dict[str, Any]]
    last_updated: str

class BusinessIntelligenceRequest(BaseModel):
    """Request model for business intelligence queries"""
    target_annual_revenue: Optional[float] = Field(100000, description="Target annual revenue")
    analysis_period_days: Optional[int] = Field(90, description="Analysis period in days")
    include_predictions: Optional[bool] = Field(True, description="Include predictive analytics")
    client_segment_focus: Optional[List[str]] = Field(None, description="Focus on specific client segments")

# ====================
# UTILITY FUNCTIONS
# ====================

def get_organization_user_ids(user: User, db: Session) -> List[int]:
    """Get all user IDs that belong to the same organization as the given user."""
    if not user.primary_organization:
        return [user.id]
    
    from models.organization import UserOrganization
    user_orgs = db.query(UserOrganization).filter(
        UserOrganization.organization_id == user.primary_organization.id
    ).all()
    
    return [uo.user_id for uo in user_orgs]

def check_ai_analytics_consent(user_id: int, db: Session) -> bool:
    """Check if user has consented to AI analytics"""
    from models.consent import UserConsent
    
    consent = db.query(UserConsent).filter(
        UserConsent.user_id == user_id,
        UserConsent.consent_type.in_([
            ConsentType.AI_ANALYTICS,
            ConsentType.CROSS_USER_BENCHMARKING,
            ConsentType.PREDICTIVE_MODELING
        ]),
        UserConsent.status == ConsentStatus.GRANTED
    ).first()
    
    return consent is not None

# ====================
# CORE ANALYTICS ENDPOINTS
# ====================

@router.get("/dashboard")
@safe_endpoint
async def get_analytics_dashboard(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get comprehensive analytics dashboard data"""
    permission_checker = get_permission_checker(current_user=current_user, db=db)
    permission_checker.require_permission(Permission.VIEW_ANALYTICS)
    
    user_ids = get_organization_user_ids(current_user, db)
    analytics_service = AnalyticsService(db)
    
    return {
        "revenue": analytics_service.get_revenue_analytics(user_ids=user_ids),
        "appointments": analytics_service.get_appointment_analytics(user_ids=user_ids),
        "clients": analytics_service.get_client_retention_metrics(user_id=user_ids[0] if user_ids else None),
        "performance": analytics_service.get_barber_performance_metrics(user_ids=user_ids),
        "six_figure_barber": analytics_service.get_comparative_analytics(current_user.id)
    }

@router.get("/revenue")
@safe_endpoint
async def get_revenue_analytics(
    request: Request,
    group_by: str = Query("day", regex="^(day|week|month|year)$"),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get detailed revenue analytics"""
    permission_checker = get_permission_checker(current_user=current_user, db=db)
    permission_checker.require_permission(Permission.VIEW_ANALYTICS)
    
    user_ids = get_organization_user_ids(current_user, db)
    analytics_service = AnalyticsService(db)
    
    date_range = None
    if start_date and end_date:
        date_range = DateRange(start_date=start_date, end_date=end_date)
    
    return analytics_service.get_revenue_analytics(
        user_ids=user_ids,
        date_range=date_range,
        group_by=group_by
    )

@router.get("/appointments")
@safe_endpoint
async def get_appointment_analytics(
    request: Request,
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get appointment analytics including completion rates and patterns"""
    permission_checker = get_permission_checker(current_user=current_user, db=db)
    permission_checker.require_permission(Permission.VIEW_ANALYTICS)
    
    user_ids = get_organization_user_ids(current_user, db)
    analytics_service = AnalyticsService(db)
    
    date_range = None
    if start_date and end_date:
        date_range = DateRange(start_date=start_date, end_date=end_date)
    
    return analytics_service.get_appointment_analytics(
        user_ids=user_ids,
        date_range=date_range
    )

@router.get("/six-figure-barber")
@safe_endpoint
async def get_six_figure_barber_analytics(
    request: Request,
    target_annual_income: float = Query(100000.0, gt=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get Six Figure Barber methodology analytics"""
    permission_checker = get_permission_checker(current_user=current_user, db=db)
    permission_checker.require_permission(Permission.VIEW_ANALYTICS)
    
    analytics_service = AnalyticsService(db)
    
    # Add debug logging
    logger.info(f"Six Figure Barber Analytics request for user {current_user.id}, target: {target_annual_income}")
    
    # Get analytics data for Six Figure Barber methodology
    revenue_data = analytics_service.get_revenue_analytics(user_ids=[current_user.id])
    appointment_data = analytics_service.get_appointment_analytics(user_ids=[current_user.id])
    client_data = analytics_service.get_client_retention_metrics(user_id=current_user.id)
    
    # Calculate current performance metrics
    monthly_revenue = revenue_data.get("total_revenue", 0)
    annual_revenue_projection = monthly_revenue * 12
    average_ticket = revenue_data.get("average_transaction_amount", 0)
    total_appointments = appointment_data.get("total_appointments", 0)
    total_clients = client_data.get("total_active_clients", 1)
    utilization_rate = min(100, (total_appointments / 30) * 100) if total_appointments > 0 else 0
    
    # Calculate targets
    monthly_target = target_annual_income / 12
    daily_target = monthly_target / 30
    revenue_gap = max(0, target_annual_income - annual_revenue_projection)
    on_track = annual_revenue_projection >= target_annual_income * 0.8
    
    # Calculate recommendations
    current_clients_per_month = total_clients
    target_clients_per_day = max(8, daily_target / max(average_ticket, 50))
    
    result = {
        "current_performance": {
            "monthly_revenue": monthly_revenue,
            "annual_revenue_projection": annual_revenue_projection,
            "average_ticket": average_ticket,
            "utilization_rate": utilization_rate,
            "average_visits_per_client": total_appointments / max(total_clients, 1),
            "total_active_clients": total_clients
        },
        "targets": {
            "annual_income_target": target_annual_income,
            "monthly_revenue_target": monthly_target,
            "daily_revenue_target": daily_target,
            "daily_clients_target": target_clients_per_day,
            "revenue_gap": revenue_gap,
            "on_track": on_track
        },
        "recommendations": {
            "price_optimization": {
                "current_average_ticket": average_ticket,
                "recommended_increase_percentage": max(0, min(20, (daily_target - average_ticket) / max(average_ticket, 1) * 100)),
                "recommended_average_ticket": max(average_ticket, daily_target / max(target_clients_per_day, 1))
            },
            "client_acquisition": {
                "current_monthly_clients": current_clients_per_month,
                "target_monthly_clients": max(current_clients_per_month, monthly_target / max(average_ticket, 50)),
                "additional_clients_needed": max(0, (monthly_target / max(average_ticket, 50)) - current_clients_per_month)
            },
            "time_optimization": {
                "current_utilization_rate": utilization_rate,
                "target_utilization_rate": min(90, utilization_rate + 20),
                "additional_hours_needed": max(0, (target_clients_per_day * 1.5) - (utilization_rate / 100 * 8))
            }
        },
        "action_items": [
            f"Focus on ${daily_target:.0f}/day revenue target",
            f"Maintain {target_clients_per_day:.0f} quality clients per day",
            "Implement Six Figure Barber premium service positioning",
            "Build strong client relationships for retention and referrals"
        ]
    }
    
    # Debug logging for response structure
    logger.info(f"Six Figure Barber Analytics response structure: current_performance={bool(result.get('current_performance'))}, targets={bool(result.get('targets'))}, recommendations={bool(result.get('recommendations'))}")
    
    return result

@router.get("/six-figure-barber/progress")
@safe_endpoint
async def get_six_figure_barber_progress(
    request: Request,
    target_annual_income: float = Query(100000.0, gt=0),
    user_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get Six Figure Barber progress tracking data"""
    permission_checker = get_permission_checker(current_user=current_user, db=db)
    permission_checker.require_permission(Permission.VIEW_ANALYTICS)
    
    # Use provided user_id or current user
    target_user_id = user_id if user_id else current_user.id
    
    # Get analytics data for progress tracking
    analytics_service = AnalyticsService(db)
    revenue_data = analytics_service.get_revenue_analytics(user_ids=[target_user_id])
    appointment_data = analytics_service.get_appointment_analytics(user_ids=[target_user_id])
    client_data = analytics_service.get_client_retention_metrics(user_id=target_user_id)
    
    # Calculate progress metrics
    monthly_revenue = revenue_data.get("total_revenue", 0)
    monthly_target = target_annual_income / 12
    progress_percentage = min(100, (monthly_revenue / monthly_target * 100)) if monthly_target > 0 else 0
    
    return {
        "user_id": target_user_id,
        "target_annual_income": target_annual_income,
        "current_progress": {
            "monthly_revenue": monthly_revenue,
            "monthly_target": monthly_target,
            "progress_percentage": progress_percentage,
            "annual_projection": monthly_revenue * 12
        },
        "milestones": [
            {
                "type": "revenue",
                "target": monthly_target,
                "current": monthly_revenue,
                "achieved": monthly_revenue >= monthly_target,
                "description": f"Monthly revenue target of ${monthly_target:,.0f}"
            },
            {
                "type": "efficiency", 
                "target": 75,
                "current": min(100, (appointment_data.get("total_appointments", 0) / 30) * 100),
                "achieved": (appointment_data.get("total_appointments", 0) / 30) * 100 >= 75,
                "description": "Monthly utilization rate of 75%"
            },
            {
                "type": "clients",
                "target": 50,
                "current": client_data.get("total_active_clients", 0),
                "achieved": client_data.get("total_active_clients", 0) >= 50,
                "description": "Maintain 50+ active clients"
            }
        ],
        "generated_at": datetime.now().isoformat(),
        "status": "on_track" if progress_percentage >= 80 else "needs_improvement"
    }

@router.get("/export")
@safe_endpoint
async def export_analytics_data(
    request: Request,
    format: str = Query("json", regex="^(json|csv|xlsx)$"),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Export analytics data in various formats"""
    permission_checker = get_permission_checker(current_user=current_user, db=db)
    permission_checker.require_permission( Permission.EXPORT_DATA)
    
    user_ids = get_organization_user_ids(current_user, db)
    analytics_service = AnalyticsService(db)
    
    date_range = None
    if start_date and end_date:
        date_range = DateRange(start_date=start_date, end_date=end_date)
    
    # Export functionality - create basic implementation
    revenue_data = analytics_service.get_revenue_analytics(user_ids=user_ids, date_range=date_range)
    appointment_data = analytics_service.get_appointment_analytics(user_ids=user_ids, date_range=date_range)
    
    export_data = {
        "revenue": revenue_data,
        "appointments": appointment_data,
        "format": format,
        "exported_at": datetime.now().isoformat()
    }
    
    return export_data

# ====================
# AI ANALYTICS ENDPOINTS
# ====================

@router.post("/ai/consent")
@safe_endpoint
async def update_ai_analytics_consent(
    consent_request: ConsentUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update user consent for AI analytics features"""
    from models.consent import UserConsent
    
    # Update consent records
    for consent_type in consent_request.consent_types:
        existing_consent = db.query(UserConsent).filter(
            UserConsent.user_id == current_user.id,
            UserConsent.consent_type == consent_type
        ).first()
        
        if existing_consent:
            existing_consent.status = ConsentStatus.GRANTED
            existing_consent.updated_at = datetime.utcnow()
        else:
            new_consent = UserConsent(
                user_id=current_user.id,
                consent_type=consent_type,
                status=ConsentStatus.GRANTED
            )
            db.add(new_consent)
    
    db.commit()
    return {"status": "success", "message": "Consent updated successfully"}

@router.get("/ai/benchmarks/{metric_type}")
@safe_endpoint
async def get_ai_benchmarks(
    metric_type: str,
    request: Request,
    date_range_start: Optional[date] = Query(None),
    date_range_end: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get AI-powered benchmark comparisons"""
    if not check_ai_analytics_consent(current_user.id, db):
        raise HTTPException(status_code=403, detail="AI analytics consent required")
    
    permission_checker = get_permission_checker(current_user=current_user, db=db)
    permission_checker.require_permission( Permission.VIEW_AI_ANALYTICS)
    
    benchmark_service = AIBenchmarkingService(db)
    return benchmark_service.get_benchmark_comparison(
        user_id=current_user.id,
        metric_type=metric_type,
        date_range_start=date_range_start,
        date_range_end=date_range_end
    )

@router.post("/ai/predictions")
@safe_endpoint
async def get_ai_predictions(
    prediction_request: PredictionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get AI-powered predictions and forecasts"""
    if not check_ai_analytics_consent(current_user.id, db):
        raise HTTPException(status_code=403, detail="AI analytics consent required")
    
    permission_checker = get_permission_checker(current_user=current_user, db=db)
    permission_checker.require_permission( Permission.VIEW_AI_ANALYTICS)
    
    modeling_service = PredictiveModelingService(db)
    return modeling_service.generate_prediction(
        user_id=current_user.id,
        prediction_type=prediction_request.prediction_type,
        months_ahead=prediction_request.months_ahead,
        include_seasonal=prediction_request.include_seasonal
    )

@router.get("/ai/insights/coaching")
@safe_endpoint
async def get_ai_coaching_insights(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get AI-powered business coaching insights"""
    if not check_ai_analytics_consent(current_user.id, db):
        raise HTTPException(status_code=403, detail="AI analytics consent required")
    
    permission_checker = get_permission_checker(current_user=current_user, db=db)
    permission_checker.require_permission( Permission.VIEW_AI_ANALYTICS)
    
    benchmark_service = AIBenchmarkingService(db)
    return benchmark_service.get_coaching_recommendations(current_user.id)

# ====================
# MARKETING ANALYTICS ENDPOINTS
# ====================

@router.get("/marketing/overview", response_model=MarketingOverviewResponse)
@safe_endpoint
async def get_marketing_overview(
    request: Request,
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get comprehensive marketing analytics overview"""
    # Check rate limits for marketing endpoints
    check_marketing_rate_limit(current_user.id, "marketing_overview")
    
    permission_checker = get_permission_checker(current_user=current_user, db=db)
    permission_checker.require_permission( Permission.VIEW_MARKETING_ANALYTICS)
    
    user_ids = get_organization_user_ids(current_user, db)
    marketing_service = MarketingAnalyticsService(db)
    
    date_range = None
    if start_date and end_date:
        date_range = DateRange(start_date=start_date, end_date=end_date)
    
    return marketing_service.get_marketing_overview(user_ids, date_range)

@router.get("/marketing/campaigns")
@safe_endpoint
async def get_marketing_campaigns(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get marketing campaign performance data"""
    check_marketing_rate_limit(current_user.id, "campaigns")
    
    permission_checker = get_permission_checker(current_user=current_user, db=db)
    permission_checker.require_permission( Permission.VIEW_MARKETING_ANALYTICS)
    
    user_ids = get_organization_user_ids(current_user, db)
    marketing_service = MarketingAnalyticsService(db)
    
    return marketing_service.get_campaign_performance(user_ids)

@router.get("/marketing/channels")
@safe_endpoint
async def get_marketing_channels(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get marketing channel attribution and performance"""
    check_marketing_rate_limit(current_user.id, "channels")
    
    permission_checker = get_permission_checker(current_user=current_user, db=db)
    permission_checker.require_permission( Permission.VIEW_MARKETING_ANALYTICS)
    
    user_ids = get_organization_user_ids(current_user, db)
    marketing_service = MarketingAnalyticsService(db)
    
    return marketing_service.get_channel_attribution(user_ids)

@router.get("/marketing/export")
@safe_endpoint
async def export_marketing_data(
    request: Request,
    format: str = Query("json", regex="^(json|csv|xlsx)$"),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Export marketing analytics data"""
    check_marketing_rate_limit(current_user.id, "export")
    
    permission_checker = get_permission_checker(current_user=current_user, db=db)
    permission_checker.require_permission( Permission.EXPORT_DATA)
    
    user_ids = get_organization_user_ids(current_user, db)
    marketing_service = MarketingAnalyticsService(db)
    
    date_range = None
    if start_date and end_date:
        date_range = DateRange(start_date=start_date, end_date=end_date)
    
    return marketing_service.export_marketing_data(user_ids, date_range, format)

# ====================
# UPSELLING ANALYTICS ENDPOINTS
# ====================

@router.get("/upselling/overview")
@safe_endpoint
async def get_upselling_overview(
    request: Request,
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get upselling performance overview"""
    permission_checker = get_permission_checker(current_user=current_user, db=db)
    permission_checker.require_permission(Permission.VIEW_ANALYTICS)
    
    user_ids = get_organization_user_ids(current_user, db)
    detector = UpsellConversionDetector(db)
    
    date_range = None
    if start_date and end_date:
        date_range = DateRange(start_date=start_date, end_date=end_date)
    
    return detector.get_upselling_overview(user_ids, date_range)

@router.get("/commissions")
@safe_endpoint
async def get_commission_analytics(
    request: Request,
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get commission analytics and trends"""
    permission_checker = get_permission_checker(current_user=current_user, db=db)
    permission_checker.require_permission(Permission.VIEW_ANALYTICS)
    
    user_ids = get_organization_user_ids(current_user, db)
    analytics_service = AnalyticsService(db)
    
    date_range = None
    if start_date and end_date:
        date_range = DateRange(start_date=start_date, end_date=end_date)
    
    # Commission analytics - use revenue analytics as base
    revenue_data = analytics_service.get_revenue_analytics(user_ids=user_ids, date_range=date_range)
    
    return {
        "commission_data": revenue_data,
        "commission_summary": {
            "total_commissions": revenue_data.get("total_revenue", 0) * 0.1,  # 10% commission rate
            "date_range": date_range.model_dump() if date_range else None
        }
    }

# ====================
# INTELLIGENT ANALYTICS ENDPOINTS
# ====================

@router.get("/intelligence/health-score", response_model=BusinessHealthResponse)
@safe_endpoint
async def get_business_health_score(
    request: Request,
    days_back: int = Query(30, ge=7, le=90, description="Days of data to analyze"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get AI-powered business health score with component analysis"""
    permission_checker = get_permission_checker(current_user=current_user, db=db)
    permission_checker.require_permission( Permission.VIEW_AI_ANALYTICS)
    
    intelligent_service = IntelligentAnalyticsService(db)
    health_score = intelligent_service.calculate_business_health_score(
        user_id=current_user.id,
        days_back=days_back
    )
    
    return BusinessHealthResponse(
        overall_score=health_score.overall_score,
        level=health_score.level.value,
        components=health_score.components,
        trends=health_score.trends,
        risk_factors=health_score.risk_factors,
        opportunities=health_score.opportunities
    )

@router.get("/intelligence/insights", response_model=List[PredictiveInsightResponse])
@safe_endpoint
async def get_predictive_insights(
    request: Request,
    horizon_days: int = Query(30, ge=7, le=90, description="Prediction horizon in days"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get AI-powered predictive insights for business performance"""
    permission_checker = get_permission_checker(current_user=current_user, db=db)
    permission_checker.require_permission( Permission.VIEW_AI_ANALYTICS)
    
    intelligent_service = IntelligentAnalyticsService(db)
    insights = intelligent_service.generate_predictive_insights(
        user_id=current_user.id,
        horizon_days=horizon_days
    )
    
    return [
        PredictiveInsightResponse(
            title=insight.title,
            description=insight.description,
            confidence=insight.confidence,
            impact_score=insight.impact_score,
            category=insight.category,
            predicted_outcome=insight.predicted_outcome,
            recommended_actions=insight.recommended_actions,
            time_horizon=insight.time_horizon
        )
        for insight in insights
    ]

@router.get("/intelligence/alerts", response_model=List[SmartAlertResponse])
@safe_endpoint
async def get_smart_alerts(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get intelligent alerts based on business performance anomalies"""
    permission_checker = get_permission_checker(current_user=current_user, db=db)
    permission_checker.require_permission(Permission.VIEW_ANALYTICS)
    
    intelligent_service = IntelligentAnalyticsService(db)
    alerts = intelligent_service.generate_smart_alerts(user_id=current_user.id)
    
    return [
        SmartAlertResponse(
            title=alert.title,
            message=alert.message,
            priority=alert.priority.value,
            category=alert.category,
            metric_name=alert.metric_name,
            current_value=alert.current_value,
            threshold_value=alert.threshold_value,
            trend=alert.trend,
            suggested_actions=alert.suggested_actions,
            expires_at=alert.expires_at
        )
        for alert in alerts
    ]

@router.post("/intelligence/trends")
@safe_endpoint
async def get_trend_predictions(
    request: Request,
    metrics: List[str] = Query(..., description="Metrics to predict trends for"),
    days_ahead: int = Query(30, ge=7, le=90, description="Days to predict ahead"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get trend predictions for specified metrics"""
    permission_checker = get_permission_checker(current_user=current_user, db=db)
    permission_checker.require_permission( Permission.VIEW_AI_ANALYTICS)
    
    intelligent_service = IntelligentAnalyticsService(db)
    predictions = intelligent_service.predict_trends(
        user_id=current_user.id,
        metrics=metrics,
        days_ahead=days_ahead
    )
    
    return {
        "predictions": [
            {
                "metric_name": pred.metric_name,
                "current_value": pred.current_value,
                "predicted_values": [
                    {"date": date.isoformat(), "value": value}
                    for date, value in pred.predicted_values
                ],
                "confidence_interval": [
                    {"lower": lower, "upper": upper}
                    for lower, upper in pred.confidence_interval
                ],
                "trend_strength": pred.trend_strength,
                "seasonal_factor": pred.seasonal_factor
            }
            for pred in predictions
        ]
    }

@router.get("/intelligence/dashboard-enhancements")
@safe_endpoint
async def get_dashboard_enhancements(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get intelligent enhancements for existing dashboard components"""
    permission_checker = get_permission_checker(current_user=current_user, db=db)
    permission_checker.require_permission(Permission.VIEW_ANALYTICS)
    
    intelligent_service = IntelligentAnalyticsService(db)
    
    # Get all intelligent features in one response
    health_score = intelligent_service.calculate_business_health_score(current_user.id)
    insights = intelligent_service.generate_predictive_insights(current_user.id)
    alerts = intelligent_service.generate_smart_alerts(current_user.id)
    
    return {
        "health_score": {
            "overall_score": health_score.overall_score,
            "level": health_score.level.value,
            "components": health_score.components,
            "trends": health_score.trends
        },
        "top_insights": [
            {
                "title": insight.title,
                "description": insight.description,
                "impact_score": insight.impact_score,
                "category": insight.category
            }
            for insight in insights[:5]  # Top 5 insights
        ],
        "priority_alerts": [
            {
                "title": alert.title,
                "message": alert.message,
                "priority": alert.priority.value,
                "category": alert.category
            }
            for alert in alerts[:3]  # Top 3 alerts
        ],
        "enhancement_suggestions": [
            {
                "component": "revenue_chart",
                "enhancement": "trend_prediction_overlay",
                "description": "Add 30-day revenue trend prediction to existing chart"
            },
            {
                "component": "efficiency_metrics",
                "enhancement": "smart_alerts",
                "description": "Add intelligent anomaly detection alerts"
            },
            {
                "component": "client_analytics", 
                "enhancement": "retention_prediction",
                "description": "Show predicted client retention rates"
            }
        ]
    }

# ====================
# COMPREHENSIVE BUSINESS INTELLIGENCE ENDPOINTS
# ====================

@router.get("/business-intelligence/client-ltv", response_model=List[ClientLTVResponse])
@safe_endpoint
async def get_client_lifetime_value_predictions(
    request: Request,
    client_id: Optional[int] = Query(None, description="Specific client ID for prediction"),
    limit: int = Query(20, description="Maximum number of clients to analyze"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get comprehensive client lifetime value predictions using machine learning"""
    permission_checker = get_permission_checker(current_user=current_user, db=db)
    permission_checker.require_permission(Permission.VIEW_AI_ANALYTICS)
    
    ltv_service = MLClientLifetimeValueService(db)
    client_ltvs = ltv_service.predict_client_lifetime_value(
        user_id=current_user.id,
        client_id=client_id
    )
    
    # Convert to response format and limit results
    response_data = []
    for ltv in client_ltvs[:limit]:
        response_data.append(ClientLTVResponse(
            client_id=ltv.client_id,
            predicted_ltv=ltv.predicted_ltv,
            confidence_score=ltv.confidence_score,
            segment=ltv.segment.value,
            churn_risk=ltv.churn_risk.value,
            churn_probability=ltv.churn_probability,
            projected_6_month_value=ltv.projected_6_month_value,
            projected_12_month_value=ltv.projected_12_month_value,
            engagement_score=ltv.engagement_score,
            recommendation_actions=ltv.recommendation_actions
        ))
    
    return response_data

@router.get("/business-intelligence/client-segments", response_model=List[ClientSegmentResponse])
@safe_endpoint
async def get_client_segment_analysis(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get comprehensive client segment analysis and strategies"""
    permission_checker = get_permission_checker(current_user=current_user, db=db)
    permission_checker.require_permission(Permission.VIEW_AI_ANALYTICS)
    
    ltv_service = MLClientLifetimeValueService(db)
    segments = ltv_service.analyze_client_segments(current_user.id)
    
    response_data = []
    for segment in segments:
        response_data.append(ClientSegmentResponse(
            segment=segment.segment.value,
            client_count=segment.client_count,
            total_ltv=segment.total_ltv,
            average_ltv=segment.average_ltv,
            churn_rate=segment.churn_rate,
            revenue_contribution_percentage=segment.revenue_contribution_percentage,
            recommended_strategies=segment.recommended_strategies,
            growth_opportunities=segment.growth_opportunities
        ))
    
    return response_data

@router.post("/business-intelligence/revenue-optimization", response_model=RevenueOptimizationResponse)
@safe_endpoint
async def get_revenue_optimization_plan(
    bi_request: BusinessIntelligenceRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get comprehensive revenue optimization plan with AI-powered recommendations"""
    permission_checker = get_permission_checker(current_user=current_user, db=db)
    permission_checker.require_permission(Permission.VIEW_AI_ANALYTICS)
    
    optimization_engine = RevenueOptimizationEngine(db)
    plan = optimization_engine.generate_optimization_plan(
        user_id=current_user.id,
        target_annual_revenue=bi_request.target_annual_revenue
    )
    
    # Convert to response format
    return RevenueOptimizationResponse(
        total_potential_increase=plan.total_potential_increase,
        monthly_revenue_target=plan.monthly_revenue_target,
        six_figure_compliance_score=plan.six_figure_compliance_score,
        pricing_recommendations=[
            {
                "service_name": rec.service_name,
                "current_price": rec.current_price,
                "recommended_price": rec.recommended_price,
                "price_change_percentage": rec.price_change_percentage,
                "expected_revenue_impact": rec.expected_revenue_impact,
                "implementation_timeline": rec.implementation_timeline,
                "risk_level": rec.risk_level,
                "confidence_score": rec.confidence_score
            }
            for rec in plan.pricing_recommendations
        ],
        upsell_opportunities=[
            {
                "client_id": upsell.client_id,
                "client_segment": upsell.client_segment.value,
                "expected_revenue_lift": upsell.expected_revenue_lift,
                "success_probability": upsell.success_probability,
                "optimal_timing": upsell.optimal_timing,
                "recommended_upsells": upsell.recommended_upsells,
                "value_proposition": upsell.value_proposition
            }
            for upsell in plan.upsell_opportunities
        ],
        bundle_recommendations=[
            {
                "bundle_name": bundle.bundle_name,
                "included_services": bundle.included_services,
                "individual_price": bundle.individual_price,
                "bundle_price": bundle.bundle_price,
                "discount_percentage": bundle.discount_percentage,
                "expected_adoption_rate": bundle.expected_adoption_rate,
                "revenue_impact": bundle.revenue_impact
            }
            for bundle in plan.bundle_recommendations
        ],
        capacity_insights=[
            {
                "time_period": insight.time_period,
                "current_utilization": insight.current_utilization,
                "optimal_utilization": insight.optimal_utilization,
                "revenue_opportunity": insight.revenue_opportunity,
                "booking_strategy": insight.booking_strategy
            }
            for insight in plan.capacity_insights
        ],
        implementation_roadmap=plan.implementation_roadmap,
        risk_assessment=plan.risk_assessment
    )

@router.post("/business-intelligence/six-figure-methodology", response_model=SixFigureMethodologyResponse)
@safe_endpoint
async def get_six_figure_methodology_analysis(
    bi_request: BusinessIntelligenceRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get comprehensive Six Figure Barber methodology compliance analysis"""
    permission_checker = get_permission_checker(current_user=current_user, db=db)
    permission_checker.require_permission(Permission.VIEW_AI_ANALYTICS)
    
    methodology_tracker = SixFigureMethodologyTracker(db)
    report = methodology_tracker.generate_comprehensive_report(
        user_id=current_user.id,
        target_annual_revenue=bi_request.target_annual_revenue
    )
    
    # Convert to response format
    return SixFigureMethodologyResponse(
        overall_compliance_score=report.overall_compliance_score,
        methodology_scores=[
            {
                "principle": score.principle.value,
                "current_score": score.current_score,
                "target_score": score.target_score,
                "compliance_level": score.compliance_level.value,
                "key_metrics": score.key_metrics,
                "strengths": score.strengths,
                "improvement_areas": score.improvement_areas,
                "action_items": score.action_items,
                "trend": score.trend
            }
            for score in report.methodology_scores
        ],
        pathway_analysis={
            "current_annual_projection": report.pathway_analysis.current_annual_projection,
            "six_figure_target": report.pathway_analysis.six_figure_target,
            "progress_percentage": report.pathway_analysis.progress_percentage,
            "monthly_target": report.pathway_analysis.monthly_target,
            "daily_target": report.pathway_analysis.daily_target,
            "gap_analysis": report.pathway_analysis.gap_analysis,
            "pathway_recommendations": report.pathway_analysis.pathway_recommendations,
            "timeline_to_target": report.pathway_analysis.timeline_to_target,
            "confidence_score": report.pathway_analysis.confidence_score
        },
        growth_metrics={
            "skill_development_score": report.growth_metrics.skill_development_score,
            "brand_strength_score": report.growth_metrics.brand_strength_score,
            "market_positioning_score": report.growth_metrics.market_positioning_score,
            "client_satisfaction_score": report.growth_metrics.client_satisfaction_score,
            "business_maturity_score": report.growth_metrics.business_maturity_score,
            "growth_trajectory": report.growth_metrics.growth_trajectory,
            "development_priorities": report.growth_metrics.development_priorities
        },
        efficiency_analysis={
            "time_utilization_score": report.efficiency_analysis.time_utilization_score,
            "revenue_per_hour": report.efficiency_analysis.revenue_per_hour,
            "booking_efficiency_score": report.efficiency_analysis.booking_efficiency_score,
            "client_retention_rate": report.efficiency_analysis.client_retention_rate,
            "service_delivery_consistency": report.efficiency_analysis.service_delivery_consistency,
            "operational_optimization_opportunities": report.efficiency_analysis.operational_optimization_opportunities,
            "efficiency_benchmark_comparison": report.efficiency_analysis.efficiency_benchmark_comparison
        },
        strategic_recommendations=report.strategic_recommendations,
        implementation_priorities=report.implementation_priorities,
        success_probability=report.success_probability
    )

@router.get("/business-intelligence/realtime-dashboard", response_model=RealTimeDashboardResponse)
@safe_endpoint
async def get_realtime_dashboard_summary(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get real-time business health dashboard summary"""
    permission_checker = get_permission_checker(current_user=current_user, db=db)
    permission_checker.require_permission(Permission.VIEW_ANALYTICS)
    
    dashboard_service = RealTimeBusinessDashboard(db)
    summary = await dashboard_service.get_dashboard_summary(current_user.id)
    
    return RealTimeDashboardResponse(
        summary=summary.get('summary', {}),
        top_kpis=summary.get('top_kpis', []),
        urgent_alerts=summary.get('urgent_alerts', []),
        top_opportunities=summary.get('top_opportunities', []),
        last_updated=summary.get('last_updated', datetime.now().isoformat())
    )

@router.get("/business-intelligence/comprehensive-overview")
@safe_endpoint
async def get_comprehensive_business_intelligence(
    request: Request,
    target_annual_revenue: float = Query(100000, description="Target annual revenue"),
    include_predictions: bool = Query(True, description="Include predictive analytics"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get comprehensive business intelligence overview combining all BI services"""
    permission_checker = get_permission_checker(current_user=current_user, db=db)
    permission_checker.require_permission(Permission.VIEW_AI_ANALYTICS)
    
    # Initialize all BI services
    ltv_service = MLClientLifetimeValueService(db)
    optimization_engine = RevenueOptimizationEngine(db)
    methodology_tracker = SixFigureMethodologyTracker(db)
    dashboard_service = RealTimeBusinessDashboard(db)
    
    # Generate comprehensive analysis
    overview = {
        "executive_summary": {
            "current_performance": {},
            "six_figure_progress": {},
            "key_opportunities": [],
            "critical_alerts": [],
            "success_probability": 0.0
        },
        "detailed_analysis": {},
        "recommendations": {
            "immediate_actions": [],
            "strategic_initiatives": [],
            "long_term_goals": []
        },
        "performance_metrics": {},
        "generated_at": datetime.now().isoformat()
    }
    
    try:
        # Get Six Figure methodology analysis
        methodology_report = methodology_tracker.generate_comprehensive_report(
            current_user.id, target_annual_revenue
        )
        
        # Get revenue optimization plan
        optimization_plan = optimization_engine.generate_optimization_plan(
            current_user.id, target_annual_revenue
        )
        
        # Get client analysis
        client_segments = ltv_service.analyze_client_segments(current_user.id)
        
        # Get real-time dashboard
        dashboard_summary = await dashboard_service.get_dashboard_summary(current_user.id)
        
        # Build executive summary
        overview["executive_summary"] = {
            "current_performance": {
                "annual_revenue_projection": methodology_report.pathway_analysis.current_annual_projection,
                "methodology_compliance": methodology_report.overall_compliance_score,
                "six_figure_progress": methodology_report.pathway_analysis.progress_percentage,
                "success_probability": methodology_report.success_probability
            },
            "six_figure_progress": {
                "target_revenue": target_annual_revenue,
                "current_projection": methodology_report.pathway_analysis.current_annual_projection,
                "gap_amount": methodology_report.pathway_analysis.gap_analysis.get('total_revenue_gap', 0),
                "timeline_to_target": methodology_report.pathway_analysis.timeline_to_target,
                "confidence_score": methodology_report.pathway_analysis.confidence_score
            },
            "key_opportunities": [
                {
                    "type": "revenue_optimization",
                    "potential_value": optimization_plan.total_potential_increase,
                    "description": f"Revenue optimization potential: ${optimization_plan.total_potential_increase:.0f}"
                },
                {
                    "type": "client_development", 
                    "potential_value": sum(seg.total_ltv for seg in client_segments),
                    "description": f"Total client lifetime value: ${sum(seg.total_ltv for seg in client_segments):.0f}"
                }
            ],
            "critical_alerts": dashboard_summary.get('urgent_alerts', []),
            "success_probability": methodology_report.success_probability
        }
        
        # Build detailed analysis
        overview["detailed_analysis"] = {
            "methodology_analysis": {
                "overall_score": methodology_report.overall_compliance_score,
                "principle_scores": [
                    {
                        "principle": score.principle.value,
                        "score": score.current_score,
                        "status": score.compliance_level.value
                    }
                    for score in methodology_report.methodology_scores
                ]
            },
            "revenue_optimization": {
                "total_potential": optimization_plan.total_potential_increase,
                "pricing_opportunities": len(optimization_plan.pricing_recommendations),
                "upsell_opportunities": len(optimization_plan.upsell_opportunities),
                "capacity_optimization": len(optimization_plan.capacity_insights)
            },
            "client_intelligence": {
                "total_clients": sum(seg.client_count for seg in client_segments),
                "segment_distribution": [
                    {
                        "segment": seg.segment.value,
                        "count": seg.client_count,
                        "revenue_contribution": seg.revenue_contribution_percentage
                    }
                    for seg in client_segments
                ],
                "total_ltv": sum(seg.total_ltv for seg in client_segments)
            }
        }
        
        # Build recommendations
        overview["recommendations"] = {
            "immediate_actions": methodology_report.strategic_recommendations[:3],
            "strategic_initiatives": [
                {
                    "phase": phase["phase"],
                    "timeline": phase["timeline"],
                    "expected_impact": phase["total_expected_impact"]
                }
                for phase in optimization_plan.implementation_roadmap
            ],
            "long_term_goals": [
                "Achieve Six Figure Barber methodology compliance",
                "Build premium client base and brand positioning",
                "Optimize business efficiency and scalability"
            ]
        }
        
        # Build performance metrics
        overview["performance_metrics"] = {
            "kpis": dashboard_summary.get('top_kpis', []),
            "growth_metrics": {
                "revenue_growth_potential": optimization_plan.total_potential_increase,
                "client_retention_rate": methodology_report.efficiency_analysis.client_retention_rate,
                "methodology_compliance": methodology_report.overall_compliance_score
            },
            "benchmark_comparison": {
                "six_figure_standard": target_annual_revenue,
                "current_performance": methodology_report.pathway_analysis.current_annual_projection,
                "gap_percentage": methodology_report.pathway_analysis.gap_analysis.get('percentage_gap', 0)
            }
        }
        
    except Exception as e:
        logger.error(f"Error generating comprehensive BI overview: {str(e)}")
        overview["error"] = "Unable to generate complete analysis"
    
    return overview