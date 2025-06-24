"""
Email Campaign Automation Service for 6FB Platform
Handles email template management, campaign scheduling, personalization, and automation
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Union
from enum import Enum
from dataclasses import dataclass, asdict
from jinja2 import Environment, FileSystemLoader, select_autoescape
from sqlalchemy.orm import Session
from sqlalchemy import (
    create_engine,
    Column,
    Integer,
    String,
    Text,
    DateTime,
    Boolean,
    JSON,
    ForeignKey,
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
import json
import os
import sendgrid
from sendgrid.helpers.mail import Mail, Email, To, Content, Personalization
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from models.client import Client
from models.appointment import Appointment
from models.barber import Barber
from config.database import get_db
from .notification_service import NotificationService

logger = logging.getLogger(__name__)

# Email Campaign Models
Base = declarative_base()


class CampaignType(Enum):
    """Types of email campaigns"""

    WELCOME_SERIES = "welcome_series"
    RE_ENGAGEMENT = "re_engagement"
    BIRTHDAY = "birthday"
    ANNIVERSARY = "anniversary"
    PROMOTIONAL = "promotional"
    REVIEW_REQUEST = "review_request"
    APPOINTMENT_REMINDER = "appointment_reminder"
    POST_APPOINTMENT = "post_appointment"
    SEASONAL = "seasonal"
    VIP_EXCLUSIVE = "vip_exclusive"


class CampaignStatus(Enum):
    """Campaign status options"""

    DRAFT = "draft"
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"
    ARCHIVED = "archived"


class EmailStatus(Enum):
    """Email delivery status"""

    PENDING = "pending"
    SENT = "sent"
    DELIVERED = "delivered"
    OPENED = "opened"
    CLICKED = "clicked"
    BOUNCED = "bounced"
    FAILED = "failed"
    UNSUBSCRIBED = "unsubscribed"


@dataclass
class EmailTemplate:
    """Email template structure"""

    id: str
    name: str
    subject: str
    html_content: str
    text_content: str
    campaign_type: CampaignType
    personalization_fields: List[str]
    created_at: datetime
    updated_at: datetime
    is_active: bool = True


@dataclass
class EmailCampaign:
    """Email campaign structure"""

    id: str
    name: str
    description: str
    campaign_type: CampaignType
    template_id: str
    status: CampaignStatus
    target_audience: Dict[str, Any]
    scheduling: Dict[str, Any]
    automation_triggers: List[Dict[str, Any]]
    personalization_rules: Dict[str, Any]
    analytics_tracking: Dict[str, Any]
    created_at: datetime
    updated_at: datetime
    created_by: int
    send_count: int = 0
    open_rate: float = 0.0
    click_rate: float = 0.0


@dataclass
class EmailPreferences:
    """Customer email preferences"""

    client_id: int
    email_address: str
    is_subscribed: bool
    frequency_preference: str  # daily, weekly, monthly, special_only
    campaign_preferences: Dict[str, bool]
    unsubscribe_token: str
    last_updated: datetime
    timezone: str = "UTC"


@dataclass
class EmailDelivery:
    """Email delivery tracking"""

    id: str
    campaign_id: str
    client_id: int
    email_address: str
    template_id: str
    status: EmailStatus
    sent_at: Optional[datetime]
    opened_at: Optional[datetime]
    clicked_at: Optional[datetime]
    bounced_at: Optional[datetime]
    unsubscribed_at: Optional[datetime]
    error_message: Optional[str]
    tracking_data: Dict[str, Any]


class EmailCampaignService:
    """Main email campaign management service"""

    def __init__(self, db: Session):
        self.db = db
        self.notification_service = NotificationService()

        # SendGrid configuration
        self.sendgrid_api_key = os.getenv("SENDGRID_API_KEY")
        self.sendgrid_client = (
            sendgrid.SendGridAPIClient(api_key=self.sendgrid_api_key)
            if self.sendgrid_api_key
            else None
        )
        self.from_email = os.getenv("FROM_EMAIL", "noreply@6fb.com")
        self.reply_to_email = os.getenv("REPLY_TO_EMAIL", "support@6fb.com")

        # Template engine setup
        template_dir = os.path.join(
            os.path.dirname(os.path.dirname(__file__)), "templates", "emails"
        )
        self.jinja_env = Environment(
            loader=FileSystemLoader(template_dir),
            autoescape=select_autoescape(["html", "xml"]),
        )

        # In-memory storage (in production, use database)
        self.templates: Dict[str, EmailTemplate] = {}
        self.campaigns: Dict[str, EmailCampaign] = {}
        self.preferences: Dict[int, EmailPreferences] = {}
        self.deliveries: Dict[str, EmailDelivery] = {}

        self._load_default_templates()
        self._load_default_campaigns()

    def _load_default_templates(self):
        """Load default email templates"""
        default_templates = [
            # Welcome Series Templates
            EmailTemplate(
                id="welcome_01_greeting",
                name="Welcome Email 1 - Greeting",
                subject="Welcome to {{barbershop_name}}, {{client_first_name}}! 🎉",
                html_content="welcome_series/welcome_01_greeting.html",
                text_content="welcome_series/welcome_01_greeting.txt",
                campaign_type=CampaignType.WELCOME_SERIES,
                personalization_fields=[
                    "client_first_name",
                    "barbershop_name",
                    "barber_name",
                    "special_offer",
                ],
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            ),
            EmailTemplate(
                id="welcome_02_services",
                name="Welcome Email 2 - Our Services",
                subject="Discover our premium services, {{client_first_name}}",
                html_content="welcome_series/welcome_02_services.html",
                text_content="welcome_series/welcome_02_services.txt",
                campaign_type=CampaignType.WELCOME_SERIES,
                personalization_fields=[
                    "client_first_name",
                    "service_list",
                    "pricing_info",
                    "booking_link",
                ],
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            ),
            EmailTemplate(
                id="welcome_03_tips",
                name="Welcome Email 3 - Grooming Tips",
                subject="Pro grooming tips just for you, {{client_first_name}}",
                html_content="welcome_series/welcome_03_tips.html",
                text_content="welcome_series/welcome_03_tips.txt",
                campaign_type=CampaignType.WELCOME_SERIES,
                personalization_fields=[
                    "client_first_name",
                    "grooming_tips",
                    "product_recommendations",
                ],
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            ),
            # Re-engagement Templates
            EmailTemplate(
                id="reengagement_comeback",
                name="We Miss You - Come Back",
                subject="We miss you, {{client_first_name}}! Special offer inside 💈",
                html_content="re_engagement/comeback_offer.html",
                text_content="re_engagement/comeback_offer.txt",
                campaign_type=CampaignType.RE_ENGAGEMENT,
                personalization_fields=[
                    "client_first_name",
                    "last_visit_date",
                    "discount_offer",
                    "expiry_date",
                ],
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            ),
            EmailTemplate(
                id="reengagement_whats_new",
                name="What's New Since Your Last Visit",
                subject="New services and upgrades at {{barbershop_name}}",
                html_content="re_engagement/whats_new.html",
                text_content="re_engagement/whats_new.txt",
                campaign_type=CampaignType.RE_ENGAGEMENT,
                personalization_fields=[
                    "client_first_name",
                    "new_services",
                    "barbershop_name",
                    "updates",
                ],
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            ),
            # Birthday Templates
            EmailTemplate(
                id="birthday_celebration",
                name="Birthday Celebration",
                subject="Happy Birthday {{client_first_name}}! 🎂 Special gift inside",
                html_content="birthday/birthday_celebration.html",
                text_content="birthday/birthday_celebration.txt",
                campaign_type=CampaignType.BIRTHDAY,
                personalization_fields=[
                    "client_first_name",
                    "birthday_offer",
                    "valid_until",
                    "favorite_service",
                ],
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            ),
            # Promotional Templates
            EmailTemplate(
                id="seasonal_promotion",
                name="Seasonal Promotion",
                subject="{{season}} Special: {{promotion_title}}",
                html_content="promotional/seasonal_promotion.html",
                text_content="promotional/seasonal_promotion.txt",
                campaign_type=CampaignType.PROMOTIONAL,
                personalization_fields=[
                    "client_first_name",
                    "season",
                    "promotion_title",
                    "offer_details",
                    "promo_code",
                    "offer_expiry",
                ],
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            ),
            # Holiday Templates
            EmailTemplate(
                id="valentines_day_special",
                name="Valentine's Day Date Night Ready Package",
                subject="Get Date Night Ready, {{client_first_name}}! 💕 25% OFF",
                html_content="holiday/valentines_day.html",
                text_content="holiday/valentines_day.txt",
                campaign_type=CampaignType.PROMOTIONAL,
                personalization_fields=[
                    "client_first_name",
                    "offer_details",
                    "promo_code",
                    "offer_expiry",
                    "unsubscribe_link",
                ],
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            ),
            EmailTemplate(
                id="fathers_day_special",
                name="Father's Day Dad's Day Grooming Package",
                subject="Happy Father's Day, {{client_first_name}}! 👨‍👦 30% OFF",
                html_content="holiday/fathers_day.html",
                text_content="holiday/fathers_day.txt",
                campaign_type=CampaignType.PROMOTIONAL,
                personalization_fields=[
                    "client_first_name",
                    "offer_details",
                    "promo_code",
                    "offer_expiry",
                    "unsubscribe_link",
                ],
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            ),
            # Review Request Templates
            EmailTemplate(
                id="review_request_gentle",
                name="Gentle Review Request",
                subject="How was your experience with {{barber_name}}?",
                html_content="review_request/gentle_request.html",
                text_content="review_request/gentle_request.txt",
                campaign_type=CampaignType.REVIEW_REQUEST,
                personalization_fields=[
                    "client_first_name",
                    "barber_name",
                    "service_date",
                    "review_links",
                ],
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            ),
            # Post-Appointment Templates
            EmailTemplate(
                id="post_appointment_care",
                name="Post-Appointment Care Tips",
                subject="Keep your style fresh - care tips from {{barber_name}}",
                html_content="post_appointment/care_tips.html",
                text_content="post_appointment/care_tips.txt",
                campaign_type=CampaignType.POST_APPOINTMENT,
                personalization_fields=[
                    "client_first_name",
                    "barber_name",
                    "service_received",
                    "care_tips",
                    "next_appointment",
                ],
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            ),
        ]

        for template in default_templates:
            self.templates[template.id] = template

    def _load_default_campaigns(self):
        """Load default email campaigns"""
        default_campaigns = [
            # Welcome Series Campaign
            EmailCampaign(
                id="welcome_series_new_clients",
                name="New Client Welcome Series",
                description="3-email welcome sequence for new clients",
                campaign_type=CampaignType.WELCOME_SERIES,
                template_id="welcome_01_greeting",
                status=CampaignStatus.ACTIVE,
                target_audience={
                    "new_clients": True,
                    "days_since_registration": {"max": 7},
                },
                scheduling={
                    "sequence": [
                        {"template_id": "welcome_01_greeting", "delay_hours": 2},
                        {"template_id": "welcome_02_services", "delay_hours": 72},
                        {"template_id": "welcome_03_tips", "delay_hours": 168},
                    ]
                },
                automation_triggers=[
                    {
                        "trigger_type": "client_created",
                        "conditions": {},
                        "immediate": False,
                    }
                ],
                personalization_rules={
                    "use_client_preferences": True,
                    "include_barber_info": True,
                    "localize_content": True,
                },
                analytics_tracking={
                    "track_opens": True,
                    "track_clicks": True,
                    "track_conversions": True,
                    "conversion_goal": "book_appointment",
                },
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
                created_by=1,
            ),
            # Re-engagement Campaign
            EmailCampaign(
                id="reengagement_inactive_clients",
                name="Re-engage Inactive Clients",
                description="Win back clients who haven't visited in 30+ days",
                campaign_type=CampaignType.RE_ENGAGEMENT,
                template_id="reengagement_comeback",
                status=CampaignStatus.ACTIVE,
                target_audience={
                    "inactive_clients": True,
                    "days_since_last_visit": {"min": 30, "max": 90},
                },
                scheduling={
                    "frequency": "weekly",
                    "day_of_week": "tuesday",
                    "time": "10:00",
                },
                automation_triggers=[
                    {
                        "trigger_type": "client_inactive",
                        "conditions": {"days_inactive": 30},
                        "immediate": False,
                    }
                ],
                personalization_rules={
                    "include_last_visit": True,
                    "include_favorite_service": True,
                    "include_discount_offer": True,
                },
                analytics_tracking={
                    "track_opens": True,
                    "track_clicks": True,
                    "track_conversions": True,
                    "conversion_goal": "book_appointment",
                },
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
                created_by=1,
            ),
            # Birthday Campaign
            EmailCampaign(
                id="birthday_celebrations",
                name="Birthday Celebration Campaign",
                description="Send birthday greetings with special offers",
                campaign_type=CampaignType.BIRTHDAY,
                template_id="birthday_celebration",
                status=CampaignStatus.ACTIVE,
                target_audience={"has_birthday": True},
                scheduling={
                    "frequency": "daily",
                    "time": "09:00",
                    "send_on_birthday": True,
                },
                automation_triggers=[
                    {
                        "trigger_type": "client_birthday",
                        "conditions": {},
                        "immediate": True,
                    }
                ],
                personalization_rules={
                    "include_birthday_offer": True,
                    "include_favorite_service": True,
                    "birthday_discount_percentage": 20,
                },
                analytics_tracking={
                    "track_opens": True,
                    "track_clicks": True,
                    "track_conversions": True,
                    "conversion_goal": "book_birthday_appointment",
                },
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
                created_by=1,
            ),
            # Review Request Campaign
            EmailCampaign(
                id="post_appointment_reviews",
                name="Post-Appointment Review Requests",
                description="Request reviews 24 hours after appointments",
                campaign_type=CampaignType.REVIEW_REQUEST,
                template_id="review_request_gentle",
                status=CampaignStatus.ACTIVE,
                target_audience={"completed_appointments": True},
                scheduling={"delay_hours": 24, "only_satisfied_clients": True},
                automation_triggers=[
                    {
                        "trigger_type": "appointment_completed",
                        "conditions": {"appointment_rating": {"min": 4}},
                        "immediate": False,
                    }
                ],
                personalization_rules={
                    "include_barber_info": True,
                    "include_service_details": True,
                    "include_review_incentive": True,
                },
                analytics_tracking={
                    "track_opens": True,
                    "track_clicks": True,
                    "track_conversions": True,
                    "conversion_goal": "leave_review",
                },
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
                created_by=1,
            ),
            # Valentine's Day Campaign
            EmailCampaign(
                id="valentines_day_campaign",
                name="Valentine's Day Date Night Ready Package",
                description="Special Valentine's Day promotion with Date Night Ready packages",
                campaign_type=CampaignType.PROMOTIONAL,
                template_id="valentines_day_special",
                status=CampaignStatus.ACTIVE,
                target_audience={
                    "active_clients": True,
                    "exclude_recent_promotional": True,
                },
                scheduling={"send_date": "2025-02-01", "reminder_date": "2025-02-10"},
                automation_triggers=[
                    {
                        "trigger_type": "holiday_promotion",
                        "conditions": {"holiday": "valentines_day"},
                        "immediate": False,
                    }
                ],
                personalization_rules={
                    "include_romantic_messaging": True,
                    "include_gift_options": True,
                    "include_urgency": True,
                },
                analytics_tracking={
                    "track_opens": True,
                    "track_clicks": True,
                    "track_conversions": True,
                    "conversion_goal": "book_valentine_package",
                },
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
                created_by=1,
            ),
            # Father's Day Campaign
            EmailCampaign(
                id="fathers_day_campaign",
                name="Father's Day Dad's Day Grooming Package",
                description="Special Father's Day promotion with premium grooming packages",
                campaign_type=CampaignType.PROMOTIONAL,
                template_id="fathers_day_special",
                status=CampaignStatus.ACTIVE,
                target_audience={
                    "active_clients": True,
                    "exclude_recent_promotional": True,
                },
                scheduling={"send_date": "2025-06-01", "reminder_date": "2025-06-15"},
                automation_triggers=[
                    {
                        "trigger_type": "holiday_promotion",
                        "conditions": {"holiday": "fathers_day"},
                        "immediate": False,
                    }
                ],
                personalization_rules={
                    "include_family_messaging": True,
                    "include_gift_options": True,
                    "include_luxury_focus": True,
                },
                analytics_tracking={
                    "track_opens": True,
                    "track_clicks": True,
                    "track_conversions": True,
                    "conversion_goal": "book_fathers_day_package",
                },
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
                created_by=1,
            ),
        ]

        for campaign in default_campaigns:
            self.campaigns[campaign.id] = campaign

    # Template Management
    async def create_template(self, template_data: Dict[str, Any]) -> EmailTemplate:
        """Create a new email template"""
        template = EmailTemplate(
            id=template_data["id"],
            name=template_data["name"],
            subject=template_data["subject"],
            html_content=template_data["html_content"],
            text_content=template_data.get("text_content", ""),
            campaign_type=CampaignType(template_data["campaign_type"]),
            personalization_fields=template_data.get("personalization_fields", []),
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            is_active=template_data.get("is_active", True),
        )

        self.templates[template.id] = template
        logger.info(f"Created email template: {template.name}")
        return template

    async def update_template(
        self, template_id: str, updates: Dict[str, Any]
    ) -> EmailTemplate:
        """Update an existing email template"""
        if template_id not in self.templates:
            raise ValueError(f"Template {template_id} not found")

        template = self.templates[template_id]

        # Update fields
        for field, value in updates.items():
            if hasattr(template, field):
                if field == "campaign_type":
                    value = CampaignType(value)
                setattr(template, field, value)

        template.updated_at = datetime.utcnow()
        logger.info(f"Updated email template: {template.name}")
        return template

    async def get_template(self, template_id: str) -> Optional[EmailTemplate]:
        """Get a specific email template"""
        return self.templates.get(template_id)

    async def list_templates(
        self, campaign_type: Optional[CampaignType] = None
    ) -> List[EmailTemplate]:
        """List all email templates, optionally filtered by campaign type"""
        templates = list(self.templates.values())

        if campaign_type:
            templates = [t for t in templates if t.campaign_type == campaign_type]

        return templates

    async def delete_template(self, template_id: str) -> bool:
        """Delete an email template"""
        if template_id in self.templates:
            del self.templates[template_id]
            logger.info(f"Deleted email template: {template_id}")
            return True
        return False

    # Campaign Management
    async def create_campaign(self, campaign_data: Dict[str, Any]) -> EmailCampaign:
        """Create a new email campaign"""
        campaign = EmailCampaign(
            id=campaign_data["id"],
            name=campaign_data["name"],
            description=campaign_data.get("description", ""),
            campaign_type=CampaignType(campaign_data["campaign_type"]),
            template_id=campaign_data["template_id"],
            status=CampaignStatus(campaign_data.get("status", "draft")),
            target_audience=campaign_data.get("target_audience", {}),
            scheduling=campaign_data.get("scheduling", {}),
            automation_triggers=campaign_data.get("automation_triggers", []),
            personalization_rules=campaign_data.get("personalization_rules", {}),
            analytics_tracking=campaign_data.get("analytics_tracking", {}),
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            created_by=campaign_data["created_by"],
        )

        self.campaigns[campaign.id] = campaign
        logger.info(f"Created email campaign: {campaign.name}")
        return campaign

    async def update_campaign(
        self, campaign_id: str, updates: Dict[str, Any]
    ) -> EmailCampaign:
        """Update an existing email campaign"""
        if campaign_id not in self.campaigns:
            raise ValueError(f"Campaign {campaign_id} not found")

        campaign = self.campaigns[campaign_id]

        # Update fields
        for field, value in updates.items():
            if hasattr(campaign, field):
                if field == "campaign_type":
                    value = CampaignType(value)
                elif field == "status":
                    value = CampaignStatus(value)
                setattr(campaign, field, value)

        campaign.updated_at = datetime.utcnow()
        logger.info(f"Updated email campaign: {campaign.name}")
        return campaign

    async def get_campaign(self, campaign_id: str) -> Optional[EmailCampaign]:
        """Get a specific email campaign"""
        return self.campaigns.get(campaign_id)

    async def list_campaigns(
        self,
        campaign_type: Optional[CampaignType] = None,
        status: Optional[CampaignStatus] = None,
    ) -> List[EmailCampaign]:
        """List all email campaigns with optional filtering"""
        campaigns = list(self.campaigns.values())

        if campaign_type:
            campaigns = [c for c in campaigns if c.campaign_type == campaign_type]

        if status:
            campaigns = [c for c in campaigns if c.status == status]

        return campaigns

    async def activate_campaign(self, campaign_id: str) -> bool:
        """Activate an email campaign"""
        if campaign_id in self.campaigns:
            self.campaigns[campaign_id].status = CampaignStatus.ACTIVE
            self.campaigns[campaign_id].updated_at = datetime.utcnow()
            logger.info(f"Activated campaign: {campaign_id}")
            return True
        return False

    async def pause_campaign(self, campaign_id: str) -> bool:
        """Pause an email campaign"""
        if campaign_id in self.campaigns:
            self.campaigns[campaign_id].status = CampaignStatus.PAUSED
            self.campaigns[campaign_id].updated_at = datetime.utcnow()
            logger.info(f"Paused campaign: {campaign_id}")
            return True
        return False

    # Email Sending and Personalization
    async def render_template(
        self, template_id: str, personalization_data: Dict[str, Any]
    ) -> Dict[str, str]:
        """Render email template with personalization data"""
        template = await self.get_template(template_id)
        if not template:
            raise ValueError(f"Template {template_id} not found")

        try:
            # Load Jinja2 templates
            html_template = self.jinja_env.get_template(template.html_content)

            # Render HTML content
            html_content = html_template.render(**personalization_data)

            # Render text content (try to load template, fallback to simple substitution)
            text_content = template.text_content
            try:
                text_template = self.jinja_env.get_template(template.text_content)
                text_content = text_template.render(**personalization_data)
            except:
                # Simple template substitution for text
                for field, value in personalization_data.items():
                    text_content = text_content.replace(f"{{{{{field}}}}}", str(value))

            # Render subject
            subject = template.subject
            for field, value in personalization_data.items():
                subject = subject.replace(f"{{{{{field}}}}}", str(value))

            return {
                "subject": subject,
                "html_content": html_content,
                "text_content": text_content,
            }

        except Exception as e:
            logger.error(f"Error rendering template {template_id}: {e}")
            raise

    async def send_email(
        self,
        recipient_email: str,
        template_id: str,
        personalization_data: Dict[str, Any],
        campaign_id: Optional[str] = None,
    ) -> str:
        """Send a single email using template and personalization data"""

        try:
            # Render the template
            rendered_content = await self.render_template(
                template_id, personalization_data
            )

            # Create delivery record
            delivery_id = f"delivery_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_{recipient_email.replace('@', '_')}"
            delivery = EmailDelivery(
                id=delivery_id,
                campaign_id=campaign_id or "manual",
                client_id=personalization_data.get("client_id", 0),
                email_address=recipient_email,
                template_id=template_id,
                status=EmailStatus.PENDING,
                sent_at=None,
                opened_at=None,
                clicked_at=None,
                bounced_at=None,
                unsubscribed_at=None,
                error_message=None,
                tracking_data={},
            )

            # Send via SendGrid if configured
            if self.sendgrid_client:
                success = await self._send_via_sendgrid(
                    recipient_email, rendered_content, delivery_id
                )
            else:
                # Fallback to SMTP
                success = await self._send_via_smtp(recipient_email, rendered_content)

            # Update delivery status
            if success:
                delivery.status = EmailStatus.SENT
                delivery.sent_at = datetime.utcnow()
                logger.info(f"Email sent successfully to {recipient_email}")
            else:
                delivery.status = EmailStatus.FAILED
                delivery.error_message = "Failed to send email"
                logger.error(f"Failed to send email to {recipient_email}")

            # Store delivery record
            self.deliveries[delivery_id] = delivery

            return delivery_id

        except Exception as e:
            logger.error(f"Error sending email to {recipient_email}: {e}")
            raise

    async def _send_via_sendgrid(
        self, recipient_email: str, content: Dict[str, str], delivery_id: str
    ) -> bool:
        """Send email via SendGrid"""
        try:
            from_email = Email(self.from_email)
            to_email = To(recipient_email)
            subject = content["subject"]
            html_content = Content("text/html", content["html_content"])

            mail = Mail(from_email, to_email, subject, html_content)

            # Add text content
            if content["text_content"]:
                mail.add_content(Content("text/plain", content["text_content"]))

            # Add tracking parameters
            mail.tracking_settings = {
                "click_tracking": {"enable": True},
                "open_tracking": {"enable": True},
                "subscription_tracking": {"enable": True},
            }

            # Add custom args for tracking
            mail.custom_args = {"delivery_id": delivery_id}

            response = self.sendgrid_client.send(mail)
            return response.status_code in [202, 200]

        except Exception as e:
            logger.error(f"SendGrid error: {e}")
            return False

    async def _send_via_smtp(
        self, recipient_email: str, content: Dict[str, str]
    ) -> bool:
        """Send email via SMTP (fallback)"""
        try:
            # Use the existing notification service SMTP functionality
            success = self.notification_service.send_email(
                to_email=recipient_email,
                subject=content["subject"],
                message=content["text_content"],
                html_message=content["html_content"],
            )
            return success

        except Exception as e:
            logger.error(f"SMTP error: {e}")
            return False

    # Campaign Automation and Triggers
    async def process_automation_trigger(
        self, trigger_type: str, trigger_data: Dict[str, Any]
    ):
        """Process automation triggers for email campaigns"""
        logger.info(f"Processing email automation trigger: {trigger_type}")

        try:
            # Find matching campaigns
            matching_campaigns = []
            for campaign in self.campaigns.values():
                if campaign.status != CampaignStatus.ACTIVE:
                    continue

                for trigger in campaign.automation_triggers:
                    if trigger["trigger_type"] == trigger_type:
                        if self._check_trigger_conditions(trigger, trigger_data):
                            matching_campaigns.append(campaign)

            # Execute matching campaigns
            for campaign in matching_campaigns:
                await self._execute_campaign_automation(campaign, trigger_data)

            logger.info(f"Processed {len(matching_campaigns)} email campaigns")

        except Exception as e:
            logger.error(f"Error processing email automation trigger: {e}")

    def _check_trigger_conditions(
        self, trigger: Dict[str, Any], trigger_data: Dict[str, Any]
    ) -> bool:
        """Check if trigger conditions are met"""
        conditions = trigger.get("conditions", {})

        if not conditions:
            return True

        try:
            # Check all conditions
            for condition_key, condition_value in conditions.items():
                if condition_key not in trigger_data:
                    return False

                actual_value = trigger_data[condition_key]

                # Handle different condition types
                if isinstance(condition_value, dict):
                    if (
                        "min" in condition_value
                        and actual_value < condition_value["min"]
                    ):
                        return False
                    if (
                        "max" in condition_value
                        and actual_value > condition_value["max"]
                    ):
                        return False
                else:
                    if actual_value != condition_value:
                        return False

            return True

        except Exception as e:
            logger.error(f"Error checking trigger conditions: {e}")
            return False

    async def _execute_campaign_automation(
        self, campaign: EmailCampaign, trigger_data: Dict[str, Any]
    ):
        """Execute campaign automation"""
        logger.info(f"Executing campaign automation: {campaign.name}")

        try:
            # Get target audience
            recipients = await self._get_campaign_recipients(campaign, trigger_data)

            # Handle different campaign types
            if campaign.campaign_type == CampaignType.WELCOME_SERIES:
                await self._execute_welcome_series(campaign, recipients)
            elif campaign.campaign_type == CampaignType.RE_ENGAGEMENT:
                await self._execute_reengagement_campaign(campaign, recipients)
            elif campaign.campaign_type == CampaignType.BIRTHDAY:
                await self._execute_birthday_campaign(campaign, recipients)
            elif campaign.campaign_type == CampaignType.REVIEW_REQUEST:
                await self._execute_review_request_campaign(
                    campaign, recipients, trigger_data
                )
            else:
                await self._execute_standard_campaign(campaign, recipients)

            # Update campaign metrics
            campaign.send_count += len(recipients)
            campaign.updated_at = datetime.utcnow()

        except Exception as e:
            logger.error(f"Error executing campaign automation: {e}")

    async def _get_campaign_recipients(
        self, campaign: EmailCampaign, trigger_data: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Get recipients for a campaign based on target audience criteria"""
        recipients = []

        try:
            target_audience = campaign.target_audience

            # Query clients based on audience criteria
            query = self.db.query(Client)

            # Apply filters based on target audience
            if target_audience.get("new_clients"):
                days_since_reg = target_audience.get("days_since_registration", {})
                if "max" in days_since_reg:
                    cutoff_date = datetime.utcnow() - timedelta(
                        days=days_since_reg["max"]
                    )
                    query = query.filter(Client.created_at >= cutoff_date)

            if target_audience.get("inactive_clients"):
                days_inactive = target_audience.get("days_since_last_visit", {})
                if "min" in days_inactive:
                    cutoff_date = datetime.utcnow() - timedelta(
                        days=days_inactive["min"]
                    )
                    query = query.filter(Client.last_visit_date <= cutoff_date)

            if target_audience.get("has_birthday"):
                # Filter for clients with birthday in next 7 days
                today = datetime.utcnow().date()
                query = query.filter(
                    Client.date_of_birth.isnot(None)
                    # Add birthday range logic here
                )

            # Get clients and build recipient list
            clients = query.all()

            for client in clients:
                # Check email preferences
                preferences = self.preferences.get(client.id)
                if preferences and not preferences.is_subscribed:
                    continue

                recipients.append(
                    {
                        "client_id": client.id,
                        "email": client.email,
                        "first_name": client.first_name,
                        "last_name": client.last_name,
                        "client_data": client,
                    }
                )

            return recipients

        except Exception as e:
            logger.error(f"Error getting campaign recipients: {e}")
            return []

    async def _execute_welcome_series(
        self, campaign: EmailCampaign, recipients: List[Dict[str, Any]]
    ):
        """Execute welcome series campaign"""
        sequence = campaign.scheduling.get("sequence", [])

        for recipient in recipients:
            for step in sequence:
                delay_hours = step.get("delay_hours", 0)
                template_id = step["template_id"]

                # Schedule email (in production, use task queue)
                if delay_hours > 0:
                    logger.info(
                        f"Scheduling welcome email {template_id} for {recipient['email']} in {delay_hours} hours"
                    )
                else:
                    # Send immediately
                    personalization_data = await self._build_personalization_data(
                        recipient, campaign
                    )
                    await self.send_email(
                        recipient["email"],
                        template_id,
                        personalization_data,
                        campaign.id,
                    )

    async def _execute_reengagement_campaign(
        self, campaign: EmailCampaign, recipients: List[Dict[str, Any]]
    ):
        """Execute re-engagement campaign"""
        template_id = campaign.template_id

        for recipient in recipients:
            personalization_data = await self._build_personalization_data(
                recipient, campaign
            )
            await self.send_email(
                recipient["email"], template_id, personalization_data, campaign.id
            )

    async def _execute_birthday_campaign(
        self, campaign: EmailCampaign, recipients: List[Dict[str, Any]]
    ):
        """Execute birthday campaign"""
        template_id = campaign.template_id

        for recipient in recipients:
            personalization_data = await self._build_personalization_data(
                recipient, campaign
            )

            # Add birthday-specific personalization
            personalization_data.update(
                {
                    "birthday_offer": "20% off your next service",
                    "valid_until": (datetime.utcnow() + timedelta(days=30)).strftime(
                        "%B %d, %Y"
                    ),
                }
            )

            await self.send_email(
                recipient["email"], template_id, personalization_data, campaign.id
            )

    async def _execute_review_request_campaign(
        self,
        campaign: EmailCampaign,
        recipients: List[Dict[str, Any]],
        trigger_data: Dict[str, Any],
    ):
        """Execute review request campaign"""
        template_id = campaign.template_id

        for recipient in recipients:
            personalization_data = await self._build_personalization_data(
                recipient, campaign
            )

            # Add appointment-specific data
            if "appointment_id" in trigger_data:
                appointment = self.db.query(Appointment).get(
                    trigger_data["appointment_id"]
                )
                if appointment:
                    barber = self.db.query(Barber).get(appointment.barber_id)
                    personalization_data.update(
                        {
                            "barber_name": (
                                f"{barber.first_name} {barber.last_name}"
                                if barber
                                else "your barber"
                            ),
                            "service_date": appointment.appointment_time.strftime(
                                "%B %d, %Y"
                            ),
                            "service_received": appointment.service_name
                            or "your service",
                            "review_links": {
                                "google": "https://g.page/your-barbershop/review",
                                "yelp": "https://www.yelp.com/biz/your-barbershop",
                            },
                        }
                    )

            await self.send_email(
                recipient["email"], template_id, personalization_data, campaign.id
            )

    async def _execute_standard_campaign(
        self, campaign: EmailCampaign, recipients: List[Dict[str, Any]]
    ):
        """Execute standard campaign"""
        template_id = campaign.template_id

        for recipient in recipients:
            personalization_data = await self._build_personalization_data(
                recipient, campaign
            )
            await self.send_email(
                recipient["email"], template_id, personalization_data, campaign.id
            )

    async def _build_personalization_data(
        self, recipient: Dict[str, Any], campaign: EmailCampaign
    ) -> Dict[str, Any]:
        """Build personalization data for email"""
        client = recipient["client_data"]

        # Base personalization data
        personalization_data = {
            "client_id": client.id,
            "client_first_name": client.first_name,
            "client_last_name": client.last_name,
            "client_email": client.email,
            "barbershop_name": "Six Figure Barber",
            "current_date": datetime.utcnow().strftime("%B %d, %Y"),
            "unsubscribe_link": f"https://yourapp.com/unsubscribe?token={self._generate_unsubscribe_token(client.id)}",
        }

        # Add campaign-specific personalization
        personalization_rules = campaign.personalization_rules

        if personalization_rules.get("include_barber_info"):
            # Get client's preferred barber or last barber
            last_appointment = (
                self.db.query(Appointment)
                .filter(Appointment.client_id == client.id)
                .order_by(Appointment.appointment_time.desc())
                .first()
            )

            if last_appointment:
                barber = self.db.query(Barber).get(last_appointment.barber_id)
                if barber:
                    personalization_data.update(
                        {
                            "barber_name": f"{barber.first_name} {barber.last_name}",
                            "barber_first_name": barber.first_name,
                        }
                    )

        if personalization_rules.get("include_last_visit"):
            if client.last_visit_date:
                personalization_data["last_visit_date"] = (
                    client.last_visit_date.strftime("%B %d, %Y")
                )

        if personalization_rules.get("include_discount_offer"):
            personalization_data.update(
                {
                    "discount_offer": "20% off your next visit",
                    "expiry_date": (datetime.utcnow() + timedelta(days=30)).strftime(
                        "%B %d, %Y"
                    ),
                }
            )

        return personalization_data

    def _generate_unsubscribe_token(self, client_id: int) -> str:
        """Generate unsubscribe token for client"""
        import hashlib
        import secrets

        # In production, use proper token generation and storage
        token_data = f"{client_id}_{secrets.token_hex(16)}"
        return hashlib.sha256(token_data.encode()).hexdigest()[:32]

    # Email Preferences and Subscription Management
    async def update_email_preferences(
        self, client_id: int, preferences_data: Dict[str, Any]
    ) -> EmailPreferences:
        """Update client email preferences"""
        preferences = EmailPreferences(
            client_id=client_id,
            email_address=preferences_data["email_address"],
            is_subscribed=preferences_data.get("is_subscribed", True),
            frequency_preference=preferences_data.get("frequency_preference", "weekly"),
            campaign_preferences=preferences_data.get("campaign_preferences", {}),
            unsubscribe_token=self._generate_unsubscribe_token(client_id),
            last_updated=datetime.utcnow(),
            timezone=preferences_data.get("timezone", "UTC"),
        )

        self.preferences[client_id] = preferences
        logger.info(f"Updated email preferences for client {client_id}")
        return preferences

    async def unsubscribe_client(self, unsubscribe_token: str) -> bool:
        """Unsubscribe client using token"""
        # Find client by token (in production, store tokens in database)
        for client_id, preferences in self.preferences.items():
            if preferences.unsubscribe_token == unsubscribe_token:
                preferences.is_subscribed = False
                preferences.last_updated = datetime.utcnow()
                logger.info(f"Unsubscribed client {client_id}")
                return True
        return False

    async def get_email_preferences(self, client_id: int) -> Optional[EmailPreferences]:
        """Get client email preferences"""
        return self.preferences.get(client_id)

    # Analytics and Reporting
    async def get_campaign_analytics(self, campaign_id: str) -> Dict[str, Any]:
        """Get analytics for a specific campaign"""
        campaign = await self.get_campaign(campaign_id)
        if not campaign:
            return {}

        # Calculate analytics from delivery records
        campaign_deliveries = [
            d for d in self.deliveries.values() if d.campaign_id == campaign_id
        ]

        total_sent = len(
            [d for d in campaign_deliveries if d.status == EmailStatus.SENT]
        )
        total_delivered = len(
            [d for d in campaign_deliveries if d.status == EmailStatus.DELIVERED]
        )
        total_opened = len([d for d in campaign_deliveries if d.opened_at is not None])
        total_clicked = len(
            [d for d in campaign_deliveries if d.clicked_at is not None]
        )
        total_bounced = len(
            [d for d in campaign_deliveries if d.status == EmailStatus.BOUNCED]
        )
        total_unsubscribed = len(
            [d for d in campaign_deliveries if d.status == EmailStatus.UNSUBSCRIBED]
        )

        # Calculate rates
        open_rate = (total_opened / total_delivered * 100) if total_delivered > 0 else 0
        click_rate = (
            (total_clicked / total_delivered * 100) if total_delivered > 0 else 0
        )
        bounce_rate = (total_bounced / total_sent * 100) if total_sent > 0 else 0
        unsubscribe_rate = (
            (total_unsubscribed / total_delivered * 100) if total_delivered > 0 else 0
        )

        return {
            "campaign_id": campaign_id,
            "campaign_name": campaign.name,
            "total_sent": total_sent,
            "total_delivered": total_delivered,
            "total_opened": total_opened,
            "total_clicked": total_clicked,
            "total_bounced": total_bounced,
            "total_unsubscribed": total_unsubscribed,
            "open_rate": round(open_rate, 2),
            "click_rate": round(click_rate, 2),
            "bounce_rate": round(bounce_rate, 2),
            "unsubscribe_rate": round(unsubscribe_rate, 2),
            "last_sent": max(
                [d.sent_at for d in campaign_deliveries if d.sent_at], default=None
            ),
        }

    async def get_overall_analytics(self) -> Dict[str, Any]:
        """Get overall email campaign analytics"""
        all_deliveries = list(self.deliveries.values())

        total_campaigns = len(self.campaigns)
        active_campaigns = len(
            [c for c in self.campaigns.values() if c.status == CampaignStatus.ACTIVE]
        )
        total_sent = len([d for d in all_deliveries if d.status == EmailStatus.SENT])
        total_delivered = len(
            [d for d in all_deliveries if d.status == EmailStatus.DELIVERED]
        )
        total_opened = len([d for d in all_deliveries if d.opened_at is not None])
        total_clicked = len([d for d in all_deliveries if d.clicked_at is not None])

        # Calculate overall rates
        overall_open_rate = (
            (total_opened / total_delivered * 100) if total_delivered > 0 else 0
        )
        overall_click_rate = (
            (total_clicked / total_delivered * 100) if total_delivered > 0 else 0
        )

        return {
            "total_campaigns": total_campaigns,
            "active_campaigns": active_campaigns,
            "total_sent": total_sent,
            "total_delivered": total_delivered,
            "total_opened": total_opened,
            "total_clicked": total_clicked,
            "overall_open_rate": round(overall_open_rate, 2),
            "overall_click_rate": round(overall_click_rate, 2),
            "total_subscribers": len(self.preferences),
            "active_subscribers": len(
                [p for p in self.preferences.values() if p.is_subscribed]
            ),
        }

    # Test Email Functionality
    async def send_test_email(
        self,
        template_id: str,
        test_email: str,
        test_data: Optional[Dict[str, Any]] = None,
    ) -> str:
        """Send a test email with sample data"""

        # Default test personalization data
        default_test_data = {
            "client_id": 999,
            "client_first_name": "John",
            "client_last_name": "Doe",
            "client_email": test_email,
            "barbershop_name": "Six Figure Barber",
            "barber_name": "Mike Johnson",
            "barber_first_name": "Mike",
            "last_visit_date": "March 15, 2024",
            "discount_offer": "20% off your next visit",
            "expiry_date": (datetime.utcnow() + timedelta(days=30)).strftime(
                "%B %d, %Y"
            ),
            "birthday_offer": "25% off birthday special",
            "valid_until": (datetime.utcnow() + timedelta(days=30)).strftime(
                "%B %d, %Y"
            ),
            "service_received": "Haircut & Beard Trim",
            "service_date": datetime.utcnow().strftime("%B %d, %Y"),
            "review_links": {
                "google": "https://g.page/your-barbershop/review",
                "yelp": "https://www.yelp.com/biz/your-barbershop",
            },
            "unsubscribe_link": "https://yourapp.com/unsubscribe?token=test_token",
            "current_date": datetime.utcnow().strftime("%B %d, %Y"),
        }

        # Merge with provided test data
        if test_data:
            default_test_data.update(test_data)

        # Send test email
        delivery_id = await self.send_email(
            recipient_email=test_email,
            template_id=template_id,
            personalization_data=default_test_data,
            campaign_id="test_campaign",
        )

        logger.info(f"Test email sent to {test_email} using template {template_id}")
        return delivery_id


# Global email campaign service instance
email_campaign_service = None


def get_email_campaign_service() -> EmailCampaignService:
    """Get email campaign service instance"""
    global email_campaign_service
    if not email_campaign_service:
        db = next(get_db())
        email_campaign_service = EmailCampaignService(db)
    return email_campaign_service
