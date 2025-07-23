"""
Win-Back Automation Service - Six Figure Barber Client Recovery
===============================================================

This service implements intelligent automated sequences for re-engaging dormant
clients and preventing complete churn through strategic, timed outreach campaigns
that align with Six Figure Barber methodology.

Key Features:
- Multi-stage win-back sequences with escalating value propositions
- Intelligent timing based on client behavior patterns and preferences
- Personalized messaging that rebuilds relationships and trust
- Six Figure methodology alignment focusing on value and experience
- Automated trigger detection for different dormancy patterns
- Performance tracking and sequence optimization
- Integration with offer generation and campaign execution systems
"""

from datetime import datetime, timedelta, date
from typing import Dict, List, Optional, Tuple, Any, Union
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, desc, extract
import logging
from dataclasses import dataclass
from enum import Enum
import uuid
import asyncio

from models import User, Client, Appointment, Payment
from services.dynamic_offer_service import DynamicOfferService, PersonalizedOffer
from services.automated_campaign_service import AutomatedCampaignService, CampaignChannel
from services.client_lifetime_value_service import ClientLifetimeValueService
from services.client_tier_service import ClientTierService, ClientTier
from services.churn_prediction_service import ChurnPredictionService

logger = logging.getLogger(__name__)

class WinBackStage(Enum):
    """Stages of win-back automation sequence"""
    GENTLE_REMINDER = "gentle_reminder"        # Soft touch, relationship focus
    VALUE_PROPOSITION = "value_proposition"    # Highlight value and benefits
    SPECIAL_OFFER = "special_offer"           # Personalized offer
    FINAL_ATTEMPT = "final_attempt"           # Last chance outreach
    DORMANT_ARCHIVE = "dormant_archive"       # Move to dormant status

class WinBackTrigger(Enum):
    """Triggers that start win-back sequences"""
    DAYS_INACTIVE = "days_inactive"           # X days without booking
    MISSED_REGULAR_APPOINTMENT = "missed_regular" # Broke regular pattern
    DECLINED_RECENT_OFFERS = "declined_offers"    # Ignored recent offers
    SEASONAL_REACTIVATION = "seasonal"            # Seasonal re-engagement
    COMPETITOR_RISK = "competitor_risk"           # At risk to competitor
    LIFECYCLE_TRANSITION = "lifecycle"           # Life change detected

class SequenceStatus(Enum):
    """Status of win-back sequence"""
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED_SUCCESS = "completed_success"
    COMPLETED_FAILURE = "completed_failure"
    CANCELLED = "cancelled"

@dataclass
class WinBackSequence:
    """Win-back automation sequence"""
    sequence_id: str
    client_id: int
    client_name: str
    trigger: WinBackTrigger
    current_stage: WinBackStage
    status: SequenceStatus
    
    # Sequence configuration
    total_stages: int
    current_stage_number: int
    days_between_stages: int
    
    # Client context
    client_tier: ClientTier
    days_dormant: int
    last_booking_date: datetime
    lifetime_value: float
    historical_booking_frequency: float
    
    # Sequence tracking
    started_at: datetime
    next_action_at: datetime
    last_contact_at: Optional[datetime]
    
    # Performance metrics
    stages_completed: int
    emails_sent: int
    emails_opened: int
    offers_generated: int
    offers_redeemed: int
    sequence_cost: float
    
    # Success indicators
    reactivated: bool
    reactivation_date: Optional[datetime]
    reactivation_revenue: float
    sequence_roi: float
    
@dataclass
class WinBackStageAction:
    """Individual action within a win-back stage"""
    action_id: str
    sequence_id: str
    stage: WinBackStage
    stage_number: int
    
    # Action configuration
    action_type: str              # 'email', 'sms', 'offer_generation'
    channel: CampaignChannel
    delay_days: int               # Days after previous action
    
    # Content
    message_template: str
    subject_template: Optional[str]
    personalization_level: str
    
    # Action tracking
    scheduled_at: datetime
    executed_at: Optional[datetime]
    success: bool
    
    # Results
    opened: bool = False
    clicked: bool = False
    responded: bool = False
    cost: float = 0.0

@dataclass
class WinBackPerformance:
    """Performance analytics for win-back sequences"""
    total_sequences_started: int
    total_sequences_completed: int
    overall_success_rate: float
    average_sequence_duration_days: float
    
    # Stage performance
    stage_completion_rates: Dict[WinBackStage, float]
    stage_success_rates: Dict[WinBackStage, float]
    optimal_timing_by_stage: Dict[WinBackStage, int]
    
    # Financial metrics
    total_cost: float
    total_revenue_recovered: float
    average_recovery_value: float
    roi_percentage: float
    
    # Client segment analysis
    performance_by_tier: Dict[ClientTier, Dict[str, float]]
    performance_by_dormancy_period: Dict[str, Dict[str, float]]
    
    # Optimization insights
    best_performing_triggers: List[str]
    optimal_sequence_length: int
    improvement_recommendations: List[str]

class WinBackAutomationService:
    """
    Win-Back Automation Service for Six Figure Barber Client Recovery
    
    Orchestrates intelligent automated sequences to re-engage dormant clients
    through strategic, timed outreach that aligns with Six Figure methodology.
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.offer_service = DynamicOfferService(db)
        self.campaign_service = AutomatedCampaignService(db)
        self.clv_service = ClientLifetimeValueService(db)
        self.tier_service = ClientTierService(db)
        self.churn_service = ChurnPredictionService(db)
        
        # Win-back configuration
        self.sequence_configs = self._load_sequence_configurations()
        self.trigger_rules = self._load_trigger_rules()
        
        # Six Figure methodology settings
        self.six_figure_principles = {
            "relationship_first": True,
            "value_focus": True,
            "gentle_escalation": True,
            "personal_touch": True,
            "preserve_premium_positioning": True
        }
    
    async def detect_and_trigger_sequences(self, user_id: int) -> List[WinBackSequence]:
        """
        Detect clients who need win-back sequences and trigger them
        
        Args:
            user_id: Barber's user ID
            
        Returns:
            List of triggered win-back sequences
        """
        try:
            triggered_sequences = []
            
            # Get all clients for this user
            clients = self.db.query(Client).filter(Client.user_id == user_id).all()
            
            for client in clients:
                # Check if client needs win-back sequence
                trigger = await self._detect_winback_trigger(client)
                
                if trigger and not self._has_active_sequence(client.id):
                    # Start new win-back sequence
                    sequence = await self._start_winback_sequence(client, trigger)
                    if sequence:
                        triggered_sequences.append(sequence)
            
            logger.info(f"Triggered {len(triggered_sequences)} win-back sequences for user {user_id}")
            return triggered_sequences
            
        except Exception as e:
            logger.error(f"Error detecting and triggering win-back sequences: {e}")
            return []
    
    async def execute_sequence_actions(self, sequence_id: str) -> bool:
        """
        Execute pending actions for a win-back sequence
        
        Args:
            sequence_id: Sequence to execute actions for
            
        Returns:
            True if actions executed successfully
        """
        try:
            # This would load sequence from database
            # For now, simulate sequence execution
            
            sequence = await self._load_sequence(sequence_id)
            if not sequence or sequence.status != SequenceStatus.ACTIVE:
                return False
            
            # Get pending actions for current stage
            pending_actions = await self._get_pending_actions(sequence)
            
            for action in pending_actions:
                success = await self._execute_stage_action(action, sequence)
                if success:
                    await self._track_action_result(action, sequence)
            
            # Check if stage is complete and advance if needed
            if await self._is_stage_complete(sequence):
                await self._advance_to_next_stage(sequence)
            
            return True
            
        except Exception as e:
            logger.error(f"Error executing sequence actions for {sequence_id}: {e}")
            return False
    
    async def _detect_winback_trigger(self, client: Client) -> Optional[WinBackTrigger]:
        """Detect if client needs win-back sequence"""
        
        # Get client's booking history
        last_appointment = self.db.query(Appointment).filter(
            Appointment.client_id == client.id
        ).order_by(desc(Appointment.appointment_date)).first()
        
        if not last_appointment:
            return None
        
        days_since_last = (datetime.now() - last_appointment.appointment_date).days
        
        # Days inactive trigger
        if days_since_last >= 45:  # 6+ weeks without booking
            return WinBackTrigger.DAYS_INACTIVE
        
        # Missed regular appointment trigger
        if await self._missed_regular_pattern(client.id):
            return WinBackTrigger.MISSED_REGULAR_APPOINTMENT
        
        # Seasonal reactivation (e.g., back-to-school, holidays)
        if await self._is_seasonal_reactivation_period():
            return WinBackTrigger.SEASONAL_REACTIVATION
        
        return None
    
    async def _start_winback_sequence(self, client: Client, trigger: WinBackTrigger) -> WinBackSequence:
        """Start a new win-back sequence for client"""
        
        try:
            # Get client analytics
            client_tier = self.tier_service.get_client_tier(client.id)
            clv = self.clv_service.calculate_client_clv(client.id, 365)
            
            # Get last booking info
            last_booking = self.db.query(Appointment).filter(
                Appointment.client_id == client.id
            ).order_by(desc(Appointment.appointment_date)).first()
            
            days_dormant = (datetime.now() - last_booking.appointment_date).days if last_booking else 365
            
            # Create win-back sequence
            sequence = WinBackSequence(
                sequence_id=f"winback_{uuid.uuid4().hex[:12]}",
                client_id=client.id,
                client_name=client.name,
                trigger=trigger,
                current_stage=WinBackStage.GENTLE_REMINDER,
                status=SequenceStatus.ACTIVE,
                
                total_stages=4,  # 4-stage sequence
                current_stage_number=1,
                days_between_stages=7,  # Week between stages
                
                client_tier=client_tier,
                days_dormant=days_dormant,
                last_booking_date=last_booking.appointment_date if last_booking else datetime.now() - timedelta(days=365),
                lifetime_value=clv,
                historical_booking_frequency=self._calculate_booking_frequency(client.id),
                
                started_at=datetime.now(),
                next_action_at=datetime.now(),
                last_contact_at=None,
                
                stages_completed=0,
                emails_sent=0,
                emails_opened=0,
                offers_generated=0,
                offers_redeemed=0,
                sequence_cost=0.0,
                
                reactivated=False,
                reactivation_date=None,
                reactivation_revenue=0.0,
                sequence_roi=0.0
            )
            
            # Schedule first stage action
            await self._schedule_stage_actions(sequence)
            
            logger.info(f"Started win-back sequence {sequence.sequence_id} for client {client.id}")
            return sequence
            
        except Exception as e:
            logger.error(f"Error starting win-back sequence for client {client.id}: {e}")
            return None
    
    async def _execute_stage_action(self, action: WinBackStageAction, sequence: WinBackSequence) -> bool:
        """Execute a specific stage action"""
        
        try:
            if action.action_type == "email":
                return await self._send_winback_email(action, sequence)
            elif action.action_type == "sms":
                return await self._send_winback_sms(action, sequence)
            elif action.action_type == "offer_generation":
                return await self._generate_winback_offer(action, sequence)
            else:
                logger.warning(f"Unknown action type: {action.action_type}")
                return False
                
        except Exception as e:
            logger.error(f"Error executing stage action {action.action_id}: {e}")
            return False
    
    async def _send_winback_email(self, action: WinBackStageAction, sequence: WinBackSequence) -> bool:
        """Send win-back email for specific stage"""
        
        try:
            # Get personalized content for this stage
            content = self._generate_stage_content(action, sequence)
            
            # Create campaign execution via campaign service
            # This would integrate with the AutomatedCampaignService
            
            # For now, simulate email sending
            action.executed_at = datetime.now()
            action.success = True
            action.cost = 0.001  # Email cost
            
            # Update sequence tracking
            sequence.emails_sent += 1
            sequence.sequence_cost += action.cost
            sequence.last_contact_at = datetime.now()
            
            logger.info(f"Sent win-back email for sequence {sequence.sequence_id}, stage {action.stage.value}")
            return True
            
        except Exception as e:
            logger.error(f"Error sending win-back email: {e}")
            return False
    
    async def _send_winback_sms(self, action: WinBackStageAction, sequence: WinBackSequence) -> bool:
        """Send win-back SMS for specific stage"""
        
        try:
            # Generate SMS content
            content = self._generate_stage_content(action, sequence)
            
            # SMS content should be concise
            sms_message = content["message"][:140]  # SMS length limit
            
            # Execute SMS via campaign service
            action.executed_at = datetime.now()
            action.success = True
            action.cost = 0.02  # SMS cost
            
            # Update sequence tracking
            sequence.sequence_cost += action.cost
            sequence.last_contact_at = datetime.now()
            
            logger.info(f"Sent win-back SMS for sequence {sequence.sequence_id}, stage {action.stage.value}")
            return True
            
        except Exception as e:
            logger.error(f"Error sending win-back SMS: {e}")
            return False
    
    async def _generate_winback_offer(self, action: WinBackStageAction, sequence: WinBackSequence) -> bool:
        """Generate personalized offer for win-back"""
        
        try:
            # Create churn prediction for offer generation
            churn_prediction = self.churn_service.predict_client_churn(
                user_id=1,  # Would get from sequence context
                client_id=sequence.client_id,
                analysis_period_days=90
            )
            
            # Generate personalized offer
            offer = self.offer_service.generate_personalized_offer(
                client_id=sequence.client_id,
                churn_prediction=churn_prediction,
                context={"winback_stage": action.stage.value}
            )
            
            # Track offer generation
            action.executed_at = datetime.now()
            action.success = True
            
            sequence.offers_generated += 1
            
            logger.info(f"Generated win-back offer {offer.offer_id} for sequence {sequence.sequence_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error generating win-back offer: {e}")
            return False
    
    def _generate_stage_content(self, action: WinBackStageAction, sequence: WinBackSequence) -> Dict[str, str]:
        """Generate personalized content for win-back stage"""
        
        first_name = sequence.client_name.split()[0] if sequence.client_name else "Valued Client"
        days_away = sequence.days_dormant
        
        # Stage-specific messaging aligned with Six Figure methodology
        if action.stage == WinBackStage.GENTLE_REMINDER:
            return {
                "subject": f"Missing you, {first_name}! 💇‍♂️",
                "message": f"Hi {first_name},\n\nI noticed it's been {days_away} days since your last appointment, and I wanted to personally reach out. Your chair misses you!\n\nAs your barber, I genuinely care about helping you look and feel your best. If there's anything I can do to improve your experience or if life has just been busy, I'm here.\n\nNo pressure - just wanted you to know you're valued and thought of.\n\nLooking forward to seeing you soon!\n\nYour Six Figure Barber"
            }
            
        elif action.stage == WinBackStage.VALUE_PROPOSITION:
            return {
                "subject": f"What you've been missing, {first_name}",
                "message": f"Hi {first_name},\n\nI've been thinking about the amazing results we achieved together - that fresh cut that had everyone asking where you get your hair done!\n\nSince your last visit {days_away} days ago, I've:\n• Mastered new cutting techniques\n• Added premium grooming services\n• Upgraded to even better products\n• Extended my availability for your convenience\n\nI'd love to show you what's new and get you looking sharp again. Ready to reclaim that confidence?\n\nBook your comeback appointment today!\n\nYour Six Figure Barber"
            }
            
        elif action.stage == WinBackStage.SPECIAL_OFFER:
            return {
                "subject": f"Exclusive comeback offer for {first_name}",
                "message": f"Hi {first_name},\n\nI miss working with you and creating those styles that made you feel amazing. To make your return extra special, I've created an exclusive offer just for you.\n\n🌟 Your Comeback Package:\n• Premium haircut with consultation\n• Complimentary hot towel treatment\n• Beard trim and styling (if applicable)\n• Premium product styling\n\nThis is my way of saying 'welcome back' and showing how much I value you as a client.\n\nReady to feel great again? This exclusive offer expires in 7 days.\n\nYour Six Figure Barber"
            }
            
        elif action.stage == WinBackStage.FINAL_ATTEMPT:
            return {
                "subject": f"One last invitation, {first_name}",
                "message": f"Hi {first_name},\n\nThis is my final personal message to you. Over the {days_away} days since we last connected, I've realized how much I enjoyed our conversations and creating styles that made you feel confident.\n\nIf I did something wrong or if your needs have changed, I'd genuinely appreciate your feedback. If life has just been busy, I completely understand.\n\nIf you're ready to reconnect, I'm here with the same passion for excellence and making you look your absolute best. If not, I wish you all the best and thank you for the time we had together.\n\nEither way, you'll always be welcome in my chair.\n\nWith respect and gratitude,\nYour Six Figure Barber"
            }
        
        # Fallback content
        return {
            "subject": f"Thinking of you, {first_name}",
            "message": f"Hi {first_name}, just wanted to reach out and see how you're doing. Hope to see you soon!"
        }
    
    def _load_sequence_configurations(self) -> Dict[str, Any]:
        """Load win-back sequence configurations"""
        
        return {
            "default_sequence": {
                "stages": [
                    {
                        "stage": WinBackStage.GENTLE_REMINDER,
                        "delay_days": 0,
                        "actions": [
                            {"type": "email", "channel": "email", "personalization": "high"}
                        ]
                    },
                    {
                        "stage": WinBackStage.VALUE_PROPOSITION,
                        "delay_days": 7,
                        "actions": [
                            {"type": "email", "channel": "email", "personalization": "high"}
                        ]
                    },
                    {
                        "stage": WinBackStage.SPECIAL_OFFER,
                        "delay_days": 14,
                        "actions": [
                            {"type": "offer_generation", "channel": "email"},
                            {"type": "email", "channel": "email", "personalization": "premium"}
                        ]
                    },
                    {
                        "stage": WinBackStage.FINAL_ATTEMPT,
                        "delay_days": 21,
                        "actions": [
                            {"type": "email", "channel": "email", "personalization": "personal"}
                        ]
                    }
                ]
            },
            "vip_sequence": {
                "stages": [
                    {
                        "stage": WinBackStage.GENTLE_REMINDER,
                        "delay_days": 0,
                        "actions": [
                            {"type": "email", "channel": "email", "personalization": "premium"},
                            {"type": "sms", "channel": "sms", "personalization": "personal"}
                        ]
                    },
                    {
                        "stage": WinBackStage.SPECIAL_OFFER,
                        "delay_days": 5,
                        "actions": [
                            {"type": "offer_generation", "channel": "email"},
                            {"type": "email", "channel": "email", "personalization": "premium"}
                        ]
                    },
                    {
                        "stage": WinBackStage.FINAL_ATTEMPT,
                        "delay_days": 10,
                        "actions": [
                            {"type": "email", "channel": "email", "personalization": "personal"}
                        ]
                    }
                ]
            }
        }
    
    def _load_trigger_rules(self) -> Dict[str, Any]:
        """Load trigger rules for win-back sequences"""
        
        return {
            "days_inactive": {
                "regular_clients": 45,
                "premium_clients": 35,
                "vip_clients": 28
            },
            "missed_appointments": {
                "threshold": 2,
                "time_window_days": 30
            },
            "seasonal_periods": [
                {"name": "back_to_school", "start": "08-15", "end": "09-15"},
                {"name": "holiday_season", "start": "11-15", "end": "12-31"},
                {"name": "new_year", "start": "01-01", "end": "01-31"},
                {"name": "spring_refresh", "start": "03-01", "end": "04-15"}
            ]
        }
    
    # Helper methods
    
    def _has_active_sequence(self, client_id: int) -> bool:
        """Check if client has active win-back sequence"""
        # This would query database for active sequences
        return False
    
    async def _load_sequence(self, sequence_id: str) -> Optional[WinBackSequence]:
        """Load sequence from database"""
        # This would load from database
        return None
    
    async def _get_pending_actions(self, sequence: WinBackSequence) -> List[WinBackStageAction]:
        """Get pending actions for sequence"""
        # This would get actions that need to be executed
        return []
    
    async def _track_action_result(self, action: WinBackStageAction, sequence: WinBackSequence):
        """Track action execution results"""
        # This would update database with action results
        pass
    
    async def _is_stage_complete(self, sequence: WinBackSequence) -> bool:
        """Check if current stage is complete"""
        # This would check if all stage actions are complete
        return True
    
    async def _advance_to_next_stage(self, sequence: WinBackSequence):
        """Advance sequence to next stage"""
        # This would move sequence to next stage
        if sequence.current_stage_number < sequence.total_stages:
            sequence.current_stage_number += 1
            sequence.next_action_at = datetime.now() + timedelta(days=sequence.days_between_stages)
        else:
            sequence.status = SequenceStatus.COMPLETED_FAILURE
    
    async def _schedule_stage_actions(self, sequence: WinBackSequence):
        """Schedule actions for sequence stages"""
        # This would schedule all actions for the sequence
        pass
    
    async def _missed_regular_pattern(self, client_id: int) -> bool:
        """Check if client missed their regular booking pattern"""
        # Analyze booking history to detect missed regular appointments
        appointments = self.db.query(Appointment).filter(
            Appointment.client_id == client_id
        ).order_by(desc(Appointment.appointment_date)).limit(6).all()
        
        if len(appointments) < 3:
            return False
        
        # Simple pattern detection - would be more sophisticated
        intervals = []
        for i in range(len(appointments) - 1):
            interval = (appointments[i].appointment_date - appointments[i + 1].appointment_date).days
            intervals.append(interval)
        
        # If they had a regular pattern and broke it
        if intervals and len(set(intervals)) <= 2:  # Consistent intervals
            expected_next = appointments[0].appointment_date + timedelta(days=intervals[0])
            return datetime.now() > expected_next + timedelta(days=7)
        
        return False
    
    async def _is_seasonal_reactivation_period(self) -> bool:
        """Check if current period is good for seasonal reactivation"""
        today = datetime.now()
        month_day = today.strftime("%m-%d")
        
        seasonal_periods = self.trigger_rules["seasonal_periods"]
        for period in seasonal_periods:
            if period["start"] <= month_day <= period["end"]:
                return True
        
        return False
    
    def _calculate_booking_frequency(self, client_id: int) -> float:
        """Calculate client's historical booking frequency"""
        appointments = self.db.query(Appointment).filter(
            Appointment.client_id == client_id
        ).order_by(desc(Appointment.appointment_date)).limit(12).all()
        
        if len(appointments) < 2:
            return 0.0
        
        # Calculate average days between appointments
        total_days = (appointments[0].appointment_date - appointments[-1].appointment_date).days
        return len(appointments) / max(total_days / 30, 1)  # Bookings per month
    
    def get_sequence_performance(self, user_id: int, date_range_days: int = 90) -> WinBackPerformance:
        """Get performance analytics for win-back sequences"""
        
        try:
            # This would query actual performance data from database
            # For now, return mock performance data
            
            return WinBackPerformance(
                total_sequences_started=28,
                total_sequences_completed=23,
                overall_success_rate=0.35,
                average_sequence_duration_days=18.5,
                
                stage_completion_rates={
                    WinBackStage.GENTLE_REMINDER: 0.95,
                    WinBackStage.VALUE_PROPOSITION: 0.78,
                    WinBackStage.SPECIAL_OFFER: 0.65,
                    WinBackStage.FINAL_ATTEMPT: 0.45
                },
                stage_success_rates={
                    WinBackStage.GENTLE_REMINDER: 0.15,
                    WinBackStage.VALUE_PROPOSITION: 0.25,
                    WinBackStage.SPECIAL_OFFER: 0.45,
                    WinBackStage.FINAL_ATTEMPT: 0.20
                },
                optimal_timing_by_stage={
                    WinBackStage.GENTLE_REMINDER: 0,
                    WinBackStage.VALUE_PROPOSITION: 7,
                    WinBackStage.SPECIAL_OFFER: 14,
                    WinBackStage.FINAL_ATTEMPT: 21
                },
                
                total_cost=156.80,
                total_revenue_recovered=2340.00,
                average_recovery_value=292.50,
                roi_percentage=1392.35,
                
                performance_by_tier={
                    ClientTier.VIP: {"success_rate": 0.55, "avg_recovery": 450.0},
                    ClientTier.PREMIUM: {"success_rate": 0.42, "avg_recovery": 320.0},
                    ClientTier.REGULAR: {"success_rate": 0.28, "avg_recovery": 180.0},
                    ClientTier.NEW: {"success_rate": 0.15, "avg_recovery": 95.0}
                },
                performance_by_dormancy_period={
                    "30_60_days": {"success_rate": 0.45, "avg_recovery": 285.0},
                    "60_90_days": {"success_rate": 0.35, "avg_recovery": 245.0},
                    "90_180_days": {"success_rate": 0.25, "avg_recovery": 180.0},
                    "180_plus_days": {"success_rate": 0.12, "avg_recovery": 120.0}
                },
                
                best_performing_triggers=["missed_regular_appointment", "seasonal_reactivation", "days_inactive"],
                optimal_sequence_length=3,
                improvement_recommendations=[
                    "Focus on clients dormant 30-90 days for best ROI",
                    "VIP clients respond best to personal outreach",
                    "Special offers work best in stage 3",
                    "SMS follow-up improves email response rates by 35%",
                    "Seasonal timing increases success rates by 20%"
                ]
            )
            
        except Exception as e:
            logger.error(f"Error getting sequence performance: {e}")
            return None
    
    async def pause_sequence(self, sequence_id: str) -> bool:
        """Pause a win-back sequence"""
        try:
            # This would update sequence status in database
            logger.info(f"Paused win-back sequence {sequence_id}")
            return True
        except Exception as e:
            logger.error(f"Error pausing sequence {sequence_id}: {e}")
            return False
    
    async def resume_sequence(self, sequence_id: str) -> bool:
        """Resume a paused win-back sequence"""
        try:
            # This would update sequence status and reschedule actions
            logger.info(f"Resumed win-back sequence {sequence_id}")
            return True
        except Exception as e:
            logger.error(f"Error resuming sequence {sequence_id}: {e}")
            return False
    
    async def mark_client_reactivated(self, client_id: int, revenue: float = 0.0) -> bool:
        """Mark client as successfully reactivated"""
        try:
            # This would update any active sequences for the client
            # and mark them as successful
            logger.info(f"Client {client_id} reactivated with ${revenue:.2f} revenue")
            return True
        except Exception as e:
            logger.error(f"Error marking client {client_id} as reactivated: {e}")
            return False