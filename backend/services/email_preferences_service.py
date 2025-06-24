"""
Email Preferences Management Service
Handles client email preferences, segmentation, suppression lists, and compliance
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from enum import Enum
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
import secrets
import hashlib

from models.client import Client
from models.email_preferences import (
    EmailPreferences,
    EmailDeliveryLog,
    EmailSegment,
    EmailSuppressionList,
)
from config.database import get_db

logger = logging.getLogger(__name__)


class FrequencyPreference(Enum):
    """Email frequency preferences"""

    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    SPECIAL_ONLY = "special_only"
    NEVER = "never"


class ClientTier(Enum):
    """Client tier classifications"""

    STANDARD = "standard"
    PREMIUM = "premium"
    VIP = "vip"
    INACTIVE = "inactive"


class SuppressionType(Enum):
    """Email suppression types"""

    UNSUBSCRIBE = "unsubscribe"
    BOUNCE_HARD = "bounce_hard"
    BOUNCE_SOFT = "bounce_soft"
    COMPLAINT = "complaint"
    MANUAL = "manual"


class EmailPreferencesService:
    """Service for managing email preferences and compliance"""

    def __init__(self, db: Session):
        self.db = db

    # Preference Management
    async def get_or_create_preferences(self, client_id: int) -> EmailPreferences:
        """Get existing preferences or create default ones for client"""
        preferences = (
            self.db.query(EmailPreferences)
            .filter(EmailPreferences.client_id == client_id)
            .first()
        )

        if not preferences:
            client = self.db.query(Client).get(client_id)
            if not client:
                raise ValueError(f"Client {client_id} not found")

            preferences = EmailPreferences(
                client_id=client_id,
                email_address=client.email,
                is_subscribed=True,
                subscription_source="signup",
                subscription_date=datetime.utcnow(),
                frequency_preference=FrequencyPreference.WEEKLY.value,
                max_emails_per_week=3,
                campaign_preferences={
                    "welcome": True,
                    "promotional": True,
                    "educational": True,
                    "birthday": True,
                    "review_request": True,
                    "reengagement": True,
                },
                segment_tags=["new_customer"],
                client_tier=ClientTier.STANDARD.value,
                preferred_time="morning",
                timezone="UTC",
                unsubscribe_token=self._generate_token(),
                preferences_token=self._generate_token(),
                total_emails_sent=0,
                total_emails_opened=0,
                total_emails_clicked=0,
                bounce_count=0,
                complaint_count=0,
                custom_fields={},
            )

            self.db.add(preferences)
            self.db.commit()
            self.db.refresh(preferences)

            logger.info(f"Created default email preferences for client {client_id}")

        return preferences

    async def update_preferences(
        self, client_id: int, updates: Dict[str, Any]
    ) -> EmailPreferences:
        """Update client email preferences"""
        preferences = await self.get_or_create_preferences(client_id)

        # Update allowed fields
        allowed_fields = [
            "is_subscribed",
            "frequency_preference",
            "max_emails_per_week",
            "campaign_preferences",
            "segment_tags",
            "preferred_time",
            "timezone",
            "notes",
            "custom_fields",
        ]

        for field, value in updates.items():
            if field in allowed_fields and hasattr(preferences, field):
                if field == "frequency_preference" and value not in [
                    e.value for e in FrequencyPreference
                ]:
                    raise ValueError(f"Invalid frequency preference: {value}")

                setattr(preferences, field, value)

        preferences.updated_at = datetime.utcnow()
        self.db.commit()

        logger.info(f"Updated email preferences for client {client_id}")
        return preferences

    async def unsubscribe_client(
        self, token: str, reason: Optional[str] = None
    ) -> bool:
        """Unsubscribe client using token"""
        preferences = (
            self.db.query(EmailPreferences)
            .filter(EmailPreferences.unsubscribe_token == token)
            .first()
        )

        if not preferences:
            return False

        preferences.is_subscribed = False
        preferences.unsubscribed_date = datetime.utcnow()
        preferences.unsubscribe_reason = reason or "User request"
        preferences.updated_at = datetime.utcnow()

        # Add to suppression list
        await self.add_to_suppression_list(
            email_address=preferences.email_address,
            suppression_type=SuppressionType.UNSUBSCRIBE,
            reason=reason or "User unsubscribe",
            client_id=preferences.client_id,
        )

        self.db.commit()
        logger.info(f"Unsubscribed client {preferences.client_id} via token")
        return True

    async def resubscribe_client(self, client_id: int) -> bool:
        """Resubscribe a client (remove from suppression list)"""
        preferences = await self.get_or_create_preferences(client_id)

        # Remove from suppression list
        self.db.query(EmailSuppressionList).filter(
            EmailSuppressionList.email_address == preferences.email_address,
            EmailSuppressionList.suppression_type == SuppressionType.UNSUBSCRIBE.value,
        ).delete()

        # Update preferences
        preferences.is_subscribed = True
        preferences.unsubscribed_date = None
        preferences.unsubscribe_reason = None
        preferences.updated_at = datetime.utcnow()

        self.db.commit()
        logger.info(f"Resubscribed client {client_id}")
        return True

    # Segmentation
    async def update_client_segments(self, client_id: int):
        """Update client segments based on behavior and data"""
        preferences = await self.get_or_create_preferences(client_id)
        client = self.db.query(Client).get(client_id)

        if not client:
            return

        # Calculate segments based on client data
        segments = []

        # Tier-based segments
        total_spent = getattr(client, "total_spent", 0) or 0
        if total_spent >= 1000:
            segments.append("vip")
            preferences.client_tier = ClientTier.VIP.value
        elif total_spent >= 500:
            segments.append("premium")
            preferences.client_tier = ClientTier.PREMIUM.value
        else:
            segments.append("standard")
            preferences.client_tier = ClientTier.STANDARD.value

        # Activity-based segments
        if client.last_visit_date:
            days_since_visit = (datetime.utcnow().date() - client.last_visit_date).days
            if days_since_visit <= 30:
                segments.append("active")
            elif days_since_visit <= 90:
                segments.append("inactive_recent")
            else:
                segments.append("inactive_long")
        else:
            segments.append("never_visited")

        # Registration-based segments
        if client.created_at:
            days_since_reg = (datetime.utcnow() - client.created_at).days
            if days_since_reg <= 7:
                segments.append("new_customer")
            elif days_since_reg <= 30:
                segments.append("recent_customer")
            else:
                segments.append("established_customer")

        # Engagement-based segments
        if preferences.total_emails_opened > 0:
            open_rate = preferences.total_emails_opened / max(
                preferences.total_emails_sent, 1
            )
            if open_rate >= 0.5:
                segments.append("highly_engaged")
            elif open_rate >= 0.2:
                segments.append("moderately_engaged")
            else:
                segments.append("low_engagement")

        # Birthday segment
        if client.date_of_birth:
            today = datetime.utcnow().date()
            birthday_this_year = client.date_of_birth.replace(year=today.year)

            # Check if birthday is within next 30 days
            if birthday_this_year >= today and birthday_this_year <= today + timedelta(
                days=30
            ):
                segments.append("upcoming_birthday")

        # Update segments
        preferences.segment_tags = list(set(segments))
        preferences.updated_at = datetime.utcnow()
        self.db.commit()

        logger.info(f"Updated segments for client {client_id}: {segments}")

    async def get_clients_by_segment(
        self, segment_criteria: Dict[str, Any]
    ) -> List[int]:
        """Get client IDs matching segment criteria"""
        query = self.db.query(EmailPreferences.client_id).filter(
            EmailPreferences.is_subscribed == True
        )

        # Apply segment filters
        if "segment_tags" in segment_criteria:
            required_tags = segment_criteria["segment_tags"]
            if isinstance(required_tags, str):
                required_tags = [required_tags]

            for tag in required_tags:
                query = query.filter(EmailPreferences.segment_tags.contains([tag]))

        if "client_tier" in segment_criteria:
            query = query.filter(
                EmailPreferences.client_tier == segment_criteria["client_tier"]
            )

        if "frequency_preference" in segment_criteria:
            query = query.filter(
                EmailPreferences.frequency_preference
                == segment_criteria["frequency_preference"]
            )

        # Engagement filters
        if "min_open_rate" in segment_criteria:
            min_rate = segment_criteria["min_open_rate"]
            query = query.filter(
                (
                    EmailPreferences.total_emails_opened
                    / func.greatest(EmailPreferences.total_emails_sent, 1)
                )
                >= min_rate
            )

        if "max_bounce_count" in segment_criteria:
            query = query.filter(
                EmailPreferences.bounce_count <= segment_criteria["max_bounce_count"]
            )

        # Date filters
        if "last_email_sent_after" in segment_criteria:
            query = query.filter(
                EmailPreferences.last_email_sent
                >= segment_criteria["last_email_sent_after"]
            )

        client_ids = [row[0] for row in query.all()]
        return client_ids

    # Suppression List Management
    async def add_to_suppression_list(
        self,
        email_address: str,
        suppression_type: SuppressionType,
        reason: Optional[str] = None,
        client_id: Optional[int] = None,
        campaign_id: Optional[str] = None,
        bounce_type: Optional[str] = None,
        bounce_subtype: Optional[str] = None,
    ) -> bool:
        """Add email to suppression list"""

        # Check if already suppressed
        existing = (
            self.db.query(EmailSuppressionList)
            .filter(
                EmailSuppressionList.email_address == email_address,
                EmailSuppressionList.suppression_type == suppression_type.value,
            )
            .first()
        )

        if existing:
            logger.info(
                f"Email {email_address} already in suppression list for {suppression_type.value}"
            )
            return False

        suppression = EmailSuppressionList(
            email_address=email_address,
            suppression_type=suppression_type.value,
            reason=reason,
            source_campaign_id=campaign_id,
            bounce_type=bounce_type,
            bounce_subtype=bounce_subtype,
            client_id=client_id,
            created_at=datetime.utcnow(),
        )

        self.db.add(suppression)
        self.db.commit()

        logger.info(
            f"Added {email_address} to suppression list: {suppression_type.value}"
        )
        return True

    async def is_suppressed(self, email_address: str) -> bool:
        """Check if email address is suppressed"""
        count = (
            self.db.query(EmailSuppressionList)
            .filter(EmailSuppressionList.email_address == email_address)
            .count()
        )

        return count > 0

    async def remove_from_suppression_list(
        self, email_address: str, suppression_type: Optional[SuppressionType] = None
    ) -> bool:
        """Remove email from suppression list"""
        query = self.db.query(EmailSuppressionList).filter(
            EmailSuppressionList.email_address == email_address
        )

        if suppression_type:
            query = query.filter(
                EmailSuppressionList.suppression_type == suppression_type.value
            )

        deleted_count = query.delete()
        self.db.commit()

        logger.info(
            f"Removed {email_address} from suppression list ({deleted_count} entries)"
        )
        return deleted_count > 0

    # Delivery Tracking
    async def log_email_delivery(
        self, delivery_data: Dict[str, Any]
    ) -> EmailDeliveryLog:
        """Log email delivery attempt"""
        delivery_log = EmailDeliveryLog(
            client_id=delivery_data["client_id"],
            email_address=delivery_data["email_address"],
            campaign_id=delivery_data.get("campaign_id"),
            template_id=delivery_data["template_id"],
            status=delivery_data.get("status", "pending"),
            delivery_id=delivery_data["delivery_id"],
            external_message_id=delivery_data.get("external_message_id"),
            subject_line=delivery_data["subject_line"],
            personalization_data=delivery_data.get("personalization_data", {}),
            created_at=datetime.utcnow(),
        )

        self.db.add(delivery_log)
        self.db.commit()
        self.db.refresh(delivery_log)

        # Update preferences tracking
        preferences = await self.get_or_create_preferences(delivery_data["client_id"])
        preferences.total_emails_sent += 1
        preferences.last_email_sent = datetime.utcnow()
        self.db.commit()

        return delivery_log

    async def update_delivery_status(
        self,
        delivery_id: str,
        status: str,
        additional_data: Optional[Dict[str, Any]] = None,
    ):
        """Update email delivery status"""
        delivery_log = (
            self.db.query(EmailDeliveryLog)
            .filter(EmailDeliveryLog.delivery_id == delivery_id)
            .first()
        )

        if not delivery_log:
            logger.warning(f"Delivery log not found for ID: {delivery_id}")
            return

        delivery_log.status = status
        delivery_log.updated_at = datetime.utcnow()

        # Update specific timestamps based on status
        if status == "delivered" and not delivery_log.delivered_at:
            delivery_log.delivered_at = datetime.utcnow()
        elif status == "opened" and not delivery_log.opened_at:
            delivery_log.opened_at = datetime.utcnow()
            delivery_log.open_count = (delivery_log.open_count or 0) + 1

            # Update preferences
            preferences = await self.get_or_create_preferences(delivery_log.client_id)
            preferences.total_emails_opened += 1
        elif status == "clicked":
            if not delivery_log.first_clicked_at:
                delivery_log.first_clicked_at = datetime.utcnow()
            delivery_log.last_clicked_at = datetime.utcnow()
            delivery_log.click_count = (delivery_log.click_count or 0) + 1

            # Update preferences
            preferences = await self.get_or_create_preferences(delivery_log.client_id)
            preferences.total_emails_clicked += 1
        elif status == "bounced":
            delivery_log.bounced_at = datetime.utcnow()

            # Update bounce tracking
            preferences = await self.get_or_create_preferences(delivery_log.client_id)
            preferences.bounce_count += 1
            preferences.last_bounce_date = datetime.utcnow()

            # Add to suppression list for hard bounces
            if additional_data and additional_data.get("bounce_type") == "hard":
                await self.add_to_suppression_list(
                    email_address=delivery_log.email_address,
                    suppression_type=SuppressionType.BOUNCE_HARD,
                    reason=additional_data.get("bounce_reason"),
                    client_id=delivery_log.client_id,
                    campaign_id=delivery_log.campaign_id,
                    bounce_type=additional_data.get("bounce_type"),
                    bounce_subtype=additional_data.get("bounce_subtype"),
                )
        elif status == "complained":
            delivery_log.complained_at = datetime.utcnow()

            # Update complaint tracking
            preferences = await self.get_or_create_preferences(delivery_log.client_id)
            preferences.complaint_count += 1
            preferences.last_complaint_date = datetime.utcnow()

            # Add to suppression list
            await self.add_to_suppression_list(
                email_address=delivery_log.email_address,
                suppression_type=SuppressionType.COMPLAINT,
                reason="Spam complaint",
                client_id=delivery_log.client_id,
                campaign_id=delivery_log.campaign_id,
            )

        # Update additional data
        if additional_data:
            for field, value in additional_data.items():
                if hasattr(delivery_log, field):
                    setattr(delivery_log, field, value)

        self.db.commit()
        logger.info(f"Updated delivery status for {delivery_id}: {status}")

    # Analytics and Reporting
    async def get_client_email_stats(self, client_id: int) -> Dict[str, Any]:
        """Get email statistics for a client"""
        preferences = await self.get_or_create_preferences(client_id)

        # Get delivery stats
        delivery_stats = (
            self.db.query(
                func.count(EmailDeliveryLog.id).label("total_emails"),
                func.count(EmailDeliveryLog.delivered_at).label("delivered"),
                func.count(EmailDeliveryLog.opened_at).label("opened"),
                func.count(EmailDeliveryLog.first_clicked_at).label("clicked"),
                func.count(EmailDeliveryLog.bounced_at).label("bounced"),
                func.count(EmailDeliveryLog.complained_at).label("complained"),
            )
            .filter(EmailDeliveryLog.client_id == client_id)
            .first()
        )

        # Calculate rates
        total_sent = delivery_stats.total_emails or 0
        delivered = delivery_stats.delivered or 0

        open_rate = (delivery_stats.opened / delivered * 100) if delivered > 0 else 0
        click_rate = (delivery_stats.clicked / delivered * 100) if delivered > 0 else 0
        bounce_rate = (
            (delivery_stats.bounced / total_sent * 100) if total_sent > 0 else 0
        )

        return {
            "client_id": client_id,
            "email_address": preferences.email_address,
            "is_subscribed": preferences.is_subscribed,
            "subscription_date": (
                preferences.subscription_date.isoformat()
                if preferences.subscription_date
                else None
            ),
            "frequency_preference": preferences.frequency_preference,
            "client_tier": preferences.client_tier,
            "segment_tags": preferences.segment_tags,
            "total_sent": total_sent,
            "total_delivered": delivered,
            "total_opened": delivery_stats.opened or 0,
            "total_clicked": delivery_stats.clicked or 0,
            "total_bounced": delivery_stats.bounced or 0,
            "total_complained": delivery_stats.complained or 0,
            "open_rate": round(open_rate, 2),
            "click_rate": round(click_rate, 2),
            "bounce_rate": round(bounce_rate, 2),
            "last_email_sent": (
                preferences.last_email_sent.isoformat()
                if preferences.last_email_sent
                else None
            ),
            "campaign_preferences": preferences.campaign_preferences,
        }

    async def get_overall_email_stats(self) -> Dict[str, Any]:
        """Get overall email system statistics"""
        # Subscription stats
        subscription_stats = self.db.query(
            func.count(EmailPreferences.id).label("total_preferences"),
            func.count(EmailPreferences.id)
            .filter(EmailPreferences.is_subscribed == True)
            .label("subscribed"),
            func.count(EmailPreferences.id)
            .filter(EmailPreferences.is_subscribed == False)
            .label("unsubscribed"),
        ).first()

        # Delivery stats (last 30 days)
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        delivery_stats = (
            self.db.query(
                func.count(EmailDeliveryLog.id).label("total_sent"),
                func.count(EmailDeliveryLog.delivered_at).label("delivered"),
                func.count(EmailDeliveryLog.opened_at).label("opened"),
                func.count(EmailDeliveryLog.first_clicked_at).label("clicked"),
                func.count(EmailDeliveryLog.bounced_at).label("bounced"),
                func.count(EmailDeliveryLog.complained_at).label("complained"),
            )
            .filter(EmailDeliveryLog.created_at >= thirty_days_ago)
            .first()
        )

        # Suppression stats
        suppression_stats = self.db.query(
            func.count(EmailSuppressionList.id).label("total_suppressed"),
            func.count(EmailSuppressionList.id)
            .filter(
                EmailSuppressionList.suppression_type
                == SuppressionType.UNSUBSCRIBE.value
            )
            .label("unsubscribed"),
            func.count(EmailSuppressionList.id)
            .filter(
                EmailSuppressionList.suppression_type
                == SuppressionType.BOUNCE_HARD.value
            )
            .label("hard_bounces"),
            func.count(EmailSuppressionList.id)
            .filter(
                EmailSuppressionList.suppression_type == SuppressionType.COMPLAINT.value
            )
            .label("complaints"),
        ).first()

        # Calculate rates
        total_sent = delivery_stats.total_sent or 0
        delivered = delivery_stats.delivered or 0

        overall_open_rate = (
            (delivery_stats.opened / delivered * 100) if delivered > 0 else 0
        )
        overall_click_rate = (
            (delivery_stats.clicked / delivered * 100) if delivered > 0 else 0
        )
        overall_bounce_rate = (
            (delivery_stats.bounced / total_sent * 100) if total_sent > 0 else 0
        )

        return {
            "subscription_stats": {
                "total_preferences": subscription_stats.total_preferences or 0,
                "subscribed": subscription_stats.subscribed or 0,
                "unsubscribed": subscription_stats.unsubscribed or 0,
                "subscription_rate": (
                    (
                        subscription_stats.subscribed
                        / subscription_stats.total_preferences
                        * 100
                    )
                    if subscription_stats.total_preferences > 0
                    else 0
                ),
            },
            "delivery_stats_30_days": {
                "total_sent": total_sent,
                "total_delivered": delivered,
                "total_opened": delivery_stats.opened or 0,
                "total_clicked": delivery_stats.clicked or 0,
                "total_bounced": delivery_stats.bounced or 0,
                "total_complained": delivery_stats.complained or 0,
                "open_rate": round(overall_open_rate, 2),
                "click_rate": round(overall_click_rate, 2),
                "bounce_rate": round(overall_bounce_rate, 2),
            },
            "suppression_stats": {
                "total_suppressed": suppression_stats.total_suppressed or 0,
                "unsubscribed": suppression_stats.unsubscribed or 0,
                "hard_bounces": suppression_stats.hard_bounces or 0,
                "complaints": suppression_stats.complaints or 0,
            },
        }

    # Compliance and Management
    async def can_send_email(
        self, client_id: int, campaign_type: Optional[str] = None
    ) -> Dict[str, Any]:
        """Check if we can send email to a client"""
        preferences = await self.get_or_create_preferences(client_id)

        # Check basic subscription status
        if not preferences.is_subscribed:
            return {
                "can_send": False,
                "reason": "Client is unsubscribed",
                "preferences": preferences,
            }

        # Check suppression list
        is_suppressed = await self.is_suppressed(preferences.email_address)
        if is_suppressed:
            return {
                "can_send": False,
                "reason": "Email address is suppressed",
                "preferences": preferences,
            }

        # Check campaign-specific preferences
        if campaign_type and campaign_type in preferences.campaign_preferences:
            if not preferences.campaign_preferences[campaign_type]:
                return {
                    "can_send": False,
                    "reason": f"Client opted out of {campaign_type} emails",
                    "preferences": preferences,
                }

        # Check frequency limits
        if preferences.frequency_preference == FrequencyPreference.NEVER.value:
            return {
                "can_send": False,
                "reason": "Client prefers no emails",
                "preferences": preferences,
            }

        # Check weekly email limit
        if preferences.max_emails_per_week and preferences.max_emails_per_week > 0:
            week_ago = datetime.utcnow() - timedelta(days=7)
            recent_emails = (
                self.db.query(EmailDeliveryLog)
                .filter(
                    EmailDeliveryLog.client_id == client_id,
                    EmailDeliveryLog.sent_at >= week_ago,
                )
                .count()
            )

            if recent_emails >= preferences.max_emails_per_week:
                return {
                    "can_send": False,
                    "reason": f"Weekly email limit reached ({recent_emails}/{preferences.max_emails_per_week})",
                    "preferences": preferences,
                }

        return {"can_send": True, "reason": "OK to send", "preferences": preferences}

    # Utility Methods
    def _generate_token(self) -> str:
        """Generate a secure token for unsubscribe/preferences"""
        return hashlib.sha256(secrets.token_bytes(32)).hexdigest()

    async def cleanup_old_delivery_logs(self, days_to_keep: int = 90):
        """Clean up old delivery logs"""
        cutoff_date = datetime.utcnow() - timedelta(days=days_to_keep)

        deleted_count = (
            self.db.query(EmailDeliveryLog)
            .filter(EmailDeliveryLog.created_at < cutoff_date)
            .delete()
        )

        self.db.commit()
        logger.info(f"Cleaned up {deleted_count} old delivery logs")
        return deleted_count


# Global service instance
email_preferences_service = None


def get_email_preferences_service() -> EmailPreferencesService:
    """Get email preferences service instance"""
    global email_preferences_service
    if not email_preferences_service:
        db = next(get_db())
        email_preferences_service = EmailPreferencesService(db)
    return email_preferences_service
