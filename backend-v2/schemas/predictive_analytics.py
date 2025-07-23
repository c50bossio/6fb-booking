"""
Predictive Analytics Schemas - Advanced ML Revenue Forecasting
============================================================

Pydantic response schemas for the Predictive Revenue Analytics API endpoints.
Provides comprehensive data models for ML forecasting, trend analysis, seasonal
patterns, client behavior prediction, and strategic business intelligence.
"""

from datetime import datetime, date
from typing import Dict, List, Optional, Any, Tuple, Union
from pydantic import BaseModel, Field
from enum import Enum

from services.predictive_revenue_analytics_service import (
    RevenuePrediction,
    SeasonalPattern,
    ClientBehaviorForecast,
    MarketIntelligence,
    RevenueAnomalyDetection,
    PredictiveAnalyticsReport,
    ForecastModel,
    TrendDirection,
    PredictionConfidence
)

class ForecastModelEnum(str, Enum):
    """ML forecasting model enumeration"""
    LINEAR_REGRESSION = "linear_regression"
    EXPONENTIAL_SMOOTHING = "exponential_smoothing"
    SEASONAL_ARIMA = "seasonal_arima"
    ENSEMBLE_MODEL = "ensemble_model"
    NEURAL_NETWORK = "neural_network"

class TrendDirectionEnum(str, Enum):
    """Revenue trend direction enumeration"""
    STRONG_GROWTH = "strong_growth"
    MODERATE_GROWTH = "moderate_growth"
    STABLE = "stable"
    DECLINING = "declining"
    STEEP_DECLINE = "steep_decline"

class PredictionConfidenceEnum(str, Enum):
    """Prediction confidence level enumeration"""
    VERY_HIGH = "very_high"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    VERY_LOW = "very_low"

# Request Models

class ForecastRequest(BaseModel):
    """Request model for custom forecast generation"""
    forecast_months: int = Field(12, ge=1, le=24, description="Forecast horizon in months")
    models: Optional[List[ForecastModelEnum]] = Field(None, description="ML models to use")
    growth_adjustment: Optional[float] = Field(None, description="Manual growth rate adjustment")
    seasonal_adjustments: Optional[Dict[str, float]] = Field(None, description="Custom seasonal factors")
    confidence_threshold: Optional[float] = Field(0.7, ge=0.1, le=0.99, description="Minimum confidence required")

# Response Models

class RevenuePredictionResponse(BaseModel):
    """Response model for individual revenue predictions"""
    period: str
    predicted_revenue: float
    confidence_interval: Tuple[float, float]
    confidence_level: PredictionConfidenceEnum
    
    # Contributing factors
    base_trend: float
    seasonal_factor: float
    client_behavior_impact: float
    market_conditions_impact: float
    
    # Model details
    model_used: ForecastModelEnum
    prediction_accuracy: float
    data_quality_score: float
    
    # Uncertainty factors
    volatility_risk: float
    external_risk_factors: List[str]
    opportunity_factors: List[str]
    
    # Additional metrics
    growth_rate: float = Field(..., description="Month-over-month growth rate")
    six_figure_contribution: float = Field(..., description="Contribution toward annual six-figure goal")
    
    @classmethod
    def from_prediction(cls, prediction: RevenuePrediction) -> "RevenuePredictionResponse":
        """Convert service prediction to response model"""
        # Calculate derived metrics
        growth_rate = 0.015  # Default 1.5% monthly growth
        six_figure_contribution = prediction.predicted_revenue / (100000 / 12)  # Percentage of monthly target
        
        return cls(
            period=prediction.period,
            predicted_revenue=prediction.predicted_revenue,
            confidence_interval=prediction.confidence_interval,
            confidence_level=prediction.confidence_level.value,
            base_trend=prediction.base_trend,
            seasonal_factor=prediction.seasonal_factor,
            client_behavior_impact=prediction.client_behavior_impact,
            market_conditions_impact=prediction.market_conditions_impact,
            model_used=prediction.model_used.value,
            prediction_accuracy=prediction.prediction_accuracy,
            data_quality_score=prediction.data_quality_score,
            volatility_risk=prediction.volatility_risk,
            external_risk_factors=prediction.external_risk_factors,
            opportunity_factors=prediction.opportunity_factors,
            growth_rate=growth_rate,
            six_figure_contribution=six_figure_contribution
        )

class SeasonalPatternResponse(BaseModel):
    """Response model for seasonal pattern analysis"""
    pattern_name: str
    months_affected: List[int]
    impact_percentage: float
    confidence: float
    
    # Pattern characteristics
    is_recurring: bool
    historical_variance: float
    business_drivers: List[str]
    
    # Optimization opportunities
    optimization_potential: float
    recommended_actions: List[str]
    
    # Additional insights
    pattern_strength: str = Field(..., description="strong, moderate, or weak")
    revenue_impact_annual: float = Field(..., description="Annual revenue impact in dollars")
    
    @classmethod
    def from_pattern(cls, pattern: SeasonalPattern) -> "SeasonalPatternResponse":
        """Convert service pattern to response model"""
        # Determine pattern strength
        if pattern.confidence >= 0.8:
            strength = "strong"
        elif pattern.confidence >= 0.6:
            strength = "moderate"
        else:
            strength = "weak"
        
        # Estimate annual revenue impact (simplified calculation)
        affected_months = len(pattern.months_affected)
        annual_impact = (pattern.impact_percentage / 100) * affected_months * (70000 / 12)  # Based on average revenue
        
        return cls(
            pattern_name=pattern.pattern_name,
            months_affected=pattern.months_affected,
            impact_percentage=pattern.impact_percentage,
            confidence=pattern.confidence,
            is_recurring=pattern.is_recurring,
            historical_variance=pattern.historical_variance,
            business_drivers=pattern.business_drivers,
            optimization_potential=pattern.optimization_potential,
            recommended_actions=pattern.recommended_actions,
            pattern_strength=strength,
            revenue_impact_annual=annual_impact
        )

class ClientBehaviorForecastResponse(BaseModel):
    """Response model for client behavior predictions"""
    forecast_period: str
    
    # Client metrics predictions
    new_client_acquisition: int
    client_retention_rate: float
    average_booking_frequency: float
    average_service_value: float
    
    # Behavior patterns
    peak_booking_periods: List[str]
    service_preference_trends: Dict[str, float]
    price_sensitivity_changes: Dict[str, float]
    
    # Churn predictions
    high_risk_client_count: int
    churn_prevention_opportunity: float
    retention_strategy_effectiveness: float
    
    # Value optimization
    upselling_opportunity: float
    premium_service_adoption: float
    client_lifetime_value_trend: float
    
    # Strategic insights
    behavior_summary: str = Field(..., description="Summary of key behavior trends")
    strategic_recommendations: List[str] = Field(..., description="Action recommendations")
    
    @classmethod
    def from_forecast(cls, forecast: ClientBehaviorForecast) -> "ClientBehaviorForecastResponse":
        """Convert service forecast to response model"""
        # Generate behavior summary
        clv_trend = "positive" if forecast.client_lifetime_value_trend > 0.1 else "stable" if forecast.client_lifetime_value_trend > -0.05 else "declining"
        retention_level = "excellent" if forecast.client_retention_rate > 0.85 else "good" if forecast.client_retention_rate > 0.75 else "needs improvement"
        
        behavior_summary = f"Client behavior shows {clv_trend} CLV trend with {retention_level} retention rates"
        
        # Generate strategic recommendations
        recommendations = []
        if forecast.client_retention_rate < 0.80:
            recommendations.append("Implement targeted retention campaigns")
        if forecast.upselling_opportunity > 2000:
            recommendations.append("Expand upselling training and systems")
        if forecast.premium_service_adoption > 0.15:
            recommendations.append("Accelerate premium service development")
        if forecast.high_risk_client_count > 5:
            recommendations.append("Deploy churn prevention strategies")
        
        return cls(
            forecast_period=forecast.forecast_period,
            new_client_acquisition=forecast.new_client_acquisition,
            client_retention_rate=forecast.client_retention_rate,
            average_booking_frequency=forecast.average_booking_frequency,
            average_service_value=forecast.average_service_value,
            peak_booking_periods=forecast.peak_booking_periods,
            service_preference_trends=forecast.service_preference_trends,
            price_sensitivity_changes=forecast.price_sensitivity_changes,
            high_risk_client_count=forecast.high_risk_client_count,
            churn_prevention_opportunity=forecast.churn_prevention_opportunity,
            retention_strategy_effectiveness=forecast.retention_strategy_effectiveness,
            upselling_opportunity=forecast.upselling_opportunity,
            premium_service_adoption=forecast.premium_service_adoption,
            client_lifetime_value_trend=forecast.client_lifetime_value_trend,
            behavior_summary=behavior_summary,
            strategic_recommendations=recommendations
        )

class MarketIntelligenceResponse(BaseModel):
    """Response model for market intelligence analysis"""
    analysis_period: str
    
    # Market trends
    industry_growth_rate: float
    local_market_expansion: float
    luxury_segment_growth: float
    
    # Competitive landscape
    competitive_pressure_index: float
    market_share_opportunity: float
    pricing_advantage_score: float
    
    # Economic factors
    economic_confidence_index: float
    disposable_income_trend: float
    luxury_spending_forecast: float
    
    # Opportunities and risks
    underserved_market_segments: List[str]
    expansion_opportunities: List[str]
    risk_factors: List[str]
    
    # Strategic insights
    market_position: str = Field(..., description="Current market positioning assessment")
    growth_potential: str = Field(..., description="Overall growth potential rating")
    strategic_focus: List[str] = Field(..., description="Recommended strategic priorities")
    
    @classmethod
    def from_intelligence(cls, intelligence: MarketIntelligence) -> "MarketIntelligenceResponse":
        """Convert service intelligence to response model"""
        # Assess market position
        if intelligence.pricing_advantage_score > 0.7 and intelligence.competitive_pressure_index < 0.4:
            market_position = "Strong competitive position with pricing advantage"
        elif intelligence.competitive_pressure_index > 0.6:
            market_position = "Competitive market with pressure on positioning"
        else:
            market_position = "Moderate competitive position with opportunities"
        
        # Assess growth potential
        avg_growth = (intelligence.industry_growth_rate + intelligence.local_market_expansion + intelligence.luxury_segment_growth) / 3
        if avg_growth > 0.15:
            growth_potential = "High growth potential across all segments"
        elif avg_growth > 0.08:
            growth_potential = "Moderate growth potential with selective opportunities"
        else:
            growth_potential = "Limited growth requiring strategic focus"
        
        # Generate strategic focus areas
        strategic_focus = []
        if intelligence.luxury_segment_growth > 0.15:
            strategic_focus.append("Luxury segment expansion")
        if intelligence.market_share_opportunity > 0.2:
            strategic_focus.append("Market share capture")
        if intelligence.pricing_advantage_score > 0.6:
            strategic_focus.append("Premium positioning leverage")
        
        return cls(
            analysis_period=intelligence.analysis_period,
            industry_growth_rate=intelligence.industry_growth_rate,
            local_market_expansion=intelligence.local_market_expansion,
            luxury_segment_growth=intelligence.luxury_segment_growth,
            competitive_pressure_index=intelligence.competitive_pressure_index,
            market_share_opportunity=intelligence.market_share_opportunity,
            pricing_advantage_score=intelligence.pricing_advantage_score,
            economic_confidence_index=intelligence.economic_confidence_index,
            disposable_income_trend=intelligence.disposable_income_trend,
            luxury_spending_forecast=intelligence.luxury_spending_forecast,
            underserved_market_segments=intelligence.underserved_market_segments,
            expansion_opportunities=intelligence.expansion_opportunities,
            risk_factors=intelligence.risk_factors,
            market_position=market_position,
            growth_potential=growth_potential,
            strategic_focus=strategic_focus
        )

class AnomalyDetectionResponse(BaseModel):
    """Response model for revenue anomaly detection"""
    detection_period: str
    
    # Detected anomalies
    revenue_anomalies: List[Dict[str, Any]]
    booking_pattern_anomalies: List[Dict[str, Any]]
    client_behavior_anomalies: List[Dict[str, Any]]
    
    # Impact classification
    positive_anomalies: List[str]
    negative_anomalies: List[str]
    
    # Analysis results
    identified_causes: Dict[str, str]
    correlation_analysis: Dict[str, float]
    
    # Action items
    investigation_priorities: List[str]
    corrective_actions: List[str]
    opportunity_capture: List[str]
    
    # Summary metrics
    anomaly_count: int = Field(..., description="Total number of anomalies detected")
    severity_score: float = Field(..., description="Overall anomaly severity (0-1)")
    
    @classmethod
    def from_detection(cls, detection: RevenueAnomalyDetection) -> "AnomalyDetectionResponse":
        """Convert service detection to response model"""
        total_anomalies = (
            len(detection.revenue_anomalies) +
            len(detection.booking_pattern_anomalies) +
            len(detection.client_behavior_anomalies)
        )
        
        # Calculate severity based on negative anomalies
        negative_count = len(detection.negative_anomalies)
        severity = min(1.0, negative_count / max(1, total_anomalies))
        
        return cls(
            detection_period=detection.detection_period,
            revenue_anomalies=detection.revenue_anomalies,
            booking_pattern_anomalies=detection.booking_pattern_anomalies,
            client_behavior_anomalies=detection.client_behavior_anomalies,
            positive_anomalies=detection.positive_anomalies,
            negative_anomalies=detection.negative_anomalies,
            identified_causes=detection.identified_causes,
            correlation_analysis=detection.correlation_analysis,
            investigation_priorities=detection.investigation_priorities,
            corrective_actions=detection.corrective_actions,
            opportunity_capture=detection.opportunity_capture,
            anomaly_count=total_anomalies,
            severity_score=severity
        )

class TrendAnalysisResponse(BaseModel):
    """Response model for comprehensive trend analysis"""
    analysis_period: str
    overall_trend: TrendDirectionEnum
    growth_rate: float
    growth_acceleration: float
    trend_confidence: float
    inflection_points: List[str]
    trend_sustainability: str
    revenue_volatility: float
    trend_drivers: List[str]
    risk_factors: List[str]
    trend_recommendations: List[str]

class PredictiveAnalyticsReportResponse(BaseModel):
    """Response model for comprehensive predictive analytics report"""
    barber_id: int
    report_period: str
    generated_at: datetime
    
    # Core analytics
    revenue_forecasts: List[RevenuePredictionResponse]
    seasonal_patterns: List[SeasonalPatternResponse]
    client_behavior_forecast: ClientBehaviorForecastResponse
    market_intelligence: MarketIntelligenceResponse
    anomaly_detection: AnomalyDetectionResponse
    
    # Strategic insights
    six_figure_probability: float
    optimal_growth_strategy: str
    revenue_acceleration_opportunities: List[str]
    
    # Performance metrics
    forecast_accuracy_metrics: Dict[str, float]
    model_performance_summary: Dict[str, Any]
    
    # Action planning
    immediate_priorities: List[str]
    strategic_initiatives: List[str]
    long_term_optimization: List[str]
    
    # Risk management
    identified_risks: List[str]
    mitigation_strategies: List[str]
    contingency_plans: List[str]
    
    # Executive summary
    key_insights: List[str] = Field(..., description="Top 5 key insights")
    success_probability: float = Field(..., description="Overall success probability")
    recommended_focus: str = Field(..., description="Primary recommended focus area")
    
    @classmethod
    def from_report(cls, report: PredictiveAnalyticsReport) -> "PredictiveAnalyticsReportResponse":
        """Convert service report to response model"""
        # Generate key insights
        annual_predicted = sum(f.predicted_revenue for f in report.revenue_forecasts)
        key_insights = [
            f"Predicted annual revenue: ${annual_predicted:,.0f}",
            f"Six-figure achievement probability: {report.six_figure_probability:.0%}",
            f"Strongest seasonal pattern: {report.seasonal_patterns[0].pattern_name if report.seasonal_patterns else 'None identified'}",
            f"Client retention forecast: {report.client_behavior_forecast.client_retention_rate:.1%}",
            f"Market growth opportunity: {report.market_intelligence.market_share_opportunity:.0%}"
        ]
        
        # Calculate overall success probability
        factors = [
            report.six_figure_probability,
            min(1.0, report.client_behavior_forecast.client_retention_rate),
            min(1.0, report.market_intelligence.pricing_advantage_score),
            min(1.0, report.forecast_accuracy_metrics.get("overall_forecast_confidence", 0.8))
        ]
        success_probability = sum(factors) / len(factors)
        
        # Determine recommended focus
        if annual_predicted < 70000:
            recommended_focus = "Foundation building and client acquisition"
        elif annual_predicted < 90000:
            recommended_focus = "Revenue acceleration and premium positioning"
        else:
            recommended_focus = "Six-figure achievement and market leadership"
        
        return cls(
            barber_id=report.barber_id,
            report_period=report.report_period,
            generated_at=report.generated_at,
            revenue_forecasts=[RevenuePredictionResponse.from_prediction(f) for f in report.revenue_forecasts],
            seasonal_patterns=[SeasonalPatternResponse.from_pattern(p) for p in report.seasonal_patterns],
            client_behavior_forecast=ClientBehaviorForecastResponse.from_forecast(report.client_behavior_forecast),
            market_intelligence=MarketIntelligenceResponse.from_intelligence(report.market_intelligence),
            anomaly_detection=AnomalyDetectionResponse.from_detection(report.anomaly_detection),
            six_figure_probability=report.six_figure_probability,
            optimal_growth_strategy=report.optimal_growth_strategy,
            revenue_acceleration_opportunities=report.revenue_acceleration_opportunities,
            forecast_accuracy_metrics=report.forecast_accuracy_metrics,
            model_performance_summary=report.model_performance_summary,
            immediate_priorities=report.immediate_priorities,
            strategic_initiatives=report.strategic_initiatives,
            long_term_optimization=report.long_term_optimization,
            identified_risks=report.identified_risks,
            mitigation_strategies=report.mitigation_strategies,
            contingency_plans=report.contingency_plans,
            key_insights=key_insights,
            success_probability=success_probability,
            recommended_focus=recommended_focus
        )

class PredictiveHealthResponse(BaseModel):
    """Response model for predictive analytics system health"""
    status: str
    service: str
    version: str
    features: List[str]
    ml_models: List[str]
    prediction_horizons: List[str]
    analytics_capabilities: List[str]
    methodology_alignment: str

class ModelPerformanceResponse(BaseModel):
    """Response model for ML model performance metrics"""
    model_accuracy: Dict[str, float]
    prediction_confidence: Dict[str, float]
    forecast_reliability: str
    accuracy_trends: Dict[str, float]
    model_recommendations: List[str]

class ScenarioTestResponse(BaseModel):
    """Response model for scenario testing and stress analysis"""
    scenario_name: str
    baseline_revenue: float
    scenario_revenue: float
    impact_percentage: float
    risk_assessment: str
    mitigation_strategies: List[str]
    recovery_timeline: str