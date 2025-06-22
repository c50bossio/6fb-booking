"""
Automated Payout Scheduler Service
Handles the scheduling and execution of barber payouts
"""

import logging
from datetime import datetime, timedelta
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

from config.database import get_db
from models.compensation_plan import (
    CompensationPlan,
    CommissionCalculation,
    PaymentHistory,
)
from models.barber import Barber
from services.stripe_connect_service import StripeConnectService
from services.notification_service import NotificationService

logger = logging.getLogger(__name__)


class PayoutScheduler:
    def __init__(self):
        self.scheduler = BackgroundScheduler()
        self.stripe_service = StripeConnectService()
        self.notification_service = NotificationService()

    def start(self):
        """Start the payout scheduler"""
        if not self.scheduler.running:
            self.scheduler.start()
            logger.info("Payout scheduler started")

    def stop(self):
        """Stop the payout scheduler"""
        if self.scheduler.running:
            self.scheduler.shutdown()
            logger.info("Payout scheduler stopped")

    def schedule_all_payouts(self, db: Session):
        """Schedule payouts for all active compensation plans"""
        try:
            # Get all active compensation plans with payout settings enabled
            plans = (
                db.query(CompensationPlan)
                .filter(
                    CompensationPlan.is_active == True,
                    CompensationPlan.payout_settings.op("->>")("enabled") == "true",
                )
                .all()
            )

            for plan in plans:
                self.schedule_payout_for_plan(plan)

            logger.info(f"Scheduled payouts for {len(plans)} compensation plans")

        except Exception as e:
            logger.error(f"Error scheduling payouts: {str(e)}")

    def schedule_payout_for_plan(self, plan: CompensationPlan):
        """Schedule payout for a specific compensation plan"""
        try:
            payout_settings = plan.payout_settings
            if not payout_settings or not payout_settings.get("enabled"):
                return

            frequency = payout_settings.get("frequency", "weekly")
            time_str = payout_settings.get("time", "17:00")
            hour, minute = map(int, time_str.split(":"))

            job_id = f"payout_plan_{plan.id}"

            # Remove existing job if it exists
            if self.scheduler.get_job(job_id):
                self.scheduler.remove_job(job_id)

            if frequency == "daily":
                trigger = CronTrigger(hour=hour, minute=minute)
            elif frequency == "weekly":
                day_of_week = payout_settings.get("day_of_week", 5)  # Friday
                trigger = CronTrigger(
                    day_of_week=day_of_week - 1, hour=hour, minute=minute
                )  # 0=Monday
            elif frequency == "biweekly":
                # Run on 1st and 15th (or specified day) of month
                day_of_month = payout_settings.get("day_of_month", 15)
                trigger = CronTrigger(
                    day="1,{}".format(day_of_month), hour=hour, minute=minute
                )
            elif frequency == "monthly":
                day_of_month = payout_settings.get("day_of_month", 15)
                trigger = CronTrigger(day=day_of_month, hour=hour, minute=minute)
            else:
                logger.warning(f"Unknown payout frequency: {frequency}")
                return

            # Schedule the job
            self.scheduler.add_job(
                func=self.process_payout,
                trigger=trigger,
                args=[plan.id],
                id=job_id,
                name=f"Payout for Plan {plan.id}",
                replace_existing=True,
            )

            logger.info(f"Scheduled {frequency} payout for plan {plan.id}")

        except Exception as e:
            logger.error(f"Error scheduling payout for plan {plan.id}: {str(e)}")

    def process_payout(self, plan_id: int):
        """Process payout for a specific compensation plan"""
        db = next(get_db())
        try:
            plan = (
                db.query(CompensationPlan)
                .filter(CompensationPlan.id == plan_id)
                .first()
            )
            if not plan or not plan.is_active:
                logger.warning(f"Plan {plan_id} not found or inactive")
                return

            payout_settings = plan.payout_settings
            if not payout_settings or not payout_settings.get("enabled"):
                logger.warning(f"Payout not enabled for plan {plan_id}")
                return

            # Calculate payout period
            frequency = payout_settings.get("frequency", "weekly")
            end_date = datetime.utcnow()

            if frequency == "daily":
                start_date = end_date - timedelta(days=1)
            elif frequency == "weekly":
                start_date = end_date - timedelta(weeks=1)
            elif frequency == "biweekly":
                start_date = end_date - timedelta(weeks=2)
            elif frequency == "monthly":
                start_date = end_date.replace(day=1)  # Start of current month
            else:
                logger.error(f"Unknown frequency: {frequency}")
                return

            # Apply hold period
            hold_days = payout_settings.get("hold_days", 0)
            cutoff_date = end_date - timedelta(days=hold_days)

            # Get unpaid commissions within the period
            unpaid_commissions = (
                db.query(CommissionCalculation)
                .filter(
                    and_(
                        CommissionCalculation.compensation_plan_id == plan_id,
                        CommissionCalculation.is_paid == False,
                        CommissionCalculation.calculation_date >= start_date,
                        CommissionCalculation.calculation_date <= cutoff_date,
                    )
                )
                .all()
            )

            if not unpaid_commissions:
                logger.info(f"No unpaid commissions found for plan {plan_id}")
                return

            # Calculate total payout amount
            total_gross = sum(c.gross_commission for c in unpaid_commissions)
            total_deductions = sum(c.deduction_amount for c in unpaid_commissions)
            total_net = sum(c.net_commission for c in unpaid_commissions)

            # Check minimum payout amount
            minimum_payout = payout_settings.get("minimum_payout", 0)
            if total_net < minimum_payout:
                logger.info(
                    f"Payout amount ${total_net} below minimum ${minimum_payout} for plan {plan_id}"
                )
                return

            # Process the payout
            payout_success = self.execute_payout(plan, total_net, payout_settings)

            if payout_success:
                # Mark commissions as paid
                for commission in unpaid_commissions:
                    commission.is_paid = True
                    commission.paid_date = datetime.utcnow()
                    commission.payment_reference = f"payout_{plan_id}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"

                # Create payment history record
                payment_history = PaymentHistory(
                    compensation_plan_id=plan_id,
                    barber_id=plan.barber_id,
                    payment_type="commission",
                    payment_period_start=start_date,
                    payment_period_end=end_date,
                    gross_amount=total_gross,
                    deductions=total_deductions,
                    net_amount=total_net,
                    payment_method=payout_settings.get("method", "stripe_instant"),
                    payment_status="completed",
                    payment_date=datetime.utcnow(),
                    payment_breakdown={
                        "commissions_count": len(unpaid_commissions),
                        "gross_commission": total_gross,
                        "total_deductions": total_deductions,
                        "net_payout": total_net,
                    },
                )

                db.add(payment_history)
                db.commit()

                # Send notifications
                if payout_settings.get("notification_settings", {}).get(
                    "send_payout_notification", True
                ):
                    self.send_payout_notification(plan, total_net, payment_history)

                logger.info(
                    f"Successfully processed payout of ${total_net} for plan {plan_id}"
                )
            else:
                logger.error(f"Failed to process payout for plan {plan_id}")

        except Exception as e:
            logger.error(f"Error processing payout for plan {plan_id}: {str(e)}")
            db.rollback()
        finally:
            db.close()

    def execute_payout(
        self, plan: CompensationPlan, amount: float, payout_settings: dict
    ) -> bool:
        """Execute the actual payout using the specified method"""
        try:
            method = payout_settings.get("method", "stripe_instant")

            if method in ["stripe_instant", "stripe_standard"]:
                # Use Stripe Connect to transfer funds
                return self.stripe_service.transfer_to_barber(
                    barber_id=plan.barber_id,
                    amount=amount,
                    instant=method == "stripe_instant",
                )
            elif method == "bank_transfer":
                # Integrate with bank transfer API
                logger.info(
                    f"Bank transfer of ${amount} initiated for barber {plan.barber_id}"
                )
                return True  # Placeholder
            elif method in ["check", "cash"]:
                # Manual payment methods - just log for now
                logger.info(
                    f"Manual {method} payment of ${amount} due for barber {plan.barber_id}"
                )
                return True
            else:
                logger.error(f"Unknown payout method: {method}")
                return False

        except Exception as e:
            logger.error(f"Error executing payout: {str(e)}")
            return False

    def send_payout_notification(
        self, plan: CompensationPlan, amount: float, payment_history: PaymentHistory
    ):
        """Send payout notification to barber"""
        try:
            # Get barber details
            db = next(get_db())
            barber = db.query(Barber).filter(Barber.id == plan.barber_id).first()

            if barber and barber.email:
                subject = f"Payout Processed - ${amount:.2f}"

                message = f"""
                Hi {barber.name},

                Your payout has been processed successfully!

                Payout Details:
                - Amount: ${amount:.2f}
                - Period: {payment_history.payment_period_start.strftime('%m/%d/%Y')} - {payment_history.payment_period_end.strftime('%m/%d/%Y')}
                - Method: {payment_history.payment_method.replace('_', ' ').title()}
                - Date: {payment_history.payment_date.strftime('%m/%d/%Y %I:%M %p')}

                You should receive the funds according to your selected payout method.

                Best regards,
                The Team
                """

                self.notification_service.send_email(
                    to_email=barber.email, subject=subject, message=message
                )

        except Exception as e:
            logger.error(f"Error sending payout notification: {str(e)}")


# Global payout scheduler instance
payout_scheduler = PayoutScheduler()
