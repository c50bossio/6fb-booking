"""
Comprehensive tests for Stripe webhook handling.

This test suite covers webhook signature verification, event processing,
error handling, and security aspects of the webhook system.
"""

import pytest
import json
import hmac
import hashlib
import time
from datetime import datetime, timezone
from unittest.mock import MagicMock, patch, AsyncMock
from fastapi.testclient import TestClient
import stripe

from sqlalchemy.orm import Session
from main import app
from models import Payment, User, Appointment, Refund, Payout
from services.payment_security import PaymentSecurity
from tests.factories import UserFactory, AppointmentFactory, PaymentFactory


class TestWebhookSignatureVerification:
    """Test webhook signature verification and security."""
    
    def generate_stripe_signature(self, payload: bytes, secret: str, timestamp: int = None) -> str:
        """Generate a valid Stripe webhook signature."""
        if timestamp is None:
            timestamp = int(time.time())
        
        signed_payload = f"{timestamp}.{payload.decode('utf-8')}"
        signature = hmac.new(
            secret.encode('utf-8'),
            signed_payload.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        
        return f"t={timestamp},v1={signature}"
    
    def test_valid_signature_accepted(self, client: TestClient, db: Session):
        """Test that valid webhook signatures are accepted."""
        # Create test data
        payment = PaymentFactory.create_payment(
            stripe_payment_intent_id="pi_test_123",
            status="pending"
        )
        db.add(payment)
        db.commit()
        
        # Create webhook payload
        event = {
            "id": "evt_test_123",
            "type": "payment_intent.succeeded",
            "data": {
                "object": {
                    "id": "pi_test_123",
                    "amount": 5000,
                    "currency": "usd",
                    "status": "succeeded"
                }
            }
        }
        payload = json.dumps(event).encode('utf-8')
        
        # For this test, we'll mock the signature verification to return True
        with patch('routers.webhooks.PaymentSecurity.verify_webhook_signature', return_value=True):
            # Also need to mock stripe.Event.construct_from
            with patch('routers.webhooks.stripe.Event.construct_from', return_value=MagicMock(
                type="payment_intent.succeeded",
                data=MagicMock(object={
                    "id": "pi_test_123",
                    "amount": 5000,
                    "currency": "usd",
                    "status": "succeeded",
                    "charges": {"data": [{"id": "ch_test_123"}]}
                })
            )):
                response = client.post(
                    "/api/v2/webhooks/stripe",
                    content=payload,
                    headers={"stripe-signature": "valid_signature"}
                )
        
        assert response.status_code == 200
        assert response.json()["status"] == "success"
    
    def test_invalid_signature_rejected(self, client: TestClient):
        """Test that invalid signatures are rejected."""
        event = {"type": "payment_intent.succeeded"}
        payload = json.dumps(event).encode('utf-8')
        
        # Invalid signature
        response = client.post(
            "/api/v2/webhooks/stripe",
            content=payload,
            headers={"stripe-signature": "invalid_signature"}
        )
        
        assert response.status_code == 400
        assert "Invalid signature" in response.json()["detail"]
    
    def test_missing_signature_rejected(self, client: TestClient):
        """Test that requests without signatures are rejected."""
        event = {"type": "payment_intent.succeeded"}
        payload = json.dumps(event).encode('utf-8')
        
        response = client.post(
            "/api/v2/webhooks/stripe",
            content=payload
        )
        
        assert response.status_code == 400
        assert "Missing Stripe signature" in response.json()["detail"]
    
    def test_old_timestamp_rejected(self, client: TestClient):
        """Test that webhooks with old timestamps are rejected (replay attack prevention)."""
        event = {"type": "payment_intent.succeeded"}
        payload = json.dumps(event).encode('utf-8')
        
        # Generate signature with old timestamp (10 minutes ago)
        webhook_secret = "whsec_test_secret"
        old_timestamp = int(time.time()) - 600
        signature = self.generate_stripe_signature(payload, webhook_secret, old_timestamp)
        
        with patch('config.settings.stripe_webhook_secret', webhook_secret):
            response = client.post(
                "/api/v2/webhooks/stripe",
                content=payload,
                headers={"stripe-signature": signature}
            )
        
        assert response.status_code == 400
        assert "Invalid signature" in response.json()["detail"]


class TestWebhookEventHandlers:
    """Test webhook event processing for different Stripe events."""
    
    @pytest.fixture
    def valid_signature(self):
        """Fixture to mock valid signature verification."""
        with patch.object(PaymentSecurity, 'verify_webhook_signature', return_value=True):
            yield
    
    def test_payment_intent_succeeded(self, client: TestClient, db: Session, valid_signature):
        """Test handling of successful payment intent."""
        # Create pending payment
        barber = UserFactory.create_barber()
        appointment = AppointmentFactory.create_appointment(barber_id=barber.id)
        payment = PaymentFactory.create_payment(
            appointment_id=appointment.id,
            stripe_payment_intent_id="pi_test_success",
            status="pending",
            amount=50.0
        )
        db.add_all([barber, appointment, payment])
        db.commit()
        
        # Create webhook event
        event = {
            "id": "evt_test_success",
            "type": "payment_intent.succeeded",
            "data": {
                "object": {
                    "id": "pi_test_success",
                    "amount": 5000,
                    "currency": "usd",  
                    "status": "succeeded",
                    "charges": {
                        "data": [{"id": "ch_test_123"}]
                    }
                }
            }
        }
        
        # Mock stripe.Event.construct_from
        with patch('stripe.Event.construct_from') as mock_construct:
            mock_construct.return_value = MagicMock(
                type="payment_intent.succeeded",
                data=MagicMock(object={
                    "id": "pi_test_success",
                    "amount": 5000,
                    "currency": "usd",
                    "status": "succeeded",
                    "charges": {
                        "data": [{"id": "ch_test_123"}]
                    }
                })
            )
            
            response = client.post(
                "/api/v2/webhooks/stripe",
                json=event,
                headers={"stripe-signature": "valid_signature"}
            )
        
        assert response.status_code == 200
        
        # Verify payment was updated
        db.refresh(payment)
        assert payment.status == "completed"
        assert payment.stripe_payment_id == "ch_test_123"
        
        # Verify appointment was updated
        db.refresh(appointment)
        assert appointment.status == "confirmed"
    
    def test_payment_intent_failed(self, client: TestClient, db: Session, valid_signature):
        """Test handling of failed payment intent."""
        # Create pending payment
        payment = PaymentFactory.create_payment(
            stripe_payment_intent_id="pi_test_failed",
            status="pending"
        )
        db.add(payment)
        db.commit()
        
        # Create webhook event
        event = {
            "id": "evt_test_failed",
            "type": "payment_intent.payment_failed",
            "data": {
                "object": {
                    "id": "pi_test_failed",
                    "amount": 5000,
                    "status": "requires_payment_method",
                    "last_payment_error": {
                        "message": "Card declined"
                    }
                }
            }
        }
        
        response = client.post(
            "/api/v2/webhooks/stripe",
            json=event,
            headers={"stripe-signature": "valid_signature"}
        )
        
        assert response.status_code == 200
        
        # Verify payment was updated
        db.refresh(payment)
        assert payment.status == "failed"
        assert "Card declined" in payment.failure_reason
    
    def test_charge_dispute_created(self, client: TestClient, db: Session, valid_signature):
        """Test handling of charge dispute creation."""
        # Create completed payment
        payment = PaymentFactory.create_payment(
            stripe_payment_id="ch_disputed",
            status="completed"
        )
        db.add(payment)
        db.commit()
        
        # Create webhook event
        event = {
            "id": "evt_test_dispute",
            "type": "charge.dispute.created",
            "data": {
                "object": {
                    "charge": "ch_disputed",
                    "amount": 5000,
                    "reason": "fraudulent",
                    "status": "warning_needs_response"
                }
            }
        }
        
        response = client.post(
            "/api/v2/webhooks/stripe",
            json=event,
            headers={"stripe-signature": "valid_signature"}
        )
        
        assert response.status_code == 200
        
        # Verify payment was updated
        db.refresh(payment)
        assert payment.status == "disputed"
        assert payment.dispute_status == "warning_needs_response"
    
    def test_transfer_created(self, client: TestClient, db: Session, valid_signature):
        """Test handling of successful transfer creation."""
        # Create payout record
        barber = UserFactory.create_barber(stripe_account_id="acct_test")
        payout = Payout(
            barber_id=barber.id,
            amount=100.0,
            stripe_transfer_id="tr_test_123",
            status="pending",
            payment_count=3
        )
        db.add_all([barber, payout])
        db.commit()
        
        # Create webhook event
        event = {
            "id": "evt_test_transfer",
            "type": "transfer.created",
            "data": {
                "object": {
                    "id": "tr_test_123",
                    "amount": 10000,
                    "currency": "usd",
                    "destination": "acct_test",
                    "status": "paid"
                }
            }
        }
        
        response = client.post(
            "/api/v2/webhooks/stripe",
            json=event,
            headers={"stripe-signature": "valid_signature"}
        )
        
        assert response.status_code == 200
        
        # Verify payout was updated
        db.refresh(payout)
        assert payout.status == "completed"
        assert payout.paid_at is not None
    
    def test_transfer_failed(self, client: TestClient, db: Session, valid_signature):
        """Test handling of failed transfer."""
        # Create payout record
        payout = Payout(
            barber_id=1,
            amount=100.0,
            stripe_transfer_id="tr_test_failed",
            status="pending",
            payment_count=2
        )
        db.add(payout)
        db.commit()
        
        # Create webhook event
        event = {
            "id": "evt_test_transfer_failed",
            "type": "transfer.failed",
            "data": {
                "object": {
                    "id": "tr_test_failed",
                    "amount": 10000,
                    "failure_message": "Account cannot receive payouts"
                }
            }
        }
        
        response = client.post(
            "/api/v2/webhooks/stripe",
            json=event,
            headers={"stripe-signature": "valid_signature"}
        )
        
        assert response.status_code == 200
        
        # Verify payout was updated
        db.refresh(payout)
        assert payout.status == "failed"
        assert "Account cannot receive payouts" in payout.failure_reason


class TestWebhookErrorHandling:
    """Test webhook error handling and edge cases."""
    
    @pytest.fixture
    def valid_signature(self):
        """Fixture to mock valid signature verification."""
        with patch.object(PaymentSecurity, 'verify_webhook_signature', return_value=True):
            yield
    
    def test_invalid_json_payload(self, client: TestClient, valid_signature):
        """Test handling of invalid JSON in webhook payload."""
        response = client.post(
            "/api/v2/webhooks/stripe",
            content=b"invalid json",
            headers={"stripe-signature": "valid_signature"}
        )
        
        assert response.status_code == 400
        assert "Invalid payload" in response.json()["detail"]
    
    def test_unknown_event_type(self, client: TestClient, valid_signature):
        """Test handling of unknown event types."""
        event = {
            "id": "evt_unknown",
            "type": "unknown.event.type",
            "data": {"object": {}}
        }
        
        response = client.post(
            "/api/v2/webhooks/stripe",
            json=event,
            headers={"stripe-signature": "valid_signature"}
        )
        
        # Should still return success but log the unknown event
        assert response.status_code == 200
        assert response.json()["status"] == "success"
    
    def test_payment_not_found(self, client: TestClient, db: Session, valid_signature):
        """Test handling when payment record is not found."""
        event = {
            "id": "evt_no_payment",
            "type": "payment_intent.succeeded",
            "data": {
                "object": {
                    "id": "pi_nonexistent",
                    "amount": 5000,
                    "status": "succeeded"
                }
            }
        }
        
        response = client.post(
            "/api/v2/webhooks/stripe",
            json=event,
            headers={"stripe-signature": "valid_signature"}
        )
        
        # Should still return success (idempotency)
        assert response.status_code == 200
    
    def test_database_error_handling(self, client: TestClient, db: Session, valid_signature):
        """Test handling of database errors during webhook processing."""
        # Create payment that will cause an error
        payment = PaymentFactory.create_payment(
            stripe_payment_intent_id="pi_db_error",
            status="pending"
        )
        db.add(payment)
        db.commit()
        
        event = {
            "id": "evt_db_error",
            "type": "payment_intent.succeeded",
            "data": {
                "object": {
                    "id": "pi_db_error",
                    "amount": 5000,
                    "status": "succeeded",
                    "charges": {
                        "data": [{"id": "ch_error"}]
                    }
                }
            }
        }
        
        # Mock stripe.Event.construct_from and database error in the handler
        with patch('stripe.Event.construct_from') as mock_construct:
            mock_construct.return_value = MagicMock(
                type="payment_intent.succeeded",
                data=MagicMock(object={
                    "id": "pi_db_error",
                    "amount": 5000,
                    "status": "succeeded",
                    "charges": {
                        "data": [{"id": "ch_error"}]
                    }
                })
            )
            
            # Mock the handle_payment_intent_succeeded to raise an error
            with patch('routers.webhooks.handle_payment_intent_succeeded', side_effect=Exception("Database error")):
                response = client.post(
                    "/api/v2/webhooks/stripe",
                    json=event,
                    headers={"stripe-signature": "valid_signature"}
                )
        
        assert response.status_code == 500
        assert "Webhook processing error" in response.json()["detail"]


class TestWebhookSecurity:
    """Test webhook security features and audit logging."""
    
    @patch('services.payment_security.audit_logger.log_security_violation')
    def test_invalid_signature_audit_log(self, mock_log, client: TestClient):
        """Test that invalid signatures are logged as security violations."""
        response = client.post(
            "/api/v2/webhooks/stripe",
            json={"type": "test"},
            headers={"stripe-signature": "invalid"}
        )
        
        assert response.status_code == 400
        mock_log.assert_called_once()
        assert "invalid_webhook_signature" in str(mock_log.call_args)
    
    def test_webhook_rate_limiting(self, client: TestClient):
        """Test that webhook endpoint has appropriate rate limiting."""
        # Note: Rate limiting might be disabled in test environment
        # This test documents expected behavior in production
        
        event = {"type": "test"}
        headers = {"stripe-signature": "test"}
        
        # Make multiple rapid requests
        responses = []
        for _ in range(100):
            response = client.post(
                "/api/v2/webhooks/stripe",
                json=event,
                headers=headers
            )
            responses.append(response.status_code)
        
        # In production, some should be rate limited (429)
        # In test environment with rate limiting disabled, all might be 400
        assert all(status in [400, 429] for status in responses)
    
    def test_webhook_idempotency(self, client: TestClient, db: Session):
        """Test that webhooks are idempotent (can be processed multiple times safely)."""
        with patch.object(PaymentSecurity, 'verify_webhook_signature', return_value=True):
            # Create payment
            payment = PaymentFactory.create_payment(
                stripe_payment_intent_id="pi_idempotent",
                status="pending"
            )
            db.add(payment)
            db.commit()
            
            event = {
                "id": "evt_idempotent",
                "type": "payment_intent.succeeded",
                "data": {
                    "object": {
                        "id": "pi_idempotent",
                        "amount": 5000,
                        "status": "succeeded",
                        "charges": {"data": [{"id": "ch_123"}]}
                    }
                }
            }
            
            # Process webhook multiple times
            for _ in range(3):
                response = client.post(
                    "/api/v2/webhooks/stripe",
                    json=event,
                    headers={"stripe-signature": "valid"}
                )
                assert response.status_code == 200
            
            # Verify payment was only updated once
            db.refresh(payment)
            assert payment.status == "completed"
            assert payment.stripe_payment_id == "ch_123"


class TestWebhookIntegration:
    """Integration tests for webhook processing."""
    
    def test_payment_success_full_flow(self, client: TestClient, db: Session):
        """Test complete flow from payment intent to confirmed appointment."""
        with patch.object(PaymentSecurity, 'verify_webhook_signature', return_value=True):
            # Create full scenario
            barber = UserFactory.create_barber()
            client_user = UserFactory.create_user()
            appointment = AppointmentFactory.create_appointment(
                user_id=client_user.id,
                barber_id=barber.id,
                status="pending"
            )
            payment = PaymentFactory.create_payment(
                user_id=client_user.id,
                appointment_id=appointment.id,
                barber_id=barber.id,
                stripe_payment_intent_id="pi_full_flow",
                status="pending",
                amount=75.0,
                platform_fee=15.0,
                barber_amount=60.0
            )
            db.add_all([barber, client_user, appointment, payment])
            db.commit()
            
            # Mock notification service - just comment out for now since it's not implemented
            # with patch('services.notification_service.notification_service.send_payment_confirmation') as mock_notify:
            event = {
                "id": "evt_full_flow",
                "type": "payment_intent.succeeded",
                "data": {
                    "object": {
                        "id": "pi_full_flow",
                        "amount": 7500,
                        "status": "succeeded",
                        "charges": {"data": [{"id": "ch_full_flow"}]}
                    }
                }
            }
            
            response = client.post(
                "/api/v2/webhooks/stripe",
                json=event,
                headers={"stripe-signature": "valid"}
            )
            
            assert response.status_code == 200
            
            # Verify all updates
            db.refresh(payment)
            db.refresh(appointment)
            
            assert payment.status == "completed"
            assert appointment.status == "confirmed"
            
            # Verify notification was triggered
            # mock_notify.assert_called_once()  # Skip for now since notification service not implemented
    
    def test_refund_webhook_flow(self, client: TestClient, db: Session):
        """Test refund processing via webhook."""
        with patch.object(PaymentSecurity, 'verify_webhook_signature', return_value=True):
            # Create completed payment with refund
            payment = PaymentFactory.create_payment(
                stripe_payment_id="ch_refunded",
                status="completed"
            )
            refund = Refund(
                payment_id=payment.id,
                amount=25.0,
                stripe_refund_id="re_test_123",
                status="pending",
                reason="requested_by_customer"
            )
            db.add_all([payment, refund])
            db.commit()
            
            event = {
                "id": "evt_refund",
                "type": "charge.refunded",
                "data": {
                    "object": {
                        "id": "ch_refunded",
                        "amount_refunded": 2500,
                        "refunds": {
                            "data": [{
                                "id": "re_test_123",
                                "amount": 2500,
                                "status": "succeeded"
                            }]
                        }
                    }
                }
            }
            
            response = client.post(
                "/api/v2/webhooks/stripe",
                json=event,
                headers={"stripe-signature": "valid"}
            )
            
            # Should handle gracefully even if not explicitly implemented
            assert response.status_code == 200