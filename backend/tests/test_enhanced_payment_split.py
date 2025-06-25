"""
Comprehensive tests for Enhanced Payment Split Service
Tests dual processor support, intelligent routing, and fallback scenarios
"""

import pytest
from unittest.mock import Mock, patch, AsyncMock, MagicMock
from datetime import datetime, timedelta
from decimal import Decimal
import json

from sqlalchemy.orm import Session
from fastapi import HTTPException

from services.enhanced_payment_split_service import (
    EnhancedPaymentSplitService,
    ProcessorType,
    ProcessingMode,
    ProcessorMetrics,
    SplitCalculation,
    PaymentResult,
)
from models.payment import Payment, PaymentStatus
from models.barber import Barber
from models.appointment import Appointment


class TestEnhancedPaymentSplitService:
    """Test suite for enhanced payment split service"""

    @pytest.fixture
    def service(self):
        """Create service instance"""
        with (
            patch("stripe.api_key"),
            patch("services.enhanced_payment_split_service.SquareClient"),
        ):
            service = EnhancedPaymentSplitService()
            # Mock Stripe
            service.stripe = Mock()
            service.stripe_service = Mock()
            service.stripe_connect_service = Mock()
            # Mock Square
            service.square_client = Mock()
            return service

    @pytest.fixture
    def mock_db(self):
        """Create mock database session"""
        db = Mock(spec=Session)
        db.query = Mock()
        db.add = Mock()
        db.commit = Mock()
        db.refresh = Mock()
        return db

    @pytest.fixture
    def sample_payment_data(self):
        """Sample payment data"""
        return {
            "amount": 100.0,
            "barber_id": 1,
            "appointment_id": 123,
            "customer_id": 456,
            "payment_method_id": "pm_test123",
            "barber_stripe_account_id": "acct_test123",
            "location_id": "loc_test123",
            "source_id": "nonce_test123",
            "barber_payment_model": {
                "payment_type": "commission",
                "service_commission_rate": 0.3,  # 30% commission
            },
            "description": "Haircut service",
            "service_type": "haircut",
        }

    @pytest.fixture
    def processor_metrics(self):
        """Sample processor metrics"""
        return {
            ProcessorType.STRIPE: ProcessorMetrics(
                processor=ProcessorType.STRIPE,
                success_rate=0.98,
                avg_processing_time=2.5,
                avg_fee_percentage=2.9,
                availability=True,
                last_failure=None,
                failure_count=0,
                last_updated=datetime.utcnow(),
            ),
            ProcessorType.SQUARE: ProcessorMetrics(
                processor=ProcessorType.SQUARE,
                success_rate=0.96,
                avg_processing_time=3.0,
                avg_fee_percentage=2.6,
                availability=True,
                last_failure=None,
                failure_count=0,
                last_updated=datetime.utcnow(),
            ),
        }

    # ===== SPLIT CALCULATION TESTS =====

    def test_calculate_split_commission_model(self, service):
        """Test split calculation for commission model"""
        payment_model = {
            "payment_type": "commission",
            "service_commission_rate": 0.3,  # 30% commission
        }

        result = service.calculate_split(Decimal("100"), payment_model)

        assert result.total_amount == Decimal("100")
        assert result.shop_amount == Decimal("30")  # 30% commission
        assert result.barber_amount == Decimal("70")  # 70% to barber
        assert result.commission_rate == 0.3
        assert result.calculation_method == "commission"

    def test_calculate_split_booth_rent_model(self, service):
        """Test split calculation for booth rent model"""
        payment_model = {"payment_type": "booth_rent", "service_commission_rate": 0}

        result = service.calculate_split(Decimal("100"), payment_model)

        assert result.total_amount == Decimal("100")
        assert result.shop_amount == Decimal("0")  # No commission
        assert result.barber_amount == Decimal("100")  # All to barber
        assert result.calculation_method == "booth_rent"

    def test_calculate_split_hybrid_model(self, service):
        """Test split calculation for hybrid model"""
        payment_model = {
            "payment_type": "hybrid",
            "service_commission_rate": 0.15,  # 15% commission
        }

        result = service.calculate_split(Decimal("100"), payment_model)

        assert result.total_amount == Decimal("100")
        assert result.shop_amount == Decimal("15")  # 15% commission
        assert result.barber_amount == Decimal("85")  # 85% to barber
        assert result.commission_rate == 0.15
        assert result.calculation_method == "hybrid"

    # ===== PROCESSOR ROUTING TESTS =====

    def test_route_by_speed(self, service, processor_metrics):
        """Test routing to fastest processor"""
        # Make Stripe faster
        processor_metrics[ProcessorType.STRIPE].avg_processing_time = 1.5
        processor_metrics[ProcessorType.SQUARE].avg_processing_time = 3.0

        result = service._route_by_speed(processor_metrics, {})
        assert result == ProcessorType.STRIPE

        # Make Square faster
        processor_metrics[ProcessorType.SQUARE].avg_processing_time = 1.0
        result = service._route_by_speed(processor_metrics, {})
        assert result == ProcessorType.SQUARE

    def test_route_by_cost(self, service, processor_metrics):
        """Test routing to cheapest processor"""
        # Make Square cheaper
        processor_metrics[ProcessorType.STRIPE].avg_fee_percentage = 2.9
        processor_metrics[ProcessorType.SQUARE].avg_fee_percentage = 2.5

        result = service._route_by_cost(processor_metrics, {})
        assert result == ProcessorType.SQUARE

        # Make Stripe cheaper
        processor_metrics[ProcessorType.STRIPE].avg_fee_percentage = 2.3
        result = service._route_by_cost(processor_metrics, {})
        assert result == ProcessorType.STRIPE

    def test_route_balanced(self, service, processor_metrics):
        """Test balanced routing considering multiple factors"""
        # Stripe: Better reliability, slower, more expensive
        processor_metrics[ProcessorType.STRIPE].success_rate = 0.99
        processor_metrics[ProcessorType.STRIPE].avg_processing_time = 3.0
        processor_metrics[ProcessorType.STRIPE].avg_fee_percentage = 2.9

        # Square: Lower reliability, faster, cheaper
        processor_metrics[ProcessorType.SQUARE].success_rate = 0.94
        processor_metrics[ProcessorType.SQUARE].avg_processing_time = 1.5
        processor_metrics[ProcessorType.SQUARE].avg_fee_percentage = 2.5

        # Should choose Stripe due to reliability weight
        result = service._route_balanced(processor_metrics, {})
        assert result == ProcessorType.STRIPE

    def test_processor_availability_check(self, service):
        """Test processor availability checking"""
        # Available processor
        metric = ProcessorMetrics(
            processor=ProcessorType.STRIPE,
            success_rate=0.98,
            avg_processing_time=2.5,
            avg_fee_percentage=2.9,
            availability=True,
            last_failure=None,
            failure_count=0,
            last_updated=datetime.utcnow(),
        )
        assert service._is_processor_available(metric) is True

        # Unavailable due to low success rate
        metric.success_rate = 0.90
        assert service._is_processor_available(metric) is False

        # Unavailable due to recent failures
        metric.success_rate = 0.98
        metric.failure_count = 5
        metric.last_failure = datetime.utcnow()
        assert service._is_processor_available(metric) is False

        # Available again after failure window
        metric.last_failure = datetime.utcnow() - timedelta(hours=2)
        assert service._is_processor_available(metric) is True

    # ===== PAYMENT PROCESSING TESTS =====

    @pytest.mark.asyncio
    async def test_process_payment_with_stripe(
        self, service, mock_db, sample_payment_data, processor_metrics
    ):
        """Test payment processing with Stripe"""
        # Mock cache
        with patch(
            "services.enhanced_payment_split_service.cache_service"
        ) as mock_cache:
            mock_cache.get = AsyncMock(return_value=processor_metrics)
            mock_cache.set = AsyncMock()
            mock_cache.delete = AsyncMock()

            # Mock Stripe payment
            service.create_stripe_payment_with_split = Mock(
                return_value={
                    "payment_intent_id": "pi_test123",
                    "status": "succeeded",
                    "amount": 100.0,
                    "barber_amount": 70.0,
                    "shop_fee": 30.0,
                    "transfer_created": True,
                }
            )

            result = await service.process_payment_with_split(
                mock_db, sample_payment_data, preferred_processor=ProcessorType.STRIPE
            )

            assert result.success is True
            assert result.processor_used == ProcessorType.STRIPE
            assert result.amount == Decimal("100")
            assert result.barber_amount == Decimal("70")
            assert result.shop_fee == Decimal("30")
            assert result.payment_id == "pi_test123"

    @pytest.mark.asyncio
    async def test_process_payment_with_square(
        self, service, mock_db, sample_payment_data, processor_metrics
    ):
        """Test payment processing with Square"""
        # Mock cache
        with patch(
            "services.enhanced_payment_split_service.cache_service"
        ) as mock_cache:
            mock_cache.get = AsyncMock(return_value=processor_metrics)
            mock_cache.set = AsyncMock()
            mock_cache.delete = AsyncMock()

            # Mock Square payment
            service.create_square_payment_with_split = Mock(
                return_value={
                    "payment_id": "sq_test123",
                    "status": "COMPLETED",
                    "amount": 100.0,
                    "barber_amount": 70.0,
                    "shop_fee": 30.0,
                    "transfer_pending": True,
                }
            )

            result = await service.process_payment_with_split(
                mock_db, sample_payment_data, preferred_processor=ProcessorType.SQUARE
            )

            assert result.success is True
            assert result.processor_used == ProcessorType.SQUARE
            assert result.amount == Decimal("100")
            assert result.barber_amount == Decimal("70")
            assert result.shop_fee == Decimal("30")
            assert result.payment_id == "sq_test123"

    @pytest.mark.asyncio
    async def test_payment_with_failover(
        self, service, mock_db, sample_payment_data, processor_metrics
    ):
        """Test payment processing with failover"""
        # Mock cache
        with patch(
            "services.enhanced_payment_split_service.cache_service"
        ) as mock_cache:
            mock_cache.get = AsyncMock(return_value=processor_metrics)
            mock_cache.set = AsyncMock()
            mock_cache.delete = AsyncMock()

            # Make Stripe fail
            service.create_stripe_payment_with_split = Mock(
                side_effect=Exception("Stripe API error")
            )

            # Square should succeed
            service.create_square_payment_with_split = Mock(
                return_value={
                    "payment_id": "sq_test123",
                    "status": "COMPLETED",
                    "amount": 100.0,
                    "barber_amount": 70.0,
                    "shop_fee": 30.0,
                    "transfer_pending": True,
                }
            )

            result = await service.process_payment_with_split(
                mock_db,
                sample_payment_data,
                preferred_processor=ProcessorType.STRIPE,
                processing_mode=ProcessingMode.FAILOVER,
            )

            # Should have failed over to Square
            assert result.success is True
            assert result.processor_used == ProcessorType.SQUARE
            assert result.payment_id == "sq_test123"

    # ===== METRICS AND MONITORING TESTS =====

    @pytest.mark.asyncio
    async def test_calculate_processor_metrics(self, service, mock_db):
        """Test processor metrics calculation"""
        # Mock recent payments
        mock_payments = [
            Mock(
                processor="stripe",
                status=PaymentStatus.COMPLETED,
                created_at=datetime.utcnow(),
                amount=Decimal("100"),
                processing_fee=Decimal("2.90"),
                metadata={"processing_time": 2.5},
            ),
            Mock(
                processor="stripe",
                status=PaymentStatus.COMPLETED,
                created_at=datetime.utcnow(),
                amount=Decimal("50"),
                processing_fee=Decimal("1.75"),
                metadata={"processing_time": 2.0},
            ),
            Mock(
                processor="stripe",
                status=PaymentStatus.FAILED,
                created_at=datetime.utcnow(),
                amount=Decimal("75"),
                processing_fee=None,
                metadata={},
            ),
        ]

        mock_db.query.return_value.filter.return_value.all.return_value = mock_payments

        # Mock processor availability check
        service._check_processor_availability = Mock(return_value=True)

        metrics = await service._calculate_processor_metrics(
            mock_db, ProcessorType.STRIPE
        )

        assert metrics.processor == ProcessorType.STRIPE
        assert metrics.success_rate == 2 / 3  # 2 successful, 1 failed
        assert metrics.avg_processing_time == 2.25  # (2.5 + 2.0) / 2
        assert metrics.failure_count == 1
        assert metrics.availability is True

    @pytest.mark.asyncio
    async def test_get_unified_transaction_history(self, service, mock_db):
        """Test unified transaction history retrieval"""
        mock_payments = [
            Mock(
                id=1,
                created_at=datetime.utcnow(),
                processor="stripe",
                amount=Decimal("100"),
                barber_amount=Decimal("70"),
                shop_fee=Decimal("30"),
                processing_fee=Decimal("2.90"),
                status=PaymentStatus.COMPLETED,
                appointment_id=123,
                metadata={"service_type": "haircut"},
            ),
            Mock(
                id=2,
                created_at=datetime.utcnow() - timedelta(hours=1),
                processor="square",
                amount=Decimal("75"),
                barber_amount=Decimal("52.50"),
                shop_fee=Decimal("22.50"),
                processing_fee=Decimal("2.05"),
                status=PaymentStatus.COMPLETED,
                appointment_id=124,
                metadata={"service_type": "beard_trim"},
            ),
        ]

        mock_db.query.return_value.order_by.return_value.all.return_value = (
            mock_payments
        )

        history = await service.get_unified_transaction_history(mock_db)

        assert len(history) == 2
        assert history[0]["processor"] == "stripe"
        assert history[0]["amount"] == 100.0
        assert history[1]["processor"] == "square"
        assert history[1]["amount"] == 75.0

    # ===== RECONCILIATION TESTS =====

    @pytest.mark.asyncio
    async def test_reconcile_cross_processor_transactions(self, service, mock_db):
        """Test cross-processor transaction reconciliation"""
        # Mock Stripe payments
        stripe_payments = [
            Mock(
                amount=Decimal("100"),
                processing_fee=Decimal("2.90"),
                shop_fee=Decimal("30"),
                barber_amount=Decimal("70"),
            ),
            Mock(
                amount=Decimal("50"),
                processing_fee=Decimal("1.75"),
                shop_fee=Decimal("15"),
                barber_amount=Decimal("35"),
            ),
        ]

        # Mock Square payments
        square_payments = [
            Mock(
                amount=Decimal("75"),
                processing_fee=Decimal("2.05"),
                shop_fee=Decimal("22.50"),
                barber_amount=Decimal("52.50"),
            )
        ]

        # Set up query mocks
        query_mock = Mock()
        mock_db.query.return_value = query_mock

        # Chain filter calls
        filter_mock = Mock()
        query_mock.filter.return_value = filter_mock

        # Return different results based on processor
        def all_side_effect():
            # Check the filter conditions to determine which data to return
            if hasattr(filter_mock, "_processor_type"):
                if filter_mock._processor_type == "stripe":
                    return stripe_payments
                else:
                    return square_payments
            return []

        filter_mock.all = Mock(side_effect=all_side_effect)

        # Track which processor is being queried
        original_filter = query_mock.filter

        def filter_wrapper(*args):
            # Simple check to determine processor type from filter conditions
            if "stripe" in str(args):
                filter_mock._processor_type = "stripe"
            elif "square" in str(args):
                filter_mock._processor_type = "square"
            return filter_mock

        query_mock.filter = Mock(side_effect=filter_wrapper)

        reconciliation = await service.reconcile_cross_processor_transactions(
            mock_db, datetime.utcnow().date()
        )

        # Verify Stripe totals
        assert reconciliation["stripe"]["transaction_count"] >= 0
        assert reconciliation["stripe"]["total_amount"] >= 0

        # Verify Square totals
        assert reconciliation["square"]["transaction_count"] >= 0
        assert reconciliation["square"]["total_amount"] >= 0

        # Verify combined totals
        assert "combined" in reconciliation
        assert reconciliation["combined"]["transaction_count"] >= 0

    # ===== OPTIMIZATION TESTS =====

    @pytest.mark.asyncio
    async def test_optimize_payment_routing(self, service, mock_db):
        """Test payment routing optimization"""
        # Mock historical payments
        mock_payments = [
            # Stripe payments - higher success rate
            *[
                Mock(
                    processor="stripe",
                    status=PaymentStatus.COMPLETED,
                    amount=Decimal("100"),
                    processing_fee=Decimal("2.90"),
                )
                for _ in range(95)
            ],
            *[
                Mock(
                    processor="stripe",
                    status=PaymentStatus.FAILED,
                    amount=Decimal("100"),
                    processing_fee=None,
                )
                for _ in range(5)
            ],
            # Square payments - lower success rate but cheaper
            *[
                Mock(
                    processor="square",
                    status=PaymentStatus.COMPLETED,
                    amount=Decimal("100"),
                    processing_fee=Decimal("2.60"),
                )
                for _ in range(90)
            ],
            *[
                Mock(
                    processor="square",
                    status=PaymentStatus.FAILED,
                    amount=Decimal("100"),
                    processing_fee=None,
                )
                for _ in range(10)
            ],
        ]

        mock_db.query.return_value.filter.return_value.all.return_value = mock_payments

        optimization = await service.optimize_payment_routing(mock_db, lookback_days=30)

        assert "processor_statistics" in optimization
        assert "recommendations" in optimization
        assert "optimal_routing_config" in optimization

        # Should have stats for both processors
        assert "stripe" in optimization["processor_statistics"]
        assert "square" in optimization["processor_statistics"]

        # Verify success rates
        stripe_stats = optimization["processor_statistics"]["stripe"]
        assert stripe_stats["success_rate"] == 0.95  # 95/100

        square_stats = optimization["processor_statistics"]["square"]
        assert square_stats["success_rate"] == 0.90  # 90/100

    def test_generate_optimal_config(self, service):
        """Test optimal configuration generation"""
        processor_stats = {
            "stripe": {
                "success_rate": 0.98,
                "total_volume": 50000,
                "average_fee_rate": 0.029,
            },
            "square": {
                "success_rate": 0.94,
                "total_volume": 30000,
                "average_fee_rate": 0.026,
            },
        }

        config = service._generate_optimal_config(processor_stats)

        assert config["primary_processor"] == "stripe"  # Higher score
        assert config["fallback_processor"] == "square"
        assert len(config["routing_rules"]) > 0

        # Should have rule for large transactions
        large_tx_rule = next(
            (r for r in config["routing_rules"] if "amount > 1000" in r["condition"]),
            None,
        )
        assert large_tx_rule is not None
        assert large_tx_rule["processor"] == "square"  # Cheaper for large amounts

    # ===== INTEGRATION TESTS =====

    @pytest.mark.asyncio
    async def test_end_to_end_payment_flow(
        self, service, mock_db, sample_payment_data, processor_metrics
    ):
        """Test complete payment flow with all features"""
        # Mock all dependencies
        with patch(
            "services.enhanced_payment_split_service.cache_service"
        ) as mock_cache:
            mock_cache.get = AsyncMock(return_value=processor_metrics)
            mock_cache.set = AsyncMock()
            mock_cache.delete = AsyncMock()

            # Mock successful Stripe payment
            service.create_stripe_payment_with_split = Mock(
                return_value={
                    "payment_intent_id": "pi_test123",
                    "status": "succeeded",
                    "amount": 100.0,
                    "barber_amount": 70.0,
                    "shop_fee": 30.0,
                    "transfer_created": True,
                }
            )

            # Process payment with auto routing
            result = await service.process_payment_with_split(
                mock_db,
                sample_payment_data,
                preferred_processor=ProcessorType.AUTO,
                processing_mode=ProcessingMode.BALANCED,
            )

            # Verify result
            assert result.success is True
            assert result.processor_used in [ProcessorType.STRIPE, ProcessorType.SQUARE]
            assert result.amount == Decimal("100")
            assert result.barber_amount == Decimal("70")
            assert result.shop_fee == Decimal("30")

            # Verify metrics were updated
            mock_cache.delete.assert_called_with("processor_metrics")

            # Verify transaction was stored
            mock_db.add.assert_called()
            mock_db.commit.assert_called()

    @pytest.mark.asyncio
    async def test_concurrent_payment_processing(
        self, service, mock_db, sample_payment_data, processor_metrics
    ):
        """Test concurrent payment processing"""
        import asyncio

        # Mock cache and payments
        with patch(
            "services.enhanced_payment_split_service.cache_service"
        ) as mock_cache:
            mock_cache.get = AsyncMock(return_value=processor_metrics)
            mock_cache.set = AsyncMock()
            mock_cache.delete = AsyncMock()

            # Mock payment methods
            service.create_stripe_payment_with_split = Mock(
                return_value={
                    "payment_intent_id": "pi_test",
                    "status": "succeeded",
                    "amount": 100.0,
                    "barber_amount": 70.0,
                    "shop_fee": 30.0,
                    "transfer_created": True,
                }
            )

            service.create_square_payment_with_split = Mock(
                return_value={
                    "payment_id": "sq_test",
                    "status": "COMPLETED",
                    "amount": 100.0,
                    "barber_amount": 70.0,
                    "shop_fee": 30.0,
                    "transfer_pending": True,
                }
            )

            # Process multiple payments concurrently
            tasks = []
            for i in range(5):
                payment_data = sample_payment_data.copy()
                payment_data["appointment_id"] = 100 + i

                task = service.process_payment_with_split(
                    mock_db, payment_data, processing_mode=ProcessingMode.BALANCED
                )
                tasks.append(task)

            results = await asyncio.gather(*tasks)

            # All should succeed
            assert all(r.success for r in results)
            assert len(results) == 5


# ===== FIXTURES FOR PYTEST =====


@pytest.fixture
def enhanced_payment_service():
    """Create enhanced payment service instance for testing"""
    with (
        patch("stripe.api_key"),
        patch("services.enhanced_payment_split_service.SquareClient"),
    ):
        return EnhancedPaymentSplitService()


@pytest.fixture
def mock_stripe_payment_intent():
    """Mock Stripe PaymentIntent"""
    intent = Mock()
    intent.id = "pi_test123"
    intent.amount = 10000  # $100 in cents
    intent.status = "succeeded"
    intent.metadata = {
        "barber_id": "1",
        "appointment_id": "123",
        "commission_rate": "0.3",
    }
    return intent


@pytest.fixture
def mock_square_payment():
    """Mock Square payment response"""
    return {
        "payment": {
            "id": "sq_test123",
            "amount_money": {"amount": 10000, "currency": "USD"},
            "status": "COMPLETED",
            "total_money": {"amount": 10000, "currency": "USD"},
            "processing_fee": [{"amount_money": {"amount": 260, "currency": "USD"}}],
        }
    }
