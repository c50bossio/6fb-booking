"""
Automation Engine for 6FB Platform
Handles automated workflows, triggers, and business logic
"""
import asyncio
import logging
from datetime import datetime, timedelta, time
from typing import Dict, List, Any, Optional, Callable
from enum import Enum
from dataclasses import dataclass
from sqlalchemy.orm import Session
import json

from models.appointment import Appointment
from models.client import Client
from models.barber import Barber
from config.database import get_db
from .sixfb_calculator import SixFBCalculator

logger = logging.getLogger(__name__)

class TriggerType(Enum):
    """Types of automation triggers"""
    APPOINTMENT_CREATED = "appointment_created"
    APPOINTMENT_COMPLETED = "appointment_completed"
    APPOINTMENT_CANCELLED = "appointment_cancelled"
    CLIENT_CREATED = "client_created"
    PERFORMANCE_THRESHOLD = "performance_threshold"
    TIME_BASED = "time_based"
    CLIENT_INACTIVE = "client_inactive"
    REVENUE_TARGET = "revenue_target"

class ActionType(Enum):
    """Types of automation actions"""
    SEND_EMAIL = "send_email"
    SEND_SMS = "send_sms"
    CREATE_TASK = "create_task"
    UPDATE_CLIENT = "update_client"
    SCHEDULE_FOLLOWUP = "schedule_followup"
    SEND_ALERT = "send_alert"
    GENERATE_REPORT = "generate_report"

@dataclass
class AutomationRule:
    """Automation rule definition"""
    id: str
    name: str
    description: str
    trigger_type: TriggerType
    trigger_conditions: Dict[str, Any]
    actions: List[Dict[str, Any]]
    is_active: bool = True
    barber_id: Optional[int] = None
    created_at: datetime = None
    last_triggered: Optional[datetime] = None

@dataclass
class AutomationContext:
    """Context data for automation execution"""
    trigger_data: Dict[str, Any]
    appointment: Optional[Appointment] = None
    client: Optional[Client] = None
    barber: Optional[Barber] = None
    sixfb_score: Optional[Dict[str, Any]] = None

class AutomationEngine:
    """Main automation engine for 6FB platform"""
    
    def __init__(self, db: Session):
        self.db = db
        self.calculator = SixFBCalculator(db)
        self.rules: Dict[str, AutomationRule] = {}
        self.action_handlers: Dict[ActionType, Callable] = {}
        self._register_default_handlers()
        self._load_default_rules()
    
    def _register_default_handlers(self):
        """Register default action handlers"""
        self.action_handlers = {
            ActionType.SEND_EMAIL: self._send_email,
            ActionType.SEND_SMS: self._send_sms,
            ActionType.CREATE_TASK: self._create_task,
            ActionType.UPDATE_CLIENT: self._update_client,
            ActionType.SCHEDULE_FOLLOWUP: self._schedule_followup,
            ActionType.SEND_ALERT: self._send_alert,
            ActionType.GENERATE_REPORT: self._generate_report
        }
    
    def _load_default_rules(self):
        """Load default automation rules"""
        self.rules = {
            # Client Follow-up Rules
            "new_client_welcome": AutomationRule(
                id="new_client_welcome",
                name="New Client Welcome",
                description="Send welcome message to new clients",
                trigger_type=TriggerType.CLIENT_CREATED,
                trigger_conditions={},
                actions=[
                    {
                        "type": ActionType.SEND_EMAIL.value,
                        "template": "new_client_welcome",
                        "delay_hours": 2
                    }
                ]
            ),
            
            "appointment_reminder": AutomationRule(
                id="appointment_reminder",
                name="Appointment Reminder",
                description="Send reminder 24 hours before appointment",
                trigger_type=TriggerType.TIME_BASED,
                trigger_conditions={
                    "schedule": "daily",
                    "time": "10:00"
                },
                actions=[
                    {
                        "type": ActionType.SEND_SMS.value,
                        "template": "appointment_reminder",
                        "filter": "appointments_tomorrow"
                    }
                ]
            ),
            
            "post_appointment_followup": AutomationRule(
                id="post_appointment_followup",
                name="Post-Appointment Follow-up",
                description="Follow up after completed appointment",
                trigger_type=TriggerType.APPOINTMENT_COMPLETED,
                trigger_conditions={},
                actions=[
                    {
                        "type": ActionType.SEND_EMAIL.value,
                        "template": "post_appointment_followup",
                        "delay_hours": 24
                    },
                    {
                        "type": ActionType.SCHEDULE_FOLLOWUP.value,
                        "days": 30,
                        "type": "booking_reminder"
                    }
                ]
            ),
            
            # Performance Alert Rules
            "low_6fb_score": AutomationRule(
                id="low_6fb_score",
                name="Low 6FB Score Alert",
                description="Alert when 6FB score drops below threshold",
                trigger_type=TriggerType.PERFORMANCE_THRESHOLD,
                trigger_conditions={
                    "metric": "sixfb_score",
                    "operator": "less_than",
                    "value": 70.0
                },
                actions=[
                    {
                        "type": ActionType.SEND_ALERT.value,
                        "severity": "warning",
                        "message": "6FB score has dropped below 70"
                    }
                ]
            ),
            
            "revenue_target_missed": AutomationRule(
                id="revenue_target_missed",
                name="Revenue Target Missed",
                description="Alert when weekly revenue target is missed",
                trigger_type=TriggerType.REVENUE_TARGET,
                trigger_conditions={
                    "period": "weekly",
                    "threshold_percentage": 80
                },
                actions=[
                    {
                        "type": ActionType.SEND_ALERT.value,
                        "severity": "high",
                        "message": "Weekly revenue target missed"
                    },
                    {
                        "type": ActionType.CREATE_TASK.value,
                        "title": "Review marketing strategy",
                        "priority": "high"
                    }
                ]
            ),
            
            # Client Retention Rules
            "inactive_client_reactivation": AutomationRule(
                id="inactive_client_reactivation",
                name="Inactive Client Reactivation",
                description="Re-engage clients who haven't booked in 60 days",
                trigger_type=TriggerType.CLIENT_INACTIVE,
                trigger_conditions={
                    "days_inactive": 60
                },
                actions=[
                    {
                        "type": ActionType.SEND_EMAIL.value,
                        "template": "client_reactivation",
                        "include_discount": True
                    }
                ]
            ),
            
            "vip_client_care": AutomationRule(
                id="vip_client_care",
                name="VIP Client Care",
                description="Special care for high-value clients",
                trigger_type=TriggerType.APPOINTMENT_COMPLETED,
                trigger_conditions={
                    "client_total_spent": {"operator": "greater_than", "value": 1000}
                },
                actions=[
                    {
                        "type": ActionType.SEND_EMAIL.value,
                        "template": "vip_client_thanks"
                    },
                    {
                        "type": ActionType.CREATE_TASK.value,
                        "title": "Personal follow-up call",
                        "priority": "medium"
                    }
                ]
            )
        }
    
    async def process_trigger(self, trigger_type: TriggerType, trigger_data: Dict[str, Any]):
        """Process automation trigger and execute matching rules"""
        logger.info(f"Processing automation trigger: {trigger_type.value}")
        
        try:
            # Build context
            context = await self._build_context(trigger_data)
            
            # Find matching rules
            matching_rules = self._find_matching_rules(trigger_type, context)
            
            # Execute rules
            for rule in matching_rules:
                await self._execute_rule(rule, context)
            
            logger.info(f"Processed {len(matching_rules)} automation rules")
            
        except Exception as e:
            logger.error(f"Error processing automation trigger: {e}")
    
    async def _build_context(self, trigger_data: Dict[str, Any]) -> AutomationContext:
        """Build automation context from trigger data"""
        context = AutomationContext(trigger_data=trigger_data)
        
        # Load related objects
        if 'appointment_id' in trigger_data:
            context.appointment = self.db.query(Appointment).get(trigger_data['appointment_id'])
            if context.appointment:
                context.client = self.db.query(Client).get(context.appointment.client_id)
                context.barber = self.db.query(Barber).get(context.appointment.barber_id)
        
        elif 'client_id' in trigger_data:
            context.client = self.db.query(Client).get(trigger_data['client_id'])
        
        elif 'barber_id' in trigger_data:
            context.barber = self.db.query(Barber).get(trigger_data['barber_id'])
        
        # Calculate 6FB score if needed
        if context.barber:
            context.sixfb_score = self.calculator.calculate_sixfb_score(context.barber.id)
        
        return context
    
    def _find_matching_rules(self, trigger_type: TriggerType, context: AutomationContext) -> List[AutomationRule]:
        """Find automation rules that match the trigger and conditions"""
        matching_rules = []
        
        for rule in self.rules.values():
            if not rule.is_active:
                continue
            
            if rule.trigger_type != trigger_type:
                continue
            
            # Check barber-specific rules
            if rule.barber_id and context.barber and rule.barber_id != context.barber.id:
                continue
            
            # Check trigger conditions
            if self._check_trigger_conditions(rule, context):
                matching_rules.append(rule)
        
        return matching_rules
    
    def _check_trigger_conditions(self, rule: AutomationRule, context: AutomationContext) -> bool:
        """Check if trigger conditions are met"""
        conditions = rule.trigger_conditions
        
        if not conditions:
            return True
        
        try:
            # Client total spent condition
            if 'client_total_spent' in conditions and context.client:
                condition = conditions['client_total_spent']
                operator = condition.get('operator', 'greater_than')
                value = condition.get('value', 0)
                
                if operator == 'greater_than' and context.client.total_spent <= value:
                    return False
                elif operator == 'less_than' and context.client.total_spent >= value:
                    return False
            
            # 6FB score condition
            if 'metric' in conditions and conditions['metric'] == 'sixfb_score' and context.sixfb_score:
                operator = conditions.get('operator', 'less_than')
                value = conditions.get('value', 70.0)
                score = context.sixfb_score.get('overall_score', 0)
                
                if operator == 'less_than' and score >= value:
                    return False
                elif operator == 'greater_than' and score <= value:
                    return False
            
            # Days inactive condition
            if 'days_inactive' in conditions and context.client:
                days_threshold = conditions['days_inactive']
                if context.client.last_visit_date:
                    days_since_visit = (datetime.now().date() - context.client.last_visit_date).days
                    if days_since_visit < days_threshold:
                        return False
            
            return True
            
        except Exception as e:
            logger.error(f"Error checking trigger conditions: {e}")
            return False
    
    async def _execute_rule(self, rule: AutomationRule, context: AutomationContext):
        """Execute automation rule actions"""
        logger.info(f"Executing automation rule: {rule.name}")
        
        try:
            for action_config in rule.actions:
                await self._execute_action(action_config, context)
            
            # Update last triggered time
            rule.last_triggered = datetime.utcnow()
            
        except Exception as e:
            logger.error(f"Error executing automation rule {rule.name}: {e}")
    
    async def _execute_action(self, action_config: Dict[str, Any], context: AutomationContext):
        """Execute individual automation action"""
        action_type = ActionType(action_config['type'])
        
        # Add delay if specified
        delay_hours = action_config.get('delay_hours', 0)
        if delay_hours > 0:
            logger.info(f"Scheduling action with {delay_hours} hour delay")
            # In production, this would be queued for later execution
            # For now, we'll simulate the delay
        
        # Execute action
        handler = self.action_handlers.get(action_type)
        if handler:
            await handler(action_config, context)
        else:
            logger.warning(f"No handler found for action type: {action_type}")
    
    # Action Handlers
    async def _send_email(self, action_config: Dict[str, Any], context: AutomationContext):
        """Send email action handler"""
        template = action_config.get('template', 'default')
        recipient = context.client.email if context.client else 'unknown@email.com'
        
        logger.info(f"Sending email (template: {template}) to {recipient}")
        
        # In production, integrate with email service (SendGrid, Mailgun, etc.)
        email_content = self._generate_email_content(template, context)
        
        # Simulate email sending
        logger.info(f"Email sent: {email_content['subject']}")
    
    async def _send_sms(self, action_config: Dict[str, Any], context: AutomationContext):
        """Send SMS action handler"""
        template = action_config.get('template', 'default')
        recipient = context.client.phone if context.client else 'unknown'
        
        logger.info(f"Sending SMS (template: {template}) to {recipient}")
        
        # In production, integrate with SMS service (Twilio, etc.)
        sms_content = self._generate_sms_content(template, context)
        
        # Simulate SMS sending
        logger.info(f"SMS sent: {sms_content}")
    
    async def _create_task(self, action_config: Dict[str, Any], context: AutomationContext):
        """Create task action handler"""
        title = action_config.get('title', 'Automated Task')
        priority = action_config.get('priority', 'medium')
        
        logger.info(f"Creating task: {title} (priority: {priority})")
        
        # In production, integrate with task management system
        task_data = {
            'title': title,
            'priority': priority,
            'client_id': context.client.id if context.client else None,
            'barber_id': context.barber.id if context.barber else None,
            'created_at': datetime.utcnow(),
            'status': 'pending'
        }
        
        logger.info(f"Task created: {task_data}")
    
    async def _update_client(self, action_config: Dict[str, Any], context: AutomationContext):
        """Update client action handler"""
        if not context.client:
            return
        
        updates = action_config.get('updates', {})
        
        for field, value in updates.items():
            if hasattr(context.client, field):
                setattr(context.client, field, value)
        
        context.client.updated_at = datetime.utcnow()
        self.db.commit()
        
        logger.info(f"Client updated: {context.client.id}")
    
    async def _schedule_followup(self, action_config: Dict[str, Any], context: AutomationContext):
        """Schedule follow-up action handler"""
        days = action_config.get('days', 30)
        followup_type = action_config.get('type', 'general')
        
        followup_date = datetime.now() + timedelta(days=days)
        
        logger.info(f"Scheduling {followup_type} follow-up for {followup_date.date()}")
        
        # In production, create scheduled task or calendar event
        followup_data = {
            'client_id': context.client.id if context.client else None,
            'type': followup_type,
            'scheduled_date': followup_date,
            'status': 'scheduled'
        }
        
        logger.info(f"Follow-up scheduled: {followup_data}")
    
    async def _send_alert(self, action_config: Dict[str, Any], context: AutomationContext):
        """Send alert action handler"""
        severity = action_config.get('severity', 'info')
        message = action_config.get('message', 'Automated alert')
        
        logger.info(f"Sending {severity} alert: {message}")
        
        # In production, integrate with alerting system (Slack, PagerDuty, etc.)
        alert_data = {
            'severity': severity,
            'message': message,
            'barber_id': context.barber.id if context.barber else None,
            'timestamp': datetime.utcnow(),
            'context': context.trigger_data
        }
        
        logger.info(f"Alert sent: {alert_data}")
    
    async def _generate_report(self, action_config: Dict[str, Any], context: AutomationContext):
        """Generate report action handler"""
        report_type = action_config.get('report_type', 'weekly_summary')
        
        logger.info(f"Generating {report_type} report")
        
        # In production, generate actual report
        report_data = await self._create_report(report_type, context)
        
        logger.info(f"Report generated: {report_data}")
    
    def _generate_email_content(self, template: str, context: AutomationContext) -> Dict[str, str]:
        """Generate email content from template"""
        templates = {
            'new_client_welcome': {
                'subject': f"Welcome to our barbershop, {context.client.first_name}!",
                'body': f"Hi {context.client.first_name}, welcome to our 6FB family! We're excited to help you look your best."
            },
            'post_appointment_followup': {
                'subject': "How was your visit?",
                'body': f"Hi {context.client.first_name}, thanks for visiting us! We'd love to hear about your experience."
            },
            'client_reactivation': {
                'subject': "We miss you!",
                'body': f"Hi {context.client.first_name}, it's been a while! Come back for a fresh cut - here's 20% off your next visit."
            },
            'vip_client_thanks': {
                'subject': "Thank you for being a valued client",
                'body': f"Hi {context.client.first_name}, thank you for your continued loyalty. You're truly valued!"
            }
        }
        
        return templates.get(template, {
            'subject': 'Automated Message',
            'body': 'This is an automated message from your barbershop.'
        })
    
    def _generate_sms_content(self, template: str, context: AutomationContext) -> str:
        """Generate SMS content from template"""
        templates = {
            'appointment_reminder': f"Hi {context.client.first_name if context.client else 'there'}! Don't forget your appointment tomorrow. Reply CONFIRM to confirm.",
        }
        
        return templates.get(template, "This is an automated message from your barbershop.")
    
    async def _create_report(self, report_type: str, context: AutomationContext) -> Dict[str, Any]:
        """Create report based on type"""
        if report_type == 'weekly_summary' and context.barber:
            return {
                'type': 'weekly_summary',
                'barber_id': context.barber.id,
                'period': 'current_week',
                'metrics': await self.calculator.get_weekly_metrics(context.barber.id),
                'generated_at': datetime.utcnow()
            }
        
        return {'type': report_type, 'generated_at': datetime.utcnow()}
    
    # Rule Management
    def add_rule(self, rule: AutomationRule):
        """Add new automation rule"""
        self.rules[rule.id] = rule
        logger.info(f"Added automation rule: {rule.name}")
    
    def remove_rule(self, rule_id: str):
        """Remove automation rule"""
        if rule_id in self.rules:
            del self.rules[rule_id]
            logger.info(f"Removed automation rule: {rule_id}")
    
    def get_rules(self) -> List[AutomationRule]:
        """Get all automation rules"""
        return list(self.rules.values())
    
    def toggle_rule(self, rule_id: str, is_active: bool):
        """Toggle automation rule active state"""
        if rule_id in self.rules:
            self.rules[rule_id].is_active = is_active
            logger.info(f"Toggled rule {rule_id}: {'active' if is_active else 'inactive'}")

# Global automation engine instance
automation_engine = None

def get_automation_engine() -> AutomationEngine:
    """Get automation engine instance"""
    global automation_engine
    if not automation_engine:
        db = next(get_db())
        automation_engine = AutomationEngine(db)
    return automation_engine