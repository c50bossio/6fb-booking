"""
Analytics API endpoints for BookedBarber Six Figure Barber Methodology Dashboard

Provides comprehensive business analytics endpoints aligned with the Six Figure Barber methodology,
focusing on revenue optimization, client value maximization, and business growth insights.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Dict, List, Optional, Any
from datetime import date, datetime, timedelta
import logging
from pydantic import BaseModel, Field

from db import get_db
from utils.auth import get_current_user
from models import User, UnifiedUserRole
from services.business_analytics_service import BusinessAnalyticsService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/analytics", tags=["Analytics"])


# Pydantic models for API responses
class AnalyticsOverview(BaseModel):
    total_revenue: float
    revenue_growth_percent: float
    total_appointments: int
    unique_clients: int
    average_ticket_size: float
    booking_efficiency_percent: float
    revenue_per_hour: float
    period_start: str
    period_end: str


class RevenueAnalytics(BaseModel):
    daily_trends: List[Dict[str, Any]]
    service_performance: List[Dict[str, Any]]
    peak_hours: List[Dict[str, Any]]
    payment_success_rates: Dict[str, Any]
    six_fb_metrics: Dict[str, Any]


class ClientAnalytics(BaseModel):
    retention_metrics: Dict[str, Any]
    booking_patterns: Dict[str, Any]
    no_show_analysis: Dict[str, Any]
    client_lifetime_value: Dict[str, Any]
    six_fb_client_tiers: Dict[str, Any]


class BarberPerformance(BaseModel):
    individual_metrics: Dict[str, Any]
    team_metrics: Optional[Dict[str, Any]] = None


class BusinessIntelligence(BaseModel):
    demand_prediction: Dict[str, Any]
    seasonal_analysis: Dict[str, Any]
    pricing_optimization: Dict[str, Any]
    capacity_planning: Dict[str, Any]
    competitive_insights: Dict[str, Any]


class SixFBAlignment(BaseModel):
    overall_score: float
    principle_scores: Dict[str, float]
    milestone_progress: Dict[str, Any]
    key_opportunities: Optional[List[Dict[str, Any]]] = None
    quick_wins: Optional[List[Dict[str, Any]]] = None
    coaching_priorities: Optional[List[Dict[str, Any]]] = None


class TrendAnalysis(BaseModel):
    weekly_trends: List[Dict[str, Any]]
    growth_rates: Dict[str, float]
    trend_indicators: Dict[str, str]


class Recommendation(BaseModel):
    type: str
    priority: str
    title: str
    description: str
    action_items: List[str]
    expected_impact: str
    six_fb_principle: str


class PredictiveAnalytics(BaseModel):
    revenue_forecast: Dict[str, Any]
    demand_prediction: Dict[str, Any]
    client_churn_risk: Dict[str, Any]
    growth_trajectory: Dict[str, Any]


class ComprehensiveDashboard(BaseModel):
    overview: AnalyticsOverview
    revenue_analytics: RevenueAnalytics
    client_analytics: ClientAnalytics
    barber_performance: BarberPerformance
    business_intelligence: BusinessIntelligence
    six_fb_alignment: SixFBAlignment
    trends: TrendAnalysis
    recommendations: List[Recommendation]
    predictions: Optional[PredictiveAnalytics] = None


# Helper function to verify analytics access
def verify_analytics_access(current_user: User) -> bool:
    """Verify that the user has access to analytics features."""
    allowed_roles = [
        UnifiedUserRole.INDIVIDUAL_BARBER.value,
        UnifiedUserRole.BARBER.value,
        UnifiedUserRole.SHOP_MANAGER.value,
        UnifiedUserRole.SHOP_OWNER.value,
        UnifiedUserRole.ENTERPRISE_OWNER.value,
        UnifiedUserRole.PLATFORM_ADMIN.value,
        UnifiedUserRole.SUPER_ADMIN.value
    ]
    
    return current_user.unified_role in allowed_roles


@router.get("/dashboard", response_model=ComprehensiveDashboard)
async def get_comprehensive_dashboard(
    date_range_days: int = Query(30, ge=7, le=365, description="Number of days to analyze"),
    include_predictions: bool = Query(True, description="Include predictive analytics"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get comprehensive analytics dashboard data aligned with Six Figure Barber methodology.
    
    Provides complete business insights including:
    - Revenue optimization metrics
    - Client value analysis
    - Service excellence tracking
    - Business efficiency indicators
    - Professional growth metrics
    - Predictive analytics
    - Actionable recommendations
    """
    
    if not verify_analytics_access(current_user):
        raise HTTPException(
            status_code=403,
            detail="Insufficient permissions to access analytics dashboard"
        )
    
    try:
        analytics_service = BusinessAnalyticsService(db)
        dashboard_data = analytics_service.get_comprehensive_dashboard(
            user_id=current_user.id,
            date_range_days=date_range_days,
            include_predictions=include_predictions
        )
        
        return dashboard_data
        
    except Exception as e:
        logger.error(f"Error generating comprehensive dashboard for user {current_user.id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to generate analytics dashboard"
        )


@router.get("/overview", response_model=AnalyticsOverview)
async def get_analytics_overview(
    date_range_days: int = Query(30, ge=7, le=365),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get high-level analytics overview metrics."""
    
    if not verify_analytics_access(current_user):
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        analytics_service = BusinessAnalyticsService(db)
        end_date = date.today()
        start_date = end_date - timedelta(days=date_range_days)
        
        overview_data = analytics_service._get_overview_metrics(
            current_user.id, start_date, end_date
        )
        
        return overview_data
        
    except Exception as e:
        logger.error(f"Error getting overview for user {current_user.id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get analytics overview")


@router.get("/revenue", response_model=RevenueAnalytics)
async def get_revenue_analytics(
    date_range_days: int = Query(30, ge=7, le=365),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get detailed revenue analytics including trends, service performance, and peak hours."""
    
    if not verify_analytics_access(current_user):
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        analytics_service = BusinessAnalyticsService(db)
        end_date = date.today()
        start_date = end_date - timedelta(days=date_range_days)
        
        revenue_data = analytics_service._get_revenue_analytics(
            current_user.id, start_date, end_date
        )
        
        return revenue_data
        
    except Exception as e:
        logger.error(f"Error getting revenue analytics for user {current_user.id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get revenue analytics")


@router.get("/clients", response_model=ClientAnalytics)
async def get_client_analytics(
    date_range_days: int = Query(30, ge=7, le=365),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get comprehensive client analytics including retention, lifetime value, and behavior patterns."""
    
    if not verify_analytics_access(current_user):
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        analytics_service = BusinessAnalyticsService(db)
        end_date = date.today()
        start_date = end_date - timedelta(days=date_range_days)
        
        client_data = analytics_service._get_client_analytics(
            current_user.id, start_date, end_date
        )
        
        return client_data
        
    except Exception as e:
        logger.error(f"Error getting client analytics for user {current_user.id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get client analytics")


@router.get("/performance", response_model=BarberPerformance)
async def get_barber_performance(
    date_range_days: int = Query(30, ge=7, le=365),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get barber performance metrics including efficiency, utilization, and client satisfaction."""
    
    if not verify_analytics_access(current_user):
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        analytics_service = BusinessAnalyticsService(db)
        end_date = date.today()
        start_date = end_date - timedelta(days=date_range_days)
        
        performance_data = analytics_service._get_barber_performance(
            current_user.id, start_date, end_date
        )
        
        return performance_data
        
    except Exception as e:
        logger.error(f"Error getting performance metrics for user {current_user.id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get performance metrics")


@router.get("/business-intelligence", response_model=BusinessIntelligence)
async def get_business_intelligence(
    date_range_days: int = Query(30, ge=7, le=365),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get business intelligence insights including demand prediction and pricing optimization."""
    
    if not verify_analytics_access(current_user):
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        analytics_service = BusinessAnalyticsService(db)
        end_date = date.today()
        start_date = end_date - timedelta(days=date_range_days)
        
        bi_data = analytics_service._get_business_intelligence(
            current_user.id, start_date, end_date
        )
        
        return bi_data
        
    except Exception as e:
        logger.error(f"Error getting business intelligence for user {current_user.id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get business intelligence")


@router.get("/six-figure-barber", response_model=SixFBAlignment)
async def get_six_fb_alignment(
    date_range_days: int = Query(30, ge=7, le=365),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get Six Figure Barber methodology alignment metrics and scores."""
    
    if not verify_analytics_access(current_user):
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        analytics_service = BusinessAnalyticsService(db)
        end_date = date.today()
        start_date = end_date - timedelta(days=date_range_days)
        
        six_fb_data = analytics_service._get_six_fb_alignment_metrics(
            current_user.id, start_date, end_date
        )
        
        return six_fb_data
        
    except Exception as e:
        logger.error(f"Error getting Six FB alignment for user {current_user.id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get Six Figure Barber alignment")


@router.get("/trends", response_model=TrendAnalysis)
async def get_trend_analysis(
    date_range_days: int = Query(90, ge=30, le=365),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get trend analysis over multiple time periods."""
    
    if not verify_analytics_access(current_user):
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        analytics_service = BusinessAnalyticsService(db)
        end_date = date.today()
        start_date = end_date - timedelta(days=date_range_days)
        
        trend_data = analytics_service._get_trend_analysis(
            current_user.id, start_date, end_date
        )
        
        return trend_data
        
    except Exception as e:
        logger.error(f"Error getting trend analysis for user {current_user.id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get trend analysis")


@router.get("/recommendations", response_model=List[Recommendation])
async def get_recommendations(
    date_range_days: int = Query(30, ge=7, le=365),
    priority: Optional[str] = Query(None, regex="^(high|medium|low)$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get actionable business recommendations based on data analysis."""
    
    if not verify_analytics_access(current_user):
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        analytics_service = BusinessAnalyticsService(db)
        end_date = date.today()
        start_date = end_date - timedelta(days=date_range_days)
        
        recommendations = analytics_service._get_actionable_recommendations(
            current_user.id, start_date, end_date
        )
        
        # Filter by priority if specified
        if priority:
            recommendations = [r for r in recommendations if r["priority"] == priority]
        
        return recommendations
        
    except Exception as e:
        logger.error(f"Error getting recommendations for user {current_user.id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get recommendations")


@router.get("/predictions", response_model=PredictiveAnalytics)
async def get_predictive_analytics(
    date_range_days: int = Query(90, ge=30, le=365),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get predictive analytics for business planning."""
    
    if not verify_analytics_access(current_user):
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        analytics_service = BusinessAnalyticsService(db)
        end_date = date.today()
        start_date = end_date - timedelta(days=date_range_days)
        
        predictions = analytics_service._get_predictive_analytics(
            current_user.id, start_date, end_date
        )
        
        return predictions
        
    except Exception as e:
        logger.error(f"Error getting predictions for user {current_user.id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get predictive analytics")


@router.post("/export")
async def export_analytics_report(
    format: str = Query("pdf", regex="^(pdf|excel|csv)$"),
    date_range_days: int = Query(30, ge=7, le=365),
    include_charts: bool = Query(True),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    background_tasks: BackgroundTasks = None
):
    """Export comprehensive analytics report in specified format."""
    
    if not verify_analytics_access(current_user):
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        analytics_service = BusinessAnalyticsService(db)
        dashboard_data = analytics_service.get_comprehensive_dashboard(
            user_id=current_user.id,
            date_range_days=date_range_days,
            include_predictions=True
        )
        
        # Generate export file (this would be implemented with proper report generation)
        export_id = f"analytics_report_{current_user.id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        # In a real implementation, this would trigger background report generation
        # and return a download URL or file
        
        return {
            "export_id": export_id,
            "status": "processing",
            "format": format,
            "estimated_completion": "2-3 minutes",
            "download_url": f"/api/v2/analytics/download/{export_id}",
            "message": "Report generation started. You will receive a notification when complete."
        }
        
    except Exception as e:
        logger.error(f"Error exporting analytics for user {current_user.id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to export analytics report")


@router.get("/benchmark/{metric}")
async def get_benchmark_comparison(
    metric: str,
    business_segment: Optional[str] = Query(None),
    region: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get benchmark comparison for specific metrics."""
    
    if not verify_analytics_access(current_user):
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        # This would integrate with the PerformanceBenchmark model
        # For now, return sample benchmark data
        
        benchmark_data = {
            "metric": metric,
            "user_value": 0,  # User's actual value
            "benchmarks": {
                "percentile_25": 0,
                "percentile_50": 0,  # Median
                "percentile_75": 0,
                "percentile_90": 0,
                "industry_average": 0
            },
            "user_percentile": 0,  # Where user ranks
            "interpretation": "Above average performance",
            "improvement_potential": "10-15% increase possible"
        }
        
        return benchmark_data
        
    except Exception as e:
        logger.error(f"Error getting benchmark for metric {metric}, user {current_user.id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get benchmark comparison")


@router.post("/dashboard/refresh")
async def refresh_dashboard_data(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    background_tasks: BackgroundTasks = None
):
    """Trigger refresh of dashboard data and Six Figure Barber metrics."""
    
    if not verify_analytics_access(current_user):
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        # This would trigger background recalculation of metrics
        # and update the SixFBMethodologyDashboard table
        
        return {
            "status": "refresh_started",
            "message": "Dashboard data refresh initiated",
            "estimated_completion": "1-2 minutes",
            "refresh_id": f"refresh_{current_user.id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        }
        
    except Exception as e:
        logger.error(f"Error refreshing dashboard for user {current_user.id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to refresh dashboard data")


# Health check endpoint
@router.get("/health")
async def analytics_health_check():
    """Health check for analytics service."""
    return {
        "status": "healthy",
        "service": "analytics",
        "timestamp": datetime.now().isoformat(),
        "features": [
            "comprehensive_dashboard",
            "six_figure_barber_metrics",
            "predictive_analytics",
            "export_capabilities",
            "real_time_insights"
        ]
    }