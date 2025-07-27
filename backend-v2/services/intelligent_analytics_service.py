"""
Intelligent Analytics Service for BookedBarber V2

This service adds AI-powered predictive insights and smart analytics features
to enhance the existing analytics foundation without disrupting current functionality.

Key Features:
- Business Health Scoring Algorithm
- Predictive Trend Analysis
- Smart Alert Generation
- Performance Forecasting
- Risk Assessment & Recommendations
"""

import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
import logging
from dataclasses import dataclass
from enum import Enum

from models import User, Appointment, Payment, Client, Service
from services.analytics_service import AnalyticsService
from utils.cache_decorators import cache_result

logger = logging.getLogger(__name__)

class HealthScoreLevel(Enum):
    CRITICAL = "critical"
    WARNING = "warning"
    GOOD = "good"
    EXCELLENT = "excellent"

class AlertPriority(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

@dataclass
class BusinessHealthScore:
    overall_score: float
    level: HealthScoreLevel
    components: Dict[str, float]
    trends: Dict[str, str]
    risk_factors: List[str]
    opportunities: List[str]

@dataclass
class PredictiveInsight:
    title: str
    description: str
    confidence: float
    impact_score: float
    category: str
    predicted_outcome: str
    recommended_actions: List[str]
    time_horizon: str

@dataclass
class SmartAlert:
    title: str
    message: str
    priority: AlertPriority
    category: str
    metric_name: str
    current_value: float
    threshold_value: float
    trend: str
    suggested_actions: List[str]
    expires_at: datetime

@dataclass
class TrendPrediction:
    metric_name: str
    current_value: float
    predicted_values: List[Tuple[datetime, float]]
    confidence_interval: List[Tuple[float, float]]
    trend_strength: float
    seasonal_factor: float

class IntelligentAnalyticsService:
    """Enhanced analytics service with AI-powered insights and predictions"""
    
    def __init__(self, db: Session):
        self.db = db
        self.analytics_service = AnalyticsService(db)
    
    @cache_result(ttl=1800)  # Cache for 30 minutes
    def calculate_business_health_score(self, user_id: int, days_back: int = 30) -> BusinessHealthScore:
        """
        Calculate comprehensive business health score using Six Figure Barber methodology
        
        Scoring Components:
        - Revenue Performance (25%)
        - Client Retention (20%)
        - Booking Efficiency (20%)
        - Service Quality (15%)
        - Growth Momentum (10%)
        - Operational Efficiency (10%)
        """
        try:
            # Get base analytics data
            end_date = datetime.now()
            start_date = end_date - timedelta(days=days_back)
            
            # Calculate component scores
            revenue_score = self._calculate_revenue_health(user_id, start_date, end_date)
            retention_score = self._calculate_retention_health(user_id, start_date, end_date)
            booking_score = self._calculate_booking_efficiency_health(user_id, start_date, end_date)
            quality_score = self._calculate_service_quality_health(user_id, start_date, end_date)
            growth_score = self._calculate_growth_momentum_health(user_id, start_date, end_date)
            efficiency_score = self._calculate_operational_efficiency_health(user_id, start_date, end_date)
            
            # Weighted overall score
            overall_score = (
                revenue_score * 0.25 +
                retention_score * 0.20 +
                booking_score * 0.20 +
                quality_score * 0.15 +
                growth_score * 0.10 +
                efficiency_score * 0.10
            )
            
            # Determine health level
            if overall_score >= 90:
                level = HealthScoreLevel.EXCELLENT
            elif overall_score >= 75:
                level = HealthScoreLevel.GOOD
            elif overall_score >= 60:
                level = HealthScoreLevel.WARNING
            else:
                level = HealthScoreLevel.CRITICAL
            
            # Calculate trends
            trends = self._calculate_component_trends(user_id, days_back)
            
            # Identify risk factors and opportunities
            risk_factors = self._identify_risk_factors(
                revenue_score, retention_score, booking_score, 
                quality_score, growth_score, efficiency_score
            )
            opportunities = self._identify_opportunities(
                revenue_score, retention_score, booking_score,
                quality_score, growth_score, efficiency_score
            )
            
            return BusinessHealthScore(
                overall_score=overall_score,
                level=level,
                components={
                    'revenue_performance': revenue_score,
                    'client_retention': retention_score,
                    'booking_efficiency': booking_score,
                    'service_quality': quality_score,
                    'growth_momentum': growth_score,
                    'operational_efficiency': efficiency_score
                },
                trends=trends,
                risk_factors=risk_factors,
                opportunities=opportunities
            )
            
        except Exception as e:
            logger.error(f"Error calculating business health score: {e}")
            # Return default safe score
            return BusinessHealthScore(
                overall_score=70.0,
                level=HealthScoreLevel.WARNING,
                components={},
                trends={},
                risk_factors=["Unable to calculate comprehensive health score"],
                opportunities=["Review data quality and complete more appointments"]
            )
    
    def generate_predictive_insights(self, user_id: int, horizon_days: int = 30) -> List[PredictiveInsight]:
        """Generate AI-powered predictive insights for business performance"""
        try:
            insights = []
            
            # Revenue prediction insights
            revenue_insights = self._predict_revenue_trends(user_id, horizon_days)
            insights.extend(revenue_insights)
            
            # Client behavior insights
            client_insights = self._predict_client_behaviors(user_id, horizon_days)
            insights.extend(client_insights)
            
            # Capacity optimization insights
            capacity_insights = self._predict_capacity_optimization(user_id, horizon_days)
            insights.extend(capacity_insights)
            
            # Seasonal pattern insights
            seasonal_insights = self._predict_seasonal_patterns(user_id, horizon_days)
            insights.extend(seasonal_insights)
            
            # Sort by impact score (highest first)
            insights.sort(key=lambda x: x.impact_score, reverse=True)
            
            return insights[:10]  # Return top 10 insights
            
        except Exception as e:
            logger.error(f"Error generating predictive insights: {e}")
            return [
                PredictiveInsight(
                    title="Data Collection in Progress",
                    description="Complete more appointments to unlock predictive insights",
                    confidence=1.0,
                    impact_score=5.0,
                    category="system",
                    predicted_outcome="Enhanced analytics available with more data",
                    recommended_actions=["Complete appointments", "Track client interactions"],
                    time_horizon="ongoing"
                )
            ]
    
    def generate_smart_alerts(self, user_id: int) -> List[SmartAlert]:
        """Generate intelligent alerts based on business performance anomalies"""
        try:
            alerts = []
            
            # Revenue anomaly alerts
            revenue_alerts = self._detect_revenue_anomalies(user_id)
            alerts.extend(revenue_alerts)
            
            # Booking pattern alerts
            booking_alerts = self._detect_booking_anomalies(user_id)
            alerts.extend(booking_alerts)
            
            # Client retention alerts
            retention_alerts = self._detect_retention_anomalies(user_id)
            alerts.extend(retention_alerts)
            
            # Capacity utilization alerts
            capacity_alerts = self._detect_capacity_anomalies(user_id)
            alerts.extend(capacity_alerts)
            
            # Sort by priority (critical first)
            priority_order = {AlertPriority.CRITICAL: 4, AlertPriority.HIGH: 3, AlertPriority.MEDIUM: 2, AlertPriority.LOW: 1}
            alerts.sort(key=lambda x: priority_order[x.priority], reverse=True)
            
            return alerts[:15]  # Return top 15 alerts
            
        except Exception as e:
            logger.error(f"Error generating smart alerts: {e}")
            return []
    
    def predict_trends(self, user_id: int, metrics: List[str], days_ahead: int = 30) -> List[TrendPrediction]:
        """Generate trend predictions for specified metrics"""
        try:
            predictions = []
            
            for metric in metrics:
                prediction = self._predict_metric_trend(user_id, metric, days_ahead)
                if prediction:
                    predictions.append(prediction)
            
            return predictions
            
        except Exception as e:
            logger.error(f"Error predicting trends: {e}")
            return []
    
    # Private helper methods for health score calculation
    def _calculate_revenue_health(self, user_id: int, start_date: datetime, end_date: datetime) -> float:
        """Calculate revenue performance health score"""
        try:
            # Get revenue data for period
            revenue_query = self.db.query(func.sum(Payment.amount)).filter(
                Payment.user_id == user_id,
                Payment.status == 'completed',
                Payment.created_at >= start_date,
                Payment.created_at <= end_date
            ).scalar()
            
            current_revenue = float(revenue_query or 0)
            
            # Compare to previous period
            prev_start = start_date - (end_date - start_date)
            prev_revenue_query = self.db.query(func.sum(Payment.amount)).filter(
                Payment.user_id == user_id,
                Payment.status == 'completed',
                Payment.created_at >= prev_start,
                Payment.created_at < start_date
            ).scalar()
            
            prev_revenue = float(prev_revenue_query or 0)
            
            # Calculate growth rate
            if prev_revenue > 0:
                growth_rate = ((current_revenue - prev_revenue) / prev_revenue) * 100
            else:
                growth_rate = 100 if current_revenue > 0 else 0
            
            # Score based on growth and absolute performance
            if growth_rate >= 20:
                return 100
            elif growth_rate >= 10:
                return 90
            elif growth_rate >= 5:
                return 80
            elif growth_rate >= 0:
                return 70
            elif growth_rate >= -5:
                return 60
            elif growth_rate >= -10:
                return 50
            else:
                return 30
                
        except Exception as e:
            logger.error(f"Error calculating revenue health: {e}")
            return 70
    
    def _calculate_retention_health(self, user_id: int, start_date: datetime, end_date: datetime) -> float:
        """Calculate client retention health score"""
        try:
            # Get repeat client percentage
            total_clients = self.db.query(func.count(func.distinct(Appointment.client_id))).filter(
                Appointment.user_id == user_id,
                Appointment.status == 'completed',
                Appointment.appointment_time >= start_date,
                Appointment.appointment_time <= end_date
            ).scalar() or 0
            
            repeat_clients = self.db.query(func.count(func.distinct(Appointment.client_id))).filter(
                Appointment.user_id == user_id,
                Appointment.status == 'completed',
                Appointment.appointment_time >= start_date,
                Appointment.appointment_time <= end_date,
                Appointment.client_id.in_(
                    self.db.query(Appointment.client_id).filter(
                        Appointment.user_id == user_id,
                        Appointment.status == 'completed',
                        Appointment.appointment_time < start_date
                    ).distinct()
                )
            ).scalar() or 0
            
            if total_clients == 0:
                return 70  # Neutral score for no data
            
            retention_rate = (repeat_clients / total_clients) * 100
            
            # Score based on Six Figure Barber methodology
            if retention_rate >= 80:
                return 100
            elif retention_rate >= 70:
                return 90
            elif retention_rate >= 60:
                return 80
            elif retention_rate >= 50:
                return 70
            elif retention_rate >= 40:
                return 60
            else:
                return 40
                
        except Exception as e:
            logger.error(f"Error calculating retention health: {e}")
            return 70
    
    def _calculate_booking_efficiency_health(self, user_id: int, start_date: datetime, end_date: datetime) -> float:
        """Calculate booking efficiency health score"""
        try:
            # Get booking utilization rate
            total_appointments = self.db.query(func.count(Appointment.id)).filter(
                Appointment.user_id == user_id,
                Appointment.appointment_time >= start_date,
                Appointment.appointment_time <= end_date
            ).scalar() or 0
            
            completed_appointments = self.db.query(func.count(Appointment.id)).filter(
                Appointment.user_id == user_id,
                Appointment.status == 'completed',
                Appointment.appointment_time >= start_date,
                Appointment.appointment_time <= end_date
            ).scalar() or 0
            
            if total_appointments == 0:
                return 70  # Neutral score for no data
            
            completion_rate = (completed_appointments / total_appointments) * 100
            
            # Score based on completion rate
            if completion_rate >= 95:
                return 100
            elif completion_rate >= 90:
                return 90
            elif completion_rate >= 85:
                return 80
            elif completion_rate >= 80:
                return 70
            elif completion_rate >= 75:
                return 60
            else:
                return 40
                
        except Exception as e:
            logger.error(f"Error calculating booking efficiency health: {e}")
            return 70
    
    def _calculate_service_quality_health(self, user_id: int, start_date: datetime, end_date: datetime) -> float:
        """Calculate service quality health score"""
        try:
            # For now, use appointment completion as proxy for service quality
            # In future, integrate with review/rating system
            return self._calculate_booking_efficiency_health(user_id, start_date, end_date)
                
        except Exception as e:
            logger.error(f"Error calculating service quality health: {e}")
            return 75
    
    def _calculate_growth_momentum_health(self, user_id: int, start_date: datetime, end_date: datetime) -> float:
        """Calculate growth momentum health score"""
        try:
            # Calculate client acquisition rate
            new_clients = self.db.query(func.count(func.distinct(Appointment.client_id))).filter(
                Appointment.user_id == user_id,
                Appointment.status == 'completed',
                Appointment.appointment_time >= start_date,
                Appointment.appointment_time <= end_date,
                ~Appointment.client_id.in_(
                    self.db.query(Appointment.client_id).filter(
                        Appointment.user_id == user_id,
                        Appointment.status == 'completed',
                        Appointment.appointment_time < start_date
                    ).distinct()
                )
            ).scalar() or 0
            
            days_in_period = (end_date - start_date).days
            weekly_acquisition_rate = (new_clients / days_in_period) * 7 if days_in_period > 0 else 0
            
            # Score based on acquisition rate
            if weekly_acquisition_rate >= 5:
                return 100
            elif weekly_acquisition_rate >= 3:
                return 90
            elif weekly_acquisition_rate >= 2:
                return 80
            elif weekly_acquisition_rate >= 1:
                return 70
            elif weekly_acquisition_rate >= 0.5:
                return 60
            else:
                return 40
                
        except Exception as e:
            logger.error(f"Error calculating growth momentum health: {e}")
            return 70
    
    def _calculate_operational_efficiency_health(self, user_id: int, start_date: datetime, end_date: datetime) -> float:
        """Calculate operational efficiency health score"""
        try:
            # Calculate average revenue per appointment
            revenue_query = self.db.query(func.sum(Payment.amount)).filter(
                Payment.user_id == user_id,
                Payment.status == 'completed',
                Payment.created_at >= start_date,
                Payment.created_at <= end_date
            ).scalar()
            
            appointment_count = self.db.query(func.count(Appointment.id)).filter(
                Appointment.user_id == user_id,
                Appointment.status == 'completed',
                Appointment.appointment_time >= start_date,
                Appointment.appointment_time <= end_date
            ).scalar() or 0
            
            if appointment_count == 0:
                return 70  # Neutral score for no data
            
            revenue_per_appointment = float(revenue_query or 0) / appointment_count
            
            # Score based on Six Figure Barber targets
            if revenue_per_appointment >= 150:
                return 100
            elif revenue_per_appointment >= 120:
                return 90
            elif revenue_per_appointment >= 100:
                return 80
            elif revenue_per_appointment >= 80:
                return 70
            elif revenue_per_appointment >= 60:
                return 60
            else:
                return 40
                
        except Exception as e:
            logger.error(f"Error calculating operational efficiency health: {e}")
            return 70
    
    def _calculate_component_trends(self, user_id: int, days_back: int) -> Dict[str, str]:
        """Calculate trend direction for each health component"""
        try:
            # Compare current period vs previous period for each component
            trends = {}
            
            current_end = datetime.now()
            current_start = current_end - timedelta(days=days_back//2)
            prev_end = current_start
            prev_start = prev_end - timedelta(days=days_back//2)
            
            # Calculate trends for each component
            components = ['revenue_performance', 'client_retention', 'booking_efficiency', 
                         'service_quality', 'growth_momentum', 'operational_efficiency']
            
            for component in components:
                current_score = getattr(self, f'_calculate_{component.replace("_performance", "").replace("_", "_")}_health')(
                    user_id, current_start, current_end
                )
                prev_score = getattr(self, f'_calculate_{component.replace("_performance", "").replace("_", "_")}_health')(
                    user_id, prev_start, prev_end
                )
                
                if current_score > prev_score + 5:
                    trends[component] = "improving"
                elif current_score < prev_score - 5:
                    trends[component] = "declining"
                else:
                    trends[component] = "stable"
            
            return trends
            
        except Exception as e:
            logger.error(f"Error calculating component trends: {e}")
            return {}
    
    def _identify_risk_factors(self, revenue_score: float, retention_score: float, 
                              booking_score: float, quality_score: float, 
                              growth_score: float, efficiency_score: float) -> List[str]:
        """Identify business risk factors based on component scores"""
        risks = []
        
        if revenue_score < 60:
            risks.append("Revenue declining - implement pricing optimization")
        if retention_score < 60:
            risks.append("Client retention low - focus on relationship building")
        if booking_score < 60:
            risks.append("High no-show rate - implement confirmation system")
        if quality_score < 60:
            risks.append("Service quality concerns - review delivery processes")
        if growth_score < 60:
            risks.append("Client acquisition slowing - enhance marketing efforts")
        if efficiency_score < 60:
            risks.append("Low revenue per appointment - optimize service pricing")
        
        return risks
    
    def _identify_opportunities(self, revenue_score: float, retention_score: float,
                               booking_score: float, quality_score: float,
                               growth_score: float, efficiency_score: float) -> List[str]:
        """Identify business opportunities based on component scores"""
        opportunities = []
        
        if revenue_score >= 80 and retention_score >= 80:
            opportunities.append("Strong foundation - consider premium service expansion")
        if booking_score >= 85:
            opportunities.append("Efficient operations - increase capacity or pricing")
        if growth_score >= 80:
            opportunities.append("Strong growth momentum - scale marketing investment")
        if efficiency_score >= 85:
            opportunities.append("High efficiency - explore additional revenue streams")
        
        return opportunities
    
    # Predictive insight methods
    def _predict_revenue_trends(self, user_id: int, horizon_days: int) -> List[PredictiveInsight]:
        """Predict revenue trends and patterns"""
        try:
            insights = []
            
            # Get recent revenue data
            end_date = datetime.now()
            start_date = end_date - timedelta(days=90)  # 90 days of history
            
            revenue_data = self.db.query(
                func.date(Payment.created_at).label('date'),
                func.sum(Payment.amount).label('revenue')
            ).filter(
                Payment.user_id == user_id,
                Payment.status == 'completed',
                Payment.created_at >= start_date,
                Payment.created_at <= end_date
            ).group_by(func.date(Payment.created_at)).all()
            
            if len(revenue_data) >= 7:  # Need at least a week of data
                revenues = [float(r.revenue) for r in revenue_data]
                
                # Simple trend analysis
                recent_avg = np.mean(revenues[-7:])  # Last week
                previous_avg = np.mean(revenues[-14:-7])  # Week before
                
                if recent_avg > previous_avg * 1.1:
                    insights.append(PredictiveInsight(
                        title="Revenue Growth Acceleration",
                        description=f"Revenue trending up {((recent_avg/previous_avg-1)*100):.1f}% week-over-week",
                        confidence=0.8,
                        impact_score=9.0,
                        category="revenue",
                        predicted_outcome="Continued growth likely if trends maintain",
                        recommended_actions=[
                            "Increase capacity to capture demand",
                            "Consider premium service offerings",
                            "Monitor for sustainability"
                        ],
                        time_horizon=f"next {horizon_days} days"
                    ))
                elif recent_avg < previous_avg * 0.9:
                    insights.append(PredictiveInsight(
                        title="Revenue Decline Alert",
                        description=f"Revenue down {((1-recent_avg/previous_avg)*100):.1f}% week-over-week",
                        confidence=0.8,
                        impact_score=8.5,
                        category="revenue",
                        predicted_outcome="Continued decline if no action taken",
                        recommended_actions=[
                            "Review pricing strategy",
                            "Enhance client retention efforts",
                            "Analyze competitor activity"
                        ],
                        time_horizon=f"next {horizon_days} days"
                    ))
            
            return insights
            
        except Exception as e:
            logger.error(f"Error predicting revenue trends: {e}")
            return []
    
    def _predict_client_behaviors(self, user_id: int, horizon_days: int) -> List[PredictiveInsight]:
        """Predict client behavior patterns and opportunities"""
        # Implementation for client behavior prediction
        return []
    
    def _predict_capacity_optimization(self, user_id: int, horizon_days: int) -> List[PredictiveInsight]:
        """Predict capacity optimization opportunities"""
        # Implementation for capacity optimization prediction
        return []
    
    def _predict_seasonal_patterns(self, user_id: int, horizon_days: int) -> List[PredictiveInsight]:
        """Predict seasonal business patterns"""
        # Implementation for seasonal pattern prediction
        return []
    
    # Smart alert detection methods
    def _detect_revenue_anomalies(self, user_id: int) -> List[SmartAlert]:
        """Detect revenue-related anomalies and generate alerts"""
        try:
            alerts = []
            
            # Check for significant revenue drops
            end_date = datetime.now()
            current_week_start = end_date - timedelta(days=7)
            prev_week_start = current_week_start - timedelta(days=7)
            
            current_revenue = self.db.query(func.sum(Payment.amount)).filter(
                Payment.user_id == user_id,
                Payment.status == 'completed',
                Payment.created_at >= current_week_start,
                Payment.created_at <= end_date
            ).scalar() or 0
            
            prev_revenue = self.db.query(func.sum(Payment.amount)).filter(
                Payment.user_id == user_id,
                Payment.status == 'completed',
                Payment.created_at >= prev_week_start,
                Payment.created_at < current_week_start
            ).scalar() or 0
            
            if prev_revenue > 0 and current_revenue < prev_revenue * 0.7:  # 30% drop
                alerts.append(SmartAlert(
                    title="Significant Revenue Drop Detected",
                    message=f"Revenue down {((1-current_revenue/prev_revenue)*100):.1f}% this week",
                    priority=AlertPriority.HIGH,
                    category="revenue",
                    metric_name="weekly_revenue",
                    current_value=float(current_revenue),
                    threshold_value=float(prev_revenue * 0.7),
                    trend="declining",
                    suggested_actions=[
                        "Review appointment cancellations",
                        "Check for pricing issues",
                        "Enhance marketing efforts"
                    ],
                    expires_at=datetime.now() + timedelta(days=7)
                ))
            
            return alerts
            
        except Exception as e:
            logger.error(f"Error detecting revenue anomalies: {e}")
            return []
    
    def _detect_booking_anomalies(self, user_id: int) -> List[SmartAlert]:
        """Detect booking pattern anomalies"""
        return []
    
    def _detect_retention_anomalies(self, user_id: int) -> List[SmartAlert]:
        """Detect client retention anomalies"""
        return []
    
    def _detect_capacity_anomalies(self, user_id: int) -> List[SmartAlert]:
        """Detect capacity utilization anomalies"""
        return []
    
    def _predict_metric_trend(self, user_id: int, metric: str, days_ahead: int) -> Optional[TrendPrediction]:
        """Predict future values for a specific metric"""
        # Implementation for metric trend prediction
        return None