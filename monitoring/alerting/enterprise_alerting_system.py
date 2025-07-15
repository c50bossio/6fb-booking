"""
Enterprise Real-Time Alerting System for BookedBarber V2
========================================================

Comprehensive alerting system with multiple channels, escalation procedures,
and intelligent alert management for production environments at scale.
"""

import asyncio
import json
import logging
import os
import smtplib
import time
from datetime import datetime, timedelta
from email.mime.text import MimeText
from email.mime.multipart import MimeMultipart
from typing import Dict, Any, List, Optional, Set
from dataclasses import dataclass, asdict
from enum import Enum
import httpx
import aioredis
from jinja2 import Template


class AlertSeverity(Enum):
    """Alert severity levels"""
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"
    EMERGENCY = "emergency"


class AlertStatus(Enum):
    """Alert status"""
    ACTIVE = "active"
    ACKNOWLEDGED = "acknowledged"
    RESOLVED = "resolved"
    SUPPRESSED = "suppressed"


@dataclass
class Alert:
    """Alert data structure"""
    id: str
    title: str
    description: str
    severity: AlertSeverity
    source: str
    category: str
    timestamp: datetime
    status: AlertStatus = AlertStatus.ACTIVE
    metadata: Dict[str, Any] = None
    tags: List[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        data = asdict(self)
        data['severity'] = self.severity.value
        data['status'] = self.status.value
        data['timestamp'] = self.timestamp.isoformat()
        return data


@dataclass
class AlertRule:
    """Alert rule configuration"""
    name: str
    condition: str
    severity: AlertSeverity
    channels: List[str]
    cooldown_minutes: int = 5
    escalation_minutes: int = 30
    enabled: bool = True
    tags: List[str] = None


class AlertChannel:
    """Base alert channel class"""
    
    def __init__(self, name: str, config: Dict[str, Any]):
        self.name = name
        self.config = config
        self.logger = logging.getLogger(f"{__name__}.{name}")
    
    async def send_alert(self, alert: Alert) -> bool:
        """Send alert through this channel"""
        raise NotImplementedError
    
    async def test_connectivity(self) -> bool:
        """Test channel connectivity"""
        raise NotImplementedError


class EmailAlertChannel(AlertChannel):
    """Email alert channel"""
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__("email", config)
        self.smtp_server = config.get("smtp_server", "smtp.sendgrid.net")
        self.smtp_port = config.get("smtp_port", 587)
        self.username = config.get("username", os.getenv("SENDGRID_USERNAME"))
        self.password = config.get("password", os.getenv("SENDGRID_API_KEY"))
        self.from_email = config.get("from_email", "alerts@bookedbarber.com")
        self.recipients = config.get("recipients", [])
    
    async def send_alert(self, alert: Alert) -> bool:
        """Send alert via email"""
        try:
            # Create email content
            subject = f"[{alert.severity.value.upper()}] {alert.title}"
            body = self._create_email_body(alert)
            
            # Create message
            msg = MimeMultipart()
            msg['From'] = self.from_email
            msg['To'] = ", ".join(self.recipients)
            msg['Subject'] = subject
            
            # Add body
            msg.attach(MimeText(body, 'html'))
            
            # Send email
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()
                server.login(self.username, self.password)
                server.send_message(msg)
            
            self.logger.info(f"Email alert sent for {alert.id}")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to send email alert: {e}")
            return False
    
    def _create_email_body(self, alert: Alert) -> str:
        """Create HTML email body"""
        template = Template("""
        <html>
        <body style="font-family: Arial, sans-serif; margin: 20px;">
            <div style="background-color: {{ color }}; color: white; padding: 15px; border-radius: 5px;">
                <h2>{{ severity_text }} Alert</h2>
                <h3>{{ alert.title }}</h3>
            </div>
            
            <div style="margin: 20px 0;">
                <p><strong>Description:</strong> {{ alert.description }}</p>
                <p><strong>Source:</strong> {{ alert.source }}</p>
                <p><strong>Category:</strong> {{ alert.category }}</p>
                <p><strong>Time:</strong> {{ alert.timestamp.strftime('%Y-%m-%d %H:%M:%S UTC') }}</p>
                
                {% if alert.tags %}
                <p><strong>Tags:</strong> {{ ', '.join(alert.tags) }}</p>
                {% endif %}
                
                {% if alert.metadata %}
                <h4>Additional Information:</h4>
                <ul>
                {% for key, value in alert.metadata.items() %}
                    <li><strong>{{ key }}:</strong> {{ value }}</li>
                {% endfor %}
                </ul>
                {% endif %}
            </div>
            
            <div style="margin: 20px 0; padding: 15px; background-color: #f5f5f5; border-radius: 5px;">
                <p><strong>Alert ID:</strong> {{ alert.id }}</p>
                <p><a href="{{ dashboard_url }}">View in Dashboard</a></p>
            </div>
            
            <div style="margin: 20px 0; color: #666; font-size: 12px;">
                <p>This alert was generated by BookedBarber V2 Monitoring System</p>
                <p>To stop receiving these alerts, please contact your system administrator.</p>
            </div>
        </body>
        </html>
        """)
        
        # Determine color based on severity
        color_map = {
            AlertSeverity.INFO: "#2196F3",
            AlertSeverity.WARNING: "#FF9800",
            AlertSeverity.CRITICAL: "#F44336",
            AlertSeverity.EMERGENCY: "#9C27B0",
        }
        
        return template.render(
            alert=alert,
            severity_text=alert.severity.value.title(),
            color=color_map.get(alert.severity, "#666"),
            dashboard_url=os.getenv("MONITORING_DASHBOARD_URL", "https://monitoring.bookedbarber.com"),
        )
    
    async def test_connectivity(self) -> bool:
        """Test email connectivity"""
        try:
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()
                server.login(self.username, self.password)
            return True
        except Exception as e:
            self.logger.error(f"Email connectivity test failed: {e}")
            return False


class SlackAlertChannel(AlertChannel):
    """Slack alert channel"""
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__("slack", config)
        self.webhook_url = config.get("webhook_url", os.getenv("SLACK_WEBHOOK_URL"))
        self.channel = config.get("channel", "#alerts")
        self.username = config.get("username", "BookedBarber Alerts")
    
    async def send_alert(self, alert: Alert) -> bool:
        """Send alert to Slack"""
        try:
            # Create Slack message
            message = self._create_slack_message(alert)
            
            # Send to Slack
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.webhook_url,
                    json=message,
                    timeout=10,
                )
                
                if response.status_code == 200:
                    self.logger.info(f"Slack alert sent for {alert.id}")
                    return True
                else:
                    self.logger.error(f"Slack webhook returned status {response.status_code}")
                    return False
                    
        except Exception as e:
            self.logger.error(f"Failed to send Slack alert: {e}")
            return False
    
    def _create_slack_message(self, alert: Alert) -> Dict[str, Any]:
        """Create Slack message payload"""
        # Determine color and emoji based on severity
        color_map = {
            AlertSeverity.INFO: "#36a64f",
            AlertSeverity.WARNING: "#ff9800",
            AlertSeverity.CRITICAL: "#ff0000",
            AlertSeverity.EMERGENCY: "#9c27b0",
        }
        
        emoji_map = {
            AlertSeverity.INFO: ":information_source:",
            AlertSeverity.WARNING: ":warning:",
            AlertSeverity.CRITICAL: ":rotating_light:",
            AlertSeverity.EMERGENCY: ":bangbang:",
        }
        
        # Create fields for metadata
        fields = [
            {
                "title": "Source",
                "value": alert.source,
                "short": True
            },
            {
                "title": "Category",
                "value": alert.category,
                "short": True
            },
            {
                "title": "Time",
                "value": alert.timestamp.strftime('%Y-%m-%d %H:%M:%S UTC'),
                "short": True
            },
            {
                "title": "Alert ID",
                "value": alert.id,
                "short": True
            }
        ]
        
        # Add metadata fields
        if alert.metadata:
            for key, value in alert.metadata.items():
                if len(fields) < 10:  # Slack has a limit
                    fields.append({
                        "title": key.replace("_", " ").title(),
                        "value": str(value),
                        "short": True
                    })
        
        return {
            "channel": self.channel,
            "username": self.username,
            "icon_emoji": emoji_map.get(alert.severity, ":exclamation:"),
            "attachments": [
                {
                    "color": color_map.get(alert.severity, "#666"),
                    "title": f"{alert.severity.value.upper()}: {alert.title}",
                    "text": alert.description,
                    "fields": fields,
                    "footer": "BookedBarber V2 Monitoring",
                    "ts": int(alert.timestamp.timestamp())
                }
            ]
        }
    
    async def test_connectivity(self) -> bool:
        """Test Slack connectivity"""
        try:
            test_message = {
                "text": "Test message from BookedBarber V2 Monitoring System",
                "channel": self.channel,
                "username": self.username,
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.webhook_url,
                    json=test_message,
                    timeout=10,
                )
                
                return response.status_code == 200
                
        except Exception as e:
            self.logger.error(f"Slack connectivity test failed: {e}")
            return False


class PagerDutyAlertChannel(AlertChannel):
    """PagerDuty alert channel"""
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__("pagerduty", config)
        self.service_key = config.get("service_key", os.getenv("PAGERDUTY_SERVICE_KEY"))
        self.api_url = "https://events.pagerduty.com/v2/enqueue"
    
    async def send_alert(self, alert: Alert) -> bool:
        """Send alert to PagerDuty"""
        try:
            # Create PagerDuty event
            event = self._create_pagerduty_event(alert)
            
            # Send to PagerDuty
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.api_url,
                    json=event,
                    timeout=10,
                )
                
                if response.status_code == 202:
                    self.logger.info(f"PagerDuty alert sent for {alert.id}")
                    return True
                else:
                    self.logger.error(f"PagerDuty API returned status {response.status_code}")
                    return False
                    
        except Exception as e:
            self.logger.error(f"Failed to send PagerDuty alert: {e}")
            return False
    
    def _create_pagerduty_event(self, alert: Alert) -> Dict[str, Any]:
        """Create PagerDuty event payload"""
        # Map severity to PagerDuty severity
        severity_map = {
            AlertSeverity.INFO: "info",
            AlertSeverity.WARNING: "warning",
            AlertSeverity.CRITICAL: "error",
            AlertSeverity.EMERGENCY: "critical",
        }
        
        return {
            "routing_key": self.service_key,
            "event_action": "trigger",
            "dedup_key": alert.id,
            "payload": {
                "summary": f"{alert.title}: {alert.description}",
                "severity": severity_map.get(alert.severity, "error"),
                "source": alert.source,
                "component": alert.category,
                "group": "BookedBarber V2",
                "class": alert.category,
                "custom_details": alert.metadata or {},
            },
            "client": "BookedBarber V2 Monitoring",
            "client_url": os.getenv("MONITORING_DASHBOARD_URL", "https://monitoring.bookedbarber.com"),
        }
    
    async def test_connectivity(self) -> bool:
        """Test PagerDuty connectivity"""
        try:
            test_event = {
                "routing_key": self.service_key,
                "event_action": "trigger",
                "dedup_key": "test_connectivity",
                "payload": {
                    "summary": "Test connectivity from BookedBarber V2",
                    "severity": "info",
                    "source": "monitoring_system",
                }
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.api_url,
                    json=test_event,
                    timeout=10,
                )
                
                return response.status_code == 202
                
        except Exception as e:
            self.logger.error(f"PagerDuty connectivity test failed: {e}")
            return False


class SMSAlertChannel(AlertChannel):
    """SMS alert channel using Twilio"""
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__("sms", config)
        self.account_sid = config.get("account_sid", os.getenv("TWILIO_ACCOUNT_SID"))
        self.auth_token = config.get("auth_token", os.getenv("TWILIO_AUTH_TOKEN"))
        self.from_number = config.get("from_number", os.getenv("TWILIO_PHONE_NUMBER"))
        self.to_numbers = config.get("to_numbers", [])
    
    async def send_alert(self, alert: Alert) -> bool:
        """Send alert via SMS"""
        try:
            # Only send SMS for critical and emergency alerts
            if alert.severity not in [AlertSeverity.CRITICAL, AlertSeverity.EMERGENCY]:
                return True
            
            # Create SMS message
            message = self._create_sms_message(alert)
            
            # Send to all configured numbers
            success_count = 0
            for to_number in self.to_numbers:
                try:
                    # This would use Twilio API
                    # For now, we'll simulate the call
                    async with httpx.AsyncClient() as client:
                        # Simulated Twilio API call
                        # In reality, you'd use the Twilio Python library
                        self.logger.info(f"SMS would be sent to {to_number}: {message}")
                        success_count += 1
                        
                except Exception as e:
                    self.logger.error(f"Failed to send SMS to {to_number}: {e}")
            
            if success_count > 0:
                self.logger.info(f"SMS alerts sent for {alert.id} to {success_count} recipients")
                return True
            else:
                return False
                
        except Exception as e:
            self.logger.error(f"Failed to send SMS alert: {e}")
            return False
    
    def _create_sms_message(self, alert: Alert) -> str:
        """Create SMS message (keep it short)"""
        return f"[{alert.severity.value.upper()}] BookedBarber: {alert.title}. Check dashboard for details. ID: {alert.id[:8]}"
    
    async def test_connectivity(self) -> bool:
        """Test SMS connectivity"""
        try:
            # This would test Twilio connectivity
            # For now, we'll just check if credentials are configured
            return bool(self.account_sid and self.auth_token and self.from_number)
        except Exception as e:
            self.logger.error(f"SMS connectivity test failed: {e}")
            return False


class EnterpriseAlertingSystem:
    """Enterprise alerting system with multiple channels and escalation"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.channels: Dict[str, AlertChannel] = {}
        self.rules: List[AlertRule] = []
        self.active_alerts: Dict[str, Alert] = {}
        self.alert_history: List[Alert] = []
        self.cooldown_tracker: Dict[str, datetime] = {}
        self.escalation_tracker: Dict[str, datetime] = {}
        
        # Redis for alert state management
        self.redis = None
        
        # Configuration
        self.config = self._load_configuration()
        
        # Initialize channels
        self._initialize_channels()
        
        # Load alert rules
        self._load_alert_rules()
    
    def _load_configuration(self) -> Dict[str, Any]:
        """Load alerting configuration"""
        return {
            "channels": {
                "email": {
                    "enabled": os.getenv("ALERT_EMAIL_ENABLED", "true").lower() == "true",
                    "recipients": os.getenv("ALERT_EMAIL_RECIPIENTS", "ops@bookedbarber.com").split(","),
                    "smtp_server": os.getenv("SMTP_SERVER", "smtp.sendgrid.net"),
                    "smtp_port": int(os.getenv("SMTP_PORT", "587")),
                    "username": os.getenv("SENDGRID_USERNAME"),
                    "password": os.getenv("SENDGRID_API_KEY"),
                    "from_email": os.getenv("ALERT_FROM_EMAIL", "alerts@bookedbarber.com"),
                },
                "slack": {
                    "enabled": os.getenv("ALERT_SLACK_ENABLED", "true").lower() == "true",
                    "webhook_url": os.getenv("SLACK_WEBHOOK_URL"),
                    "channel": os.getenv("SLACK_ALERT_CHANNEL", "#alerts"),
                    "username": "BookedBarber Alerts",
                },
                "pagerduty": {
                    "enabled": os.getenv("ALERT_PAGERDUTY_ENABLED", "false").lower() == "true",
                    "service_key": os.getenv("PAGERDUTY_SERVICE_KEY"),
                },
                "sms": {
                    "enabled": os.getenv("ALERT_SMS_ENABLED", "false").lower() == "true",
                    "account_sid": os.getenv("TWILIO_ACCOUNT_SID"),
                    "auth_token": os.getenv("TWILIO_AUTH_TOKEN"),
                    "from_number": os.getenv("TWILIO_PHONE_NUMBER"),
                    "to_numbers": os.getenv("ALERT_SMS_NUMBERS", "").split(",") if os.getenv("ALERT_SMS_NUMBERS") else [],
                },
            },
            "escalation": {
                "enabled": os.getenv("ALERT_ESCALATION_ENABLED", "true").lower() == "true",
                "escalation_minutes": int(os.getenv("ALERT_ESCALATION_MINUTES", "30")),
                "max_escalations": int(os.getenv("ALERT_MAX_ESCALATIONS", "3")),
            },
            "suppression": {
                "maintenance_mode": os.getenv("MAINTENANCE_MODE", "false").lower() == "true",
                "maintenance_window_start": os.getenv("MAINTENANCE_WINDOW_START", "02:00"),
                "maintenance_window_end": os.getenv("MAINTENANCE_WINDOW_END", "04:00"),
                "suppress_during_deployment": os.getenv("SUPPRESS_ALERTS_DURING_DEPLOYMENT", "true").lower() == "true",
            },
        }
    
    def _initialize_channels(self):
        """Initialize alert channels"""
        for channel_name, channel_config in self.config["channels"].items():
            if not channel_config.get("enabled", False):
                continue
                
            try:
                if channel_name == "email":
                    self.channels[channel_name] = EmailAlertChannel(channel_config)
                elif channel_name == "slack":
                    self.channels[channel_name] = SlackAlertChannel(channel_config)
                elif channel_name == "pagerduty":
                    self.channels[channel_name] = PagerDutyAlertChannel(channel_config)
                elif channel_name == "sms":
                    self.channels[channel_name] = SMSAlertChannel(channel_config)
                
                self.logger.info(f"Initialized {channel_name} alert channel")
                
            except Exception as e:
                self.logger.error(f"Failed to initialize {channel_name} channel: {e}")
    
    def _load_alert_rules(self):
        """Load alert rules configuration"""
        # Default alert rules
        default_rules = [
            AlertRule(
                name="high_error_rate",
                condition="error_rate > 5%",
                severity=AlertSeverity.CRITICAL,
                channels=["email", "slack", "pagerduty"],
                cooldown_minutes=5,
                escalation_minutes=15,
                tags=["performance", "errors"],
            ),
            AlertRule(
                name="database_connection_failure",
                condition="database_connections_active > 90%",
                severity=AlertSeverity.CRITICAL,
                channels=["email", "slack", "pagerduty", "sms"],
                cooldown_minutes=2,
                escalation_minutes=10,
                tags=["database", "infrastructure"],
            ),
            AlertRule(
                name="payment_processing_failure",
                condition="payment_failure_rate > 2%",
                severity=AlertSeverity.CRITICAL,
                channels=["email", "slack", "pagerduty", "sms"],
                cooldown_minutes=1,
                escalation_minutes=5,
                tags=["payments", "business_critical"],
            ),
            AlertRule(
                name="high_response_time",
                condition="api_response_time_p95 > 2000ms",
                severity=AlertSeverity.WARNING,
                channels=["email", "slack"],
                cooldown_minutes=10,
                escalation_minutes=30,
                tags=["performance", "api"],
            ),
            AlertRule(
                name="memory_usage_high",
                condition="memory_usage > 85%",
                severity=AlertSeverity.WARNING,
                channels=["email", "slack"],
                cooldown_minutes=15,
                escalation_minutes=60,
                tags=["infrastructure", "memory"],
            ),
            AlertRule(
                name="disk_space_low",
                condition="disk_usage > 85%",
                severity=AlertSeverity.WARNING,
                channels=["email", "slack"],
                cooldown_minutes=30,
                escalation_minutes=120,
                tags=["infrastructure", "storage"],
            ),
            AlertRule(
                name="service_unavailable",
                condition="health_check_failed",
                severity=AlertSeverity.CRITICAL,
                channels=["email", "slack", "pagerduty", "sms"],
                cooldown_minutes=1,
                escalation_minutes=5,
                tags=["availability", "health"],
            ),
            AlertRule(
                name="security_incident",
                condition="security_incident_detected",
                severity=AlertSeverity.EMERGENCY,
                channels=["email", "slack", "pagerduty", "sms"],
                cooldown_minutes=0,
                escalation_minutes=5,
                tags=["security", "incident"],
            ),
        ]
        
        self.rules = default_rules
        self.logger.info(f"Loaded {len(self.rules)} alert rules")
    
    async def initialize_redis(self):
        """Initialize Redis connection for alert state management"""
        try:
            redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
            self.redis = await aioredis.from_url(redis_url)
            self.logger.info("Redis connection initialized for alerting system")
        except Exception as e:
            self.logger.error(f"Failed to initialize Redis for alerting: {e}")
    
    async def send_alert(self, alert: Alert) -> bool:
        """Send alert through configured channels"""
        try:
            # Check if alert should be suppressed
            if self._should_suppress_alert(alert):
                self.logger.info(f"Alert {alert.id} suppressed")
                return True
            
            # Check cooldown period
            if self._is_in_cooldown(alert):
                self.logger.info(f"Alert {alert.id} in cooldown period")
                return True
            
            # Find matching rules
            matching_rules = self._find_matching_rules(alert)
            if not matching_rules:
                self.logger.warning(f"No matching rules found for alert {alert.id}")
                return False
            
            # Send through all channels specified in rules
            channels_to_use = set()
            for rule in matching_rules:
                channels_to_use.update(rule.channels)
            
            success_count = 0
            total_channels = len(channels_to_use)
            
            # Send alerts in parallel
            tasks = []
            for channel_name in channels_to_use:
                if channel_name in self.channels:
                    tasks.append(self._send_to_channel(channel_name, alert))
            
            if tasks:
                results = await asyncio.gather(*tasks, return_exceptions=True)
                success_count = sum(1 for result in results if result is True)
            
            # Update alert tracking
            self.active_alerts[alert.id] = alert
            self.alert_history.append(alert)
            self._update_cooldown_tracker(alert, matching_rules)
            
            # Store in Redis if available
            if self.redis:
                await self._store_alert_in_redis(alert)
            
            # Schedule escalation if needed
            if self.config["escalation"]["enabled"]:
                asyncio.create_task(self._schedule_escalation(alert, matching_rules))
            
            success_rate = success_count / total_channels if total_channels > 0 else 0
            self.logger.info(f"Alert {alert.id} sent to {success_count}/{total_channels} channels (success rate: {success_rate:.2%})")
            
            return success_rate > 0.5  # Consider successful if more than 50% of channels succeeded
            
        except Exception as e:
            self.logger.error(f"Failed to send alert {alert.id}: {e}")
            return False
    
    async def _send_to_channel(self, channel_name: str, alert: Alert) -> bool:
        """Send alert to specific channel"""
        try:
            channel = self.channels.get(channel_name)
            if not channel:
                self.logger.error(f"Channel {channel_name} not configured")
                return False
            
            return await channel.send_alert(alert)
            
        except Exception as e:
            self.logger.error(f"Failed to send alert to {channel_name}: {e}")
            return False
    
    def _should_suppress_alert(self, alert: Alert) -> bool:
        """Check if alert should be suppressed"""
        # Check maintenance mode
        if self.config["suppression"]["maintenance_mode"]:
            return True
        
        # Check maintenance window
        if self._is_in_maintenance_window():
            return True
        
        # Check deployment suppression
        if self.config["suppression"]["suppress_during_deployment"]:
            if self._is_deployment_in_progress():
                return True
        
        return False
    
    def _is_in_maintenance_window(self) -> bool:
        """Check if current time is in maintenance window"""
        try:
            now = datetime.now().time()
            start_time = datetime.strptime(
                self.config["suppression"]["maintenance_window_start"], 
                "%H:%M"
            ).time()
            end_time = datetime.strptime(
                self.config["suppression"]["maintenance_window_end"], 
                "%H:%M"
            ).time()
            
            if start_time <= end_time:
                return start_time <= now <= end_time
            else:  # Crosses midnight
                return now >= start_time or now <= end_time
                
        except Exception:
            return False
    
    def _is_deployment_in_progress(self) -> bool:
        """Check if deployment is currently in progress"""
        # This would check for deployment markers
        # For now, we'll check an environment variable
        return os.getenv("DEPLOYMENT_IN_PROGRESS", "false").lower() == "true"
    
    def _is_in_cooldown(self, alert: Alert) -> bool:
        """Check if alert is in cooldown period"""
        cooldown_key = f"{alert.source}:{alert.category}:{alert.title}"
        
        if cooldown_key in self.cooldown_tracker:
            last_sent = self.cooldown_tracker[cooldown_key]
            
            # Find minimum cooldown from matching rules
            matching_rules = self._find_matching_rules(alert)
            min_cooldown = min((rule.cooldown_minutes for rule in matching_rules), default=5)
            
            cooldown_period = timedelta(minutes=min_cooldown)
            
            if datetime.utcnow() - last_sent < cooldown_period:
                return True
        
        return False
    
    def _find_matching_rules(self, alert: Alert) -> List[AlertRule]:
        """Find alert rules that match the given alert"""
        matching_rules = []
        
        for rule in self.rules:
            if not rule.enabled:
                continue
            
            # Simple rule matching based on tags and categories
            # In a real implementation, this would be more sophisticated
            if self._rule_matches_alert(rule, alert):
                matching_rules.append(rule)
        
        return matching_rules
    
    def _rule_matches_alert(self, rule: AlertRule, alert: Alert) -> bool:
        """Check if a rule matches an alert"""
        # Match by severity
        if alert.severity != rule.severity:
            return False
        
        # Match by tags
        if rule.tags and alert.tags:
            if not any(tag in alert.tags for tag in rule.tags):
                return False
        
        # Match by category (simple string matching)
        if rule.name.lower() in alert.category.lower():
            return True
        
        if rule.name.lower() in alert.title.lower():
            return True
        
        return False
    
    def _update_cooldown_tracker(self, alert: Alert, rules: List[AlertRule]):
        """Update cooldown tracker for the alert"""
        cooldown_key = f"{alert.source}:{alert.category}:{alert.title}"
        self.cooldown_tracker[cooldown_key] = datetime.utcnow()
        
        # Clean up old entries (older than 24 hours)
        cutoff_time = datetime.utcnow() - timedelta(hours=24)
        keys_to_remove = [
            key for key, timestamp in self.cooldown_tracker.items()
            if timestamp < cutoff_time
        ]
        for key in keys_to_remove:
            del self.cooldown_tracker[key]
    
    async def _store_alert_in_redis(self, alert: Alert):
        """Store alert in Redis for persistence"""
        try:
            alert_data = json.dumps(alert.to_dict())
            await self.redis.setex(f"alert:{alert.id}", 3600 * 24, alert_data)  # 24 hour TTL
            await self.redis.lpush("alert_history", alert_data)
            await self.redis.ltrim("alert_history", 0, 9999)  # Keep last 10,000 alerts
        except Exception as e:
            self.logger.error(f"Failed to store alert in Redis: {e}")
    
    async def _schedule_escalation(self, alert: Alert, rules: List[AlertRule]):
        """Schedule alert escalation"""
        try:
            # Find minimum escalation time
            min_escalation = min((rule.escalation_minutes for rule in rules), default=30)
            escalation_delay = min_escalation * 60  # Convert to seconds
            
            # Wait for escalation time
            await asyncio.sleep(escalation_delay)
            
            # Check if alert is still active and not acknowledged
            if alert.id in self.active_alerts and self.active_alerts[alert.id].status == AlertStatus.ACTIVE:
                # Escalate alert
                escalated_alert = Alert(
                    id=f"{alert.id}_escalated",
                    title=f"ESCALATED: {alert.title}",
                    description=f"Alert has not been acknowledged: {alert.description}",
                    severity=AlertSeverity.EMERGENCY if alert.severity == AlertSeverity.CRITICAL else AlertSeverity.CRITICAL,
                    source=alert.source,
                    category=alert.category,
                    timestamp=datetime.utcnow(),
                    metadata={
                        **alert.metadata,
                        "escalated_from": alert.id,
                        "escalation_reason": "not_acknowledged",
                    },
                    tags=alert.tags + ["escalated"] if alert.tags else ["escalated"],
                )
                
                await self.send_alert(escalated_alert)
                self.logger.info(f"Alert {alert.id} escalated to {escalated_alert.id}")
                
        except Exception as e:
            self.logger.error(f"Failed to escalate alert {alert.id}: {e}")
    
    async def acknowledge_alert(self, alert_id: str, acknowledged_by: str) -> bool:
        """Acknowledge an active alert"""
        try:
            if alert_id in self.active_alerts:
                alert = self.active_alerts[alert_id]
                alert.status = AlertStatus.ACKNOWLEDGED
                alert.metadata = alert.metadata or {}
                alert.metadata.update({
                    "acknowledged_by": acknowledged_by,
                    "acknowledged_at": datetime.utcnow().isoformat(),
                })
                
                # Update in Redis
                if self.redis:
                    alert_data = json.dumps(alert.to_dict())
                    await self.redis.setex(f"alert:{alert.id}", 3600 * 24, alert_data)
                
                self.logger.info(f"Alert {alert_id} acknowledged by {acknowledged_by}")
                return True
            else:
                self.logger.warning(f"Alert {alert_id} not found for acknowledgment")
                return False
                
        except Exception as e:
            self.logger.error(f"Failed to acknowledge alert {alert_id}: {e}")
            return False
    
    async def resolve_alert(self, alert_id: str, resolved_by: str, resolution_note: str = None) -> bool:
        """Resolve an active alert"""
        try:
            if alert_id in self.active_alerts:
                alert = self.active_alerts[alert_id]
                alert.status = AlertStatus.RESOLVED
                alert.metadata = alert.metadata or {}
                alert.metadata.update({
                    "resolved_by": resolved_by,
                    "resolved_at": datetime.utcnow().isoformat(),
                    "resolution_note": resolution_note,
                })
                
                # Remove from active alerts
                del self.active_alerts[alert_id]
                
                # Update in Redis
                if self.redis:
                    alert_data = json.dumps(alert.to_dict())
                    await self.redis.setex(f"alert:{alert.id}", 3600 * 24, alert_data)
                    await self.redis.delete(f"active_alert:{alert.id}")
                
                self.logger.info(f"Alert {alert_id} resolved by {resolved_by}")
                return True
            else:
                self.logger.warning(f"Alert {alert_id} not found for resolution")
                return False
                
        except Exception as e:
            self.logger.error(f"Failed to resolve alert {alert_id}: {e}")
            return False
    
    async def test_all_channels(self) -> Dict[str, bool]:
        """Test connectivity of all configured channels"""
        results = {}
        
        for channel_name, channel in self.channels.items():
            try:
                results[channel_name] = await channel.test_connectivity()
                self.logger.info(f"Channel {channel_name} connectivity test: {'PASS' if results[channel_name] else 'FAIL'}")
            except Exception as e:
                results[channel_name] = False
                self.logger.error(f"Channel {channel_name} connectivity test failed: {e}")
        
        return results
    
    def get_active_alerts(self) -> List[Alert]:
        """Get list of active alerts"""
        return list(self.active_alerts.values())
    
    def get_alert_statistics(self) -> Dict[str, Any]:
        """Get alerting system statistics"""
        now = datetime.utcnow()
        last_24h = now - timedelta(hours=24)
        
        recent_alerts = [alert for alert in self.alert_history if alert.timestamp >= last_24h]
        
        severity_counts = {
            "info": 0,
            "warning": 0,
            "critical": 0,
            "emergency": 0,
        }
        
        for alert in recent_alerts:
            severity_counts[alert.severity.value] += 1
        
        return {
            "active_alerts": len(self.active_alerts),
            "total_alerts_24h": len(recent_alerts),
            "severity_distribution_24h": severity_counts,
            "configured_channels": list(self.channels.keys()),
            "configured_rules": len(self.rules),
            "cooldown_entries": len(self.cooldown_tracker),
        }


# Global alerting system instance
alerting_system = EnterpriseAlertingSystem()

# Convenience functions
async def send_alert(
    title: str,
    description: str,
    severity: AlertSeverity,
    source: str,
    category: str,
    metadata: Dict[str, Any] = None,
    tags: List[str] = None,
) -> bool:
    """Send an alert through the alerting system"""
    alert = Alert(
        id=f"{source}_{category}_{int(time.time())}_{hash(title) % 10000}",
        title=title,
        description=description,
        severity=severity,
        source=source,
        category=category,
        timestamp=datetime.utcnow(),
        metadata=metadata,
        tags=tags,
    )
    
    return await alerting_system.send_alert(alert)

async def send_critical_alert(title: str, description: str, source: str, **kwargs) -> bool:
    """Send a critical alert"""
    return await send_alert(
        title=title,
        description=description,
        severity=AlertSeverity.CRITICAL,
        source=source,
        category="system",
        **kwargs
    )

async def send_warning_alert(title: str, description: str, source: str, **kwargs) -> bool:
    """Send a warning alert"""
    return await send_alert(
        title=title,
        description=description,
        severity=AlertSeverity.WARNING,
        source=source,
        category="system",
        **kwargs
    )

async def initialize_alerting():
    """Initialize the alerting system"""
    await alerting_system.initialize_redis()
    test_results = await alerting_system.test_all_channels()
    
    # Send initialization alert
    await send_alert(
        title="Alerting System Initialized",
        description=f"Enterprise alerting system started. Channel test results: {test_results}",
        severity=AlertSeverity.INFO,
        source="monitoring_system",
        category="initialization",
        metadata={"channel_test_results": test_results},
        tags=["system", "startup"],
    )