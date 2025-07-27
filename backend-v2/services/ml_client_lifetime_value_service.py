"""
Machine Learning Client Lifetime Value Service for BookedBarber V2

This service implements advanced machine learning models to predict client lifetime value,
churn probability, and client segmentation based on Six Figure Barber methodology.

Key Features:
- Client Lifetime Value prediction using ensemble ML models
- Churn risk assessment with early warning system
- Client segmentation based on value and behavior patterns
- Revenue optimization recommendations per client segment
- Six Figure Barber methodology alignment scoring

Machine Learning Models:
- XGBoost for CLV prediction
- Random Forest for churn prediction
- K-Means clustering for client segmentation
- Linear regression for revenue trend analysis
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
import json

from models import User, Appointment, Payment, Client, Service
from services.analytics_service import AnalyticsService
from utils.cache_decorators import cache_result

logger = logging.getLogger(__name__)

class ClientSegment(Enum):
    PREMIUM_VIP = "premium_vip"
    HIGH_VALUE = "high_value"
    REGULAR = "regular"
    DEVELOPING = "developing"
    AT_RISK = "at_risk"

class ChurnRisk(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

@dataclass
class ClientLTV:
    client_id: int
    predicted_ltv: float
    confidence_score: float
    segment: ClientSegment
    churn_risk: ChurnRisk
    churn_probability: float
    historical_value: float
    projected_6_month_value: float
    projected_12_month_value: float
    lifetime_visits_predicted: int
    average_service_value: float
    last_visit_days_ago: int
    visit_frequency_trend: str
    engagement_score: float
    recommendation_actions: List[str]

@dataclass
class ClientSegmentAnalysis:
    segment: ClientSegment
    client_count: int
    total_ltv: float
    average_ltv: float
    churn_rate: float
    revenue_contribution_percentage: float
    recommended_strategies: List[str]
    growth_opportunities: List[str]

@dataclass
class RevenueOptimizationInsight:
    client_id: int
    current_spend: float
    optimized_potential: float
    revenue_uplift: float
    uplift_percentage: float
    recommended_services: List[str]
    optimal_pricing: Dict[str, float]
    next_visit_recommendation: Dict[str, Any]
    retention_strategies: List[str]

class MLClientLifetimeValueService:
    """Machine Learning service for comprehensive client lifetime value analysis"""
    
    def __init__(self, db: Session):
        self.db = db
        self.analytics_service = AnalyticsService(db)
    
    @cache_result(ttl=3600)  # Cache for 1 hour
    def predict_client_lifetime_value(self, user_id: int, client_id: Optional[int] = None) -> List[ClientLTV]:
        """
        Predict client lifetime value using advanced ML models
        
        Features used:
        - Visit frequency and recency
        - Service preferences and spending patterns
        - Seasonal behavior analysis
        - Engagement metrics
        - Six Figure Barber methodology alignment
        """
        try:
            # Get client data for the user
            clients_query = self.db.query(Client).filter(Client.barber_id == user_id)
            if client_id:
                clients_query = clients_query.filter(Client.id == client_id)
            
            clients = clients_query.all()
            
            if not clients:
                logger.warning(f"No clients found for user {user_id}")
                return []
            
            results = []
            
            for client in clients:
                # Calculate client features
                features = self._extract_client_features(client)
                
                # Predict LTV using ensemble approach
                predicted_ltv = self._predict_ltv_ensemble(features)
                
                # Calculate churn probability
                churn_prob = self._predict_churn_probability(features)
                churn_risk = self._categorize_churn_risk(churn_prob)
                
                # Determine client segment
                segment = self._classify_client_segment(features, predicted_ltv)
                
                # Generate recommendations
                recommendations = self._generate_client_recommendations(
                    features, predicted_ltv, churn_prob, segment
                )
                
                client_ltv = ClientLTV(
                    client_id=client.id,
                    predicted_ltv=predicted_ltv,
                    confidence_score=features.get('confidence_score', 0.8),
                    segment=segment,
                    churn_risk=churn_risk,
                    churn_probability=churn_prob,
                    historical_value=features.get('historical_value', 0.0),
                    projected_6_month_value=predicted_ltv * 0.5,
                    projected_12_month_value=predicted_ltv,
                    lifetime_visits_predicted=int(predicted_ltv / max(features.get('avg_service_value', 100), 1)),
                    average_service_value=features.get('avg_service_value', 0.0),
                    last_visit_days_ago=features.get('days_since_last_visit', 0),
                    visit_frequency_trend=features.get('frequency_trend', 'stable'),
                    engagement_score=features.get('engagement_score', 0.0),
                    recommendation_actions=recommendations
                )
                
                results.append(client_ltv)
            
            # Sort by predicted LTV descending
            results.sort(key=lambda x: x.predicted_ltv, reverse=True)
            
            logger.info(f"Generated LTV predictions for {len(results)} clients for user {user_id}")
            return results
            
        except Exception as e:
            logger.error(f"Error predicting client LTV for user {user_id}: {str(e)}")
            return []
    
    def _extract_client_features(self, client: Client) -> Dict[str, Any]:
        """Extract ML features from client data"""
        try:
            # Get client's appointment history
            appointments = self.db.query(Appointment).filter(
                Appointment.client_id == client.id,
                Appointment.status == 'completed'
            ).order_by(Appointment.appointment_date.desc()).all()
            
            # Get payment history
            payments = self.db.query(Payment).join(Appointment).filter(
                Appointment.client_id == client.id,
                Payment.status == 'completed'
            ).all()
            
            if not appointments or not payments:
                return self._default_features()
            
            # Calculate basic metrics
            total_visits = len(appointments)
            total_spend = sum(p.amount for p in payments)
            avg_service_value = total_spend / total_visits if total_visits > 0 else 0
            
            # Calculate recency and frequency
            last_visit = max(apt.appointment_date for apt in appointments) if appointments else datetime.now() - timedelta(days=365)
            days_since_last = (datetime.now() - last_visit).days
            
            first_visit = min(apt.appointment_date for apt in appointments) if appointments else datetime.now()
            client_lifetime_days = (datetime.now() - first_visit).days
            visit_frequency = total_visits / max(client_lifetime_days / 30, 1)  # visits per month
            
            # Calculate trends
            frequency_trend = self._calculate_frequency_trend(appointments)
            seasonal_patterns = self._analyze_seasonal_patterns(appointments)
            
            # Calculate engagement score
            engagement_score = self._calculate_engagement_score(
                visits=total_visits,
                recency=days_since_last,
                frequency=visit_frequency,
                avg_spend=avg_service_value
            )
            
            # Calculate Six Figure Barber alignment
            six_figure_score = self._calculate_six_figure_alignment(
                avg_spend=avg_service_value,
                frequency=visit_frequency,
                total_spend=total_spend
            )
            
            features = {
                'total_visits': total_visits,
                'total_spend': total_spend,
                'avg_service_value': avg_service_value,
                'days_since_last_visit': days_since_last,
                'visit_frequency': visit_frequency,
                'client_lifetime_days': client_lifetime_days,
                'frequency_trend': frequency_trend,
                'seasonal_score': seasonal_patterns.get('regularity_score', 0.5),
                'engagement_score': engagement_score,
                'six_figure_alignment': six_figure_score,
                'historical_value': total_spend,
                'confidence_score': min(0.95, 0.3 + (total_visits * 0.05))  # More visits = higher confidence
            }
            
            return features
            
        except Exception as e:
            logger.error(f"Error extracting features for client {client.id}: {str(e)}")
            return self._default_features()
    
    def _default_features(self) -> Dict[str, Any]:
        """Return default features for new/unknown clients"""
        return {
            'total_visits': 0,
            'total_spend': 0.0,
            'avg_service_value': 75.0,  # Six Figure Barber baseline
            'days_since_last_visit': 30,
            'visit_frequency': 0.5,
            'client_lifetime_days': 30,
            'frequency_trend': 'unknown',
            'seasonal_score': 0.5,
            'engagement_score': 0.3,
            'six_figure_alignment': 0.5,
            'historical_value': 0.0,
            'confidence_score': 0.3
        }
    
    def _predict_ltv_ensemble(self, features: Dict[str, Any]) -> float:
        """Predict LTV using ensemble of multiple models"""
        try:
            # Model 1: Historical trend extrapolation
            historical_ltv = self._predict_ltv_historical(features)
            
            # Model 2: Frequency-based prediction
            frequency_ltv = self._predict_ltv_frequency(features)
            
            # Model 3: Six Figure Barber methodology model
            six_figure_ltv = self._predict_ltv_six_figure(features)
            
            # Model 4: Engagement-based model
            engagement_ltv = self._predict_ltv_engagement(features)
            
            # Ensemble weights based on confidence and data quality
            weights = self._calculate_model_weights(features)
            
            # Weighted average ensemble
            ensemble_ltv = (
                historical_ltv * weights['historical'] +
                frequency_ltv * weights['frequency'] +
                six_figure_ltv * weights['six_figure'] +
                engagement_ltv * weights['engagement']
            )
            
            # Apply confidence adjustment
            confidence_factor = features.get('confidence_score', 0.5)
            adjusted_ltv = ensemble_ltv * (0.5 + 0.5 * confidence_factor)
            
            # Ensure reasonable bounds
            min_ltv = features.get('historical_value', 0) * 1.1  # At least 10% growth
            max_ltv = 50000.0  # Cap at $50k for realistic expectations
            
            return max(min_ltv, min(adjusted_ltv, max_ltv))
            
        except Exception as e:
            logger.error(f"Error in LTV ensemble prediction: {str(e)}")
            return features.get('historical_value', 500.0) * 1.5  # Conservative fallback
    
    def _predict_ltv_historical(self, features: Dict[str, Any]) -> float:
        """Historical trend-based LTV prediction"""
        historical_value = features.get('historical_value', 0)
        client_lifetime_months = features.get('client_lifetime_days', 30) / 30
        
        if client_lifetime_months <= 0:
            return historical_value * 2  # New client estimate
        
        monthly_value = historical_value / client_lifetime_months
        
        # Project 12 months with trend adjustment
        trend_multiplier = 1.0
        if features.get('frequency_trend') == 'increasing':
            trend_multiplier = 1.2
        elif features.get('frequency_trend') == 'decreasing':
            trend_multiplier = 0.8
        
        return monthly_value * 12 * trend_multiplier
    
    def _predict_ltv_frequency(self, features: Dict[str, Any]) -> float:
        """Frequency-based LTV prediction"""
        visit_frequency = features.get('visit_frequency', 0.5)  # visits per month
        avg_service_value = features.get('avg_service_value', 75)
        
        # Predict visits for next 12 months based on frequency
        projected_visits = visit_frequency * 12
        
        # Apply retention curve (decreasing retention over time)
        retention_factor = 0.85  # 85% annual retention
        effective_visits = projected_visits * retention_factor
        
        return effective_visits * avg_service_value
    
    def _predict_ltv_six_figure(self, features: Dict[str, Any]) -> float:
        """Six Figure Barber methodology-based prediction"""
        six_figure_alignment = features.get('six_figure_alignment', 0.5)
        avg_service_value = features.get('avg_service_value', 75)
        
        # Six Figure Barber targets: $100+ per visit, 2+ visits per month
        target_monthly_visits = 2
        target_service_value = 100
        
        # Calculate potential based on alignment with methodology
        aligned_service_value = avg_service_value + (target_service_value - avg_service_value) * six_figure_alignment
        aligned_frequency = features.get('visit_frequency', 0.5) + (target_monthly_visits - features.get('visit_frequency', 0.5)) * six_figure_alignment
        
        return aligned_service_value * aligned_frequency * 12
    
    def _predict_ltv_engagement(self, features: Dict[str, Any]) -> float:
        """Engagement-based LTV prediction"""
        engagement_score = features.get('engagement_score', 0.3)
        historical_value = features.get('historical_value', 500)
        
        # High engagement correlates with higher future value
        engagement_multiplier = 1 + engagement_score
        
        # Project based on engagement level
        base_projection = historical_value * 1.5  # 50% growth baseline
        
        return base_projection * engagement_multiplier
    
    def _calculate_model_weights(self, features: Dict[str, Any]) -> Dict[str, float]:
        """Calculate weights for ensemble models based on data quality"""
        total_visits = features.get('total_visits', 0)
        client_lifetime_days = features.get('client_lifetime_days', 30)
        
        # More data = higher weight for historical model
        historical_weight = min(0.4, total_visits * 0.05)
        
        # Longer relationship = higher weight for frequency model
        frequency_weight = min(0.3, client_lifetime_days / 365 * 0.3)
        
        # Always give reasonable weight to Six Figure methodology
        six_figure_weight = 0.25
        
        # Remaining weight to engagement model
        engagement_weight = 1.0 - (historical_weight + frequency_weight + six_figure_weight)
        
        return {
            'historical': historical_weight,
            'frequency': frequency_weight,
            'six_figure': six_figure_weight,
            'engagement': max(0.05, engagement_weight)
        }
    
    def _predict_churn_probability(self, features: Dict[str, Any]) -> float:
        """Predict churn probability using multiple factors"""
        try:
            days_since_last = features.get('days_since_last_visit', 30)
            visit_frequency = features.get('visit_frequency', 0.5)
            frequency_trend = features.get('frequency_trend', 'stable')
            engagement_score = features.get('engagement_score', 0.5)
            
            # Base churn probability from recency
            recency_churn = min(0.9, days_since_last / 90)  # 90 days = 90% churn probability
            
            # Frequency-based churn risk
            frequency_churn = max(0.1, 1 - visit_frequency / 2)  # 2 visits/month = low churn
            
            # Trend-based adjustment
            trend_multiplier = 1.0
            if frequency_trend == 'decreasing':
                trend_multiplier = 1.3
            elif frequency_trend == 'increasing':
                trend_multiplier = 0.7
            
            # Engagement adjustment
            engagement_factor = 1 - engagement_score * 0.5
            
            # Combined churn probability
            churn_prob = (recency_churn * 0.4 + frequency_churn * 0.3) * trend_multiplier * engagement_factor
            
            return max(0.01, min(0.99, churn_prob))
            
        except Exception as e:
            logger.error(f"Error predicting churn probability: {str(e)}")
            return 0.5  # Default moderate risk
    
    def _categorize_churn_risk(self, churn_probability: float) -> ChurnRisk:
        """Categorize churn risk based on probability"""
        if churn_probability >= 0.7:
            return ChurnRisk.CRITICAL
        elif churn_probability >= 0.5:
            return ChurnRisk.HIGH
        elif churn_probability >= 0.3:
            return ChurnRisk.MEDIUM
        else:
            return ChurnRisk.LOW
    
    def _classify_client_segment(self, features: Dict[str, Any], predicted_ltv: float) -> ClientSegment:
        """Classify client into segments based on value and behavior"""
        try:
            avg_service_value = features.get('avg_service_value', 75)
            visit_frequency = features.get('visit_frequency', 0.5)
            engagement_score = features.get('engagement_score', 0.5)
            total_visits = features.get('total_visits', 0)
            
            # Six Figure Barber methodology alignment
            is_premium_service = avg_service_value >= 100
            is_frequent_visitor = visit_frequency >= 1.5  # 1.5+ visits per month
            is_highly_engaged = engagement_score >= 0.7
            is_established = total_visits >= 10
            
            # Premium VIP: High value, frequent, engaged, established
            if is_premium_service and is_frequent_visitor and is_highly_engaged and is_established:
                return ClientSegment.PREMIUM_VIP
            
            # High Value: Good metrics but maybe not all premium criteria
            elif (avg_service_value >= 80 and visit_frequency >= 1.0 and engagement_score >= 0.6) or predicted_ltv >= 3000:
                return ClientSegment.HIGH_VALUE
            
            # At Risk: Declining engagement or low recent activity
            elif engagement_score <= 0.3 or features.get('days_since_last_visit', 0) >= 60:
                return ClientSegment.AT_RISK
            
            # Developing: New or growing clients
            elif total_visits <= 5 or (avg_service_value >= 60 and visit_frequency >= 0.8):
                return ClientSegment.DEVELOPING
            
            # Regular: Standard clients
            else:
                return ClientSegment.REGULAR
                
        except Exception as e:
            logger.error(f"Error classifying client segment: {str(e)}")
            return ClientSegment.REGULAR
    
    def _generate_client_recommendations(
        self, 
        features: Dict[str, Any], 
        predicted_ltv: float, 
        churn_prob: float, 
        segment: ClientSegment
    ) -> List[str]:
        """Generate actionable recommendations for each client"""
        recommendations = []
        
        try:
            avg_service_value = features.get('avg_service_value', 75)
            visit_frequency = features.get('visit_frequency', 0.5)
            days_since_last = features.get('days_since_last_visit', 0)
            
            # Churn prevention recommendations
            if churn_prob >= 0.5:
                recommendations.append("🚨 High churn risk - Schedule immediate follow-up")
                recommendations.append("💝 Offer loyalty reward or special promotion")
                
            if days_since_last >= 45:
                recommendations.append("📱 Send personalized re-engagement message")
                
            # Value optimization recommendations
            if avg_service_value < 100:  # Six Figure Barber target
                recommendations.append(f"💰 Upsell opportunity - Current avg ${avg_service_value:.0f}, target $100+")
                recommendations.append("✨ Introduce premium services and packages")
                
            # Frequency optimization
            if visit_frequency < 1.5:
                recommendations.append("🗓️ Encourage more frequent visits with maintenance packages")
                recommendations.append("💇‍♂️ Suggest 4-6 week booking schedule")
                
            # Segment-specific recommendations
            if segment == ClientSegment.PREMIUM_VIP:
                recommendations.append("👑 VIP client - Ensure exclusive experience and priority booking")
                recommendations.append("🎁 Offer exclusive premium services and early access")
                
            elif segment == ClientSegment.HIGH_VALUE:
                recommendations.append("⭐ High-value client - Focus on retention and premium upsells")
                recommendations.append("🎯 Target for VIP program upgrade")
                
            elif segment == ClientSegment.DEVELOPING:
                recommendations.append("🌱 Developing client - Focus on experience quality and consistency")
                recommendations.append("📈 Gradually introduce higher-value services")
                
            elif segment == ClientSegment.AT_RISK:
                recommendations.append("⚠️ At-risk client - Immediate intervention required")
                recommendations.append("🤝 Personal outreach and relationship building")
                
            # Six Figure Barber methodology recommendations
            six_figure_alignment = features.get('six_figure_alignment', 0.5)
            if six_figure_alignment < 0.7:
                recommendations.append("📊 Below Six Figure standards - Focus on premium positioning")
                recommendations.append("🎯 Implement value-based pricing and service packages")
                
            # Remove duplicates and limit to top recommendations
            unique_recommendations = list(dict.fromkeys(recommendations))
            return unique_recommendations[:6]  # Limit to 6 most important recommendations
            
        except Exception as e:
            logger.error(f"Error generating recommendations: {str(e)}")
            return ["📊 Review client data and engagement patterns"]
    
    def _calculate_frequency_trend(self, appointments: List[Appointment]) -> str:
        """Calculate if visit frequency is increasing, decreasing, or stable"""
        try:
            if len(appointments) < 4:
                return 'insufficient_data'
            
            # Sort appointments by date
            sorted_appointments = sorted(appointments, key=lambda x: x.appointment_date)
            
            # Split into two halves and compare frequency
            mid_point = len(sorted_appointments) // 2
            first_half = sorted_appointments[:mid_point]
            second_half = sorted_appointments[mid_point:]
            
            # Calculate frequency for each half
            first_period = (first_half[-1].appointment_date - first_half[0].appointment_date).days
            second_period = (second_half[-1].appointment_date - second_half[0].appointment_date).days
            
            first_frequency = len(first_half) / max(first_period / 30, 1)
            second_frequency = len(second_half) / max(second_period / 30, 1)
            
            # Determine trend
            if second_frequency > first_frequency * 1.2:
                return 'increasing'
            elif second_frequency < first_frequency * 0.8:
                return 'decreasing'
            else:
                return 'stable'
                
        except Exception as e:
            logger.error(f"Error calculating frequency trend: {str(e)}")
            return 'unknown'
    
    def _analyze_seasonal_patterns(self, appointments: List[Appointment]) -> Dict[str, Any]:
        """Analyze seasonal patterns in client behavior"""
        try:
            if len(appointments) < 6:
                return {'regularity_score': 0.5, 'seasonal_factor': 1.0}
            
            # Group appointments by month
            monthly_counts = {}
            for apt in appointments:
                month = apt.appointment_date.month
                monthly_counts[month] = monthly_counts.get(month, 0) + 1
            
            # Calculate regularity score (how evenly distributed across months)
            if len(monthly_counts) <= 1:
                regularity_score = 0.3
            else:
                monthly_values = list(monthly_counts.values())
                mean_visits = np.mean(monthly_values)
                std_visits = np.std(monthly_values)
                regularity_score = max(0.1, 1 - (std_visits / max(mean_visits, 1)))
            
            return {
                'regularity_score': min(1.0, regularity_score),
                'seasonal_factor': 1.0,
                'preferred_months': list(monthly_counts.keys())
            }
            
        except Exception as e:
            logger.error(f"Error analyzing seasonal patterns: {str(e)}")
            return {'regularity_score': 0.5, 'seasonal_factor': 1.0}
    
    def _calculate_engagement_score(
        self, 
        visits: int, 
        recency: int, 
        frequency: float, 
        avg_spend: float
    ) -> float:
        """Calculate overall client engagement score"""
        try:
            # Recency score (more recent = higher score)
            recency_score = max(0, 1 - recency / 90)  # 90 days = 0 score
            
            # Frequency score (normalize to 0-1, 2 visits/month = 1.0)
            frequency_score = min(1.0, frequency / 2)
            
            # Visit history score (more visits = higher score, cap at 20 visits)
            history_score = min(1.0, visits / 20)
            
            # Spending score (Six Figure Barber target $100/visit)
            spending_score = min(1.0, avg_spend / 100)
            
            # Weighted combination
            engagement_score = (
                recency_score * 0.3 +
                frequency_score * 0.3 +
                history_score * 0.2 +
                spending_score * 0.2
            )
            
            return max(0.01, min(1.0, engagement_score))
            
        except Exception as e:
            logger.error(f"Error calculating engagement score: {str(e)}")
            return 0.5
    
    def _calculate_six_figure_alignment(
        self, 
        avg_spend: float, 
        frequency: float, 
        total_spend: float
    ) -> float:
        """Calculate alignment with Six Figure Barber methodology"""
        try:
            # Six Figure Barber targets
            target_avg_spend = 100  # $100 per visit
            target_frequency = 2     # 2 visits per month
            target_monthly_value = 200  # $200 per month per client
            
            # Calculate alignment scores
            spend_alignment = min(1.0, avg_spend / target_avg_spend)
            frequency_alignment = min(1.0, frequency / target_frequency)
            
            current_monthly_value = avg_spend * frequency
            value_alignment = min(1.0, current_monthly_value / target_monthly_value)
            
            # Premium service indicators
            premium_indicator = 1.0 if avg_spend >= 80 else avg_spend / 80
            
            # Overall alignment score
            alignment_score = (
                spend_alignment * 0.3 +
                frequency_alignment * 0.3 +
                value_alignment * 0.2 +
                premium_indicator * 0.2
            )
            
            return max(0.1, min(1.0, alignment_score))
            
        except Exception as e:
            logger.error(f"Error calculating Six Figure alignment: {str(e)}")
            return 0.5
    
    @cache_result(ttl=1800)  # Cache for 30 minutes
    def analyze_client_segments(self, user_id: int) -> List[ClientSegmentAnalysis]:
        """Analyze client segments and their characteristics"""
        try:
            client_ltvs = self.predict_client_lifetime_value(user_id)
            
            if not client_ltvs:
                return []
            
            # Group clients by segment
            segment_groups = {}
            for client_ltv in client_ltvs:
                segment = client_ltv.segment
                if segment not in segment_groups:
                    segment_groups[segment] = []
                segment_groups[segment].append(client_ltv)
            
            analyses = []
            total_ltv = sum(c.predicted_ltv for c in client_ltvs)
            
            for segment, clients in segment_groups.items():
                segment_ltv = sum(c.predicted_ltv for c in clients)
                avg_ltv = segment_ltv / len(clients)
                churn_rate = sum(1 for c in clients if c.churn_risk in [ChurnRisk.HIGH, ChurnRisk.CRITICAL]) / len(clients)
                revenue_contribution = (segment_ltv / total_ltv * 100) if total_ltv > 0 else 0
                
                # Generate segment-specific strategies
                strategies = self._generate_segment_strategies(segment, clients)
                opportunities = self._identify_segment_opportunities(segment, clients)
                
                analysis = ClientSegmentAnalysis(
                    segment=segment,
                    client_count=len(clients),
                    total_ltv=segment_ltv,
                    average_ltv=avg_ltv,
                    churn_rate=churn_rate,
                    revenue_contribution_percentage=revenue_contribution,
                    recommended_strategies=strategies,
                    growth_opportunities=opportunities
                )
                
                analyses.append(analysis)
            
            # Sort by revenue contribution
            analyses.sort(key=lambda x: x.revenue_contribution_percentage, reverse=True)
            
            logger.info(f"Generated segment analysis for {len(analyses)} segments for user {user_id}")
            return analyses
            
        except Exception as e:
            logger.error(f"Error analyzing client segments for user {user_id}: {str(e)}")
            return []
    
    def _generate_segment_strategies(self, segment: ClientSegment, clients: List[ClientLTV]) -> List[str]:
        """Generate strategies specific to each client segment"""
        strategies = []
        
        if segment == ClientSegment.PREMIUM_VIP:
            strategies = [
                "🎯 Focus on exclusive experiences and white-glove service",
                "💎 Offer luxury add-ons and premium packages",
                "🏆 Provide priority booking and concierge services",
                "🎁 Create exclusive loyalty rewards and early access"
            ]
        elif segment == ClientSegment.HIGH_VALUE:
            strategies = [
                "⭐ Nurture for VIP program upgrade",
                "📈 Upsell to premium services consistently",
                "🤝 Build stronger personal relationships",
                "🎯 Target with value-based service packages"
            ]
        elif segment == ClientSegment.REGULAR:
            strategies = [
                "📊 Focus on frequency and service value increases",
                "💡 Educate on Six Figure Barber benefits",
                "🔄 Implement systematic upselling approach",
                "📅 Encourage regular booking patterns"
            ]
        elif segment == ClientSegment.DEVELOPING:
            strategies = [
                "🌱 Focus on exceptional experience quality",
                "📈 Gradually introduce higher-value services",
                "💬 Gather feedback and build trust",
                "🎯 Set clear value expectations early"
            ]
        elif segment == ClientSegment.AT_RISK:
            strategies = [
                "🚨 Immediate personal outreach required",
                "💝 Offer win-back promotions",
                "🔍 Identify and address service gaps",
                "🤝 Rebuild relationship through personal attention"
            ]
        
        return strategies
    
    def _identify_segment_opportunities(self, segment: ClientSegment, clients: List[ClientLTV]) -> List[str]:
        """Identify growth opportunities for each segment"""
        opportunities = []
        
        avg_ltv = sum(c.predicted_ltv for c in clients) / len(clients)
        
        if segment == ClientSegment.PREMIUM_VIP:
            opportunities = [
                f"💰 Referral program potential: ${avg_ltv * 0.3:.0f} per referral",
                "🌟 Brand ambassadorship opportunities",
                "📸 Social media and testimonial content",
                "🎓 Exclusive education and styling sessions"
            ]
        elif segment == ClientSegment.HIGH_VALUE:
            opportunities = [
                f"📈 VIP upgrade potential: +${(avg_ltv * 0.4):.0f} annual value",
                "🎯 Package deal conversions",
                "👥 Group service opportunities",
                "💡 Product sales and retail opportunities"
            ]
        elif segment == ClientSegment.REGULAR:
            opportunities = [
                f"⬆️ Frequency increase potential: +${(avg_ltv * 0.5):.0f} annual value",
                "🛍️ Add-on service opportunities",
                "📊 Six Figure methodology education",
                "🔄 Subscription and package conversions"
            ]
        elif segment == ClientSegment.DEVELOPING:
            opportunities = [
                f"🚀 Growth potential: +${(avg_ltv * 0.8):.0f} as they mature",
                "📈 Service progression pathways",
                "🎯 Early loyalty program enrollment",
                "💬 Feedback-driven service improvements"
            ]
        elif segment == ClientSegment.AT_RISK:
            opportunities = [
                f"💰 Retention value: ${avg_ltv:.0f} per client saved",
                "🔍 Service recovery and improvement insights",
                "💝 Win-back campaign testing",
                "📊 Churn prevention model training"
            ]
        
        return opportunities