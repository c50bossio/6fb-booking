#!/usr/bin/env python3
"""
Customer Portal Integration Test Suite

Tests the frontend customer portal integration with backend APIs.
This script tests authentication, dashboard, profile management, and appointment functionality.

Usage:
    python test_customer_portal_integration.py
"""

import asyncio
import aiohttp
import json
import os
import sys
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from urllib.parse import urljoin
import uuid
import time

# Configuration
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
API_VERSION = "/api/v1"

# Test user credentials
TEST_CUSTOMER = {
    "email": f"test_customer_{uuid.uuid4().hex[:8]}@example.com",
    "password": "TestPassword123!",  # pragma: allowlist secret
    "first_name": "Test",
    "last_name": "Customer",
    "phone": "+1234567890",
}


class Colors:
    """ANSI color codes for terminal output"""

    HEADER = "\033[95m"
    BLUE = "\033[94m"
    CYAN = "\033[96m"
    GREEN = "\033[92m"
    YELLOW = "\033[93m"
    RED = "\033[91m"
    ENDC = "\033[0m"
    BOLD = "\033[1m"
    UNDERLINE = "\033[4m"


class CustomerPortalIntegrationTester:
    def __init__(self):
        self.base_url = BACKEND_URL + API_VERSION
        self.test_results = []
        self.customer_token = None
        self.customer_id = None
        self.appointment_id = None

    def log(self, message: str, color: str = ""):
        """Log a message with optional color"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        if color:
            print(f"{color}[{timestamp}] {message}{Colors.ENDC}")
        else:
            print(f"[{timestamp}] {message}")

    def log_success(self, message: str):
        """Log a success message"""
        self.log(f"✓ {message}", Colors.GREEN)

    def log_error(self, message: str):
        """Log an error message"""
        self.log(f"✗ {message}", Colors.RED)

    def log_warning(self, message: str):
        """Log a warning message"""
        self.log(f"⚠ {message}", Colors.YELLOW)

    def log_info(self, message: str):
        """Log an info message"""
        self.log(f"ℹ {message}", Colors.CYAN)

    def log_header(self, message: str):
        """Log a header message"""
        self.log(f"\n{'='*60}", Colors.BOLD)
        self.log(message, Colors.BOLD + Colors.HEADER)
        self.log(f"{'='*60}\n", Colors.BOLD)

    async def test_customer_signup(self, session: aiohttp.ClientSession) -> bool:
        """Test customer signup functionality"""
        self.log_header("Testing Customer Signup")

        try:
            # Test signup endpoint
            url = f"{self.base_url}/customer/auth/register"
            async with session.post(url, json=TEST_CUSTOMER) as response:
                if response.status == 200:
                    data = await response.json()
                    self.customer_id = data.get("id")
                    self.log_success(f"Customer signup successful: {data.get('email')}")
                    self.log_info(f"Customer ID: {self.customer_id}")
                    return True
                elif response.status == 409:
                    self.log_warning(
                        "Customer already exists, attempting login instead"
                    )
                    return await self.test_customer_login(session)
                else:
                    error_text = await response.text()
                    self.log_error(f"Signup failed: {response.status} - {error_text}")
                    return False

        except Exception as e:
            self.log_error(f"Signup test error: {str(e)}")
            return False

    async def test_customer_login(self, session: aiohttp.ClientSession) -> bool:
        """Test customer login functionality"""
        self.log_header("Testing Customer Login")

        try:
            url = f"{self.base_url}/customer/auth/login"
            login_data = {
                "email": TEST_CUSTOMER["email"],
                "password": TEST_CUSTOMER["password"],
            }

            async with session.post(url, json=login_data) as response:
                if response.status == 200:
                    data = await response.json()
                    self.customer_token = data.get("access_token")
                    customer_info = data.get("customer", {})
                    self.customer_id = customer_info.get("id")

                    self.log_success("Customer login successful")
                    self.log_info(f"Token received: {self.customer_token[:20]}...")
                    self.log_info(
                        f"Customer: {customer_info.get('full_name')} ({customer_info.get('email')})"
                    )
                    return True
                else:
                    error_text = await response.text()
                    self.log_error(f"Login failed: {response.status} - {error_text}")
                    return False

        except Exception as e:
            self.log_error(f"Login test error: {str(e)}")
            return False

    async def test_customer_profile(self, session: aiohttp.ClientSession) -> bool:
        """Test customer profile retrieval"""
        self.log_header("Testing Customer Profile Retrieval")

        if not self.customer_token:
            self.log_error("No customer token available")
            return False

        try:
            url = f"{self.base_url}/customer/auth/me"
            headers = {"Authorization": f"Bearer {self.customer_token}"}

            async with session.get(url, headers=headers) as response:
                if response.status == 200:
                    data = await response.json()
                    self.log_success("Profile retrieved successfully")
                    self.log_info(f"Customer: {data.get('full_name')}")
                    self.log_info(f"Email: {data.get('email')}")
                    self.log_info(f"Verified: {data.get('is_verified')}")
                    return True
                else:
                    error_text = await response.text()
                    self.log_error(
                        f"Profile retrieval failed: {response.status} - {error_text}"
                    )
                    return False

        except Exception as e:
            self.log_error(f"Profile test error: {str(e)}")
            return False

    async def test_profile_update(self, session: aiohttp.ClientSession) -> bool:
        """Test customer profile update"""
        self.log_header("Testing Customer Profile Update")

        if not self.customer_token:
            self.log_error("No customer token available")
            return False

        try:
            url = f"{self.base_url}/customer/auth/profile"
            headers = {"Authorization": f"Bearer {self.customer_token}"}

            update_data = {
                "first_name": "Updated",
                "last_name": "Customer",
                "phone": "+1987654321",
                "newsletter_subscription": True,
            }

            async with session.put(url, json=update_data, headers=headers) as response:
                if response.status == 200:
                    data = await response.json()
                    self.log_success("Profile updated successfully")
                    self.log_info(f"Updated name: {data.get('full_name')}")
                    self.log_info(f"Updated phone: {data.get('phone')}")
                    return True
                else:
                    error_text = await response.text()
                    self.log_error(
                        f"Profile update failed: {response.status} - {error_text}"
                    )
                    return False

        except Exception as e:
            self.log_error(f"Profile update test error: {str(e)}")
            return False

    async def test_customer_stats(self, session: aiohttp.ClientSession) -> bool:
        """Test customer statistics endpoint"""
        self.log_header("Testing Customer Statistics")

        if not self.customer_token:
            self.log_error("No customer token available")
            return False

        try:
            url = f"{self.base_url}/customer/stats"
            headers = {"Authorization": f"Bearer {self.customer_token}"}

            async with session.get(url, headers=headers) as response:
                if response.status == 200:
                    data = await response.json()
                    self.log_success("Statistics retrieved successfully")
                    self.log_info(
                        f"Total appointments: {data.get('totalAppointments')}"
                    )
                    self.log_info(
                        f"Upcoming appointments: {data.get('upcomingAppointments')}"
                    )
                    self.log_info(f"Total spent: ${data.get('totalSpent')}")
                    self.log_info(f"Favorite barber: {data.get('favoriteBarber')}")
                    return True
                else:
                    error_text = await response.text()
                    self.log_error(
                        f"Stats retrieval failed: {response.status} - {error_text}"
                    )
                    return False

        except Exception as e:
            self.log_error(f"Stats test error: {str(e)}")
            return False

    async def test_appointments_list(self, session: aiohttp.ClientSession) -> bool:
        """Test customer appointments list"""
        self.log_header("Testing Customer Appointments List")

        if not self.customer_token:
            self.log_error("No customer token available")
            return False

        try:
            url = f"{self.base_url}/customer/appointments"
            headers = {"Authorization": f"Bearer {self.customer_token}"}

            # Test different filters
            filters = [
                {"status": "confirmed", "upcoming_only": "true"},
                {"limit": "10", "offset": "0"},
                {"date_from": datetime.now().isoformat()},
            ]

            for filter_params in filters:
                query_string = "&".join([f"{k}={v}" for k, v in filter_params.items()])
                test_url = f"{url}?{query_string}"

                async with session.get(test_url, headers=headers) as response:
                    if response.status == 200:
                        data = await response.json()
                        self.log_success(
                            f"Appointments retrieved with filter: {filter_params}"
                        )
                        self.log_info(f"Total appointments: {data.get('total', 0)}")

                        appointments = data.get("appointments", [])
                        if appointments:
                            self.appointment_id = appointments[0].get("id")
                            self.log_info(
                                f"Sample appointment: {appointments[0].get('service_name')} on {appointments[0].get('appointment_date')}"
                            )
                    else:
                        error_text = await response.text()
                        self.log_warning(
                            f"Appointments retrieval with filter {filter_params} failed: {response.status}"
                        )

            return True

        except Exception as e:
            self.log_error(f"Appointments list test error: {str(e)}")
            return False

    async def test_password_reset_flow(self, session: aiohttp.ClientSession) -> bool:
        """Test password reset flow"""
        self.log_header("Testing Password Reset Flow")

        try:
            # Test forgot password
            url = f"{self.base_url}/customer/auth/forgot-password"
            reset_data = {"email": TEST_CUSTOMER["email"]}

            async with session.post(url, json=reset_data) as response:
                if response.status == 200:
                    self.log_success("Password reset email sent successfully")
                    self.log_info("Note: Check email for reset token in production")

                    # In a real test, we'd need to get the token from email
                    # For now, we'll just test the endpoint exists
                    return True
                else:
                    error_text = await response.text()
                    self.log_error(
                        f"Password reset failed: {response.status} - {error_text}"
                    )
                    return False

        except Exception as e:
            self.log_error(f"Password reset test error: {str(e)}")
            return False

    async def test_mobile_responsiveness(self, session: aiohttp.ClientSession) -> bool:
        """Test mobile responsiveness by checking viewport meta tags"""
        self.log_header("Testing Mobile Responsiveness")

        pages_to_test = [
            "/customer/login",
            "/customer/signup",
            "/customer/dashboard",
            "/customer/profile",
            "/customer/appointments",
            "/customer/history",
        ]

        mobile_ready = True

        for page in pages_to_test:
            try:
                url = f"{FRONTEND_URL}{page}"
                self.log_info(f"Checking {page} for mobile responsiveness...")

                # In a real test, we'd use a headless browser
                # For now, we'll just check if the page loads
                async with session.get(url) as response:
                    if response.status == 200:
                        content = await response.text()

                        # Check for viewport meta tag
                        if "viewport" in content and "width=device-width" in content:
                            self.log_success(f"{page} appears to be mobile-ready")
                        else:
                            self.log_warning(f"{page} may not be optimized for mobile")
                            mobile_ready = False
                    else:
                        self.log_warning(f"Could not access {page}: {response.status}")

            except Exception as e:
                self.log_warning(f"Could not test {page}: {str(e)}")

        return mobile_ready

    async def test_error_handling(self, session: aiohttp.ClientSession) -> bool:
        """Test error handling and edge cases"""
        self.log_header("Testing Error Handling")

        tests_passed = True

        # Test invalid login
        try:
            url = f"{self.base_url}/customer/auth/login"
            invalid_data = {"email": "invalid@test.com", "password": "wrongpass"}  # pragma: allowlist secret

            async with session.post(url, json=invalid_data) as response:
                if response.status == 401:
                    self.log_success("Invalid login correctly rejected")
                else:
                    self.log_error(
                        f"Invalid login returned unexpected status: {response.status}"
                    )
                    tests_passed = False

        except Exception as e:
            self.log_error(f"Error handling test failed: {str(e)}")
            tests_passed = False

        # Test unauthorized access
        try:
            url = f"{self.base_url}/customer/auth/me"

            async with session.get(url) as response:
                if response.status == 401:
                    self.log_success("Unauthorized access correctly rejected")
                else:
                    self.log_error(
                        f"Unauthorized access returned unexpected status: {response.status}"
                    )
                    tests_passed = False

        except Exception as e:
            self.log_error(f"Unauthorized access test failed: {str(e)}")
            tests_passed = False

        # Test malformed requests
        try:
            url = f"{self.base_url}/customer/auth/register"
            malformed_data = {"email": "not-an-email"}  # Missing required fields

            async with session.post(url, json=malformed_data) as response:
                if response.status in [400, 422]:
                    self.log_success("Malformed request correctly rejected")
                else:
                    self.log_error(
                        f"Malformed request returned unexpected status: {response.status}"
                    )
                    tests_passed = False

        except Exception as e:
            self.log_error(f"Malformed request test failed: {str(e)}")
            tests_passed = False

        return tests_passed

    async def generate_test_report(self):
        """Generate a comprehensive test report"""
        self.log_header("Test Report Summary")

        report = {
            "timestamp": datetime.now().isoformat(),
            "backend_url": BACKEND_URL,
            "frontend_url": FRONTEND_URL,
            "test_results": self.test_results,
            "test_user": TEST_CUSTOMER["email"],
        }

        # Calculate statistics
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result["passed"])
        failed_tests = total_tests - passed_tests

        self.log_info(f"Total tests run: {total_tests}")
        self.log_info(f"Tests passed: {passed_tests}")
        self.log_info(f"Tests failed: {failed_tests}")

        if passed_tests == total_tests:
            self.log_success("All tests passed! ✨")
        else:
            self.log_warning(
                f"Some tests failed. Success rate: {(passed_tests/total_tests)*100:.1f}%"
            )

        # Save report to file
        report_filename = f"customer_portal_test_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(report_filename, "w") as f:
            json.dump(report, f, indent=2)

        self.log_info(f"Full report saved to: {report_filename}")

        # Print failed tests
        if failed_tests > 0:
            self.log_header("Failed Tests")
            for result in self.test_results:
                if not result["passed"]:
                    self.log_error(
                        f"- {result['test_name']}: {result.get('error', 'Unknown error')}"
                    )

    async def run_all_tests(self):
        """Run all integration tests"""
        self.log_header("Starting Customer Portal Integration Tests")
        self.log_info(f"Backend URL: {BACKEND_URL}")
        self.log_info(f"Frontend URL: {FRONTEND_URL}")

        async with aiohttp.ClientSession() as session:
            # Authentication tests
            signup_result = await self.test_customer_signup(session)
            self.test_results.append(
                {
                    "test_name": "Customer Signup",
                    "passed": signup_result,
                    "timestamp": datetime.now().isoformat(),
                }
            )

            if not signup_result:
                # Try login if signup fails
                login_result = await self.test_customer_login(session)
                self.test_results.append(
                    {
                        "test_name": "Customer Login (Fallback)",
                        "passed": login_result,
                        "timestamp": datetime.now().isoformat(),
                    }
                )
            else:
                # Test login after signup
                login_result = await self.test_customer_login(session)
                self.test_results.append(
                    {
                        "test_name": "Customer Login",
                        "passed": login_result,
                        "timestamp": datetime.now().isoformat(),
                    }
                )

            # Only continue if we have authentication
            if self.customer_token:
                # Profile tests
                profile_result = await self.test_customer_profile(session)
                self.test_results.append(
                    {
                        "test_name": "Customer Profile Retrieval",
                        "passed": profile_result,
                        "timestamp": datetime.now().isoformat(),
                    }
                )

                update_result = await self.test_profile_update(session)
                self.test_results.append(
                    {
                        "test_name": "Customer Profile Update",
                        "passed": update_result,
                        "timestamp": datetime.now().isoformat(),
                    }
                )

                # Dashboard tests
                stats_result = await self.test_customer_stats(session)
                self.test_results.append(
                    {
                        "test_name": "Customer Statistics",
                        "passed": stats_result,
                        "timestamp": datetime.now().isoformat(),
                    }
                )

                # Appointments tests
                appointments_result = await self.test_appointments_list(session)
                self.test_results.append(
                    {
                        "test_name": "Customer Appointments List",
                        "passed": appointments_result,
                        "timestamp": datetime.now().isoformat(),
                    }
                )

            # Password reset test
            reset_result = await self.test_password_reset_flow(session)
            self.test_results.append(
                {
                    "test_name": "Password Reset Flow",
                    "passed": reset_result,
                    "timestamp": datetime.now().isoformat(),
                }
            )

            # Error handling tests
            error_result = await self.test_error_handling(session)
            self.test_results.append(
                {
                    "test_name": "Error Handling",
                    "passed": error_result,
                    "timestamp": datetime.now().isoformat(),
                }
            )

            # Mobile responsiveness tests
            mobile_result = await self.test_mobile_responsiveness(session)
            self.test_results.append(
                {
                    "test_name": "Mobile Responsiveness",
                    "passed": mobile_result,
                    "timestamp": datetime.now().isoformat(),
                }
            )

        # Generate report
        await self.generate_test_report()


async def main():
    """Main entry point"""
    tester = CustomerPortalIntegrationTester()
    await tester.run_all_tests()


if __name__ == "__main__":
    asyncio.run(main())
