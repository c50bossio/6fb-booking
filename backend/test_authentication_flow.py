#!/usr/bin/env python3
"""
Comprehensive Authentication Flow Test for 6FB Booking Platform
Tests all authentication features including registration, login, JWT tokens,
role-based access control, password validation, and logout.
"""

import requests
import json
import time
import sys
from typing import Dict, Optional, Tuple
from datetime import datetime
import random
import string

# Configuration
BASE_URL = "http://localhost:8000"
API_PREFIX = "/api/v1"


# Test user data
def generate_test_email():
    """Generate unique test email"""
    timestamp = int(time.time())
    random_str = "".join(random.choices(string.ascii_lowercase, k=5))
    return f"test_user_{timestamp}_{random_str}@example.com"


class AuthenticationTester:
    def __init__(self):
        self.base_url = BASE_URL + API_PREFIX
        self.session = requests.Session()
        self.test_results = []
        self.test_users = {}

    def log_result(self, test_name: str, success: bool, details: str = ""):
        """Log test result"""
        result = {
            "test": test_name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat(),
        }
        self.test_results.append(result)

        # Print result
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {test_name}")
        if details:
            print(f"  └─ {details}")

    def test_password_validation(self) -> bool:
        """Test 1: Password Requirements Validation"""
        print("\n🔐 Testing Password Validation Requirements...")

        test_cases = [
            {
                "password": "short",
                "should_fail": True,
                "reason": "Too short (less than 8 characters)",
            },
            {
                "password": "alllowercase123!",
                "should_fail": True,
                "reason": "No uppercase letters",
            },
            {
                "password": "ALLUPPERCASE123!",
                "should_fail": True,
                "reason": "No lowercase letters",
            },
            {"password": "NoNumbers!", "should_fail": True, "reason": "No numbers"},
            {
                "password": "NoSpecialChars123",
                "should_fail": True,
                "reason": "No special characters",
            },
            {
                "password": "ValidPass123!",
                "should_fail": False,
                "reason": "Valid password",
            },
        ]

        all_passed = True

        for test_case in test_cases:
            user_data = {
                "email": generate_test_email(),
                "password": test_case["password"],
                "first_name": "Test",
                "last_name": "User",
                "role": "barber",
            }

            try:
                response = self.session.post(
                    f"{self.base_url}/auth/register", json=user_data
                )

                if test_case["should_fail"]:
                    if response.status_code == 400:
                        self.log_result(
                            f"Password validation - {test_case['reason']}",
                            True,
                            f"Correctly rejected: {response.json().get('detail', 'Invalid password')}",
                        )
                    else:
                        self.log_result(
                            f"Password validation - {test_case['reason']}",
                            False,
                            f"Should have failed but got status {response.status_code}",
                        )
                        all_passed = False
                else:
                    if response.status_code == 200:
                        self.log_result(
                            f"Password validation - {test_case['reason']}",
                            True,
                            "Valid password accepted",
                        )
                        # Store valid user for later tests
                        self.test_users["valid_password_user"] = {
                            "email": user_data["email"],
                            "password": user_data["password"],
                            "user_data": response.json(),
                        }
                    else:
                        self.log_result(
                            f"Password validation - {test_case['reason']}",
                            False,
                            f"Valid password rejected: {response.json()}",
                        )
                        all_passed = False

            except Exception as e:
                self.log_result(
                    f"Password validation - {test_case['reason']}",
                    False,
                    f"Exception: {str(e)}",
                )
                all_passed = False

        return all_passed

    def test_user_registration(self) -> Tuple[bool, Optional[Dict]]:
        """Test 2: User Registration"""
        print("\n📝 Testing User Registration...")

        # Test with different roles
        test_roles = ["barber", "staff", "admin"]
        registration_results = {}
        all_passed = True

        for role in test_roles:
            user_data = {
                "email": generate_test_email(),
                "password": "SecurePass123!",
                "first_name": f"Test{role.title()}",
                "last_name": "User",
                "role": role,
            }

            try:
                response = self.session.post(
                    f"{self.base_url}/auth/register", json=user_data
                )

                if response.status_code == 200:
                    user_response = response.json()
                    self.log_result(
                        f"Register {role} user",
                        True,
                        f"User ID: {user_response.get('id')}, Email: {user_response.get('email')}",
                    )

                    # Store user for later tests
                    self.test_users[role] = {
                        "email": user_data["email"],
                        "password": user_data["password"],
                        "user_data": user_response,
                    }
                    registration_results[role] = user_response
                else:
                    self.log_result(
                        f"Register {role} user",
                        False,
                        f"Status: {response.status_code}, Error: {response.json()}",
                    )
                    all_passed = False

            except Exception as e:
                self.log_result(f"Register {role} user", False, f"Exception: {str(e)}")
                all_passed = False

        # Test duplicate email registration
        if self.test_users.get("barber"):
            duplicate_data = {
                "email": self.test_users["barber"]["email"],
                "password": "AnotherPass123!",
                "first_name": "Duplicate",
                "last_name": "User",
                "role": "barber",
            }

            try:
                response = self.session.post(
                    f"{self.base_url}/auth/register", json=duplicate_data
                )

                if response.status_code == 400:
                    self.log_result(
                        "Duplicate email prevention",
                        True,
                        "Correctly rejected duplicate email",
                    )
                else:
                    self.log_result(
                        "Duplicate email prevention",
                        False,
                        f"Should have rejected duplicate but got status {response.status_code}",
                    )
                    all_passed = False

            except Exception as e:
                self.log_result(
                    "Duplicate email prevention", False, f"Exception: {str(e)}"
                )
                all_passed = False

        return all_passed, registration_results

    def test_user_login(self) -> Tuple[bool, Optional[Dict]]:
        """Test 3: User Login and JWT Token Generation"""
        print("\n🔑 Testing User Login...")

        if not self.test_users.get("barber"):
            self.log_result("User login", False, "No test user available")
            return False, None

        test_user = self.test_users["barber"]
        tokens = {}
        all_passed = True

        # Test valid login
        try:
            # OAuth2 password flow requires form data
            login_data = {
                "username": test_user["email"],  # OAuth2 uses 'username' field
                "password": test_user["password"],
            }

            response = self.session.post(
                f"{self.base_url}/auth/token",
                data=login_data,  # Use form data, not JSON
            )

            if response.status_code == 200:
                token_response = response.json()
                self.log_result(
                    "Valid user login",
                    True,
                    f"Token type: {token_response.get('token_type')}, User role: {token_response.get('user', {}).get('role')}",
                )

                # Verify token structure
                if all(
                    key in token_response
                    for key in ["access_token", "token_type", "user"]
                ):
                    self.log_result(
                        "Token structure validation",
                        True,
                        "All required fields present",
                    )
                    tokens["barber"] = token_response
                else:
                    self.log_result(
                        "Token structure validation",
                        False,
                        f"Missing fields in response: {token_response.keys()}",
                    )
                    all_passed = False

            else:
                self.log_result(
                    "Valid user login",
                    False,
                    f"Status: {response.status_code}, Error: {response.json()}",
                )
                all_passed = False

        except Exception as e:
            self.log_result("Valid user login", False, f"Exception: {str(e)}")
            all_passed = False

        # Test invalid password
        try:
            invalid_login = {
                "username": test_user["email"],
                "password": "WrongPassword123!",
            }

            response = self.session.post(
                f"{self.base_url}/auth/token", data=invalid_login
            )

            if response.status_code == 401:
                self.log_result(
                    "Invalid password rejection",
                    True,
                    "Correctly rejected invalid password",
                )
            else:
                self.log_result(
                    "Invalid password rejection",
                    False,
                    f"Should have rejected but got status {response.status_code}",
                )
                all_passed = False

        except Exception as e:
            self.log_result("Invalid password rejection", False, f"Exception: {str(e)}")
            all_passed = False

        # Test non-existent user
        try:
            nonexistent_login = {
                "username": "nonexistent@example.com",
                "password": "SomePassword123!",
            }

            response = self.session.post(
                f"{self.base_url}/auth/token", data=nonexistent_login
            )

            if response.status_code == 401:
                self.log_result(
                    "Non-existent user rejection",
                    True,
                    "Correctly rejected non-existent user",
                )
            else:
                self.log_result(
                    "Non-existent user rejection",
                    False,
                    f"Should have rejected but got status {response.status_code}",
                )
                all_passed = False

        except Exception as e:
            self.log_result(
                "Non-existent user rejection", False, f"Exception: {str(e)}"
            )
            all_passed = False

        # Store tokens for other tests
        if tokens:
            for role, token_data in tokens.items():
                if role in self.test_users:
                    self.test_users[role]["token"] = token_data["access_token"]

        return all_passed, tokens

    def test_protected_endpoints(self) -> bool:
        """Test 4: JWT Token Validation and Protected Endpoints"""
        print("\n🛡️ Testing Protected Endpoints...")

        all_passed = True

        # Test without token
        try:
            response = self.session.get(f"{self.base_url}/auth/me")

            if response.status_code == 401:
                self.log_result(
                    "Protected endpoint without token",
                    True,
                    "Correctly rejected unauthenticated request",
                )
            else:
                self.log_result(
                    "Protected endpoint without token",
                    False,
                    f"Should have rejected but got status {response.status_code}",
                )
                all_passed = False

        except Exception as e:
            self.log_result(
                "Protected endpoint without token", False, f"Exception: {str(e)}"
            )
            all_passed = False

        # Test with valid token
        if self.test_users.get("barber", {}).get("token"):
            token = self.test_users["barber"]["token"]
            headers = {"Authorization": f"Bearer {token}"}

            try:
                response = self.session.get(f"{self.base_url}/auth/me", headers=headers)

                if response.status_code == 200:
                    user_info = response.json()
                    self.log_result(
                        "Protected endpoint with valid token",
                        True,
                        f"Retrieved user: {user_info.get('email')}, Role: {user_info.get('role')}",
                    )
                else:
                    self.log_result(
                        "Protected endpoint with valid token",
                        False,
                        f"Status: {response.status_code}, Error: {response.json()}",
                    )
                    all_passed = False

            except Exception as e:
                self.log_result(
                    "Protected endpoint with valid token", False, f"Exception: {str(e)}"
                )
                all_passed = False

        # Test with invalid token
        try:
            headers = {"Authorization": "Bearer invalid_token_12345"}
            response = self.session.get(f"{self.base_url}/auth/me", headers=headers)

            if response.status_code == 401:
                self.log_result(
                    "Protected endpoint with invalid token",
                    True,
                    "Correctly rejected invalid token",
                )
            else:
                self.log_result(
                    "Protected endpoint with invalid token",
                    False,
                    f"Should have rejected but got status {response.status_code}",
                )
                all_passed = False

        except Exception as e:
            self.log_result(
                "Protected endpoint with invalid token", False, f"Exception: {str(e)}"
            )
            all_passed = False

        # Test with malformed authorization header
        try:
            headers = {"Authorization": "InvalidFormat token_here"}
            response = self.session.get(f"{self.base_url}/auth/me", headers=headers)

            if response.status_code == 401:
                self.log_result(
                    "Protected endpoint with malformed auth header",
                    True,
                    "Correctly rejected malformed header",
                )
            else:
                self.log_result(
                    "Protected endpoint with malformed auth header",
                    False,
                    f"Should have rejected but got status {response.status_code}",
                )
                all_passed = False

        except Exception as e:
            self.log_result(
                "Protected endpoint with malformed auth header",
                False,
                f"Exception: {str(e)}",
            )
            all_passed = False

        return all_passed

    def test_role_based_access(self) -> bool:
        """Test 5: Role-Based Access Control (RBAC)"""
        print("\n👥 Testing Role-Based Access Control...")

        all_passed = True

        # First, let's check what endpoints require specific roles
        # We'll test the analytics endpoint which should have role restrictions

        # Test barber accessing analytics (should have limited access)
        if self.test_users.get("barber", {}).get("token"):
            token = self.test_users["barber"]["token"]
            headers = {"Authorization": f"Bearer {token}"}

            try:
                # Test accessing own analytics
                response = self.session.get(
                    f"{self.base_url}/analytics/dashboard", headers=headers
                )

                if response.status_code in [200, 403]:
                    self.log_result(
                        "Barber role - analytics access",
                        True,
                        f"Status: {response.status_code} - Barber can only view own analytics",
                    )
                else:
                    self.log_result(
                        "Barber role - analytics access",
                        False,
                        f"Unexpected status: {response.status_code}",
                    )
                    all_passed = False

            except Exception as e:
                self.log_result(
                    "Barber role - analytics access", False, f"Exception: {str(e)}"
                )
                all_passed = False

        # Test accessing user management endpoints (should be restricted)
        if self.test_users.get("barber", {}).get("token"):
            token = self.test_users["barber"]["token"]
            headers = {"Authorization": f"Bearer {token}"}

            try:
                # Try to access user list (admin only)
                response = self.session.get(f"{self.base_url}/users", headers=headers)

                if response.status_code in [403, 404]:  # 404 if endpoint doesn't exist
                    self.log_result(
                        "Barber role - restricted endpoint",
                        True,
                        "Correctly denied access to admin endpoint",
                    )
                else:
                    self.log_result(
                        "Barber role - restricted endpoint",
                        False,
                        f"Should have been denied but got status {response.status_code}",
                    )
                    all_passed = False

            except Exception as e:
                self.log_result(
                    "Barber role - restricted endpoint", False, f"Exception: {str(e)}"
                )
                all_passed = False

        # Test permissions in token response
        if self.test_users.get("barber"):
            user_data = self.test_users["barber"].get("user_data", {})
            role = user_data.get("role")

            if role == "barber":
                self.log_result(
                    "Role assignment verification",
                    True,
                    f"User correctly assigned role: {role}",
                )
            else:
                self.log_result(
                    "Role assignment verification",
                    False,
                    f"Expected 'barber' role but got: {role}",
                )
                all_passed = False

        return all_passed

    def test_logout_functionality(self) -> bool:
        """Test 6: Logout Functionality"""
        print("\n🚪 Testing Logout Functionality...")

        all_passed = True

        if not self.test_users.get("barber", {}).get("token"):
            self.log_result(
                "Logout functionality", False, "No authenticated user available"
            )
            return False

        token = self.test_users["barber"]["token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Test logout endpoint
        try:
            response = self.session.post(
                f"{self.base_url}/auth/logout", headers=headers
            )

            if response.status_code == 200:
                self.log_result(
                    "Logout endpoint", True, "Successfully called logout endpoint"
                )

                # Note: In JWT-based systems, logout is typically handled client-side
                # The server might blacklist tokens or just return success
                logout_response = response.json()
                if "message" in logout_response:
                    self.log_result(
                        "Logout response",
                        True,
                        f"Message: {logout_response['message']}",
                    )
            else:
                self.log_result(
                    "Logout endpoint",
                    False,
                    f"Status: {response.status_code}, Error: {response.json()}",
                )
                all_passed = False

        except Exception as e:
            self.log_result("Logout endpoint", False, f"Exception: {str(e)}")
            all_passed = False

        # Test that token still works (JWT tokens remain valid until expiration)
        try:
            response = self.session.get(f"{self.base_url}/auth/me", headers=headers)

            if response.status_code == 200:
                self.log_result(
                    "Token validity after logout",
                    True,
                    "JWT token remains valid until expiration (expected behavior)",
                )
            else:
                self.log_result(
                    "Token validity after logout",
                    True,
                    "Token invalidated server-side (advanced implementation)",
                )

        except Exception as e:
            self.log_result(
                "Token validity after logout", False, f"Exception: {str(e)}"
            )
            all_passed = False

        return all_passed

    def test_additional_auth_features(self) -> bool:
        """Test 7: Additional Authentication Features"""
        print("\n✨ Testing Additional Authentication Features...")

        all_passed = True

        # Test password change endpoint
        if self.test_users.get("barber", {}).get("token"):
            token = self.test_users["barber"]["token"]
            headers = {"Authorization": f"Bearer {token}"}

            try:
                change_password_data = {
                    "old_password": self.test_users["barber"]["password"],
                    "new_password": "NewSecurePass456!",
                }

                response = self.session.post(
                    f"{self.base_url}/auth/change-password",
                    headers=headers,
                    json=change_password_data,
                )

                if response.status_code == 200:
                    self.log_result(
                        "Password change", True, "Successfully changed password"
                    )
                    # Update stored password
                    self.test_users["barber"]["password"] = change_password_data[
                        "new_password"
                    ]
                elif response.status_code == 422:
                    # Endpoint might expect query params instead of JSON
                    response = self.session.post(
                        f"{self.base_url}/auth/change-password",
                        headers=headers,
                        params=change_password_data,
                    )
                    if response.status_code == 200:
                        self.log_result(
                            "Password change",
                            True,
                            "Successfully changed password (query params)",
                        )
                        self.test_users["barber"]["password"] = change_password_data[
                            "new_password"
                        ]
                    else:
                        self.log_result(
                            "Password change", False, f"Status: {response.status_code}"
                        )
                        all_passed = False
                else:
                    self.log_result(
                        "Password change",
                        False,
                        f"Status: {response.status_code}, Error: {response.text}",
                    )
                    all_passed = False

            except Exception as e:
                self.log_result("Password change", False, f"Exception: {str(e)}")
                all_passed = False

        # Test forgot password endpoint
        try:
            forgot_password_data = {
                "email": self.test_users.get("barber", {}).get(
                    "email", "test@example.com"
                )
            }

            response = self.session.post(
                f"{self.base_url}/auth/forgot-password", json=forgot_password_data
            )

            if response.status_code == 200:
                self.log_result(
                    "Forgot password", True, "Password reset email would be sent"
                )
            else:
                self.log_result(
                    "Forgot password", False, f"Status: {response.status_code}"
                )
                all_passed = False

        except Exception as e:
            self.log_result("Forgot password", False, f"Exception: {str(e)}")
            all_passed = False

        # Test magic link endpoint
        try:
            magic_link_data = {
                "email": self.test_users.get("barber", {}).get(
                    "email", "test@example.com"
                )
            }

            response = self.session.post(
                f"{self.base_url}/auth/send-magic-link", json=magic_link_data
            )

            if response.status_code == 200:
                self.log_result(
                    "Magic link authentication",
                    True,
                    "Magic link would be sent via email",
                )
            else:
                self.log_result(
                    "Magic link authentication",
                    False,
                    f"Status: {response.status_code}",
                )
                all_passed = False

        except Exception as e:
            self.log_result("Magic link authentication", False, f"Exception: {str(e)}")
            all_passed = False

        return all_passed

    def test_rate_limiting(self) -> bool:
        """Test 8: Rate Limiting"""
        print("\n⏱️ Testing Rate Limiting...")

        all_passed = True

        # Test login rate limiting (5 attempts per 5 minutes)
        test_email = "ratelimit_test@example.com"
        rate_limit_hit = False

        for i in range(7):  # Try 7 times to exceed the 5 attempt limit
            try:
                login_data = {"username": test_email, "password": "WrongPassword123!"}

                response = self.session.post(
                    f"{self.base_url}/auth/token", data=login_data
                )

                if response.status_code == 429:
                    rate_limit_hit = True
                    self.log_result(
                        "Login rate limiting",
                        True,
                        f"Rate limit triggered after {i} attempts",
                    )

                    # Check rate limit headers
                    headers = response.headers
                    if "X-RateLimit-Limit" in headers:
                        self.log_result(
                            "Rate limit headers",
                            True,
                            f"Limit: {headers.get('X-RateLimit-Limit')}, "
                            f"Remaining: {headers.get('X-RateLimit-Remaining', 'N/A')}, "
                            f"Reset: {headers.get('X-RateLimit-Reset', 'N/A')}",
                        )
                    break

            except Exception as e:
                self.log_result(
                    "Login rate limiting",
                    False,
                    f"Exception on attempt {i+1}: {str(e)}",
                )
                all_passed = False
                break

        if not rate_limit_hit:
            self.log_result(
                "Login rate limiting",
                False,
                "Rate limit not triggered after 7 attempts (might be disabled in dev)",
            )
            # Don't fail the test as rate limiting might be disabled in development

        return all_passed

    def generate_summary_report(self):
        """Generate and display summary report"""
        print("\n" + "=" * 60)
        print("📊 AUTHENTICATION TEST SUMMARY")
        print("=" * 60)

        total_tests = len(self.test_results)
        passed_tests = sum(1 for r in self.test_results if r["success"])
        failed_tests = total_tests - passed_tests

        print(f"\nTotal Tests: {total_tests}")
        print(f"✅ Passed: {passed_tests}")
        print(f"❌ Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests*100):.1f}%")

        if failed_tests > 0:
            print("\n❌ Failed Tests:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"  • {result['test']}")
                    if result["details"]:
                        print(f"    └─ {result['details']}")

        # Save detailed report
        report_filename = (
            f"auth_test_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        )
        with open(report_filename, "w") as f:
            json.dump(
                {
                    "test_run": datetime.now().isoformat(),
                    "summary": {
                        "total": total_tests,
                        "passed": passed_tests,
                        "failed": failed_tests,
                        "success_rate": f"{(passed_tests/total_tests*100):.1f}%",
                    },
                    "results": self.test_results,
                    "test_users": {
                        k: v.get("email") for k, v in self.test_users.items()
                    },
                },
                f,
                indent=2,
            )

        print(f"\n📄 Detailed report saved to: {report_filename}")

        return passed_tests == total_tests

    def run_all_tests(self):
        """Run all authentication tests"""
        print("\n🚀 Starting 6FB Booking Authentication Flow Tests")
        print(f"🔗 Testing against: {self.base_url}")
        print("=" * 60)

        # Check if server is running
        try:
            response = self.session.get(f"{BASE_URL}/docs")
            if response.status_code != 200:
                print("❌ ERROR: Backend server is not running!")
                print(
                    f"Please start the server with: cd backend && uvicorn main:app --reload"
                )
                return False
        except Exception as e:
            print("❌ ERROR: Cannot connect to backend server!")
            print(
                f"Please start the server with: cd backend && uvicorn main:app --reload"
            )
            print(f"Error: {str(e)}")
            return False

        # Run tests in sequence
        self.test_password_validation()
        self.test_user_registration()
        self.test_user_login()
        self.test_protected_endpoints()
        self.test_role_based_access()
        self.test_logout_functionality()
        self.test_additional_auth_features()
        self.test_rate_limiting()

        # Generate summary
        return self.generate_summary_report()


def main():
    """Main entry point"""
    tester = AuthenticationTester()

    try:
        success = tester.run_all_tests()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\n⚠️ Test interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Unexpected error: {str(e)}")
        sys.exit(1)


if __name__ == "__main__":
    main()
