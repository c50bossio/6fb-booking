"""
Comprehensive tests for Payment Reconciliation System.

Tests the automated reconciliation service, Stripe integration,
discrepancy detection, and reconciliation API endpoints.
"""

import pytest
import json
from datetime import datetime, timedelta
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient

from main import app
from models import Payment, User, Appointment
from services.payment_reconciliation import PaymentReconciliationService, ReconciliationResult
from tests.factories import UserFactory, AppointmentFactory, PaymentFactory


@pytest.fixture
def admin_user():
    """Create an admin user for testing."""
    return UserFactory.create_user(
        email="admin@test.com",
        unified_role="platform_admin",
        is_active=True
    )


@pytest.fixture
def reconciliation_service(db_session):
    """Create reconciliation service instance."""
    return PaymentReconciliationService(db_session)


class TestPaymentReconciliationService:
    """Test payment reconciliation service functionality."""
    
    @pytest.mark.asyncio
    async def test_reconcile_single_payment_match(self, reconciliation_service, db_session):
        """Test reconciling a single payment that matches Stripe."""
        # Create test payment
        payment = PaymentFactory.create_payment(
            stripe_payment_intent_id="pi_test_match",
            amount=Decimal("50.00"),
            status="completed",
            created_at=datetime.utcnow() - timedelta(hours=1)
        )
        db_session.add(payment)
        db_session.commit()
        
        # Mock Stripe response
        mock_stripe_pi = {
            "id": "pi_test_match",
            "amount": 5000,  # Stripe amount in cents
            "currency": "usd",
            "status": "succeeded",
            "created": int((datetime.utcnow() - timedelta(hours=1)).timestamp())
        }
        
        with patch('stripe.PaymentIntent.retrieve', return_value=mock_stripe_pi):
            result = await reconciliation_service.reconcile_single_payment(payment)
        
        assert result.matches is True
        assert result.discrepancies == []
        assert result.action_required is False
        assert result.local_payment_id == payment.id
        assert result.local_amount == Decimal("50.00")
        assert result.stripe_amount == Decimal("50.00")
        assert result.local_status == "completed"
        assert result.stripe_status == "succeeded"
    
    @pytest.mark.asyncio
    async def test_reconcile_single_payment_amount_mismatch(self, reconciliation_service, db_session):
        """Test reconciling a payment with amount discrepancy."""
        payment = PaymentFactory.create_payment(
            stripe_payment_intent_id="pi_test_mismatch",
            amount=Decimal("50.00"),
            status="completed"
        )
        db_session.add(payment)
        db_session.commit()
        
        # Mock Stripe with different amount
        mock_stripe_pi = {
            "id": "pi_test_mismatch",
            "amount": 7500,  # $75.00 instead of $50.00
            "currency": "usd",
            "status": "succeeded",
            "created": int(datetime.utcnow().timestamp())
        }
        
        with patch('stripe.PaymentIntent.retrieve', return_value=mock_stripe_pi):
            result = await reconciliation_service.reconcile_single_payment(payment)
        
        assert result.matches is False
        assert "amount_mismatch" in result.discrepancies
        assert result.action_required is True
        assert result.local_amount == Decimal("50.00")
        assert result.stripe_amount == Decimal("75.00")
    
    @pytest.mark.asyncio
    async def test_reconcile_single_payment_status_mismatch(self, reconciliation_service, db_session):
        """Test reconciling a payment with status discrepancy."""
        payment = PaymentFactory.create_payment(
            stripe_payment_intent_id="pi_status_mismatch",
            amount=Decimal("30.00"),
            status="completed"
        )
        db_session.add(payment)
        db_session.commit()
        
        # Mock Stripe with failed status
        mock_stripe_pi = {
            "id": "pi_status_mismatch",
            "amount": 3000,
            "currency": "usd",
            "status": "requires_payment_method",  # Failed status
            "created": int(datetime.utcnow().timestamp())
        }
        
        with patch('stripe.PaymentIntent.retrieve', return_value=mock_stripe_pi):
            result = await reconciliation_service.reconcile_single_payment(payment)
        
        assert result.matches is False
        assert "status_mismatch" in result.discrepancies
        assert result.action_required is True
        assert result.local_status == "completed"
        assert result.stripe_status == "requires_payment_method"
    
    @pytest.mark.asyncio
    async def test_reconcile_payment_not_found_in_stripe(self, reconciliation_service, db_session):
        """Test reconciling a payment that doesn't exist in Stripe."""
        payment = PaymentFactory.create_payment(
            stripe_payment_intent_id="pi_not_found",
            amount=Decimal("25.00"),
            status="completed"
        )
        db_session.add(payment)
        db_session.commit()
        
        # Mock Stripe to raise not found error
        import stripe
        with patch('stripe.PaymentIntent.retrieve', side_effect=stripe.error.InvalidRequestError(
            message="No such payment_intent",
            param="id",
            code="resource_missing"
        )):
            result = await reconciliation_service.reconcile_single_payment(payment)
        
        assert result.matches is False
        assert "stripe_record_not_found" in result.discrepancies
        assert result.action_required is True
        assert result.stripe_status == "not_found"
    
    def test_get_unreconciled_payments(self, reconciliation_service, db_session):
        """Test getting payments that need reconciliation."""
        # Create various payments
        recent_payment = PaymentFactory.create_payment(
            stripe_payment_intent_id="pi_recent",
            status="completed",
            created_at=datetime.utcnow() - timedelta(hours=2)
        )
        
        old_payment = PaymentFactory.create_payment(
            stripe_payment_intent_id="pi_old",
            status="completed",
            created_at=datetime.utcnow() - timedelta(days=10)
        )
        
        pending_payment = PaymentFactory.create_payment(
            stripe_payment_intent_id="pi_pending",
            status="pending",
            created_at=datetime.utcnow() - timedelta(hours=1)
        )
        
        no_stripe_id = PaymentFactory.create_payment(
            stripe_payment_intent_id=None,  # No Stripe ID
            status="completed",
            created_at=datetime.utcnow() - timedelta(hours=1)
        )
        
        db_session.add_all([recent_payment, old_payment, pending_payment, no_stripe_id])
        db_session.commit()
        
        # Get unreconciled payments from last 7 days
        unreconciled = reconciliation_service.get_unreconciled_payments(days_back=7)
        
        # Should include recent and pending, but not old or no-stripe-id
        payment_ids = [p.id for p in unreconciled]
        assert recent_payment.id in payment_ids
        assert pending_payment.id in payment_ids
        assert old_payment.id not in payment_ids
        assert no_stripe_id.id not in payment_ids
    
    @pytest.mark.asyncio
    async def test_run_daily_reconciliation(self, reconciliation_service, db_session):
        """Test running daily reconciliation process."""
        # Create test payments
        matching_payment = PaymentFactory.create_payment(
            stripe_payment_intent_id="pi_daily_match",
            amount=Decimal("40.00"),
            status="completed",
            created_at=datetime.utcnow() - timedelta(hours=12)
        )
        
        mismatched_payment = PaymentFactory.create_payment(
            stripe_payment_intent_id="pi_daily_mismatch",
            amount=Decimal("60.00"),
            status="completed",
            created_at=datetime.utcnow() - timedelta(hours=6)
        )
        
        db_session.add_all([matching_payment, mismatched_payment])
        db_session.commit()
        
        # Mock Stripe responses
        stripe_responses = {
            "pi_daily_match": {
                "id": "pi_daily_match",
                "amount": 4000,
                "status": "succeeded"
            },
            "pi_daily_mismatch": {
                "id": "pi_daily_mismatch", 
                "amount": 8000,  # Different amount
                "status": "succeeded"
            }
        }
        
        def mock_stripe_retrieve(payment_intent_id):
            return stripe_responses.get(payment_intent_id)
        
        with patch('stripe.PaymentIntent.retrieve', side_effect=mock_stripe_retrieve):
            summary = await reconciliation_service.run_daily_reconciliation(
                date=datetime.utcnow().date(),
                max_payments=10
            )
        
        assert summary.total_payments_checked == 2
        assert summary.matches == 1
        assert summary.discrepancies == 1
        assert summary.critical_issues == 0  # Amount mismatches aren't critical
        assert summary.stripe_api_calls == 2


class TestPaymentReconciliationAPI:
    """Test payment reconciliation API endpoints."""
    
    def test_daily_reconciliation_endpoint_success(self, client: TestClient, admin_user, db_session):
        """Test daily reconciliation API endpoint."""
        # Login as admin
        login_response = client.post("/api/v1/auth/login", json={
            "email": admin_user.email,
            "password": "test_password"
        })
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Create test payment
        payment = PaymentFactory.create_payment(
            stripe_payment_intent_id="pi_api_test",
            amount=Decimal("35.00"),
            status="completed"
        )
        db_session.add(payment)
        db_session.commit()
        
        # Mock reconciliation service
        with patch('services.payment_reconciliation.PaymentReconciliationService.run_daily_reconciliation') as mock_reconciliation:
            mock_summary = MagicMock()
            mock_summary.total_payments_checked = 1
            mock_summary.matches = 1
            mock_summary.discrepancies = 0
            mock_summary.critical_issues = 0
            mock_summary.processing_time_seconds = 2.5
            mock_summary.date_range_start = datetime.utcnow()
            mock_summary.date_range_end = datetime.utcnow()
            mock_summary.stripe_api_calls = 1
            mock_summary.errors_encountered = 0
            
            mock_reconciliation.return_value = mock_summary
            
            response = client.post(
                "/api/v1/payments/reconciliation/daily",
                headers=headers,
                params={"max_payments": 10}
            )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "completed"
        assert data["summary"]["total_payments_checked"] == 1
        assert data["summary"]["matches"] == 1
        assert data["summary"]["discrepancies"] == 0
    
    def test_daily_reconciliation_unauthorized(self, client: TestClient, db_session):
        """Test daily reconciliation requires proper authorization."""
        # Create regular user
        regular_user = UserFactory.create_user(
            email="user@test.com",
            unified_role="client"
        )
        db_session.add(regular_user)
        db_session.commit()
        
        # Login as regular user
        login_response = client.post("/api/v1/auth/login", json={
            "email": regular_user.email,
            "password": "test_password"
        })
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        response = client.post(
            "/api/v1/payments/reconciliation/daily",
            headers=headers
        )
        
        assert response.status_code == 403
        assert "Insufficient permissions" in response.json()["detail"]
    
    def test_single_payment_reconciliation_endpoint(self, client: TestClient, admin_user, db_session):
        """Test single payment reconciliation API endpoint."""
        # Login as admin
        login_response = client.post("/api/v1/auth/login", json={
            "email": admin_user.email,
            "password": "test_password"
        })
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Create test payment
        payment = PaymentFactory.create_payment(
            stripe_payment_intent_id="pi_single_test",
            amount=Decimal("45.00"),
            status="completed"
        )
        db_session.add(payment)
        db_session.commit()
        
        # Mock reconciliation result
        with patch('services.payment_reconciliation.PaymentReconciliationService.reconcile_single_payment') as mock_reconcile:
            mock_result = ReconciliationResult(
                local_payment_id=payment.id,
                stripe_payment_intent_id="pi_single_test",
                matches=True,
                discrepancies=[],
                action_required=False,
                local_amount=Decimal("45.00"),
                stripe_amount=Decimal("45.00"),
                local_status="completed",
                stripe_status="succeeded",
                last_updated=datetime.utcnow()
            )
            mock_reconcile.return_value = mock_result
            
            response = client.post(
                f"/api/v1/payments/reconciliation/payment/{payment.id}",
                headers=headers
            )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "completed"
        assert data["matches"] is True
        assert data["payment_id"] == payment.id
        assert data["local_amount"] == "45.00"
        assert data["stripe_amount"] == "45.00"
    
    def test_single_payment_reconciliation_not_found(self, client: TestClient, admin_user):
        """Test single payment reconciliation with non-existent payment."""
        # Login as admin
        login_response = client.post("/api/v1/auth/login", json={
            "email": admin_user.email,
            "password": "test_password"
        })
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        response = client.post(
            "/api/v1/payments/reconciliation/payment/999999",
            headers=headers
        )
        
        assert response.status_code == 404
        assert "Payment not found" in response.json()["detail"]
    
    def test_get_unreconciled_payments_endpoint(self, client: TestClient, admin_user, db_session):
        """Test get unreconciled payments API endpoint."""
        # Login as admin
        login_response = client.post("/api/v1/auth/login", json={
            "email": admin_user.email,
            "password": "test_password"
        })
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Create test payments
        unreconciled_payment = PaymentFactory.create_payment(
            stripe_payment_intent_id="pi_unreconciled",
            status="completed",
            created_at=datetime.utcnow() - timedelta(hours=2)
        )
        db_session.add(unreconciled_payment)
        db_session.commit()
        
        response = client.get(
            "/api/v1/payments/reconciliation/unreconciled",
            headers=headers,
            params={"days_back": 7}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "unreconciled_payments" in data
        assert data["total_count"] >= 1
        assert data["days_back"] == 7
        
        # Check payment data format
        payment_data = data["unreconciled_payments"][0]
        assert "id" in payment_data
        assert "amount" in payment_data
        assert "status" in payment_data
        assert "stripe_payment_intent_id" in payment_data
        assert "days_old" in payment_data


class TestPaymentReconciliationEdgeCases:
    """Test edge cases and error conditions for payment reconciliation."""
    
    @pytest.mark.asyncio
    async def test_reconcile_with_stripe_api_error(self, reconciliation_service, db_session):
        """Test handling of Stripe API errors during reconciliation."""
        payment = PaymentFactory.create_payment(
            stripe_payment_intent_id="pi_api_error",
            amount=Decimal("20.00"),
            status="completed"
        )
        db_session.add(payment)
        db_session.commit()
        
        # Mock Stripe API error
        import stripe
        with patch('stripe.PaymentIntent.retrieve', side_effect=stripe.error.APIError(
            message="API Error",
            code="api_error"
        )):
            result = await reconciliation_service.reconcile_single_payment(payment)
        
        assert result.matches is False
        assert "stripe_api_error" in result.discrepancies
        assert result.action_required is True
        assert result.stripe_status == "api_error"
    
    @pytest.mark.asyncio
    async def test_reconcile_with_network_timeout(self, reconciliation_service, db_session):
        """Test handling of network timeouts during reconciliation."""
        payment = PaymentFactory.create_payment(
            stripe_payment_intent_id="pi_timeout",
            amount=Decimal("100.00"),
            status="completed"
        )
        db_session.add(payment)
        db_session.commit()
        
        # Mock network timeout
        with patch('stripe.PaymentIntent.retrieve', side_effect=TimeoutError("Request timeout")):
            result = await reconciliation_service.reconcile_single_payment(payment)
        
        assert result.matches is False
        assert "stripe_timeout" in result.discrepancies
        assert result.action_required is True
    
    def test_reconciliation_with_large_dataset(self, reconciliation_service, db_session):
        """Test reconciliation performance with large number of payments."""
        # Create many test payments
        payments = []
        for i in range(100):
            payment = PaymentFactory.create_payment(
                stripe_payment_intent_id=f"pi_bulk_{i}",
                amount=Decimal("10.00"),
                status="completed",
                created_at=datetime.utcnow() - timedelta(hours=i % 24)
            )
            payments.append(payment)
        
        db_session.add_all(payments)
        db_session.commit()
        
        # Get unreconciled payments
        unreconciled = reconciliation_service.get_unreconciled_payments(
            days_back=7,
            limit=50  # Test limit
        )
        
        # Should respect limit
        assert len(unreconciled) <= 50
        # Should return most recent payments first
        if len(unreconciled) >= 2:
            assert unreconciled[0].created_at >= unreconciled[-1].created_at
    
    @pytest.mark.asyncio
    async def test_concurrent_reconciliation_safety(self, reconciliation_service, db_session):
        """Test that concurrent reconciliation operations are safe."""
        payment = PaymentFactory.create_payment(
            stripe_payment_intent_id="pi_concurrent",
            amount=Decimal("50.00"),
            status="completed"
        )
        db_session.add(payment)
        db_session.commit()
        
        # Mock Stripe response
        mock_stripe_pi = {
            "id": "pi_concurrent",
            "amount": 5000,
            "status": "succeeded",
            "created": int(datetime.utcnow().timestamp())
        }
        
        with patch('stripe.PaymentIntent.retrieve', return_value=mock_stripe_pi):
            # Simulate concurrent reconciliation attempts
            import asyncio
            tasks = [
                reconciliation_service.reconcile_single_payment(payment)
                for _ in range(5)
            ]
            results = await asyncio.gather(*tasks)
        
        # All results should be consistent
        for result in results:
            assert result.matches is True
            assert result.local_payment_id == payment.id
            assert result.local_amount == Decimal("50.00")
            assert result.stripe_amount == Decimal("50.00")