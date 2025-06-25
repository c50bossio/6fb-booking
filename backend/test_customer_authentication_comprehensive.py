#!/usr/bin/env python3
"""
Comprehensive Customer Authentication System Test Suite
Tests all customer authentication endpoints and flows
"""

import requests
import json
import time
from datetime import datetime
from typing import Dict, Optional, List

# Test Configuration
BASE_URL = "http://localhost:8000"
CUSTOMER_API_BASE = f"{BASE_URL}/api/v1/customer"
HEADERS = {"Content-Type": "application/json"}


class CustomerAuthTester:
    def __init__(self):
        self.test_results = []
        self.test_customers = []
        self.auth_tokens = {}

    def log_test(
        self, test_name: str, success: bool, details: Dict = None, error: str = None
    ):
        """Log test results"""
        result = {
            "test_name": test_name,
            "success": success,
            "timestamp": datetime.now().isoformat(),
            "details": details or {},
            "error": error,
        }
        self.test_results.append(result)

        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {test_name}")

        if error:
            print(f"   Error: {error}")

        if details:
            print(f"   Details: {json.dumps(details, indent=2)}")

        print("-" * 60)

    def test_customer_registration(self):
        """Test customer registration endpoint"""
        print("\n🔐 Testing Customer Registration...")

        # Test 1: Valid registration
        valid_customer = {
            "email": f"test_customer_{int(time.time())}@example.com",
            "password": "SecurePassword123!",  # pragma: allowlist secret
            "first_name": "John",
            "last_name": "Doe",
            "phone": "+1234567890",
            "newsletter_subscription": True,
        }

        try:
            response = requests.post(
                f"{CUSTOMER_API_BASE}/auth/register",
                json=valid_customer,
                headers=HEADERS,
            )

            if response.status_code == 200:
                customer_data = response.json()
                self.test_customers.append(
                    {
                        "email": valid_customer["email"],
                        "password": valid_customer["password"],
                        "data": customer_data,
                    }
                )
                self.log_test(
                    "Customer Registration - Valid Data",
                    True,
                    {
                        "customer_id": customer_data.get("id"),
                        "email": customer_data.get("email"),
                    },
                )
            else:
                self.log_test(
                    "Customer Registration - Valid Data",
                    False,
                    {"status_code": response.status_code, "response": response.text},
                )

        except Exception as e:
            self.log_test("Customer Registration - Valid Data", False, error=str(e))

        # Test 2: Duplicate email registration
        try:
            response = requests.post(
                f"{CUSTOMER_API_BASE}/auth/register",
                json=valid_customer,  # Same email as above
                headers=HEADERS,
            )

            if response.status_code == 400:
                self.log_test("Customer Registration - Duplicate Email", True)
            else:
                self.log_test(
                    "Customer Registration - Duplicate Email",
                    False,
                    {"expected_status": 400, "actual_status": response.status_code},
                )

        except Exception as e:
            self.log_test(
                "Customer Registration - Duplicate Email", False, error=str(e)
            )

        # Test 3: Weak password
        weak_password_customer = {
            "email": f"weak_password_{int(time.time())}@example.com",
            "password": "123",
            "first_name": "Jane",
            "last_name": "Doe",
        }

        try:
            response = requests.post(
                f"{CUSTOMER_API_BASE}/auth/register",
                json=weak_password_customer,
                headers=HEADERS,
            )

            if response.status_code == 400:
                self.log_test("Customer Registration - Weak Password", True)
            else:
                self.log_test(
                    "Customer Registration - Weak Password",
                    False,
                    {"expected_status": 400, "actual_status": response.status_code},
                )

        except Exception as e:
            self.log_test("Customer Registration - Weak Password", False, error=str(e))

        # Test 4: Invalid email format
        invalid_email_customer = {
            "email": "invalid-email",
            "password": "SecurePassword123!",
            "first_name": "Bob",
            "last_name": "Smith",
        }

        try:
            response = requests.post(
                f"{CUSTOMER_API_BASE}/auth/register",
                json=invalid_email_customer,
                headers=HEADERS,
            )

            if response.status_code == 422:  # Pydantic validation error
                self.log_test("Customer Registration - Invalid Email", True)
            else:
                self.log_test(
                    "Customer Registration - Invalid Email",
                    False,
                    {"expected_status": 422, "actual_status": response.status_code},
                )

        except Exception as e:
            self.log_test("Customer Registration - Invalid Email", False, error=str(e))

    def test_customer_login(self):
        """Test customer login endpoint"""
        print("\n🔑 Testing Customer Login...")

        if not self.test_customers:
            self.log_test(
                "Customer Login - No Test Customers",
                False,
                error="No customers to test with",
            )
            return

        test_customer = self.test_customers[0]

        # Test 1: Valid login
        try:
            login_data = {
                "email": test_customer["email"],
                "password": test_customer["password"],
            }

            response = requests.post(
                f"{CUSTOMER_API_BASE}/auth/login", json=login_data, headers=HEADERS
            )

            if response.status_code == 200:
                token_data = response.json()
                self.auth_tokens[test_customer["email"]] = token_data["access_token"]
                self.log_test(
                    "Customer Login - Valid Credentials",
                    True,
                    {
                        "token_type": token_data.get("token_type"),
                        "has_token": bool(token_data.get("access_token")),
                        "customer_id": token_data.get("customer", {}).get("id"),
                    },
                )
            else:
                self.log_test(
                    "Customer Login - Valid Credentials",
                    False,
                    {"status_code": response.status_code, "response": response.text},
                )

        except Exception as e:
            self.log_test("Customer Login - Valid Credentials", False, error=str(e))

        # Test 2: Invalid password
        try:
            login_data = {
                "email": test_customer["email"],
                "password": "WrongPassword123!",  # pragma: allowlist secret
            }

            response = requests.post(
                f"{CUSTOMER_API_BASE}/auth/login", json=login_data, headers=HEADERS
            )

            if response.status_code == 401:
                self.log_test("Customer Login - Invalid Password", True)
            else:
                self.log_test(
                    "Customer Login - Invalid Password",
                    False,
                    {"expected_status": 401, "actual_status": response.status_code},
                )

        except Exception as e:
            self.log_test("Customer Login - Invalid Password", False, error=str(e))

        # Test 3: Non-existent email
        try:
            login_data = {
                "email": "nonexistent@example.com",
                "password": "AnyPassword123!",  # pragma: allowlist secret
            }

            response = requests.post(
                f"{CUSTOMER_API_BASE}/auth/login", json=login_data, headers=HEADERS
            )

            if response.status_code == 401:
                self.log_test("Customer Login - Non-existent Email", True)
            else:
                self.log_test(
                    "Customer Login - Non-existent Email",
                    False,
                    {"expected_status": 401, "actual_status": response.status_code},
                )

        except Exception as e:
            self.log_test("Customer Login - Non-existent Email", False, error=str(e))

    def test_protected_routes(self):
        """Test protected customer routes"""
        print("\n🛡️ Testing Protected Routes...")

        if not self.auth_tokens:
            self.log_test(
                "Protected Routes - No Auth Tokens",
                False,
                error="No auth tokens available",
            )
            return

        email = list(self.auth_tokens.keys())[0]
        token = self.auth_tokens[email]
        auth_headers = {**HEADERS, "Authorization": f"Bearer {token}"}

        # Test 1: Get customer profile
        try:
            response = requests.get(
                f"{CUSTOMER_API_BASE}/auth/me", headers=auth_headers
            )

            if response.status_code == 200:
                profile_data = response.json()
                self.log_test(
                    "Protected Routes - Get Profile",
                    True,
                    {
                        "email": profile_data.get("email"),
                        "first_name": profile_data.get("first_name"),
                        "last_name": profile_data.get("last_name"),
                    },
                )
            else:
                self.log_test(
                    "Protected Routes - Get Profile",
                    False,
                    {"status_code": response.status_code, "response": response.text},
                )

        except Exception as e:
            self.log_test("Protected Routes - Get Profile", False, error=str(e))

        # Test 2: Update profile
        try:
            update_data = {
                "first_name": "Updated",
                "phone": "+1987654321",
                "newsletter_subscription": False,
            }

            response = requests.put(
                f"{CUSTOMER_API_BASE}/auth/profile",
                json=update_data,
                headers=auth_headers,
            )

            if response.status_code == 200:
                updated_profile = response.json()
                self.log_test(
                    "Protected Routes - Update Profile",
                    True,
                    {
                        "first_name": updated_profile.get("first_name"),
                        "phone": updated_profile.get("phone"),
                        "newsletter_subscription": updated_profile.get(
                            "newsletter_subscription"
                        ),
                    },
                )
            else:
                self.log_test(
                    "Protected Routes - Update Profile",
                    False,
                    {"status_code": response.status_code, "response": response.text},
                )

        except Exception as e:
            self.log_test("Protected Routes - Update Profile", False, error=str(e))

        # Test 3: Access with invalid token
        try:
            invalid_auth_headers = {
                **HEADERS,
                "Authorization": "Bearer invalid_token_here",
            }

            response = requests.get(
                f"{CUSTOMER_API_BASE}/auth/me", headers=invalid_auth_headers
            )

            if response.status_code == 401:
                self.log_test("Protected Routes - Invalid Token", True)
            else:
                self.log_test(
                    "Protected Routes - Invalid Token",
                    False,
                    {"expected_status": 401, "actual_status": response.status_code},
                )

        except Exception as e:
            self.log_test("Protected Routes - Invalid Token", False, error=str(e))

        # Test 4: Access without token
        try:
            response = requests.get(
                f"{CUSTOMER_API_BASE}/auth/me",
                headers=HEADERS,  # No Authorization header
            )

            if response.status_code == 403:  # HTTPBearer returns 403 when no token
                self.log_test("Protected Routes - No Token", True)
            else:
                self.log_test(
                    "Protected Routes - No Token",
                    False,
                    {"expected_status": 403, "actual_status": response.status_code},
                )

        except Exception as e:
            self.log_test("Protected Routes - No Token", False, error=str(e))

    def test_password_reset_flow(self):
        """Test password reset functionality"""
        print("\n🔄 Testing Password Reset Flow...")

        if not self.test_customers:
            self.log_test(
                "Password Reset - No Test Customers",
                False,
                error="No customers to test with",
            )
            return

        test_customer = self.test_customers[0]

        # Test 1: Request password reset
        try:
            reset_request = {"email": test_customer["email"]}

            response = requests.post(
                f"{CUSTOMER_API_BASE}/auth/forgot-password",
                json=reset_request,
                headers=HEADERS,
            )

            if response.status_code == 200:
                self.log_test("Password Reset - Request Reset", True)
            else:
                self.log_test(
                    "Password Reset - Request Reset",
                    False,
                    {"status_code": response.status_code, "response": response.text},
                )

        except Exception as e:
            self.log_test("Password Reset - Request Reset", False, error=str(e))

        # Test 2: Request reset for non-existent email
        try:
            reset_request = {"email": "nonexistent@example.com"}

            response = requests.post(
                f"{CUSTOMER_API_BASE}/auth/forgot-password",
                json=reset_request,
                headers=HEADERS,
            )

            # Should still return 200 for security (not revealing if email exists)
            if response.status_code == 200:
                self.log_test("Password Reset - Non-existent Email", True)
            else:
                self.log_test(
                    "Password Reset - Non-existent Email",
                    False,
                    {"expected_status": 200, "actual_status": response.status_code},
                )

        except Exception as e:
            self.log_test("Password Reset - Non-existent Email", False, error=str(e))

        # Test 3: Change password (authenticated)
        if test_customer["email"] in self.auth_tokens:
            try:
                auth_headers = {
                    **HEADERS,
                    "Authorization": f"Bearer {self.auth_tokens[test_customer['email']]}",
                }

                change_password_data = {
                    "old_password": test_customer["password"],
                    "new_password": "NewSecurePassword123!",  # pragma: allowlist secret
                }

                response = requests.post(
                    f"{CUSTOMER_API_BASE}/auth/change-password",
                    json=change_password_data,
                    headers=auth_headers,
                )

                if response.status_code == 200:
                    # Update password in test data
                    test_customer["password"] = "NewSecurePassword123!"
                    self.log_test("Password Reset - Change Password", True)
                else:
                    self.log_test(
                        "Password Reset - Change Password",
                        False,
                        {
                            "status_code": response.status_code,
                            "response": response.text,
                        },
                    )

            except Exception as e:
                self.log_test("Password Reset - Change Password", False, error=str(e))

    def test_customer_logout(self):
        """Test customer logout"""
        print("\n🚪 Testing Customer Logout...")

        if not self.auth_tokens:
            self.log_test(
                "Customer Logout - No Auth Tokens",
                False,
                error="No auth tokens available",
            )
            return

        email = list(self.auth_tokens.keys())[0]
        token = self.auth_tokens[email]
        auth_headers = {**HEADERS, "Authorization": f"Bearer {token}"}

        try:
            response = requests.post(
                f"{CUSTOMER_API_BASE}/auth/logout", headers=auth_headers
            )

            if response.status_code == 200:
                self.log_test("Customer Logout", True)
            else:
                self.log_test(
                    "Customer Logout",
                    False,
                    {"status_code": response.status_code, "response": response.text},
                )

        except Exception as e:
            self.log_test("Customer Logout", False, error=str(e))

    def create_additional_test_customers(self):
        """Create additional test customers for comprehensive testing"""
        print("\n👥 Creating Additional Test Customers...")

        additional_customers = [
            {
                "email": f"sarah_johnson_{int(time.time())}@example.com",
                "password": "SecurePassword123!",  # pragma: allowlist secret
                "first_name": "Sarah",
                "last_name": "Johnson",
                "phone": "+1555123456",
                "newsletter_subscription": True,
            },
            {
                "email": f"mike_wilson_{int(time.time())}@example.com",
                "password": "AnotherSecure456!",  # pragma: allowlist secret
                "first_name": "Mike",
                "last_name": "Wilson",
                "phone": "+1555987654",
                "newsletter_subscription": False,
            },
            {
                "email": f"emma_brown_{int(time.time())}@example.com",
                "password": "SuperSecure789!",  # pragma: allowlist secret
                "first_name": "Emma",
                "last_name": "Brown",
                "newsletter_subscription": True,
            },
        ]

        for customer_data in additional_customers:
            try:
                response = requests.post(
                    f"{CUSTOMER_API_BASE}/auth/register",
                    json=customer_data,
                    headers=HEADERS,
                )

                if response.status_code == 200:
                    customer_response = response.json()
                    self.test_customers.append(
                        {
                            "email": customer_data["email"],
                            "password": customer_data["password"],
                            "data": customer_response,
                        }
                    )
                    self.log_test(
                        f"Create Additional Customer - {customer_data['first_name']} {customer_data['last_name']}",
                        True,
                        {"customer_id": customer_response.get("id")},
                    )

                    # Also login to get token
                    login_response = requests.post(
                        f"{CUSTOMER_API_BASE}/auth/login",
                        json={
                            "email": customer_data["email"],
                            "password": customer_data["password"],
                        },
                        headers=HEADERS,
                    )

                    if login_response.status_code == 200:
                        token_data = login_response.json()
                        self.auth_tokens[customer_data["email"]] = token_data[
                            "access_token"
                        ]

                else:
                    self.log_test(
                        f"Create Additional Customer - {customer_data['first_name']} {customer_data['last_name']}",
                        False,
                        {
                            "status_code": response.status_code,
                            "response": response.text,
                        },
                    )

            except Exception as e:
                self.log_test(
                    f"Create Additional Customer - {customer_data['first_name']} {customer_data['last_name']}",
                    False,
                    error=str(e),
                )

    def run_all_tests(self):
        """Run all customer authentication tests"""
        print("\n" + "=" * 80)
        print("🧪 CUSTOMER AUTHENTICATION COMPREHENSIVE TEST SUITE")
        print("=" * 80)

        # Check if server is running by trying a simple endpoint
        print("🔍 Checking server connectivity...")
        server_running = False
        try:
            # Try to reach any endpoint that should work
            response = requests.post(
                f"{CUSTOMER_API_BASE}/auth/register",
                json={},
                headers=HEADERS,
                timeout=5,
            )
            # Even if it returns an error, the server is responding
            server_running = True
            print("✅ Server is running and accessible")
        except Exception as e:
            print(f"❌ Cannot connect to server: {str(e)}")
            return

        print()

        # Run all test suites
        self.test_customer_registration()
        self.test_customer_login()
        self.test_protected_routes()
        self.test_password_reset_flow()
        self.test_customer_logout()
        self.create_additional_test_customers()

        # Generate summary report
        self.generate_summary_report()

    def generate_summary_report(self):
        """Generate and save test summary report"""
        print("\n" + "=" * 80)
        print("📊 TEST SUMMARY REPORT")
        print("=" * 80)

        total_tests = len(self.test_results)
        passed_tests = len([r for r in self.test_results if r["success"]])
        failed_tests = total_tests - passed_tests

        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests} ✅")
        print(f"Failed: {failed_tests} ❌")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")

        print("\n📋 DETAILED RESULTS:")
        for result in self.test_results:
            status = "✅" if result["success"] else "❌"
            print(f"{status} {result['test_name']}")
            if result["error"]:
                print(f"    Error: {result['error']}")

        print(f"\n👥 Test Customers Created: {len(self.test_customers)}")
        for customer in self.test_customers:
            print(
                f"  - {customer['data'].get('first_name', 'N/A')} {customer['data'].get('last_name', 'N/A')} ({customer['email']})"
            )

        # Save detailed report to file
        report_filename = (
            f"customer_auth_test_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        )
        report_data = {
            "test_summary": {
                "total_tests": total_tests,
                "passed_tests": passed_tests,
                "failed_tests": failed_tests,
                "success_rate": (passed_tests / total_tests) * 100,
                "test_timestamp": datetime.now().isoformat(),
            },
            "test_results": self.test_results,
            "test_customers": [
                {"email": customer["email"], "customer_data": customer["data"]}
                for customer in self.test_customers
            ],
        }

        with open(report_filename, "w") as f:
            json.dump(report_data, f, indent=2)

        print(f"\n💾 Detailed report saved to: {report_filename}")
        print("=" * 80)


if __name__ == "__main__":
    tester = CustomerAuthTester()
    tester.run_all_tests()
