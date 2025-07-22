"""
Client Lifetime Value (CLV) Service - Six Figure Barber Methodology

Implements comprehensive CLV calculations aligned with Six Figure Barber principles:
- Predictive CLV modeling based on client behavior patterns
- Tier-based revenue optimization strategies
- Retention probability and churn risk assessment
- Value-based client segmentation and targeting
- ROI analysis for client acquisition and retention investments
"""

from datetime import datetime, timedelta, date
from typing import Dict, List, Optional, Tuple, Any, Union
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, desc, extract
import logging
from decimal import Decimal, ROUND_HALF_UP
import statistics
from dataclasses import dataclass

from models import Client, Appointment, Payment, Service, User
from services.client_tier_service import ClientTierService, ClientTier
from schemas import DateRange

logger = logging.getLogger(__name__)

@dataclass
class CLVMetrics:
    """Comprehensive CLV metrics for a client"""
    client_id: int
    historical_clv: float           # Actual spend to date
    predicted_clv: float           # Predicted future value
    remaining_clv: float           # Predicted remaining value
    average_ticket: float          # Average transaction value
    visit_frequency: float         # Visits per month
    last_visit_days_ago: int       # Days since last visit
    total_visits: int              # Total visits to date
    client_tier: str               # Current tier (platinum, gold, silver, bronze, new)
    retention_probability: float    # Probability of returning (0-1)
    churn_risk: str                # Low, Medium, High
    value_growth_trend: str        # Increasing, Stable, Declining
    recommended_actions: List[str]  # Six Figure methodology recommendations
    months_active: int             # Total months as client
    lifetime_value_score: float    # Composite score (0-100)

@dataclass
class CLVAnalysis:
    """CLV analysis for a barber's entire client base"""
    total_clients: int
    total_historical_clv: float
    total_predicted_clv: float
    average_clv: float
    median_clv: float
    clv_by_tier: Dict[str, Dict[str, float]]
    top_20_percent_clv: float
    bottom_20_percent_clv: float
    high_value_client_count: int
    at_risk_client_count: int
    growth_opportunity_clv: float
    acquisition_recommendations: Dict[str, Any]
    retention_recommendations: Dict[str, Any]

class ClientLifetimeValueService:
    """
    Six Figure Barber Client Lifetime Value Service
    
    Provides comprehensive CLV analytics and optimization strategies
    aligned with Six Figure Barber methodology principles.
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.client_tier_service = ClientTierService(db)
    
    def calculate_client_clv(self, client_id: int, barber_id: Optional[int] = None) -> CLVMetrics:
        """
        Calculate comprehensive CLV metrics for a specific client
        
        Args:
            client_id: ID of the client to analyze
            barber_id: Optional barber ID to filter appointments
            
        Returns:
            CLVMetrics object with comprehensive client value analysis
        """
        try:
            # Get client data
            client = self.db.query(Client).filter(Client.id == client_id).first()
            if not client:
                raise ValueError(f"Client {client_id} not found")
            
            # Get appointment and payment history
            appointment_query = self.db.query(Appointment).filter(
                Appointment.client_id == client_id,
                Appointment.status.in_(['completed', 'confirmed'])
            )
            
            if barber_id:
                appointment_query = appointment_query.filter(Appointment.barber_id == barber_id)
            
            appointments = appointment_query.order_by(Appointment.start_time).all()
            
            # Get payment history
            payment_query = self.db.query(Payment).filter(
                Payment.client_id == client_id,
                Payment.status == 'completed'
            )
            
            if barber_id:
                payment_query = payment_query.filter(Payment.barber_id == barber_id)
            
            payments = payment_query.order_by(Payment.created_at).all()
            
            # Calculate basic metrics
            total_spent = sum(Decimal(str(p.amount)) for p in payments)
            total_visits = len(appointments)
            
            if total_visits == 0:
                return self._create_new_client_clv(client_id)
            
            # Calculate time-based metrics
            first_visit = min(a.start_time for a in appointments)
            last_visit = max(a.start_time for a in appointments)
            months_active = max(1, (datetime.now() - first_visit).days / 30.44)
            days_since_last = (datetime.now() - last_visit).days
            
            # Calculate frequency and patterns
            visit_frequency = total_visits / months_active  # Visits per month
            average_ticket = float(total_spent / total_visits) if total_visits > 0 else 0.0
            
            # Get client tier
            tier = self.client_tier_service.get_client_tier(client_id)
            client_tier = tier.name.lower() if tier else "new"
            
            # Calculate predictive metrics
            retention_probability = self._calculate_retention_probability(
                visits=total_visits, 
                frequency=visit_frequency, 
                days_since_last=days_since_last,
                average_ticket=average_ticket
            )
            
            # Calculate predicted CLV using Six Figure methodology
            predicted_clv = self._calculate_predicted_clv(
                historical_clv=float(total_spent),
                visit_frequency=visit_frequency,
                average_ticket=average_ticket,
                retention_probability=retention_probability,
                client_tier=client_tier,
                months_active=months_active
            )
            
            # Calculate remaining CLV
            remaining_clv = max(0, predicted_clv - float(total_spent))
            
            # Assess churn risk
            churn_risk = self._assess_churn_risk(days_since_last, visit_frequency, retention_probability)
            
            # Determine value growth trend
            value_growth_trend = self._analyze_value_trend(payments)
            
            # Generate Six Figure methodology recommendations
            recommended_actions = self._generate_client_recommendations(
                client_tier=client_tier,
                churn_risk=churn_risk,
                value_growth_trend=value_growth_trend,
                average_ticket=average_ticket,
                visit_frequency=visit_frequency
            )
            
            # Calculate composite lifetime value score (0-100)
            lifetime_value_score = self._calculate_clv_score(
                predicted_clv=predicted_clv,
                retention_probability=retention_probability,
                average_ticket=average_ticket,
                visit_frequency=visit_frequency
            )
            
            return CLVMetrics(
                client_id=client_id,
                historical_clv=round(float(total_spent), 2),
                predicted_clv=round(predicted_clv, 2),
                remaining_clv=round(remaining_clv, 2),
                average_ticket=round(average_ticket, 2),
                visit_frequency=round(visit_frequency, 2),
                last_visit_days_ago=days_since_last,
                total_visits=total_visits,
                client_tier=client_tier,
                retention_probability=round(retention_probability, 3),
                churn_risk=churn_risk,
                value_growth_trend=value_growth_trend,
                recommended_actions=recommended_actions,
                months_active=int(months_active),
                lifetime_value_score=round(lifetime_value_score, 1)
            )
            
        except Exception as e:
            logger.error(f"Error calculating CLV for client {client_id}: {e}")
            return self._create_fallback_clv(client_id)
    
    def analyze_client_base_clv(self, barber_id: int, analysis_period_days: int = 365) -> CLVAnalysis:
        """
        Analyze CLV for entire client base of a barber
        
        Args:
            barber_id: ID of the barber
            analysis_period_days: Days of history to analyze
            
        Returns:
            CLVAnalysis with comprehensive insights
        """
        try:
            # Get all clients for this barber
            end_date = datetime.now()
            start_date = end_date - timedelta(days=analysis_period_days)
            
            client_ids = self.db.query(Appointment.client_id).filter(
                and_(
                    Appointment.barber_id == barber_id,
                    Appointment.client_id.isnot(None),
                    Appointment.start_time >= start_date,
                    Appointment.status.in_(['completed', 'confirmed'])
                )
            ).distinct().all()
            
            client_ids = [c[0] for c in client_ids]
            
            if not client_ids:
                return self._create_empty_clv_analysis()
            
            # Calculate CLV for each client
            client_clv_metrics = []
            for client_id in client_ids:
                clv = self.calculate_client_clv(client_id, barber_id)
                client_clv_metrics.append(clv)
            
            # Aggregate analysis
            total_clients = len(client_clv_metrics)
            total_historical_clv = sum(c.historical_clv for c in client_clv_metrics)
            total_predicted_clv = sum(c.predicted_clv for c in client_clv_metrics)
            average_clv = total_predicted_clv / total_clients if total_clients > 0 else 0
            
            clv_values = [c.predicted_clv for c in client_clv_metrics]
            median_clv = statistics.median(clv_values) if clv_values else 0
            
            # Analyze by tier
            clv_by_tier = self._analyze_clv_by_tier(client_clv_metrics)
            
            # Calculate percentiles
            sorted_clv = sorted(clv_values, reverse=True)
            top_20_index = int(len(sorted_clv) * 0.2)
            bottom_20_index = int(len(sorted_clv) * 0.8)
            
            top_20_percent_clv = statistics.mean(sorted_clv[:top_20_index]) if top_20_index > 0 else 0
            bottom_20_percent_clv = statistics.mean(sorted_clv[bottom_20_index:]) if bottom_20_index < len(sorted_clv) else 0
            
            # Count high-value and at-risk clients
            high_value_client_count = len([c for c in client_clv_metrics if c.predicted_clv >= 1000])
            at_risk_client_count = len([c for c in client_clv_metrics if c.churn_risk == 'High'])
            
            # Calculate growth opportunity
            growth_opportunity_clv = sum(c.remaining_clv for c in client_clv_metrics)
            
            # Generate recommendations
            acquisition_recommendations = self._generate_acquisition_recommendations(client_clv_metrics, average_clv)
            retention_recommendations = self._generate_retention_recommendations(client_clv_metrics)
            
            return CLVAnalysis(
                total_clients=total_clients,
                total_historical_clv=round(total_historical_clv, 2),
                total_predicted_clv=round(total_predicted_clv, 2),
                average_clv=round(average_clv, 2),
                median_clv=round(median_clv, 2),
                clv_by_tier=clv_by_tier,
                top_20_percent_clv=round(top_20_percent_clv, 2),
                bottom_20_percent_clv=round(bottom_20_percent_clv, 2),
                high_value_client_count=high_value_client_count,
                at_risk_client_count=at_risk_client_count,
                growth_opportunity_clv=round(growth_opportunity_clv, 2),
                acquisition_recommendations=acquisition_recommendations,
                retention_recommendations=retention_recommendations
            )
            
        except Exception as e:
            logger.error(f"Error analyzing client base CLV for barber {barber_id}: {e}")
            return self._create_empty_clv_analysis()
    
    def _calculate_retention_probability(self, visits: int, frequency: float, days_since_last: int, average_ticket: float) -> float:
        """Calculate probability of client returning based on Six Figure methodology"""
        
        # Base probability factors
        visit_factor = min(1.0, visits / 10)  # More visits = higher retention
        frequency_factor = min(1.0, frequency / 1.5)  # Monthly visits factor
        recency_factor = max(0.1, 1.0 - (days_since_last / 90))  # Recency matters
        value_factor = min(1.0, average_ticket / 100)  # Higher spenders more likely to return
        
        # Weighted combination based on Six Figure methodology
        retention_probability = (
            visit_factor * 0.3 +
            frequency_factor * 0.3 +
            recency_factor * 0.3 +
            value_factor * 0.1
        )
        
        return max(0.1, min(1.0, retention_probability))
    
    def _calculate_predicted_clv(self, historical_clv: float, visit_frequency: float, 
                                average_ticket: float, retention_probability: float,
                                client_tier: str, months_active: int) -> float:
        """Calculate predicted CLV using Six Figure methodology"""
        
        # Base prediction: frequency * ticket * retention * time horizon
        base_monthly_value = visit_frequency * average_ticket
        
        # Six Figure methodology uses 24-month horizon for CLV
        time_horizon_months = 24
        
        # Apply tier-based multipliers (Six Figure methodology)
        tier_multipliers = {
            'platinum': 1.5,  # Platinum clients have highest growth potential
            'gold': 1.3,
            'silver': 1.1,
            'bronze': 1.0,
            'new': 0.8       # New clients have uncertainty
        }
        
        tier_multiplier = tier_multipliers.get(client_tier, 1.0)
        
        # Apply retention decay over time
        predicted_future_value = 0
        for month in range(time_horizon_months):
            month_retention = retention_probability ** (month / 12)  # Decay over time
            month_value = base_monthly_value * month_retention * tier_multiplier
            predicted_future_value += month_value
        
        # Total predicted CLV = historical + predicted future
        return historical_clv + predicted_future_value
    
    def _assess_churn_risk(self, days_since_last: int, frequency: float, retention_probability: float) -> str:
        """Assess client churn risk based on Six Figure methodology"""
        
        if days_since_last > 90 or retention_probability < 0.3:
            return "High"
        elif days_since_last > 60 or retention_probability < 0.6:
            return "Medium"
        else:
            return "Low"
    
    def _analyze_value_trend(self, payments: List[Payment]) -> str:
        """Analyze if client value is increasing, stable, or declining"""
        
        if len(payments) < 3:
            return "Stable"  # Not enough data
        
        # Compare last 3 payments with previous 3
        sorted_payments = sorted(payments, key=lambda p: p.created_at)
        
        if len(sorted_payments) >= 6:
            recent_avg = statistics.mean([float(p.amount) for p in sorted_payments[-3:]])
            previous_avg = statistics.mean([float(p.amount) for p in sorted_payments[-6:-3]])
            
            if recent_avg > previous_avg * 1.1:
                return "Increasing"
            elif recent_avg < previous_avg * 0.9:
                return "Declining"
        
        return "Stable"
    
    def _generate_client_recommendations(self, client_tier: str, churn_risk: str, 
                                       value_growth_trend: str, average_ticket: float,
                                       visit_frequency: float) -> List[str]:
        """Generate Six Figure methodology recommendations for client"""
        
        recommendations = []
        
        # Tier-based recommendations
        if client_tier == "new":
            recommendations.append("Focus on exceptional first impression and service quality")
            recommendations.append("Offer new client package to encourage return visits")
        elif client_tier == "bronze":
            recommendations.append("Implement tier progression strategy to silver level")
            recommendations.append("Introduce premium service add-ons")
        elif client_tier in ["silver", "gold"]:
            recommendations.append("Develop loyalty program benefits and exclusive services")
            recommendations.append("Focus on relationship building and personalized experience")
        elif client_tier == "platinum":
            recommendations.append("Maintain VIP experience and exclusive access")
            recommendations.append("Leverage for referrals and testimonials")
        
        # Churn risk recommendations
        if churn_risk == "High":
            recommendations.append("URGENT: Implement win-back campaign within 7 days")
            recommendations.append("Offer personalized incentive to schedule next appointment")
        elif churn_risk == "Medium":
            recommendations.append("Send proactive follow-up and schedule reminder")
            recommendations.append("Offer seasonal promotion or service upgrade")
        
        # Value trend recommendations
        if value_growth_trend == "Declining":
            recommendations.append("Analyze service satisfaction and address concerns")
            recommendations.append("Introduce value-added services to increase engagement")
        elif value_growth_trend == "Increasing":
            recommendations.append("Capitalize on momentum with premium package offerings")
        
        # Frequency recommendations
        if visit_frequency < 0.8:  # Less than monthly
            recommendations.append("Implement appointment reminder system")
            recommendations.append("Create subscription or package incentives")
        
        return recommendations[:4]  # Limit to top 4 actionable recommendations
    
    def _calculate_clv_score(self, predicted_clv: float, retention_probability: float,
                            average_ticket: float, visit_frequency: float) -> float:
        """Calculate composite CLV score (0-100)"""
        
        # Normalize factors to 0-1 scale
        clv_factor = min(1.0, predicted_clv / 3000)  # $3000 = max score
        retention_factor = retention_probability
        ticket_factor = min(1.0, average_ticket / 150)  # $150 = max score
        frequency_factor = min(1.0, visit_frequency / 2)  # 2 visits/month = max score
        
        # Weighted score
        score = (
            clv_factor * 40 +      # CLV is most important
            retention_factor * 25 +
            ticket_factor * 20 +
            frequency_factor * 15
        ) * 100
        
        return min(100, max(0, score))
    
    def _analyze_clv_by_tier(self, client_metrics: List[CLVMetrics]) -> Dict[str, Dict[str, float]]:
        """Analyze CLV distribution by client tier"""
        
        tier_analysis = {}
        
        for tier in ['new', 'bronze', 'silver', 'gold', 'platinum']:
            tier_clients = [c for c in client_metrics if c.client_tier == tier]
            
            if tier_clients:
                tier_analysis[tier] = {
                    'count': len(tier_clients),
                    'total_clv': sum(c.predicted_clv for c in tier_clients),
                    'average_clv': statistics.mean([c.predicted_clv for c in tier_clients]),
                    'median_clv': statistics.median([c.predicted_clv for c in tier_clients]),
                    'average_ticket': statistics.mean([c.average_ticket for c in tier_clients]),
                    'retention_rate': statistics.mean([c.retention_probability for c in tier_clients])
                }
            else:
                tier_analysis[tier] = {
                    'count': 0, 'total_clv': 0, 'average_clv': 0, 
                    'median_clv': 0, 'average_ticket': 0, 'retention_rate': 0
                }
        
        return tier_analysis
    
    def _generate_acquisition_recommendations(self, client_metrics: List[CLVMetrics], 
                                            average_clv: float) -> Dict[str, Any]:
        """Generate client acquisition recommendations based on CLV analysis"""
        
        high_value_clients = [c for c in client_metrics if c.predicted_clv >= average_clv * 1.5]
        
        # Analyze characteristics of high-value clients
        if high_value_clients:
            avg_high_value_ticket = statistics.mean([c.average_ticket for c in high_value_clients])
            avg_high_value_frequency = statistics.mean([c.visit_frequency for c in high_value_clients])
            
            return {
                "target_acquisition_profile": {
                    "min_average_ticket": round(avg_high_value_ticket * 0.8, 2),
                    "target_frequency": round(avg_high_value_frequency, 2),
                    "ideal_client_value": round(average_clv * 1.5, 2)
                },
                "acquisition_strategies": [
                    "Focus referral programs on platinum and gold tier clients",
                    f"Target clients with ${avg_high_value_ticket:.0f}+ spending capacity",
                    "Partner with premium lifestyle businesses for cross-referrals",
                    "Develop premium onboarding experience for high-value prospects"
                ],
                "max_acquisition_cost": round(average_clv * 0.2, 2)  # 20% of CLV
            }
        
        return {
            "target_acquisition_profile": {"min_average_ticket": 50, "target_frequency": 1.0},
            "acquisition_strategies": ["Build foundational client base", "Focus on service quality"],
            "max_acquisition_cost": 50.0
        }
    
    def _generate_retention_recommendations(self, client_metrics: List[CLVMetrics]) -> Dict[str, Any]:
        """Generate retention recommendations based on CLV analysis"""
        
        at_risk_clients = [c for c in client_metrics if c.churn_risk == "High"]
        high_value_at_risk = [c for c in at_risk_clients if c.predicted_clv >= 1000]
        
        return {
            "immediate_actions": {
                "high_value_at_risk_count": len(high_value_at_risk),
                "total_at_risk_clv": sum(c.predicted_clv for c in at_risk_clients),
                "priority_outreach_list": [c.client_id for c in high_value_at_risk[:10]]
            },
            "retention_strategies": [
                "Implement proactive outreach for clients 60+ days since visit",
                "Create tier-specific loyalty programs with exclusive benefits",
                "Develop personalized service recommendations based on history",
                "Send birthday and anniversary campaigns for relationship building"
            ],
            "retention_investment_recommendation": {
                "monthly_budget": round(sum(c.predicted_clv for c in client_metrics) * 0.02, 2),
                "focus_areas": ["Client communications", "Loyalty programs", "Service personalization"]
            }
        }
    
    def _create_new_client_clv(self, client_id: int) -> CLVMetrics:
        """Create CLV metrics for new client with no visit history"""
        
        return CLVMetrics(
            client_id=client_id,
            historical_clv=0.0,
            predicted_clv=300.0,  # Conservative estimate for new client
            remaining_clv=300.0,
            average_ticket=0.0,
            visit_frequency=0.0,
            last_visit_days_ago=0,
            total_visits=0,
            client_tier="new",
            retention_probability=0.5,  # Neutral probability
            churn_risk="Medium",
            value_growth_trend="Stable",
            recommended_actions=[
                "Focus on exceptional first impression",
                "Offer new client welcome package",
                "Schedule follow-up appointment during first visit",
                "Collect preferences and build client profile"
            ],
            months_active=0,
            lifetime_value_score=25.0
        )
    
    def _create_fallback_clv(self, client_id: int) -> CLVMetrics:
        """Create fallback CLV metrics when calculation fails"""
        
        return CLVMetrics(
            client_id=client_id,
            historical_clv=0.0,
            predicted_clv=0.0,
            remaining_clv=0.0,
            average_ticket=0.0,
            visit_frequency=0.0,
            last_visit_days_ago=999,
            total_visits=0,
            client_tier="new",
            retention_probability=0.0,
            churn_risk="High",
            value_growth_trend="Unknown",
            recommended_actions=["Unable to calculate - check client data"],
            months_active=0,
            lifetime_value_score=0.0
        )
    
    def _create_empty_clv_analysis(self) -> CLVAnalysis:
        """Create empty CLV analysis when no data available"""
        
        return CLVAnalysis(
            total_clients=0,
            total_historical_clv=0.0,
            total_predicted_clv=0.0,
            average_clv=0.0,
            median_clv=0.0,
            clv_by_tier={tier: {'count': 0, 'total_clv': 0, 'average_clv': 0, 'median_clv': 0, 'average_ticket': 0, 'retention_rate': 0} 
                        for tier in ['new', 'bronze', 'silver', 'gold', 'platinum']},
            top_20_percent_clv=0.0,
            bottom_20_percent_clv=0.0,
            high_value_client_count=0,
            at_risk_client_count=0,
            growth_opportunity_clv=0.0,
            acquisition_recommendations={
                "target_acquisition_profile": {"min_average_ticket": 50, "target_frequency": 1.0},
                "acquisition_strategies": ["Start building client base"],
                "max_acquisition_cost": 50.0
            },
            retention_recommendations={
                "immediate_actions": {"high_value_at_risk_count": 0, "total_at_risk_clv": 0.0, "priority_outreach_list": []},
                "retention_strategies": ["Focus on client acquisition first"],
                "retention_investment_recommendation": {"monthly_budget": 0.0, "focus_areas": []}
            }
        )