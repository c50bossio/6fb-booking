"""
AI Integration Service for BookedBarber V2

This service integrates all AI services with the existing notification and SMS systems,
providing a unified interface for AI-powered communication features.

Key integrations:
- AI no-show prediction with notification scheduling
- AI intervention campaigns with notification service
- AI message generation with SMS/email templating  
- Enhanced SMS response handler with AI natural language processing
- Real-time analytics with behavioral learning
"""

import logging
import asyncio
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from services.ai_no_show_prediction_service import get_ai_no_show_prediction_service, RiskLevel
from services.ai_intervention_service import get_ai_intervention_service
from services.ai_message_generator import get_ai_message_generator, MessageType, MessageChannel
from services.enhanced_notification_service import get_enhanced_notification_service
from services.enhanced_sms_response_handler import get_enhanced_sms_handler
from services.behavioral_learning_service import get_behavioral_learning_service
from services.ai_template_optimization_service import get_ai_template_optimization_service
from services.notification_service import notification_service
from services.sms_response_handler import sms_response_handler
from models import Appointment, User, NotificationQueue
from config import settings

logger = logging.getLogger(__name__)


class AIIntegrationService:
    """
    Central service that orchestrates AI features with existing systems
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.prediction_service = get_ai_no_show_prediction_service(db)
        self.intervention_service = get_ai_intervention_service(db)
        self.message_generator = get_ai_message_generator()
        self.enhanced_notification_service = get_enhanced_notification_service(db)
        self.enhanced_sms_handler = get_enhanced_sms_handler(db)
        self.learning_service = get_behavioral_learning_service(db)
        self.template_optimization_service = get_ai_template_optimization_service(db)
        
        # Statistics tracking
        self.stats = {
            "predictions_generated": 0,
            "interventions_created": 0,
            "ai_messages_sent": 0,
            "enhanced_responses_processed": 0,
            "learning_insights_generated": 0,
            "last_reset": datetime.utcnow()
        }
    
    async def process_appointment_with_ai(self, appointment: Appointment) -> Dict[str, Any]:
        """
        Process an appointment through the complete AI pipeline:
        1. Generate no-show risk prediction
        2. Create intervention campaign if high risk
        3. Schedule optimized notifications
        4. Update behavioral learning data
        
        Args:
            appointment: Appointment to process
            
        Returns:
            Dict with processing results and recommendations
        """
        try:
            results = {
                "appointment_id": appointment.id,
                "ai_processing_complete": False,
                "risk_assessment": None,
                "intervention_campaign": None,
                "optimized_notifications": [],
                "recommendations": []
            }
            
            # Step 1: Generate risk prediction
            risk_score = await self.prediction_service.predict_no_show_risk(appointment.id)
            results["risk_assessment"] = {
                "risk_score": risk_score.risk_score,
                "risk_level": risk_score.risk_level.value,
                "risk_factors": [factor.description for factor in risk_score.risk_factors],
                "confidence_score": risk_score.confidence_score
            }
            self.stats["predictions_generated"] += 1
            
            # Step 2: Create intervention campaign for high-risk appointments
            if risk_score.risk_level in [RiskLevel.HIGH, RiskLevel.CRITICAL]:
                campaign = await self.intervention_service.create_intervention_campaign(appointment.id)
                results["intervention_campaign"] = {
                    "campaign_id": campaign.id,
                    "intervention_type": campaign.intervention_type.value,
                    "steps_count": len(campaign.intervention_steps),
                    "status": campaign.status.value
                }
                self.stats["interventions_created"] += 1
                
                # Get recommendations from intervention service
                recommendations = await self.intervention_service.get_campaign_recommendations(
                    risk_score.risk_level, {"appointment_id": appointment.id}
                )
                results["recommendations"].extend(recommendations)
            
            # Step 3: Schedule optimized notifications using enhanced service
            optimized_reminders = await self.enhanced_notification_service.schedule_intelligent_reminders(
                appointment.id, risk_score
            )
            results["optimized_notifications"] = [
                {
                    "notification_id": reminder.id,
                    "scheduled_time": reminder.scheduled_for.isoformat(),
                    "channel": reminder.notification_type,
                    "ai_optimized": True
                }
                for reminder in optimized_reminders
            ]
            
            # Step 4: Update behavioral learning
            await self.learning_service.update_client_behavior_profile(
                appointment.user_id if appointment.user_id else appointment.client_id,
                {
                    "appointment_created": True,
                    "risk_score": risk_score.risk_score,
                    "service_type": appointment.service_name,
                    "appointment_time": appointment.start_time,
                    "price": appointment.price
                }
            )
            
            results["ai_processing_complete"] = True
            logger.info(f"AI processing complete for appointment {appointment.id}, risk level: {risk_score.risk_level.value}")
            
            return results
            
        except Exception as e:
            logger.error(f"Error in AI appointment processing for {appointment.id}: {str(e)}")
            return {
                "appointment_id": appointment.id,
                "ai_processing_complete": False,
                "error": str(e)
            }
    
    async def enhance_notification_with_ai(
        self, 
        notification: NotificationQueue,
        message_context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Enhance a notification with AI-generated content and optimization
        
        Args:
            notification: Existing notification to enhance
            message_context: Context for AI message generation
            
        Returns:
            Dict with enhanced content and metadata
        """
        try:
            # Determine message type and channel
            message_type = self._map_notification_to_message_type(notification.template_name)
            channel = MessageChannel.SMS if notification.notification_type == "sms" else MessageChannel.EMAIL
            
            # Get optimal template from template optimization service
            optimal_template, template_metadata = await self.template_optimization_service.get_optimal_template(
                message_type, channel, message_context, {"appointment_id": notification.appointment_id}
            )
            
            # Generate AI-enhanced message if no optimal template or as fallback
            if not optimal_template or template_metadata.get("generation_confidence", 0) < 0.7:
                ai_message = await self.message_generator.generate_message(
                    message_type=message_type,
                    channel=channel,
                    context=message_context,
                    user_preferences=message_context.get("user_preferences", {}),
                    tone_style=message_context.get("tone_style", "professional")
                )
                
                # Use AI-generated content
                enhanced_content = ai_message.content
                ai_metadata = {
                    "ai_generated": True,
                    "ai_provider": ai_message.ai_provider,
                    "confidence_score": ai_message.confidence_score,
                    "personalization_level": ai_message.personalization_level
                }
            else:
                # Use optimal template
                enhanced_content = optimal_template
                ai_metadata = {
                    "template_optimized": True,
                    "test_variant": template_metadata.get("is_test", False),
                    "variant_id": template_metadata.get("variant_id"),
                    "optimization_confidence": template_metadata.get("optimization_confidence", 0)
                }
            
            # Update notification with enhanced content
            if notification.notification_type == "email":
                notification.subject = enhanced_content.split('\n')[0] if '\n' in enhanced_content else notification.subject
                notification.body = enhanced_content
            else:
                notification.body = enhanced_content
            
            # Store AI metadata in notification metadata field
            notification.notification_metadata = ai_metadata
            
            self.stats["ai_messages_sent"] += 1
            
            return {
                "success": True,
                "enhanced_content": enhanced_content,
                "ai_metadata": ai_metadata,
                "optimization_applied": True
            }
            
        except Exception as e:
            logger.error(f"Error enhancing notification {notification.id} with AI: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "enhanced_content": notification.body,  # Fallback to original
                "optimization_applied": False
            }
    
    async def process_sms_with_ai_enhancement(
        self, 
        from_phone: str, 
        message_body: str
    ) -> Dict[str, Any]:
        """
        Process incoming SMS with AI-enhanced understanding and response generation
        
        Args:
            from_phone: Phone number that sent the SMS
            message_body: Content of the SMS message
            
        Returns:
            Dict with enhanced response and processing details
        """
        try:
            # First try enhanced AI processing
            ai_result = await self.enhanced_sms_handler.process_sms_with_ai(
                self.db, from_phone, message_body
            )
            
            # Record interaction for template optimization
            if ai_result.get("appointment_id"):
                await self.template_optimization_service.record_template_interaction(
                    template_id=ai_result.get("template_id", "sms_response"),
                    variant_id=ai_result.get("variant_id", "default"),
                    interaction_type="response",
                    client_id=ai_result.get("client_id"),
                    appointment_id=ai_result["appointment_id"],
                    metadata={"response_time": ai_result.get("processing_time", 0)}
                )
            
            # Update behavioral learning with SMS interaction
            if ai_result.get("client_id"):
                await self.learning_service.record_communication_interaction(
                    ai_result["client_id"],
                    {
                        "channel": "sms",
                        "message_content": message_body,
                        "response_generated": bool(ai_result.get("response")),
                        "intent_detected": ai_result.get("intent"),
                        "sentiment": ai_result.get("sentiment_score"),
                        "processing_method": "ai_enhanced"
                    }
                )
            
            self.stats["enhanced_responses_processed"] += 1
            
            # If AI processing was successful, return enhanced result
            if ai_result.get("success"):
                return {
                    **ai_result,
                    "processing_method": "ai_enhanced",
                    "ai_confidence": ai_result.get("confidence_score", 0),
                    "fallback_used": False
                }
            
            # If AI processing failed, fallback to original SMS handler
            logger.warning(f"AI SMS processing failed for {from_phone}, falling back to basic handler")
            fallback_result = sms_response_handler.process_sms_response(self.db, from_phone, message_body)
            
            return {
                **fallback_result,
                "processing_method": "fallback",
                "ai_confidence": 0,
                "fallback_used": True,
                "ai_error": ai_result.get("error", "AI processing failed")
            }
            
        except Exception as e:
            logger.error(f"Error in AI-enhanced SMS processing for {from_phone}: {str(e)}")
            
            # Emergency fallback to original handler
            try:
                fallback_result = sms_response_handler.process_sms_response(self.db, from_phone, message_body)
                return {
                    **fallback_result,
                    "processing_method": "emergency_fallback",
                    "ai_confidence": 0,
                    "fallback_used": True,
                    "error": str(e)
                }
            except Exception as fallback_error:
                logger.error(f"Emergency fallback also failed for {from_phone}: {str(fallback_error)}")
                return {
                    "success": False,
                    "response": f"We're experiencing technical difficulties. Please call {getattr(settings, 'business_phone', 'us')} for assistance.",
                    "action": "system_error",
                    "processing_method": "error_fallback",
                    "error": str(e)
                }
    
    async def optimize_notification_scheduling(self, user_id: int) -> Dict[str, Any]:
        """
        Optimize notification scheduling for a user based on AI insights
        
        Args:
            user_id: User ID to optimize for
            
        Returns:
            Dict with optimization results and recommendations
        """
        try:
            # Get behavioral insights
            behavior_analysis = await self.learning_service.analyze_client_behavior(user_id)
            
            # Get optimal timing recommendations
            timing_recommendations = await self.enhanced_notification_service.get_optimal_timing_for_client(
                user_id, behavior_analysis
            )
            
            # Get communication preferences
            communication_prefs = behavior_analysis.get("communication_preferences", {})
            
            # Update learning data
            await self.learning_service.update_optimization_insights(
                user_id, timing_recommendations
            )
            
            self.stats["learning_insights_generated"] += 1
            
            return {
                "user_id": user_id,
                "optimization_complete": True,
                "optimal_times": timing_recommendations.get("optimal_hours", []),
                "preferred_channel": communication_prefs.get("preferred_channel", "email"),
                "engagement_score": behavior_analysis.get("engagement_score", 0.5),
                "recommendations": [
                    f"Best contact time: {timing_recommendations.get('best_time', 'morning')}",
                    f"Preferred channel: {communication_prefs.get('preferred_channel', 'email')}",
                    f"Response likelihood: {behavior_analysis.get('response_rate', 0.5)*100:.1f}%"
                ]
            }
            
        except Exception as e:
            logger.error(f"Error optimizing notifications for user {user_id}: {str(e)}")
            return {
                "user_id": user_id,
                "optimization_complete": False,
                "error": str(e)
            }
    
    async def generate_daily_insights(self) -> Dict[str, Any]:
        """
        Generate daily AI insights for the platform
        
        Returns:
            Dict with insights and recommendations
        """
        try:
            insights = {
                "date": datetime.utcnow().date().isoformat(),
                "ai_performance": self.stats.copy(),
                "predictions_insights": {},
                "intervention_insights": {},
                "optimization_insights": {},
                "recommendations": []
            }
            
            # Get prediction insights
            try:
                prediction_analytics = await self.enhanced_notification_service.get_prediction_analytics(
                    start_date=datetime.utcnow() - timedelta(days=1),
                    end_date=datetime.utcnow()
                )
                insights["predictions_insights"] = prediction_analytics
            except Exception as e:
                logger.warning(f"Could not generate prediction insights: {str(e)}")
            
            # Get intervention effectiveness
            try:
                intervention_analytics = await self.intervention_service.get_campaign_recommendations(
                    RiskLevel.HIGH, {"time_period": "24h"}
                )
                insights["intervention_insights"] = {
                    "active_campaigns": len(intervention_analytics),
                    "recommendations": intervention_analytics[:3]  # Top 3
                }
            except Exception as e:
                logger.warning(f"Could not generate intervention insights: {str(e)}")
            
            # Get template optimization insights
            try:
                optimization_recommendations = await self.template_optimization_service.get_optimization_recommendations()
                insights["optimization_insights"] = {
                    "total_recommendations": len(optimization_recommendations),
                    "high_priority": len([r for r in optimization_recommendations if r.priority == "high"]),
                    "top_recommendations": optimization_recommendations[:5]
                }
            except Exception as e:
                logger.warning(f"Could not generate optimization insights: {str(e)}")
            
            # Generate platform recommendations
            insights["recommendations"] = self._generate_platform_recommendations(insights)
            
            return insights
            
        except Exception as e:
            logger.error(f"Error generating daily insights: {str(e)}")
            return {
                "date": datetime.utcnow().date().isoformat(),
                "error": str(e),
                "ai_performance": self.stats.copy()
            }
    
    def _map_notification_to_message_type(self, template_name: str) -> MessageType:
        """Map notification template name to AI message type"""
        mapping = {
            "appointment_reminder": MessageType.APPOINTMENT_REMINDER,
            "appointment_confirmation": MessageType.APPOINTMENT_CONFIRMATION,
            "appointment_cancellation": MessageType.APPOINTMENT_CANCELLATION,
            "payment_reminder": MessageType.PAYMENT_REMINDER,
            "follow_up": MessageType.FOLLOW_UP,
            "marketing": MessageType.MARKETING,
            "no_show_follow_up": MessageType.NO_SHOW_FOLLOW_UP
        }
        
        for key, message_type in mapping.items():
            if key in template_name.lower():
                return message_type
        
        return MessageType.APPOINTMENT_REMINDER  # Default fallback
    
    def _generate_platform_recommendations(self, insights: Dict[str, Any]) -> List[str]:
        """Generate platform-wide recommendations based on insights"""
        recommendations = []
        
        # Prediction-based recommendations
        predictions = insights.get("predictions_insights", {})
        if predictions.get("average_risk_score", 0) > 0.6:
            recommendations.append("High no-show risk detected. Consider increasing reminder frequency.")
        
        # Intervention-based recommendations  
        interventions = insights.get("intervention_insights", {})
        if interventions.get("active_campaigns", 0) > 10:
            recommendations.append("High intervention activity. Monitor campaign effectiveness.")
        
        # Optimization-based recommendations
        optimizations = insights.get("optimization_insights", {})
        if optimizations.get("high_priority", 0) > 3:
            recommendations.append("Multiple high-priority template optimizations available.")
        
        # Performance-based recommendations
        ai_perf = insights.get("ai_performance", {})
        if ai_perf.get("ai_messages_sent", 0) > 100:
            recommendations.append("High AI message volume. Monitor response rates for quality.")
        
        return recommendations
    
    def get_integration_health(self) -> Dict[str, Any]:
        """Get health status of all AI integrations"""
        return {
            "service_status": "healthy",
            "prediction_service": bool(self.prediction_service),
            "intervention_service": bool(self.intervention_service),
            "message_generator": bool(self.message_generator),
            "enhanced_notification": bool(self.enhanced_notification_service),
            "enhanced_sms": bool(self.enhanced_sms_handler),
            "learning_service": bool(self.learning_service),
            "template_optimization": bool(self.template_optimization_service),
            "stats": self.stats.copy(),
            "last_health_check": datetime.utcnow().isoformat()
        }


# Singleton pattern with database session management
_ai_integration_service = None

def get_ai_integration_service(db: Session) -> AIIntegrationService:
    """Get or create AI integration service instance"""
    global _ai_integration_service
    
    if _ai_integration_service is None:
        _ai_integration_service = AIIntegrationService(db)
        logger.info("AI Integration Service initialized successfully")
    
    return _ai_integration_service


# Convenience functions for common operations
async def process_appointment_with_ai(db: Session, appointment: Appointment) -> Dict[str, Any]:
    """Convenience function to process appointment with AI"""
    service = get_ai_integration_service(db)
    return await service.process_appointment_with_ai(appointment)


async def enhance_sms_response(db: Session, from_phone: str, message: str) -> Dict[str, Any]:
    """Convenience function to enhance SMS response with AI"""
    service = get_ai_integration_service(db)
    return await service.process_sms_with_ai_enhancement(from_phone, message)


async def optimize_user_notifications(db: Session, user_id: int) -> Dict[str, Any]:
    """Convenience function to optimize notifications for user"""
    service = get_ai_integration_service(db)
    return await service.optimize_notification_scheduling(user_id)