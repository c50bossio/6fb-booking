"""
Client Follow-up Automation Service
Manages automated client communication and retention workflows
"""
import asyncio
import logging
from datetime import datetime, timedelta, date
from typing import Dict, List, Any, Optional
from enum import Enum
from dataclasses import dataclass
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_

from models.appointment import Appointment
from models.client import Client
from models.barber import Barber
from config.database import get_db
from .automation_engine import AutomationEngine, TriggerType

logger = logging.getLogger(__name__)

class FollowUpType(Enum):
    """Types of follow-up communications"""
    POST_APPOINTMENT = "post_appointment"
    BOOKING_REMINDER = "booking_reminder"
    REACTIVATION = "reactivation"
    BIRTHDAY = "birthday"
    SEASONAL_OFFER = "seasonal_offer"
    VIP_CARE = "vip_care"
    NO_SHOW_FOLLOWUP = "no_show_followup"

class ClientSegment(Enum):
    """Client segments for targeted follow-ups"""
    NEW_CLIENT = "new_client"
    REGULAR_CLIENT = "regular_client"
    VIP_CLIENT = "vip_client"
    INACTIVE_CLIENT = "inactive_client"
    AT_RISK_CLIENT = "at_risk_client"

@dataclass
class FollowUpCampaign:
    """Follow-up campaign definition"""
    id: str
    name: str
    followup_type: FollowUpType
    target_segment: ClientSegment
    trigger_conditions: Dict[str, Any]
    message_templates: Dict[str, str]  # email, sms templates
    schedule: Dict[str, Any]  # when to send
    is_active: bool = True
    success_metrics: Dict[str, Any] = None

class ClientFollowUpService:
    """Service for managing client follow-up automation"""
    
    def __init__(self, db: Session):
        self.db = db
        self.automation_engine = AutomationEngine(db)
        self.campaigns = self._load_default_campaigns()
    
    def _load_default_campaigns(self) -> Dict[str, FollowUpCampaign]:
        """Load default follow-up campaigns"""
        return {
            "new_client_series": FollowUpCampaign(
                id="new_client_series",
                name="New Client Welcome Series",
                followup_type=FollowUpType.POST_APPOINTMENT,
                target_segment=ClientSegment.NEW_CLIENT,
                trigger_conditions={
                    "visit_count": 1,
                    "days_since_appointment": [1, 7, 30]
                },
                message_templates={
                    "email_day1": "Thank you for choosing us! How was your first visit?",
                    "email_day7": "We hope you're loving your new look! Book your next appointment.",
                    "email_day30": "Time for a refresh? Book your next appointment with 10% off!"
                },
                schedule={
                    "day1": {"type": "email", "delay_hours": 24},
                    "day7": {"type": "email", "delay_hours": 168},
                    "day30": {"type": "email", "delay_hours": 720}
                }
            ),
            
            "regular_booking_reminder": FollowUpCampaign(
                id="regular_booking_reminder",
                name="Regular Client Booking Reminder",
                followup_type=FollowUpType.BOOKING_REMINDER,
                target_segment=ClientSegment.REGULAR_CLIENT,
                trigger_conditions={
                    "days_since_last_visit": 25,
                    "average_visit_frequency": 30
                },
                message_templates={
                    "email": "Hi {name}! It's been about a month since your last visit. Ready for a fresh cut?",
                    "sms": "Hi {name}! Time for your regular cut? Book online or reply with your preferred time."
                },
                schedule={
                    "initial": {"type": "email", "delay_hours": 0},
                    "followup": {"type": "sms", "delay_hours": 72}
                }
            ),
            
            "vip_client_care": FollowUpCampaign(
                id="vip_client_care",
                name="VIP Client Care Program",
                followup_type=FollowUpType.VIP_CARE,
                target_segment=ClientSegment.VIP_CLIENT,
                trigger_conditions={
                    "total_spent": 1000,
                    "visit_frequency": "high"
                },
                message_templates={
                    "email": "Hi {name}! As one of our valued VIP clients, you get priority booking and exclusive offers.",
                    "birthday": "Happy Birthday {name}! Enjoy a complimentary styling session on us this month."
                },
                schedule={
                    "monthly_check": {"type": "email", "frequency": "monthly"},
                    "birthday": {"type": "email", "trigger": "birthday"}
                }
            ),
            
            "reactivation_campaign": FollowUpCampaign(
                id="reactivation_campaign",
                name="Client Reactivation Campaign",
                followup_type=FollowUpType.REACTIVATION,
                target_segment=ClientSegment.INACTIVE_CLIENT,
                trigger_conditions={
                    "days_since_last_visit": 60,
                    "total_visits": 2  # Had at least 2 visits
                },
                message_templates={
                    "email_soft": "We miss you, {name}! Come back for a fresh new look.",
                    "email_offer": "Special offer just for you, {name}! 20% off your next visit.",
                    "sms_final": "Last chance, {name}! Your 20% discount expires soon. Book now!"
                },
                schedule={
                    "soft_reminder": {"type": "email", "delay_days": 0},
                    "offer": {"type": "email", "delay_days": 14},
                    "final_push": {"type": "sms", "delay_days": 21}
                }
            ),
            
            "no_show_recovery": FollowUpCampaign(
                id="no_show_recovery",
                name="No-Show Recovery",
                followup_type=FollowUpType.NO_SHOW_FOLLOWUP,
                target_segment=ClientSegment.AT_RISK_CLIENT,
                trigger_conditions={
                    "appointment_status": "no_show"
                },
                message_templates={
                    "email": "Hi {name}, we missed you at your appointment. Life happens! Let's reschedule.",
                    "sms": "Hi {name}, missed you today! Reply to reschedule your appointment."
                },
                schedule={
                    "immediate": {"type": "sms", "delay_hours": 2},
                    "followup": {"type": "email", "delay_hours": 24}
                }
            )
        }
    
    async def process_daily_followups(self):
        """Process daily follow-up tasks"""
        logger.info("Processing daily client follow-ups")
        
        try:
            # Process each campaign
            for campaign in self.campaigns.values():
                if campaign.is_active:
                    await self._process_campaign(campaign)
            
            # Check for birthday follow-ups
            await self._process_birthday_followups()
            
            # Process scheduled follow-ups
            await self._process_scheduled_followups()
            
            logger.info("Daily follow-up processing completed")
            
        except Exception as e:
            logger.error(f"Error processing daily follow-ups: {e}")
    
    async def _process_campaign(self, campaign: FollowUpCampaign):
        """Process individual follow-up campaign"""
        logger.info(f"Processing campaign: {campaign.name}")
        
        try:
            # Find eligible clients
            eligible_clients = await self._find_eligible_clients(campaign)
            
            for client in eligible_clients:
                await self._execute_campaign_for_client(campaign, client)
            
            logger.info(f"Processed {len(eligible_clients)} clients for campaign: {campaign.name}")
            
        except Exception as e:
            logger.error(f"Error processing campaign {campaign.name}: {e}")
    
    async def _find_eligible_clients(self, campaign: FollowUpCampaign) -> List[Client]:
        """Find clients eligible for specific campaign"""
        conditions = campaign.trigger_conditions
        query = self.db.query(Client)
        
        # Apply segment filters
        if campaign.target_segment == ClientSegment.NEW_CLIENT:
            query = query.filter(Client.total_visits <= 1)
        
        elif campaign.target_segment == ClientSegment.REGULAR_CLIENT:
            query = query.filter(and_(
                Client.total_visits >= 3,
                Client.total_visits <= 20
            ))
        
        elif campaign.target_segment == ClientSegment.VIP_CLIENT:
            query = query.filter(or_(
                Client.total_spent >= conditions.get('total_spent', 1000),
                Client.total_visits >= 20
            ))
        
        elif campaign.target_segment == ClientSegment.INACTIVE_CLIENT:
            cutoff_date = date.today() - timedelta(days=conditions.get('days_since_last_visit', 60))
            query = query.filter(and_(
                Client.last_visit_date < cutoff_date,
                Client.total_visits >= conditions.get('total_visits', 2)
            ))
        
        elif campaign.target_segment == ClientSegment.AT_RISK_CLIENT:
            # Clients who had appointments but showed concerning patterns
            pass
        
        # Apply additional conditions
        if 'days_since_last_visit' in conditions:
            cutoff_date = date.today() - timedelta(days=conditions['days_since_last_visit'])
            query = query.filter(Client.last_visit_date <= cutoff_date)
        
        return query.all()
    
    async def _execute_campaign_for_client(self, campaign: FollowUpCampaign, client: Client):
        """Execute campaign for specific client"""
        logger.info(f"Executing campaign {campaign.name} for client {client.id}")
        
        try:
            # Determine which step in the campaign to execute
            schedule_key = self._determine_campaign_step(campaign, client)
            
            if schedule_key:
                schedule_config = campaign.schedule[schedule_key]
                await self._send_followup_message(campaign, client, schedule_key, schedule_config)
        
        except Exception as e:
            logger.error(f"Error executing campaign for client {client.id}: {e}")
    
    def _determine_campaign_step(self, campaign: FollowUpCampaign, client: Client) -> Optional[str]:
        """Determine which step of the campaign to execute for client"""
        
        if campaign.followup_type == FollowUpType.POST_APPOINTMENT:
            # Check days since last appointment
            if client.last_visit_date:
                days_since = (date.today() - client.last_visit_date).days
                
                if days_since == 1:
                    return "day1"
                elif days_since == 7:
                    return "day7" 
                elif days_since == 30:
                    return "day30"
        
        elif campaign.followup_type == FollowUpType.BOOKING_REMINDER:
            # Check if client needs booking reminder
            if client.last_visit_date:
                days_since = (date.today() - client.last_visit_date).days
                avg_frequency = campaign.trigger_conditions.get('average_visit_frequency', 30)
                
                if days_since >= avg_frequency - 5:  # Remind 5 days before typical booking
                    return "initial"
        
        elif campaign.followup_type == FollowUpType.REACTIVATION:
            if client.last_visit_date:
                days_since = (date.today() - client.last_visit_date).days
                
                if days_since == 60:
                    return "soft_reminder"
                elif days_since == 74:
                    return "offer"
                elif days_since == 81:
                    return "final_push"
        
        return None
    
    async def _send_followup_message(self, campaign: FollowUpCampaign, client: Client, 
                                   step_key: str, schedule_config: Dict[str, Any]):
        """Send follow-up message to client"""
        message_type = schedule_config.get('type', 'email')
        template_key = f"{message_type}_{step_key}" if f"{message_type}_{step_key}" in campaign.message_templates else message_type
        
        if template_key not in campaign.message_templates:
            template_key = next(iter(campaign.message_templates.keys()))
        
        message_template = campaign.message_templates[template_key]
        
        # Personalize message
        personalized_message = self._personalize_message(message_template, client)
        
        # Send message via automation engine
        if message_type == 'email':
            await self._send_email_followup(client, personalized_message, campaign)
        elif message_type == 'sms':
            await self._send_sms_followup(client, personalized_message, campaign)
        
        # Log follow-up
        await self._log_followup_sent(client, campaign, step_key, message_type)
    
    def _personalize_message(self, template: str, client: Client) -> str:
        """Personalize message template with client data"""
        personalizations = {
            '{name}': client.first_name or client.name,
            '{full_name}': client.name,
            '{last_visit}': client.last_visit_date.strftime('%B %d') if client.last_visit_date else 'recently'
        }
        
        personalized = template
        for placeholder, value in personalizations.items():
            personalized = personalized.replace(placeholder, str(value))
        
        return personalized
    
    async def _send_email_followup(self, client: Client, message: str, campaign: FollowUpCampaign):
        """Send email follow-up"""
        logger.info(f"Sending email follow-up to {client.email} for campaign {campaign.name}")
        
        # In production, integrate with email service
        email_data = {
            'to': client.email,
            'subject': f"From your barbershop - {campaign.name}",
            'body': message,
            'campaign_id': campaign.id,
            'client_id': client.id
        }
        
        # Simulate email sending
        logger.info(f"Email follow-up sent: {email_data}")
    
    async def _send_sms_followup(self, client: Client, message: str, campaign: FollowUpCampaign):
        """Send SMS follow-up"""
        logger.info(f"Sending SMS follow-up to {client.phone} for campaign {campaign.name}")
        
        # In production, integrate with SMS service
        sms_data = {
            'to': client.phone,
            'message': message,
            'campaign_id': campaign.id,
            'client_id': client.id
        }
        
        # Simulate SMS sending
        logger.info(f"SMS follow-up sent: {sms_data}")
    
    async def _log_followup_sent(self, client: Client, campaign: FollowUpCampaign, 
                               step: str, message_type: str):
        """Log follow-up communication"""
        # In production, store in followup_log table
        log_data = {
            'client_id': client.id,
            'campaign_id': campaign.id,
            'step': step,
            'message_type': message_type,
            'sent_at': datetime.utcnow(),
            'status': 'sent'
        }
        
        logger.info(f"Follow-up logged: {log_data}")
    
    async def _process_birthday_followups(self):
        """Process birthday follow-ups"""
        today = date.today()
        
        # Find clients with birthdays today
        birthday_clients = self.db.query(Client).filter(
            and_(
                Client.date_of_birth.isnot(None),
                # Extract month and day from birthday
                # This is SQLite syntax, adjust for your database
            )
        ).all()
        
        # Filter manually for SQLite compatibility
        birthday_clients = [
            client for client in self.db.query(Client).filter(Client.date_of_birth.isnot(None)).all()
            if client.date_of_birth and 
               client.date_of_birth.month == today.month and 
               client.date_of_birth.day == today.day
        ]
        
        for client in birthday_clients:
            await self._send_birthday_message(client)
    
    async def _send_birthday_message(self, client: Client):
        """Send birthday message to client"""
        message = f"Happy Birthday, {client.first_name}! 🎉 Celebrate with a complimentary styling session this month!"
        
        await self._send_email_followup(client, message, FollowUpCampaign(
            id="birthday",
            name="Birthday Wishes",
            followup_type=FollowUpType.BIRTHDAY,
            target_segment=ClientSegment.REGULAR_CLIENT,
            trigger_conditions={},
            message_templates={}
        ))
    
    async def _process_scheduled_followups(self):
        """Process any manually scheduled follow-ups"""
        # In production, this would check a scheduled_followups table
        logger.info("Processing scheduled follow-ups")
    
    # Campaign Management
    def add_campaign(self, campaign: FollowUpCampaign):
        """Add new follow-up campaign"""
        self.campaigns[campaign.id] = campaign
        logger.info(f"Added follow-up campaign: {campaign.name}")
    
    def get_campaigns(self) -> List[FollowUpCampaign]:
        """Get all follow-up campaigns"""
        return list(self.campaigns.values())
    
    def toggle_campaign(self, campaign_id: str, is_active: bool):
        """Toggle campaign active state"""
        if campaign_id in self.campaigns:
            self.campaigns[campaign_id].is_active = is_active
            logger.info(f"Toggled campaign {campaign_id}: {'active' if is_active else 'inactive'}")
    
    async def get_campaign_metrics(self, campaign_id: str) -> Dict[str, Any]:
        """Get metrics for specific campaign"""
        # In production, query followup_log table for metrics
        return {
            'campaign_id': campaign_id,
            'total_sent': 0,
            'email_sent': 0,
            'sms_sent': 0,
            'response_rate': 0.0,
            'booking_conversion': 0.0,
            'period': 'last_30_days'
        }

# Convenience function for API endpoints
async def process_client_followups():
    """Process client follow-ups"""
    db = next(get_db())
    try:
        service = ClientFollowUpService(db)
        await service.process_daily_followups()
    finally:
        db.close()