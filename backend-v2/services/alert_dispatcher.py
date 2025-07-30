"""
Alert Dispatcher Service
Handles multi-channel alerting for critical errors and system events
"""

import asyncio
import logging
from datetime import datetime, timedelta
from enum import Enum
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
import json
import aiohttp
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import smtplib
import os

from services.enhanced_error_monitoring_service import ErrorPattern, ErrorSeverity, BusinessImpact

logger = logging.getLogger(__name__)


class AlertChannel(Enum):
    EMAIL = "email"
    SLACK = "slack"
    SMS = "sms"
    WEBHOOK = "webhook"
    PUSH = "push"


class AlertPriority(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class AlertConfig:
    """Configuration for alert channels and thresholds"""
    email_recipients: List[str]
    slack_webhook_url: Optional[str]
    sms_recipients: List[str]
    webhook_urls: List[str]
    
    # Alert thresholds
    critical_error_threshold: int = 1  # Immediate alert for critical errors
    high_error_threshold: int = 5      # Alert for 5+ high severity errors in 5 min
    medium_error_threshold: int = 20   # Alert for 20+ medium errors in 15 min
    
    # Rate limiting
    alert_cooldown_minutes: int = 30   # Minimum time between similar alerts
    max_alerts_per_hour: int = 10      # Maximum alerts per hour per channel


@dataclass
class Alert:
    """Represents an alert to be sent"""
    id: str
    title: str
    message: str
    priority: AlertPriority
    channels: List[AlertChannel]
    error_pattern: Optional[ErrorPattern] = None
    metadata: Dict[str, Any] = None
    timestamp: datetime = None
    
    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.utcnow()
        if self.metadata is None:
            self.metadata = {}


class AlertDispatcher:
    """
    Dispatches alerts through multiple channels with rate limiting and deduplication
    """
    
    def __init__(self, config: AlertConfig):
        self.config = config
        self.sent_alerts: Dict[str, datetime] = {}  # Alert deduplication
        self.hourly_counts: Dict[str, int] = {}     # Rate limiting
        self.failed_channels: Dict[str, datetime] = {}  # Failed channel tracking
        
    async def dispatch_error_alert(self, error_pattern: ErrorPattern, count: int) -> bool:
        """
        Dispatch an alert for an error pattern
        
        Args:
            error_pattern: The error pattern that triggered the alert
            count: Number of occurrences
            
        Returns:
            True if alert was sent successfully
        """
        # Determine alert priority and channels
        priority = self._determine_priority(error_pattern, count)
        channels = self._determine_channels(priority, error_pattern.business_impact)
        
        # Create alert
        alert = Alert(
            id=f"error_{error_pattern.fingerprint}_{int(datetime.utcnow().timestamp())}",
            title=self._generate_alert_title(error_pattern, count),
            message=self._generate_alert_message(error_pattern, count),
            priority=priority,
            channels=channels,
            error_pattern=error_pattern,
            metadata={
                "error_count": count,
                "error_fingerprint": error_pattern.fingerprint,
                "error_category": error_pattern.category.value,
                "business_impact": error_pattern.business_impact.value,
                "trending": error_pattern.trending,
                "affected_users": error_pattern.affected_users
            }
        )
        
        return await self.send_alert(alert)
    
    async def dispatch_system_alert(
        self, 
        title: str, 
        message: str, 
        priority: AlertPriority = AlertPriority.MEDIUM,
        metadata: Dict[str, Any] = None
    ) -> bool:
        """
        Dispatch a general system alert
        
        Args:
            title: Alert title
            message: Alert message
            priority: Alert priority level
            metadata: Additional metadata
            
        Returns:
            True if alert was sent successfully
        """
        channels = self._determine_channels(priority, BusinessImpact.OPERATIONAL)
        
        alert = Alert(
            id=f"system_{int(datetime.utcnow().timestamp())}",
            title=title,
            message=message,
            priority=priority,
            channels=channels,
            metadata=metadata or {}
        )
        
        return await self.send_alert(alert)
    
    async def send_alert(self, alert: Alert) -> bool:
        """
        Send an alert through configured channels
        
        Args:
            alert: Alert to send
            
        Returns:
            True if sent successfully through at least one channel
        """
        # Check for alert deduplication
        dedup_key = self._get_deduplication_key(alert)
        if self._is_alert_suppressed(dedup_key):
            logger.info(f"Alert suppressed due to cooldown: {alert.id}")
            return False
        
        # Check rate limiting
        if self._is_rate_limited():
            logger.warning(f"Alert rate limited: {alert.id}")
            return False
        
        # Send through each channel
        success_count = 0
        tasks = []
        
        for channel in alert.channels:
            if self._is_channel_available(channel):
                task = self._send_to_channel(alert, channel)
                tasks.append(task)
        
        if tasks:
            results = await asyncio.gather(*tasks, return_exceptions=True)
            success_count = sum(1 for result in results if result is True)
        
        # Record alert if at least one channel succeeded
        if success_count > 0:
            self.sent_alerts[dedup_key] = datetime.utcnow()
            self._increment_hourly_count()
            logger.info(f"Alert sent successfully: {alert.id} ({success_count}/{len(alert.channels)} channels)")
            return True
        else:
            logger.error(f"Alert failed to send through any channel: {alert.id}")
            return False
    
    async def _send_to_channel(self, alert: Alert, channel: AlertChannel) -> bool:
        """Send alert to specific channel"""
        try:
            if channel == AlertChannel.EMAIL:
                return await self._send_email_alert(alert)
            elif channel == AlertChannel.SLACK:
                return await self._send_slack_alert(alert)
            elif channel == AlertChannel.SMS:
                return await self._send_sms_alert(alert)
            elif channel == AlertChannel.WEBHOOK:
                return await self._send_webhook_alert(alert)
            else:
                logger.warning(f"Unsupported alert channel: {channel}")
                return False
        except Exception as e:
            logger.error(f"Failed to send alert via {channel.value}: {e}")
            self.failed_channels[channel.value] = datetime.utcnow()
            return False
    
    async def _send_email_alert(self, alert: Alert) -> bool:
        """Send email alert"""
        if not self.config.email_recipients:
            return False
        
        try:
            # Create email content
            subject = f"[BookedBarber Alert] {alert.title}"
            body = self._format_email_body(alert)
            
            # Send email (implement your email service here)
            # This is a placeholder - integrate with your email service
            logger.info(f"Email alert would be sent: {subject}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email alert: {e}")
            return False
    
    async def _send_slack_alert(self, alert: Alert) -> bool:
        """Send Slack alert"""
        if not self.config.slack_webhook_url:
            return False
        
        try:
            # Format Slack message
            slack_message = {
                "text": f"🚨 {alert.title}",
                "attachments": [
                    {
                        "color": self._get_slack_color(alert.priority),
                        "fields": [
                            {
                                "title": "Message",
                                "value": alert.message,
                                "short": False
                            },
                            {
                                "title": "Priority",
                                "value": alert.priority.value.upper(),
                                "short": True
                            },
                            {
                                "title": "Timestamp",
                                "value": alert.timestamp.strftime("%Y-%m-%d %H:%M:%S UTC"),
                                "short": True
                            }
                        ]
                    }
                ]
            }
            
            # Add error-specific fields
            if alert.error_pattern:
                slack_message["attachments"][0]["fields"].extend([
                    {
                        "title": "Error Category",
                        "value": alert.error_pattern.category.value,
                        "short": True
                    },
                    {
                        "title": "Business Impact",
                        "value": alert.error_pattern.business_impact.value,
                        "short": True
                    },
                    {
                        "title": "Affected Users",
                        "value": str(alert.error_pattern.affected_users),
                        "short": True
                    }
                ])
            
            # Send to Slack
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    self.config.slack_webhook_url,
                    json=slack_message,
                    timeout=aiohttp.ClientTimeout(total=10)
                ) as response:
                    if response.status == 200:
                        logger.info("Slack alert sent successfully")
                        return True
                    else:
                        logger.error(f"Slack alert failed: {response.status}")
                        return False
                        
        except Exception as e:
            logger.error(f"Failed to send Slack alert: {e}")
            return False
    
    async def _send_sms_alert(self, alert: Alert) -> bool:
        """Send SMS alert (placeholder for SMS service integration)"""
        if not self.config.sms_recipients:
            return False
        
        # Integrate with your SMS service (Twilio, AWS SNS, etc.)
        logger.info(f"SMS alert would be sent: {alert.title}")
        return True
    
    async def _send_webhook_alert(self, alert: Alert) -> bool:
        """Send webhook alert"""
        if not self.config.webhook_urls:
            return False
        
        try:
            webhook_payload = {
                "alert_id": alert.id,
                "title": alert.title,
                "message": alert.message,
                "priority": alert.priority.value,
                "timestamp": alert.timestamp.isoformat(),
                "metadata": alert.metadata
            }
            
            success_count = 0
            for webhook_url in self.config.webhook_urls:
                try:
                    async with aiohttp.ClientSession() as session:
                        async with session.post(
                            webhook_url,
                            json=webhook_payload,
                            timeout=aiohttp.ClientTimeout(total=10)
                        ) as response:
                            if response.status < 300:
                                success_count += 1
                except Exception as e:
                    logger.error(f"Webhook alert failed for {webhook_url}: {e}")
            
            return success_count > 0
            
        except Exception as e:
            logger.error(f"Failed to send webhook alerts: {e}")
            return False
    
    def _determine_priority(self, error_pattern: ErrorPattern, count: int) -> AlertPriority:
        """Determine alert priority based on error pattern and count"""
        if error_pattern.severity == ErrorSeverity.CRITICAL:
            return AlertPriority.CRITICAL
        elif error_pattern.business_impact == BusinessImpact.REVENUE_BLOCKING:
            return AlertPriority.CRITICAL
        elif error_pattern.severity == ErrorSeverity.HIGH or count >= 10:
            return AlertPriority.HIGH
        elif count >= 5:
            return AlertPriority.MEDIUM
        else:
            return AlertPriority.LOW
    
    def _determine_channels(self, priority: AlertPriority, business_impact: BusinessImpact) -> List[AlertChannel]:
        """Determine which channels to use based on priority and impact"""
        channels = []
        
        # Always include email for medium+ priority
        if priority in [AlertPriority.MEDIUM, AlertPriority.HIGH, AlertPriority.CRITICAL]:
            channels.append(AlertChannel.EMAIL)
        
        # Include Slack for high+ priority
        if priority in [AlertPriority.HIGH, AlertPriority.CRITICAL]:
            channels.append(AlertChannel.SLACK)
        
        # Include SMS for critical errors or revenue-blocking issues
        if (priority == AlertPriority.CRITICAL or 
            business_impact == BusinessImpact.REVENUE_BLOCKING):
            channels.append(AlertChannel.SMS)
        
        # Always include webhooks
        channels.append(AlertChannel.WEBHOOK)
        
        return channels
    
    def _generate_alert_title(self, error_pattern: ErrorPattern, count: int) -> str:
        """Generate alert title for error pattern"""
        severity_emoji = {
            ErrorSeverity.CRITICAL: "🔥",
            ErrorSeverity.HIGH: "🚨",
            ErrorSeverity.MEDIUM: "⚠️",
            ErrorSeverity.LOW: "ℹ️"
        }
        
        emoji = severity_emoji.get(error_pattern.severity, "❗")
        trending = " (INCREASING)" if error_pattern.trending == "increasing" else ""
        
        return f"{emoji} {error_pattern.severity.value.upper()} Error Alert{trending}: {count} occurrences"
    
    def _generate_alert_message(self, error_pattern: ErrorPattern, count: int) -> str:
        """Generate alert message for error pattern"""
        message_parts = [
            f"Error Pattern: {error_pattern.sample_message}",
            f"Category: {error_pattern.category.value}",
            f"Business Impact: {error_pattern.business_impact.value}",
            f"Occurrences: {count} times",
            f"Affected Users: {error_pattern.affected_users}",
            f"Rate: {error_pattern.rate_per_hour:.1f} errors/hour",
            f"First Seen: {error_pattern.first_seen.strftime('%Y-%m-%d %H:%M:%S UTC')}",
            f"Last Seen: {error_pattern.last_seen.strftime('%Y-%m-%d %H:%M:%S UTC')}"
        ]
        
        if error_pattern.resolution_suggestions:
            message_parts.append("\nSuggested Actions:")
            for i, suggestion in enumerate(error_pattern.resolution_suggestions[:3], 1):
                message_parts.append(f"{i}. {suggestion}")
        
        return "\n".join(message_parts)
    
    def _format_email_body(self, alert: Alert) -> str:
        """Format email body for alert"""
        html_body = f"""
        <html>
        <body>
            <h2>{alert.title}</h2>
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 10px 0;">
                <p><strong>Priority:</strong> {alert.priority.value.upper()}</p>
                <p><strong>Timestamp:</strong> {alert.timestamp.strftime('%Y-%m-%d %H:%M:%S UTC')}</p>
            </div>
            <div style="margin: 15px 0;">
                <pre style="background-color: #f1f3f4; padding: 10px; border-radius: 3px; white-space: pre-wrap;">{alert.message}</pre>
            </div>
        """
        
        if alert.metadata:
            html_body += "<h3>Additional Information:</h3><ul>"
            for key, value in alert.metadata.items():
                html_body += f"<li><strong>{key}:</strong> {value}</li>"
            html_body += "</ul>"
        
        html_body += """
            <hr>
            <p><small>This alert was generated by BookedBarber Error Monitoring System</small></p>
        </body>
        </html>
        """
        
        return html_body
    
    def _get_slack_color(self, priority: AlertPriority) -> str:
        """Get Slack message color based on priority"""
        colors = {
            AlertPriority.CRITICAL: "danger",
            AlertPriority.HIGH: "warning",
            AlertPriority.MEDIUM: "good",
            AlertPriority.LOW: "#36a64f"
        }
        return colors.get(priority, "good")
    
    def _get_deduplication_key(self, alert: Alert) -> str:
        """Generate deduplication key for alert"""
        if alert.error_pattern:
            return f"error_{alert.error_pattern.fingerprint}"
        else:
            return f"system_{hash(alert.title + alert.message)}"
    
    def _is_alert_suppressed(self, dedup_key: str) -> bool:
        """Check if alert should be suppressed due to cooldown"""
        if dedup_key not in self.sent_alerts:
            return False
        
        last_sent = self.sent_alerts[dedup_key]
        cooldown_period = timedelta(minutes=self.config.alert_cooldown_minutes)
        
        return datetime.utcnow() - last_sent < cooldown_period
    
    def _is_rate_limited(self) -> bool:
        """Check if alerts are rate limited"""
        current_hour = datetime.utcnow().hour
        count = self.hourly_counts.get(str(current_hour), 0)
        return count >= self.config.max_alerts_per_hour
    
    def _increment_hourly_count(self):
        """Increment hourly alert count"""
        current_hour = datetime.utcnow().hour
        hour_key = str(current_hour)
        self.hourly_counts[hour_key] = self.hourly_counts.get(hour_key, 0) + 1
        
        # Clean up old hour counts
        for hour in list(self.hourly_counts.keys()):
            if abs(int(hour) - current_hour) > 1:
                del self.hourly_counts[hour]
    
    def _is_channel_available(self, channel: AlertChannel) -> bool:
        """Check if channel is available (not recently failed)"""
        if channel.value not in self.failed_channels:
            return True
        
        last_failure = self.failed_channels[channel.value]
        recovery_period = timedelta(minutes=15)  # Try again after 15 minutes
        
        return datetime.utcnow() - last_failure > recovery_period
    
    async def health_check(self) -> Dict[str, Any]:
        """Get health status of alert dispatcher"""
        return {
            "status": "healthy",
            "config": {
                "email_recipients": len(self.config.email_recipients),
                "slack_configured": bool(self.config.slack_webhook_url),
                "sms_recipients": len(self.config.sms_recipients),
                "webhook_urls": len(self.config.webhook_urls)
            },
            "statistics": {
                "alerts_sent_today": len(self.sent_alerts),
                "failed_channels": len(self.failed_channels),
                "current_hour_count": self.hourly_counts.get(str(datetime.utcnow().hour), 0)
            }
        }


# Factory function to create alert dispatcher with configuration
def create_alert_dispatcher() -> AlertDispatcher:
    """Create alert dispatcher with configuration from environment"""
    config = AlertConfig(
        email_recipients=os.getenv("ALERT_EMAIL_RECIPIENTS", "").split(","),
        slack_webhook_url=os.getenv("SLACK_WEBHOOK_URL"),
        sms_recipients=os.getenv("ALERT_SMS_RECIPIENTS", "").split(","),
        webhook_urls=os.getenv("ALERT_WEBHOOK_URLS", "").split(",")
    )
    
    return AlertDispatcher(config)


# Global instance
alert_dispatcher = create_alert_dispatcher()