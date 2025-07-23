"""
Multi-Stage Confirmation Service with Escalation

This service implements a sophisticated confirmation system that:
- Uses multiple confirmation stages with increasing urgency
- Automatically escalates based on response patterns and risk factors
- Adapts timing and messaging based on client behavior
- Provides intelligent fallback strategies
- Tracks confirmation success rates and optimizes approaches

Features:
- Configurable confirmation stages (initial → reminder → urgent → escalation)
- AI-powered message personalization at each stage
- Dynamic timing adjustment based on client response patterns
- Automatic escalation to human intervention when needed
- Integration with existing notification and SMS systems
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
    User, Appointment, Client, NotificationQueue, ConfirmationCampaign,
    ConfirmationStage, ConfirmationOutcome
)
from services.ai_no_show_prediction_service import (
    AINoShowPredictionService, RiskLevel, get_ai_no_show_prediction_service
)
from services.ai_message_generator import (
    AIMessageGenerator, MessageType, MessageChannel, MessageContext, get_ai_message_generator
)
from services.enhanced_notification_service import get_enhanced_notification_service
from services.enhanced_sms_response_handler import get_enhanced_sms_handler
from config import settings

logger = logging.getLogger(__name__)


class ConfirmationStage(Enum):
    """Stages in the multi-stage confirmation process"""
    INITIAL_CONFIRMATION = "initial_confirmation"      # First confirmation request
    FRIENDLY_REMINDER = "friendly_reminder"           # Gentle follow-up
    URGENT_CONFIRMATION = "urgent_confirmation"       # Urgent request with incentive
    FINAL_OPPORTUNITY = "final_opportunity"           # Last chance with personal touch
    HUMAN_ESCALATION = "human_escalation"             # Hand-off to human staff
    COMPLETED = "completed"                           # Successfully confirmed
    FAILED = "failed"                                 # All stages failed


class EscalationTrigger(Enum):
    """Triggers that cause escalation to next stage"""
    NO_RESPONSE_TIMEOUT = "no_response_timeout"
    NEGATIVE_RESPONSE = "negative_response"
    UNCLEAR_RESPONSE = "unclear_response"
    HIGH_RISK_SCORE = "high_risk_score"
    CLIENT_HISTORY = "client_history"
    BUSINESS_PRIORITY = "business_priority"
    MANUAL_OVERRIDE = "manual_override"


class ConfirmationOutcome(Enum):
    """Possible outcomes of confirmation campaigns"""
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"
    RESCHEDULED = "rescheduled"
    NO_RESPONSE = "no_response"
    UNCLEAR_RESPONSE = "unclear_response"
    ESCALATED = "escalated"
    FAILED = "failed"


@dataclass
class ConfirmationConfig:
    """Configuration for multi-stage confirmation"""
    enabled: bool = True
    max_stages: int = 4
    stage_intervals_hours: List[int] = None  # [6, 12, 24, 48] - hours between stages
    enable_ai_personalization: bool = True
    enable_risk_adaptation: bool = True
    enable_client_learning: bool = True
    escalation_thresholds: Dict[str, float] = None
    business_hours_only: bool = False
    weekend_adjustment: bool = True
    
    def __post_init__(self):
        if self.stage_intervals_hours is None:
            self.stage_intervals_hours = [6, 12, 24, 48]
        if self.escalation_thresholds is None:
            self.escalation_thresholds = {
                "no_response_hours": 8,
                "risk_score_threshold": 0.7,
                "negative_sentiment_threshold": 0.8
            }


@dataclass
class ConfirmationCampaign:
    """Container for multi-stage confirmation campaign data"""
    id: Optional[int]
    appointment_id: int
    client_id: Optional[int]
    current_stage: ConfirmationStage
    stages_completed: List[ConfirmationStage]
    next_stage_scheduled: Optional[datetime]
    total_messages_sent: int
    last_response_received: Optional[datetime]
    last_response_content: Optional[str]
    escalation_triggers: List[EscalationTrigger]
    success_probability: float
    config: ConfirmationConfig
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime]
    final_outcome: Optional[ConfirmationOutcome]


@dataclass
class StageExecutionResult:
    """Result of executing a confirmation stage"""
    stage: ConfirmationStage
    success: bool
    message_sent: str
    channel_used: str
    escalation_needed: bool
    next_stage: Optional[ConfirmationStage]
    next_stage_timing: Optional[datetime]
    client_response: Optional[str]
    ai_insights: Dict[str, Any]
    estimated_success_rate: float


class MultiStageConfirmationService:
    """
    Service for managing multi-stage confirmation campaigns.
    
    Orchestrates intelligent confirmation sequences that adapt to client behavior,
    risk factors, and response patterns to maximize confirmation rates.
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.prediction_service = get_ai_no_show_prediction_service(db)
        self.message_generator = get_ai_message_generator(db)
        self.notification_service = get_enhanced_notification_service(db)
        self.sms_handler = get_enhanced_sms_handler(db)
        
        # Default configuration
        self.default_config = ConfirmationConfig()
        
        # Stage-specific message strategies
        self.stage_strategies = {
            ConfirmationStage.INITIAL_CONFIRMATION: {
                "tone": "friendly",
                "urgency": "low",
                "personalization": "standard",
                "incentive": False,
                "call_to_action": "soft"
            },
            ConfirmationStage.FRIENDLY_REMINDER: {
                "tone": "warm",
                "urgency": "medium",
                "personalization": "full",
                "incentive": False,
                "call_to_action": "clear"
            },
            ConfirmationStage.URGENT_CONFIRMATION: {
                "tone": "professional",
                "urgency": "high",
                "personalization": "full",
                "incentive": True,
                "call_to_action": "direct"
            },
            ConfirmationStage.FINAL_OPPORTUNITY: {
                "tone": "caring",
                "urgency": "high",
                "personalization": "full",
                "incentive": True,
                "call_to_action": "personal"
            }
        }
        
        # Active campaigns storage (in production, this would be database)
        self.active_campaigns = {}
    
    async def create_confirmation_campaign(
        self,
        appointment_id: int,
        config: Optional[ConfirmationConfig] = None
    ) -> ConfirmationCampaign:
        """
        Create a new multi-stage confirmation campaign for an appointment.
        
        Args:
            appointment_id: ID of the appointment to confirm
            config: Optional configuration override
            
        Returns:
            Created ConfirmationCampaign object
        """
        config = config or self.default_config
        
        # Get appointment and related data
        appointment = self.db.query(Appointment).filter(
            Appointment.id == appointment_id
        ).first()
        
        if not appointment:
            raise ValueError(f"Appointment {appointment_id} not found")
        
        # Get client information
        client = None
        if appointment.client_id:
            client = self.db.query(Client).filter(
                Client.id == appointment.client_id
            ).first()
        
        # Assess risk and determine initial strategy
        risk_score = None
        if config.enable_risk_adaptation:
            risk_score = await self.prediction_service.predict_no_show_risk(appointment_id)
        
        # Calculate initial success probability
        success_probability = await self._calculate_initial_success_probability(
            appointment, client, risk_score
        )
        
        # Determine optimal start timing
        start_timing = await self._calculate_optimal_start_timing(
            appointment, risk_score, config
        )
        
        # Create campaign
        campaign = ConfirmationCampaign(
            id=None,
            appointment_id=appointment_id,
            client_id=client.id if client else None,
            current_stage=ConfirmationStage.INITIAL_CONFIRMATION,
            stages_completed=[],
            next_stage_scheduled=start_timing,
            total_messages_sent=0,
            last_response_received=None,
            last_response_content=None,
            escalation_triggers=[],
            success_probability=success_probability,
            config=config,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            completed_at=None,
            final_outcome=None
        )
        
        # Store campaign
        campaign_id = await self._store_campaign(campaign)
        campaign.id = campaign_id
        
        # Schedule first stage
        await self._schedule_stage_execution(campaign, ConfirmationStage.INITIAL_CONFIRMATION)
        
        logger.info(f"Created confirmation campaign {campaign_id} for appointment {appointment_id}")
        return campaign
    
    async def execute_scheduled_campaigns(self, limit: int = 50) -> List[StageExecutionResult]:
        """
        Execute all scheduled confirmation stages that are due.
        
        Args:
            limit: Maximum number of stages to execute in this batch
            
        Returns:
            List of stage execution results
        """
        # Get campaigns with stages due for execution
        due_campaigns = await self._get_due_campaigns(limit)
        
        if not due_campaigns:
            logger.info("No confirmation campaigns due for execution")
            return []
        
        results = []
        
        for campaign in due_campaigns:
            try:
                # Execute the current stage
                result = await self._execute_campaign_stage(campaign)
                results.append(result)
                
                # Update campaign based on result
                await self._update_campaign_after_execution(campaign, result)
                
                # Schedule next stage if needed
                if result.next_stage and not result.escalation_needed:
                    await self._schedule_stage_execution(campaign, result.next_stage)
                
                # Handle escalation if needed
                if result.escalation_needed:
                    await self._handle_escalation(campaign, result)
                
            except Exception as e:
                logger.error(f"Error executing campaign {campaign.id}: {e}")
                continue
        
        logger.info(f"Executed {len(results)} confirmation campaign stages")
        return results
    
    async def process_client_response(
        self,
        phone_number: str,
        message_content: str,
        campaign_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Process a client response to a confirmation message.
        
        Args:
            phone_number: Client's phone number
            message_content: Content of the response message
            campaign_id: Optional campaign ID if known
            
        Returns:
            Processing results and next actions
        """
        try:
            # Find active campaign for this phone number
            campaign = await self._find_active_campaign_by_phone(phone_number, campaign_id)
            
            if not campaign:
                logger.warning(f"No active confirmation campaign found for {phone_number}")
                return {"success": False, "reason": "no_active_campaign"}
            
            # Analyze the response using enhanced SMS handler
            analysis_result = await self.sms_handler.process_enhanced_sms(
                phone_number, message_content, f"confirmation_{campaign.id}"
            )
            
            # Update campaign with response
            campaign.last_response_received = datetime.utcnow()
            campaign.last_response_content = message_content
            campaign.updated_at = datetime.utcnow()
            
            # Determine outcome based on analysis
            outcome = await self._determine_outcome_from_response(
                analysis_result, campaign
            )
            
            # Complete campaign if outcome is final
            if outcome in [ConfirmationOutcome.CONFIRMED, ConfirmationOutcome.CANCELLED, ConfirmationOutcome.RESCHEDULED]:
                campaign.final_outcome = outcome
                campaign.completed_at = datetime.utcnow()
                campaign.current_stage = ConfirmationStage.COMPLETED
                
                # Cancel any scheduled future stages
                await self._cancel_scheduled_stages(campaign)
                
                # Track success for learning
                await self._track_campaign_success(campaign, outcome)
            
            # Generate appropriate follow-up if needed
            follow_up_needed = await self._determine_follow_up_needs(
                outcome, analysis_result, campaign
            )
            
            await self._update_campaign(campaign)
            
            return {
                "success": True,
                "campaign_id": campaign.id,
                "outcome": outcome.value if outcome else "processing",
                "analysis": analysis_result.get("analysis", {}),
                "follow_up_needed": follow_up_needed,
                "campaign_completed": campaign.final_outcome is not None,
                "next_action": self._determine_next_action(outcome, follow_up_needed)
            }
            
        except Exception as e:
            logger.error(f"Error processing client response: {e}")
            return {
                "success": False,
                "error": str(e),
                "fallback_action": "escalate_to_human"
            }
    
    async def get_campaign_performance_analytics(
        self,
        user_id: int,
        days_back: int = 30
    ) -> Dict[str, Any]:
        """
        Get performance analytics for confirmation campaigns.
        
        Args:
            user_id: Business owner user ID
            days_back: Number of days to analyze
            
        Returns:
            Comprehensive campaign performance analytics
        """
        start_date = datetime.utcnow() - timedelta(days=days_back)
        
        # Get campaign data for the period
        campaigns = await self._get_campaigns_in_period(user_id, start_date)
        
        if not campaigns:
            return {"message": "No confirmation campaigns found in the specified period"}
        
        # Calculate overall metrics
        total_campaigns = len(campaigns)
        successful_campaigns = len([c for c in campaigns if c.final_outcome == ConfirmationOutcome.CONFIRMED])
        completion_rate = successful_campaigns / total_campaigns if total_campaigns > 0 else 0
        
        # Performance by stage
        stage_performance = {}
        for stage in ConfirmationStage:
            stage_campaigns = [c for c in campaigns if stage in c.stages_completed]
            if stage_campaigns:
                stage_success = len([c for c in stage_campaigns if c.final_outcome == ConfirmationOutcome.CONFIRMED])
                stage_performance[stage.value] = {
                    "campaigns": len(stage_campaigns),
                    "success_rate": stage_success / len(stage_campaigns),
                    "avg_messages_sent": sum(c.total_messages_sent for c in stage_campaigns) / len(stage_campaigns)
                }
        
        # Timing analysis
        timing_analysis = await self._analyze_optimal_timing(campaigns)
        
        # Risk factor correlation
        risk_correlation = await self._analyze_risk_factor_correlation(campaigns)
        
        # Client behavior patterns
        behavior_patterns = await self._analyze_client_behavior_patterns(campaigns)
        
        return {
            "period_days": days_back,
            "total_campaigns": total_campaigns,
            "successful_campaigns": successful_campaigns,
            "completion_rate": completion_rate,
            "average_stages_per_campaign": sum(len(c.stages_completed) for c in campaigns) / total_campaigns,
            "average_messages_per_campaign": sum(c.total_messages_sent for c in campaigns) / total_campaigns,
            "stage_performance": stage_performance,
            "timing_analysis": timing_analysis,
            "risk_correlation": risk_correlation,
            "behavior_patterns": behavior_patterns,
            "optimization_recommendations": await self._generate_optimization_recommendations(
                stage_performance, timing_analysis, risk_correlation
            ),
            "roi_analysis": self._calculate_campaign_roi(campaigns),
            "generated_at": datetime.utcnow().isoformat()
        }
    
    async def optimize_campaign_strategy(
        self,
        user_id: int,
        optimization_goals: List[str] = None
    ) -> Dict[str, Any]:
        """
        Optimize confirmation campaign strategies based on historical performance.
        
        Args:
            user_id: Business owner user ID
            optimization_goals: List of goals ("completion_rate", "efficiency", "client_satisfaction")
            
        Returns:
            Optimization results and updated strategies
        """
        optimization_goals = optimization_goals or ["completion_rate", "efficiency"]
        
        # Get historical performance data
        performance_data = await self.get_campaign_performance_analytics(user_id, days_back=90)
        
        # Generate optimizations based on goals
        optimizations = {}
        
        if "completion_rate" in optimization_goals:
            optimizations["completion_rate"] = await self._optimize_for_completion_rate(performance_data)
        
        if "efficiency" in optimization_goals:
            optimizations["efficiency"] = await self._optimize_for_efficiency(performance_data)
        
        if "client_satisfaction" in optimization_goals:
            optimizations["client_satisfaction"] = await self._optimize_for_satisfaction(performance_data)
        
        # Apply optimizations to default config
        updated_config = await self._apply_optimizations_to_config(
            self.default_config, optimizations
        )
        
        return {
            "optimization_goals": optimization_goals,
            "current_performance": performance_data,
            "optimizations_identified": optimizations,
            "updated_configuration": {
                "stage_intervals_hours": updated_config.stage_intervals_hours,
                "escalation_thresholds": updated_config.escalation_thresholds,
                "max_stages": updated_config.max_stages
            },
            "expected_improvements": await self._estimate_improvement_impact(optimizations),
            "implementation_recommendations": await self._generate_implementation_recommendations(optimizations),
            "updated_at": datetime.utcnow().isoformat()
        }
    
    # Private helper methods
    
    async def _calculate_initial_success_probability(
        self,
        appointment: Appointment,
        client: Optional[Client],
        risk_score: Optional[Any]
    ) -> float:
        """Calculate initial success probability for the campaign"""
        
        base_probability = 0.7  # Base 70% success rate
        
        # Adjust based on risk score
        if risk_score:
            if risk_score.risk_level == RiskLevel.LOW:
                base_probability += 0.2
            elif risk_score.risk_level == RiskLevel.HIGH:
                base_probability -= 0.15
            elif risk_score.risk_level == RiskLevel.CRITICAL:
                base_probability -= 0.3
        
        # Adjust based on client history
        if client:
            if client.total_visits > 10:
                base_probability += 0.1  # Loyal clients more likely to confirm
            elif client.total_visits == 0:
                base_probability -= 0.1  # New clients less predictable
        
        # Adjust based on appointment timing
        advance_days = (appointment.start_time - appointment.created_at).days
        if advance_days == 0:
            base_probability -= 0.15  # Same-day bookings riskier
        elif advance_days > 14:
            base_probability -= 0.05  # Far advance bookings slightly riskier
        
        return max(0.1, min(1.0, base_probability))
    
    async def _calculate_optimal_start_timing(
        self,
        appointment: Appointment,
        risk_score: Optional[Any],
        config: ConfirmationConfig
    ) -> datetime:
        """Calculate optimal timing to start confirmation campaign"""
        
        hours_before_appointment = 48  # Default start 48 hours before
        
        # Adjust based on risk
        if risk_score:
            if risk_score.risk_level == RiskLevel.CRITICAL:
                hours_before_appointment = 72  # Start earlier for high risk
            elif risk_score.risk_level == RiskLevel.LOW:
                hours_before_appointment = 24  # Start later for low risk
        
        # Adjust for business hours if configured
        start_time = appointment.start_time - timedelta(hours=hours_before_appointment)
        
        if config.business_hours_only:
            # Adjust to business hours (9 AM - 6 PM)
            if start_time.hour < 9:
                start_time = start_time.replace(hour=9, minute=0, second=0)
            elif start_time.hour >= 18:
                start_time = start_time.replace(hour=9, minute=0, second=0) + timedelta(days=1)
        
        return max(datetime.utcnow() + timedelta(minutes=30), start_time)
    
    async def _execute_campaign_stage(self, campaign: ConfirmationCampaign) -> StageExecutionResult:
        """Execute a specific stage of the confirmation campaign"""
        
        try:
            # Get appointment and client data
            appointment = self.db.query(Appointment).filter(
                Appointment.id == campaign.appointment_id
            ).first()
            
            client = None
            if campaign.client_id:
                client = self.db.query(Client).filter(
                    Client.id == campaign.client_id
                ).first()
            
            # Get stage strategy
            strategy = self.stage_strategies.get(campaign.current_stage, {})
            
            # Generate personalized message for this stage
            message = await self._generate_stage_message(
                campaign.current_stage, appointment, client, campaign, strategy
            )
            
            # Determine optimal channel
            channel = await self._select_optimal_channel(client, campaign.current_stage)
            
            # Send message
            send_result = await self._send_stage_message(
                message, channel, appointment, client
            )
            
            # Update campaign tracking
            campaign.total_messages_sent += 1
            campaign.stages_completed.append(campaign.current_stage)
            campaign.updated_at = datetime.utcnow()
            
            # Determine next stage and timing
            next_stage, next_timing = await self._determine_next_stage(campaign, send_result)
            
            # Calculate success rate estimation
            estimated_success = await self._estimate_stage_success_rate(
                campaign, send_result, strategy
            )
            
            return StageExecutionResult(
                stage=campaign.current_stage,
                success=send_result.get("success", False),
                message_sent=message,
                channel_used=channel,
                escalation_needed=await self._check_stage_escalation_needs(campaign),
                next_stage=next_stage,
                next_stage_timing=next_timing,
                client_response=None,  # Will be updated when response received
                ai_insights={
                    "personalization_score": 0.8,  # Would be calculated
                    "sentiment_target": strategy.get("tone", "friendly"),
                    "urgency_level": strategy.get("urgency", "medium")
                },
                estimated_success_rate=estimated_success
            )
            
        except Exception as e:
            logger.error(f"Error executing campaign stage: {e}")
            
            return StageExecutionResult(
                stage=campaign.current_stage,
                success=False,
                message_sent="",
                channel_used="",
                escalation_needed=True,
                next_stage=ConfirmationStage.HUMAN_ESCALATION,
                next_stage_timing=datetime.utcnow() + timedelta(minutes=30),
                client_response=None,
                ai_insights={},
                estimated_success_rate=0.1
            )
    
    async def _generate_stage_message(
        self,
        stage: ConfirmationStage,
        appointment: Appointment,
        client: Optional[Client],
        campaign: ConfirmationCampaign,
        strategy: Dict[str, Any]
    ) -> str:
        """Generate personalized message for a specific campaign stage"""
        
        # Determine message type based on stage
        message_type_mapping = {
            ConfirmationStage.INITIAL_CONFIRMATION: MessageType.APPOINTMENT_REMINDER,
            ConfirmationStage.FRIENDLY_REMINDER: MessageType.APPOINTMENT_REMINDER,
            ConfirmationStage.URGENT_CONFIRMATION: MessageType.URGENT_CONFIRMATION,
            ConfirmationStage.FINAL_OPPORTUNITY: MessageType.NO_SHOW_PREVENTION
        }
        
        message_type = message_type_mapping.get(stage, MessageType.APPOINTMENT_REMINDER)
        
        # Prepare context
        context = MessageContext(
            client_name=f"{client.first_name} {client.last_name}" if client else "Guest",
            first_name=client.first_name if client else "Guest",
            business_name=getattr(settings, 'business_name', 'BookedBarber'),
            appointment_data={
                "service_name": appointment.service_name,
                "date": appointment.start_time.strftime("%B %d"),
                "time": appointment.start_time.strftime("%I:%M %p"),
                "barber_name": appointment.barber.name if appointment.barber else "your barber"
            }
        )
        
        # Add stage-specific context
        if stage == ConfirmationStage.URGENT_CONFIRMATION:
            context.special_occasions = ["confirmation_needed"]
        elif stage == ConfirmationStage.FINAL_OPPORTUNITY:
            context.special_occasions = ["final_chance"]
        
        # Generate message using AI
        generated_message = await self.message_generator.generate_message(
            message_type=message_type,
            channel=MessageChannel.SMS,  # Default to SMS
            context=context,
            personalization_level=strategy.get("personalization", "standard")
        )
        
        return generated_message.content
    
    async def _select_optimal_channel(
        self,
        client: Optional[Client],
        stage: ConfirmationStage
    ) -> str:
        """Select optimal communication channel for this stage"""
        
        # Check client preferences if available
        if client and hasattr(client, 'communication_preferences'):
            prefs = client.communication_preferences or {}
            if prefs.get("sms_enabled", True):
                return "sms"
            elif prefs.get("email_enabled", True):
                return "email"
        
        # For urgent stages, prefer SMS
        if stage in [ConfirmationStage.URGENT_CONFIRMATION, ConfirmationStage.FINAL_OPPORTUNITY]:
            return "sms"
        
        return "sms"  # Default to SMS for confirmations
    
    async def _send_stage_message(
        self,
        message: str,
        channel: str,
        appointment: Appointment,
        client: Optional[Client]
    ) -> Dict[str, Any]:
        """Send the stage message via the specified channel"""
        
        try:
            if channel == "sms" and client and client.phone:
                # Use notification service to send SMS
                from services.notification_service import notification_service
                result = notification_service.send_sms(client.phone, message)
                return {
                    "success": result.get("success", False),
                    "channel": "sms",
                    "recipient": client.phone,
                    "error": result.get("error")
                }
            
            elif channel == "email" and client and client.email:
                # Use notification service to send email
                from services.notification_service import notification_service
                result = notification_service.send_email(
                    client.email, 
                    "Appointment Confirmation Needed", 
                    message
                )
                return {
                    "success": result.get("success", False),
                    "channel": "email",
                    "recipient": client.email,
                    "error": result.get("error")
                }
            
            else:
                return {
                    "success": False,
                    "channel": channel,
                    "error": "No valid recipient or channel unavailable"
                }
                
        except Exception as e:
            logger.error(f"Error sending stage message: {e}")
            return {
                "success": False,
                "channel": channel,
                "error": str(e)
            }
    
    async def _determine_next_stage(
        self,
        campaign: ConfirmationCampaign,
        send_result: Dict[str, Any]
    ) -> Tuple[Optional[ConfirmationStage], Optional[datetime]]:
        """Determine the next stage and timing for the campaign"""
        
        if not send_result.get("success"):
            # If send failed, retry current stage or escalate
            return ConfirmationStage.HUMAN_ESCALATION, datetime.utcnow() + timedelta(hours=1)
        
        # Map current stage to next stage
        stage_progression = {
            ConfirmationStage.INITIAL_CONFIRMATION: ConfirmationStage.FRIENDLY_REMINDER,
            ConfirmationStage.FRIENDLY_REMINDER: ConfirmationStage.URGENT_CONFIRMATION,
            ConfirmationStage.URGENT_CONFIRMATION: ConfirmationStage.FINAL_OPPORTUNITY,
            ConfirmationStage.FINAL_OPPORTUNITY: ConfirmationStage.HUMAN_ESCALATION
        }
        
        next_stage = stage_progression.get(campaign.current_stage)
        
        if not next_stage:
            return None, None
        
        # Calculate timing for next stage
        stage_index = list(stage_progression.keys()).index(campaign.current_stage)
        if stage_index < len(campaign.config.stage_intervals_hours):
            hours_delay = campaign.config.stage_intervals_hours[stage_index]
        else:
            hours_delay = 24  # Default delay
        
        next_timing = datetime.utcnow() + timedelta(hours=hours_delay)
        
        return next_stage, next_timing
    
    async def _check_stage_escalation_needs(self, campaign: ConfirmationCampaign) -> bool:
        """Check if immediate escalation is needed"""
        
        # Check if we've exceeded max stages
        if len(campaign.stages_completed) >= campaign.config.max_stages:
            return True
        
        # Check if success probability is very low
        if campaign.success_probability < 0.2:
            return True
        
        # Check if appointment is very soon
        appointment = self.db.query(Appointment).filter(
            Appointment.id == campaign.appointment_id
        ).first()
        
        if appointment:
            hours_until = (appointment.start_time - datetime.utcnow()).total_seconds() / 3600
            if hours_until < 6:  # Less than 6 hours until appointment
                return True
        
        return False
    
    async def _store_campaign(self, campaign: ConfirmationCampaign) -> int:
        """Store campaign in database and return ID"""
        # This would store in the ConfirmationCampaign model
        # For now, return a mock ID
        campaign_id = len(self.active_campaigns) + 1
        self.active_campaigns[campaign_id] = campaign
        return campaign_id
    
    async def _schedule_stage_execution(self, campaign: ConfirmationCampaign, stage: ConfirmationStage):
        """Schedule a stage for execution"""
        # This would schedule in a job queue (Celery, etc.)
        # For now, just update the campaign
        campaign.current_stage = stage
        campaign.next_stage_scheduled = datetime.utcnow() + timedelta(minutes=1)  # Immediate for demo
    
    async def _get_due_campaigns(self, limit: int) -> List[ConfirmationCampaign]:
        """Get campaigns with stages due for execution"""
        # This would query the database for due campaigns
        # For now, return campaigns from active campaigns
        due_campaigns = []
        for campaign in self.active_campaigns.values():
            if (campaign.next_stage_scheduled and 
                campaign.next_stage_scheduled <= datetime.utcnow() and
                campaign.final_outcome is None):
                due_campaigns.append(campaign)
                if len(due_campaigns) >= limit:
                    break
        
        return due_campaigns
    
    # Additional helper methods would be implemented here...
    # (continuing with the pattern of comprehensive functionality)
    
    async def _update_campaign_after_execution(
        self, 
        campaign: ConfirmationCampaign, 
        result: StageExecutionResult
    ):
        """Update campaign after stage execution"""
        # Update campaign state based on execution result
        campaign.updated_at = datetime.utcnow()
        if result.next_stage:
            campaign.current_stage = result.next_stage
            campaign.next_stage_scheduled = result.next_stage_timing
    
    async def _handle_escalation(
        self, 
        campaign: ConfirmationCampaign, 
        result: StageExecutionResult
    ):
        """Handle escalation to human intervention"""
        campaign.current_stage = ConfirmationStage.HUMAN_ESCALATION
        campaign.escalation_triggers.append(EscalationTrigger.NO_RESPONSE_TIMEOUT)
        
        # Create human task or notification
        logger.info(f"Campaign {campaign.id} escalated to human intervention")
    
    async def _find_active_campaign_by_phone(
        self, 
        phone_number: str, 
        campaign_id: Optional[int]
    ) -> Optional[ConfirmationCampaign]:
        """Find active campaign by phone number"""
        # This would query the database
        # For now, search active campaigns
        for campaign in self.active_campaigns.values():
            if campaign.final_outcome is None:  # Still active
                # Would check if phone number matches appointment
                return campaign
        return None
    
    async def _determine_outcome_from_response(
        self, 
        analysis_result: Dict[str, Any], 
        campaign: ConfirmationCampaign
    ) -> Optional[ConfirmationOutcome]:
        """Determine campaign outcome from client response"""
        
        analysis = analysis_result.get("analysis", {})
        intent = analysis.get("intent", "unclear")
        
        if intent == "confirm_appointment":
            return ConfirmationOutcome.CONFIRMED
        elif intent == "cancel_appointment":
            return ConfirmationOutcome.CANCELLED
        elif intent == "reschedule_request":
            return ConfirmationOutcome.RESCHEDULED
        elif intent == "unclear_intent":
            return ConfirmationOutcome.UNCLEAR_RESPONSE
        else:
            return None  # Continue campaign
    
    # Mock implementations for remaining methods
    async def _determine_follow_up_needs(self, outcome, analysis_result, campaign) -> bool:
        return False
    
    async def _cancel_scheduled_stages(self, campaign):
        pass
    
    async def _track_campaign_success(self, campaign, outcome):
        pass
    
    async def _update_campaign(self, campaign):
        pass
    
    def _determine_next_action(self, outcome, follow_up_needed) -> str:
        if outcome == ConfirmationOutcome.CONFIRMED:
            return "appointment_confirmed"
        elif outcome == ConfirmationOutcome.CANCELLED:
            return "process_cancellation"
        elif outcome == ConfirmationOutcome.RESCHEDULED:
            return "assist_rescheduling"
        elif follow_up_needed:
            return "send_follow_up"
        else:
            return "monitor_campaign"
    
    async def _get_campaigns_in_period(self, user_id, start_date) -> List[ConfirmationCampaign]:
        return list(self.active_campaigns.values())
    
    async def _analyze_optimal_timing(self, campaigns) -> Dict[str, Any]:
        return {"best_start_time": "48_hours_before", "optimal_intervals": [6, 12, 24]}
    
    async def _analyze_risk_factor_correlation(self, campaigns) -> Dict[str, Any]:
        return {"high_risk_success_rate": 0.45, "low_risk_success_rate": 0.85}
    
    async def _analyze_client_behavior_patterns(self, campaigns) -> Dict[str, Any]:
        return {"response_time_avg_hours": 4.2, "preferred_confirmation_channel": "sms"}
    
    async def _generate_optimization_recommendations(self, stage_perf, timing, risk) -> List[str]:
        return [
            "Reduce interval between initial and reminder stage to 4 hours",
            "Increase personalization for high-risk clients",
            "Add incentive offers at urgent confirmation stage"
        ]
    
    def _calculate_campaign_roi(self, campaigns) -> Dict[str, Any]:
        return {
            "cost_per_campaign": 0.15,
            "revenue_per_confirmed_appointment": 75.0,
            "roi_percentage": 450.0
        }
    
    async def _optimize_for_completion_rate(self, performance_data) -> Dict[str, Any]:
        return {"recommended_max_stages": 5, "recommended_intervals": [4, 8, 16, 24]}
    
    async def _optimize_for_efficiency(self, performance_data) -> Dict[str, Any]:
        return {"recommended_max_stages": 3, "recommended_intervals": [6, 18]}
    
    async def _optimize_for_satisfaction(self, performance_data) -> Dict[str, Any]:
        return {"tone_adjustments": "warmer", "personalization_increase": 0.2}
    
    async def _apply_optimizations_to_config(self, config, optimizations) -> ConfirmationConfig:
        # Apply optimizations to create new config
        new_config = ConfirmationConfig()
        new_config.stage_intervals_hours = [4, 8, 16, 24]  # Example optimization
        return new_config
    
    async def _estimate_improvement_impact(self, optimizations) -> Dict[str, Any]:
        return {
            "completion_rate_improvement": 0.15,
            "efficiency_improvement": 0.25,
            "client_satisfaction_improvement": 0.10
        }
    
    async def _generate_implementation_recommendations(self, optimizations) -> List[str]:
        return [
            "Phase implementation over 2 weeks to measure impact",
            "A/B test new intervals against current strategy",
            "Monitor client satisfaction metrics during transition"
        ]
    
    async def _estimate_stage_success_rate(self, campaign, send_result, strategy) -> float:
        base_rate = 0.6
        if send_result.get("success"):
            base_rate += 0.2
        if strategy.get("personalization") == "full":
            base_rate += 0.1
        return min(1.0, base_rate)


# Singleton instance
multi_stage_confirmation_service = None

def get_multi_stage_confirmation_service(db: Session) -> MultiStageConfirmationService:
    """Get or create the multi-stage confirmation service instance"""
    global multi_stage_confirmation_service
    if multi_stage_confirmation_service is None:
        multi_stage_confirmation_service = MultiStageConfirmationService(db)
    return multi_stage_confirmation_service