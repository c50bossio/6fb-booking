"""
AI Message Generator Service

This service creates personalized, contextually-aware messages for various scenarios:
- Appointment reminders with personalized content
- No-show prevention messages
- Re-booking invitations
- Birthday and special occasion messages
- Review requests
- Cancellation and rescheduling communications

Features:
- AI-powered content generation using multiple providers
- Template-based fallbacks for reliability
- A/B testing capabilities
- Tone and style customization
- Multi-language support framework
- Real-time personalization based on client data
"""

import logging
import asyncio
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum
import json
import re
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func

from models import (
    User, Appointment, Client, NotificationTemplate, MessageTemplate,
    AIMessageGeneration, MessagePersonalization
)
from services.ai_providers.ai_provider_manager import ai_provider_manager
from services.ai_no_show_prediction_service import NoShowRiskScore, RiskLevel
from config import settings

logger = logging.getLogger(__name__)


class MessageType(Enum):
    """Types of messages that can be generated"""
    APPOINTMENT_REMINDER = "appointment_reminder"
    URGENT_CONFIRMATION = "urgent_confirmation"
    NO_SHOW_PREVENTION = "no_show_prevention"
    REBOOKING_INVITATION = "rebooking_invitation"
    BIRTHDAY_GREETING = "birthday_greeting"
    REVIEW_REQUEST = "review_request"
    CANCELLATION_CONFIRMATION = "cancellation_confirmation"
    RESCHEDULE_OFFER = "reschedule_offer"
    WELCOME_NEW_CLIENT = "welcome_new_client"
    LOYALTY_APPRECIATION = "loyalty_appreciation"
    FOLLOW_UP_CARE = "follow_up_care"
    WEATHER_ADVISORY = "weather_advisory"


class MessageTone(Enum):
    """Available message tones"""
    PROFESSIONAL = "professional"
    FRIENDLY = "friendly"
    CASUAL = "casual"
    URGENT = "urgent"
    WARM = "warm"
    EXCITED = "excited"
    CARING = "caring"


class MessageChannel(Enum):
    """Communication channels"""
    SMS = "sms"
    EMAIL = "email"
    PUSH = "push"
    VOICE = "voice"


@dataclass
class MessageContext:
    """Context data for message generation"""
    client_name: str
    first_name: str
    business_name: str
    appointment_data: Optional[Dict[str, Any]] = None
    client_history: Optional[Dict[str, Any]] = None
    risk_factors: Optional[Dict[str, Any]] = None
    personalization_data: Optional[Dict[str, Any]] = None
    special_occasions: Optional[List[str]] = None
    weather_data: Optional[Dict[str, Any]] = None
    business_context: Optional[Dict[str, Any]] = None


@dataclass
class GeneratedMessage:
    """Container for generated message content"""
    content: str
    subject: Optional[str]  # For emails
    message_type: MessageType
    tone: MessageTone
    channel: MessageChannel
    personalization_score: float  # 0-1, how personalized the message is
    ai_provider_used: Optional[str]
    generation_time: datetime
    confidence_score: float  # 0-1, AI confidence in message quality
    fallback_used: bool
    a_b_variant: Optional[str]
    character_count: int
    estimated_engagement: float  # 0-1, predicted engagement rate


class AIMessageGenerator:
    """
    AI-powered message generation service.
    
    Creates personalized, contextually-aware messages using AI while maintaining
    brand consistency and professional standards.
    """
    
    def __init__(self, db: Session):
        self.db = db
        
        # Message generation prompts for different types
        self.generation_prompts = {
            MessageType.APPOINTMENT_REMINDER: {
                "system_prompt": """You are a professional barber shop assistant creating appointment reminder messages. 
                Create warm, personal messages that encourage attendance while maintaining professionalism. 
                Include appointment details clearly and add a personal touch based on client information.
                Keep SMS messages under 160 characters and email messages concise but informative.""",
                
                "base_template": """Create a {tone} {channel} message for {client_name} reminding them about their {service_name} appointment on {date} at {time} with {barber_name}.
                Client details: {client_context}
                Appointment context: {appointment_context}
                Business: {business_name}"""
            },
            
            MessageType.NO_SHOW_PREVENTION: {
                "system_prompt": """You are creating intervention messages to prevent appointment no-shows. 
                Be understanding but encouraging. Show that you value their business and want to help them keep their appointment. 
                Make it easy for them to confirm or reschedule if needed.""",
                
                "base_template": """Create a {tone} {channel} message for {client_name} whose {service_name} appointment on {date} at {time} has a high no-show risk.
                Risk factors: {risk_factors}
                Client relationship: {client_context}
                Make it caring but clear about the importance of confirmation."""
            },
            
            MessageType.REBOOKING_INVITATION: {
                "system_prompt": """You are inviting clients to rebook after they haven't visited in a while. 
                Be welcoming and show that you've missed them. Offer value and make rebooking easy. 
                Reference their previous service if appropriate and show genuine care for their experience.""",
                
                "base_template": """Create a {tone} {channel} message inviting {client_name} to rebook. 
                Last visit: {last_visit} for {last_service}
                Client value: {client_context}
                Time since last visit: {days_since_visit} days
                Make them feel welcomed back and valued."""
            },
            
            MessageType.BIRTHDAY_GREETING: {
                "system_prompt": """You are creating birthday messages that feel genuinely personal and celebratory. 
                Include a special offer or gesture that feels appropriate for their relationship with the business. 
                Be warm and festive while maintaining professionalism.""",
                
                "base_template": """Create a {tone} {channel} birthday message for {client_name}.
                Client relationship: {client_context}
                Previous visits: {visit_history}
                Include an appropriate birthday offer from {business_name}."""
            },
            
            MessageType.REVIEW_REQUEST: {
                "system_prompt": """You are requesting reviews from satisfied clients. 
                Be appreciative of their business and make the review request feel natural, not pushy. 
                Reference their specific service experience when possible.""",
                
                "base_template": """Create a {tone} {channel} review request for {client_name} after their {service_name} appointment on {date}.
                Service experience: {service_context}
                Client relationship: {client_context}
                Make it feel natural and appreciative."""
            },
            
            MessageType.WELCOME_NEW_CLIENT: {
                "system_prompt": """You are welcoming new clients and setting expectations for their experience. 
                Be warm and informative. Help them feel comfortable and prepared for their first visit. 
                Show excitement about serving them.""",
                
                "base_template": """Create a {tone} {channel} welcome message for new client {client_name} who just booked {service_name} on {date} at {time}.
                First-time client preparation and excitement.
                Business: {business_name}"""
            }
        }
        
        # Fallback templates for when AI generation fails
        self.fallback_templates = {
            MessageType.APPOINTMENT_REMINDER: {
                MessageChannel.SMS: "Hi {first_name}! Reminder: {service_name} appointment {date} at {time} with {barber_name}. See you soon! - {business_name}",
                MessageChannel.EMAIL: "Hi {first_name},\n\nThis is a friendly reminder about your {service_name} appointment on {date} at {time} with {barber_name}.\n\nWe look forward to seeing you!\n\nBest regards,\n{business_name}"
            },
            MessageType.NO_SHOW_PREVENTION: {
                MessageChannel.SMS: "Hi {first_name}! Just confirming your {service_name} appointment {date} at {time}. Please reply CONFIRM if you're still coming. Thanks! - {business_name}",
                MessageChannel.EMAIL: "Hi {first_name},\n\nWe wanted to confirm your {service_name} appointment on {date} at {time}.\n\nPlease let us know if you're still able to make it.\n\nThanks,\n{business_name}"
            },
            MessageType.REBOOKING_INVITATION: {
                MessageChannel.SMS: "Hi {first_name}! It's been a while since your last visit. Ready for your next {last_service}? Book online or call us! - {business_name}",
                MessageChannel.EMAIL: "Hi {first_name},\n\nWe've missed you! It's been a while since your last {last_service} appointment.\n\nWe'd love to see you again. Book your next appointment today!\n\nBest,\n{business_name}"
            }
        }
        
        # A/B testing variants
        self.ab_variants = {
            "tone": {
                "variant_a": MessageTone.PROFESSIONAL,
                "variant_b": MessageTone.FRIENDLY
            },
            "urgency": {
                "variant_a": "standard",
                "variant_b": "urgent"
            },
            "personalization": {
                "variant_a": "minimal",
                "variant_b": "full"
            },
            "call_to_action": {
                "variant_a": "soft",
                "variant_b": "direct"
            }
        }
    
    async def generate_message(
        self,
        message_type: MessageType,
        channel: MessageChannel,
        context: MessageContext,
        tone: Optional[MessageTone] = None,
        personalization_level: str = "full",
        ab_variant: Optional[str] = None
    ) -> GeneratedMessage:
        """
        Generate a personalized message using AI.
        
        Args:
            message_type: Type of message to generate
            channel: Communication channel (SMS, email, etc.)
            context: Context data for personalization
            tone: Optional specific tone to use
            personalization_level: "minimal", "standard", or "full"
            ab_variant: Optional A/B test variant identifier
            
        Returns:
            GeneratedMessage with content and metadata
        """
        try:
            start_time = datetime.utcnow()
            
            # Determine tone if not specified
            if not tone:
                tone = self._select_optimal_tone(message_type, context, channel)
            
            # Apply A/B testing if specified
            if ab_variant:
                tone, context = self._apply_ab_variant(ab_variant, tone, context)
            
            # Try AI generation first
            ai_content = await self._generate_with_ai(
                message_type, channel, context, tone, personalization_level
            )
            
            if ai_content:
                # AI generation successful
                content = ai_content["content"]
                confidence = ai_content.get("confidence", 0.7)
                provider_used = ai_content.get("provider")
                fallback_used = False
            else:
                # Fall back to template
                content = self._generate_with_template(message_type, channel, context, tone)
                confidence = 0.5
                provider_used = None
                fallback_used = True
            
            # Extract subject for emails
            subject = None
            if channel == MessageChannel.EMAIL:
                subject = self._extract_or_generate_subject(content, message_type, context)
            
            # Calculate metrics
            personalization_score = self._calculate_personalization_score(
                content, context, personalization_level
            )
            estimated_engagement = self._estimate_engagement(
                message_type, channel, tone, personalization_score
            )
            
            generation_time = datetime.utcnow()
            
            return GeneratedMessage(
                content=content,
                subject=subject,
                message_type=message_type,
                tone=tone,
                channel=channel,
                personalization_score=personalization_score,
                ai_provider_used=provider_used,
                generation_time=generation_time,
                confidence_score=confidence,
                fallback_used=fallback_used,
                a_b_variant=ab_variant,
                character_count=len(content),
                estimated_engagement=estimated_engagement
            )
            
        except Exception as e:
            logger.error(f"Error generating message: {e}")
            
            # Emergency fallback
            content = self._get_emergency_fallback(message_type, channel, context)
            
            return GeneratedMessage(
                content=content,
                subject="Appointment Update" if channel == MessageChannel.EMAIL else None,
                message_type=message_type,
                tone=MessageTone.PROFESSIONAL,
                channel=channel,
                personalization_score=0.1,
                ai_provider_used=None,
                generation_time=datetime.utcnow(),
                confidence_score=0.3,
                fallback_used=True,
                a_b_variant=ab_variant,
                character_count=len(content),
                estimated_engagement=0.3
            )
    
    async def generate_message_variants(
        self,
        message_type: MessageType,
        channel: MessageChannel,
        context: MessageContext,
        variant_count: int = 3
    ) -> List[GeneratedMessage]:
        """
        Generate multiple variants of a message for A/B testing.
        
        Args:
            message_type: Type of message to generate
            channel: Communication channel
            context: Context data for personalization
            variant_count: Number of variants to generate
            
        Returns:
            List of GeneratedMessage variants
        """
        variants = []
        
        # Generate different tone variants
        tones = [MessageTone.PROFESSIONAL, MessageTone.FRIENDLY, MessageTone.WARM]
        
        for i in range(min(variant_count, len(tones))):
            variant_id = f"variant_{chr(65 + i)}"  # A, B, C, etc.
            
            try:
                message = await self.generate_message(
                    message_type=message_type,
                    channel=channel,
                    context=context,
                    tone=tones[i],
                    ab_variant=variant_id
                )
                variants.append(message)
                
            except Exception as e:
                logger.error(f"Error generating variant {variant_id}: {e}")
                continue
        
        return variants
    
    async def optimize_message_content(
        self,
        base_content: str,
        message_type: MessageType,
        context: MessageContext,
        optimization_goals: List[str]
    ) -> GeneratedMessage:
        """
        Optimize existing message content using AI.
        
        Args:
            base_content: Original message content
            message_type: Type of message
            context: Context data
            optimization_goals: List of goals ("engagement", "clarity", "personalization", etc.)
            
        Returns:
            Optimized GeneratedMessage
        """
        try:
            # Create optimization prompt
            goals_text = ", ".join(optimization_goals)
            
            optimization_prompt = f"""Optimize this {message_type.value} message for {goals_text}:

Original message: "{base_content}"

Context:
- Client: {context.client_name}
- Business: {context.business_name}
- Appointment: {context.appointment_data}

Provide an improved version that maintains the core information while optimizing for {goals_text}.
Keep the same general length and tone."""
            
            messages = [
                {"role": "system", "content": "You are an expert at optimizing business communication messages for maximum effectiveness."},
                {"role": "user", "content": optimization_prompt}
            ]
            
            # Generate optimized content
            provider = ai_provider_manager.select_provider_by_task("optimization")
            response = await ai_provider_manager.generate_response(
                messages=messages,
                provider=provider,
                temperature=0.5,
                max_tokens=300
            )
            
            optimized_content = response["content"].strip()
            
            # Remove quotes if AI added them
            if optimized_content.startswith('"') and optimized_content.endswith('"'):
                optimized_content = optimized_content[1:-1]
            
            return GeneratedMessage(
                content=optimized_content,
                subject=None,
                message_type=message_type,
                tone=MessageTone.PROFESSIONAL,
                channel=MessageChannel.SMS,  # Default
                personalization_score=0.8,
                ai_provider_used=response.get("provider_used"),
                generation_time=datetime.utcnow(),
                confidence_score=0.8,
                fallback_used=False,
                a_b_variant="optimized",
                character_count=len(optimized_content),
                estimated_engagement=0.75
            )
            
        except Exception as e:
            logger.error(f"Error optimizing message content: {e}")
            
            # Return original with metadata
            return GeneratedMessage(
                content=base_content,
                subject=None,
                message_type=message_type,
                tone=MessageTone.PROFESSIONAL,
                channel=MessageChannel.SMS,
                personalization_score=0.5,
                ai_provider_used=None,
                generation_time=datetime.utcnow(),
                confidence_score=0.5,
                fallback_used=True,
                a_b_variant="original",
                character_count=len(base_content),
                estimated_engagement=0.5
            )
    
    async def get_message_performance_analytics(
        self,
        user_id: int,
        days_back: int = 30
    ) -> Dict[str, Any]:
        """
        Get analytics on message performance for optimization.
        
        Args:
            user_id: Business owner user ID
            days_back: Number of days to analyze
            
        Returns:
            Performance analytics and insights
        """
        start_date = datetime.utcnow() - timedelta(days=days_back)
        
        # This would query actual performance data
        # For now, return mock analytics structure
        
        analytics = {
            "period_days": days_back,
            "total_messages_generated": 450,
            "ai_generation_success_rate": 0.92,
            "fallback_usage_rate": 0.08,
            "average_personalization_score": 0.78,
            "performance_by_type": {
                MessageType.APPOINTMENT_REMINDER.value: {
                    "generated": 200,
                    "avg_engagement": 0.65,
                    "response_rate": 0.45
                },
                MessageType.NO_SHOW_PREVENTION.value: {
                    "generated": 80,
                    "avg_engagement": 0.72,
                    "response_rate": 0.58
                },
                MessageType.REBOOKING_INVITATION.value: {
                    "generated": 60,
                    "avg_engagement": 0.55,
                    "response_rate": 0.35
                }
            },
            "performance_by_tone": {
                MessageTone.FRIENDLY.value: {"engagement": 0.68, "response_rate": 0.48},
                MessageTone.PROFESSIONAL.value: {"engagement": 0.62, "response_rate": 0.45},
                MessageTone.WARM.value: {"engagement": 0.71, "response_rate": 0.52}
            },
            "performance_by_channel": {
                MessageChannel.SMS.value: {"engagement": 0.75, "response_rate": 0.55},
                MessageChannel.EMAIL.value: {"engagement": 0.45, "response_rate": 0.25}
            },
            "optimization_opportunities": [
                "Friendly tone shows 12% higher engagement than professional",
                "SMS messages have 2.2x higher response rate than email",
                "Messages with >0.8 personalization score have 25% better engagement"
            ],
            "top_performing_elements": [
                "Client name personalization",
                "Service-specific references",
                "Time-sensitive language",
                "Clear call-to-action"
            ]
        }
        
        return analytics
    
    # Private helper methods
    
    async def _generate_with_ai(
        self,
        message_type: MessageType,
        channel: MessageChannel,
        context: MessageContext,
        tone: MessageTone,
        personalization_level: str
    ) -> Optional[Dict[str, Any]]:
        """Generate message content using AI"""
        try:
            # Get prompt template
            prompt_data = self.generation_prompts.get(message_type)
            if not prompt_data:
                logger.warning(f"No prompt template for message type {message_type}")
                return None
            
            # Prepare context variables
            context_vars = self._prepare_context_variables(context, personalization_level)
            
            # Format the prompt
            user_prompt = prompt_data["base_template"].format(
                tone=tone.value,
                channel=channel.value,
                **context_vars
            )
            
            # Add channel-specific instructions
            if channel == MessageChannel.SMS:
                user_prompt += "\n\nIMPORTANT: Keep the message under 160 characters for SMS delivery."
            elif channel == MessageChannel.EMAIL:
                user_prompt += "\n\nCreate both a subject line and message body. Format as 'Subject: [subject]\\n\\n[message body]'"
            
            messages = [
                {"role": "system", "content": prompt_data["system_prompt"]},
                {"role": "user", "content": user_prompt}
            ]
            
            # Select appropriate AI provider
            provider = ai_provider_manager.select_provider_by_task(message_type.value)
            
            # Generate content
            response = await ai_provider_manager.generate_response(
                messages=messages,
                provider=provider,
                temperature=0.7,
                max_tokens=200 if channel == MessageChannel.SMS else 500
            )
            
            content = response["content"].strip()
            
            # Validate content
            if not self._validate_generated_content(content, channel, message_type):
                logger.warning(f"Generated content failed validation for {message_type}")
                return None
            
            return {
                "content": content,
                "confidence": 0.8,
                "provider": response.get("provider_used")
            }
            
        except Exception as e:
            logger.error(f"AI generation failed: {e}")
            return None
    
    def _generate_with_template(
        self,
        message_type: MessageType,
        channel: MessageChannel,
        context: MessageContext,
        tone: MessageTone
    ) -> str:
        """Generate message using fallback templates"""
        templates = self.fallback_templates.get(message_type, {})
        template = templates.get(channel)
        
        if not template:
            # Use generic template
            if channel == MessageChannel.SMS:
                template = "Hi {first_name}! Message from {business_name}. Please contact us for more information."
            else:
                template = "Hi {first_name},\n\nWe wanted to reach out to you.\n\nBest regards,\n{business_name}"
        
        # Prepare context variables
        context_vars = self._prepare_context_variables(context, "minimal")
        
        try:
            return template.format(**context_vars)
        except KeyError as e:
            logger.error(f"Template formatting error: {e}")
            return f"Hi {context.first_name}! Message from {context.business_name}."
    
    def _prepare_context_variables(
        self,
        context: MessageContext,
        personalization_level: str
    ) -> Dict[str, Any]:
        """Prepare context variables for template formatting"""
        vars_dict = {
            "client_name": context.client_name,
            "first_name": context.first_name,
            "business_name": context.business_name,
        }
        
        # Add appointment data if available
        if context.appointment_data:
            vars_dict.update({
                "service_name": context.appointment_data.get("service_name", "appointment"),
                "date": context.appointment_data.get("date", "upcoming"),
                "time": context.appointment_data.get("time", ""),
                "barber_name": context.appointment_data.get("barber_name", "your barber")
            })
        
        # Add client history if available and personalization is enabled
        if personalization_level in ["standard", "full"] and context.client_history:
            vars_dict.update({
                "last_visit": context.client_history.get("last_visit", ""),
                "last_service": context.client_history.get("last_service", "service"),
                "visit_count": context.client_history.get("visit_count", 0),
                "days_since_visit": context.client_history.get("days_since_visit", 0)
            })
        
        # Add rich context for full personalization
        if personalization_level == "full":
            if context.client_history:
                vars_dict["client_context"] = self._create_client_context_summary(context.client_history)
            
            if context.appointment_data:
                vars_dict["appointment_context"] = self._create_appointment_context_summary(context.appointment_data)
            
            if context.risk_factors:
                vars_dict["risk_factors"] = ", ".join(context.risk_factors.get("factors", []))
        
        # Ensure all variables have safe defaults
        safe_vars = {}
        for key, value in vars_dict.items():
            if value is None:
                safe_vars[key] = ""
            elif isinstance(value, (list, dict)):
                safe_vars[key] = str(value)
            else:
                safe_vars[key] = str(value)
        
        return safe_vars
    
    def _create_client_context_summary(self, client_history: Dict[str, Any]) -> str:
        """Create a summary of client context for AI"""
        context_parts = []
        
        if client_history.get("visit_count", 0) == 0:
            context_parts.append("new client")
        elif client_history.get("visit_count", 0) > 10:
            context_parts.append("loyal long-term client")
        else:
            context_parts.append("returning client")
        
        if client_history.get("total_spent", 0) > 500:
            context_parts.append("high-value customer")
        
        if client_history.get("last_visit_days_ago", 0) > 90:
            context_parts.append("hasn't visited recently")
        
        return ", ".join(context_parts) if context_parts else "valued client"
    
    def _create_appointment_context_summary(self, appointment_data: Dict[str, Any]) -> str:
        """Create a summary of appointment context for AI"""
        context_parts = []
        
        if appointment_data.get("is_first_time", False):
            context_parts.append("first appointment")
        
        if appointment_data.get("advance_booking_days", 0) == 0:
            context_parts.append("same-day booking")
        elif appointment_data.get("advance_booking_days", 0) > 14:
            context_parts.append("advance booking")
        
        if appointment_data.get("is_weekend", False):
            context_parts.append("weekend appointment")
        
        return ", ".join(context_parts) if context_parts else "regular appointment"
    
    def _select_optimal_tone(
        self,
        message_type: MessageType,
        context: MessageContext,
        channel: MessageChannel
    ) -> MessageTone:
        """Select optimal tone based on message type and context"""
        
        # Default tone mappings
        tone_mapping = {
            MessageType.APPOINTMENT_REMINDER: MessageTone.FRIENDLY,
            MessageType.URGENT_CONFIRMATION: MessageTone.URGENT,
            MessageType.NO_SHOW_PREVENTION: MessageTone.CARING,
            MessageType.REBOOKING_INVITATION: MessageTone.WARM,
            MessageType.BIRTHDAY_GREETING: MessageTone.EXCITED,
            MessageType.REVIEW_REQUEST: MessageTone.PROFESSIONAL,
            MessageType.WELCOME_NEW_CLIENT: MessageTone.WARM
        }
        
        base_tone = tone_mapping.get(message_type, MessageTone.PROFESSIONAL)
        
        # Adjust based on client history
        if context.client_history:
            visit_count = context.client_history.get("visit_count", 0)
            if visit_count > 10:
                # More familiar tone for loyal clients
                if base_tone == MessageTone.PROFESSIONAL:
                    base_tone = MessageTone.FRIENDLY
            elif visit_count == 0:
                # More professional tone for new clients
                if base_tone == MessageTone.CASUAL:
                    base_tone = MessageTone.FRIENDLY
        
        return base_tone
    
    def _apply_ab_variant(
        self,
        variant: str,
        tone: MessageTone,
        context: MessageContext
    ) -> Tuple[MessageTone, MessageContext]:
        """Apply A/B testing variant modifications"""
        # This would implement A/B testing logic
        # For now, return original values
        return tone, context
    
    def _validate_generated_content(
        self,
        content: str,
        channel: MessageChannel,
        message_type: MessageType
    ) -> bool:
        """Validate that generated content meets requirements"""
        
        # Check length limits
        if channel == MessageChannel.SMS and len(content) > 160:
            return False
        
        # Check for required elements
        if message_type == MessageType.APPOINTMENT_REMINDER:
            # Should contain time-related words
            if not any(word in content.lower() for word in ["appointment", "reminder", "tomorrow", "today", "time"]):
                return False
        
        # Check for inappropriate content (basic check)
        inappropriate_terms = ["spam", "scam", "free money", "urgent transfer"]
        if any(term in content.lower() for term in inappropriate_terms):
            return False
        
        return True
    
    def _extract_or_generate_subject(
        self,
        content: str,
        message_type: MessageType,
        context: MessageContext
    ) -> str:
        """Extract or generate email subject line"""
        
        # Check if AI included subject in content
        if content.startswith("Subject:"):
            lines = content.split("\n", 1)
            return lines[0].replace("Subject:", "").strip()
        
        # Generate subject based on message type
        subject_templates = {
            MessageType.APPOINTMENT_REMINDER: f"Appointment reminder - {context.appointment_data.get('date', 'upcoming')}",
            MessageType.NO_SHOW_PREVENTION: "Please confirm your appointment",
            MessageType.REBOOKING_INVITATION: "We'd love to see you again!",
            MessageType.BIRTHDAY_GREETING: f"Happy Birthday from {context.business_name}!",
            MessageType.REVIEW_REQUEST: "How was your recent visit?",
            MessageType.WELCOME_NEW_CLIENT: f"Welcome to {context.business_name}!"
        }
        
        return subject_templates.get(message_type, f"Message from {context.business_name}")
    
    def _calculate_personalization_score(
        self,
        content: str,
        context: MessageContext,
        personalization_level: str
    ) -> float:
        """Calculate how personalized a message is"""
        score = 0.0
        
        # Name usage
        if context.first_name.lower() in content.lower():
            score += 0.3
        
        # Service specific content
        if context.appointment_data and context.appointment_data.get("service_name", "").lower() in content.lower():
            score += 0.2
        
        # Client history references
        if context.client_history and any(
            str(value).lower() in content.lower() 
            for key, value in context.client_history.items()
            if isinstance(value, str)
        ):
            score += 0.3
        
        # Business name usage
        if context.business_name.lower() in content.lower():
            score += 0.1
        
        # Time/date specific content
        if any(word in content.lower() for word in ["today", "tomorrow", "this week", "next week"]):
            score += 0.1
        
        return min(1.0, score)
    
    def _estimate_engagement(
        self,
        message_type: MessageType,
        channel: MessageChannel,
        tone: MessageTone,
        personalization_score: float
    ) -> float:
        """Estimate engagement rate for a message"""
        
        # Base engagement rates by type and channel
        base_rates = {
            (MessageType.APPOINTMENT_REMINDER, MessageChannel.SMS): 0.65,
            (MessageType.APPOINTMENT_REMINDER, MessageChannel.EMAIL): 0.35,
            (MessageType.NO_SHOW_PREVENTION, MessageChannel.SMS): 0.72,
            (MessageType.REBOOKING_INVITATION, MessageChannel.SMS): 0.45,
            (MessageType.BIRTHDAY_GREETING, MessageChannel.SMS): 0.80,
        }
        
        base_rate = base_rates.get((message_type, channel), 0.50)
        
        # Adjust for tone
        tone_multipliers = {
            MessageTone.FRIENDLY: 1.1,
            MessageTone.WARM: 1.15,
            MessageTone.PROFESSIONAL: 1.0,
            MessageTone.URGENT: 0.95,
            MessageTone.EXCITED: 1.05
        }
        
        tone_multiplier = tone_multipliers.get(tone, 1.0)
        
        # Adjust for personalization
        personalization_boost = personalization_score * 0.2
        
        estimated_rate = base_rate * tone_multiplier + personalization_boost
        return min(1.0, estimated_rate)
    
    def _get_emergency_fallback(
        self,
        message_type: MessageType,
        channel: MessageChannel,
        context: MessageContext
    ) -> str:
        """Get emergency fallback message when everything else fails"""
        
        if channel == MessageChannel.SMS:
            return f"Hi {context.first_name}! Message from {context.business_name}. Please call us for details."
        else:
            return f"Hi {context.first_name},\n\nWe have an update for you. Please contact us at your convenience.\n\nBest regards,\n{context.business_name}"


# Singleton instance
ai_message_generator = None

def get_ai_message_generator(db: Session) -> AIMessageGenerator:
    """Get or create the AI message generator instance"""
    global ai_message_generator
    if ai_message_generator is None:
        ai_message_generator = AIMessageGenerator(db)
    return ai_message_generator