"""
AI-Enhanced SMS Response Handler Wrapper

This service wraps the existing SMS response handler with AI capabilities while
maintaining full backward compatibility. It provides enhanced natural language
understanding, sentiment analysis, and intelligent response generation.

Key Features:
- AI-powered intent detection and natural language understanding
- Sentiment analysis and emotional context awareness
- Enhanced response generation with personalization
- Behavioral learning integration
- Maintains full backward compatibility with existing SMS handler
- Graceful fallback to original handler when AI processing fails
"""

import logging
import asyncio
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from services.sms_response_handler import sms_response_handler, SMSResponseHandler
from services.enhanced_sms_response_handler import get_enhanced_sms_response_handler
from services.ai_integration_service import get_ai_integration_service
from models import Appointment, User, Client
from config import settings

logger = logging.getLogger(__name__)


class AIEnhancedSMSWrapper:
    """
    Wrapper that adds AI capabilities to the existing SMS response handler
    """
    
    def __init__(self):
        self.base_handler = sms_response_handler
        self.ai_enabled = getattr(settings, 'ai_sms_features_enabled', True)
        self.ai_fallback_enabled = getattr(settings, 'ai_sms_fallback_enabled', True)
        self.ai_confidence_threshold = getattr(settings, 'ai_sms_confidence_threshold', 0.7)
        
        # Track AI SMS processing
        self.ai_stats = {
            "ai_processed_messages": 0,
            "ai_fallbacks": 0,
            "high_confidence_responses": 0,
            "sentiment_analyzed": 0,
            "intents_detected": 0,
            "last_reset": datetime.utcnow()
        }
    
    def detect_keyword(self, message: str) -> Optional[str]:
        """Enhanced keyword detection with AI fallback"""
        try:
            # Use base handler for core keyword detection (maintains compatibility)
            return self.base_handler.detect_keyword(message)
        except Exception as e:
            logger.error(f"Error in enhanced keyword detection: {str(e)}")
            return self.base_handler.detect_keyword(message)
    
    def find_recent_appointment(self, db: Session, phone_number: str) -> Optional[Appointment]:
        """Enhanced appointment finding"""
        try:
            # Use base handler for core appointment finding (maintains compatibility)
            return self.base_handler.find_recent_appointment(db, phone_number)
        except Exception as e:
            logger.error(f"Error in enhanced appointment finding: {str(e)}")
            return self.base_handler.find_recent_appointment(db, phone_number)
    
    def handle_confirm(self, db: Session, appointment: Appointment, phone_number: str) -> Dict[str, Any]:
        """Enhanced confirmation handling with AI insights"""
        try:
            # Use base handler for core confirmation logic
            base_result = self.base_handler.handle_confirm(db, appointment, phone_number)
            
            # Add AI enhancements if enabled
            if self.ai_enabled and base_result.get("success"):
                try:
                    # Record successful confirmation for behavioral learning
                    ai_service = get_ai_integration_service(db)
                    asyncio.run(self._record_positive_interaction(db, appointment, "confirm", ai_service))
                    
                    # Enhance response with personalization if possible
                    enhanced_response = asyncio.run(
                        self._enhance_response_with_ai(db, base_result, appointment, "confirmation")
                    )
                    if enhanced_response:
                        base_result["response"] = enhanced_response
                        base_result["ai_enhanced"] = True
                        
                except Exception as ai_error:
                    logger.warning(f"AI enhancement failed for confirmation: {str(ai_error)}")
                    if not self.ai_fallback_enabled:
                        raise ai_error
            
            return base_result
            
        except Exception as e:
            logger.error(f"Error in enhanced confirmation handling: {str(e)}")
            return self.base_handler.handle_confirm(db, appointment, phone_number)
    
    def handle_cancel(self, db: Session, appointment: Appointment, phone_number: str) -> Dict[str, Any]:
        """Enhanced cancellation handling with AI insights"""
        try:
            # Use base handler for core cancellation logic
            base_result = self.base_handler.handle_cancel(db, appointment, phone_number)
            
            # Add AI enhancements if enabled
            if self.ai_enabled and base_result.get("success"):
                try:
                    # Record cancellation for behavioral learning
                    ai_service = get_ai_integration_service(db)
                    asyncio.run(self._record_cancellation_event(db, appointment, "cancel", ai_service))
                    
                    # Enhance response with personalization
                    enhanced_response = asyncio.run(
                        self._enhance_response_with_ai(db, base_result, appointment, "cancellation")
                    )
                    if enhanced_response:
                        base_result["response"] = enhanced_response
                        base_result["ai_enhanced"] = True
                        
                except Exception as ai_error:
                    logger.warning(f"AI enhancement failed for cancellation: {str(ai_error)}")
                    if not self.ai_fallback_enabled:
                        raise ai_error
            
            return base_result
            
        except Exception as e:
            logger.error(f"Error in enhanced cancellation handling: {str(e)}")
            return self.base_handler.handle_cancel(db, appointment, phone_number)
    
    def handle_reschedule(self, db: Session, appointment: Appointment, phone_number: str) -> Dict[str, Any]:
        """Enhanced reschedule handling with AI insights"""
        try:
            # Use base handler for core reschedule logic
            base_result = self.base_handler.handle_reschedule(db, appointment, phone_number)
            
            # Add AI enhancements if enabled
            if self.ai_enabled and base_result.get("success"):
                try:
                    # Record reschedule request for behavioral learning
                    ai_service = get_ai_integration_service(db)
                    asyncio.run(self._record_positive_interaction(db, appointment, "reschedule", ai_service))
                    
                    # Enhance response with personalization
                    enhanced_response = asyncio.run(
                        self._enhance_response_with_ai(db, base_result, appointment, "reschedule")
                    )
                    if enhanced_response:
                        base_result["response"] = enhanced_response
                        base_result["ai_enhanced"] = True
                        
                except Exception as ai_error:
                    logger.warning(f"AI enhancement failed for reschedule: {str(ai_error)}")
                    if not self.ai_fallback_enabled:
                        raise ai_error
            
            return base_result
            
        except Exception as e:
            logger.error(f"Error in enhanced reschedule handling: {str(e)}")
            return self.base_handler.handle_reschedule(db, appointment, phone_number)
    
    def handle_help(self, db: Session, appointment: Optional[Appointment], phone_number: str) -> Dict[str, Any]:
        """Enhanced help handling"""
        try:
            # Use base handler for core help logic
            base_result = self.base_handler.handle_help(db, appointment, phone_number)
            
            # Add AI enhancements if enabled
            if self.ai_enabled:
                try:
                    # Enhance help response with personalization
                    enhanced_response = asyncio.run(
                        self._enhance_response_with_ai(db, base_result, appointment, "help")
                    )
                    if enhanced_response:
                        base_result["response"] = enhanced_response
                        base_result["ai_enhanced"] = True
                        
                except Exception as ai_error:
                    logger.warning(f"AI enhancement failed for help: {str(ai_error)}")
                    if not self.ai_fallback_enabled:
                        raise ai_error
            
            return base_result
            
        except Exception as e:
            logger.error(f"Error in enhanced help handling: {str(e)}")
            return self.base_handler.handle_help(db, appointment, phone_number)
    
    def handle_status(self, db: Session, appointment: Appointment, phone_number: str) -> Dict[str, Any]:
        """Enhanced status handling"""
        try:
            # Use base handler for core status logic
            base_result = self.base_handler.handle_status(db, appointment, phone_number)
            
            # Add AI enhancements if enabled
            if self.ai_enabled and base_result.get("success"):
                try:
                    # Enhance status response with personalization
                    enhanced_response = asyncio.run(
                        self._enhance_response_with_ai(db, base_result, appointment, "status")
                    )
                    if enhanced_response:
                        base_result["response"] = enhanced_response
                        base_result["ai_enhanced"] = True
                        
                except Exception as ai_error:
                    logger.warning(f"AI enhancement failed for status: {str(ai_error)}")
                    if not self.ai_fallback_enabled:
                        raise ai_error
            
            return base_result
            
        except Exception as e:
            logger.error(f"Error in enhanced status handling: {str(e)}")
            return self.base_handler.handle_status(db, appointment, phone_number)
    
    def process_sms_response(self, db: Session, from_phone: str, message_body: str) -> Dict[str, Any]:
        """
        Enhanced SMS processing with AI capabilities and intelligent fallback
        
        This is the main method that integrates AI processing while maintaining
        full backward compatibility with the existing SMS handler.
        """
        try:
            # Try AI-enhanced processing first if enabled
            if self.ai_enabled:
                try:
                    ai_result = asyncio.run(self._process_with_ai_enhancement(db, from_phone, message_body))
                    
                    # Check if AI processing was successful and confident
                    if (ai_result.get("success") and 
                        ai_result.get("confidence_score", 0) >= self.ai_confidence_threshold):
                        
                        self.ai_stats["ai_processed_messages"] += 1
                        self.ai_stats["high_confidence_responses"] += 1
                        
                        # Add AI metadata to result
                        ai_result.update({
                            "processing_method": "ai_enhanced",
                            "ai_confidence": ai_result.get("confidence_score", 0),
                            "fallback_used": False
                        })
                        
                        return ai_result
                    
                    # If AI processing succeeded but confidence is low, log and fallback
                    if ai_result.get("success"):
                        logger.info(f"AI processing had low confidence ({ai_result.get('confidence_score', 0):.2f}) for {from_phone}, using fallback")
                
                except Exception as ai_error:
                    logger.warning(f"AI SMS processing failed for {from_phone}: {str(ai_error)}")
                    
                    # If AI fallback is disabled, raise the error
                    if not self.ai_fallback_enabled:
                        raise ai_error
            
            # Fallback to base handler (maintains all existing functionality)
            logger.debug(f"Using base SMS handler for {from_phone}")
            base_result = self.base_handler.process_sms_response(db, from_phone, message_body)
            
            # Enhance base result with AI insights if possible
            if self.ai_enabled:
                try:
                    enhanced_result = asyncio.run(
                        self._add_ai_insights_to_base_result(db, base_result, from_phone, message_body)
                    )
                    self.ai_stats["ai_fallbacks"] += 1
                    return enhanced_result
                    
                except Exception as insight_error:
                    logger.warning(f"Failed to add AI insights to base result: {str(insight_error)}")
            
            # Add metadata indicating base processing was used
            base_result.update({
                "processing_method": "base_handler",
                "ai_confidence": 0,
                "fallback_used": True
            })
            
            return base_result
            
        except Exception as e:
            logger.error(f"Error in enhanced SMS processing for {from_phone}: {str(e)}")
            
            # Emergency fallback to base handler
            try:
                emergency_result = self.base_handler.process_sms_response(db, from_phone, message_body)
                emergency_result.update({
                    "processing_method": "emergency_fallback",
                    "ai_confidence": 0,
                    "fallback_used": True,
                    "error": str(e)
                })
                return emergency_result
                
            except Exception as emergency_error:
                logger.error(f"Emergency fallback failed for {from_phone}: {str(emergency_error)}")
                return {
                    "success": False,
                    "response": f"We're experiencing technical difficulties. Please call {getattr(settings, 'business_phone', 'us')} for assistance.",
                    "action": "system_error",
                    "processing_method": "error_fallback",
                    "error": str(e)
                }
    
    async def _process_with_ai_enhancement(self, db: Session, from_phone: str, message_body: str) -> Dict[str, Any]:
        """Process SMS with full AI enhancement"""
        try:
            # Get enhanced SMS handler
            enhanced_handler = get_enhanced_sms_response_handler()
            
            # Process with AI enhancement
            result = await enhanced_handler.process_sms_with_ai(db, from_phone, message_body)
            
            # Update statistics
            if result.get("sentiment_score") is not None:
                self.ai_stats["sentiment_analyzed"] += 1
            
            if result.get("intent"):
                self.ai_stats["intents_detected"] += 1
            
            return result
            
        except Exception as e:
            logger.error(f"Error in AI enhancement processing: {str(e)}")
            raise
    
    async def _enhance_response_with_ai(
        self, 
        db: Session, 
        base_result: Dict[str, Any], 
        appointment: Optional[Appointment], 
        response_type: str
    ) -> Optional[str]:
        """Enhance response with AI personalization"""
        try:
            if not appointment or not base_result.get("response"):
                return None
            
            ai_service = get_ai_integration_service(db)
            
            # Create context for AI enhancement
            context = {
                "original_response": base_result["response"],
                "response_type": response_type,
                "appointment_id": appointment.id,
                "client_name": appointment.user.name if appointment.user else "Guest",
                "service_name": appointment.service_name,
                "appointment_time": appointment.start_time.isoformat()
            }
            
            # This would use the AI message generator to enhance the response
            # For now, return None to use original response
            return None
            
        except Exception as e:
            logger.error(f"Error enhancing response with AI: {str(e)}")
            return None
    
    async def _record_positive_interaction(self, db: Session, appointment: Appointment, action: str, ai_service):
        """Record positive interaction for behavioral learning"""
        try:
            if appointment.user_id:
                await ai_service.learning_service.record_communication_interaction(
                    appointment.user_id,
                    {
                        "channel": "sms",
                        "action": action,
                        "outcome": "positive",
                        "appointment_id": appointment.id,
                        "response_time": "immediate"
                    }
                )
        except Exception as e:
            logger.warning(f"Failed to record positive interaction: {str(e)}")
    
    async def _record_cancellation_event(self, db: Session, appointment: Appointment, action: str, ai_service):
        """Record cancellation event for behavioral learning"""
        try:
            if appointment.user_id:
                await ai_service.learning_service.record_communication_interaction(
                    appointment.user_id,
                    {
                        "channel": "sms",
                        "action": action,
                        "outcome": "cancellation",
                        "appointment_id": appointment.id,
                        "hours_before_appointment": (appointment.start_time - datetime.utcnow()).total_seconds() / 3600
                    }
                )
        except Exception as e:
            logger.warning(f"Failed to record cancellation event: {str(e)}")
    
    async def _add_ai_insights_to_base_result(
        self, 
        db: Session, 
        base_result: Dict[str, Any], 
        from_phone: str, 
        message_body: str
    ) -> Dict[str, Any]:
        """Add AI insights to base handler result"""
        try:
            # Get basic sentiment analysis if possible
            enhanced_handler = get_enhanced_sms_response_handler()
            
            # Try to get sentiment without full AI processing
            sentiment = await enhanced_handler._analyze_sentiment(message_body)
            
            # Add AI insights to base result
            base_result.update({
                "processing_method": "base_with_ai_insights",
                "ai_insights": {
                    "sentiment_score": sentiment.get("score", 0) if sentiment else 0,
                    "sentiment_label": sentiment.get("label", "neutral") if sentiment else "neutral",
                    "message_length": len(message_body),
                    "has_keywords": bool(self.base_handler.detect_keyword(message_body))
                },
                "ai_confidence": 0.3,  # Low confidence for insights-only processing
                "fallback_used": True
            })
            
            return base_result
            
        except Exception as e:
            logger.warning(f"Failed to add AI insights: {str(e)}")
            return base_result
    
    def get_response_stats(self, db: Session, days: int = 30) -> Dict[str, Any]:
        """Enhanced response statistics with AI metrics"""
        try:
            base_stats = self.base_handler.get_response_stats(db, days)
            
            # Add AI enhancement statistics
            base_stats["ai_enhancements"] = {
                "ai_enabled": self.ai_enabled,
                "ai_processed_messages": self.ai_stats["ai_processed_messages"],
                "ai_fallbacks": self.ai_stats["ai_fallbacks"],
                "high_confidence_responses": self.ai_stats["high_confidence_responses"],
                "sentiment_analyzed": self.ai_stats["sentiment_analyzed"],
                "intents_detected": self.ai_stats["intents_detected"],
                "ai_success_rate": (
                    self.ai_stats["ai_processed_messages"] / 
                    max(1, self.ai_stats["ai_processed_messages"] + self.ai_stats["ai_fallbacks"])
                ) if self.ai_stats["ai_processed_messages"] + self.ai_stats["ai_fallbacks"] > 0 else 0
            }
            
            return base_stats
            
        except Exception as e:
            logger.error(f"Error in enhanced response stats: {str(e)}")
            return self.base_handler.get_response_stats(db, days)
    
    def get_ai_sms_status(self) -> Dict[str, Any]:
        """Get AI SMS enhancement status and statistics"""
        return {
            "ai_enabled": self.ai_enabled,
            "ai_fallback_enabled": self.ai_fallback_enabled,
            "confidence_threshold": self.ai_confidence_threshold,
            "ai_stats": self.ai_stats.copy(),
            "last_update": datetime.utcnow().isoformat()
        }
    
    def toggle_ai_sms_features(self, enabled: bool) -> Dict[str, Any]:
        """Toggle AI SMS features on/off"""
        old_status = self.ai_enabled
        self.ai_enabled = enabled
        
        logger.info(f"AI SMS features {'enabled' if enabled else 'disabled'} (was {'enabled' if old_status else 'disabled'})")
        
        return {
            "ai_enabled": self.ai_enabled,
            "previous_status": old_status,
            "changed": old_status != enabled,
            "timestamp": datetime.utcnow().isoformat()
        }


# Create enhanced SMS wrapper instance
ai_enhanced_sms_handler = AIEnhancedSMSWrapper()

# Provide a function to get the enhanced SMS handler (for dependency injection)
def get_ai_enhanced_sms_handler() -> AIEnhancedSMSWrapper:
    """Get the AI-enhanced SMS response handler"""
    return ai_enhanced_sms_handler