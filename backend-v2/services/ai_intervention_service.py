"""
AI Intervention Service

This service manages proactive interventions for high-risk appointments using AI-generated
personalized communications and intelligent timing strategies.

Features:
- Automated intervention campaigns based on risk scores
- AI-generated personalized messages
- Multi-channel communication orchestration
- A/B testing of intervention strategies
- Success rate tracking and optimization
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
    NotificationPreferences, AIInterventionCampaign, InterventionOutcome
)
from services.ai_no_show_prediction_service import (
    AINoShowPredictionService, NoShowRiskScore, InterventionRecommendation, RiskLevel
)
from services.ai_providers.ai_provider_manager import ai_provider_manager
from services.notification_service import notification_service
from config import settings

logger = logging.getLogger(__name__)


class InterventionStatus(Enum):
    """Status of intervention campaigns"""
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    FAILED = "failed"


class InterventionType(Enum):
    """Types of interventions"""
    CONFIRMATION_REQUEST = "confirmation_request"
    PERSONALIZED_REMINDER = "personalized_reminder"
    INCENTIVE_OFFER = "incentive_offer"
    RESCHEDULE_OFFER = "reschedule_offer"
    PERSONAL_CALL = "personal_call"
    URGENT_FOLLOW_UP = "urgent_follow_up"


@dataclass
class InterventionCampaign:
    """Container for intervention campaign data"""
    id: Optional[int]
    appointment_id: int
    risk_score: float
    intervention_type: InterventionType
    status: InterventionStatus
    scheduled_time: datetime
    executed_time: Optional[datetime]
    channel: str  # "sms", "email", "call"
    message_content: str
    personalization_data: Dict[str, Any]
    ai_provider_used: Optional[str]
    expected_effectiveness: float
    actual_outcome: Optional[str]  # "confirmed", "cancelled", "no_response", "no_show"
    success_score: Optional[float]
    created_at: datetime
    updated_at: datetime


@dataclass
class CampaignResults:
    """Results of an intervention campaign"""
    campaign_id: int
    success: bool
    outcome: str
    response_time: Optional[timedelta]
    follow_up_needed: bool
    next_action: Optional[str]
    cost: float
    roi_estimate: float


class AIInterventionService:
    """
    Service for managing AI-powered proactive interventions.
    
    Orchestrates intelligent, personalized outreach campaigns to prevent no-shows
    using AI-generated content and optimal timing strategies.
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.prediction_service = AINoShowPredictionService(db)
        
        # Intervention templates mapped to AI prompts
        self.intervention_prompts = {
            InterventionType.CONFIRMATION_REQUEST: {
                "system_prompt": """You are a professional barber shop assistant creating personalized confirmation messages. 
                Create warm, friendly SMS messages that encourage clients to confirm their upcoming appointments. 
                Keep messages under 160 characters, include appointment details, and maintain a professional yet personal tone.""",
                "template": """Create a confirmation request SMS for {client_name} who has a {service_name} appointment on {appointment_date} at {appointment_time} with {barber_name}. 
                Risk factors: {risk_factors}. Make it warm and professional."""
            },
            
            InterventionType.PERSONALIZED_REMINDER: {
                "system_prompt": """You are creating personalized appointment reminders that reduce no-shows. 
                Use the client's history and preferences to create engaging, helpful reminder messages. 
                Include practical information and show genuine care for the client.""",
                "template": """Create a personalized reminder for {client_name}, a {client_tier} client with {visit_history}. 
                Appointment: {service_name} on {appointment_date} at {appointment_time}. 
                Weather: {weather_info}. Previous communication response: {response_history}."""
            },
            
            InterventionType.INCENTIVE_OFFER: {
                "system_prompt": """You are creating incentive offers to encourage appointment attendance. 
                Offer appropriate value-adds or small discounts that feel genuine and not desperate. 
                Focus on enhancing the client experience rather than just discounting.""",
                "template": """Create an incentive message for {client_name} who has a {risk_level} risk appointment on {appointment_date}. 
                Client value: ${total_spent}. Offer something that adds value while encouraging attendance."""
            },
            
            InterventionType.RESCHEDULE_OFFER: {
                "system_prompt": """You are helping clients reschedule appointments when circumstances make attendance difficult. 
                Be understanding about their situation and make rescheduling easy and attractive. 
                Maintain the relationship while solving the scheduling conflict.""",
                "template": """Create a reschedule offer for {client_name} whose {appointment_date} {appointment_time} appointment has {risk_factors}. 
                Make rescheduling feel easy and show understanding of their situation."""
            },
            
            InterventionType.URGENT_FOLLOW_UP: {
                "system_prompt": """You are creating urgent but not pushy follow-up messages for high-risk appointments. 
                Express genuine concern while providing clear next steps. 
                Be helpful and solution-oriented rather than demanding.""",
                "template": """Create an urgent follow-up for {client_name} whose appointment is in {hours_until} hours. 
                Previous message sent {last_contact_time} ago with no response. 
                Risk level: {risk_level}. Be caring but clear about the urgency."""
            }
        }
        
        # A/B testing variants
        self.message_variants = {
            "tone": ["friendly", "professional", "casual", "urgent"],
            "incentive_type": ["discount", "upgrade", "add_on", "loyalty_points"],
            "timing": ["immediate", "1_hour", "2_hours", "4_hours"],
            "channel_preference": ["sms_primary", "email_primary", "multi_channel"]
        }
    
    async def create_intervention_campaign(
        self, 
        appointment_id: int,
        force_risk_assessment: bool = False
    ) -> Optional[InterventionCampaign]:
        """
        Create an intervention campaign for a specific appointment.
        
        Args:
            appointment_id: ID of the appointment to create intervention for
            force_risk_assessment: Force risk assessment even if recently calculated
            
        Returns:
            InterventionCampaign object or None if no intervention needed
        """
        # Get or calculate risk score
        risk_score = await self.prediction_service.predict_no_show_risk(appointment_id)
        
        # Only create interventions for medium+ risk appointments
        if risk_score.risk_level == RiskLevel.LOW:
            logger.info(f"No intervention needed for low-risk appointment {appointment_id}")
            return None
        
        # Get appointment and client data
        appointment = self.db.query(Appointment).filter(
            Appointment.id == appointment_id
        ).first()
        
        if not appointment:
            logger.error(f"Appointment {appointment_id} not found")
            return None
        
        client = None
        if appointment.client_id:
            client = self.db.query(Client).filter(
                Client.id == appointment.client_id
            ).first()
        
        # Determine intervention type based on risk factors
        intervention_type = self._determine_intervention_type(risk_score, appointment)
        
        # Calculate optimal timing
        scheduled_time = self._calculate_optimal_timing(risk_score, appointment)
        
        # Generate personalized message using AI
        message_content = await self._generate_ai_message(
            intervention_type, appointment, client, risk_score
        )
        
        # Determine communication channel
        channel = self._select_optimal_channel(client, intervention_type, risk_score)
        
        # Create campaign
        campaign = InterventionCampaign(
            id=None,
            appointment_id=appointment_id,
            risk_score=risk_score.risk_score,
            intervention_type=intervention_type,
            status=InterventionStatus.SCHEDULED,
            scheduled_time=scheduled_time,
            executed_time=None,
            channel=channel,
            message_content=message_content,
            personalization_data=await self._get_personalization_data(appointment, client, risk_score),
            ai_provider_used=None,  # Will be set during execution
            expected_effectiveness=self._estimate_effectiveness(intervention_type, risk_score, client),
            actual_outcome=None,
            success_score=None,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        # Store in database
        campaign_id = await self._store_campaign(campaign)
        campaign.id = campaign_id
        
        logger.info(f"Created intervention campaign {campaign_id} for appointment {appointment_id}")
        return campaign
    
    async def execute_scheduled_campaigns(self, limit: int = 50) -> List[CampaignResults]:
        """
        Execute all scheduled intervention campaigns that are due.
        
        Args:
            limit: Maximum number of campaigns to execute in this batch
            
        Returns:
            List of campaign execution results
        """
        # Get campaigns due for execution
        due_campaigns = await self._get_due_campaigns(limit)
        
        if not due_campaigns:
            logger.info("No intervention campaigns due for execution")
            return []
        
        results = []
        
        for campaign in due_campaigns:
            try:
                result = await self._execute_campaign(campaign)
                results.append(result)
                
                # Update campaign status
                await self._update_campaign_status(
                    campaign.id, 
                    InterventionStatus.COMPLETED if result.success else InterventionStatus.FAILED
                )
                
            except Exception as e:
                logger.error(f"Error executing campaign {campaign.id}: {e}")
                await self._update_campaign_status(campaign.id, InterventionStatus.FAILED)
                continue
        
        logger.info(f"Executed {len(results)} intervention campaigns")
        return results
    
    async def track_intervention_outcome(
        self, 
        campaign_id: int, 
        outcome: str, 
        response_data: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        Track the outcome of an intervention campaign.
        
        Args:
            campaign_id: ID of the campaign
            outcome: Outcome type ("confirmed", "cancelled", "no_response", "no_show", etc.)
            response_data: Additional data about the response
            
        Returns:
            True if tracking was successful
        """
        try:
            # Update campaign with outcome
            campaign = await self._get_campaign_by_id(campaign_id)
            if not campaign:
                logger.error(f"Campaign {campaign_id} not found")
                return False
            
            # Calculate success score
            success_score = self._calculate_success_score(campaign.intervention_type, outcome)
            
            # Update campaign
            campaign.actual_outcome = outcome
            campaign.success_score = success_score
            campaign.updated_at = datetime.utcnow()
            
            await self._update_campaign(campaign)
            
            # Update machine learning model with results
            await self._update_effectiveness_model(campaign, outcome, response_data)
            
            logger.info(f"Tracked outcome '{outcome}' for campaign {campaign_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error tracking intervention outcome: {e}")
            return False
    
    async def get_campaign_performance(
        self, 
        user_id: Optional[int] = None,
        days_back: int = 30
    ) -> Dict[str, Any]:
        """
        Get performance analytics for intervention campaigns.
        
        Args:
            user_id: Optional user ID to filter by
            days_back: Number of days to look back
            
        Returns:
            Performance analytics dictionary
        """
        start_date = datetime.utcnow() - timedelta(days=days_back)
        
        # Get campaigns in the period
        campaigns = await self._get_campaigns_in_period(user_id, start_date)
        
        if not campaigns:
            return {"message": "No campaigns found in the specified period"}
        
        # Calculate overall metrics
        total_campaigns = len(campaigns)
        successful_campaigns = len([c for c in campaigns if c.actual_outcome in ["confirmed", "rescheduled"]])
        prevented_no_shows = len([c for c in campaigns if c.actual_outcome == "confirmed"])
        
        # Performance by intervention type
        type_performance = {}
        for intervention_type in InterventionType:
            type_campaigns = [c for c in campaigns if c.intervention_type == intervention_type]
            if type_campaigns:
                type_success = len([c for c in type_campaigns if c.actual_outcome in ["confirmed", "rescheduled"]])
                type_performance[intervention_type.value] = {
                    "total": len(type_campaigns),
                    "successful": type_success,
                    "success_rate": type_success / len(type_campaigns),
                    "avg_effectiveness": sum(c.expected_effectiveness for c in type_campaigns) / len(type_campaigns)
                }
        
        # ROI calculation
        total_cost = sum(c.cost if hasattr(c, 'cost') else 0.01 for c in campaigns)  # Estimate SMS cost
        revenue_protected = prevented_no_shows * 75  # Estimate average appointment value
        roi = (revenue_protected - total_cost) / total_cost if total_cost > 0 else 0
        
        return {
            "period_days": days_back,
            "total_campaigns": total_campaigns,
            "successful_campaigns": successful_campaigns,
            "success_rate": successful_campaigns / total_campaigns if total_campaigns > 0 else 0,
            "prevented_no_shows": prevented_no_shows,
            "estimated_revenue_protected": revenue_protected,
            "estimated_roi": roi,
            "performance_by_type": type_performance,
            "avg_response_time_minutes": self._calculate_avg_response_time(campaigns),
            "channel_effectiveness": self._calculate_channel_effectiveness(campaigns)
        }
    
    async def optimize_intervention_strategy(self, user_id: int) -> Dict[str, Any]:
        """
        Analyze historical performance and optimize intervention strategies.
        
        Args:
            user_id: User ID to optimize for
            
        Returns:
            Optimization recommendations
        """
        # Get historical performance data
        performance_data = await self.get_campaign_performance(user_id, days_back=90)
        
        # Analyze patterns and generate recommendations
        recommendations = []
        
        # Timing optimization
        if "performance_by_type" in performance_data:
            best_type = max(
                performance_data["performance_by_type"].items(),
                key=lambda x: x[1]["success_rate"]
            )
            recommendations.append(f"Focus on {best_type[0]} interventions (success rate: {best_type[1]['success_rate']:.1%})")
        
        # Channel optimization
        if "channel_effectiveness" in performance_data:
            best_channel = max(
                performance_data["channel_effectiveness"].items(),
                key=lambda x: x[1]
            )
            recommendations.append(f"Prioritize {best_channel[0]} channel (effectiveness: {best_channel[1]:.1%})")
        
        # Risk threshold optimization
        if performance_data["success_rate"] < 0.6:
            recommendations.append("Consider lowering risk threshold to catch more at-risk appointments")
        elif performance_data["success_rate"] > 0.9:
            recommendations.append("Consider raising risk threshold to reduce intervention volume")
        
        return {
            "current_performance": performance_data,
            "optimization_recommendations": recommendations,
            "suggested_a_b_tests": self._suggest_ab_tests(performance_data),
            "updated_at": datetime.utcnow().isoformat()
        }
    
    # Private helper methods
    
    def _determine_intervention_type(
        self, 
        risk_score: NoShowRiskScore, 
        appointment: Appointment
    ) -> InterventionType:
        """Determine the most appropriate intervention type"""
        hours_until = (appointment.start_time - datetime.utcnow()).total_seconds() / 3600
        
        if risk_score.risk_level == RiskLevel.CRITICAL:
            if hours_until < 4:
                return InterventionType.URGENT_FOLLOW_UP
            else:
                return InterventionType.CONFIRMATION_REQUEST
        
        elif risk_score.risk_level == RiskLevel.HIGH:
            if "weather" in risk_score.factors and risk_score.factors["weather_factor"] > 0.7:
                return InterventionType.RESCHEDULE_OFFER
            elif hours_until < 12:
                return InterventionType.PERSONALIZED_REMINDER
            else:
                return InterventionType.INCENTIVE_OFFER
        
        else:  # MEDIUM risk
            return InterventionType.PERSONALIZED_REMINDER
    
    def _calculate_optimal_timing(
        self, 
        risk_score: NoShowRiskScore, 
        appointment: Appointment
    ) -> datetime:
        """Calculate optimal timing for intervention"""
        hours_until = (appointment.start_time - datetime.utcnow()).total_seconds() / 3600
        
        # Critical risk: immediate to 30 minutes
        if risk_score.risk_level == RiskLevel.CRITICAL:
            delay_minutes = min(30, max(5, hours_until * 10))
        
        # High risk: 1-4 hours
        elif risk_score.risk_level == RiskLevel.HIGH:
            delay_minutes = min(240, max(60, hours_until * 0.2 * 60))
        
        # Medium risk: 2-8 hours
        else:
            delay_minutes = min(480, max(120, hours_until * 0.1 * 60))
        
        return datetime.utcnow() + timedelta(minutes=delay_minutes)
    
    async def _generate_ai_message(
        self,
        intervention_type: InterventionType,
        appointment: Appointment,
        client: Optional[Client],
        risk_score: NoShowRiskScore
    ) -> str:
        """Generate personalized message using AI"""
        try:
            # Get prompt template
            prompt_data = self.intervention_prompts[intervention_type]
            
            # Prepare context data
            context = await self._get_personalization_data(appointment, client, risk_score)
            
            # Format the prompt
            user_prompt = prompt_data["template"].format(**context)
            
            # Generate message using AI
            messages = [
                {"role": "system", "content": prompt_data["system_prompt"]},
                {"role": "user", "content": user_prompt}
            ]
            
            # Select provider based on task type
            provider = ai_provider_manager.select_provider_by_task("no_show_prevention")
            
            response = await ai_provider_manager.generate_response(
                messages=messages,
                provider=provider,
                temperature=0.7,
                max_tokens=160  # SMS length limit
            )
            
            return response["content"].strip()
            
        except Exception as e:
            logger.error(f"Error generating AI message: {e}")
            # Fallback to template-based message
            return self._generate_fallback_message(intervention_type, appointment, client)
    
    def _generate_fallback_message(
        self,
        intervention_type: InterventionType,
        appointment: Appointment,
        client: Optional[Client]
    ) -> str:
        """Generate fallback message when AI generation fails"""
        client_name = f"{client.first_name} {client.last_name}" if client else "Guest"
        time_str = appointment.start_time.strftime("%I:%M %p")
        date_str = appointment.start_time.strftime("%B %d")
        
        fallback_templates = {
            InterventionType.CONFIRMATION_REQUEST: f"Hi {client_name}! Just confirming your {appointment.service_name} appointment tomorrow at {time_str}. Reply CONFIRM to confirm. Thanks!",
            InterventionType.PERSONALIZED_REMINDER: f"Hi {client_name}! Reminder: {appointment.service_name} appointment on {date_str} at {time_str}. We're excited to see you!",
            InterventionType.INCENTIVE_OFFER: f"Hi {client_name}! Looking forward to your appointment {date_str} at {time_str}. Complimentary style consultation included!",
            InterventionType.RESCHEDULE_OFFER: f"Hi {client_name}! Weather looks challenging for {date_str}. Would you like to reschedule? Call us to find a better time!",
            InterventionType.URGENT_FOLLOW_UP: f"Hi {client_name}! Your appointment is coming up soon ({time_str}). Please confirm or call us at {getattr(settings, 'business_phone', 'us')}!"
        }
        
        return fallback_templates.get(intervention_type, f"Hi {client_name}! Reminder about your appointment on {date_str} at {time_str}.")
    
    def _select_optimal_channel(
        self,
        client: Optional[Client],
        intervention_type: InterventionType,
        risk_score: NoShowRiskScore
    ) -> str:
        """Select the best communication channel"""
        if not client:
            return "sms"  # Default for new clients
        
        # Check client communication preferences
        if hasattr(client, 'communication_preferences'):
            prefs = client.communication_preferences or {}
            if prefs.get("sms_enabled", True):
                return "sms"
            elif prefs.get("email_enabled", True):
                return "email"
        
        # For urgent interventions, prefer SMS
        if intervention_type in [InterventionType.URGENT_FOLLOW_UP, InterventionType.CONFIRMATION_REQUEST]:
            return "sms"
        
        # For detailed offers, prefer email
        if intervention_type in [InterventionType.INCENTIVE_OFFER, InterventionType.RESCHEDULE_OFFER]:
            return "email"
        
        return "sms"  # Default
    
    def _estimate_effectiveness(
        self,
        intervention_type: InterventionType,
        risk_score: NoShowRiskScore,
        client: Optional[Client]
    ) -> float:
        """Estimate the effectiveness of an intervention"""
        base_effectiveness = {
            InterventionType.CONFIRMATION_REQUEST: 0.6,
            InterventionType.PERSONALIZED_REMINDER: 0.5,
            InterventionType.INCENTIVE_OFFER: 0.7,
            InterventionType.RESCHEDULE_OFFER: 0.8,
            InterventionType.PERSONAL_CALL: 0.9,
            InterventionType.URGENT_FOLLOW_UP: 0.4
        }
        
        effectiveness = base_effectiveness.get(intervention_type, 0.5)
        
        # Adjust based on client history
        if client and client.total_visits > 5:
            effectiveness += 0.1  # Loyal clients more responsive
        
        # Adjust based on risk level
        if risk_score.risk_level == RiskLevel.CRITICAL:
            effectiveness -= 0.1  # Harder to recover critical situations
        
        return min(1.0, max(0.1, effectiveness))
    
    async def _get_personalization_data(
        self,
        appointment: Appointment,
        client: Optional[Client],
        risk_score: NoShowRiskScore
    ) -> Dict[str, Any]:
        """Get comprehensive personalization data for AI message generation"""
        hours_until = (appointment.start_time - datetime.utcnow()).total_seconds() / 3600
        
        return {
            "client_name": f"{client.first_name} {client.last_name}" if client else "Guest",
            "first_name": client.first_name if client else "Guest",
            "service_name": appointment.service_name,
            "appointment_date": appointment.start_time.strftime("%B %d"),
            "appointment_time": appointment.start_time.strftime("%I:%M %p"),
            "barber_name": appointment.barber.name if appointment.barber else "your barber",
            "business_name": getattr(settings, 'business_name', 'BookedBarber'),
            "business_phone": getattr(settings, 'business_phone', '(555) 123-4567'),
            "hours_until": int(hours_until),
            "risk_level": risk_score.risk_level.value,
            "risk_factors": ", ".join(risk_score.recommendations[:2]),  # Top 2 factors
            "client_tier": "VIP" if client and client.total_spent > 500 else "valued",
            "visit_history": f"{client.total_visits} previous visits" if client else "first visit",
            "total_spent": client.total_spent if client else 0,
            "is_new_client": not client or client.total_visits == 0,
            "last_contact_time": "2 hours",  # Would be calculated from actual data
            "response_history": "responsive" if client and client.total_visits > 3 else "new",
            "weather_info": "clear skies"  # Would integrate with weather API
        }
    
    async def _store_campaign(self, campaign: InterventionCampaign) -> int:
        """Store campaign in database and return ID"""
        # This would store in the AIInterventionCampaign model
        # For now, return a mock ID
        return 1
    
    async def _get_due_campaigns(self, limit: int) -> List[InterventionCampaign]:
        """Get campaigns due for execution"""
        # This would query the database for due campaigns
        # For now, return empty list
        return []
    
    async def _execute_campaign(self, campaign: InterventionCampaign) -> CampaignResults:
        """Execute a single intervention campaign"""
        try:
            # Get appointment for context
            appointment = self.db.query(Appointment).filter(
                Appointment.id == campaign.appointment_id
            ).first()
            
            if not appointment:
                raise ValueError(f"Appointment {campaign.appointment_id} not found")
            
            # Send the message via appropriate channel
            if campaign.channel == "sms":
                # Use existing notification service
                context = campaign.personalization_data
                
                # Queue SMS notification
                notifications = notification_service.queue_notification(
                    db=self.db,
                    user=appointment.user,
                    template_name="ai_intervention_sms",
                    context=context,
                    scheduled_for=datetime.utcnow(),
                    appointment_id=appointment.id
                )
                
                success = len(notifications) > 0
                
            elif campaign.channel == "email":
                # Similar logic for email
                success = True  # Placeholder
            
            else:
                success = False
            
            return CampaignResults(
                campaign_id=campaign.id,
                success=success,
                outcome="sent" if success else "failed",
                response_time=None,
                follow_up_needed=campaign.intervention_type == InterventionType.URGENT_FOLLOW_UP,
                next_action="track_response" if success else "retry",
                cost=0.01,  # Estimated SMS cost
                roi_estimate=75.0 if success else 0.0  # Estimated appointment value
            )
            
        except Exception as e:
            logger.error(f"Error executing campaign {campaign.id}: {e}")
            return CampaignResults(
                campaign_id=campaign.id,
                success=False,
                outcome="error",
                response_time=None,
                follow_up_needed=True,
                next_action="manual_review",
                cost=0.0,
                roi_estimate=0.0
            )
    
    async def _update_campaign_status(self, campaign_id: int, status: InterventionStatus):
        """Update campaign status in database"""
        # This would update the database record
        pass
    
    async def _get_campaign_by_id(self, campaign_id: int) -> Optional[InterventionCampaign]:
        """Get campaign by ID"""
        # This would query the database
        return None
    
    async def _update_campaign(self, campaign: InterventionCampaign):
        """Update campaign in database"""
        # This would update the database record
        pass
    
    async def _update_effectiveness_model(
        self,
        campaign: InterventionCampaign,
        outcome: str,
        response_data: Optional[Dict[str, Any]]
    ):
        """Update machine learning model with campaign results"""
        # This would feed results back to the ML model
        pass
    
    async def _get_campaigns_in_period(
        self,
        user_id: Optional[int],
        start_date: datetime
    ) -> List[InterventionCampaign]:
        """Get campaigns in a specific time period"""
        # This would query the database
        return []
    
    def _calculate_success_score(self, intervention_type: InterventionType, outcome: str) -> float:
        """Calculate success score based on outcome"""
        success_mapping = {
            "confirmed": 1.0,
            "rescheduled": 0.8,
            "cancelled": 0.3,
            "no_response": 0.0,
            "no_show": 0.0
        }
        return success_mapping.get(outcome, 0.0)
    
    def _calculate_avg_response_time(self, campaigns: List[InterventionCampaign]) -> float:
        """Calculate average response time for campaigns"""
        # This would calculate from actual response data
        return 45.0  # minutes
    
    def _calculate_channel_effectiveness(self, campaigns: List[InterventionCampaign]) -> Dict[str, float]:
        """Calculate effectiveness by communication channel"""
        # This would analyze actual campaign data
        return {
            "sms": 0.65,
            "email": 0.45,
            "call": 0.85
        }
    
    def _suggest_ab_tests(self, performance_data: Dict[str, Any]) -> List[str]:
        """Suggest A/B tests based on performance data"""
        suggestions = []
        
        if performance_data.get("success_rate", 0) < 0.7:
            suggestions.append("Test different message tones (friendly vs. professional)")
            suggestions.append("Test incentive offers vs. no incentives")
            suggestions.append("Test different timing strategies")
        
        return suggestions


# Singleton instance
ai_intervention_service = None

def get_ai_intervention_service(db: Session) -> AIInterventionService:
    """Get or create the AI intervention service instance"""
    global ai_intervention_service
    if ai_intervention_service is None:
        ai_intervention_service = AIInterventionService(db)
    return ai_intervention_service