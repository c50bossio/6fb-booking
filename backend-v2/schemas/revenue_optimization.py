"""
Revenue Optimization Schemas - Six Figure Barber Revenue Maximization
====================================================================

Pydantic response schemas for the Revenue Optimization Engine API endpoints.
Provides comprehensive data models for service profitability, optimization plans,
revenue forecasting, and market positioning analysis.
"""

from datetime import datetime, date
from typing import Dict, List, Optional, Any, Tuple
from pydantic import BaseModel, Field
from enum import Enum

from services.revenue_optimization_service import (
    ServiceProfitabilityAnalysis,
    RevenueOptimizationPlan,
    RevenueForecast,
    MarketPositioningAnalysis,
    RevenueOptimizationStrategy,
    RevenueGoalStatus,
    ServiceTier
)

class ServiceTierEnum(str, Enum):
    """Service tier enumeration for API validation"""
    BASIC = "basic"
    PREMIUM = "premium"
    LUXURY = "luxury"
    SIGNATURE = "signature"

class RevenueGoalStatusEnum(str, Enum):
    """Revenue goal status enumeration"""
    EARLY_STAGE = "early_stage"
    BUILDING = "building"
    ACCELERATING = "accelerating"
    APPROACHING = "approaching"
    SIX_FIGURE = "six_figure"
    EXCEEDED = "exceeded"

class OptimizationStrategyEnum(str, Enum):
    """Optimization strategy enumeration"""
    SERVICE_MIX_OPTIMIZATION = "service_mix_optimization"
    PRICING_STRATEGY_OPTIMIZATION = "pricing_strategy_optimization"
    CLIENT_VALUE_MAXIMIZATION = "client_value_maximization"
    CAPACITY_UTILIZATION = "capacity_utilization"
    PREMIUM_POSITIONING = "premium_positioning"
    UPSELLING_AUTOMATION = "upselling_automation"
    SEASONAL_OPTIMIZATION = "seasonal_optimization"

# Request Models

class OptimizationStrategyRequest(BaseModel):
    """Request model for optimization strategy updates"""
    primary_strategy: Optional[OptimizationStrategyEnum] = None
    target_annual_revenue: Optional[float] = Field(None, ge=0, description="Target annual revenue")
    optimization_timeline: Optional[str] = Field(None, description="Implementation timeline")
    focus_areas: Optional[List[str]] = Field(None, description="Specific areas to focus on")

class ForecastParametersRequest(BaseModel):
    """Request model for custom forecast parameters"""
    forecast_months: int = Field(12, ge=3, le=24, description="Forecast period in months")
    growth_rate_assumption: Optional[float] = Field(None, description="Custom growth rate assumption")
    seasonal_factors: Optional[Dict[str, float]] = Field(None, description="Custom seasonal adjustments")
    optimization_impact: Optional[float] = Field(None, description="Expected optimization impact")

# Response Models

class ServiceProfitabilityResponse(BaseModel):
    """Response model for service profitability analysis"""
    service_id: int
    service_name: str
    
    # Financial metrics
    average_price: float
    total_revenue: float
    total_bookings: int
    revenue_per_hour: float
    
    # Cost and margin analysis
    estimated_cost_per_service: float
    gross_margin: float
    gross_margin_percentage: float
    
    # Performance metrics
    booking_frequency: float
    client_satisfaction_score: float
    repeat_booking_rate: float
    
    # Market positioning
    market_position: ServiceTierEnum
    competitive_analysis: Dict[str, float]
    pricing_optimization_opportunity: float
    
    # Six Figure methodology scores
    value_perception_score: float
    premium_positioning_score: float
    upselling_potential: float
    
    # Optimization recommendations
    recommended_price: float
    expected_revenue_lift: float
    implementation_timeline: str
    
    # Risk assessment
    price_sensitivity: float
    demand_elasticity: float
    competitive_risk: str = Field(..., description="low, medium, or high")
    
    @classmethod
    def from_analysis(cls, analysis: ServiceProfitabilityAnalysis) -> "ServiceProfitabilityResponse":
        """Convert service analysis to response model"""
        return cls(
            service_id=analysis.service_id,
            service_name=analysis.service_name,
            average_price=analysis.average_price,
            total_revenue=analysis.total_revenue,
            total_bookings=analysis.total_bookings,
            revenue_per_hour=analysis.revenue_per_hour,
            estimated_cost_per_service=analysis.estimated_cost_per_service,
            gross_margin=analysis.gross_margin,
            gross_margin_percentage=analysis.gross_margin_percentage,
            booking_frequency=analysis.booking_frequency,
            client_satisfaction_score=analysis.client_satisfaction_score,
            repeat_booking_rate=analysis.repeat_booking_rate,
            market_position=analysis.market_position.value,
            competitive_analysis=analysis.competitive_analysis,
            pricing_optimization_opportunity=analysis.pricing_optimization_opportunity,
            value_perception_score=analysis.value_perception_score,
            premium_positioning_score=analysis.premium_positioning_score,
            upselling_potential=analysis.upselling_potential,
            recommended_price=analysis.recommended_price,
            expected_revenue_lift=analysis.expected_revenue_lift,
            implementation_timeline=analysis.implementation_timeline,
            price_sensitivity=analysis.price_sensitivity,
            demand_elasticity=analysis.demand_elasticity,
            competitive_risk="low" if analysis.competitive_risk < 0.3 else "medium" if analysis.competitive_risk < 0.6 else "high"
        )

class RevenueOptimizationPlanResponse(BaseModel):
    """Response model for comprehensive revenue optimization plan"""
    barber_id: int
    current_annual_revenue: float
    target_annual_revenue: float
    goal_status: RevenueGoalStatusEnum
    
    # Performance metrics
    monthly_revenue_trend: List[float]
    revenue_growth_rate: float
    months_to_six_figure: Optional[int]
    
    # Strategy and optimizations
    primary_strategy: OptimizationStrategyEnum
    service_optimizations: List[ServiceProfitabilityResponse]
    pricing_adjustments: Dict[str, float]
    
    # Service recommendations
    services_to_promote: List[str]
    services_to_phase_out: List[str]
    new_services_to_add: List[str]
    
    # Client strategy
    target_client_segments: List[str]
    upselling_opportunities: List[str]
    retention_priorities: List[str]
    
    # Implementation roadmap
    immediate_actions: List[str]
    short_term_goals: List[str]
    long_term_strategy: List[str]
    
    # Financial projections
    projected_monthly_revenue: List[float]
    confidence_interval: Tuple[float, float]
    expected_roi: float
    investment_required: float
    
    # Six Figure methodology
    methodology_compliance_score: float
    value_creation_opportunities: List[str]
    brand_positioning_recommendations: List[str]
    
    @classmethod
    def from_plan(cls, plan: RevenueOptimizationPlan) -> "RevenueOptimizationPlanResponse":
        """Convert optimization plan to response model"""
        return cls(
            barber_id=plan.barber_id,
            current_annual_revenue=plan.current_annual_revenue,
            target_annual_revenue=plan.target_annual_revenue,
            goal_status=plan.goal_status.value,
            monthly_revenue_trend=plan.monthly_revenue_trend,
            revenue_growth_rate=plan.revenue_growth_rate,
            months_to_six_figure=plan.months_to_six_figure,
            primary_strategy=plan.primary_strategy.value,
            service_optimizations=[
                ServiceProfitabilityResponse.from_analysis(s) for s in plan.service_optimizations
            ],
            pricing_adjustments=plan.pricing_adjustments,
            services_to_promote=plan.services_to_promote,
            services_to_phase_out=plan.services_to_phase_out,
            new_services_to_add=plan.new_services_to_add,
            target_client_segments=plan.target_client_segments,
            upselling_opportunities=plan.upselling_opportunities,
            retention_priorities=plan.retention_priorities,
            immediate_actions=plan.immediate_actions,
            short_term_goals=plan.short_term_goals,
            long_term_strategy=plan.long_term_strategy,
            projected_monthly_revenue=plan.projected_monthly_revenue,
            confidence_interval=plan.confidence_interval,
            expected_roi=plan.expected_roi,
            investment_required=plan.investment_required,
            methodology_compliance_score=plan.methodology_compliance_score,
            value_creation_opportunities=plan.value_creation_opportunities,
            brand_positioning_recommendations=plan.brand_positioning_recommendations
        )

class RevenueForecastResponse(BaseModel):
    """Response model for ML-driven revenue forecasting"""
    barber_id: int
    forecast_period: str
    
    # Base forecasting
    predicted_revenue: List[float]
    confidence_intervals: List[Tuple[float, float]]
    seasonal_adjustments: Dict[str, float]
    
    # Scenario analysis
    conservative_scenario: List[float]
    optimistic_scenario: List[float]
    stretch_scenario: List[float]
    
    # Growth factors
    service_growth_factors: Dict[str, float]
    client_acquisition_impact: float
    retention_improvement_impact: float
    pricing_optimization_impact: float
    
    # External factors
    market_trends: Dict[str, float]
    seasonal_patterns: Dict[str, float]
    economic_indicators: Dict[str, float]
    
    # Achievement metrics
    six_figure_probability: float
    timeline_to_goal: int
    
    # Risk analysis
    revenue_volatility: float
    external_risks: List[str]
    mitigation_strategies: List[str]
    
    # Summary metrics
    annual_predicted_revenue: float = Field(..., description="Sum of predicted monthly revenue")
    growth_projection: str = Field(..., description="Growth trajectory description")
    
    @classmethod
    def from_forecast(cls, forecast: RevenueForecast) -> "RevenueForecastResponse":
        """Convert revenue forecast to response model"""
        annual_predicted = sum(forecast.predicted_revenue)
        
        return cls(
            barber_id=forecast.barber_id,
            forecast_period=forecast.forecast_period,
            predicted_revenue=forecast.predicted_revenue,
            confidence_intervals=forecast.confidence_intervals,
            seasonal_adjustments=forecast.seasonal_adjustments,
            conservative_scenario=forecast.conservative_scenario,
            optimistic_scenario=forecast.optimistic_scenario,
            stretch_scenario=forecast.stretch_scenario,
            service_growth_factors=forecast.service_growth_factors,
            client_acquisition_impact=forecast.client_acquisition_impact,
            retention_improvement_impact=forecast.retention_improvement_impact,
            pricing_optimization_impact=forecast.pricing_optimization_impact,
            market_trends=forecast.market_trends,
            seasonal_patterns=forecast.seasonal_patterns,
            economic_indicators=forecast.economic_indicators,
            six_figure_probability=forecast.six_figure_probability,
            timeline_to_goal=forecast.timeline_to_goal,
            revenue_volatility=forecast.revenue_volatility,
            external_risks=forecast.external_risks,
            mitigation_strategies=forecast.mitigation_strategies,
            annual_predicted_revenue=annual_predicted,
            growth_projection="Strong growth trajectory" if annual_predicted > 100000 else "Building toward six-figure goal"
        )

class MarketPositioningResponse(BaseModel):
    """Response model for market positioning analysis"""
    barber_id: int
    market_segment: str
    
    # Competitive landscape
    average_market_prices: Dict[str, float]
    price_position: str
    competitive_advantage: List[str]
    
    # Premium positioning
    premium_readiness_score: float
    brand_strength: float
    service_differentiation: float
    
    # Market opportunities
    underserved_segments: List[str]
    pricing_gaps: List[str]
    growth_opportunities: List[str]
    
    # Six Figure positioning
    luxury_market_potential: float
    high_value_client_opportunity: int
    premium_service_demand: float
    
    # Strategic recommendations
    positioning_strategy: str = Field(..., description="Recommended market positioning")
    competitive_moat: List[str] = Field(..., description="Sustainable competitive advantages")
    
    @classmethod
    def from_analysis(cls, analysis: MarketPositioningAnalysis) -> "MarketPositioningResponse":
        """Convert market analysis to response model"""
        return cls(
            barber_id=analysis.barber_id,
            market_segment=analysis.market_segment,
            average_market_prices=analysis.average_market_prices,
            price_position=analysis.price_position,
            competitive_advantage=analysis.competitive_advantage,
            premium_readiness_score=analysis.premium_readiness_score,
            brand_strength=analysis.brand_strength,
            service_differentiation=analysis.service_differentiation,
            underserved_segments=analysis.underserved_segments,
            pricing_gaps=analysis.pricing_gaps,
            growth_opportunities=analysis.growth_opportunities,
            luxury_market_potential=analysis.luxury_market_potential,
            high_value_client_opportunity=analysis.high_value_client_opportunity,
            premium_service_demand=analysis.premium_service_demand,
            positioning_strategy="Premium luxury positioning" if analysis.premium_readiness_score > 8.0 else "Premium quality positioning",
            competitive_moat=[
                "Six Figure Barber methodology",
                "Premium client experience",
                "Luxury service expertise"
            ]
        )

class RevenueInsightsResponse(BaseModel):
    """Response model for comprehensive revenue insights"""
    current_status: Dict[str, Any]
    optimization_opportunities: Dict[str, Any]
    strategic_priorities: Dict[str, Any]
    market_position: Dict[str, Any]
    forecasting: Dict[str, Any]

class RevenueHealthResponse(BaseModel):
    """Response model for revenue optimization system health"""
    status: str
    service: str
    version: str
    features: List[str]
    optimization_strategies: List[str]
    goal_tracking: List[str]
    methodology_alignment: str

class ScenarioAnalysisResponse(BaseModel):
    """Response model for revenue scenario analysis"""
    scenario_name: str
    baseline_revenue: float
    scenario_revenue: float
    revenue_change: float
    percentage_change: float
    six_figure_achievement: bool
    risk_level: str
    implementation_complexity: str
    recommendations: List[str]

class PricingRecommendationResponse(BaseModel):
    """Response model for pricing optimization recommendations"""
    service_id: int
    service_name: str
    current_price: float
    recommended_price: float
    price_increase: float
    price_increase_percentage: float
    expected_revenue_lift: float
    risk_assessment: Dict[str, Any]
    market_justification: Dict[str, Any]
    implementation_strategy: List[str]

class GoalProgressResponse(BaseModel):
    """Response model for Six Figure goal progress tracking"""
    current_annual_revenue: float
    six_figure_goal: float
    progress_percentage: float
    goal_status: RevenueGoalStatusEnum
    months_to_goal: Optional[int]
    achievement_probability: float
    monthly_target_needed: float
    milestones: Dict[str, Dict[str, Any]]
    growth_trajectory: Dict[str, Any]