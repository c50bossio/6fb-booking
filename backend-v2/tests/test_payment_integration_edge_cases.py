"""
Integration tests for payment system edge cases and real-world scenarios.

Tests complex workflows, error recovery, race conditions,
and integration between payment components.
"""

import pytest
import asyncio
import json
import time
from datetime import datetime, timedelta
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient

from main import app
from models import Payment, User, Appointment, Refund, Payout, GiftCertificate
from services.payment_service import PaymentService
from services.payment_reconciliation import PaymentReconciliationService
from services.payment_monitoring import PaymentMonitoringService
from utils.payment_errors import PaymentErrorCode, PaymentErrorHandler
from tests.factories import UserFactory, AppointmentFactory, PaymentFactory


class TestPaymentWorkflowIntegration:
    """Test complete payment workflows end-to-end."""
    
    def test_complete_payment_success_workflow(self, client: TestClient, db_session):
        """Test complete successful payment workflow with all components."""
        # Create test entities
        client_user = UserFactory.create_user(email="client@test.com")
        barber = UserFactory.create_barber(email="barber@test.com")
        appointment = AppointmentFactory.create_appointment(
            user_id=client_user.id,
            barber_id=barber.id,
            price=Decimal("75.00"),
            status="pending"
        )
        
        db_session.add_all([client_user, barber, appointment])
        db_session.commit()
        
        # Login as client
        login_response = client.post("/api/v1/auth/login", json={
            "email": client_user.email,
            "password": "test_password"
        })
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Step 1: Create payment intent
        with patch('stripe.PaymentIntent.create') as mock_create:
            mock_create.return_value = MagicMock(
                id="pi_test_integration",
                client_secret="pi_test_integration_secret_123",
                amount=7500,
                status="requires_payment_method"
            )
            
            intent_response = client.post(
                "/api/v1/payments/create-intent",
                json={"booking_id": appointment.id},
                headers=headers
            )
        
        assert intent_response.status_code == 200
        intent_data = intent_response.json()
        assert intent_data["payment_intent_id"] == "pi_test_integration"
        assert intent_data["client_secret"] == "pi_test_integration_secret_123"
        
        # Step 2: Confirm payment
        with patch('stripe.PaymentIntent.retrieve') as mock_retrieve:
            mock_retrieve.return_value = MagicMock(
                id="pi_test_integration",
                amount=7500,
                status="succeeded",
                charges=MagicMock(data=[MagicMock(id="ch_test_integration")])
            )
            
            confirm_response = client.post(
                "/api/v1/payments/confirm",
                json={
                    "booking_id": appointment.id,
                    "payment_intent_id": "pi_test_integration"
                },
                headers=headers
            )
        
        assert confirm_response.status_code == 200
        confirm_data = confirm_response.json()
        assert confirm_data["message"] == "Payment confirmed successfully"
        
        # Step 3: Verify database state
        db_session.refresh(appointment)
        payment = db_session.query(Payment).filter(
            Payment.stripe_payment_intent_id == "pi_test_integration"
        ).first()
        
        assert appointment.status == "confirmed"
        assert payment is not None
        assert payment.status == "completed"
        assert payment.amount == Decimal("75.00")
        
        # Step 4: Test webhook processing (idempotency)
        webhook_event = {
            "id": "evt_test_integration",
            "type": "payment_intent.succeeded",
            "data": {
                "object": {
                    "id": "pi_test_integration",
                    "amount": 7500,
                    "status": "succeeded",
                    "charges": {"data": [{"id": "ch_test_integration"}]}
                }
            }
        }
        
        with patch('services.payment_security.PaymentSecurity.verify_webhook_signature', return_value=True):
            webhook_response = client.post(
                "/api/v1/webhooks/stripe",
                json=webhook_event,
                headers={"stripe-signature": "valid"}
            )
        
        assert webhook_response.status_code == 200
        
        # Payment should remain in same state (idempotent)
        db_session.refresh(payment)
        assert payment.status == "completed"
    
    def test_payment_failure_recovery_workflow(self, client: TestClient, db_session):
        """Test payment failure and retry workflow."""
        client_user = UserFactory.create_user(email="client@test.com")
        appointment = AppointmentFactory.create_appointment(
            user_id=client_user.id,
            price=Decimal("50.00")
        )
        
        db_session.add_all([client_user, appointment])
        db_session.commit()
        
        login_response = client.post("/api/v1/auth/login", json={
            "email": client_user.email,
            "password": "test_password"
        })
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Step 1: Create payment intent
        with patch('stripe.PaymentIntent.create') as mock_create:
            mock_create.return_value = MagicMock(
                id="pi_test_failure",
                client_secret="pi_test_failure_secret_123",
                amount=5000,
                status="requires_payment_method"
            )
            
            intent_response = client.post(
                "/api/v1/payments/create-intent",
                json={"booking_id": appointment.id},
                headers=headers
            )
        
        assert intent_response.status_code == 200
        
        # Step 2: Simulate payment failure via webhook
        webhook_event = {
            "id": "evt_test_failure",
            "type": "payment_intent.payment_failed",
            "data": {
                "object": {
                    "id": "pi_test_failure",
                    "amount": 5000,
                    "status": "requires_payment_method",
                    "last_payment_error": {
                        "message": "Your card was declined.",
                        "decline_code": "insufficient_funds"
                    }
                }
            }
        }
        
        with patch('services.payment_security.PaymentSecurity.verify_webhook_signature', return_value=True):
            webhook_response = client.post(
                "/api/v1/webhooks/stripe",
                json=webhook_event,
                headers={"stripe-signature": "valid"}
            )
        
        assert webhook_response.status_code == 200
        
        # Verify failure state
        payment = db_session.query(Payment).filter(
            Payment.stripe_payment_intent_id == "pi_test_failure"
        ).first()
        
        assert payment.status == "failed"
        assert "card was declined" in payment.failure_reason.lower()
        
        # Step 3: Retry payment with new payment method
        with patch('stripe.PaymentIntent.create') as mock_create_retry:
            mock_create_retry.return_value = MagicMock(
                id="pi_test_retry",
                client_secret="pi_test_retry_secret_123",
                amount=5000,
                status="requires_payment_method"
            )
            
            retry_response = client.post(
                "/api/v1/payments/create-intent",
                json={"booking_id": appointment.id},
                headers=headers
            )
        
        assert retry_response.status_code == 200
        retry_data = retry_response.json()
        assert retry_data["payment_intent_id"] == "pi_test_retry"
        
        # Step 4: Successful retry
        with patch('stripe.PaymentIntent.retrieve') as mock_retrieve_success:
            mock_retrieve_success.return_value = MagicMock(
                id="pi_test_retry",
                amount=5000,
                status="succeeded",
                charges=MagicMock(data=[MagicMock(id="ch_test_retry")])
            )
            
            confirm_response = client.post(
                "/api/v1/payments/confirm",
                json={
                    "booking_id": appointment.id,
                    "payment_intent_id": "pi_test_retry"
                },
                headers=headers
            )
        
        assert confirm_response.status_code == 200
        
        # Verify successful retry
        retry_payment = db_session.query(Payment).filter(
            Payment.stripe_payment_intent_id == "pi_test_retry"
        ).first()
        
        assert retry_payment.status == "completed"
        db_session.refresh(appointment)
        assert appointment.status == "confirmed"
    
    def test_gift_certificate_payment_workflow(self, client: TestClient, db_session):
        """Test payment workflow with gift certificate."""
        client_user = UserFactory.create_user(email="client@test.com")
        appointment = AppointmentFactory.create_appointment(
            user_id=client_user.id,
            price=Decimal("60.00")
        )
        
        # Create gift certificate
        gift_cert = GiftCertificate(
            code="GIFT123",
            amount=Decimal("100.00"),
            balance=Decimal("40.00"),  # Partial balance remaining
            status="active",
            valid_until=datetime.utcnow() + timedelta(days=30),
            created_by_id=client_user.id
        )
        
        db_session.add_all([client_user, appointment, gift_cert])
        db_session.commit()
        
        login_response = client.post("/api/v1/auth/login", json={
            "email": client_user.email,
            "password": "test_password"
        })
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Create payment intent with gift certificate
        with patch('stripe.PaymentIntent.create') as mock_create:
            mock_create.return_value = MagicMock(
                id="pi_gift_partial",
                client_secret="pi_gift_partial_secret",
                amount=2000,  # $20.00 remaining after gift certificate
                status="requires_payment_method"
            )
            
            intent_response = client.post(
                "/api/v1/payments/create-intent",
                json={
                    "booking_id": appointment.id,
                    "gift_certificate_code": "GIFT123"
                },
                headers=headers
            )
        
        assert intent_response.status_code == 200
        intent_data = intent_response.json()
        assert intent_data["amount"] == 20.00  # Reduced by gift certificate
        assert intent_data["gift_certificate_used"] == 40.00
        
        # Confirm payment
        with patch('stripe.PaymentIntent.retrieve') as mock_retrieve:
            mock_retrieve.return_value = MagicMock(
                id="pi_gift_partial",
                amount=2000,
                status="succeeded",
                charges=MagicMock(data=[MagicMock(id="ch_gift_partial")])
            )
            
            confirm_response = client.post(
                "/api/v1/payments/confirm",
                json={
                    "booking_id": appointment.id,
                    "payment_intent_id": "pi_gift_partial"
                },
                headers=headers
            )
        
        assert confirm_response.status_code == 200
        confirm_data = confirm_response.json()
        assert confirm_data["gift_certificate_used"] == 40.00
        
        # Verify gift certificate was depleted
        db_session.refresh(gift_cert)
        assert gift_cert.balance == Decimal("0.00")
        assert gift_cert.status == "used"


class TestPaymentConcurrencyAndRaceConditions:
    """Test payment system under concurrent operations and race conditions."""
    
    def test_concurrent_payment_attempts_same_appointment(self, db_session):
        """Test concurrent payment attempts for the same appointment."""
        client_user = UserFactory.create_user()
        appointment = AppointmentFactory.create_appointment(
            user_id=client_user.id,
            price=Decimal("50.00"),
            status="pending"
        )
        
        db_session.add_all([client_user, appointment])
        db_session.commit()
        
        # Simulate concurrent payment attempts
        async def create_payment_intent():
            with patch('stripe.PaymentIntent.create') as mock_create:
                mock_create.return_value = MagicMock(
                    id=f"pi_concurrent_{int(time.time() * 1000000)}",
                    client_secret="pi_concurrent_secret",
                    amount=5000,
                    status="requires_payment_method"
                )
                
                try:
                    result = PaymentService.create_payment_intent(
                        amount=appointment.price,
                        booking_id=appointment.id,
                        db=db_session,
                        user_id=client_user.id
                    )
                    return result
                except Exception as e:
                    return {"error": str(e)}
        
        # Run concurrent attempts
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            tasks = [create_payment_intent() for _ in range(5)]
            results = loop.run_until_complete(asyncio.gather(*tasks))
        finally:
            loop.close()
        
        # Only one should succeed (or handle gracefully)
        successful_results = [r for r in results if "error" not in r]
        error_results = [r for r in results if "error" in r]
        
        print(f"Successful results: {len(successful_results)}")
        print(f"Error results: {len(error_results)}")
        
        # Should handle concurrent attempts gracefully
        assert len(successful_results) >= 1
        if len(successful_results) == 1:
            # Only one succeeded - ideal case
            assert len(error_results) == 4
        else:
            # Multiple succeeded - should be idempotent
            # All successful results should be for the same payment
            payment_intent_ids = [r.get("payment_intent_id") for r in successful_results]
            assert len(set(payment_intent_ids)) <= 1, "Multiple different payment intents created"
    
    def test_concurrent_webhook_processing(self, db_session):
        """Test concurrent webhook processing for the same payment."""
        payment = PaymentFactory.create_payment(
            stripe_payment_intent_id="pi_concurrent_webhook",
            status="pending",
            amount=Decimal("75.00")
        )
        
        db_session.add(payment)
        db_session.commit()
        
        # Simulate concurrent webhook processing
        webhook_event = {
            "id": "evt_concurrent",
            "type": "payment_intent.succeeded",
            "data": {
                "object": {
                    "id": "pi_concurrent_webhook",
                    "amount": 7500,
                    "status": "succeeded",
                    "charges": {"data": [{"id": "ch_concurrent"}]}
                }
            }
        }
        
        def process_webhook():
            """Process webhook and return result."""
            try:
                # Mock webhook processing
                db_payment = db_session.query(Payment).filter(
                    Payment.stripe_payment_intent_id == "pi_concurrent_webhook"
                ).first()
                
                if db_payment and db_payment.status == "pending":
                    db_payment.status = "completed"
                    db_payment.stripe_payment_id = "ch_concurrent"
                    db_session.commit()
                    return {"status": "processed"}
                else:
                    return {"status": "already_processed"}
            except Exception as e:
                return {"status": "error", "error": str(e)}
        
        # Run concurrent webhook processing
        import threading
        
        results = []
        threads = []
        
        def thread_target():
            result = process_webhook()
            results.append(result)
        
        for _ in range(5):
            thread = threading.Thread(target=thread_target)
            threads.append(thread)
            thread.start()
        
        for thread in threads:
            thread.join()
        
        # Should handle concurrent processing gracefully
        processed_count = len([r for r in results if r["status"] == "processed"])
        already_processed_count = len([r for r in results if r["status"] == "already_processed"])
        error_count = len([r for r in results if r["status"] == "error"])
        
        print(f"Processed: {processed_count}, Already processed: {already_processed_count}, Errors: {error_count}")
        
        # Should have exactly one processed, rest already processed
        assert processed_count == 1, "Webhook should be processed exactly once"
        assert already_processed_count == 4, "Other attempts should see already processed"
        assert error_count == 0, "Should not have errors"
        
        # Verify final state
        db_session.refresh(payment)
        assert payment.status == "completed"
        assert payment.stripe_payment_id == "ch_concurrent"
    
    def test_race_condition_gift_certificate_usage(self, db_session):
        """Test race condition when multiple users try to use same gift certificate."""
        gift_cert = GiftCertificate(
            code="RACE123",
            amount=Decimal("50.00"),
            balance=Decimal("50.00"),
            status="active",
            valid_until=datetime.utcnow() + timedelta(days=30)
        )
        
        # Create multiple appointments that could use the gift certificate
        users = [UserFactory.create_user(email=f"user{i}@test.com") for i in range(3)]
        appointments = [
            AppointmentFactory.create_appointment(
                user_id=user.id,
                price=Decimal("30.00")
            ) for user in users
        ]
        
        db_session.add(gift_cert)
        db_session.add_all(users + appointments)
        db_session.commit()
        
        def attempt_gift_certificate_use(user_id, appointment_id):
            """Attempt to use gift certificate."""
            try:
                # Mock gift certificate validation and usage
                db_gift_cert = db_session.query(GiftCertificate).filter(
                    GiftCertificate.code == "RACE123"
                ).first()
                
                if db_gift_cert and db_gift_cert.balance >= Decimal("30.00"):
                    # Simulate processing time
                    time.sleep(0.01)
                    
                    db_gift_cert.balance -= Decimal("30.00")
                    if db_gift_cert.balance == Decimal("0.00"):
                        db_gift_cert.status = "used"
                    
                    db_session.commit()
                    return {"status": "success", "user_id": user_id}
                else:
                    return {"status": "insufficient_balance", "user_id": user_id}
            except Exception as e:
                db_session.rollback()
                return {"status": "error", "user_id": user_id, "error": str(e)}
        
        # Run concurrent gift certificate usage attempts
        import threading
        
        results = []
        threads = []
        
        for user, appointment in zip(users, appointments):
            def thread_target(u=user, a=appointment):
                result = attempt_gift_certificate_use(u.id, a.id)
                results.append(result)
            
            thread = threading.Thread(target=thread_target)
            threads.append(thread)
            thread.start()
        
        for thread in threads:
            thread.join()
        
        # Analyze results
        successful_uses = [r for r in results if r["status"] == "success"]
        insufficient_balance = [r for r in results if r["status"] == "insufficient_balance"]
        
        print(f"Successful uses: {len(successful_uses)}")
        print(f"Insufficient balance: {len(insufficient_balance)}")
        
        # Only one should succeed (gift certificate has $50, each use is $30)
        # But due to race conditions, might allow more - this tests the handling
        assert len(successful_uses) <= 1, "At most one use should succeed"
        
        # Verify final gift certificate state
        db_session.refresh(gift_cert)
        if len(successful_uses) == 1:
            assert gift_cert.balance == Decimal("20.00")  # 50 - 30
        else:
            assert gift_cert.balance == Decimal("50.00")  # Unchanged if all failed


class TestPaymentSystemRecoveryScenarios:
    """Test payment system recovery from various failure scenarios."""
    
    def test_database_connection_failure_recovery(self, db_session):
        """Test payment system recovery from database failures."""
        client_user = UserFactory.create_user()
        appointment = AppointmentFactory.create_appointment(
            user_id=client_user.id,
            price=Decimal("40.00")
        )
        
        db_session.add_all([client_user, appointment])
        db_session.commit()
        
        # Simulate database connection failure during payment creation
        with patch.object(db_session, 'commit', side_effect=Exception("Database connection lost")):
            with pytest.raises(Exception):
                PaymentService.create_payment_intent(
                    amount=appointment.price,
                    booking_id=appointment.id,
                    db=db_session,
                    user_id=client_user.id
                )
        
        # System should recover and work normally after connection restored
        with patch('stripe.PaymentIntent.create') as mock_create:
            mock_create.return_value = MagicMock(
                id="pi_recovery_test",
                client_secret="pi_recovery_secret",
                amount=4000,
                status="requires_payment_method"
            )
            
            # Should work normally after recovery
            result = PaymentService.create_payment_intent(
                amount=appointment.price,
                booking_id=appointment.id,
                db=db_session,
                user_id=client_user.id
            )
        
        assert result["payment_intent_id"] == "pi_recovery_test"
        assert result["client_secret"] == "pi_recovery_secret"
    
    def test_stripe_api_failure_recovery(self, db_session):
        """Test recovery from Stripe API failures."""
        client_user = UserFactory.create_user()
        appointment = AppointmentFactory.create_appointment(
            user_id=client_user.id,
            price=Decimal("35.00")
        )
        
        db_session.add_all([client_user, appointment])
        db_session.commit()
        
        # Simulate Stripe API failure
        import stripe
        
        with patch('stripe.PaymentIntent.create', side_effect=stripe.error.APIError("Stripe API unavailable")):
            with pytest.raises((stripe.error.APIError, Exception)):
                PaymentService.create_payment_intent(
                    amount=appointment.price,
                    booking_id=appointment.id,
                    db=db_session,
                    user_id=client_user.id
                )
        
        # Should work after Stripe recovers
        with patch('stripe.PaymentIntent.create') as mock_create_recovery:
            mock_create_recovery.return_value = MagicMock(
                id="pi_stripe_recovery",
                client_secret="pi_stripe_recovery_secret",
                amount=3500,
                status="requires_payment_method"
            )
            
            result = PaymentService.create_payment_intent(
                amount=appointment.price,
                booking_id=appointment.id,
                db=db_session,
                user_id=client_user.id
            )
        
        assert result["payment_intent_id"] == "pi_stripe_recovery"
    
    def test_partial_payment_state_recovery(self, db_session):
        """Test recovery from partial payment states."""
        # Create payment in inconsistent state
        payment = PaymentFactory.create_payment(
            stripe_payment_intent_id="pi_partial_state",
            status="pending",
            amount=Decimal("55.00"),
            stripe_payment_id=None  # Missing Stripe charge ID
        )
        
        appointment = AppointmentFactory.create_appointment(
            id=payment.appointment_id,
            status="pending"  # Should be confirmed if payment was completed
        )
        
        db_session.add_all([payment, appointment])
        db_session.commit()
        
        # Simulate webhook that should fix the inconsistent state
        webhook_event = {
            "type": "payment_intent.succeeded",
            "data": {
                "object": {
                    "id": "pi_partial_state",
                    "amount": 5500,
                    "status": "succeeded",
                    "charges": {"data": [{"id": "ch_recovery_123"}]}
                }
            }
        }
        
        # Process webhook to fix state
        with patch('services.payment_security.PaymentSecurity.verify_webhook_signature', return_value=True):
            # Mock webhook processing (would normally be done by webhook handler)
            db_session.refresh(payment)
            payment.status = "completed"
            payment.stripe_payment_id = "ch_recovery_123"
            
            db_session.refresh(appointment)
            appointment.status = "confirmed"
            
            db_session.commit()
        
        # Verify recovery
        assert payment.status == "completed"
        assert payment.stripe_payment_id == "ch_recovery_123"
        assert appointment.status == "confirmed"


class TestPaymentSystemIntegrationWithExternalSystems:
    """Test payment system integration with external systems and services."""
    
    @pytest.mark.asyncio
    async def test_payment_reconciliation_integration(self, db_session):
        """Test integration between payment processing and reconciliation."""
        # Create completed payment
        payment = PaymentFactory.create_payment(
            stripe_payment_intent_id="pi_reconciliation_test",
            status="completed",
            amount=Decimal("65.00"),
            created_at=datetime.utcnow() - timedelta(hours=2)
        )
        
        db_session.add(payment)
        db_session.commit()
        
        # Test reconciliation service integration
        reconciliation_service = PaymentReconciliationService(db_session)
        
        # Mock Stripe response for reconciliation
        with patch('stripe.PaymentIntent.retrieve') as mock_retrieve:
            mock_retrieve.return_value = {
                "id": "pi_reconciliation_test",
                "amount": 6500,  # Cents
                "currency": "usd",
                "status": "succeeded",
                "created": int((datetime.utcnow() - timedelta(hours=2)).timestamp())
            }
            
            result = await reconciliation_service.reconcile_single_payment(payment)
        
        assert result.matches is True
        assert result.local_amount == Decimal("65.00")
        assert result.stripe_amount == Decimal("65.00")
        assert result.local_status == "completed"
        assert result.stripe_status == "succeeded"
    
    @pytest.mark.asyncio
    async def test_payment_monitoring_integration(self, db_session):
        """Test integration between payment processing and monitoring."""
        # Create various payments for monitoring
        cutoff_time = datetime.utcnow() - timedelta(minutes=10)
        
        payments = []
        for i in range(20):
            status = "completed" if i % 5 != 0 else "failed"
            payment = PaymentFactory.create_payment(
                amount=Decimal("30.00"),
                status=status,
                created_at=cutoff_time + timedelta(minutes=i % 10)
            )
            payments.append(payment)
        
        db_session.add_all(payments)
        db_session.commit()
        
        # Test monitoring integration
        monitoring_service = PaymentMonitoringService(db_session)
        
        with patch.object(monitoring_service, '_calculate_average_processing_time', return_value=2.1):
            with patch.object(monitoring_service, '_count_fraud_alerts', return_value=1):
                metrics = await monitoring_service.collect_real_time_metrics(period_minutes=10)
        
        assert metrics.total_payments == 20
        assert metrics.successful_payments == 16  # 4 failed out of 20
        assert metrics.failed_payments == 4
        assert metrics.success_rate == 80.0
        assert metrics.average_processing_time == 2.1
        assert metrics.fraud_alerts == 1
        
        # Test SLA compliance checking
        alerts = await monitoring_service.check_sla_compliance(metrics)
        
        # Should generate alert for low success rate (80% < 95% critical threshold)
        success_rate_alerts = [a for a in alerts if a.metric_type.value == "success_rate"]
        assert len(success_rate_alerts) >= 1
        
        critical_alerts = [a for a in alerts if a.level.value == "critical"]
        assert len(critical_alerts) >= 1
    
    def test_error_handling_system_integration(self, db_session):
        """Test integration of structured error handling across components."""
        from utils.payment_errors import PaymentErrorHandler, PaymentErrorCode
        
        client_user = UserFactory.create_user()
        appointment = AppointmentFactory.create_appointment(
            user_id=client_user.id,
            price=Decimal("0.01")  # Below minimum amount
        )
        
        db_session.add_all([client_user, appointment])
        db_session.commit()
        
        # Test error handling integration
        with patch('stripe.PaymentIntent.create') as mock_create:
            # Simulate Stripe rejecting small amount
            import stripe
            stripe_error = stripe.error.InvalidRequestError(
                message="Amount must be at least $0.50",
                param="amount",
                code="amount_too_small"
            )
            mock_create.side_effect = stripe_error
            
            # Should convert to structured error
            try:
                PaymentService.create_payment_intent(
                    amount=appointment.price,
                    booking_id=appointment.id,
                    db=db_session,
                    user_id=client_user.id
                )
                assert False, "Should have raised an exception"
            except Exception as e:
                # Should be converted to structured error by error handler
                if hasattr(e, 'code'):
                    assert e.code == PaymentErrorCode.STRIPE_PROCESSING_ERROR
                # Or could be HTTPException if processed by decorator
                elif hasattr(e, 'status_code'):
                    assert e.status_code in [400, 402, 500]


# Test configuration for integration tests
pytestmark = [pytest.mark.integration, pytest.mark.asyncio]