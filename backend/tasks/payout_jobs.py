"""
Automated Payout Processing Jobs
Handles all background tasks related to barber payouts with Celery
"""

import logging
import json
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any
from decimal import Decimal
from celery import Task, group, chain
from celery.exceptions import SoftTimeLimitExceeded, MaxRetriesExceededError
from sqlalchemy.orm import Session
from sqlalchemy import and_, func, or_

from config.celery_config import celery_app
from config.database import get_db
from models.barber_payment import BarberPayment, PayoutStatus
from models.compensation_plan import (
    CompensationPlan,
    CommissionCalculation,
    PaymentHistory,
)
from models.barber import Barber
from models.payout_schedule import PayoutSchedule
from services.stripe_connect_service import StripeConnectService
from services.square_payouts_service import SquarePayoutsService
from services.notification_service import NotificationService
from services.monitoring_service import MonitoringService
from utils.logging import get_logger

logger = get_logger(__name__)

# Initialize services
stripe_service = StripeConnectService()
square_service = SquarePayoutsService()
notification_service = NotificationService()
monitoring_service = MonitoringService()


class PayoutTask(Task):
    """Base task class with common retry and error handling logic"""

    autoretry_for = (Exception,)
    retry_kwargs = {"max_retries": 5}
    retry_backoff = True
    retry_backoff_max = 600  # Max 10 minutes between retries
    retry_jitter = True  # Add randomness to retry delays

    def on_failure(self, exc, task_id, args, kwargs, einfo):
        """Handle task failure"""
        logger.error(
            f"Task {self.name} failed permanently",
            extra={
                "task_id": task_id,
                "args": args,
                "kwargs": kwargs,
                "exception": str(exc),
                "traceback": str(einfo),
            },
        )

        # Send alert for critical failures
        monitoring_service.send_alert(
            alert_type="payout_task_failure",
            severity="high",
            details={
                "task_name": self.name,
                "task_id": task_id,
                "error": str(exc),
            },
        )

    def on_retry(self, exc, task_id, args, kwargs, einfo):
        """Handle task retry"""
        logger.warning(
            f"Task {self.name} retrying",
            extra={
                "task_id": task_id,
                "retry_count": self.request.retries,
                "exception": str(exc),
            },
        )


@celery_app.task(
    bind=True, base=PayoutTask, name="tasks.payout_jobs.process_daily_payouts"
)
def process_daily_payouts(self):
    """
    Main task to process all due payouts for the day
    Runs daily and checks all compensation plans for due payouts
    """
    logger.info("Starting daily payout processing")

    db = next(get_db())
    processed_count = 0
    failed_count = 0
    total_amount = Decimal("0.00")

    try:
        # Get all active payout schedules due today
        today = datetime.utcnow().date()
        due_schedules = (
            db.query(PayoutSchedule)
            .filter(
                PayoutSchedule.is_active == True,
                PayoutSchedule.next_payout_date <= today,
            )
            .all()
        )

        logger.info(f"Found {len(due_schedules)} payout schedules due for processing")

        # Group payouts by priority
        high_priority = []
        normal_priority = []

        for schedule in due_schedules:
            payout_data = {
                "schedule_id": schedule.id,
                "barber_id": schedule.barber_id,
                "plan_id": schedule.compensation_plan_id,
            }

            # Check if this is a high-value or priority payout
            if schedule.priority == "high" or schedule.estimated_amount > 1000:
                high_priority.append(payout_data)
            else:
                normal_priority.append(payout_data)

        # Process high priority payouts first
        for payout in high_priority:
            task = process_single_payout.apply_async(
                args=[payout["schedule_id"]],
                priority=9,
                queue="payouts",
            )
            logger.info(f"Queued high priority payout task: {task.id}")

        # Process normal priority payouts
        for payout in normal_priority:
            task = process_single_payout.apply_async(
                args=[payout["schedule_id"]],
                priority=5,
                queue="payouts",
            )
            logger.info(f"Queued normal priority payout task: {task.id}")

        # Update daily processing metrics
        monitoring_service.record_metric(
            metric_name="daily_payouts_initiated",
            value=len(due_schedules),
            tags={
                "high_priority": len(high_priority),
                "normal_priority": len(normal_priority),
            },
        )

        return {
            "status": "success",
            "total_scheduled": len(due_schedules),
            "high_priority": len(high_priority),
            "normal_priority": len(normal_priority),
            "processing_date": today.isoformat(),
        }

    except Exception as e:
        logger.error(f"Error in daily payout processing: {str(e)}")
        monitoring_service.send_alert(
            alert_type="daily_payout_processing_error",
            severity="critical",
            details={"error": str(e)},
        )
        raise
    finally:
        db.close()


@celery_app.task(
    bind=True, base=PayoutTask, name="tasks.payout_jobs.process_single_payout"
)
def process_single_payout(self, schedule_id: int):
    """
    Process a single payout for a specific schedule
    This is the core payout processing logic
    """
    logger.info(f"Processing payout for schedule {schedule_id}")

    db = next(get_db())

    try:
        # Get the payout schedule
        schedule = (
            db.query(PayoutSchedule).filter(PayoutSchedule.id == schedule_id).first()
        )

        if not schedule:
            logger.error(f"Payout schedule {schedule_id} not found")
            return {"status": "error", "message": "Schedule not found"}

        # Lock the schedule to prevent concurrent processing
        schedule.processing_status = "processing"
        schedule.last_processed = datetime.utcnow()
        db.commit()

        # Calculate payout period
        end_date = datetime.utcnow()
        start_date = self._calculate_period_start(schedule.frequency, end_date)

        # Apply hold period
        cutoff_date = end_date - timedelta(days=schedule.hold_days)

        # Get unpaid commissions
        unpaid_commissions = (
            db.query(CommissionCalculation)
            .filter(
                and_(
                    CommissionCalculation.compensation_plan_id
                    == schedule.compensation_plan_id,
                    CommissionCalculation.is_paid == False,
                    CommissionCalculation.calculation_date >= start_date,
                    CommissionCalculation.calculation_date <= cutoff_date,
                )
            )
            .all()
        )

        if not unpaid_commissions:
            logger.info(f"No unpaid commissions found for schedule {schedule_id}")
            schedule.processing_status = "completed"
            schedule.next_payout_date = self._calculate_next_payout_date(
                schedule.frequency, schedule.next_payout_date
            )
            db.commit()
            return {"status": "success", "message": "No commissions to process"}

        # Calculate totals
        total_gross = sum(Decimal(str(c.gross_commission)) for c in unpaid_commissions)
        total_deductions = sum(
            Decimal(str(c.deduction_amount)) for c in unpaid_commissions
        )
        total_net = sum(Decimal(str(c.net_commission)) for c in unpaid_commissions)

        # Check minimum payout threshold
        if total_net < schedule.minimum_payout_amount:
            logger.info(
                f"Payout amount ${total_net} below minimum ${schedule.minimum_payout_amount}"
            )
            schedule.processing_status = "below_minimum"
            db.commit()
            return {
                "status": "skipped",
                "message": "Below minimum payout threshold",
                "amount": str(total_net),
                "minimum": str(schedule.minimum_payout_amount),
            }

        # Create payment record
        payment = BarberPayment(
            barber_id=schedule.barber_id,
            amount=float(total_net),
            payment_method=schedule.payout_method,
            status=PayoutStatus.PENDING,
            scheduled_date=datetime.utcnow(),
            metadata={
                "commission_count": len(unpaid_commissions),
                "gross_amount": str(total_gross),
                "deductions": str(total_deductions),
                "period_start": start_date.isoformat(),
                "period_end": end_date.isoformat(),
            },
        )
        db.add(payment)
        db.commit()

        # Execute the payout
        payout_result = self._execute_payout(
            payment_id=payment.id,
            barber_id=schedule.barber_id,
            amount=total_net,
            method=schedule.payout_method,
            db=db,
        )

        if payout_result["success"]:
            # Mark commissions as paid
            for commission in unpaid_commissions:
                commission.is_paid = True
                commission.paid_date = datetime.utcnow()
                commission.payment_reference = payment.transaction_id

            # Update payment status
            payment.status = PayoutStatus.COMPLETED
            payment.completed_date = datetime.utcnow()
            payment.transaction_id = payout_result.get("transaction_id")

            # Update schedule
            schedule.last_successful_payout = datetime.utcnow()
            schedule.next_payout_date = self._calculate_next_payout_date(
                schedule.frequency, schedule.next_payout_date
            )
            schedule.processing_status = "completed"
            schedule.total_payouts_processed += 1
            schedule.total_amount_processed += float(total_net)

            db.commit()

            # Send notification
            notification_task = send_payout_notification.delay(
                barber_id=schedule.barber_id,
                amount=float(total_net),
                payment_id=payment.id,
            )

            # Record metrics
            monitoring_service.record_metric(
                metric_name="payout_processed",
                value=float(total_net),
                tags={
                    "method": schedule.payout_method,
                    "barber_id": schedule.barber_id,
                },
            )

            logger.info(
                f"Successfully processed payout of ${total_net} for schedule {schedule_id}"
            )

            return {
                "status": "success",
                "payment_id": payment.id,
                "amount": str(total_net),
                "transaction_id": payout_result.get("transaction_id"),
                "commissions_paid": len(unpaid_commissions),
            }
        else:
            # Handle payout failure
            payment.status = PayoutStatus.FAILED
            payment.error_message = payout_result.get("error")
            schedule.processing_status = "failed"
            schedule.last_error = payout_result.get("error")
            schedule.consecutive_failures += 1

            db.commit()

            # Schedule retry if not exceeded max retries
            if schedule.consecutive_failures < 3:
                retry_task = retry_failed_payout.apply_async(
                    args=[payment.id],
                    countdown=3600,  # Retry in 1 hour
                    priority=9,
                )
                logger.info(f"Scheduled retry for failed payout: {retry_task.id}")
            else:
                # Send alert for repeated failures
                monitoring_service.send_alert(
                    alert_type="payout_max_retries_exceeded",
                    severity="critical",
                    details={
                        "schedule_id": schedule_id,
                        "barber_id": schedule.barber_id,
                        "consecutive_failures": schedule.consecutive_failures,
                        "error": payout_result.get("error"),
                    },
                )

            return {
                "status": "failed",
                "payment_id": payment.id,
                "error": payout_result.get("error"),
            }

    except SoftTimeLimitExceeded:
        logger.error(f"Payout processing timed out for schedule {schedule_id}")
        if schedule:
            schedule.processing_status = "timeout"
            schedule.last_error = "Processing timeout"
        db.commit()
        raise
    except Exception as e:
        logger.error(f"Error processing payout for schedule {schedule_id}: {str(e)}")
        if schedule:
            schedule.processing_status = "error"
            schedule.last_error = str(e)
        db.commit()
        raise
    finally:
        db.close()

    def _calculate_period_start(self, frequency: str, end_date: datetime) -> datetime:
        """Calculate the start date of the payout period based on frequency"""
        if frequency == "daily":
            return end_date - timedelta(days=1)
        elif frequency == "weekly":
            return end_date - timedelta(weeks=1)
        elif frequency == "biweekly":
            return end_date - timedelta(weeks=2)
        elif frequency == "monthly":
            return end_date.replace(day=1)
        else:
            raise ValueError(f"Unknown frequency: {frequency}")

    def _calculate_next_payout_date(
        self, frequency: str, current_date: datetime
    ) -> datetime:
        """Calculate the next payout date based on frequency"""
        if frequency == "daily":
            return current_date + timedelta(days=1)
        elif frequency == "weekly":
            return current_date + timedelta(weeks=1)
        elif frequency == "biweekly":
            return current_date + timedelta(weeks=2)
        elif frequency == "monthly":
            # Move to same day next month
            if current_date.month == 12:
                return current_date.replace(year=current_date.year + 1, month=1)
            else:
                return current_date.replace(month=current_date.month + 1)
        else:
            raise ValueError(f"Unknown frequency: {frequency}")

    def _execute_payout(
        self, payment_id: int, barber_id: int, amount: Decimal, method: str, db: Session
    ) -> Dict[str, Any]:
        """Execute the actual payout using the specified method"""
        try:
            if method == "stripe_instant":
                result = stripe_service.create_instant_payout(
                    barber_id=barber_id,
                    amount=float(amount),
                    payment_id=payment_id,
                )
            elif method == "stripe_standard":
                result = stripe_service.create_standard_payout(
                    barber_id=barber_id,
                    amount=float(amount),
                    payment_id=payment_id,
                )
            elif method == "square":
                result = square_service.create_payout(
                    barber_id=barber_id,
                    amount=float(amount),
                    payment_id=payment_id,
                )
            elif method == "bank_transfer":
                # Placeholder for bank transfer integration
                result = {
                    "success": True,
                    "transaction_id": f"BANK_{payment_id}_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
                }
            else:
                result = {"success": False, "error": f"Unknown payout method: {method}"}

            return result

        except Exception as e:
            logger.error(f"Error executing payout: {str(e)}")
            return {"success": False, "error": str(e)}


@celery_app.task(
    bind=True, base=PayoutTask, name="tasks.payout_jobs.retry_failed_payout"
)
def retry_failed_payout(self, payment_id: int):
    """
    Retry a previously failed payout
    """
    logger.info(f"Retrying failed payout {payment_id}")

    db = next(get_db())

    try:
        # Get the failed payment
        payment = (
            db.query(BarberPayment)
            .filter(
                BarberPayment.id == payment_id,
                BarberPayment.status == PayoutStatus.FAILED,
            )
            .first()
        )

        if not payment:
            logger.error(f"Payment {payment_id} not found or not in failed state")
            return {"status": "error", "message": "Payment not found or not failed"}

        # Update retry count
        retry_count = payment.metadata.get("retry_count", 0) + 1
        payment.metadata["retry_count"] = retry_count
        payment.metadata["last_retry"] = datetime.utcnow().isoformat()
        payment.status = PayoutStatus.PENDING
        db.commit()

        # Attempt to process the payout again
        result = process_single_payout._execute_payout(
            payment_id=payment.id,
            barber_id=payment.barber_id,
            amount=Decimal(str(payment.amount)),
            method=payment.payment_method,
            db=db,
        )

        if result["success"]:
            payment.status = PayoutStatus.COMPLETED
            payment.completed_date = datetime.utcnow()
            payment.transaction_id = result.get("transaction_id")
            payment.error_message = None

            # Reset consecutive failures on the schedule
            schedule = (
                db.query(PayoutSchedule)
                .filter(PayoutSchedule.barber_id == payment.barber_id)
                .first()
            )
            if schedule:
                schedule.consecutive_failures = 0

            db.commit()

            logger.info(f"Successfully retried payout {payment_id}")

            # Send success notification
            send_payout_notification.delay(
                barber_id=payment.barber_id,
                amount=payment.amount,
                payment_id=payment.id,
                is_retry=True,
            )

            return {
                "status": "success",
                "payment_id": payment_id,
                "transaction_id": result.get("transaction_id"),
                "retry_count": retry_count,
            }
        else:
            payment.status = PayoutStatus.FAILED
            payment.error_message = result.get("error")
            db.commit()

            # Check if we should continue retrying
            if retry_count >= 5:
                # Max retries exceeded, send alert
                monitoring_service.send_alert(
                    alert_type="payout_retry_exhausted",
                    severity="critical",
                    details={
                        "payment_id": payment_id,
                        "barber_id": payment.barber_id,
                        "amount": payment.amount,
                        "retry_count": retry_count,
                        "error": result.get("error"),
                    },
                )

                # Mark for manual review
                payment.metadata["requires_manual_review"] = True
                db.commit()
            else:
                # Schedule another retry with exponential backoff
                retry_delay = min(300 * (2**retry_count), 86400)  # Max 24 hours
                retry_failed_payout.apply_async(
                    args=[payment_id],
                    countdown=retry_delay,
                    priority=9,
                )
                logger.info(
                    f"Scheduled retry #{retry_count + 1} for payment {payment_id} in {retry_delay} seconds"
                )

            return {
                "status": "failed",
                "payment_id": payment_id,
                "error": result.get("error"),
                "retry_count": retry_count,
            }

    except Exception as e:
        logger.error(f"Error retrying payout {payment_id}: {str(e)}")
        raise
    finally:
        db.close()


@celery_app.task(name="tasks.payout_jobs.retry_failed_payouts")
def retry_failed_payouts():
    """
    Batch task to retry all eligible failed payouts
    Runs hourly to catch any failed payouts
    """
    logger.info("Starting batch retry of failed payouts")

    db = next(get_db())

    try:
        # Find failed payouts eligible for retry
        cutoff_time = datetime.utcnow() - timedelta(hours=1)
        failed_payments = (
            db.query(BarberPayment)
            .filter(
                BarberPayment.status == PayoutStatus.FAILED,
                or_(
                    BarberPayment.metadata.op("->>")(["last_retry"])
                    < cutoff_time.isoformat(),
                    BarberPayment.metadata.op("->>")(["last_retry"]) == None,
                ),
                or_(
                    BarberPayment.metadata.op("->>")(["retry_count"]) < "5",
                    BarberPayment.metadata.op("->>")(["retry_count"]) == None,
                ),
                BarberPayment.metadata.op("->>")(["requires_manual_review"]) != "true",
            )
            .all()
        )

        logger.info(f"Found {len(failed_payments)} failed payouts eligible for retry")

        # Queue retry tasks
        retry_tasks = []
        for payment in failed_payments:
            task = retry_failed_payout.apply_async(
                args=[payment.id],
                priority=8,
                queue="payouts",
            )
            retry_tasks.append(task)

        return {
            "status": "success",
            "total_retries_scheduled": len(retry_tasks),
        }

    except Exception as e:
        logger.error(f"Error in batch retry process: {str(e)}")
        raise
    finally:
        db.close()


@celery_app.task(name="tasks.payout_jobs.send_payout_notification")
def send_payout_notification(
    barber_id: int, amount: float, payment_id: int, is_retry: bool = False
):
    """
    Send payout notification to barber
    """
    logger.info(f"Sending payout notification for payment {payment_id}")

    db = next(get_db())

    try:
        # Get barber details
        barber = db.query(Barber).filter(Barber.id == barber_id).first()
        if not barber:
            logger.error(f"Barber {barber_id} not found")
            return

        # Get payment details
        payment = db.query(BarberPayment).filter(BarberPayment.id == payment_id).first()
        if not payment:
            logger.error(f"Payment {payment_id} not found")
            return

        # Prepare notification data
        subject = f"Payout Processed - ${amount:.2f}"
        if is_retry:
            subject = f"Payout Retry Successful - ${amount:.2f}"

        template_data = {
            "barber_name": barber.name,
            "amount": amount,
            "payment_method": payment.payment_method.replace("_", " ").title(),
            "transaction_id": payment.transaction_id,
            "completed_date": payment.completed_date.strftime("%m/%d/%Y %I:%M %p"),
            "period_start": payment.metadata.get("period_start", "N/A"),
            "period_end": payment.metadata.get("period_end", "N/A"),
            "commission_count": payment.metadata.get("commission_count", 0),
            "is_retry": is_retry,
        }

        # Send email notification
        if barber.email:
            notification_service.send_templated_email(
                to_email=barber.email,
                subject=subject,
                template_name="payout_confirmation",
                template_data=template_data,
            )

        # Send SMS if enabled
        if barber.phone and barber.preferences.get("sms_notifications", {}).get(
            "payouts", False
        ):
            sms_message = f"Your payout of ${amount:.2f} has been processed. Transaction ID: {payment.transaction_id[:8]}..."
            notification_service.send_sms(
                to_phone=barber.phone,
                message=sms_message,
            )

        # Send push notification if enabled
        if barber.push_token:
            notification_service.send_push_notification(
                token=barber.push_token,
                title=subject,
                body=f"Your earnings have been sent to your account.",
                data={"payment_id": payment_id, "type": "payout"},
            )

        logger.info(f"Payout notification sent successfully for payment {payment_id}")

    except Exception as e:
        logger.error(f"Error sending payout notification: {str(e)}")
        raise
    finally:
        db.close()


@celery_app.task(name="tasks.payout_jobs.generate_payout_report")
def generate_payout_report():
    """
    Generate daily payout report for administrators
    """
    logger.info("Generating daily payout report")

    db = next(get_db())

    try:
        # Get yesterday's date range
        yesterday = datetime.utcnow().date() - timedelta(days=1)
        start_time = datetime.combine(yesterday, datetime.min.time())
        end_time = datetime.combine(yesterday, datetime.max.time())

        # Query payout data
        payouts = (
            db.query(BarberPayment)
            .filter(BarberPayment.completed_date.between(start_time, end_time))
            .all()
        )

        # Calculate summary statistics
        total_payouts = len(payouts)
        successful_payouts = len(
            [p for p in payouts if p.status == PayoutStatus.COMPLETED]
        )
        failed_payouts = len([p for p in payouts if p.status == PayoutStatus.FAILED])
        total_amount = sum(
            p.amount for p in payouts if p.status == PayoutStatus.COMPLETED
        )

        # Group by payment method
        by_method = {}
        for payout in payouts:
            method = payout.payment_method
            if method not in by_method:
                by_method[method] = {"count": 0, "amount": 0}
            if payout.status == PayoutStatus.COMPLETED:
                by_method[method]["count"] += 1
                by_method[method]["amount"] += payout.amount

        # Identify any issues
        issues = []
        high_failure_barbers = (
            db.query(
                BarberPayment.barber_id,
                func.count(BarberPayment.id).label("failure_count"),
            )
            .filter(
                BarberPayment.status == PayoutStatus.FAILED,
                BarberPayment.created_at.between(start_time, end_time),
            )
            .group_by(BarberPayment.barber_id)
            .having(func.count(BarberPayment.id) >= 3)
            .all()
        )

        for barber_id, failure_count in high_failure_barbers:
            barber = db.query(Barber).filter(Barber.id == barber_id).first()
            issues.append(
                {
                    "type": "high_failure_rate",
                    "barber_id": barber_id,
                    "barber_name": barber.name if barber else "Unknown",
                    "failure_count": failure_count,
                }
            )

        # Prepare report data
        report_data = {
            "report_date": yesterday.isoformat(),
            "summary": {
                "total_payouts": total_payouts,
                "successful_payouts": successful_payouts,
                "failed_payouts": failed_payouts,
                "success_rate": (
                    (successful_payouts / total_payouts * 100)
                    if total_payouts > 0
                    else 0
                ),
                "total_amount": float(total_amount),
            },
            "by_method": by_method,
            "issues": issues,
            "generated_at": datetime.utcnow().isoformat(),
        }

        # Send report to administrators
        admin_emails = ["admin@sixfigurebarber.com"]  # Replace with actual admin emails

        notification_service.send_templated_email(
            to_email=admin_emails,
            subject=f"Daily Payout Report - {yesterday.strftime('%m/%d/%Y')}",
            template_name="payout_report",
            template_data=report_data,
        )

        # Store report in monitoring system
        monitoring_service.store_report(
            report_type="daily_payout_report",
            report_data=report_data,
        )

        logger.info("Daily payout report generated successfully")

        return {
            "status": "success",
            "report_date": yesterday.isoformat(),
            "total_payouts": total_payouts,
            "total_amount": float(total_amount),
        }

    except Exception as e:
        logger.error(f"Error generating payout report: {str(e)}")
        raise
    finally:
        db.close()


@celery_app.task(name="tasks.payout_jobs.cleanup_old_payout_logs")
def cleanup_old_payout_logs():
    """
    Clean up old payout logs and data
    Runs weekly to maintain database performance
    """
    logger.info("Starting cleanup of old payout logs")

    db = next(get_db())

    try:
        # Define retention periods
        log_retention_days = 90  # Keep logs for 90 days
        payment_history_retention_days = 365  # Keep payment history for 1 year

        # Clean up old commission calculations that have been paid
        cutoff_date = datetime.utcnow() - timedelta(days=log_retention_days)
        deleted_commissions = (
            db.query(CommissionCalculation)
            .filter(
                CommissionCalculation.is_paid == True,
                CommissionCalculation.paid_date < cutoff_date,
            )
            .delete()
        )

        # Archive old payment history
        archive_cutoff = datetime.utcnow() - timedelta(
            days=payment_history_retention_days
        )
        old_payments = (
            db.query(PaymentHistory)
            .filter(PaymentHistory.payment_date < archive_cutoff)
            .all()
        )

        # Archive to external storage (placeholder)
        archived_count = 0
        for payment in old_payments:
            # In production, this would archive to S3 or similar
            logger.info(f"Archiving payment history {payment.id}")
            archived_count += 1

        # Delete archived records
        db.query(PaymentHistory).filter(
            PaymentHistory.payment_date < archive_cutoff
        ).delete()

        # Clean up failed payment attempts older than 30 days
        failed_cutoff = datetime.utcnow() - timedelta(days=30)
        deleted_failed = (
            db.query(BarberPayment)
            .filter(
                BarberPayment.status == PayoutStatus.FAILED,
                BarberPayment.created_at < failed_cutoff,
                BarberPayment.metadata.op("->>")(["requires_manual_review"]) != "true",
            )
            .delete()
        )

        db.commit()

        # Record cleanup metrics
        monitoring_service.record_metric(
            metric_name="payout_logs_cleaned",
            value=deleted_commissions,
            tags={"type": "commissions"},
        )

        monitoring_service.record_metric(
            metric_name="payout_logs_archived",
            value=archived_count,
            tags={"type": "payment_history"},
        )

        logger.info(
            f"Cleanup completed: {deleted_commissions} commissions deleted, "
            f"{archived_count} payments archived, {deleted_failed} failed payments removed"
        )

        return {
            "status": "success",
            "deleted_commissions": deleted_commissions,
            "archived_payments": archived_count,
            "deleted_failed_payments": deleted_failed,
        }

    except Exception as e:
        logger.error(f"Error during cleanup: {str(e)}")
        db.rollback()
        raise
    finally:
        db.close()


@celery_app.task(name="tasks.payout_jobs.health_check")
def health_check():
    """
    Periodic health check for the payout system
    Monitors system health and alerts on issues
    """
    logger.info("Running payout system health check")

    db = next(get_db())
    health_status = {
        "status": "healthy",
        "checks": {},
        "timestamp": datetime.utcnow().isoformat(),
    }

    try:
        # Check database connectivity
        try:
            db.execute("SELECT 1")
            health_status["checks"]["database"] = "ok"
        except Exception as e:
            health_status["checks"]["database"] = f"error: {str(e)}"
            health_status["status"] = "unhealthy"

        # Check Redis connectivity
        try:
            celery_app.backend.get("health_check_test")
            health_status["checks"]["redis"] = "ok"
        except Exception as e:
            health_status["checks"]["redis"] = f"error: {str(e)}"
            health_status["status"] = "unhealthy"

        # Check payment service connectivity
        try:
            stripe_status = stripe_service.health_check()
            health_status["checks"]["stripe"] = "ok" if stripe_status else "error"
        except Exception as e:
            health_status["checks"]["stripe"] = f"error: {str(e)}"
            health_status["status"] = "degraded"

        # Check for stuck payments
        stuck_threshold = datetime.utcnow() - timedelta(hours=2)
        stuck_payments = (
            db.query(BarberPayment)
            .filter(
                BarberPayment.status == PayoutStatus.PENDING,
                BarberPayment.created_at < stuck_threshold,
            )
            .count()
        )

        if stuck_payments > 0:
            health_status["checks"][
                "stuck_payments"
            ] = f"warning: {stuck_payments} stuck payments"
            health_status["status"] = "degraded"

            # Alert on stuck payments
            monitoring_service.send_alert(
                alert_type="stuck_payments_detected",
                severity="medium",
                details={"count": stuck_payments},
            )
        else:
            health_status["checks"]["stuck_payments"] = "ok"

        # Check processing queue depth
        queue_info = celery_app.control.inspect().active_queues()
        if queue_info:
            total_tasks = sum(len(tasks) for tasks in queue_info.values())
            health_status["checks"]["queue_depth"] = f"ok: {total_tasks} active tasks"

            if total_tasks > 1000:
                health_status["status"] = "degraded"
                monitoring_service.send_alert(
                    alert_type="high_queue_depth",
                    severity="medium",
                    details={"queue_depth": total_tasks},
                )

        # Store health status
        monitoring_service.record_health_check(
            service="payout_system",
            status=health_status["status"],
            details=health_status["checks"],
        )

        logger.info(f"Health check completed: {health_status['status']}")

        return health_status

    except Exception as e:
        logger.error(f"Error during health check: {str(e)}")
        health_status["status"] = "error"
        health_status["error"] = str(e)

        monitoring_service.send_alert(
            alert_type="health_check_failure",
            severity="high",
            details={"error": str(e)},
        )

        return health_status
    finally:
        db.close()


# Performance monitoring decorator
def monitor_task_performance(task_func):
    """Decorator to monitor task performance metrics"""

    def wrapper(*args, **kwargs):
        start_time = datetime.utcnow()
        task_name = task_func.__name__

        try:
            result = task_func(*args, **kwargs)

            # Record success metrics
            execution_time = (datetime.utcnow() - start_time).total_seconds()
            monitoring_service.record_metric(
                metric_name="task_execution_time",
                value=execution_time,
                tags={"task": task_name, "status": "success"},
            )

            return result

        except Exception as e:
            # Record failure metrics
            execution_time = (datetime.utcnow() - start_time).total_seconds()
            monitoring_service.record_metric(
                metric_name="task_execution_time",
                value=execution_time,
                tags={"task": task_name, "status": "failed", "error": type(e).__name__},
            )

            raise

    return wrapper


# Apply monitoring to all tasks
process_daily_payouts = monitor_task_performance(process_daily_payouts)
process_single_payout = monitor_task_performance(process_single_payout)
retry_failed_payout = monitor_task_performance(retry_failed_payout)
retry_failed_payouts = monitor_task_performance(retry_failed_payouts)
