"""
Payout Scheduler Service
Handles the calculation and processing of scheduled payouts
"""

import logging
from datetime import datetime, timedelta, date
from typing import Dict, List, Optional, Any
from decimal import Decimal
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func

from models.payout_schedule import (
    PayoutSchedule,
    ScheduledPayout,
    PayoutEarning,
    PayoutFrequency,
    PayoutStatus,
    PayoutType,
)
from models.barber import Barber
from models.barber_payment import BarberPaymentModel, CommissionPayment
from models.payment import Payment
from models.appointment import Appointment
from services.stripe_connect_service import StripeConnectService
from services.square_service import SquareService

logger = logging.getLogger(__name__)


class PayoutSchedulerService:
    """Service for managing payout schedules and processing"""

    def __init__(self, db: Session):
        self.db = db
        self.stripe_service = StripeConnectService()
        self.square_service = SquareService()

    def calculate_next_payout_date(self, schedule: PayoutSchedule) -> datetime:
        """Calculate the next payout date based on schedule frequency"""
        now = datetime.utcnow()

        if schedule.frequency == PayoutFrequency.DAILY:
            # Next day at midnight
            next_date = now.replace(
                hour=0, minute=0, second=0, microsecond=0
            ) + timedelta(days=1)

        elif schedule.frequency == PayoutFrequency.WEEKLY:
            # Next occurrence of the specified day of week
            days_ahead = schedule.day_of_week - now.weekday()
            if days_ahead <= 0:  # Target day already happened this week
                days_ahead += 7
            next_date = now.replace(
                hour=0, minute=0, second=0, microsecond=0
            ) + timedelta(days=days_ahead)

        elif schedule.frequency == PayoutFrequency.BIWEEKLY:
            # Similar to weekly but add 14 days if needed
            if schedule.last_payout_date:
                next_date = schedule.last_payout_date + timedelta(days=14)
            else:
                # First time, use weekly logic
                days_ahead = schedule.day_of_week - now.weekday()
                if days_ahead <= 0:
                    days_ahead += 7
                next_date = now.replace(
                    hour=0, minute=0, second=0, microsecond=0
                ) + timedelta(days=days_ahead)

        elif schedule.frequency == PayoutFrequency.MONTHLY:
            # Next occurrence of the specified day of month
            if now.day > schedule.day_of_month:
                # Move to next month
                if now.month == 12:
                    next_date = now.replace(
                        year=now.year + 1, month=1, day=schedule.day_of_month
                    )
                else:
                    next_date = now.replace(
                        month=now.month + 1, day=schedule.day_of_month
                    )
            else:
                next_date = now.replace(day=schedule.day_of_month)
            next_date = next_date.replace(hour=0, minute=0, second=0, microsecond=0)

        elif schedule.frequency == PayoutFrequency.CUSTOM:
            # Custom interval in days
            if schedule.last_payout_date:
                next_date = schedule.last_payout_date + timedelta(
                    days=schedule.custom_interval_days
                )
            else:
                next_date = now.replace(
                    hour=0, minute=0, second=0, microsecond=0
                ) + timedelta(days=schedule.custom_interval_days)

        else:
            # Default to weekly
            next_date = now + timedelta(days=7)

        return next_date

    def calculate_pending_earnings(
        self, barber_id: int, end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Calculate pending earnings for a barber up to a specific date"""
        if not end_date:
            end_date = datetime.utcnow()

        # Get last payout date
        last_payout = (
            self.db.query(ScheduledPayout)
            .filter(
                ScheduledPayout.barber_id == barber_id,
                ScheduledPayout.status == PayoutStatus.COMPLETED,
            )
            .order_by(ScheduledPayout.processed_date.desc())
            .first()
        )

        start_date = (
            last_payout.period_end
            if last_payout
            else datetime.utcnow() - timedelta(days=30)
        )

        # Get unpaid appointments/payments
        unpaid_payments = (
            self.db.query(Payment)
            .join(Appointment)
            .filter(
                Appointment.barber_id == barber_id,
                Payment.status == "completed",
                Payment.created_at >= start_date,
                Payment.created_at <= end_date,
                Payment.id.notin_(
                    self.db.query(PayoutEarning.payment_id).filter(
                        PayoutEarning.payment_id.isnot(None)
                    )
                ),
            )
            .all()
        )

        # Calculate totals
        total_amount = Decimal(0)
        earnings = []

        for payment in unpaid_payments:
            appointment = payment.appointment

            # Get commission rate (simplified - would need actual rate from payment model)
            commission_rate = Decimal(0.7)  # 70% default commission
            commission_amount = payment.amount * commission_rate

            earnings.append(
                {
                    "appointment_id": appointment.id,
                    "payment_id": payment.id,
                    "earning_type": "service_commission",
                    "gross_amount": float(payment.amount),
                    "commission_rate": float(commission_rate),
                    "commission_amount": float(commission_amount),
                    "earned_date": payment.created_at,
                    "service_name": (
                        appointment.service.name if appointment.service else "Service"
                    ),
                    "customer_name": (
                        appointment.client.name if appointment.client else "Customer"
                    ),
                }
            )

            total_amount += commission_amount

        return {
            "period_start": start_date,
            "period_end": end_date,
            "total_amount": float(total_amount),
            "earnings_count": len(earnings),
            "earnings": earnings,
        }

    def create_scheduled_payout(
        self,
        barber_id: int,
        earnings: Dict[str, Any],
        payment_method: str = "stripe",
        schedule_id: Optional[int] = None,
    ) -> ScheduledPayout:
        """Create a new scheduled payout from earnings data"""

        # Create the payout
        payout = ScheduledPayout(
            schedule_id=schedule_id,
            barber_id=barber_id,
            payout_type=PayoutType.COMMISSION,
            amount=earnings["total_amount"],
            currency="USD",
            period_start=earnings["period_start"],
            period_end=earnings["period_end"],
            status=PayoutStatus.PENDING,
            scheduled_date=datetime.utcnow(),
            payment_method=payment_method,
            net_amount=earnings["total_amount"],  # Will be updated after fees
        )

        self.db.add(payout)
        self.db.flush()

        # Create earning records
        for earning_data in earnings["earnings"]:
            earning = PayoutEarning(
                scheduled_payout_id=payout.id,
                appointment_id=earning_data.get("appointment_id"),
                payment_id=earning_data.get("payment_id"),
                earning_type=earning_data["earning_type"],
                gross_amount=earning_data["gross_amount"],
                commission_rate=earning_data["commission_rate"],
                commission_amount=earning_data["commission_amount"],
                earned_date=earning_data["earned_date"],
                service_name=earning_data.get("service_name"),
                customer_name=earning_data.get("customer_name"),
            )
            self.db.add(earning)

        self.db.commit()
        return payout

    def process_payout(self, payout_id: int) -> ScheduledPayout:
        """Process a pending payout through the payment platform"""
        payout = (
            self.db.query(ScheduledPayout)
            .filter(ScheduledPayout.id == payout_id)
            .first()
        )

        if not payout:
            raise ValueError(f"Payout {payout_id} not found")

        if payout.status != PayoutStatus.PENDING:
            raise ValueError(f"Payout {payout_id} is not in pending status")

        # Get barber payment model
        payment_model = (
            self.db.query(BarberPaymentModel)
            .filter(
                BarberPaymentModel.barber_id == payout.barber_id,
                BarberPaymentModel.active == True,
            )
            .first()
        )

        if not payment_model:
            raise ValueError(
                f"No active payment model found for barber {payout.barber_id}"
            )

        try:
            # Update status to processing
            payout.status = PayoutStatus.PROCESSING
            self.db.commit()

            # Process based on payment method
            if payout.payment_method == "stripe":
                if not payment_model.stripe_connect_account_id:
                    raise ValueError("Barber has not completed Stripe Connect setup")

                # Calculate fee (2.9% + $0.30 for Stripe)
                fee = float(payout.amount) * 0.029 + 0.30
                net_amount = float(payout.amount) - fee

                # Create Stripe transfer
                transfer = self.stripe_service.create_transfer(
                    amount=int(net_amount * 100),  # Convert to cents
                    destination=payment_model.stripe_connect_account_id,
                    description=f"Payout for period {payout.period_start.date()} to {payout.period_end.date()}",
                )

                # Update payout
                payout.status = PayoutStatus.COMPLETED
                payout.processed_date = datetime.utcnow()
                payout.platform_payout_id = transfer["id"]
                payout.platform_fee = fee
                payout.net_amount = net_amount

            elif payout.payment_method == "square":
                # Square payout logic
                # Note: Square typically handles payouts automatically
                payout.status = PayoutStatus.COMPLETED
                payout.processed_date = datetime.utcnow()
                payout.platform_fee = float(payout.amount) * 0.026  # 2.6% Square fee
                payout.net_amount = float(payout.amount) - payout.platform_fee

            elif payout.payment_method == "bank_transfer":
                # Bank transfer logic would go here
                # For now, just mark as completed
                payout.status = PayoutStatus.COMPLETED
                payout.processed_date = datetime.utcnow()
                payout.platform_fee = 0
                payout.net_amount = float(payout.amount)

            else:
                raise ValueError(f"Unsupported payment method: {payout.payment_method}")

            # Update schedule if exists
            if payout.schedule_id:
                schedule = (
                    self.db.query(PayoutSchedule)
                    .filter(PayoutSchedule.id == payout.schedule_id)
                    .first()
                )

                if schedule:
                    schedule.last_payout_date = payout.processed_date
                    schedule.next_payout_date = self.calculate_next_payout_date(
                        schedule
                    )
                    schedule.total_payouts_sent += 1
                    schedule.total_amount_paid += payout.net_amount

            self.db.commit()
            return payout

        except Exception as e:
            # Rollback and mark as failed
            self.db.rollback()
            payout.status = PayoutStatus.FAILED
            payout.failure_reason = str(e)
            payout.next_retry_date = datetime.utcnow() + timedelta(hours=24)
            self.db.commit()
            raise

    def process_scheduled_payouts(self):
        """Process all due scheduled payouts"""
        now = datetime.utcnow()

        # Get active schedules with payouts due
        due_schedules = (
            self.db.query(PayoutSchedule)
            .filter(
                PayoutSchedule.is_active == True,
                PayoutSchedule.auto_payout_enabled == True,
                PayoutSchedule.next_payout_date <= now,
            )
            .all()
        )

        results = {"processed": 0, "failed": 0, "skipped": 0, "total_amount": 0}

        for schedule in due_schedules:
            try:
                # Calculate pending earnings
                earnings = self.calculate_pending_earnings(schedule.barber_id)

                # Check minimum payout amount
                if earnings["total_amount"] < float(schedule.minimum_payout_amount):
                    logger.info(
                        f"Skipping payout for barber {schedule.barber_id}: "
                        f"${earnings['total_amount']} below minimum ${schedule.minimum_payout_amount}"
                    )
                    results["skipped"] += 1
                    continue

                # Create scheduled payout
                payout = self.create_scheduled_payout(
                    barber_id=schedule.barber_id,
                    earnings=earnings,
                    payment_method=schedule.preferred_payment_method,
                    schedule_id=schedule.id,
                )

                # Process the payout
                self.process_payout(payout.id)

                results["processed"] += 1
                results["total_amount"] += float(payout.net_amount)

            except Exception as e:
                logger.error(
                    f"Failed to process payout for schedule {schedule.id}: {str(e)}"
                )
                results["failed"] += 1

        logger.info(f"Payout processing complete: {results}")
        return results

    def get_upcoming_payouts(self, days_ahead: int = 7) -> List[Dict[str, Any]]:
        """Get upcoming scheduled payouts"""
        cutoff_date = datetime.utcnow() + timedelta(days=days_ahead)

        schedules = (
            self.db.query(PayoutSchedule)
            .filter(
                PayoutSchedule.is_active == True,
                PayoutSchedule.next_payout_date <= cutoff_date,
            )
            .all()
        )

        upcoming = []
        for schedule in schedules:
            # Calculate expected amount
            earnings = self.calculate_pending_earnings(
                schedule.barber_id, end_date=schedule.next_payout_date
            )

            barber = (
                self.db.query(Barber).filter(Barber.id == schedule.barber_id).first()
            )

            upcoming.append(
                {
                    "schedule_id": schedule.id,
                    "barber_id": schedule.barber_id,
                    "barber_name": (
                        f"{barber.first_name} {barber.last_name}"
                        if barber
                        else "Unknown"
                    ),
                    "scheduled_date": schedule.next_payout_date,
                    "expected_amount": earnings["total_amount"],
                    "payment_method": schedule.preferred_payment_method,
                    "frequency": schedule.frequency.value,
                }
            )

        return sorted(upcoming, key=lambda x: x["scheduled_date"])
