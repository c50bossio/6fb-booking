"""
Franchise Predictive Analytics Service

Advanced AI-powered predictive modeling for franchise growth forecasting,
market opportunity identification, and revenue optimization.
"""

from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime, timedelta, date
import logging
import statistics
import numpy as np
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, desc
from collections import defaultdict
import json

from models import User, Location, Appointment, Payment, Service
from models.franchise_security import FranchiseNetwork
from models.analytics import PerformanceBenchmark, CrossUserMetric
from services.advanced_franchise_analytics_service import AdvancedFranchiseAnalyticsService, AnalyticsTimeframe


logger = logging.getLogger(__name__)


class PredictionType(Enum):
    """Types of predictions available"""
    REVENUE_FORECAST = "revenue_forecast"
    GROWTH_TRAJECTORY = "growth_trajectory"
    MARKET_EXPANSION = "market_expansion"
    CHURN_PREDICTION = "churn_prediction"
    DEMAND_PATTERNS = "demand_patterns"
    PRICING_OPTIMIZATION = "pricing_optimization"
    STAFFING_OPTIMIZATION = "staffing_optimization"
    SEASONAL_PATTERNS = "seasonal_patterns"


class ForecastAccuracy(Enum):
    """Forecast accuracy levels"""
    HIGH = "high"           # 90%+ confidence
    MEDIUM = "medium"       # 75-90% confidence
    LOW = "low"            # 60-75% confidence
    INSUFFICIENT = "insufficient"  # <60% confidence


@dataclass
class PredictionResult:
    """Result of a predictive analytics operation"""
    prediction_type: PredictionType
    forecast_period: int  # months ahead
    confidence_score: float  # 0-1
    accuracy_level: ForecastAccuracy
    
    # Prediction data
    predicted_values: List[float]
    confidence_intervals: List[Tuple[float, float]]
    probability_distribution: Optional[Dict[str, float]] = None
    
    # Supporting analysis
    key_factors: List[str] = field(default_factory=list)
    risk_factors: List[str] = field(default_factory=list)
    assumptions: List[str] = field(default_factory=list)
    
    # Actionable insights
    recommendations: List[str] = field(default_factory=list)
    optimization_opportunities: List[str] = field(default_factory=list)
    
    # Metadata
    model_version: str = "v1.0"
    generated_at: datetime = field(default_factory=datetime.now)
    data_quality_score: float = 0.0


@dataclass
class RevenueForecast:
    """Revenue forecasting result"""
    monthly_predictions: List[float]
    annual_total: float
    growth_rate: float
    seasonal_adjustments: Dict[int, float]  # month -> adjustment factor
    confidence_intervals: List[Tuple[float, float]]
    
    # Growth scenarios
    conservative_scenario: float
    optimistic_scenario: float
    realistic_scenario: float
    
    # Key drivers
    volume_impact: float
    pricing_impact: float
    retention_impact: float
    market_impact: float


@dataclass
class MarketExpansionForecast:
    """Market expansion opportunity forecast"""
    market_size_estimate: float
    penetration_rate: float
    competition_analysis: Dict[str, Any]
    
    # Expansion scenarios
    expansion_scenarios: List[Dict[str, Any]]
    roi_projections: List[float]
    payback_periods: List[int]  # months
    
    # Risk assessment
    market_risks: List[str]
    competitive_risks: List[str]
    operational_risks: List[str]
    
    # Success factors
    critical_success_factors: List[str]
    recommended_strategy: str


@dataclass
class ChurnPrediction:
    """Client churn prediction result"""
    overall_churn_risk: float  # 0-1
    at_risk_clients: List[Dict[str, Any]]
    churn_probability_distribution: Dict[str, float]
    
    # Risk factors
    primary_churn_factors: List[str]
    early_warning_indicators: List[str]
    
    # Retention opportunities
    retention_strategies: List[str]
    intervention_recommendations: List[Dict[str, Any]]
    potential_revenue_at_risk: float


class FranchisePredictiveAnalyticsService:
    """
    Advanced predictive analytics service for franchise operations
    
    Provides:
    - Revenue forecasting with seasonal adjustments
    - Market expansion opportunity analysis
    - Client churn prediction and prevention
    - Demand pattern analysis
    - Pricing optimization recommendations
    - Staffing optimization forecasts
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.analytics_service = AdvancedFranchiseAnalyticsService(db)
    
    def predict_revenue_forecast(
        self, 
        location_id: int, 
        months_ahead: int = 12,
        include_seasonal: bool = True,
        scenario_analysis: bool = True
    ) -> RevenueForecast:
        """
        Generate comprehensive revenue forecast
        
        Args:
            location_id: Location to forecast for
            months_ahead: Number of months to predict
            include_seasonal: Include seasonal adjustments
            scenario_analysis: Include multiple scenarios
            
        Returns:
            Comprehensive revenue forecast with scenarios
        """
        try:
            # Get historical data
            historical_data = self._get_historical_revenue_data(location_id, 24)  # 2 years
            
            if len(historical_data) < 6:  # Minimum 6 months required
                raise ValueError("Insufficient historical data for reliable forecasting")
            
            # Calculate base growth trend
            base_growth_rate = self._calculate_growth_trend(historical_data)
            
            # Generate monthly predictions
            monthly_predictions = []
            confidence_intervals = []
            
            last_value = historical_data[-1]['revenue']
            monthly_growth = (1 + base_growth_rate) ** (1/12)  # Convert annual to monthly
            
            for month in range(1, months_ahead + 1):
                # Base prediction
                base_prediction = last_value * (monthly_growth ** month)
                
                # Apply seasonal adjustments
                if include_seasonal:
                    current_month = (datetime.now().month + month - 1) % 12 + 1
                    seasonal_factor = self._get_seasonal_factor(location_id, current_month)
                    base_prediction *= seasonal_factor
                
                # Calculate confidence interval
                confidence_factor = 1 - (month / months_ahead * 0.3)  # Decreasing confidence
                lower_bound = base_prediction * 0.8 * confidence_factor
                upper_bound = base_prediction * 1.2 * confidence_factor
                
                monthly_predictions.append(base_prediction)
                confidence_intervals.append((lower_bound, upper_bound))
            
            # Calculate scenarios
            scenarios = self._generate_revenue_scenarios(
                monthly_predictions, base_growth_rate
            ) if scenario_analysis else {}
            
            # Analyze growth drivers
            growth_analysis = self._analyze_revenue_drivers(location_id, historical_data)
            
            # Calculate seasonal adjustments
            seasonal_adjustments = {}
            if include_seasonal:
                for month in range(1, 13):
                    seasonal_adjustments[month] = self._get_seasonal_factor(location_id, month)
            
            return RevenueForecast(
                monthly_predictions=monthly_predictions,
                annual_total=sum(monthly_predictions),
                growth_rate=base_growth_rate,
                seasonal_adjustments=seasonal_adjustments,
                confidence_intervals=confidence_intervals,
                
                # Scenarios
                conservative_scenario=scenarios.get('conservative', sum(monthly_predictions) * 0.9),
                optimistic_scenario=scenarios.get('optimistic', sum(monthly_predictions) * 1.2),
                realistic_scenario=sum(monthly_predictions),
                
                # Growth drivers
                volume_impact=growth_analysis.get('volume_impact', 0.0),
                pricing_impact=growth_analysis.get('pricing_impact', 0.0),
                retention_impact=growth_analysis.get('retention_impact', 0.0),
                market_impact=growth_analysis.get('market_impact', 0.0)
            )
            
        except Exception as e:
            logger.error(f"Error generating revenue forecast: {str(e)}")
            raise
    
    def predict_market_expansion_opportunities(
        self, 
        location_id: int,
        expansion_radius_miles: int = 25,
        investment_budget: Optional[float] = None
    ) -> MarketExpansionForecast:
        """
        Analyze market expansion opportunities
        
        Args:
            location_id: Base location for expansion analysis
            expansion_radius_miles: Search radius for opportunities
            investment_budget: Available investment budget
            
        Returns:
            Market expansion forecast with scenarios
        """
        try:
            # Get location details
            location = self.db.query(Location).filter(Location.id == location_id).first()
            if not location:
                raise ValueError(f"Location {location_id} not found")
            
            # Analyze current market performance
            current_performance = self.analytics_service.get_franchise_performance_snapshot(
                location_id, AnalyticsTimeframe.YEAR
            )
            
            # Estimate market size based on demographics and current performance
            market_size_estimate = self._estimate_market_size(location, expansion_radius_miles)
            
            # Analyze competition
            competition_analysis = self._analyze_market_competition(location, expansion_radius_miles)
            
            # Calculate penetration rate
            penetration_rate = self._calculate_market_penetration(
                current_performance.total_revenue, market_size_estimate
            )
            
            # Generate expansion scenarios
            expansion_scenarios = self._generate_expansion_scenarios(
                location_id, market_size_estimate, competition_analysis, investment_budget
            )
            
            # Calculate ROI projections
            roi_projections = []
            payback_periods = []
            
            for scenario in expansion_scenarios:
                roi = self._calculate_expansion_roi(scenario)
                payback = self._calculate_payback_period(scenario)
                roi_projections.append(roi)
                payback_periods.append(payback)
            
            # Assess risks
            market_risks = self._identify_market_risks(location, competition_analysis)
            competitive_risks = self._identify_competitive_risks(competition_analysis)
            operational_risks = self._identify_operational_risks(location_id)
            
            # Identify success factors
            success_factors = self._identify_expansion_success_factors(
                current_performance, market_size_estimate, competition_analysis
            )
            
            # Recommend strategy
            recommended_strategy = self._recommend_expansion_strategy(
                expansion_scenarios, roi_projections, market_risks
            )
            
            return MarketExpansionForecast(
                market_size_estimate=market_size_estimate,
                penetration_rate=penetration_rate,
                competition_analysis=competition_analysis,
                
                expansion_scenarios=expansion_scenarios,
                roi_projections=roi_projections,
                payback_periods=payback_periods,
                
                market_risks=market_risks,
                competitive_risks=competitive_risks,
                operational_risks=operational_risks,
                
                critical_success_factors=success_factors,
                recommended_strategy=recommended_strategy
            )
            
        except Exception as e:
            logger.error(f"Error predicting market expansion: {str(e)}")
            raise
    
    def predict_client_churn(
        self, 
        location_id: int,
        prediction_horizon_days: int = 90
    ) -> ChurnPrediction:
        """
        Predict client churn and identify at-risk clients
        
        Args:
            location_id: Location to analyze
            prediction_horizon_days: Days ahead to predict
            
        Returns:
            Churn prediction with intervention recommendations
        """
        try:
            # Get client activity data
            client_data = self._get_client_activity_data(location_id, prediction_horizon_days)
            
            if not client_data:
                raise ValueError("No client data available for churn prediction")
            
            # Calculate churn risk for each client
            at_risk_clients = []
            churn_probabilities = []
            
            for client in client_data:
                churn_risk = self._calculate_client_churn_risk(client)
                churn_probabilities.append(churn_risk)
                
                if churn_risk > 0.6:  # High risk threshold
                    at_risk_clients.append({
                        'client_id': client['client_id'],
                        'churn_probability': churn_risk,
                        'risk_factors': self._identify_client_risk_factors(client),
                        'last_visit': client['last_visit'],
                        'total_value': client['total_spent'],
                        'visit_frequency': client['visit_frequency']
                    })
            
            # Calculate overall churn risk
            overall_churn_risk = statistics.mean(churn_probabilities) if churn_probabilities else 0
            
            # Generate probability distribution
            churn_distribution = self._generate_churn_distribution(churn_probabilities)
            
            # Identify primary churn factors
            primary_factors = self._identify_primary_churn_factors(client_data)
            
            # Generate early warning indicators
            warning_indicators = self._generate_early_warning_indicators(client_data)
            
            # Develop retention strategies
            retention_strategies = self._develop_retention_strategies(at_risk_clients, primary_factors)
            
            # Create intervention recommendations
            intervention_recommendations = self._create_intervention_recommendations(at_risk_clients)
            
            # Calculate potential revenue at risk
            revenue_at_risk = sum(client['total_value'] for client in at_risk_clients)
            
            return ChurnPrediction(
                overall_churn_risk=overall_churn_risk,
                at_risk_clients=at_risk_clients,
                churn_probability_distribution=churn_distribution,
                
                primary_churn_factors=primary_factors,
                early_warning_indicators=warning_indicators,
                
                retention_strategies=retention_strategies,
                intervention_recommendations=intervention_recommendations,
                potential_revenue_at_risk=revenue_at_risk
            )
            
        except Exception as e:
            logger.error(f"Error predicting client churn: {str(e)}")
            raise
    
    def predict_demand_patterns(
        self, 
        location_id: int,
        forecast_weeks: int = 12
    ) -> PredictionResult:
        """
        Predict demand patterns for scheduling optimization
        
        Args:
            location_id: Location to analyze
            forecast_weeks: Weeks ahead to predict
            
        Returns:
            Demand pattern predictions
        """
        try:
            # Get historical appointment data
            historical_appointments = self._get_historical_appointment_data(location_id, 52)  # 1 year
            
            if not historical_appointments:
                raise ValueError("Insufficient appointment data for demand prediction")
            
            # Analyze patterns
            patterns = self._analyze_demand_patterns(historical_appointments)
            
            # Generate predictions
            predictions = []
            confidence_intervals = []
            
            for week in range(1, forecast_weeks + 1):
                # Predict demand by day of week and hour
                weekly_demand = self._predict_weekly_demand(patterns, week)
                predictions.append(weekly_demand)
                
                # Calculate confidence
                confidence = self._calculate_demand_confidence(patterns, week)
                confidence_intervals.append(confidence)
            
            # Identify key factors
            key_factors = [
                "Historical booking patterns",
                "Seasonal variations",
                "Day-of-week preferences",
                "Time-of-day patterns"
            ]
            
            # Generate recommendations
            recommendations = [
                "Optimize staff scheduling based on predicted demand",
                "Implement dynamic pricing for peak periods",
                "Create promotional offers for low-demand periods",
                "Adjust service mix based on demand patterns"
            ]
            
            return PredictionResult(
                prediction_type=PredictionType.DEMAND_PATTERNS,
                forecast_period=forecast_weeks,
                confidence_score=statistics.mean([ci[1] for ci in confidence_intervals]),
                accuracy_level=ForecastAccuracy.MEDIUM,
                predicted_values=predictions,
                confidence_intervals=confidence_intervals,
                key_factors=key_factors,
                recommendations=recommendations,
                data_quality_score=0.85
            )
            
        except Exception as e:
            logger.error(f"Error predicting demand patterns: {str(e)}")
            raise
    
    def predict_pricing_optimization(
        self, 
        location_id: int,
        test_scenarios: Optional[List[Dict[str, Any]]] = None
    ) -> PredictionResult:
        """
        Predict optimal pricing strategies
        
        Args:
            location_id: Location to analyze
            test_scenarios: Pricing scenarios to test
            
        Returns:
            Pricing optimization predictions
        """
        try:
            # Get current pricing and performance data
            current_data = self._get_pricing_performance_data(location_id)
            
            if not current_data:
                raise ValueError("Insufficient pricing data for optimization")
            
            # Analyze price elasticity
            price_elasticity = self._calculate_price_elasticity(current_data)
            
            # Generate pricing scenarios
            if not test_scenarios:
                test_scenarios = self._generate_pricing_scenarios(current_data)
            
            # Predict impact of each scenario
            scenario_predictions = []
            for scenario in test_scenarios:
                impact = self._predict_pricing_impact(scenario, price_elasticity, current_data)
                scenario_predictions.append(impact)
            
            # Identify optimal pricing
            optimal_scenario = max(scenario_predictions, key=lambda x: x['net_revenue_impact'])
            
            # Generate recommendations
            recommendations = [
                f"Implement {optimal_scenario['scenario_name']} for maximum revenue impact",
                f"Expected revenue increase: {optimal_scenario['revenue_increase']:.1%}",
                f"Monitor demand elasticity during implementation",
                "Consider gradual price increases to minimize client impact"
            ]
            
            return PredictionResult(
                prediction_type=PredictionType.PRICING_OPTIMIZATION,
                forecast_period=6,  # months
                confidence_score=0.75,
                accuracy_level=ForecastAccuracy.MEDIUM,
                predicted_values=[s['net_revenue_impact'] for s in scenario_predictions],
                confidence_intervals=[(s['min_impact'], s['max_impact']) for s in scenario_predictions],
                key_factors=[
                    "Price elasticity of demand",
                    "Competitive pricing analysis",
                    "Client value perception",
                    "Market positioning"
                ],
                recommendations=recommendations,
                optimization_opportunities=[
                    "Premium service tier development",
                    "Package pricing optimization",
                    "Dynamic pricing implementation"
                ],
                data_quality_score=0.8
            )
            
        except Exception as e:
            logger.error(f"Error predicting pricing optimization: {str(e)}")
            raise
    
    # Helper methods for predictive analytics
    
    def _get_historical_revenue_data(self, location_id: int, months: int) -> List[Dict[str, Any]]:
        """Get historical revenue data for forecasting"""
        try:
            end_date = datetime.now()
            start_date = end_date - timedelta(days=months * 30)
            
            # Query monthly revenue data
            monthly_data = []
            current_date = start_date
            
            while current_date < end_date:
                month_start = current_date.replace(day=1)
                next_month = (month_start + timedelta(days=32)).replace(day=1)
                
                revenue = self.db.query(func.sum(Payment.amount)).filter(
                    and_(
                        Payment.location_id == location_id,
                        Payment.status == "completed",
                        Payment.created_at >= month_start,
                        Payment.created_at < next_month
                    )
                ).scalar() or 0.0
                
                monthly_data.append({
                    'month': month_start,
                    'revenue': float(revenue)
                })
                
                current_date = next_month
            
            return monthly_data
            
        except Exception as e:
            logger.error(f"Error getting historical revenue data: {str(e)}")
            return []
    
    def _calculate_growth_trend(self, historical_data: List[Dict[str, Any]]) -> float:
        """Calculate growth trend from historical data"""
        if len(historical_data) < 2:
            return 0.0
        
        revenues = [d['revenue'] for d in historical_data if d['revenue'] > 0]
        if len(revenues) < 2:
            return 0.0
        
        # Simple linear regression for trend
        x_values = list(range(len(revenues)))
        x_mean = statistics.mean(x_values)
        y_mean = statistics.mean(revenues)
        
        numerator = sum((x - x_mean) * (y - y_mean) for x, y in zip(x_values, revenues))
        denominator = sum((x - x_mean) ** 2 for x in x_values)
        
        if denominator == 0:
            return 0.0
        
        slope = numerator / denominator
        
        # Convert to annual growth rate
        monthly_growth = slope / y_mean if y_mean > 0 else 0
        annual_growth = monthly_growth * 12
        
        return max(-0.5, min(2.0, annual_growth))  # Cap between -50% and 200%
    
    def _get_seasonal_factor(self, location_id: int, month: int) -> float:
        """Get seasonal adjustment factor for a specific month"""
        # Simplified seasonal factors (would be calculated from historical data)
        seasonal_factors = {
            1: 0.85,  # January - slow start to year
            2: 0.90,  # February - still slow
            3: 1.05,  # March - spring pickup
            4: 1.10,  # April - wedding season
            5: 1.15,  # May - peak season
            6: 1.05,  # June - summer start
            7: 0.95,  # July - vacation month
            8: 0.90,  # August - vacation month
            9: 1.05,  # September - back to school
            10: 1.10, # October - fall season
            11: 1.20, # November - holiday prep
            12: 1.15  # December - holiday season
        }
        
        return seasonal_factors.get(month, 1.0)
    
    def _generate_revenue_scenarios(
        self, 
        base_predictions: List[float], 
        base_growth_rate: float
    ) -> Dict[str, float]:
        """Generate revenue scenarios"""
        annual_base = sum(base_predictions)
        
        return {
            'conservative': annual_base * 0.85,  # 15% below base
            'optimistic': annual_base * 1.25,   # 25% above base
            'realistic': annual_base
        }
    
    def _analyze_revenue_drivers(
        self, 
        location_id: int, 
        historical_data: List[Dict[str, Any]]
    ) -> Dict[str, float]:
        """Analyze factors driving revenue growth"""
        # Simplified analysis - would be more sophisticated in production
        return {
            'volume_impact': 0.4,   # 40% of growth from volume
            'pricing_impact': 0.3,  # 30% from pricing
            'retention_impact': 0.2, # 20% from retention
            'market_impact': 0.1    # 10% from market conditions
        }
    
    def _estimate_market_size(self, location: Location, radius_miles: int) -> float:
        """Estimate market size for expansion analysis"""
        # Simplified market size estimation
        # In production, would integrate with demographic and market research APIs
        
        # Base market size on location type and demographics
        base_market_size = 500000  # Base annual market potential
        
        # Adjust for radius
        radius_factor = (radius_miles / 10) ** 0.5  # Square root scaling
        
        return base_market_size * radius_factor
    
    def _analyze_market_competition(
        self, 
        location: Location, 
        radius_miles: int
    ) -> Dict[str, Any]:
        """Analyze market competition"""
        # Simplified competition analysis
        return {
            'competitor_count': 5,
            'market_saturation': 0.65,  # 65% saturated
            'competitive_intensity': 'moderate',
            'average_competitor_revenue': 200000,
            'market_leader_share': 0.25
        }
    
    def _calculate_market_penetration(self, current_revenue: float, market_size: float) -> float:
        """Calculate current market penetration rate"""
        if market_size <= 0:
            return 0.0
        
        return min(current_revenue / market_size, 1.0)
    
    def _generate_expansion_scenarios(
        self, 
        location_id: int, 
        market_size: float, 
        competition: Dict[str, Any], 
        budget: Optional[float]
    ) -> List[Dict[str, Any]]:
        """Generate expansion scenarios"""
        scenarios = []
        
        # Conservative scenario
        scenarios.append({
            'name': 'Conservative Expansion',
            'investment_required': 150000,
            'target_market_share': 0.05,
            'timeline_months': 18,
            'risk_level': 'low',
            'expected_annual_revenue': market_size * 0.05
        })
        
        # Aggressive scenario
        scenarios.append({
            'name': 'Aggressive Expansion',
            'investment_required': 300000,
            'target_market_share': 0.15,
            'timeline_months': 12,
            'risk_level': 'high',
            'expected_annual_revenue': market_size * 0.15
        })
        
        # Moderate scenario
        scenarios.append({
            'name': 'Moderate Expansion',
            'investment_required': 200000,
            'target_market_share': 0.08,
            'timeline_months': 15,
            'risk_level': 'medium',
            'expected_annual_revenue': market_size * 0.08
        })
        
        return scenarios
    
    def _calculate_expansion_roi(self, scenario: Dict[str, Any]) -> float:
        """Calculate ROI for expansion scenario"""
        investment = scenario['investment_required']
        annual_revenue = scenario['expected_annual_revenue']
        
        # Assume 25% net margin
        annual_profit = annual_revenue * 0.25
        
        # Calculate 3-year ROI
        three_year_profit = annual_profit * 3
        roi = (three_year_profit - investment) / investment
        
        return roi
    
    def _calculate_payback_period(self, scenario: Dict[str, Any]) -> int:
        """Calculate payback period in months"""
        investment = scenario['investment_required']
        annual_revenue = scenario['expected_annual_revenue']
        monthly_profit = annual_revenue * 0.25 / 12  # 25% margin, monthly
        
        if monthly_profit <= 0:
            return 999  # Never pays back
        
        payback_months = investment / monthly_profit
        return int(payback_months)
    
    def _identify_market_risks(self, location: Location, competition: Dict[str, Any]) -> List[str]:
        """Identify market risks for expansion"""
        risks = []
        
        if competition['market_saturation'] > 0.7:
            risks.append("High market saturation may limit growth potential")
        
        if competition['competitive_intensity'] == 'high':
            risks.append("Intense competition may require aggressive pricing")
        
        risks.extend([
            "Economic downturn could reduce demand",
            "Regulatory changes may impact operations",
            "Consumer preferences may shift"
        ])
        
        return risks
    
    def _identify_competitive_risks(self, competition: Dict[str, Any]) -> List[str]:
        """Identify competitive risks"""
        return [
            "Established competitors may respond aggressively",
            "Price wars could reduce profitability",
            "Market leader has significant advantages"
        ]
    
    def _identify_operational_risks(self, location_id: int) -> List[str]:
        """Identify operational risks for expansion"""
        return [
            "Staff recruitment and training challenges",
            "Maintaining service quality across locations",
            "Management bandwidth limitations",
            "Initial cash flow challenges"
        ]
    
    def _identify_expansion_success_factors(
        self, 
        performance, 
        market_size: float, 
        competition: Dict[str, Any]
    ) -> List[str]:
        """Identify critical success factors for expansion"""
        return [
            "Strong brand recognition and reputation",
            "Effective local marketing and community engagement",
            "Superior service quality and customer experience",
            "Competitive pricing strategy",
            "Efficient operations and cost management"
        ]
    
    def _recommend_expansion_strategy(
        self, 
        scenarios: List[Dict[str, Any]], 
        roi_projections: List[float], 
        risks: List[str]
    ) -> str:
        """Recommend optimal expansion strategy"""
        # Find scenario with best risk-adjusted return
        best_scenario_idx = 0
        best_score = -999
        
        for i, (scenario, roi) in enumerate(zip(scenarios, roi_projections)):
            # Simple scoring: ROI minus risk penalty
            risk_penalty = 0.1 if scenario['risk_level'] == 'high' else 0
            score = roi - risk_penalty
            
            if score > best_score:
                best_score = score
                best_scenario_idx = i
        
        return f"Recommended: {scenarios[best_scenario_idx]['name']} - balances growth potential with manageable risk"
    
    # Additional helper methods for churn prediction and other analyses
    
    def _get_client_activity_data(self, location_id: int, days: int) -> List[Dict[str, Any]]:
        """Get client activity data for churn analysis"""
        try:
            cutoff_date = datetime.now() - timedelta(days=days)
            
            # Get client activity metrics
            client_data = []
            
            # Query clients with appointments in the period
            clients = self.db.query(Appointment.client_id).filter(
                and_(
                    Appointment.location_id == location_id,
                    Appointment.start_time >= cutoff_date,
                    Appointment.client_id.isnot(None)
                )
            ).distinct().all()
            
            for (client_id,) in clients:
                # Get client metrics
                appointments = self.db.query(Appointment).filter(
                    and_(
                        Appointment.client_id == client_id,
                        Appointment.location_id == location_id,
                        Appointment.start_time >= cutoff_date
                    )
                ).all()
                
                if appointments:
                    last_visit = max(apt.start_time for apt in appointments)
                    visit_count = len(appointments)
                    
                    # Calculate total spent
                    total_spent = self.db.query(func.sum(Payment.amount)).filter(
                        and_(
                            Payment.client_id == client_id,
                            Payment.location_id == location_id,
                            Payment.status == "completed",
                            Payment.created_at >= cutoff_date
                        )
                    ).scalar() or 0.0
                    
                    # Calculate visit frequency (visits per month)
                    months_active = max(1, (datetime.now() - cutoff_date).days / 30)
                    visit_frequency = visit_count / months_active
                    
                    client_data.append({
                        'client_id': client_id,
                        'last_visit': last_visit,
                        'visit_count': visit_count,
                        'visit_frequency': visit_frequency,
                        'total_spent': float(total_spent),
                        'days_since_last_visit': (datetime.now() - last_visit).days
                    })
            
            return client_data
            
        except Exception as e:
            logger.error(f"Error getting client activity data: {str(e)}")
            return []
    
    def _calculate_client_churn_risk(self, client: Dict[str, Any]) -> float:
        """Calculate churn risk for individual client"""
        risk_score = 0.0
        
        # Days since last visit
        days_since_visit = client['days_since_last_visit']
        if days_since_visit > 90:
            risk_score += 0.4
        elif days_since_visit > 60:
            risk_score += 0.2
        elif days_since_visit > 30:
            risk_score += 0.1
        
        # Visit frequency
        if client['visit_frequency'] < 0.5:  # Less than once every 2 months
            risk_score += 0.3
        elif client['visit_frequency'] < 1:  # Less than monthly
            risk_score += 0.2
        
        # Spending pattern
        if client['total_spent'] < 100:  # Low value client
            risk_score += 0.2
        
        # Total visits
        if client['visit_count'] < 3:  # New client
            risk_score += 0.1
        
        return min(risk_score, 1.0)
    
    def _identify_client_risk_factors(self, client: Dict[str, Any]) -> List[str]:
        """Identify risk factors for specific client"""
        factors = []
        
        if client['days_since_last_visit'] > 60:
            factors.append("Extended absence from location")
        
        if client['visit_frequency'] < 1:
            factors.append("Low visit frequency")
        
        if client['total_spent'] < 200:
            factors.append("Low total spending")
        
        if client['visit_count'] < 5:
            factors.append("Limited engagement history")
        
        return factors
    
    def _generate_churn_distribution(self, probabilities: List[float]) -> Dict[str, float]:
        """Generate churn probability distribution"""
        if not probabilities:
            return {}
        
        low_risk = sum(1 for p in probabilities if p < 0.3) / len(probabilities)
        medium_risk = sum(1 for p in probabilities if 0.3 <= p < 0.7) / len(probabilities)
        high_risk = sum(1 for p in probabilities if p >= 0.7) / len(probabilities)
        
        return {
            'low_risk': low_risk,
            'medium_risk': medium_risk,
            'high_risk': high_risk
        }
    
    def _identify_primary_churn_factors(self, client_data: List[Dict[str, Any]]) -> List[str]:
        """Identify primary factors causing churn"""
        return [
            "Extended periods between visits",
            "Low engagement with services",
            "Price sensitivity",
            "Service quality concerns",
            "Convenience and scheduling issues"
        ]
    
    def _generate_early_warning_indicators(self, client_data: List[Dict[str, Any]]) -> List[str]:
        """Generate early warning indicators for churn"""
        return [
            "45+ days since last visit",
            "Decline in booking frequency",
            "Cancelled or rescheduled appointments",
            "Reduced spending per visit",
            "No-show incidents"
        ]
    
    def _develop_retention_strategies(
        self, 
        at_risk_clients: List[Dict[str, Any]], 
        factors: List[str]
    ) -> List[str]:
        """Develop retention strategies"""
        return [
            "Implement proactive outreach for clients past due",
            "Create loyalty program with visit incentives",
            "Offer flexible scheduling and reminder systems",
            "Provide personalized service recommendations",
            "Conduct client satisfaction surveys and follow-up"
        ]
    
    def _create_intervention_recommendations(
        self, 
        at_risk_clients: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Create specific intervention recommendations"""
        recommendations = []
        
        for client in at_risk_clients[:5]:  # Top 5 at-risk clients
            if client['churn_probability'] > 0.8:
                urgency = "immediate"
                action = "Personal call from manager"
            elif client['churn_probability'] > 0.6:
                urgency = "high"
                action = "Personalized email with special offer"
            else:
                urgency = "medium"
                action = "Automated reminder with booking incentive"
            
            recommendations.append({
                'client_id': client['client_id'],
                'urgency': urgency,
                'recommended_action': action,
                'timeline': '7 days' if urgency == 'immediate' else '14 days'
            })
        
        return recommendations
    
    # Placeholder methods for additional analytics
    
    def _get_historical_appointment_data(self, location_id: int, weeks: int) -> List[Dict[str, Any]]:
        """Get historical appointment data"""
        # Placeholder implementation
        return []
    
    def _analyze_demand_patterns(self, appointments: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze appointment demand patterns"""
        # Placeholder implementation
        return {}
    
    def _predict_weekly_demand(self, patterns: Dict[str, Any], week: int) -> float:
        """Predict demand for specific week"""
        # Placeholder implementation
        return 20.0  # Average appointments per week
    
    def _calculate_demand_confidence(self, patterns: Dict[str, Any], week: int) -> Tuple[float, float]:
        """Calculate confidence interval for demand prediction"""
        # Placeholder implementation
        return (15.0, 25.0)  # Confidence interval
    
    def _get_pricing_performance_data(self, location_id: int) -> Dict[str, Any]:
        """Get pricing and performance data"""
        # Placeholder implementation
        return {}
    
    def _calculate_price_elasticity(self, data: Dict[str, Any]) -> float:
        """Calculate price elasticity of demand"""
        # Placeholder implementation
        return -1.2  # Elastic demand
    
    def _generate_pricing_scenarios(self, data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate pricing test scenarios"""
        # Placeholder implementation
        return []
    
    def _predict_pricing_impact(
        self, 
        scenario: Dict[str, Any], 
        elasticity: float, 
        current_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Predict impact of pricing scenario"""
        # Placeholder implementation
        return {
            'scenario_name': 'Test Scenario',
            'revenue_increase': 0.15,
            'net_revenue_impact': 1000,
            'min_impact': 800,
            'max_impact': 1200
        }