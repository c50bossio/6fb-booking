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
from services.vector_knowledge_service import VectorKnowledgeService
from services.roi_tracking_service import ROITrackingService

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
        self.vector_service = VectorKnowledgeService(db)
        self.roi_service = ROITrackingService(db)
        
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
            
            # Get business context including vector knowledge
            business_context = await self._get_comprehensive_business_context(user_id, complex_query)
            
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
    
    async def _get_comprehensive_business_context(self, user_id: str, query: str) -> Dict:
        """Get comprehensive business context including vector knowledge"""
        try:
            # Initialize knowledge base if not exists
            await self.vector_service.initialize_user_knowledge_base(user_id)
            
            # Get relevant knowledge from vector database
            relevant_knowledge = await self.vector_service.retrieve_relevant_knowledge(
                user_id=user_id,
                query=query,
                doc_types=['business_data', 'strategy', 'conversation'],
                limit=5
            )
            
            # Get basic business context
            basic_context = await self._get_relevant_business_context(user_id, query)
            
            # Get ROI insights
            roi_insights = await self.roi_service.get_roi_insights(user_id)
            
            # Combine all context
            comprehensive_context = {
                **basic_context,
                'vector_knowledge': relevant_knowledge,
                'roi_insights': roi_insights,
                'knowledge_summary': await self.vector_service.get_knowledge_summary(user_id)
            }
            
            return comprehensive_context
            
        except Exception as e:
            self.logger.error(f"Error getting comprehensive business context: {str(e)}")
            # Fallback to basic context
            return await self._get_relevant_business_context(user_id, query)
    
    async def enhance_response_with_context(self, user_id: str, query: str, base_response: str) -> str:
        """Enhance AI response with contextual business insights"""
        try:
            # Get contextual insights from current situation
            current_situation = await self._analyze_business_performance(user_id)
            
            if current_situation:
                contextual_insights = await self.vector_service.generate_contextual_insights(
                    user_id=user_id,
                    current_situation=current_situation
                )
                
                if contextual_insights:
                    enhanced_response = base_response + "\n\n**Based on your business data:**\n"
                    for insight in contextual_insights[:3]:  # Top 3 insights
                        enhanced_response += f"• {insight['description']}\n"
                    
                    return enhanced_response
            
            return base_response
            
        except Exception as e:
            self.logger.error(f"Error enhancing response with context: {str(e)}")
            return base_response
    
    async def track_strategy_effectiveness(self, user_id: str, strategy: Dict) -> str:
        """Track a new strategy for ROI measurement"""
        try:
            # Start ROI tracking
            strategy_id = await self.roi_service.track_strategy_implementation(user_id, strategy)
            
            # Update vector knowledge with strategy
            await self.vector_service.update_knowledge_from_interaction(
                user_id=user_id,
                interaction_data={
                    'query': f"New strategy: {strategy.get('title', 'Unknown')}",
                    'response': f"Started tracking {strategy.get('type', 'general')} strategy",
                    'strategy_id': strategy_id,
                    'effectiveness': 1.0  # High importance for strategy tracking
                }
            )
            
            return strategy_id
            
        except Exception as e:
            self.logger.error(f"Error tracking strategy effectiveness: {str(e)}")
            return ""
    
    async def complete_strategy_with_outcome(self, user_id: str, strategy_id: str, outcome: Dict) -> bool:
        """Complete strategy tracking with outcome measurement"""
        try:
            # Calculate final ROI
            roi_result = await self.roi_service.calculate_strategy_roi(user_id, strategy_id)
            
            if roi_result:
                # Update vector knowledge with outcome
                strategy_data = {
                    'id': strategy_id,
                    'title': roi_result.strategy_title,
                    'type': 'completed_strategy'
                }
                
                outcome_data = {
                    'success': roi_result.roi_percentage > 0,
                    'roi_percentage': roi_result.roi_percentage,
                    'metrics': roi_result.success_metrics,
                    'confidence': roi_result.confidence_score
                }
                
                await self.vector_service.update_knowledge_from_strategy_outcome(
                    user_id=user_id,
                    strategy=strategy_data,
                    outcome=outcome_data
                )
                
                return True
            
            return False
            
        except Exception as e:
            self.logger.error(f"Error completing strategy with outcome: {str(e)}")
            return False
    
    async def _identify_relevant_agents(self, complex_query: str) -> List[str]:
        """Identify which agents are relevant for a complex query"""
        query_lower = complex_query.lower()
        relevant_agents = []
        
        # Score each agent based on keyword matching
        agent_scores = {}
        for agent_type, keywords in self.agent_routing.items():
            score = sum(1 for keyword in keywords if keyword in query_lower)
            if score > 0:
                agent_scores[agent_type] = score
        
        # Return agents with scores above threshold, max 3 agents
        sorted_agents = sorted(agent_scores.items(), key=lambda x: x[1], reverse=True)
        relevant_agents = [agent[0] for agent in sorted_agents[:3] if agent[1] > 0]
        
        # Ensure at least one agent
        if not relevant_agents:
            relevant_agents = ['growth']  # Default agent
        
        return relevant_agents
    
    async def _synthesize_multi_agent_response(self, query: str, agent_responses: List[AIResponse], 
                                             business_context: Dict) -> AIResponse:
        """Synthesize responses from multiple agents into cohesive answer"""
        try:
            # Combine content from all agents
            combined_content = f"Based on comprehensive analysis of your business:\n\n"
            
            for i, response in enumerate(agent_responses, 1):
                agent_name = response.agent_id.title() + " Coach"
                combined_content += f"**{agent_name}:**\n{response.content}\n\n"
            
            # Combine suggestions (remove duplicates)
            all_suggestions = []
            for response in agent_responses:
                all_suggestions.extend(response.suggestions)
            unique_suggestions = list(dict.fromkeys(all_suggestions))  # Remove duplicates
            
            # Combine actions
            all_actions = []
            for response in agent_responses:
                all_actions.extend(response.actions)
            
            # Create synthesis
            combined_content += "**Strategic Synthesis:**\n"
            combined_content += "Your business would benefit from a coordinated approach addressing multiple areas simultaneously. "
            combined_content += "I recommend prioritizing the highest-impact strategies while maintaining focus on your core strengths."
            
            return AIResponse(
                content=combined_content,
                agent_id="multi_agent",
                suggestions=unique_suggestions[:5],  # Top 5 suggestions
                actions=all_actions,
                metrics=business_context.get('recent_metrics', {})
            )
            
        except Exception as e:
            self.logger.error(f"Error synthesizing multi-agent response: {str(e)}")
            return AIResponse(
                content="I've analyzed your business from multiple perspectives. Let me provide you with a comprehensive strategy.",
                agent_id="multi_agent"
            )
    
    async def _measure_current_performance(self, user_id: str, metrics: List[str]) -> Dict:
        """Measure current performance for specified metrics"""
        try:
            performance = {}
            recent_metrics = await self._get_recent_business_metrics(user_id)
            
            for metric in metrics:
                if metric in recent_metrics:
                    performance[metric] = recent_metrics[metric]
            
            return performance
            
        except Exception as e:
            self.logger.error(f"Error measuring current performance: {str(e)}")
            return {}
    
    async def _calculate_performance_change(self, baseline_metrics: Dict, current_metrics: Dict) -> Dict:
        """Calculate performance change between baseline and current metrics"""
        try:
            changes = {}
            
            for metric, current_value in current_metrics.items():
                baseline_value = baseline_metrics.get(metric, 0)
                if baseline_value > 0:
                    change_percentage = ((current_value - baseline_value) / baseline_value) * 100
                    changes[metric] = {
                        'baseline': baseline_value,
                        'current': current_value,
                        'absolute_change': current_value - baseline_value,
                        'percentage_change': change_percentage
                    }
                else:
                    changes[metric] = {
                        'baseline': 0,
                        'current': current_value,
                        'absolute_change': current_value,
                        'percentage_change': 100 if current_value > 0 else 0
                    }
            
            return changes
            
        except Exception as e:
            self.logger.error(f"Error calculating performance change: {str(e)}")
            return {}
    
    async def _get_active_strategies(self, user_id: str) -> Dict:
        """Get active strategies being tracked for user"""
        try:
            # This would query the database for active strategies
            # For now, return empty dict as placeholder
            return {}
            
        except Exception as e:
            self.logger.error(f"Error getting active strategies: {str(e)}")
            return {}
    
    async def _store_business_insight(self, user_id: str, insight: 'BusinessInsight') -> bool:
        """Store business insight in database"""
        try:
            # Create business insight record
            db_insight = BusinessInsight(
                user_id=user_id,
                insight_type=insight.insight_type,
                title=insight.title,
                description=insight.description,
                priority=insight.priority,
                data_confidence=insight.confidence_score,
                implementation_difficulty=insight.implementation_difficulty,
                expected_roi=insight.expected_roi
            )
            
            self.db.add(db_insight)
            self.db.commit()
            
            return True
            
        except Exception as e:
            self.logger.error(f"Error storing business insight: {str(e)}")
            return False
    
    async def _get_revenue_context(self, user_id: str) -> Dict:
        """Get revenue-specific context for user"""
        try:
            # Get detailed revenue data
            end_date = datetime.now()
            start_date = end_date - timedelta(days=90)
            
            payments = self.db.query(Payment).filter(
                and_(
                    Payment.user_id == user_id,
                    Payment.created_at >= start_date,
                    Payment.status == "completed"
                )
            ).all()
            
            if not payments:
                return {'message': 'No recent revenue data available'}
            
            # Analyze revenue patterns
            monthly_revenue = {}
            service_revenue = {}
            
            for payment in payments:
                month_key = payment.created_at.strftime('%Y-%m')
                monthly_revenue[month_key] = monthly_revenue.get(month_key, 0) + float(payment.amount)
                
                service = payment.description or "Unknown Service"
                service_revenue[service] = service_revenue.get(service, 0) + float(payment.amount)
            
            return {
                'total_revenue_90d': sum(float(p.amount) for p in payments),
                'payment_count': len(payments),
                'average_payment': sum(float(p.amount) for p in payments) / len(payments),
                'monthly_breakdown': monthly_revenue,
                'service_breakdown': service_revenue,
                'highest_revenue_service': max(service_revenue.items(), key=lambda x: x[1]) if service_revenue else None
            }
            
        except Exception as e:
            self.logger.error(f"Error getting revenue context: {str(e)}")
            return {}
    
    async def _get_client_context(self, user_id: str) -> Dict:
        """Get client-specific context for user"""
        try:
            # Get client behavior data
            end_date = datetime.now()
            start_date = end_date - timedelta(days=180)
            
            client_appointments = self.db.query(Client, func.count(Appointment.id).label('appointment_count')).join(
                Appointment, Client.id == Appointment.client_id
            ).filter(
                and_(
                    Appointment.barber_id == user_id,
                    Appointment.start_time >= start_date
                )
            ).group_by(Client.id).all()
            
            if not client_appointments:
                return {'message': 'No recent client data available'}
            
            # Analyze client patterns
            total_clients = len(client_appointments)
            repeat_clients = len([c for c in client_appointments if c[1] > 1])
            high_value_clients = len([c for c in client_appointments if c[1] >= 5])
            
            appointment_counts = [c[1] for c in client_appointments]
            avg_appointments_per_client = sum(appointment_counts) / len(appointment_counts)
            
            return {
                'total_clients_180d': total_clients,
                'repeat_clients': repeat_clients,
                'retention_rate': (repeat_clients / total_clients * 100) if total_clients > 0 else 0,
                'high_value_clients': high_value_clients,
                'avg_appointments_per_client': avg_appointments_per_client,
                'client_loyalty_score': (high_value_clients / total_clients * 100) if total_clients > 0 else 0
            }
            
        except Exception as e:
            self.logger.error(f"Error getting client context: {str(e)}")
            return {}
    
    async def _get_appointment_context(self, user_id: str) -> Dict:
        """Get appointment-specific context for user"""
        try:
            # Get appointment scheduling data
            end_date = datetime.now()
            start_date = end_date - timedelta(days=90)
            
            appointments = self.db.query(Appointment).filter(
                and_(
                    Appointment.barber_id == user_id,
                    Appointment.start_time >= start_date
                )
            ).all()
            
            if not appointments:
                return {'message': 'No recent appointment data available'}
            
            # Analyze appointment patterns
            total_appointments = len(appointments)
            completed = len([a for a in appointments if a.status == "completed"])
            cancelled = len([a for a in appointments if a.status == "cancelled"])
            no_show = len([a for a in appointments if a.status == "no_show"])
            
            # Time-based analysis
            hour_counts = {}
            day_counts = {}
            
            for appointment in appointments:
                hour = appointment.start_time.hour
                day = appointment.start_time.strftime('%A')
                
                hour_counts[hour] = hour_counts.get(hour, 0) + 1
                day_counts[day] = day_counts.get(day, 0) + 1
            
            peak_hour = max(hour_counts.items(), key=lambda x: x[1]) if hour_counts else None
            peak_day = max(day_counts.items(), key=lambda x: x[1]) if day_counts else None
            
            return {
                'total_appointments_90d': total_appointments,
                'completion_rate': (completed / total_appointments * 100) if total_appointments > 0 else 0,
                'cancellation_rate': (cancelled / total_appointments * 100) if total_appointments > 0 else 0,
                'no_show_rate': (no_show / total_appointments * 100) if total_appointments > 0 else 0,
                'peak_booking_hour': f"{peak_hour[0]}:00" if peak_hour else None,
                'peak_booking_day': peak_day[0] if peak_day else None,
                'scheduling_efficiency': (completed / (completed + cancelled + no_show) * 100) if (completed + cancelled + no_show) > 0 else 0
            }
            
        except Exception as e:
            self.logger.error(f"Error getting appointment context: {str(e)}")
            return {}
    
    async def _generate_revenue_insight(self, user_id: str, performance_data: Dict) -> 'BusinessInsight':
        """Generate revenue optimization insight"""
        from models.business_intelligence_agents import BusinessInsight, InsightPriority
        
        return BusinessInsight(
            insight_type="revenue_optimization",
            title="Revenue Growth Opportunity Identified",
            description="Based on your current average transaction value, there's significant opportunity to increase revenue through premium pricing strategies and service upselling.",
            priority=InsightPriority.HIGH,
            confidence_score=0.8,
            implementation_difficulty="medium",
            expected_roi=25.0
        )
    
    async def _generate_retention_insight(self, user_id: str, performance_data: Dict) -> 'BusinessInsight':
        """Generate client retention insight"""
        from models.business_intelligence_agents import BusinessInsight, InsightPriority
        
        return BusinessInsight(
            insight_type="client_retention",
            title="Client Retention Enhancement Needed",
            description="Your client retention rate shows room for improvement. Implementing a loyalty program and personalized follow-up system could significantly increase repeat bookings.",
            priority=InsightPriority.HIGH,
            confidence_score=0.7,
            implementation_difficulty="medium",
            expected_roi=30.0
        )
    
    async def _generate_efficiency_insight(self, user_id: str, performance_data: Dict) -> 'BusinessInsight':
        """Generate operational efficiency insight"""
        from models.business_intelligence_agents import BusinessInsight, InsightPriority
        
        return BusinessInsight(
            insight_type="operational_efficiency",
            title="Schedule Optimization Opportunity",
            description="Your appointment scheduling shows inefficiencies that could be optimized. Better time management and booking policies could increase your daily capacity by 15-20%.",
            priority=InsightPriority.MEDIUM,
            confidence_score=0.6,
            implementation_difficulty="low",
            expected_roi=20.0
        )