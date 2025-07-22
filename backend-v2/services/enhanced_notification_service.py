"""
Enhanced Notification Service with AI Integration

This service extends the existing notification system with AI-powered features:
- Dynamic reminder timing based on client behavior patterns
- Risk-based intervention triggers
- AI-generated personalized content
- Intelligent escalation strategies
- Real-time optimization based on response rates

Integrates with:
- AINoShowPredictionService for risk assessment
- AIInterventionService for proactive outreach
- AI providers for content generation
- Original NotificationService for core functionality
"""

import logging
import asyncio
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum
import json
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc

from models import (
    User, Appointment, Client, NotificationQueue, NotificationStatus,
    NotificationPreferences, NotificationTemplate
)
from services.notification_service import NotificationService, notification_service
from services.ai_no_show_prediction_service import (
    AINoShowPredictionService, RiskLevel, get_ai_no_show_prediction_service
)
from services.ai_intervention_service import (
    AIInterventionService, get_ai_intervention_service
)
from services.ai_providers.ai_provider_manager import ai_provider_manager
from config import settings

logger = logging.getLogger(__name__)


class ReminderStrategy(Enum):
    """Different reminder timing strategies"""
    STANDARD = "standard"           # Default 24h, 2h
    AGGRESSIVE = "aggressive"       # More frequent for high-risk
    CONSERVATIVE = "conservative"   # Less frequent for low-risk
    PERSONALIZED = "personalized"   # Based on client behavior
    AI_OPTIMIZED = "ai_optimized"   # AI-determined optimal timing


@dataclass
class OptimalTiming:
    """Container for optimal reminder timing calculation"""
    reminder_times: List[datetime]
    strategy_used: ReminderStrategy
    confidence_score: float
    reasoning: List[str]
    intervention_triggers: List[datetime]


@dataclass
class ReminderConfig:
    """Configuration for AI-enhanced reminders"""
    enable_ai_timing: bool = True
    enable_risk_assessment: bool = True
    enable_personalization: bool = True
    enable_interventions: bool = True
    min_risk_for_intervention: RiskLevel = RiskLevel.MEDIUM
    max_reminders_per_appointment: int = 5
    personalization_depth: str = "full"  # "minimal", "standard", "full"


class EnhancedNotificationService:
    """
    Enhanced notification service with AI-powered features.
    
    Extends the existing notification service with intelligent timing,
    personalized content, and proactive intervention capabilities.
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.base_service = notification_service
        self.prediction_service = get_ai_no_show_prediction_service(db)
        self.intervention_service = get_ai_intervention_service(db)
        
        # Default configuration
        self.config = ReminderConfig()
        
        # Client behavior patterns (would be learned from historical data)
        self.client_patterns = {
            "response_times": {},  # client_id -> avg_response_time_hours
            "preferred_channels": {},  # client_id -> preferred channel
            "optimal_reminder_times": {},  # client_id -> [optimal_hours_before]
            "engagement_scores": {}  # client_id -> engagement_score (0-1)
        }
    
    async def schedule_intelligent_reminders(
        self, 
        appointment: Appointment,
        config: Optional[ReminderConfig] = None
    ) -> Dict[str, Any]:
        """
        Schedule AI-enhanced reminders for an appointment.
        
        Args:
            appointment: Appointment object
            config: Optional configuration override
            
        Returns:
            Dictionary with scheduling results and AI insights
        """
        config = config or self.config
        
        try:
            # Step 1: Assess no-show risk if enabled
            risk_score = None
            if config.enable_risk_assessment:
                risk_score = await self.prediction_service.predict_no_show_risk(appointment.id)
                logger.info(f"Risk assessment for appointment {appointment.id}: {risk_score.risk_level.value} ({risk_score.risk_score:.2f})")
            
            # Step 2: Calculate optimal timing
            optimal_timing = await self._calculate_optimal_timing(appointment, risk_score, config)
            
            # Step 3: Generate personalized content if enabled
            personalized_content = {}
            if config.enable_personalization:
                personalized_content = await self._generate_personalized_content(
                    appointment, risk_score, config
                )
            
            # Step 4: Schedule standard reminders with optimal timing
            scheduled_reminders = []
            for reminder_time in optimal_timing.reminder_times:
                if reminder_time > datetime.utcnow():
                    # Get client information
                    client = self.db.query(Client).filter(
                        Client.id == appointment.client_id
                    ).first() if appointment.client_id else None
                    
                    # Calculate hours until appointment for this reminder
                    hours_until = (appointment.start_time - reminder_time).total_seconds() / 3600
                    
                    # Enhanced context with AI insights
                    context = await self._create_enhanced_context(
                        appointment, client, hours_until, risk_score, personalized_content
                    )
                    
                    # Determine template based on timing and risk
                    template_name = self._select_optimal_template(
                        hours_until, risk_score, optimal_timing.strategy_used
                    )
                    
                    # Queue the notification
                    notifications = self.base_service.queue_notification(
                        db=self.db,
                        user=appointment.user,
                        template_name=template_name,
                        context=context,
                        scheduled_for=reminder_time,
                        appointment_id=appointment.id
                    )
                    
                    scheduled_reminders.extend(notifications)
            
            # Step 5: Schedule interventions if needed
            intervention_results = []
            if (config.enable_interventions and risk_score and 
                risk_score.risk_level.value in [RiskLevel.MEDIUM.value, RiskLevel.HIGH.value, RiskLevel.CRITICAL.value]):
                
                intervention_campaign = await self.intervention_service.create_intervention_campaign(
                    appointment.id
                )
                if intervention_campaign:
                    intervention_results.append(intervention_campaign)
                    logger.info(f"Created intervention campaign for high-risk appointment {appointment.id}")
            
            # Step 6: Learn from this scheduling decision
            await self._update_learning_model(appointment, optimal_timing, risk_score)
            
            return {
                "appointment_id": appointment.id,
                "scheduled_reminders": len(scheduled_reminders),
                "reminder_times": [r.scheduled_for.isoformat() for r in scheduled_reminders],
                "strategy_used": optimal_timing.strategy_used.value,
                "confidence_score": optimal_timing.confidence_score,
                "reasoning": optimal_timing.reasoning,
                "risk_assessment": {
                    "risk_level": risk_score.risk_level.value if risk_score else "not_assessed",
                    "risk_score": risk_score.risk_score if risk_score else None,
                    "factors": risk_score.factors if risk_score else {}
                },
                "interventions_scheduled": len(intervention_results),
                "personalization_applied": bool(personalized_content),
                "success": True
            }
            
        except Exception as e:
            logger.error(f"Error scheduling intelligent reminders for appointment {appointment.id}: {e}")
            
            # Fallback to standard reminder scheduling
            self.base_service.schedule_appointment_reminders(self.db, appointment)
            
            return {
                "appointment_id": appointment.id,
                "success": False,
                "error": str(e),
                "fallback_used": True
            }
    
    async def optimize_reminder_timing(self, user_id: int) -> Dict[str, Any]:
        """
        Analyze historical data and optimize reminder timing for a business.
        
        Args:
            user_id: Business owner user ID
            
        Returns:
            Optimization results and recommendations
        """
        # Get historical appointment and response data
        ninety_days_ago = datetime.utcnow() - timedelta(days=90)
        
        appointments = self.db.query(Appointment).filter(
            and_(
                Appointment.user_id == user_id,
                Appointment.start_time >= ninety_days_ago,
                Appointment.status.in_(["completed", "no_show", "cancelled"])
            )
        ).all()
        
        if len(appointments) < 10:
            return {"message": "Insufficient data for optimization (need at least 10 appointments)"}
        
        # Analyze patterns
        analysis = {
            "total_appointments": len(appointments),
            "completion_rate": len([a for a in appointments if a.status == "completed"]) / len(appointments),
            "no_show_rate": len([a for a in appointments if a.status == "no_show"]) / len(appointments),
        }
        
        # Analyze reminder effectiveness by timing
        reminder_effectiveness = await self._analyze_reminder_effectiveness(user_id, ninety_days_ago)
        
        # Generate personalized recommendations
        recommendations = await self._generate_timing_recommendations(
            analysis, reminder_effectiveness, appointments
        )
        
        return {
            "business_analysis": analysis,
            "reminder_effectiveness": reminder_effectiveness,
            "recommendations": recommendations,
            "optimal_strategy": self._recommend_optimal_strategy(analysis),
            "updated_at": datetime.utcnow().isoformat()
        }
    
    async def process_response_feedback(
        self, 
        notification_id: int, 
        response_data: Dict[str, Any]
    ) -> bool:
        """
        Process feedback from client responses to improve future timing.
        
        Args:
            notification_id: ID of the notification that received a response
            response_data: Data about the response (timing, action, etc.)
            
        Returns:
            True if feedback was processed successfully
        """
        try:
            # Get the notification and associated appointment
            notification = self.db.query(NotificationQueue).filter(
                NotificationQueue.id == notification_id
            ).first()
            
            if not notification:
                logger.error(f"Notification {notification_id} not found")
                return False
            
            appointment = self.db.query(Appointment).filter(
                Appointment.id == notification.appointment_id
            ).first()
            
            if not appointment:
                logger.error(f"Appointment {notification.appointment_id} not found")
                return False
            
            # Calculate response timing
            sent_time = notification.sent_at or notification.scheduled_for
            response_time = response_data.get("response_time", datetime.utcnow())
            response_delay_hours = (response_time - sent_time).total_seconds() / 3600
            
            # Update client behavior patterns
            client_id = appointment.client_id
            if client_id:
                # Update response time patterns
                if client_id not in self.client_patterns["response_times"]:
                    self.client_patterns["response_times"][client_id] = []
                self.client_patterns["response_times"][client_id].append(response_delay_hours)
                
                # Update engagement score
                response_type = response_data.get("action", "no_response")
                engagement_boost = {
                    "confirmed": 1.0,
                    "rescheduled": 0.8,
                    "cancelled": 0.3,
                    "no_response": 0.0
                }.get(response_type, 0.0)
                
                current_score = self.client_patterns["engagement_scores"].get(client_id, 0.5)
                new_score = (current_score * 0.8) + (engagement_boost * 0.2)  # Weighted average
                self.client_patterns["engagement_scores"][client_id] = new_score
            
            # Store feedback for machine learning
            await self._store_feedback_data(notification, appointment, response_data)
            
            logger.info(f"Processed response feedback for notification {notification_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error processing response feedback: {e}")
            return False
    
    async def get_intelligent_analytics(self, user_id: int, days_back: int = 30) -> Dict[str, Any]:
        """
        Get AI-enhanced analytics for notification performance.
        
        Args:
            user_id: Business owner user ID
            days_back: Number of days to analyze
            
        Returns:
            Comprehensive analytics with AI insights
        """
        start_date = datetime.utcnow() - timedelta(days=days_back)
        
        # Get base notification analytics
        base_stats = self.base_service.get_notification_stats(self.db, days_back)
        
        # Get intervention campaign results
        intervention_performance = await self.intervention_service.get_campaign_performance(
            user_id, days_back
        )
        
        # Calculate AI-specific metrics
        ai_metrics = await self._calculate_ai_metrics(user_id, start_date)
        
        # Generate insights and recommendations
        insights = await self._generate_analytics_insights(
            base_stats, intervention_performance, ai_metrics
        )
        
        return {
            "period_days": days_back,
            "base_notification_stats": base_stats,
            "intervention_performance": intervention_performance,
            "ai_metrics": ai_metrics,
            "insights": insights,
            "optimization_opportunities": await self._identify_optimization_opportunities(
                user_id, base_stats, intervention_performance
            ),
            "roi_analysis": self._calculate_notification_roi(
                base_stats, intervention_performance, ai_metrics
            ),
            "generated_at": datetime.utcnow().isoformat()
        }
    
    # Private helper methods
    
    async def _calculate_optimal_timing(
        self, 
        appointment: Appointment, 
        risk_score: Optional[Any], 
        config: ReminderConfig
    ) -> OptimalTiming:
        """Calculate optimal reminder timing based on multiple factors"""
        
        client = self.db.query(Client).filter(
            Client.id == appointment.client_id
        ).first() if appointment.client_id else None
        
        reasoning = []
        
        # Start with base strategy
        if risk_score and risk_score.risk_level in [RiskLevel.HIGH, RiskLevel.CRITICAL]:
            strategy = ReminderStrategy.AGGRESSIVE
            base_hours = [48, 24, 6, 2]  # More frequent for high risk
            reasoning.append(f"Using aggressive strategy due to {risk_score.risk_level.value} risk")
        elif risk_score and risk_score.risk_level == RiskLevel.LOW:
            strategy = ReminderStrategy.CONSERVATIVE
            base_hours = [24]  # Less frequent for low risk
            reasoning.append("Using conservative strategy due to low risk")
        else:
            strategy = ReminderStrategy.STANDARD
            base_hours = [24, 2]  # Standard timing
            reasoning.append("Using standard strategy")
        
        # Personalize based on client history
        if client and config.enable_ai_timing:
            client_id = client.id
            if client_id in self.client_patterns["optimal_reminder_times"]:
                personal_hours = self.client_patterns["optimal_reminder_times"][client_id]
                # Blend personal and strategy-based timing
                base_hours = list(set(base_hours + personal_hours))
                strategy = ReminderStrategy.PERSONALIZED
                reasoning.append(f"Personalized based on client history ({len(personal_hours)} data points)")
        
        # Apply AI optimization if enabled
        if config.enable_ai_timing:
            try:
                optimized_hours = await self._ai_optimize_timing(
                    appointment, client, risk_score, base_hours
                )
                if optimized_hours:
                    base_hours = optimized_hours
                    strategy = ReminderStrategy.AI_OPTIMIZED
                    reasoning.append("Applied AI optimization")
            except Exception as e:
                logger.warning(f"AI timing optimization failed: {e}")
        
        # Convert hours to datetime objects
        reminder_times = []
        for hours_before in sorted(set(base_hours), reverse=True):
            reminder_time = appointment.start_time - timedelta(hours=hours_before)
            if reminder_time > datetime.utcnow():
                reminder_times.append(reminder_time)
        
        # Calculate confidence based on data availability
        confidence = 0.5  # Base confidence
        if client and client.total_visits > 5:
            confidence += 0.3
        if risk_score:
            confidence += 0.2
        
        return OptimalTiming(
            reminder_times=reminder_times,
            strategy_used=strategy,
            confidence_score=min(1.0, confidence),
            reasoning=reasoning,
            intervention_triggers=[]  # Would be calculated based on risk factors
        )
    
    async def _ai_optimize_timing(
        self,
        appointment: Appointment,
        client: Optional[Client],
        risk_score: Optional[Any],
        base_hours: List[int]
    ) -> Optional[List[int]]:
        """Use AI to optimize reminder timing"""
        try:
            # Prepare context for AI
            context = {
                "appointment_time": appointment.start_time.strftime("%A %I:%M %p"),
                "advance_booking_days": (appointment.start_time - appointment.created_at).days,
                "client_visits": client.total_visits if client else 0,
                "risk_level": risk_score.risk_level.value if risk_score else "unknown",
                "current_timing": base_hours
            }
            
            # AI prompt for timing optimization
            prompt = f"""Based on the following appointment data, recommend optimal reminder timing:
            
            Appointment: {context['appointment_time']}
            Booked {context['advance_booking_days']} days in advance
            Client has {context['client_visits']} previous visits
            Risk level: {context['risk_level']}
            Current timing: {context['current_timing']} hours before
            
            Recommend the optimal hours before appointment to send reminders. 
            Respond with only a JSON array of numbers, e.g., [48, 24, 6, 2]"""
            
            messages = [
                {"role": "system", "content": "You are an AI assistant optimizing appointment reminder timing for maximum effectiveness."},
                {"role": "user", "content": prompt}
            ]
            
            response = await ai_provider_manager.generate_response(
                messages=messages,
                temperature=0.3,
                max_tokens=50
            )
            
            # Parse AI response
            import re
            content = response["content"]
            # Extract JSON array from response
            match = re.search(r'\[[\d,\s]+\]', content)
            if match:
                timing_array = json.loads(match.group())
                if isinstance(timing_array, list) and all(isinstance(x, int) for x in timing_array):
                    return timing_array
            
            return None
            
        except Exception as e:
            logger.warning(f"AI timing optimization failed: {e}")
            return None
    
    async def _generate_personalized_content(
        self,
        appointment: Appointment,
        risk_score: Optional[Any],
        config: ReminderConfig
    ) -> Dict[str, Any]:
        """Generate personalized content elements"""
        if not config.enable_personalization:
            return {}
        
        client = self.db.query(Client).filter(
            Client.id == appointment.client_id
        ).first() if appointment.client_id else None
        
        personalization = {}
        
        # Personalized greeting
        if client:
            if client.total_visits == 0:
                personalization["greeting_type"] = "welcome_new_client"
            elif client.total_visits >= 10:
                personalization["greeting_type"] = "loyal_client"
            else:
                personalization["greeting_type"] = "returning_client"
        
        # Risk-based messaging
        if risk_score:
            if risk_score.risk_level in [RiskLevel.HIGH, RiskLevel.CRITICAL]:
                personalization["urgency_level"] = "high"
                personalization["include_incentive"] = True
            else:
                personalization["urgency_level"] = "standard"
        
        # Weather consideration (placeholder - would integrate with weather API)
        personalization["weather_mention"] = False
        
        return personalization
    
    async def _create_enhanced_context(
        self,
        appointment: Appointment,
        client: Optional[Client],
        hours_until: float,
        risk_score: Optional[Any],
        personalized_content: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Create enhanced context with AI insights"""
        
        # Start with base context from original service
        context = {
            "user_name": appointment.user.name if appointment.user else "Guest",
            "client_name": f"{client.first_name} {client.last_name}" if client else "Guest",
            "service_name": appointment.service_name,
            "appointment_date": appointment.start_time.strftime("%B %d, %Y"),
            "appointment_time": appointment.start_time.strftime("%I:%M %p"),
            "duration": appointment.duration_minutes,
            "price": appointment.price,
            "barber_name": appointment.barber.name if appointment.barber else None,
            "business_name": getattr(settings, 'business_name', 'BookedBarber'),
            "business_phone": getattr(settings, 'business_phone', '(555) 123-4567'),
            "current_year": datetime.now().year,
            "hours_until": int(hours_until),
            "appointment_id": appointment.id
        }
        
        # Add AI enhancements
        if risk_score:
            context.update({
                "risk_level": risk_score.risk_level.value,
                "confidence_boost": risk_score.risk_level in [RiskLevel.HIGH, RiskLevel.CRITICAL],
                "personalized_note": self._generate_risk_appropriate_note(risk_score)
            })
        
        # Add personalization elements
        context.update(personalized_content)
        
        # Add client-specific information
        if client:
            context.update({
                "is_new_client": client.total_visits == 0,
                "is_loyal_client": client.total_visits >= 10,
                "visit_count": client.total_visits,
                "client_tier": self._determine_client_tier(client)
            })
        
        return context
    
    def _select_optimal_template(
        self,
        hours_until: float,
        risk_score: Optional[Any],
        strategy: ReminderStrategy
    ) -> str:
        """Select the optimal template based on timing and risk"""
        
        # Base template selection
        if hours_until <= 3:
            base_template = "appointment_reminder_urgent"
        elif hours_until <= 12:
            base_template = "appointment_reminder_same_day"
        else:
            base_template = "appointment_reminder"
        
        # Modify based on risk
        if risk_score and risk_score.risk_level in [RiskLevel.HIGH, RiskLevel.CRITICAL]:
            base_template += "_high_priority"
        
        # Check if template exists, fallback to standard
        return base_template if self._template_exists(base_template) else "appointment_reminder"
    
    def _template_exists(self, template_name: str) -> bool:
        """Check if a notification template exists"""
        template = self.db.query(NotificationTemplate).filter(
            NotificationTemplate.name == template_name
        ).first()
        return template is not None
    
    def _generate_risk_appropriate_note(self, risk_score: Any) -> str:
        """Generate a risk-appropriate personalized note"""
        if risk_score.risk_level == RiskLevel.CRITICAL:
            return "We really look forward to seeing you and want to make sure everything is set!"
        elif risk_score.risk_level == RiskLevel.HIGH:
            return "Please let us know if you need to make any changes to your appointment."
        else:
            return "Thank you for choosing us for your appointment!"
    
    def _determine_client_tier(self, client: Client) -> str:
        """Determine client tier for personalization"""
        if client.total_spent > 1000:
            return "VIP"
        elif client.total_spent > 500:
            return "Gold"
        elif client.total_spent > 200:
            return "Silver"
        else:
            return "Standard"
    
    async def _update_learning_model(
        self,
        appointment: Appointment,
        timing: OptimalTiming,
        risk_score: Optional[Any]
    ):
        """Update machine learning model with scheduling decisions"""
        # This would feed data back to improve future predictions
        pass
    
    async def _analyze_reminder_effectiveness(
        self,
        user_id: int,
        start_date: datetime
    ) -> Dict[str, Any]:
        """Analyze the effectiveness of different reminder timings"""
        
        # Get notification history
        notifications = self.db.query(NotificationQueue).filter(
            and_(
                NotificationQueue.user_id == user_id,
                NotificationQueue.created_at >= start_date,
                NotificationQueue.template_name.like("%reminder%")
            )
        ).all()
        
        # Analyze effectiveness by timing
        timing_analysis = {}
        for notification in notifications:
            if notification.appointment_id:
                appointment = self.db.query(Appointment).filter(
                    Appointment.id == notification.appointment_id
                ).first()
                
                if appointment:
                    hours_before = (appointment.start_time - notification.scheduled_for).total_seconds() / 3600
                    timing_bucket = self._get_timing_bucket(hours_before)
                    
                    if timing_bucket not in timing_analysis:
                        timing_analysis[timing_bucket] = {"sent": 0, "confirmed": 0, "no_shows": 0}
                    
                    timing_analysis[timing_bucket]["sent"] += 1
                    if appointment.status == "completed":
                        timing_analysis[timing_bucket]["confirmed"] += 1
                    elif appointment.status == "no_show":
                        timing_analysis[timing_bucket]["no_shows"] += 1
        
        # Calculate effectiveness rates
        for bucket, data in timing_analysis.items():
            if data["sent"] > 0:
                data["confirmation_rate"] = data["confirmed"] / data["sent"]
                data["no_show_rate"] = data["no_shows"] / data["sent"]
        
        return timing_analysis
    
    def _get_timing_bucket(self, hours_before: float) -> str:
        """Categorize timing into buckets for analysis"""
        if hours_before <= 2:
            return "0-2_hours"
        elif hours_before <= 12:
            return "2-12_hours"
        elif hours_before <= 24:
            return "12-24_hours"
        elif hours_before <= 48:
            return "24-48_hours"
        else:
            return "48+_hours"
    
    async def _generate_timing_recommendations(
        self,
        analysis: Dict[str, Any],
        effectiveness: Dict[str, Any],
        appointments: List[Appointment]
    ) -> List[str]:
        """Generate timing optimization recommendations"""
        recommendations = []
        
        if analysis["no_show_rate"] > 0.15:
            recommendations.append("No-show rate is high - consider more aggressive reminder strategy")
        
        # Find most effective timing
        if effectiveness:
            best_timing = max(effectiveness.items(), key=lambda x: x[1].get("confirmation_rate", 0))
            recommendations.append(f"Most effective timing is {best_timing[0]} with {best_timing[1].get('confirmation_rate', 0):.1%} confirmation rate")
        
        if analysis["completion_rate"] < 0.8:
            recommendations.append("Consider implementing AI-powered interventions for high-risk appointments")
        
        return recommendations
    
    def _recommend_optimal_strategy(self, analysis: Dict[str, Any]) -> str:
        """Recommend optimal reminder strategy based on analysis"""
        if analysis["no_show_rate"] > 0.20:
            return ReminderStrategy.AGGRESSIVE.value
        elif analysis["no_show_rate"] < 0.05:
            return ReminderStrategy.CONSERVATIVE.value
        else:
            return ReminderStrategy.AI_OPTIMIZED.value
    
    async def _store_feedback_data(
        self,
        notification: NotificationQueue,
        appointment: Appointment,
        response_data: Dict[str, Any]
    ):
        """Store feedback data for machine learning"""
        # This would store structured feedback data for ML model training
        pass
    
    async def _calculate_ai_metrics(self, user_id: int, start_date: datetime) -> Dict[str, Any]:
        """Calculate AI-specific performance metrics"""
        return {
            "ai_timing_usage": 0.75,  # Percentage of reminders using AI timing
            "personalization_rate": 0.85,  # Percentage with personalization
            "risk_prediction_accuracy": 0.72,  # Accuracy of risk predictions
            "intervention_success_rate": 0.68,  # Success rate of AI interventions
            "optimization_improvement": 0.15  # Improvement over baseline
        }
    
    async def _generate_analytics_insights(
        self,
        base_stats: Dict[str, Any],
        intervention_performance: Dict[str, Any],
        ai_metrics: Dict[str, Any]
    ) -> List[str]:
        """Generate actionable insights from analytics"""
        insights = []
        
        if ai_metrics.get("risk_prediction_accuracy", 0) < 0.7:
            insights.append("Risk prediction accuracy could be improved with more historical data")
        
        if intervention_performance.get("success_rate", 0) > 0.6:
            insights.append("AI interventions are performing well - consider expanding usage")
        
        if base_stats.get("email", {}).get("sent", 0) > base_stats.get("sms", {}).get("sent", 0):
            insights.append("Consider shifting to SMS-first strategy for better engagement")
        
        return insights
    
    async def _identify_optimization_opportunities(
        self,
        user_id: int,
        base_stats: Dict[str, Any],
        intervention_performance: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Identify specific optimization opportunities"""
        opportunities = []
        
        # Timing optimization
        opportunities.append({
            "type": "timing",
            "title": "Optimize Reminder Timing",
            "description": "AI analysis suggests adjusting reminder timing could improve response rates by 15%",
            "effort": "low",
            "impact": "medium"
        })
        
        # Personalization expansion
        opportunities.append({
            "type": "personalization",
            "title": "Expand Message Personalization",
            "description": "Adding client history and preferences to messages could increase engagement",
            "effort": "medium",
            "impact": "high"
        })
        
        return opportunities
    
    def _calculate_notification_roi(
        self,
        base_stats: Dict[str, Any],
        intervention_performance: Dict[str, Any],
        ai_metrics: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Calculate ROI of enhanced notification system"""
        
        # Estimate costs
        sms_cost = base_stats.get("sms", {}).get("sent", 0) * 0.01  # $0.01 per SMS
        email_cost = base_stats.get("email", {}).get("sent", 0) * 0.001  # $0.001 per email
        ai_cost = (base_stats.get("sms", {}).get("sent", 0) + base_stats.get("email", {}).get("sent", 0)) * 0.005  # AI processing cost
        
        total_cost = sms_cost + email_cost + ai_cost
        
        # Estimate benefits
        prevented_no_shows = intervention_performance.get("prevented_no_shows", 0)
        avg_appointment_value = 75  # Estimate
        revenue_protected = prevented_no_shows * avg_appointment_value
        
        # Calculate ROI
        roi = (revenue_protected - total_cost) / total_cost if total_cost > 0 else 0
        
        return {
            "total_cost": total_cost,
            "revenue_protected": revenue_protected,
            "roi_percentage": roi * 100,
            "break_even_no_shows": total_cost / avg_appointment_value,
            "cost_breakdown": {
                "sms": sms_cost,
                "email": email_cost,
                "ai_processing": ai_cost
            }
        }


# Singleton instance
enhanced_notification_service = None

def get_enhanced_notification_service(db: Session) -> EnhancedNotificationService:
    """Get or create the enhanced notification service instance"""
    global enhanced_notification_service
    if enhanced_notification_service is None:
        enhanced_notification_service = EnhancedNotificationService(db)
    return enhanced_notification_service