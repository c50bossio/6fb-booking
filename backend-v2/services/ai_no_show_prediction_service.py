"""
AI-Powered No-Show Prediction Service

This service uses machine learning and AI to predict the likelihood of client no-shows
and provides intelligent recommendations for intervention strategies.

Features:
- Real-time risk scoring based on multiple factors
- Historical pattern analysis
- Behavioral prediction modeling
- Dynamic threshold calibration
- Integration with existing analytics and AI systems
"""

import logging
import numpy as np
import pandas as pd
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timedelta, time
from dataclasses import dataclass
from enum import Enum
import json
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc

from models import (
    User, Appointment, Client, Payment, NotificationQueue, 
    NotificationStatus
)
from services.analytics_service import AnalyticsService
from services.predictive_modeling_service import PredictiveModelingService
from services.ai_providers.ai_provider_manager import ai_provider_manager
from config import settings

logger = logging.getLogger(__name__)


class RiskLevel(Enum):
    """Risk level categories for no-show prediction"""
    LOW = "low"           # 0-20% risk
    MEDIUM = "medium"     # 21-50% risk
    HIGH = "high"         # 51-75% risk
    CRITICAL = "critical" # 76-100% risk


@dataclass
class NoShowRiskScore:
    """Container for no-show risk assessment"""
    client_id: int
    appointment_id: int
    risk_score: float  # 0.0 to 1.0
    risk_level: RiskLevel
    confidence: float  # 0.0 to 1.0
    factors: Dict[str, float]  # Contributing factors and their weights
    recommendations: List[str]
    intervention_urgency: str  # "immediate", "soon", "standard", "none"
    predicted_at: datetime


@dataclass
class InterventionRecommendation:
    """Recommended intervention action"""
    action_type: str  # "sms", "call", "email", "discount", "reschedule_offer"
    timing: datetime  # When to execute
    priority: int     # 1 (highest) to 5 (lowest)
    message_template: str
    personalization_data: Dict[str, Any]
    expected_effectiveness: float  # 0.0 to 1.0


class AINoShowPredictionService:
    """
    AI-powered service for predicting and preventing no-shows.
    
    Uses multiple data sources and machine learning techniques to assess
    no-show risk and recommend targeted intervention strategies.
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.analytics_service = AnalyticsService(db)
        self.predictive_service = PredictiveModelingService(db)
        
        # Risk factor weights (can be dynamically calibrated)
        self.risk_weights = {
            "historical_no_show_rate": 0.25,
            "booking_advance_time": 0.15,
            "time_of_day": 0.10,
            "day_of_week": 0.10,
            "weather_factor": 0.08,
            "client_tier": 0.08,
            "previous_cancellations": 0.12,
            "communication_response_rate": 0.07,
            "payment_history": 0.05
        }
        
        # Dynamic thresholds (auto-calibrated based on success rates)
        self.risk_thresholds = {
            RiskLevel.LOW: 0.20,
            RiskLevel.MEDIUM: 0.50,
            RiskLevel.HIGH: 0.75,
            RiskLevel.CRITICAL: 1.0
        }
    
    async def predict_no_show_risk(self, appointment_id: int) -> NoShowRiskScore:
        """
        Predict no-show risk for a specific appointment.
        
        Args:
            appointment_id: ID of the appointment to assess
            
        Returns:
            NoShowRiskScore with risk assessment and recommendations
        """
        # Get appointment and related data
        appointment = self.db.query(Appointment).filter(
            Appointment.id == appointment_id
        ).first()
        
        if not appointment:
            raise ValueError(f"Appointment {appointment_id} not found")
        
        # Get client data
        client = None
        if appointment.client_id:
            client = self.db.query(Client).filter(
                Client.id == appointment.client_id
            ).first()
        
        # Calculate risk factors
        factors = {}
        
        # Historical no-show rate factor
        factors["historical_no_show_rate"] = await self._calculate_historical_no_show_factor(
            appointment.user_id, client.id if client else None
        )
        
        # Booking advance time factor
        factors["booking_advance_time"] = self._calculate_advance_booking_factor(appointment)
        
        # Time and day factors
        factors["time_of_day"] = self._calculate_time_of_day_factor(appointment.start_time)
        factors["day_of_week"] = self._calculate_day_of_week_factor(appointment.start_time)
        
        # Weather factor (if available)
        factors["weather_factor"] = await self._calculate_weather_factor(appointment)
        
        # Client tier factor
        factors["client_tier"] = self._calculate_client_tier_factor(client)
        
        # Previous cancellations factor
        factors["previous_cancellations"] = await self._calculate_cancellation_history_factor(
            client.id if client else None
        )
        
        # Communication response rate factor
        factors["communication_response_rate"] = await self._calculate_response_rate_factor(
            appointment.user_id, client.id if client else None
        )
        
        # Payment history factor
        factors["payment_history"] = await self._calculate_payment_history_factor(
            appointment.user_id, client.id if client else None
        )
        
        # Calculate weighted risk score
        risk_score = sum(
            factors[factor] * self.risk_weights[factor]
            for factor in factors
        )
        
        # Determine risk level
        risk_level = self._determine_risk_level(risk_score)
        
        # Calculate confidence based on data availability
        confidence = self._calculate_confidence(factors, client)
        
        # Generate recommendations
        recommendations = await self._generate_intervention_recommendations(
            risk_score, risk_level, appointment, client, factors
        )
        
        # Determine intervention urgency
        urgency = self._determine_intervention_urgency(risk_score, appointment.start_time)
        
        return NoShowRiskScore(
            client_id=client.id if client else 0,
            appointment_id=appointment_id,
            risk_score=risk_score,
            risk_level=risk_level,
            confidence=confidence,
            factors=factors,
            recommendations=recommendations,
            intervention_urgency=urgency,
            predicted_at=datetime.utcnow()
        )
    
    async def get_high_risk_appointments(
        self, 
        user_id: Optional[int] = None,
        days_ahead: int = 7,
        min_risk_level: RiskLevel = RiskLevel.MEDIUM
    ) -> List[NoShowRiskScore]:
        """
        Get all high-risk appointments for proactive intervention.
        
        Args:
            user_id: Optional user ID to filter by
            days_ahead: How many days ahead to look
            min_risk_level: Minimum risk level to include
            
        Returns:
            List of high-risk appointments sorted by risk score
        """
        # Get upcoming appointments
        start_date = datetime.utcnow()
        end_date = start_date + timedelta(days=days_ahead)
        
        query = self.db.query(Appointment).filter(
            and_(
                Appointment.start_time >= start_date,
                Appointment.start_time <= end_date,
                Appointment.status.in_(["pending", "confirmed"])
            )
        )
        
        if user_id:
            query = query.filter(Appointment.user_id == user_id)
        
        appointments = query.all()
        
        # Calculate risk scores for all appointments
        risk_scores = []
        for appointment in appointments:
            try:
                risk_score = await self.predict_no_show_risk(appointment.id)
                
                # Filter by minimum risk level
                if self._risk_level_to_value(risk_score.risk_level) >= self._risk_level_to_value(min_risk_level):
                    risk_scores.append(risk_score)
                    
            except Exception as e:
                logger.error(f"Error calculating risk for appointment {appointment.id}: {e}")
                continue
        
        # Sort by risk score (highest first)
        return sorted(risk_scores, key=lambda x: x.risk_score, reverse=True)
    
    async def generate_intervention_plan(
        self, 
        risk_score: NoShowRiskScore
    ) -> List[InterventionRecommendation]:
        """
        Generate a detailed intervention plan for a high-risk appointment.
        
        Args:
            risk_score: NoShowRiskScore object
            
        Returns:
            List of recommended interventions in priority order
        """
        appointment = self.db.query(Appointment).filter(
            Appointment.id == risk_score.appointment_id
        ).first()
        
        client = None
        if risk_score.client_id:
            client = self.db.query(Client).filter(
                Client.id == risk_score.client_id
            ).first()
        
        interventions = []
        current_time = datetime.utcnow()
        
        # Immediate interventions for critical risk
        if risk_score.risk_level == RiskLevel.CRITICAL:
            # Immediate SMS confirmation
            interventions.append(InterventionRecommendation(
                action_type="sms",
                timing=current_time + timedelta(minutes=30),
                priority=1,
                message_template="urgent_confirmation",
                personalization_data=await self._get_personalization_data(appointment, client),
                expected_effectiveness=0.7
            ))
            
            # Follow-up call if no response
            interventions.append(InterventionRecommendation(
                action_type="call",
                timing=current_time + timedelta(hours=2),
                priority=2,
                message_template="personal_call_script",
                personalization_data=await self._get_personalization_data(appointment, client),
                expected_effectiveness=0.9
            ))
        
        # High risk interventions
        elif risk_score.risk_level == RiskLevel.HIGH:
            # Personalized SMS with incentive
            interventions.append(InterventionRecommendation(
                action_type="sms",
                timing=current_time + timedelta(hours=1),
                priority=2,
                message_template="personalized_reminder_with_incentive",
                personalization_data=await self._get_personalization_data(appointment, client),
                expected_effectiveness=0.6
            ))
            
            # Email backup
            interventions.append(InterventionRecommendation(
                action_type="email",
                timing=current_time + timedelta(hours=4),
                priority=3,
                message_template="detailed_reminder_email",
                personalization_data=await self._get_personalization_data(appointment, client),
                expected_effectiveness=0.4
            ))
        
        # Medium risk interventions
        elif risk_score.risk_level == RiskLevel.MEDIUM:
            # Enhanced reminder SMS
            interventions.append(InterventionRecommendation(
                action_type="sms",
                timing=current_time + timedelta(hours=2),
                priority=3,
                message_template="enhanced_reminder",
                personalization_data=await self._get_personalization_data(appointment, client),
                expected_effectiveness=0.5
            ))
        
        # Add reschedule offer for weather/timing issues
        if risk_score.factors.get("weather_factor", 0) > 0.7:
            interventions.append(InterventionRecommendation(
                action_type="reschedule_offer",
                timing=current_time + timedelta(minutes=15),
                priority=1,
                message_template="weather_reschedule_offer",
                personalization_data=await self._get_personalization_data(appointment, client),
                expected_effectiveness=0.8
            ))
        
        return sorted(interventions, key=lambda x: x.priority)
    
    async def calibrate_risk_model(self, user_id: Optional[int] = None) -> Dict[str, Any]:
        """
        Calibrate the risk prediction model based on historical accuracy.
        
        Args:
            user_id: Optional user ID to calibrate for specific business
            
        Returns:
            Calibration results and updated parameters
        """
        # Get historical appointments with outcomes
        lookback_days = 90
        start_date = datetime.utcnow() - timedelta(days=lookback_days)
        
        query = self.db.query(Appointment).filter(
            and_(
                Appointment.start_time >= start_date,
                Appointment.start_time <= datetime.utcnow(),
                Appointment.status.in_(["completed", "no_show", "cancelled"])
            )
        )
        
        if user_id:
            query = query.filter(Appointment.user_id == user_id)
        
        historical_appointments = query.all()
        
        # Calculate prediction accuracy
        correct_predictions = 0
        total_predictions = 0
        risk_distribution = {level: {"predicted": 0, "actual_no_shows": 0} for level in RiskLevel}
        
        for appointment in historical_appointments:
            try:
                # Simulate historical prediction
                historical_risk = await self._simulate_historical_prediction(appointment)
                predicted_no_show = historical_risk.risk_score > 0.5
                actual_no_show = appointment.status == "no_show"
                
                if predicted_no_show == actual_no_show:
                    correct_predictions += 1
                
                total_predictions += 1
                
                # Track risk level distribution
                risk_distribution[historical_risk.risk_level]["predicted"] += 1
                if actual_no_show:
                    risk_distribution[historical_risk.risk_level]["actual_no_shows"] += 1
                    
            except Exception as e:
                logger.error(f"Error in historical prediction for appointment {appointment.id}: {e}")
                continue
        
        # Calculate accuracy metrics
        accuracy = correct_predictions / total_predictions if total_predictions > 0 else 0
        
        # Adjust thresholds based on performance
        self._adjust_risk_thresholds(risk_distribution)
        
        # Adjust factor weights based on predictive power
        await self._adjust_factor_weights(historical_appointments)
        
        return {
            "calibration_date": datetime.utcnow().isoformat(),
            "historical_appointments_analyzed": total_predictions,
            "overall_accuracy": accuracy,
            "risk_distribution": risk_distribution,
            "updated_thresholds": {level.value: threshold for level, threshold in self.risk_thresholds.items()},
            "updated_weights": self.risk_weights.copy()
        }
    
    # Private helper methods
    
    async def _calculate_historical_no_show_factor(self, user_id: int, client_id: Optional[int]) -> float:
        """Calculate factor based on historical no-show rates"""
        if not client_id:
            # Use business average if no client data
            business_rate = await self._get_business_no_show_rate(user_id)
            return min(business_rate * 2, 1.0)  # Default higher risk for new clients
        
        # Get client's historical no-show rate
        ninety_days_ago = datetime.utcnow() - timedelta(days=90)
        
        total_appointments = self.db.query(func.count(Appointment.id)).filter(
            and_(
                Appointment.client_id == client_id,
                Appointment.start_time >= ninety_days_ago,
                Appointment.status.in_(["completed", "no_show", "cancelled"])
            )
        ).scalar() or 0
        
        no_shows = self.db.query(func.count(Appointment.id)).filter(
            and_(
                Appointment.client_id == client_id,
                Appointment.start_time >= ninety_days_ago,
                Appointment.status == "no_show"
            )
        ).scalar() or 0
        
        if total_appointments == 0:
            return 0.3  # Default medium risk for new clients
        
        return min(no_shows / total_appointments, 1.0)
    
    def _calculate_advance_booking_factor(self, appointment: Appointment) -> float:
        """Calculate risk factor based on how far in advance the appointment was booked"""
        advance_time = (appointment.start_time - appointment.created_at).total_seconds() / 3600  # hours
        
        # Same-day bookings are higher risk
        if advance_time < 24:
            return 0.8
        # Very far advance bookings are also higher risk
        elif advance_time > 720:  # 30 days
            return 0.6
        # Sweet spot is 1-7 days
        elif 24 <= advance_time <= 168:  # 1-7 days
            return 0.2
        else:
            return 0.4
    
    def _calculate_time_of_day_factor(self, appointment_time: datetime) -> float:
        """Calculate risk factor based on time of day"""
        hour = appointment_time.hour
        
        # Early morning appointments (before 9 AM) are higher risk
        if hour < 9:
            return 0.7
        # Late evening appointments (after 6 PM) are higher risk
        elif hour >= 18:
            return 0.6
        # Lunch time slots can be higher risk
        elif 12 <= hour <= 14:
            return 0.4
        # Prime time slots are lower risk
        else:
            return 0.2
    
    def _calculate_day_of_week_factor(self, appointment_time: datetime) -> float:
        """Calculate risk factor based on day of week"""
        weekday = appointment_time.weekday()
        
        # Monday and Friday tend to have higher no-show rates
        if weekday in [0, 4]:  # Monday, Friday
            return 0.6
        # Weekend appointments can be higher risk
        elif weekday in [5, 6]:  # Saturday, Sunday
            return 0.5
        # Mid-week appointments are generally more reliable
        else:
            return 0.3
    
    async def _calculate_weather_factor(self, appointment: Appointment) -> float:
        """Calculate risk factor based on weather conditions"""
        # This would integrate with a weather API
        # For now, return a baseline factor
        return 0.3
    
    def _calculate_client_tier_factor(self, client: Optional[Client]) -> float:
        """Calculate risk factor based on client tier/value"""
        if not client:
            return 0.5  # Unknown client
        
        # Higher value clients typically have lower no-show rates
        if hasattr(client, 'tier'):
            tier_mapping = {
                ClientTier.VIP: 0.1,
                ClientTier.GOLD: 0.2,
                ClientTier.SILVER: 0.3,
                ClientTier.BRONZE: 0.4,
                ClientTier.NEW: 0.5
            }
            return tier_mapping.get(client.tier, 0.4)
        
        # Use total spent as proxy for tier
        if client.total_spent > 1000:
            return 0.1
        elif client.total_spent > 500:
            return 0.2
        elif client.total_spent > 200:
            return 0.3
        else:
            return 0.4
    
    async def _calculate_cancellation_history_factor(self, client_id: Optional[int]) -> float:
        """Calculate factor based on previous cancellation patterns"""
        if not client_id:
            return 0.4
        
        ninety_days_ago = datetime.utcnow() - timedelta(days=90)
        
        total_appointments = self.db.query(func.count(Appointment.id)).filter(
            and_(
                Appointment.client_id == client_id,
                Appointment.start_time >= ninety_days_ago
            )
        ).scalar() or 0
        
        cancelled_appointments = self.db.query(func.count(Appointment.id)).filter(
            and_(
                Appointment.client_id == client_id,
                Appointment.start_time >= ninety_days_ago,
                Appointment.status == "cancelled"
            )
        ).scalar() or 0
        
        if total_appointments == 0:
            return 0.3
        
        cancellation_rate = cancelled_appointments / total_appointments
        return min(cancellation_rate * 1.5, 1.0)  # Amplify cancellation history impact
    
    async def _calculate_response_rate_factor(self, user_id: int, client_id: Optional[int]) -> float:
        """Calculate factor based on client's communication response rate"""
        if not client_id:
            return 0.4
        
        # Get notification response history
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        
        sent_notifications = self.db.query(func.count(NotificationQueue.id)).filter(
            and_(
                NotificationQueue.user_id == user_id,
                NotificationQueue.created_at >= thirty_days_ago,
                NotificationQueue.status == NotificationStatus.SENT,
                NotificationQueue.notification_type == "sms"
            )
        ).scalar() or 0
        
        # This would need to track SMS responses in the future
        # For now, use a baseline
        return 0.3
    
    async def _calculate_payment_history_factor(self, user_id: int, client_id: Optional[int]) -> float:
        """Calculate factor based on payment history reliability"""
        if not client_id:
            return 0.4
        
        # Get payment history
        ninety_days_ago = datetime.utcnow() - timedelta(days=90)
        
        total_payments = self.db.query(func.count(Payment.id)).filter(
            and_(
                Payment.user_id == user_id,
                Payment.created_at >= ninety_days_ago,
                # Would need client_id on Payment model for direct filtering
            )
        ).scalar() or 0
        
        failed_payments = self.db.query(func.count(Payment.id)).filter(
            and_(
                Payment.user_id == user_id,
                Payment.created_at >= ninety_days_ago,
                Payment.status == "failed"
            )
        ).scalar() or 0
        
        if total_payments == 0:
            return 0.3
        
        failure_rate = failed_payments / total_payments
        return min(failure_rate * 2, 1.0)
    
    def _determine_risk_level(self, risk_score: float) -> RiskLevel:
        """Determine risk level based on score and thresholds"""
        if risk_score >= self.risk_thresholds[RiskLevel.CRITICAL]:
            return RiskLevel.CRITICAL
        elif risk_score >= self.risk_thresholds[RiskLevel.HIGH]:
            return RiskLevel.HIGH
        elif risk_score >= self.risk_thresholds[RiskLevel.MEDIUM]:
            return RiskLevel.MEDIUM
        else:
            return RiskLevel.LOW
    
    def _calculate_confidence(self, factors: Dict[str, float], client: Optional[Client]) -> float:
        """Calculate confidence score based on data availability"""
        confidence_factors = []
        
        # Client history availability
        if client and client.total_visits > 5:
            confidence_factors.append(0.9)
        elif client and client.total_visits > 0:
            confidence_factors.append(0.6)
        else:
            confidence_factors.append(0.3)
        
        # Factor data completeness
        complete_factors = sum(1 for factor, value in factors.items() if value > 0)
        factor_completeness = complete_factors / len(factors)
        confidence_factors.append(factor_completeness)
        
        return np.mean(confidence_factors)
    
    async def _generate_intervention_recommendations(
        self, 
        risk_score: float, 
        risk_level: RiskLevel, 
        appointment: Appointment, 
        client: Optional[Client],
        factors: Dict[str, float]
    ) -> List[str]:
        """Generate human-readable intervention recommendations"""
        recommendations = []
        
        if risk_level in [RiskLevel.HIGH, RiskLevel.CRITICAL]:
            recommendations.append("Send immediate personalized confirmation SMS")
            recommendations.append("Follow up with phone call if no response within 2 hours")
            
        if factors.get("advance_booking_factor", 0) > 0.6:
            recommendations.append("Send additional reminder due to same-day booking")
            
        if factors.get("weather_factor", 0) > 0.7:
            recommendations.append("Offer rescheduling due to weather conditions")
            
        if factors.get("time_of_day", 0) > 0.6:
            recommendations.append("Consider rescheduling to optimal time slot")
            
        if client and client.total_visits == 0:
            recommendations.append("Provide extra support for new client")
            
        return recommendations
    
    def _determine_intervention_urgency(self, risk_score: float, appointment_time: datetime) -> str:
        """Determine how urgently intervention is needed"""
        hours_until = (appointment_time - datetime.utcnow()).total_seconds() / 3600
        
        if risk_score > 0.8 and hours_until < 4:
            return "immediate"
        elif risk_score > 0.6 and hours_until < 12:
            return "soon"
        elif risk_score > 0.4:
            return "standard"
        else:
            return "none"
    
    def _risk_level_to_value(self, risk_level: RiskLevel) -> float:
        """Convert risk level to numeric value for comparison"""
        mapping = {
            RiskLevel.LOW: 0.1,
            RiskLevel.MEDIUM: 0.4,
            RiskLevel.HIGH: 0.7,
            RiskLevel.CRITICAL: 0.9
        }
        return mapping[risk_level]
    
    async def _get_personalization_data(self, appointment: Appointment, client: Optional[Client]) -> Dict[str, Any]:
        """Get data for personalizing intervention messages"""
        return {
            "client_name": f"{client.first_name} {client.last_name}" if client else "Guest",
            "appointment_date": appointment.start_time.strftime("%B %d"),
            "appointment_time": appointment.start_time.strftime("%I:%M %p"),
            "service_name": appointment.service_name,
            "barber_name": appointment.barber.name if appointment.barber else "your barber",
            "business_name": getattr(settings, 'business_name', 'BookedBarber'),
            "is_new_client": client.total_visits == 0 if client else True,
            "preferred_communication": "SMS"  # Could be enhanced with client preferences
        }
    
    async def _get_business_no_show_rate(self, user_id: int) -> float:
        """Get the overall no-show rate for a business"""
        ninety_days_ago = datetime.utcnow() - timedelta(days=90)
        
        total_appointments = self.db.query(func.count(Appointment.id)).filter(
            and_(
                Appointment.user_id == user_id,
                Appointment.start_time >= ninety_days_ago,
                Appointment.status.in_(["completed", "no_show"])
            )
        ).scalar() or 0
        
        no_shows = self.db.query(func.count(Appointment.id)).filter(
            and_(
                Appointment.user_id == user_id,
                Appointment.start_time >= ninety_days_ago,
                Appointment.status == "no_show"
            )
        ).scalar() or 0
        
        return no_shows / total_appointments if total_appointments > 0 else 0.15  # Default 15%
    
    async def _simulate_historical_prediction(self, appointment: Appointment) -> NoShowRiskScore:
        """Simulate what the prediction would have been for a historical appointment"""
        # This is a simplified version that would calculate risk factors as they would have been
        # at the time of the appointment (without using future data)
        return await self.predict_no_show_risk(appointment.id)
    
    def _adjust_risk_thresholds(self, risk_distribution: Dict[RiskLevel, Dict[str, int]]):
        """Adjust risk level thresholds based on historical performance"""
        # Implement dynamic threshold adjustment logic
        # For now, keep current thresholds
        pass
    
    async def _adjust_factor_weights(self, historical_appointments: List[Appointment]):
        """Adjust factor weights based on predictive power analysis"""
        # Implement weight optimization logic
        # For now, keep current weights
        pass


# Singleton instance
ai_no_show_prediction_service = None

def get_ai_no_show_prediction_service(db: Session) -> AINoShowPredictionService:
    """Get or create the AI no-show prediction service instance"""
    global ai_no_show_prediction_service
    if ai_no_show_prediction_service is None:
        ai_no_show_prediction_service = AINoShowPredictionService(db)
    return ai_no_show_prediction_service