"""
Comprehensive Payout Notification Service
Handles email and SMS notifications for payout-related events with
advance notice, delivery tracking, retry logic, and preference management
"""

import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
import asyncio
from enum import Enum
import json

from config.database import get_db
from models.barber import Barber
from models.compensation_plan import CompensationPlan, PaymentHistory
from models.communication import (
    EmailLog,
    SMSLog,
    NotificationPreference,
    EmailStatus,
    SMSStatus,
    CommunicationType,
)
from models.notification import Notification, NotificationType, NotificationPriority
from services.email_service import email_service
from services.sms_service import sms_service
from utils.logging import get_logger

logger = get_logger(__name__)


class PayoutNotificationType(str, Enum):
    """Types of payout notifications"""

    ADVANCE_NOTICE = "advance_notice"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    RETRY = "retry"
    SUMMARY = "summary"


class PayoutNotificationService:
    """Comprehensive service for payout notifications"""

    def __init__(self):
        self.email_service = email_service
        self.sms_service = sms_service
        self.max_retry_attempts = 3
        self.retry_delay_minutes = [5, 15, 60]  # Progressive delays

    def get_barber_preferences(
        self, db: Session, barber_id: int
    ) -> Optional[NotificationPreference]:
        """Get notification preferences for a barber"""
        barber = db.query(Barber).filter(Barber.id == barber_id).first()
        if not barber or not barber.user_id:
            return None

        preferences = (
            db.query(NotificationPreference)
            .filter(NotificationPreference.user_id == barber.user_id)
            .first()
        )

        # Create default preferences if not exist
        if not preferences:
            preferences = NotificationPreference(
                user_id=barber.user_id,
                email_payment_receipt=True,
                sms_payment_confirmation=True,
            )
            db.add(preferences)
            db.commit()

        return preferences

    def should_send_notification(
        self,
        preferences: NotificationPreference,
        channel: str,
        notification_type: PayoutNotificationType,
    ) -> bool:
        """Check if notification should be sent based on preferences"""
        if not preferences:
            return True  # Default to sending if no preferences

        # Check quiet hours if enabled
        if preferences.quiet_hours_enabled:
            current_hour = datetime.now().hour
            if preferences.quiet_hours_start > preferences.quiet_hours_end:
                # Quiet hours span midnight
                if (
                    current_hour >= preferences.quiet_hours_start
                    or current_hour < preferences.quiet_hours_end
                ):
                    logger.info(
                        f"Skipping notification during quiet hours ({current_hour})"
                    )
                    return False
            else:
                # Normal quiet hours
                if (
                    preferences.quiet_hours_start
                    <= current_hour
                    < preferences.quiet_hours_end
                ):
                    logger.info(
                        f"Skipping notification during quiet hours ({current_hour})"
                    )
                    return False

        # Check channel preferences
        if channel == "email":
            return preferences.email_payment_receipt
        elif channel == "sms":
            return preferences.sms_payment_confirmation

        return True

    async def send_advance_payout_notice(
        self,
        db: Session,
        plan: CompensationPlan,
        payout_date: datetime,
        estimated_amount: float,
        hours_before: int = 24,
    ) -> Dict[str, bool]:
        """Send advance notice of upcoming payout"""
        try:
            barber = db.query(Barber).filter(Barber.id == plan.barber_id).first()
            if not barber:
                logger.error(f"Barber {plan.barber_id} not found")
                return {"email": False, "sms": False}

            preferences = self.get_barber_preferences(db, barber.id)

            # Calculate when payout will happen
            payout_time = payout_date.strftime("%I:%M %p")
            payout_day = payout_date.strftime("%A, %B %d")

            context = {
                "barber_name": barber.name,
                "payout_date": payout_day,
                "payout_time": payout_time,
                "estimated_amount": estimated_amount,
                "hours_before": hours_before,
                "payout_method": plan.payout_settings.get("method", "stripe")
                .replace("_", " ")
                .title(),
            }

            results = {"email": False, "sms": False}

            # Send email notification
            if barber.email and self.should_send_notification(
                preferences, "email", PayoutNotificationType.ADVANCE_NOTICE
            ):
                email_sent = await self._send_email_with_retry(
                    db=db,
                    to_email=barber.email,
                    subject=f"Upcoming Payout - ${estimated_amount:.2f}",
                    template_name="payout_advance_notice",
                    context=context,
                    barber_id=barber.id,
                )
                results["email"] = email_sent

            # Send SMS notification
            if barber.phone and self.should_send_notification(
                preferences, "sms", PayoutNotificationType.ADVANCE_NOTICE
            ):
                sms_message = (
                    f"Hi {barber.name}, your payout of ${estimated_amount:.2f} "
                    f"will be processed on {payout_day} at {payout_time}. "
                    f"Reply STOP to unsubscribe."
                )
                sms_sent = await self._send_sms_with_retry(
                    db=db,
                    to_number=barber.phone,
                    message=sms_message,
                    barber_id=barber.id,
                )
                results["sms"] = sms_sent

            # Create in-app notification
            await self._create_in_app_notification(
                db=db,
                barber=barber,
                notification_type=PayoutNotificationType.ADVANCE_NOTICE,
                title="Upcoming Payout",
                message=f"Your payout of ${estimated_amount:.2f} will be processed on {payout_day}",
                data=context,
            )

            return results

        except Exception as e:
            logger.error(f"Error sending advance payout notice: {str(e)}")
            return {"email": False, "sms": False}

    async def send_payout_processing(
        self,
        db: Session,
        plan: CompensationPlan,
        amount: float,
        payment_history: PaymentHistory,
    ) -> Dict[str, bool]:
        """Send notification that payout is being processed"""
        try:
            barber = db.query(Barber).filter(Barber.id == plan.barber_id).first()
            if not barber:
                logger.error(f"Barber {plan.barber_id} not found")
                return {"email": False, "sms": False}

            preferences = self.get_barber_preferences(db, barber.id)

            context = {
                "barber_name": barber.name,
                "amount": amount,
                "payment_id": payment_history.id,
                "payment_method": payment_history.payment_method.replace(
                    "_", " "
                ).title(),
                "period_start": payment_history.payment_period_start.strftime(
                    "%m/%d/%Y"
                ),
                "period_end": payment_history.payment_period_end.strftime("%m/%d/%Y"),
                "commission_count": payment_history.payment_breakdown.get(
                    "commissions_count", 0
                ),
            }

            results = {"email": False, "sms": False}

            # Send email notification
            if barber.email and self.should_send_notification(
                preferences, "email", PayoutNotificationType.PROCESSING
            ):
                email_sent = await self._send_email_with_retry(
                    db=db,
                    to_email=barber.email,
                    subject=f"Payout Processing - ${amount:.2f}",
                    template_name="payout_processing",
                    context=context,
                    barber_id=barber.id,
                )
                results["email"] = email_sent

            # Send SMS notification
            if barber.phone and self.should_send_notification(
                preferences, "sms", PayoutNotificationType.PROCESSING
            ):
                sms_message = (
                    f"Your payout of ${amount:.2f} is being processed. "
                    f"You'll receive another notification when complete."
                )
                sms_sent = await self._send_sms_with_retry(
                    db=db,
                    to_number=barber.phone,
                    message=sms_message,
                    barber_id=barber.id,
                )
                results["sms"] = sms_sent

            # Create in-app notification
            await self._create_in_app_notification(
                db=db,
                barber=barber,
                notification_type=PayoutNotificationType.PROCESSING,
                title="Payout Processing",
                message=f"Your payout of ${amount:.2f} is being processed",
                data=context,
                priority=NotificationPriority.HIGH,
            )

            return results

        except Exception as e:
            logger.error(f"Error sending payout processing notification: {str(e)}")
            return {"email": False, "sms": False}

    async def send_payout_completed(
        self,
        db: Session,
        plan: CompensationPlan,
        amount: float,
        payment_history: PaymentHistory,
    ) -> Dict[str, bool]:
        """Send notification that payout has been completed"""
        try:
            barber = db.query(Barber).filter(Barber.id == plan.barber_id).first()
            if not barber:
                logger.error(f"Barber {plan.barber_id} not found")
                return {"email": False, "sms": False}

            preferences = self.get_barber_preferences(db, barber.id)

            # Calculate expected arrival time based on method
            payment_method = payment_history.payment_method
            if "instant" in payment_method:
                arrival_time = "within minutes"
            elif "standard" in payment_method:
                arrival_time = "within 1-3 business days"
            else:
                arrival_time = "according to your payment method"

            context = {
                "barber_name": barber.name,
                "amount": amount,
                "payment_id": payment_history.id,
                "payment_reference": payment_history.payment_reference,
                "payment_method": payment_method.replace("_", " ").title(),
                "arrival_time": arrival_time,
                "period_start": payment_history.payment_period_start.strftime(
                    "%m/%d/%Y"
                ),
                "period_end": payment_history.payment_period_end.strftime("%m/%d/%Y"),
                "gross_amount": payment_history.gross_amount,
                "deductions": payment_history.deductions,
                "net_amount": payment_history.net_amount,
                "commission_count": payment_history.payment_breakdown.get(
                    "commissions_count", 0
                ),
            }

            results = {"email": False, "sms": False}

            # Send email notification with receipt
            if barber.email and self.should_send_notification(
                preferences, "email", PayoutNotificationType.COMPLETED
            ):
                email_sent = await self._send_email_with_retry(
                    db=db,
                    to_email=barber.email,
                    subject=f"Payout Completed - ${amount:.2f}",
                    template_name="payout_completed",
                    context=context,
                    barber_id=barber.id,
                )
                results["email"] = email_sent

            # Send SMS notification
            if barber.phone and self.should_send_notification(
                preferences, "sms", PayoutNotificationType.COMPLETED
            ):
                sms_message = (
                    f"✅ Payout complete! ${amount:.2f} sent via {payment_method.replace('_', ' ')}. "
                    f"Expect funds {arrival_time}."
                )
                sms_sent = await self._send_sms_with_retry(
                    db=db,
                    to_number=barber.phone,
                    message=sms_message,
                    barber_id=barber.id,
                )
                results["sms"] = sms_sent

            # Create in-app notification
            await self._create_in_app_notification(
                db=db,
                barber=barber,
                notification_type=PayoutNotificationType.COMPLETED,
                title="Payout Completed! 💰",
                message=f"Your payout of ${amount:.2f} has been sent successfully",
                data=context,
                priority=NotificationPriority.HIGH,
                action_url=f"/payouts/{payment_history.id}",
            )

            return results

        except Exception as e:
            logger.error(f"Error sending payout completed notification: {str(e)}")
            return {"email": False, "sms": False}

    async def send_payout_failed(
        self,
        db: Session,
        plan: CompensationPlan,
        amount: float,
        error_message: str,
        retry_scheduled: bool = False,
    ) -> Dict[str, bool]:
        """Send notification that payout has failed"""
        try:
            barber = db.query(Barber).filter(Barber.id == plan.barber_id).first()
            if not barber:
                logger.error(f"Barber {plan.barber_id} not found")
                return {"email": False, "sms": False}

            preferences = self.get_barber_preferences(db, barber.id)

            context = {
                "barber_name": barber.name,
                "amount": amount,
                "error_message": error_message,
                "retry_scheduled": retry_scheduled,
                "support_email": "support@6fbplatform.com",
                "support_phone": "1-800-6FB-HELP",
            }

            results = {"email": False, "sms": False}

            # Send email notification
            if (
                barber.email
            ):  # Always send failure notifications regardless of preferences
                email_sent = await self._send_email_with_retry(
                    db=db,
                    to_email=barber.email,
                    subject=f"⚠️ Payout Failed - Action Required",
                    template_name="payout_failed",
                    context=context,
                    barber_id=barber.id,
                )
                results["email"] = email_sent

            # Send SMS notification
            if barber.phone:  # Always send failure notifications
                sms_message = (
                    f"⚠️ Payout failed for ${amount:.2f}. "
                    f"{'Will retry automatically.' if retry_scheduled else 'Please contact support.'} "
                    f"Reply HELP for assistance."
                )
                sms_sent = await self._send_sms_with_retry(
                    db=db,
                    to_number=barber.phone,
                    message=sms_message,
                    barber_id=barber.id,
                )
                results["sms"] = sms_sent

            # Create urgent in-app notification
            await self._create_in_app_notification(
                db=db,
                barber=barber,
                notification_type=PayoutNotificationType.FAILED,
                title="⚠️ Payout Failed",
                message=f"Your payout of ${amount:.2f} could not be processed",
                data=context,
                priority=NotificationPriority.URGENT,
                action_url="/payouts/failed",
            )

            return results

        except Exception as e:
            logger.error(f"Error sending payout failed notification: {str(e)}")
            return {"email": False, "sms": False}

    async def send_payout_summary(
        self,
        db: Session,
        barber_id: int,
        period: str,  # "weekly", "monthly", etc.
        summary_data: Dict[str, Any],
    ) -> Dict[str, bool]:
        """Send periodic payout summary"""
        try:
            barber = db.query(Barber).filter(Barber.id == barber_id).first()
            if not barber:
                logger.error(f"Barber {barber_id} not found")
                return {"email": False, "sms": False}

            preferences = self.get_barber_preferences(db, barber_id)

            context = {
                "barber_name": barber.name,
                "period": period,
                "total_payouts": summary_data.get("total_payouts", 0),
                "total_amount": summary_data.get("total_amount", 0),
                "average_payout": summary_data.get("average_payout", 0),
                "largest_payout": summary_data.get("largest_payout", 0),
                "commission_count": summary_data.get("commission_count", 0),
                "period_start": summary_data.get("period_start"),
                "period_end": summary_data.get("period_end"),
                "payouts": summary_data.get("payouts", []),
            }

            results = {"email": False, "sms": False}

            # Send email summary
            if barber.email and self.should_send_notification(
                preferences, "email", PayoutNotificationType.SUMMARY
            ):
                email_sent = await self._send_email_with_retry(
                    db=db,
                    to_email=barber.email,
                    subject=f"Your {period.title()} Payout Summary",
                    template_name="payout_summary",
                    context=context,
                    barber_id=barber.id,
                )
                results["email"] = email_sent

            # Don't send SMS for summaries (too long)

            # Create in-app notification
            await self._create_in_app_notification(
                db=db,
                barber=barber,
                notification_type=PayoutNotificationType.SUMMARY,
                title=f"{period.title()} Payout Summary",
                message=f"You received {summary_data.get('total_payouts', 0)} payouts totaling ${summary_data.get('total_amount', 0):.2f}",
                data=context,
                action_url="/payouts/history",
            )

            return results

        except Exception as e:
            logger.error(f"Error sending payout summary: {str(e)}")
            return {"email": False, "sms": False}

    async def _send_email_with_retry(
        self,
        db: Session,
        to_email: str,
        subject: str,
        template_name: str,
        context: Dict[str, Any],
        barber_id: int,
        attempt: int = 1,
    ) -> bool:
        """Send email with retry logic"""
        try:
            # Add unsubscribe link to context
            unsubscribe_token = self._generate_unsubscribe_token(barber_id)
            context["unsubscribe_url"] = (
                f"{context.get('website_url', '')}/unsubscribe/{unsubscribe_token}"
            )

            # Send email
            success = self.email_service.send_email(
                db=db,
                to_email=to_email,
                subject=subject,
                template_name=template_name,
                context=context,
            )

            if success:
                logger.info(f"Email sent successfully to {to_email}")
                return True

            # Retry if failed and attempts remaining
            if attempt < self.max_retry_attempts:
                delay = self.retry_delay_minutes[attempt - 1]
                logger.warning(
                    f"Email failed, retrying in {delay} minutes (attempt {attempt + 1}/{self.max_retry_attempts})"
                )

                # Schedule retry
                await asyncio.sleep(delay * 60)  # Convert to seconds
                return await self._send_email_with_retry(
                    db,
                    to_email,
                    subject,
                    template_name,
                    context,
                    barber_id,
                    attempt + 1,
                )

            logger.error(
                f"Email failed after {self.max_retry_attempts} attempts to {to_email}"
            )
            return False

        except Exception as e:
            logger.error(f"Error sending email with retry: {str(e)}")
            return False

    async def _send_sms_with_retry(
        self,
        db: Session,
        to_number: str,
        message: str,
        barber_id: int,
        attempt: int = 1,
    ) -> bool:
        """Send SMS with retry logic"""
        try:
            # Send SMS
            success = self.sms_service.send_sms(
                db=db, to_number=to_number, message=message
            )

            if success:
                logger.info(f"SMS sent successfully to {to_number}")
                return True

            # Retry if failed and attempts remaining
            if attempt < self.max_retry_attempts:
                delay = self.retry_delay_minutes[attempt - 1]
                logger.warning(
                    f"SMS failed, retrying in {delay} minutes (attempt {attempt + 1}/{self.max_retry_attempts})"
                )

                # Schedule retry
                await asyncio.sleep(delay * 60)  # Convert to seconds
                return await self._send_sms_with_retry(
                    db, to_number, message, barber_id, attempt + 1
                )

            logger.error(
                f"SMS failed after {self.max_retry_attempts} attempts to {to_number}"
            )
            return False

        except Exception as e:
            logger.error(f"Error sending SMS with retry: {str(e)}")
            return False

    async def _create_in_app_notification(
        self,
        db: Session,
        barber: Barber,
        notification_type: PayoutNotificationType,
        title: str,
        message: str,
        data: Dict[str, Any],
        priority: NotificationPriority = NotificationPriority.MEDIUM,
        action_url: Optional[str] = None,
    ):
        """Create in-app notification"""
        try:
            if not barber.user_id:
                return

            notification = Notification(
                user_id=barber.user_id,
                type=NotificationType.REVENUE,
                priority=priority,
                title=title,
                message=message,
                data={"notification_type": notification_type.value, **data},
                action_url=action_url,
            )
            db.add(notification)
            db.commit()

            # Send real-time notification if websocket available
            # This would integrate with your websocket service

        except Exception as e:
            logger.error(f"Error creating in-app notification: {str(e)}")

    def _generate_unsubscribe_token(self, barber_id: int) -> str:
        """Generate secure unsubscribe token"""
        import hashlib
        import os

        # Use a combination of barber_id and secret for security
        secret = os.getenv("UNSUBSCRIBE_SECRET", "default-secret-change-in-production")
        data = f"{barber_id}:{secret}:{datetime.utcnow().date()}"
        return hashlib.sha256(data.encode()).hexdigest()

    async def handle_unsubscribe(
        self, db: Session, token: str, preferences_update: Dict[str, bool]
    ):
        """Handle unsubscribe request"""
        # This would validate the token and update preferences
        # Implementation depends on your token validation logic
        pass

    async def update_delivery_status(self, db: Session, message_id: str, status: str):
        """Update delivery status from webhook callbacks"""
        try:
            # Update email delivery status
            email_log = (
                db.query(EmailLog).filter(EmailLog.message_id == message_id).first()
            )
            if email_log:
                if status == "delivered":
                    email_log.status = EmailStatus.DELIVERED
                    email_log.delivered_at = datetime.utcnow()
                elif status == "opened":
                    email_log.status = EmailStatus.OPENED
                    email_log.opened_at = datetime.utcnow()
                elif status == "bounced":
                    email_log.status = EmailStatus.BOUNCED
                    email_log.bounced_at = datetime.utcnow()
                db.commit()

        except Exception as e:
            logger.error(f"Error updating delivery status: {str(e)}")

    async def get_notification_analytics(
        self,
        db: Session,
        barber_id: Optional[int] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        """Get notification analytics and delivery rates"""
        try:
            # Build query filters
            filters = []
            if start_date:
                filters.append(EmailLog.created_at >= start_date)
            if end_date:
                filters.append(EmailLog.created_at <= end_date)

            # Get email stats
            email_stats = (
                db.query(EmailLog.status, func.count(EmailLog.id).label("count"))
                .filter(*filters)
                .group_by(EmailLog.status)
                .all()
            )

            # Get SMS stats
            sms_stats = (
                db.query(SMSLog.status, func.count(SMSLog.id).label("count"))
                .filter(*filters)
                .group_by(SMSLog.status)
                .all()
            )

            return {
                "email": {stat.status.value: stat.count for stat in email_stats},
                "sms": {stat.status.value: stat.count for stat in sms_stats},
                "period": {
                    "start": start_date.isoformat() if start_date else None,
                    "end": end_date.isoformat() if end_date else None,
                },
            }

        except Exception as e:
            logger.error(f"Error getting notification analytics: {str(e)}")
            return {}


# Global instance
payout_notification_service = PayoutNotificationService()
