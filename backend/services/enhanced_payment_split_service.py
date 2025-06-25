"""
Enhanced Payment Split Service - Intelligent Multi-Processor Support
Supports both Stripe and Square with automatic routing and fallback
"""

import os
import logging
from typing import Dict, Optional, List, Tuple, Any
from datetime import datetime, timedelta
from decimal import Decimal
from enum import Enum
import asyncio
from dataclasses import dataclass, asdict
import json
import time

import stripe
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func

# Square SDK
try:
    from square.client import Client as SquareClient

    SQUARE_AVAILABLE = True
except ImportError:
    SquareClient = None
    SQUARE_AVAILABLE = False

from config.settings import Settings
from services.stripe_service import StripeService
from services.stripe_connect_service import StripeConnectService
from services.square_service import square_service
from models.payment import Payment, PaymentStatus
from models.barber import Barber
from models.appointment import Appointment
from utils.cache import cache_service


logger = logging.getLogger(__name__)


class ProcessorType(str, Enum):
    """Payment processor types"""

    STRIPE = "stripe"
    SQUARE = "square"
    AUTO = "auto"  # Let system choose


class ProcessingMode(str, Enum):
    """Processing strategies"""

    FASTEST = "fastest"  # Choose fastest processor
    CHEAPEST = "cheapest"  # Choose cheapest processor
    BALANCED = "balanced"  # Balance speed and cost
    FAILOVER = "failover"  # Primary with fallback


@dataclass
class ProcessorMetrics:
    """Real-time processor performance metrics"""

    processor: ProcessorType
    success_rate: float
    avg_processing_time: float  # seconds
    avg_fee_percentage: float
    availability: bool
    last_failure: Optional[datetime]
    failure_count: int
    last_updated: datetime


@dataclass
class SplitCalculation:
    """Payment split calculation result"""

    total_amount: Decimal
    barber_amount: Decimal
    shop_amount: Decimal
    processing_fee: Decimal
    net_barber_amount: Decimal
    commission_rate: float
    calculation_method: str


@dataclass
class PaymentResult:
    """Unified payment result"""

    success: bool
    processor_used: ProcessorType
    payment_id: str
    transaction_id: str
    amount: Decimal
    barber_amount: Decimal
    shop_fee: Decimal
    processing_fee: Decimal
    status: str
    error_message: Optional[str] = None
    metadata: Optional[Dict] = None


class EnhancedPaymentSplitService:
    """
    Advanced payment splitting with intelligent routing
    Features:
    - Dual processor support (Stripe + Square)
    - Intelligent routing based on performance
    - Automatic fallback on failures
    - Cross-processor reconciliation
    - Real-time metrics tracking
    """

    def __init__(self):
        self.settings = Settings()

        # Initialize Stripe
        stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
        self.stripe = stripe
        self.stripe_service = StripeService()
        self.stripe_connect_service = StripeConnectService()

        # Initialize Square
        self.square_client = None
        if SQUARE_AVAILABLE and os.getenv("SQUARE_ACCESS_TOKEN"):
            try:
                self.square_client = SquareClient(
                    access_token=os.getenv("SQUARE_ACCESS_TOKEN"),
                    environment=os.getenv("SQUARE_ENVIRONMENT", "sandbox"),
                )
            except Exception as e:
                logger.warning(f"Failed to initialize Square client: {e}")

        # Processor routing configuration
        self.routing_config = {
            ProcessingMode.FASTEST: self._route_by_speed,
            ProcessingMode.CHEAPEST: self._route_by_cost,
            ProcessingMode.BALANCED: self._route_balanced,
            ProcessingMode.FAILOVER: self._route_with_failover,
        }

        # Default thresholds
        self.performance_thresholds = {
            "min_success_rate": 0.95,  # 95% success rate required
            "max_processing_time": 5.0,  # 5 seconds max
            "max_failure_count": 3,  # Max failures before disabling
            "failure_window_hours": 1,  # Reset failure count after 1 hour
        }

    # ===== MAIN PAYMENT PROCESSING =====

    async def process_payment_with_split(
        self,
        db: Session,
        payment_data: Dict,
        preferred_processor: ProcessorType = ProcessorType.AUTO,
        processing_mode: ProcessingMode = ProcessingMode.BALANCED,
    ) -> PaymentResult:
        """
        Process payment with intelligent routing and automatic split
        """
        try:
            # Calculate split amounts
            split_calc = self.calculate_split(
                Decimal(str(payment_data["amount"])),
                payment_data["barber_payment_model"],
            )

            # Add split amounts to payment data
            payment_data["barber_amount"] = float(split_calc.barber_amount)
            payment_data["shop_amount"] = float(split_calc.shop_amount)
            payment_data["commission_rate"] = split_calc.commission_rate

            # Get processor metrics
            metrics = await self._get_processor_metrics(db)

            # Determine which processor to use
            if preferred_processor == ProcessorType.AUTO:
                processor = await self._select_processor(
                    metrics, processing_mode, payment_data
                )
            else:
                processor = preferred_processor

            # Process payment with selected processor
            result = await self._process_with_processor(
                db, processor, payment_data, split_calc
            )

            # If failed and failover enabled, try alternate processor
            if not result.success and processing_mode == ProcessingMode.FAILOVER:
                alternate_processor = (
                    ProcessorType.SQUARE
                    if processor == ProcessorType.STRIPE
                    else ProcessorType.STRIPE
                )

                if self._is_processor_available(metrics.get(alternate_processor)):
                    logger.info(
                        f"Failing over from {processor} to {alternate_processor}"
                    )
                    result = await self._process_with_processor(
                        db, alternate_processor, payment_data, split_calc
                    )

            # Update metrics
            await self._update_processor_metrics(db, result)

            # Store unified transaction record
            await self._store_unified_transaction(db, result, payment_data)

            return result

        except Exception as e:
            logger.error(f"Payment processing error: {str(e)}")
            return PaymentResult(
                success=False,
                processor_used=ProcessorType.AUTO,
                payment_id="",
                transaction_id="",
                amount=Decimal("0"),
                barber_amount=Decimal("0"),
                shop_fee=Decimal("0"),
                processing_fee=Decimal("0"),
                status="failed",
                error_message=str(e),
            )

    async def _process_with_processor(
        self,
        db: Session,
        processor: ProcessorType,
        payment_data: Dict,
        split_calc: SplitCalculation,
    ) -> PaymentResult:
        """Process payment with specific processor"""
        start_time = time.time()

        try:
            if processor == ProcessorType.STRIPE:
                return await self._process_stripe_payment(db, payment_data, split_calc)
            elif processor == ProcessorType.SQUARE:
                return await self._process_square_payment(db, payment_data, split_calc)
            else:
                raise ValueError(f"Unknown processor: {processor}")

        except Exception as e:
            processing_time = time.time() - start_time
            logger.error(
                f"{processor} payment failed after {processing_time:.2f}s: {str(e)}"
            )

            return PaymentResult(
                success=False,
                processor_used=processor,
                payment_id="",
                transaction_id="",
                amount=Decimal(str(payment_data.get("amount", 0))),
                barber_amount=split_calc.barber_amount,
                shop_fee=split_calc.shop_amount,
                processing_fee=Decimal("0"),
                status="failed",
                error_message=str(e),
                metadata={"processing_time": processing_time},
            )

    async def _process_stripe_payment(
        self, db: Session, payment_data: Dict, split_calc: SplitCalculation
    ) -> PaymentResult:
        """Process payment through Stripe"""
        try:
            # Create Stripe payment with automatic split
            stripe_result = self.create_stripe_payment_with_split(payment_data)

            # Calculate Stripe processing fee (2.9% + $0.30)
            processing_fee = Decimal(str(payment_data["amount"])) * Decimal(
                "0.029"
            ) + Decimal("0.30")

            return PaymentResult(
                success=True,
                processor_used=ProcessorType.STRIPE,
                payment_id=stripe_result["payment_intent_id"],
                transaction_id=stripe_result["payment_intent_id"],
                amount=Decimal(str(stripe_result["amount"])),
                barber_amount=Decimal(str(stripe_result["barber_amount"])),
                shop_fee=Decimal(str(stripe_result["shop_fee"])),
                processing_fee=processing_fee,
                status=stripe_result["status"],
                metadata={
                    "transfer_created": stripe_result.get("transfer_created", False),
                    "stripe_account": payment_data.get("barber_stripe_account_id"),
                },
            )

        except Exception as e:
            raise Exception(f"Stripe payment error: {str(e)}")

    async def _process_square_payment(
        self, db: Session, payment_data: Dict, split_calc: SplitCalculation
    ) -> PaymentResult:
        """Process payment through Square"""
        if not self.square_client:
            raise Exception("Square integration not available")

        try:
            # Create Square payment
            square_result = self.create_square_payment_with_split(payment_data)

            # Calculate Square processing fee (2.6% + $0.10)
            processing_fee = Decimal(str(payment_data["amount"])) * Decimal(
                "0.026"
            ) + Decimal("0.10")

            return PaymentResult(
                success=True,
                processor_used=ProcessorType.SQUARE,
                payment_id=square_result["payment_id"],
                transaction_id=square_result["payment_id"],
                amount=Decimal(str(square_result["amount"])),
                barber_amount=Decimal(str(square_result["barber_amount"])),
                shop_fee=Decimal(str(square_result["shop_fee"])),
                processing_fee=processing_fee,
                status=square_result["status"],
                metadata={
                    "transfer_pending": square_result.get("transfer_pending", True),
                    "square_location": payment_data.get("location_id"),
                },
            )

        except Exception as e:
            raise Exception(f"Square payment error: {str(e)}")

    # ===== INTELLIGENT ROUTING =====

    async def _select_processor(
        self,
        metrics: Dict[ProcessorType, ProcessorMetrics],
        mode: ProcessingMode,
        payment_data: Dict,
    ) -> ProcessorType:
        """Select best processor based on mode and metrics"""
        routing_func = self.routing_config.get(mode, self._route_balanced)
        return routing_func(metrics, payment_data)

    def _route_by_speed(
        self, metrics: Dict[ProcessorType, ProcessorMetrics], payment_data: Dict
    ) -> ProcessorType:
        """Route to fastest processor"""
        available_processors = [
            (p, m) for p, m in metrics.items() if self._is_processor_available(m)
        ]

        if not available_processors:
            raise Exception("No processors available")

        # Sort by processing time
        fastest = min(available_processors, key=lambda x: x[1].avg_processing_time)
        return fastest[0]

    def _route_by_cost(
        self, metrics: Dict[ProcessorType, ProcessorMetrics], payment_data: Dict
    ) -> ProcessorType:
        """Route to cheapest processor"""
        available_processors = [
            (p, m) for p, m in metrics.items() if self._is_processor_available(m)
        ]

        if not available_processors:
            raise Exception("No processors available")

        # Sort by fee percentage
        cheapest = min(available_processors, key=lambda x: x[1].avg_fee_percentage)
        return cheapest[0]

    def _route_balanced(
        self, metrics: Dict[ProcessorType, ProcessorMetrics], payment_data: Dict
    ) -> ProcessorType:
        """Balanced routing considering speed, cost, and reliability"""
        available_processors = [
            (p, m) for p, m in metrics.items() if self._is_processor_available(m)
        ]

        if not available_processors:
            raise Exception("No processors available")

        # Score each processor
        scores = []
        for processor, metric in available_processors:
            # Normalize metrics (lower is better)
            speed_score = metric.avg_processing_time / 10.0  # Normalize to 0-1
            cost_score = metric.avg_fee_percentage / 5.0  # Normalize to 0-1
            reliability_score = 1.0 - metric.success_rate  # Invert so lower is better

            # Weighted score (reliability most important)
            total_score = (
                reliability_score * 0.5  # 50% weight
                + speed_score * 0.3  # 30% weight
                + cost_score * 0.2  # 20% weight
            )

            scores.append((processor, total_score))

        # Return processor with lowest (best) score
        best = min(scores, key=lambda x: x[1])
        return best[0]

    def _route_with_failover(
        self, metrics: Dict[ProcessorType, ProcessorMetrics], payment_data: Dict
    ) -> ProcessorType:
        """Select primary processor with failover capability"""
        # Check if barber has preference
        barber_id = payment_data.get("barber_id")
        if barber_id:
            preference = self._get_barber_processor_preference(barber_id)
            if preference and self._is_processor_available(metrics.get(preference)):
                return preference

        # Otherwise use balanced routing
        return self._route_balanced(metrics, payment_data)

    def _is_processor_available(self, metric: Optional[ProcessorMetrics]) -> bool:
        """Check if processor is available and healthy"""
        if not metric or not metric.availability:
            return False

        # Check success rate
        if metric.success_rate < self.performance_thresholds["min_success_rate"]:
            return False

        # Check failure count
        if metric.failure_count >= self.performance_thresholds["max_failure_count"]:
            # Check if failures are recent
            if metric.last_failure:
                hours_since_failure = (
                    datetime.utcnow() - metric.last_failure
                ).total_seconds() / 3600

                if (
                    hours_since_failure
                    < self.performance_thresholds["failure_window_hours"]
                ):
                    return False

        return True

    # ===== METRICS AND MONITORING =====

    async def _get_processor_metrics(
        self, db: Session
    ) -> Dict[ProcessorType, ProcessorMetrics]:
        """Get real-time processor performance metrics"""
        metrics = {}

        # Get metrics from cache first
        cached_metrics = await cache_service.get("processor_metrics")
        if cached_metrics:
            return cached_metrics

        # Calculate metrics for each processor
        for processor in [ProcessorType.STRIPE, ProcessorType.SQUARE]:
            metric = await self._calculate_processor_metrics(db, processor)
            metrics[processor] = metric

        # Cache for 1 minute
        await cache_service.set("processor_metrics", metrics, expire=60)

        return metrics

    async def _calculate_processor_metrics(
        self, db: Session, processor: ProcessorType
    ) -> ProcessorMetrics:
        """Calculate metrics for a specific processor"""
        # Get recent payments (last hour)
        recent_cutoff = datetime.utcnow() - timedelta(hours=1)

        recent_payments = (
            db.query(Payment)
            .filter(
                and_(
                    Payment.processor == processor.value,
                    Payment.created_at >= recent_cutoff,
                )
            )
            .all()
        )

        if not recent_payments:
            # Return default metrics
            return ProcessorMetrics(
                processor=processor,
                success_rate=1.0,
                avg_processing_time=2.0,
                avg_fee_percentage=2.9 if processor == ProcessorType.STRIPE else 2.6,
                availability=True,
                last_failure=None,
                failure_count=0,
                last_updated=datetime.utcnow(),
            )

        # Calculate metrics
        successful = [p for p in recent_payments if p.status == PaymentStatus.COMPLETED]
        failed = [p for p in recent_payments if p.status == PaymentStatus.FAILED]

        success_rate = len(successful) / len(recent_payments) if recent_payments else 0

        # Average processing time (from metadata)
        processing_times = []
        for payment in successful:
            if payment.metadata and "processing_time" in payment.metadata:
                processing_times.append(payment.metadata["processing_time"])

        avg_processing_time = (
            sum(processing_times) / len(processing_times) if processing_times else 2.0
        )

        # Average fee percentage
        fee_percentages = []
        for payment in successful:
            if payment.processing_fee and payment.amount:
                fee_percent = (payment.processing_fee / payment.amount) * 100
                fee_percentages.append(float(fee_percent))

        avg_fee_percentage = (
            sum(fee_percentages) / len(fee_percentages)
            if fee_percentages
            else (2.9 if processor == ProcessorType.STRIPE else 2.6)
        )

        # Last failure
        last_failure = None
        if failed:
            last_failure = max(p.created_at for p in failed)

        # Check availability
        availability = self._check_processor_availability(processor)

        return ProcessorMetrics(
            processor=processor,
            success_rate=success_rate,
            avg_processing_time=avg_processing_time,
            avg_fee_percentage=avg_fee_percentage,
            availability=availability,
            last_failure=last_failure,
            failure_count=len(failed),
            last_updated=datetime.utcnow(),
        )

    def _check_processor_availability(self, processor: ProcessorType) -> bool:
        """Check if processor API is available"""
        try:
            if processor == ProcessorType.STRIPE:
                # Quick Stripe health check
                stripe.Account.retrieve()
                return True
            elif processor == ProcessorType.SQUARE:
                # Quick Square health check
                if self.square_client:
                    self.square_client.locations.list_locations()
                    return True
                return False
        except Exception:
            return False

        return False

    async def _update_processor_metrics(self, db: Session, result: PaymentResult):
        """Update processor metrics after payment"""
        # Invalidate cache
        await cache_service.delete("processor_metrics")

        # Log result for analytics
        logger.info(
            f"Payment processed via {result.processor_used}: "
            f"Success={result.success}, Amount=${result.amount}, "
            f"Processing Time={result.metadata.get('processing_time', 'N/A')}s"
        )

    # ===== UNIFIED TRANSACTION MANAGEMENT =====

    async def _store_unified_transaction(
        self, db: Session, result: PaymentResult, payment_data: Dict
    ):
        """Store transaction in unified format for both processors"""
        payment = Payment(
            appointment_id=payment_data.get("appointment_id"),
            barber_id=payment_data.get("barber_id"),
            customer_id=payment_data.get("customer_id"),
            processor=result.processor_used.value,
            processor_payment_id=result.payment_id,
            amount=result.amount,
            barber_amount=result.barber_amount,
            shop_fee=result.shop_fee,
            processing_fee=result.processing_fee,
            status=PaymentStatus.COMPLETED if result.success else PaymentStatus.FAILED,
            metadata={
                **result.metadata,
                "commission_rate": payment_data.get("commission_rate"),
                "service_type": payment_data.get("service_type"),
                "processing_mode": payment_data.get("processing_mode", "balanced"),
            },
        )

        db.add(payment)
        db.commit()

    async def get_unified_transaction_history(
        self,
        db: Session,
        barber_id: Optional[int] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        processor: Optional[ProcessorType] = None,
    ) -> List[Dict]:
        """Get unified transaction history across all processors"""
        query = db.query(Payment)

        if barber_id:
            query = query.filter(Payment.barber_id == barber_id)

        if start_date:
            query = query.filter(Payment.created_at >= start_date)

        if end_date:
            query = query.filter(Payment.created_at <= end_date)

        if processor:
            query = query.filter(Payment.processor == processor.value)

        payments = query.order_by(Payment.created_at.desc()).all()

        return [
            {
                "id": payment.id,
                "date": payment.created_at.isoformat(),
                "processor": payment.processor,
                "amount": float(payment.amount),
                "barber_amount": float(payment.barber_amount),
                "shop_fee": float(payment.shop_fee),
                "processing_fee": float(payment.processing_fee),
                "status": payment.status.value,
                "appointment_id": payment.appointment_id,
                "metadata": payment.metadata,
            }
            for payment in payments
        ]

    # ===== RECONCILIATION =====

    async def reconcile_cross_processor_transactions(
        self, db: Session, date: Optional[datetime] = None
    ) -> Dict:
        """Reconcile transactions across Stripe and Square"""
        if not date:
            date = datetime.utcnow().date()

        start_time = datetime.combine(date, datetime.min.time())
        end_time = datetime.combine(date, datetime.max.time())

        # Get transactions from both processors
        stripe_payments = (
            db.query(Payment)
            .filter(
                and_(
                    Payment.processor == ProcessorType.STRIPE.value,
                    Payment.created_at >= start_time,
                    Payment.created_at <= end_time,
                    Payment.status == PaymentStatus.COMPLETED,
                )
            )
            .all()
        )

        square_payments = (
            db.query(Payment)
            .filter(
                and_(
                    Payment.processor == ProcessorType.SQUARE.value,
                    Payment.created_at >= start_time,
                    Payment.created_at <= end_time,
                    Payment.status == PaymentStatus.COMPLETED,
                )
            )
            .all()
        )

        # Calculate totals
        stripe_total = sum(p.amount for p in stripe_payments)
        square_total = sum(p.amount for p in square_payments)

        stripe_fees = sum(p.processing_fee for p in stripe_payments)
        square_fees = sum(p.processing_fee for p in square_payments)

        stripe_shop_revenue = sum(p.shop_fee for p in stripe_payments)
        square_shop_revenue = sum(p.shop_fee for p in square_payments)

        stripe_barber_payouts = sum(p.barber_amount for p in stripe_payments)
        square_barber_payouts = sum(p.barber_amount for p in square_payments)

        return {
            "date": date.isoformat(),
            "stripe": {
                "transaction_count": len(stripe_payments),
                "total_amount": float(stripe_total),
                "processing_fees": float(stripe_fees),
                "shop_revenue": float(stripe_shop_revenue),
                "barber_payouts": float(stripe_barber_payouts),
                "net_revenue": float(stripe_shop_revenue - stripe_fees),
            },
            "square": {
                "transaction_count": len(square_payments),
                "total_amount": float(square_total),
                "processing_fees": float(square_fees),
                "shop_revenue": float(square_shop_revenue),
                "barber_payouts": float(square_barber_payouts),
                "net_revenue": float(square_shop_revenue - square_fees),
            },
            "combined": {
                "transaction_count": len(stripe_payments) + len(square_payments),
                "total_amount": float(stripe_total + square_total),
                "processing_fees": float(stripe_fees + square_fees),
                "shop_revenue": float(stripe_shop_revenue + square_shop_revenue),
                "barber_payouts": float(stripe_barber_payouts + square_barber_payouts),
                "net_revenue": float(
                    (stripe_shop_revenue + square_shop_revenue)
                    - (stripe_fees + square_fees)
                ),
            },
        }

    # ===== OPTIMIZATION ALGORITHMS =====

    async def optimize_payment_routing(
        self, db: Session, lookback_days: int = 30
    ) -> Dict:
        """Analyze historical data and optimize routing rules"""
        start_date = datetime.utcnow() - timedelta(days=lookback_days)

        # Get all payments in period
        payments = db.query(Payment).filter(Payment.created_at >= start_date).all()

        # Analyze by processor
        processor_stats = {}
        for processor in [ProcessorType.STRIPE, ProcessorType.SQUARE]:
            processor_payments = [p for p in payments if p.processor == processor.value]

            if not processor_payments:
                continue

            successful = [
                p for p in processor_payments if p.status == PaymentStatus.COMPLETED
            ]

            total_amount = sum(p.amount for p in successful)
            total_fees = sum(p.processing_fee for p in successful)

            processor_stats[processor.value] = {
                "total_transactions": len(processor_payments),
                "successful_transactions": len(successful),
                "success_rate": len(successful) / len(processor_payments),
                "total_volume": float(total_amount),
                "total_fees": float(total_fees),
                "average_fee_rate": (
                    float(total_fees / total_amount) if total_amount > 0 else 0
                ),
                "average_transaction": (
                    float(total_amount / len(successful)) if successful else 0
                ),
            }

        # Generate recommendations
        recommendations = []

        # Check if one processor has significantly better success rate
        if len(processor_stats) == 2:
            stripe_stats = processor_stats.get(ProcessorType.STRIPE.value, {})
            square_stats = processor_stats.get(ProcessorType.SQUARE.value, {})

            stripe_success = stripe_stats.get("success_rate", 0)
            square_success = square_stats.get("success_rate", 0)

            if stripe_success > square_success + 0.05:  # 5% better
                recommendations.append(
                    {
                        "type": "routing",
                        "priority": "high",
                        "recommendation": "Prioritize Stripe for better success rate",
                        "impact": f"+{(stripe_success - square_success) * 100:.1f}% success rate",
                    }
                )
            elif square_success > stripe_success + 0.05:
                recommendations.append(
                    {
                        "type": "routing",
                        "priority": "high",
                        "recommendation": "Prioritize Square for better success rate",
                        "impact": f"+{(square_success - stripe_success) * 100:.1f}% success rate",
                    }
                )

            # Check fee differences
            stripe_fee_rate = stripe_stats.get("average_fee_rate", 0)
            square_fee_rate = square_stats.get("average_fee_rate", 0)

            if stripe_fee_rate < square_fee_rate - 0.002:  # 0.2% cheaper
                recommendations.append(
                    {
                        "type": "cost",
                        "priority": "medium",
                        "recommendation": "Use Stripe for large transactions to save on fees",
                        "impact": f"-{(square_fee_rate - stripe_fee_rate) * 100:.2f}% in fees",
                    }
                )
            elif square_fee_rate < stripe_fee_rate - 0.002:
                recommendations.append(
                    {
                        "type": "cost",
                        "priority": "medium",
                        "recommendation": "Use Square for large transactions to save on fees",
                        "impact": f"-{(stripe_fee_rate - square_fee_rate) * 100:.2f}% in fees",
                    }
                )

        return {
            "analysis_period": {
                "start": start_date.isoformat(),
                "end": datetime.utcnow().isoformat(),
                "days": lookback_days,
            },
            "processor_statistics": processor_stats,
            "recommendations": recommendations,
            "optimal_routing_config": self._generate_optimal_config(processor_stats),
        }

    def _generate_optimal_config(self, processor_stats: Dict) -> Dict:
        """Generate optimal routing configuration based on stats"""
        config = {
            "primary_processor": ProcessorType.STRIPE.value,
            "fallback_processor": ProcessorType.SQUARE.value,
            "routing_rules": [],
        }

        # Determine primary processor
        stripe_score = self._calculate_processor_score(
            processor_stats.get(ProcessorType.STRIPE.value, {})
        )
        square_score = self._calculate_processor_score(
            processor_stats.get(ProcessorType.SQUARE.value, {})
        )

        if square_score > stripe_score:
            config["primary_processor"] = ProcessorType.SQUARE.value
            config["fallback_processor"] = ProcessorType.STRIPE.value

        # Add routing rules
        if stripe_score > 0 and square_score > 0:
            config["routing_rules"].extend(
                [
                    {
                        "condition": "amount > 1000",
                        "processor": (
                            ProcessorType.STRIPE.value
                            if processor_stats.get(ProcessorType.STRIPE.value, {}).get(
                                "average_fee_rate", 1
                            )
                            < processor_stats.get(ProcessorType.SQUARE.value, {}).get(
                                "average_fee_rate", 1
                            )
                            else ProcessorType.SQUARE.value
                        ),
                        "reason": "Lower fees for large transactions",
                    },
                    {
                        "condition": "time_sensitive",
                        "processor": config["primary_processor"],
                        "reason": "Highest success rate for time-sensitive payments",
                    },
                ]
            )

        return config

    def _calculate_processor_score(self, stats: Dict) -> float:
        """Calculate overall processor score"""
        if not stats:
            return 0

        # Weighted scoring
        success_weight = 0.5
        volume_weight = 0.3
        cost_weight = 0.2

        success_score = stats.get("success_rate", 0) * success_weight

        # Normalize volume (assume $100k/month is good)
        volume_score = min(stats.get("total_volume", 0) / 100000, 1.0) * volume_weight

        # Invert fee rate for cost score (lower is better)
        fee_rate = stats.get("average_fee_rate", 0.03)
        cost_score = (1 - min(fee_rate / 0.05, 1.0)) * cost_weight

        return success_score + volume_score + cost_score

    # ===== HELPER METHODS =====

    def _get_barber_processor_preference(
        self, barber_id: int
    ) -> Optional[ProcessorType]:
        """Get barber's preferred processor"""
        # This would check barber settings/preferences
        # For now, return None to use automatic selection
        return None

    def calculate_split(
        self, total_amount: Decimal, barber_payment_model: Dict
    ) -> SplitCalculation:
        """Calculate payment split between shop and barber"""
        total = Decimal(str(total_amount))

        if barber_payment_model["payment_type"] == "commission":
            commission_rate = Decimal(
                str(barber_payment_model["service_commission_rate"])
            )
            shop_amount = total * commission_rate
            barber_amount = total - shop_amount
            method = "commission"

        elif barber_payment_model["payment_type"] == "booth_rent":
            # Booth rent model - barber keeps everything
            shop_amount = Decimal("0")
            barber_amount = total
            method = "booth_rent"

        elif barber_payment_model["payment_type"] == "hybrid":
            commission_rate = Decimal(
                str(barber_payment_model["service_commission_rate"])
            )
            shop_amount = total * commission_rate
            barber_amount = total - shop_amount
            method = "hybrid"

        else:
            # Default - no split
            shop_amount = Decimal("0")
            barber_amount = total
            method = "default"
            commission_rate = Decimal("0")

        # Estimate processing fee (will be calculated accurately by processor)
        processing_fee = total * Decimal("0.029") + Decimal("0.30")  # Stripe estimate
        net_barber_amount = barber_amount - processing_fee

        return SplitCalculation(
            total_amount=total,
            barber_amount=barber_amount,
            shop_amount=shop_amount,
            processing_fee=processing_fee,
            net_barber_amount=net_barber_amount,
            commission_rate=float(
                barber_payment_model.get("service_commission_rate", 0)
            ),
            calculation_method=method,
        )

    # ===== STRIPE METHODS (from original service) =====

    def create_stripe_payment_with_split(self, payment_data: Dict) -> Dict:
        """Create a payment that automatically splits between shop and barber"""
        try:
            amount_cents = int(payment_data["amount"] * 100)
            barber_amount_cents = int(payment_data["barber_amount"] * 100)
            shop_fee_cents = amount_cents - barber_amount_cents

            # Create payment intent with automatic transfer to barber
            payment_intent = self.stripe.PaymentIntent.create(
                amount=amount_cents,
                currency="usd",
                payment_method=payment_data.get("payment_method_id"),
                customer=payment_data.get("customer_id"),
                description=payment_data.get("description", "Service payment"),
                transfer_data={
                    "destination": payment_data["barber_stripe_account_id"],
                    "amount": barber_amount_cents,
                },
                application_fee_amount=shop_fee_cents,
                metadata={
                    "barber_id": str(payment_data["barber_id"]),
                    "appointment_id": str(payment_data.get("appointment_id", "")),
                    "service_type": payment_data.get("service_type", "haircut"),
                    "commission_rate": str(payment_data["commission_rate"]),
                },
                confirm=True,
                return_url=payment_data.get(
                    "return_url", "https://yourdomain.com/success"
                ),
            )

            return {
                "payment_intent_id": payment_intent.id,
                "status": payment_intent.status,
                "amount": float(payment_intent.amount) / 100,
                "barber_amount": float(barber_amount_cents) / 100,
                "shop_fee": float(shop_fee_cents) / 100,
                "transfer_created": True,
            }

        except stripe.error.StripeError as e:
            raise Exception(f"Stripe payment error: {str(e)}")

    # ===== SQUARE METHODS (from original service) =====

    def create_square_payment_with_split(self, payment_data: Dict) -> Dict:
        """Create a Square payment that splits between shop and barber"""
        if not self.square_client:
            raise Exception("Square integration is not available")

        try:
            result = self.square_client.payments.create_payment(
                body={
                    "source_id": payment_data["source_id"],
                    "idempotency_key": payment_data.get("idempotency_key"),
                    "amount_money": {
                        "amount": int(payment_data["amount"] * 100),
                        "currency": "USD",
                    },
                    "location_id": payment_data["location_id"],
                    "note": payment_data.get("description", "Service payment"),
                    "reference_id": str(payment_data.get("appointment_id", "")),
                    "customer_id": payment_data.get("customer_id"),
                }
            )

            if result.is_success():
                payment = result.body["payment"]
                total_amount = float(payment["amount_money"]["amount"]) / 100
                barber_amount = payment_data["barber_amount"]
                shop_fee = total_amount - barber_amount

                return {
                    "payment_id": payment["id"],
                    "status": payment["status"],
                    "amount": total_amount,
                    "barber_amount": barber_amount,
                    "shop_fee": shop_fee,
                    "transfer_pending": True,
                }
            else:
                raise Exception(f"Square payment failed: {result.errors}")

        except Exception as e:
            raise Exception(f"Square payment error: {str(e)}")


# Create service instance
enhanced_payment_split_service = EnhancedPaymentSplitService()
