"""
Real-Time Alerting Service for BookedBarber V2
Provides immediate notifications for critical business errors
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
import httpx

from services.error_monitoring_service import ErrorEvent, ErrorSeverity, BusinessImpact

logger = logging.getLogger(__name__)

@dataclass
class AlertRule:
    """Configuration for alert triggers"""
    name: str
    condition: str
    severity: str
    channels: List[str]
    cooldown_minutes: int = 15
    escalation_minutes: Optional[int] = None
    last_triggered: Optional[datetime] = None

class AlertService:
    """Enterprise alerting service with business-focused rules"""
    
    def __init__(self):
        self.alert_rules = self._load_alert_rules()
        self.alert_history = {}
        self.webhook_clients = self._setup_webhook_clients()
    
    def _load_alert_rules(self) -> List[AlertRule]:
        """Load Six Figure Barber business-aligned alert rules"""
        return [
            # Critical Revenue Impact
            AlertRule(
                name="Revenue Blocking Errors",
                condition="business_impact == 'revenue_blocking'",
                severity="critical",
                channels=["slack", "sms", "email"],
                cooldown_minutes=5,
                escalation_minutes=10
            ),
            
            # Payment Processing Issues
            AlertRule(
                name="Payment System Failure",
                condition="category == 'payment' AND severity in ['critical', 'high']",
                severity="critical", 
                channels=["slack", "sms", "email"],
                cooldown_minutes=5
            ),
            
            # Booking System Degradation
            AlertRule(
                name="Booking Funnel Errors",
                condition="category == 'booking' AND error_rate > 5% in 10m",
                severity="high",
                channels=["slack", "email"],
                cooldown_minutes=10
            ),
            
            # Authentication Issues Spike
            AlertRule(
                name="Authentication Failure Spike",
                condition="category == 'authentication' AND count > 10 in 5m",
                severity="high",
                channels=["slack", "email"],
                cooldown_minutes=15
            ),
            
            # Database Performance Degradation
            AlertRule(
                name="Database Performance Issues",
                condition="category == 'database' AND avg_response_time > 5s",
                severity="high",
                channels=["slack", "email"],
                cooldown_minutes=10
            ),
            
            # External Service Circuit Breaker
            AlertRule(
                name="External Service Circuit Breaker",
                condition="category == 'external_api' AND circuit_breaker_open == true",
                severity="medium",
                channels=["slack"],
                cooldown_minutes=20
            )
        ]
    
    def _setup_webhook_clients(self) -> Dict[str, Any]:
        """Setup notification channel clients"""
        return {
            "slack": self._setup_slack_client(),
            "email": self._setup_email_client(), 
            "sms": self._setup_sms_client()
        }
    
    async def process_error_event(self, error: ErrorEvent) -> None:
        """Process error event and trigger appropriate alerts"""
        
        # Check each alert rule
        for rule in self.alert_rules:
            if await self._should_trigger_alert(rule, error):
                await self._trigger_alert(rule, error)
    
    async def _should_trigger_alert(self, rule: AlertRule, error: ErrorEvent) -> bool:
        """Evaluate if alert rule should trigger"""
        
        # Check cooldown period
        if rule.last_triggered:
            cooldown_expired = (
                datetime.utcnow() - rule.last_triggered
            ).total_seconds() > (rule.cooldown_minutes * 60)
            if not cooldown_expired:
                return False
        
        # Evaluate rule condition
        return self._evaluate_condition(rule.condition, error)
    
    def _evaluate_condition(self, condition: str, error: ErrorEvent) -> bool:
        """Evaluate alert condition against error event"""
        
        # Simple condition evaluation (could be enhanced with proper parser)
        error_dict = {
            "business_impact": error.business_impact.value,
            "category": error.category.value,
            "severity": error.severity.value,
            "http_status": error.http_status,
            "endpoint": error.endpoint
        }
        
        try:
            # Replace condition variables with actual values
            eval_condition = condition
            for key, value in error_dict.items():
                eval_condition = eval_condition.replace(key, f"'{value}'")
            
            # Evaluate basic conditions
            if "business_impact == 'revenue_blocking'" in condition:
                return error.business_impact.value == "revenue_blocking"
            elif "category == 'payment'" in condition:
                return error.category.value == "payment"
            elif "category == 'booking'" in condition:
                return error.category.value == "booking"
            elif "category == 'authentication'" in condition:
                return error.category.value == "authentication"
            elif "category == 'database'" in condition:
                return error.category.value == "database"
            elif "category == 'external_api'" in condition:
                return error.category.value == "external_api"
                
        except Exception as e:
            logger.error(f"Error evaluating condition '{condition}': {e}")
            return False
        
        return False
    
    async def _trigger_alert(self, rule: AlertRule, error: ErrorEvent) -> None:
        """Trigger alert through configured channels"""
        
        rule.last_triggered = datetime.utcnow()
        
        # Create alert message
        alert_message = self._create_alert_message(rule, error)
        
        # Send through each configured channel
        for channel in rule.channels:
            try:
                await self._send_alert(channel, alert_message, rule.severity)
                logger.info(f"Alert sent via {channel}: {rule.name}")
            except Exception as e:
                logger.error(f"Failed to send alert via {channel}: {e}")
        
        # Schedule escalation if configured
        if rule.escalation_minutes:
            asyncio.create_task(
                self._schedule_escalation(rule, error, rule.escalation_minutes)
            )
    
    def _create_alert_message(self, rule: AlertRule, error: ErrorEvent) -> Dict[str, Any]:
        """Create structured alert message"""
        
        return {
            "rule_name": rule.name,
            "severity": rule.severity,
            "timestamp": datetime.utcnow().isoformat(),
            "error": {
                "id": error.id,
                "message": error.message,
                "category": error.category.value,
                "business_impact": error.business_impact.value,
                "endpoint": error.endpoint,
                "user_id": error.user_id,
                "request_id": error.request_id
            },
            "business_context": {
                "revenue_impact": error.business_impact == BusinessImpact.REVENUE_BLOCKING,
                "user_blocking": error.business_impact == BusinessImpact.USER_BLOCKING,
                "client_facing": error.category.value in ["booking", "payment", "authentication"]
            },
            "actions": {
                "dashboard_url": f"https://dashboard.bookedbarber.com/errors/{error.id}",
                "runbook_url": self._get_runbook_url(error.category.value),
                "escalation_contact": self._get_escalation_contact(rule.severity)
            }
        }
    
    async def _send_alert(self, channel: str, message: Dict[str, Any], severity: str) -> None:
        """Send alert through specific channel"""
        
        if channel == "slack":
            await self._send_slack_alert(message, severity)
        elif channel == "email":
            await self._send_email_alert(message, severity)
        elif channel == "sms":
            await self._send_sms_alert(message, severity)
    
    async def _send_slack_alert(self, message: Dict[str, Any], severity: str) -> None:
        """Send alert to Slack"""
        
        # Configure Slack webhook based on severity
        webhook_url = self._get_slack_webhook(severity)
        
        # Create Slack-formatted message
        slack_payload = {
            "username": "BookedBarber Alert Bot",
            "icon_emoji": self._get_severity_emoji(severity),
            "attachments": [{
                "color": self._get_severity_color(severity),
                "title": f"🚨 {message['rule_name']}",
                "text": message['error']['message'],
                "fields": [
                    {
                        "title": "Business Impact",
                        "value": message['error']['business_impact'].replace('_', ' ').title(),
                        "short": True
                    },
                    {
                        "title": "Category", 
                        "value": message['error']['category'].replace('_', ' ').title(),
                        "short": True
                    },
                    {
                        "title": "Endpoint",
                        "value": message['error']['endpoint'] or "N/A",
                        "short": True
                    },
                    {
                        "title": "Request ID",
                        "value": message['error']['request_id'] or "N/A", 
                        "short": True
                    }
                ],
                "actions": [
                    {
                        "type": "button",
                        "text": "View Dashboard",
                        "url": message['actions']['dashboard_url']
                    },
                    {
                        "type": "button", 
                        "text": "View Runbook",
                        "url": message['actions']['runbook_url']
                    }
                ],
                "footer": "BookedBarber V2 Monitoring",
                "ts": int(datetime.utcnow().timestamp())
            }]
        }
        
        # Send to Slack
        async with httpx.AsyncClient() as client:
            response = await client.post(webhook_url, json=slack_payload)
            response.raise_for_status()
    
    async def _send_email_alert(self, message: Dict[str, Any], severity: str) -> None:
        """Send email alert"""
        
        # Import email service
        from services.email_service import email_service
        
        recipients = self._get_email_recipients(severity)
        subject = f"🚨 BookedBarber Alert: {message['rule_name']}"
        
        html_content = f"""
        <h2>{message['rule_name']}</h2>
        <p><strong>Severity:</strong> {severity.upper()}</p>
        <p><strong>Business Impact:</strong> {message['error']['business_impact']}</p>
        <p><strong>Error:</strong> {message['error']['message']}</p>
        <p><strong>Category:</strong> {message['error']['category']}</p>
        <p><strong>Endpoint:</strong> {message['error']['endpoint']}</p>
        <p><strong>Request ID:</strong> {message['error']['request_id']}</p>
        <p><strong>Time:</strong> {message['timestamp']}</p>
        
        <h3>Actions</h3>
        <ul>
            <li><a href="{message['actions']['dashboard_url']}">View Error Dashboard</a></li>
            <li><a href="{message['actions']['runbook_url']}">View Runbook</a></li>
        </ul>
        
        <p>Contact: {message['actions']['escalation_contact']}</p>
        """
        
        await email_service.send_email(
            to=recipients,
            subject=subject,
            html_content=html_content
        )
    
    async def _send_sms_alert(self, message: Dict[str, Any], severity: str) -> None:
        """Send SMS alert for critical issues"""
        
        if severity != "critical":
            return  # Only send SMS for critical issues
        
        # Import SMS service
        from services.sms_service import sms_service
        
        phone_numbers = self._get_sms_recipients()
        sms_text = (
            f"🚨 CRITICAL BookedBarber Alert: {message['rule_name']}\n"
            f"Impact: {message['error']['business_impact']}\n"
            f"Error: {message['error']['message'][:100]}...\n"
            f"Dashboard: {message['actions']['dashboard_url']}"
        )
        
        for phone in phone_numbers:
            await sms_service.send_sms(phone, sms_text)
    
    async def _schedule_escalation(self, rule: AlertRule, error: ErrorEvent, delay_minutes: int) -> None:
        """Schedule alert escalation"""
        
        await asyncio.sleep(delay_minutes * 60)
        
        # Check if error is still unresolved
        if not error.resolved:
            escalation_message = self._create_escalation_message(rule, error)
            await self._send_alert("email", escalation_message, "critical")
            await self._send_alert("sms", escalation_message, "critical")
    
    def _create_escalation_message(self, rule: AlertRule, error: ErrorEvent) -> Dict[str, Any]:
        """Create escalation alert message"""
        
        base_message = self._create_alert_message(rule, error)
        base_message["rule_name"] = f"ESCALATED: {rule.name}"
        base_message["error"]["message"] = f"UNRESOLVED: {error.message}"
        
        return base_message
    
    def _setup_slack_client(self) -> Optional[str]:
        """Setup Slack webhook"""
        import os
        return os.getenv("SLACK_WEBHOOK_URL")
    
    def _setup_email_client(self) -> Any:
        """Setup email client"""
        # Email service already configured in services/email_service.py
        return None
    
    def _setup_sms_client(self) -> Any:
        """Setup SMS client"""
        # SMS service already configured in services/sms_service.py
        return None
    
    def _get_slack_webhook(self, severity: str) -> str:
        """Get Slack webhook URL based on severity"""
        import os
        
        if severity == "critical":
            return os.getenv("SLACK_CRITICAL_WEBHOOK_URL", os.getenv("SLACK_WEBHOOK_URL"))
        else:
            return os.getenv("SLACK_WEBHOOK_URL")
    
    def _get_severity_emoji(self, severity: str) -> str:
        """Get emoji for severity level"""
        emoji_map = {
            "critical": "🔥",
            "high": "🚨", 
            "medium": "⚠️",
            "low": "ℹ️"
        }
        return emoji_map.get(severity, "📊")
    
    def _get_severity_color(self, severity: str) -> str:
        """Get color for severity level"""
        color_map = {
            "critical": "danger",
            "high": "warning",
            "medium": "good", 
            "low": "#439FE0"
        }
        return color_map.get(severity, "good")
    
    def _get_email_recipients(self, severity: str) -> List[str]:
        """Get email recipients based on severity"""
        import os
        
        if severity == "critical":
            return [
                os.getenv("CRITICAL_ALERT_EMAIL", "alerts@bookedbarber.com"),
                os.getenv("DEV_TEAM_EMAIL", "dev-team@bookedbarber.com")
            ]
        else:
            return [os.getenv("DEV_TEAM_EMAIL", "dev-team@bookedbarber.com")]
    
    def _get_sms_recipients(self) -> List[str]:
        """Get SMS recipients for critical alerts"""
        import os
        
        recipients = []
        if os.getenv("ONCALL_PHONE"):
            recipients.append(os.getenv("ONCALL_PHONE"))
        if os.getenv("LEAD_DEV_PHONE"):
            recipients.append(os.getenv("LEAD_DEV_PHONE"))
        
        return recipients
    
    def _get_runbook_url(self, category: str) -> str:
        """Get runbook URL for error category"""
        base_url = "https://docs.bookedbarber.com/runbooks"
        return f"{base_url}/{category}"
    
    def _get_escalation_contact(self, severity: str) -> str:
        """Get escalation contact for severity"""
        if severity == "critical":
            return "Oncall Engineer: +1-555-0199"
        else:
            return "Development Team: dev-team@bookedbarber.com"

# Global alert service instance
alert_service = AlertService()