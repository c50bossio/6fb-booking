"""
AI-Enhanced Notification Wrapper

This service wraps the existing notification service with AI capabilities while
maintaining full backward compatibility. It automatically detects when AI features
should be applied and falls back to original behavior when needed.

Key Features:
- Transparent AI enhancement of notifications
- Risk-based notification timing optimization
- AI-generated message content
- Template optimization integration
- Behavioral learning integration
- Maintains full backward compatibility
"""

import logging
import asyncio
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from services.notification_service import notification_service, NotificationService
from services.ai_integration_service import get_ai_integration_service
from models import (
    User, Appointment, NotificationTemplate, NotificationQueue, 
    NotificationStatus, NotificationPreferences
)
from config import settings

logger = logging.getLogger(__name__)


class AIEnhancedNotificationWrapper:
    """
    Wrapper that adds AI capabilities to the existing notification service
    """
    
    def __init__(self):
        self.base_service = notification_service
        self.ai_enabled = getattr(settings, 'ai_features_enabled', True)
        self.ai_fallback_enabled = getattr(settings, 'ai_fallback_enabled', True)
        
        # Track AI usage
        self.ai_stats = {
            "ai_enhanced_notifications": 0,
            "ai_fallbacks": 0,
            "optimization_applied": 0,
            "last_reset": datetime.utcnow()
        }
    
    def send_email(self, to_email: str, subject: str, body: str, 
                   template_id: Optional[str] = None, 
                   attachments: Optional[List[Dict]] = None,
                   retry_count: int = 0) -> Dict[str, Any]:
        """Enhanced email sending with AI fallback"""
        try:
            # Use base service for actual sending (maintains all existing functionality)
            return self.base_service.send_email(
                to_email, subject, body, template_id, attachments, retry_count
            )
        except Exception as e:
            logger.error(f"Error in enhanced email sending: {str(e)}")
            # Fallback to base service
            return self.base_service.send_email(
                to_email, subject, body, template_id, attachments, retry_count
            )
    
    def send_sms(self, to_phone: str, body: str, retry_count: int = 0) -> Dict[str, Any]:
        """Enhanced SMS sending with AI fallback"""
        try:
            # Use base service for actual sending (maintains all existing functionality)
            return self.base_service.send_sms(to_phone, body, retry_count)
        except Exception as e:
            logger.error(f"Error in enhanced SMS sending: {str(e)}")
            # Fallback to base service
            return self.base_service.send_sms(to_phone, body, retry_count)
    
    def queue_notification(
        self,
        db: Session,
        user: User,
        template_name: str,
        context: Dict[str, Any],
        scheduled_for: Optional[datetime] = None,
        appointment_id: Optional[int] = None,
        enable_ai: bool = True
    ) -> List[NotificationQueue]:
        """
        Enhanced notification queueing with optional AI optimization
        
        Args:
            db: Database session
            user: User to send notification to
            template_name: Name of the notification template
            context: Template context data
            scheduled_for: When to send the notification
            appointment_id: Associated appointment ID
            enable_ai: Whether to apply AI enhancements
            
        Returns:
            List of queued notifications
        """
        try:
            # First, queue notifications using base service (backward compatibility)
            base_notifications = self.base_service.queue_notification(
                db, user, template_name, context, scheduled_for, appointment_id
            )
            
            # Apply AI enhancements if enabled and available
            if enable_ai and self.ai_enabled and appointment_id:
                try:
                    enhanced_notifications = asyncio.run(
                        self._enhance_notifications_with_ai(db, base_notifications, context, appointment_id)
                    )
                    self.ai_stats["ai_enhanced_notifications"] += len(enhanced_notifications)
                    return enhanced_notifications
                except Exception as ai_error:
                    logger.warning(f"AI enhancement failed for {template_name}, using base notifications: {str(ai_error)}")
                    self.ai_stats["ai_fallbacks"] += 1
                    
                    if not self.ai_fallback_enabled:
                        raise ai_error
            
            return base_notifications
            
        except Exception as e:
            logger.error(f"Error in enhanced notification queueing: {str(e)}")
            # Emergency fallback to base service
            return self.base_service.queue_notification(
                db, user, template_name, context, scheduled_for, appointment_id
            )
    
    async def _enhance_notifications_with_ai(
        self, 
        db: Session, 
        notifications: List[NotificationQueue],
        context: Dict[str, Any],
        appointment_id: int
    ) -> List[NotificationQueue]:
        """Apply AI enhancements to queued notifications"""
        try:
            ai_service = get_ai_integration_service(db)
            enhanced_notifications = []
            
            for notification in notifications:
                try:
                    # Enhance with AI-generated content
                    enhancement_result = await ai_service.enhance_notification_with_ai(
                        notification, context
                    )
                    
                    if enhancement_result.get("success"):
                        # Update notification with AI enhancements
                        notification.body = enhancement_result["enhanced_content"]
                        if notification.notification_type == "email" and "subject" in enhancement_result:
                            notification.subject = enhancement_result.get("subject", notification.subject)
                        
                        # Store AI metadata
                        notification.notification_metadata = enhancement_result.get("ai_metadata", {})
                        
                        self.ai_stats["optimization_applied"] += 1
                        logger.info(f"AI enhancement applied to notification {notification.id}")
                    
                    enhanced_notifications.append(notification)
                    
                except Exception as enhance_error:
                    logger.warning(f"Failed to enhance notification {notification.id}: {str(enhance_error)}")
                    # Keep original notification
                    enhanced_notifications.append(notification)
            
            # Update database with enhanced notifications
            db.commit()
            return enhanced_notifications
            
        except Exception as e:
            logger.error(f"Error in AI notification enhancement: {str(e)}")
            # Return original notifications
            return notifications
    
    def schedule_appointment_reminders(self, db: Session, appointment: Appointment, enable_ai: bool = True):
        """Enhanced appointment reminder scheduling with AI optimization"""
        try:
            # Use base service for core reminder scheduling
            self.base_service.schedule_appointment_reminders(db, appointment)
            
            # Apply AI optimizations if enabled
            if enable_ai and self.ai_enabled:
                try:
                    asyncio.run(self._optimize_appointment_reminders_with_ai(db, appointment))
                except Exception as ai_error:
                    logger.warning(f"AI reminder optimization failed for appointment {appointment.id}: {str(ai_error)}")
                    if not self.ai_fallback_enabled:
                        raise ai_error
            
        except Exception as e:
            logger.error(f"Error in enhanced reminder scheduling: {str(e)}")
            # Fallback to base service
            self.base_service.schedule_appointment_reminders(db, appointment)
    
    async def _optimize_appointment_reminders_with_ai(self, db: Session, appointment: Appointment):
        """Apply AI optimizations to appointment reminders"""
        try:
            ai_service = get_ai_integration_service(db)
            
            # Process appointment through AI pipeline
            ai_result = await ai_service.process_appointment_with_ai(appointment)
            
            if ai_result.get("ai_processing_complete"):
                logger.info(f"AI processing complete for appointment {appointment.id}: "
                          f"risk_level={ai_result.get('risk_assessment', {}).get('risk_level', 'unknown')}")
                
                # Optimize notification scheduling for user
                if appointment.user_id:
                    optimization_result = await ai_service.optimize_notification_scheduling(appointment.user_id)
                    if optimization_result.get("optimization_complete"):
                        logger.info(f"Notification optimization complete for user {appointment.user_id}")
            
        except Exception as e:
            logger.error(f"Error in AI reminder optimization: {str(e)}")
            raise
    
    def process_notification_queue(self, db: Session, batch_size: int = 50):
        """Enhanced notification queue processing"""
        try:
            # Use base service for core processing (maintains all existing logic)
            return self.base_service.process_notification_queue(db, batch_size)
        except Exception as e:
            logger.error(f"Error in enhanced queue processing: {str(e)}")
            # Fallback to base service
            return self.base_service.process_notification_queue(db, batch_size)
    
    def handle_incoming_sms(self, db: Session, from_phone: str, message_body: str) -> Dict[str, Any]:
        """Enhanced SMS handling with AI processing"""
        try:
            if self.ai_enabled:
                # Try AI-enhanced processing first
                try:
                    ai_service = get_ai_integration_service(db)
                    result = asyncio.run(
                        ai_service.process_sms_with_ai_enhancement(from_phone, message_body)
                    )
                    
                    if result.get("success") and not result.get("fallback_used"):
                        self.ai_stats["ai_enhanced_notifications"] += 1
                        return result
                    
                except Exception as ai_error:
                    logger.warning(f"AI SMS processing failed for {from_phone}: {str(ai_error)}")
                    if not self.ai_fallback_enabled:
                        raise ai_error
            
            # Fallback to base service
            self.ai_stats["ai_fallbacks"] += 1
            return self.base_service.handle_incoming_sms(db, from_phone, message_body)
            
        except Exception as e:
            logger.error(f"Error in enhanced SMS handling: {str(e)}")
            # Emergency fallback to base service
            return self.base_service.handle_incoming_sms(db, from_phone, message_body)
    
    def cancel_appointment_notifications(self, db: Session, appointment_id: int):
        """Enhanced notification cancellation"""
        try:
            return self.base_service.cancel_appointment_notifications(db, appointment_id)
        except Exception as e:
            logger.error(f"Error in enhanced notification cancellation: {str(e)}")
            return self.base_service.cancel_appointment_notifications(db, appointment_id)
    
    def get_notification_history(self, db: Session, user_id: Optional[int] = None, 
                               appointment_id: Optional[int] = None, 
                               limit: int = 100) -> List[NotificationQueue]:
        """Enhanced notification history with AI metadata"""
        try:
            return self.base_service.get_notification_history(db, user_id, appointment_id, limit)
        except Exception as e:
            logger.error(f"Error in enhanced notification history: {str(e)}")
            return self.base_service.get_notification_history(db, user_id, appointment_id, limit)
    
    def get_notification_stats(self, db: Session, days: int = 7) -> Dict[str, Any]:
        """Enhanced notification statistics with AI metrics"""
        try:
            base_stats = self.base_service.get_notification_stats(db, days)
            
            # Add AI enhancement statistics
            base_stats["ai_enhancements"] = {
                "ai_enabled": self.ai_enabled,
                "ai_enhanced_notifications": self.ai_stats["ai_enhanced_notifications"],
                "ai_fallbacks": self.ai_stats["ai_fallbacks"],
                "optimization_applied": self.ai_stats["optimization_applied"],
                "enhancement_rate": (
                    self.ai_stats["ai_enhanced_notifications"] / 
                    max(1, self.ai_stats["ai_enhanced_notifications"] + self.ai_stats["ai_fallbacks"])
                ) if self.ai_stats["ai_enhanced_notifications"] + self.ai_stats["ai_fallbacks"] > 0 else 0
            }
            
            return base_stats
            
        except Exception as e:
            logger.error(f"Error in enhanced notification stats: {str(e)}")
            return self.base_service.get_notification_stats(db, days)
    
    def bulk_queue_notifications(self, db: Session, notifications: List[Dict[str, Any]]) -> List[NotificationQueue]:
        """Enhanced bulk notification queueing"""
        try:
            return self.base_service.bulk_queue_notifications(db, notifications)
        except Exception as e:
            logger.error(f"Error in enhanced bulk queueing: {str(e)}")
            return self.base_service.bulk_queue_notifications(db, notifications)
    
    def render_template(self, template: NotificationTemplate, context: Dict[str, Any], db: Session = None) -> Dict[str, str]:
        """Enhanced template rendering (maintains base functionality)"""
        try:
            return self.base_service.render_template(template, context, db)
        except Exception as e:
            logger.error(f"Error in enhanced template rendering: {str(e)}")
            return self.base_service.render_template(template, context, db)
    
    def get_ai_enhancement_status(self) -> Dict[str, Any]:
        """Get AI enhancement status and statistics"""
        return {
            "ai_enabled": self.ai_enabled,
            "ai_fallback_enabled": self.ai_fallback_enabled,
            "ai_stats": self.ai_stats.copy(),
            "last_update": datetime.utcnow().isoformat()
        }
    
    def toggle_ai_features(self, enabled: bool) -> Dict[str, Any]:
        """Toggle AI features on/off"""
        old_status = self.ai_enabled
        self.ai_enabled = enabled
        
        logger.info(f"AI features {'enabled' if enabled else 'disabled'} (was {'enabled' if old_status else 'disabled'})")
        
        return {
            "ai_enabled": self.ai_enabled,
            "previous_status": old_status,
            "changed": old_status != enabled,
            "timestamp": datetime.utcnow().isoformat()
        }


# Create enhanced service instance
ai_enhanced_notification_service = AIEnhancedNotificationWrapper()

# Provide a function to get the enhanced service (for dependency injection)
def get_ai_enhanced_notification_service() -> AIEnhancedNotificationWrapper:
    """Get the AI-enhanced notification service"""
    return ai_enhanced_notification_service