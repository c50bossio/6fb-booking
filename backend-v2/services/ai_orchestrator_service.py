"""
AI Orchestrator Service for 6FB Booking V2
Central coordinator for all AI agents and business intelligence system.

This service manages the unified AI dashboard experience by:
- Routing conversations to appropriate AI agents
- Maintaining conversation context across agents
- Coordinating multi-agent responses
- Learning from business data and user interactions
"""

import json
import logging
import asyncio
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any, Union
from uuid import uuid4
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc, func

from models import User, Appointment, Client, Payment
from models.business_intelligence_agents import (
    BusinessIntelligenceAgent, BusinessCoachingSession, BusinessInsight,
    SixFigureBarberPrincipleTracking, CoachingActionItem,
    BusinessIntelligenceAgentType, CoachingSessionType, InsightPriority,
    CoachingStatus
)
from services.business_intelligence_agent_service import BusinessIntelligenceAgentService
from services.business_calendar_metadata_service import BusinessCalendarMetadataService
from services.ai_memory_service import AIMemoryService

logger = logging.getLogger(__name__)


class ConversationContext:
    """Manages conversation state and context across AI agents"""
    
    def __init__(self, user_id: str):
        self.user_id = user_id
        self.conversation_id = str(uuid4())
        self.messages = []
        self.active_agents = set()
        self.business_context = {}
        self.strategy_tracking = {}
        self.created_at = datetime.now()
        self.last_updated = datetime.now()
    
    def add_message(self, message_type: str, content: str, agent_id: Optional[str] = None):
        """Add a message to the conversation history"""
        message = {
            'id': str(uuid4()),
            'type': message_type,  # 'user' or 'agent'
            'content': content,
            'agent_id': agent_id,
            'timestamp': datetime.now().isoformat(),
            'metadata': {}
        }
        self.messages.append(message)
        self.last_updated = datetime.now()
        return message
    
    def get_recent_context(self, limit: int = 10) -> List[Dict]:
        """Get recent conversation messages for context"""
        return self.messages[-limit:] if self.messages else []
    
    def update_business_context(self, context_data: Dict):
        """Update business context with new data"""
        self.business_context.update(context_data)
        self.last_updated = datetime.now()


class AIResponse:
    """Structured response from AI agents"""
    
    def __init__(self, content: str, agent_id: str, suggestions: List[str] = None, 
                 actions: List[Dict] = None, metrics: Dict = None):
        self.content = content
        self.agent_id = agent_id
        self.suggestions = suggestions or []
        self.actions = actions or []
        self.metrics = metrics or {}
        self.timestamp = datetime.now()
        self.response_id = str(uuid4())


class AIOrchestrator:
    """Central coordinator for all AI agents and business intelligence"""
    
    def __init__(self, db: Session):
        self.db = db
        self.logger = logging.getLogger(__name__)
        self.bi_service = BusinessIntelligenceAgentService(db)
        self.calendar_service = BusinessCalendarMetadataService(db)
        self.memory_service = AIMemoryService(db)
        
        # Active conversation contexts
        self.conversations: Dict[str, ConversationContext] = {}
        
        # Agent routing configuration
        self.agent_routing = {
            'financial': ['revenue', 'pricing', 'profit', 'cost', 'money', 'income', 'ROI'],
            'growth': ['client', 'customer', 'retention', 'acquisition', 'marketing', 'growth'],
            'operations': ['schedule', 'efficiency', 'workflow', 'time', 'appointment', 'booking'],
            'brand': ['service', 'experience', 'quality', 'brand', 'reputation', 'excellence']
        }
    
    async def get_or_create_conversation(self, user_id: str) -> ConversationContext:
        """Get existing conversation or create new one for user"""
        if user_id not in self.conversations:
            self.conversations[user_id] = ConversationContext(user_id)
            
            # Load business context for new conversation
            await self._load_business_context(user_id)
        
        return self.conversations[user_id]
    
    async def process_user_query(self, user_id: str, query: str, preferred_agent: Optional[str] = None) -> AIResponse:
        """Process user query and route to appropriate agent(s) with business context"""
        try:
            conversation = await self.get_or_create_conversation(user_id)
            conversation.add_message('user', query)
            
            # Determine best agent for query
            target_agent = preferred_agent or await self._determine_best_agent(query)
            
            # Get relevant business context
            business_context = await self._get_relevant_business_context(user_id, query)
            
            # Generate AI response with context
            response = await self._generate_contextual_response(
                user_id=user_id,
                query=query,
                agent_id=target_agent,
                business_context=business_context,
                conversation_history=conversation.get_recent_context()
            )
            
            # Add response to conversation
            conversation.add_message('agent', response.content, target_agent)
            conversation.active_agents.add(target_agent)
            
            # Store conversation in AI memory for learning
            await self.memory_service.store_conversation_memory(
                user_id=user_id,
                conversation=f"User: {query}\nAgent ({target_agent}): {response.content}",
                context={
                    'agent_id': target_agent,
                    'business_context': business_context,
                    'query_type': await self._classify_query_type(query)
                },
                importance=1.0
            )
            
            # Check if proactive insights should be generated
            await self._check_proactive_insights(user_id, conversation)
            
            return response
            
        except Exception as e:
            self.logger.error(f"Error processing user query: {str(e)}")
            return AIResponse(
                content="I apologize, but I encountered an error processing your request. Please try again.",
                agent_id="system",
                suggestions=["Try rephrasing your question", "Contact support if the issue persists"]
            )
    
    async def generate_proactive_insights(self, user_id: str) -> List[BusinessInsight]:
        """Generate proactive business recommendations based on data analysis"""
        try:
            # Analyze business performance patterns
            performance_data = await self._analyze_business_performance(user_id)
            
            insights = []
            
            # Revenue optimization insights
            if performance_data.get('low_average_revenue'):
                insights.append(await self._generate_revenue_insight(user_id, performance_data))
            
            # Client retention insights
            if performance_data.get('declining_retention'):
                insights.append(await self._generate_retention_insight(user_id, performance_data))
            
            # Operational efficiency insights
            if performance_data.get('scheduling_inefficiencies'):
                insights.append(await self._generate_efficiency_insight(user_id, performance_data))
            
            # Store insights for tracking
            for insight in insights:
                await self._store_business_insight(user_id, insight)
            
            return insights
            
        except Exception as e:
            self.logger.error(f"Error generating proactive insights: {str(e)}")
            return []
    
    async def coordinate_multi_agent_response(self, user_id: str, complex_query: str) -> AIResponse:
        """Coordinate multiple agents for complex business problems"""
        try:
            conversation = await self.get_or_create_conversation(user_id)
            
            # Identify relevant agents for complex query
            relevant_agents = await self._identify_relevant_agents(complex_query)
            
            # Get business context
            business_context = await self._get_relevant_business_context(user_id, complex_query)
            
            # Coordinate responses from multiple agents
            agent_responses = []
            for agent_id in relevant_agents:
                agent_response = await self._generate_contextual_response(
                    user_id=user_id,
                    query=complex_query,
                    agent_id=agent_id,
                    business_context=business_context,
                    conversation_history=conversation.get_recent_context()
                )
                agent_responses.append(agent_response)
            
            # Synthesize collaborative response
            collaborative_response = await self._synthesize_multi_agent_response(
                complex_query, agent_responses, business_context
            )
            
            # Add to conversation
            conversation.add_message('agent', collaborative_response.content, 'multi_agent')
            for agent_id in relevant_agents:
                conversation.active_agents.add(agent_id)
            
            return collaborative_response
            
        except Exception as e:
            self.logger.error(f"Error coordinating multi-agent response: {str(e)}")
            return AIResponse(
                content="I encountered an issue coordinating the response. Let me try with a single agent instead.",
                agent_id="system"
            )
    
    async def track_strategy_implementation(self, user_id: str, strategy_id: str) -> Dict:
        """Track implementation status of AI-recommended strategies"""
        try:
            conversation = await self.get_or_create_conversation(user_id)
            
            # Get strategy details
            strategy = conversation.strategy_tracking.get(strategy_id)
            if not strategy:
                return {'error': 'Strategy not found'}
            
            # Measure current performance
            current_metrics = await self._measure_current_performance(user_id, strategy['metrics'])
            
            # Compare with baseline
            baseline_metrics = strategy.get('baseline_metrics', {})
            performance_change = await self._calculate_performance_change(
                baseline_metrics, current_metrics
            )
            
            # Update strategy tracking
            strategy['current_metrics'] = current_metrics
            strategy['performance_change'] = performance_change
            strategy['last_checked'] = datetime.now().isoformat()
            
            return {
                'strategy_id': strategy_id,
                'status': strategy.get('status', 'active'),
                'performance_change': performance_change,
                'current_metrics': current_metrics
            }
            
        except Exception as e:
            self.logger.error(f"Error tracking strategy implementation: {str(e)}")
            return {'error': 'Failed to track strategy implementation'}
    
    async def learn_from_strategy_outcome(self, user_id: str, strategy: Dict, outcome: Dict) -> bool:
        """Learn from strategy implementation outcomes"""
        try:
            # Store strategy outcome in memory for future learning
            await self.memory_service.store_strategy_outcome(
                user_id=user_id,
                strategy=strategy,
                outcome=outcome,
                importance=2.0  # Strategies are high importance
            )
            
            # Identify and store business patterns
            if outcome.get('success', False):
                pattern_data = {
                    'type': strategy.get('type', 'general'),
                    'description': f"Successful {strategy.get('type', 'strategy')}: {strategy.get('title', 'Unknown')}",
                    'context': {
                        'strategy': strategy,
                        'business_metrics': outcome.get('metrics', {}),
                        'implementation_details': outcome.get('implementation', {})
                    }
                }
                
                await self.memory_service.store_business_pattern(
                    user_id=user_id,
                    pattern_data=pattern_data,
                    outcome=outcome
                )
            
            # Learn from interaction for future improvements
            interaction_data = {
                'query_type': strategy.get('type', 'strategy'),
                'effectiveness': outcome.get('success_rating', 0.5),
                'satisfaction': outcome.get('user_satisfaction', 0.5),
                'agent_id': strategy.get('recommending_agent', 'system')
            }
            
            await self.memory_service.learn_from_interaction(user_id, interaction_data)
            
            return True
            
        except Exception as e:
            self.logger.error(f"Error learning from strategy outcome: {str(e)}")
            return False
    
    # Private helper methods
    
    async def _load_business_context(self, user_id: str):
        """Load business context for user's conversation"""
        try:
            user = self.db.query(User).filter(User.id == user_id).first()
            if not user:
                return
            
            conversation = self.conversations[user_id]
            
            # Load recent metrics
            recent_metrics = await self._get_recent_business_metrics(user_id)
            conversation.update_business_context(recent_metrics)
            
            # Load active strategies
            active_strategies = await self._get_active_strategies(user_id)
            conversation.strategy_tracking = active_strategies
        
        except Exception as e:
            self.logger.error(f"Error loading business context: {str(e)}")
    
    async def _determine_best_agent(self, query: str) -> str:
        """Determine which agent is best suited for the query"""
        query_lower = query.lower()
        
        # Score each agent based on keyword matching
        agent_scores = {}
        for agent_type, keywords in self.agent_routing.items():
            score = sum(1 for keyword in keywords if keyword in query_lower)
            if score > 0:
                agent_scores[agent_type] = score
        
        # Return agent with highest score, default to growth strategist
        if agent_scores:
            return max(agent_scores.items(), key=lambda x: x[1])[0]
        
        return 'growth'  # Default agent
    
    async def _get_relevant_business_context(self, user_id: str, query: str) -> Dict:
        """Get relevant business data context for the query"""
        try:
            context = {}
            
            # Get user's recent performance metrics
            context['recent_metrics'] = await self._get_recent_business_metrics(user_id)
            
            # Get relevant historical data based on query
            if any(keyword in query.lower() for keyword in ['revenue', 'money', 'profit']):
                context['revenue_data'] = await self._get_revenue_context(user_id)
            
            if any(keyword in query.lower() for keyword in ['client', 'customer', 'retention']):
                context['client_data'] = await self._get_client_context(user_id)
            
            if any(keyword in query.lower() for keyword in ['appointment', 'schedule', 'booking']):
                context['appointment_data'] = await self._get_appointment_context(user_id)
            
            return context
            
        except Exception as e:
            self.logger.error(f"Error getting business context: {str(e)}")
            return {}
    
    async def _generate_contextual_response(self, user_id: str, query: str, agent_id: str, 
                                          business_context: Dict, conversation_history: List) -> AIResponse:
        """Generate AI response with business context"""
        try:
            # Get agent configuration
            agent = await self.bi_service.get_agent_by_type(agent_id)
            
            if not agent:
                return AIResponse(
                    content="I'm sorry, but I couldn't find the appropriate agent to help with your request.",
                    agent_id="system"
                )
            
            # Prepare context for AI generation
            context_prompt = await self._prepare_context_prompt(
                query, business_context, conversation_history
            )
            
            # Get relevant memories for context
            relevant_memories = await self.memory_service.retrieve_relevant_memories(
                user_id=user_id,
                query=query,
                memory_types=['conversation', 'strategy', 'pattern'],
                limit=5
            )
            
            # Enhance context with memory insights
            memory_context = ""
            if relevant_memories:
                memory_context = "\n\nRelevant past insights:\n"
                for memory in relevant_memories:
                    memory_context += f"- {memory.content[:200]}...\n"
            
            # Generate response using business intelligence service
            coaching_session = await self.bi_service.create_coaching_session(
                user_id=user_id,
                agent_id=agent.id,
                session_type=CoachingSessionType.INTERACTIVE_CHAT,
                initial_query=query,
                business_context=business_context
            )
            
            # Get AI response (this would integrate with your AI provider)
            ai_content = await self._call_ai_provider(
                agent_prompt=agent.system_prompt,
                user_query=query,
                context=context_prompt + memory_context,
                agent_personality=agent.coaching_style
            )
            
            # Generate actionable suggestions
            suggestions = await self._generate_suggestions(query, business_context, agent_id)
            
            # Generate possible actions
            actions = await self._generate_actions(query, business_context, agent_id)
            
            return AIResponse(
                content=ai_content,
                agent_id=agent_id,
                suggestions=suggestions,
                actions=actions,
                metrics=business_context.get('recent_metrics', {})
            )
            
        except Exception as e:
            self.logger.error(f"Error generating contextual response: {str(e)}")
            return AIResponse(
                content="I apologize, but I'm having trouble generating a response right now. Please try again.",
                agent_id=agent_id
            )
    
    async def _get_recent_business_metrics(self, user_id: str) -> Dict:
        """Get recent business performance metrics"""
        try:
            # Get metrics from last 30 days
            end_date = datetime.now()
            start_date = end_date - timedelta(days=30)
            
            # Revenue metrics
            revenue_query = self.db.query(func.sum(Payment.amount)).filter(
                and_(
                    Payment.user_id == user_id,
                    Payment.created_at >= start_date,
                    Payment.status == "completed"
                )
            )
            total_revenue = revenue_query.scalar() or 0
            
            # Appointment metrics
            appointment_count = self.db.query(func.count(Appointment.id)).filter(
                and_(
                    Appointment.barber_id == user_id,
                    Appointment.start_time >= start_date,
                    Appointment.status.in_(["confirmed", "completed"])
                )
            ).scalar() or 0
            
            # Client metrics
            unique_clients = self.db.query(func.count(func.distinct(Appointment.client_id))).filter(
                and_(
                    Appointment.barber_id == user_id,
                    Appointment.start_time >= start_date,
                    Appointment.status.in_(["confirmed", "completed"])
                )
            ).scalar() or 0
            
            return {
                'period_days': 30,
                'total_revenue': float(total_revenue),
                'total_appointments': appointment_count,
                'unique_clients': unique_clients,
                'average_revenue_per_appointment': float(total_revenue / appointment_count) if appointment_count > 0 else 0,
                'average_revenue_per_client': float(total_revenue / unique_clients) if unique_clients > 0 else 0
            }
            
        except Exception as e:
            self.logger.error(f"Error getting recent metrics: {str(e)}")
            return {}
    
    async def _call_ai_provider(self, agent_prompt: str, user_query: str, 
                              context: str, agent_personality: str) -> str:
        """Call AI provider to generate response (placeholder for actual AI integration)"""
        # This would integrate with OpenAI, Anthropic, or other AI providers
        # For now, return a structured response
        
        return f"""Based on your business data and the question "{user_query}", here's my analysis:

{context}

I recommend focusing on the key metrics I see in your recent performance. This aligns with the Six Figure Barber methodology principles we follow.

Would you like me to dive deeper into any specific area or create an action plan for improvement?"""
    
    async def _generate_suggestions(self, query: str, business_context: Dict, agent_id: str) -> List[str]:
        """Generate relevant suggestions based on query and context"""
        suggestions = []
        
        metrics = business_context.get('recent_metrics', {})
        
        if agent_id == 'financial':
            if metrics.get('average_revenue_per_appointment', 0) < 75:
                suggestions.append("Consider premium service pricing strategies")
            suggestions.append("Review your service menu pricing")
            suggestions.append("Analyze profit margins by service type")
        
        elif agent_id == 'growth':
            if metrics.get('unique_clients', 0) < 50:
                suggestions.append("Develop client acquisition campaigns")
            suggestions.append("Create client retention programs")
            suggestions.append("Implement referral incentives")
        
        elif agent_id == 'operations':
            suggestions.append("Optimize your appointment scheduling")
            suggestions.append("Review service time allocations")
            suggestions.append("Analyze peak hour efficiency")
        
        elif agent_id == 'brand':
            suggestions.append("Enhance service excellence protocols")
            suggestions.append("Gather client feedback systematically")
            suggestions.append("Develop signature service experiences")
        
        return suggestions
    
    async def _generate_actions(self, query: str, business_context: Dict, agent_id: str) -> List[Dict]:
        """Generate actionable items based on query and context"""
        actions = []
        
        if agent_id == 'financial':
            actions.append({
                'type': 'pricing_analysis',
                'title': 'Analyze Current Pricing',
                'description': 'Review and optimize service pricing based on market data'
            })
        
        elif agent_id == 'growth':
            actions.append({
                'type': 'client_retention',
                'title': 'Create Retention Strategy',
                'description': 'Develop programs to increase client loyalty and repeat bookings'
            })
        
        return actions
    
    async def _prepare_context_prompt(self, query: str, business_context: Dict, 
                                    conversation_history: List) -> str:
        """Prepare context prompt for AI generation"""
        context_parts = []
        
        # Add business metrics context
        metrics = business_context.get('recent_metrics', {})
        if metrics:
            context_parts.append(f"""
Recent Business Performance (Last 30 Days):
- Total Revenue: ${metrics.get('total_revenue', 0):.2f}
- Total Appointments: {metrics.get('total_appointments', 0)}
- Unique Clients: {metrics.get('unique_clients', 0)}
- Average Revenue per Appointment: ${metrics.get('average_revenue_per_appointment', 0):.2f}
- Average Revenue per Client: ${metrics.get('average_revenue_per_client', 0):.2f}
""")
        
        # Add conversation context
        if conversation_history:
            recent_messages = conversation_history[-3:]  # Last 3 messages
            context_parts.append("Recent Conversation:")
            for msg in recent_messages:
                context_parts.append(f"- {msg['type']}: {msg['content'][:100]}...")
        
        return "\n".join(context_parts)
    
    async def _classify_query_type(self, query: str) -> str:
        """Classify the type of user query for memory storage"""
        query_lower = query.lower()
        
        if any(word in query_lower for word in ['revenue', 'money', 'profit', 'pricing', 'cost']):
            return 'financial'
        elif any(word in query_lower for word in ['client', 'customer', 'retention', 'acquisition']):
            return 'growth'
        elif any(word in query_lower for word in ['schedule', 'appointment', 'time', 'efficiency']):
            return 'operations'
        elif any(word in query_lower for word in ['service', 'quality', 'experience', 'brand']):
            return 'brand'
        elif any(word in query_lower for word in ['strategy', 'plan', 'goal', 'improve']):
            return 'strategy'
        else:
            return 'general'
    
    async def _analyze_business_performance(self, user_id: str) -> Dict:
        """Analyze business performance for proactive insights"""
        try:
            metrics = await self._get_recent_business_metrics(user_id)
            
            analysis = {}
            
            # Check for low average revenue
            if metrics.get('average_revenue_per_appointment', 0) < 60:
                analysis['low_average_revenue'] = True
            
            # Check for low client count
            if metrics.get('unique_clients', 0) < 30:
                analysis['low_client_base'] = True
            
            # Add more analysis rules as needed
            
            return analysis
            
        except Exception as e:
            self.logger.error(f"Error analyzing performance: {str(e)}")
            return {}
    
    async def _check_proactive_insights(self, user_id: str, conversation: ConversationContext):
        """Check if proactive insights should be generated"""
        # Generate insights if conversation is getting long or no recent insights
        if len(conversation.messages) > 10 or not conversation.business_context.get('last_insights'):
            insights = await self.generate_proactive_insights(user_id)
            if insights:
                conversation.business_context['last_insights'] = datetime.now().isoformat()
    
    # Additional helper methods would be implemented here for:
    # - _identify_relevant_agents
    # - _synthesize_multi_agent_response
    # - _measure_current_performance
    # - _calculate_performance_change
    # - _get_active_strategies
    # - _store_business_insight
    # - _get_revenue_context
    # - _get_client_context
    # - _get_appointment_context
    # - etc.