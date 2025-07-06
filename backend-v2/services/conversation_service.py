"""
Conversation Service - Manages AI-powered conversations with clients
"""

import json
import logging
import asyncio
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import and_

from models import (
    AgentConversation, AgentInstance, Client, ConversationStatus,
    AgentType, Appointment, Payment
)
from services.ai_providers import AIProviderManager
from services.notification_service import notification_service
# BookingService not needed - using direct functions from booking_service module instead
from services.payment_service import PaymentService
from services.agent_templates import agent_templates
from config import settings

logger = logging.getLogger(__name__)


class ConversationService:
    """Handles AI-powered conversations between agents and clients"""
    
    def __init__(self):
        self.ai_manager = AIProviderManager()
        self.payment_service = PaymentService()
        self.max_conversation_length = 10  # Maximum back-and-forth messages
        
    async def execute_conversation(self, db: Session, conversation_id: int) -> Dict[str, Any]:
        """Execute a scheduled conversation"""
        conversation = db.query(AgentConversation).filter_by(id=conversation_id).first()
        if not conversation:
            raise ValueError(f"Conversation {conversation_id} not found")
        
        if conversation.status != ConversationStatus.PENDING:
            logger.warning(f"Conversation {conversation_id} not in pending state")
            return {"status": "skipped", "reason": "not_pending"}
        
        try:
            # Update status
            conversation.status = ConversationStatus.IN_PROGRESS
            conversation.started_at = datetime.utcnow()
            db.commit()
            
            # Get agent instance and template
            instance = conversation.agent_instance
            agent = instance.agent
            template = agent_templates.get_all_templates().get(agent.agent_type.value, {})
            
            # Generate and send initial message
            initial_message = await self._generate_initial_message(
                db, conversation, instance, template
            )
            
            if initial_message:
                # Send message
                success = await self._send_message(
                    conversation, initial_message, "assistant"
                )
                
                if success:
                    conversation.status = ConversationStatus.WAITING_RESPONSE
                    conversation.last_message_at = datetime.utcnow()
                    db.commit()
                    
                    return {
                        "status": "success",
                        "message_sent": initial_message,
                        "channel": conversation.channel
                    }
                else:
                    conversation.status = ConversationStatus.FAILED
                    db.commit()
                    return {"status": "failed", "reason": "send_failed"}
            
        except Exception as e:
            logger.error(f"Error executing conversation {conversation_id}: {e}")
            conversation.status = ConversationStatus.FAILED
            db.commit()
            return {"status": "error", "error": str(e)}
    
    async def handle_client_response(
        self, 
        db: Session, 
        conversation_id: str, 
        message: str,
        channel: str
    ) -> Dict[str, Any]:
        """Handle a response from a client"""
        conversation = db.query(AgentConversation).filter_by(
            conversation_id=conversation_id,
            status=ConversationStatus.WAITING_RESPONSE
        ).first()
        
        if not conversation:
            logger.warning(f"No active conversation found for {conversation_id}")
            return {"status": "no_conversation"}
        
        try:
            # Add client message to conversation
            await self._add_message(conversation, message, "user")
            
            # Check for opt-out
            if self._is_opt_out_message(message):
                return await self._handle_opt_out(db, conversation)
            
            # Generate AI response
            response = await self._generate_response(db, conversation, message)
            
            if response:
                # Send response
                success = await self._send_message(conversation, response, "assistant")
                
                if success:
                    # Check if goal achieved
                    goal_status = await self._check_goal_achieved(db, conversation, message)
                    
                    if goal_status["achieved"]:
                        conversation.status = ConversationStatus.COMPLETED
                        conversation.goal_achieved = True
                        conversation.completed_at = datetime.utcnow()
                        
                        # Update metrics based on goal
                        await self._update_conversation_metrics(db, conversation, goal_status)
                    
                    db.commit()
                    
                    return {
                        "status": "success",
                        "response_sent": response,
                        "goal_achieved": goal_status.get("achieved", False)
                    }
            
            return {"status": "failed", "reason": "response_generation_failed"}
            
        except Exception as e:
            logger.error(f"Error handling response for conversation {conversation_id}: {e}")
            return {"status": "error", "error": str(e)}
    
    async def _generate_initial_message(
        self,
        db: Session,
        conversation: AgentConversation,
        instance: AgentInstance,
        template: Dict[str, Any]
    ) -> Optional[str]:
        """Generate the initial message for a conversation"""
        try:
            # Get message template based on channel
            channel_key = f"initial_{conversation.channel}"
            message_template = template.get("prompt_templates", {}).get(
                channel_key,
                template.get("prompt_templates", {}).get("initial_sms", "")
            )
            
            # Get system prompt
            system_prompt = template.get("prompt_templates", {}).get("system", "")
            
            # Format templates with context
            context = conversation.context_data
            formatted_message = self._format_template(message_template, context)
            formatted_system = self._format_template(system_prompt, context)
            
            # Use AI to personalize if enabled
            if instance.config.get("use_ai_personalization", True):
                messages = [
                    {"role": "system", "content": formatted_system},
                    {"role": "user", "content": f"""Generate a personalized message based on this template:
                    
Template: {formatted_message}

Keep the same intent and information, but make it feel more natural and personalized.
For SMS, keep it under 160 characters. For email, keep it concise but complete."""}
                ]
                
                # Select provider based on task
                provider = self.ai_manager.select_provider_by_task(
                    instance.agent.agent_type.value
                )
                
                response = await self.ai_manager.generate_response(
                    messages=messages,
                    provider=provider,
                    temperature=instance.config.get("temperature", 0.7),
                    max_tokens=300
                )
                
                # Update token usage
                await self._update_token_usage(conversation, response["usage"])
                
                return response["content"]
            else:
                # Use template as-is
                return formatted_message
                
        except Exception as e:
            logger.error(f"Error generating initial message: {e}")
            return None
    
    async def _generate_response(
        self,
        db: Session,
        conversation: AgentConversation,
        client_message: str
    ) -> Optional[str]:
        """Generate AI response to client message"""
        try:
            instance = conversation.agent_instance
            agent = instance.agent
            
            # Build conversation history
            messages = self._build_conversation_history(conversation)
            
            # Add client message
            messages.append({"role": "user", "content": client_message})
            
            # Add context-aware prompt
            context_prompt = self._build_context_prompt(conversation, agent.agent_type)
            messages.append({"role": "user", "content": context_prompt})
            
            # Generate response
            provider = self.ai_manager.select_provider_by_task(agent.agent_type.value)
            
            response = await self.ai_manager.generate_response(
                messages=messages,
                provider=provider,
                temperature=instance.config.get("temperature", 0.7),
                max_tokens=instance.config.get("max_tokens", 300)
            )
            
            # Update token usage
            await self._update_token_usage(conversation, response["usage"])
            
            return response["content"]
            
        except Exception as e:
            logger.error(f"Error generating response: {e}")
            return None
    
    def _build_conversation_history(self, conversation: AgentConversation) -> List[Dict[str, str]]:
        """Build conversation history for AI context"""
        messages = []
        
        # Add system prompt
        instance = conversation.agent_instance
        template = agent_templates.get_all_templates().get(
            instance.agent.agent_type.value, {}
        )
        system_prompt = template.get("prompt_templates", {}).get("system", "")
        formatted_system = self._format_template(system_prompt, conversation.context_data)
        
        messages.append({"role": "system", "content": formatted_system})
        
        # Add conversation history
        for msg in conversation.messages[-6:]:  # Last 6 messages for context
            messages.append({
                "role": msg["role"],
                "content": msg["content"]
            })
        
        return messages
    
    def _build_context_prompt(self, conversation: AgentConversation, agent_type: AgentType) -> str:
        """Build context-aware prompt based on agent type"""
        context = conversation.context_data
        
        if agent_type == AgentType.REBOOKING:
            return f"""The client has responded about booking an appointment. 
Available times this week: Monday 2pm, Tuesday 10am, Wednesday 3pm, Thursday 11am.
If they want to book, confirm the time and let them know you'll send a confirmation.
Keep response brief and friendly."""
        
        elif agent_type == AgentType.NO_SHOW_FEE:
            return f"""The client has responded about the no-show fee of ${context.get('no_show_amount', 25)}.
If they agree to pay, provide the payment link: {settings.frontend_url}/pay/no-show/{conversation.conversation_id}
If they want to add to next visit, confirm this and thank them.
Be understanding but firm about the policy."""
        
        elif agent_type == AgentType.BIRTHDAY_WISHES:
            return f"""The client has responded to birthday wishes.
If they want to book with the birthday discount, help them schedule.
Be warm and celebratory in tone."""
        
        else:
            return "Respond appropriately based on the conversation context. Be helpful and professional."
    
    async def _send_message(
        self, 
        conversation: AgentConversation, 
        message: str, 
        role: str
    ) -> bool:
        """Send message through appropriate channel"""
        try:
            # Add to conversation history
            await self._add_message(conversation, message, role)
            
            if role == "assistant":  # Only send AI messages
                client = conversation.client
                
                if conversation.channel == "sms":
                    # Use existing SMS service
                    response = await notification_service.send_sms(
                        to_phone=client.phone,
                        message=message,
                        conversation_id=conversation.conversation_id
                    )
                    return response.get("success", False)
                    
                elif conversation.channel == "email":
                    # Use existing email service
                    subject = self._generate_email_subject(conversation)
                    response = await notification_service.send_email(
                        to_email=client.email,
                        subject=subject,
                        body=message,
                        conversation_id=conversation.conversation_id
                    )
                    return response.get("success", False)
            
            return True
            
        except Exception as e:
            logger.error(f"Error sending message: {e}")
            return False
    
    async def _add_message(self, conversation: AgentConversation, content: str, role: str):
        """Add message to conversation history"""
        message = {
            "role": role,
            "content": content,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        if conversation.messages is None:
            conversation.messages = []
        
        conversation.messages.append(message)
        conversation.message_count += 1
        conversation.last_message_at = datetime.utcnow()
    
    async def _update_token_usage(self, conversation: AgentConversation, usage: Dict[str, int]):
        """Update token usage and costs"""
        conversation.prompt_tokens += usage.get("prompt_tokens", 0)
        conversation.completion_tokens += usage.get("completion_tokens", 0)
        conversation.total_tokens_used = conversation.prompt_tokens + conversation.completion_tokens
        
        # Calculate cost based on provider and model
        # This is a simplified calculation - real costs would come from provider
        cost_per_1k_tokens = 0.002  # Average cost
        conversation.token_cost = (conversation.total_tokens_used / 1000) * cost_per_1k_tokens
    
    async def _check_goal_achieved(
        self, 
        db: Session, 
        conversation: AgentConversation, 
        message: str
    ) -> Dict[str, Any]:
        """Check if conversation goal has been achieved"""
        instance = conversation.agent_instance
        agent_type = instance.agent.agent_type
        
        if agent_type == AgentType.REBOOKING:
            # Check if appointment was booked
            if any(keyword in message.lower() for keyword in ["yes", "book", "confirm", "schedule"]):
                # Create appointment (simplified - real implementation would parse details)
                return {"achieved": True, "type": "appointment_booked"}
                
        elif agent_type == AgentType.NO_SHOW_FEE:
            # Check if fee payment was agreed
            if any(keyword in message.lower() for keyword in ["pay", "yes", "ok", "add to next"]):
                return {"achieved": True, "type": "fee_collected", "amount": conversation.context_data.get("no_show_amount", 25)}
                
        elif agent_type == AgentType.REVIEW_REQUEST:
            # Check if review was promised
            if any(keyword in message.lower() for keyword in ["yes", "sure", "will do", "ok"]):
                return {"achieved": True, "type": "review_promised"}
        
        return {"achieved": False}
    
    async def _update_conversation_metrics(
        self, 
        db: Session, 
        conversation: AgentConversation,
        goal_status: Dict[str, Any]
    ):
        """Update metrics based on goal achievement"""
        if goal_status.get("type") == "appointment_booked":
            # Estimate appointment value
            conversation.revenue_generated = 50.0  # Average service price
            
        elif goal_status.get("type") == "fee_collected":
            conversation.revenue_generated = goal_status.get("amount", 25.0)
            
        # Update instance metrics
        instance = conversation.agent_instance
        instance.successful_conversations += 1
        instance.total_revenue_generated += conversation.revenue_generated
    
    def _is_opt_out_message(self, message: str) -> bool:
        """Check if message indicates opt-out"""
        opt_out_keywords = ["stop", "unsubscribe", "opt out", "remove me", "no more"]
        return any(keyword in message.lower() for keyword in opt_out_keywords)
    
    async def _handle_opt_out(self, db: Session, conversation: AgentConversation) -> Dict[str, Any]:
        """Handle client opt-out"""
        conversation.status = ConversationStatus.OPTED_OUT
        conversation.completed_at = datetime.utcnow()
        
        # Update client preferences
        client = conversation.client
        client.agent_opt_out = True
        
        # Send confirmation
        opt_out_message = "You've been unsubscribed from automated messages. You can still book appointments anytime at our website."
        await self._send_message(conversation, opt_out_message, "assistant")
        
        db.commit()
        
        return {"status": "opted_out"}
    
    def _format_template(self, template: str, context: Dict[str, Any]) -> str:
        """Format template with context variables"""
        try:
            # Simple string formatting for now
            for key, value in context.items():
                template = template.replace(f"{{{key}}}", str(value))
            return template
        except Exception as e:
            logger.error(f"Error formatting template: {e}")
            return template
    
    def _generate_email_subject(self, conversation: AgentConversation) -> str:
        """Generate email subject based on agent type"""
        agent_type = conversation.agent_instance.agent.agent_type
        barbershop_name = conversation.context_data.get("barbershop_name", "Barbershop")
        
        subjects = {
            AgentType.REBOOKING: f"Time for your next visit at {barbershop_name}?",
            AgentType.NO_SHOW_FEE: f"Missed appointment - {barbershop_name}",
            AgentType.BIRTHDAY_WISHES: f"Happy Birthday from {barbershop_name}!",
            AgentType.REVIEW_REQUEST: f"How was your experience at {barbershop_name}?",
            AgentType.RETENTION: f"We miss you at {barbershop_name}!",
            AgentType.APPOINTMENT_REMINDER: f"Appointment reminder - {barbershop_name}"
        }
        
        return subjects.get(agent_type, f"Message from {barbershop_name}")


# Global instance
conversation_service = ConversationService()