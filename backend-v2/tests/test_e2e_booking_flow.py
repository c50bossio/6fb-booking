"""
End-to-End Booking Flow Test.

Tests the complete user journey from service selection to payment completion,
including all integrations and business logic.

Tests cover:
- Complete user journey from selection to payment
- Multi-service booking scenarios
- Cancellation and rescheduling
- Error recovery flows
- Integration points (Stripe, Google Calendar, notifications)
"""

import pytest
import asyncio
from datetime import datetime, timedelta, timezone
from unittest.mock import Mock, patch

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from httpx import AsyncClient

from main import app
from tests.factories import (
    ServiceFactory, AppointmentFactory, create_full_test_scenario
)
from models import Appointment, Payment, BookingRule
from services.notification_service import NotificationService
from services.google_calendar_service import GoogleCalendarService


@pytest.fixture
def test_client():
    """Create test client for E2E testing."""
    return TestClient(app)


@pytest.fixture
async def async_test_client():
    """Create async test client for E2E testing."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client


@pytest.fixture
def mock_services():
    """Mock external services for E2E testing."""
    services = {
        'stripe': Mock(),
        'google_calendar': Mock(),
        'notification': Mock(),
        'sms': Mock(),
        'email': Mock()
    }
    
    # Configure Stripe mocks
    services['stripe'].PaymentIntent.create.return_value = Mock(
        id="pi_e2e_test_123",
        client_secret="pi_e2e_test_123_secret",
        amount=5000,
        currency="usd"
    )
    
    services['stripe'].PaymentIntent.retrieve.return_value = Mock(
        id="pi_e2e_test_123",
        status="succeeded"
    )
    
    # Configure Google Calendar mocks
    services['google_calendar'].sync_appointment_to_google.return_value = "event_123"
    services['google_calendar'].update_appointment_in_google.return_value = True
    services['google_calendar'].delete_appointment_from_google.return_value = True
    
    # Configure notification mocks
    services['notification'].send_appointment_confirmation.return_value = {"success": True}
    services['notification'].send_appointment_reminder.return_value = {"success": True}
    
    return services


@pytest.fixture
def full_booking_scenario(db: Session):
    """Create complete test scenario with all required data."""
    scenario = create_full_test_scenario(db)
    
    # Add additional services for multi-service testing
    beard_service = ServiceFactory.create_service(
        name="Beard Trim",
        base_price=25.0,
        duration_minutes=20,
        category="BEARD"
    )
    
    shampoo_service = ServiceFactory.create_service(
        name="Shampoo & Style",
        base_price=15.0,
        duration_minutes=15,
        category="STYLING"
    )
    
    db.add_all([beard_service, shampoo_service])
    db.commit()
    
    scenario['additional_services'] = [beard_service, shampoo_service]
    return scenario


class TestCompleteBookingFlow:
    """Test complete booking flow from start to finish."""
    
    def test_single_service_booking_flow(self, test_client, full_booking_scenario, mock_services, db):
        """Test complete single service booking flow."""
        barber = full_booking_scenario['barber']
        service = full_booking_scenario['service']
        
        with patch('services.payment_service.stripe', mock_services['stripe']):
            with patch.object(GoogleCalendarService, 'sync_appointment_to_google', mock_services['google_calendar'].sync_appointment_to_google):
                with patch.object(NotificationService, 'send_appointment_confirmation', mock_services['notification'].send_appointment_confirmation):
                    
                    # Step 1: Get available services
                    response = test_client.get("/api/v1/services")
                    assert response.status_code == 200
                    services_data = response.json()
                    assert len(services_data) >= 1
                    
                    # Step 2: Get available time slots
                    booking_date = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
                    response = test_client.get(
                        f"/api/v1/appointments/available-slots",
                        params={
                            "date": booking_date,
                            "service_id": service.id,
                            "barber_id": barber.id
                        }
                    )
                    assert response.status_code == 200
                    slots_data = response.json()
                    assert len(slots_data) > 0
                    
                    # Step 3: Create appointment
                    appointment_data = {
                        "service_id": service.id,
                        "barber_id": barber.id,
                        "date": booking_date,
                        "time": "14:00",
                        "client_first_name": "John",
                        "client_last_name": "Doe",
                        "client_email": "john@example.com",
                        "client_phone": "(555) 123-4567",
                        "notes": "First time customer"
                    }
                    
                    response = test_client.post("/api/v1/appointments", json=appointment_data)
                    assert response.status_code == 201
                    appointment_response = response.json()
                    appointment_id = appointment_response["id"]
                    
                    # Verify appointment created
                    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
                    assert appointment is not None
                    assert appointment.status == "pending"
                    assert appointment.service_id == service.id
                    
                    # Step 4: Create payment intent
                    payment_data = {
                        "booking_id": appointment_id,
                        "amount": float(service.base_price)
                    }
                    
                    response = test_client.post("/api/v1/payments/create-intent", json=payment_data)
                    assert response.status_code == 200
                    payment_response = response.json()
                    assert payment_response["payment_intent_id"] == "pi_e2e_test_123"
                    assert payment_response["amount"] == float(service.base_price)
                    
                    # Verify payment record created
                    payment = db.query(Payment).filter(Payment.appointment_id == appointment_id).first()
                    assert payment is not None
                    assert payment.status == "pending"
                    
                    # Step 5: Confirm payment
                    confirm_data = {
                        "payment_intent_id": "pi_e2e_test_123",
                        "booking_id": appointment_id
                    }
                    
                    response = test_client.post("/api/v1/payments/confirm", json=confirm_data)
                    assert response.status_code == 200
                    confirm_response = response.json()
                    assert confirm_response["success"] is True
                    
                    # Verify final state
                    db.refresh(appointment)
                    db.refresh(payment)
                    
                    assert appointment.status == "confirmed"
                    assert payment.status == "completed"
                    
                    # Verify integrations were called
                    mock_services['google_calendar'].sync_appointment_to_google.assert_called_once()
                    mock_services['notification'].send_appointment_confirmation.assert_called_once()
    
    def test_booking_flow_with_gift_certificate(self, test_client, full_booking_scenario, mock_services, db):
        """Test booking flow with gift certificate covering partial amount."""
        from models import GiftCertificate
        
        barber = full_booking_scenario['barber']
        service = full_booking_scenario['service']
        
        # Create gift certificate
        gift_cert = GiftCertificate(
            code="GIFT30",
            amount=50.0,
            balance=30.0,
            valid_until=datetime.now(timezone.utc) + timedelta(days=30),
            status="active"
        )
        db.add(gift_cert)
        db.commit()
        
        with patch('services.payment_service.stripe', mock_services['stripe']):
            # Create appointment
            booking_date = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
            appointment_data = {
                "service_id": service.id,
                "barber_id": barber.id,
                "date": booking_date,
                "time": "14:00",
                "client_first_name": "Jane",
                "client_last_name": "Smith",
                "client_email": "jane@example.com",
                "client_phone": "(555) 987-6543"
            }
            
            response = test_client.post("/api/v1/appointments", json=appointment_data)
            assert response.status_code == 201
            appointment_id = response.json()["id"]
            
            # Create payment intent with gift certificate
            payment_data = {
                "booking_id": appointment_id,
                "amount": float(service.base_price),
                "gift_certificate_code": "GIFT30"
            }
            
            # Mock reduced payment intent for remaining amount
            mock_services['stripe'].PaymentIntent.create.return_value = Mock(
                id="pi_partial_123",
                client_secret="pi_partial_123_secret",
                amount=1500,  # $45 - $30 = $15
                currency="usd"
            )
            
            response = test_client.post("/api/v1/payments/create-intent", json=payment_data)
            assert response.status_code == 200
            payment_response = response.json()
            
            assert payment_response["amount"] == 15.0  # $45 - $30
            assert payment_response["original_amount"] == float(service.base_price)
            assert payment_response["gift_certificate_used"] == 30.0
            
            # Verify gift certificate balance updated
            db.refresh(gift_cert)
            assert gift_cert.balance == 0.0  # Used $30 out of $30
            assert gift_cert.status == "used"
    
    def test_booking_flow_with_rule_violations(self, test_client, full_booking_scenario, db):
        """Test booking flow when booking rules are violated."""
        barber = full_booking_scenario['barber']
        service = full_booking_scenario['service']
        
        # Create booking rule that requires advance booking
        rule = BookingRule(
            rule_name="Minimum Advance Booking",
            rule_type="min_advance_booking",
            rule_params={"min_hours": 48},
            applies_to="all",
            is_active=True,
            priority=10
        )
        db.add(rule)
        db.commit()
        
        # Try to book for tomorrow (violates 48-hour rule)
        booking_date = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        appointment_data = {
            "service_id": service.id,
            "barber_id": barber.id,
            "date": booking_date,
            "time": "14:00",
            "client_first_name": "Bob",
            "client_last_name": "Wilson",
            "client_email": "bob@example.com",
            "client_phone": "(555) 111-2222"
        }
        
        response = test_client.post("/api/v1/appointments", json=appointment_data)
        assert response.status_code == 400
        error_response = response.json()
        assert "advance booking required" in error_response["detail"].lower()
    
    def test_booking_flow_with_calendar_conflict(self, test_client, full_booking_scenario, mock_services, db):
        """Test booking flow when calendar conflict exists."""
        barber = full_booking_scenario['barber']
        service = full_booking_scenario['service']
        
        # Create existing appointment at same time
        booking_datetime = datetime.now() + timedelta(days=7)
        existing_appointment = AppointmentFactory.create_appointment(
            user_id=barber.id,
            start_time=booking_datetime.replace(hour=14, minute=0),
            duration_minutes=60,
            status="confirmed"
        )
        db.add(existing_appointment)
        db.commit()
        
        # Try to book at conflicting time
        booking_date = booking_datetime.strftime("%Y-%m-%d")
        appointment_data = {
            "service_id": service.id,
            "barber_id": barber.id,
            "date": booking_date,
            "time": "14:00",
            "client_first_name": "Alice",
            "client_last_name": "Brown",
            "client_email": "alice@example.com",
            "client_phone": "(555) 333-4444"
        }
        
        response = test_client.post("/api/v1/appointments", json=appointment_data)
        assert response.status_code == 400
        error_response = response.json()
        assert "conflict" in error_response["detail"].lower()


class TestMultiServiceBookingFlow:
    """Test booking flows with multiple services."""
    
    def test_multi_service_booking_same_time(self, test_client, full_booking_scenario, mock_services, db):
        """Test booking multiple services at the same time."""
        barber = full_booking_scenario['barber']
        services = [full_booking_scenario['service']] + full_booking_scenario['additional_services']
        
        booking_date = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
        
        # Calculate total duration and price
        total_duration = sum(s.duration_minutes for s in services)
        total_price = sum(s.base_price for s in services)
        
        with patch('services.payment_service.stripe', mock_services['stripe']):
            # Create multi-service appointment
            appointment_data = {
                "service_ids": [s.id for s in services],
                "barber_id": barber.id,
                "date": booking_date,
                "time": "14:00",
                "client_first_name": "Multi",
                "client_last_name": "Service",
                "client_email": "multi@example.com",
                "client_phone": "(555) 777-8888"
            }
            
            response = test_client.post("/api/v1/appointments/multi-service", json=appointment_data)
            assert response.status_code == 201
            appointment_response = response.json()
            
            assert appointment_response["total_duration"] == total_duration
            assert appointment_response["total_price"] == float(total_price)
            assert len(appointment_response["services"]) == len(services)
    
    def test_sequential_service_booking(self, test_client, full_booking_scenario, mock_services, db):
        """Test booking services sequentially (back-to-back)."""
        barber = full_booking_scenario['barber']
        haircut_service = full_booking_scenario['service']
        beard_service = full_booking_scenario['additional_services'][0]
        
        booking_date = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
        
        with patch('services.payment_service.stripe', mock_services['stripe']):
            # Book first service
            first_appointment_data = {
                "service_id": haircut_service.id,
                "barber_id": barber.id,
                "date": booking_date,
                "time": "14:00",
                "client_first_name": "Sequential",
                "client_last_name": "Booking",
                "client_email": "sequential@example.com",
                "client_phone": "(555) 999-0000"
            }
            
            response = test_client.post("/api/v1/appointments", json=first_appointment_data)
            assert response.status_code == 201
            first_appointment_id = response.json()["id"]
            
            # Calculate next available time (after first service + buffer)
            first_appointment = db.query(Appointment).filter(Appointment.id == first_appointment_id).first()
            next_time = first_appointment.start_time + timedelta(minutes=haircut_service.duration_minutes + 10)
            
            # Book second service
            second_appointment_data = {
                "service_id": beard_service.id,
                "barber_id": barber.id,
                "date": booking_date,
                "time": next_time.strftime("%H:%M"),
                "client_first_name": "Sequential",
                "client_last_name": "Booking",
                "client_email": "sequential@example.com",
                "client_phone": "(555) 999-0000"
            }
            
            response = test_client.post("/api/v1/appointments", json=second_appointment_data)
            assert response.status_code == 201
            
            # Verify both appointments exist and are properly scheduled
            appointments = db.query(Appointment).filter(
                Appointment.client_email == "sequential@example.com"
            ).order_by(Appointment.start_time).all()
            
            assert len(appointments) == 2
            assert appointments[1].start_time > appointments[0].start_time


class TestBookingCancellationFlow:
    """Test booking cancellation and rescheduling flows."""
    
    def test_appointment_cancellation_flow(self, test_client, full_booking_scenario, mock_services, db):
        """Test complete appointment cancellation flow."""
        appointment = full_booking_scenario['appointment']
        
        # First complete the booking (payment)
        payment = PaymentFactory.create_payment(
            appointment_id=appointment.id,
            barber_id=appointment.barber_id,
            amount=appointment.price,
            status="completed"
        )
        db.add(payment)
        appointment.status = "confirmed"
        db.commit()
        
        with patch('services.payment_service.stripe', mock_services['stripe']):
            with patch.object(GoogleCalendarService, 'delete_appointment_from_google', mock_services['google_calendar'].delete_appointment_from_google):
                with patch.object(NotificationService, 'send_cancellation_notification', mock_services['notification'].send_appointment_confirmation):
                    
                    # Mock refund creation
                    mock_services['stripe'].Refund.create.return_value = Mock(
                        id="re_test_123",
                        amount=int(appointment.price * 100),
                        status="succeeded"
                    )
                    
                    # Cancel appointment
                    response = test_client.delete(f"/api/v1/appointments/{appointment.id}")
                    assert response.status_code == 200
                    
                    # Verify appointment cancelled
                    db.refresh(appointment)
                    assert appointment.status == "cancelled"
                    
                    # Verify refund processed
                    db.refresh(payment)
                    assert payment.status == "refunded"
                    
                    # Verify integrations called
                    mock_services['google_calendar'].delete_appointment_from_google.assert_called_once()
                    mock_services['notification'].send_appointment_confirmation.assert_called_once()
    
    def test_appointment_rescheduling_flow(self, test_client, full_booking_scenario, mock_services, db):
        """Test appointment rescheduling flow."""
        appointment = full_booking_scenario['appointment']
        appointment.status = "confirmed"
        db.commit()
        
        with patch.object(GoogleCalendarService, 'update_appointment_in_google', mock_services['google_calendar'].update_appointment_in_google):
            with patch.object(NotificationService, 'send_reschedule_notification', mock_services['notification'].send_appointment_confirmation):
                
                # Reschedule to new date/time
                new_date = (datetime.now() + timedelta(days=10)).strftime("%Y-%m-%d")
                reschedule_data = {
                    "date": new_date,
                    "time": "16:00"
                }
                
                response = test_client.put(f"/api/v1/appointments/{appointment.id}/reschedule", json=reschedule_data)
                assert response.status_code == 200
                
                # Verify appointment updated
                db.refresh(appointment)
                assert appointment.start_time.strftime("%Y-%m-%d") == new_date
                assert appointment.start_time.strftime("%H:%M") == "16:00"
                
                # Verify integrations called
                mock_services['google_calendar'].update_appointment_in_google.assert_called_once()
                mock_services['notification'].send_appointment_confirmation.assert_called_once()


class TestBookingErrorRecovery:
    """Test error recovery scenarios in booking flow."""
    
    def test_payment_failure_recovery(self, test_client, full_booking_scenario, mock_services, db):
        """Test recovery from payment failure."""
        barber = full_booking_scenario['barber']
        service = full_booking_scenario['service']
        
        # Create appointment
        booking_date = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
        appointment_data = {
            "service_id": service.id,
            "barber_id": barber.id,
            "date": booking_date,
            "time": "14:00",
            "client_first_name": "Payment",
            "client_last_name": "Failure",
            "client_email": "failure@example.com",
            "client_phone": "(555) 111-0000"
        }
        
        response = test_client.post("/api/v1/appointments", json=appointment_data)
        assert response.status_code == 201
        appointment_id = response.json()["id"]
        
        with patch('services.payment_service.stripe', mock_services['stripe']):
            # First payment attempt fails
            mock_services['stripe'].PaymentIntent.retrieve.return_value = Mock(
                id="pi_failed_123",
                status="failed"
            )
            
            payment_data = {
                "booking_id": appointment_id,
                "amount": float(service.base_price)
            }
            
            response = test_client.post("/api/v1/payments/create-intent", json=payment_data)
            assert response.status_code == 200
            
            # Confirm payment (should fail)
            confirm_data = {
                "payment_intent_id": "pi_failed_123",
                "booking_id": appointment_id
            }
            
            response = test_client.post("/api/v1/payments/confirm", json=confirm_data)
            assert response.status_code == 400
            
            # Appointment should still be pending
            appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
            assert appointment.status == "pending"
            
            # Retry payment with success
            mock_services['stripe'].PaymentIntent.create.return_value = Mock(
                id="pi_retry_123",
                client_secret="pi_retry_123_secret"
            )
            
            mock_services['stripe'].PaymentIntent.retrieve.return_value = Mock(
                id="pi_retry_123",
                status="succeeded"
            )
            
            response = test_client.post("/api/v1/payments/create-intent", json=payment_data)
            assert response.status_code == 200
            
            confirm_data["payment_intent_id"] = "pi_retry_123"
            response = test_client.post("/api/v1/payments/confirm", json=confirm_data)
            assert response.status_code == 200
            
            # Verify appointment confirmed
            db.refresh(appointment)
            assert appointment.status == "confirmed"
    
    def test_calendar_sync_failure_recovery(self, test_client, full_booking_scenario, db):
        """Test recovery when calendar sync fails."""
        barber = full_booking_scenario['barber']
        service = full_booking_scenario['service']
        
        # Mock calendar sync failure
        with patch.object(GoogleCalendarService, 'sync_appointment_to_google', side_effect=Exception("Calendar API error")):
            booking_date = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
            appointment_data = {
                "service_id": service.id,
                "barber_id": barber.id,
                "date": booking_date,
                "time": "14:00",
                "client_first_name": "Calendar",
                "client_last_name": "Fail",
                "client_email": "calendar@example.com",
                "client_phone": "(555) 222-0000"
            }
            
            response = test_client.post("/api/v1/appointments", json=appointment_data)
            
            # Appointment should still be created despite calendar sync failure
            assert response.status_code == 201
            appointment_id = response.json()["id"]
            
            appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
            assert appointment is not None
            assert appointment.status == "pending"
            
            # Should have error flag for manual sync later
            assert hasattr(appointment, 'sync_errors') or 'calendar' in appointment.notes.lower()
    
    def test_notification_failure_graceful_degradation(self, test_client, full_booking_scenario, mock_services, db):
        """Test graceful degradation when notification service fails."""
        appointment = full_booking_scenario['appointment']
        
        # Mock notification failure
        with patch.object(NotificationService, 'send_appointment_confirmation', side_effect=Exception("Email service down")):
            with patch('services.payment_service.stripe', mock_services['stripe']):
                
                payment_data = {
                    "booking_id": appointment.id,
                    "amount": float(appointment.price)
                }
                
                response = test_client.post("/api/v1/payments/create-intent", json=payment_data)
                assert response.status_code == 200
                
                confirm_data = {
                    "payment_intent_id": "pi_e2e_test_123",
                    "booking_id": appointment.id
                }
                
                response = test_client.post("/api/v1/payments/confirm", json=confirm_data)
                
                # Payment should succeed despite notification failure
                assert response.status_code == 200
                
                # Appointment should be confirmed
                db.refresh(appointment)
                assert appointment.status == "confirmed"
                
                # Should log notification failure for retry
                payment = db.query(Payment).filter(Payment.appointment_id == appointment.id).first()
                assert payment.status == "completed"


class TestBookingFlowPerformance:
    """Test performance aspects of booking flow."""
    
    @pytest.mark.asyncio
    async def test_concurrent_booking_attempts(self, async_test_client, full_booking_scenario, mock_services, db):
        """Test handling of concurrent booking attempts for same time slot."""
        barber = full_booking_scenario['barber']
        service = full_booking_scenario['service']
        
        booking_date = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
        
        # Create multiple concurrent booking requests
        booking_data = {
            "service_id": service.id,
            "barber_id": barber.id,
            "date": booking_date,
            "time": "14:00",
            "client_first_name": "Concurrent",
            "client_last_name": "User",
            "client_phone": "(555) 000-0000"
        }
        
        tasks = []
        for i in range(5):
            data = booking_data.copy()
            data["client_email"] = f"concurrent{i}@example.com"
            
            task = async_test_client.post("/api/v1/appointments", json=data)
            tasks.append(task)
        
        # Execute all requests concurrently
        responses = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Only one should succeed, others should fail with conflict
        successful_responses = [r for r in responses if hasattr(r, 'status_code') and r.status_code == 201]
        failed_responses = [r for r in responses if hasattr(r, 'status_code') and r.status_code == 400]
        
        assert len(successful_responses) == 1
        assert len(failed_responses) == 4
        
        # Verify only one appointment was created
        appointments = db.query(Appointment).filter(
            Appointment.start_time == datetime.strptime(f"{booking_date} 14:00", "%Y-%m-%d %H:%M")
        ).all()
        assert len(appointments) == 1
    
    def test_booking_flow_response_times(self, test_client, full_booking_scenario, mock_services, db):
        """Test that booking flow completes within acceptable time limits."""
        import time
        
        barber = full_booking_scenario['barber']
        service = full_booking_scenario['service']
        
        booking_date = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
        
        with patch('services.payment_service.stripe', mock_services['stripe']):
            # Time the complete booking flow
            start_time = time.time()
            
            # Create appointment
            appointment_data = {
                "service_id": service.id,
                "barber_id": barber.id,
                "date": booking_date,
                "time": "14:00",
                "client_first_name": "Speed",
                "client_last_name": "Test",
                "client_email": "speed@example.com",
                "client_phone": "(555) 123-4567"
            }
            
            response = test_client.post("/api/v1/appointments", json=appointment_data)
            assert response.status_code == 201
            appointment_id = response.json()["id"]
            
            # Create payment intent
            payment_data = {
                "booking_id": appointment_id,
                "amount": float(service.base_price)
            }
            
            response = test_client.post("/api/v1/payments/create-intent", json=payment_data)
            assert response.status_code == 200
            
            # Confirm payment
            confirm_data = {
                "payment_intent_id": "pi_e2e_test_123",
                "booking_id": appointment_id
            }
            
            response = test_client.post("/api/v1/payments/confirm", json=confirm_data)
            assert response.status_code == 200
            
            end_time = time.time()
            total_time = end_time - start_time
            
            # Complete flow should take less than 5 seconds
            assert total_time < 5.0, f"Booking flow took {total_time:.2f} seconds, which exceeds 5 second limit"


if __name__ == "__main__":
    pytest.main([__file__])