"""
Payment Processor Service
Unified interface for managing Stripe and Square payment processors
"""

from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timedelta
from decimal import Decimal
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func

from models.payment_processor_preference import (
    ProcessorPreference,
    ProcessorMetrics,
    PaymentProcessor,
)
from models.barber import Barber
from models.square_payment import SquarePayment, SquarePayout
from models.appointment import Appointment
from services.stripe_connect_service import StripeConnectService
from services.square_service import SquareService


class PaymentProcessorService:
    """Unified service for managing payment processors"""

    def __init__(self):
        self.stripe_service = StripeConnectService()
        self.square_service = SquareService()

    def get_or_create_preference(
        self, db: Session, barber_id: int
    ) -> ProcessorPreference:
        """Get or create processor preference for barber"""
        preference = (
            db.query(ProcessorPreference)
            .filter(ProcessorPreference.barber_id == barber_id)
            .first()
        )

        if not preference:
            preference = ProcessorPreference(
                barber_id=barber_id,
                primary_processor=PaymentProcessor.STRIPE,
                stripe_enabled=True,
                square_enabled=False,
            )
            db.add(preference)
            db.commit()
            db.refresh(preference)

        return preference

    def update_preference(
        self, db: Session, barber_id: int, updates: Dict[str, Any]
    ) -> ProcessorPreference:
        """Update processor preferences"""
        preference = self.get_or_create_preference(db, barber_id)

        for key, value in updates.items():
            if hasattr(preference, key):
                setattr(preference, key, value)

        db.commit()
        db.refresh(preference)
        return preference

    def calculate_processor_fees(
        self, amount: float, processor: PaymentProcessor, instant_payout: bool = False
    ) -> Dict[str, float]:
        """Calculate fees for each processor"""

        if processor == PaymentProcessor.STRIPE:
            # Stripe fees: 2.9% + $0.30 for payments
            payment_fee = (amount * 0.029) + 0.30

            # Payout fees
            if instant_payout:
                payout_fee = amount * 0.01  # 1% for instant
            else:
                payout_fee = 0.25  # $0.25 for standard

            total_fee = payment_fee + payout_fee

        elif processor == PaymentProcessor.SQUARE:
            # Square fees: 2.9% + $0.30 for payments
            payment_fee = (amount * 0.029) + 0.30

            # Square doesn't charge for standard payouts
            if instant_payout:
                payout_fee = amount * 0.015  # 1.5% for instant
            else:
                payout_fee = 0.00  # Free standard payouts

            total_fee = payment_fee + payout_fee

        else:
            return {}

        return {
            "payment_fee": round(payment_fee, 2),
            "payout_fee": round(payout_fee, 2),
            "total_fee": round(total_fee, 2),
            "effective_rate": round((total_fee / amount) * 100, 2),
        }

    def compare_processors(
        self, db: Session, barber_id: int, timeframe_days: int = 30
    ) -> Dict[str, Any]:
        """Compare performance between processors"""

        # Get date range
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=timeframe_days)

        # Get Stripe metrics
        stripe_payments = (
            db.query(
                func.count(Appointment.id).label("count"),
                func.sum(Appointment.total_price).label("volume"),
                func.avg(Appointment.total_price).label("avg_transaction"),
            )
            .filter(
                and_(
                    Appointment.barber_id == barber_id,
                    Appointment.payment_processor == "stripe",
                    Appointment.created_at >= start_date,
                    Appointment.status == "completed",
                )
            )
            .first()
        )

        # Get Square metrics
        square_payments = (
            db.query(
                func.count(SquarePayment.id).label("count"),
                func.sum(SquarePayment.total_money).label("volume"),
                func.avg(SquarePayment.total_money).label("avg_transaction"),
            )
            .filter(
                and_(
                    SquarePayment.barber_id == barber_id,
                    SquarePayment.created_at >= start_date,
                    SquarePayment.status == "completed",
                )
            )
            .first()
        )

        # Calculate fees for each processor
        stripe_volume = float(stripe_payments.volume or 0)
        square_volume = float(square_payments.volume or 0)

        stripe_fees = self.calculate_processor_fees(
            stripe_volume, PaymentProcessor.STRIPE
        )

        square_fees = self.calculate_processor_fees(
            square_volume, PaymentProcessor.SQUARE
        )

        return {
            "timeframe_days": timeframe_days,
            "stripe": {
                "transactions": stripe_payments.count or 0,
                "volume": stripe_volume,
                "avg_transaction": float(stripe_payments.avg_transaction or 0),
                "fees": stripe_fees,
                "effective_rate": (
                    stripe_fees.get("effective_rate", 0) if stripe_volume > 0 else 0
                ),
            },
            "square": {
                "transactions": square_payments.count or 0,
                "volume": square_volume,
                "avg_transaction": float(square_payments.avg_transaction or 0),
                "fees": square_fees,
                "effective_rate": (
                    square_fees.get("effective_rate", 0) if square_volume > 0 else 0
                ),
            },
            "recommendation": self._get_processor_recommendation(
                stripe_volume, square_volume, stripe_fees, square_fees
            ),
        }

    def _get_processor_recommendation(
        self,
        stripe_volume: float,
        square_volume: float,
        stripe_fees: Dict[str, float],
        square_fees: Dict[str, float],
    ) -> Dict[str, Any]:
        """Generate processor recommendation based on usage patterns"""

        total_volume = stripe_volume + square_volume

        if total_volume == 0:
            return {
                "recommended": "stripe",
                "reason": "No transaction history. Stripe recommended for ease of setup.",
                "potential_savings": 0,
            }

        # Calculate which would be cheaper for the total volume
        stripe_total_fees = self.calculate_processor_fees(
            total_volume, PaymentProcessor.STRIPE
        )

        square_total_fees = self.calculate_processor_fees(
            total_volume, PaymentProcessor.SQUARE
        )

        if stripe_total_fees["total_fee"] < square_total_fees["total_fee"]:
            recommended = "stripe"
            savings = square_total_fees["total_fee"] - stripe_total_fees["total_fee"]
            reason = (
                f"Stripe offers lower fees for your volume (${total_volume:.2f}/month)"
            )
        else:
            recommended = "square"
            savings = stripe_total_fees["total_fee"] - square_total_fees["total_fee"]
            reason = (
                f"Square offers lower fees for your volume (${total_volume:.2f}/month)"
            )

        return {
            "recommended": recommended,
            "reason": reason,
            "potential_savings": round(savings, 2),
            "monthly_volume": round(total_volume, 2),
        }

    def get_unified_analytics(
        self, db: Session, barber_id: int, start_date: datetime, end_date: datetime
    ) -> Dict[str, Any]:
        """Get unified analytics across both processors"""

        # Get Stripe data
        stripe_data = (
            db.query(
                func.date(Appointment.created_at).label("date"),
                func.count(Appointment.id).label("transactions"),
                func.sum(Appointment.total_price).label("volume"),
            )
            .filter(
                and_(
                    Appointment.barber_id == barber_id,
                    Appointment.payment_processor == "stripe",
                    Appointment.created_at >= start_date,
                    Appointment.created_at <= end_date,
                    Appointment.status == "completed",
                )
            )
            .group_by(func.date(Appointment.created_at))
            .all()
        )

        # Get Square data
        square_data = (
            db.query(
                func.date(SquarePayment.created_at).label("date"),
                func.count(SquarePayment.id).label("transactions"),
                func.sum(SquarePayment.total_money).label("volume"),
            )
            .filter(
                and_(
                    SquarePayment.barber_id == barber_id,
                    SquarePayment.created_at >= start_date,
                    SquarePayment.created_at <= end_date,
                    SquarePayment.status == "completed",
                )
            )
            .group_by(func.date(SquarePayment.created_at))
            .all()
        )

        # Combine data by date
        combined_data = {}

        for row in stripe_data:
            date_str = row.date.isoformat()
            combined_data[date_str] = {
                "date": date_str,
                "stripe_transactions": row.transactions,
                "stripe_volume": float(row.volume or 0),
                "square_transactions": 0,
                "square_volume": 0,
            }

        for row in square_data:
            date_str = row.date.isoformat()
            if date_str in combined_data:
                combined_data[date_str]["square_transactions"] = row.transactions
                combined_data[date_str]["square_volume"] = float(row.volume or 0)
            else:
                combined_data[date_str] = {
                    "date": date_str,
                    "stripe_transactions": 0,
                    "stripe_volume": 0,
                    "square_transactions": row.transactions,
                    "square_volume": float(row.volume or 0),
                }

        # Calculate totals and add combined metrics
        daily_analytics = []
        total_stripe_volume = 0
        total_square_volume = 0
        total_stripe_transactions = 0
        total_square_transactions = 0

        for date_str, data in sorted(combined_data.items()):
            data["total_transactions"] = (
                data["stripe_transactions"] + data["square_transactions"]
            )
            data["total_volume"] = data["stripe_volume"] + data["square_volume"]

            daily_analytics.append(data)

            total_stripe_volume += data["stripe_volume"]
            total_square_volume += data["square_volume"]
            total_stripe_transactions += data["stripe_transactions"]
            total_square_transactions += data["square_transactions"]

        return {
            "daily_analytics": daily_analytics,
            "summary": {
                "total_transactions": total_stripe_transactions
                + total_square_transactions,
                "total_volume": total_stripe_volume + total_square_volume,
                "stripe": {
                    "transactions": total_stripe_transactions,
                    "volume": total_stripe_volume,
                    "percentage": (
                        round(
                            (
                                total_stripe_volume
                                / (total_stripe_volume + total_square_volume)
                                * 100
                            ),
                            2,
                        )
                        if (total_stripe_volume + total_square_volume) > 0
                        else 0
                    ),
                },
                "square": {
                    "transactions": total_square_transactions,
                    "volume": total_square_volume,
                    "percentage": (
                        round(
                            (
                                total_square_volume
                                / (total_stripe_volume + total_square_volume)
                                * 100
                            ),
                            2,
                        )
                        if (total_stripe_volume + total_square_volume) > 0
                        else 0
                    ),
                },
            },
        }

    def switch_primary_processor(
        self, db: Session, barber_id: int, new_processor: PaymentProcessor
    ) -> Tuple[bool, str]:
        """Switch primary payment processor"""

        barber = db.query(Barber).filter(Barber.id == barber_id).first()
        if not barber:
            return False, "Barber not found"

        # Check if new processor is connected
        if new_processor == PaymentProcessor.STRIPE and not barber.stripe_account_id:
            return False, "Stripe account not connected. Please connect Stripe first."

        if new_processor == PaymentProcessor.SQUARE and not barber.square_account:
            return False, "Square account not connected. Please connect Square first."

        # Update preference
        preference = self.get_or_create_preference(db, barber_id)
        preference.primary_processor = new_processor

        # Enable the processor
        if new_processor == PaymentProcessor.STRIPE:
            preference.stripe_enabled = True
        elif new_processor == PaymentProcessor.SQUARE:
            preference.square_enabled = True

        db.commit()

        return True, f"Successfully switched to {new_processor.value}"

    def get_processor_health(self, db: Session, barber_id: int) -> Dict[str, Any]:
        """Get health status of connected processors"""

        barber = db.query(Barber).filter(Barber.id == barber_id).first()
        if not barber:
            return {}

        health_status = {}

        # Check Stripe health
        if barber.stripe_account_id:
            try:
                stripe_status = self.stripe_service.check_account_status(
                    barber.stripe_account_id
                )
                health_status["stripe"] = {
                    "connected": True,
                    "payouts_enabled": stripe_status.get("payouts_enabled", False),
                    "charges_enabled": stripe_status.get("charges_enabled", False),
                    "requirements": stripe_status.get("requirements", {}),
                }
            except Exception as e:
                health_status["stripe"] = {"connected": False, "error": str(e)}
        else:
            health_status["stripe"] = {"connected": False}

        # Check Square health
        if barber.square_account:
            health_status["square"] = {
                "connected": True,
                "is_active": barber.square_account.is_active,
                "can_receive_payments": barber.square_account.can_receive_payments,
                "can_make_payouts": barber.square_account.can_make_payouts,
            }
        else:
            health_status["square"] = {"connected": False}

        return health_status


# Global service instance
payment_processor_service = PaymentProcessorService()
