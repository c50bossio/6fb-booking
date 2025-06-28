#!/usr/bin/env python3
"""
Quick Customer API Integration Checker

This script checks for common API integration issues between
the frontend and backend customer portal.

Usage:
    python check_customer_api_integration.py
"""

import requests
import json
import sys
from datetime import datetime
from typing import Dict, List, Any

# Configuration
BACKEND_URL = "http://localhost:8000/api/v1"
FRONTEND_URL = "http://localhost:3000"


class APIIntegrationChecker:
    def __init__(self):
        self.issues = []
        self.warnings = []
        self.successes = []

    def log_issue(self, issue: str):
        """Log an integration issue"""
        self.issues.append(issue)
        print(f"❌ ISSUE: {issue}")

    def log_warning(self, warning: str):
        """Log a warning"""
        self.warnings.append(warning)
        print(f"⚠️  WARNING: {warning}")

    def log_success(self, success: str):
        """Log a success"""
        self.successes.append(success)
        print(f"✅ SUCCESS: {success}")

    def check_endpoint_exists(self, endpoint: str, method: str = "GET") -> bool:
        """Check if an endpoint exists"""
        url = f"{BACKEND_URL}{endpoint}"
        try:
            if method == "GET":
                response = requests.get(url)
            elif method == "POST":
                response = requests.post(url, json={})
            elif method == "PUT":
                response = requests.put(url, json={})
            else:
                response = requests.request(method, url)

            # 401 is OK - means endpoint exists but needs auth
            # 422 is OK - means endpoint exists but validation failed
            if response.status_code in [200, 201, 401, 422, 400]:
                return True
            elif response.status_code == 404:
                return False
            else:
                self.log_warning(
                    f"Endpoint {endpoint} returned unexpected status: {response.status_code}"
                )
                return True

        except requests.exceptions.ConnectionError:
            self.log_issue(f"Cannot connect to backend at {BACKEND_URL}")
            return False
        except Exception as e:
            self.log_warning(f"Error checking endpoint {endpoint}: {str(e)}")
            return False

    def check_cors_headers(self):
        """Check CORS configuration"""
        print("\n🔍 Checking CORS Configuration...")

        try:
            # Check OPTIONS request
            response = requests.options(
                f"{BACKEND_URL}/customer/auth/login",
                headers={
                    "Origin": FRONTEND_URL,
                    "Access-Control-Request-Method": "POST",
                    "Access-Control-Request-Headers": "content-type,authorization",
                },
            )

            cors_headers = {
                "Access-Control-Allow-Origin": response.headers.get(
                    "Access-Control-Allow-Origin"
                ),
                "Access-Control-Allow-Methods": response.headers.get(
                    "Access-Control-Allow-Methods"
                ),
                "Access-Control-Allow-Headers": response.headers.get(
                    "Access-Control-Allow-Headers"
                ),
                "Access-Control-Allow-Credentials": response.headers.get(
                    "Access-Control-Allow-Credentials"
                ),
            }

            # Check required CORS headers
            if cors_headers["Access-Control-Allow-Origin"] in ["*", FRONTEND_URL]:
                self.log_success("CORS origin header is properly configured")
            else:
                self.log_issue(f"CORS origin not configured for {FRONTEND_URL}")

            if (
                cors_headers["Access-Control-Allow-Methods"]
                and "POST" in cors_headers["Access-Control-Allow-Methods"]
            ):
                self.log_success("CORS methods are properly configured")
            else:
                self.log_issue("CORS methods not properly configured")

            if (
                cors_headers["Access-Control-Allow-Headers"]
                and "authorization"
                in cors_headers["Access-Control-Allow-Headers"].lower()
            ):
                self.log_success("CORS headers include authorization")
            else:
                self.log_warning("CORS headers might not include authorization header")

        except Exception as e:
            self.log_issue(f"Failed to check CORS: {str(e)}")

    def check_customer_auth_endpoints(self):
        """Check customer authentication endpoints"""
        print("\n🔍 Checking Customer Authentication Endpoints...")

        auth_endpoints = [
            ("/customer/auth/register", "POST"),
            ("/customer/auth/login", "POST"),
            ("/customer/auth/logout", "POST"),
            ("/customer/auth/me", "GET"),
            ("/customer/auth/profile", "PUT"),
            ("/customer/auth/forgot-password", "POST"),
            ("/customer/auth/reset-password", "POST"),
            ("/customer/auth/verify-email", "POST"),
            ("/customer/auth/resend-verification", "POST"),
            ("/customer/auth/change-password", "POST"),
        ]

        for endpoint, method in auth_endpoints:
            if self.check_endpoint_exists(endpoint, method):
                self.log_success(f"Endpoint {method} {endpoint} exists")
            else:
                self.log_issue(f"Missing endpoint: {method} {endpoint}")

    def check_customer_api_endpoints(self):
        """Check customer API endpoints"""
        print("\n🔍 Checking Customer API Endpoints...")

        api_endpoints = [
            ("/customer/stats", "GET"),
            ("/customer/appointments", "GET"),
            ("/customer/appointments/{id}", "GET"),
            ("/customer/appointments/{id}/reschedule", "PUT"),
            ("/customer/appointments/{id}/cancel", "PUT"),
            ("/customer/appointments/{id}/available-slots", "GET"),
            ("/customer/appointments/{id}/review", "POST"),
        ]

        for endpoint, method in api_endpoints:
            # Replace {id} with 1 for testing
            test_endpoint = endpoint.replace("{id}", "1")
            if self.check_endpoint_exists(test_endpoint, method):
                self.log_success(f"Endpoint {method} {endpoint} exists")
            else:
                self.log_issue(f"Missing endpoint: {method} {endpoint}")

    def check_response_formats(self):
        """Check API response formats"""
        print("\n🔍 Checking API Response Formats...")

        # Test login response format
        try:
            response = requests.post(
                f"{BACKEND_URL}/customer/auth/login",
                json={
                    "email": "test@example.com",
                    "password": "wrongpass",
                },  # pragma: allowlist secret
            )

            if response.status_code == 401:
                data = response.json()
                if "detail" in data:
                    self.log_success("Login error response has correct format")
                else:
                    self.log_warning(
                        "Login error response might not have 'detail' field"
                    )

        except Exception as e:
            self.log_warning(f"Could not check login response format: {str(e)}")

    def check_frontend_api_calls(self):
        """Check if frontend API configuration matches backend"""
        print("\n🔍 Checking Frontend API Configuration...")

        # Check if frontend is accessible
        try:
            response = requests.get(FRONTEND_URL)
            if response.status_code == 200:
                self.log_success("Frontend is accessible")
            else:
                self.log_warning(f"Frontend returned status {response.status_code}")
        except Exception as e:
            self.log_issue(f"Cannot connect to frontend at {FRONTEND_URL}: {str(e)}")

        # Check for common API configuration issues
        expected_api_patterns = [
            "/api/v1/customer/auth/",
            "/api/v1/customer/appointments",
            "/api/v1/customer/stats",
        ]

        self.log_success("Frontend should be configured to use these API patterns:")
        for pattern in expected_api_patterns:
            print(f"  - {BACKEND_URL[:-7]}{pattern}*")

    def check_authentication_flow(self):
        """Test a complete authentication flow"""
        print("\n🔍 Testing Complete Authentication Flow...")

        # Test registration
        test_email = f"integration_test_{datetime.now().timestamp()}@example.com"
        register_data = {
            "email": test_email,
            "password": "TestPass123!",  # pragma: allowlist secret
            "first_name": "Integration",
            "last_name": "Test",
        }

        try:
            # Register
            response = requests.post(
                f"{BACKEND_URL}/customer/auth/register", json=register_data
            )

            if response.status_code in [200, 201]:
                self.log_success("Customer registration successful")
                customer_id = response.json().get("id")

                # Login
                login_response = requests.post(
                    f"{BACKEND_URL}/customer/auth/login",
                    json={
                        "email": test_email,
                        "password": "TestPass123!",
                    },  # pragma: allowlist secret
                )

                if login_response.status_code == 200:
                    data = login_response.json()
                    if "access_token" in data and "customer" in data:
                        self.log_success(
                            "Customer login successful and returns correct data"
                        )
                        token = data["access_token"]

                        # Test authenticated endpoint
                        me_response = requests.get(
                            f"{BACKEND_URL}/customer/auth/me",
                            headers={"Authorization": f"Bearer {token}"},
                        )

                        if me_response.status_code == 200:
                            self.log_success("Authenticated endpoint access successful")
                        else:
                            self.log_issue("Cannot access authenticated endpoints")
                    else:
                        self.log_issue("Login response missing required fields")
                else:
                    self.log_issue(f"Login failed: {login_response.status_code}")

            elif response.status_code == 409:
                self.log_warning(
                    "Test user already exists (this is OK for repeat tests)"
                )
            else:
                self.log_issue(f"Registration failed: {response.status_code}")

        except Exception as e:
            self.log_issue(f"Authentication flow test failed: {str(e)}")

    def generate_report(self):
        """Generate final report"""
        print("\n" + "=" * 60)
        print("INTEGRATION CHECK SUMMARY")
        print("=" * 60)

        print(f"\n✅ Successes: {len(self.successes)}")
        print(f"⚠️  Warnings: {len(self.warnings)}")
        print(f"❌ Issues: {len(self.issues)}")

        if self.issues:
            print("\n🔧 ISSUES TO FIX:")
            for i, issue in enumerate(self.issues, 1):
                print(f"{i}. {issue}")

        if self.warnings:
            print("\n⚠️  WARNINGS TO REVIEW:")
            for i, warning in enumerate(self.warnings, 1):
                print(f"{i}. {warning}")

        # Recommendations
        print("\n📋 RECOMMENDATIONS:")

        if any("Missing endpoint" in issue for issue in self.issues):
            print("1. Implement missing API endpoints in the backend")

        if any("CORS" in issue for issue in self.issues):
            print("2. Update CORS configuration to allow frontend origin")

        if not self.issues:
            print(
                "✨ All API integrations look good! The customer portal should work correctly."
            )
        else:
            print(
                f"\n⚠️  Found {len(self.issues)} issues that need to be fixed for proper integration."
            )

        # Save report
        report = {
            "timestamp": datetime.now().isoformat(),
            "backend_url": BACKEND_URL,
            "frontend_url": FRONTEND_URL,
            "issues": self.issues,
            "warnings": self.warnings,
            "successes": self.successes,
        }

        filename = (
            f"api_integration_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        )
        with open(filename, "w") as f:
            json.dump(report, f, indent=2)

        print(f"\n📄 Detailed report saved to: {filename}")

    def run_all_checks(self):
        """Run all integration checks"""
        print("🔍 Customer Portal API Integration Checker")
        print(f"Backend: {BACKEND_URL}")
        print(f"Frontend: {FRONTEND_URL}")
        print("-" * 60)

        # Run checks
        self.check_cors_headers()
        self.check_customer_auth_endpoints()
        self.check_customer_api_endpoints()
        self.check_response_formats()
        self.check_frontend_api_calls()
        self.check_authentication_flow()

        # Generate report
        self.generate_report()


def main():
    """Main entry point"""
    checker = APIIntegrationChecker()
    checker.run_all_checks()


if __name__ == "__main__":
    main()
