"""
AI Analytics API Endpoints
Provides intelligent revenue insights and optimization recommendations
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from datetime import date, datetime, timedelta
from pydantic import BaseModel, Field

from database import get_db
from services.ai_revenue_analytics_service import AIRevenueAnalyticsService
from services.auth_service import get_current_user
from models.user import User
from models.barber import Barber

router = APIRouter()


# Request/Response Models
class RevenuePatternResponse(BaseModel):
    pattern_type: str
    pattern_name: str
    confidence_score: float
    pattern_description: str
    avg_revenue_impact: float
    frequency: str
    recommendations: List[str]


class RevenuePredictionResponse(BaseModel):
    date: date
    predicted_revenue: float
    confidence_interval_low: float
    confidence_interval_high: float
    confidence_score: float
    predicted_appointments: int
    factors: Dict[str, float]


class PricingOptimizationResponse(BaseModel):
    service_name: str
    current_price: float
    recommended_price: float
    expected_revenue_change: float
    expected_demand_change: float
    confidence_score: float
    recommendation_reason: str
    implementation_tips: List[str]


class ClientSegmentResponse(BaseModel):
    segment_name: str
    segment_type: str
    description: str
    size: int
    avg_lifetime_value: float
    avg_visit_frequency: float
    engagement_strategies: List[str]
    revenue_contribution_percentage: float
    growth_potential: str


class RevenueInsightResponse(BaseModel):
    insight_type: str
    category: str
    title: str
    description: str
    potential_impact: float
    priority: str
    recommendations: List[str]
    confidence_score: float


class PerformanceBenchmarkResponse(BaseModel):
    metric: str
    your_value: float
    peer_average: float
    percentile: float
    status: str  # above_average, average, below_average
    improvement_tips: List[str]


class OptimizationGoalResponse(BaseModel):
    goal_type: str
    goal_name: str
    description: str
    current_value: float
    target_value: float
    target_date: date
    progress_percentage: float
    recommended_actions: List[str]
    estimated_difficulty: str
    success_probability: float


class AIAnalyticsDashboardResponse(BaseModel):
    revenue_patterns: List[RevenuePatternResponse]
    predictions: List[RevenuePredictionResponse]
    insights: List[RevenueInsightResponse]
    optimization_opportunities: Dict[str, Any]
    performance_score: float
    key_metrics: Dict[str, float]


@router.get("/patterns", response_model=List[RevenuePatternResponse])
async def get_revenue_patterns(
    lookback_days: int = Query(180, description="Days of historical data to analyze"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Analyze historical revenue data to identify patterns using machine learning
    """
    # Get barber profile
    barber = db.query(Barber).filter(Barber.user_id == current_user.id).first()
    if not barber:
        raise HTTPException(status_code=404, detail="Barber profile not found")

    # Initialize AI service
    ai_service = AIRevenueAnalyticsService(db)

    # Analyze patterns
    patterns = ai_service.analyze_revenue_patterns(barber.id, lookback_days)

    # Transform to response format
    response_patterns = []
    for pattern in patterns:
        # Generate actionable recommendations based on pattern
        recommendations = _generate_pattern_recommendations(pattern)

        response_patterns.append(
            RevenuePatternResponse(
                pattern_type=pattern["pattern_type"],
                pattern_name=pattern["pattern_name"],
                confidence_score=pattern["confidence_score"],
                pattern_description=_describe_pattern(pattern),
                avg_revenue_impact=pattern["avg_revenue_impact"],
                frequency=pattern["frequency"],
                recommendations=recommendations,
            )
        )

    return response_patterns


@router.get("/predictions", response_model=List[RevenuePredictionResponse])
async def get_revenue_predictions(
    days_ahead: int = Query(30, description="Number of days to predict"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get AI-powered revenue predictions for upcoming periods
    """
    # Get barber profile
    barber = db.query(Barber).filter(Barber.user_id == current_user.id).first()
    if not barber:
        raise HTTPException(status_code=404, detail="Barber profile not found")

    # Initialize AI service
    ai_service = AIRevenueAnalyticsService(db)

    # Generate predictions
    predictions = ai_service.predict_future_revenue(barber.id, days_ahead)

    # Transform to response format
    response_predictions = []
    for pred in predictions[:7]:  # Return first week of daily predictions
        response_predictions.append(
            RevenuePredictionResponse(
                date=pred["prediction_date"],
                predicted_revenue=pred["predicted_revenue"],
                confidence_interval_low=pred["confidence_interval_low"],
                confidence_interval_high=pred["confidence_interval_high"],
                confidence_score=pred["confidence_score"],
                predicted_appointments=pred["predicted_appointments"],
                factors=pred["factors_data"],
            )
        )

    return response_predictions


@router.get("/pricing-optimization", response_model=List[PricingOptimizationResponse])
async def get_pricing_optimization(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """
    Get AI-powered pricing optimization recommendations
    """
    # Get barber profile
    barber = db.query(Barber).filter(Barber.user_id == current_user.id).first()
    if not barber:
        raise HTTPException(status_code=404, detail="Barber profile not found")

    # Initialize AI service
    ai_service = AIRevenueAnalyticsService(db)

    # Get pricing recommendations
    recommendations = ai_service.optimize_pricing(barber.id)

    # Transform to response format
    response_recommendations = []
    for rec in recommendations:
        implementation_tips = _generate_pricing_implementation_tips(rec)

        response_recommendations.append(
            PricingOptimizationResponse(
                service_name=rec["service_name"],
                current_price=rec["current_price"],
                recommended_price=rec["recommended_price"],
                expected_revenue_change=rec["expected_revenue_change"],
                expected_demand_change=rec["expected_demand_change"],
                confidence_score=rec["confidence_score"],
                recommendation_reason=rec["recommendation_reason"],
                implementation_tips=implementation_tips,
            )
        )

    return response_recommendations


@router.get("/client-segments", response_model=List[ClientSegmentResponse])
async def get_client_segments(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """
    Get AI-identified client segments for targeted marketing
    """
    # Get barber profile
    barber = db.query(Barber).filter(Barber.user_id == current_user.id).first()
    if not barber:
        raise HTTPException(status_code=404, detail="Barber profile not found")

    # Initialize AI service
    ai_service = AIRevenueAnalyticsService(db)

    # Get client segments
    segments = ai_service.segment_clients(barber.id)

    # Transform to response format
    response_segments = []
    for segment in segments:
        growth_potential = _assess_growth_potential(segment)

        response_segments.append(
            ClientSegmentResponse(
                segment_name=segment["segment_name"],
                segment_type=segment["segment_type"],
                description=segment["description"],
                size=segment["size"],
                avg_lifetime_value=segment["avg_lifetime_value"],
                avg_visit_frequency=segment["avg_visit_frequency"],
                engagement_strategies=segment["engagement_strategy"].split(". "),
                revenue_contribution_percentage=(
                    segment["revenue_contribution"] / segment.get("total_revenue", 1)
                )
                * 100,
                growth_potential=growth_potential,
            )
        )

    return response_segments


@router.get("/insights", response_model=List[RevenueInsightResponse])
async def get_revenue_insights(
    limit: int = Query(10, description="Maximum number of insights to return"),
    category: Optional[str] = Query(None, description="Filter by category"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get AI-generated insights and recommendations
    """
    # Get barber profile
    barber = db.query(Barber).filter(Barber.user_id == current_user.id).first()
    if not barber:
        raise HTTPException(status_code=404, detail="Barber profile not found")

    # Initialize AI service
    ai_service = AIRevenueAnalyticsService(db)

    # Generate insights
    insights = ai_service.generate_insights(barber.id)

    # Filter by category if specified
    if category:
        insights = [i for i in insights if i.get("category") == category]

    # Transform to response format
    response_insights = []
    for insight in insights[:limit]:
        response_insights.append(
            RevenueInsightResponse(
                insight_type=insight["insight_type"],
                category=insight["category"],
                title=insight["title"],
                description=insight["description"],
                potential_impact=insight["potential_impact"],
                priority=insight["priority"],
                recommendations=insight["recommendations"],
                confidence_score=insight["confidence_score"],
            )
        )

    return response_insights


@router.get("/benchmark", response_model=List[PerformanceBenchmarkResponse])
async def get_performance_benchmark(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """
    Compare performance against industry peers
    """
    # Get barber profile
    barber = db.query(Barber).filter(Barber.user_id == current_user.id).first()
    if not barber:
        raise HTTPException(status_code=404, detail="Barber profile not found")

    # Initialize AI service
    ai_service = AIRevenueAnalyticsService(db)

    # Get benchmark data
    benchmark = ai_service.benchmark_performance(barber.id)

    # Transform to response format
    response_benchmarks = []

    # Revenue benchmark
    response_benchmarks.append(
        PerformanceBenchmarkResponse(
            metric="Monthly Revenue",
            your_value=benchmark["total_revenue"],
            peer_average=benchmark["peer_avg_revenue"],
            percentile=benchmark["revenue_percentile"],
            status=_get_benchmark_status(benchmark["revenue_percentile"]),
            improvement_tips=_get_improvement_tips(
                "revenue", benchmark["revenue_percentile"]
            ),
        )
    )

    # Efficiency benchmark
    response_benchmarks.append(
        PerformanceBenchmarkResponse(
            metric="Revenue Per Hour",
            your_value=benchmark.get("revenue_per_hour", 0),
            peer_average=benchmark.get("peer_avg_revenue_per_hour", 0),
            percentile=benchmark["efficiency_percentile"],
            status=_get_benchmark_status(benchmark["efficiency_percentile"]),
            improvement_tips=_get_improvement_tips(
                "efficiency", benchmark["efficiency_percentile"]
            ),
        )
    )

    # Growth benchmark
    response_benchmarks.append(
        PerformanceBenchmarkResponse(
            metric="Growth Rate",
            your_value=benchmark["revenue_growth_rate"],
            peer_average=benchmark.get("peer_avg_growth_rate", 0),
            percentile=benchmark["growth_percentile"],
            status=_get_benchmark_status(benchmark["growth_percentile"]),
            improvement_tips=_get_improvement_tips(
                "growth", benchmark["growth_percentile"]
            ),
        )
    )

    # Retention benchmark
    response_benchmarks.append(
        PerformanceBenchmarkResponse(
            metric="Client Retention",
            your_value=benchmark["client_retention_rate"],
            peer_average=benchmark.get("peer_avg_retention", 0),
            percentile=benchmark["retention_percentile"],
            status=_get_benchmark_status(benchmark["retention_percentile"]),
            improvement_tips=_get_improvement_tips(
                "retention", benchmark["retention_percentile"]
            ),
        )
    )

    return response_benchmarks


@router.get("/optimization-goals", response_model=List[OptimizationGoalResponse])
async def get_optimization_goals(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """
    Get AI-recommended optimization goals
    """
    # Get barber profile
    barber = db.query(Barber).filter(Barber.user_id == current_user.id).first()
    if not barber:
        raise HTTPException(status_code=404, detail="Barber profile not found")

    # Initialize AI service
    ai_service = AIRevenueAnalyticsService(db)

    # Create optimization goals
    goals = ai_service.create_optimization_goals(barber.id)

    # Transform to response format
    response_goals = []
    for goal in goals:
        response_goals.append(
            OptimizationGoalResponse(
                goal_type=goal["goal_type"],
                goal_name=goal["goal_name"],
                description=goal["description"],
                current_value=goal["current_value"],
                target_value=goal["target_value"],
                target_date=goal["target_date"],
                progress_percentage=goal["progress_percentage"],
                recommended_actions=goal["recommended_actions"],
                estimated_difficulty=goal["estimated_difficulty"],
                success_probability=goal["success_probability"],
            )
        )

    return response_goals


@router.get("/dashboard", response_model=AIAnalyticsDashboardResponse)
async def get_ai_analytics_dashboard(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """
    Get comprehensive AI analytics dashboard
    """
    # Get barber profile
    barber = db.query(Barber).filter(Barber.user_id == current_user.id).first()
    if not barber:
        raise HTTPException(status_code=404, detail="Barber profile not found")

    # Initialize AI service
    ai_service = AIRevenueAnalyticsService(db)

    # Gather all analytics data
    patterns = ai_service.analyze_revenue_patterns(barber.id, lookback_days=90)
    predictions = ai_service.predict_future_revenue(barber.id, days_ahead=7)
    insights = ai_service.generate_insights(barber.id)
    benchmark = ai_service.benchmark_performance(barber.id)

    # Calculate performance score
    performance_score = _calculate_performance_score(benchmark)

    # Key metrics
    key_metrics = {
        "predicted_weekly_revenue": sum(
            p["predicted_revenue"] for p in predictions[:7]
        ),
        "revenue_percentile": benchmark["revenue_percentile"],
        "growth_rate": benchmark["revenue_growth_rate"],
        "retention_rate": benchmark["client_retention_rate"],
        "utilization_rate": benchmark["booking_utilization"],
    }

    # Optimization opportunities
    optimization_opportunities = {
        "pricing": ai_service.optimize_pricing(barber.id)[:3],
        "scheduling": _get_scheduling_opportunities(patterns),
        "client_segments": ai_service.segment_clients(barber.id)[:3],
    }

    return AIAnalyticsDashboardResponse(
        revenue_patterns=[_transform_pattern(p) for p in patterns[:5]],
        predictions=[_transform_prediction(p) for p in predictions[:7]],
        insights=[_transform_insight(i) for i in insights[:5]],
        optimization_opportunities=optimization_opportunities,
        performance_score=performance_score,
        key_metrics=key_metrics,
    )


# Helper functions
def _describe_pattern(pattern: Dict[str, Any]) -> str:
    """Generate human-readable pattern description"""
    pattern_type = pattern["pattern_type"]
    data = pattern["pattern_data"]

    if pattern_type == "weekly":
        return f"Your best revenue day is {data['best_day']} (${data['best_day_avg']:.0f}) and worst is {data['worst_day']} (${data['worst_day_avg']:.0f})"
    elif pattern_type == "monthly":
        return f"Revenue peaks at the {data['peak_period']} of each month"
    elif pattern_type == "seasonal":
        return f"Clear seasonal pattern detected with {data['trend_direction']} trend"
    elif pattern_type == "trend":
        direction = data["direction"]
        rate = abs(data["monthly_growth_rate"])
        return f"Revenue is {direction} by ${rate:.0f} per month"
    else:
        return "Unusual revenue pattern detected"


def _generate_pattern_recommendations(pattern: Dict[str, Any]) -> List[str]:
    """Generate actionable recommendations based on pattern"""
    recommendations = []
    pattern_type = pattern["pattern_type"]
    data = pattern["pattern_data"]

    if pattern_type == "weekly":
        recommendations.append(
            f"Schedule marketing campaigns for {data['worst_day']} to boost bookings"
        )
        recommendations.append(
            f"Offer special promotions on slow days to balance weekly revenue"
        )
        recommendations.append(
            f"Consider premium pricing for {data['best_day']} appointments"
        )
    elif pattern_type == "monthly":
        if data["peak_period"] == "end":
            recommendations.append("Target mid-month promotions to smooth revenue flow")
            recommendations.append(
                "Implement subscription services for steady monthly income"
            )
    elif pattern_type == "trend" and data["direction"] == "decreasing":
        recommendations.append("Launch client win-back campaign immediately")
        recommendations.append("Review and optimize service pricing")
        recommendations.append("Increase social media marketing efforts")

    return recommendations


def _generate_pricing_implementation_tips(recommendation: Dict[str, Any]) -> List[str]:
    """Generate tips for implementing pricing changes"""
    tips = []
    price_change = recommendation["recommended_price"] - recommendation["current_price"]

    if price_change > 0:
        tips.append("Announce price change 2-4 weeks in advance")
        tips.append("Emphasize value improvements or new benefits")
        tips.append("Offer loyalty discounts to regular clients")
    else:
        tips.append("Promote limited-time pricing to create urgency")
        tips.append("Bundle with other services for better value perception")
        tips.append("Track booking increases to validate strategy")

    return tips


def _assess_growth_potential(segment: Dict[str, Any]) -> str:
    """Assess growth potential of a client segment"""
    if segment["churn_risk"] > 0.7:
        return "High Risk - Immediate Action Needed"
    elif segment["growth_rate"] > 0.1:
        return "High Growth - Capitalize on Momentum"
    elif segment["avg_lifetime_value"] > segment.get("avg_ltv_all_clients", 0) * 1.5:
        return "High Value - Nurture Carefully"
    else:
        return "Moderate - Standard Engagement"


def _get_benchmark_status(percentile: float) -> str:
    """Get status based on percentile ranking"""
    if percentile >= 75:
        return "above_average"
    elif percentile >= 25:
        return "average"
    else:
        return "below_average"


def _get_improvement_tips(metric: str, percentile: float) -> List[str]:
    """Get improvement tips based on metric and performance"""
    tips = []

    if percentile < 50:
        if metric == "revenue":
            tips.extend(
                [
                    "Focus on increasing average ticket size",
                    "Implement upselling strategies",
                    "Add high-margin retail products",
                ]
            )
        elif metric == "efficiency":
            tips.extend(
                [
                    "Optimize appointment scheduling",
                    "Reduce time between appointments",
                    "Streamline service delivery",
                ]
            )
        elif metric == "growth":
            tips.extend(
                [
                    "Launch referral program",
                    "Increase marketing efforts",
                    "Focus on client retention",
                ]
            )
        elif metric == "retention":
            tips.extend(
                [
                    "Implement loyalty program",
                    "Send personalized follow-ups",
                    "Improve service consistency",
                ]
            )

    return tips[:3]


def _calculate_performance_score(benchmark: Dict[str, Any]) -> float:
    """Calculate overall performance score"""
    weights = {
        "revenue_percentile": 0.3,
        "efficiency_percentile": 0.2,
        "growth_percentile": 0.3,
        "retention_percentile": 0.2,
    }

    score = sum(
        benchmark.get(f"{metric}_percentile", 50) * weight
        for metric, weight in weights.items()
    )

    return round(score, 1)


def _get_scheduling_opportunities(
    patterns: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    """Extract scheduling opportunities from patterns"""
    opportunities = []

    for pattern in patterns:
        if pattern["pattern_type"] == "weekly":
            data = pattern["pattern_data"]
            opportunities.append(
                {
                    "opportunity": "Day optimization",
                    "description": f"Shift capacity from {data['best_day']} to {data['worst_day']}",
                    "potential_impact": pattern["avg_revenue_impact"] * 0.5,
                }
            )

    return opportunities


def _transform_pattern(pattern: Dict[str, Any]) -> RevenuePatternResponse:
    """Transform pattern to response format"""
    return RevenuePatternResponse(
        pattern_type=pattern["pattern_type"],
        pattern_name=pattern["pattern_name"],
        confidence_score=pattern["confidence_score"],
        pattern_description=_describe_pattern(pattern),
        avg_revenue_impact=pattern["avg_revenue_impact"],
        frequency=pattern["frequency"],
        recommendations=_generate_pattern_recommendations(pattern),
    )


def _transform_prediction(prediction: Dict[str, Any]) -> RevenuePredictionResponse:
    """Transform prediction to response format"""
    return RevenuePredictionResponse(
        date=prediction["prediction_date"],
        predicted_revenue=prediction["predicted_revenue"],
        confidence_interval_low=prediction["confidence_interval_low"],
        confidence_interval_high=prediction["confidence_interval_high"],
        confidence_score=prediction["confidence_score"],
        predicted_appointments=prediction["predicted_appointments"],
        factors=prediction["factors_data"],
    )


def _transform_insight(insight: Dict[str, Any]) -> RevenueInsightResponse:
    """Transform insight to response format"""
    return RevenueInsightResponse(
        insight_type=insight["insight_type"],
        category=insight["category"],
        title=insight["title"],
        description=insight["description"],
        potential_impact=insight["potential_impact"],
        priority=insight["priority"],
        recommendations=insight["recommendations"],
        confidence_score=insight["confidence_score"],
    )
