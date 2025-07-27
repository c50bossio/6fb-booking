"""
Smart Alert Notification Service for BookedBarber V2

This service manages intelligent alert notifications that integrate with the existing
notification framework while adding AI-powered business intelligence alerts.

Key Features:
- Business anomaly detection
- Priority-based alert routing
- Smart alert deduplication
- Integration with existing notification service
- Performance threshold monitoring
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
import logging
from dataclasses import dataclass
from enum import Enum

from models import User, Appointment, Payment, Client
from services.intelligent_analytics_service import IntelligentAnalyticsService, SmartAlert, AlertPriority
from services.notification_service import NotificationService
from utils.cache_decorators import cache_result

logger = logging.getLogger(__name__)

class AlertChannel(Enum):
    EMAIL = "email"
    SMS = "sms"
    IN_APP = "in_app"
    DASHBOARD = "dashboard"

class AlertFrequency(Enum):
    IMMEDIATE = "immediate"
    HOURLY = "hourly"
    DAILY = "daily"
    WEEKLY = "weekly"

@dataclass
class AlertRule:
    name: str
    condition: str
    threshold: float
    priority: AlertPriority
    frequency: AlertFrequency
    channels: List[AlertChannel]
    enabled: bool = True

@dataclass
class ProcessedAlert:
    alert: SmartAlert
    should_send: bool
    reason: str
    next_send_time: Optional[datetime] = None

class SmartAlertService:
    """Service for managing intelligent business alerts"""
    
    def __init__(self, db: Session):
        self.db = db
        self.intelligent_service = IntelligentAnalyticsService(db)
        self.notification_service = NotificationService(db)
        
        # Default alert rules for Six Figure Barber methodology
        self.default_rules = self._initialize_default_rules()
    
    def _initialize_default_rules(self) -> List[AlertRule]:
        """Initialize default alert rules based on Six Figure Barber methodology"""
        return [
            AlertRule(
                name="Revenue Drop Critical",
                condition="weekly_revenue_drop_percent >= 30",
                threshold=30.0,
                priority=AlertPriority.CRITICAL,
                frequency=AlertFrequency.IMMEDIATE,
                channels=[AlertChannel.EMAIL, AlertChannel.SMS, AlertChannel.IN_APP]
            ),
            AlertRule(
                name="Revenue Drop Warning",
                condition="weekly_revenue_drop_percent >= 15",
                threshold=15.0,
                priority=AlertPriority.HIGH,
                frequency=AlertFrequency.IMMEDIATE,
                channels=[AlertChannel.EMAIL, AlertChannel.IN_APP]
            ),
            AlertRule(
                name="No Show Rate High",
                condition="no_show_rate >= 20",
                threshold=20.0,
                priority=AlertPriority.HIGH,
                frequency=AlertFrequency.DAILY,
                channels=[AlertChannel.EMAIL, AlertChannel.IN_APP]
            ),
            AlertRule(
                name="Booking Utilization Low",
                condition="booking_utilization <= 60",
                threshold=60.0,
                priority=AlertPriority.MEDIUM,
                frequency=AlertFrequency.DAILY,
                channels=[AlertChannel.IN_APP]
            ),
            AlertRule(
                name="Client Retention Drop",
                condition="retention_rate <= 40",
                threshold=40.0,
                priority=AlertPriority.HIGH,
                frequency=AlertFrequency.WEEKLY,
                channels=[AlertChannel.EMAIL, AlertChannel.IN_APP]
            ),
            AlertRule(
                name="Revenue Per Hour Low",
                condition="revenue_per_hour <= 50",
                threshold=50.0,
                priority=AlertPriority.MEDIUM,
                frequency=AlertFrequency.WEEKLY,
                channels=[AlertChannel.IN_APP]
            )
        ]
    
    async def process_and_send_alerts(self, user_id: int) -> Dict[str, Any]:
        """Process all alerts for a user and send notifications based on rules"""
        try:
            # Get all smart alerts from intelligent analytics
            raw_alerts = self.intelligent_service.generate_smart_alerts(user_id)
            
            # Process each alert against rules
            processed_alerts = []
            sent_alerts = []
            skipped_alerts = []
            
            for alert in raw_alerts:
                processed = self._process_alert(user_id, alert)
                processed_alerts.append(processed)
                
                if processed.should_send:
                    success = await self._send_alert_notifications(user_id, processed.alert)
                    if success:
                        sent_alerts.append(processed.alert)
                        await self._log_alert_sent(user_id, processed.alert)
                    else:
                        logger.error(f"Failed to send alert: {processed.alert.title}")
                else:
                    skipped_alerts.append({
                        "alert": processed.alert.title,
                        "reason": processed.reason
                    })
            
            return {
                "processed_count": len(processed_alerts),
                "sent_count": len(sent_alerts),
                "skipped_count": len(skipped_alerts),
                "sent_alerts": [
                    {
                        "title": alert.title,
                        "priority": alert.priority.value,
                        "category": alert.category
                    }
                    for alert in sent_alerts
                ],
                "skipped_alerts": skipped_alerts,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error processing alerts for user {user_id}: {e}")
            return {
                "processed_count": 0,
                "sent_count": 0,
                "skipped_count": 0,
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
    
    def _process_alert(self, user_id: int, alert: SmartAlert) -> ProcessedAlert:
        """Process a single alert against business rules"""
        try:
            # Check if alert has been sent recently (deduplication)
            if self._is_duplicate_alert(user_id, alert):
                return ProcessedAlert(
                    alert=alert,
                    should_send=False,
                    reason="Duplicate alert - already sent recently"
                )
            
            # Check frequency rules
            if not self._should_send_based_on_frequency(user_id, alert):
                return ProcessedAlert(
                    alert=alert,
                    should_send=False,
                    reason="Frequency limit - alert sent too recently"
                )
            
            # Check business hours (for non-critical alerts)
            if alert.priority != AlertPriority.CRITICAL and not self._is_business_hours():
                next_send = self._get_next_business_hours()
                return ProcessedAlert(
                    alert=alert,
                    should_send=False,
                    reason="Outside business hours - will send during business hours",
                    next_send_time=next_send
                )
            
            # Check if user has alert preferences that would block this
            if not self._user_allows_alert_type(user_id, alert):
                return ProcessedAlert(
                    alert=alert,
                    should_send=False,
                    reason="User preferences block this alert type"
                )
            
            return ProcessedAlert(
                alert=alert,
                should_send=True,
                reason="Alert meets all criteria for sending"
            )
            
        except Exception as e:
            logger.error(f"Error processing alert {alert.title}: {e}")
            return ProcessedAlert(
                alert=alert,
                should_send=False,
                reason=f"Processing error: {str(e)}"
            )
    
    async def _send_alert_notifications(self, user_id: int, alert: SmartAlert) -> bool:
        """Send alert through appropriate notification channels"""
        try:
            # Get user preferences for alert channels
            channels = self._get_alert_channels_for_priority(alert.priority)
            
            success = True
            
            # Send in-app notification (always for dashboard alerts)
            if AlertChannel.IN_APP in channels:
                await self._send_in_app_notification(user_id, alert)
            
            # Send email notification
            if AlertChannel.EMAIL in channels:
                email_success = await self._send_email_notification(user_id, alert)
                success = success and email_success
            
            # Send SMS notification (only for critical alerts)
            if AlertChannel.SMS in channels and alert.priority == AlertPriority.CRITICAL:
                sms_success = await self._send_sms_notification(user_id, alert)
                success = success and sms_success
            
            return success
            
        except Exception as e:
            logger.error(f"Error sending alert notifications: {e}")
            return False
    
    async def _send_in_app_notification(self, user_id: int, alert: SmartAlert) -> bool:
        """Send in-app notification through existing notification service"""
        try:
            # Create notification using existing service
            notification_data = {
                "title": f"🚨 {alert.title}",
                "message": alert.message,
                "type": "smart_alert",
                "priority": alert.priority.value,
                "data": {
                    "category": alert.category,
                    "metric_name": alert.metric_name,
                    "current_value": alert.current_value,
                    "threshold_value": alert.threshold_value,
                    "suggested_actions": alert.suggested_actions,
                    "alert_id": f"smart_{alert.category}_{int(datetime.now().timestamp())}"
                }
            }
            
            # Use existing notification service
            result = await self.notification_service.create_notification(
                user_id=user_id,
                notification_type="smart_alert",
                title=notification_data["title"],
                message=notification_data["message"],
                data=notification_data["data"]
            )
            
            return result is not None
            
        except Exception as e:
            logger.error(f"Error sending in-app notification: {e}")
            return False
    
    async def _send_email_notification(self, user_id: int, alert: SmartAlert) -> bool:
        """Send email notification with smart alert details"""
        try:
            # Get user email
            user = self.db.query(User).filter(User.id == user_id).first()
            if not user or not user.email:
                return False
            
            # Create email content
            subject = f"BookedBarber Alert: {alert.title}"
            
            # Format suggested actions as HTML list
            actions_html = "<ul>" + "".join([f"<li>{action}</li>" for action in alert.suggested_actions]) + "</ul>"
            
            email_body = f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                    <h2 style="color: #dc3545; margin: 0;">⚠️ Business Alert</h2>
                </div>
                
                <div style="padding: 20px; background: white; border-radius: 8px; border: 1px solid #dee2e6;">
                    <h3 style="color: #495057;">{alert.title}</h3>
                    <p style="color: #6c757d; font-size: 16px;">{alert.message}</p>
                    
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 15px 0;">
                        <strong>Alert Details:</strong><br>
                        <strong>Category:</strong> {alert.category.title()}<br>
                        <strong>Metric:</strong> {alert.metric_name}<br>
                        <strong>Current Value:</strong> {alert.current_value}<br>
                        <strong>Threshold:</strong> {alert.threshold_value}<br>
                        <strong>Trend:</strong> {alert.trend.title()}
                    </div>
                    
                    <div style="margin: 20px 0;">
                        <strong>Suggested Actions:</strong>
                        {actions_html}
                    </div>
                    
                    <div style="background: #e3f2fd; padding: 15px; border-radius: 6px; margin-top: 20px;">
                        <p style="margin: 0; color: #1565c0;">
                            <strong>💡 Six Figure Barber Tip:</strong> Regular monitoring of these metrics helps maintain the high standards that drive premium pricing and client loyalty.
                        </p>
                    </div>
                </div>
                
                <div style="text-align: center; margin-top: 20px; color: #6c757d; font-size: 12px;">
                    This alert was generated by your BookedBarber V2 intelligent analytics system.
                </div>
            </div>
            """
            
            # Send through existing notification service
            success = await self.notification_service.send_email(
                to_email=user.email,
                subject=subject,
                html_content=email_body
            )
            
            return success
            
        except Exception as e:
            logger.error(f"Error sending email notification: {e}")
            return False
    
    async def _send_sms_notification(self, user_id: int, alert: SmartAlert) -> bool:
        """Send SMS notification for critical alerts"""
        try:
            # Get user phone number
            user = self.db.query(User).filter(User.id == user_id).first()
            if not user or not user.phone_number:
                return False
            
            # Create concise SMS message
            sms_message = f"🚨 CRITICAL ALERT: {alert.title}\n{alert.message}\nCheck your BookedBarber dashboard for details."
            
            # Send through existing notification service
            success = await self.notification_service.send_sms(
                to_phone=user.phone_number,
                message=sms_message
            )
            
            return success
            
        except Exception as e:
            logger.error(f"Error sending SMS notification: {e}")
            return False
    
    def _is_duplicate_alert(self, user_id: int, alert: SmartAlert) -> bool:
        """Check if this alert was already sent recently"""
        try:
            # Check if similar alert was sent in the last 4 hours
            cutoff_time = datetime.now() - timedelta(hours=4)
            
            # For now, use simple title-based deduplication
            # In production, would use a proper alert log table
            return False  # Placeholder - implement with alert log table
            
        except Exception as e:
            logger.error(f"Error checking duplicate alert: {e}")
            return False
    
    def _should_send_based_on_frequency(self, user_id: int, alert: SmartAlert) -> bool:
        """Check if alert should be sent based on frequency rules"""
        try:
            # Get frequency rule for this alert type
            frequency = self._get_frequency_for_alert(alert)
            
            if frequency == AlertFrequency.IMMEDIATE:
                return True
            
            # Check last send time for this alert type
            # Placeholder - implement with proper alert log
            return True
            
        except Exception as e:
            logger.error(f"Error checking alert frequency: {e}")
            return True
    
    def _is_business_hours(self) -> bool:
        """Check if current time is within business hours"""
        now = datetime.now()
        # Business hours: 9 AM to 8 PM, Monday to Saturday
        if now.weekday() == 6:  # Sunday
            return False
        
        hour = now.hour
        return 9 <= hour <= 20
    
    def _get_next_business_hours(self) -> datetime:
        """Get the next business hours datetime"""
        now = datetime.now()
        
        # If it's Sunday, wait until Monday 9 AM
        if now.weekday() == 6:
            days_ahead = 1
            next_time = now.replace(hour=9, minute=0, second=0, microsecond=0)
            return next_time + timedelta(days=days_ahead)
        
        # If it's after business hours, wait until next day 9 AM
        if now.hour >= 21:
            next_time = now.replace(hour=9, minute=0, second=0, microsecond=0)
            return next_time + timedelta(days=1)
        
        # If it's before business hours, wait until today 9 AM
        if now.hour < 9:
            return now.replace(hour=9, minute=0, second=0, microsecond=0)
        
        return now  # Already in business hours
    
    def _user_allows_alert_type(self, user_id: int, alert: SmartAlert) -> bool:
        """Check if user preferences allow this alert type"""
        try:
            # Check user notification preferences
            # For now, allow all alerts
            # In production, integrate with notification_preferences table
            return True
            
        except Exception as e:
            logger.error(f"Error checking user alert preferences: {e}")
            return True
    
    def _get_alert_channels_for_priority(self, priority: AlertPriority) -> List[AlertChannel]:
        """Get appropriate notification channels based on alert priority"""
        if priority == AlertPriority.CRITICAL:
            return [AlertChannel.EMAIL, AlertChannel.SMS, AlertChannel.IN_APP]
        elif priority == AlertPriority.HIGH:
            return [AlertChannel.EMAIL, AlertChannel.IN_APP]
        elif priority == AlertPriority.MEDIUM:
            return [AlertChannel.IN_APP]
        else:
            return [AlertChannel.IN_APP]
    
    def _get_frequency_for_alert(self, alert: SmartAlert) -> AlertFrequency:
        """Get frequency rule for alert type"""
        # Map alert categories to frequencies
        frequency_map = {
            "revenue": AlertFrequency.IMMEDIATE,
            "booking": AlertFrequency.HOURLY,
            "retention": AlertFrequency.DAILY,
            "efficiency": AlertFrequency.DAILY
        }
        
        return frequency_map.get(alert.category, AlertFrequency.DAILY)
    
    async def _log_alert_sent(self, user_id: int, alert: SmartAlert) -> None:
        """Log that an alert was sent (for deduplication and analytics)"""
        try:
            # In production, would save to alert_log table
            logger.info(f"Alert sent to user {user_id}: {alert.title} ({alert.priority.value})")
            
        except Exception as e:
            logger.error(f"Error logging alert: {e}")
    
    async def get_alert_summary(self, user_id: int, days_back: int = 7) -> Dict[str, Any]:
        """Get summary of recent alerts for user"""
        try:
            # Get recent alerts
            alerts = self.intelligent_service.generate_smart_alerts(user_id)
            
            # Categorize alerts
            by_priority = {}
            by_category = {}
            
            for alert in alerts:
                priority = alert.priority.value
                category = alert.category
                
                by_priority[priority] = by_priority.get(priority, 0) + 1
                by_category[category] = by_category.get(category, 0) + 1
            
            return {
                "total_alerts": len(alerts),
                "by_priority": by_priority,
                "by_category": by_category,
                "recent_alerts": [
                    {
                        "title": alert.title,
                        "priority": alert.priority.value,
                        "category": alert.category,
                        "expires_at": alert.expires_at.isoformat()
                    }
                    for alert in alerts[:10]  # Last 10 alerts
                ]
            }
            
        except Exception as e:
            logger.error(f"Error getting alert summary: {e}")
            return {
                "total_alerts": 0,
                "by_priority": {},
                "by_category": {},
                "recent_alerts": []
            }