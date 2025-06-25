"""
Comprehensive tests for the Payout Scheduler Service
"""

import pytest
import asyncio
from datetime import datetime, timedelta
from decimal import Decimal
from unittest.mock import Mock, patch, AsyncMock
from sqlalchemy.ext.asyncio import AsyncSession

from services.payout_scheduler_service import (
    PayoutSchedulerService,
    PayoutCalculationResult,
    PayoutAttemptResult,
    PayoutPriority,
    PayoutCalculationMethod,
)
from models.payout_schedule import (
    PayoutSchedule,
    ScheduledPayout,
    PayoutFrequency,
    PayoutStatus,
    PayoutType,
)
from models.barber import Barber
from models.barber_payment import BarberPayment


@pytest.fixture
async def payout_service():
    """Create a payout scheduler service instance"""
    service = PayoutSchedulerService(redis_url="redis://localhost:6379/1")
    await service.initialize()
    yield service
    await service.stop()


@pytest.fixture
def mock_barber():
    """Create a mock barber"""
    barber = Mock(spec=Barber)
    barber.id = 1
    barber.name = "Test Barber"
    barber.email = "barber@test.com"
    barber.phone = "+1234567890"
    barber.stripe_account_id = "acct_test123"
    barber.bank_account_id = None
    return barber


@pytest.fixture
def mock_schedule(mock_barber):
    """Create a mock payout schedule"""
    schedule = Mock(spec=PayoutSchedule)
    schedule.id = 1
    schedule.barber_id = 1
    schedule.barber = mock_barber
    schedule.frequency = PayoutFrequency.WEEKLY
    schedule.day_of_week = 5  # Friday
    schedule.minimum_payout_amount = Decimal("25.00")
    schedule.auto_payout_enabled = True
    schedule.email_notifications = True
    schedule.sms_notifications = False
    schedule.advance_notice_days = 1
    schedule.preferred_payment_method = "stripe"
    schedule.is_active = True
    schedule.last_payout_date = datetime.utcnow() - timedelta(days=7)
    schedule.next_payout_date = datetime.utcnow()
    schedule.total_payouts_sent = 10
    schedule.total_amount_paid = Decimal("5000.00")
    return schedule


@pytest.fixture
def mock_earnings():
    """Create mock earnings data"""
    earnings = []
    for i in range(10):
        payment = Mock(spec=BarberPayment)
        payment.id = i + 1
        payment.barber_id = 1
        payment.amount = Decimal("100.00")
        payment.payment_date = datetime.utcnow() - timedelta(days=i)
        payment.status = "completed"
        earnings.append(payment)
    return earnings


class TestPayoutSchedulerService:
    """Test suite for PayoutSchedulerService"""

    @pytest.mark.asyncio
    async def test_service_initialization(self, payout_service):
        """Test service initializes correctly"""
        assert payout_service.scheduler is not None
        assert payout_service.redis_client is not None
        assert payout_service.max_concurrent_payouts == 10
        assert payout_service.batch_size == 50

    @pytest.mark.asyncio
    async def test_create_payout_schedule_success(self, payout_service, mock_barber):
        """Test successful payout schedule creation"""
        mock_db = AsyncMock(spec=AsyncSession)
        mock_db.get.return_value = mock_barber
        mock_db.add = Mock()
        mock_db.commit = AsyncMock()
        mock_db.refresh = AsyncMock()

        settings = {
            "day_of_week": 5,
            "minimum_amount": 50.00,
            "auto_enabled": True,
            "email_notifications": True,
            "payment_method": "stripe",
        }

        with patch.object(
            payout_service, "_schedule_payout_job", new_callable=AsyncMock
        ):
            with patch.object(
                payout_service, "_send_schedule_confirmation", new_callable=AsyncMock
            ):
                result = await payout_service.create_payout_schedule(
                    barber_id=1,
                    frequency=PayoutFrequency.WEEKLY,
                    settings=settings,
                    db=mock_db,
                )

        assert mock_db.add.called
        assert mock_db.commit.called

    @pytest.mark.asyncio
    async def test_create_payout_schedule_no_payment_method(self, payout_service):
        """Test schedule creation fails without payment method"""
        mock_db = AsyncMock(spec=AsyncSession)
        mock_barber = Mock(spec=Barber)
        mock_barber.stripe_account_id = None
        mock_barber.bank_account_id = None
        mock_db.get.return_value = mock_barber

        with pytest.raises(ValueError, match="no payment method configured"):
            await payout_service.create_payout_schedule(
                barber_id=1, frequency=PayoutFrequency.WEEKLY, settings={}, db=mock_db
            )

    @pytest.mark.asyncio
    async def test_calculate_payout_amount(
        self, payout_service, mock_schedule, mock_earnings
    ):
        """Test payout amount calculation"""
        mock_db = AsyncMock(spec=AsyncSession)

        # Mock the earnings query
        mock_result = Mock()
        mock_result.scalars.return_value.all.return_value = mock_earnings
        mock_db.execute.return_value = mock_result

        # Mock commission calculation
        with patch.object(
            payout_service, "_calculate_commission", new_callable=AsyncMock
        ) as mock_comm:
            mock_comm.return_value = Decimal("700.00")  # 70% of $1000

            with patch.object(
                payout_service, "_calculate_deductions", new_callable=AsyncMock
            ) as mock_ded:
                mock_ded.return_value = Decimal("50.00")

                with patch.object(
                    payout_service, "_calculate_platform_fees"
                ) as mock_fees:
                    mock_fees.return_value = Decimal("2.00")

                    result = await payout_service._calculate_payout_amount(
                        mock_schedule, mock_db
                    )

        assert result.gross_amount == Decimal("1000.00")  # 10 x $100
        assert result.net_amount == Decimal("648.00")  # $700 - $50 - $2
        assert result.earnings_count == 10
        assert result.calculation_method == "standard_commission"

    @pytest.mark.asyncio
    async def test_calculate_commission_tiered(self, payout_service):
        """Test tiered commission calculation"""
        mock_db = AsyncMock(spec=AsyncSession)
        mock_barber = Mock(spec=Barber)
        mock_barber.custom_commission_rate = None
        mock_db.get.return_value = mock_barber

        # Test high performer (>100 services)
        commission = await payout_service._calculate_commission(
            barber_id=1, gross_amount=Decimal("15000.00"), service_count=120, db=mock_db
        )

        # Should get 75% base + 2% volume bonus = 77%
        expected = Decimal("15000.00") * Decimal("0.77")
        assert commission == expected

    @pytest.mark.asyncio
    async def test_execute_stripe_payout_success(self, payout_service, mock_barber):
        """Test successful Stripe payout execution"""
        mock_payout = Mock(spec=ScheduledPayout)
        mock_payout.id = 1
        mock_payout.amount = Decimal("500.00")
        mock_payout.period_start = datetime.utcnow() - timedelta(days=7)
        mock_payout.period_end = datetime.utcnow()

        with patch.object(
            payout_service.stripe_service, "check_account_status"
        ) as mock_check:
            mock_check.return_value = {
                "payouts_enabled": True,
                "account_id": "acct_test123",
            }

            with patch.object(
                payout_service.stripe_service, "create_direct_transfer"
            ) as mock_transfer:
                mock_transfer.return_value = {
                    "transfer_id": "tr_test123",
                    "payout_id": "po_test123",
                    "amount": 500.00,
                }

                result = await payout_service._execute_stripe_payout(
                    mock_barber, mock_payout, instant=False
                )

        assert result.success is True
        assert result.platform_reference == "tr_test123"
        assert mock_transfer.called

    @pytest.mark.asyncio
    async def test_execute_stripe_payout_no_account(self, payout_service):
        """Test Stripe payout fails without connected account"""
        mock_barber = Mock(spec=Barber)
        mock_barber.stripe_account_id = None

        mock_payout = Mock(spec=ScheduledPayout)

        result = await payout_service._execute_stripe_payout(mock_barber, mock_payout)

        assert result.success is False
        assert result.error_message == "No Stripe account connected"
        assert result.retry_eligible is False

    @pytest.mark.asyncio
    async def test_handle_payout_failure_with_retry(
        self, payout_service, mock_schedule
    ):
        """Test handling payout failure with retry"""
        mock_db = AsyncMock(spec=AsyncSession)

        mock_payout = Mock(spec=ScheduledPayout)
        mock_payout.id = 1
        mock_payout.status = PayoutStatus.PENDING
        mock_payout.retry_count = 0
        mock_payout.max_retries = 3
        mock_payout.amount = Decimal("100.00")

        result = PayoutAttemptResult(
            success=False,
            error_message="Network error",
            error_code="network_error",
            retry_eligible=True,
        )

        with patch.object(
            payout_service, "_add_to_retry_queue", new_callable=AsyncMock
        ):
            await payout_service._handle_payout_failure(
                mock_schedule, mock_payout, result, mock_db
            )

        assert mock_payout.status == PayoutStatus.FAILED
        assert mock_payout.failure_reason == "Network error"
        assert mock_payout.retry_count == 1
        assert mock_payout.next_retry_date is not None

    @pytest.mark.asyncio
    async def test_handle_payout_failure_max_retries(
        self, payout_service, mock_schedule
    ):
        """Test handling payout failure when max retries reached"""
        mock_db = AsyncMock(spec=AsyncSession)

        mock_payout = Mock(spec=ScheduledPayout)
        mock_payout.id = 1
        mock_payout.retry_count = 3
        mock_payout.max_retries = 3
        mock_payout.amount = Decimal("100.00")

        result = PayoutAttemptResult(
            success=False, error_message="Persistent error", retry_eligible=True
        )

        with patch.object(
            payout_service, "_send_payout_notification", new_callable=AsyncMock
        ) as mock_notify:
            await payout_service._handle_payout_failure(
                mock_schedule, mock_payout, result, mock_db
            )

        mock_notify.assert_called_with(mock_schedule, mock_payout, "failed_final")

    @pytest.mark.asyncio
    async def test_intelligent_scheduling(self, payout_service):
        """Test intelligent scheduling algorithm"""
        # Create schedules with different priorities
        schedules = []

        # Overdue schedule (high priority)
        s1 = Mock(spec=PayoutSchedule)
        s1.next_payout_date = datetime.utcnow() - timedelta(days=5)
        s1.total_amount_paid = Decimal("5000.00")
        schedules.append(s1)

        # Recent failure (low priority)
        s2 = Mock(spec=PayoutSchedule)
        s2.next_payout_date = datetime.utcnow()
        s2.total_amount_paid = Decimal("1000.00")
        s2.last_failure_date = datetime.utcnow() - timedelta(hours=2)
        schedules.append(s2)

        # High earner (higher priority)
        s3 = Mock(spec=PayoutSchedule)
        s3.next_payout_date = datetime.utcnow()
        s3.total_amount_paid = Decimal("15000.00")
        schedules.append(s3)

        # Apply intelligent scheduling
        result = await payout_service._apply_intelligent_scheduling(schedules)

        # Should prioritize s1 (overdue) and s3 (high earner) over s2 (recent failure)
        assert s1 in result
        assert s3 in result

    @pytest.mark.asyncio
    async def test_calculate_next_payout_date(self, payout_service):
        """Test next payout date calculation"""
        # Test weekly
        next_date = payout_service._calculate_next_payout_date(
            PayoutFrequency.WEEKLY, {"day_of_week": 5}  # Friday
        )
        assert next_date.weekday() == 4  # 0-indexed, so 4 = Friday

        # Test monthly
        next_date = payout_service._calculate_next_payout_date(
            PayoutFrequency.MONTHLY, {"day_of_month": 15}
        )
        assert (
            next_date.day == 15 or next_date.day == 15
        )  # Handles current month or next

        # Test custom
        next_date = payout_service._calculate_next_payout_date(
            PayoutFrequency.CUSTOM, {"custom_interval_days": 10}
        )
        expected = datetime.utcnow() + timedelta(days=10)
        assert abs((next_date - expected).total_seconds()) < 60  # Within 1 minute

    @pytest.mark.asyncio
    async def test_send_advance_notification(self, payout_service, mock_schedule):
        """Test advance payout notification"""
        mock_payout = Mock(spec=ScheduledPayout)
        mock_payout.amount = Decimal("500.00")
        mock_payout.period_start = datetime.utcnow() - timedelta(days=7)
        mock_payout.period_end = datetime.utcnow()
        mock_payout.payment_method = "stripe_instant"

        with patch.object(
            payout_service.email_service, "send_email", new_callable=AsyncMock
        ) as mock_email:
            await payout_service._send_advance_notification(mock_schedule, mock_payout)

        mock_email.assert_called_once()
        call_args = mock_email.call_args
        assert "barber@test.com" in call_args[1]["to_email"]
        assert "500.00" in call_args[1]["body"]

    @pytest.mark.asyncio
    async def test_monitor_health(self, payout_service):
        """Test health monitoring"""
        # Set up metrics
        payout_service.payout_metrics["payout_success"] = 95
        payout_service.payout_metrics["payout_failure"] = 5
        payout_service.processing_times = [10.5, 15.2, 8.3, 45.0, 12.1]

        with patch.object(
            payout_service.monitoring_service, "create_alert", new_callable=AsyncMock
        ) as mock_alert:
            await payout_service._monitor_health()

        # Should create alert for slow processing (avg > 30s)
        mock_alert.assert_called()
        alert_call = mock_alert.call_args[1]
        assert "Slow Payout Processing" in alert_call["title"]

    @pytest.mark.asyncio
    async def test_retry_failed_payouts(self, payout_service):
        """Test retry mechanism for failed payouts"""
        mock_payout = Mock(spec=ScheduledPayout)
        mock_payout.id = 1
        mock_payout.status = PayoutStatus.FAILED
        mock_payout.retry_count = 1
        mock_payout.max_retries = 3
        mock_payout.next_retry_date = datetime.utcnow() - timedelta(minutes=5)

        with patch("services.payout_scheduler_service.get_async_db") as mock_get_db:
            mock_db = AsyncMock(spec=AsyncSession)
            mock_result = Mock()
            mock_result.scalars.return_value.all.return_value = [mock_payout]
            mock_db.execute.return_value = mock_result
            mock_get_db.return_value.__aenter__.return_value = mock_db

            with patch.object(
                payout_service, "_retry_single_payout", new_callable=AsyncMock
            ) as mock_retry:
                await payout_service._retry_failed_payouts()

        mock_retry.assert_called_with(1)

    @pytest.mark.asyncio
    async def test_get_payout_analytics(self, payout_service):
        """Test payout analytics generation"""
        mock_payouts = []
        for i in range(10):
            payout = Mock(spec=ScheduledPayout)
            payout.amount = Decimal("100.00")
            payout.status = PayoutStatus.COMPLETED if i < 8 else PayoutStatus.FAILED
            payout.scheduled_date = datetime.utcnow() - timedelta(days=i)
            payout.processed_date = (
                payout.scheduled_date + timedelta(hours=1) if i < 8 else None
            )
            payout.payment_method = "stripe" if i < 5 else "stripe_instant"
            payout.failure_reason = "Test error" if i >= 8 else None
            mock_payouts.append(payout)

        with patch("services.payout_scheduler_service.get_async_db") as mock_get_db:
            mock_db = AsyncMock(spec=AsyncSession)
            mock_result = Mock()
            mock_result.scalars.return_value.all.return_value = mock_payouts
            mock_db.execute.return_value = mock_result
            mock_get_db.return_value.__aenter__.return_value = mock_db

            analytics = await payout_service.get_payout_analytics(days=30)

        assert analytics["total_payouts"] == 10
        assert analytics["total_amount"] == 1000.0
        assert analytics["success_rate"] == 80.0
        assert analytics["status_breakdown"]["completed"] == 8
        assert analytics["status_breakdown"]["failed"] == 2
        assert analytics["payment_method_breakdown"]["stripe"] == 5
        assert analytics["payment_method_breakdown"]["stripe_instant"] == 5

    @pytest.mark.asyncio
    async def test_platform_fee_calculation(self, payout_service):
        """Test platform fee calculations"""
        # Test Stripe standard
        fee = await payout_service._calculate_platform_fees(
            Decimal("1000.00"), "stripe"
        )
        assert fee == Decimal("2.75")  # 0.25% + $0.25

        # Test Stripe instant
        fee = await payout_service._calculate_platform_fees(
            Decimal("1000.00"), "stripe_instant"
        )
        assert fee == Decimal("12.75")  # 1.25% + $0.25

        # Test bank transfer
        fee = await payout_service._calculate_platform_fees(
            Decimal("1000.00"), "bank_transfer"
        )
        assert fee == Decimal("0.50")  # Fixed ACH fee


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
