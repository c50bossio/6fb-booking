"""
Business Intelligence Agent Service for 6FB Booking V2

This service manages AI agents specialized in business coaching and intelligence
for barbershop operations using the Six Figure Barber methodology.
"""

import json
import logging
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc, func

from models import User, Appointment
from models.business_intelligence_agents import (
    BusinessIntelligenceAgent, BusinessCoachingSession, BusinessInsight,
    SixFigureBarberPrincipleTracking, CoachingActionItem,
    BusinessIntelligenceAgentType, CoachingSessionType, InsightPriority,
    CoachingStatus
)
from services.business_calendar_metadata_service import BusinessCalendarMetadataService

logger = logging.getLogger(__name__)


class BusinessIntelligenceAgentService:
    """Service for managing business intelligence agents and coaching sessions."""
    
    def __init__(self, db: Session):
        self.db = db
        self.logger = logging.getLogger(__name__)
        self.business_calendar_service = BusinessCalendarMetadataService(db)
    
    def initialize_default_agents(self) -> List[BusinessIntelligenceAgent]:
        """Initialize the default set of business intelligence agents."""
        try:
            default_agents = [
                {
                    "name": "Marcus - Financial Coach",
                    "agent_type": BusinessIntelligenceAgentType.FINANCIAL_COACH,
                    "display_name": "Marcus",
                    "description": "Expert in revenue optimization, pricing strategies, and financial growth for barbershops",
                    "coaching_style": "analytical",
                    "personality_traits": ["data-driven", "practical", "results-focused"],
                    "expertise_areas": ["pricing_optimization", "revenue_forecasting", "profit_margins"],
                    "six_fb_focus_areas": ["pricing_excellence", "business_efficiency"],
                    "system_prompt": """
                        You are Marcus, a seasoned financial coach specializing in barbershop business optimization.
                        Your expertise lies in helping barbers maximize revenue through strategic pricing, 
                        efficient operations, and smart financial decisions. You use data-driven insights 
                        to identify opportunities for growth while maintaining the highest service standards.
                        
                        Always focus on:
                        - Premium pricing strategies that reflect service value
                        - Revenue per client optimization
                        - Cost efficiency without compromising quality
                        - Six Figure Barber methodology compliance
                        - Practical, actionable financial advice
                        
                        Your tone is professional but approachable, always backing recommendations with data.
                    """,
                    "trigger_conditions": {
                        "low_average_price": 60,
                        "low_revenue_growth": -5,
                        "low_profit_margin": 0.4
                    }
                },
                {
                    "name": "Sofia - Growth Strategist",
                    "agent_type": BusinessIntelligenceAgentType.GROWTH_STRATEGIST,
                    "display_name": "Sofia",
                    "description": "Specialist in client acquisition, retention strategies, and sustainable business growth",
                    "coaching_style": "motivational",
                    "personality_traits": ["encouraging", "strategic", "innovative"],
                    "expertise_areas": ["client_retention", "marketing_strategy", "business_scaling"],
                    "six_fb_focus_areas": ["client_experience", "professional_growth"],
                    "system_prompt": """
                        You are Sofia, an energetic growth strategist who helps barbershops build thriving, 
                        sustainable businesses. Your passion is turning good barbers into business owners 
                        who consistently attract and retain high-value clients.
                        
                        Your approach focuses on:
                        - Building lasting client relationships
                        - Creating premium service experiences
                        - Developing effective marketing strategies
                        - Scaling operations sustainably
                        - Personal brand development
                        
                        You're enthusiastic and supportive, always seeing the potential for growth 
                        while providing concrete steps to achieve ambitious goals.
                    """,
                    "trigger_conditions": {
                        "low_retention_rate": 60,
                        "high_new_client_ratio": 0.6,
                        "low_referral_rate": 0.2
                    }
                },
                {
                    "name": "Alex - Operations Optimizer",
                    "agent_type": BusinessIntelligenceAgentType.OPERATIONS_OPTIMIZER,
                    "display_name": "Alex",
                    "description": "Expert in scheduling efficiency, workflow optimization, and operational excellence",
                    "coaching_style": "direct",
                    "personality_traits": ["systematic", "efficient", "detail-oriented"],
                    "expertise_areas": ["schedule_optimization", "workflow_efficiency", "time_management"],
                    "six_fb_focus_areas": ["business_efficiency", "service_excellence"],
                    "system_prompt": """
                        You are Alex, a no-nonsense operations expert who helps barbershops run like 
                        well-oiled machines. Your specialty is identifying inefficiencies and creating 
                        systems that maximize productivity while maintaining service quality.
                        
                        You focus on:
                        - Optimal scheduling and time management
                        - Streamlined service workflows
                        - Resource allocation and utilization
                        - Reducing waste and downtime
                        - Creating systematic processes
                        
                        Your approach is direct and practical, always providing specific, 
                        implementable solutions to operational challenges.
                    """,
                    "trigger_conditions": {
                        "low_utilization_rate": 70,
                        "high_service_duration": 75,
                        "poor_schedule_efficiency": 0.6
                    }
                },
                {
                    "name": "Isabella - Brand Developer",
                    "agent_type": BusinessIntelligenceAgentType.BRAND_DEVELOPER,
                    "display_name": "Isabella",
                    "description": "Creative strategist for premium branding, service positioning, and customer experience",
                    "coaching_style": "supportive",
                    "personality_traits": ["creative", "empathetic", "brand-focused"],
                    "expertise_areas": ["brand_development", "customer_experience", "service_positioning"],
                    "six_fb_focus_areas": ["service_excellence", "client_experience"],
                    "system_prompt": """
                        You are Isabella, a creative brand strategist who helps barbershops develop 
                        distinctive, premium brands that attract ideal clients and command top prices.
                        You understand that great barbering is an art, and you help barbers position 
                        themselves as the premium choice in their market.
                        
                        Your expertise includes:
                        - Crafting compelling brand narratives
                        - Elevating customer experience
                        - Premium service positioning
                        - Creating memorable client interactions
                        - Building brand loyalty and advocacy
                        
                        You're creative and inspiring, helping barbers see their business as more 
                        than just cutting hair – it's about creating exceptional experiences.
                    """,
                    "trigger_conditions": {
                        "low_premium_service_ratio": 0.3,
                        "low_client_satisfaction": 4.0,
                        "weak_brand_differentiation": True
                    }
                }
            ]
            
            created_agents = []
            for agent_data in default_agents:
                # Check if agent already exists
                existing_agent = self.db.query(BusinessIntelligenceAgent).filter(
                    BusinessIntelligenceAgent.agent_type == agent_data["agent_type"]
                ).first()
                
                if not existing_agent:
                    agent = BusinessIntelligenceAgent(**agent_data)
                    self.db.add(agent)
                    created_agents.append(agent)
            
            self.db.commit()
            self.logger.info(f"Initialized {len(created_agents)} default business intelligence agents")
            return created_agents
            
        except Exception as e:
            self.logger.error(f"Error initializing default agents: {str(e)}")
            self.db.rollback()
            return []
    
    def analyze_business_metrics_and_trigger_coaching(
        self, 
        user: User,
        days_back: int = 30
    ) -> List[BusinessCoachingSession]:
        """Analyze business metrics and trigger appropriate coaching sessions."""
        try:
            # Get business insights
            insights = self.business_calendar_service.get_business_insights(user.id, days_back)
            
            if not insights:
                return []
            
            triggered_sessions = []
            
            # Get active agents
            agents = self.db.query(BusinessIntelligenceAgent).filter(
                BusinessIntelligenceAgent.is_active == True
            ).all()
            
            for agent in agents:
                should_trigger, context = self._should_trigger_coaching(agent, insights, user)
                
                if should_trigger:
                    session = self._create_coaching_session(agent, user, context, insights)
                    if session:
                        triggered_sessions.append(session)
            
            return triggered_sessions
            
        except Exception as e:
            self.logger.error(f"Error analyzing metrics and triggering coaching: {str(e)}")
            return []
    
    def create_business_insight(
        self,
        user_id: int,
        title: str,
        description: str,
        category: str,
        priority: InsightPriority,
        data_source: str,
        analysis_period_days: int = 30,
        recommended_actions: List[str] = None,
        agent_id: Optional[int] = None
    ) -> Optional[BusinessInsight]:
        """Create a new business insight."""
        try:
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=analysis_period_days)
            
            insight = BusinessInsight(
                user_id=user_id,
                agent_id=agent_id,
                title=title,
                description=description,
                insight_category=category,
                priority=priority,
                data_source=data_source,
                analysis_period_start=start_date,
                analysis_period_end=end_date,
                recommended_actions=recommended_actions or []
            )
            
            self.db.add(insight)
            self.db.commit()
            
            self.logger.info(f"Created business insight for user {user_id}: {title}")
            return insight
            
        except Exception as e:
            self.logger.error(f"Error creating business insight: {str(e)}")
            self.db.rollback()
            return None
    
    def get_coaching_dashboard_data(self, user_id: int) -> Dict[str, Any]:
        """Get comprehensive coaching dashboard data for a user."""
        try:
            # Get active coaching sessions
            active_sessions = self.db.query(BusinessCoachingSession).filter(
                and_(
                    BusinessCoachingSession.user_id == user_id,
                    BusinessCoachingSession.status.in_([
                        CoachingStatus.SCHEDULED,
                        CoachingStatus.IN_PROGRESS,
                        CoachingStatus.FOLLOW_UP_REQUIRED
                    ])
                )
            ).all()
            
            # Get recent insights
            recent_insights = self.db.query(BusinessInsight).filter(
                BusinessInsight.user_id == user_id
            ).order_by(desc(BusinessInsight.created_at)).limit(10).all()
            
            # Get Six Figure Barber compliance tracking
            latest_compliance = self.db.query(SixFigureBarberPrincipleTracking).filter(
                SixFigureBarberPrincipleTracking.user_id == user_id
            ).order_by(desc(SixFigureBarberPrincipleTracking.created_at)).first()
            
            # Get pending action items
            pending_actions = self.db.query(CoachingActionItem).filter(
                and_(
                    CoachingActionItem.user_id == user_id,
                    CoachingActionItem.status.in_(["pending", "in_progress"])
                )
            ).order_by(CoachingActionItem.priority.desc()).all()
            
            # Calculate coaching statistics
            total_sessions = self.db.query(BusinessCoachingSession).filter(
                BusinessCoachingSession.user_id == user_id
            ).count()
            
            completed_sessions = self.db.query(BusinessCoachingSession).filter(
                and_(
                    BusinessCoachingSession.user_id == user_id,
                    BusinessCoachingSession.status == CoachingStatus.COMPLETED
                )
            ).count()
            
            # Get available agents
            available_agents = self.db.query(BusinessIntelligenceAgent).filter(
                BusinessIntelligenceAgent.is_active == True
            ).all()
            
            return {
                "active_sessions": [
                    {
                        "id": session.id,
                        "agent_name": session.agent.display_name,
                        "agent_type": session.agent.agent_type.value,
                        "session_type": session.session_type.value,
                        "title": session.title,
                        "status": session.status.value,
                        "completion_percentage": session.completion_percentage,
                        "last_interaction": session.last_interaction_at.isoformat() if session.last_interaction_at else None,
                        "next_session_date": session.next_session_date.isoformat() if session.next_session_date else None
                    }
                    for session in active_sessions
                ],
                "recent_insights": [
                    {
                        "id": insight.id,
                        "title": insight.title,
                        "description": insight.description[:200] + "..." if len(insight.description) > 200 else insight.description,
                        "category": insight.insight_category,
                        "priority": insight.priority.value,
                        "created_at": insight.created_at.isoformat(),
                        "is_actionable": insight.is_actionable,
                        "has_been_acted_on": insight.has_been_acted_on
                    }
                    for insight in recent_insights
                ],
                "compliance_tracking": {
                    "overall_score": latest_compliance.overall_compliance_score if latest_compliance else 0,
                    "grade": latest_compliance.compliance_grade if latest_compliance else "N/A",
                    "pricing_score": latest_compliance.pricing_excellence_score if latest_compliance else 0,
                    "service_score": latest_compliance.service_excellence_score if latest_compliance else 0,
                    "client_experience_score": latest_compliance.client_experience_score if latest_compliance else 0,
                    "last_updated": latest_compliance.updated_at.isoformat() if latest_compliance else None
                } if latest_compliance else None,
                "pending_actions": [
                    {
                        "id": action.id,
                        "title": action.title,
                        "category": action.category,
                        "priority": action.priority.value,
                        "status": action.status,
                        "progress": action.progress_percentage,
                        "deadline": action.implementation_deadline.isoformat() if action.implementation_deadline else None,
                        "estimated_effort": action.estimated_effort_hours,
                        "expected_roi": action.expected_roi
                    }
                    for action in pending_actions
                ],
                "statistics": {
                    "total_coaching_sessions": total_sessions,
                    "completed_sessions": completed_sessions,
                    "completion_rate": (completed_sessions / total_sessions * 100) if total_sessions > 0 else 0,
                    "active_insights": len([i for i in recent_insights if i.is_actionable and not i.has_been_acted_on]),
                    "pending_action_items": len(pending_actions)
                },
                "available_agents": [
                    {
                        "id": agent.id,
                        "name": agent.display_name,
                        "type": agent.agent_type.value,
                        "description": agent.description,
                        "expertise_areas": agent.expertise_areas,
                        "coaching_style": agent.coaching_style
                    }
                    for agent in available_agents
                ]
            }
            
        except Exception as e:
            self.logger.error(f"Error getting coaching dashboard data: {str(e)}")
            return {}
    
    def start_coaching_session_with_agent(
        self,
        user_id: int,
        agent_id: int,
        session_type: CoachingSessionType,
        business_context: Dict[str, Any] = None
    ) -> Optional[BusinessCoachingSession]:
        """Start a new coaching session with a specific agent."""
        try:
            agent = self.db.query(BusinessIntelligenceAgent).filter(
                BusinessIntelligenceAgent.id == agent_id
            ).first()
            
            if not agent or not agent.is_active:
                self.logger.warning(f"Agent {agent_id} not found or inactive")
                return None
            
            # Create coaching session
            session = BusinessCoachingSession(
                agent_id=agent_id,
                user_id=user_id,
                session_type=session_type,
                title=f"{session_type.value.replace('_', ' ').title()} with {agent.display_name}",
                description=f"Coaching session focused on {session_type.value.replace('_', ' ')}",
                business_context=business_context or {},
                status=CoachingStatus.SCHEDULED
            )
            
            self.db.add(session)
            self.db.commit()
            
            self.logger.info(f"Started coaching session {session.id} with agent {agent.display_name}")
            return session
            
        except Exception as e:
            self.logger.error(f"Error starting coaching session: {str(e)}")
            self.db.rollback()
            return None
    
    def update_six_figure_barber_compliance(self, user_id: int) -> Optional[SixFigureBarberPrincipleTracking]:
        """Calculate and update Six Figure Barber methodology compliance."""
        try:
            # Get recent business data
            insights = self.business_calendar_service.get_business_insights(user_id, 30)
            
            if not insights:
                return None
            
            # Calculate compliance scores
            pricing_score = self._calculate_pricing_excellence_score(insights)
            service_score = self._calculate_service_excellence_score(insights)
            client_score = self._calculate_client_experience_score(insights)
            efficiency_score = self._calculate_business_efficiency_score(insights)
            growth_score = self._calculate_professional_growth_score(insights)
            
            # Calculate overall compliance
            overall_score = (pricing_score + service_score + client_score + efficiency_score + growth_score) / 5
            grade = self._calculate_compliance_grade(overall_score)
            
            # Create tracking record
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=30)
            
            tracking = SixFigureBarberPrincipleTracking(
                user_id=user_id,
                tracking_period_start=start_date,
                tracking_period_end=end_date,
                pricing_excellence_score=pricing_score,
                service_excellence_score=service_score,
                client_experience_score=client_score,
                business_efficiency_score=efficiency_score,
                professional_growth_score=growth_score,
                overall_compliance_score=overall_score,
                compliance_grade=grade,
                average_service_price=insights.get('average_service_price', 0),
                client_retention_rate=insights.get('client_retention_metrics', {}).get('retention_rate', 0),
                premium_service_ratio=insights.get('service_tier_distribution', {}).get('premium', 0) / insights.get('total_appointments', 1),
                booking_efficiency_score=insights.get('calendar_insights', {}).get('schedule_efficiency_score', 0)
            )
            
            self.db.add(tracking)
            self.db.commit()
            
            self.logger.info(f"Updated Six Figure Barber compliance for user {user_id}: {overall_score:.1f}% ({grade})")
            return tracking
            
        except Exception as e:
            self.logger.error(f"Error updating Six Figure Barber compliance: {str(e)}")
            self.db.rollback()
            return None
    
    # Private helper methods
    
    def _should_trigger_coaching(
        self, 
        agent: BusinessIntelligenceAgent, 
        insights: Dict[str, Any], 
        user: User
    ) -> tuple[bool, Dict[str, Any]]:
        """Determine if coaching should be triggered for a specific agent."""
        try:
            trigger_conditions = agent.trigger_conditions or {}
            context = {}
            
            # Check conditions based on agent type
            if agent.agent_type == BusinessIntelligenceAgentType.FINANCIAL_COACH:
                avg_price = insights.get('average_service_price', 0)
                if avg_price < trigger_conditions.get('low_average_price', 60):
                    context['trigger_reason'] = 'low_average_pricing'
                    context['current_avg_price'] = avg_price
                    context['target_price'] = trigger_conditions.get('low_average_price', 60)
                    return True, context
            
            elif agent.agent_type == BusinessIntelligenceAgentType.GROWTH_STRATEGIST:
                retention_rate = insights.get('client_retention_metrics', {}).get('retention_rate', 0)
                if retention_rate < trigger_conditions.get('low_retention_rate', 60):
                    context['trigger_reason'] = 'low_client_retention'
                    context['current_retention_rate'] = retention_rate
                    context['target_retention_rate'] = trigger_conditions.get('low_retention_rate', 60)
                    return True, context
            
            elif agent.agent_type == BusinessIntelligenceAgentType.OPERATIONS_OPTIMIZER:
                utilization_rate = insights.get('calendar_insights', {}).get('calendar_utilization_rate', 0)
                if utilization_rate < trigger_conditions.get('low_utilization_rate', 70):
                    context['trigger_reason'] = 'low_calendar_utilization'
                    context['current_utilization'] = utilization_rate
                    context['target_utilization'] = trigger_conditions.get('low_utilization_rate', 70)
                    return True, context
            
            elif agent.agent_type == BusinessIntelligenceAgentType.BRAND_DEVELOPER:
                tier_dist = insights.get('service_tier_distribution', {})
                total_services = sum(tier_dist.values()) if tier_dist else 1
                premium_ratio = tier_dist.get('premium', 0) / total_services
                
                if premium_ratio < trigger_conditions.get('low_premium_service_ratio', 0.3):
                    context['trigger_reason'] = 'low_premium_service_ratio'
                    context['current_premium_ratio'] = premium_ratio
                    context['target_premium_ratio'] = trigger_conditions.get('low_premium_service_ratio', 0.3)
                    return True, context
            
            return False, {}
            
        except Exception as e:
            self.logger.error(f"Error checking trigger conditions for agent {agent.id}: {str(e)}")
            return False, {}
    
    def _create_coaching_session(
        self,
        agent: BusinessIntelligenceAgent,
        user: User,
        context: Dict[str, Any],
        insights: Dict[str, Any]
    ) -> Optional[BusinessCoachingSession]:
        """Create a coaching session based on triggered conditions."""
        try:
            # Determine session type based on trigger reason
            session_type_map = {
                'low_average_pricing': CoachingSessionType.PRICING_OPTIMIZATION,
                'low_client_retention': CoachingSessionType.CLIENT_RETENTION_STRATEGY,
                'low_calendar_utilization': CoachingSessionType.SCHEDULING_EFFICIENCY,
                'low_premium_service_ratio': CoachingSessionType.SERVICE_MIX_OPTIMIZATION
            }
            
            session_type = session_type_map.get(
                context.get('trigger_reason'),
                CoachingSessionType.BUSINESS_ANALYTICS
            )
            
            # Check if there's already an active session of this type
            existing_session = self.db.query(BusinessCoachingSession).filter(
                and_(
                    BusinessCoachingSession.user_id == user.id,
                    BusinessCoachingSession.agent_id == agent.id,
                    BusinessCoachingSession.session_type == session_type,
                    BusinessCoachingSession.status.in_([
                        CoachingStatus.SCHEDULED,
                        CoachingStatus.IN_PROGRESS
                    ])
                )
            ).first()
            
            if existing_session:
                self.logger.info(f"Coaching session already exists for user {user.id} and agent {agent.id}")
                return existing_session
            
            # Create new session
            session = BusinessCoachingSession(
                agent_id=agent.id,
                user_id=user.id,
                session_type=session_type,
                title=f"{session_type.value.replace('_', ' ').title()} with {agent.display_name}",
                description=f"AI coaching session to address {context.get('trigger_reason', 'business optimization')}",
                business_context={
                    **context,
                    'insights_summary': insights,
                    'triggered_at': datetime.utcnow().isoformat()
                },
                status=CoachingStatus.SCHEDULED
            )
            
            self.db.add(session)
            self.db.commit()
            
            self.logger.info(f"Created coaching session {session.id} for user {user.id} with agent {agent.display_name}")
            return session
            
        except Exception as e:
            self.logger.error(f"Error creating coaching session: {str(e)}")
            self.db.rollback()
            return None
    
    def _calculate_pricing_excellence_score(self, insights: Dict[str, Any]) -> float:
        """Calculate pricing excellence score based on Six Figure Barber standards."""
        avg_price = insights.get('average_service_price', 0)
        
        # Six Figure Barber pricing targets
        if avg_price >= 100:
            return 100.0
        elif avg_price >= 80:
            return 85.0
        elif avg_price >= 60:
            return 70.0
        elif avg_price >= 45:
            return 50.0
        else:
            return 25.0
    
    def _calculate_service_excellence_score(self, insights: Dict[str, Any]) -> float:
        """Calculate service excellence score."""
        # This would typically include service quality metrics, client feedback, etc.
        # For now, use service tier distribution as a proxy
        tier_dist = insights.get('service_tier_distribution', {})
        total = sum(tier_dist.values()) if tier_dist else 1
        
        luxury_ratio = tier_dist.get('luxury', 0) / total
        premium_ratio = tier_dist.get('premium', 0) / total
        
        return min(100.0, (luxury_ratio * 100 + premium_ratio * 70) * 1.5)
    
    def _calculate_client_experience_score(self, insights: Dict[str, Any]) -> float:
        """Calculate client experience score."""
        retention_metrics = insights.get('client_retention_metrics', {})
        retention_rate = retention_metrics.get('retention_rate', 0)
        
        if retention_rate >= 85:
            return 100.0
        elif retention_rate >= 75:
            return 85.0
        elif retention_rate >= 65:
            return 70.0
        elif retention_rate >= 50:
            return 50.0
        else:
            return 25.0
    
    def _calculate_business_efficiency_score(self, insights: Dict[str, Any]) -> float:
        """Calculate business efficiency score."""
        calendar_insights = insights.get('calendar_insights', {})
        utilization_rate = calendar_insights.get('calendar_utilization_rate', 0)
        
        if utilization_rate >= 85:
            return 100.0
        elif utilization_rate >= 75:
            return 85.0
        elif utilization_rate >= 65:
            return 70.0
        elif utilization_rate >= 50:
            return 50.0
        else:
            return 25.0
    
    def _calculate_professional_growth_score(self, insights: Dict[str, Any]) -> float:
        """Calculate professional growth score."""
        # This would typically include education, skill development metrics
        # For now, use revenue growth as a proxy
        revenue_trends = insights.get('revenue_trends', {})
        growth_rate = revenue_trends.get('growth_rate', 0)
        
        if growth_rate >= 20:
            return 100.0
        elif growth_rate >= 10:
            return 85.0
        elif growth_rate >= 5:
            return 70.0
        elif growth_rate >= 0:
            return 50.0
        else:
            return 25.0
    
    def _calculate_compliance_grade(self, score: float) -> str:
        """Calculate letter grade from compliance score."""
        if score >= 95:
            return 'A+'
        elif score >= 90:
            return 'A'
        elif score >= 85:
            return 'B+'
        elif score >= 80:
            return 'B'
        elif score >= 75:
            return 'C+'
        elif score >= 70:
            return 'C'
        else:
            return 'D'