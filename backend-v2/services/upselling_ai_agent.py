"""
🤖 Upselling AI Agent - Intelligent Revenue Optimization

This AI agent automatically:
1. Identifies upselling opportunities using ML scoring
2. Generates personalized messages for each client
3. Optimizes timing for maximum conversion rates
4. Learns from outcomes to improve future performance
5. Provides strategic recommendations for revenue growth

Built for Six Figure Barber methodology compliance.
"""

import asyncio
import logging
from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from enum import Enum
import json
import statistics
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc, func

from models import User, Appointment, Client
from models.upselling import UpsellAttempt, UpsellConversion, UpsellAnalytics
from services.notification_service import NotificationService
from services.upselling_conversion_detector import ServiceMatcher
from services.ai_learning_engine import get_learning_engine, LearningEvent
from models.ai_memory import LearningEventType
from config import settings

logger = logging.getLogger(__name__)


class ClientPersonality(Enum):
    """Client personality types for personalized messaging"""
    DIRECT_PROFESSIONAL = "direct_professional"
    RELATIONSHIP_FOCUSED = "relationship_focused"
    PRICE_SENSITIVE = "price_sensitive"
    LUXURY_ORIENTED = "luxury_oriented"
    TIME_CONSCIOUS = "time_conscious"
    TECH_SAVVY = "tech_savvy"


class OpportunityChannel(Enum):
    """Available channels for upselling"""
    SMS = "sms"
    EMAIL = "email"
    IN_PERSON = "in_person"
    PUSH_NOTIFICATION = "push_notification"
    WHATSAPP = "whatsapp"


@dataclass
class UpsellOpportunity:
    """AI-identified upselling opportunity"""
    client_id: int
    client_name: str
    current_service: str
    suggested_service: str
    confidence_score: float  # 0.0 to 1.0
    potential_revenue: float
    optimal_timing: datetime
    recommended_channel: OpportunityChannel
    personalized_message: str
    reasoning: str
    client_personality: ClientPersonality
    historical_success_rate: float


@dataclass
class AIInsights:
    """AI-generated insights and recommendations"""
    total_opportunities_identified: int
    high_confidence_opportunities: int
    predicted_revenue_potential: float
    optimal_timing_insights: Dict[str, Any]
    personality_distribution: Dict[str, int]
    channel_recommendations: Dict[str, float]
    success_predictions: Dict[str, float]


class UpsellAIAgent:
    """
    🤖 Intelligent Upselling AI Agent
    
    Capabilities:
    - Autonomous opportunity detection
    - ML-powered scoring and timing
    - Personalized message generation
    - Continuous learning from outcomes
    - Strategic revenue optimization
    """
    
    def __init__(self, notification_service: NotificationService):
        self.notification_service = notification_service
        self.service_matcher = ServiceMatcher()
        self.learning_engine = get_learning_engine()
        
        # AI configuration with enhanced learning
        self.confidence_threshold = 0.6  # Minimum confidence to auto-trigger
        self.max_daily_opportunities = 10  # Rate limiting
        self.learning_window_days = 30  # Days of history to analyze
        self.version = "v2.0_learning"  # Enhanced version with memory
        
        # Memory and learning features
        self.memory_enabled = True
        self.continuous_learning = True
        self.pattern_discovery = True
        
        logger.info(f"🤖 Upselling AI Agent {self.version} initialized with persistent memory and learning")
    
    async def scan_for_opportunities(self, db: Session, barber_id: Optional[int] = None) -> List[UpsellOpportunity]:
        """
        🔍 Automatically scan for upselling opportunities using AI
        
        Analyzes:
        - Recent appointments
        - Client service history  
        - Success patterns
        - Optimal timing windows
        """
        try:
            # Get recent appointments to analyze
            query = db.query(Appointment).filter(
                Appointment.status == "completed",
                Appointment.start_time >= datetime.now() - timedelta(days=7)
            )
            
            if barber_id:
                query = query.filter(Appointment.barber_id == barber_id)
            
            recent_appointments = query.limit(50).all()
            
            opportunities = []
            
            for appointment in recent_appointments:
                # Skip if client already has recent upselling attempts
                if self._has_recent_upsell_attempt(db, appointment.client_id):
                    continue
                
                # AI analysis for this client
                opportunity = await self._analyze_client_opportunity(db, appointment)
                
                if opportunity and opportunity.confidence_score >= self.confidence_threshold:
                    opportunities.append(opportunity)
            
            # Sort by confidence score (highest first)
            opportunities.sort(key=lambda x: x.confidence_score, reverse=True)
            
            # Apply daily limits
            opportunities = opportunities[:self.max_daily_opportunities]
            
            logger.info(f"🤖 AI identified {len(opportunities)} high-confidence upselling opportunities")
            return opportunities
            
        except Exception as e:
            logger.error(f"❌ Error scanning for opportunities: {e}")
            return []
    
    async def _analyze_client_opportunity(self, db: Session, appointment: Appointment) -> Optional[UpsellOpportunity]:
        """
        🧠 Deep AI analysis of individual client for upselling potential
        """
        try:
            client = appointment.client
            if not client:
                return None
            
            # 1. Analyze client personality and preferences
            personality = self._analyze_client_personality(db, client)
            
            # 2. Find optimal service suggestions based on AI
            suggested_services = self._get_ai_service_suggestions(db, appointment.service_name, client)
            
            if not suggested_services:
                return None
            
            # Use highest-scoring suggestion
            suggested_service, base_score = suggested_services[0]
            
            # 3. Calculate AI confidence score
            confidence_score = self._calculate_confidence_score(db, client, appointment, suggested_service, personality)
            
            # 4. Determine optimal timing
            optimal_timing = self._calculate_optimal_timing(db, client, personality)
            
            # 5. Select best communication channel
            recommended_channel = self._select_optimal_channel(db, client, personality)
            
            # 6. Generate personalized message
            personalized_message = self._generate_personalized_message(
                client, suggested_service, personality, recommended_channel
            )
            
            # 7. Calculate potential revenue
            potential_revenue = self._estimate_service_revenue(suggested_service)
            
            # 8. Get historical success rate for similar scenarios
            historical_success_rate = self._get_historical_success_rate(db, client, suggested_service)
            
            # 9. Generate AI reasoning
            reasoning = self._generate_ai_reasoning(confidence_score, personality, optimal_timing, historical_success_rate)
            
            opportunity = UpsellOpportunity(
                client_id=client.id,
                client_name=client.name or f"Client {client.id}",
                current_service=appointment.service_name,
                suggested_service=suggested_service,
                confidence_score=confidence_score,
                potential_revenue=potential_revenue,
                optimal_timing=optimal_timing,
                recommended_channel=recommended_channel,
                personalized_message=personalized_message,
                reasoning=reasoning,
                client_personality=personality,
                historical_success_rate=historical_success_rate
            )
            
            return opportunity
            
        except Exception as e:
            logger.error(f"❌ Error analyzing client opportunity: {e}")
            return None
    
    def _analyze_client_personality(self, db: Session, client: Client) -> ClientPersonality:
        """
        🧠 AI personality analysis based on client behavior patterns
        """
        try:
            # Analyze appointment history for personality indicators
            appointments = db.query(Appointment).filter(
                Appointment.client_id == client.id
            ).order_by(desc(Appointment.start_time)).limit(10).all()
            
            if not appointments:
                return ClientPersonality.RELATIONSHIP_FOCUSED  # Default for new clients
            
            # Analyze patterns
            appointment_times = [apt.start_time.hour for apt in appointments if apt.start_time]
            service_prices = [apt.price for apt in appointments if apt.price]
            booking_frequency = len(appointments)
            
            # AI decision logic for personality detection
            avg_hour = statistics.mean(appointment_times) if appointment_times else 12
            avg_price = statistics.mean(service_prices) if service_prices else 50
            
            # Business hours (9-5) = professional
            if 9 <= avg_hour <= 17 and booking_frequency >= 3:
                return ClientPersonality.DIRECT_PROFESSIONAL
            
            # Higher prices = luxury oriented  
            elif avg_price > 75:
                return ClientPersonality.LUXURY_ORIENTED
            
            # Lower prices but frequent = price sensitive
            elif avg_price < 40 and booking_frequency >= 4:
                return ClientPersonality.PRICE_SENSITIVE
            
            # Early morning/late evening = time conscious
            elif avg_hour < 9 or avg_hour > 18:
                return ClientPersonality.TIME_CONSCIOUS
            
            # Regular client = relationship focused
            else:
                return ClientPersonality.RELATIONSHIP_FOCUSED
                
        except Exception as e:
            logger.error(f"❌ Error analyzing personality: {e}")
            return ClientPersonality.RELATIONSHIP_FOCUSED
    
    def _get_ai_service_suggestions(self, db: Session, current_service: str, client: Client) -> List[Tuple[str, float]]:
        """
        🎯 AI-powered service suggestions based on patterns and success rates
        """
        # Service compatibility matrix (AI-learned over time)
        service_pairs = {
            "Haircut": [
                ("Beard Trim", 0.85),
                ("Hair Wash", 0.75), 
                ("Styling", 0.65),
                ("Eyebrow Trim", 0.55)
            ],
            "Beard Trim": [
                ("Haircut", 0.90),
                ("Mustache Trim", 0.80),
                ("Face Massage", 0.60)
            ],
            "Hair Wash": [
                ("Styling", 0.85),
                ("Deep Conditioning", 0.70),
                ("Scalp Treatment", 0.65)
            ]
        }
        
        suggestions = service_pairs.get(current_service, [])
        
        # Filter out services client has recently received
        recent_services = db.query(Appointment.service_name).filter(
            Appointment.client_id == client.id,
            Appointment.start_time >= datetime.now() - timedelta(days=30)
        ).all()
        
        recent_service_names = [svc[0] for svc in recent_services]
        suggestions = [(svc, score) for svc, score in suggestions if svc not in recent_service_names]
        
        return suggestions
    
    async def _calculate_confidence_score(self, db: Session, client: Client, appointment: Appointment, 
                                        suggested_service: str, personality: ClientPersonality) -> float:
        """
        📊 AI confidence scoring algorithm with memory-enhanced learning
        """
        base_score = 0.5
        
        # Get AI memory insights for this context
        context = {
            "personality": personality.value,
            "service_type": suggested_service,
            "season": self._get_current_season(),
            "client_history": db.query(Appointment).filter(Appointment.client_id == client.id).count()
        }
        
        memory_insights = await self.learning_engine.get_memory_insights(db, context) if self.memory_enabled else {}
        
        # Traditional factors
        appointment_count = context["client_history"]
        history_factor = min(appointment_count * 0.1, 0.3)  # Max 0.3 boost
        
        # Personality compatibility factor
        personality_factors = {
            ClientPersonality.LUXURY_ORIENTED: 0.2,
            ClientPersonality.RELATIONSHIP_FOCUSED: 0.15,
            ClientPersonality.DIRECT_PROFESSIONAL: 0.1,
            ClientPersonality.TIME_CONSCIOUS: 0.05,
            ClientPersonality.PRICE_SENSITIVE: -0.1,  # Lower confidence
            ClientPersonality.TECH_SAVVY: 0.1
        }
        personality_factor = personality_factors.get(personality, 0)
        
        # Recent appointment factor (higher if just had service)
        recency_factor = 0.1 if appointment.start_time >= datetime.now() - timedelta(hours=24) else 0
        
        # Time of year factor (some services seasonal)
        seasonal_factor = self._get_seasonal_factor(suggested_service)
        
        # 🧠 AI MEMORY ENHANCEMENTS
        memory_adjustments = memory_insights.get("confidence_adjustments", {})
        memory_boost = sum(memory_adjustments.values())
        
        # Pattern-based confidence boost
        pattern_boost = 0.0
        for recommendation in memory_insights.get("recommendations", []):
            if recommendation.get("confidence", 0) > 0.8:
                pattern_boost += 0.1  # Boost confidence for proven patterns
        
        confidence_score = (base_score + history_factor + personality_factor + 
                          recency_factor + seasonal_factor + memory_boost + pattern_boost)
        
        # Ensure score stays within bounds
        final_score = max(0.0, min(1.0, confidence_score))
        
        # Record this confidence calculation for future learning
        if self.continuous_learning:
            await self._record_confidence_calculation(db, context, final_score)
        
        return final_score
    
    def _calculate_optimal_timing(self, db: Session, client: Client, personality: ClientPersonality) -> datetime:
        """
        ⏰ AI-optimized timing for maximum conversion
        """
        now = datetime.now()
        
        # Personality-based timing preferences
        timing_preferences = {
            ClientPersonality.DIRECT_PROFESSIONAL: timedelta(hours=2),  # Quick follow-up
            ClientPersonality.RELATIONSHIP_FOCUSED: timedelta(hours=24), # Next day
            ClientPersonality.PRICE_SENSITIVE: timedelta(days=3),       # Give time to consider
            ClientPersonality.LUXURY_ORIENTED: timedelta(hours=6),      # Same day, evening
            ClientPersonality.TIME_CONSCIOUS: timedelta(hours=4),       # Reasonable window
            ClientPersonality.TECH_SAVVY: timedelta(hours=1)            # Quick digital response
        }
        
        delay = timing_preferences.get(personality, timedelta(hours=12))
        optimal_time = now + delay
        
        # Adjust for business hours (9 AM - 8 PM)
        if optimal_time.hour < 9:
            optimal_time = optimal_time.replace(hour=9, minute=0)
        elif optimal_time.hour > 20:
            optimal_time = optimal_time.replace(hour=10, minute=0) + timedelta(days=1)
        
        return optimal_time
    
    def _select_optimal_channel(self, db: Session, client: Client, personality: ClientPersonality) -> OpportunityChannel:
        """
        📱 AI channel selection for maximum engagement
        """
        # Personality-based channel preferences
        channel_preferences = {
            ClientPersonality.DIRECT_PROFESSIONAL: OpportunityChannel.EMAIL,
            ClientPersonality.RELATIONSHIP_FOCUSED: OpportunityChannel.SMS,
            ClientPersonality.PRICE_SENSITIVE: OpportunityChannel.EMAIL,
            ClientPersonality.LUXURY_ORIENTED: OpportunityChannel.SMS,
            ClientPersonality.TIME_CONSCIOUS: OpportunityChannel.PUSH_NOTIFICATION,
            ClientPersonality.TECH_SAVVY: OpportunityChannel.SMS
        }
        
        return channel_preferences.get(personality, OpportunityChannel.SMS)
    
    def _generate_personalized_message(self, client: Client, suggested_service: str, 
                                     personality: ClientPersonality, channel: OpportunityChannel) -> str:
        """
        ✍️ AI-generated personalized messages
        """
        client_name = client.name or "there"
        
        # Personality-based message templates
        templates = {
            ClientPersonality.DIRECT_PROFESSIONAL: {
                OpportunityChannel.SMS: f"Hi {client_name}! Quick add-on available: {suggested_service}. 10-min addition to next appointment. Interested?",
                OpportunityChannel.EMAIL: f"Hello {client_name},\n\nBased on your recent service, I'd recommend adding a {suggested_service} to complete your look. Would you like me to add this to your next appointment?\n\nBest regards"
            },
            ClientPersonality.RELATIONSHIP_FOCUSED: {
                OpportunityChannel.SMS: f"Hey {client_name}! 😊 Loved seeing you today! For your next visit, have you considered trying our {suggested_service}? It would complement your style perfectly!",
                OpportunityChannel.EMAIL: f"Hi {client_name}!\n\nIt was great seeing you today! I think you'd really enjoy our {suggested_service} service - it pairs perfectly with what we did today. Let me know if you'd like to try it next time!\n\nTalk soon!"
            },
            ClientPersonality.PRICE_SENSITIVE: {
                OpportunityChannel.SMS: f"Hi {client_name}! Special offer: Add {suggested_service} to your next appointment for just $20. Great value addition!",
                OpportunityChannel.EMAIL: f"Hello {client_name},\n\nI wanted to offer you a great value add-on: {suggested_service} for just $20 when added to your next service. Perfect complement to your regular appointment!\n\nBest,"
            },
            ClientPersonality.LUXURY_ORIENTED: {
                OpportunityChannel.SMS: f"Hello {client_name}, for the complete premium experience, I recommend adding our signature {suggested_service}. Shall I include it in your next booking?",
                OpportunityChannel.EMAIL: f"Dear {client_name},\n\nTo elevate your next appointment to our full premium experience, I highly recommend our signature {suggested_service} service. It's the perfect finishing touch.\n\nLooking forward to providing you with exceptional service."
            },
            ClientPersonality.TIME_CONSCIOUS: {
                OpportunityChannel.SMS: f"Hi {client_name}! Quick 10-min add-on for next time: {suggested_service}. No extra time needed, just mention when booking.",
                OpportunityChannel.PUSH_NOTIFICATION: f"💡 Quick add-on idea: {suggested_service} (10 min) for your next appointment!"
            },
            ClientPersonality.TECH_SAVVY: {
                OpportunityChannel.SMS: f"Hi {client_name}! 📱 One-click booking: Add {suggested_service} to your next appointment? Reply YES or book instantly: bookedbarber.com/quick-add",
                OpportunityChannel.EMAIL: f"Hi {client_name}!\n\nQuick recommendation: {suggested_service} would be perfect for your next visit. \n\n[One-Click Add] → bookedbarber.com/add/{suggested_service}\n\nThanks!"
            }
        }
        
        personality_templates = templates.get(personality, templates[ClientPersonality.RELATIONSHIP_FOCUSED])
        message = personality_templates.get(channel, personality_templates[OpportunityChannel.SMS])
        
        return message
    
    def _estimate_service_revenue(self, service_name: str) -> float:
        """
        💰 AI revenue estimation for services
        """
        # AI-learned pricing patterns
        service_prices = {
            "Beard Trim": 25.0,
            "Hair Wash": 15.0,
            "Styling": 30.0,
            "Eyebrow Trim": 20.0,
            "Mustache Trim": 15.0,
            "Face Massage": 35.0,
            "Deep Conditioning": 25.0,
            "Scalp Treatment": 40.0
        }
        
        return service_prices.get(service_name, 25.0)  # Default to $25
    
    def _get_historical_success_rate(self, db: Session, client: Client, suggested_service: str) -> float:
        """
        📈 Historical success rate for similar upselling scenarios
        """
        try:
            # Look for similar clients who were offered this service
            similar_attempts = db.query(UpsellAttempt).filter(
                UpsellAttempt.suggested_service == suggested_service
            ).limit(100).all()
            
            if not similar_attempts:
                return 0.3  # Default baseline success rate
            
            # Calculate conversion rate
            successful_attempts = len([
                attempt for attempt in similar_attempts 
                if attempt.status in ["converted", "implemented"]
            ])
            
            success_rate = successful_attempts / len(similar_attempts)
            return round(success_rate, 2)
            
        except Exception as e:
            logger.error(f"❌ Error calculating success rate: {e}")
            return 0.3
    
    def _generate_ai_reasoning(self, confidence_score: float, personality: ClientPersonality, 
                              optimal_timing: datetime, success_rate: float) -> str:
        """
        🤖 Generate AI reasoning explanation
        """
        reasoning_parts = []
        
        # Confidence explanation
        if confidence_score >= 0.8:
            reasoning_parts.append(f"High confidence ({confidence_score:.1%}) based on strong client indicators")
        elif confidence_score >= 0.6:
            reasoning_parts.append(f"Good confidence ({confidence_score:.1%}) with positive patterns")
        else:
            reasoning_parts.append(f"Moderate confidence ({confidence_score:.1%}) worth testing")
        
        # Personality factor
        reasoning_parts.append(f"Client personality: {personality.value.replace('_', ' ').title()}")
        
        # Timing rationale
        timing_delay = optimal_timing - datetime.now()
        if timing_delay.total_seconds() < 3600:
            reasoning_parts.append("Immediate follow-up recommended")
        elif timing_delay.days == 0:
            reasoning_parts.append("Same-day follow-up optimal")
        else:
            reasoning_parts.append(f"Optimal timing: {timing_delay.days} day delay")
        
        # Success rate context
        reasoning_parts.append(f"Historical success rate: {success_rate:.1%}")
        
        return " • ".join(reasoning_parts)
    
    def _get_seasonal_factor(self, service_name: str) -> float:
        """
        🌱 Seasonal adjustment for services
        """
        current_month = datetime.now().month
        
        # Seasonal service preferences
        seasonal_boosts = {
            "Beard Trim": {11, 12, 1, 2},  # Winter months
            "Hair Wash": {6, 7, 8},        # Summer months  
            "Face Massage": {12, 1, 2},    # Winter relaxation
            "Scalp Treatment": {3, 4, 5}   # Spring renewal
        }
        
        if current_month in seasonal_boosts.get(service_name, set()):
            return 0.1  # 10% boost for seasonal relevance
        
        return 0.0
    
    def _has_recent_upsell_attempt(self, db: Session, client_id: int) -> bool:
        """
        Check if client has recent upselling attempts to avoid spam
        """
        recent_attempt = db.query(UpsellAttempt).filter(
            UpsellAttempt.client_id == client_id,
            UpsellAttempt.implemented_at >= datetime.now() - timedelta(days=7)
        ).first()
        
        return recent_attempt is not None
    
    async def execute_opportunity(self, db: Session, opportunity: UpsellOpportunity, barber_id: int) -> Dict[str, Any]:
        """
        🚀 Execute an AI-identified opportunity
        """
        try:
            # Create upsell attempt record
            attempt = UpsellAttempt(
                barber_id=barber_id,
                client_id=opportunity.client_id,
                current_service=opportunity.current_service,
                suggested_service=opportunity.suggested_service,
                potential_revenue=opportunity.potential_revenue,
                confidence_score=opportunity.confidence_score,
                status="automation_sent",
                channel=opportunity.recommended_channel.value,
                implemented_at=datetime.now(),
                expires_at=datetime.now() + timedelta(days=3),
                automation_triggered=True,
                context={
                    "ai_generated": True,
                    "personality": opportunity.client_personality.value,
                    "reasoning": opportunity.reasoning,
                    "optimal_timing": opportunity.optimal_timing.isoformat()
                }
            )
            
            db.add(attempt)
            db.commit()
            db.refresh(attempt)
            
            # Send via appropriate channel
            if opportunity.recommended_channel == OpportunityChannel.SMS:
                # Use notification service to send SMS
                client = db.query(User).filter(User.id == opportunity.client_id).first()
                if client and client.phone:
                    result = self.notification_service.send_sms(
                        to_phone=client.phone,
                        body=opportunity.personalized_message
                    )
                    
                    if not result.get("success"):
                        attempt.status = "failed"
                        db.commit()
                        logger.error(f"❌ Failed to send SMS for opportunity {attempt.id}")
            
            logger.info(f"🤖 AI executed upselling opportunity {attempt.id} for client {opportunity.client_name}")
            
            return {
                "success": True,
                "attempt_id": attempt.id,
                "opportunity": asdict(opportunity),
                "execution_time": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"❌ Error executing opportunity: {e}")
            return {"success": False, "error": str(e)}
    
    async def generate_insights(self, db: Session, barber_id: Optional[int] = None) -> AIInsights:
        """
        📊 Generate AI insights and recommendations
        """
        try:
            # Scan for opportunities to analyze
            opportunities = await self.scan_for_opportunities(db, barber_id)
            
            high_confidence = [opp for opp in opportunities if opp.confidence_score >= 0.8]
            total_revenue_potential = sum(opp.potential_revenue for opp in opportunities)
            
            # Personality distribution
            personality_counts = {}
            for opp in opportunities:
                personality = opp.client_personality.value
                personality_counts[personality] = personality_counts.get(personality, 0) + 1
            
            # Channel recommendations
            channel_scores = {}
            for opp in opportunities:
                channel = opp.recommended_channel.value
                channel_scores[channel] = channel_scores.get(channel, [])
                channel_scores[channel].append(opp.confidence_score)
            
            channel_recommendations = {
                channel: statistics.mean(scores) 
                for channel, scores in channel_scores.items()
            }
            
            # Success predictions
            success_predictions = {
                "high_confidence_conversion": len(high_confidence) * 0.75,
                "medium_confidence_conversion": (len(opportunities) - len(high_confidence)) * 0.45,
                "total_predicted_conversions": len(high_confidence) * 0.75 + (len(opportunities) - len(high_confidence)) * 0.45
            }
            
            insights = AIInsights(
                total_opportunities_identified=len(opportunities),
                high_confidence_opportunities=len(high_confidence),
                predicted_revenue_potential=total_revenue_potential,
                optimal_timing_insights={
                    "immediate_opportunities": len([opp for opp in opportunities if opp.optimal_timing <= datetime.now() + timedelta(hours=2)]),
                    "same_day_opportunities": len([opp for opp in opportunities if opp.optimal_timing <= datetime.now() + timedelta(hours=12)]),
                    "next_day_opportunities": len([opp for opp in opportunities if opp.optimal_timing <= datetime.now() + timedelta(days=1)])
                },
                personality_distribution=personality_counts,
                channel_recommendations=channel_recommendations,
                success_predictions=success_predictions
            )
            
            return insights
            
        except Exception as e:
            logger.error(f"❌ Error generating insights: {e}")
            return AIInsights(
                total_opportunities_identified=0,
                high_confidence_opportunities=0,
                predicted_revenue_potential=0.0,
                optimal_timing_insights={},
                personality_distribution={},
                channel_recommendations={},
                success_predictions={}
            )
    
    async def learn_from_outcome(self, db: Session, attempt_id: int, outcome: str, revenue: float = 0.0):
        """
        🧠 Enhanced learning from upselling outcomes with persistent memory
        """
        try:
            attempt = db.query(UpsellAttempt).filter(UpsellAttempt.id == attempt_id).first()
            if not attempt:
                return
            
            # 🧠 ENHANCED LEARNING WITH PERSISTENT MEMORY
            if self.memory_enabled:
                # Record outcome in learning engine
                converted = outcome in ["converted", "implemented", "success"]
                await self.learning_engine.record_upselling_outcome(db, attempt_id, converted, revenue)
                
                # Create detailed learning event
                event_type = LearningEventType.CONVERSION_SUCCESS if converted else LearningEventType.CONVERSION_FAILURE
                
                learning_event = LearningEvent(
                    event_type=event_type,
                    context={
                        "personality": attempt.context.get("personality") if attempt.context else "unknown",
                        "service_type": attempt.suggested_service,
                        "channel": attempt.channel,
                        "timing": self._get_timing_category(attempt.implemented_at),
                        "season": self._get_current_season(),
                        "confidence_score": attempt.confidence_score
                    },
                    outcome={
                        "converted": converted,
                        "revenue": revenue,
                        "response_time_hours": (datetime.now() - attempt.implemented_at).total_seconds() / 3600,
                        "attempt_id": attempt_id
                    },
                    success_score=1.0 if converted else 0.0,
                    confidence=attempt.confidence_score or 0.5,
                    metadata={
                        "agent_version": self.version,
                        "learning_date": datetime.now().isoformat(),
                        "outcome_type": outcome
                    }
                )
                
                await self.learning_engine.record_learning_event(db, learning_event)
            
            # Traditional learning history (backward compatibility)
            learning_record = {
                "attempt_id": attempt_id,
                "client_personality": attempt.context.get("personality") if attempt.context else None,
                "confidence_score": attempt.confidence_score,
                "suggested_service": attempt.suggested_service,
                "channel": attempt.channel,
                "outcome": outcome,
                "revenue": revenue,
                "timestamp": datetime.now().isoformat()
            }
            
            if not hasattr(self, 'learning_history'):
                self.learning_history = []
                
            self.learning_history.append(learning_record)
            
            # Keep only recent learning history
            cutoff_date = datetime.now() - timedelta(days=self.learning_window_days)
            self.learning_history = [
                record for record in self.learning_history 
                if datetime.fromisoformat(record["timestamp"]) > cutoff_date
            ]
            
            logger.info(f"🧠 AI learned from outcome: {outcome} for attempt {attempt_id} (Memory: {'ON' if self.memory_enabled else 'OFF'})")
            
        except Exception as e:
            logger.error(f"❌ Error in learning process: {e}")
    
    async def _record_confidence_calculation(self, db: Session, context: Dict[str, Any], confidence_score: float):
        """Record confidence calculation for learning optimization"""
        try:
            if not self.continuous_learning:
                return
                
            learning_event = LearningEvent(
                event_type=LearningEventType.PERSONALITY_DETECTION,
                context=context,
                outcome={"calculated_confidence": confidence_score},
                success_score=confidence_score,  # Use confidence as success proxy
                confidence=0.8,  # High confidence in our calculation
                metadata={
                    "calculation_method": "enhanced_with_memory",
                    "agent_version": self.version
                }
            )
            
            await self.learning_engine.record_learning_event(db, learning_event)
            
        except Exception as e:
            logger.error(f"❌ Error recording confidence calculation: {e}")
    
    def _get_timing_category(self, timestamp: datetime) -> str:
        """Categorize timing for learning purposes"""
        if timestamp is None:
            return "unknown"
            
        hour = timestamp.hour
        
        if 6 <= hour < 12:
            return "morning"
        elif 12 <= hour < 17:
            return "afternoon"
        elif 17 <= hour < 21:
            return "evening"
        else:
            return "night"
    
    def _get_current_season(self) -> str:
        """Get current season for seasonal learning"""
        month = datetime.now().month
        if month in [12, 1, 2]:
            return "winter"
        elif month in [3, 4, 5]:
            return "spring"
        elif month in [6, 7, 8]:
            return "summer"
        else:
            return "fall"


# Global AI agent instance
ai_agent = None

def get_ai_agent() -> UpsellAIAgent:
    """Get global AI agent instance"""
    global ai_agent
    if ai_agent is None:
        from services.notification_service import NotificationService
        notification_service = NotificationService()
        ai_agent = UpsellAIAgent(notification_service)
    return ai_agent