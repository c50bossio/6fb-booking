#!/usr/bin/env python3
"""
Comprehensive Authentication System Testing Suite
Tests all authentication flows end-to-end after fixes
"""

import os
import sys
import json
import time
import requests
import sqlite3
from datetime import datetime, timedelta
from passlib.context import CryptContext
from cryptography.fernet import Fernet
import base64

# Load environment variables
from dotenv import load_dotenv

load_dotenv()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class AuthTestSuite:
    def __init__(self):
        self.base_url = "http://localhost:8000"
        self.results = {
            "timestamp": datetime.now().isoformat(),
            "tests": {},
            "summary": {"total": 0, "passed": 0, "failed": 0},
        }

        # Test data
        self.test_users = [
            {
                "email": "auth_test_strong@test.com",
                "password": "StrongPassword123!@#",
                "first_name": "Strong",
                "last_name": "User",
                "role": "barber",
            },
            {
                "email": "auth_test_weak@test.com",
                "password": "weak",
                "first_name": "Weak",
                "last_name": "User",
                "role": "barber",
            },
            {
                "email": "existing@test.com",
                "password": "TestPassword123!",
                "first_name": "Existing",
                "last_name": "User",
                "role": "admin",
            },
        ]

        self.headers = {"Content-Type": "application/json"}

    def log_test_result(self, test_name, passed, details, error=None):
        """Log test result"""
        result = {
            "passed": passed,
            "details": details,
            "timestamp": datetime.now().isoformat(),
        }
        if error:
            result["error"] = str(error)

        self.results["tests"][test_name] = result
        self.results["summary"]["total"] += 1
        if passed:
            self.results["summary"]["passed"] += 1
            print(f"✅ {test_name}: PASSED")
        else:
            self.results["summary"]["failed"] += 1
            print(f"❌ {test_name}: FAILED - {details}")
            if error:
                print(f"   Error: {error}")

    def test_server_health(self):
        """Test if server is responding"""
        try:
            response = requests.get(f"{self.base_url}/health", timeout=10)
            if response.status_code == 200:
                self.log_test_result("server_health", True, "Server is responding")
                return True
            else:
                self.log_test_result(
                    "server_health", False, f"Server returned {response.status_code}"
                )
                return False
        except Exception as e:
            self.log_test_result("server_health", False, "Server not accessible", e)
            return False

    def test_password_strength_validation(self):
        """Test password strength requirements"""
        print("\n🔒 Testing Password Strength Validation...")

        weak_passwords = ["weak", "123", "password", "12345678"]
        strong_passwords = ["StrongPass123!", "Complex@Password1", "Secure#Pass456"]

        for password in weak_passwords:
            try:
                data = {
                    "email": "weaktest@test.com",
                    "password": password,
                    "first_name": "Test",
                    "last_name": "User",
                    "role": "barber",
                }
                response = requests.post(
                    f"{self.base_url}/api/v1/auth/register",
                    json=data,
                    headers=self.headers,
                    timeout=10,
                )

                if response.status_code == 400:
                    self.log_test_result(
                        f"password_strength_weak_{password}",
                        True,
                        "Weak password properly rejected",
                    )
                else:
                    self.log_test_result(
                        f"password_strength_weak_{password}",
                        False,
                        f"Weak password accepted: {response.status_code}",
                    )
            except Exception as e:
                self.log_test_result(
                    f"password_strength_weak_{password}",
                    False,
                    "Error testing weak password",
                    e,
                )

        for password in strong_passwords:
            try:
                data = {
                    "email": f"strongtest{strong_passwords.index(password)}@test.com",
                    "password": password,
                    "first_name": "Test",
                    "last_name": "User",
                    "role": "barber",
                }
                response = requests.post(
                    f"{self.base_url}/api/v1/auth/register",
                    json=data,
                    headers=self.headers,
                    timeout=10,
                )

                if response.status_code == 201:
                    self.log_test_result(
                        f"password_strength_strong_{password}",
                        True,
                        "Strong password accepted",
                    )
                else:
                    self.log_test_result(
                        f"password_strength_strong_{password}",
                        False,
                        f"Strong password rejected: {response.status_code}",
                    )
            except Exception as e:
                self.log_test_result(
                    f"password_strength_strong_{password}",
                    False,
                    "Error testing strong password",
                    e,
                )

    def test_registration_flow(self):
        """Test user registration flow"""
        print("\n📝 Testing Registration Flow...")

        # Test 1: Valid registration
        try:
            data = self.test_users[0].copy()
            response = requests.post(
                f"{self.base_url}/api/v1/auth/register",
                json=data,
                headers=self.headers,
                timeout=10,
            )

            if response.status_code == 201:
                self.log_test_result(
                    "registration_valid", True, "Valid registration successful"
                )
            else:
                self.log_test_result(
                    "registration_valid",
                    False,
                    f"Valid registration failed: {response.status_code} - {response.text}",
                )
        except Exception as e:
            self.log_test_result(
                "registration_valid", False, "Registration request failed", e
            )

        # Test 2: Duplicate email
        try:
            data = self.test_users[0].copy()  # Same email as above
            response = requests.post(
                f"{self.base_url}/api/v1/auth/register",
                json=data,
                headers=self.headers,
                timeout=10,
            )

            if response.status_code == 400:
                self.log_test_result(
                    "registration_duplicate", True, "Duplicate email properly rejected"
                )
            else:
                self.log_test_result(
                    "registration_duplicate",
                    False,
                    f"Duplicate email not rejected: {response.status_code}",
                )
        except Exception as e:
            self.log_test_result(
                "registration_duplicate", False, "Duplicate email test failed", e
            )

        # Test 3: Invalid email format
        try:
            data = self.test_users[0].copy()
            data["email"] = "invalid-email"
            response = requests.post(
                f"{self.base_url}/api/v1/auth/register",
                json=data,
                headers=self.headers,
                timeout=10,
            )

            if response.status_code == 400:
                self.log_test_result(
                    "registration_invalid_email",
                    True,
                    "Invalid email properly rejected",
                )
            else:
                self.log_test_result(
                    "registration_invalid_email",
                    False,
                    f"Invalid email not rejected: {response.status_code}",
                )
        except Exception as e:
            self.log_test_result(
                "registration_invalid_email", False, "Invalid email test failed", e
            )

    def test_login_flow(self):
        """Test login authentication flow"""
        print("\n🔑 Testing Login Flow...")

        # Use existing test user
        test_credentials = [
            ("test@example.com", "testpassword123"),
            ("admin@6fb.com", "admin123"),
            (
                "auth_test_strong@test.com",
                "StrongPassword123!@#",
            ),  # From registration test
        ]

        for email, password in test_credentials:
            try:
                data = {"email": email, "password": password}
                response = requests.post(
                    f"{self.base_url}/api/v1/auth/login",
                    json=data,
                    headers=self.headers,
                    timeout=10,
                )

                if response.status_code == 200:
                    resp_data = response.json()
                    if "access_token" in resp_data and "user" in resp_data:
                        self.log_test_result(
                            f"login_valid_{email}",
                            True,
                            f"Login successful for {email}",
                        )
                        # Store token for later tests
                        if not hasattr(self, "auth_token"):
                            self.auth_token = resp_data["access_token"]
                    else:
                        self.log_test_result(
                            f"login_valid_{email}",
                            False,
                            "Login response missing required fields",
                        )
                else:
                    self.log_test_result(
                        f"login_valid_{email}",
                        False,
                        f"Login failed: {response.status_code} - {response.text}",
                    )
            except Exception as e:
                self.log_test_result(
                    f"login_valid_{email}", False, f"Login test failed for {email}", e
                )

        # Test invalid credentials
        try:
            data = {"email": "test@example.com", "password": "wrongpassword"}
            response = requests.post(
                f"{self.base_url}/api/v1/auth/login",
                json=data,
                headers=self.headers,
                timeout=10,
            )

            if response.status_code == 401:
                self.log_test_result(
                    "login_invalid_credentials",
                    True,
                    "Invalid credentials properly rejected",
                )
            else:
                self.log_test_result(
                    "login_invalid_credentials",
                    False,
                    f"Invalid credentials not rejected: {response.status_code}",
                )
        except Exception as e:
            self.log_test_result(
                "login_invalid_credentials", False, "Invalid credentials test failed", e
            )

    def test_rate_limiting(self):
        """Test rate limiting protection"""
        print("\n🛡️  Testing Rate Limiting...")

        # Make multiple rapid login attempts
        try:
            failed_attempts = 0
            for i in range(7):  # Try 7 times (limit should be 5)
                data = {"email": "test@example.com", "password": "wrongpassword"}
                response = requests.post(
                    f"{self.base_url}/api/v1/auth/login",
                    json=data,
                    headers=self.headers,
                    timeout=10,
                )

                if response.status_code == 429:  # Rate limited
                    self.log_test_result(
                        "rate_limiting",
                        True,
                        f"Rate limiting active after {i+1} attempts",
                    )
                    return
                elif response.status_code == 401:
                    failed_attempts += 1

                time.sleep(0.1)  # Small delay between requests

            # If we get here, rate limiting might not be working
            self.log_test_result(
                "rate_limiting",
                False,
                f"Rate limiting not triggered after {failed_attempts} failed attempts",
            )

        except Exception as e:
            self.log_test_result("rate_limiting", False, "Rate limiting test failed", e)

    def test_jwt_token_validation(self):
        """Test JWT token validation"""
        print("\n🎫 Testing JWT Token Validation...")

        if not hasattr(self, "auth_token"):
            self.log_test_result(
                "jwt_validation", False, "No auth token available for testing"
            )
            return

        # Test 1: Valid token
        try:
            headers = {"Authorization": f"Bearer {self.auth_token}"}
            response = requests.get(
                f"{self.base_url}/api/v1/auth/profile", headers=headers, timeout=10
            )

            if response.status_code == 200:
                self.log_test_result(
                    "jwt_valid_token", True, "Valid JWT token accepted"
                )
            else:
                self.log_test_result(
                    "jwt_valid_token",
                    False,
                    f"Valid JWT token rejected: {response.status_code}",
                )
        except Exception as e:
            self.log_test_result(
                "jwt_valid_token", False, "JWT validation test failed", e
            )

        # Test 2: Invalid token
        try:
            headers = {"Authorization": "Bearer invalid_token_here"}
            response = requests.get(
                f"{self.base_url}/api/v1/auth/profile", headers=headers, timeout=10
            )

            if response.status_code == 401:
                self.log_test_result(
                    "jwt_invalid_token", True, "Invalid JWT token properly rejected"
                )
            else:
                self.log_test_result(
                    "jwt_invalid_token",
                    False,
                    f"Invalid JWT token not rejected: {response.status_code}",
                )
        except Exception as e:
            self.log_test_result(
                "jwt_invalid_token", False, "Invalid JWT test failed", e
            )

        # Test 3: Missing token
        try:
            response = requests.get(f"{self.base_url}/api/v1/auth/profile", timeout=10)

            if response.status_code == 401:
                self.log_test_result(
                    "jwt_missing_token", True, "Missing JWT token properly rejected"
                )
            else:
                self.log_test_result(
                    "jwt_missing_token",
                    False,
                    f"Missing JWT token not rejected: {response.status_code}",
                )
        except Exception as e:
            self.log_test_result(
                "jwt_missing_token", False, "Missing JWT test failed", e
            )

    def test_session_management(self):
        """Test session management"""
        print("\n🔄 Testing Session Management...")

        if not hasattr(self, "auth_token"):
            self.log_test_result(
                "session_management", False, "No auth token available for testing"
            )
            return

        # Test logout functionality
        try:
            headers = {"Authorization": f"Bearer {self.auth_token}"}
            response = requests.post(
                f"{self.base_url}/api/v1/auth/logout", headers=headers, timeout=10
            )

            if response.status_code == 200:
                self.log_test_result("logout_functionality", True, "Logout successful")

                # Test that token is invalidated
                profile_response = requests.get(
                    f"{self.base_url}/api/v1/auth/profile", headers=headers, timeout=10
                )
                if profile_response.status_code == 401:
                    self.log_test_result(
                        "token_invalidation",
                        True,
                        "Token properly invalidated after logout",
                    )
                else:
                    self.log_test_result(
                        "token_invalidation",
                        False,
                        f"Token still valid after logout: {profile_response.status_code}",
                    )
            else:
                self.log_test_result(
                    "logout_functionality",
                    False,
                    f"Logout failed: {response.status_code}",
                )
        except Exception as e:
            self.log_test_result("logout_functionality", False, "Logout test failed", e)

    def test_password_reset_flow(self):
        """Test password reset functionality"""
        print("\n🔄 Testing Password Reset Flow...")

        # Test 1: Request password reset
        try:
            data = {"email": "test@example.com"}
            response = requests.post(
                f"{self.base_url}/api/v1/auth/forgot-password",
                json=data,
                headers=self.headers,
                timeout=10,
            )

            if response.status_code in [200, 202]:  # Accept both success codes
                self.log_test_result(
                    "password_reset_request", True, "Password reset request successful"
                )
            else:
                self.log_test_result(
                    "password_reset_request",
                    False,
                    f"Password reset request failed: {response.status_code}",
                )
        except Exception as e:
            self.log_test_result(
                "password_reset_request", False, "Password reset request failed", e
            )

        # Test 2: Invalid email for reset
        try:
            data = {"email": "nonexistent@test.com"}
            response = requests.post(
                f"{self.base_url}/api/v1/auth/forgot-password",
                json=data,
                headers=self.headers,
                timeout=10,
            )

            # Should still return success for security (don't reveal if email exists)
            if response.status_code in [200, 202]:
                self.log_test_result(
                    "password_reset_invalid_email",
                    True,
                    "Password reset with invalid email handled securely",
                )
            else:
                self.log_test_result(
                    "password_reset_invalid_email",
                    False,
                    f"Password reset with invalid email failed: {response.status_code}",
                )
        except Exception as e:
            self.log_test_result(
                "password_reset_invalid_email",
                False,
                "Password reset invalid email test failed",
                e,
            )

    def test_data_encryption(self):
        """Test that user data is properly encrypted"""
        print("\n🔐 Testing Data Encryption...")

        try:
            # Connect to database and check if emails are encrypted
            conn = sqlite3.connect("6fb_booking.db")
            cursor = conn.cursor()

            cursor.execute("SELECT email FROM users LIMIT 5")
            emails = cursor.fetchall()
            conn.close()

            encrypted_count = 0
            for email_tuple in emails:
                email = email_tuple[0]
                # Check if email looks encrypted (base64 encoded)
                if email and ("|" in email or len(email) > 50):
                    encrypted_count += 1

            if encrypted_count > 0:
                self.log_test_result(
                    "data_encryption",
                    True,
                    f"{encrypted_count}/{len(emails)} emails appear encrypted",
                )
            else:
                self.log_test_result(
                    "data_encryption", False, "No encrypted emails found in database"
                )

        except Exception as e:
            self.log_test_result(
                "data_encryption", False, "Data encryption test failed", e
            )

    def test_security_headers(self):
        """Test security headers in responses"""
        print("\n🛡️  Testing Security Headers...")

        try:
            response = requests.get(f"{self.base_url}/api/v1/auth/login", timeout=10)
            headers = response.headers

            security_headers = [
                "X-Content-Type-Options",
                "X-Frame-Options",
                "X-XSS-Protection",
                "Strict-Transport-Security",
            ]

            present_headers = []
            for header in security_headers:
                if header in headers:
                    present_headers.append(header)

            if len(present_headers) >= 2:  # At least some security headers
                self.log_test_result(
                    "security_headers",
                    True,
                    f"Security headers present: {', '.join(present_headers)}",
                )
            else:
                self.log_test_result(
                    "security_headers",
                    False,
                    f"Insufficient security headers: {present_headers}",
                )

        except Exception as e:
            self.log_test_result(
                "security_headers", False, "Security headers test failed", e
            )

    def test_cors_configuration(self):
        """Test CORS configuration"""
        print("\n🌐 Testing CORS Configuration...")

        try:
            headers = {
                "Origin": "http://localhost:3000",
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "Content-Type",
            }

            response = requests.options(
                f"{self.base_url}/api/v1/auth/login", headers=headers, timeout=10
            )

            cors_headers = response.headers
            if "Access-Control-Allow-Origin" in cors_headers:
                self.log_test_result("cors_configuration", True, "CORS headers present")
            else:
                self.log_test_result(
                    "cors_configuration", False, "CORS headers missing"
                )

        except Exception as e:
            self.log_test_result("cors_configuration", False, "CORS test failed", e)

    def run_all_tests(self):
        """Run all authentication tests"""
        print("🚀 Starting Comprehensive Authentication Testing Suite")
        print("=" * 60)

        # Basic connectivity
        if not self.test_server_health():
            print("❌ Server not accessible - aborting tests")
            return self.results

        # Core authentication tests
        self.test_registration_flow()
        self.test_password_strength_validation()
        self.test_login_flow()
        self.test_jwt_token_validation()
        self.test_session_management()
        self.test_password_reset_flow()

        # Security tests
        self.test_rate_limiting()
        self.test_data_encryption()
        self.test_security_headers()
        self.test_cors_configuration()

        # Generate summary
        print("\n" + "=" * 60)
        print("🏁 AUTHENTICATION TEST SUMMARY")
        print("=" * 60)
        print(f"Total Tests: {self.results['summary']['total']}")
        print(f"Passed: {self.results['summary']['passed']}")
        print(f"Failed: {self.results['summary']['failed']}")

        success_rate = (
            self.results["summary"]["passed"] / self.results["summary"]["total"]
        ) * 100
        print(f"Success Rate: {success_rate:.1f}%")

        if success_rate >= 80:
            print("✅ AUTHENTICATION SYSTEM: HEALTHY")
        elif success_rate >= 60:
            print("⚠️  AUTHENTICATION SYSTEM: NEEDS ATTENTION")
        else:
            print("❌ AUTHENTICATION SYSTEM: CRITICAL ISSUES")

        return self.results


def main():
    """Main test execution"""
    test_suite = AuthTestSuite()
    results = test_suite.run_all_tests()

    # Save detailed results
    with open("auth_test_results.json", "w") as f:
        json.dump(results, f, indent=2)

    print(f"\n📊 Detailed results saved to: auth_test_results.json")

    return results


if __name__ == "__main__":
    main()
