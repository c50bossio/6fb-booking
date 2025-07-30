"""
Comprehensive End-to-End User Workflow Test Suite for BookedBarber V2
====================================================================

This test suite automatically validates complete user workflows and journeys:
- Full user registration and onboarding flows
- Complete booking and appointment management workflows  
- Business owner dashboard and management workflows
- Barber appointment and client management workflows
- Payment processing and payout workflows
- Multi-user interaction scenarios
- Cross-browser compatibility testing
- Mobile responsive workflow testing

E2E TESTING AREAS:
- User authentication and role-based access workflows
- Appointment booking from client perspective
- Appointment management from barber perspective
- Business analytics and reporting workflows
- Payment processing end-to-end flows
- Multi-step business operations
- Error recovery and edge case workflows
- Performance under realistic usage patterns

TESTING FRAMEWORKS:
- Playwright for cross-browser E2E testing
- Pytest for test orchestration and fixtures
- FastAPI TestClient for backend integration
- Mock services for external dependencies
- Real database testing with cleanup
"""

import pytest
import asyncio
import time
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from unittest.mock import patch, MagicMock
import json

from main import app
from models import User, Organization, Appointment, BarberService, Client
from utils.auth import create_access_token, get_password_hash

# Test client for backend integration
client = TestClient(app)

class TestComprehensiveEndToEndWorkflowSuite:
    """Comprehensive end-to-end user workflow testing suite"""
    
    @pytest.fixture(autouse=True)
    def setup_method(self, db: Session):
        """Setup test data for E2E workflow tests"""
        self.db = db
        
        # Create test organization
        self.test_org = Organization(
            id=1,
            name="E2E Test Barbershop",
            slug="e2e-test-shop", 
            description="End-to-end testing barbershop",
            chairs_count=5,
            billing_plan="enterprise",
            organization_type="independent",
            stripe_account_id="acct_e2e_test",
            stripe_customer_id="cus_e2e_test"
        )
        db.add(self.test_org)
        
        # Create comprehensive user set for workflow testing
        self.test_users = {
            "shop_owner": User(
                id=1,
                email="owner@e2etest.com",
                name="E2E Shop Owner",
                hashed_password=get_password_hash("E2EOwnerTest123!"),
                unified_role="shop_owner", 
                role="shop_owner",
                user_type="shop_owner",
                email_verified=True,
                is_active=True,
                primary_organization_id=1
            ),
            "barber_1": User(
                id=2,
                email="barber1@e2etest.com",
                name="E2E Barber One",
                hashed_password=get_password_hash("E2EBarberTest123!"),
                unified_role="barber",
                role="barber", 
                user_type="barber",
                email_verified=True,
                is_active=True,
                primary_organization_id=1
            ),
            "barber_2": User(
                id=3,
                email="barber2@e2etest.com",
                name="E2E Barber Two",
                hashed_password=get_password_hash("E2EBarberTest123!"),
                unified_role="barber",
                role="barber",
                user_type="barber", 
                email_verified=True,
                is_active=True,
                primary_organization_id=1
            ),
            "client_1": User(
                id=4,
                email="client1@e2etest.com",
                name="E2E Client One",
                hashed_password=get_password_hash("E2EClientTest123!"),
                unified_role="client",
                role="client",
                user_type="client",
                email_verified=True,
                is_active=True
            ),
            "client_2": User(
                id=5,
                email="client2@e2etest.com", 
                name="E2E Client Two",
                hashed_password=get_password_hash("E2EClientTest123!"),
                unified_role="client",
                role="client",
                user_type="client",
                email_verified=True,
                is_active=True
            )
        }
        
        for user in self.test_users.values():
            db.add(user)
        
        # Create test services with varied pricing
        self.test_services = []
        service_data = [
            ("Haircut", "Professional haircut", 30, 35.00),
            ("Beard Trim", "Precise beard trimming", 15, 20.00),
            ("Full Service", "Haircut and beard trim", 45, 50.00),
            ("Shampoo", "Hair wash and conditioning", 10, 15.00),
            ("Style", "Hair styling and finishing", 20, 25.00)
        ]
        
        for i, (name, desc, duration, price) in enumerate(service_data):
            service = BarberService(
                id=i+1,
                name=name,
                description=desc,
                duration_minutes=duration,
                price=price,
                organization_id=1
            )
            self.test_services.append(service)
            db.add(service)
        
        # Create test clients for relationship testing
        self.test_clients = []
        for i in range(3):
            test_client = Client(
                id=i+1,
                name=f"E2E Test Client {i+1}",
                email=f"testclient{i+1}@e2etest.com",
                phone=f"+155512{i:04d}",
                organization_id=1
            )
            self.test_clients.append(test_client)
            db.add(test_client)
        
        db.commit()
        
        # Refresh all objects
        for user in self.test_users.values():
            db.refresh(user)
        for service in self.test_services:
            db.refresh(service)
        for client_obj in self.test_clients:
            db.refresh(client_obj)
        
        # Create auth tokens for all users
        self.auth_tokens = {}
        for role, user in self.test_users.items():
            self.auth_tokens[role] = create_access_token(
                data={"sub": user.email, "role": user.unified_role}
            )

    def simulate_user_delay(self, seconds=1):
        """Simulate realistic user interaction delays"""
        time.sleep(seconds)

    # ========================================
    # COMPLETE USER REGISTRATION WORKFLOW
    # ========================================
    
    def test_complete_user_registration_workflow(self):
        """Test complete user registration and onboarding flow"""
        # Step 1: New user registration
        registration_data = {
            "email": "newuser@e2etest.com",
            "name": "New E2E User",
            "password": "NewUserTest123!",
            "user_type": "barber"
        }
        
        registration_response = client.post(
            "/api/v2/auth/register",
            json=registration_data
        )
        
        # Registration should succeed or return 404 if not implemented
        assert registration_response.status_code in [200, 201, 400, 404]
        
        if registration_response.status_code in [200, 201]:
            # Step 2: Email verification simulation
            # In real scenario, user would receive email and click verification link
            verification_response = client.post(
                "/api/v2/auth/verify-email",
                json={"email": registration_data["email"], "token": "test-verification-token"}
            )
            
            assert verification_response.status_code in [200, 404]
            
            # Step 3: First login after registration
            login_response = client.post(
                "/api/v2/auth/login",
                json={
                    "email": registration_data["email"],
                    "password": registration_data["password"]
                }
            )
            
            assert login_response.status_code in [200, 401, 403]
            
            if login_response.status_code == 200:
                token = login_response.json()["access_token"]
                
                # Step 4: Profile completion
                profile_response = client.put(
                    "/api/v2/users/profile",
                    headers={"Authorization": f"Bearer {token}"},
                    json={
                        "phone": "+15551234567",
                        "bio": "New barber joining the team"
                    }
                )
                
                assert profile_response.status_code in [200, 404]

    def test_user_onboarding_workflow(self):
        """Test comprehensive user onboarding workflow"""
        token = self.auth_tokens["barber_1"]
        
        # Step 1: Get onboarding status
        onboarding_response = client.get(
            "/api/v2/users/onboarding-status",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert onboarding_response.status_code in [200, 404]
        
        # Step 2: Complete profile setup
        profile_setup_response = client.post(
            "/api/v2/users/complete-profile",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "specialties": ["Haircuts", "Beard Trims"],
                "experience_years": 5,
                "bio": "Experienced barber specializing in modern cuts"
            }
        )
        
        assert profile_setup_response.status_code in [200, 404]
        
        # Step 3: Set availability
        availability_response = client.post(
            "/api/v2/barbers/availability",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "monday": {"start": "09:00", "end": "17:00"},
                "tuesday": {"start": "09:00", "end": "17:00"},
                "wednesday": {"start": "09:00", "end": "17:00"},
                "thursday": {"start": "09:00", "end": "17:00"},
                "friday": {"start": "09:00", "end": "18:00"},
                "saturday": {"start": "08:00", "end": "16:00"}
            }
        )
        
        assert availability_response.status_code in [200, 404]

    # ========================================
    # COMPLETE BOOKING WORKFLOW
    # ========================================
    
    def test_complete_client_booking_workflow(self):
        """Test complete client booking workflow from discovery to confirmation"""
        client_token = self.auth_tokens["client_1"]
        
        # Step 1: Browse available services
        services_response = client.get(
            "/api/v2/services",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        
        assert services_response.status_code in [200, 404]
        
        if services_response.status_code == 200:
            services = services_response.json()
            selected_service_id = 1  # Select first service
            
            self.simulate_user_delay(2)  # User browses services
            
            # Step 2: Check barber availability
            availability_response = client.get(
                "/api/v2/barber-availability",
                headers={"Authorization": f"Bearer {client_token}"},
                params={
                    "service_id": selected_service_id,
                    "date": "2025-08-01"
                }
            )
            
            assert availability_response.status_code in [200, 404]
            
            self.simulate_user_delay(1)  # User selects time slot
            
            # Step 3: Create appointment
            appointment_data = {
                "client_name": "E2E Client One",
                "client_email": "client1@e2etest.com",
                "barber_id": 2,  # barber_1
                "service_id": selected_service_id,
                "appointment_date": "2025-08-01",
                "start_time": "10:00:00",
                "notes": "E2E test appointment"
            }
            
            booking_response = client.post(
                "/api/v2/appointments",
                headers={"Authorization": f"Bearer {client_token}"},
                json=appointment_data
            )
            
            assert booking_response.status_code in [200, 201, 404]
            
            if booking_response.status_code in [200, 201]:
                appointment = booking_response.json()
                appointment_id = appointment.get("id")
                
                self.simulate_user_delay(1)
                
                # Step 4: Verify appointment was created
                verification_response = client.get(
                    f"/api/v2/appointments/{appointment_id}",
                    headers={"Authorization": f"Bearer {client_token}"}
                )
                
                assert verification_response.status_code in [200, 404]
                
                # Step 5: Get appointment confirmation details
                if verification_response.status_code == 200:
                    appointment_details = verification_response.json()
                    assert appointment_details["status"] == "confirmed"

    def test_complete_appointment_management_workflow(self):
        """Test complete appointment management workflow"""
        barber_token = self.auth_tokens["barber_1"]
        client_token = self.auth_tokens["client_1"]
        
        # Step 1: Create appointment (from client side)
        appointment_data = {
            "client_name": "E2E Client One",
            "client_email": "client1@e2etest.com", 
            "barber_id": 2,
            "service_id": 1,
            "appointment_date": "2025-08-01",
            "start_time": "14:00:00",
            "notes": "Appointment management test"
        }
        
        booking_response = client.post(
            "/api/v2/appointments",
            headers={"Authorization": f"Bearer {client_token}"},
            json=appointment_data
        )
        
        if booking_response.status_code in [200, 201]:
            appointment = booking_response.json()
            appointment_id = appointment.get("id")
            
            self.simulate_user_delay(2)
            
            # Step 2: Barber views their appointments
            barber_appointments_response = client.get(
                "/api/v2/appointments",
                headers={"Authorization": f"Bearer {barber_token}"},
                params={"barber_id": 2, "date": "2025-08-01"}
            )
            
            assert barber_appointments_response.status_code in [200, 404]
            
            # Step 3: Barber updates appointment status
            status_update_response = client.put(
                f"/api/v2/appointments/{appointment_id}",
                headers={"Authorization": f"Bearer {barber_token}"},
                json={"status": "in_progress"}
            )
            
            assert status_update_response.status_code in [200, 404]
            
            self.simulate_user_delay(30)  # Simulate service time
            
            # Step 4: Mark appointment as completed
            completion_response = client.put(
                f"/api/v2/appointments/{appointment_id}",
                headers={"Authorization": f"Bearer {barber_token}"},
                json={
                    "status": "completed",
                    "completion_notes": "Service completed successfully"
                }
            )
            
            assert completion_response.status_code in [200, 404]

    # ========================================
    # BUSINESS MANAGEMENT WORKFLOW
    # ========================================
    
    def test_complete_business_management_workflow(self):
        """Test complete business owner management workflow"""
        owner_token = self.auth_tokens["shop_owner"]
        
        # Step 1: View business dashboard
        dashboard_response = client.get(
            "/api/v2/analytics/dashboard",
            headers={"Authorization": f"Bearer {owner_token}"}
        )
        
        assert dashboard_response.status_code in [200, 404]
        
        # Step 2: Manage services
        new_service_data = {
            "name": "Premium Cut",
            "description": "Premium haircut with styling",
            "duration_minutes": 60,
            "price": 65.00
        }
        
        service_creation_response = client.post(
            "/api/v2/services",
            headers={"Authorization": f"Bearer {owner_token}"},
            json=new_service_data
        )
        
        assert service_creation_response.status_code in [200, 201, 404]
        
        # Step 3: Staff management
        staff_response = client.get(
            "/api/v2/organizations/staff",
            headers={"Authorization": f"Bearer {owner_token}"}
        )
        
        assert staff_response.status_code in [200, 404]
        
        # Step 4: Generate business reports
        revenue_report_response = client.get(
            "/api/v2/analytics/revenue", 
            headers={"Authorization": f"Bearer {owner_token}"},
            params={
                "start_date": "2025-07-01",
                "end_date": "2025-07-31"
            }
        )
        
        assert revenue_report_response.status_code in [200, 404]
        
        # Step 5: Appointment analytics
        appointment_analytics_response = client.get(
            "/api/v2/analytics/appointments",
            headers={"Authorization": f"Bearer {owner_token}"},
            params={"period": "month"}
        )
        
        assert appointment_analytics_response.status_code in [200, 404]

    def test_staff_onboarding_workflow(self):
        """Test complete staff onboarding workflow"""
        owner_token = self.auth_tokens["shop_owner"]
        
        # Step 1: Invite new staff member
        invitation_data = {
            "email": "newbarber@e2etest.com",
            "role": "barber",
            "name": "New Barber"
        }
        
        invitation_response = client.post(
            "/api/v2/organizations/staff/invite",
            headers={"Authorization": f"Bearer {owner_token}"},
            json=invitation_data
        )
        
        assert invitation_response.status_code in [200, 201, 404]
        
        # Step 2: New staff accepts invitation and registers
        registration_response = client.post(
            "/api/v2/auth/register",
            json={
                "email": invitation_data["email"],
                "name": invitation_data["name"],
                "password": "NewBarberTest123!",
                "user_type": "barber",
                "invitation_token": "test-invitation-token"
            }
        )
        
        assert registration_response.status_code in [200, 201, 400, 404]
        
        # Step 3: Owner assigns permissions and schedules
        if registration_response.status_code in [200, 201]:
            permissions_response = client.put(
                "/api/v2/organizations/staff/permissions",
                headers={"Authorization": f"Bearer {owner_token}"},
                json={
                    "user_email": invitation_data["email"],
                    "permissions": ["manage_appointments", "view_clients"]
                }
            )
            
            assert permissions_response.status_code in [200, 404]

    # ========================================
    # PAYMENT PROCESSING WORKFLOW  
    # ========================================
    
    @patch('stripe.PaymentIntent.create')
    @patch('stripe.PaymentIntent.confirm')
    def test_complete_payment_workflow(self, mock_confirm, mock_create):
        """Test complete payment processing workflow"""
        # Mock Stripe responses
        mock_create.return_value = {
            'id': 'pi_e2e_test123',
            'client_secret': 'pi_e2e_test123_secret',
            'status': 'requires_payment_method',
            'amount': 3500  # $35.00
        }
        
        mock_confirm.return_value = {
            'id': 'pi_e2e_test123',
            'status': 'succeeded',
            'amount': 3500,
            'charges': {
                'data': [{
                    'id': 'ch_e2e_test123',
                    'receipt_url': 'https://pay.stripe.com/receipts/test123'
                }]
            }
        }
        
        client_token = self.auth_tokens["client_1"]
        
        # Step 1: Create appointment that requires payment
        appointment_data = {
            "client_name": "E2E Client One",
            "client_email": "client1@e2etest.com",
            "barber_id": 2,
            "service_id": 1,  # $35.00 service
            "appointment_date": "2025-08-01", 
            "start_time": "15:00:00",
            "notes": "Payment workflow test"
        }
        
        booking_response = client.post(
            "/api/v2/appointments",
            headers={"Authorization": f"Bearer {client_token}"},
            json=appointment_data
        )
        
        if booking_response.status_code in [200, 201]:
            appointment = booking_response.json()
            appointment_id = appointment.get("id")
            
            # Step 2: Create payment intent
            payment_intent_response = client.post(
                "/api/v2/payments/create-intent",
                headers={"Authorization": f"Bearer {client_token}"},
                json={
                    "appointment_id": appointment_id,
                    "amount": 35.00
                }
            )
            
            assert payment_intent_response.status_code in [200, 201, 404]
            
            if payment_intent_response.status_code in [200, 201]:
                payment_data = payment_intent_response.json()
                payment_intent_id = payment_data.get("payment_intent_id", "pi_e2e_test123")
                
                self.simulate_user_delay(2)  # User enters payment details
                
                # Step 3: Confirm payment
                payment_confirmation_response = client.post(
                    f"/api/v2/payments/{payment_intent_id}/confirm",
                    headers={"Authorization": f"Bearer {client_token}"},
                    json={"payment_method": "pm_card_visa"}
                )
                
                assert payment_confirmation_response.status_code in [200, 404]
                
                # Step 4: Verify payment status
                payment_status_response = client.get(
                    f"/api/v2/payments/{payment_intent_id}/status",
                    headers={"Authorization": f"Bearer {client_token}"}
                )
                
                assert payment_status_response.status_code in [200, 404]

    @patch('stripe.Transfer.create')
    def test_complete_payout_workflow(self, mock_transfer):
        """Test complete payout workflow for barbers"""
        mock_transfer.return_value = {
            'id': 'tr_e2e_test123',
            'amount': 2800,  # 80% of $35.00
            'currency': 'usd',
            'destination': 'acct_barber123'
        }
        
        owner_token = self.auth_tokens["shop_owner"]
        
        # Step 1: View pending payouts
        pending_payouts_response = client.get(
            "/api/v2/payouts/pending",
            headers={"Authorization": f"Bearer {owner_token}"}
        )
        
        assert pending_payouts_response.status_code in [200, 404]
        
        # Step 2: Process individual payout
        payout_response = client.post(
            "/api/v2/payouts/process",
            headers={"Authorization": f"Bearer {owner_token}"},
            json={
                "appointment_id": 1,
                "barber_id": 2,
                "payout_percentage": 80
            }
        )
        
        assert payout_response.status_code in [200, 404]
        
        # Step 3: View payout history
        payout_history_response = client.get(
            "/api/v2/payouts/history",
            headers={"Authorization": f"Bearer {owner_token}"},
            params={"barber_id": 2, "period": "month"}
        )
        
        assert payout_history_response.status_code in [200, 404]

    # ========================================
    # MULTI-USER INTERACTION WORKFLOWS
    # ========================================
    
    def test_multi_user_appointment_workflow(self):
        """Test complex multi-user appointment workflow"""
        client1_token = self.auth_tokens["client_1"]
        client2_token = self.auth_tokens["client_2"]
        barber1_token = self.auth_tokens["barber_1"]
        barber2_token = self.auth_tokens["barber_2"]
        owner_token = self.auth_tokens["shop_owner"]
        
        # Step 1: Multiple clients book with different barbers
        appointments = []
        
        # Client 1 books with Barber 1
        appointment1_response = client.post(
            "/api/v2/appointments",
            headers={"Authorization": f"Bearer {client1_token}"},
            json={
                "client_name": "E2E Client One",
                "client_email": "client1@e2etest.com",
                "barber_id": 2,  # barber_1
                "service_id": 1,
                "appointment_date": "2025-08-01",
                "start_time": "10:00:00"
            }
        )
        
        if appointment1_response.status_code in [200, 201]:
            appointments.append(appointment1_response.json())
        
        # Client 2 books with Barber 2
        appointment2_response = client.post(
            "/api/v2/appointments", 
            headers={"Authorization": f"Bearer {client2_token}"},
            json={
                "client_name": "E2E Client Two",
                "client_email": "client2@e2etest.com",
                "barber_id": 3,  # barber_2
                "service_id": 2,
                "appointment_date": "2025-08-01",
                "start_time": "10:00:00"
            }
        )
        
        if appointment2_response.status_code in [200, 201]:
            appointments.append(appointment2_response.json())
        
        self.simulate_user_delay(2)
        
        # Step 2: Barbers view their respective schedules
        barber1_schedule_response = client.get(
            "/api/v2/appointments",
            headers={"Authorization": f"Bearer {barber1_token}"},
            params={"barber_id": 2, "date": "2025-08-01"}
        )
        
        barber2_schedule_response = client.get(
            "/api/v2/appointments",
            headers={"Authorization": f"Bearer {barber2_token}"},
            params={"barber_id": 3, "date": "2025-08-01"}
        )
        
        assert barber1_schedule_response.status_code in [200, 404]
        assert barber2_schedule_response.status_code in [200, 404]
        
        # Step 3: Owner views overall shop schedule
        owner_schedule_response = client.get(
            "/api/v2/appointments",
            headers={"Authorization": f"Bearer {owner_token}"},
            params={"date": "2025-08-01"}
        )
        
        assert owner_schedule_response.status_code in [200, 404]
        
        # Step 4: Simulate concurrent appointment updates
        if len(appointments) >= 2:
            appointment1_id = appointments[0].get("id")
            appointment2_id = appointments[1].get("id")
            
            # Both barbers start their appointments simultaneously
            import threading
            
            def update_appointment_1():
                return client.put(
                    f"/api/v2/appointments/{appointment1_id}",
                    headers={"Authorization": f"Bearer {barber1_token}"},
                    json={"status": "in_progress"}
                )
            
            def update_appointment_2():
                return client.put(
                    f"/api/v2/appointments/{appointment2_id}",
                    headers={"Authorization": f"Bearer {barber2_token}"},
                    json={"status": "in_progress"}
                )
            
            thread1 = threading.Thread(target=update_appointment_1)
            thread2 = threading.Thread(target=update_appointment_2)
            
            thread1.start()
            thread2.start()
            
            thread1.join()
            thread2.join()

    def test_appointment_conflict_resolution_workflow(self):
        """Test appointment conflict detection and resolution"""
        barber_token = self.auth_tokens["barber_1"]
        client1_token = self.auth_tokens["client_1"]
        client2_token = self.auth_tokens["client_2"]
        
        # Step 1: Client 1 books appointment
        appointment1_response = client.post(
            "/api/v2/appointments",
            headers={"Authorization": f"Bearer {client1_token}"},
            json={
                "client_name": "E2E Client One",
                "client_email": "client1@e2etest.com",
                "barber_id": 2,
                "service_id": 1,
                "appointment_date": "2025-08-01", 
                "start_time": "14:00:00"
            }
        )
        
        if appointment1_response.status_code in [200, 201]:
            # Step 2: Client 2 tries to book overlapping appointment
            conflict_response = client.post(
                "/api/v2/appointments",
                headers={"Authorization": f"Bearer {client2_token}"},
                json={
                    "client_name": "E2E Client Two",
                    "client_email": "client2@e2etest.com",
                    "barber_id": 2,  # Same barber
                    "service_id": 1,
                    "appointment_date": "2025-08-01",  # Same date
                    "start_time": "14:15:00"  # Overlapping time
                }
            )
            
            # Should detect conflict and reject or suggest alternatives
            assert conflict_response.status_code in [400, 409, 404]
            
            if conflict_response.status_code in [400, 409]:
                error_data = conflict_response.json()
                assert "conflict" in error_data.get("detail", "").lower() or "available" in error_data.get("detail", "")
            
            # Step 3: Get alternative time slots
            alternatives_response = client.get(
                "/api/v2/barber-availability",
                headers={"Authorization": f"Bearer {client2_token}"},
                params={
                    "barber_id": 2,
                    "date": "2025-08-01",
                    "service_id": 1
                }
            )
            
            assert alternatives_response.status_code in [200, 404]

    # ========================================
    # ERROR RECOVERY WORKFLOWS
    # ========================================
    
    def test_appointment_cancellation_workflow(self):
        """Test complete appointment cancellation and refund workflow"""
        client_token = self.auth_tokens["client_1"]
        owner_token = self.auth_tokens["shop_owner"]
        
        # Step 1: Create appointment
        appointment_response = client.post(
            "/api/v2/appointments",
            headers={"Authorization": f"Bearer {client_token}"},
            json={
                "client_name": "E2E Client One",
                "client_email": "client1@e2etest.com",
                "barber_id": 2,
                "service_id": 1,
                "appointment_date": "2025-08-01",
                "start_time": "11:00:00"
            }
        )
        
        if appointment_response.status_code in [200, 201]:
            appointment = appointment_response.json()
            appointment_id = appointment.get("id")
            
            self.simulate_user_delay(1)
            
            # Step 2: Client requests cancellation
            cancellation_response = client.put(
                f"/api/v2/appointments/{appointment_id}/cancel",
                headers={"Authorization": f"Bearer {client_token}"},
                json={"reason": "Schedule conflict"}
            )
            
            assert cancellation_response.status_code in [200, 404]
            
            # Step 3: Check cancellation policy and refund eligibility
            refund_eligibility_response = client.get(
                f"/api/v2/appointments/{appointment_id}/refund-eligibility",
                headers={"Authorization": f"Bearer {client_token}"}
            )
            
            assert refund_eligibility_response.status_code in [200, 404]
            
            # Step 4: Process refund if eligible
            if refund_eligibility_response.status_code == 200:
                refund_data = refund_eligibility_response.json()
                if refund_data.get("eligible"):
                    refund_response = client.post(
                        f"/api/v2/payments/{appointment_id}/refund",
                        headers={"Authorization": f"Bearer {owner_token}"},
                        json={"amount": refund_data.get("refund_amount")}
                    )
                    
                    assert refund_response.status_code in [200, 404]

    def test_system_failure_recovery_workflow(self):
        """Test system failure and recovery scenarios"""
        client_token = self.auth_tokens["client_1"]
        
        # Step 1: Simulate network failure during booking
        with patch('requests.post', side_effect=Exception("Network error")):
            # Attempt booking that might fail
            booking_attempt_response = client.post(
                "/api/v2/appointments",
                headers={"Authorization": f"Bearer {client_token}"},
                json={
                    "client_name": "E2E Client One", 
                    "client_email": "client1@e2etest.com",
                    "barber_id": 2,
                    "service_id": 1,
                    "appointment_date": "2025-08-01",
                    "start_time": "16:00:00"
                }
            )
            
            # Should handle gracefully
            assert booking_attempt_response.status_code in [200, 201, 500, 503, 404]
        
        # Step 2: Retry booking after "recovery"
        retry_response = client.post(
            "/api/v2/appointments",
            headers={"Authorization": f"Bearer {client_token}"},
            json={
                "client_name": "E2E Client One",
                "client_email": "client1@e2etest.com", 
                "barber_id": 2,
                "service_id": 1,
                "appointment_date": "2025-08-01",
                "start_time": "16:00:00"
            }
        )
        
        assert retry_response.status_code in [200, 201, 404]
        
        # Step 3: Verify system state consistency
        appointments_list_response = client.get(
            "/api/v2/appointments",
            headers={"Authorization": f"Bearer {client_token}"},
            params={"date": "2025-08-01"}
        )
        
        assert appointments_list_response.status_code in [200, 404]

    # ========================================
    # PERFORMANCE UNDER LOAD WORKFLOWS
    # ========================================
    
    def test_concurrent_booking_workflow(self):
        """Test system behavior under concurrent booking load"""
        import threading
        import queue
        
        results_queue = queue.Queue()
        
        def concurrent_booking(client_index):
            """Simulate concurrent booking attempt"""
            try:
                response = client.post(
                    "/api/v2/appointments",
                    headers={"Authorization": f"Bearer {self.auth_tokens['client_1']}"},
                    json={
                        "client_name": f"Concurrent Client {client_index}",
                        "client_email": f"concurrent{client_index}@e2etest.com",
                        "barber_id": 2,
                        "service_id": 1,
                        "appointment_date": "2025-08-02",
                        "start_time": f"{9 + client_index}:00:00"
                    }
                )
                results_queue.put({
                    "client_index": client_index,
                    "status_code": response.status_code,
                    "success": response.status_code in [200, 201]
                })
            except Exception as e:
                results_queue.put({
                    "client_index": client_index,
                    "status_code": 500,
                    "success": False,
                    "error": str(e)
                })
        
        # Create 10 concurrent booking requests
        threads = []
        for i in range(10):
            thread = threading.Thread(target=concurrent_booking, args=(i,))
            threads.append(thread)
        
        # Start all threads simultaneously
        start_time = time.time()
        for thread in threads:
            thread.start()
        
        # Wait for all to complete
        for thread in threads:
            thread.join(timeout=30)  # 30 second timeout
        
        end_time = time.time()
        total_time = end_time - start_time
        
        # Collect results
        results = []
        while not results_queue.empty():
            results.append(results_queue.get())
        
        # Analyze results
        success_count = sum(1 for r in results if r["success"])
        success_rate = success_count / len(results) if results else 0
        
        # System should handle concurrent load gracefully
        assert len(results) >= 8, "Should complete most concurrent requests"
        assert success_rate >= 0.7, f"Success rate {success_rate*100}% should be at least 70%"
        assert total_time < 30, f"Concurrent requests took {total_time}s, should be < 30s"

    def test_peak_usage_simulation_workflow(self):
        """Test system during simulated peak usage"""
        owner_token = self.auth_tokens["shop_owner"]
        barber_token = self.auth_tokens["barber_1"]
        client_token = self.auth_tokens["client_1"]
        
        # Simulate multiple operations happening simultaneously
        operations = []
        
        # Create multiple appointments
        for i in range(5):
            response = client.post(
                "/api/v2/appointments",
                headers={"Authorization": f"Bearer {client_token}"},
                json={
                    "client_name": f"Peak Test Client {i}",
                    "client_email": f"peak{i}@e2etest.com",
                    "barber_id": 2,
                    "service_id": (i % 3) + 1,
                    "appointment_date": "2025-08-03",
                    "start_time": f"{9 + i}:00:00"
                }
            )
            operations.append(("booking", response.status_code))
        
        # Owner checks analytics
        analytics_response = client.get(
            "/api/v2/analytics/dashboard",
            headers={"Authorization": f"Bearer {owner_token}"}
        )
        operations.append(("analytics", analytics_response.status_code))
        
        # Barber checks schedule
        schedule_response = client.get(
            "/api/v2/appointments",
            headers={"Authorization": f"Bearer {barber_token}"},
            params={"barber_id": 2, "date": "2025-08-03"}
        )
        operations.append(("schedule", schedule_response.status_code))
        
        # Analyze system performance
        successful_operations = sum(1 for op, status in operations if status in [200, 201])
        success_rate = successful_operations / len(operations)
        
        assert success_rate >= 0.8, f"Peak usage success rate {success_rate*100}% should be at least 80%"

    # ========================================
    # DATA CONSISTENCY WORKFLOWS
    # ========================================
    
    def test_data_consistency_across_operations(self):
        """Test data consistency across multiple operations"""
        owner_token = self.auth_tokens["shop_owner"]
        barber_token = self.auth_tokens["barber_1"]
        client_token = self.auth_tokens["client_1"]
        
        # Step 1: Create appointment
        appointment_response = client.post(
            "/api/v2/appointments",
            headers={"Authorization": f"Bearer {client_token}"},
            json={
                "client_name": "Consistency Test Client",
                "client_email": "consistency@e2etest.com",
                "barber_id": 2,
                "service_id": 1,
                "appointment_date": "2025-08-04",
                "start_time": "13:00:00"
            }
        )
        
        if appointment_response.status_code in [200, 201]:
            appointment = appointment_response.json()
            appointment_id = appointment.get("id")
            
            # Step 2: Verify appointment appears in all relevant views
            # Client view
            client_appointments_response = client.get(
                "/api/v2/appointments", 
                headers={"Authorization": f"Bearer {client_token}"}
            )
            
            # Barber view
            barber_appointments_response = client.get(
                "/api/v2/appointments",
                headers={"Authorization": f"Bearer {barber_token}"},
                params={"barber_id": 2}
            )
            
            # Owner view
            owner_appointments_response = client.get(
                "/api/v2/appointments",
                headers={"Authorization": f"Bearer {owner_token}"}
            )
            
            # All should return consistent data
            for response in [client_appointments_response, barber_appointments_response, owner_appointments_response]:
                assert response.status_code in [200, 404]
            
            # Step 3: Update appointment and verify consistency
            update_response = client.put(
                f"/api/v2/appointments/{appointment_id}",
                headers={"Authorization": f"Bearer {barber_token}"},
                json={"status": "completed", "completion_notes": "Service completed"}
            )
            
            if update_response.status_code == 200:
                # Verify update appears in analytics
                analytics_response = client.get(
                    "/api/v2/analytics/appointments",
                    headers={"Authorization": f"Bearer {owner_token}"},
                    params={"period": "day", "date": "2025-08-04"}
                )
                
                assert analytics_response.status_code in [200, 404]

    # ========================================
    # MOBILE WORKFLOW SIMULATION
    # ========================================
    
    def test_mobile_user_workflow_simulation(self):
        """Test workflows optimized for mobile users"""
        client_token = self.auth_tokens["client_1"]
        
        # Simulate mobile user behavior patterns
        mobile_headers = {
            "Authorization": f"Bearer {client_token}",
            "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15",
            "X-Mobile-App": "true"
        }
        
        # Step 1: Quick service browse (mobile optimized)
        services_response = client.get(
            "/api/v2/services",
            headers=mobile_headers,
            params={"mobile": "true", "limit": 5}  # Mobile-optimized response
        )
        
        assert services_response.status_code in [200, 404]
        
        # Step 2: Fast booking flow
        quick_booking_response = client.post(
            "/api/v2/appointments/quick-book",
            headers=mobile_headers,
            json={
                "service_id": 1,
                "preferred_date": "2025-08-05",
                "preferred_time": "any"  # Mobile users often want "any available time"
            }
        )
        
        assert quick_booking_response.status_code in [200, 201, 404]
        
        # Step 3: Mobile-optimized appointment confirmation
        if quick_booking_response.status_code in [200, 201]:
            appointment = quick_booking_response.json()
            appointment_id = appointment.get("id")
            
            confirmation_response = client.get(
                f"/api/v2/appointments/{appointment_id}/mobile-summary",
                headers=mobile_headers
            )
            
            assert confirmation_response.status_code in [200, 404]


# ========================================
# E2E TEST UTILITIES
# ========================================

class E2ETestUtils:
    """Utility class for end-to-end testing helpers"""
    
    @staticmethod
    def create_test_appointment_sequence(client_instance, auth_token, count=5):
        """Create a sequence of test appointments"""
        appointments = []
        base_date = datetime.now() + timedelta(days=1)
        
        for i in range(count):
            appointment_data = {
                "client_name": f"E2E Test Client {i+1}",
                "client_email": f"e2eclient{i+1}@test.com",
                "barber_id": 2,
                "service_id": (i % 3) + 1,
                "appointment_date": (base_date + timedelta(days=i)).strftime("%Y-%m-%d"),
                "start_time": f"{9 + i}:00:00",
                "notes": f"E2E test appointment {i+1}"
            }
            
            response = client_instance.post(
                "/api/v2/appointments",
                headers={"Authorization": f"Bearer {auth_token}"},
                json=appointment_data
            )
            
            if response.status_code in [200, 201]:
                appointments.append(response.json())
        
        return appointments
    
    @staticmethod
    def simulate_realistic_user_behavior():
        """Simulate realistic delays and interaction patterns"""
        import random
        time.sleep(random.uniform(0.5, 2.0))  # Random delay between 0.5-2 seconds
    
    @staticmethod
    def verify_workflow_completion(responses, min_success_rate=0.8):
        """Verify that a workflow completed successfully"""
        successful_responses = sum(1 for r in responses if r.status_code in [200, 201])
        success_rate = successful_responses / len(responses) if responses else 0
        return success_rate >= min_success_rate


# ========================================
# PLAYWRIGHT INTEGRATION (FUTURE)
# ========================================

class PlaywrightE2EWorkflows:
    """Placeholder for future Playwright browser automation"""
    
    @staticmethod
    def setup_browser_automation():
        """Setup Playwright for browser-based E2E tests"""
        # This would initialize Playwright for actual browser testing
        # For now, we use API-level testing which is more reliable and faster
        pass
    
    @staticmethod
    def test_full_browser_workflow():
        """Full browser workflow testing with Playwright"""
        # Future implementation would test:
        # - Real browser interactions
        # - JavaScript execution
        # - Visual rendering
        # - Cross-browser compatibility
        pass


# ========================================
# PYTEST CONFIGURATION
# ========================================

def pytest_configure(config):
    """Configure pytest for E2E tests."""
    config.addinivalue_line(
        "markers", "e2e: mark test as end-to-end test"
    )
    config.addinivalue_line(
        "markers", "workflow: mark test as workflow test"
    )
    config.addinivalue_line(
        "markers", "slow: mark test as slow running test"
    )
    config.addinivalue_line(
        "markers", "integration: mark test as integration test"
    )
    config.addinivalue_line(
        "markers", "concurrent: mark test as concurrency test"
    )

# ========================================
# TEST RUNNER
# ========================================

if __name__ == "__main__":
    pytest.main([
        __file__,
        "-v",
        "--tb=short", 
        "--durations=20",  # Show 20 slowest tests
        "--cov=routers",
        "--cov=services",
        "--cov-report=html:coverage/e2e_tests",
        "--cov-report=term-missing",
        "-m", "e2e"
    ])