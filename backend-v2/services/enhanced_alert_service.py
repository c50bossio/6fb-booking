"""
Enhanced Real-Time Error Alerting System
Provides intelligent alerting with multiple notification channels and escalation
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Union, Callable
from dataclasses import dataclass, asdict
from enum import Enum
import httpx
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
import os
from collections import defaultdict, deque
import hashlib

from services.error_monitoring_service import ErrorEvent, ErrorSeverity, ErrorCategory, BusinessImpact
from utils.enhanced_logging import get_logger, get_business_logger
from config import settings

logger = get_logger(__name__)
business_logger = get_business_logger(__name__)

class AlertSeverity(Enum):
    """Alert severity levels"""
    CRITICAL = "critical"    # Page immediately
    HIGH = "high"           # Send SMS + Email
    MEDIUM = "medium"       # Email only
    LOW = "low"            # Dashboard notification
    INFO = "info"          # Log only

class AlertChannel(Enum):
    """Available notification channels"""
    EMAIL = "email"
    SMS = "sms"
    SLACK = "slack"
    DISCORD = "discord"
    WEBHOOK = "webhook"
    PUSH = "push_notification"
    DASHBOARD = "dashboard"

@dataclass
class AlertRule:
    """Alert rule configuration"""
    name: str
    description: str
    condition: str  # Python expression
    severity: AlertSeverity
    channels: List[AlertChannel]
    cooldown_minutes: int = 15
    max_alerts_per_hour: int = 10
    escalation_rules: Optional[List['EscalationRule']] = None
    template: Optional[str] = None
    enabled: bool = True

@dataclass
class EscalationRule:
    """Alert escalation rule"""
    trigger_after_minutes: int
    escalate_to_severity: AlertSeverity
    additional_channels: List[AlertChannel]
    notify_oncall: bool = False

@dataclass
class AlertInstance:
    """Individual alert instance"""
    id: str
    rule_name: str
    severity: AlertSeverity
    title: str
    message: str
    error_event: Optional[ErrorEvent] = None
    context: Optional[Dict[str, Any]] = None
    created_at: datetime = None
    acknowledged: bool = False
    resolved: bool = False
    escalated: bool = False
    notification_attempts: Dict[str, int] = None
    
    def __post_init__(self):
        if self.created_at is None:
            self.created_at = datetime.utcnow()
        if self.notification_attempts is None:
            self.notification_attempts = defaultdict(int)

class NotificationChannel:
    """Base class for notification channels"""
    
    def __init__(self, name: str, config: Dict[str, Any]):
        self.name = name
        self.config = config
        self.enabled = config.get('enabled', True)
        self.rate_limits = deque(maxlen=100)  # Track last 100 notifications
        self.max_per_minute = config.get('max_per_minute', 10)
    
    async def send_notification(self, alert: AlertInstance) -> bool:
        """Send notification through this channel"""
        if not self.enabled:
            return False
        
        if not self._check_rate_limit():
            logger.warning(f"Rate limit exceeded for {self.name}")
            return False
        
        try:
            success = await self._send_message(alert)
            self.rate_limits.append(datetime.utcnow())
            return success
        except Exception as e:
            logger.error(f"Failed to send notification via {self.name}: {e}")
            return False
    
    def _check_rate_limit(self) -> bool:
        """Check if rate limit allows sending"""
        now = datetime.utcnow()
        minute_ago = now - timedelta(minutes=1)
        
        recent_notifications = [
            ts for ts in self.rate_limits
            if ts > minute_ago
        ]
        
        return len(recent_notifications) < self.max_per_minute
    
    async def _send_message(self, alert: AlertInstance) -> bool:
        """Implement in subclass"""
        raise NotImplementedError

class EmailChannel(NotificationChannel):
    """Email notification channel"""
    
    async def _send_message(self, alert: AlertInstance) -> bool:
        try:
            smtp_config = self.config.get('smtp', {})
            recipients = self.config.get('recipients', [])
            
            if not recipients:
                logger.warning("No email recipients configured")
                return False
            
            # Create message
            msg = MIMEMultipart()
            msg['From'] = smtp_config.get('from_address', 'alerts@bookedbarber.com')
            msg['To'] = ', '.join(recipients)
            msg['Subject'] = f"[{alert.severity.value.upper()}] {alert.title}"
            
            # Create HTML body
            html_body = self._create_email_template(alert)
            msg.attach(MIMEText(html_body, 'html'))
            
            # Send email
            with smtplib.SMTP(smtp_config.get('host'), smtp_config.get('port', 587)) as server:
                if smtp_config.get('use_tls', True):
                    server.starttls()
                
                username = smtp_config.get('username')
                password = smtp_config.get('password')
                if username and password:
                    server.login(username, password)
                
                server.send_message(msg)
            
            logger.info(f"Email alert sent for {alert.id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email alert: {e}")
            return False
    
    def _create_email_template(self, alert: AlertInstance) -> str:
        """Create HTML email template"""
        severity_colors = {
            AlertSeverity.CRITICAL: "#FF0000",
            AlertSeverity.HIGH: "#FF8C00",
            AlertSeverity.MEDIUM: "#FFD700",
            AlertSeverity.LOW: "#32CD32",
            AlertSeverity.INFO: "#87CEEB"
        }
        
        color = severity_colors.get(alert.severity, "#000000")
        
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; margin: 20px; }}
                .alert-header {{ background-color: {color}; color: white; padding: 15px; border-radius: 5px; }}
                .alert-body {{ padding: 20px; border: 1px solid #ddd; border-radius: 5px; margin-top: 10px; }}
                .context-table {{ width: 100%; border-collapse: collapse; margin-top: 15px; }}
                .context-table th, .context-table td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
                .context-table th {{ background-color: #f2f2f2; }}
                .timestamp {{ color: #666; font-size: 0.9em; }}
            </style>
        </head>
        <body>
            <div class="alert-header">
                <h2>{alert.title}</h2>
                <p class="timestamp">Alert ID: {alert.id} | Time: {alert.created_at.isoformat()}</p>
            </div>
            
            <div class="alert-body">
                <p><strong>Severity:</strong> {alert.severity.value.upper()}</p>
                <p><strong>Message:</strong> {alert.message}</p>
                
                {self._format_error_details(alert)}
                {self._format_context_table(alert)}
                
                <p><strong>Actions:</strong></p>
                <ul>
                    <li><a href="https://app.bookedbarber.com/admin/monitoring/alerts/{alert.id}">View Alert</a></li>
                    <li><a href="https://app.bookedbarber.com/admin/monitoring/dashboard">Error Dashboard</a></li>
                    <li><a href="mailto:support@bookedbarber.com?subject=Alert {alert.id}">Contact Support</a></li>
                </ul>
            </div>
        </body>
        </html>
        """
    
    def _format_error_details(self, alert: AlertInstance) -> str:
        """Format error details section"""
        if not alert.error_event:
            return ""
        
        error = alert.error_event
        return f"""
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <h4>Error Details</h4>
            <p><strong>Category:</strong> {error.category.value}</p>
            <p><strong>Business Impact:</strong> {error.business_impact.value}</p>
            <p><strong>Endpoint:</strong> {error.endpoint or 'N/A'}</p>
            <p><strong>User ID:</strong> {error.user_id or 'Anonymous'}</p>
            {f'<p><strong>Stack Trace:</strong><br><pre style="font-size: 0.8em; background: #f1f1f1; padding: 10px; border-radius: 3px;">{error.stack_trace[:1000]}...</pre></p>' if error.stack_trace else ''}
        </div>
        """
    
    def _format_context_table(self, alert: AlertInstance) -> str:
        """Format context as HTML table"""
        if not alert.context:
            return ""
        
        rows = ""
        for key, value in alert.context.items():
            rows += f"<tr><td>{key}</td><td>{str(value)[:200]}</td></tr>"
        
        return f"""
        <table class="context-table">
            <tr><th>Property</th><th>Value</th></tr>
            {rows}
        </table>
        """

class SlackChannel(NotificationChannel):
    """Slack notification channel"""
    
    async def _send_message(self, alert: AlertInstance) -> bool:
        try:
            webhook_url = self.config.get('webhook_url')
            if not webhook_url:
                logger.warning("No Slack webhook URL configured")
                return False
            
            # Create Slack message
            color_map = {
                AlertSeverity.CRITICAL: "danger",
                AlertSeverity.HIGH: "warning", 
                AlertSeverity.MEDIUM: "warning",
                AlertSeverity.LOW: "good",
                AlertSeverity.INFO: "#36a64f"
            }
            
            attachment = {
                "color": color_map.get(alert.severity, "warning"),
                "title": alert.title,
                "text": alert.message,
                "fields": [
                    {
                        "title": "Severity",
                        "value": alert.severity.value.upper(),
                        "short": True
                    },
                    {
                        "title": "Alert ID",
                        "value": alert.id,
                        "short": True
                    },
                    {
                        "title": "Time",
                        "value": alert.created_at.strftime("%Y-%m-%d %H:%M:%S UTC"),
                        "short": True
                    }
                ],
                "actions": [
                    {
                        "type": "button",
                        "text": "View Dashboard",
                        "url": "https://app.bookedbarber.com/admin/monitoring/dashboard"
                    },
                    {
                        "type": "button", 
                        "text": "Acknowledge",
                        "url": f"https://app.bookedbarber.com/admin/monitoring/alerts/{alert.id}/acknowledge"
                    }
                ]
            }
            
            # Add error details if available
            if alert.error_event:
                error_fields = [
                    {
                        "title": "Category",
                        "value": alert.error_event.category.value,
                        "short": True
                    },
                    {
                        "title": "Business Impact", 
                        "value": alert.error_event.business_impact.value,
                        "short": True
                    }
                ]
                attachment["fields"].extend(error_fields)
            
            payload = {
                "username": "BookedBarber Alerts",
                "icon_emoji": ":warning:",
                "attachments": [attachment]
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(webhook_url, json=payload)
                response.raise_for_status()
            
            logger.info(f"Slack alert sent for {alert.id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send Slack alert: {e}")
            return False

class WebhookChannel(NotificationChannel):
    """Generic webhook notification channel"""
    
    async def _send_message(self, alert: AlertInstance) -> bool:
        try:
            webhook_url = self.config.get('url')
            if not webhook_url:
                logger.warning("No webhook URL configured")
                return False
            
            payload = {
                "alert_id": alert.id,
                "severity": alert.severity.value,
                "title": alert.title,
                "message": alert.message,
                "created_at": alert.created_at.isoformat(),
                "context": alert.context,
                "error_event": asdict(alert.error_event) if alert.error_event else None
            }
            
            headers = self.config.get('headers', {})
            timeout = self.config.get('timeout', 30)
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    webhook_url, 
                    json=payload, 
                    headers=headers,
                    timeout=timeout
                )
                response.raise_for_status()
            
            logger.info(f"Webhook alert sent for {alert.id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send webhook alert: {e}")
            return False

class EnhancedAlertService:
    """
    Enhanced alert service with intelligent routing and escalation
    """
    
    def __init__(self):
        self.logger = get_logger(__name__)
        self.business_logger = get_business_logger(__name__)
        
        # Alert management
        self.active_alerts: Dict[str, AlertInstance] = {}
        self.alert_rules: Dict[str, AlertRule] = {}
        self.notification_channels: Dict[str, NotificationChannel] = {}
        self.alert_history = deque(maxlen=10000)
        
        # Rate limiting and cooldowns
        self.rule_cooldowns: Dict[str, datetime] = {}
        self.hourly_counts: Dict[str, deque] = defaultdict(lambda: deque(maxlen=100))
        
        # Background tasks
        self._escalation_task = None
        self._cleanup_task = None
        self._monitoring_enabled = False
        
        # Initialize default rules and channels
        self._initialize_default_rules()
        self._initialize_notification_channels()
    
    def _initialize_default_rules(self):
        """Initialize default alert rules"""
        default_rules = [
            AlertRule(
                name="critical_errors",
                description="Critical errors that block revenue or core functionality",
                condition="error.severity == 'critical'",
                severity=AlertSeverity.CRITICAL,
                channels=[AlertChannel.EMAIL, AlertChannel.SLACK, AlertChannel.SMS],
                cooldown_minutes=5,
                max_alerts_per_hour=20,
                escalation_rules=[
                    EscalationRule(
                        trigger_after_minutes=10,
                        escalate_to_severity=AlertSeverity.CRITICAL,
                        additional_channels=[AlertChannel.SMS],
                        notify_oncall=True
                    )
                ]
            ),
            AlertRule(
                name="high_error_rate",
                description="High error rate detected",
                condition="error_rate > 10",
                severity=AlertSeverity.HIGH,
                channels=[AlertChannel.EMAIL, AlertChannel.SLACK],
                cooldown_minutes=15,
                max_alerts_per_hour=6
            ),
            AlertRule(
                name="payment_errors",
                description="Payment processing errors",
                condition="error.category == 'payment'",
                severity=AlertSeverity.HIGH,
                channels=[AlertChannel.EMAIL, AlertChannel.SLACK],
                cooldown_minutes=5,
                max_alerts_per_hour=10
            ),
            AlertRule(
                name="booking_errors",
                description="Booking system errors",
                condition="error.category == 'booking' and error.business_impact in ['revenue_blocking', 'user_blocking']",
                severity=AlertSeverity.MEDIUM,
                channels=[AlertChannel.EMAIL, AlertChannel.SLACK],
                cooldown_minutes=10,
                max_alerts_per_hour=8
            ),
            AlertRule(
                name="authentication_failures",
                description="Authentication system failures",
                condition="error.category == 'authentication' and error.severity in ['critical', 'high']",
                severity=AlertSeverity.MEDIUM,
                channels=[AlertChannel.EMAIL, AlertChannel.SLACK],
                cooldown_minutes=10,
                max_alerts_per_hour=5
            )
        ]
        
        for rule in default_rules:
            self.alert_rules[rule.name] = rule
    
    def _initialize_notification_channels(self):
        """Initialize notification channels from configuration"""
        # Email channel
        email_config = getattr(settings, 'ALERT_EMAIL_CONFIG', {})
        if email_config.get('enabled', False):
            self.notification_channels[AlertChannel.EMAIL.value] = EmailChannel(
                "email", email_config
            )
        
        # Slack channel
        slack_config = getattr(settings, 'ALERT_SLACK_CONFIG', {})
        if slack_config.get('enabled', False):
            self.notification_channels[AlertChannel.SLACK.value] = SlackChannel(
                "slack", slack_config
            )
        
        # Webhook channel
        webhook_config = getattr(settings, 'ALERT_WEBHOOK_CONFIG', {})
        if webhook_config.get('enabled', False):
            self.notification_channels[AlertChannel.WEBHOOK.value] = WebhookChannel(
                "webhook", webhook_config
            )
    
    async def start_monitoring(self):
        """Start background monitoring tasks"""
        if self._monitoring_enabled:
            return
        
        self._monitoring_enabled = True
        self._escalation_task = asyncio.create_task(self._escalation_monitor())
        self._cleanup_task = asyncio.create_task(self._cleanup_monitor())
        
        self.logger.info("Alert service monitoring started")
    
    async def stop_monitoring(self):
        """Stop background monitoring tasks"""
        self._monitoring_enabled = False
        
        if self._escalation_task:
            self._escalation_task.cancel()
        if self._cleanup_task:
            self._cleanup_task.cancel()
        
        self.logger.info("Alert service monitoring stopped")
    
    async def process_error_event(self, error_event: ErrorEvent) -> List[AlertInstance]:
        """Process an error event and generate alerts"""
        alerts_generated = []
        
        try:
            # Check each alert rule
            for rule_name, rule in self.alert_rules.items():
                if not rule.enabled:
                    continue
                
                # Check if rule matches
                if self._evaluate_rule_condition(rule, error_event):
                    # Check cooldown and rate limits
                    if not self._check_rule_constraints(rule_name, rule):
                        continue
                    
                    # Generate alert
                    alert = await self._create_alert(rule, error_event)
                    alerts_generated.append(alert)
                    
                    # Send notifications
                    await self._send_alert_notifications(alert)
                    
                    # Update tracking
                    self._update_rule_tracking(rule_name)
        
        except Exception as e:
            self.logger.error(f"Failed to process error event: {e}")
        
        return alerts_generated
    
    def _evaluate_rule_condition(self, rule: AlertRule, error_event: ErrorEvent) -> bool:
        """Evaluate if rule condition matches the error event"""
        try:
            # Create evaluation context
            context = {
                'error': {
                    'severity': error_event.severity.value,
                    'category': error_event.category.value,
                    'business_impact': error_event.business_impact.value,
                    'message': error_event.message,
                    'endpoint': error_event.endpoint,
                    'user_id': error_event.user_id,
                    'retry_count': error_event.retry_count
                }
            }
            
            # Add dynamic metrics if needed
            if 'error_rate' in rule.condition:
                # This would be calculated from your monitoring service
                context['error_rate'] = 5.0  # Placeholder
            
            # Evaluate condition
            return eval(rule.condition, {"__builtins__": {}}, context)
            
        except Exception as e:
            self.logger.error(f"Failed to evaluate rule condition '{rule.condition}': {e}")
            return False
    
    def _check_rule_constraints(self, rule_name: str, rule: AlertRule) -> bool:
        """Check if rule constraints allow triggering alert"""
        now = datetime.utcnow()
        
        # Check cooldown
        last_alert = self.rule_cooldowns.get(rule_name)
        if last_alert:
            cooldown_end = last_alert + timedelta(minutes=rule.cooldown_minutes)
            if now < cooldown_end:
                return False
        
        # Check hourly rate limit
        hour_counts = self.hourly_counts[rule_name]
        hour_ago = now - timedelta(hours=1)
        
        # Remove old entries
        while hour_counts and hour_counts[0] < hour_ago:
            hour_counts.popleft()
        
        if len(hour_counts) >= rule.max_alerts_per_hour:
            return False
        
        return True
    
    async def _create_alert(self, rule: AlertRule, error_event: ErrorEvent) -> AlertInstance:
        """Create alert instance from rule and error event"""
        alert_id = f"alert_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_{hash(rule.name + error_event.id) % 10000:04d}"
        
        # Generate alert title and message
        title = self._generate_alert_title(rule, error_event)
        message = self._generate_alert_message(rule, error_event)
        
        # Create context
        context = {
            "rule_name": rule.name,
            "error_id": error_event.id,
            "business_impact": error_event.business_impact.value,
            "similar_errors": error_event.similar_errors_count,
            "environment": getattr(settings, 'ENVIRONMENT', 'production')
        }
        
        if error_event.context:
            context.update(error_event.context)
        
        alert = AlertInstance(
            id=alert_id,
            rule_name=rule.name,
            severity=rule.severity,
            title=title,
            message=message,
            error_event=error_event,
            context=context
        )
        
        # Store alert
        self.active_alerts[alert_id] = alert
        self.alert_history.append(alert)
        
        # Log business event
        self.business_logger.log_user_event(
            "alert_generated",
            user_id="system",
            user_role="system",
            alert_id=alert_id,
            rule_name=rule.name,
            severity=rule.severity.value,
            error_category=error_event.category.value
        )
        
        return alert
    
    def _generate_alert_title(self, rule: AlertRule, error_event: ErrorEvent) -> str:
        """Generate alert title"""
        if rule.template and 'title' in rule.template:
            # Use custom template if available
            return rule.template['title'].format(
                rule=rule,
                error=error_event,
                count=error_event.similar_errors_count
            )
        
        # Default title generation
        category_titles = {
            ErrorCategory.PAYMENT: "Payment System Alert",
            ErrorCategory.BOOKING: "Booking System Alert", 
            ErrorCategory.AUTHENTICATION: "Authentication Alert",
            ErrorCategory.DATABASE: "Database Alert",
            ErrorCategory.EXTERNAL_API: "External Service Alert",
            ErrorCategory.PERFORMANCE: "Performance Alert"
        }
        
        base_title = category_titles.get(error_event.category, "System Alert")
        
        if error_event.similar_errors_count > 1:
            return f"{base_title} ({error_event.similar_errors_count} occurrences)"
        
        return base_title
    
    def _generate_alert_message(self, rule: AlertRule, error_event: ErrorEvent) -> str:
        """Generate alert message"""
        if rule.template and 'message' in rule.template:
            return rule.template['message'].format(
                rule=rule,
                error=error_event,
                count=error_event.similar_errors_count
            )
        
        # Default message generation
        message_parts = [
            f"Error: {error_event.message}",
            f"Category: {error_event.category.value}",
            f"Business Impact: {error_event.business_impact.value}"
        ]
        
        if error_event.endpoint:
            message_parts.append(f"Endpoint: {error_event.endpoint}")
        
        if error_event.user_id:
            message_parts.append(f"User: {error_event.user_id}")
        
        if error_event.similar_errors_count > 1:
            message_parts.append(f"Similar errors: {error_event.similar_errors_count}")
        
        return "\n".join(message_parts)
    
    async def _send_alert_notifications(self, alert: AlertInstance):
        """Send alert notifications through configured channels"""
        rule = self.alert_rules.get(alert.rule_name)
        if not rule:
            return
        
        notification_tasks = []
        
        for channel in rule.channels:
            channel_impl = self.notification_channels.get(channel.value)
            if channel_impl:
                task = asyncio.create_task(
                    self._send_channel_notification(channel_impl, alert)
                )
                notification_tasks.append(task)
        
        # Wait for all notifications to complete
        if notification_tasks:
            results = await asyncio.gather(*notification_tasks, return_exceptions=True)
            
            # Log results
            for channel, result in zip(rule.channels, results):
                if isinstance(result, Exception):
                    self.logger.error(f"Failed to send alert via {channel.value}: {result}")
                    alert.notification_attempts[channel.value] += 1
                elif result:
                    self.logger.info(f"Alert sent successfully via {channel.value}")
    
    async def _send_channel_notification(self, channel: NotificationChannel, alert: AlertInstance) -> bool:
        """Send notification through specific channel"""
        try:
            return await channel.send_notification(alert)
        except Exception as e:
            self.logger.error(f"Channel notification failed: {e}")
            return False
    
    def _update_rule_tracking(self, rule_name: str):
        """Update rule tracking for cooldowns and rate limiting"""
        now = datetime.utcnow()
        self.rule_cooldowns[rule_name] = now
        self.hourly_counts[rule_name].append(now)
    
    async def _escalation_monitor(self):
        """Monitor alerts for escalation"""
        while self._monitoring_enabled:
            try:
                await self._check_escalations()
                await asyncio.sleep(60)  # Check every minute
            except Exception as e:
                self.logger.error(f"Escalation monitor error: {e}")
                await asyncio.sleep(60)
    
    async def _check_escalations(self):
        """Check for alerts that need escalation"""
        now = datetime.utcnow()
        
        for alert in self.active_alerts.values():
            if alert.acknowledged or alert.resolved or alert.escalated:
                continue
            
            rule = self.alert_rules.get(alert.rule_name)
            if not rule or not rule.escalation_rules:
                continue
            
            for escalation_rule in rule.escalation_rules:
                escalation_time = alert.created_at + timedelta(minutes=escalation_rule.trigger_after_minutes)
                
                if now >= escalation_time:
                    await self._escalate_alert(alert, escalation_rule)
                    break
    
    async def _escalate_alert(self, alert: AlertInstance, escalation_rule: EscalationRule):
        """Escalate an alert"""
        try:
            # Update alert
            alert.escalated = True
            alert.severity = escalation_rule.escalate_to_severity
            
            # Send escalation notifications
            for channel in escalation_rule.additional_channels:
                channel_impl = self.notification_channels.get(channel.value)
                if channel_impl:
                    escalated_alert = AlertInstance(
                        id=f"{alert.id}_escalated",
                        rule_name=alert.rule_name,
                        severity=escalation_rule.escalate_to_severity,
                        title=f"ESCALATED: {alert.title}",
                        message=f"Alert escalated after {escalation_rule.trigger_after_minutes} minutes.\n\nOriginal:\n{alert.message}",
                        error_event=alert.error_event,
                        context=alert.context
                    )
                    
                    await channel_impl.send_notification(escalated_alert)
            
            self.logger.warning(f"Alert {alert.id} escalated to {escalation_rule.escalate_to_severity.value}")
            
        except Exception as e:
            self.logger.error(f"Failed to escalate alert {alert.id}: {e}")
    
    async def _cleanup_monitor(self):
        """Clean up old resolved alerts"""
        while self._monitoring_enabled:
            try:
                await self._cleanup_old_alerts()
                await asyncio.sleep(3600)  # Clean up every hour
            except Exception as e:
                self.logger.error(f"Cleanup monitor error: {e}")
                await asyncio.sleep(3600)
    
    async def _cleanup_old_alerts(self):
        """Clean up alerts older than 24 hours"""
        cutoff_time = datetime.utcnow() - timedelta(hours=24)
        
        alerts_to_remove = [
            alert_id for alert_id, alert in self.active_alerts.items()
            if alert.resolved and alert.created_at < cutoff_time
        ]
        
        for alert_id in alerts_to_remove:
            del self.active_alerts[alert_id]
        
        if alerts_to_remove:
            self.logger.info(f"Cleaned up {len(alerts_to_remove)} old alerts")
    
    async def acknowledge_alert(self, alert_id: str, user_id: str) -> bool:
        """Acknowledge an alert"""
        if alert_id not in self.active_alerts:
            return False
        
        alert = self.active_alerts[alert_id]
        alert.acknowledged = True
        
        self.business_logger.log_user_event(
            "alert_acknowledged",
            user_id=user_id,
            user_role="admin",
            alert_id=alert_id
        )
        
        self.logger.info(f"Alert {alert_id} acknowledged by {user_id}")
        return True
    
    async def resolve_alert(self, alert_id: str, user_id: str) -> bool:
        """Resolve an alert"""
        if alert_id not in self.active_alerts:
            return False
        
        alert = self.active_alerts[alert_id]
        alert.resolved = True
        
        self.business_logger.log_user_event(
            "alert_resolved",
            user_id=user_id,
            user_role="admin",
            alert_id=alert_id
        )
        
        self.logger.info(f"Alert {alert_id} resolved by {user_id}")
        return True
    
    def get_active_alerts(self) -> List[AlertInstance]:
        """Get all active alerts"""
        return [
            alert for alert in self.active_alerts.values()
            if not alert.resolved
        ]
    
    def get_alert_statistics(self) -> Dict[str, Any]:
        """Get alert statistics"""
        active_alerts = self.get_active_alerts()
        
        return {
            "total_active": len(active_alerts),
            "by_severity": {
                severity.value: len([a for a in active_alerts if a.severity == severity])
                for severity in AlertSeverity
            },
            "acknowledged": len([a for a in active_alerts if a.acknowledged]),
            "escalated": len([a for a in active_alerts if a.escalated]),
            "total_rules": len(self.alert_rules),
            "enabled_rules": len([r for r in self.alert_rules.values() if r.enabled]),
            "notification_channels": len(self.notification_channels),
            "monitoring_enabled": self._monitoring_enabled
        }

# Global alert service instance
alert_service = EnhancedAlertService()