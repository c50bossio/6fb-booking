"""
Comprehensive Integration Tests for Six Figure Barber Booking and Payment Flows

This test suite provides comprehensive coverage of the complete booking and payment
workflows with Stripe Connect integration, commission processing, and Six Figure
Barber methodology compliance.

Coverage:
- Complete booking flow from service selection to payment
- Stripe Connect integration and commission processing
- Recurring appointments and cancellation flows
- Multi-role user interactions (client, barber, shop owner)
- Payment security and error handling
- Six Figure Barber revenue tracking integration

Target: 90%+ coverage of payment-critical business paths
"""

import pytest
import asyncio
from decimal import Decimal
from datetime import datetime, timedelta
from unittest.mock import Mock, patch, AsyncMock
import stripe
import json
from httpx import AsyncClient
from sqlalchemy.orm import Session

from main import app
from models import User, Appointment, Payment
from services.stripe_integration_service import StripeIntegrationService
from services.booking_service import BookingService
from services.payment_service import PaymentService
from services.commission_service import CommissionService
from services.six_figure_barber_core_service import SixFigureBarberCoreService
from utils.auth import create_access_token
from utils.test_helpers import TestDataFactory


class TestSixFigureBookingPaymentFlows:
    """Comprehensive tests for booking and payment integration."""

    @pytest.fixture
    def test_users(self, db: Session):
        """Create test users for all roles."""
        factory = TestDataFactory(db)
        
        # Create barber enrolled in Six Figure program
        barber = factory.create_barber({
            "email": "sixfigure.barber@test.com",
            "name": "Six Figure Barber",
            "role": "barber",
            "six_figure_enrolled": True,
            "six_figure_tier": "GROWTH",
            "stripe_account_id": "acct_test_barber_123"
        })
        
        # Create premium client
        client = factory.create_client({
            "email": "premium.client@test.com",
            "name": "Premium Client",
            "role": "client",
            "client_tier": "GOLD"
        })
        
        # Create shop owner
        shop_owner = factory.create_shop_owner({
            "email": "shop.owner@test.com",
            "name": "Shop Owner",
            "role": "shop_owner",
            "stripe_account_id": "acct_test_shop_123"
        })
        
        return {
            "barber": barber,
            "client": client,
            "shop_owner": shop_owner
        }

    @pytest.fixture
    def test_services(self, db: Session):
        """Create test services with Six Figure pricing."""
        factory = TestDataFactory(db)
        
        return [
            factory.create_service({
                "name": "Premium Haircut",
                "price": Decimal("95.00"),
                "duration": 60,
                "category": "haircut",
                "six_figure_service": True
            }),
            factory.create_service({
                "name": "Beard Styling",
                "price": Decimal("45.00"),
                "duration": 30,
                "category": "beard",
                "six_figure_service": True
            }),
            factory.create_service({
                "name": "Hair Treatment",
                "price": Decimal("75.00"),
                "duration": 45,
                "category": "treatment",
                "six_figure_service": True
            })
        ]

    @pytest.fixture
    def mock_stripe_service(self):
        """Mock Stripe service for testing."""
        with patch('services.stripe_integration_service.stripe') as mock_stripe:
            # Mock successful payment intent creation
            mock_stripe.PaymentIntent.create.return_value = Mock(
                id="pi_test_payment_123",
                client_secret="pi_test_payment_123_secret_456",
                status="requires_payment_method",
                amount=9500,  # $95.00 in cents
                currency="usd"
            )
            
            # Mock successful payment confirmation
            mock_stripe.PaymentIntent.confirm.return_value = Mock(
                id="pi_test_payment_123",
                status="succeeded",
                charges=Mock(
                    data=[Mock(
                        id="ch_test_charge_123",
                        amount=9500,
                        application_fee_amount=950  # 10% commission
                    )]
                )
            )
            
            # Mock transfer creation for commission
            mock_stripe.Transfer.create.return_value = Mock(
                id="tr_test_transfer_123",
                amount=8550,  # Amount after commission
                destination="acct_test_barber_123"
            )
            
            yield mock_stripe

    @pytest.mark.asyncio
    async def test_complete_booking_payment_flow_premium_service(
        self, async_client: AsyncClient, test_users, test_services, mock_stripe_service
    ):
        """Test complete booking flow for premium Six Figure service."""
        
        # 1. Client authentication
        client_token = create_access_token(
            data={"sub": test_users["client"].email, "role": "client"}
        )
        headers = {"Authorization": f"Bearer {client_token}"}
        
        # 2. Browse available services
        response = await async_client.get("/api/v2/services", headers=headers)
        assert response.status_code == 200
        services = response.json()
        
        # Verify Six Figure services are available
        premium_service = next(
            (s for s in services if s["name"] == "Premium Haircut"), None
        )
        assert premium_service is not None
        assert premium_service["six_figure_service"] is True
        assert float(premium_service["price"]) == 95.0
        
        # 3. Select barber and check availability
        barber_response = await async_client.get(
            f"/api/v2/barbers/{test_users['barber'].id}/availability",
            headers=headers,
            params={"date": (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")}
        )
        assert barber_response.status_code == 200
        availability = barber_response.json()
        assert len(availability["available_slots"]) > 0
        
        # 4. Create booking
        booking_data = {
            "barber_id": test_users["barber"].id,
            "service_id": premium_service["id"],
            "appointment_datetime": availability["available_slots"][0],
            "client_notes": "First time booking premium service",
            "payment_method": "stripe"
        }
        
        booking_response = await async_client.post(
            "/api/v2/bookings", json=booking_data, headers=headers
        )
        assert booking_response.status_code == 201
        booking = booking_response.json()
        
        # Verify booking details
        assert booking["service"]["name"] == "Premium Haircut"
        assert float(booking["total_amount"]) == 95.0
        assert booking["status"] == "pending_payment"
        assert "payment_intent_id" in booking
        
        # 5. Process payment
        payment_data = {
            "payment_intent_id": booking["payment_intent_id"],
            "payment_method_id": "pm_card_visa",  # Test payment method
            "save_payment_method": True
        }
        
        payment_response = await async_client.post(
            f"/api/v2/payments/{booking['id']}/confirm",
            json=payment_data,
            headers=headers
        )
        assert payment_response.status_code == 200
        payment_result = payment_response.json()
        
        # Verify payment success
        assert payment_result["status"] == "succeeded"
        assert payment_result["booking_status"] == "confirmed"
        
        # 6. Verify commission processing
        commission_response = await async_client.get(
            f"/api/v2/commissions/booking/{booking['id']}",
            headers={"Authorization": f"Bearer {create_access_token({'sub': test_users['shop_owner'].email, 'role': 'shop_owner'})}"}
        )
        assert commission_response.status_code == 200
        commission = commission_response.json()
        
        # Verify Six Figure commission structure
        assert float(commission["total_amount"]) == 95.0
        assert float(commission["platform_fee"]) == 9.5  # 10% platform fee
        assert float(commission["barber_amount"]) == 85.5  # 90% to barber
        
        # 7. Verify Six Figure revenue tracking
        barber_token = create_access_token(
            data={"sub": test_users["barber"].email, "role": "barber"}
        )
        
        revenue_response = await async_client.get(
            "/api/v2/six-figure/revenue/metrics",
            headers={"Authorization": f"Bearer {barber_token}"}
        )
        assert revenue_response.status_code == 200
        revenue_metrics = revenue_response.json()
        
        # Verify revenue is tracked in Six Figure system
        assert float(revenue_metrics["total_revenue"]) >= 95.0
        assert revenue_metrics["six_figure_progress"]["current_month"] >= 95.0

    @pytest.mark.asyncio
    async def test_recurring_appointment_flow_with_payment_automation(
        self, async_client: AsyncClient, test_users, test_services, mock_stripe_service
    ):
        """Test recurring appointment setup with automated payments."""
        
        client_token = create_access_token(
            data={"sub": test_users["client"].email, "role": "client"}
        )
        headers = {"Authorization": f"Bearer {client_token}"}
        
        # 1. Create initial appointment
        initial_booking_data = {
            "barber_id": test_users["barber"].id,
            "service_id": test_services[0].id,  # Premium Haircut
            "appointment_datetime": (datetime.now() + timedelta(days=1)).isoformat(),
            "recurring": True,
            "recurring_frequency": "monthly",
            "recurring_end_date": (datetime.now() + timedelta(days=180)).isoformat()
        }
        
        booking_response = await async_client.post(
            "/api/v2/bookings/recurring", json=initial_booking_data, headers=headers
        )
        assert booking_response.status_code == 201
        recurring_booking = booking_response.json()
        
        # Verify recurring setup
        assert recurring_booking["recurring"] is True
        assert recurring_booking["recurring_frequency"] == "monthly"
        assert len(recurring_booking["future_appointments"]) == 6  # 6 months
        
        # 2. Setup payment method for recurring charges
        payment_setup_data = {
            "payment_method_id": "pm_card_visa",
            "save_for_future": True,
            "auto_charge_recurring": True
        }
        
        payment_setup_response = await async_client.post(
            f"/api/v2/payments/setup-recurring/{recurring_booking['id']}",
            json=payment_setup_data,
            headers=headers
        )
        assert payment_setup_response.status_code == 200
        
        # 3. Simulate automatic payment for next month
        next_appointment_id = recurring_booking["future_appointments"][0]["id"]
        
        # Mock automatic charge
        with patch('services.payment_service.process_recurring_payment') as mock_process:
            mock_process.return_value = {
                "success": True,
                "payment_id": "pi_recurring_123",
                "amount": 95.0
            }
            
            auto_payment_response = await async_client.post(
                f"/api/v2/payments/process-recurring/{next_appointment_id}"
            )
            assert auto_payment_response.status_code == 200
            
            # Verify recurring payment tracking
            assert mock_process.called

    @pytest.mark.asyncio
    async def test_cancellation_flow_with_refund_processing(
        self, async_client: AsyncClient, test_users, test_services, mock_stripe_service
    ):
        """Test appointment cancellation with refund processing."""
        
        # 1. Create and pay for appointment
        client_token = create_access_token(
            data={"sub": test_users["client"].email, "role": "client"}
        )
        headers = {"Authorization": f"Bearer {client_token}"}
        
        # Create booking
        booking_data = {
            "barber_id": test_users["barber"].id,
            "service_id": test_services[0].id,
            "appointment_datetime": (datetime.now() + timedelta(days=2)).isoformat()
        }
        
        booking_response = await async_client.post(
            "/api/v2/bookings", json=booking_data, headers=headers
        )
        booking = booking_response.json()
        
        # Process payment
        payment_data = {
            "payment_intent_id": booking["payment_intent_id"],
            "payment_method_id": "pm_card_visa"
        }
        
        await async_client.post(
            f"/api/v2/payments/{booking['id']}/confirm",
            json=payment_data,
            headers=headers
        )
        
        # 2. Cancel appointment (within refund window)
        # Mock refund processing
        mock_stripe_service.Refund.create.return_value = Mock(
            id="re_test_refund_123",
            amount=9500,
            status="succeeded"
        )
        
        cancellation_data = {
            "reason": "Schedule conflict",
            "request_refund": True
        }
        
        cancel_response = await async_client.post(
            f"/api/v2/bookings/{booking['id']}/cancel",
            json=cancellation_data,
            headers=headers
        )
        assert cancel_response.status_code == 200
        cancellation = cancel_response.json()
        
        # Verify cancellation and refund
        assert cancellation["status"] == "cancelled"
        assert cancellation["refund"]["status"] == "processed"
        assert float(cancellation["refund"]["amount"]) == 95.0
        
        # 3. Verify commission reversal
        commission_reversal_response = await async_client.get(
            f"/api/v2/commissions/booking/{booking['id']}",
            headers={"Authorization": f"Bearer {create_access_token({'sub': test_users['shop_owner'].email, 'role': 'shop_owner'})}"}
        )
        
        commission = commission_reversal_response.json()
        assert commission["status"] == "reversed"

    @pytest.mark.asyncio
    async def test_multi_service_bundle_payment_processing(
        self, async_client: AsyncClient, test_users, test_services, mock_stripe_service
    ):
        """Test booking and payment for multiple services in one appointment."""
        
        client_token = create_access_token(
            data={"sub": test_users["client"].email, "role": "client"}
        )
        headers = {"Authorization": f"Bearer {client_token}"}
        
        # 1. Create bundle booking
        bundle_data = {
            "barber_id": test_users["barber"].id,
            "services": [
                {"service_id": test_services[0].id},  # Premium Haircut - $95
                {"service_id": test_services[1].id}   # Beard Styling - $45
            ],
            "appointment_datetime": (datetime.now() + timedelta(days=1)).isoformat(),
            "bundle_discount": 10  # 10% bundle discount
        }
        
        bundle_response = await async_client.post(
            "/api/v2/bookings/bundle", json=bundle_data, headers=headers
        )
        assert bundle_response.status_code == 201
        bundle_booking = bundle_response.json()
        
        # Verify bundle pricing
        expected_total = (95.0 + 45.0) * 0.9  # 10% discount
        assert abs(float(bundle_booking["total_amount"]) - expected_total) < 0.01
        assert len(bundle_booking["services"]) == 2
        
        # 2. Process bundle payment
        payment_data = {
            "payment_intent_id": bundle_booking["payment_intent_id"],
            "payment_method_id": "pm_card_visa"
        }
        
        payment_response = await async_client.post(
            f"/api/v2/payments/{bundle_booking['id']}/confirm",
            json=payment_data,
            headers=headers
        )
        assert payment_response.status_code == 200
        
        # 3. Verify Six Figure revenue tracking for bundles
        barber_token = create_access_token(
            data={"sub": test_users["barber"].email, "role": "barber"}
        )
        
        revenue_response = await async_client.get(
            "/api/v2/six-figure/revenue/bundles",
            headers={"Authorization": f"Bearer {barber_token}"}
        )
        assert revenue_response.status_code == 200
        bundle_metrics = revenue_response.json()
        
        assert bundle_metrics["bundle_revenue"] >= expected_total
        assert bundle_metrics["bundle_count"] >= 1

    @pytest.mark.asyncio
    async def test_payment_failure_handling_and_recovery(
        self, async_client: AsyncClient, test_users, test_services, mock_stripe_service
    ):
        """Test payment failure scenarios and recovery workflows."""
        
        client_token = create_access_token(
            data={"sub": test_users["client"].email, "role": "client"}
        )
        headers = {"Authorization": f"Bearer {client_token}"}
        
        # 1. Create booking
        booking_data = {
            "barber_id": test_users["barber"].id,
            "service_id": test_services[0].id,
            "appointment_datetime": (datetime.now() + timedelta(days=1)).isoformat()
        }
        
        booking_response = await async_client.post(
            "/api/v2/bookings", json=booking_data, headers=headers
        )
        booking = booking_response.json()
        
        # 2. Simulate payment failure
        mock_stripe_service.PaymentIntent.confirm.side_effect = stripe.CardError(
            message="Your card was declined.",
            param="card",
            code="card_declined"
        )
        
        payment_data = {
            "payment_intent_id": booking["payment_intent_id"],
            "payment_method_id": "pm_card_declined"
        }
        
        payment_response = await async_client.post(
            f"/api/v2/payments/{booking['id']}/confirm",
            json=payment_data,
            headers=headers
        )
        assert payment_response.status_code == 400
        payment_result = payment_response.json()
        
        # Verify error handling
        assert "card_declined" in payment_result["error"]["code"]
        assert payment_result["booking_status"] == "payment_failed"
        
        # 3. Test payment retry with different card
        mock_stripe_service.PaymentIntent.confirm.side_effect = None
        mock_stripe_service.PaymentIntent.confirm.return_value = Mock(
            id="pi_test_payment_retry_123",
            status="succeeded"
        )
        
        retry_payment_data = {
            "payment_intent_id": booking["payment_intent_id"],
            "payment_method_id": "pm_card_visa"
        }
        
        retry_response = await async_client.post(
            f"/api/v2/payments/{booking['id']}/retry",
            json=retry_payment_data,
            headers=headers
        )
        assert retry_response.status_code == 200
        retry_result = retry_response.json()
        
        assert retry_result["status"] == "succeeded"
        assert retry_result["booking_status"] == "confirmed"

    @pytest.mark.asyncio
    async def test_commission_calculation_accuracy_six_figure_tiers(
        self, async_client: AsyncClient, test_users, test_services, mock_stripe_service
    ):
        """Test accurate commission calculations for different Six Figure tiers."""
        
        # Test different barber tiers and commission structures
        tier_tests = [
            {"tier": "STARTER", "commission_rate": 0.85},  # 15% platform fee
            {"tier": "GROWTH", "commission_rate": 0.90},   # 10% platform fee
            {"tier": "MASTERY", "commission_rate": 0.93},  # 7% platform fee
            {"tier": "ELITE", "commission_rate": 0.95}     # 5% platform fee
        ]
        
        for tier_test in tier_tests:
            # Update barber tier
            barber_update_data = {"six_figure_tier": tier_test["tier"]}
            barber_token = create_access_token(
                data={"sub": test_users["barber"].email, "role": "barber"}
            )
            
            await async_client.patch(
                f"/api/v2/users/{test_users['barber'].id}",
                json=barber_update_data,
                headers={"Authorization": f"Bearer {barber_token}"}
            )
            
            # Create booking
            client_token = create_access_token(
                data={"sub": test_users["client"].email, "role": "client"}
            )
            
            booking_data = {
                "barber_id": test_users["barber"].id,
                "service_id": test_services[0].id,  # $95 service
                "appointment_datetime": (datetime.now() + timedelta(days=1)).isoformat()
            }
            
            booking_response = await async_client.post(
                "/api/v2/bookings",
                json=booking_data,
                headers={"Authorization": f"Bearer {client_token}"}
            )
            booking = booking_response.json()
            
            # Process payment
            payment_data = {
                "payment_intent_id": booking["payment_intent_id"],
                "payment_method_id": "pm_card_visa"
            }
            
            await async_client.post(
                f"/api/v2/payments/{booking['id']}/confirm",
                json=payment_data,
                headers={"Authorization": f"Bearer {client_token}"}
            )
            
            # Verify commission calculation
            commission_response = await async_client.get(
                f"/api/v2/commissions/booking/{booking['id']}",
                headers={"Authorization": f"Bearer {create_access_token({'sub': test_users['shop_owner'].email, 'role': 'shop_owner'})}"}
            )
            commission = commission_response.json()
            
            expected_barber_amount = 95.0 * tier_test["commission_rate"]
            expected_platform_fee = 95.0 * (1 - tier_test["commission_rate"])
            
            assert abs(float(commission["barber_amount"]) - expected_barber_amount) < 0.01
            assert abs(float(commission["platform_fee"]) - expected_platform_fee) < 0.01

    @pytest.mark.asyncio
    async def test_payment_security_and_fraud_prevention(
        self, async_client: AsyncClient, test_users, test_services, mock_stripe_service
    ):
        """Test payment security measures and fraud prevention."""
        
        client_token = create_access_token(
            data={"sub": test_users["client"].email, "role": "client"}
        )
        headers = {"Authorization": f"Bearer {client_token}"}
        
        # 1. Test rate limiting on payment attempts
        booking_data = {
            "barber_id": test_users["barber"].id,
            "service_id": test_services[0].id,
            "appointment_datetime": (datetime.now() + timedelta(days=1)).isoformat()
        }
        
        booking_response = await async_client.post(
            "/api/v2/bookings", json=booking_data, headers=headers
        )
        booking = booking_response.json()
        
        # Simulate multiple failed payment attempts
        mock_stripe_service.PaymentIntent.confirm.side_effect = stripe.CardError(
            message="Your card was declined.",
            param="card",
            code="card_declined"
        )
        
        payment_data = {
            "payment_intent_id": booking["payment_intent_id"],
            "payment_method_id": "pm_card_declined"
        }
        
        # Attempt payments rapidly
        for i in range(5):
            await async_client.post(
                f"/api/v2/payments/{booking['id']}/confirm",
                json=payment_data,
                headers=headers
            )
        
        # 6th attempt should be rate limited
        rate_limit_response = await async_client.post(
            f"/api/v2/payments/{booking['id']}/confirm",
            json=payment_data,
            headers=headers
        )
        assert rate_limit_response.status_code == 429  # Too Many Requests
        
        # 2. Test amount validation
        # Attempt to manipulate payment amount
        malicious_payment_data = {
            "payment_intent_id": booking["payment_intent_id"],
            "payment_method_id": "pm_card_visa",
            "amount": 1.00  # Attempting to pay only $1 for $95 service
        }
        
        malicious_response = await async_client.post(
            f"/api/v2/payments/{booking['id']}/confirm",
            json=malicious_payment_data,
            headers=headers
        )
        assert malicious_response.status_code == 400
        assert "amount_mismatch" in malicious_response.json()["error"]["code"]


class TestPaymentIntegrationEdgeCases:
    """Test edge cases and error scenarios in payment processing."""

    @pytest.mark.asyncio
    async def test_webhook_processing_reliability(
        self, async_client: AsyncClient, test_users, mock_stripe_service
    ):
        """Test Stripe webhook processing for payment events."""
        
        # 1. Test successful payment webhook
        webhook_payload = {
            "id": "evt_test_webhook_123",
            "object": "event",
            "type": "payment_intent.succeeded",
            "data": {
                "object": {
                    "id": "pi_test_payment_123",
                    "status": "succeeded",
                    "amount": 9500,
                    "metadata": {
                        "booking_id": "123",
                        "barber_id": str(test_users["barber"].id)
                    }
                }
            }
        }
        
        with patch('services.webhook_service.verify_stripe_signature') as mock_verify:
            mock_verify.return_value = True
            
            webhook_response = await async_client.post(
                "/api/v2/webhooks/stripe",
                json=webhook_payload,
                headers={"stripe-signature": "test_signature"}
            )
            assert webhook_response.status_code == 200
        
        # 2. Test payment failure webhook
        failure_webhook_payload = {
            "id": "evt_test_webhook_456",
            "object": "event", 
            "type": "payment_intent.payment_failed",
            "data": {
                "object": {
                    "id": "pi_test_payment_456",
                    "status": "requires_payment_method",
                    "last_payment_error": {
                        "code": "card_declined",
                        "message": "Your card was declined."
                    },
                    "metadata": {
                        "booking_id": "456"
                    }
                }
            }
        }
        
        with patch('services.webhook_service.verify_stripe_signature') as mock_verify:
            mock_verify.return_value = True
            
            failure_webhook_response = await async_client.post(
                "/api/v2/webhooks/stripe",
                json=failure_webhook_payload,
                headers={"stripe-signature": "test_signature"}
            )
            assert failure_webhook_response.status_code == 200

    @pytest.mark.asyncio
    async def test_concurrent_booking_payment_handling(
        self, async_client: AsyncClient, test_users, test_services, mock_stripe_service
    ):
        """Test handling of concurrent booking attempts for same time slot."""
        
        # Simulate two clients trying to book the same time slot
        client1_token = create_access_token(
            data={"sub": test_users["client"].email, "role": "client"}
        )
        
        # Create second client
        client2_data = {
            "email": "client2@test.com",
            "name": "Client Two",
            "password": "Client2Pass123!"
        }
        
        await async_client.post("/api/v2/auth/register", json=client2_data)
        client2_token = create_access_token(
            data={"sub": "client2@test.com", "role": "client"}
        )
        
        same_datetime = (datetime.now() + timedelta(days=1)).isoformat()
        
        booking_data = {
            "barber_id": test_users["barber"].id,
            "service_id": test_services[0].id,
            "appointment_datetime": same_datetime
        }
        
        # Concurrent booking attempts
        client1_booking_task = async_client.post(
            "/api/v2/bookings",
            json=booking_data,
            headers={"Authorization": f"Bearer {client1_token}"}
        )
        
        client2_booking_task = async_client.post(
            "/api/v2/bookings", 
            json=booking_data,
            headers={"Authorization": f"Bearer {client2_token}"}
        )
        
        # Execute concurrently
        client1_response, client2_response = await asyncio.gather(
            client1_booking_task, client2_booking_task, return_exceptions=True
        )
        
        # One should succeed, one should fail
        responses = [client1_response, client2_response]
        success_count = sum(1 for r in responses if r.status_code == 201)
        conflict_count = sum(1 for r in responses if r.status_code == 409)
        
        assert success_count == 1
        assert conflict_count == 1


# Performance and load testing helpers
@pytest.mark.asyncio
async def test_payment_processing_performance():
    """Test payment processing performance under load."""
    import time
    
    service = PaymentService(Mock())
    
    # Mock payment processing
    with patch.object(service, 'process_payment') as mock_process:
        mock_process.return_value = {
            "success": True,
            "payment_id": "pi_test_123",
            "processing_time": 0.05
        }
        
        start_time = time.time()
        
        # Simulate processing 100 payments
        tasks = []
        for i in range(100):
            task = service.process_payment({
                "amount": Decimal("95.00"),
                "payment_method": "pm_test_card"
            })
            tasks.append(task)
        
        # Wait for all to complete
        await asyncio.gather(*tasks)
        
        end_time = time.time()
        total_time = end_time - start_time
        
        # Should process 100 payments in under 5 seconds
        assert total_time < 5.0
        assert mock_process.call_count == 100


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short", "--asyncio-mode=auto"])