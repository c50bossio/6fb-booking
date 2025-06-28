#!/usr/bin/env python3
"""
Comprehensive Backend API Testing Script
Tests all endpoints systematically with various scenarios
"""

import requests
import json
import time
from typing import Dict, Any, List, Tuple
from datetime import datetime, timedelta
import sys
import os

# Add parent directory to path to import backend modules if needed
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


class APITester:
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.session = requests.Session()
        self.auth_token = None
        self.refresh_token = None
        self.test_results = []
        self.test_user = {
            "email": "test_api@example.com",
            "password": "TestPassword123!",
            "first_name": "API",
            "last_name": "Tester",
        }
        self.admin_user = {"email": "admin@6fb.com", "password": "admin123"}

    def log_result(
        self, endpoint: str, method: str, status: str, details: Dict[str, Any]
    ):
        """Log test result"""
        result = {
            "timestamp": datetime.now().isoformat(),
            "endpoint": endpoint,
            "method": method,
            "status": status,
            "details": details,
        }
        self.test_results.append(result)

        # Print colored output
        color = "\033[92m" if status == "PASS" else "\033[91m"
        reset = "\033[0m"
        print(
            f"{color}[{status}]{reset} {method} {endpoint} - {details.get('message', '')}"
        )

    def make_request(
        self, method: str, endpoint: str, **kwargs
    ) -> Tuple[int, Any, float]:
        """Make HTTP request and return status code, response data, and response time"""
        url = f"{self.base_url}{endpoint}"

        # Add auth header if available
        if self.auth_token and "headers" not in kwargs:
            kwargs["headers"] = {}
        if self.auth_token:
            kwargs.setdefault("headers", {})[
                "Authorization"
            ] = f"Bearer {self.auth_token}"

        start_time = time.time()
        try:
            response = self.session.request(method, url, **kwargs)
            response_time = time.time() - start_time

            try:
                data = response.json()
            except:
                data = response.text

            return response.status_code, data, response_time
        except Exception as e:
            return 0, str(e), time.time() - start_time

    def test_health_endpoints(self):
        """Test health and monitoring endpoints"""
        print("\n=== Testing Health & Monitoring Endpoints ===")

        endpoints = [
            ("GET", "/health"),
            ("GET", "/api/v1/health"),
            ("GET", "/api/v1/auth/health"),
            ("GET", "/docs"),
            ("GET", "/redoc"),
            ("GET", "/openapi.json"),
        ]

        for method, endpoint in endpoints:
            status_code, data, response_time = self.make_request(method, endpoint)

            if endpoint in ["/health", "/api/v1/health"]:
                expected_status = 200
                success = status_code == expected_status
                self.log_result(
                    endpoint,
                    method,
                    "PASS" if success else "FAIL",
                    {
                        "status_code": status_code,
                        "response_time": f"{response_time:.3f}s",
                        "message": f"Health check {'successful' if success else 'failed'}",
                        "data": data,
                    },
                )
            else:
                success = status_code in [200, 301, 302]
                self.log_result(
                    endpoint,
                    method,
                    "PASS" if success else "FAIL",
                    {
                        "status_code": status_code,
                        "response_time": f"{response_time:.3f}s",
                        "message": f"Endpoint {'accessible' if success else 'not accessible'}",
                    },
                )

    def test_auth_endpoints(self):
        """Test authentication endpoints"""
        print("\n=== Testing Authentication Endpoints ===")

        # Test registration
        print("\n--- Testing Registration ---")
        status_code, data, response_time = self.make_request(
            "POST",
            "/api/v1/auth/register",
            json={
                "email": self.test_user["email"],
                "password": self.test_user["password"],
                "first_name": self.test_user["first_name"],
                "last_name": self.test_user["last_name"],
                "role": "client",
            },
        )

        if status_code == 201:
            self.log_result(
                "/api/v1/auth/register",
                "POST",
                "PASS",
                {
                    "status_code": status_code,
                    "response_time": f"{response_time:.3f}s",
                    "message": "User registered successfully",
                    "user_id": data.get("id"),
                },
            )
        elif status_code == 400 and "already registered" in str(data):
            self.log_result(
                "/api/v1/auth/register",
                "POST",
                "PASS",
                {
                    "status_code": status_code,
                    "response_time": f"{response_time:.3f}s",
                    "message": "User already exists (expected)",
                },
            )
        else:
            self.log_result(
                "/api/v1/auth/register",
                "POST",
                "FAIL",
                {
                    "status_code": status_code,
                    "response_time": f"{response_time:.3f}s",
                    "message": "Registration failed",
                    "error": data,
                },
            )

        # Test login
        print("\n--- Testing Login ---")
        status_code, data, response_time = self.make_request(
            "POST",
            "/api/v1/auth/token",
            data={
                "username": self.test_user["email"],
                "password": self.test_user["password"],
            },
        )

        if status_code == 200 and "access_token" in data:
            self.auth_token = data["access_token"]
            self.refresh_token = data.get("refresh_token")
            self.log_result(
                "/api/v1/auth/token",
                "POST",
                "PASS",
                {
                    "status_code": status_code,
                    "response_time": f"{response_time:.3f}s",
                    "message": "Login successful",
                    "token_type": data.get("token_type"),
                },
            )
        else:
            self.log_result(
                "/api/v1/auth/token",
                "POST",
                "FAIL",
                {
                    "status_code": status_code,
                    "response_time": f"{response_time:.3f}s",
                    "message": "Login failed",
                    "error": data,
                },
            )

        # Test get current user
        print("\n--- Testing Get Current User ---")
        status_code, data, response_time = self.make_request("GET", "/api/v1/auth/me")

        if status_code == 200:
            self.log_result(
                "/api/v1/auth/me",
                "GET",
                "PASS",
                {
                    "status_code": status_code,
                    "response_time": f"{response_time:.3f}s",
                    "message": "Current user retrieved",
                    "user_email": data.get("email"),
                },
            )
        else:
            self.log_result(
                "/api/v1/auth/me",
                "GET",
                "FAIL",
                {
                    "status_code": status_code,
                    "response_time": f"{response_time:.3f}s",
                    "message": "Failed to get current user",
                    "error": data,
                },
            )

        # Test token refresh
        if self.refresh_token:
            print("\n--- Testing Token Refresh ---")
            status_code, data, response_time = self.make_request(
                "POST",
                "/api/v1/auth/refresh",
                json={"refresh_token": self.refresh_token},
            )

            if status_code == 200 and "access_token" in data:
                self.log_result(
                    "/api/v1/auth/refresh",
                    "POST",
                    "PASS",
                    {
                        "status_code": status_code,
                        "response_time": f"{response_time:.3f}s",
                        "message": "Token refreshed successfully",
                    },
                )
            else:
                self.log_result(
                    "/api/v1/auth/refresh",
                    "POST",
                    "FAIL",
                    {
                        "status_code": status_code,
                        "response_time": f"{response_time:.3f}s",
                        "message": "Token refresh failed",
                        "error": data,
                    },
                )

        # Test forgot password
        print("\n--- Testing Forgot Password ---")
        status_code, data, response_time = self.make_request(
            "POST",
            "/api/v1/auth/forgot-password",
            json={"email": self.test_user["email"]},
        )

        if status_code in [200, 202]:
            self.log_result(
                "/api/v1/auth/forgot-password",
                "POST",
                "PASS",
                {
                    "status_code": status_code,
                    "response_time": f"{response_time:.3f}s",
                    "message": "Password reset initiated",
                },
            )
        else:
            self.log_result(
                "/api/v1/auth/forgot-password",
                "POST",
                "FAIL",
                {
                    "status_code": status_code,
                    "response_time": f"{response_time:.3f}s",
                    "message": "Password reset failed",
                    "error": data,
                },
            )

        # Test logout
        print("\n--- Testing Logout ---")
        status_code, data, response_time = self.make_request(
            "POST", "/api/v1/auth/logout"
        )

        if status_code in [200, 204]:
            self.log_result(
                "/api/v1/auth/logout",
                "POST",
                "PASS",
                {
                    "status_code": status_code,
                    "response_time": f"{response_time:.3f}s",
                    "message": "Logout successful",
                },
            )
        else:
            self.log_result(
                "/api/v1/auth/logout",
                "POST",
                "FAIL",
                {
                    "status_code": status_code,
                    "response_time": f"{response_time:.3f}s",
                    "message": "Logout failed",
                    "error": data,
                },
            )

    def test_auth_security(self):
        """Test authentication security features"""
        print("\n=== Testing Authentication Security ===")

        # Test invalid login
        print("\n--- Testing Invalid Login ---")
        status_code, data, response_time = self.make_request(
            "POST",
            "/api/v1/auth/token",
            data={"username": "invalid@example.com", "password": "wrongpassword"},
        )

        if status_code == 401:
            self.log_result(
                "/api/v1/auth/token",
                "POST",
                "PASS",
                {
                    "status_code": status_code,
                    "response_time": f"{response_time:.3f}s",
                    "message": "Invalid login correctly rejected",
                },
            )
        else:
            self.log_result(
                "/api/v1/auth/token",
                "POST",
                "FAIL",
                {
                    "status_code": status_code,
                    "response_time": f"{response_time:.3f}s",
                    "message": "Invalid login not properly rejected",
                    "error": data,
                },
            )

        # Test accessing protected endpoint without token
        print("\n--- Testing Unauthorized Access ---")
        old_token = self.auth_token
        self.auth_token = None

        status_code, data, response_time = self.make_request(
            "GET", "/api/v1/appointments"
        )

        if status_code == 401:
            self.log_result(
                "/api/v1/appointments",
                "GET",
                "PASS",
                {
                    "status_code": status_code,
                    "response_time": f"{response_time:.3f}s",
                    "message": "Unauthorized access correctly blocked",
                },
            )
        else:
            self.log_result(
                "/api/v1/appointments",
                "GET",
                "FAIL",
                {
                    "status_code": status_code,
                    "response_time": f"{response_time:.3f}s",
                    "message": "Unauthorized access not properly blocked",
                    "error": data,
                },
            )

        self.auth_token = old_token

        # Test rate limiting (make multiple rapid requests)
        print("\n--- Testing Rate Limiting ---")
        rate_limit_hit = False
        for i in range(20):
            status_code, data, _ = self.make_request(
                "POST",
                "/api/v1/auth/token",
                data={"username": f"test{i}@example.com", "password": "wrong"},
            )
            if status_code == 429:
                rate_limit_hit = True
                break

        if rate_limit_hit:
            self.log_result(
                "/api/v1/auth/token",
                "POST",
                "PASS",
                {"status_code": 429, "message": "Rate limiting is working"},
            )
        else:
            self.log_result(
                "/api/v1/auth/token",
                "POST",
                "WARNING",
                {"message": "Rate limiting may not be properly configured"},
            )

    def test_appointment_endpoints(self):
        """Test appointment endpoints"""
        print("\n=== Testing Appointment Endpoints ===")

        # Login first
        self.login_as_user()

        # Test list appointments
        print("\n--- Testing List Appointments ---")
        status_code, data, response_time = self.make_request(
            "GET", "/api/v1/appointments"
        )

        if status_code == 200:
            self.log_result(
                "/api/v1/appointments",
                "GET",
                "PASS",
                {
                    "status_code": status_code,
                    "response_time": f"{response_time:.3f}s",
                    "message": "Appointments listed successfully",
                    "count": len(data) if isinstance(data, list) else "N/A",
                },
            )
        else:
            self.log_result(
                "/api/v1/appointments",
                "GET",
                "FAIL",
                {
                    "status_code": status_code,
                    "response_time": f"{response_time:.3f}s",
                    "message": "Failed to list appointments",
                    "error": data,
                },
            )

        # Test create appointment
        print("\n--- Testing Create Appointment ---")
        appointment_data = {
            "barber_id": 1,
            "client_id": 1,
            "service_id": 1,
            "start_time": (datetime.now() + timedelta(days=1)).isoformat(),
            "end_time": (datetime.now() + timedelta(days=1, hours=1)).isoformat(),
            "status": "scheduled",
            "notes": "API test appointment",
        }

        status_code, data, response_time = self.make_request(
            "POST", "/api/v1/appointments", json=appointment_data
        )

        appointment_id = None
        if status_code == 201:
            appointment_id = data.get("id")
            self.log_result(
                "/api/v1/appointments",
                "POST",
                "PASS",
                {
                    "status_code": status_code,
                    "response_time": f"{response_time:.3f}s",
                    "message": "Appointment created successfully",
                    "appointment_id": appointment_id,
                },
            )
        else:
            self.log_result(
                "/api/v1/appointments",
                "POST",
                "FAIL",
                {
                    "status_code": status_code,
                    "response_time": f"{response_time:.3f}s",
                    "message": "Failed to create appointment",
                    "error": data,
                },
            )

        # Test get appointment details
        if appointment_id:
            print("\n--- Testing Get Appointment Details ---")
            status_code, data, response_time = self.make_request(
                "GET", f"/api/v1/appointments/{appointment_id}"
            )

            if status_code == 200:
                self.log_result(
                    f"/api/v1/appointments/{appointment_id}",
                    "GET",
                    "PASS",
                    {
                        "status_code": status_code,
                        "response_time": f"{response_time:.3f}s",
                        "message": "Appointment details retrieved",
                    },
                )
            else:
                self.log_result(
                    f"/api/v1/appointments/{appointment_id}",
                    "GET",
                    "FAIL",
                    {
                        "status_code": status_code,
                        "response_time": f"{response_time:.3f}s",
                        "message": "Failed to get appointment details",
                        "error": data,
                    },
                )

            # Test update appointment
            print("\n--- Testing Update Appointment ---")
            update_data = {"notes": "Updated via API test"}

            status_code, data, response_time = self.make_request(
                "PUT", f"/api/v1/appointments/{appointment_id}", json=update_data
            )

            if status_code == 200:
                self.log_result(
                    f"/api/v1/appointments/{appointment_id}",
                    "PUT",
                    "PASS",
                    {
                        "status_code": status_code,
                        "response_time": f"{response_time:.3f}s",
                        "message": "Appointment updated successfully",
                    },
                )
            else:
                self.log_result(
                    f"/api/v1/appointments/{appointment_id}",
                    "PUT",
                    "FAIL",
                    {
                        "status_code": status_code,
                        "response_time": f"{response_time:.3f}s",
                        "message": "Failed to update appointment",
                        "error": data,
                    },
                )

            # Test delete appointment
            print("\n--- Testing Delete Appointment ---")
            status_code, data, response_time = self.make_request(
                "DELETE", f"/api/v1/appointments/{appointment_id}"
            )

            if status_code in [200, 204]:
                self.log_result(
                    f"/api/v1/appointments/{appointment_id}",
                    "DELETE",
                    "PASS",
                    {
                        "status_code": status_code,
                        "response_time": f"{response_time:.3f}s",
                        "message": "Appointment deleted successfully",
                    },
                )
            else:
                self.log_result(
                    f"/api/v1/appointments/{appointment_id}",
                    "DELETE",
                    "FAIL",
                    {
                        "status_code": status_code,
                        "response_time": f"{response_time:.3f}s",
                        "message": "Failed to delete appointment",
                        "error": data,
                    },
                )

        # Test appointment filters
        print("\n--- Testing Appointment Filters ---")
        filter_tests = [
            ("?status=scheduled", "status filter"),
            ("?barber_id=1", "barber filter"),
            ("?date_from=2024-01-01", "date filter"),
            ("?limit=10&offset=0", "pagination"),
        ]

        for filter_param, filter_name in filter_tests:
            status_code, data, response_time = self.make_request(
                "GET", f"/api/v1/appointments{filter_param}"
            )

            if status_code == 200:
                self.log_result(
                    f"/api/v1/appointments{filter_param}",
                    "GET",
                    "PASS",
                    {
                        "status_code": status_code,
                        "response_time": f"{response_time:.3f}s",
                        "message": f"Appointment {filter_name} working",
                    },
                )
            else:
                self.log_result(
                    f"/api/v1/appointments{filter_param}",
                    "GET",
                    "FAIL",
                    {
                        "status_code": status_code,
                        "response_time": f"{response_time:.3f}s",
                        "message": f"Appointment {filter_name} failed",
                        "error": data,
                    },
                )

    def test_user_barber_endpoints(self):
        """Test user and barber management endpoints"""
        print("\n=== Testing User/Barber Management Endpoints ===")

        # Login as admin
        self.login_as_admin()

        # Test list users
        print("\n--- Testing List Users ---")
        status_code, data, response_time = self.make_request("GET", "/api/v1/users")

        if status_code == 200:
            self.log_result(
                "/api/v1/users",
                "GET",
                "PASS",
                {
                    "status_code": status_code,
                    "response_time": f"{response_time:.3f}s",
                    "message": "Users listed successfully",
                    "count": len(data) if isinstance(data, list) else "N/A",
                },
            )
        else:
            self.log_result(
                "/api/v1/users",
                "GET",
                "FAIL",
                {
                    "status_code": status_code,
                    "response_time": f"{response_time:.3f}s",
                    "message": "Failed to list users",
                    "error": data,
                },
            )

        # Test list barbers
        print("\n--- Testing List Barbers ---")
        status_code, data, response_time = self.make_request("GET", "/api/v1/barbers")

        if status_code == 200:
            self.log_result(
                "/api/v1/barbers",
                "GET",
                "PASS",
                {
                    "status_code": status_code,
                    "response_time": f"{response_time:.3f}s",
                    "message": "Barbers listed successfully",
                    "count": len(data) if isinstance(data, list) else "N/A",
                },
            )
        else:
            self.log_result(
                "/api/v1/barbers",
                "GET",
                "FAIL",
                {
                    "status_code": status_code,
                    "response_time": f"{response_time:.3f}s",
                    "message": "Failed to list barbers",
                    "error": data,
                },
            )

        # Test create barber
        print("\n--- Testing Create Barber ---")
        barber_data = {
            "user_id": 1,
            "bio": "Test barber bio",
            "specialties": ["Fades", "Beards"],
            "years_experience": 5,
            "is_active": True,
        }

        status_code, data, response_time = self.make_request(
            "POST", "/api/v1/barbers", json=barber_data
        )

        barber_id = None
        if status_code in [200, 201]:
            barber_id = data.get("id")
            self.log_result(
                "/api/v1/barbers",
                "POST",
                "PASS",
                {
                    "status_code": status_code,
                    "response_time": f"{response_time:.3f}s",
                    "message": "Barber created successfully",
                    "barber_id": barber_id,
                },
            )
        else:
            self.log_result(
                "/api/v1/barbers",
                "POST",
                "WARNING",
                {
                    "status_code": status_code,
                    "response_time": f"{response_time:.3f}s",
                    "message": "Barber creation returned unexpected status",
                    "error": data,
                },
            )

        # Test update barber
        if barber_id:
            print("\n--- Testing Update Barber ---")
            update_data = {"bio": "Updated barber bio", "years_experience": 6}

            status_code, data, response_time = self.make_request(
                "PUT", f"/api/v1/barbers/{barber_id}", json=update_data
            )

            if status_code == 200:
                self.log_result(
                    f"/api/v1/barbers/{barber_id}",
                    "PUT",
                    "PASS",
                    {
                        "status_code": status_code,
                        "response_time": f"{response_time:.3f}s",
                        "message": "Barber updated successfully",
                    },
                )
            else:
                self.log_result(
                    f"/api/v1/barbers/{barber_id}",
                    "PUT",
                    "FAIL",
                    {
                        "status_code": status_code,
                        "response_time": f"{response_time:.3f}s",
                        "message": "Failed to update barber",
                        "error": data,
                    },
                )

    def test_booking_endpoints(self):
        """Test public booking endpoints"""
        print("\n=== Testing Public Booking Endpoints ===")

        # Test without authentication first
        old_token = self.auth_token
        self.auth_token = None

        # Test get services
        print("\n--- Testing Get Services (Public) ---")
        status_code, data, response_time = self.make_request(
            "GET", "/api/v1/public/booking/services"
        )

        if status_code == 200:
            self.log_result(
                "/api/v1/public/booking/services",
                "GET",
                "PASS",
                {
                    "status_code": status_code,
                    "response_time": f"{response_time:.3f}s",
                    "message": "Public services retrieved",
                    "count": len(data) if isinstance(data, list) else "N/A",
                },
            )
        else:
            self.log_result(
                "/api/v1/public/booking/services",
                "GET",
                "FAIL",
                {
                    "status_code": status_code,
                    "response_time": f"{response_time:.3f}s",
                    "message": "Failed to get public services",
                    "error": data,
                },
            )

        # Test get barbers
        print("\n--- Testing Get Barbers (Public) ---")
        status_code, data, response_time = self.make_request(
            "GET", "/api/v1/public/booking/barbers"
        )

        if status_code == 200:
            self.log_result(
                "/api/v1/public/booking/barbers",
                "GET",
                "PASS",
                {
                    "status_code": status_code,
                    "response_time": f"{response_time:.3f}s",
                    "message": "Public barbers retrieved",
                    "count": len(data) if isinstance(data, list) else "N/A",
                },
            )
        else:
            self.log_result(
                "/api/v1/public/booking/barbers",
                "GET",
                "FAIL",
                {
                    "status_code": status_code,
                    "response_time": f"{response_time:.3f}s",
                    "message": "Failed to get public barbers",
                    "error": data,
                },
            )

        # Test get availability
        print("\n--- Testing Get Availability (Public) ---")
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        status_code, data, response_time = self.make_request(
            "GET", f"/api/v1/public/booking/availability?barber_id=1&date={tomorrow}"
        )

        if status_code == 200:
            self.log_result(
                "/api/v1/public/booking/availability",
                "GET",
                "PASS",
                {
                    "status_code": status_code,
                    "response_time": f"{response_time:.3f}s",
                    "message": "Availability retrieved",
                    "slots": len(data) if isinstance(data, list) else "N/A",
                },
            )
        else:
            self.log_result(
                "/api/v1/public/booking/availability",
                "GET",
                "FAIL",
                {
                    "status_code": status_code,
                    "response_time": f"{response_time:.3f}s",
                    "message": "Failed to get availability",
                    "error": data,
                },
            )

        # Test create booking
        print("\n--- Testing Create Booking (Public) ---")
        booking_data = {
            "barber_id": 1,
            "service_id": 1,
            "client_name": "Test Client",
            "client_email": "testclient@example.com",
            "client_phone": "+1234567890",
            "start_time": (datetime.now() + timedelta(days=2, hours=10)).isoformat(),
            "notes": "Public booking test",
        }

        status_code, data, response_time = self.make_request(
            "POST", "/api/v1/public/booking/create", json=booking_data
        )

        if status_code in [200, 201]:
            self.log_result(
                "/api/v1/public/booking/create",
                "POST",
                "PASS",
                {
                    "status_code": status_code,
                    "response_time": f"{response_time:.3f}s",
                    "message": "Public booking created",
                    "booking_id": data.get("id") or data.get("booking_id"),
                },
            )
        else:
            self.log_result(
                "/api/v1/public/booking/create",
                "POST",
                "FAIL",
                {
                    "status_code": status_code,
                    "response_time": f"{response_time:.3f}s",
                    "message": "Failed to create public booking",
                    "error": data,
                },
            )

        self.auth_token = old_token

    def test_payment_endpoints(self):
        """Test payment endpoints"""
        print("\n=== Testing Payment Endpoints ===")

        # Login as admin
        self.login_as_admin()

        # Test list payments
        print("\n--- Testing List Payments ---")
        status_code, data, response_time = self.make_request("GET", "/api/v1/payments")

        if status_code == 200:
            self.log_result(
                "/api/v1/payments",
                "GET",
                "PASS",
                {
                    "status_code": status_code,
                    "response_time": f"{response_time:.3f}s",
                    "message": "Payments listed successfully",
                    "count": len(data) if isinstance(data, list) else "N/A",
                },
            )
        else:
            self.log_result(
                "/api/v1/payments",
                "GET",
                "FAIL",
                {
                    "status_code": status_code,
                    "response_time": f"{response_time:.3f}s",
                    "message": "Failed to list payments",
                    "error": data,
                },
            )

        # Test create payment intent
        print("\n--- Testing Create Payment Intent ---")
        payment_data = {
            "amount": 5000,  # $50.00
            "currency": "usd",
            "appointment_id": 1,
            "description": "Test payment",
        }

        status_code, data, response_time = self.make_request(
            "POST", "/api/v1/payments/create-intent", json=payment_data
        )

        if status_code in [200, 201]:
            self.log_result(
                "/api/v1/payments/create-intent",
                "POST",
                "PASS",
                {
                    "status_code": status_code,
                    "response_time": f"{response_time:.3f}s",
                    "message": "Payment intent created",
                    "client_secret": (
                        "present" if data.get("client_secret") else "missing"
                    ),
                },
            )
        else:
            self.log_result(
                "/api/v1/payments/create-intent",
                "POST",
                "WARNING",
                {
                    "status_code": status_code,
                    "response_time": f"{response_time:.3f}s",
                    "message": "Payment intent creation returned unexpected status",
                    "error": data,
                },
            )

        # Test Stripe webhook
        print("\n--- Testing Stripe Webhook ---")
        webhook_data = {
            "type": "payment_intent.succeeded",
            "data": {
                "object": {"id": "pi_test_123", "amount": 5000, "status": "succeeded"}
            },
        }

        status_code, data, response_time = self.make_request(
            "POST",
            "/api/v1/webhooks/stripe",
            json=webhook_data,
            headers={"stripe-signature": "test_signature"},
        )

        if status_code in [200, 400]:  # 400 might be expected without valid signature
            self.log_result(
                "/api/v1/webhooks/stripe",
                "POST",
                "PASS",
                {
                    "status_code": status_code,
                    "response_time": f"{response_time:.3f}s",
                    "message": "Webhook endpoint accessible",
                },
            )
        else:
            self.log_result(
                "/api/v1/webhooks/stripe",
                "POST",
                "FAIL",
                {
                    "status_code": status_code,
                    "response_time": f"{response_time:.3f}s",
                    "message": "Webhook endpoint error",
                    "error": data,
                },
            )

        # Test list payouts
        print("\n--- Testing List Payouts ---")
        status_code, data, response_time = self.make_request("GET", "/api/v1/payouts")

        if status_code == 200:
            self.log_result(
                "/api/v1/payouts",
                "GET",
                "PASS",
                {
                    "status_code": status_code,
                    "response_time": f"{response_time:.3f}s",
                    "message": "Payouts listed successfully",
                    "count": len(data) if isinstance(data, list) else "N/A",
                },
            )
        else:
            self.log_result(
                "/api/v1/payouts",
                "GET",
                "WARNING",
                {
                    "status_code": status_code,
                    "response_time": f"{response_time:.3f}s",
                    "message": "Payouts endpoint may not be implemented",
                    "error": data,
                },
            )

    def test_analytics_endpoints(self):
        """Test analytics and reporting endpoints"""
        print("\n=== Testing Analytics & Reporting Endpoints ===")

        # Login as admin
        self.login_as_admin()

        analytics_endpoints = [
            ("/api/v1/analytics/dashboard", "Dashboard Analytics"),
            ("/api/v1/analytics/revenue", "Revenue Analytics"),
            ("/api/v1/analytics/appointments", "Appointment Analytics"),
            ("/api/v1/analytics/clients", "Client Analytics"),
            ("/api/v1/analytics/services", "Service Analytics"),
            ("/api/v1/reports/summary", "Summary Report"),
            ("/api/v1/reports/detailed", "Detailed Report"),
        ]

        for endpoint, name in analytics_endpoints:
            print(f"\n--- Testing {name} ---")
            status_code, data, response_time = self.make_request("GET", endpoint)

            if status_code == 200:
                self.log_result(
                    endpoint,
                    "GET",
                    "PASS",
                    {
                        "status_code": status_code,
                        "response_time": f"{response_time:.3f}s",
                        "message": f"{name} retrieved successfully",
                    },
                )
            elif status_code == 404:
                self.log_result(
                    endpoint,
                    "GET",
                    "WARNING",
                    {
                        "status_code": status_code,
                        "response_time": f"{response_time:.3f}s",
                        "message": f"{name} endpoint not implemented",
                    },
                )
            else:
                self.log_result(
                    endpoint,
                    "GET",
                    "FAIL",
                    {
                        "status_code": status_code,
                        "response_time": f"{response_time:.3f}s",
                        "message": f"{name} failed",
                        "error": data,
                    },
                )

    def test_settings_endpoints(self):
        """Test settings endpoints"""
        print("\n=== Testing Settings Endpoints ===")

        # Login as admin
        self.login_as_admin()

        # Test get settings
        print("\n--- Testing Get Settings ---")
        status_code, data, response_time = self.make_request("GET", "/api/v1/settings")

        if status_code == 200:
            self.log_result(
                "/api/v1/settings",
                "GET",
                "PASS",
                {
                    "status_code": status_code,
                    "response_time": f"{response_time:.3f}s",
                    "message": "Settings retrieved successfully",
                },
            )
        else:
            self.log_result(
                "/api/v1/settings",
                "GET",
                "WARNING",
                {
                    "status_code": status_code,
                    "response_time": f"{response_time:.3f}s",
                    "message": "Settings endpoint may not be implemented",
                    "error": data,
                },
            )

    def test_error_handling(self):
        """Test error handling and edge cases"""
        print("\n=== Testing Error Handling ===")

        # Test 404 endpoint
        print("\n--- Testing 404 Handling ---")
        status_code, data, response_time = self.make_request(
            "GET", "/api/v1/nonexistent"
        )

        if status_code == 404:
            self.log_result(
                "/api/v1/nonexistent",
                "GET",
                "PASS",
                {
                    "status_code": status_code,
                    "response_time": f"{response_time:.3f}s",
                    "message": "404 error handled correctly",
                },
            )
        else:
            self.log_result(
                "/api/v1/nonexistent",
                "GET",
                "FAIL",
                {
                    "status_code": status_code,
                    "response_time": f"{response_time:.3f}s",
                    "message": "404 not properly handled",
                },
            )

        # Test malformed JSON
        print("\n--- Testing Malformed JSON ---")
        status_code, data, response_time = self.make_request(
            "POST",
            "/api/v1/appointments",
            data="invalid json",
            headers={"Content-Type": "application/json"},
        )

        if status_code in [400, 422]:
            self.log_result(
                "/api/v1/appointments",
                "POST",
                "PASS",
                {
                    "status_code": status_code,
                    "response_time": f"{response_time:.3f}s",
                    "message": "Malformed JSON rejected correctly",
                },
            )
        else:
            self.log_result(
                "/api/v1/appointments",
                "POST",
                "FAIL",
                {
                    "status_code": status_code,
                    "response_time": f"{response_time:.3f}s",
                    "message": "Malformed JSON not properly handled",
                },
            )

        # Test method not allowed
        print("\n--- Testing Method Not Allowed ---")
        status_code, data, response_time = self.make_request(
            "DELETE", "/api/v1/auth/token"
        )

        if status_code == 405:
            self.log_result(
                "/api/v1/auth/token",
                "DELETE",
                "PASS",
                {
                    "status_code": status_code,
                    "response_time": f"{response_time:.3f}s",
                    "message": "Method not allowed handled correctly",
                },
            )
        else:
            self.log_result(
                "/api/v1/auth/token",
                "DELETE",
                "WARNING",
                {
                    "status_code": status_code,
                    "response_time": f"{response_time:.3f}s",
                    "message": "Method not allowed may not be properly handled",
                },
            )

    def login_as_user(self):
        """Helper to login as test user"""
        status_code, data, _ = self.make_request(
            "POST",
            "/api/v1/auth/token",
            data={
                "username": self.test_user["email"],
                "password": self.test_user["password"],
            },
        )

        if status_code == 200 and "access_token" in data:
            self.auth_token = data["access_token"]
            self.refresh_token = data.get("refresh_token")

    def login_as_admin(self):
        """Helper to login as admin user"""
        status_code, data, _ = self.make_request(
            "POST",
            "/api/v1/auth/token",
            data={
                "username": self.admin_user["email"],
                "password": self.admin_user["password"],
            },
        )

        if status_code == 200 and "access_token" in data:
            self.auth_token = data["access_token"]
            self.refresh_token = data.get("refresh_token")
        else:
            print(f"\033[93mWarning: Admin login failed, some tests may fail\033[0m")

    def generate_report(self):
        """Generate comprehensive test report"""
        print("\n" + "=" * 80)
        print("API TEST REPORT")
        print("=" * 80)

        # Count results
        total_tests = len(self.test_results)
        passed = sum(1 for r in self.test_results if r["status"] == "PASS")
        failed = sum(1 for r in self.test_results if r["status"] == "FAIL")
        warnings = sum(1 for r in self.test_results if r["status"] == "WARNING")

        print(f"\nTotal Tests: {total_tests}")
        print(f"Passed: {passed} ({passed/total_tests*100:.1f}%)")
        print(f"Failed: {failed} ({failed/total_tests*100:.1f}%)")
        print(f"Warnings: {warnings} ({warnings/total_tests*100:.1f}%)")

        # Performance summary
        response_times = [
            r["details"].get("response_time", "0s") for r in self.test_results
        ]
        numeric_times = []
        for rt in response_times:
            if isinstance(rt, str) and rt.endswith("s"):
                try:
                    numeric_times.append(float(rt[:-1]))
                except:
                    pass

        if numeric_times:
            avg_response_time = sum(numeric_times) / len(numeric_times)
            max_response_time = max(numeric_times)
            min_response_time = min(numeric_times)

            print(f"\nPerformance Metrics:")
            print(f"Average Response Time: {avg_response_time:.3f}s")
            print(f"Max Response Time: {max_response_time:.3f}s")
            print(f"Min Response Time: {min_response_time:.3f}s")

        # Failed tests details
        if failed > 0:
            print("\n\nFAILED TESTS:")
            print("-" * 80)
            for result in self.test_results:
                if result["status"] == "FAIL":
                    print(f"\n{result['method']} {result['endpoint']}")
                    print(f"  Status Code: {result['details'].get('status_code')}")
                    print(f"  Error: {result['details'].get('error')}")

        # Warnings details
        if warnings > 0:
            print("\n\nWARNINGS:")
            print("-" * 80)
            for result in self.test_results:
                if result["status"] == "WARNING":
                    print(f"\n{result['method']} {result['endpoint']}")
                    print(f"  Message: {result['details'].get('message')}")

        # Save detailed report
        with open("api_test_report.json", "w") as f:
            json.dump(
                {
                    "summary": {
                        "total_tests": total_tests,
                        "passed": passed,
                        "failed": failed,
                        "warnings": warnings,
                        "timestamp": datetime.now().isoformat(),
                    },
                    "results": self.test_results,
                },
                f,
                indent=2,
            )

        print("\n\nDetailed report saved to: api_test_report.json")

    def run_all_tests(self):
        """Run all API tests"""
        print("Starting Comprehensive API Testing...")
        print(f"Base URL: {self.base_url}")
        print("=" * 80)

        # Run test suites in order
        self.test_health_endpoints()
        self.test_auth_endpoints()
        self.test_auth_security()
        self.test_appointment_endpoints()
        self.test_user_barber_endpoints()
        self.test_booking_endpoints()
        self.test_payment_endpoints()
        self.test_analytics_endpoints()
        self.test_settings_endpoints()
        self.test_error_handling()

        # Generate report
        self.generate_report()


def main():
    """Main entry point"""
    import argparse

    parser = argparse.ArgumentParser(description="Comprehensive Backend API Testing")
    parser.add_argument(
        "--base-url", default="http://localhost:8000", help="Base URL for API"
    )
    parser.add_argument(
        "--suite",
        choices=["all", "auth", "appointments", "booking", "payments", "analytics"],
        default="all",
        help="Test suite to run",
    )

    args = parser.parse_args()

    tester = APITester(base_url=args.base_url)

    if args.suite == "all":
        tester.run_all_tests()
    elif args.suite == "auth":
        tester.test_health_endpoints()
        tester.test_auth_endpoints()
        tester.test_auth_security()
        tester.generate_report()
    elif args.suite == "appointments":
        tester.test_appointment_endpoints()
        tester.generate_report()
    elif args.suite == "booking":
        tester.test_booking_endpoints()
        tester.generate_report()
    elif args.suite == "payments":
        tester.test_payment_endpoints()
        tester.generate_report()
    elif args.suite == "analytics":
        tester.test_analytics_endpoints()
        tester.generate_report()


if __name__ == "__main__":
    main()
