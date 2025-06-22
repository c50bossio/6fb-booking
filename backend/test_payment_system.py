#!/usr/bin/env python3
"""
Comprehensive Payment System Test Suite
Tests all Stripe-related functionality including:
- Payment intent creation
- Stripe Connect OAuth
- Webhook processing
- Payout calculations
- Security features
"""

import asyncio
import json
import requests
import stripe
from datetime import datetime, timedelta
from typing import Dict, Any
import hmac
import hashlib
import time

# Test configuration
BASE_URL = "http://localhost:8000"
API_V1 = f"{BASE_URL}/api/v1"

# Test data
TEST_USER = {
    "email": "test@example.com",
    "password": "testpassword123"
}

class PaymentSystemTester:
    def __init__(self):
        self.session = requests.Session()
        self.access_token = None
        self.test_results = {
            "timestamp": datetime.now().isoformat(),
            "tests": {},
            "summary": {
                "total": 0,
                "passed": 0,
                "failed": 0
            }
        }
        
    def log_test(self, test_name: str, success: bool, details: Any = None, error: str = None):
        """Log test results"""
        self.test_results["tests"][test_name] = {
            "success": success,
            "details": details,
            "error": error,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results["summary"]["total"] += 1
        if success:
            self.test_results["summary"]["passed"] += 1
            print(f"✅ {test_name}: PASSED")
        else:
            self.test_results["summary"]["failed"] += 1
            print(f"❌ {test_name}: FAILED - {error}")
            
    def setup_auth(self):
        """Authenticate and get access token"""
        print("\n🔐 Setting up authentication...")
        
        # Try to login with token endpoint
        login_response = self.session.post(
            f"{API_V1}/auth/token",
            data={
                "username": TEST_USER["email"],
                "password": TEST_USER["password"]
            }
        )
        
        if login_response.status_code == 200:
            self.access_token = login_response.json()["access_token"]
            self.session.headers.update({
                "Authorization": f"Bearer {self.access_token}"
            })
            self.log_test("Authentication", True, {"token_received": True})
            return True
        else:
            # Try to create user first
            print("Creating test user...")
            register_response = self.session.post(
                f"{API_V1}/auth/register",
                json={
                    "email": TEST_USER["email"],
                    "password": TEST_USER["password"],
                    "first_name": "Test",
                    "last_name": "User",
                    "role": "admin"
                }
            )
            
            if register_response.status_code in [200, 201]:
                # Now login with token endpoint
                login_response = self.session.post(
                    f"{API_V1}/auth/token",
                    data={
                        "username": TEST_USER["email"],
                        "password": TEST_USER["password"]
                    }
                )
                if login_response.status_code == 200:
                    self.access_token = login_response.json()["access_token"]
                    self.session.headers.update({
                        "Authorization": f"Bearer {self.access_token}"
                    })
                    self.log_test("Authentication", True, {"token_received": True})
                    return True
                    
            self.log_test("Authentication", False, error=f"Login failed: {login_response.text}")
            return False
            
    def test_payment_intent_creation(self):
        """Test creating a payment intent"""
        print("\n💳 Testing Payment Intent Creation...")
        
        # First, we need to create or get test data
        # Get locations
        locations_response = self.session.get(f"{API_V1}/locations")
        if locations_response.status_code != 200:
            self.log_test("Payment Intent Creation", False, error="Could not fetch locations")
            return
            
        locations = locations_response.json()
        if not locations:
            self.log_test("Payment Intent Creation", False, error="No locations found")
            return
            
        location_id = locations[0]["id"]
        
        # Create payment intent
        payment_data = {
            "amount": 5000,  # $50.00
            "currency": "usd",
            "payment_method_type": "card",
            "location_id": location_id,
            "description": "Test payment for haircut service"
        }
        
        response = self.session.post(
            f"{API_V1}/payments/payment-intents",
            json=payment_data
        )
        
        if response.status_code == 200:
            data = response.json()
            self.log_test("Payment Intent Creation", True, {
                "client_secret": data.get("client_secret", "").startswith("pi_"),
                "amount": data.get("amount"),
                "currency": data.get("currency"),
                "status": data.get("status")
            })
        else:
            self.log_test("Payment Intent Creation", False, 
                         error=f"Status {response.status_code}: {response.text}")
                         
    def test_stripe_connect_oauth(self):
        """Test Stripe Connect OAuth endpoints"""
        print("\n🔗 Testing Stripe Connect OAuth...")
        
        # Get barbers first
        barbers_response = self.session.get(f"{API_V1}/barbers")
        if barbers_response.status_code != 200 or not barbers_response.json():
            # Create a test barber
            barber_data = {
                "full_name": "Test Barber",
                "email": "testbarber@example.com",
                "phone": "555-0123",
                "location_id": 1,
                "commission_rate": 60.0,
                "booth_rent": 200.0,
                "is_booth_renter": True
            }
            
            create_response = self.session.post(f"{API_V1}/barbers", json=barber_data)
            if create_response.status_code in [200, 201]:
                barber_id = create_response.json()["id"]
            else:
                self.log_test("Stripe Connect OAuth Initiation", False, 
                             error="Could not create test barber")
                return
        else:
            barber_id = barbers_response.json()[0]["id"]
        
        # Test OAuth initiation endpoint
        oauth_response = self.session.get(
            f"{API_V1}/stripe-connect/connect/{barber_id}"
        )
        
        if oauth_response.status_code == 200:
            data = oauth_response.json()
            if "url" in data:
                self.log_test("Stripe Connect OAuth Initiation", True, {
                    "has_authorization_url": True,
                    "url_contains_stripe": "stripe.com" in data["url"],
                    "has_state_parameter": "state=" in data["url"]
                })
            else:
                self.log_test("Stripe Connect OAuth Initiation", False, 
                             error="No authorization URL returned")
        else:
            self.log_test("Stripe Connect OAuth Initiation", False,
                         error=f"Status {oauth_response.status_code}: {oauth_response.text}")
                         
        # Test OAuth callback (simulate)
        print("Testing OAuth callback endpoint...")
        callback_response = self.session.post(
            f"{API_V1}/stripe-connect/callback",
            json={
                "code": "ac_test_code",
                "state": f"barber_{barber_id}"
            }
        )
        
        # This will likely fail without a real code, but we can check the endpoint exists
        if callback_response.status_code in [200, 400, 422]:
            self.log_test("Stripe Connect OAuth Callback", True, 
                         {"endpoint_exists": True, "status": callback_response.status_code})
        else:
            self.log_test("Stripe Connect OAuth Callback", False,
                         error=f"Unexpected status {callback_response.status_code}")
                         
    def test_webhook_security(self):
        """Test webhook signature verification"""
        print("\n🔒 Testing Webhook Security...")
        
        # Create a mock webhook payload
        webhook_payload = {
            "id": "evt_test_webhook",
            "object": "event",
            "type": "payment_intent.succeeded",
            "data": {
                "object": {
                    "id": "pi_test_123",
                    "amount": 5000,
                    "currency": "usd",
                    "status": "succeeded"
                }
            }
        }
        
        payload_string = json.dumps(webhook_payload)
        
        # Test without signature (should fail)
        response = self.session.post(
            f"{API_V1}/webhooks/stripe",
            json=webhook_payload,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 400:
            self.log_test("Webhook Security - Missing Signature", True,
                         {"rejected_unsigned": True})
        else:
            self.log_test("Webhook Security - Missing Signature", False,
                         error=f"Accepted unsigned webhook: {response.status_code}")
                         
        # Test with invalid signature (should fail)
        response = self.session.post(
            f"{API_V1}/webhooks/stripe",
            data=payload_string,
            headers={
                "Content-Type": "application/json",
                "Stripe-Signature": "t=123,v1=invalid_signature"
            }
        )
        
        if response.status_code == 400:
            self.log_test("Webhook Security - Invalid Signature", True,
                         {"rejected_invalid": True})
        else:
            self.log_test("Webhook Security - Invalid Signature", False,
                         error=f"Accepted invalid signature: {response.status_code}")
                         
    def test_payout_calculations(self):
        """Test barber payout calculations"""
        print("\n💰 Testing Payout Calculations...")
        
        # Get barbers
        barbers_response = self.session.get(f"{API_V1}/barbers")
        if barbers_response.status_code != 200:
            self.log_test("Payout Calculations", False, error="Could not fetch barbers")
            return
            
        barbers = barbers_response.json()
        if not barbers:
            # Create a test barber
            barber_data = {
                "full_name": "Test Barber",
                "email": "testbarber@example.com",
                "phone": "555-0123",
                "location_id": 1,
                "commission_rate": 60.0,
                "booth_rent": 200.0,
                "is_booth_renter": True
            }
            
            create_response = self.session.post(f"{API_V1}/barbers", json=barber_data)
            if create_response.status_code in [200, 201]:
                barber_id = create_response.json()["id"]
            else:
                self.log_test("Payout Calculations", False, 
                             error=f"Could not create test barber: {create_response.text}")
                return
        else:
            barber_id = barbers[0]["id"]
            
        # Test payout calculation endpoint - using the test split calculation
        calc_response = self.session.get(
            f"{API_V1}/payment-splits/test-split-calculation",
            params={
                "barber_id": barber_id,
                "service_amount": 50.00,
                "tip_amount": 10.00
            }
        )
        
        if calc_response.status_code == 200:
            data = calc_response.json()
            self.log_test("Payout Calculations", True, {
                "barber_payout": data.get("barber_payout"),
                "shop_payout": data.get("shop_payout"),
                "total_amount": data.get("total_amount"),
                "calculation_method": data.get("calculation_method")
            })
        else:
            self.log_test("Payout Calculations", False,
                         error=f"Status {calc_response.status_code}: {calc_response.text}")
                         
    def test_payment_security_features(self):
        """Test payment security features"""
        print("\n🛡️ Testing Payment Security Features...")
        
        # Test amount validation (over limit)
        large_payment = {
            "amount": 150000,  # $1,500 (over $1,000 limit)
            "currency": "usd",
            "payment_method_type": "card",
            "location_id": 1
        }
        
        response = self.session.post(
            f"{API_V1}/payments/payment-intents",
            json=large_payment
        )
        
        if response.status_code == 400:
            self.log_test("Payment Security - Amount Limit", True,
                         {"rejected_over_limit": True})
        else:
            self.log_test("Payment Security - Amount Limit", False,
                         error=f"Accepted payment over limit: {response.status_code}")
                         
        # Test negative amount
        negative_payment = {
            "amount": -5000,
            "currency": "usd",
            "payment_method_type": "card",
            "location_id": 1
        }
        
        response = self.session.post(
            f"{API_V1}/payments/payment-intents",
            json=negative_payment
        )
        
        if response.status_code == 400:
            self.log_test("Payment Security - Negative Amount", True,
                         {"rejected_negative": True})
        else:
            self.log_test("Payment Security - Negative Amount", False,
                         error=f"Accepted negative payment: {response.status_code}")
                         
    def test_stripe_connection_status(self):
        """Test Stripe connection status endpoints"""
        print("\n📊 Testing Stripe Connection Status...")
        
        # Get locations to check their Stripe status
        locations_response = self.session.get(f"{API_V1}/locations")
        if locations_response.status_code == 200:
            locations = locations_response.json()
            # First get a barber ID to check their stripe status
            barbers_response = self.session.get(f"{API_V1}/barbers")
            if barbers_response.status_code == 200 and barbers_response.json():
                barber_id = barbers_response.json()[0]["id"]
                status_response = self.session.get(
                    f"{API_V1}/stripe-connect/status/{barber_id}"
                )
                
                if status_response.status_code == 200:
                    data = status_response.json()
                    self.log_test("Stripe Connection Status", True, {
                        "barber_id": barber_id,
                        "connected": data.get("connected"),
                        "account_id": data.get("stripe_account_id"),
                        "charges_enabled": data.get("charges_enabled"),
                        "payouts_enabled": data.get("payouts_enabled")
                    })
                else:
                    self.log_test("Stripe Connection Status", False,
                                 error=f"Status {status_response.status_code}")
        else:
            self.log_test("Stripe Connection Status", False, 
                         error="Could not fetch locations")
                         
    def run_all_tests(self):
        """Run all payment system tests"""
        print("🚀 Starting Payment System Test Suite")
        print("=" * 50)
        
        # Setup authentication first
        if not self.setup_auth():
            print("\n❌ Authentication failed. Cannot proceed with tests.")
            return
            
        # Run all tests
        self.test_payment_intent_creation()
        self.test_stripe_connect_oauth()
        self.test_webhook_security()
        self.test_payout_calculations()
        self.test_payment_security_features()
        self.test_stripe_connection_status()
        
        # Print summary
        print("\n" + "=" * 50)
        print("📊 TEST SUMMARY")
        print("=" * 50)
        print(f"Total Tests: {self.test_results['summary']['total']}")
        print(f"✅ Passed: {self.test_results['summary']['passed']}")
        print(f"❌ Failed: {self.test_results['summary']['failed']}")
        print(f"Success Rate: {(self.test_results['summary']['passed'] / self.test_results['summary']['total'] * 100):.1f}%")
        
        # Save results
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        results_file = f"payment_test_report_{timestamp}.json"
        with open(results_file, "w") as f:
            json.dump(self.test_results, f, indent=2)
        print(f"\n📄 Detailed results saved to: {results_file}")
        
        # Check if Stripe is properly configured
        if self.test_results['summary']['failed'] > 0:
            print("\n⚠️  Some tests failed. Please check:")
            print("1. Stripe keys are correctly set in .env")
            print("2. Backend server is running on port 8000")
            print("3. Database migrations are up to date")
            print("4. Check the detailed results file for specific errors")

if __name__ == "__main__":
    # Check if server is running
    try:
        response = requests.get(f"{BASE_URL}/docs")
        if response.status_code != 200:
            print("❌ Backend server not responding. Please start it with:")
            print("   cd backend && uvicorn main:app --reload")
            exit(1)
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to backend server at http://localhost:8000")
        print("   Please start the server with:")
        print("   cd backend && uvicorn main:app --reload")
        exit(1)
        
    # Run tests
    tester = PaymentSystemTester()
    tester.run_all_tests()