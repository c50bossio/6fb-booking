"""
Payout Notification Integration
Integrates the payout notification service with the payout scheduler
"""

import logging
from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, func
import asyncio

from config.database import get_db
from models.compensation_plan import (
    CompensationPlan,
    PaymentHistory,
    CommissionCalculation,
)
from services.payout_notification_service import payout_notification_service
from services.payout_scheduler import payout_scheduler
from utils.logging import get_logger

logger = get_logger(__name__)


class PayoutNotificationIntegration:
    """Integrates notifications with the payout scheduling system"""

    def __init__(self):
        self.notification_service = payout_notification_service

    async def schedule_advance_notifications(self, db: Session):
        """Schedule advance notifications for upcoming payouts"""
        try:
            # Get all active compensation plans with payout settings
            plans = (
                db.query(CompensationPlan)
                .filter(
                    CompensationPlan.is_active == True,
                    CompensationPlan.payout_settings.op("->>")("enabled") == "true",
                )
                .all()
            )

            for plan in plans:
                await self._schedule_plan_notifications(db, plan)

            logger.info(f"Scheduled advance notifications for {len(plans)} plans")

        except Exception as e:
            logger.error(f"Error scheduling advance notifications: {str(e)}")

    async def _schedule_plan_notifications(self, db: Session, plan: CompensationPlan):
        """Schedule notifications for a specific plan"""
        try:
            payout_settings = plan.payout_settings
            if not payout_settings or not payout_settings.get("enabled"):
                return

            # Calculate next payout date
            next_payout_date = self._calculate_next_payout_date(plan)
            if not next_payout_date:
                return

            # Schedule 24-hour advance notice
            advance_notice_date = next_payout_date - timedelta(hours=24)
            if advance_notice_date > datetime.utcnow():
                # Calculate estimated amount
                estimated_amount = self._calculate_estimated_payout(db, plan)

                # Schedule the notification
                await self.notification_service.send_advance_payout_notice(
                    db=db,
                    plan=plan,
                    payout_date=next_payout_date,
                    estimated_amount=estimated_amount,
                    hours_before=24,
                )

            # Schedule 2-hour advance notice if enabled
            notification_settings = payout_settings.get("notification_settings", {})
            if notification_settings.get("send_2hour_notice", False):
                advance_notice_2h = next_payout_date - timedelta(hours=2)
                if advance_notice_2h > datetime.utcnow():
                    estimated_amount = self._calculate_estimated_payout(db, plan)

                    await self.notification_service.send_advance_payout_notice(
                        db=db,
                        plan=plan,
                        payout_date=next_payout_date,
                        estimated_amount=estimated_amount,
                        hours_before=2,
                    )

        except Exception as e:
            logger.error(f"Error scheduling notifications for plan {plan.id}: {str(e)}")

    def _calculate_next_payout_date(self, plan: CompensationPlan) -> Optional[datetime]:
        """Calculate the next payout date for a plan"""
        try:
            payout_settings = plan.payout_settings
            frequency = payout_settings.get("frequency", "weekly")
            time_str = payout_settings.get("time", "17:00")
            hour, minute = map(int, time_str.split(":"))

            now = datetime.utcnow()

            if frequency == "daily":
                next_date = now.replace(
                    hour=hour, minute=minute, second=0, microsecond=0
                )
                if next_date <= now:
                    next_date += timedelta(days=1)

            elif frequency == "weekly":
                day_of_week = (
                    payout_settings.get("day_of_week", 5) - 1
                )  # Convert to 0-based
                days_until = (day_of_week - now.weekday()) % 7
                if (
                    days_until == 0
                    and now.time() > datetime.strptime(time_str, "%H:%M").time()
                ):
                    days_until = 7
                next_date = now + timedelta(days=days_until)
                next_date = next_date.replace(
                    hour=hour, minute=minute, second=0, microsecond=0
                )

            elif frequency == "biweekly":
                # Calculate based on specific dates
                day_of_month = payout_settings.get("day_of_month", 15)
                # Implementation for biweekly calculation
                next_date = self._calculate_biweekly_date(
                    now, day_of_month, hour, minute
                )

            elif frequency == "monthly":
                day_of_month = payout_settings.get("day_of_month", 15)
                next_date = now.replace(
                    day=day_of_month, hour=hour, minute=minute, second=0, microsecond=0
                )
                if next_date <= now:
                    # Move to next month
                    if now.month == 12:
                        next_date = next_date.replace(year=now.year + 1, month=1)
                    else:
                        next_date = next_date.replace(month=now.month + 1)
            else:
                return None

            return next_date

        except Exception as e:
            logger.error(f"Error calculating next payout date: {str(e)}")
            return None

    def _calculate_biweekly_date(
        self, now: datetime, day_of_month: int, hour: int, minute: int
    ) -> datetime:
        """Calculate next biweekly payout date"""
        # First possible date
        first_date = now.replace(
            day=1, hour=hour, minute=minute, second=0, microsecond=0
        )
        second_date = now.replace(
            day=day_of_month, hour=hour, minute=minute, second=0, microsecond=0
        )

        # Find the next occurrence
        if now < first_date:
            return first_date
        elif now < second_date:
            return second_date
        else:
            # Move to next month
            if now.month == 12:
                return first_date.replace(year=now.year + 1, month=1)
            else:
                return first_date.replace(month=now.month + 1)

    def _calculate_estimated_payout(self, db: Session, plan: CompensationPlan) -> float:
        """Calculate estimated payout amount"""
        try:
            # Get unpaid commissions
            unpaid_commissions = (
                db.query(func.sum(CommissionCalculation.net_commission))
                .filter(
                    and_(
                        CommissionCalculation.compensation_plan_id == plan.id,
                        CommissionCalculation.is_paid == False,
                    )
                )
                .scalar()
                or 0
            )

            return float(unpaid_commissions)

        except Exception as e:
            logger.error(f"Error calculating estimated payout: {str(e)}")
            return 0.0

    async def send_payout_summary_notifications(
        self, db: Session, period: str = "weekly"
    ):
        """Send periodic payout summaries to barbers"""
        try:
            # Calculate period dates
            end_date = datetime.utcnow()
            if period == "weekly":
                start_date = end_date - timedelta(weeks=1)
            elif period == "monthly":
                start_date = end_date - timedelta(days=30)
            else:
                start_date = end_date - timedelta(days=7)

            # Get all barbers with payouts in the period
            payment_histories = (
                db.query(PaymentHistory)
                .filter(
                    and_(
                        PaymentHistory.payment_date >= start_date,
                        PaymentHistory.payment_date <= end_date,
                        PaymentHistory.payment_status == "completed",
                    )
                )
                .all()
            )

            # Group by barber
            barber_payouts = {}
            for payment in payment_histories:
                barber_id = payment.barber_id
                if barber_id not in barber_payouts:
                    barber_payouts[barber_id] = []
                barber_payouts[barber_id].append(payment)

            # Send summaries
            for barber_id, payouts in barber_payouts.items():
                summary_data = {
                    "total_payouts": len(payouts),
                    "total_amount": sum(p.net_amount for p in payouts),
                    "average_payout": sum(p.net_amount for p in payouts) / len(payouts),
                    "largest_payout": max(p.net_amount for p in payouts),
                    "commission_count": sum(
                        p.payment_breakdown.get("commissions_count", 0) for p in payouts
                    ),
                    "period_start": start_date.strftime("%m/%d/%Y"),
                    "period_end": end_date.strftime("%m/%d/%Y"),
                    "payouts": [
                        {
                            "date": p.payment_date.strftime("%m/%d/%Y"),
                            "amount": p.net_amount,
                            "method": p.payment_method.replace("_", " ").title(),
                        }
                        for p in sorted(
                            payouts, key=lambda x: x.payment_date, reverse=True
                        )
                    ],
                }

                await self.notification_service.send_payout_summary(
                    db=db, barber_id=barber_id, period=period, summary_data=summary_data
                )

            logger.info(f"Sent {period} summaries to {len(barber_payouts)} barbers")

        except Exception as e:
            logger.error(f"Error sending payout summaries: {str(e)}")

    def enhance_payout_scheduler(self):
        """Enhance the existing payout scheduler with notification hooks"""

        # Store original process_payout method
        original_process_payout = payout_scheduler.process_payout

        # Create enhanced version
        async def enhanced_process_payout(plan_id: int):
            """Enhanced payout processing with notifications"""
            db = next(get_db())
            try:
                plan = (
                    db.query(CompensationPlan)
                    .filter(CompensationPlan.id == plan_id)
                    .first()
                )

                if not plan:
                    return

                # Calculate payout amount
                amount = self._calculate_estimated_payout(db, plan)

                # Send processing notification
                await self.notification_service.send_payout_processing(
                    db=db,
                    plan=plan,
                    amount=amount,
                    payment_history=None,  # Will be updated after creation
                )

                # Call original method
                result = original_process_payout(plan_id)

                # After payout is processed, send appropriate notification
                # This would need to be integrated with the actual payout result

                return result

            except Exception as e:
                logger.error(f"Error in enhanced payout processing: {str(e)}")
                # Send failure notification
                await self.notification_service.send_payout_failed(
                    db=db,
                    plan=plan,
                    amount=amount,
                    error_message=str(e),
                    retry_scheduled=True,
                )
                raise
            finally:
                db.close()

        # Replace method
        payout_scheduler.process_payout = enhanced_process_payout

        logger.info("Enhanced payout scheduler with notification hooks")

    async def run_notification_scheduler(self):
        """Run periodic notification tasks"""
        while True:
            try:
                db = next(get_db())

                # Schedule advance notifications
                await self.schedule_advance_notifications(db)

                # Send weekly summaries on Mondays
                if datetime.utcnow().weekday() == 0:  # Monday
                    await self.send_payout_summary_notifications(db, "weekly")

                # Send monthly summaries on the 1st
                if datetime.utcnow().day == 1:
                    await self.send_payout_summary_notifications(db, "monthly")

                db.close()

                # Wait before next check (1 hour)
                await asyncio.sleep(3600)

            except Exception as e:
                logger.error(f"Error in notification scheduler: {str(e)}")
                await asyncio.sleep(300)  # Wait 5 minutes on error


# Global instance
payout_notification_integration = PayoutNotificationIntegration()


# Function to initialize the integration
def initialize_payout_notifications():
    """Initialize payout notification integration"""
    try:
        # Enhance the payout scheduler
        payout_notification_integration.enhance_payout_scheduler()

        # Start the notification scheduler
        import asyncio

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.create_task(payout_notification_integration.run_notification_scheduler())

        logger.info("Payout notification integration initialized")

    except Exception as e:
        logger.error(f"Failed to initialize payout notifications: {str(e)}")
