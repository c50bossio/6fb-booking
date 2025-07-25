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

from datetime import datetime, timedelta, date
from typing import Dict, List, Optional, Any
from fastapi import APIRouter, Depends, HTTPException, Query, Request, BackgroundTasks
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
from services.privacy_anonymization_service import PrivacyAnonymizationService
from services.upselling_conversion_detector import UpsellConversionDetector

# Import utilities
from utils.error_handling import AppError, ValidationError, safe_endpoint
from utils.role_permissions import Permission, PermissionChecker, get_permission_checker
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
    permission_checker = get_permission_checker(db)
    permission_checker.check_permission(current_user, Permission.VIEW_ANALYTICS)
    
    user_ids = get_organization_user_ids(current_user, db)
    analytics_service = AnalyticsService(db)
    
    return {
        "revenue": analytics_service.get_revenue_analytics(user_ids=user_ids),
        "appointments": analytics_service.get_appointment_analytics(user_ids=user_ids),
        "clients": analytics_service.get_client_retention_analytics(user_ids=user_ids),
        "performance": analytics_service.get_barber_performance_analytics(user_ids=user_ids),
        "six_figure_barber": analytics_service.get_six_figure_barber_analytics(current_user.id)
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
    permission_checker = get_permission_checker(db)
    permission_checker.check_permission(current_user, Permission.VIEW_ANALYTICS)
    
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
    permission_checker = get_permission_checker(db)
    permission_checker.check_permission(current_user, Permission.VIEW_ANALYTICS)
    
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
    permission_checker = get_permission_checker(db)
    permission_checker.check_permission(current_user, Permission.VIEW_ANALYTICS)
    
    analytics_service = AnalyticsService(db)
    return analytics_service.get_six_figure_barber_analytics(
        current_user.id,
        target_annual_income=target_annual_income
    )

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
    permission_checker = get_permission_checker(db)
    permission_checker.check_permission(current_user, Permission.EXPORT_DATA)
    
    user_ids = get_organization_user_ids(current_user, db)
    analytics_service = AnalyticsService(db)
    
    date_range = None
    if start_date and end_date:
        date_range = DateRange(start_date=start_date, end_date=end_date)
    
    return analytics_service.export_analytics_data(
        user_ids=user_ids,
        date_range=date_range,
        format=format
    )

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
    
    permission_checker = get_permission_checker(db)
    permission_checker.check_permission(current_user, Permission.VIEW_AI_ANALYTICS)
    
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
    
    permission_checker = get_permission_checker(db)
    permission_checker.check_permission(current_user, Permission.VIEW_AI_ANALYTICS)
    
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
    
    permission_checker = get_permission_checker(db)
    permission_checker.check_permission(current_user, Permission.VIEW_AI_ANALYTICS)
    
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
    
    permission_checker = get_permission_checker(db)
    permission_checker.check_permission(current_user, Permission.VIEW_MARKETING_ANALYTICS)
    
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
    
    permission_checker = get_permission_checker(db)
    permission_checker.check_permission(current_user, Permission.VIEW_MARKETING_ANALYTICS)
    
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
    
    permission_checker = get_permission_checker(db)
    permission_checker.check_permission(current_user, Permission.VIEW_MARKETING_ANALYTICS)
    
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
    
    permission_checker = get_permission_checker(db)
    permission_checker.check_permission(current_user, Permission.EXPORT_DATA)
    
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
    permission_checker = get_permission_checker(db)
    permission_checker.check_permission(current_user, Permission.VIEW_ANALYTICS)
    
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
    permission_checker = get_permission_checker(db)
    permission_checker.check_permission(current_user, Permission.VIEW_ANALYTICS)
    
    user_ids = get_organization_user_ids(current_user, db)
    analytics_service = AnalyticsService(db)
    
    date_range = None
    if start_date and end_date:
        date_range = DateRange(start_date=start_date, end_date=end_date)
    
    return analytics_service.get_commission_analytics(user_ids, date_range)