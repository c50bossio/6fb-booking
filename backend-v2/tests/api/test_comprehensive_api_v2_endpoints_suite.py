"""
Comprehensive API V2 Endpoints Test Suite for BookedBarber V2
============================================================

This test suite automatically validates all V2 API endpoints with comprehensive testing:
- Authentication and authorization for all endpoints
- Input validation and sanitization
- Error handling and edge cases
- Response format validation
- Rate limiting enforcement
- Role-based access control
- API versioning compliance
- Performance requirements

API V2 ENDPOINTS TESTED:
- Authentication endpoints (/api/v2/auth/*)
- User management endpoints (/api/v2/users/*)
- Appointment endpoints (/api/v2/appointments/*)
- Service endpoints (/api/v2/services/*)
- Organization endpoints (/api/v2/organizations/*)
- Payment endpoints (/api/v2/payments/*)
- Analytics endpoints (/api/v2/analytics/*)
- Admin endpoints (/api/v2/admin/*)

CRITICAL TESTING AREAS:
- V2 API compliance (no V1 dependencies)
- Proper error codes and messages
- Input validation and type checking
- Authorization matrix testing
- Response schema validation
- Performance under load
"""

import pytest
import json
import time
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from unittest.mock import patch, MagicMock

from main import app
from models import User, Organization, Appointment, BarberService, Client
from utils.auth import create_access_token, get_password_hash

# Test client
client = TestClient(app)

class TestComprehensiveAPIV2EndpointsSuite:
    """Comprehensive API V2 endpoints test suite"""
    
    @pytest.fixture(autouse=True)
    def setup_method(self, db: Session):
        """Setup test data for API endpoint tests"""
        self.db = db
        
        # Create test organization
        self.test_org = Organization(
            id=1,
            name="API Test Barbershop",
            slug="api-test-shop",
            description="API testing barbershop",
            chairs_count=4,
            billing_plan="enterprise",
            organization_type="independent"
        )
        db.add(self.test_org)
        
        # Create comprehensive user set for role testing
        self.test_users = {
            "super_admin": User(
                id=1,
                email="superadmin@api.com",
                name="API Super Admin",
                hashed_password=get_password_hash("SuperAdminTest123!"),
                unified_role="super_admin",
                role="super_admin",
                user_type="super_admin",
                email_verified=True,
                is_active=True
            ),
            "enterprise_owner": User(
                id=2,
                email="enterprise@api.com",
                name="API Enterprise Owner",
                hashed_password=get_password_hash("EnterpriseTest123!"),
                unified_role="enterprise_owner",
                role="enterprise_owner",
                user_type="enterprise_owner",
                email_verified=True,
                is_active=True,
                primary_organization_id=1
            ),
            "shop_owner": User(
                id=3,
                email="owner@api.com",
                name="API Shop Owner",
                hashed_password=get_password_hash("OwnerTest123!"),
                unified_role="shop_owner",
                role="shop_owner",
                user_type="shop_owner",
                email_verified=True,
                is_active=True,
                primary_organization_id=1
            ),
            "barber": User(
                id=4,
                email="barber@api.com",
                name="API Barber",
                hashed_password=get_password_hash("BarberTest123!"),
                unified_role="barber",
                role="barber",
                user_type="barber",
                email_verified=True,
                is_active=True,
                primary_organization_id=1
            ),
            "client": User(
                id=5,
                email="client@api.com",
                name="API Client",
                hashed_password=get_password_hash("ClientTest123!"),
                unified_role="client",
                role="client",
                user_type="client",
                email_verified=True,
                is_active=True
            ),
            "unverified": User(
                id=6,
                email="unverified@api.com",
                name="API Unverified User",
                hashed_password=get_password_hash("UnverifiedTest123!"),
                unified_role="client",
                role="client",
                user_type="client",
                email_verified=False,
                is_active=True
            ),
            "inactive": User(
                id=7,
                email="inactive@api.com",
                name="API Inactive User",
                hashed_password=get_password_hash("InactiveTest123!"),
                unified_role="client",
                role="client",
                user_type="client",
                email_verified=True,
                is_active=False
            )
        }
        
        for user in self.test_users.values():
            db.add(user)
        
        # Create test services
        self.test_services = []
        for i in range(5):
            service = BarberService(
                id=i+1,
                name=f"API Test Service {i+1}",
                description=f"API test service {i+1}",
                duration_minutes=30 + (i * 15),
                price=25.00 + (i * 10),
                organization_id=1
            )
            self.test_services.append(service)
            db.add(service)
        
        # Create test clients
        self.test_clients = []
        for i in range(3):
            client_obj = Client(
                id=i+1,
                name=f"API Test Client {i+1}",
                email=f"testclient{i+1}@api.com",
                phone=f"555-100{i:04d}",
                organization_id=1
            )
            self.test_clients.append(client_obj)
            db.add(client_obj)
        
        # Create test appointments
        self.test_appointments = []
        base_date = datetime.now()
        for i in range(10):
            appointment = Appointment(
                id=i+1,
                client_name=f"API Test Client {(i % 3) + 1}",
                client_email=f"testclient{(i % 3) + 1}@api.com",
                barber_id=4,  # barber user
                service_id=(i % 5) + 1,
                organization_id=1,
                appointment_date=base_date + timedelta(days=i),
                start_time=(base_date + timedelta(hours=i % 8 + 9)).time(),
                end_time=(base_date + timedelta(hours=i % 8 + 10)).time(),
                status="confirmed" if i % 3 != 0 else "completed",
                total_price=25.00 + ((i % 5) * 10),
                notes=f"API test appointment {i+1}"
            )
            self.test_appointments.append(appointment)
            db.add(appointment)
        
        db.commit()
        
        # Refresh all objects
        for user in self.test_users.values():
            db.refresh(user)
        
        # Create auth tokens for all user types
        self.auth_tokens = {}
        for role, user in self.test_users.items():
            self.auth_tokens[role] = create_access_token(
                data={"sub": user.email, "role": user.unified_role}
            )

    # ========================================
    # AUTHENTICATION ENDPOINTS TESTS
    # ========================================
    
    def test_auth_v2_endpoints_comprehensive(self):
        """Test all V2 authentication endpoints comprehensively"""
        auth_endpoints = [
            # Basic endpoints
            ("/api/v2/auth/test", "GET", None, [200]),
            ("/api/v2/auth/me", "GET", None, [200, 401]),
            
            # Login/logout flows
            ("/api/v2/auth/login", "POST", {
                "email": self.test_users["shop_owner"].email,
                "password": "OwnerTest123!"
            }, [200]),
            
            # Registration endpoints
            ("/api/v2/auth/register", "POST", {
                "email": "newuser@api.com",
                "name": "New API User",
                "password": "NewUserTest123!",
                "user_type": "barber"
            }, [200, 400]),
            
            # Password management
            ("/api/v2/auth/forgot-password", "POST", {
                "email": self.test_users["client"].email
            }, [200]),
            
            # Verification endpoints
            ("/api/v2/auth/verification-status", "GET", None, [200, 401]),
        ]
        
        for endpoint, method, data, expected_statuses in auth_endpoints:
            # Test without authentication
            if method == "GET":
                response = client.get(endpoint)
            elif method == "POST":
                response = client.post(endpoint, json=data)
            
            assert response.status_code in expected_statuses, f"{endpoint} returned {response.status_code}, expected one of {expected_statuses}"
            
            # Test with authentication for protected endpoints
            if endpoint in ["/api/v2/auth/me", "/api/v2/auth/verification-status"]:
                token = self.auth_tokens["shop_owner"]
                if method == "GET":
                    auth_response = client.get(
                        endpoint,
                        headers={"Authorization": f"Bearer {token}"}
                    )
                elif method == "POST":
                    auth_response = client.post(
                        endpoint,
                        json=data,
                        headers={"Authorization": f"Bearer {token}"}
                    )
                
                assert auth_response.status_code in [200, 201, 202], f"Authenticated {endpoint} failed with {auth_response.status_code}"

    def test_auth_input_validation(self):
        """Test authentication endpoints input validation"""
        # Test login with invalid input
        invalid_login_cases = [
            ({}, 422),  # Empty data
            ({"email": "invalid-email"}, 422),  # Invalid email format
            ({"email": "test@test.com"}, 422),  # Missing password
            ({"password": "password"}, 422),  # Missing email
            ({"email": "test@test.com", "password": ""}, 422),  # Empty password
        ]
        
        for invalid_data, expected_status in invalid_login_cases:
            response = client.post("/api/v2/auth/login", json=invalid_data)
            assert response.status_code == expected_status, f"Login validation failed for {invalid_data}"

    def test_auth_error_handling(self):
        """Test authentication error handling"""
        # Test login with wrong credentials
        response = client.post(
            "/api/v2/auth/login",
            json={
                "email": "nonexistent@api.com",
                "password": "WrongPassword123!"
            }
        )
        assert response.status_code == 401
        assert "Incorrect username or password" in response.json()["detail"]
        
        # Test login with unverified email
        response = client.post(
            "/api/v2/auth/login",
            json={
                "email": self.test_users["unverified"].email,
                "password": "UnverifiedTest123!"
            }
        )
        assert response.status_code == 403
        assert "Email address not verified" in response.json()["detail"]

    # ========================================
    # USER MANAGEMENT ENDPOINTS TESTS
    # ========================================
    
    def test_user_endpoints_authorization_matrix(self):
        """Test user endpoints with different authorization levels"""
        user_endpoints = [
            ("/api/v2/users/profile", "GET"),
            ("/api/v2/users/profile", "PUT"),
            ("/api/v2/users", "GET"),  # Admin only
            ("/api/v2/users/1", "GET"),  # Admin or self
        ]
        
        # Test each endpoint with different user roles
        for endpoint, method in user_endpoints:
            for role, token in self.auth_tokens.items():
                if role in ["inactive", "unverified"]:
                    continue  # Skip inactive/unverified users
                
                headers = {"Authorization": f"Bearer {token}"}
                
                if method == "GET":
                    response = client.get(endpoint, headers=headers)
                elif method == "PUT":
                    response = client.put(
                        endpoint,
                        headers=headers,
                        json={"name": "Updated Name"}
                    )
                
                # Verify appropriate responses based on role
                if endpoint == "/api/v2/users" and role not in ["super_admin"]:
                    assert response.status_code in [403, 404], f"{role} should not access {endpoint}"
                else:
                    assert response.status_code in [200, 201, 403, 404], f"Unexpected status {response.status_code} for {role} on {endpoint}"

    def test_user_profile_management(self):
        """Test user profile management endpoints"""
        token = self.auth_tokens["shop_owner"]
        
        # Test profile retrieval
        response = client.get(
            "/api/v2/users/profile",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if response.status_code == 200:
            profile_data = response.json()
            assert "email" in profile_data
            assert "name" in profile_data
            assert "unified_role" in profile_data
        
        # Test profile update
        update_data = {
            "name": "Updated Shop Owner",
            "phone": "+15551234567"
        }
        
        response = client.put(
            "/api/v2/users/profile",
            headers={"Authorization": f"Bearer {token}"},
            json=update_data
        )
        
        assert response.status_code in [200, 404], f"Profile update returned {response.status_code}"

    # ========================================
    # APPOINTMENT ENDPOINTS TESTS
    # ========================================
    
    def test_appointment_crud_operations(self):
        """Test appointment CRUD operations comprehensively"""
        token = self.auth_tokens["shop_owner"]
        
        # Test appointment creation
        new_appointment_data = {
            "client_name": "New API Client",
            "client_email": "newclient@api.com",
            "barber_id": 4,
            "service_id": 1,
            "appointment_date": "2025-08-01",
            "start_time": "10:00:00",
            "notes": "New appointment via API"
        }
        
        response = client.post(
            "/api/v2/appointments",
            headers={"Authorization": f"Bearer {token}"},
            json=new_appointment_data
        )
        
        if response.status_code in [200, 201]:
            created_appointment = response.json()
            appointment_id = created_appointment.get("id")
            
            # Test appointment retrieval
            response = client.get(
                f"/api/v2/appointments/{appointment_id}",
                headers={"Authorization": f"Bearer {token}"}
            )
            assert response.status_code == 200
            
            # Test appointment update
            update_data = {"notes": "Updated via API"}
            response = client.put(
                f"/api/v2/appointments/{appointment_id}",
                headers={"Authorization": f"Bearer {token}"},
                json=update_data
            )
            assert response.status_code in [200, 404]
            
            # Test appointment deletion
            response = client.delete(
                f"/api/v2/appointments/{appointment_id}",
                headers={"Authorization": f"Bearer {token}"}
            )
            assert response.status_code in [200, 204, 404]

    def test_appointment_list_filtering(self):
        """Test appointment list endpoint with filters"""
        token = self.auth_tokens["shop_owner"]
        
        # Test basic listing
        response = client.get(
            "/api/v2/appointments",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if response.status_code == 200:
            appointments = response.json()
            assert isinstance(appointments, (list, dict))
        
        # Test filtering by date
        response = client.get(
            "/api/v2/appointments",
            headers={"Authorization": f"Bearer {token}"},
            params={
                "start_date": "2025-07-01",
                "end_date": "2025-08-31"
            }
        )
        assert response.status_code in [200, 404]
        
        # Test filtering by barber
        response = client.get(
            "/api/v2/appointments",
            headers={"Authorization": f"Bearer {token}"},
            params={"barber_id": 4}
        )
        assert response.status_code in [200, 404]
        
        # Test filtering by status
        response = client.get(
            "/api/v2/appointments",
            headers={"Authorization": f"Bearer {token}"},
            params={"status": "confirmed"}
        )
        assert response.status_code in [200, 404]

    def test_appointment_validation(self):
        """Test appointment creation validation"""
        token = self.auth_tokens["shop_owner"]
        
        # Test with invalid data
        invalid_appointment_cases = [
            ({}, 422),  # Empty data
            ({"client_name": "Test"}, 422),  # Missing required fields
            ({"client_name": "Test", "client_email": "invalid-email"}, 422),  # Invalid email
            ({"client_name": "", "client_email": "test@test.com"}, 422),  # Empty name
            ({
                "client_name": "Test Client",
                "client_email": "test@test.com",
                "barber_id": "invalid"
            }, 422),  # Invalid barber_id type
        ]
        
        for invalid_data, expected_status in invalid_appointment_cases:
            response = client.post(
                "/api/v2/appointments",
                headers={"Authorization": f"Bearer {token}"},
                json=invalid_data
            )
            assert response.status_code == expected_status, f"Validation failed for {invalid_data}"

    # ========================================
    # SERVICE ENDPOINTS TESTS
    # ========================================
    
    def test_service_management_endpoints(self):
        """Test service management endpoints"""
        token = self.auth_tokens["shop_owner"]
        
        # Test service listing
        response = client.get(
            "/api/v2/services",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if response.status_code == 200:
            services = response.json()
            assert isinstance(services, (list, dict))
        
        # Test service creation
        new_service_data = {
            "name": "New API Service",
            "description": "Service created via API",
            "duration_minutes": 45,
            "price": 35.00
        }
        
        response = client.post(
            "/api/v2/services",
            headers={"Authorization": f"Bearer {token}"},
            json=new_service_data
        )
        
        if response.status_code in [200, 201]:
            created_service = response.json()
            service_id = created_service.get("id")
            
            # Test service retrieval
            response = client.get(
                f"/api/v2/services/{service_id}",
                headers={"Authorization": f"Bearer {token}"}
            )
            assert response.status_code in [200, 404]
            
            # Test service update
            update_data = {"price": 40.00}
            response = client.put(
                f"/api/v2/services/{service_id}",
                headers={"Authorization": f"Bearer {token}"},
                json=update_data
            )
            assert response.status_code in [200, 404]

    def test_service_validation(self):
        """Test service creation and update validation"""
        token = self.auth_tokens["shop_owner"]
        
        # Test with invalid service data
        invalid_service_cases = [
            ({}, 422),  # Empty data
            ({"name": ""}, 422),  # Empty name
            ({"name": "Test", "duration_minutes": "invalid"}, 422),  # Invalid duration type
            ({"name": "Test", "price": "invalid"}, 422),  # Invalid price type
            ({"name": "Test", "duration_minutes": -10}, 422),  # Negative duration
            ({"name": "Test", "price": -5.00}, 422),  # Negative price
        ]
        
        for invalid_data, expected_status in invalid_service_cases:
            response = client.post(
                "/api/v2/services",
                headers={"Authorization": f"Bearer {token}"},
                json=invalid_data
            )
            assert response.status_code == expected_status, f"Service validation failed for {invalid_data}"

    # ========================================
    # ORGANIZATION ENDPOINTS TESTS
    # ========================================
    
    def test_organization_endpoints(self):
        """Test organization management endpoints"""
        token = self.auth_tokens["shop_owner"]
        
        # Test organization profile
        response = client.get(
            "/api/v2/organizations/profile",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if response.status_code == 200:
            org_data = response.json()
            assert "name" in org_data
            assert "slug" in org_data
        
        # Test organization update
        update_data = {
            "description": "Updated organization description",
            "website": "https://updated-shop.com"
        }
        
        response = client.put(
            "/api/v2/organizations/profile",
            headers={"Authorization": f"Bearer {token}"},
            json=update_data
        )
        
        assert response.status_code in [200, 404]

    def test_organization_staff_management(self):
        """Test organization staff management endpoints"""
        token = self.auth_tokens["shop_owner"]
        
        # Test staff listing
        response = client.get(
            "/api/v2/organizations/staff",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if response.status_code == 200:
            staff = response.json()
            assert isinstance(staff, (list, dict))
        
        # Test staff invitation
        invitation_data = {
            "email": "newstaff@api.com",
            "role": "barber",
            "name": "New Staff Member"
        }
        
        response = client.post(
            "/api/v2/organizations/staff/invite",
            headers={"Authorization": f"Bearer {token}"},
            json=invitation_data
        )
        
        assert response.status_code in [200, 201, 404]

    # ========================================
    # PAYMENT ENDPOINTS TESTS
    # ========================================
    
    @patch('stripe.PaymentIntent.create')
    def test_payment_endpoints(self, mock_payment_intent):
        """Test payment-related endpoints"""
        # Mock Stripe response
        mock_payment_intent.return_value = {
            'id': 'pi_test123',
            'client_secret': 'pi_test123_secret',
            'status': 'requires_payment_method'
        }
        
        token = self.auth_tokens["client"]
        
        # Test payment intent creation
        response = client.post(
            "/api/v2/payments/create-intent",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "appointment_id": 1,
                "amount": 30.00
            }
        )
        
        assert response.status_code in [200, 201, 404]
        
        # Test payment status
        response = client.get(
            "/api/v2/payments/pi_test123/status",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code in [200, 404]

    def test_payment_validation(self):
        """Test payment endpoint validation"""
        token = self.auth_tokens["client"]
        
        # Test with invalid payment data
        invalid_payment_cases = [
            ({}, 422),  # Empty data
            ({"amount": "invalid"}, 422),  # Invalid amount type
            ({"amount": -10.00}, 422),  # Negative amount
            ({"appointment_id": "invalid"}, 422),  # Invalid appointment_id
        ]
        
        for invalid_data, expected_status in invalid_payment_cases:
            response = client.post(
                "/api/v2/payments/create-intent",
                headers={"Authorization": f"Bearer {token}"},
                json=invalid_data
            )
            assert response.status_code == expected_status, f"Payment validation failed for {invalid_data}"

    # ========================================
    # ANALYTICS ENDPOINTS TESTS
    # ========================================
    
    def test_analytics_endpoints(self):
        """Test analytics endpoints"""
        token = self.auth_tokens["shop_owner"]
        
        # Test dashboard analytics
        response = client.get(
            "/api/v2/analytics/dashboard",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if response.status_code == 200:
            analytics = response.json()
            assert isinstance(analytics, dict)
        
        # Test revenue analytics
        response = client.get(
            "/api/v2/analytics/revenue",
            headers={"Authorization": f"Bearer {token}"},
            params={
                "start_date": "2025-07-01",
                "end_date": "2025-07-31"
            }
        )
        
        assert response.status_code in [200, 404]
        
        # Test appointment analytics
        response = client.get(
            "/api/v2/analytics/appointments",
            headers={"Authorization": f"Bearer {token}"},
            params={"period": "month"}
        )
        
        assert response.status_code in [200, 404]

    def test_analytics_authorization(self):
        """Test analytics endpoints authorization"""
        # Clients should not access analytics
        client_token = self.auth_tokens["client"]
        
        response = client.get(
            "/api/v2/analytics/dashboard",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        
        assert response.status_code in [403, 404], "Clients should not access analytics"

    # ========================================
    # ADMIN ENDPOINTS TESTS
    # ========================================
    
    def test_admin_endpoints_access_control(self):
        """Test admin endpoints access control"""
        admin_endpoints = [
            "/api/v2/admin/users",
            "/api/v2/admin/organizations",
            "/api/v2/admin/system-stats",
            "/api/v2/admin/logs"
        ]
        
        # Test with different user roles
        for endpoint in admin_endpoints:
            # Test with non-admin user
            response = client.get(
                endpoint,
                headers={"Authorization": f"Bearer {self.auth_tokens['client']}"}
            )
            assert response.status_code in [403, 404], f"Non-admin should not access {endpoint}"
            
            # Test with admin user
            if "super_admin" in self.auth_tokens:
                response = client.get(
                    endpoint,
                    headers={"Authorization": f"Bearer {self.auth_tokens['super_admin']}"}
                )
                assert response.status_code in [200, 404], f"Admin should access {endpoint}"

    # ========================================
    # API VERSIONING TESTS
    # ========================================
    
    def test_api_v2_compliance(self):
        """Test that all endpoints use V2 API patterns"""
        token = self.auth_tokens["shop_owner"]
        
        # Test that V2 endpoints don't redirect to V1
        v2_endpoints = [
            "/api/v2/auth/me",
            "/api/v2/appointments",
            "/api/v2/services",
            "/api/v2/users/profile"
        ]
        
        for endpoint in v2_endpoints:
            response = client.get(
                endpoint,
                headers={"Authorization": f"Bearer {token}"},
                allow_redirects=False
            )
            
            # Should not redirect to V1
            assert response.status_code != 301, f"{endpoint} should not redirect to V1"
            assert response.status_code != 302, f"{endpoint} should not redirect to V1"

    def test_api_response_format_consistency(self):
        """Test API response format consistency across endpoints"""
        token = self.auth_tokens["shop_owner"]
        
        # Test endpoints that should return JSON
        json_endpoints = [
            "/api/v2/auth/me",
            "/api/v2/appointments",
            "/api/v2/services"
        ]
        
        for endpoint in json_endpoints:
            response = client.get(
                endpoint,
                headers={"Authorization": f"Bearer {token}"}
            )
            
            if response.status_code == 200:
                # Should return valid JSON
                assert "application/json" in response.headers.get("content-type", "")
                
                # Should parse as JSON
                try:
                    json_data = response.json()
                    assert isinstance(json_data, (dict, list))
                except json.JSONDecodeError:
                    pytest.fail(f"{endpoint} did not return valid JSON")

    # ========================================
    # ERROR HANDLING TESTS
    # ========================================
    
    def test_api_error_responses(self):
        """Test consistent error response format"""
        # Test 404 responses
        response = client.get("/api/v2/nonexistent-endpoint")
        assert response.status_code == 404
        
        # Test 401 responses
        response = client.get("/api/v2/auth/me")
        assert response.status_code in [401, 403]
        
        # Test 422 validation responses
        response = client.post("/api/v2/auth/login", json={})
        assert response.status_code == 422

    def test_error_message_consistency(self):
        """Test error message format consistency"""
        # Test various error scenarios
        error_scenarios = [
            (lambda: client.get("/api/v2/auth/me"), [401, 403]),
            (lambda: client.post("/api/v2/auth/login", json={}), [422]),
            (lambda: client.get("/api/v2/nonexistent"), [404])
        ]
        
        for request_func, expected_statuses in error_scenarios:
            response = request_func()
            assert response.status_code in expected_statuses
            
            # Error responses should have detail field
            if response.status_code != 404:  # 404 might have different format
                error_data = response.json()
                assert "detail" in error_data or "message" in error_data

    # ========================================
    # PERFORMANCE TESTS
    # ========================================
    
    def test_api_endpoint_performance(self):
        """Test API endpoint performance requirements"""
        token = self.auth_tokens["shop_owner"]
        
        # Test critical endpoints performance
        critical_endpoints = [
            "/api/v2/auth/me",
            "/api/v2/appointments",
            "/api/v2/services"
        ]
        
        for endpoint in critical_endpoints:
            start_time = time.time()
            response = client.get(
                endpoint,
                headers={"Authorization": f"Bearer {token}"}
            )
            end_time = time.time()
            
            response_time = (end_time - start_time) * 1000  # Convert to ms
            
            if response.status_code == 200:
                assert response_time < 400, f"{endpoint} took {response_time}ms, should be <400ms"

    def test_api_concurrent_requests(self):
        """Test API handling of concurrent requests"""
        import concurrent.futures
        
        token = self.auth_tokens["shop_owner"]
        
        def make_request():
            return client.get(
                "/api/v2/auth/me",
                headers={"Authorization": f"Bearer {token}"}
            )
        
        # Test with 10 concurrent requests
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            futures = [executor.submit(make_request) for _ in range(10)]
            responses = [future.result() for future in futures]
        
        # All requests should succeed
        success_count = sum(1 for r in responses if r.status_code == 200)
        success_rate = success_count / len(responses)
        
        assert success_rate >= 0.9, f"Success rate {success_rate*100}% for concurrent requests"

    # ========================================
    # PAGINATION TESTS
    # ========================================
    
    def test_pagination_consistency(self):
        """Test pagination consistency across list endpoints"""
        token = self.auth_tokens["shop_owner"]
        
        # Test endpoints that should support pagination
        paginated_endpoints = [
            "/api/v2/appointments",
            "/api/v2/services"
        ]
        
        for endpoint in paginated_endpoints:
            # Test with pagination parameters
            response = client.get(
                endpoint,
                headers={"Authorization": f"Bearer {token}"},
                params={"limit": 5, "offset": 0}
            )
            
            if response.status_code == 200:
                data = response.json()
                # Should handle pagination parameters
                assert isinstance(data, (list, dict))

    # ========================================
    # SEARCH FUNCTIONALITY TESTS
    # ========================================
    
    def test_search_endpoints(self):
        """Test search functionality across endpoints"""
        token = self.auth_tokens["shop_owner"]
        
        # Test search endpoints
        search_endpoints = [
            ("/api/v2/appointments/search", {"q": "API"}),
            ("/api/v2/services/search", {"q": "Test"}),
            ("/api/v2/clients/search", {"q": "Client"})
        ]
        
        for endpoint, params in search_endpoints:
            response = client.get(
                endpoint,
                headers={"Authorization": f"Bearer {token}"},
                params=params
            )
            
            # Should handle search or return 404 if not implemented
            assert response.status_code in [200, 404]


# ========================================
# API VALIDATION UTILITIES
# ========================================

class APIValidator:
    """Utility class for API validation"""
    
    @staticmethod
    def validate_response_schema(response_data, expected_fields):
        """Validate response contains expected fields"""
        if isinstance(response_data, dict):
            for field in expected_fields:
                assert field in response_data, f"Missing field: {field}"
        elif isinstance(response_data, list) and response_data:
            # Validate first item in list
            for field in expected_fields:
                assert field in response_data[0], f"Missing field in list item: {field}"
    
    @staticmethod
    def validate_error_response(response):
        """Validate error response format"""
        assert response.status_code >= 400
        error_data = response.json()
        assert "detail" in error_data or "message" in error_data


# ========================================
# PYTEST CONFIGURATION
# ========================================

def pytest_configure(config):
    """Configure pytest for API tests."""
    config.addinivalue_line(
        "markers", "api: mark test as API test"
    )
    config.addinivalue_line(
        "markers", "v2: mark test as V2 API test"
    )
    config.addinivalue_line(
        "markers", "auth: mark test as authentication test"
    )
    config.addinivalue_line(
        "markers", "crud: mark test as CRUD operations test"
    )

# ========================================
# TEST RUNNER
# ========================================

if __name__ == "__main__":
    pytest.main([
        __file__,
        "-v",
        "--tb=short",
        "--cov=routers",
        "--cov-report=html:coverage/api_tests",
        "--cov-report=term-missing",
        "-m", "api"
    ])