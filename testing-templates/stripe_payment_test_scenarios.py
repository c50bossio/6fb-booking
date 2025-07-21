"""
Stripe Payment Integration Testing Scenarios
==========================================

Comprehensive test scenarios for Stripe Connect integration in the 6FB Booking platform.
Covers payment processing, barber payouts, webhooks, and error handling.
"""

import pytest
import stripe
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime, timedelta
from decimal import Decimal
import json

# Test configuration
STRIPE_TEST_SECRET_KEY = "sk_test_..."  # Replace with actual test key
STRIPE_TEST_PUBLISHABLE_KEY = "pk_test_..."

# Stripe test card numbers (official Stripe test cards)
TEST_CARDS = {
    "visa": "4242424242424242",
    "visa_debit": "4000056655665556",
    "mastercard": "5555555555554444",
    "amex": "378282246310005",
    "declined": "4000000000000002",
    "insufficient_funds": "4000000000009995",
    "expired": "4000000000000069",
    "processing_error": "4000000000000119",
    "3d_secure": "4000002760003184"
}


class TestStripePaymentProcessing:
    """Test core payment processing functionality"""
    
    @pytest.fixture
    def mock_stripe_payment_intent(self):
        """Mock Stripe PaymentIntent object"""
        return {
            "id": "pi_test_1234567890",
            "amount": 5000,  # $50.00
            "currency": "usd",
            "status": "succeeded",
            "client_secret": "pi_test_1234567890_secret_test",
            "charges": {
                "data": [{
                    "id": "ch_test_1234567890",
                    "amount": 5000,
                    "fee": 175,  # Stripe fee: $1.75
                    "net": 4825   # Net amount: $48.25
                }]
            }
        }
    
    @pytest.fixture
    def test_appointment(self):
        """Create test appointment requiring payment"""
        client = create_test_client()
        barber = create_test_barber()
        service = create_test_service("Premium Haircut", price=50.00)
        
        return create_test_appointment(
            client=client,
            barber=barber,
            service=service,
            payment_status="pending"
        )
    
    def test_create_payment_intent_success(self, test_appointment, mock_stripe_payment_intent):
        """Test successful payment intent creation"""
        with patch('stripe.PaymentIntent.create') as mock_create:
            mock_create.return_value = mock_stripe_payment_intent
            
            # When: Creating payment intent
            response = client.post(
                f"/api/v1/payments/{test_appointment.id}/create-intent",
                json={"amount": 5000}
            )
            
            # Then: Payment intent created successfully
            assert response.status_code == 200
            data = response.json()
            
            assert data["payment_intent_id"] == "pi_test_1234567890"
            assert data["client_secret"] == "pi_test_1234567890_secret_test"
            assert data["amount"] == 5000
            
            # And: Stripe called with correct parameters
            mock_create.assert_called_once_with(
                amount=5000,
                currency="usd",
                metadata={
                    "appointment_id": str(test_appointment.id),
                    "barber_id": str(test_appointment.barber_id),
                    "client_id": str(test_appointment.client_id)
                },
                application_fee_amount=1500,  # Platform fee (30% of $50)
                stripe_account=test_appointment.barber.stripe_account_id
            )
    
    def test_confirm_payment_success(self, test_appointment, mock_stripe_payment_intent):
        """Test successful payment confirmation"""
        with patch('stripe.PaymentIntent.retrieve') as mock_retrieve:
            mock_retrieve.return_value = mock_stripe_payment_intent
            
            # When: Confirming payment
            response = client.post(
                f"/api/v1/payments/{test_appointment.id}/confirm",
                json={"payment_intent_id": "pi_test_1234567890"}
            )
            
            # Then: Payment confirmed
            assert response.status_code == 200
            data = response.json()
            
            assert data["status"] == "succeeded"
            assert data["amount_paid"] == 50.00
            
            # And: Appointment status updated
            updated_appointment = Appointment.get(test_appointment.id)
            assert updated_appointment.payment_status == "paid"
            assert updated_appointment.status == "confirmed"
    
    def test_payment_with_card_declined(self, test_appointment):
        """Test handling of declined card"""
        with patch('stripe.PaymentIntent.create') as mock_create:
            # Simulate declined card error
            error = stripe.error.CardError(
                message="Your card was declined.",
                param="card",
                code="card_declined"
            )
            mock_create.side_effect = error
            
            # When: Attempting payment with declined card
            response = client.post(
                f"/api/v1/payments/{test_appointment.id}/create-intent",
                json={
                    "amount": 5000,
                    "payment_method": "pm_card_chargeDeclined"
                }
            )
            
            # Then: Error handled gracefully
            assert response.status_code == 400
            data = response.json()
            
            assert data["error"]["type"] == "card_error"
            assert "declined" in data["error"]["message"].lower()
            
            # And: Appointment status unchanged
            updated_appointment = Appointment.get(test_appointment.id)
            assert updated_appointment.payment_status == "pending"
    
    def test_payment_with_insufficient_funds(self, test_appointment):
        """Test handling of insufficient funds"""
        with patch('stripe.PaymentIntent.create') as mock_create:
            error = stripe.error.CardError(
                message="Your card has insufficient funds.",
                param="card",
                code="insufficient_funds"
            )
            mock_create.side_effect = error
            
            # When: Attempting payment with insufficient funds
            response = client.post(
                f"/api/v1/payments/{test_appointment.id}/create-intent",
                json={"amount": 5000}
            )
            
            # Then: Specific error message returned
            assert response.status_code == 400
            data = response.json()
            
            assert data["error"]["code"] == "insufficient_funds"
            assert "insufficient funds" in data["error"]["message"].lower()
    
    def test_3d_secure_authentication(self, test_appointment):
        """Test 3D Secure authentication flow"""
        with patch('stripe.PaymentIntent.create') as mock_create:
            # Simulate 3D Secure required
            mock_create.return_value = {
                "id": "pi_test_3ds",
                "status": "requires_action",
                "client_secret": "pi_test_3ds_secret",
                "next_action": {
                    "type": "use_stripe_sdk"
                }
            }
            
            # When: Creating payment intent that requires 3DS
            response = client.post(
                f"/api/v1/payments/{test_appointment.id}/create-intent",
                json={"amount": 5000}
            )
            
            # Then: 3DS action required
            assert response.status_code == 200
            data = response.json()
            
            assert data["status"] == "requires_action"
            assert data["next_action"]["type"] == "use_stripe_sdk"
            
            # And: Frontend can handle 3DS flow
            assert "client_secret" in data


class TestBarberPayouts:
    """Test barber payout processing via Stripe Connect"""
    
    @pytest.fixture
    def barber_with_stripe_account(self):
        """Create barber with connected Stripe account"""
        return create_test_barber(
            stripe_account_id="acct_test_barber123",
            stripe_onboarding_complete=True,
            commission_rate=0.70  # 70% commission
        )
    
    @pytest.fixture
    def completed_paid_appointment(self, barber_with_stripe_account):
        """Create completed and paid appointment"""
        return create_completed_appointment(
            barber=barber_with_stripe_account,
            service_price=100.00,
            payment_status="paid",
            stripe_payment_intent_id="pi_test_completed"
        )
    
    def test_calculate_barber_payout(self, completed_paid_appointment):
        """Test barber payout calculation"""
        barber = completed_paid_appointment.barber
        appointment = completed_paid_appointment
        
        # When: Calculating payout
        payout_calculation = calculate_barber_payout(appointment)
        
        # Then: Payout calculated correctly
        assert payout_calculation["gross_amount"] == 100.00
        assert payout_calculation["platform_fee"] == 30.00  # 30%
        assert payout_calculation["barber_commission"] == 70.00  # 70%
        assert payout_calculation["stripe_fee"] == 3.20  # ~3.2% of $100
        assert payout_calculation["net_payout"] == 66.80  # $70 - $3.20
    
    def test_process_barber_payout(self, completed_paid_appointment):
        """Test processing barber payout via Stripe Connect"""
        with patch('stripe.Transfer.create') as mock_transfer:
            mock_transfer.return_value = {
                "id": "tr_test_payout123",
                "amount": 6680,  # $66.80 in cents
                "destination": "acct_test_barber123"
            }
            
            # When: Processing payout
            response = admin_client.post(
                f"/api/v1/payouts/process/{completed_paid_appointment.id}"
            )
            
            # Then: Payout processed successfully
            assert response.status_code == 200
            data = response.json()
            
            assert data["payout_amount"] == 66.80
            assert data["stripe_transfer_id"] == "tr_test_payout123"
            
            # And: Stripe transfer created
            mock_transfer.assert_called_once_with(
                amount=6680,
                currency="usd",
                destination="acct_test_barber123",
                metadata={
                    "appointment_id": str(completed_paid_appointment.id),
                    "barber_id": str(completed_paid_appointment.barber_id)
                }
            )
            
            # And: Payout record created
            payout = Payout.filter(appointment_id=completed_paid_appointment.id).first()
            assert payout is not None
            assert payout.amount == Decimal("66.80")
            assert payout.status == "completed"
    
    def test_batch_payout_processing(self):
        """Test processing multiple payouts in batch"""
        # Given: Multiple completed appointments
        barber = create_test_barber(stripe_account_id="acct_test_batch")
        appointments = [
            create_completed_appointment(barber=barber, service_price=50.00),
            create_completed_appointment(barber=barber, service_price=75.00),
            create_completed_appointment(barber=barber, service_price=60.00)
        ]
        
        with patch('stripe.Transfer.create') as mock_transfer:
            mock_transfer.return_value = {
                "id": "tr_test_batch123",
                "amount": 12950,  # Combined amount
                "destination": "acct_test_batch"
            }
            
            # When: Processing daily payouts
            response = admin_client.post("/api/v1/payouts/process-daily")
            
            # Then: Batch payout processed
            assert response.status_code == 200
            data = response.json()
            
            assert data["payouts_processed"] == 3
            assert data["total_amount"] == 129.50  # Combined payout
            
            # And: Single Stripe transfer for all appointments
            mock_transfer.assert_called_once()
    
    def test_payout_with_stripe_account_not_connected(self):
        """Test payout attempt for barber without Stripe account"""
        # Given: Barber without Stripe account
        barber = create_test_barber(stripe_account_id=None)
        appointment = create_completed_appointment(barber=barber)
        
        # When: Attempting payout
        response = admin_client.post(f"/api/v1/payouts/process/{appointment.id}")
        
        # Then: Error returned
        assert response.status_code == 400
        data = response.json()
        
        assert "stripe account not connected" in data["detail"].lower()
        
        # And: No payout record created
        payout = Payout.filter(appointment_id=appointment.id).first()
        assert payout is None


class TestStripeWebhooks:
    """Test Stripe webhook processing"""
    
    @pytest.fixture
    def webhook_secret(self):
        return "whsec_test_webhook_secret"
    
    def test_payment_intent_succeeded_webhook(self, webhook_secret):
        """Test processing payment_intent.succeeded webhook"""
        # Given: Payment intent succeeded event
        webhook_payload = {
            "type": "payment_intent.succeeded",
            "data": {
                "object": {
                    "id": "pi_test_webhook123",
                    "amount": 5000,
                    "status": "succeeded",
                    "metadata": {
                        "appointment_id": "123"
                    }
                }
            }
        }
        
        with patch('stripe.Webhook.construct_event') as mock_construct:
            mock_construct.return_value = webhook_payload
            
            # When: Processing webhook
            response = client.post(
                "/api/v1/webhooks/stripe",
                json=webhook_payload,
                headers={"stripe-signature": "test_signature"}
            )
            
            # Then: Webhook processed successfully
            assert response.status_code == 200
            
            # And: Appointment status updated
            appointment = Appointment.get(123)
            assert appointment.payment_status == "paid"
            assert appointment.status == "confirmed"
    
    def test_payment_intent_failed_webhook(self, webhook_secret):
        """Test processing payment_intent.payment_failed webhook"""
        webhook_payload = {
            "type": "payment_intent.payment_failed",
            "data": {
                "object": {
                    "id": "pi_test_failed",
                    "amount": 5000,
                    "status": "failed",
                    "last_payment_error": {
                        "code": "card_declined",
                        "message": "Your card was declined."
                    },
                    "metadata": {
                        "appointment_id": "124"
                    }
                }
            }
        }
        
        with patch('stripe.Webhook.construct_event') as mock_construct:
            mock_construct.return_value = webhook_payload
            
            # When: Processing webhook
            response = client.post(
                "/api/v1/webhooks/stripe",
                json=webhook_payload,
                headers={"stripe-signature": "test_signature"}
            )
            
            # Then: Webhook processed
            assert response.status_code == 200
            
            # And: Appointment payment marked as failed
            appointment = Appointment.get(124)
            assert appointment.payment_status == "failed"
            assert appointment.status == "pending"  # Reverts to pending
            
            # And: Client notified of payment failure
            client_notification = get_last_sms(appointment.client.phone)
            assert "payment failed" in client_notification.content.lower()
    
    def test_account_updated_webhook(self, webhook_secret):
        """Test processing account.updated webhook for barber onboarding"""
        webhook_payload = {
            "type": "account.updated",
            "data": {
                "object": {
                    "id": "acct_test_updated",
                    "charges_enabled": True,
                    "payouts_enabled": True,
                    "requirements": {
                        "disabled_reason": None,
                        "currently_due": []
                    }
                }
            }
        }
        
        with patch('stripe.Webhook.construct_event') as mock_construct:
            mock_construct.return_value = webhook_payload
            
            # When: Processing webhook
            response = client.post(
                "/api/v1/webhooks/stripe",
                json=webhook_payload,
                headers={"stripe-signature": "test_signature"}
            )
            
            # Then: Webhook processed
            assert response.status_code == 200
            
            # And: Barber account updated
            barber = Barber.filter(stripe_account_id="acct_test_updated").first()
            assert barber.stripe_onboarding_complete == True
            assert barber.can_receive_payouts == True


class TestRefundsAndDisputes:
    """Test refund processing and dispute handling"""
    
    def test_process_refund(self):
        """Test processing appointment refund"""
        # Given: Paid appointment that needs refund
        appointment = create_paid_appointment(
            service_price=75.00,
            stripe_payment_intent_id="pi_test_refund"
        )
        
        with patch('stripe.Refund.create') as mock_refund:
            mock_refund.return_value = {
                "id": "re_test_refund123",
                "amount": 7500,
                "status": "succeeded"
            }
            
            # When: Processing refund
            response = admin_client.post(
                f"/api/v1/payments/{appointment.id}/refund",
                json={
                    "amount": 7500,  # Full refund
                    "reason": "requested_by_customer"
                }
            )
            
            # Then: Refund processed
            assert response.status_code == 200
            data = response.json()
            
            assert data["refund_id"] == "re_test_refund123"
            assert data["amount_refunded"] == 75.00
            
            # And: Appointment status updated
            updated_appointment = Appointment.get(appointment.id)
            assert updated_appointment.payment_status == "refunded"
            assert updated_appointment.status == "cancelled"
            
            # And: Client notified
            client_notification = get_last_email(appointment.client.email)
            assert "refund" in client_notification.subject.lower()
    
    def test_partial_refund(self):
        """Test processing partial refund"""
        appointment = create_paid_appointment(
            service_price=100.00,
            stripe_payment_intent_id="pi_test_partial"
        )
        
        with patch('stripe.Refund.create') as mock_refund:
            mock_refund.return_value = {
                "id": "re_test_partial123",
                "amount": 5000,  # $50 partial refund
                "status": "succeeded"
            }
            
            # When: Processing partial refund
            response = admin_client.post(
                f"/api/v1/payments/{appointment.id}/refund",
                json={
                    "amount": 5000,
                    "reason": "service_not_as_described"
                }
            )
            
            # Then: Partial refund processed
            assert response.status_code == 200
            
            # And: Appointment remains completed but marked with partial refund
            updated_appointment = Appointment.get(appointment.id)
            assert updated_appointment.payment_status == "partially_refunded"
            assert updated_appointment.refund_amount == Decimal("50.00")


class TestStripeConnectOnboarding:
    """Test barber Stripe Connect account onboarding"""
    
    def test_create_express_account(self):
        """Test creating Stripe Express account for barber"""
        barber = create_test_barber(stripe_account_id=None)
        
        with patch('stripe.Account.create') as mock_create:
            mock_create.return_value = {
                "id": "acct_test_new123",
                "type": "express",
                "charges_enabled": False,
                "payouts_enabled": False
            }
            
            # When: Creating Stripe account
            response = client.post(
                f"/api/v1/barbers/{barber.id}/stripe/create-account"
            )
            
            # Then: Account created
            assert response.status_code == 200
            data = response.json()
            
            assert data["account_id"] == "acct_test_new123"
            assert data["charges_enabled"] == False
            
            # And: Barber updated with account ID
            updated_barber = Barber.get(barber.id)
            assert updated_barber.stripe_account_id == "acct_test_new123"
    
    def test_create_account_link(self):
        """Test creating account link for onboarding"""
        barber = create_test_barber(stripe_account_id="acct_test_link")
        
        with patch('stripe.AccountLink.create') as mock_create_link:
            mock_create_link.return_value = {
                "url": "https://connect.stripe.com/setup/e/acct_test_link",
                "expires_at": 1234567890
            }
            
            # When: Creating account link
            response = client.post(
                f"/api/v1/barbers/{barber.id}/stripe/create-onboarding-link"
            )
            
            # Then: Link created
            assert response.status_code == 200
            data = response.json()
            
            assert data["url"].startswith("https://connect.stripe.com/setup")
            assert "expires_at" in data


class TestPaymentErrorHandling:
    """Test various payment error scenarios"""
    
    def test_network_error_handling(self, test_appointment):
        """Test handling of network errors during payment"""
        with patch('stripe.PaymentIntent.create') as mock_create:
            # Simulate network error
            mock_create.side_effect = stripe.error.APIConnectionError(
                "Network communication with Stripe failed"
            )
            
            # When: Network error occurs
            response = client.post(
                f"/api/v1/payments/{test_appointment.id}/create-intent",
                json={"amount": 5000}
            )
            
            # Then: Error handled gracefully
            assert response.status_code == 503  # Service Unavailable
            data = response.json()
            
            assert "network" in data["error"]["message"].lower()
            assert data["error"]["type"] == "connection_error"
            assert "retry" in data["error"]["message"].lower()
    
    def test_api_error_handling(self, test_appointment):
        """Test handling of Stripe API errors"""
        with patch('stripe.PaymentIntent.create') as mock_create:
            mock_create.side_effect = stripe.error.APIError(
                "Something went wrong on Stripe's end"
            )
            
            # When: API error occurs
            response = client.post(
                f"/api/v1/payments/{test_appointment.id}/create-intent",
                json={"amount": 5000}
            )
            
            # Then: Error handled appropriately
            assert response.status_code == 502  # Bad Gateway
            data = response.json()
            
            assert data["error"]["type"] == "api_error"
    
    def test_invalid_request_handling(self, test_appointment):
        """Test handling of invalid request errors"""
        with patch('stripe.PaymentIntent.create') as mock_create:
            mock_create.side_effect = stripe.error.InvalidRequestError(
                "Invalid request: missing required parameter",
                param="amount"
            )
            
            # When: Invalid request made
            response = client.post(
                f"/api/v1/payments/{test_appointment.id}/create-intent",
                json={}  # Missing amount
            )
            
            # Then: Validation error returned
            assert response.status_code == 400
            data = response.json()
            
            assert data["error"]["type"] == "invalid_request_error"
            assert "amount" in data["error"]["message"]


# Integration test utilities
def create_test_payment_method(card_number=None):
    """Create test payment method using Stripe test cards"""
    if card_number is None:
        card_number = TEST_CARDS["visa"]
    
    return stripe.PaymentMethod.create(
        type="card",
        card={
            "number": card_number,
            "exp_month": 12,
            "exp_year": 2025,
            "cvc": "123"
        }
    )

def simulate_webhook_event(event_type, data):
    """Simulate Stripe webhook event for testing"""
    return {
        "id": f"evt_test_{event_type}",
        "type": event_type,
        "created": int(datetime.now().timestamp()),
        "data": {"object": data},
        "livemode": False,
        "api_version": "2020-08-27"
    }

def assert_payment_recorded(appointment_id, expected_amount):
    """Assert that payment was properly recorded"""
    appointment = Appointment.get(appointment_id)
    assert appointment.payment_status == "paid"
    
    payment = Payment.filter(appointment_id=appointment_id).first()
    assert payment is not None
    assert payment.amount == expected_amount

def assert_payout_processed(barber_id, expected_amount):
    """Assert that payout was processed for barber"""
    payout = Payout.filter(barber_id=barber_id).order_by("-created_at").first()
    assert payout is not None
    assert payout.amount == expected_amount
    assert payout.status == "completed"


# Example usage in your test files:
"""
import pytest
from stripe_payment_test_scenarios import TestStripePaymentProcessing

class TestMyPaymentFeature(TestStripePaymentProcessing):
    def test_my_custom_payment_scenario(self):
        # Use the provided test utilities and patterns
        appointment = self.create_test_appointment()
        
        # Follow established testing patterns
        # ... your custom test implementation
"""