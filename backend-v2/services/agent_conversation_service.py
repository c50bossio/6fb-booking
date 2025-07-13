"""
Agent Conversation Service - Enhanced service for managing AI-powered conversations

This service provides comprehensive conversation management functionality including:
- Conversation lifecycle management and message routing
- Context management and conversation state
- Message processing and response generation
- Integration with external messaging platforms
- Real-time conversation monitoring and analytics
"""

import asyncio
import json
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional, Any, Tuple, Union
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc
from enum import Enum
import uuid

from models import (
    AgentConversation, AgentInstance, Agent, ConversationStatus,
    Client, User, AgentMetrics
)
from services.ai_providers.ai_provider_manager import AIProviderManager
from services.notification_service import notification_service
from services.agent_template_service import AgentTemplateService
from config import settings

logger = logging.getLogger(__name__)


class MessageType(Enum):
    """Types of messages in conversations"""
    SYSTEM = "system"
    AGENT = "agent"
    CLIENT = "client"
    ERROR = "error"
    NOTIFICATION = "notification"


class ConversationPriority(Enum):
    """Priority levels for conversations"""
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"


class ChannelType(Enum):
    """Communication channels"""
    SMS = "sms"
    EMAIL = "email"
    WHATSAPP = "whatsapp"
    IN_APP = "in_app"
    VOICE = "voice"


class AgentConversationService:
    """Enhanced service for managing AI-powered conversations"""
    
    def __init__(self):
        self.ai_manager = AIProviderManager()
        self.template_service = AgentTemplateService()
        self.active_conversations = {}  # In-memory cache
        self.max_conversation_length = 20  # Maximum exchanges
        self.context_window_size = 10  # Messages to keep in context
        self.response_timeout = 30  # Seconds
        
    async def create_conversation(
        self, 
        db: Session, 
        instance_id: int, 
        client_id: int,
        trigger_type: str,
        context: Optional[Dict[str, Any]] = None,
        priority: ConversationPriority = ConversationPriority.NORMAL,
        channel: ChannelType = ChannelType.SMS,
        scheduled_for: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Create a new conversation
        
        Args:
            db: Database session
            instance_id: Agent instance ID
            client_id: Client ID
            trigger_type: What triggered the conversation
            context: Additional context data
            priority: Conversation priority
            channel: Communication channel
            scheduled_for: Optional scheduled time
            
        Returns:
            Created conversation with initial setup
        """
        try:
            # Validate instance and client
            instance = db.query(AgentInstance).get(instance_id)
            if not instance:
                raise ValueError(f"Agent instance {instance_id} not found")
            
            client = db.query(Client).get(client_id)
            if not client:
                raise ValueError(f"Client {client_id} not found")
            
            # Check for existing active conversations
            existing_conversation = db.query(AgentConversation).filter(
                and_(
                    AgentConversation.instance_id == instance_id,
                    AgentConversation.client_id == client_id,
                    AgentConversation.status == ConversationStatus.ACTIVE
                )
            ).first()
            
            if existing_conversation:
                return {
                    "conversation_id": existing_conversation.id,
                    "status": "existing",
                    "message": "Active conversation already exists",
                    "existing_since": existing_conversation.started_at.isoformat()
                }
            
            # Create conversation
            conversation = AgentConversation(
                instance_id=instance_id,
                client_id=client_id,
                status=ConversationStatus.PENDING if scheduled_for else ConversationStatus.ACTIVE,
                trigger_type=trigger_type,
                context=json.dumps(context or {}),
                priority=priority.value,
                channel=channel.value,
                scheduled_for=scheduled_for,
                created_at=datetime.now(timezone.utc).replace(tzinfo=None),
                started_at=None if scheduled_for else datetime.now(timezone.utc).replace(tzinfo=None)
            )
            
            db.add(conversation)
            db.commit()
            db.refresh(conversation)
            
            # Initialize conversation context
            await self._initialize_conversation_context(db, conversation)
            
            # Start conversation if not scheduled
            if not scheduled_for:
                result = await self._start_conversation(db, conversation)
                return {
                    "conversation_id": conversation.id,
                    "status": "started",
                    "trigger_type": trigger_type,
                    "channel": channel.value,
                    "priority": priority.value,
                    "initial_message": result.get("initial_message"),
                    "estimated_duration": self._estimate_conversation_duration(trigger_type),
                    "context": context
                }
            
            return {
                "conversation_id": conversation.id,
                "status": "scheduled",
                "scheduled_for": scheduled_for.isoformat(),
                "trigger_type": trigger_type,
                "channel": channel.value,
                "priority": priority.value
            }
            
        except Exception as e:
            logger.error(f"Error creating conversation: {str(e)}")
            db.rollback()
            raise
    
    async def process_message(
        self, 
        db: Session, 
        conversation_id: int,
        message_content: str,
        message_type: MessageType = MessageType.CLIENT,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Process an incoming message and generate response
        
        Args:
            db: Database session
            conversation_id: Conversation ID
            message_content: Message content
            message_type: Type of message
            metadata: Additional message metadata
            
        Returns:
            Processing result with agent response
        """
        try:
            conversation = db.query(AgentConversation).get(conversation_id)
            if not conversation:
                raise ValueError(f"Conversation {conversation_id} not found")
            
            if conversation.status != ConversationStatus.ACTIVE:
                raise ValueError(f"Conversation is {conversation.status.value}, cannot process messages")
            
            # Add incoming message to conversation history
            await self._add_message_to_history(
                db, conversation_id, message_content, message_type, metadata
            )
            
            # Check conversation limits
            message_count = await self._get_message_count(db, conversation_id)
            if message_count >= self.max_conversation_length:
                await self._end_conversation(db, conversation, "max_length_reached")
                return {
                    "conversation_id": conversation_id,
                    "status": "ended",
                    "reason": "Maximum conversation length reached",
                    "final_message": "Thank you for your time. If you need further assistance, please contact us directly."
                }
            
            # Generate AI response
            response_result = await self._generate_ai_response(db, conversation, message_content)
            
            # Add agent response to history
            if response_result["success"]:
                await self._add_message_to_history(
                    db, conversation_id, response_result["response"], MessageType.AGENT
                )
                
                # Update conversation metadata
                conversation.last_activity = datetime.now(timezone.utc).replace(tzinfo=None)
                conversation.message_count = message_count + 2  # Incoming + outgoing
                db.commit()
                
                # Send response via appropriate channel
                delivery_result = await self._deliver_response(
                    conversation, response_result["response"], metadata
                )
                
                # Check if conversation should end
                should_end, end_reason = await self._should_end_conversation(
                    db, conversation, response_result
                )
                
                if should_end:
                    await self._end_conversation(db, conversation, end_reason)
                    response_result["conversation_ended"] = True
                    response_result["end_reason"] = end_reason
                
                return {
                    "conversation_id": conversation_id,
                    "status": "processed",
                    "agent_response": response_result["response"],
                    "delivery_status": delivery_result,
                    "conversation_ended": should_end,
                    "message_count": message_count + 2,
                    "processing_time_ms": response_result.get("processing_time_ms", 0),
                    "confidence_score": response_result.get("confidence_score", 0.0)
                }
            
            else:
                # Handle AI generation failure
                error_response = await self._handle_ai_error(db, conversation, response_result["error"])
                return {
                    "conversation_id": conversation_id,
                    "status": "error",
                    "error": response_result["error"],
                    "fallback_response": error_response
                }
            
        except Exception as e:
            logger.error(f"Error processing message for conversation {conversation_id}: {str(e)}")
            raise
    
    async def get_conversation_history(
        self, 
        db: Session, 
        conversation_id: int,
        include_system_messages: bool = False,
        limit: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Get conversation message history
        
        Args:
            db: Database session
            conversation_id: Conversation ID
            include_system_messages: Whether to include system messages
            limit: Optional limit on number of messages
            
        Returns:
            Conversation history with messages and metadata
        """
        try:
            conversation = db.query(AgentConversation).get(conversation_id)
            if not conversation:
                raise ValueError(f"Conversation {conversation_id} not found")
            
            # Get message history (would be from a messages table in production)
            messages = await self._get_conversation_messages(
                db, conversation_id, include_system_messages, limit
            )
            
            # Get conversation metadata
            metadata = {
                "conversation_id": conversation_id,
                "client_id": conversation.client_id,
                "instance_id": conversation.instance_id,
                "status": conversation.status.value,
                "trigger_type": conversation.trigger_type,
                "channel": conversation.channel,
                "priority": conversation.priority,
                "started_at": conversation.started_at.isoformat() if conversation.started_at else None,
                "ended_at": conversation.ended_at.isoformat() if conversation.ended_at else None,
                "last_activity": conversation.last_activity.isoformat() if conversation.last_activity else None,
                "message_count": conversation.message_count or 0,
                "context": json.loads(conversation.context or "{}")
            }
            
            return {
                "metadata": metadata,
                "messages": messages,
                "total_messages": len(messages),
                "conversation_duration": self._calculate_conversation_duration(conversation),
                "summary": await self._generate_conversation_summary(conversation, messages)
            }
            
        except Exception as e:
            logger.error(f"Error getting conversation history {conversation_id}: {str(e)}")
            raise
    
    async def end_conversation(
        self, 
        db: Session, 
        conversation_id: int,
        reason: str = "manual",
        final_message: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        End a conversation manually
        
        Args:
            db: Database session
            conversation_id: Conversation ID to end
            reason: Reason for ending
            final_message: Optional final message to send
            
        Returns:
            Conversation end result with summary
        """
        try:
            conversation = db.query(AgentConversation).get(conversation_id)
            if not conversation:
                raise ValueError(f"Conversation {conversation_id} not found")
            
            if conversation.status in [ConversationStatus.COMPLETED, ConversationStatus.ERROR]:
                return {
                    "conversation_id": conversation_id,
                    "status": "already_ended",
                    "end_reason": conversation.end_reason,
                    "ended_at": conversation.ended_at.isoformat() if conversation.ended_at else None
                }
            
            # Send final message if provided
            if final_message:
                await self._add_message_to_history(
                    db, conversation_id, final_message, MessageType.AGENT
                )
                await self._deliver_response(conversation, final_message)
            
            # End conversation
            result = await self._end_conversation(db, conversation, reason)
            
            return {
                "conversation_id": conversation_id,
                "status": "ended",
                "end_reason": reason,
                "ended_at": conversation.ended_at.isoformat(),
                "final_message": final_message,
                "summary": result.get("summary"),
                "metrics": result.get("metrics")
            }
            
        except Exception as e:
            logger.error(f"Error ending conversation {conversation_id}: {str(e)}")
            raise
    
    async def get_active_conversations(
        self, 
        db: Session, 
        instance_id: Optional[int] = None,
        client_id: Optional[int] = None,
        priority: Optional[ConversationPriority] = None,
        channel: Optional[ChannelType] = None
    ) -> Dict[str, Any]:
        """
        Get active conversations with optional filters
        
        Args:
            db: Database session
            instance_id: Optional instance filter
            client_id: Optional client filter
            priority: Optional priority filter
            channel: Optional channel filter
            
        Returns:
            List of active conversations with metadata
        """
        try:
            query = db.query(AgentConversation).filter(
                AgentConversation.status == ConversationStatus.ACTIVE
            )
            
            # Apply filters
            if instance_id:
                query = query.filter(AgentConversation.instance_id == instance_id)
            if client_id:
                query = query.filter(AgentConversation.client_id == client_id)
            if priority:
                query = query.filter(AgentConversation.priority == priority.value)
            if channel:
                query = query.filter(AgentConversation.channel == channel.value)
            
            conversations = query.order_by(desc(AgentConversation.last_activity)).all()
            
            # Enrich with additional data
            enriched_conversations = []
            for conv in conversations:
                client = db.query(Client).get(conv.client_id)
                instance = db.query(AgentInstance).get(conv.instance_id)
                
                enriched_conversations.append({
                    "conversation_id": conv.id,
                    "client": {
                        "id": client.id if client else None,
                        "name": f"{client.first_name} {client.last_name}" if client else "Unknown",
                        "phone": client.phone if client else None,
                        "email": client.email if client else None
                    },
                    "instance": {
                        "id": instance.id if instance else None,
                        "name": instance.name if instance else "Unknown"
                    },
                    "status": conv.status.value,
                    "trigger_type": conv.trigger_type,
                    "channel": conv.channel,
                    "priority": conv.priority,
                    "started_at": conv.started_at.isoformat() if conv.started_at else None,
                    "last_activity": conv.last_activity.isoformat() if conv.last_activity else None,
                    "message_count": conv.message_count or 0,
                    "duration_minutes": self._calculate_conversation_duration(conv, unit="minutes"),
                    "requires_attention": await self._requires_attention(conv)
                })
            
            # Summary statistics
            summary = {
                "total_active": len(conversations),
                "by_priority": self._group_by_priority(conversations),
                "by_channel": self._group_by_channel(conversations),
                "avg_duration_minutes": self._calculate_avg_duration(conversations),
                "longest_conversation": max(
                    [self._calculate_conversation_duration(c, "minutes") for c in conversations],
                    default=0
                )
            }
            
            return {
                "conversations": enriched_conversations,
                "summary": summary,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error getting active conversations: {str(e)}")
            raise
    
    async def transfer_conversation(
        self, 
        db: Session, 
        conversation_id: int,
        target_instance_id: int,
        reason: str = "manual_transfer",
        transfer_context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Transfer conversation to another agent instance
        
        Args:
            db: Database session
            conversation_id: Conversation to transfer
            target_instance_id: Target agent instance
            reason: Reason for transfer
            transfer_context: Additional context for transfer
            
        Returns:
            Transfer result and new conversation details
        """
        try:
            conversation = db.query(AgentConversation).get(conversation_id)
            if not conversation:
                raise ValueError(f"Conversation {conversation_id} not found")
            
            target_instance = db.query(AgentInstance).get(target_instance_id)
            if not target_instance:
                raise ValueError(f"Target instance {target_instance_id} not found")
            
            if conversation.instance_id == target_instance_id:
                return {
                    "conversation_id": conversation_id,
                    "status": "no_change",
                    "message": "Conversation is already on target instance"
                }
            
            # Get conversation history for context
            history = await self.get_conversation_history(db, conversation_id)
            
            # Create transfer context
            full_transfer_context = {
                "previous_instance_id": conversation.instance_id,
                "transfer_reason": reason,
                "conversation_history": history["messages"][-5:],  # Last 5 messages
                "transfer_time": datetime.now(timezone.utc).isoformat(),
                **(transfer_context or {})
            }
            
            # Update conversation
            original_instance_id = conversation.instance_id
            conversation.instance_id = target_instance_id
            conversation.context = json.dumps({
                **json.loads(conversation.context or "{}"),
                "transfer_history": [full_transfer_context]
            })
            conversation.last_activity = datetime.now(timezone.utc).replace(tzinfo=None)
            
            # Add transfer notification message
            transfer_message = f"Conversation transferred to {target_instance.name} - {reason}"
            await self._add_message_to_history(
                db, conversation_id, transfer_message, MessageType.SYSTEM
            )
            
            db.commit()
            
            # Update metrics
            await self._update_transfer_metrics(db, original_instance_id, target_instance_id)
            
            return {
                "conversation_id": conversation_id,
                "status": "transferred",
                "previous_instance_id": original_instance_id,
                "new_instance_id": target_instance_id,
                "transfer_reason": reason,
                "transfer_time": datetime.now(timezone.utc).isoformat(),
                "context_preserved": True,
                "history_length": len(history["messages"])
            }
            
        except Exception as e:
            logger.error(f"Error transferring conversation {conversation_id}: {str(e)}")
            db.rollback()
            raise
    
    async def get_conversation_analytics(
        self, 
        db: Session, 
        instance_id: Optional[int] = None,
        time_range: str = "24h",
        include_trends: bool = True
    ) -> Dict[str, Any]:
        """
        Get conversation analytics and metrics
        
        Args:
            db: Database session
            instance_id: Optional instance filter
            time_range: Time range for analysis
            include_trends: Whether to include trend analysis
            
        Returns:
            Comprehensive conversation analytics
        """
        try:
            # Parse time range
            start_time = self._parse_time_range(time_range)
            
            # Build base query
            query = db.query(AgentConversation).filter(
                AgentConversation.created_at >= start_time
            )
            
            if instance_id:
                query = query.filter(AgentConversation.instance_id == instance_id)
            
            conversations = query.all()
            
            # Calculate metrics
            metrics = {
                "total_conversations": len(conversations),
                "completed_conversations": len([c for c in conversations if c.status == ConversationStatus.COMPLETED]),
                "active_conversations": len([c for c in conversations if c.status == ConversationStatus.ACTIVE]),
                "error_conversations": len([c for c in conversations if c.status == ConversationStatus.ERROR]),
                "avg_duration_minutes": self._calculate_avg_duration(conversations, "minutes"),
                "avg_messages_per_conversation": sum(c.message_count or 0 for c in conversations) / len(conversations) if conversations else 0,
                "success_rate": len([c for c in conversations if c.status == ConversationStatus.COMPLETED]) / len(conversations) if conversations else 0,
                "channels": self._group_by_channel(conversations),
                "triggers": self._group_by_trigger(conversations),
                "priorities": self._group_by_priority(conversations)
            }
            
            # Trend analysis if requested
            trends = {}
            if include_trends:
                trends = await self._calculate_conversation_trends(db, instance_id, time_range)
            
            # Performance insights
            performance = {
                "top_performing_triggers": await self._get_top_performing_triggers(conversations),
                "channel_effectiveness": await self._analyze_channel_effectiveness(conversations),
                "peak_hours": await self._identify_peak_hours(conversations),
                "resolution_times": await self._analyze_resolution_times(conversations)
            }
            
            return {
                "time_range": time_range,
                "instance_id": instance_id,
                "metrics": metrics,
                "trends": trends,
                "performance": performance,
                "recommendations": await self._generate_conversation_recommendations(metrics, performance),
                "generated_at": datetime.now(timezone.utc).isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error getting conversation analytics: {str(e)}")
            raise
    
    # Helper methods
    
    async def _initialize_conversation_context(self, db: Session, conversation: AgentConversation):
        """Initialize conversation with context and setup"""
        try:
            # Get agent and instance details
            instance = db.query(AgentInstance).get(conversation.instance_id)
            agent = db.query(Agent).get(instance.agent_id) if instance else None
            client = db.query(Client).get(conversation.client_id)
            
            # Build initial context
            context = json.loads(conversation.context or "{}")
            context.update({
                "agent_name": agent.name if agent else "Assistant",
                "client_name": f"{client.first_name} {client.last_name}" if client else "Client",
                "conversation_start": conversation.created_at.isoformat(),
                "trigger_type": conversation.trigger_type,
                "channel": conversation.channel,
                "business_context": await self._get_business_context(db, client, agent)
            })
            
            conversation.context = json.dumps(context)
            db.commit()
            
        except Exception as e:
            logger.warning(f"Error initializing conversation context: {str(e)}")
    
    async def _start_conversation(self, db: Session, conversation: AgentConversation) -> Dict[str, Any]:
        """Start a conversation with initial message"""
        try:
            # Generate initial message based on trigger type
            initial_message = await self._generate_initial_message(db, conversation)
            
            # Add to conversation history
            await self._add_message_to_history(
                db, conversation.id, initial_message["content"], MessageType.AGENT
            )
            
            # Send initial message
            delivery_result = await self._deliver_response(conversation, initial_message["content"])
            
            # Update conversation
            conversation.started_at = datetime.now(timezone.utc).replace(tzinfo=None)
            conversation.last_activity = conversation.started_at
            conversation.message_count = 1
            db.commit()
            
            return {
                "initial_message": initial_message["content"],
                "delivery_status": delivery_result,
                "started_at": conversation.started_at.isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error starting conversation {conversation.id}: {str(e)}")
            raise
    
    async def _generate_ai_response(
        self, 
        db: Session, 
        conversation: AgentConversation, 
        user_message: str
    ) -> Dict[str, Any]:
        """Generate AI response for user message"""
        try:
            start_time = datetime.now()
            
            # Get conversation context
            context = await self._build_conversation_context(db, conversation, user_message)
            
            # Get agent configuration
            instance = db.query(AgentInstance).get(conversation.instance_id)
            agent = db.query(Agent).get(instance.agent_id) if instance else None
            
            if not agent:
                raise ValueError("Agent not found for conversation")
            
            # Generate response using AI
            response = await self.ai_manager.generate_response(
                prompt=agent.prompt_template,
                context=context,
                max_tokens=500,
                temperature=0.7
            )
            
            processing_time = (datetime.now() - start_time).total_seconds() * 1000
            
            return {
                "success": True,
                "response": response,
                "processing_time_ms": processing_time,
                "confidence_score": 0.85,  # Would be calculated based on AI response
                "tokens_used": len(response.split()) * 1.3  # Rough estimation
            }
            
        except Exception as e:
            logger.error(f"Error generating AI response: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "fallback_response": "I apologize, but I'm experiencing technical difficulties. Please try again in a moment."
            }
    
    async def _add_message_to_history(
        self, 
        db: Session, 
        conversation_id: int, 
        content: str, 
        message_type: MessageType,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """Add message to conversation history"""
        try:
            # In production, this would insert into a messages table
            # For now, we'll store in conversation context or a separate structure
            logger.info(f"Message added to conversation {conversation_id}: {message_type.value} - {content[:100]}...")
            
        except Exception as e:
            logger.warning(f"Error adding message to history: {str(e)}")
    
    async def _deliver_response(
        self, 
        conversation: AgentConversation, 
        message: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Deliver response via appropriate channel"""
        try:
            # Get client contact info
            client = Client.query.get(conversation.client_id)  # Assuming SQLAlchemy setup
            
            delivery_method = conversation.channel
            
            if delivery_method == ChannelType.SMS.value:
                # Send SMS
                result = await notification_service.send_sms(
                    phone=client.phone,
                    message=message
                )
                return {"method": "sms", "success": result.get("success", False)}
                
            elif delivery_method == ChannelType.EMAIL.value:
                # Send email
                result = await notification_service.send_email(
                    email=client.email,
                    subject="Message from your barber",
                    content=message
                )
                return {"method": "email", "success": result.get("success", False)}
                
            else:
                # Default/fallback
                return {"method": delivery_method, "success": True, "note": "Simulated delivery"}
            
        except Exception as e:
            logger.error(f"Error delivering response: {str(e)}")
            return {"method": conversation.channel, "success": False, "error": str(e)}
    
    # Additional helper methods would continue here for:
    # - _should_end_conversation
    # - _end_conversation  
    # - _handle_ai_error
    # - _get_message_count
    # - _get_conversation_messages
    # - _generate_conversation_summary
    # - _calculate_conversation_duration
    # - _requires_attention
    # - _group_by_priority/channel/trigger
    # - _calculate_avg_duration
    # - _update_transfer_metrics
    # - _parse_time_range
    # - _calculate_conversation_trends
    # - _get_top_performing_triggers
    # - _analyze_channel_effectiveness
    # - _identify_peak_hours
    # - _analyze_resolution_times
    # - _generate_conversation_recommendations
    # - _get_business_context
    # - _generate_initial_message
    # - _build_conversation_context
    # - _estimate_conversation_duration
    
    # These would implement the specific business logic for conversation management