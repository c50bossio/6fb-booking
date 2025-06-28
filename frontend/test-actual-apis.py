#!/usr/bin/env python3
"""
Targeted Backend API Testing Script - Tests actual endpoints
Tests based on real router configuration from main.py
"""

import requests
import json
import time
from typing import Dict, Any, List, Tuple
from datetime import datetime, timedelta
import sys
import os


class ActualAPITester:
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.session = requests.Session()
        self.auth_token = None
        self.refresh_token = None
        self.test_results = []
        self.test_user_email = "test_api@example.com"
        self.test_user_password = "TestPassword123!"

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
        color = (
            "\033[92m"
            if status == "PASS"
            else "\033[91m" if status == "FAIL" else "\033[93m"
        )
        reset = "\033[0m"
        print(
            f"{color}[{status}]{reset} {method} {endpoint} - {details.get('message', '')}"
        )
        if status == "FAIL" and "error" in details:
            print(f"    Error: {details['error']}")

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

    def test_core_endpoints(self):
        """Test core system endpoints"""
        print("\n=== Testing Core System Endpoints ===")

        endpoints = [
            ("GET", "/", "Root endpoint"),
            ("GET", "/health", "Health check redirect"),
            ("GET", "/api/v1/health", "Health check"),
            ("GET", "/version", "Version info"),
            ("GET", "/docs", "API documentation"),
            ("GET", "/openapi.json", "OpenAPI schema"),
        ]

        for method, endpoint, description in endpoints:
            status_code, data, response_time = self.make_request(method, endpoint)

            if endpoint in ["/", "/health", "/api/v1/health", "/version"]:
                success = status_code in [200, 301, 302]
                self.log_result(
                    endpoint,
                    method,
                    "PASS" if success else "FAIL",
                    {
                        "status_code": status_code,
                        "response_time": f"{response_time:.3f}s",
                        "message": f"{description} {'OK' if success else 'failed'}",
                        "description": description,
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
                        "message": f"{description} {'accessible' if success else 'not accessible'}",
                    },
                )

    def test_authentication_system(self):
        """Test authentication endpoints"""
        print("\n=== Testing Authentication System ===")

        # Test user registration
        register_data = {
            "email": self.test_user_email,
            "password": self.test_user_password,
            "first_name": "API",
            "last_name": "Tester",
            "role": "client",
        }

        status_code, data, response_time = self.make_request(
            "POST", "/api/v1/auth/register", json=register_data
        )

        if status_code in [200, 201]:
            self.log_result(
                "/api/v1/auth/register",
                "POST",
                "PASS",
                {
                    "status_code": status_code,
                    "response_time": f"{response_time:.3f}s",
                    "message": "User registration successful",
                    "user_id": data.get("id") if isinstance(data, dict) else None,
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
        login_data = {
            "username": self.test_user_email,
            "password": self.test_user_password,
        }

        status_code, data, response_time = self.make_request(
            "POST", "/api/v1/auth/token", data=login_data
        )

        if status_code == 200 and isinstance(data, dict) and "access_token" in data:
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

        # Test get current user (if logged in)
        if self.auth_token:
            status_code, data, response_time = self.make_request(
                "GET", "/api/v1/auth/me"
            )

            if status_code == 200:
                self.log_result(
                    "/api/v1/auth/me",
                    "GET",
                    "PASS",
                    {
                        "status_code": status_code,
                        "response_time": f"{response_time:.3f}s",
                        "message": "Current user retrieved",
                        "user_email": (
                            data.get("email") if isinstance(data, dict) else None
                        ),
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

        # Test token refresh (if we have refresh token)
        if self.refresh_token:
            status_code, data, response_time = self.make_request(
                "POST",
                "/api/v1/auth/refresh",
                json={"refresh_token": self.refresh_token},
            )

            if status_code == 200:
                self.log_result(
                    "/api/v1/auth/refresh",
                    "POST",
                    "PASS",
                    {
                        "status_code": status_code,
                        "response_time": f"{response_time:.3f}s",
                        "message": "Token refresh successful",
                    },
                )
                if isinstance(data, dict) and "access_token" in data:
                    self.auth_token = data["access_token"]
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

    def test_business_data_endpoints(self):
        """Test business data endpoints"""
        print("\n=== Testing Business Data Endpoints ===")

        if not self.auth_token:
            print("   Skipping - no auth token available")
            return

        endpoints = [
            ("GET", "/api/v1/barbers", "List barbers"),
            ("GET", "/api/v1/clients", "List clients"),
            ("GET", "/api/v1/locations", "List locations"),
            ("GET", "/api/v1/services", "List services"),
            ("GET", "/api/v1/settings", "Get settings"),
        ]

        for method, endpoint, description in endpoints:
            status_code, data, response_time = self.make_request(method, endpoint)

            if status_code == 200:
                count = len(data) if isinstance(data, list) else "N/A"
                self.log_result(
                    endpoint,
                    method,
                    "PASS",
                    {
                        "status_code": status_code,
                        "response_time": f"{response_time:.3f}s",
                        "message": f"{description} successful",
                        "count": count,
                    },
                )
            elif status_code == 403:
                self.log_result(
                    endpoint,
                    method,
                    "WARNING",
                    {
                        "status_code": status_code,
                        "response_time": f"{response_time:.3f}s",
                        "message": f"{description} - access denied (expected for non-admin)",
                    },
                )
            elif status_code == 404:
                self.log_result(
                    endpoint,
                    method,
                    "WARNING",
                    {
                        "status_code": status_code,
                        "response_time": f"{response_time:.3f}s",
                        "message": f"{description} - endpoint not found",
                    },
                )
            else:
                self.log_result(
                    endpoint,
                    method,
                    "FAIL",
                    {
                        "status_code": status_code,
                        "response_time": f"{response_time:.3f}s",
                        "message": f"{description} failed",
                        "error": data,
                    },
                )

    def test_booking_endpoints(self):
        """Test booking-related endpoints"""
        print("\n=== Testing Booking Endpoints ===")

        # Test public booking endpoints (no auth required)
        old_token = self.auth_token
        self.auth_token = None

        public_endpoints = [
            ("GET", "/api/v1/booking/public/shops", "List shops"),
            ("GET", "/api/v1/booking/public/shops/1/services", "Get shop services"),
            ("GET", "/api/v1/booking/public/shops/1/barbers", "Get shop barbers"),
        ]

        for method, endpoint, description in public_endpoints:
            status_code, data, response_time = self.make_request(method, endpoint)

            if status_code == 200:
                count = len(data) if isinstance(data, list) else "N/A"
                self.log_result(
                    endpoint,
                    method,
                    "PASS",
                    {
                        "status_code": status_code,
                        "response_time": f"{response_time:.3f}s",
                        "message": f"{description} successful",
                        "count": count,
                    },
                )
            elif status_code == 404:
                self.log_result(
                    endpoint,
                    method,
                    "WARNING",
                    {
                        "status_code": status_code,
                        "response_time": f"{response_time:.3f}s",
                        "message": f"{description} - not found (expected if no test data)",
                    },
                )
            else:
                self.log_result(
                    endpoint,
                    method,
                    "FAIL",
                    {
                        "status_code": status_code,
                        "response_time": f"{response_time:.3f}s",
                        "message": f"{description} failed",
                        "error": data,
                    },
                )

        # Test barber availability with query params
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        availability_endpoint = f"/api/v1/booking/public/barbers/1/availability?service_id=1&start_date={tomorrow}"

        status_code, data, response_time = self.make_request(
            "GET", availability_endpoint
        )

        if status_code == 200:
            self.log_result(
                availability_endpoint,
                "GET",
                "PASS",
                {
                    "status_code": status_code,
                    "response_time": f"{response_time:.3f}s",
                    "message": "Availability check successful",
                    "slots": len(data) if isinstance(data, list) else "N/A",
                },
            )
        elif status_code == 422:
            self.log_result(
                availability_endpoint,
                "GET",
                "WARNING",
                {
                    "status_code": status_code,
                    "response_time": f"{response_time:.3f}s",
                    "message": "Availability check - validation error (expected without proper params)",
                },
            )
        else:
            self.log_result(
                availability_endpoint,
                "GET",
                "FAIL",
                {
                    "status_code": status_code,
                    "response_time": f"{response_time:.3f}s",
                    "message": "Availability check failed",
                    "error": data,
                },
            )

        # Restore auth token
        self.auth_token = old_token

    def test_payment_endpoints(self):
        """Test payment-related endpoints"""
        print("\n=== Testing Payment Endpoints ===")

        if not self.auth_token:
            print("   Skipping - no auth token available")
            return

        # Test Stripe webhook (should be accessible but may reject invalid data)
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

        if status_code in [200, 400]:  # 400 is expected without valid signature
            self.log_result(
                "/api/v1/webhooks/stripe",
                "POST",
                "PASS",
                {
                    "status_code": status_code,
                    "response_time": f"{response_time:.3f}s",
                    "message": "Stripe webhook endpoint accessible",
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
                    "message": "Stripe webhook endpoint error",
                    "error": data,
                },
            )

        # Test payouts endpoint
        status_code, data, response_time = self.make_request("GET", "/api/v1/payouts")

        if status_code == 200:
            self.log_result(
                "/api/v1/payouts",
                "GET",
                "PASS",
                {
                    "status_code": status_code,
                    "response_time": f"{response_time:.3f}s",
                    "message": "Payouts endpoint accessible",
                },
            )
        elif status_code == 403:
            self.log_result(
                "/api/v1/payouts",
                "GET",
                "WARNING",
                {
                    "status_code": status_code,
                    "response_time": f"{response_time:.3f}s",
                    "message": "Payouts endpoint - access denied (expected for non-admin)",
                },
            )
        else:
            self.log_result(
                "/api/v1/payouts",
                "GET",
                "FAIL",
                {
                    "status_code": status_code,
                    "response_time": f"{response_time:.3f}s",
                    "message": "Payouts endpoint failed",
                    "error": data,
                },
            )

    def test_analytics_endpoints(self):
        """Test analytics endpoints"""
        print("\n=== Testing Analytics Endpoints ===")

        if not self.auth_token:
            print("   Skipping - no auth token available")
            return

        analytics_endpoints = [
            ("GET", "/api/v1/analytics", "Analytics base"),
            ("GET", "/api/v1/revenue", "Revenue analytics"),
            ("GET", "/api/v1/dashboard", "Dashboard data"),
        ]

        for method, endpoint, description in analytics_endpoints:
            status_code, data, response_time = self.make_request(method, endpoint)

            if status_code == 200:
                self.log_result(
                    endpoint,
                    method,
                    "PASS",
                    {
                        "status_code": status_code,
                        "response_time": f"{response_time:.3f}s",
                        "message": f"{description} successful",
                    },
                )
            elif status_code == 403:
                self.log_result(
                    endpoint,
                    method,
                    "WARNING",
                    {
                        "status_code": status_code,
                        "response_time": f"{response_time:.3f}s",
                        "message": f"{description} - access denied (expected for non-admin)",
                    },
                )
            elif status_code == 404:
                self.log_result(
                    endpoint,
                    method,
                    "WARNING",
                    {
                        "status_code": status_code,
                        "response_time": f"{response_time:.3f}s",
                        "message": f"{description} - endpoint not implemented",
                    },
                )
            else:
                self.log_result(
                    endpoint,
                    method,
                    "FAIL",
                    {
                        "status_code": status_code,
                        "response_time": f"{response_time:.3f}s",
                        "message": f"{description} failed",
                        "error": data,
                    },
                )

    def test_calendar_integration(self):
        """Test calendar integration endpoints"""
        print("\n=== Testing Calendar Integration ===")

        if not self.auth_token:
            print("   Skipping - no auth token available")
            return

        calendar_endpoints = [
            ("GET", "/api/v1/calendar", "Calendar base"),
            ("GET", "/api/v1/google-calendar-auth", "Google Calendar auth"),
        ]

        for method, endpoint, description in calendar_endpoints:
            status_code, data, response_time = self.make_request(method, endpoint)

            if status_code == 200:
                self.log_result(
                    endpoint,
                    method,
                    "PASS",
                    {
                        "status_code": status_code,
                        "response_time": f"{response_time:.3f}s",
                        "message": f"{description} successful",
                    },
                )
            elif status_code in [404, 405]:
                self.log_result(
                    endpoint,
                    method,
                    "WARNING",
                    {
                        "status_code": status_code,
                        "response_time": f"{response_time:.3f}s",
                        "message": f"{description} - endpoint not implemented or wrong method",
                    },
                )
            else:
                self.log_result(
                    endpoint,
                    method,
                    "FAIL",
                    {
                        "status_code": status_code,
                        "response_time": f"{response_time:.3f}s",
                        "message": f"{description} failed",
                        "error": data,
                    },
                )

    def test_error_handling(self):
        """Test error handling"""
        print("\n=== Testing Error Handling ===")

        # Test 404 for non-existent endpoint
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

        # Test CORS preflight
        status_code, data, response_time = self.make_request(
            "OPTIONS", "/api/v1/auth/token", headers={"Origin": "http://localhost:3000"}
        )

        if status_code == 200:
            self.log_result(
                "/api/v1/auth/token",
                "OPTIONS",
                "PASS",
                {
                    "status_code": status_code,
                    "response_time": f"{response_time:.3f}s",
                    "message": "CORS preflight handled correctly",
                },
            )
        else:
            self.log_result(
                "/api/v1/auth/token",
                "OPTIONS",
                "WARNING",
                {
                    "status_code": status_code,
                    "response_time": f"{response_time:.3f}s",
                    "message": "CORS preflight may not be properly configured",
                },
            )

    def test_security_features(self):
        """Test security features"""
        print("\n=== Testing Security Features ===")

        # Test accessing protected endpoint without auth
        old_token = self.auth_token
        self.auth_token = None

        status_code, data, response_time = self.make_request("GET", "/api/v1/barbers")

        if status_code == 401:
            self.log_result(
                "/api/v1/barbers",
                "GET",
                "PASS",
                {
                    "status_code": status_code,
                    "response_time": f"{response_time:.3f}s",
                    "message": "Unauthorized access properly blocked",
                },
            )
        else:
            self.log_result(
                "/api/v1/barbers",
                "GET",
                "WARNING",
                {
                    "status_code": status_code,
                    "response_time": f"{response_time:.3f}s",
                    "message": "Unauthorized access may not be properly blocked",
                    "details": f"Expected 401, got {status_code}",
                },
            )

        self.auth_token = old_token

        # Test rate limiting (make rapid requests)
        rate_limit_hit = False
        for i in range(10):
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
                {"message": "Rate limiting may not be configured (or limit is high)"},
            )

    def generate_report(self):
        """Generate comprehensive test report"""
        print("\n" + "=" * 80)
        print("BACKEND API TEST REPORT")
        print("=" * 80)

        # Count results
        total_tests = len(self.test_results)
        passed = sum(1 for r in self.test_results if r["status"] == "PASS")
        failed = sum(1 for r in self.test_results if r["status"] == "FAIL")
        warnings = sum(1 for r in self.test_results if r["status"] == "WARNING")

        print(f"\nTest Summary:")
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed} ({passed/total_tests*100:.1f}%)")
        print(f"Failed: {failed} ({failed/total_tests*100:.1f}%)")
        print(f"Warnings: {warnings} ({warnings/total_tests*100:.1f}%)")

        # Performance summary
        response_times = []
        for r in self.test_results:
            rt = r["details"].get("response_time", "0s")
            if isinstance(rt, str) and rt.endswith("s"):
                try:
                    response_times.append(float(rt[:-1]))
                except:
                    pass

        if response_times:
            avg_response_time = sum(response_times) / len(response_times)
            max_response_time = max(response_times)
            min_response_time = min(response_times)

            print(f"\nPerformance Metrics:")
            print(f"Average Response Time: {avg_response_time:.3f}s")
            print(f"Max Response Time: {max_response_time:.3f}s")
            print(f"Min Response Time: {min_response_time:.3f}s")

        # Critical failures
        critical_failures = [
            r
            for r in self.test_results
            if r["status"] == "FAIL"
            and "auth" in r["endpoint"]
            or "health" in r["endpoint"]
        ]

        if critical_failures:
            print(f"\nCRITICAL FAILURES ({len(critical_failures)}):")
            print("-" * 50)
            for result in critical_failures:
                print(f"- {result['method']} {result['endpoint']}")
                print(f"  Status: {result['details'].get('status_code')}")
                print(f"  Error: {result['details'].get('error')}")

        # System status assessment
        auth_working = any(
            r["status"] == "PASS" and "auth/token" in r["endpoint"]
            for r in self.test_results
        )
        health_working = any(
            r["status"] == "PASS" and "health" in r["endpoint"]
            for r in self.test_results
        )

        print(f"\nSystem Status Assessment:")
        print(
            f"Authentication System: {'✓ Working' if auth_working else '✗ Issues detected'}"
        )
        print(
            f"Health Monitoring: {'✓ Working' if health_working else '✗ Issues detected'}"
        )
        print(
            f"API Documentation: {'✓ Accessible' if any(r['status'] == 'PASS' and '/docs' in r['endpoint'] for r in self.test_results) else '✗ Not accessible'}"
        )

        # Save detailed report
        with open("actual_api_test_report.json", "w") as f:
            json.dump(
                {
                    "summary": {
                        "total_tests": total_tests,
                        "passed": passed,
                        "failed": failed,
                        "warnings": warnings,
                        "timestamp": datetime.now().isoformat(),
                        "auth_working": auth_working,
                        "health_working": health_working,
                    },
                    "results": self.test_results,
                },
                f,
                indent=2,
            )

        print(f"\nDetailed report saved to: actual_api_test_report.json")

    def run_all_tests(self):
        """Run all API tests"""
        print("Starting Targeted Backend API Testing...")
        print(f"Base URL: {self.base_url}")
        print("=" * 80)

        # Run test suites in logical order
        self.test_core_endpoints()
        self.test_authentication_system()
        self.test_business_data_endpoints()
        self.test_booking_endpoints()
        self.test_payment_endpoints()
        self.test_analytics_endpoints()
        self.test_calendar_integration()
        self.test_error_handling()
        self.test_security_features()

        # Generate report
        self.generate_report()


def main():
    """Main entry point"""
    import argparse

    parser = argparse.ArgumentParser(description="Targeted Backend API Testing")
    parser.add_argument(
        "--base-url", default="http://localhost:8000", help="Base URL for API"
    )
    parser.add_argument(
        "--suite",
        choices=["all", "core", "auth", "business", "booking", "payments"],
        default="all",
        help="Test suite to run",
    )

    args = parser.parse_args()

    tester = ActualAPITester(base_url=args.base_url)

    if args.suite == "all":
        tester.run_all_tests()
    elif args.suite == "core":
        tester.test_core_endpoints()
        tester.generate_report()
    elif args.suite == "auth":
        tester.test_authentication_system()
        tester.test_security_features()
        tester.generate_report()
    elif args.suite == "business":
        tester.test_authentication_system()  # Need auth first
        tester.test_business_data_endpoints()
        tester.generate_report()
    elif args.suite == "booking":
        tester.test_booking_endpoints()
        tester.generate_report()
    elif args.suite == "payments":
        tester.test_authentication_system()  # Need auth first
        tester.test_payment_endpoints()
        tester.generate_report()


if __name__ == "__main__":
    main()
