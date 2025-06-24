"""
Email Campaign Automation Integration
Integrates email campaigns with the existing automation engine
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from enum import Enum

from .automation_engine import (
    AutomationEngine,
    TriggerType,
    ActionType,
    AutomationRule,
    AutomationContext,
)
from .email_campaign_service import (
    EmailCampaignService,
    CampaignType,
    get_email_campaign_service,
)
from .email_campaign_config import EmailCampaignConfigManager
from models.client import Client
from models.appointment import Appointment
from models.barber import Barber
from config.database import get_db

logger = logging.getLogger(__name__)


class EmailTriggerType(Enum):
    """Email-specific trigger types"""

    CLIENT_CREATED = "client_created"
    CLIENT_INACTIVE = "client_inactive"
    CLIENT_BIRTHDAY = "client_birthday"
    APPOINTMENT_COMPLETED = "appointment_completed"
    APPOINTMENT_REMINDER = "appointment_reminder"
    SEASONAL_PROMOTION = "seasonal_promotion"
    VIP_MILESTONE = "vip_milestone"


class EmailAutomationIntegration:
    """Integration service for email campaigns with automation engine"""

    def __init__(
        self, automation_engine: AutomationEngine, email_service: EmailCampaignService
    ):
        self.automation_engine = automation_engine
        self.email_service = email_service
        self._register_email_automation_rules()
        self._register_email_action_handlers()

    def _register_email_automation_rules(self):
        """Register email-specific automation rules with the automation engine"""

        # New Client Welcome Series
        welcome_rule = AutomationRule(
            id="email_welcome_series",
            name="Email Welcome Series",
            description="Trigger welcome email series for new clients",
            trigger_type=TriggerType.CLIENT_CREATED,
            trigger_conditions={},
            actions=[
                {
                    "type": "send_welcome_series",
                    "campaign_id": "welcome_series_new_clients",
                    "delay_hours": 2,
                }
            ],
            is_active=True,
        )
        self.automation_engine.add_rule(welcome_rule)

        # Re-engagement Campaign
        reengagement_rule = AutomationRule(
            id="email_reengagement",
            name="Email Re-engagement Campaign",
            description="Send re-engagement emails to inactive clients",
            trigger_type=TriggerType.CLIENT_INACTIVE,
            trigger_conditions={"days_inactive": 30},
            actions=[
                {
                    "type": "send_reengagement_email",
                    "campaign_id": "reengagement_inactive_clients",
                    "template_id": "reengagement_comeback",
                }
            ],
            is_active=True,
        )
        self.automation_engine.add_rule(reengagement_rule)

        # Birthday Campaign
        birthday_rule = AutomationRule(
            id="email_birthday_celebration",
            name="Email Birthday Celebration",
            description="Send birthday emails with special offers",
            trigger_type=TriggerType.TIME_BASED,
            trigger_conditions={
                "schedule": "daily",
                "time": "09:00",
                "check_birthdays": True,
            },
            actions=[
                {
                    "type": "send_birthday_email",
                    "campaign_id": "birthday_celebrations",
                    "template_id": "birthday_celebration",
                }
            ],
            is_active=True,
        )
        self.automation_engine.add_rule(birthday_rule)

        # Post-Appointment Review Request
        review_request_rule = AutomationRule(
            id="email_review_request",
            name="Email Review Request",
            description="Request reviews 24 hours after appointments",
            trigger_type=TriggerType.APPOINTMENT_COMPLETED,
            trigger_conditions={},
            actions=[
                {
                    "type": "send_review_request",
                    "campaign_id": "post_appointment_reviews",
                    "template_id": "review_request_gentle",
                    "delay_hours": 24,
                }
            ],
            is_active=True,
        )
        self.automation_engine.add_rule(review_request_rule)

        # Post-Appointment Care Tips
        care_tips_rule = AutomationRule(
            id="email_care_tips",
            name="Email Care Tips",
            description="Send care tips 2 hours after appointments",
            trigger_type=TriggerType.APPOINTMENT_COMPLETED,
            trigger_conditions={},
            actions=[
                {
                    "type": "send_care_tips",
                    "campaign_id": "post_appointment_care",
                    "template_id": "post_appointment_care",
                    "delay_hours": 2,
                }
            ],
            is_active=True,
        )
        self.automation_engine.add_rule(care_tips_rule)

        # Seasonal Promotion Campaign
        seasonal_promotion_rule = AutomationRule(
            id="email_seasonal_promotion",
            name="Email Seasonal Promotion",
            description="Send seasonal promotion emails",
            trigger_type=TriggerType.TIME_BASED,
            trigger_conditions={
                "schedule": "monthly",
                "day_of_month": 1,
                "time": "10:00",
            },
            actions=[
                {
                    "type": "send_seasonal_promotion",
                    "campaign_id": "seasonal_promotions",
                    "template_id": "seasonal_promotion",
                }
            ],
            is_active=True,
        )
        self.automation_engine.add_rule(seasonal_promotion_rule)

        # Valentine's Day Campaign
        valentines_rule = AutomationRule(
            id="email_valentines_day",
            name="Email Valentine's Day Campaign",
            description="Send Valentine's Day Date Night Ready package promotion",
            trigger_type=TriggerType.TIME_BASED,
            trigger_conditions={
                "schedule": "date",
                "target_date": "2025-02-01",
                "time": "10:00",
                "holiday": "valentines_day",
            },
            actions=[
                {
                    "type": "send_holiday_promotion",
                    "campaign_id": "valentines_day_campaign",
                    "template_id": "valentines_day_special",
                    "holiday": "valentines_day",
                }
            ],
            is_active=True,
        )
        self.automation_engine.add_rule(valentines_rule)

        # Father's Day Campaign
        fathers_day_rule = AutomationRule(
            id="email_fathers_day",
            name="Email Father's Day Campaign",
            description="Send Father's Day Dad's Day Grooming package promotion",
            trigger_type=TriggerType.TIME_BASED,
            trigger_conditions={
                "schedule": "date",
                "target_date": "2025-06-01",
                "time": "10:00",
                "holiday": "fathers_day",
            },
            actions=[
                {
                    "type": "send_holiday_promotion",
                    "campaign_id": "fathers_day_campaign",
                    "template_id": "fathers_day_special",
                    "holiday": "fathers_day",
                }
            ],
            is_active=True,
        )
        self.automation_engine.add_rule(fathers_day_rule)

    def _register_email_action_handlers(self):
        """Register email action handlers with the automation engine"""

        # Register new action handlers
        self.automation_engine.action_handlers.update(
            {
                "send_welcome_series": self._send_welcome_series,
                "send_reengagement_email": self._send_reengagement_email,
                "send_birthday_email": self._send_birthday_email,
                "send_review_request": self._send_review_request,
                "send_care_tips": self._send_care_tips,
                "send_seasonal_promotion": self._send_seasonal_promotion,
                "send_holiday_promotion": self._send_holiday_promotion,
            }
        )

    # Email Action Handlers
    async def _send_welcome_series(
        self, action_config: Dict[str, Any], context: AutomationContext
    ):
        """Send welcome series emails"""
        if not context.client:
            logger.warning("No client context for welcome series")
            return

        campaign_id = action_config.get("campaign_id", "welcome_series_new_clients")
        delay_hours = action_config.get("delay_hours", 0)

        logger.info(f"Sending welcome series to client {context.client.id}")

        try:
            # Trigger the welcome series campaign
            await self.email_service.process_automation_trigger(
                "client_created",
                {"client_id": context.client.id, "delay_hours": delay_hours},
            )

        except Exception as e:
            logger.error(f"Error sending welcome series: {e}")

    async def _send_reengagement_email(
        self, action_config: Dict[str, Any], context: AutomationContext
    ):
        """Send re-engagement email"""
        if not context.client:
            logger.warning("No client context for re-engagement email")
            return

        template_id = action_config.get("template_id", "reengagement_comeback")
        campaign_id = action_config.get("campaign_id", "reengagement_inactive_clients")

        logger.info(f"Sending re-engagement email to client {context.client.id}")

        try:
            # Build personalization data
            personalization_data = await self._build_client_personalization_data(
                context.client
            )

            # Add re-engagement specific data
            personalization_data.update(
                {
                    "last_visit_date": (
                        context.client.last_visit_date.strftime("%B %d, %Y")
                        if context.client.last_visit_date
                        else "your last visit"
                    ),
                    "discount_offer": "20% off your comeback visit",
                    "expiry_date": (datetime.utcnow() + timedelta(days=30)).strftime(
                        "%B %d, %Y"
                    ),
                }
            )

            # Send the email
            await self.email_service.send_email(
                recipient_email=context.client.email,
                template_id=template_id,
                personalization_data=personalization_data,
                campaign_id=campaign_id,
            )

        except Exception as e:
            logger.error(f"Error sending re-engagement email: {e}")

    async def _send_birthday_email(
        self, action_config: Dict[str, Any], context: AutomationContext
    ):
        """Send birthday celebration email"""
        template_id = action_config.get("template_id", "birthday_celebration")
        campaign_id = action_config.get("campaign_id", "birthday_celebrations")

        logger.info("Checking for birthday clients")

        try:
            # Get clients with birthdays today
            today = datetime.utcnow().date()
            db = next(get_db())

            birthday_clients = (
                db.query(Client)
                .filter(
                    Client.date_of_birth.isnot(None),
                    # Add logic to match month and day
                )
                .all()
            )

            for client in birthday_clients:
                if client.date_of_birth and (
                    client.date_of_birth.month == today.month
                    and client.date_of_birth.day == today.day
                ):
                    # Build personalization data
                    personalization_data = (
                        await self._build_client_personalization_data(client)
                    )

                    # Add birthday specific data
                    personalization_data.update(
                        {
                            "birthday_offer": "25% off any service",
                            "valid_until": (
                                datetime.utcnow() + timedelta(days=30)
                            ).strftime("%B %d, %Y"),
                            "favorite_service": self._get_client_favorite_service(
                                client
                            ),
                        }
                    )

                    # Send birthday email
                    await self.email_service.send_email(
                        recipient_email=client.email,
                        template_id=template_id,
                        personalization_data=personalization_data,
                        campaign_id=campaign_id,
                    )

                    logger.info(f"Sent birthday email to client {client.id}")

        except Exception as e:
            logger.error(f"Error sending birthday emails: {e}")

    async def _send_review_request(
        self, action_config: Dict[str, Any], context: AutomationContext
    ):
        """Send review request email"""
        if not context.client or not context.appointment:
            logger.warning("Missing client or appointment context for review request")
            return

        template_id = action_config.get("template_id", "review_request_gentle")
        campaign_id = action_config.get("campaign_id", "post_appointment_reviews")
        delay_hours = action_config.get("delay_hours", 24)

        logger.info(
            f"Scheduling review request for client {context.client.id} in {delay_hours} hours"
        )

        try:
            # Build personalization data
            personalization_data = await self._build_client_personalization_data(
                context.client
            )

            # Add appointment and review specific data
            barber = context.barber
            personalization_data.update(
                {
                    "barber_name": (
                        f"{barber.first_name} {barber.last_name}"
                        if barber
                        else "your barber"
                    ),
                    "service_date": context.appointment.appointment_time.strftime(
                        "%B %d, %Y"
                    ),
                    "service_received": context.appointment.service_name
                    or "your service",
                    "review_links": {
                        "google": "https://g.page/your-barbershop/review",
                        "yelp": "https://www.yelp.com/biz/your-barbershop",
                        "facebook": "https://www.facebook.com/your-barbershop",
                    },
                }
            )

            # In production, this would be scheduled for later execution
            # For now, we'll simulate the delay
            if delay_hours > 0:
                logger.info(
                    f"Would schedule review request for {delay_hours} hours later"
                )

            # Send the email (in production, this would be queued)
            await self.email_service.send_email(
                recipient_email=context.client.email,
                template_id=template_id,
                personalization_data=personalization_data,
                campaign_id=campaign_id,
            )

        except Exception as e:
            logger.error(f"Error sending review request: {e}")

    async def _send_care_tips(
        self, action_config: Dict[str, Any], context: AutomationContext
    ):
        """Send post-appointment care tips"""
        if not context.client or not context.appointment:
            logger.warning("Missing client or appointment context for care tips")
            return

        template_id = action_config.get("template_id", "post_appointment_care")
        campaign_id = action_config.get("campaign_id", "post_appointment_care")
        delay_hours = action_config.get("delay_hours", 2)

        logger.info(
            f"Scheduling care tips for client {context.client.id} in {delay_hours} hours"
        )

        try:
            # Build personalization data
            personalization_data = await self._build_client_personalization_data(
                context.client
            )

            # Add appointment and care specific data
            barber = context.barber
            personalization_data.update(
                {
                    "barber_name": (
                        f"{barber.first_name} {barber.last_name}"
                        if barber
                        else "your barber"
                    ),
                    "service_received": context.appointment.service_name
                    or "your fresh cut",
                    "care_tips": self._get_service_care_tips(
                        context.appointment.service_name
                    ),
                    "next_appointment": (
                        datetime.utcnow() + timedelta(weeks=4)
                    ).strftime("%B %d, %Y"),
                }
            )

            # In production, this would be scheduled for later execution
            if delay_hours > 0:
                logger.info(f"Would schedule care tips for {delay_hours} hours later")

            # Send the email (in production, this would be queued)
            await self.email_service.send_email(
                recipient_email=context.client.email,
                template_id=template_id,
                personalization_data=personalization_data,
                campaign_id=campaign_id,
            )

        except Exception as e:
            logger.error(f"Error sending care tips: {e}")

    async def _send_seasonal_promotion(
        self, action_config: Dict[str, Any], context: AutomationContext
    ):
        """Send seasonal promotion email"""
        template_id = action_config.get("template_id", "seasonal_promotion")
        campaign_id = action_config.get("campaign_id", "seasonal_promotions")

        logger.info("Sending seasonal promotion emails")

        try:
            # Determine current season
            current_month = datetime.utcnow().month
            if current_month in [12, 1, 2]:
                season = "Winter"
            elif current_month in [3, 4, 5]:
                season = "Spring"
            elif current_month in [6, 7, 8]:
                season = "Summer"
            else:
                season = "Fall"

            # Get all active clients
            db = next(get_db())
            active_clients = (
                db.query(Client)
                .filter(Client.email.isnot(None), Client.is_active == True)
                .all()
            )

            for client in active_clients:
                # Check email preferences (would be implemented with real preferences system)

                # Build personalization data
                personalization_data = await self._build_client_personalization_data(
                    client
                )

                # Add seasonal promotion data - configurable offers
                personalization_data.update(
                    {
                        "season": season,
                        "promotion_title": f"{season} Style Refresh Special",
                        # Configurable offer details - can be set to None for no offer
                        "offer_details": action_config.get(
                            "offer_details"
                        ),  # e.g., "30% OFF PREMIUM SERVICES" or None
                        "promo_code": action_config.get(
                            "promo_code"
                        ),  # e.g., "SPRING30" or None
                        "offer_expiry": action_config.get(
                            "offer_expiry",
                            f"Valid through the end of {datetime.utcnow().strftime('%B')}",
                        ),
                        "offer_start_date": datetime.utcnow().strftime("%B %d"),
                        "offer_end_date": (
                            datetime.utcnow() + timedelta(days=30)
                        ).strftime("%B %d"),
                        "booking_deadline": (
                            datetime.utcnow() + timedelta(days=25)
                        ).strftime("%B %d"),
                    }
                )

                # Send seasonal promotion email
                await self.email_service.send_email(
                    recipient_email=client.email,
                    template_id=template_id,
                    personalization_data=personalization_data,
                    campaign_id=campaign_id,
                )

            logger.info(
                f"Sent seasonal promotion emails to {len(active_clients)} clients"
            )

        except Exception as e:
            logger.error(f"Error sending seasonal promotion: {e}")

    async def _send_holiday_promotion(
        self, action_config: Dict[str, Any], context: AutomationContext
    ):
        """Send holiday-specific promotion email"""
        template_id = action_config.get("template_id", "seasonal_promotion")
        campaign_id = action_config.get("campaign_id", "holiday_promotions")
        holiday = action_config.get("holiday", "special")

        logger.info(f"Sending {holiday} promotion emails")

        try:
            # Get all active clients
            db = next(get_db())
            active_clients = (
                db.query(Client)
                .filter(Client.email.isnot(None), Client.is_active == True)
                .all()
            )

            for client in active_clients:
                # Check email preferences (would be implemented with real preferences system)

                # Build personalization data
                personalization_data = await self._build_client_personalization_data(
                    client
                )

                # Add holiday-specific personalization based on holiday type - configurable offers
                if holiday == "valentines_day":
                    personalization_data.update(
                        {
                            "holiday_greeting": "Happy Valentine's Day",
                            "offer_details": action_config.get(
                                "offer_details"
                            ),  # e.g., "25% OFF DATE NIGHT PACKAGE" or None
                            "promo_code": action_config.get(
                                "promo_code"
                            ),  # e.g., "LOVE25" or None
                            "offer_expiry": action_config.get(
                                "offer_expiry", "Valid through February 14th"
                            ),
                            "holiday_message": "Make this Valentine's Day unforgettable!",
                            "urgency_message": "Book by February 10th for guaranteed Valentine's Day availability",
                        }
                    )
                elif holiday == "fathers_day":
                    personalization_data.update(
                        {
                            "holiday_greeting": "Happy Father's Day",
                            "offer_details": action_config.get(
                                "offer_details"
                            ),  # e.g., "30% OFF DAD'S DAY PACKAGE" or None
                            "promo_code": action_config.get(
                                "promo_code"
                            ),  # e.g., "DAD30" or None
                            "offer_expiry": action_config.get(
                                "offer_expiry", "Valid through Father's Day weekend"
                            ),
                            "holiday_message": "Celebrate Dad in style!",
                            "urgency_message": "Perfect gift for Father's Day",
                        }
                    )

                # Send holiday promotion email
                await self.email_service.send_email(
                    recipient_email=client.email,
                    template_id=template_id,
                    personalization_data=personalization_data,
                    campaign_id=campaign_id,
                )

            logger.info(
                f"Sent {holiday} promotion emails to {len(active_clients)} clients"
            )

        except Exception as e:
            logger.error(f"Error sending {holiday} promotion: {e}")

    # Helper Methods
    async def _build_client_personalization_data(
        self, client: Client
    ) -> Dict[str, Any]:
        """Build basic personalization data for a client"""
        return {
            "client_id": client.id,
            "client_first_name": client.first_name,
            "client_last_name": client.last_name,
            "client_email": client.email,
            "barbershop_name": "Six Figure Barber",
            "current_date": datetime.utcnow().strftime("%B %d, %Y"),
            "unsubscribe_link": f"https://yourapp.com/unsubscribe?token={self._generate_unsubscribe_token(client.id)}",
        }

    def _get_client_favorite_service(self, client: Client) -> str:
        """Get client's most frequent service"""
        db = next(get_db())

        # Get most common service for this client
        appointments = (
            db.query(Appointment)
            .filter(
                Appointment.client_id == client.id, Appointment.service_name.isnot(None)
            )
            .all()
        )

        if appointments:
            services = [apt.service_name for apt in appointments if apt.service_name]
            if services:
                # Return most common service
                return max(set(services), key=services.count)

        return "Signature Cut"

    def _get_service_care_tips(self, service_name: Optional[str]) -> List[str]:
        """Get care tips specific to the service received"""
        if not service_name:
            return [
                "Wash hair 2-3 times per week",
                "Use quality styling products",
                "Regular trims every 3-4 weeks",
            ]

        service_lower = service_name.lower()

        if "beard" in service_lower:
            return [
                "Apply beard oil daily",
                "Use dedicated beard wash weekly",
                "Brush downward in the morning",
                "Avoid over-trimming between visits",
            ]
        elif "fade" in service_lower or "buzz" in service_lower:
            return [
                "Touch up neckline weekly",
                "Use light styling products",
                "Book touch-ups every 2-3 weeks",
                "Protect from sun exposure",
            ]
        else:
            return [
                "Start styling with damp hair",
                "Use medium-hold pomade",
                "Brush before applying product",
                "Deep condition weekly",
            ]

    def _generate_unsubscribe_token(self, client_id: int) -> str:
        """Generate unsubscribe token for client"""
        import hashlib
        import secrets

        token_data = f"{client_id}_{secrets.token_hex(16)}"
        return hashlib.sha256(token_data.encode()).hexdigest()[:32]

    # Trigger Methods for External Use
    async def trigger_welcome_series(self, client_id: int):
        """Manually trigger welcome series for a client"""
        try:
            await self.automation_engine.process_trigger(
                TriggerType.CLIENT_CREATED, {"client_id": client_id}
            )
        except Exception as e:
            logger.error(f"Error triggering welcome series: {e}")

    async def trigger_reengagement(self, client_id: int):
        """Manually trigger re-engagement for a client"""
        try:
            await self.automation_engine.process_trigger(
                TriggerType.CLIENT_INACTIVE,
                {"client_id": client_id, "days_inactive": 30},
            )
        except Exception as e:
            logger.error(f"Error triggering re-engagement: {e}")

    async def trigger_post_appointment_emails(self, appointment_id: int):
        """Manually trigger post-appointment emails"""
        try:
            await self.automation_engine.process_trigger(
                TriggerType.APPOINTMENT_COMPLETED, {"appointment_id": appointment_id}
            )
        except Exception as e:
            logger.error(f"Error triggering post-appointment emails: {e}")

    async def trigger_birthday_check(self):
        """Manually trigger birthday email check"""
        try:
            await self.automation_engine.process_trigger(
                TriggerType.TIME_BASED, {"check_birthdays": True}
            )
        except Exception as e:
            logger.error(f"Error triggering birthday check: {e}")

    async def trigger_seasonal_promotion(self):
        """Manually trigger seasonal promotion"""
        try:
            await self.automation_engine.process_trigger(
                TriggerType.TIME_BASED, {"seasonal_promotion": True}
            )
        except Exception as e:
            logger.error(f"Error triggering seasonal promotion: {e}")

    async def trigger_holiday_promotion(self, holiday: str):
        """Manually trigger holiday promotion"""
        try:
            await self.automation_engine.process_trigger(
                TriggerType.TIME_BASED, {"holiday_promotion": True, "holiday": holiday}
            )
        except Exception as e:
            logger.error(f"Error triggering {holiday} promotion: {e}")


# Global integration instance
email_automation_integration = None


def get_email_automation_integration() -> EmailAutomationIntegration:
    """Get email automation integration instance"""
    global email_automation_integration
    if not email_automation_integration:
        from .automation_engine import get_automation_engine

        automation_engine = get_automation_engine()
        email_service = get_email_campaign_service()
        email_automation_integration = EmailAutomationIntegration(
            automation_engine, email_service
        )
    return email_automation_integration
