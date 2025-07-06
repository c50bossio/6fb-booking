"""
Predictive Modeling Service for Business Forecasting.

Provides ML-powered predictions for revenue, client behavior, and business trends
using both individual business data and cross-user patterns.
"""

import logging
import numpy as np
import pandas as pd
from typing import Dict, List, Optional, Any, Tuple, Union
from datetime import datetime, timedelta, date
from dataclasses import dataclass
from collections import defaultdict
import json
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc, extract

from models import (
    User, Appointment, Payment, Service, Client, 
    PredictiveModel, AIInsightCache, CrossUserMetric, PerformanceBenchmark,
    BusinessSegment, InsightType
)
from services.ai_benchmarking_service import AIBenchmarkingService
from services.analytics_service import AnalyticsService as EnhancedAnalyticsService

logger = logging.getLogger(__name__)


@dataclass
class PredictionResult:
    """Container for prediction results"""
    prediction_type: str
    predicted_value: float
    confidence_interval: Tuple[float, float]
    confidence_score: float
    time_horizon: str  # "1_month", "3_months", "6_months", "1_year"
    methodology: str
    factors_considered: List[str]
    underlying_data_points: int


@dataclass
class SeasonalPattern:
    """Container for seasonal trend data"""
    month: int
    seasonal_factor: float  # Multiplier relative to annual average
    confidence: float
    historical_data_points: int


class PredictiveModelingService:
    """
    Service for ML-powered business forecasting and predictions.
    
    Features:
    - Revenue forecasting with seasonal adjustments
    - Client churn prediction and retention analysis
    - Demand forecasting for capacity planning
    - Pricing optimization recommendations
    - Growth trajectory modeling
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.benchmarking_service = AIBenchmarkingService(db)
        self.analytics_service = EnhancedAnalyticsService(db)
        
    def predict_revenue_forecast(self, 
                                user_id: int, 
                                months_ahead: int = 6,
                                include_seasonal: bool = True) -> List[PredictionResult]:
        """
        Predict future revenue using historical data and seasonal patterns.
        
        Combines individual business trends with industry patterns for accurate forecasting.
        """
        
        # Get historical revenue data
        historical_data = self._get_historical_revenue(user_id, months_back=12)
        
        if len(historical_data) < 3:
            raise ValueError("Insufficient historical data for revenue prediction")
        
        # Get business segment for industry comparisons
        segment = self.benchmarking_service.get_user_business_segment(user_id)
        
        # Calculate base trend
        trend_slope = self._calculate_revenue_trend(historical_data)
        
        # Get seasonal patterns
        seasonal_patterns = self._get_seasonal_patterns(segment) if include_seasonal else {}
        
        predictions = []
        current_date = datetime.now().date()
        
        for month in range(1, months_ahead + 1):
            future_date = self._add_months(current_date, month)
            
            # Base prediction using trend
            base_prediction = self._calculate_base_prediction(historical_data, trend_slope, month)
            
            # Apply seasonal adjustment
            seasonal_factor = seasonal_patterns.get(future_date.month, 1.0)
            seasonally_adjusted = base_prediction * seasonal_factor
            
            # Apply industry growth patterns
            industry_factor = self._get_industry_growth_factor(segment, future_date)
            final_prediction = seasonally_adjusted * industry_factor
            
            # Calculate confidence interval
            confidence_interval = self._calculate_confidence_interval(
                final_prediction, historical_data, month
            )
            
            # Calculate confidence score
            confidence_score = self._calculate_confidence_score(
                len(historical_data), month, seasonal_factor
            )
            
            prediction = PredictionResult(
                prediction_type="revenue_forecast",
                predicted_value=max(0, final_prediction),
                confidence_interval=confidence_interval,
                confidence_score=confidence_score,
                time_horizon=f"{month}_months",
                methodology="trend_analysis_with_seasonal_adjustment",
                factors_considered=[
                    "historical_trend", 
                    "seasonal_patterns", 
                    "industry_growth",
                    f"{len(historical_data)}_months_historical_data"
                ],
                underlying_data_points=len(historical_data)
            )
            
            predictions.append(prediction)
        
        return predictions
    
    def predict_client_churn(self, user_id: int) -> Dict[str, Any]:
        """
        Predict which clients are at risk of churning.
        
        Uses recency, frequency, and monetary value analysis combined with
        industry patterns to identify at-risk clients.
        """
        
        # Get client data
        clients_data = self._get_client_rfm_data(user_id)
        
        if not clients_data:
            return {"at_risk_clients": [], "churn_insights": []}
        
        # Calculate churn risk scores
        churn_predictions = []
        
        for client_data in clients_data:
            risk_score = self._calculate_churn_risk_score(client_data)
            
            if risk_score > 0.6:  # High risk threshold
                churn_predictions.append({
                    "client_id": client_data["client_id"],
                    "client_name": client_data["client_name"],
                    "risk_score": risk_score,
                    "last_appointment": client_data["last_appointment"],
                    "days_since_last": client_data["days_since_last"],
                    "total_value": client_data["total_value"],
                    "appointment_frequency": client_data["frequency"],
                    "recommended_actions": self._get_retention_recommendations(client_data, risk_score)
                })
        
        # Sort by risk score
        churn_predictions.sort(key=lambda x: x["risk_score"], reverse=True)
        
        # Generate insights
        insights = self._generate_churn_insights(churn_predictions, len(clients_data))
        
        return {
            "at_risk_clients": churn_predictions[:20],  # Top 20 at-risk clients
            "total_clients_analyzed": len(clients_data),
            "high_risk_count": len([c for c in churn_predictions if c["risk_score"] > 0.8]),
            "medium_risk_count": len([c for c in churn_predictions if 0.6 <= c["risk_score"] <= 0.8]),
            "churn_insights": insights,
            "overall_churn_risk": np.mean([c["risk_score"] for c in churn_predictions]) if churn_predictions else 0.0
        }
    
    def predict_demand_patterns(self, user_id: int) -> Dict[str, Any]:
        """
        Predict future demand patterns for capacity planning.
        
        Analyzes booking patterns to forecast busy periods and optimal scheduling.
        """
        
        # Get historical appointment data
        historical_appointments = self._get_historical_appointments(user_id, days_back=90)
        
        if len(historical_appointments) < 30:
            raise ValueError("Insufficient appointment data for demand prediction")
        
        # Analyze patterns by day of week and hour
        demand_patterns = {
            "hourly_demand": self._analyze_hourly_demand(historical_appointments),
            "daily_demand": self._analyze_daily_demand(historical_appointments),
            "weekly_patterns": self._analyze_weekly_patterns(historical_appointments),
            "seasonal_trends": self._analyze_seasonal_demand(historical_appointments)
        }
        
        # Predict optimal capacity allocation
        capacity_recommendations = self._generate_capacity_recommendations(demand_patterns)
        
        # Identify peak periods
        peak_periods = self._identify_peak_periods(demand_patterns)
        
        return {
            "demand_patterns": demand_patterns,
            "capacity_recommendations": capacity_recommendations,
            "peak_periods": peak_periods,
            "optimization_opportunities": self._find_optimization_opportunities(demand_patterns),
            "data_confidence": min(1.0, len(historical_appointments) / 100)  # Higher confidence with more data
        }
    
    def predict_pricing_optimization(self, user_id: int, service_id: Optional[int] = None) -> Dict[str, Any]:
        """
        Predict optimal pricing based on demand, competition, and value analysis.
        """
        
        # Get current pricing and demand data
        pricing_data = self._get_pricing_analysis_data(user_id, service_id)
        
        if not pricing_data:
            return {"recommendations": [], "insights": []}
        
        # Get industry benchmarks for pricing
        segment = self.benchmarking_service.get_user_business_segment(user_id)
        
        recommendations = []
        
        for service_data in pricing_data:
            # Calculate demand elasticity
            elasticity = self._calculate_price_elasticity(service_data)
            
            # Get competitive pricing data
            market_data = self._get_market_pricing_data(segment, service_data["service_name"])
            
            # Calculate optimal price
            optimal_price = self._calculate_optimal_price(
                service_data, elasticity, market_data
            )
            
            # Calculate revenue impact
            revenue_impact = self._calculate_revenue_impact(
                service_data["current_price"], optimal_price, service_data["monthly_volume"]
            )
            
            recommendation = {
                "service_name": service_data["service_name"],
                "current_price": service_data["current_price"],
                "recommended_price": optimal_price,
                "price_change_percentage": ((optimal_price - service_data["current_price"]) / service_data["current_price"]) * 100,
                "estimated_revenue_impact": revenue_impact,
                "confidence_score": self._calculate_pricing_confidence(service_data, market_data),
                "rationale": self._generate_pricing_rationale(service_data, optimal_price, market_data)
            }
            
            recommendations.append(recommendation)
        
        # Generate pricing insights
        insights = self._generate_pricing_insights(recommendations)
        
        return {
            "recommendations": sorted(recommendations, key=lambda x: abs(x["estimated_revenue_impact"]), reverse=True),
            "insights": insights,
            "overall_revenue_opportunity": sum(r["estimated_revenue_impact"] for r in recommendations),
            "market_position_analysis": self._analyze_market_position(pricing_data, segment)
        }
    
    def _get_historical_revenue(self, user_id: int, months_back: int) -> List[Dict[str, Any]]:
        """Get historical monthly revenue data"""
        
        data = []
        current_date = datetime.now().date()
        
        for i in range(months_back, 0, -1):
            month_start = self._add_months(current_date, -i).replace(day=1)
            month_end = self._add_months(month_start, 1) - timedelta(days=1)
            
            revenue = self.db.query(func.sum(Payment.amount)).filter(
                Payment.user_id == user_id,
                Payment.created_at >= month_start,
                Payment.created_at <= month_end,
                Payment.status == "completed"
            ).scalar() or 0.0
            
            appointment_count = self.db.query(func.count(Appointment.id)).filter(
                Appointment.user_id == user_id,
                Appointment.start_time >= month_start,
                Appointment.start_time <= month_end,
                Appointment.status.in_(["confirmed", "completed"])
            ).scalar() or 0
            
            data.append({
                "month": month_start,
                "revenue": revenue,
                "appointments": appointment_count,
                "revenue_per_appointment": revenue / appointment_count if appointment_count > 0 else 0
            })
        
        return data
    
    def _calculate_revenue_trend(self, historical_data: List[Dict[str, Any]]) -> float:
        """Calculate revenue trend slope using linear regression"""
        
        if len(historical_data) < 2:
            return 0.0
        
        # Simple linear regression on revenue data
        x = np.arange(len(historical_data))
        y = np.array([d["revenue"] for d in historical_data])
        
        # Calculate slope (trend)
        if np.std(x) == 0:
            return 0.0
        
        slope = np.corrcoef(x, y)[0, 1] * (np.std(y) / np.std(x))
        return slope
    
    def _get_seasonal_patterns(self, segment: BusinessSegment) -> Dict[int, float]:
        """Get seasonal adjustment factors from cross-user data"""
        
        # Query cross-user seasonal patterns for this business segment
        seasonal_data = self.db.query(
            extract('month', CrossUserMetric.date).label('month'),
            func.avg(
                func.case(
                    [(CrossUserMetric.revenue_bucket == 'high', 1.2)],
                    [(CrossUserMetric.revenue_bucket == 'medium', 1.0)],
                    else_=0.8
                )
            ).label('seasonal_factor')
        ).filter(
            CrossUserMetric.business_segment == segment.value,
            CrossUserMetric.date >= datetime.now() - timedelta(days=365 * 2)  # 2 years of data
        ).group_by(extract('month', CrossUserMetric.date)).all()
        
        # Convert to dictionary with month -> seasonal factor
        seasonal_patterns = {}
        for month, factor in seasonal_data:
            seasonal_patterns[int(month)] = factor if factor else 1.0
        
        # Fill missing months with average
        if seasonal_patterns:
            avg_factor = np.mean(list(seasonal_patterns.values()))
            for month in range(1, 13):
                if month not in seasonal_patterns:
                    seasonal_patterns[month] = avg_factor
        else:
            # Default seasonal pattern for barbershops
            seasonal_patterns = {
                1: 0.9,   # January - slower after holidays
                2: 0.95,  # February
                3: 1.1,   # March - spring prep
                4: 1.05,  # April
                5: 1.15,  # May - wedding season
                6: 1.1,   # June
                7: 1.0,   # July
                8: 1.0,   # August
                9: 1.05,  # September - back to school
                10: 1.1,  # October
                11: 1.15, # November - holiday prep
                12: 1.2   # December - holiday season
            }
        
        return seasonal_patterns
    
    def _calculate_base_prediction(self, historical_data: List[Dict[str, Any]], trend_slope: float, months_ahead: int) -> float:
        """Calculate base prediction using trend analysis"""
        
        if not historical_data:
            return 0.0
        
        # Use average of last 3 months as base
        recent_average = np.mean([d["revenue"] for d in historical_data[-3:]])
        
        # Apply trend
        predicted_value = recent_average + (trend_slope * months_ahead)
        
        return max(0, predicted_value)
    
    def _get_industry_growth_factor(self, segment: BusinessSegment, future_date: date) -> float:
        """Get industry growth factor from benchmarks"""
        
        # Look for recent industry growth patterns
        current_year = datetime.now().year
        
        # Query recent benchmarks to calculate growth rate
        recent_benchmarks = self.db.query(PerformanceBenchmark).filter(
            PerformanceBenchmark.business_segment == segment.value,
            PerformanceBenchmark.category == "revenue",
            PerformanceBenchmark.year >= current_year - 1
        ).order_by(PerformanceBenchmark.year, PerformanceBenchmark.month).all()
        
        if len(recent_benchmarks) >= 2:
            # Calculate year-over-year growth
            latest = recent_benchmarks[-1]
            previous = recent_benchmarks[0]
            
            if previous.mean_value > 0:
                growth_rate = (latest.mean_value - previous.mean_value) / previous.mean_value
                # Apply monthly growth rate
                monthly_growth = (1 + growth_rate) ** (1/12)
                months_into_future = (future_date.year - current_year) * 12 + (future_date.month - datetime.now().month)
                return monthly_growth ** months_into_future
        
        # Default modest growth assumption
        return 1.01 ** ((future_date.year - current_year) * 12 + (future_date.month - datetime.now().month))
    
    def _calculate_confidence_interval(self, prediction: float, historical_data: List[Dict[str, Any]], months_ahead: int) -> Tuple[float, float]:
        """Calculate confidence interval for prediction"""
        
        if len(historical_data) < 2:
            margin = prediction * 0.3  # 30% margin if insufficient data
            return (max(0, prediction - margin), prediction + margin)
        
        # Calculate historical variance
        revenues = [d["revenue"] for d in historical_data]
        std_dev = np.std(revenues)
        
        # Increase uncertainty with longer prediction horizon
        uncertainty_factor = 1 + (months_ahead * 0.1)  # 10% more uncertainty per month
        margin = std_dev * uncertainty_factor
        
        return (max(0, prediction - margin), prediction + margin)
    
    def _calculate_confidence_score(self, data_points: int, months_ahead: int, seasonal_factor: float) -> float:
        """Calculate confidence score (0-1) for prediction"""
        
        # Base confidence from data quantity
        data_confidence = min(1.0, data_points / 12)  # Full confidence with 12+ months
        
        # Reduce confidence for longer predictions
        time_confidence = max(0.3, 1.0 - (months_ahead * 0.1))
        
        # Reduce confidence for extreme seasonal adjustments
        seasonal_confidence = max(0.7, 1.0 - abs(seasonal_factor - 1.0))
        
        return data_confidence * time_confidence * seasonal_confidence
    
    def _add_months(self, start_date: date, months: int) -> date:
        """Add months to a date"""
        
        month = start_date.month - 1 + months
        year = start_date.year + month // 12
        month = month % 12 + 1
        day = min(start_date.day, [31, 28 + (year % 4 == 0 and (year % 100 != 0 or year % 400 == 0)), 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1])
        
        return date(year, month, day)
    
    def _get_client_rfm_data(self, user_id: int) -> List[Dict[str, Any]]:
        """Get Recency, Frequency, Monetary data for clients"""
        
        ninety_days_ago = datetime.now() - timedelta(days=90)
        
        # Query client appointment and payment data
        client_data = self.db.query(
            Client.id,
            Client.name,
            func.max(Appointment.start_time).label('last_appointment'),
            func.count(Appointment.id).label('appointment_count'),
            func.sum(Payment.amount).label('total_value')
        ).join(
            Appointment, Appointment.client_id == Client.id
        ).outerjoin(
            Payment, Payment.appointment_id == Appointment.id
        ).filter(
            Appointment.user_id == user_id,
            Appointment.start_time >= ninety_days_ago,
            Appointment.status.in_(["confirmed", "completed"])
        ).group_by(Client.id, Client.name).all()
        
        rfm_data = []
        for client in client_data:
            days_since_last = (datetime.now() - client.last_appointment).days if client.last_appointment else 999
            
            rfm_data.append({
                "client_id": client.id,
                "client_name": client.name,
                "last_appointment": client.last_appointment,
                "days_since_last": days_since_last,
                "frequency": client.appointment_count or 0,
                "total_value": client.total_value or 0.0
            })
        
        return rfm_data
    
    def _calculate_churn_risk_score(self, client_data: Dict[str, Any]) -> float:
        """Calculate churn risk score for a client (0-1)"""
        
        # Recency component (higher score for longer absence)
        days_since = client_data["days_since_last"]
        recency_score = min(1.0, days_since / 60)  # Max score after 60 days
        
        # Frequency component (lower score for higher frequency)
        frequency = client_data["frequency"]
        frequency_score = max(0.0, 1.0 - (frequency / 10))  # Lower risk for frequent clients
        
        # Monetary component (lower score for higher value)
        total_value = client_data["total_value"]
        monetary_score = max(0.0, 1.0 - (total_value / 500))  # Lower risk for high-value clients
        
        # Weighted combination
        risk_score = (recency_score * 0.5) + (frequency_score * 0.3) + (monetary_score * 0.2)
        
        return min(1.0, risk_score)
    
    def _get_retention_recommendations(self, client_data: Dict[str, Any], risk_score: float) -> List[str]:
        """Generate retention recommendations for at-risk client"""
        
        recommendations = []
        
        if client_data["days_since_last"] > 45:
            recommendations.append("Send personalized re-engagement message")
        
        if client_data["total_value"] > 200:
            recommendations.append("Offer VIP loyalty program or exclusive services")
        
        if risk_score > 0.8:
            recommendations.append("Call personally to check satisfaction and schedule appointment")
        
        recommendations.append("Send targeted promotion or discount offer")
        
        return recommendations
    
    def _generate_churn_insights(self, churn_predictions: List[Dict[str, Any]], total_clients: int) -> List[str]:
        """Generate insights about client churn patterns"""
        
        insights = []
        
        high_risk_count = len([c for c in churn_predictions if c["risk_score"] > 0.8])
        churn_rate = len(churn_predictions) / total_clients if total_clients > 0 else 0
        
        if churn_rate > 0.2:
            insights.append(f"High client retention risk: {churn_rate:.1%} of clients are at risk")
        
        if high_risk_count > 0:
            avg_value = np.mean([c["total_value"] for c in churn_predictions[:high_risk_count]])
            insights.append(f"{high_risk_count} high-value clients at immediate risk (avg value: ${avg_value:.0f})")
        
        # Common patterns
        avg_days = np.mean([c["days_since_last"] for c in churn_predictions]) if churn_predictions else 0
        if avg_days > 30:
            insights.append(f"Average time since last visit: {avg_days:.0f} days - consider proactive outreach")
        
        return insights
    
    def _get_historical_appointments(self, user_id: int, days_back: int) -> List[Dict[str, Any]]:
        """Get historical appointment data for demand analysis"""
        
        start_date = datetime.now() - timedelta(days=days_back)
        
        appointments = self.db.query(
            Appointment.start_time,
            Appointment.duration_minutes,
            Service.name.label('service_name'),
            Service.category
        ).join(
            Service, Appointment.service_id == Service.id, isouter=True
        ).filter(
            Appointment.user_id == user_id,
            Appointment.start_time >= start_date,
            Appointment.status.in_(["confirmed", "completed"])
        ).all()
        
        return [
            {
                "start_time": apt.start_time,
                "hour": apt.start_time.hour,
                "day_of_week": apt.start_time.weekday(),
                "duration": apt.duration_minutes or 60,
                "service_name": apt.service_name,
                "service_category": apt.category
            }
            for apt in appointments
        ]
    
    def _analyze_hourly_demand(self, appointments: List[Dict[str, Any]]) -> Dict[int, float]:
        """Analyze demand patterns by hour of day"""
        
        hourly_counts = defaultdict(int)
        for apt in appointments:
            hourly_counts[apt["hour"]] += 1
        
        total_appointments = len(appointments)
        if total_appointments == 0:
            return {}
        
        # Convert to percentages
        return {hour: count / total_appointments for hour, count in hourly_counts.items()}
    
    def _analyze_daily_demand(self, appointments: List[Dict[str, Any]]) -> Dict[int, float]:
        """Analyze demand patterns by day of week"""
        
        daily_counts = defaultdict(int)
        for apt in appointments:
            daily_counts[apt["day_of_week"]] += 1
        
        total_appointments = len(appointments)
        if total_appointments == 0:
            return {}
        
        return {day: count / total_appointments for day, count in daily_counts.items()}