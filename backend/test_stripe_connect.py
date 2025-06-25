#!/usr/bin/env python3
"""
Test Script for Stripe Connect Functionality
Tests the barber onboarding flow for connecting their Stripe accounts
"""

import os
import sys
import asyncio
import httpx
from typing import Optional
from datetime import datetime
import secrets
import json

# Add the backend directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configuration
BASE_URL = os.getenv("BASE_URL", "http://localhost:8000")
API_PREFIX = "/api/v1/payment-splits"


class StripeConnectTester:
    def __init__(self):
        self.client = httpx.Client(base_url=BASE_URL, timeout=30.0)
        self.auth_token = None

    def print_header(self, text: str):
        """Print formatted header"""
        print("\n" + "=" * 60)
        print(f"🔧 {text}")
        print("=" * 60)

    def print_success(self, text: str):
        """Print success message"""
        print(f"✅ {text}")

    def print_error(self, text: str):
        """Print error message"""
        print(f"❌ {text}")

    def print_info(self, text: str):
        """Print info message"""
        print(f"ℹ️  {text}")

    def print_result(self, result: dict):
        """Print formatted result"""
        print(json.dumps(result, indent=2))

    async def test_stripe_configuration(self):
        """Test that Stripe is properly configured"""
        self.print_header("Testing Stripe Configuration")

        # Check environment variables
        required_vars = [
            "STRIPE_SECRET_KEY",
            "STRIPE_PUBLISHABLE_KEY",
            "STRIPE_CONNECT_CLIENT_ID",
        ]

        missing_vars = []
        for var in required_vars:
            value = os.getenv(var)
            if not value:
                missing_vars.append(var)
                self.print_error(f"{var} is not set")
            else:
                # Show partial value for verification
                if var == "STRIPE_SECRET_KEY":
                    self.print_success(
                        f"{var} is set (sk_{'live' if value.startswith('sk_live') else 'test'}...)"
                    )
                elif var == "STRIPE_PUBLISHABLE_KEY":
                    self.print_success(
                        f"{var} is set (pk_{'live' if value.startswith('pk_live') else 'test'}...)"
                    )
                elif var == "STRIPE_CONNECT_CLIENT_ID":
                    self.print_success(f"{var} is set ({value[:10]}...)")

        if missing_vars:
            self.print_error(
                f"\nMissing required environment variables: {', '.join(missing_vars)}"
            )
            self.print_info("Please set these in your .env file")
            return False

        # Test Stripe API connection
        try:
            import stripe

            stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

            # Try to retrieve account info
            account = stripe.Account.retrieve()
            self.print_success(f"Connected to Stripe account: {account.email}")
            self.print_info(f"Account type: {account.type}")
            self.print_info(f"Country: {account.country}")

        except Exception as e:
            self.print_error(f"Failed to connect to Stripe: {str(e)}")
            return False

        return True

    async def test_oauth_url_generation(self, barber_id: int = 1):
        """Test OAuth URL generation for barber onboarding"""
        self.print_header("Testing OAuth URL Generation")

        endpoint = f"{API_PREFIX}/connect-account"

        # Test data
        request_data = {"barber_id": barber_id, "platform": "stripe"}

        self.print_info(f"Testing endpoint: {endpoint}")
        self.print_info(f"Request data: {json.dumps(request_data)}")

        try:
            response = self.client.post(endpoint, json=request_data)

            if response.status_code == 200:
                data = response.json()
                self.print_success("OAuth URL generated successfully!")
                self.print_result(data)

                # Validate the OAuth URL
                oauth_url = data.get("oauth_url", "")
                if oauth_url.startswith("https://connect.stripe.com/oauth/authorize"):
                    self.print_success("OAuth URL format is correct")
                    self.print_info(f"\nTo test the connection flow:")
                    self.print_info(f"1. Open this URL in a browser: {oauth_url}")
                    self.print_info(f"2. Complete the Stripe Connect onboarding")
                    self.print_info(f"3. You'll be redirected back to the callback URL")
                else:
                    self.print_error("OAuth URL format is incorrect")

                return data
            else:
                self.print_error(f"Failed with status {response.status_code}")
                self.print_error(response.text)

        except Exception as e:
            self.print_error(f"Request failed: {str(e)}")

        return None

    async def test_endpoint_availability(self):
        """Test if all Stripe Connect endpoints are available"""
        self.print_header("Testing Endpoint Availability")

        endpoints = [
            ("POST", f"{API_PREFIX}/connect-account", "Generate OAuth URL"),
            ("GET", f"{API_PREFIX}/oauth-callback", "OAuth callback handler"),
            ("POST", f"{API_PREFIX}/process-payment", "Process split payment"),
            ("GET", f"{API_PREFIX}/connected-accounts", "List connected accounts"),
            ("GET", f"{API_PREFIX}/test-split-calculation", "Test split calculations"),
        ]

        available_endpoints = []

        for method, endpoint, description in endpoints:
            try:
                if method == "GET":
                    response = self.client.get(endpoint)
                else:
                    response = self.client.options(endpoint)

                # Check if endpoint exists (not 404)
                if response.status_code != 404:
                    self.print_success(f"{method} {endpoint} - {description}")
                    available_endpoints.append(endpoint)
                else:
                    self.print_error(f"{method} {endpoint} - Not found")

            except Exception as e:
                self.print_error(f"{method} {endpoint} - Error: {str(e)}")

        return available_endpoints

    async def test_split_calculations(self):
        """Test payment split calculations"""
        self.print_header("Testing Payment Split Calculations")

        endpoint = f"{API_PREFIX}/test-split-calculation"

        try:
            response = self.client.get(endpoint)

            if response.status_code == 200:
                data = response.json()
                self.print_success("Split calculations retrieved!")

                if "error" in data:
                    self.print_error(f"Error: {data['error']}")
                else:
                    self.print_info(f"Payment model: {data.get('payment_type', 'N/A')}")
                    self.print_info(
                        f"Commission rate: {data.get('commission_rate', 'N/A')}"
                    )
                    self.print_info(
                        f"Stripe account: {data.get('stripe_account', 'Not connected')}"
                    )
                    self.print_info(
                        f"Ready for payments: {data.get('ready_for_payments', False)}"
                    )

                    if "calculations" in data:
                        self.print_info("\nSample calculations:")
                        for calc in data["calculations"]:
                            print(
                                f"  Total: ${calc['total']} → Barber: ${calc['barber_gets']}, Shop: ${calc['shop_gets']} ({calc['commission_rate']})"
                            )

            else:
                self.print_error(f"Failed with status {response.status_code}")
                self.print_error(response.text)

        except Exception as e:
            self.print_error(f"Request failed: {str(e)}")

    async def simulate_oauth_callback(self, state_token: str, barber_id: int = 1):
        """Simulate OAuth callback (for testing only)"""
        self.print_header("Simulating OAuth Callback")

        self.print_info(
            "In a real scenario, Stripe would redirect to your callback URL with:"
        )
        self.print_info("- code: Authorization code from Stripe")
        self.print_info("- state: The state token you provided")

        # Example callback URL
        callback_url = f"{BASE_URL}{API_PREFIX}/oauth-callback"
        example_code = "ac_test_YourAuthorizationCode"

        self.print_info(f"\nExample callback URL:")
        self.print_info(
            f"{callback_url}?code={example_code}&state={barber_id}:{state_token}"
        )

        self.print_info("\nTo complete the connection:")
        self.print_info("1. The barber completes Stripe onboarding")
        self.print_info("2. Stripe redirects to your callback URL")
        self.print_info("3. Your backend exchanges the code for account access")
        self.print_info("4. The barber's Stripe account ID is saved")

    async def test_create_test_payment(self, barber_id: int = 1):
        """Test creating a split payment (requires connected account)"""
        self.print_header("Testing Split Payment Creation")

        endpoint = f"{API_PREFIX}/process-payment"

        # Test payment data
        payment_data = {
            "appointment_id": 1,
            "amount": 100.00,
            "payment_method_id": "pm_card_visa",  # Test payment method
            "description": "Test haircut service",
        }

        self.print_info(f"Testing payment split for ${payment_data['amount']}")
        self.print_info("Note: This requires a barber with a connected Stripe account")

        try:
            response = self.client.post(endpoint, json=payment_data)

            if response.status_code == 200:
                data = response.json()
                self.print_success("Payment split calculated successfully!")
                self.print_result(data)
            else:
                self.print_error(f"Failed with status {response.status_code}")
                error_detail = response.json() if response.text else response.text
                self.print_error(f"Error: {error_detail}")

        except Exception as e:
            self.print_error(f"Request failed: {str(e)}")

    async def run_all_tests(self):
        """Run all tests in sequence"""
        self.print_header("Starting Stripe Connect Test Suite")
        self.print_info(f"Base URL: {BASE_URL}")
        self.print_info(f"Timestamp: {datetime.now().isoformat()}")

        # Test 1: Check Stripe configuration
        if not await self.test_stripe_configuration():
            self.print_error(
                "\nStripe configuration test failed. Please fix the issues above."
            )
            return

        # Test 2: Check endpoint availability
        await self.test_endpoint_availability()

        # Test 3: Test OAuth URL generation
        oauth_result = await self.test_oauth_url_generation(barber_id=1)

        # Test 4: Test split calculations
        await self.test_split_calculations()

        # Test 5: Simulate OAuth callback
        if oauth_result:
            state_token = oauth_result.get("state_token", "test")
            await self.simulate_oauth_callback(state_token)

        # Test 6: Test payment creation (will fail without connected account)
        await self.test_create_test_payment()

        self.print_header("Test Suite Complete")
        self.print_info("\nNext steps:")
        self.print_info("1. Ensure all environment variables are set correctly")
        self.print_info("2. Use the OAuth URL to connect a test Stripe account")
        self.print_info(
            "3. Test the payment split functionality with the connected account"
        )


async def main():
    """Main function to run the tests"""
    tester = StripeConnectTester()
    await tester.run_all_tests()


if __name__ == "__main__":
    # Check if backend is running
    try:
        response = httpx.get(f"{BASE_URL}/api/v1/health", timeout=30.0)
        if response.status_code != 200:
            print(
                "❌ Backend is not running. Please start it with: cd backend && uvicorn main:app --reload"
            )
            sys.exit(1)
    except:
        print("❌ Cannot connect to backend at", BASE_URL)
        print("Please start the backend with: cd backend && uvicorn main:app --reload")
        sys.exit(1)

    # Run the tests
    asyncio.run(main())
