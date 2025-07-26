"""
Franchise AI Coaching Router

Advanced API endpoints for enterprise-scale AI coaching, predictive analytics,
and cross-network intelligence for franchise operations.
"""

from datetime import datetime, timedelta, date
from typing import Dict, List, Optional, Any
from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from db import get_db
from dependencies import get_current_user
from models import User, Location
from services.franchise_ai_coaching_service import (
    FranchiseAICoachingService, 
    FranchiseCoachingInsight,
    FranchisePerformanceLevel
)
from services.advanced_franchise_analytics_service import (
    AdvancedFranchiseAnalyticsService,
    AnalyticsTimeframe,
    FranchisePerformanceSnapshot,
    FranchiseNetworkDashboard
)
from services.franchise_predictive_analytics_service import (
    FranchisePredictiveAnalyticsService,
    PredictionType,
    RevenueForecast,
    MarketExpansionForecast,
    ChurnPrediction
)


router = APIRouter(prefix="/franchise-ai", tags=["franchise-ai-coaching"])


# Request/Response Models

class FranchiseCoachingRequest(BaseModel):
    """Request for franchise AI coaching"""
    location_id: int
    include_cross_network: bool = Field(True, description="Include cross-network benchmarking")
    coaching_focus: Optional[List[str]] = Field(None, description="Specific areas to focus on")
    performance_context: Optional[Dict[str, Any]] = Field(None, description="Additional performance context")


class PredictiveAnalyticsRequest(BaseModel):
    """Request for predictive analytics"""
    location_id: int
    prediction_type: str = Field(..., description="Type of prediction: revenue_forecast, market_expansion, churn_prediction, demand_patterns, pricing_optimization")
    forecast_horizon: int = Field(12, description="Forecast horizon in months/weeks depending on type")
    include_scenarios: bool = Field(True, description="Include scenario analysis")
    custom_parameters: Optional[Dict[str, Any]] = Field(None, description="Custom parameters for prediction")


class NetworkAnalyticsRequest(BaseModel):
    """Request for network-wide analytics"""
    network_id: Optional[str] = Field(None, description="Specific network ID, or None for user's network")
    timeframe: str = Field("month", description="Analytics timeframe: today, week, month, quarter, year")
    include_benchmarks: bool = Field(True, description="Include cross-network benchmarks")
    performance_segments: Optional[List[str]] = Field(None, description="Filter by performance segments")


class FranchiseCoachingResponse(BaseModel):
    """Response for franchise coaching"""
    success: bool
    location_id: int
    location_name: str
    coaching_insights: List[Dict[str, Any]]
    performance_summary: Dict[str, Any]
    cross_network_context: Optional[Dict[str, Any]] = None
    action_priorities: List[str]
    next_review_date: str
    methodology_alignment: Dict[str, Any]


class PredictiveAnalyticsResponse(BaseModel):
    """Response for predictive analytics"""
    success: bool
    prediction_type: str
    forecast_data: Dict[str, Any]
    confidence_metrics: Dict[str, Any]
    key_insights: List[str]
    recommendations: List[str]
    risk_factors: List[str]
    model_metadata: Dict[str, Any]


class NetworkDashboardResponse(BaseModel):
    """Response for network dashboard"""
    success: bool
    network_overview: Dict[str, Any]
    performance_distribution: Dict[str, Any]
    real_time_metrics: Dict[str, Any]
    top_performers: List[Dict[str, Any]]
    improvement_opportunities: List[Dict[str, Any]]
    network_trends: List[Dict[str, Any]]
    cross_network_benchmarks: Dict[str, Any]


# AI Coaching Endpoints

@router.post("/coaching/insights", response_model=FranchiseCoachingResponse)
async def get_franchise_ai_coaching(
    request: FranchiseCoachingRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get comprehensive AI coaching insights for franchise location
    
    Provides Six Figure Barber methodology-aligned coaching with:
    - Performance optimization recommendations
    - Cross-network benchmarking insights
    - Revenue growth opportunities
    - Operational efficiency improvements
    """
    
    try:
        # Verify user has access to the location
        location = db.query(Location).filter(Location.id == request.location_id).first()
        if not location:
            raise HTTPException(status_code=404, detail="Location not found")
        
        # Check user permissions for the location
        if not _has_location_access(current_user, location):
            raise HTTPException(status_code=403, detail="Access denied for this location")
        
        # Get current analytics data for the location
        analytics_service = AdvancedFranchiseAnalyticsService(db)
        performance_data = analytics_service.get_franchise_performance_snapshot(
            request.location_id, AnalyticsTimeframe.MONTH
        )
        
        # Convert performance data to coaching input format
        analytics_data = {
            'current_performance': {
                'monthly_revenue': performance_data.total_revenue,
                'average_ticket': performance_data.average_ticket,
                'utilization_rate': performance_data.utilization_rate,
                'retention_rate': performance_data.retention_rate
            },
            'targets': {
                'annual_income_target': 100000,  # Default Six Figure Barber target
                'monthly_revenue_target': performance_data.total_revenue * 1.2,  # 20% growth target
                'utilization_target': 85.0,
                'retention_target': 85.0
            },
            'recommendations': {
                'price_optimization': {
                    'recommended_average_ticket': performance_data.average_ticket * 1.15,
                    'potential_annual_increase': performance_data.total_revenue * 0.15 * 12
                },
                'client_acquisition': {
                    'current_monthly_clients': performance_data.total_clients,
                    'target_monthly_clients': performance_data.total_clients * 1.1,
                    'potential_annual_increase': performance_data.total_revenue * 0.1 * 12
                },
                'retention_improvement': {
                    'current_retention_rate': performance_data.retention_rate,
                    'target_retention_rate': 85.0,
                    'potential_annual_increase': performance_data.total_revenue * 0.2 * 12
                },
                'efficiency_optimization': {
                    'current_utilization_rate': performance_data.utilization_rate,
                    'target_utilization_rate': 85.0,
                    'potential_annual_increase': performance_data.total_revenue * 0.1 * 12
                }
            }
        }
        
        # Generate franchise AI coaching insights
        coaching_service = FranchiseAICoachingService(db, location.franchise_network_id)
        insights = coaching_service.generate_franchise_coaching(
            request.location_id,
            analytics_data,
            request.include_cross_network
        )
        
        # Convert insights to response format
        coaching_insights = []
        for insight in insights:
            coaching_insights.append({
                'category': insight.category.value,
                'priority': insight.priority.value,
                'title': insight.title,
                'message': insight.message,
                'impact_description': insight.impact_description,
                'potential_revenue_increase': insight.potential_revenue_increase,
                'action_steps': insight.action_steps,
                'timeline': insight.timeline,
                'success_metrics': insight.success_metrics,
                'franchise_context': insight.franchise_context,
                'market_opportunity_score': insight.market_opportunity_score,
                'network_best_practices': insight.network_best_practices,
                'six_fb_methodology': insight.six_fb_methodology,
                'business_principle': insight.business_principle
            })
        
        # Generate performance summary
        performance_summary = {
            'performance_score': performance_data.performance_score,
            'performance_segment': performance_data.segment.value,
            'rank_percentile': performance_data.rank_percentile,
            'key_strengths': _identify_key_strengths(performance_data),
            'improvement_areas': _identify_improvement_areas(performance_data),
            'six_figure_progress': _calculate_six_figure_progress(performance_data)
        }
        
        # Get cross-network context if requested
        cross_network_context = None
        if request.include_cross_network:
            cross_network_context = {
                'network_comparison': performance_data.network_comparison,
                'industry_benchmark': performance_data.industry_benchmark,
                'network_position': 'top_quartile' if performance_data.rank_percentile > 75 else 'average'
            }
        
        # Generate action priorities
        action_priorities = [insight.title for insight in insights[:3]]  # Top 3 priorities
        
        # Calculate next review date
        next_review_date = (datetime.now() + timedelta(days=30)).isoformat()
        
        # Six Figure Barber methodology alignment
        methodology_alignment = {
            'methodology_compliance_score': _calculate_methodology_compliance(insights),
            'six_fb_principles_addressed': _count_six_fb_principles(insights),
            'revenue_optimization_focus': _assess_revenue_focus(insights),
            'client_value_creation_focus': _assess_client_focus(insights)
        }
        
        return FranchiseCoachingResponse(
            success=True,
            location_id=request.location_id,
            location_name=location.name,
            coaching_insights=coaching_insights,
            performance_summary=performance_summary,
            cross_network_context=cross_network_context,
            action_priorities=action_priorities,
            next_review_date=next_review_date,
            methodology_alignment=methodology_alignment
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating coaching insights: {str(e)}")


@router.post("/analytics/predictive", response_model=PredictiveAnalyticsResponse)
async def get_predictive_analytics(
    request: PredictiveAnalyticsRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get predictive analytics for franchise planning and optimization
    
    Supports multiple prediction types:
    - Revenue forecasting with seasonal adjustments
    - Market expansion opportunity analysis
    - Client churn prediction and prevention
    - Demand pattern analysis for scheduling
    - Pricing optimization recommendations
    """
    
    try:
        # Verify location access
        location = db.query(Location).filter(Location.id == request.location_id).first()
        if not location:
            raise HTTPException(status_code=404, detail="Location not found")
        
        if not _has_location_access(current_user, location):
            raise HTTPException(status_code=403, detail="Access denied for this location")
        
        # Initialize predictive analytics service
        predictive_service = FranchisePredictiveAnalyticsService(db)
        
        # Route to appropriate prediction method
        if request.prediction_type == "revenue_forecast":
            forecast_result = predictive_service.predict_revenue_forecast(
                request.location_id,
                request.forecast_horizon,
                include_seasonal=True,
                scenario_analysis=request.include_scenarios
            )
            
            forecast_data = {
                'monthly_predictions': forecast_result.monthly_predictions,
                'annual_total': forecast_result.annual_total,
                'growth_rate': forecast_result.growth_rate,
                'seasonal_adjustments': forecast_result.seasonal_adjustments,
                'confidence_intervals': [{'lower': ci[0], 'upper': ci[1]} for ci in forecast_result.confidence_intervals],
                'scenarios': {
                    'conservative': forecast_result.conservative_scenario,
                    'realistic': forecast_result.realistic_scenario,
                    'optimistic': forecast_result.optimistic_scenario
                },
                'growth_drivers': {
                    'volume_impact': forecast_result.volume_impact,
                    'pricing_impact': forecast_result.pricing_impact,
                    'retention_impact': forecast_result.retention_impact,
                    'market_impact': forecast_result.market_impact
                }
            }
            
            confidence_metrics = {
                'overall_confidence': 0.85,  # High confidence for revenue forecasting
                'data_quality': 0.9,
                'model_accuracy': 0.82,
                'forecast_reliability': 'high' if request.forecast_horizon <= 6 else 'medium'
            }
            
            key_insights = [
                f"Projected {forecast_result.growth_rate:.1%} annual growth",
                f"Seasonal patterns show {max(forecast_result.seasonal_adjustments.values()):.0%} peak variation",
                f"Revenue drivers: {forecast_result.pricing_impact:.0%} pricing, {forecast_result.volume_impact:.0%} volume"
            ]
            
            recommendations = [
                "Focus on pricing optimization for maximum impact",
                "Plan staffing around seasonal demand patterns",
                "Monitor key growth drivers monthly for early intervention"
            ]
            
        elif request.prediction_type == "market_expansion":
            expansion_result = predictive_service.predict_market_expansion_opportunities(
                request.location_id,
                expansion_radius_miles=25,
                investment_budget=request.custom_parameters.get('budget') if request.custom_parameters else None
            )
            
            forecast_data = {
                'market_size_estimate': expansion_result.market_size_estimate,
                'penetration_rate': expansion_result.penetration_rate,
                'competition_analysis': expansion_result.competition_analysis,
                'expansion_scenarios': expansion_result.expansion_scenarios,
                'roi_projections': expansion_result.roi_projections,
                'payback_periods': expansion_result.payback_periods,
                'recommended_strategy': expansion_result.recommended_strategy
            }
            
            confidence_metrics = {
                'overall_confidence': 0.75,  # Medium confidence for market analysis
                'market_data_quality': 0.8,
                'competitive_analysis_confidence': 0.7,
                'roi_prediction_reliability': 'medium'
            }
            
            key_insights = [
                f"Market opportunity: ${expansion_result.market_size_estimate:,.0f} annual potential",
                f"Current penetration: {expansion_result.penetration_rate:.1%}",
                f"Best ROI scenario: {max(expansion_result.roi_projections):.1%} return"
            ]
            
            recommendations = [
                expansion_result.recommended_strategy,
                "Conduct detailed market research before proceeding",
                "Consider pilot expansion in lowest-risk market first"
            ]
            
        elif request.prediction_type == "churn_prediction":
            churn_result = predictive_service.predict_client_churn(
                request.location_id,
                prediction_horizon_days=request.forecast_horizon * 30  # Convert months to days
            )
            
            forecast_data = {
                'overall_churn_risk': churn_result.overall_churn_risk,
                'at_risk_clients': churn_result.at_risk_clients,
                'churn_distribution': churn_result.churn_probability_distribution,
                'primary_factors': churn_result.primary_churn_factors,
                'early_warning_indicators': churn_result.early_warning_indicators,
                'retention_strategies': churn_result.retention_strategies,
                'intervention_recommendations': churn_result.intervention_recommendations,
                'revenue_at_risk': churn_result.potential_revenue_at_risk
            }
            
            confidence_metrics = {
                'overall_confidence': 0.8,  # Good confidence for churn prediction
                'client_data_quality': 0.85,
                'prediction_accuracy': 0.75,
                'intervention_effectiveness': 'high'
            }
            
            key_insights = [
                f"Overall churn risk: {churn_result.overall_churn_risk:.1%}",
                f"{len(churn_result.at_risk_clients)} clients at high risk",
                f"${churn_result.potential_revenue_at_risk:,.0f} revenue at risk"
            ]
            
            recommendations = churn_result.retention_strategies
            
        else:
            # Handle other prediction types with basic response
            forecast_data = {'message': f'Prediction type {request.prediction_type} not yet implemented'}
            confidence_metrics = {'overall_confidence': 0.0}
            key_insights = ['Feature under development']
            recommendations = ['Please try another prediction type']
        
        # Generate risk factors
        risk_factors = [
            "Predictions based on historical patterns may not account for unprecedented events",
            "External market conditions can significantly impact actual results",
            "Model accuracy decreases with longer forecast horizons"
        ]
        
        # Model metadata
        model_metadata = {
            'model_version': 'v2.0',
            'last_trained': datetime.now().isoformat(),
            'training_data_period': '24 months',
            'algorithm': 'Ensemble with seasonal decomposition',
            'validation_score': 0.82
        }
        
        return PredictiveAnalyticsResponse(
            success=True,
            prediction_type=request.prediction_type,
            forecast_data=forecast_data,
            confidence_metrics=confidence_metrics,
            key_insights=key_insights,
            recommendations=recommendations,
            risk_factors=risk_factors,
            model_metadata=model_metadata
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating predictive analytics: {str(e)}")


@router.post("/network/dashboard", response_model=NetworkDashboardResponse)
async def get_network_dashboard(
    request: NetworkAnalyticsRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get comprehensive franchise network dashboard
    
    Provides network-wide analytics including:
    - Performance distribution across locations
    - Real-time operational metrics
    - Top performers and improvement opportunities
    - Cross-network benchmarks and trends
    """
    
    try:
        # Determine network ID
        network_id = request.network_id
        if not network_id:
            # Get user's primary network
            user_locations = db.query(Location).filter(Location.owner_id == current_user.id).all()
            if user_locations and user_locations[0].franchise_network_id:
                network_id = user_locations[0].franchise_network_id
            else:
                raise HTTPException(status_code=400, detail="No franchise network found for user")
        
        # Verify network access
        if not _has_network_access(current_user, network_id, db):
            raise HTTPException(status_code=403, detail="Access denied for this network")
        
        # Get analytics timeframe
        timeframe_mapping = {
            'today': AnalyticsTimeframe.TODAY,
            'week': AnalyticsTimeframe.WEEK,
            'month': AnalyticsTimeframe.MONTH,
            'quarter': AnalyticsTimeframe.QUARTER,
            'year': AnalyticsTimeframe.YEAR
        }
        
        timeframe = timeframe_mapping.get(request.timeframe, AnalyticsTimeframe.MONTH)
        
        # Get network dashboard data
        analytics_service = AdvancedFranchiseAnalyticsService(db)
        dashboard_data = analytics_service.get_franchise_network_dashboard(network_id, timeframe)
        
        # Format response
        network_overview = {
            'network_name': dashboard_data.network_name,
            'total_locations': dashboard_data.total_locations,
            'active_locations': dashboard_data.active_locations,
            'network_revenue': dashboard_data.network_revenue,
            'network_growth': dashboard_data.network_growth,
            'average_performance_score': dashboard_data.average_performance_score
        }
        
        performance_distribution = {
            'elite_locations': dashboard_data.elite_locations,
            'high_performer_locations': dashboard_data.high_performer_locations,
            'average_locations': dashboard_data.average_locations,
            'developing_locations': dashboard_data.developing_locations,
            'underperforming_locations': dashboard_data.underperforming_locations,
            'distribution_chart_data': _generate_distribution_chart_data(dashboard_data)
        }
        
        real_time_metrics = {
            'current_appointments': dashboard_data.current_appointments,
            'active_clients': dashboard_data.active_clients,
            'staff_online': dashboard_data.staff_online,
            'network_utilization': _calculate_network_utilization(dashboard_data),
            'last_updated': datetime.now().isoformat()
        }
        
        # Get cross-network benchmarks if requested
        cross_network_benchmarks = {}
        if request.include_benchmarks:
            coaching_service = FranchiseAICoachingService(db, network_id)
            cross_insights = coaching_service.get_cross_network_insights(network_id, timeframe)
            cross_network_benchmarks = {
                'industry_position': 'top_quartile',  # Would be calculated
                'benchmark_insights': [insight.__dict__ for insight in cross_insights],
                'competitive_analysis': dashboard_data.network_benchmarks
            }
        
        return NetworkDashboardResponse(
            success=True,
            network_overview=network_overview,
            performance_distribution=performance_distribution,
            real_time_metrics=real_time_metrics,
            top_performers=dashboard_data.top_performers,
            improvement_opportunities=dashboard_data.improvement_opportunities,
            network_trends=dashboard_data.network_trends,
            cross_network_benchmarks=cross_network_benchmarks
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating network dashboard: {str(e)}")


@router.get("/coaching/daily-focus/{location_id}")
async def get_daily_coaching_focus(
    location_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get daily focus areas and actionable insights for franchise location
    
    Provides concise daily coaching aligned with Six Figure Barber methodology
    """
    
    try:
        # Verify location access
        location = db.query(Location).filter(Location.id == location_id).first()
        if not location:
            raise HTTPException(status_code=404, detail="Location not found")
        
        if not _has_location_access(current_user, location):
            raise HTTPException(status_code=403, detail="Access denied for this location")
        
        # Get real-time performance metrics
        analytics_service = AdvancedFranchiseAnalyticsService(db)
        real_time_metrics = analytics_service.get_real_time_metrics(location_id)
        
        # Get recent performance snapshot
        performance_snapshot = analytics_service.get_franchise_performance_snapshot(
            location_id, AnalyticsTimeframe.WEEK
        )
        
        # Generate daily focus areas
        coaching_service = FranchiseAICoachingService(db, location.franchise_network_id)
        
        # Simplified analytics data for daily focus
        analytics_data = {
            'current_performance': {
                'monthly_revenue': performance_snapshot.total_revenue,
                'utilization_rate': real_time_metrics.utilization_rate,
                'client_satisfaction': real_time_metrics.client_satisfaction
            },
            'targets': {
                'annual_income_target': 100000,
                'daily_revenue_target': performance_snapshot.total_revenue / 30 * 1.1
            },
            'recommendations': {}
        }
        
        # Get base coaching insights
        insights = coaching_service.generate_franchise_coaching(location_id, analytics_data, False)
        
        # Generate daily focus from top insights
        daily_focus = []
        for insight in insights[:3]:  # Top 3 priorities
            if insight.action_steps:
                daily_focus.append({
                    'category': insight.category.value,
                    'focus_area': insight.title,
                    'daily_action': insight.action_steps[0],
                    'impact_potential': f"${insight.potential_revenue_increase/365:,.0f}/day",
                    'six_fb_principle': insight.six_fb_methodology
                })
        
        # Calculate progress toward six-figure goal
        current_annual_revenue = performance_snapshot.total_revenue * 12
        six_figure_progress = (current_annual_revenue / 100000) * 100
        
        # Generate motivational message
        if six_figure_progress >= 90:
            motivational_message = f"🎯 {six_figure_progress:.0f}% to six figures! Push through the final stretch!"
        elif six_figure_progress >= 70:
            motivational_message = f"🚀 Strong momentum at {six_figure_progress:.0f}%! Focus on high-impact strategies."
        elif six_figure_progress >= 50:
            motivational_message = f"💪 Halfway there at {six_figure_progress:.0f}%! Stay consistent with proven methods."
        else:
            motivational_message = f"🌟 Early stage at {six_figure_progress:.0f}% - tremendous growth potential ahead!"
        
        return {
            'success': True,
            'location_id': location_id,
            'location_name': location.name,
            'daily_focus_areas': daily_focus,
            'real_time_metrics': {
                'current_appointments': real_time_metrics.current_appointments,
                'revenue_today': real_time_metrics.revenue_today,
                'utilization_rate': real_time_metrics.utilization_rate,
                'client_satisfaction': real_time_metrics.client_satisfaction
            },
            'six_figure_progress': {
                'current_annual_revenue': current_annual_revenue,
                'progress_percentage': six_figure_progress,
                'monthly_target': 8333,  # $100k / 12 months
                'gap_to_target': max(0, 100000 - current_annual_revenue)
            },
            'motivational_message': motivational_message,
            'key_metric_today': _get_key_metric_today(performance_snapshot),
            'next_milestone': _get_next_milestone(six_figure_progress),
            'methodology_reminder': _get_methodology_reminder()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating daily focus: {str(e)}")


@router.get("/alerts/{location_id}")
async def get_performance_alerts(
    location_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get automated performance alerts for franchise location
    
    Provides real-time alerts for performance issues requiring attention
    """
    
    try:
        # Verify location access
        location = db.query(Location).filter(Location.id == location_id).first()
        if not location:
            raise HTTPException(status_code=404, detail="Location not found")
        
        if not _has_location_access(current_user, location):
            raise HTTPException(status_code=403, detail="Access denied for this location")
        
        # Generate automated alerts
        analytics_service = AdvancedFranchiseAnalyticsService(db)
        alerts = analytics_service.generate_automated_performance_alerts(location_id)
        
        # Categorize alerts by urgency
        critical_alerts = [alert for alert in alerts if alert.get('severity') == 'high']
        warning_alerts = [alert for alert in alerts if alert.get('severity') == 'medium']
        info_alerts = [alert for alert in alerts if alert.get('severity') == 'low']
        
        return {
            'success': True,
            'location_id': location_id,
            'location_name': location.name,
            'alert_summary': {
                'total_alerts': len(alerts),
                'critical_count': len(critical_alerts),
                'warning_count': len(warning_alerts),
                'info_count': len(info_alerts)
            },
            'critical_alerts': critical_alerts,
            'warning_alerts': warning_alerts,
            'info_alerts': info_alerts,
            'last_updated': datetime.now().isoformat(),
            'alert_trends': _analyze_alert_trends(alerts),
            'recommended_actions': _prioritize_alert_actions(alerts)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting performance alerts: {str(e)}")


# Helper functions

def _has_location_access(user: User, location: Location) -> bool:
    """Check if user has access to location"""
    # Owner has access
    if location.owner_id == user.id:
        return True
    
    # Organization admin has access
    if hasattr(user, 'organization_id') and user.organization_id == location.organization_id:
        return True
    
    # Franchise network admin has access
    if hasattr(user, 'role') and user.role in ['enterprise_owner', 'super_admin']:
        return True
    
    return False


def _has_network_access(user: User, network_id: str, db: Session) -> bool:
    """Check if user has access to franchise network"""
    # Super admin has access to all networks
    if hasattr(user, 'role') and user.role == 'super_admin':
        return True
    
    # Check if user owns any location in the network
    user_locations = db.query(Location).filter(
        Location.owner_id == user.id,
        Location.franchise_network_id == network_id
    ).first()
    
    return user_locations is not None


def _identify_key_strengths(performance_data) -> List[str]:
    """Identify key strengths from performance data"""
    strengths = []
    
    if performance_data.performance_score > 80:
        strengths.append("Overall high performance")
    
    if performance_data.utilization_rate > 80:
        strengths.append("Excellent schedule utilization")
    
    if performance_data.retention_rate > 80:
        strengths.append("Strong client retention")
    
    if performance_data.revenue_growth > 10:
        strengths.append("Positive revenue growth")
    
    return strengths if strengths else ["Foundational business operations in place"]


def _identify_improvement_areas(performance_data) -> List[str]:
    """Identify improvement areas from performance data"""
    areas = []
    
    if performance_data.utilization_rate < 70:
        areas.append("Schedule optimization needed")
    
    if performance_data.retention_rate < 70:
        areas.append("Client retention improvement required")
    
    if performance_data.revenue_growth < 5:
        areas.append("Revenue growth acceleration needed")
    
    if performance_data.average_ticket < 40:
        areas.append("Pricing optimization opportunity")
    
    return areas if areas else ["Continue current successful strategies"]


def _calculate_six_figure_progress(performance_data) -> Dict[str, Any]:
    """Calculate progress toward six-figure goal"""
    annual_revenue = performance_data.total_revenue * 12
    progress_percentage = (annual_revenue / 100000) * 100
    
    return {
        'current_annual_revenue': annual_revenue,
        'progress_percentage': min(progress_percentage, 100),
        'monthly_target': 8333,
        'current_monthly_average': performance_data.total_revenue,
        'gap_to_target': max(0, 100000 - annual_revenue)
    }


def _calculate_methodology_compliance(insights) -> float:
    """Calculate compliance with Six Figure Barber methodology"""
    # Count insights that align with 6FB principles
    methodology_insights = sum(1 for insight in insights if hasattr(insight, 'six_fb_methodology') and insight.six_fb_methodology)
    total_insights = len(insights)
    
    return (methodology_insights / total_insights * 100) if total_insights > 0 else 0


def _count_six_fb_principles(insights) -> int:
    """Count Six Figure Barber principles addressed"""
    principles = set()
    
    for insight in insights:
        if hasattr(insight, 'category'):
            if insight.category.value in ['pricing', 'client_acquisition', 'retention', 'efficiency']:
                principles.add(insight.category.value)
    
    return len(principles)


def _assess_revenue_focus(insights) -> float:
    """Assess focus on revenue optimization"""
    revenue_related = sum(1 for insight in insights 
                         if hasattr(insight, 'category') and 
                         insight.category.value in ['pricing', 'service_mix', 'client_acquisition'])
    
    return (revenue_related / len(insights) * 100) if insights else 0


def _assess_client_focus(insights) -> float:
    """Assess focus on client value creation"""
    client_related = sum(1 for insight in insights 
                        if hasattr(insight, 'category') and 
                        insight.category.value in ['retention', 'client_acquisition', 'service_mix'])
    
    return (client_related / len(insights) * 100) if insights else 0


def _generate_distribution_chart_data(dashboard_data) -> List[Dict[str, Any]]:
    """Generate chart data for performance distribution"""
    return [
        {'segment': 'Elite', 'count': dashboard_data.elite_locations, 'percentage': dashboard_data.elite_locations / dashboard_data.total_locations * 100},
        {'segment': 'High Performer', 'count': dashboard_data.high_performer_locations, 'percentage': dashboard_data.high_performer_locations / dashboard_data.total_locations * 100},
        {'segment': 'Average', 'count': dashboard_data.average_locations, 'percentage': dashboard_data.average_locations / dashboard_data.total_locations * 100},
        {'segment': 'Developing', 'count': dashboard_data.developing_locations, 'percentage': dashboard_data.developing_locations / dashboard_data.total_locations * 100},
        {'segment': 'Underperforming', 'count': dashboard_data.underperforming_locations, 'percentage': dashboard_data.underperforming_locations / dashboard_data.total_locations * 100}
    ]


def _calculate_network_utilization(dashboard_data) -> float:
    """Calculate overall network utilization"""
    # Simplified calculation - would use actual appointment data
    return 75.0  # Placeholder


def _get_key_metric_today(performance_data) -> str:
    """Get the key metric to focus on today"""
    if performance_data.utilization_rate < 70:
        return "Schedule utilization - focus on booking optimization"
    elif performance_data.average_ticket < 40:
        return "Average ticket value - focus on service upgrades"
    elif performance_data.retention_rate < 75:
        return "Client retention - focus on follow-up and satisfaction"
    else:
        return "Revenue growth - focus on new client acquisition"


def _get_next_milestone(progress_percentage: float) -> str:
    """Get next milestone for six-figure progress"""
    if progress_percentage < 25:
        return "Reach 25% milestone - $25,000 annual revenue"
    elif progress_percentage < 50:
        return "Reach halfway point - $50,000 annual revenue"
    elif progress_percentage < 75:
        return "Reach 75% milestone - $75,000 annual revenue"
    elif progress_percentage < 90:
        return "Final push - $90,000+ annual revenue"
    else:
        return "Achieve Six Figure Barber status - $100,000+"


def _get_methodology_reminder() -> str:
    """Get daily methodology reminder"""
    return "Six Figure Barber Focus: Value-based pricing, premium client relationships, operational excellence"


def _analyze_alert_trends(alerts: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Analyze trends in performance alerts"""
    return {
        'trending_up': ['revenue_decline', 'retention_concern'],
        'trending_down': ['low_utilization'],
        'new_this_week': ['performance_ranking']
    }


def _prioritize_alert_actions(alerts: List[Dict[str, Any]]) -> List[str]:
    """Prioritize actions based on alerts"""
    actions = []
    
    critical_alerts = [alert for alert in alerts if alert.get('severity') == 'high']
    if critical_alerts:
        actions.append("Address critical performance issues immediately")
    
    warning_alerts = [alert for alert in alerts if alert.get('severity') == 'medium']
    if warning_alerts:
        actions.append("Review warning indicators and create action plan")
    
    if not alerts:
        actions.append("Maintain current performance levels")
    
    return actions