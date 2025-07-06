#!/usr/bin/env python3
"""
Test Payment API Endpoints for 6FB Booking Platform
"""

import os
import sys
import logging
import requests
import json
from datetime import datetime, timedelta

# Add backend directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Setup logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


class PaymentEndpointTester:
    def __init__(self):
        self.api_base = "http://localhost:8000/api/v1"
        self.session = requests.Session()
        self.auth_token = None

    def test_server_availability(self):
        """Test if the API server is running."""
        try:
            response = self.session.get(f"{self.api_base}/health", timeout=5)
            if response.status_code == 200:
                print("✅ API server is running")
                return True
            else:
                print(f"❌ API server returned status {response.status_code}")
                return False
        except requests.exceptions.ConnectionError:
            print("❌ Cannot connect to API server")
            print(
                "   Make sure the backend server is running: uvicorn main:app --reload"
            )
            return False
        except Exception as e:
            print(f"❌ Server availability test failed: {str(e)}")
            return False

    def authenticate(self):
        """Authenticate and get access token."""
        try:
            # Try to create a test user and login
            auth_data = {"email": "test@6fb.com", "password": "TestPass123!"}

            # First try to login (try both data and json formats)
            response = self.session.post(f"{self.api_base}/auth/login", json=auth_data)
            if response.status_code != 200:
                # Try with form data
                response = self.session.post(
                    f"{self.api_base}/auth/login", data=auth_data
                )

            if response.status_code == 200:
                data = response.json()
                self.auth_token = data.get("access_token")
                self.session.headers.update(
                    {"Authorization": f"Bearer {self.auth_token}"}
                )
                print("✅ Authentication successful")
                return True
            else:
                print(f"⚠️  Login failed, trying to register user")

                # Try to register
                register_data = {
                    "email": "test@6fb.com",
                    "password": "TestPass123!",
                    "first_name": "Test",
                    "last_name": "User",
                    "role": "client",
                }

                response = self.session.post(
                    f"{self.api_base}/auth/register", json=register_data
                )

                if response.status_code in [200, 201]:
                    print("✅ User registration successful")
                    # Now try to login
                    response = self.session.post(
                        f"{self.api_base}/auth/login", json=auth_data
                    )
                    if response.status_code != 200:
                        response = self.session.post(
                            f"{self.api_base}/auth/login", data=auth_data
                        )
                    if response.status_code == 200:
                        data = response.json()
                        self.auth_token = data.get("access_token")
                        self.session.headers.update(
                            {"Authorization": f"Bearer {self.auth_token}"}
                        )
                        print("✅ Authentication successful")
                        return True
                    else:
                        print(
                            f"❌ Login after registration failed: {response.status_code}"
                        )
                        print(f"   Response: {response.text}")
                        return False
                else:
                    print(f"❌ User registration failed: {response.status_code}")
                    print(f"   Response: {response.text}")
                    return False

        except Exception as e:
            print(f"❌ Authentication failed: {str(e)}")
            return False

    def test_setup_intent_endpoint(self):
        """Test setup intent endpoint for adding payment methods."""
        try:
            response = self.session.post(f"{self.api_base}/payments/setup-intent")

            if response.status_code == 200:
                data = response.json()
                if "client_secret" in data and "setup_intent_id" in data:
                    print("✅ Setup intent endpoint working")
                    print(f"   Setup intent ID: {data['setup_intent_id']}")
                    return True
                else:
                    print("❌ Setup intent response missing required fields")
                    return False
            else:
                print(f"❌ Setup intent endpoint failed: {response.status_code}")
                print(f"   Response: {response.text}")
                return False

        except Exception as e:
            print(f"❌ Setup intent test failed: {str(e)}")
            return False

    def test_payment_methods_endpoint(self):
        """Test payment methods endpoints."""
        try:
            # Test GET payment methods
            response = self.session.get(f"{self.api_base}/payments/payment-methods")

            if response.status_code == 200:
                data = response.json()
                print(f"✅ Get payment methods endpoint working")
                print(f"   Found {len(data)} payment methods")
                return True
            else:
                print(f"❌ Get payment methods failed: {response.status_code}")
                print(f"   Response: {response.text}")
                return False

        except Exception as e:
            print(f"❌ Payment methods test failed: {str(e)}")
            return False

    def test_payment_history_endpoint(self):
        """Test payment history endpoint."""
        try:
            # Test GET payment history
            response = self.session.get(f"{self.api_base}/payments/payments")

            if response.status_code == 200:
                data = response.json()
                print(f"✅ Payment history endpoint working")
                print(f"   Found {len(data)} payments")
                return True
            else:
                print(f"❌ Payment history failed: {response.status_code}")
                print(f"   Response: {response.text}")
                return False

        except Exception as e:
            print(f"❌ Payment history test failed: {str(e)}")
            return False

    def test_unauthorized_access(self):
        """Test that endpoints require authentication."""
        try:
            # Temporarily remove auth header
            old_headers = self.session.headers.copy()
            if "Authorization" in self.session.headers:
                del self.session.headers["Authorization"]

            response = self.session.get(f"{self.api_base}/payments/payment-methods")

            # Restore auth header
            self.session.headers = old_headers

            if response.status_code == 401:
                print("✅ Unauthorized access properly blocked")
                return True
            else:
                print(f"❌ Unauthorized access not blocked: {response.status_code}")
                return False

        except Exception as e:
            print(f"❌ Unauthorized access test failed: {str(e)}")
            return False

    def test_payment_intent_creation_validation(self):
        """Test payment intent creation with validation."""
        try:
            # Test with invalid data (no appointment_id)
            invalid_data = {"amount": 1000}

            response = self.session.post(
                f"{self.api_base}/payments/payment-intents", json=invalid_data
            )

            if response.status_code == 422:  # Validation error
                print("✅ Payment intent validation working")
                return True
            else:
                print(f"❌ Payment intent validation failed: {response.status_code}")
                print(f"   Response: {response.text}")
                return False

        except Exception as e:
            print(f"❌ Payment intent validation test failed: {str(e)}")
            return False

    def test_cors_headers(self):
        """Test CORS headers are present."""
        try:
            response = self.session.options(f"{self.api_base}/payments/payment-methods")

            cors_headers = [
                "Access-Control-Allow-Origin",
                "Access-Control-Allow-Methods",
                "Access-Control-Allow-Headers",
            ]

            present_headers = [h for h in cors_headers if h in response.headers]

            if len(present_headers) > 0:
                print(f"✅ CORS headers present: {present_headers}")
                return True
            else:
                print("⚠️  CORS headers not found (may be handled by middleware)")
                return True  # Not critical for API functionality

        except Exception as e:
            print(f"❌ CORS test failed: {str(e)}")
            return False

    def test_rate_limiting(self):
        """Test rate limiting (if configured)."""
        try:
            # Make multiple rapid requests
            responses = []
            for i in range(10):
                response = self.session.get(f"{self.api_base}/payments/payment-methods")
                responses.append(response.status_code)

            # Check if any requests were rate limited
            rate_limited = any(status == 429 for status in responses)

            if rate_limited:
                print("✅ Rate limiting is active")
                return True
            else:
                print("ℹ️  No rate limiting detected (may not be configured)")
                return True  # Not critical

        except Exception as e:
            print(f"❌ Rate limiting test failed: {str(e)}")
            return False

    def run_all_tests(self):
        """Run all payment endpoint tests."""
        print("🧪 Testing Payment API Endpoints...")
        print("=" * 60)

        tests = [
            ("Server Availability", self.test_server_availability),
            ("Authentication", self.authenticate),
            ("Setup Intent Endpoint", self.test_setup_intent_endpoint),
            ("Payment Methods Endpoint", self.test_payment_methods_endpoint),
            ("Payment History Endpoint", self.test_payment_history_endpoint),
            ("Unauthorized Access Protection", self.test_unauthorized_access),
            ("Payment Intent Validation", self.test_payment_intent_creation_validation),
            ("CORS Headers", self.test_cors_headers),
            ("Rate Limiting", self.test_rate_limiting),
        ]

        results = []
        for test_name, test_func in tests:
            print(f"\n🔍 {test_name}...")
            try:
                result = test_func()
                results.append((test_name, result))
            except Exception as e:
                print(f"❌ {test_name} failed with exception: {str(e)}")
                results.append((test_name, False))

        # Summary
        print("\n" + "=" * 60)
        print("📊 TEST RESULTS SUMMARY")
        print("=" * 60)

        passed = sum(1 for _, result in results if result)
        total = len(results)

        for test_name, result in results:
            status = "✅ PASS" if result else "❌ FAIL"
            print(f"{status} {test_name}")

        print("=" * 60)
        print(f"Total: {passed}/{total} tests passed")

        if passed == total:
            print("🎉 ALL PAYMENT ENDPOINT TESTS PASSED!")
        else:
            print("⚠️  Some tests failed - check API configuration")

        return passed == total


def main():
    tester = PaymentEndpointTester()
    success = tester.run_all_tests()
    return 0 if success else 1


if __name__ == "__main__":
    exit(main())
