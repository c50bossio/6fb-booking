"""
Booking Intelligence Service
Provides AI-powered booking recommendations and automated follow-up scheduling
based on Six Figure Barber methodology and client relationship patterns.
"""

from datetime import datetime, timedelta, date
from typing import List, Dict, Any, Optional, Union
from dataclasses import dataclass
from enum import Enum
import logging
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc

from models import Appointment, User, Client, Service

logger = logging.getLogger(__name__)

class RecommendationType(Enum):
    OPTIMAL_TIMING = "optimal_timing"
    SERVICE_UPGRADE = "service_upgrade" 
    CLIENT_PAIRING = "client_pairing"
    FOLLOW_UP_BOOKING = "follow_up_booking"
    REFERRAL_BOOKING = "referral_booking"

class Priority(Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

class FollowUpActionType(Enum):
    THANK_YOU_MESSAGE = "thank_you_message"
    FEEDBACK_REQUEST = "feedback_request"
    NEXT_APPOINTMENT = "next_appointment"
    LOYALTY_REWARD = "loyalty_reward"
    REFERRAL_REQUEST = "referral_request"
    CHECK_IN_CALL = "check_in_call"

class TriggerType(Enum):
    POST_APPOINTMENT = "post_appointment"
    MILESTONE = "milestone"
    TIME_BASED = "time_based"
    AT_RISK = "at_risk"

@dataclass
class BookingRecommendation:
    id: str
    type: RecommendationType
    priority: Priority
    client_id: Optional[int]
    client_name: Optional[str]
    recommended_service: str
    recommended_price: float
    recommended_time: datetime
    reasoning: str
    six_fb_principle: str
    expected_revenue_impact: float
    confidence: float
    action_button_text: str
    deadline: Optional[datetime] = None

@dataclass
class FollowUpAction:
    id: str
    client_id: int
    client_name: str
    action_type: FollowUpActionType
    trigger_type: TriggerType
    scheduled_date: datetime
    message_template: str
    six_fb_principle: str
    priority: Priority
    status: str
    expected_outcome: str
    deadline: Optional[datetime] = None

class BookingIntelligenceService:
    """
    AI-powered booking intelligence system implementing Six Figure Barber methodology
    for relationship-driven booking optimization and automated client management.
    """
    
    # Six Figure Barber optimal booking patterns
    OPTIMAL_BOOKING_PATTERNS = {
        'vip_hours': [9, 10, 11, 17, 18, 19],  # Premium client hours
        'new_client_hours': [14, 15, 16],      # Afternoon for careful attention
        'follow_up_windows': {
            'first_visit': 14,      # 2 weeks after first visit
            'regular_client': 28,   # 4 weeks for regular clients
            'vip_client': 21        # 3 weeks for VIP clients
        },
        'service_progression': {
            'bronze': ['Basic Cut', 'Professional Cut'],
            'silver': ['Premium Cut', 'Cut & Style'], 
            'gold': ['Executive Package', 'Premium Styling'],
            'platinum': ['VIP Experience', 'Signature Service']
        }
    }
    
    # Six Figure Barber follow-up templates
    FOLLOW_UP_TEMPLATES = {
        FollowUpActionType.THANK_YOU_MESSAGE: {
            'post_appointment': "Hi {client_name}! Thank you for your visit today. I hope you love your new look! 💫",
            'milestone': "Congratulations {client_name}! You've been an amazing client. Thank you for your continued trust! 🙏",
            'principle': "Gratitude strengthens relationships and shows you value their business beyond the transaction."
        },
        FollowUpActionType.FEEDBACK_REQUEST: {
            'template': "Hi {client_name}! How are you loving your haircut? Your feedback helps me provide even better service! ⭐",
            'principle': "Client feedback creates opportunities for improvement and shows you care about their experience."
        },
        FollowUpActionType.NEXT_APPOINTMENT: {
            'regular': "Hi {client_name}! Ready for your next appointment? I have some great times available that would work perfectly for you! 📅",
            'vip': "Hi {client_name}! Your VIP appointment slot is ready. Shall I reserve your preferred time? 👑",
            'principle': "Proactive booking prevents client loss and ensures consistent revenue streams."
        },
        FollowUpActionType.LOYALTY_REWARD: {
            'template': "Special thank you {client_name}! As a valued client, you've earned a loyalty reward. Your next visit includes a complimentary upgrade! 🎁",
            'principle': "Loyalty rewards encourage retention and show appreciation for consistent patronage."
        },
        FollowUpActionType.REFERRAL_REQUEST: {
            'template': "Hi {client_name}! You always look amazing after your visits. Know anyone who'd love the same great experience? 🌟",
            'principle': "Happy clients are your best marketing. Personal referrals have the highest conversion rates."
        },
        FollowUpActionType.CHECK_IN_CALL: {
            'template': "Hi {client_name}, I noticed it's been a while since your last visit. How are you doing? I'd love to catch up! 📞",
            'principle': "Personal outreach shows you care about clients as people, not just revenue sources."
        }
    }
    
    # Follow-up timing rules based on Six Figure Barber methodology
    FOLLOW_UP_TIMING = {
        FollowUpActionType.THANK_YOU_MESSAGE: {'hours': 4, 'max_hours': 24},
        FollowUpActionType.FEEDBACK_REQUEST: {'days': 2, 'max_days': 7},
        FollowUpActionType.NEXT_APPOINTMENT: {
            'new': {'days': 14, 'max_days': 21},
            'returning': {'days': 21, 'max_days': 35},
            'vip': {'days': 18, 'max_days': 25}
        },
        FollowUpActionType.LOYALTY_REWARD: {'visits': 5},
        FollowUpActionType.REFERRAL_REQUEST: {'visits': 3, 'tier': ['gold', 'platinum']},
        FollowUpActionType.CHECK_IN_CALL: {'days': 45, 'max_days': 90}
    }

    def __init__(self):
        self.logger = logging.getLogger(f"{__name__}.{self.__class__.__name__}")

    def generate_smart_booking_recommendations(
        self,
        db: Session,
        barber_id: int,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None
    ) -> List[BookingRecommendation]:
        """
        Generate AI-powered booking recommendations based on Six Figure Barber methodology.
        """
        try:
            if not start_date:
                start_date = datetime.now().date()
            if not end_date:
                end_date = start_date + timedelta(days=30)
            
            # Get appointments for analysis
            appointments = db.query(Appointment).filter(
                and_(
                    Appointment.barber_id == barber_id,
                    Appointment.start_time >= start_date,
                    Appointment.start_time <= end_date
                )
            ).all()
            
            recommendations = []
            client_history = self._build_client_history(db, barber_id, appointments)
            
            # Generate different types of recommendations
            recommendations.extend(self._generate_follow_up_recommendations(client_history))
            recommendations.extend(self._generate_upgrade_recommendations(client_history))
            recommendations.extend(self._generate_timing_recommendations(appointments))
            recommendations.extend(self._generate_referral_recommendations(client_history))
            recommendations.extend(self._generate_reengagement_recommendations(client_history))
            
            # Sort by priority and confidence
            recommendations.sort(key=lambda x: (
                3 if x.priority == Priority.HIGH else 2 if x.priority == Priority.MEDIUM else 1,
                x.confidence
            ), reverse=True)
            
            return recommendations[:20]  # Return top 20 recommendations
            
        except Exception as e:
            self.logger.error(f"Error generating booking recommendations: {str(e)}")
            return []

    def generate_automated_follow_up_actions(
        self,
        db: Session,
        barber_id: int,
        appointments: List[Appointment]
    ) -> List[FollowUpAction]:
        """
        Generate automated follow-up actions based on Six Figure Barber methodology.
        """
        try:
            actions = []
            client_history = self._build_client_history(db, barber_id, appointments)
            today = datetime.now()
            
            for client_name, history in client_history.items():
                if not history['appointments']:
                    continue
                    
                last_visit = max(history['appointments'], key=lambda x: x.start_time)
                days_since_last = (today - last_visit.start_time).days
                hours_since_last = (today - last_visit.start_time).total_seconds() / 3600
                
                # Thank you message (same day)
                if (4 <= hours_since_last <= 24):
                    actions.append(self._create_follow_up_action(
                        client_id=history['client_id'],
                        client_name=client_name,
                        action_type=FollowUpActionType.THANK_YOU_MESSAGE,
                        trigger_type=TriggerType.POST_APPOINTMENT,
                        scheduled_date=today + timedelta(hours=2),
                        template_key='post_appointment'
                    ))
                
                # Feedback request (2-7 days)
                if (2 <= days_since_last <= 7):
                    actions.append(self._create_follow_up_action(
                        client_id=history['client_id'],
                        client_name=client_name,
                        action_type=FollowUpActionType.FEEDBACK_REQUEST,
                        trigger_type=TriggerType.POST_APPOINTMENT,
                        scheduled_date=today + timedelta(days=1),
                        priority=Priority.HIGH
                    ))
                
                # Next appointment scheduling
                customer_type = history.get('customer_type', 'returning')
                timing = self.FOLLOW_UP_TIMING[FollowUpActionType.NEXT_APPOINTMENT].get(
                    customer_type, 
                    self.FOLLOW_UP_TIMING[FollowUpActionType.NEXT_APPOINTMENT]['returning']
                )
                
                if timing['days'] <= days_since_last <= timing['max_days']:
                    is_vip = customer_type == 'vip' or history.get('client_tier') == 'platinum'
                    actions.append(self._create_follow_up_action(
                        client_id=history['client_id'],
                        client_name=client_name,
                        action_type=FollowUpActionType.NEXT_APPOINTMENT,
                        trigger_type=TriggerType.TIME_BASED,
                        scheduled_date=today + timedelta(days=2),
                        template_key='vip' if is_vip else 'regular',
                        priority=Priority.HIGH,
                        deadline=today + timedelta(days=7)
                    ))
                
                # Loyalty reward (every 5th visit)
                if history['visit_count'] > 0 and history['visit_count'] % 5 == 0:
                    actions.append(self._create_follow_up_action(
                        client_id=history['client_id'],
                        client_name=client_name,
                        action_type=FollowUpActionType.LOYALTY_REWARD,
                        trigger_type=TriggerType.MILESTONE,
                        scheduled_date=today + timedelta(days=1),
                        priority=Priority.MEDIUM
                    ))
                
                # Referral request (3+ visits, premium tiers)
                if (history['visit_count'] >= 3 and 
                    history.get('client_tier') in ['gold', 'platinum'] and
                    7 <= days_since_last <= 14):
                    actions.append(self._create_follow_up_action(
                        client_id=history['client_id'],
                        client_name=client_name,
                        action_type=FollowUpActionType.REFERRAL_REQUEST,
                        trigger_type=TriggerType.MILESTONE,
                        scheduled_date=today + timedelta(days=3),
                        priority=Priority.MEDIUM
                    ))
                
                # Check-in call for at-risk clients
                if (45 <= days_since_last <= 90 and history['visit_count'] > 1):
                    actions.append(self._create_follow_up_action(
                        client_id=history['client_id'],
                        client_name=client_name,
                        action_type=FollowUpActionType.CHECK_IN_CALL,
                        trigger_type=TriggerType.AT_RISK,
                        scheduled_date=today + timedelta(days=1),
                        priority=Priority.HIGH,
                        deadline=today + timedelta(days=7)
                    ))
            
            # Sort by priority and scheduled date
            actions.sort(key=lambda x: (
                3 if x.priority == Priority.HIGH else 2 if x.priority == Priority.MEDIUM else 1,
                x.scheduled_date
            ), reverse=True)
            
            return actions
            
        except Exception as e:
            self.logger.error(f"Error generating follow-up actions: {str(e)}")
            return []

    def _build_client_history(
        self, 
        db: Session, 
        barber_id: int, 
        appointments: List[Appointment]
    ) -> Dict[str, Dict[str, Any]]:
        """Build comprehensive client history for analysis."""
        client_history = {}
        
        for apt in appointments:
            client_name = apt.client_name or f"Client_{apt.client_id}"
            
            if client_name not in client_history:
                client_history[client_name] = {
                    'client_id': apt.client_id,
                    'appointments': [],
                    'total_spent': 0,
                    'visit_count': 0,
                    'last_visit': None,
                    'first_visit': None,
                    'client_tier': 'bronze',
                    'customer_type': 'new'
                }
            
            history = client_history[client_name]
            history['appointments'].append(apt)
            history['total_spent'] += apt.service_price or 0
            history['visit_count'] += 1
            
            if not history['last_visit'] or apt.start_time > history['last_visit']:
                history['last_visit'] = apt.start_time
            
            if not history['first_visit'] or apt.start_time < history['first_visit']:
                history['first_visit'] = apt.start_time
            
            # Determine client tier based on spending
            if history['total_spent'] >= 500:
                history['client_tier'] = 'platinum'
            elif history['total_spent'] >= 200:
                history['client_tier'] = 'gold'
            elif history['total_spent'] >= 100:
                history['client_tier'] = 'silver'
            else:
                history['client_tier'] = 'bronze'
            
            # Determine customer type
            if history['visit_count'] == 1:
                history['customer_type'] = 'new'
            elif history['client_tier'] == 'platinum':
                history['customer_type'] = 'vip'
            elif history['visit_count'] >= 5:
                history['customer_type'] = 'vip'
            else:
                history['customer_type'] = 'returning'
        
        return client_history

    def _generate_follow_up_recommendations(
        self, 
        client_history: Dict[str, Dict[str, Any]]
    ) -> List[BookingRecommendation]:
        """Generate follow-up booking recommendations."""
        recommendations = []
        today = datetime.now()
        
        for client_name, history in client_history.items():
            if not history['last_visit']:
                continue
                
            days_since_last = (today - history['last_visit']).days
            
            # First-time client follow-up (10-20 days)
            if history['visit_count'] == 1 and 10 <= days_since_last <= 20:
                recommendations.append(BookingRecommendation(
                    id=f"followup-{history['client_id']}-{int(today.timestamp())}",
                    type=RecommendationType.FOLLOW_UP_BOOKING,
                    priority=Priority.HIGH,
                    client_id=history['client_id'],
                    client_name=client_name,
                    recommended_service="Professional Cut & Style",
                    recommended_price=75.0,
                    recommended_time=self._get_optimal_follow_up_time(),
                    reasoning=f"Perfect timing for {client_name}'s second visit to build loyalty",
                    six_fb_principle="Second visits are crucial for retention. Clients who return within 3 weeks are 80% more likely to become regulars.",
                    expected_revenue_impact=75.0,
                    confidence=0.85,
                    action_button_text="Schedule Follow-up",
                    deadline=today + timedelta(days=7)
                ))
        
        return recommendations

    def _generate_upgrade_recommendations(
        self, 
        client_history: Dict[str, Dict[str, Any]]
    ) -> List[BookingRecommendation]:
        """Generate service upgrade recommendations."""
        recommendations = []
        today = datetime.now()
        
        for client_name, history in client_history.items():
            # Silver to Gold upgrade
            if history['client_tier'] == 'silver' and history['total_spent'] >= 150:
                recommendations.append(BookingRecommendation(
                    id=f"upgrade-{history['client_id']}-{int(today.timestamp())}",
                    type=RecommendationType.SERVICE_UPGRADE,
                    priority=Priority.MEDIUM,
                    client_id=history['client_id'],
                    client_name=client_name,
                    recommended_service="Gold Premium Package",
                    recommended_price=120.0,
                    recommended_time=self._get_optimal_vip_time(),
                    reasoning=f"{client_name} has invested ${history['total_spent']:.0f} - ready for premium experience",
                    six_fb_principle="Loyal clients appreciate being recognized with premium services. Tier upgrades increase lifetime value.",
                    expected_revenue_impact=45.0,  # Difference from current average
                    confidence=0.75,
                    action_button_text="Offer Upgrade"
                ))
        
        return recommendations

    def _generate_timing_recommendations(
        self, 
        appointments: List[Appointment]
    ) -> List[BookingRecommendation]:
        """Generate optimal timing recommendations."""
        recommendations = []
        today = datetime.now()
        
        for apt in appointments:
            apt_hour = apt.start_time.hour
            is_optimal = apt_hour in self.OPTIMAL_BOOKING_PATTERNS['vip_hours']
            
            # Check if premium client has non-optimal time
            if not is_optimal and hasattr(apt, 'client_tier') and apt.client_tier in ['gold', 'platinum']:
                recommendations.append(BookingRecommendation(
                    id=f"timing-{apt.id}-{int(today.timestamp())}",
                    type=RecommendationType.OPTIMAL_TIMING,
                    priority=Priority.LOW,
                    client_id=apt.client_id,
                    client_name=apt.client_name,
                    recommended_service=apt.service_name,
                    recommended_price=apt.service_price,
                    recommended_time=self._get_optimal_vip_time(),
                    reasoning=f"{apt.client_name} would benefit from premium hours (9-11 AM or 5-7 PM)",
                    six_fb_principle="Premium clients deserve premium time slots. Optimal scheduling enhances their experience.",
                    expected_revenue_impact=0.0,
                    confidence=0.50,
                    action_button_text="Suggest Reschedule"
                ))
        
        return recommendations

    def _generate_referral_recommendations(
        self, 
        client_history: Dict[str, Dict[str, Any]]
    ) -> List[BookingRecommendation]:
        """Generate referral opportunity recommendations."""
        recommendations = []
        today = datetime.now()
        
        for client_name, history in client_history.items():
            # VIP clients with 5+ visits
            if history['customer_type'] == 'vip' and history['visit_count'] >= 5:
                recommendations.append(BookingRecommendation(
                    id=f"referral-{history['client_id']}-{int(today.timestamp())}",
                    type=RecommendationType.REFERRAL_BOOKING,
                    priority=Priority.MEDIUM,
                    client_id=history['client_id'],
                    client_name=client_name,
                    recommended_service="Friend Referral Bonus",
                    recommended_price=0.0,  # Bonus for referrer
                    recommended_time=self._get_optimal_referral_time(),
                    reasoning=f"{client_name} is a loyal VIP client - perfect referral opportunity",
                    six_fb_principle="Happy VIP clients are your best marketing. Referrals from satisfied clients have 90% conversion rates.",
                    expected_revenue_impact=150.0,  # Expected revenue from referred client
                    confidence=0.70,
                    action_button_text="Request Referral"
                ))
        
        return recommendations

    def _generate_reengagement_recommendations(
        self, 
        client_history: Dict[str, Dict[str, Any]]
    ) -> List[BookingRecommendation]:
        """Generate re-engagement recommendations for at-risk clients."""
        recommendations = []
        today = datetime.now()
        
        for client_name, history in client_history.items():
            if not history['last_visit']:
                continue
                
            days_since_last = (today - history['last_visit']).days
            
            # At-risk clients (45-90 days absence)
            if 45 <= days_since_last <= 90 and history['visit_count'] > 1:
                recommendations.append(BookingRecommendation(
                    id=f"reengage-{history['client_id']}-{int(today.timestamp())}",
                    type=RecommendationType.FOLLOW_UP_BOOKING,
                    priority=Priority.HIGH,
                    client_id=history['client_id'],
                    client_name=client_name,
                    recommended_service="Welcome Back Special",
                    recommended_price=65.0,
                    recommended_time=self._get_optimal_reengagement_time(),
                    reasoning=f"{client_name} hasn't visited in {days_since_last} days - proactive re-engagement needed",
                    six_fb_principle="Proactive retention is more profitable than new client acquisition. Personal outreach shows you care.",
                    expected_revenue_impact=65.0,
                    confidence=0.60,
                    action_button_text="Re-engage Client",
                    deadline=today + timedelta(days=14)
                ))
        
        return recommendations

    def _create_follow_up_action(
        self,
        client_id: int,
        client_name: str,
        action_type: FollowUpActionType,
        trigger_type: TriggerType,
        scheduled_date: datetime,
        template_key: str = 'template',
        priority: Priority = Priority.MEDIUM,
        deadline: Optional[datetime] = None
    ) -> FollowUpAction:
        """Create a follow-up action with proper templates and timing."""
        
        template_data = self.FOLLOW_UP_TEMPLATES[action_type]
        
        if template_key in template_data:
            message_template = template_data[template_key].format(client_name=client_name)
        else:
            message_template = template_data.get('template', '').format(client_name=client_name)
        
        return FollowUpAction(
            id=f"{action_type.value}-{client_id}-{int(scheduled_date.timestamp())}",
            client_id=client_id,
            client_name=client_name,
            action_type=action_type,
            trigger_type=trigger_type,
            scheduled_date=scheduled_date,
            message_template=message_template,
            six_fb_principle=template_data['principle'],
            priority=priority,
            status='scheduled',
            expected_outcome=self._get_expected_outcome(action_type),
            deadline=deadline
        )

    def _get_expected_outcome(self, action_type: FollowUpActionType) -> str:
        """Get expected outcome for follow-up action type."""
        outcomes = {
            FollowUpActionType.THANK_YOU_MESSAGE: "Strengthen relationship and show appreciation",
            FollowUpActionType.FEEDBACK_REQUEST: "Gather feedback and identify improvement opportunities",
            FollowUpActionType.NEXT_APPOINTMENT: "Schedule next appointment and maintain regular cadence",
            FollowUpActionType.LOYALTY_REWARD: "Reward loyalty and encourage continued visits",
            FollowUpActionType.REFERRAL_REQUEST: "Generate referrals from satisfied clients",
            FollowUpActionType.CHECK_IN_CALL: "Re-engage at-risk client and prevent churn"
        }
        return outcomes.get(action_type, "Improve client relationship")

    def _get_optimal_follow_up_time(self) -> datetime:
        """Calculate optimal follow-up appointment time."""
        follow_up_date = datetime.now() + timedelta(days=14)
        follow_up_date = follow_up_date.replace(hour=15, minute=0, second=0, microsecond=0)
        return follow_up_date

    def _get_optimal_vip_time(self) -> datetime:
        """Calculate optimal VIP appointment time."""
        vip_date = datetime.now() + timedelta(days=7)
        vip_date = vip_date.replace(hour=10, minute=0, second=0, microsecond=0)
        return vip_date

    def _get_optimal_reengagement_time(self) -> datetime:
        """Calculate optimal re-engagement appointment time."""
        reengage_date = datetime.now() + timedelta(days=3)
        reengage_date = reengage_date.replace(hour=14, minute=0, second=0, microsecond=0)
        return reengage_date

    def _get_optimal_referral_time(self) -> datetime:
        """Calculate optimal referral conversation time."""
        referral_date = datetime.now() + timedelta(days=2)
        referral_date = referral_date.replace(hour=16, minute=0, second=0, microsecond=0)
        return referral_date

    def execute_follow_up_action(
        self,
        db: Session,
        action_id: str,
        barber_id: int
    ) -> Dict[str, Any]:
        """
        Execute a follow-up action (send message, make call, etc.).
        In a full implementation, this would integrate with SMS/email services.
        """
        try:
            # In a real implementation, this would:
            # 1. Look up the action from database
            # 2. Send the actual message via SMS/email
            # 3. Log the execution
            # 4. Update action status
            
            result = {
                "action_id": action_id,
                "executed_at": datetime.now().isoformat(),
                "executed_by": barber_id,
                "status": "executed",
                "delivery_status": "sent"
            }
            
            self.logger.info(f"Follow-up action {action_id} executed by barber {barber_id}")
            return result
            
        except Exception as e:
            self.logger.error(f"Error executing follow-up action: {str(e)}")
            return {
                "action_id": action_id,
                "status": "failed",
                "error": str(e)
            }

    def apply_booking_recommendation(
        self,
        db: Session,
        recommendation_id: str,
        barber_id: int,
        action_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Apply a booking recommendation (create appointment, send message, etc.).
        """
        try:
            # In a real implementation, this would:
            # 1. Look up the recommendation
            # 2. Create appointment if applicable
            # 3. Send client communication
            # 4. Track recommendation outcome
            
            result = {
                "recommendation_id": recommendation_id,
                "applied_at": datetime.now().isoformat(),
                "applied_by": barber_id,
                "action_taken": action_data.get("action_type", "unknown"),
                "status": "applied",
                "outcome": "success"
            }
            
            self.logger.info(f"Booking recommendation {recommendation_id} applied by barber {barber_id}")
            return result
            
        except Exception as e:
            self.logger.error(f"Error applying booking recommendation: {str(e)}")
            return {
                "recommendation_id": recommendation_id,
                "status": "failed",
                "error": str(e)
            }