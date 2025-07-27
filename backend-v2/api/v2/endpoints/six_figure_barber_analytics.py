"""
Six Figure Barber Methodology Analytics API Endpoints

This module provides comprehensive API endpoints for Six Figure Barber methodology
analytics, tracking, and optimization features. It supports all five core principles:

1. Revenue Optimization Tracking
2. Client Value Maximization
3. Service Delivery Excellence
4. Business Efficiency Metrics
5. Professional Growth Tracking

All endpoints are designed for integration with the V2 frontend and provide
real-time insights for premium barbershop management.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import date, datetime, timedelta
from pydantic import BaseModel, Field
import logging

from db import get_db
from routers.auth import get_current_user
from services.six_figure_barber_core_service import SixFigureBarberCoreService, SixFBPerformanceSummary
from models import User
from models.six_figure_barber_core import (
    SixFBPrinciple, RevenueMetricType, ClientValueTier, 
    ServiceExcellenceArea, EfficiencyMetricType, GrowthMetricType
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/six-figure-barber", tags=["Six Figure Barber Analytics"])


# ============================================================================
# PYDANTIC MODELS FOR API REQUESTS/RESPONSES
# ============================================================================

class RevenueMetricsResponse(BaseModel):
    """Response model for revenue metrics"""
    daily_revenue: float
    target_revenue: float
    variance_amount: float
    variance_percentage: float
    service_count: int
    client_count: int
    average_ticket: float
    upsell_revenue: float
    premium_service_percentage: float
    insights: List[Dict[str, Any]]
    optimization_opportunities: List[Dict[str, Any]]

class RevenueGoalProgressResponse(BaseModel):
    """Response model for revenue goal progress"""
    goals_progress: List[Dict[str, Any]]
    overall_pace: float
    recommendations: List[Dict[str, Any]]

class ClientValueProfileResponse(BaseModel):
    """Response model for client value analysis"""
    client_id: int
    client_name: str
    value_tier: str
    lifetime_value: float
    total_visits: int
    average_ticket: float
    visit_frequency_days: Optional[float]
    relationship_score: float
    loyalty_score: float
    churn_risk_score: float
    premium_service_adoption: float
    brand_alignment_score: float
    growth_potential: float
    insights: List[Dict[str, Any]]
    opportunities: List[Dict[str, Any]]
    recommended_actions: List[Dict[str, Any]]

class ClientJourneyResponse(BaseModel):
    """Response model for client journey tracking"""
    client_id: int
    current_stage: str
    days_in_stage: int
    stage_entry_date: str
    journey_history: List[Dict[str, Any]]
    relationship_building_score: float
    next_milestone: Dict[str, Any]
    stage_recommendations: List[Dict[str, Any]]

class ServiceExcellenceRequest(BaseModel):
    """Request model for service excellence tracking"""
    appointment_id: int
    excellence_scores: Dict[str, float] = Field(
        ..., 
        description="Dictionary mapping excellence area names to scores (0-100)"
    )

class ServiceExcellenceResponse(BaseModel):
    """Response model for service excellence tracking"""
    appointment_id: int
    overall_excellence_score: float
    area_scores: List[Dict[str, Any]]
    meets_six_fb_standards: bool
    improvement_recommendations: List[Dict[str, Any]]
    coaching_focus_areas: List[str]

class EfficiencyMetricsResponse(BaseModel):
    """Response model for efficiency metrics"""
    date: str
    metrics: Dict[str, Dict[str, Any]]
    overall_efficiency_score: float
    insights: List[Dict[str, Any]]
    opportunities: List[Dict[str, Any]]
    recommended_actions: List[Dict[str, Any]]

class GrowthMetricsResponse(BaseModel):
    """Response model for professional growth metrics"""
    overall_growth_score: float
    monthly_revenue_growth: float
    client_base_growth: int
    active_development_plans: int
    growth_insights: List[Dict[str, Any]]
    development_recommendations: List[Dict[str, Any]]
    milestone_progress: Dict[str, Any]

class MethodologyDashboardResponse(BaseModel):
    """Response model for comprehensive methodology dashboard"""
    overall_score: float
    revenue_optimization_score: float
    client_value_score: float
    service_excellence_score: float
    business_efficiency_score: float
    professional_growth_score: float
    key_insights: List[Dict[str, Any]]
    top_opportunities: List[Dict[str, Any]]
    critical_actions: List[Dict[str, Any]]

class RevenueGoalCreateRequest(BaseModel):
    """Request model for creating revenue goals"""
    goal_name: str
    target_annual_revenue: float
    start_date: date
    target_date: date
    sfb_principle_focus: str


# ============================================================================
# REVENUE OPTIMIZATION ENDPOINTS
# ============================================================================

@router.get("/revenue/metrics", response_model=RevenueMetricsResponse)
async def get_revenue_metrics(
    target_date: Optional[date] = Query(None, description="Date for metrics calculation (defaults to today)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Calculate comprehensive revenue metrics for Six Figure Barber methodology.
    
    Provides detailed revenue analysis including:
    - Daily revenue vs targets
    - Service and client counts
    - Upselling performance
    - Premium service adoption
    - AI-powered insights and optimization opportunities
    """
    service = SixFigureBarberCoreService(db)
    
    try:
        metrics = service.calculate_revenue_metrics(current_user.id, target_date)
        return RevenueMetricsResponse(**metrics)
    except Exception as e:
        logger.error(f"Error calculating revenue metrics for user {current_user.id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to calculate revenue metrics")

@router.get("/revenue/goals/progress", response_model=RevenueGoalProgressResponse)
async def get_revenue_goal_progress(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Track progress toward Six Figure Barber revenue goals.
    
    Provides:
    - Current annual revenue pace
    - Progress percentage for each goal
    - Days ahead/behind schedule
    - Actionable recommendations for acceleration
    """
    service = SixFigureBarberCoreService(db)
    
    try:
        progress = service.track_revenue_goal_progress(current_user.id)
        return RevenueGoalProgressResponse(**progress)
    except Exception as e:
        logger.error(f"Error tracking revenue goal progress for user {current_user.id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to track revenue goal progress")

@router.post("/revenue/goals")
async def create_revenue_goal(
    goal_data: RevenueGoalCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new Six Figure Barber revenue goal.
    
    Supports structured goal setting with methodology alignment and milestone tracking.
    """
    from models.six_figure_barber_core import SixFBRevenueGoals, SixFBPrinciple
    
    try:
        # Validate principle
        try:
            principle = SixFBPrinciple(goal_data.sfb_principle_focus)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid Six Figure Barber principle")
        
        # Calculate derived targets
        days_in_year = (goal_data.target_date - goal_data.start_date).days
        target_daily = goal_data.target_annual_revenue / 365
        target_weekly = target_daily * 7
        target_monthly = goal_data.target_annual_revenue / 12
        
        # Create goal
        goal = SixFBRevenueGoals(
            user_id=current_user.id,
            goal_name=goal_data.goal_name,
            target_annual_revenue=goal_data.target_annual_revenue,
            target_monthly_revenue=target_monthly,
            target_weekly_revenue=target_weekly,
            target_daily_revenue=target_daily,
            start_date=goal_data.start_date,
            target_date=goal_data.target_date,
            sfb_principle_focus=principle
        )
        
        db.add(goal)
        db.commit()
        
        return {"message": "Revenue goal created successfully", "goal_id": goal.id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating revenue goal for user {current_user.id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create revenue goal")


# ============================================================================
# CLIENT VALUE MAXIMIZATION ENDPOINTS
# ============================================================================

@router.get("/clients/{client_id}/value-profile", response_model=ClientValueProfileResponse)
async def get_client_value_profile(
    client_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Comprehensive client value analysis based on Six Figure Barber methodology.
    
    Provides:
    - Client value tier determination
    - Lifetime value calculation
    - Relationship quality scoring
    - Churn risk assessment
    - Growth potential analysis
    - Actionable optimization recommendations
    """
    service = SixFigureBarberCoreService(db)
    
    try:
        profile = service.analyze_client_value_profile(current_user.id, client_id)
        return ClientValueProfileResponse(**profile)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error analyzing client value profile for user {current_user.id}, client {client_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to analyze client value profile")

@router.get("/clients/{client_id}/journey", response_model=ClientJourneyResponse)
async def get_client_journey(
    client_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Track client journey stages and progression through Six Figure Barber methodology.
    
    Provides stage-by-stage relationship building insights and milestone predictions.
    """
    service = SixFigureBarberCoreService(db)
    
    try:
        journey = service.track_client_journey(current_user.id, client_id)
        return ClientJourneyResponse(**journey)
    except Exception as e:
        logger.error(f"Error tracking client journey for user {current_user.id}, client {client_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to track client journey")

@router.get("/clients/value-tiers")
async def get_client_value_tiers(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get client distribution across Six Figure Barber value tiers.
    
    Provides overview of client portfolio composition and value distribution.
    """
    from models.six_figure_barber_core import SixFBClientValueProfile
    from sqlalchemy import func
    
    try:
        # Get tier distribution
        tier_distribution = db.query(
            SixFBClientValueProfile.value_tier,
            func.count(SixFBClientValueProfile.id).label('count'),
            func.avg(SixFBClientValueProfile.lifetime_value).label('avg_value')
        ).filter(
            SixFBClientValueProfile.user_id == current_user.id
        ).group_by(
            SixFBClientValueProfile.value_tier
        ).all()
        
        result = {
            'tier_distribution': [
                {
                    'tier': tier.value,
                    'count': count,
                    'average_value': float(avg_value) if avg_value else 0
                }
                for tier, count, avg_value in tier_distribution
            ],
            'total_clients': sum(count for _, count, _ in tier_distribution),
            'methodology_insights': [
                "Focus on moving Developing clients to Core Regular tier",
                "Implement retention strategies for At Risk clients",
                "Maximize upselling opportunities with Premium VIP clients"
            ]
        }
        
        return result
    except Exception as e:
        logger.error(f"Error getting client value tiers for user {current_user.id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get client value tiers")


# ============================================================================
# SERVICE EXCELLENCE ENDPOINTS
# ============================================================================

@router.post("/service-excellence/track", response_model=ServiceExcellenceResponse)
async def track_service_excellence(
    excellence_data: ServiceExcellenceRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Track service excellence metrics for an appointment.
    
    Records detailed service quality measurements across all Six Figure Barber
    excellence areas and provides improvement recommendations.
    """
    service = SixFigureBarberCoreService(db)
    
    try:
        # Convert string keys to ServiceExcellenceArea enums
        excellence_scores = {}
        for area_name, score in excellence_data.excellence_scores.items():
            try:
                area_enum = ServiceExcellenceArea(area_name)
                excellence_scores[area_enum] = score
            except ValueError:
                raise HTTPException(status_code=400, detail=f"Invalid excellence area: {area_name}")
        
        result = service.track_service_excellence(
            current_user.id, 
            excellence_data.appointment_id, 
            excellence_scores
        )
        return ServiceExcellenceResponse(**result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error tracking service excellence for user {current_user.id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to track service excellence")

@router.get("/service-excellence/standards")
async def get_service_excellence_standards(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get Six Figure Barber service excellence standards and current performance.
    
    Provides comprehensive overview of quality standards and adherence rates.
    """
    from models.six_figure_barber_core import SixFBServiceStandards
    
    try:
        standards = db.query(SixFBServiceStandards).filter(
            SixFBServiceStandards.user_id == current_user.id,
            SixFBServiceStandards.is_active == True
        ).all()
        
        result = {
            'standards': [
                {
                    'id': std.id,
                    'standard_name': std.standard_name,
                    'excellence_area': std.excellence_area.value,
                    'minimum_score': std.minimum_score,
                    'target_score': std.target_score,
                    'excellence_score': std.excellence_score,
                    'current_average_score': std.current_average_score,
                    'compliance_rate': std.compliance_rate,
                    'trend_direction': std.trend_direction,
                    'methodology_principle': std.methodology_principle.value
                }
                for std in standards
            ],
            'overall_compliance': sum(std.compliance_rate for std in standards) / len(standards) if standards else 0,
            'six_fb_methodology_adherence': len([std for std in standards if std.compliance_rate >= 80]) / len(standards) * 100 if standards else 0
        }
        
        return result
    except Exception as e:
        logger.error(f"Error getting service excellence standards for user {current_user.id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get service excellence standards")


# ============================================================================
# BUSINESS EFFICIENCY ENDPOINTS
# ============================================================================

@router.get("/efficiency/metrics", response_model=EfficiencyMetricsResponse)
async def get_efficiency_metrics(
    target_date: Optional[date] = Query(None, description="Date for metrics calculation (defaults to today)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Calculate comprehensive business efficiency metrics.
    
    Provides operational efficiency analysis including booking utilization,
    no-show rates, and optimization opportunities.
    """
    service = SixFigureBarberCoreService(db)
    
    try:
        metrics = service.calculate_efficiency_metrics(current_user.id, target_date)
        return EfficiencyMetricsResponse(**metrics)
    except Exception as e:
        logger.error(f"Error calculating efficiency metrics for user {current_user.id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to calculate efficiency metrics")

@router.get("/efficiency/trends")
async def get_efficiency_trends(
    days: int = Query(30, description="Number of days to analyze"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get efficiency trends over time for Six Figure Barber methodology analysis.
    
    Provides trend analysis and performance patterns identification.
    """
    from models.six_figure_barber_core import SixFBEfficiencyMetrics
    from sqlalchemy import func
    
    try:
        end_date = date.today()
        start_date = end_date - timedelta(days=days)
        
        # Get efficiency metrics over time period
        metrics = db.query(
            SixFBEfficiencyMetrics.date,
            SixFBEfficiencyMetrics.metric_type,
            func.avg(SixFBEfficiencyMetrics.value).label('avg_value'),
            func.avg(SixFBEfficiencyMetrics.target_value).label('avg_target')
        ).filter(
            SixFBEfficiencyMetrics.user_id == current_user.id,
            SixFBEfficiencyMetrics.date >= start_date,
            SixFBEfficiencyMetrics.date <= end_date
        ).group_by(
            SixFBEfficiencyMetrics.date,
            SixFBEfficiencyMetrics.metric_type
        ).order_by(
            SixFBEfficiencyMetrics.date
        ).all()
        
        # Organize data by metric type
        trends = {}
        for metric in metrics:
            metric_type = metric.metric_type.value
            if metric_type not in trends:
                trends[metric_type] = []
            
            trends[metric_type].append({
                'date': metric.date.isoformat(),
                'value': float(metric.avg_value),
                'target': float(metric.avg_target) if metric.avg_target else None
            })
        
        # Calculate overall trends
        overall_performance = {}
        for metric_type, data in trends.items():
            if len(data) >= 2:
                recent_avg = sum(point['value'] for point in data[-7:]) / min(7, len(data))
                earlier_avg = sum(point['value'] for point in data[:-7]) / max(1, len(data) - 7)
                trend_direction = "improving" if recent_avg > earlier_avg else "declining" if recent_avg < earlier_avg else "stable"
                overall_performance[metric_type] = {
                    'current_average': recent_avg,
                    'trend_direction': trend_direction,
                    'improvement_rate': ((recent_avg - earlier_avg) / earlier_avg * 100) if earlier_avg > 0 else 0
                }
        
        return {
            'period_start': start_date.isoformat(),
            'period_end': end_date.isoformat(),
            'trends': trends,
            'overall_performance': overall_performance,
            'six_fb_insights': [
                "Focus on metrics trending downward for immediate improvement",
                "Leverage metrics exceeding targets to optimize others",
                "Implement systematic tracking for consistent Six Figure Barber performance"
            ]
        }
    except Exception as e:
        logger.error(f"Error getting efficiency trends for user {current_user.id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get efficiency trends")


# ============================================================================
# PROFESSIONAL GROWTH ENDPOINTS
# ============================================================================

@router.get("/growth/metrics", response_model=GrowthMetricsResponse)
async def get_growth_metrics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Track professional growth metrics and development progress.
    
    Provides comprehensive growth analysis aligned with Six Figure Barber methodology.
    """
    service = SixFigureBarberCoreService(db)
    
    try:
        metrics = service.track_professional_growth(current_user.id)
        return GrowthMetricsResponse(**metrics)
    except Exception as e:
        logger.error(f"Error tracking professional growth for user {current_user.id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to track professional growth")

@router.get("/growth/development-plans")
async def get_development_plans(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get active professional development plans aligned with Six Figure Barber methodology.
    
    Provides structured development roadmap and progress tracking.
    """
    from models.six_figure_barber_core import SixFBProfessionalDevelopmentPlan
    
    try:
        plans = db.query(SixFBProfessionalDevelopmentPlan).filter(
            SixFBProfessionalDevelopmentPlan.user_id == current_user.id,
            SixFBProfessionalDevelopmentPlan.status == "active"
        ).all()
        
        result = {
            'active_plans': [
                {
                    'id': plan.id,
                    'plan_name': plan.plan_name,
                    'description': plan.description,
                    'methodology_focus': plan.methodology_focus.value,
                    'start_date': plan.start_date.isoformat(),
                    'target_completion_date': plan.target_completion_date.isoformat(),
                    'completion_percentage': plan.completion_percentage,
                    'current_phase': plan.current_phase,
                    'primary_goals': plan.primary_goals,
                    'milestones_achieved': plan.milestones_achieved,
                    'next_milestone': plan.next_milestone
                }
                for plan in plans
            ],
            'overall_development_score': sum(plan.completion_percentage for plan in plans) / len(plans) if plans else 0,
            'six_fb_alignment': len([plan for plan in plans if plan.completion_percentage >= 80]) / len(plans) * 100 if plans else 0
        }
        
        return result
    except Exception as e:
        logger.error(f"Error getting development plans for user {current_user.id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get development plans")


# ============================================================================
# COMPREHENSIVE DASHBOARD ENDPOINT
# ============================================================================

@router.get("/dashboard", response_model=MethodologyDashboardResponse)
async def get_methodology_dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generate comprehensive Six Figure Barber methodology dashboard.
    
    Provides complete overview of all five core principles with actionable insights,
    optimization opportunities, and critical action items.
    
    This is the primary endpoint for the Six Figure Barber analytics dashboard.
    """
    service = SixFigureBarberCoreService(db)
    
    try:
        dashboard = service.generate_methodology_dashboard(current_user.id)
        
        # Convert SixFBInsight objects to dictionaries
        key_insights = [
            {
                'principle': insight.principle.value,
                'title': insight.title,
                'description': insight.description,
                'impact_score': insight.impact_score,
                'actionable': insight.actionable,
                'priority': insight.priority,
                'estimated_revenue_impact': float(insight.estimated_revenue_impact) if insight.estimated_revenue_impact else None,
                'implementation_effort': insight.implementation_effort,
                'timeline_days': insight.timeline_days
            }
            for insight in dashboard.key_insights
        ]
        
        return MethodologyDashboardResponse(
            overall_score=dashboard.overall_score,
            revenue_optimization_score=dashboard.revenue_optimization_score,
            client_value_score=dashboard.client_value_score,
            service_excellence_score=dashboard.service_excellence_score,
            business_efficiency_score=dashboard.business_efficiency_score,
            professional_growth_score=dashboard.professional_growth_score,
            key_insights=key_insights,
            top_opportunities=dashboard.top_opportunities,
            critical_actions=dashboard.critical_actions
        )
    except Exception as e:
        logger.error(f"Error generating methodology dashboard for user {current_user.id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to generate methodology dashboard")

@router.get("/health")
async def health_check():
    """Health check endpoint for Six Figure Barber analytics service"""
    return {
        'status': 'healthy',
        'service': 'Six Figure Barber Analytics API',
        'version': '2.0.0',
        'principles_supported': [principle.value for principle in SixFBPrinciple],
        'features': [
            'Revenue Optimization Tracking',
            'Client Value Maximization',
            'Service Delivery Excellence',
            'Business Efficiency Metrics',
            'Professional Growth Tracking',
            'Comprehensive Analytics Dashboard'
        ]
    }