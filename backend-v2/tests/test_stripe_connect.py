"""
Comprehensive tests for Stripe Connect integration.

Tests cover:
- Complete onboarding flow
- Account verification
- Payout processing
- Transfer handling
- Error scenarios
- Webhook processing for Connect events
"""

import pytest
from datetime import datetime, timedelta, timezone
from unittest.mock import patch, MagicMock
import stripe

from services.stripe_connect_service import StripeConnectService
from tests.factories import (
    UserFactory, PaymentFactory, AppointmentFactory
)
from models import Payout
from sqlalchemy.orm import Session


@pytest.fixture
def stripe_connect_service(db: Session):
    """Create StripeConnectService instance for testing."""
    return StripeConnectService(db)


@pytest.fixture
def test_barber_new(db: Session):
    """Create test barber without Stripe Connect account."""
    barber = UserFactory.create_barber(
        email="new.barber@example.com",
        stripe_account_id=None,
        stripe_account_status=None,
        commission_rate=0.25
    )
    db.add(barber)
    db.commit()
    db.refresh(barber)
    return barber


@pytest.fixture
def test_barber_pending(db: Session):
    """Create test barber with pending Stripe Connect account."""
    barber = UserFactory.create_barber(
        email="pending.barber@example.com",
        stripe_account_id="acct_pending_123",
        stripe_account_status="pending",
        commission_rate=0.25
    )
    db.add(barber)
    db.commit()
    db.refresh(barber)
    return barber


@pytest.fixture
def test_barber_verified(db: Session):
    """Create test barber with verified Stripe Connect account."""
    barber = UserFactory.create_barber(
        email="verified.barber@example.com",
        stripe_account_id="acct_verified_123",
        stripe_account_status="active",
        commission_rate=0.25
    )
    db.add(barber)
    db.commit()
    db.refresh(barber)
    return barber


@pytest.fixture
def test_completed_payments(db: Session, test_barber_verified):
    """Create completed payments for payout testing."""
    payments = []
    for i in range(5):
        appointment = AppointmentFactory.create_appointment(
            user_id=test_barber_verified.id,
            start_time=datetime.now(timezone.utc) - timedelta(days=i+1),
            status='completed',
            price=100.0
        )
        payment = PaymentFactory.create_payment(
            appointment_id=appointment.id,
            barber_id=test_barber_verified.id,
            amount=100.0,
            platform_fee=25.0,
            barber_amount=75.0,
            commission_rate=0.25,
            status='completed',
            created_at=datetime.now(timezone.utc) - timedelta(days=i+1)
        )
        payments.append(payment)
        db.add_all([appointment, payment])
    
    db.commit()
    return payments


class TestStripeConnectOnboarding:
    """Test Stripe Connect onboarding flow."""
    
    @patch('services.stripe_connect_service.stripe.Account.create')
    @patch('services.stripe_connect_service.stripe.AccountLink.create')
    def test_create_express_account_success(self, mock_link_create, mock_account_create, 
                                          stripe_connect_service, test_barber_new):
        """Test successful Express account creation."""
        # Mock Stripe responses
        mock_account_create.return_value = MagicMock(
            id="acct_express_123",
            type="express",
            country="US",
            email=test_barber_new.email
        )
        
        mock_link_create.return_value = MagicMock(
            url="https://connect.stripe.com/express/onboarding/acct_express_123"
        )
        
        result = stripe_connect_service.create_express_account(
            barber=test_barber_new,
            return_url="https://app.example.com/onboarding/return",
            refresh_url="https://app.example.com/onboarding/refresh"
        )
        
        # Verify Stripe calls
        mock_account_create.assert_called_once_with(
            type="express",
            country="US",
            email=test_barber_new.email,
            capabilities={
                "card_payments": {"requested": True},
                "transfers": {"requested": True}
            },
            business_type="individual",
            metadata={
                "barber_id": str(test_barber_new.id),
                "platform": "BookedBarber"
            }
        )
        
        mock_link_create.assert_called_once_with(
            account="acct_express_123",
            return_url="https://app.example.com/onboarding/return",
            refresh_url="https://app.example.com/onboarding/refresh",
            type="account_onboarding"
        )
        
        # Verify result
        assert result['account_id'] == "acct_express_123"
        assert result['onboarding_url'] == "https://connect.stripe.com/express/onboarding/acct_express_123"
        assert result['type'] == "express"
        
        # Verify barber updated
        stripe_connect_service.db.refresh(test_barber_new)
        assert test_barber_new.stripe_account_id == "acct_express_123"
        assert test_barber_new.stripe_account_status == "pending"
    
    @patch('services.stripe_connect_service.stripe.Account.create')
    def test_create_express_account_stripe_error(self, mock_account_create, 
                                               stripe_connect_service, test_barber_new):
        """Test Express account creation with Stripe error."""
        mock_account_create.side_effect = stripe.error.StripeError("Account creation failed")
        
        with pytest.raises(Exception, match="Failed to create Stripe Connect account"):
            stripe_connect_service.create_express_account(
                barber=test_barber_new,
                return_url="https://app.example.com/return",
                refresh_url="https://app.example.com/refresh"
            )
    
    def test_create_express_account_existing_account(self, stripe_connect_service, test_barber_verified):
        """Test creating Express account when barber already has one."""
        with pytest.raises(ValueError, match="Barber already has a Stripe Connect account"):
            stripe_connect_service.create_express_account(
                barber=test_barber_verified,
                return_url="https://app.example.com/return",
                refresh_url="https://app.example.com/refresh"
            )
    
    @patch('services.stripe_connect_service.stripe.AccountLink.create')
    def test_create_onboarding_link_existing_account(self, mock_link_create, 
                                                   stripe_connect_service, test_barber_pending):
        """Test creating onboarding link for existing pending account."""
        mock_link_create.return_value = MagicMock(
            url="https://connect.stripe.com/express/onboarding/refresh/acct_pending_123"
        )
        
        result = stripe_connect_service.create_onboarding_link(
            account_id=test_barber_pending.stripe_account_id,
            return_url="https://app.example.com/return",
            refresh_url="https://app.example.com/refresh"
        )
        
        assert "https://connect.stripe.com/express/onboarding" in result['onboarding_url']
        
        mock_link_create.assert_called_once_with(
            account=test_barber_pending.stripe_account_id,
            return_url="https://app.example.com/return",
            refresh_url="https://app.example.com/refresh",
            type="account_onboarding"
        )
    
    @patch('services.stripe_connect_service.stripe.AccountLink.create')
    def test_create_onboarding_link_stripe_error(self, mock_link_create, stripe_connect_service):
        """Test onboarding link creation with Stripe error."""
        mock_link_create.side_effect = stripe.error.StripeError("Link creation failed")
        
        with pytest.raises(Exception, match="Failed to create onboarding link"):
            stripe_connect_service.create_onboarding_link(
                account_id="acct_test_123",
                return_url="https://app.example.com/return",
                refresh_url="https://app.example.com/refresh"
            )


class TestStripeConnectAccountVerification:
    """Test account verification and status checking."""
    
    @patch('services.stripe_connect_service.stripe.Account.retrieve')
    def test_get_account_status_complete(self, mock_retrieve, stripe_connect_service, test_barber_verified):
        """Test getting status of complete account."""
        mock_retrieve.return_value = MagicMock(
            id=test_barber_verified.stripe_account_id,
            details_submitted=True,
            payouts_enabled=True,
            charges_enabled=True,
            requirements={
                'currently_due': [],
                'eventually_due': [],
                'past_due': [],
                'pending_verification': []
            },
            capabilities={
                'card_payments': 'active',
                'transfers': 'active'
            }
        )
        
        status = stripe_connect_service.get_account_status(test_barber_verified.stripe_account_id)
        
        assert status['account_id'] == test_barber_verified.stripe_account_id
        assert status['details_submitted'] is True
        assert status['payouts_enabled'] is True
        assert status['charges_enabled'] is True
        assert status['verification_status'] == 'complete'
        assert len(status['requirements']['currently_due']) == 0
        assert status['capabilities']['card_payments'] == 'active'
        assert status['capabilities']['transfers'] == 'active'
    
    @patch('services.stripe_connect_service.stripe.Account.retrieve')
    def test_get_account_status_pending(self, mock_retrieve, stripe_connect_service, test_barber_pending):
        """Test getting status of pending account."""
        mock_retrieve.return_value = MagicMock(
            id=test_barber_pending.stripe_account_id,
            details_submitted=False,
            payouts_enabled=False,
            charges_enabled=False,
            requirements={
                'currently_due': ['individual.first_name', 'individual.last_name'],
                'eventually_due': ['individual.id_number'],
                'past_due': [],
                'pending_verification': []
            },
            capabilities={
                'card_payments': 'pending',
                'transfers': 'pending'
            }
        )
        
        status = stripe_connect_service.get_account_status(test_barber_pending.stripe_account_id)
        
        assert status['verification_status'] == 'pending'
        assert status['details_submitted'] is False
        assert status['payouts_enabled'] is False
        assert len(status['requirements']['currently_due']) == 2
        assert 'individual.first_name' in status['requirements']['currently_due']
    
    @patch('services.stripe_connect_service.stripe.Account.retrieve')
    def test_get_account_status_restricted(self, mock_retrieve, stripe_connect_service, test_barber_verified):
        """Test getting status of restricted account."""
        mock_retrieve.return_value = MagicMock(
            id=test_barber_verified.stripe_account_id,
            details_submitted=True,
            payouts_enabled=False,
            charges_enabled=True,
            requirements={
                'currently_due': [],
                'eventually_due': [],
                'past_due': ['individual.verification.document'],
                'pending_verification': []
            },
            capabilities={
                'card_payments': 'active',
                'transfers': 'inactive'
            }
        )
        
        status = stripe_connect_service.get_account_status(test_barber_verified.stripe_account_id)
        
        assert status['verification_status'] == 'restricted'
        assert status['payouts_enabled'] is False
        assert len(status['requirements']['past_due']) == 1
        assert status['capabilities']['transfers'] == 'inactive'
    
    @patch('services.stripe_connect_service.stripe.Account.retrieve')
    def test_get_account_status_stripe_error(self, mock_retrieve, stripe_connect_service):
        """Test account status retrieval with Stripe error."""
        mock_retrieve.side_effect = stripe.error.StripeError("Account not found")
        
        with pytest.raises(Exception, match="Failed to retrieve account status"):
            stripe_connect_service.get_account_status("acct_nonexistent")
    
    @patch('services.stripe_connect_service.stripe.Account.retrieve')
    def test_verify_account_capabilities_success(self, mock_retrieve, stripe_connect_service, test_barber_verified):
        """Test verifying account capabilities."""
        mock_retrieve.return_value = MagicMock(
            capabilities={
                'card_payments': 'active',
                'transfers': 'active'
            },
            payouts_enabled=True,
            charges_enabled=True
        )
        
        result = stripe_connect_service.verify_account_capabilities(test_barber_verified.stripe_account_id)
        
        assert result['ready_for_payments'] is True
        assert result['ready_for_payouts'] is True
        assert result['capabilities']['card_payments'] == 'active'
        assert result['capabilities']['transfers'] == 'active'
    
    @patch('services.stripe_connect_service.stripe.Account.retrieve')
    def test_verify_account_capabilities_not_ready(self, mock_retrieve, stripe_connect_service, test_barber_pending):
        """Test verifying account capabilities when not ready."""
        mock_retrieve.return_value = MagicMock(
            capabilities={
                'card_payments': 'pending',
                'transfers': 'pending'
            },
            payouts_enabled=False,
            charges_enabled=False
        )
        
        result = stripe_connect_service.verify_account_capabilities(test_barber_pending.stripe_account_id)
        
        assert result['ready_for_payments'] is False
        assert result['ready_for_payouts'] is False
        assert result['capabilities']['card_payments'] == 'pending'


class TestStripeConnectPayouts:
    """Test payout processing functionality."""
    
    @patch('services.stripe_connect_service.stripe.Transfer.create')
    def test_create_payout_success(self, mock_transfer_create, stripe_connect_service, 
                                 test_barber_verified, test_completed_payments):
        """Test successful payout creation."""
        # Mock Stripe transfer
        mock_transfer_create.return_value = MagicMock(
            id="tr_payout_123",
            amount=37500,  # $375.00 in cents
            currency="usd",
            destination=test_barber_verified.stripe_account_id,
            metadata={}
        )
        
        start_date = datetime.now(timezone.utc) - timedelta(days=7)
        end_date = datetime.now(timezone.utc)
        
        result = stripe_connect_service.create_payout(
            barber_id=test_barber_verified.id,
            start_date=start_date,
            end_date=end_date,
            amount=375.0
        )
        
        # Verify Stripe call
        mock_transfer_create.assert_called_once_with(
            amount=37500,
            currency="usd",
            destination=test_barber_verified.stripe_account_id,
            metadata={
                'barber_id': str(test_barber_verified.id),
                'payout_period_start': start_date.isoformat(),
                'payout_period_end': end_date.isoformat(),
                'payment_count': '5'
            }
        )
        
        # Verify result
        assert result['transfer_id'] == "tr_payout_123"
        assert result['amount'] == 375.0
        assert result['barber_id'] == test_barber_verified.id
        assert result['status'] == 'pending'
        
        # Verify payout record created
        payout = stripe_connect_service.db.query(Payout).filter(
            Payout.barber_id == test_barber_verified.id
        ).first()
        assert payout is not None
        assert payout.amount == 375.0
        assert payout.stripe_transfer_id == "tr_payout_123"
        assert payout.status == 'pending'
    
    def test_create_payout_no_stripe_account(self, stripe_connect_service, test_barber_new):
        """Test payout creation when barber has no Stripe account."""
        with pytest.raises(ValueError, match="Barber does not have a verified Stripe Connect account"):
            stripe_connect_service.create_payout(
                barber_id=test_barber_new.id,
                start_date=datetime.now(timezone.utc) - timedelta(days=7),
                end_date=datetime.now(timezone.utc),
                amount=100.0
            )
    
    def test_create_payout_pending_account(self, stripe_connect_service, test_barber_pending):
        """Test payout creation when account is pending verification."""
        with pytest.raises(ValueError, match="Barber does not have a verified Stripe Connect account"):
            stripe_connect_service.create_payout(
                barber_id=test_barber_pending.id,
                start_date=datetime.now(timezone.utc) - timedelta(days=7),
                end_date=datetime.now(timezone.utc),
                amount=100.0
            )
    
    @patch('services.stripe_connect_service.stripe.Transfer.create')
    def test_create_payout_stripe_error(self, mock_transfer_create, stripe_connect_service, test_barber_verified):
        """Test payout creation with Stripe error."""
        mock_transfer_create.side_effect = stripe.error.StripeError("Transfer failed")
        
        with pytest.raises(Exception, match="Failed to create payout"):
            stripe_connect_service.create_payout(
                barber_id=test_barber_verified.id,
                start_date=datetime.now(timezone.utc) - timedelta(days=7),
                end_date=datetime.now(timezone.utc),
                amount=100.0
            )
    
    def test_calculate_payout_amount(self, stripe_connect_service, test_barber_verified, test_completed_payments):
        """Test payout amount calculation."""
        start_date = datetime.now(timezone.utc) - timedelta(days=7)
        end_date = datetime.now(timezone.utc)
        
        result = stripe_connect_service.calculate_payout_amount(
            barber_id=test_barber_verified.id,
            start_date=start_date,
            end_date=end_date
        )
        
        # 5 payments × $75 barber amount = $375
        assert result['total_amount'] == 375.0
        assert result['payment_count'] == 5
        assert result['average_payment'] == 75.0
        assert len(result['payment_breakdown']) == 5
    
    def test_calculate_payout_amount_no_payments(self, stripe_connect_service, test_barber_verified):
        """Test payout calculation when no payments exist."""
        start_date = datetime.now(timezone.utc) - timedelta(days=30)
        end_date = datetime.now(timezone.utc) - timedelta(days=20)
        
        result = stripe_connect_service.calculate_payout_amount(
            barber_id=test_barber_verified.id,
            start_date=start_date,
            end_date=end_date
        )
        
        assert result['total_amount'] == 0.0
        assert result['payment_count'] == 0
        assert result['payment_breakdown'] == []
    
    @patch('services.stripe_connect_service.stripe.Transfer.retrieve')
    def test_get_payout_status(self, mock_transfer_retrieve, stripe_connect_service, test_barber_verified):
        """Test getting payout status from Stripe."""
        # Create payout record
        payout = Payout(
            barber_id=test_barber_verified.id,
            amount=375.0,
            stripe_transfer_id="tr_status_test",
            status="pending",
            created_at=datetime.now(timezone.utc)
        )
        stripe_connect_service.db.add(payout)
        stripe_connect_service.db.commit()
        
        # Mock Stripe response
        mock_transfer_retrieve.return_value = MagicMock(
            id="tr_status_test",
            amount=37500,
            status="paid",
            created=1234567890,
            destination_payment="py_test_123"
        )
        
        result = stripe_connect_service.get_payout_status("tr_status_test")
        
        assert result['transfer_id'] == "tr_status_test"
        assert result['status'] == "paid"
        assert result['amount'] == 375.0
        assert result['destination_payment'] == "py_test_123"
        
        # Verify payout record updated
        stripe_connect_service.db.refresh(payout)
        assert payout.status == "paid"
    
    @patch('services.stripe_connect_service.stripe.Transfer.retrieve')
    def test_get_payout_status_failed(self, mock_transfer_retrieve, stripe_connect_service, test_barber_verified):
        """Test getting status of failed payout."""
        payout = Payout(
            barber_id=test_barber_verified.id,
            amount=100.0,
            stripe_transfer_id="tr_failed_test",
            status="pending"
        )
        stripe_connect_service.db.add(payout)
        stripe_connect_service.db.commit()
        
        mock_transfer_retrieve.return_value = MagicMock(
            id="tr_failed_test",
            status="failed",
            failure_code="account_closed",
            failure_message="The destination account is closed."
        )
        
        result = stripe_connect_service.get_payout_status("tr_failed_test")
        
        assert result['status'] == "failed"
        assert result['failure_code'] == "account_closed"
        assert result['failure_message'] == "The destination account is closed."


class TestStripeConnectWebhooks:
    """Test webhook processing for Stripe Connect events."""
    
    def test_process_account_updated_webhook(self, stripe_connect_service, test_barber_pending, db):
        """Test processing account.updated webhook."""
        webhook_data = {
            'type': 'account.updated',
            'data': {
                'object': {
                    'id': test_barber_pending.stripe_account_id,
                    'details_submitted': True,
                    'payouts_enabled': True,
                    'charges_enabled': True,
                    'capabilities': {
                        'card_payments': 'active',
                        'transfers': 'active'
                    }
                }
            }
        }
        
        result = stripe_connect_service.process_webhook(webhook_data)
        
        assert result['processed'] is True
        assert result['event_type'] == 'account.updated'
        
        # Verify barber status updated
        db.refresh(test_barber_pending)
        assert test_barber_pending.stripe_account_status == 'active'
    
    def test_process_transfer_paid_webhook(self, stripe_connect_service, test_barber_verified, db):
        """Test processing transfer.paid webhook."""
        # Create pending payout
        payout = Payout(
            barber_id=test_barber_verified.id,
            amount=375.0,
            stripe_transfer_id="tr_webhook_test",
            status="pending"
        )
        db.add(payout)
        db.commit()
        
        webhook_data = {
            'type': 'transfer.paid',
            'data': {
                'object': {
                    'id': 'tr_webhook_test',
                    'amount': 37500,
                    'status': 'paid',
                    'destination': test_barber_verified.stripe_account_id,
                    'destination_payment': 'py_paid_123'
                }
            }
        }
        
        result = stripe_connect_service.process_webhook(webhook_data)
        
        assert result['processed'] is True
        assert result['event_type'] == 'transfer.paid'
        
        # Verify payout status updated
        db.refresh(payout)
        assert payout.status == 'completed'
        assert payout.completed_at is not None
    
    def test_process_transfer_failed_webhook(self, stripe_connect_service, test_barber_verified, db):
        """Test processing transfer.failed webhook."""
        payout = Payout(
            barber_id=test_barber_verified.id,
            amount=100.0,
            stripe_transfer_id="tr_failed_webhook",
            status="pending"
        )
        db.add(payout)
        db.commit()
        
        webhook_data = {
            'type': 'transfer.failed',
            'data': {
                'object': {
                    'id': 'tr_failed_webhook',
                    'amount': 10000,
                    'status': 'failed',
                    'failure_code': 'account_closed',
                    'failure_message': 'Destination account is closed'
                }
            }
        }
        
        result = stripe_connect_service.process_webhook(webhook_data)
        
        assert result['processed'] is True
        assert result['event_type'] == 'transfer.failed'
        
        # Verify payout marked as failed
        db.refresh(payout)
        assert payout.status == 'failed'
        assert payout.failure_reason == 'account_closed: Destination account is closed'
    
    def test_process_capability_updated_webhook(self, stripe_connect_service, test_barber_pending, db):
        """Test processing capability.updated webhook."""
        webhook_data = {
            'type': 'capability.updated',
            'data': {
                'object': {
                    'id': 'card_payments',
                    'account': test_barber_pending.stripe_account_id,
                    'status': 'active'
                }
            }
        }
        
        result = stripe_connect_service.process_webhook(webhook_data)
        
        assert result['processed'] is True
        assert result['event_type'] == 'capability.updated'
        assert result['capability'] == 'card_payments'
        assert result['status'] == 'active'
    
    def test_process_unknown_webhook(self, stripe_connect_service):
        """Test processing unknown webhook type."""
        webhook_data = {
            'type': 'unknown.event',
            'data': {
                'object': {'id': 'unknown_123'}
            }
        }
        
        result = stripe_connect_service.process_webhook(webhook_data)
        
        assert result['processed'] is False
        assert result['event_type'] == 'unknown.event'
        assert result['message'] == 'Unhandled webhook type'
    
    def test_process_webhook_missing_data(self, stripe_connect_service):
        """Test processing webhook with missing data."""
        webhook_data = {
            'type': 'account.updated'
            # Missing 'data' key
        }
        
        with pytest.raises(ValueError, match="Invalid webhook data format"):
            stripe_connect_service.process_webhook(webhook_data)


class TestStripeConnectReporting:
    """Test reporting and analytics for Stripe Connect."""
    
    def test_get_barber_earnings_summary(self, stripe_connect_service, test_barber_verified, test_completed_payments):
        """Test getting barber earnings summary."""
        start_date = datetime.now(timezone.utc) - timedelta(days=30)
        end_date = datetime.now(timezone.utc)
        
        summary = stripe_connect_service.get_barber_earnings_summary(
            barber_id=test_barber_verified.id,
            start_date=start_date,
            end_date=end_date
        )
        
        assert summary['total_earnings'] == 375.0  # 5 payments × $75
        assert summary['total_payments'] == 5
        assert summary['average_payment'] == 75.0
        assert summary['commission_rate'] == 0.25
        assert summary['platform_fees'] == 125.0  # 5 payments × $25
        assert len(summary['daily_breakdown']) > 0
    
    def test_get_payout_history(self, stripe_connect_service, test_barber_verified, db):
        """Test getting payout history for barber."""
        # Create payout records
        payouts = []
        for i in range(3):
            payout = Payout(
                barber_id=test_barber_verified.id,
                amount=100.0 * (i + 1),
                stripe_transfer_id=f"tr_history_{i}",
                status="completed" if i < 2 else "pending",
                created_at=datetime.now(timezone.utc) - timedelta(days=i*7),
                completed_at=datetime.now(timezone.utc) - timedelta(days=i*7) if i < 2 else None
            )
            payouts.append(payout)
        
        db.add_all(payouts)
        db.commit()
        
        history = stripe_connect_service.get_payout_history(
            barber_id=test_barber_verified.id,
            limit=10
        )
        
        assert len(history['payouts']) == 3
        assert history['total_paid_out'] == 300.0  # $100 + $200 (completed ones)
        assert history['pending_amount'] == 300.0  # $300 (pending one)
        
        # Verify order (most recent first)
        assert history['payouts'][0]['amount'] == 300.0
        assert history['payouts'][0]['status'] == 'pending'
        assert history['payouts'][1]['amount'] == 200.0
        assert history['payouts'][1]['status'] == 'completed'
    
    def test_get_connect_account_dashboard_data(self, stripe_connect_service, test_barber_verified, test_completed_payments, db):
        """Test getting comprehensive dashboard data."""
        # Add a payout
        payout = Payout(
            barber_id=test_barber_verified.id,
            amount=200.0,
            stripe_transfer_id="tr_dashboard_test",
            status="completed",
            created_at=datetime.now(timezone.utc) - timedelta(days=1),
            completed_at=datetime.now(timezone.utc) - timedelta(days=1)
        )
        db.add(payout)
        db.commit()
        
        with patch.object(stripe_connect_service, 'get_account_status') as mock_status:
            mock_status.return_value = {
                'verification_status': 'complete',
                'payouts_enabled': True,
                'charges_enabled': True
            }
            
            dashboard = stripe_connect_service.get_connect_account_dashboard_data(test_barber_verified.id)
            
            assert dashboard['account_status']['verification_status'] == 'complete'
            assert dashboard['earnings']['total_earnings'] == 375.0
            assert dashboard['earnings']['pending_payout'] > 0
            assert dashboard['payouts']['total_paid_out'] == 200.0
            assert dashboard['payouts']['payout_count'] == 1
    
    def test_calculate_pending_payout_amount(self, stripe_connect_service, test_barber_verified, test_completed_payments, db):
        """Test calculating pending payout amount."""
        # Mark some payments as already paid out
        last_payout = Payout(
            barber_id=test_barber_verified.id,
            amount=150.0,  # Covers 2 payments
            stripe_transfer_id="tr_last_payout",
            status="completed",
            created_at=datetime.now(timezone.utc) - timedelta(days=2),
            completed_at=datetime.now(timezone.utc) - timedelta(days=2)
        )
        db.add(last_payout)
        db.commit()
        
        # Update 2 payments to mark them as paid out
        for i, payment in enumerate(test_completed_payments[:2]):
            payment.payout_id = last_payout.id
            payment.payout_status = 'paid'
        db.commit()
        
        pending_amount = stripe_connect_service.calculate_pending_payout_amount(test_barber_verified.id)
        
        # Should be 3 remaining payments × $75 = $225
        assert pending_amount == 225.0


class TestStripeConnectSecurity:
    """Test security measures for Stripe Connect."""
    
    def test_validate_webhook_signature(self, stripe_connect_service):
        """Test webhook signature validation."""
        payload = '{"type": "account.updated"}'
        signature = "t=1234567890,v1=test_signature"
        
        with patch('stripe.Webhook.construct_event') as mock_construct:
            mock_construct.return_value = {"type": "account.updated"}
            
            result = stripe_connect_service.validate_webhook_signature(
                payload=payload,
                signature=signature,
                webhook_secret="whsec_test_secret"
            )
            
            assert result is not None
            mock_construct.assert_called_once_with(
                payload, signature, "whsec_test_secret"
            )
    
    def test_validate_webhook_signature_invalid(self, stripe_connect_service):
        """Test webhook signature validation with invalid signature."""
        with patch('stripe.Webhook.construct_event') as mock_construct:
            mock_construct.side_effect = stripe.error.SignatureVerificationError(
                "Invalid signature", "sig_invalid"
            )
            
            result = stripe_connect_service.validate_webhook_signature(
                payload="invalid_payload",
                signature="invalid_signature",
                webhook_secret="whsec_test_secret"
            )
            
            assert result is None
    
    def test_validate_payout_eligibility(self, stripe_connect_service, test_barber_verified, test_completed_payments):
        """Test payout eligibility validation."""
        result = stripe_connect_service.validate_payout_eligibility(
            barber_id=test_barber_verified.id,
            amount=375.0
        )
        
        assert result['eligible'] is True
        assert result['available_amount'] == 375.0
    
    def test_validate_payout_eligibility_insufficient_funds(self, stripe_connect_service, test_barber_verified):
        """Test payout eligibility with insufficient funds."""
        result = stripe_connect_service.validate_payout_eligibility(
            barber_id=test_barber_verified.id,
            amount=1000.0  # More than available
        )
        
        assert result['eligible'] is False
        assert 'insufficient funds' in result['reason'].lower()
    
    def test_validate_payout_eligibility_unverified_account(self, stripe_connect_service, test_barber_pending):
        """Test payout eligibility with unverified account."""
        result = stripe_connect_service.validate_payout_eligibility(
            barber_id=test_barber_pending.id,
            amount=100.0
        )
        
        assert result['eligible'] is False
        assert 'not verified' in result['reason'].lower()


class TestStripeConnectEdgeCases:
    """Test edge cases and error scenarios."""
    
    def test_handle_account_restriction(self, stripe_connect_service, test_barber_verified, db):
        """Test handling account restriction scenarios."""
        # Update account to restricted status
        test_barber_verified.stripe_account_status = 'restricted'
        db.commit()
        
        with pytest.raises(ValueError, match="account is restricted"):
            stripe_connect_service.create_payout(
                barber_id=test_barber_verified.id,
                start_date=datetime.now(timezone.utc) - timedelta(days=7),
                end_date=datetime.now(timezone.utc),
                amount=100.0
            )
    
    def test_handle_duplicate_payout_request(self, stripe_connect_service, test_barber_verified, db):
        """Test handling duplicate payout requests."""
        start_date = datetime.now(timezone.utc) - timedelta(days=7)
        end_date = datetime.now(timezone.utc)
        
        # Create existing payout for same period
        existing_payout = Payout(
            barber_id=test_barber_verified.id,
            amount=100.0,
            period_start=start_date,
            period_end=end_date,
            status="pending",
            stripe_transfer_id="tr_existing"
        )
        db.add(existing_payout)
        db.commit()
        
        with pytest.raises(ValueError, match="Payout already exists for this period"):
            stripe_connect_service.create_payout(
                barber_id=test_barber_verified.id,
                start_date=start_date,
                end_date=end_date,
                amount=100.0
            )
    
    def test_handle_zero_amount_payout(self, stripe_connect_service, test_barber_verified):
        """Test handling zero amount payout."""
        with pytest.raises(ValueError, match="Payout amount must be greater than zero"):
            stripe_connect_service.create_payout(
                barber_id=test_barber_verified.id,
                start_date=datetime.now(timezone.utc) - timedelta(days=7),
                end_date=datetime.now(timezone.utc),
                amount=0.0
            )
    
    def test_handle_negative_amount_payout(self, stripe_connect_service, test_barber_verified):
        """Test handling negative amount payout."""
        with pytest.raises(ValueError, match="Payout amount must be greater than zero"):
            stripe_connect_service.create_payout(
                barber_id=test_barber_verified.id,
                start_date=datetime.now(timezone.utc) - timedelta(days=7),
                end_date=datetime.now(timezone.utc),
                amount=-100.0
            )
    
    def test_handle_nonexistent_barber(self, stripe_connect_service):
        """Test handling operations with non-existent barber."""
        with pytest.raises(ValueError, match="Barber not found"):
            stripe_connect_service.create_payout(
                barber_id=99999,
                start_date=datetime.now(timezone.utc) - timedelta(days=7),
                end_date=datetime.now(timezone.utc),
                amount=100.0
            )


if __name__ == "__main__":
    pytest.main([__file__])