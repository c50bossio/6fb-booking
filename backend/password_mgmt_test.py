#!/usr/bin/env python3
"""
Test Password Management Flow - Reset, Change, Validation
"""

import os
import time
import json
import requests
from datetime import datetime

# Load environment variables
from dotenv import load_dotenv

load_dotenv()


class PasswordManagementTest:
    def __init__(self):
        self.base_url = "http://localhost:8000"
        self.headers = {"Content-Type": "application/json"}

    def test_forgot_password_flow(self):
        """Test forgot password functionality"""
        print("\n🔄 Testing Forgot Password Flow...")

        test_emails = [
            "admin@6fb.com",  # Known user
            "nonexistent@test.com",  # Non-existent user
            "invalid-email",  # Invalid format
        ]

        for email in test_emails:
            try:
                print(f"\n   Testing forgot password for: {email}")
                data = {"email": email}
                response = requests.post(
                    f"{self.base_url}/api/v1/auth/forgot-password",
                    json=data,
                    headers=self.headers,
                    timeout=15,
                )

                print(f"   Response status: {response.status_code}")

                if response.status_code == 200:
                    print(f"   ✅ Forgot password request accepted")
                elif response.status_code == 429:
                    print(f"   ⚠️  Rate limited")
                    time.sleep(2)  # Short wait
                elif response.status_code == 400:
                    print(
                        f"   ⚠️  Bad request (expected for invalid email): {response.text}"
                    )
                else:
                    print(f"   ❌ Unexpected response: {response.text}")

                time.sleep(1)  # Prevent rapid requests

            except Exception as e:
                print(f"   ❌ Error testing {email}: {e}")

    def test_password_strength_api(self):
        """Test password strength validation via API"""
        print("\n🔒 Testing Password Strength via API...")

        # Use unique timestamp for emails
        timestamp = int(time.time())

        weak_passwords = [
            ("weak", f"weak_test_{timestamp}@test.com"),
            ("123", f"num_test_{timestamp}@test.com"),
            ("password", f"common_test_{timestamp}@test.com"),
        ]

        strong_passwords = [
            ("StrongPassword123!", f"strong_test_{timestamp}@test.com"),
            ("Complex@Password1", f"complex_test_{timestamp}@test.com"),
        ]

        # Test weak passwords
        for password, email in weak_passwords:
            try:
                print(f"\n   Testing weak password: '{password}'")
                data = {
                    "email": email,
                    "password": password,
                    "first_name": "Test",
                    "last_name": "User",
                    "role": "barber",
                }

                response = requests.post(
                    f"{self.base_url}/api/v1/auth/register",
                    json=data,
                    headers=self.headers,
                    timeout=15,
                )

                print(f"   Response status: {response.status_code}")

                if response.status_code == 400:
                    resp_data = response.json()
                    if "password" in str(resp_data).lower():
                        print(f"   ✅ Weak password properly rejected")
                    else:
                        print(f"   ❌ Rejected for different reason: {resp_data}")
                elif response.status_code == 429:
                    print(f"   ⚠️  Rate limited")
                    time.sleep(5)
                elif response.status_code == 201:
                    print(f"   ❌ Weak password accepted!")
                else:
                    print(f"   ⚠️  Unexpected response: {response.text}")

                time.sleep(2)  # Prevent rate limiting

            except Exception as e:
                print(f"   ❌ Error testing weak password: {e}")

        # Test strong passwords (briefly)
        for password, email in strong_passwords[:1]:  # Just test one
            try:
                print(f"\n   Testing strong password: '{password}'")
                data = {
                    "email": email,
                    "password": password,
                    "first_name": "Test",
                    "last_name": "User",
                    "role": "barber",
                }

                response = requests.post(
                    f"{self.base_url}/api/v1/auth/register",
                    json=data,
                    headers=self.headers,
                    timeout=15,
                )

                print(f"   Response status: {response.status_code}")

                if response.status_code == 201:
                    print(f"   ✅ Strong password accepted")
                elif response.status_code == 429:
                    print(f"   ⚠️  Rate limited")
                else:
                    print(f"   ⚠️  Strong password rejected: {response.text}")

            except Exception as e:
                print(f"   ❌ Error testing strong password: {e}")

    def test_login_with_different_credentials(self):
        """Test login with various credential combinations"""
        print("\n🔑 Testing Login Variations...")

        # Known working credentials
        test_credentials = [
            ("admin@6fb.com", "admin123", "Valid admin credentials"),
            ("admin@6fb.com", "wrongpassword", "Wrong password"),
            ("nonexistent@test.com", "anypassword", "Non-existent user"),
            ("", "password", "Empty email"),
            ("admin@6fb.com", "", "Empty password"),
        ]

        for email, password, description in test_credentials:
            try:
                print(f"\n   Testing: {description}")
                print(f"   Email: '{email}', Password: '{password[:3]}...'")

                data = {"email": email, "password": password}
                response = requests.post(
                    f"{self.base_url}/api/v1/auth/login",
                    json=data,
                    headers=self.headers,
                    timeout=15,
                )

                print(f"   Response status: {response.status_code}")

                if response.status_code == 200:
                    print(f"   ✅ Login successful")
                    resp_data = response.json()
                    if "access_token" in resp_data:
                        print(f"   ✅ JWT token received")
                        # Store first successful token
                        if not hasattr(self, "auth_token"):
                            self.auth_token = resp_data["access_token"]
                elif response.status_code == 401:
                    print(f"   ✅ Login properly rejected (401)")
                elif response.status_code == 400:
                    print(f"   ✅ Bad request (400) - validation error")
                elif response.status_code == 429:
                    print(f"   ⚠️  Rate limited (429)")
                    time.sleep(10)  # Longer wait for rate limit
                else:
                    print(f"   ⚠️  Unexpected response: {response.text}")

                time.sleep(2)  # Prevent rate limiting

            except Exception as e:
                print(f"   ❌ Error testing login: {e}")

    def test_token_validation(self):
        """Test JWT token validation if we have a token"""
        print("\n🎫 Testing JWT Token Validation...")

        if hasattr(self, "auth_token"):
            try:
                # Test valid token
                print(f"   Testing valid JWT token...")
                headers = {"Authorization": f"Bearer {self.auth_token}"}
                response = requests.get(
                    f"{self.base_url}/api/v1/auth/me", headers=headers, timeout=10
                )

                print(f"   Response status: {response.status_code}")

                if response.status_code == 200:
                    print(f"   ✅ Valid token accepted")
                    user_data = response.json()
                    print(
                        f"   User: {user_data.get('first_name', 'Unknown')} {user_data.get('last_name', 'Unknown')}"
                    )
                    print(f"   Role: {user_data.get('role', 'Unknown')}")
                else:
                    print(f"   ❌ Valid token rejected: {response.text}")

                # Test invalid token
                print(f"   Testing invalid JWT token...")
                headers = {"Authorization": "Bearer invalid_token_here"}
                response = requests.get(
                    f"{self.base_url}/api/v1/auth/me", headers=headers, timeout=10
                )

                if response.status_code == 401:
                    print(f"   ✅ Invalid token properly rejected")
                else:
                    print(f"   ❌ Invalid token not rejected: {response.status_code}")

            except Exception as e:
                print(f"   ❌ Token validation error: {e}")
        else:
            print("   ⚠️  No auth token available for testing")

    def test_email_decryption_issue(self):
        """Test the email decryption issue we observed"""
        print("\n🔐 Testing Email Decryption Issue...")

        if hasattr(self, "auth_token"):
            try:
                # Decode the JWT token to see the issue
                import jwt
                import base64

                # Split the token
                parts = self.auth_token.split(".")
                if len(parts) == 3:
                    # Decode the payload (add padding if needed)
                    payload = parts[1]
                    # Add padding if needed
                    payload += "=" * (4 - len(payload) % 4)
                    decoded_payload = base64.urlsafe_b64decode(payload)
                    payload_data = json.loads(decoded_payload)

                    print(
                        f"   JWT payload subject: {payload_data.get('sub', 'Not found')}"
                    )
                    print(f"   User ID: {payload_data.get('user_id', 'Not found')}")

                    if payload_data.get("sub") == "[ENCRYPTED_EMAIL_DECRYPTION_FAILED]":
                        print(f"   ❌ Email decryption failed in JWT token")
                        print(
                            f"   This indicates an issue with the DATA_ENCRYPTION_KEY"
                        )
                    else:
                        print(f"   ✅ Email decryption working in JWT")

            except Exception as e:
                print(f"   ❌ Error analyzing JWT token: {e}")
        else:
            print("   ⚠️  No auth token available for analysis")

    def run_password_tests(self):
        """Run all password management tests"""
        print("🔐 Starting Password Management Testing")
        print("=" * 50)

        # Test 1: Forgot password flow
        self.test_forgot_password_flow()

        # Test 2: Password strength validation
        self.test_password_strength_api()

        # Test 3: Login variations
        self.test_login_with_different_credentials()

        # Test 4: Token validation
        self.test_token_validation()

        # Test 5: Email decryption issue
        self.test_email_decryption_issue()

        print("\n" + "=" * 50)
        print("🏁 PASSWORD MANAGEMENT TEST COMPLETE")
        print("=" * 50)


def main():
    """Main execution"""
    test = PasswordManagementTest()
    test.run_password_tests()


if __name__ == "__main__":
    main()
