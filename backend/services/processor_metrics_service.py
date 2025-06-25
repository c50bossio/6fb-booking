"""
Processor Metrics Service
Tracks and updates performance metrics for payment processors
"""

from typing import Dict, Optional
from datetime import datetime, timedelta
from decimal import Decimal
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
import json

from models.payment_processor_preference import ProcessorMetrics, PaymentProcessor
from models.appointment import Appointment
from models.square_payment import SquarePayment, SquarePayout
from models.barber import Barber
import stripe


class ProcessorMetricsService:
    """Service for tracking payment processor performance metrics"""

    def __init__(self):
        self.stripe = stripe

    def update_metrics(self, db: Session, barber_id: int, processor: PaymentProcessor):
        """Update metrics for a specific processor"""

        # Get or create metrics record
        from services.payment_processor_service import payment_processor_service

        preference = payment_processor_service.get_or_create_preference(db, barber_id)

        metrics = (
            db.query(ProcessorMetrics)
            .filter(
                and_(
                    ProcessorMetrics.preference_id == preference.id,
                    ProcessorMetrics.processor == processor,
                )
            )
            .first()
        )

        if not metrics:
            metrics = ProcessorMetrics(preference_id=preference.id, processor=processor)
            db.add(metrics)

        # Update metrics based on processor
        if processor == PaymentProcessor.STRIPE:
            self._update_stripe_metrics(db, barber_id, metrics)
        elif processor == PaymentProcessor.SQUARE:
            self._update_square_metrics(db, barber_id, metrics)

        db.commit()
        return metrics

    def _update_stripe_metrics(
        self, db: Session, barber_id: int, metrics: ProcessorMetrics
    ):
        """Update Stripe-specific metrics"""

        # Get Stripe transaction data
        stripe_data = (
            db.query(
                func.count(Appointment.id).label("count"),
                func.sum(Appointment.total_price).label("volume"),
                func.avg(Appointment.total_price).label("avg_amount"),
            )
            .filter(
                and_(
                    Appointment.barber_id == barber_id,
                    Appointment.payment_processor == "stripe",
                    Appointment.status == "completed",
                )
            )
            .first()
        )

        # Update basic metrics
        metrics.total_transactions = stripe_data.count or 0
        metrics.total_volume = float(stripe_data.volume or 0)

        # Calculate fees (2.9% + $0.30 per transaction)
        if metrics.total_transactions > 0:
            payment_fees = (metrics.total_volume * 0.029) + (
                0.30 * metrics.total_transactions
            )
            payout_fees = 0.25 * metrics.total_transactions  # Standard payout fee
            metrics.total_fees = payment_fees + payout_fees

        # Get success/failure rates
        failed_count = (
            db.query(func.count(Appointment.id))
            .filter(
                and_(
                    Appointment.barber_id == barber_id,
                    Appointment.payment_processor == "stripe",
                    Appointment.payment_status == "failed",
                )
            )
            .scalar()
            or 0
        )

        total_attempts = metrics.total_transactions + failed_count
        if total_attempts > 0:
            metrics.success_rate = (metrics.total_transactions / total_attempts) * 100
        metrics.failed_transactions = failed_count

        # Get payout metrics from Stripe (if connected)
        barber = db.query(Barber).filter(Barber.id == barber_id).first()
        if barber and barber.stripe_account_id:
            try:
                # Get recent payouts
                payouts = self.stripe.Payout.list(
                    limit=100, stripe_account=barber.stripe_account_id
                )

                metrics.total_payouts = len(payouts.data)

                # Calculate average payout time
                payout_times = []
                instant_count = 0
                instant_fees = 0

                for payout in payouts.data:
                    if payout.method == "instant":
                        instant_count += 1
                        instant_fees += float(payout.amount) * 0.01  # 1% instant fee

                    if payout.arrival_date and payout.created:
                        time_diff = payout.arrival_date - payout.created
                        payout_times.append(time_diff / 3600)  # Convert to hours

                if payout_times:
                    metrics.average_payout_time = sum(payout_times) / len(payout_times)

                metrics.instant_payout_count = instant_count
                metrics.instant_payout_fees = instant_fees

            except Exception as e:
                print(f"Error fetching Stripe payout data: {e}")

        # Update monthly breakdown
        self._update_monthly_metrics(db, barber_id, metrics, "stripe")

    def _update_square_metrics(
        self, db: Session, barber_id: int, metrics: ProcessorMetrics
    ):
        """Update Square-specific metrics"""

        # Get Square transaction data
        square_data = (
            db.query(
                func.count(SquarePayment.id).label("count"),
                func.sum(SquarePayment.total_money).label("volume"),
                func.avg(SquarePayment.total_money).label("avg_amount"),
                func.sum(SquarePayment.processing_fee_money).label("processing_fees"),
            )
            .filter(
                and_(
                    SquarePayment.barber_id == barber_id,
                    SquarePayment.status == "completed",
                )
            )
            .first()
        )

        # Update basic metrics
        metrics.total_transactions = square_data.count or 0
        metrics.total_volume = float(square_data.volume or 0)
        metrics.total_fees = float(square_data.processing_fees or 0)

        # Get success/failure rates
        failed_count = (
            db.query(func.count(SquarePayment.id))
            .filter(
                and_(
                    SquarePayment.barber_id == barber_id,
                    SquarePayment.status.in_(["failed", "canceled"]),
                )
            )
            .scalar()
            or 0
        )

        total_attempts = metrics.total_transactions + failed_count
        if total_attempts > 0:
            metrics.success_rate = (metrics.total_transactions / total_attempts) * 100
        metrics.failed_transactions = failed_count

        # Get payout metrics
        payout_data = (
            db.query(
                func.count(SquarePayout.id).label("count"),
                func.avg(
                    func.extract(
                        "epoch", SquarePayout.sent_at - SquarePayout.created_at
                    )
                    / 3600
                ).label("avg_time"),
            )
            .filter(SquarePayout.barber_id == barber_id)
            .first()
        )

        metrics.total_payouts = payout_data.count or 0
        metrics.average_payout_time = float(
            payout_data.avg_time or 24
        )  # Default 24 hours

        # Get instant payout data
        instant_data = (
            db.query(
                func.count(SquarePayout.id).label("count"),
                func.sum(SquarePayout.amount_money * 0.015).label(
                    "fees"
                ),  # 1.5% Square instant fee
            )
            .filter(
                and_(
                    SquarePayout.barber_id == barber_id, SquarePayout.is_instant == True
                )
            )
            .first()
        )

        metrics.instant_payout_count = instant_data.count or 0
        metrics.instant_payout_fees = float(instant_data.fees or 0)

        # Update monthly breakdown
        self._update_monthly_metrics(db, barber_id, metrics, "square")

    def _update_monthly_metrics(
        self, db: Session, barber_id: int, metrics: ProcessorMetrics, processor: str
    ):
        """Update monthly metrics breakdown"""

        # Get last 12 months of data
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=365)

        monthly_data = {}

        if processor == "stripe":
            # Query Stripe monthly data
            monthly_results = (
                db.query(
                    func.date_trunc("month", Appointment.created_at).label("month"),
                    func.count(Appointment.id).label("transactions"),
                    func.sum(Appointment.total_price).label("volume"),
                )
                .filter(
                    and_(
                        Appointment.barber_id == barber_id,
                        Appointment.payment_processor == "stripe",
                        Appointment.status == "completed",
                        Appointment.created_at >= start_date,
                    )
                )
                .group_by(func.date_trunc("month", Appointment.created_at))
                .all()
            )

        else:  # square
            # Query Square monthly data
            monthly_results = (
                db.query(
                    func.date_trunc("month", SquarePayment.created_at).label("month"),
                    func.count(SquarePayment.id).label("transactions"),
                    func.sum(SquarePayment.total_money).label("volume"),
                )
                .filter(
                    and_(
                        SquarePayment.barber_id == barber_id,
                        SquarePayment.status == "completed",
                        SquarePayment.created_at >= start_date,
                    )
                )
                .group_by(func.date_trunc("month", SquarePayment.created_at))
                .all()
            )

        # Format monthly data
        for row in monthly_results:
            month_key = row.month.strftime("%Y-%m")
            monthly_data[month_key] = {
                "transactions": row.transactions,
                "volume": float(row.volume or 0),
                "avg_transaction": (
                    float(row.volume or 0) / row.transactions
                    if row.transactions > 0
                    else 0
                ),
            }

        metrics.monthly_metrics = monthly_data

    def calculate_processing_time(
        self, db: Session, barber_id: int, processor: PaymentProcessor, days: int = 30
    ) -> float:
        """Calculate average processing time for transactions"""

        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)

        if processor == PaymentProcessor.STRIPE:
            # For Stripe, we estimate based on typical processing times
            # Stripe typically processes within 1-2 seconds
            return 1.5

        elif processor == PaymentProcessor.SQUARE:
            # For Square, calculate from actual data if available
            avg_time = (
                db.query(
                    func.avg(
                        func.extract(
                            "epoch", SquarePayment.updated_at - SquarePayment.created_at
                        )
                    )
                )
                .filter(
                    and_(
                        SquarePayment.barber_id == barber_id,
                        SquarePayment.status == "completed",
                        SquarePayment.created_at >= start_date,
                    )
                )
                .scalar()
            )

            return float(avg_time or 2.0)  # Default 2 seconds

        return 2.0  # Default

    def get_disputed_transactions(
        self, db: Session, barber_id: int, processor: PaymentProcessor
    ) -> int:
        """Get count of disputed transactions"""

        if processor == PaymentProcessor.STRIPE:
            # Check for disputed Stripe transactions
            return (
                db.query(func.count(Appointment.id))
                .filter(
                    and_(
                        Appointment.barber_id == barber_id,
                        Appointment.payment_processor == "stripe",
                        Appointment.payment_status == "disputed",
                    )
                )
                .scalar()
                or 0
            )

        elif processor == PaymentProcessor.SQUARE:
            # Check for disputed Square transactions
            return (
                db.query(func.count(SquarePayment.id))
                .filter(
                    and_(
                        SquarePayment.barber_id == barber_id,
                        SquarePayment.status == "disputed",
                    )
                )
                .scalar()
                or 0
            )

        return 0


# Global service instance
processor_metrics_service = ProcessorMetricsService()
