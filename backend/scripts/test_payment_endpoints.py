#!/usr/bin/env python3
"""
Test Payment Endpoints
Comprehensive testing of all payment-related API endpoints
"""

import requests
import json
import time
from datetime import datetime
from typing import Dict, Any, Optional
from colorama import init, Fore, Style

# Initialize colorama
init(autoreset=True)

BASE_URL = "http://localhost:8000"
API_V1 = f"{BASE_URL}/api/v1"


class PaymentEndpointTester:
    def __init__(self):
        self.session = requests.Session()
        self.access_token = None
        self.test_data = {}
        self.results = []

    def print_test(self, name: str, success: bool, details: str = ""):
        """Print test result"""
        if success:
            print(f"{Fore.GREEN}✅ {name}{Style.RESET_ALL}")
            if details:
                print(f"   {details}")
        else:
            print(f"{Fore.RED}❌ {name}{Style.RESET_ALL}")
            if details:
                print(f"   {Fore.RED}{details}{Style.RESET_ALL}")

        self.results.append(
            {
                "test": name,
                "success": success,
                "details": details,
                "timestamp": datetime.now().isoformat(),
            }
        )

    def authenticate(self) -> bool:
        """Authenticate and get access token"""
        print(f"\n{Fore.CYAN}=== AUTHENTICATION ==={Style.RESET_ALL}")

        # Try to login
        response = self.session.post(
            f"{API_V1}/auth/token",
            data={"username": "admin@6fb.com", "password": "admin123"},
        )

        if response.status_code == 200:
            self.access_token = response.json()["access_token"]
            self.session.headers.update(
                {"Authorization": f"Bearer {self.access_token}"}
            )
            self.print_test("Authentication", True, "Token received")
            return True
        else:
            self.print_test("Authentication", False, f"Status: {response.status_code}")
            return False

    def test_payment_intent_endpoints(self):
        """Test payment intent creation and management"""
        print(f"\n{Fore.CYAN}=== PAYMENT INTENT ENDPOINTS ==={Style.RESET_ALL}")

        # Create payment intent
        payload = {
            "amount": 5000,  # $50.00
            "currency": "usd",
            "payment_method_type": "card",
            "location_id": 1,
            "description": "Test payment intent",
        }

        response = self.session.post(f"{API_V1}/payments/payment-intents", json=payload)

        if response.status_code == 200:
            data = response.json()
            self.test_data["payment_intent_id"] = data.get("id")
            self.print_test(
                "Create Payment Intent",
                True,
                f"ID: {data.get('id')}, Client Secret: {data.get('client_secret')[:20]}...",
            )

            # Test retrieve
            if self.test_data.get("payment_intent_id"):
                retrieve_response = self.session.get(
                    f"{API_V1}/payments/payment-intents/{self.test_data['payment_intent_id']}"
                )
                self.print_test(
                    "Retrieve Payment Intent",
                    retrieve_response.status_code == 200,
                    f"Status: {retrieve_response.json().get('status') if retrieve_response.status_code == 200 else retrieve_response.status_code}",
                )
        else:
            self.print_test(
                "Create Payment Intent",
                False,
                f"Status: {response.status_code}, Error: {response.text[:100]}",
            )

    def test_stripe_connect_endpoints(self):
        """Test Stripe Connect endpoints"""
        print(f"\n{Fore.CYAN}=== STRIPE CONNECT ENDPOINTS ==={Style.RESET_ALL}")

        # Get barbers
        barbers_response = self.session.get(f"{API_V1}/barbers")
        if barbers_response.status_code == 200 and barbers_response.json():
            barber_id = barbers_response.json()[0]["id"]

            # Test connect URL generation
            connect_response = self.session.get(
                f"{API_V1}/stripe-connect/connect/{barber_id}"
            )
            self.print_test(
                "Generate Connect URL",
                connect_response.status_code == 200,
                f"URL received: {'url' in connect_response.json() if connect_response.status_code == 200 else 'No'}",
            )

            # Test status check
            status_response = self.session.get(
                f"{API_V1}/stripe-connect/status/{barber_id}"
            )
            self.print_test(
                "Check Connect Status",
                status_response.status_code == 200,
                f"Connected: {status_response.json().get('connected') if status_response.status_code == 200 else 'Unknown'}",
            )
        else:
            self.print_test("Stripe Connect Tests", False, "No barbers found")

    def test_payout_endpoints(self):
        """Test payout-related endpoints"""
        print(f"\n{Fore.CYAN}=== PAYOUT ENDPOINTS ==={Style.RESET_ALL}")

        # Test payout summary
        summary_response = self.session.get(f"{API_V1}/payouts/summary")
        self.print_test(
            "Get Payout Summary",
            summary_response.status_code == 200,
            (
                f"Total pending: ${summary_response.json().get('total_pending_payouts', 0):.2f}"
                if summary_response.status_code == 200
                else f"Status: {summary_response.status_code}"
            ),
        )

        # Test pending payouts
        pending_response = self.session.get(f"{API_V1}/payouts/pending")
        self.print_test(
            "Get Pending Payouts",
            pending_response.status_code == 200,
            f"Count: {len(pending_response.json()) if pending_response.status_code == 200 else 'Unknown'}",
        )

    def test_webhook_endpoints(self):
        """Test webhook endpoints"""
        print(f"\n{Fore.CYAN}=== WEBHOOK ENDPOINTS ==={Style.RESET_ALL}")

        # Test webhook without signature (should fail)
        webhook_payload = {
            "id": "evt_test",
            "type": "payment_intent.succeeded",
            "data": {"object": {"id": "pi_test", "amount": 5000}},
        }

        response = self.session.post(f"{API_V1}/webhooks/stripe", json=webhook_payload)

        self.print_test(
            "Webhook Security Check",
            response.status_code == 400,  # Should reject unsigned webhook
            (
                "Correctly rejected unsigned webhook"
                if response.status_code == 400
                else f"Status: {response.status_code}"
            ),
        )

    def test_payment_method_endpoints(self):
        """Test payment method endpoints"""
        print(f"\n{Fore.CYAN}=== PAYMENT METHOD ENDPOINTS ==={Style.RESET_ALL}")

        # List payment methods
        methods_response = self.session.get(f"{API_V1}/payments/payment-methods")
        self.print_test(
            "List Payment Methods",
            methods_response.status_code == 200,
            (
                f"Methods available"
                if methods_response.status_code == 200
                else f"Status: {methods_response.status_code}"
            ),
        )

    def test_refund_endpoints(self):
        """Test refund endpoints"""
        print(f"\n{Fore.CYAN}=== REFUND ENDPOINTS ==={Style.RESET_ALL}")

        if self.test_data.get("payment_intent_id"):
            # Attempt refund (will fail if payment not completed)
            refund_payload = {
                "payment_intent_id": self.test_data["payment_intent_id"],
                "amount": 2500,  # $25.00 partial refund
                "reason": "Test refund",
            }

            response = self.session.post(
                f"{API_V1}/payments/refunds", json=refund_payload
            )

            # Expecting failure since payment wasn't completed
            expected_failure = response.status_code in [400, 422]
            self.print_test(
                "Create Refund (Expected Failure)",
                expected_failure,
                (
                    "Correctly rejected refund for incomplete payment"
                    if expected_failure
                    else f"Unexpected status: {response.status_code}"
                ),
            )

    def generate_report(self):
        """Generate test report"""
        print(f"\n{Fore.CYAN}=== TEST SUMMARY ==={Style.RESET_ALL}")

        total = len(self.results)
        passed = len([r for r in self.results if r["success"]])
        failed = total - passed

        print(f"Total Tests: {total}")
        print(f"{Fore.GREEN}Passed: {passed}{Style.RESET_ALL}")
        print(f"{Fore.RED}Failed: {failed}{Style.RESET_ALL}")
        print(f"Success Rate: {(passed/total*100):.1f}%")

        # Save detailed report
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        report_file = f"payment_endpoint_test_{timestamp}.json"

        with open(report_file, "w") as f:
            json.dump(
                {
                    "timestamp": timestamp,
                    "summary": {"total": total, "passed": passed, "failed": failed},
                    "results": self.results,
                },
                f,
                indent=2,
            )

        print(f"\nDetailed report saved to: {report_file}")

    def run_all_tests(self):
        """Run all endpoint tests"""
        print(f"{Fore.CYAN}{'='*50}")
        print("PAYMENT ENDPOINT TEST SUITE")
        print(f"{'='*50}{Style.RESET_ALL}")

        # Check if server is running
        try:
            response = requests.get(f"{BASE_URL}/health")
            if response.status_code != 200:
                print(f"{Fore.RED}❌ Server not healthy{Style.RESET_ALL}")
                return
        except:
            print(
                f"{Fore.RED}❌ Cannot connect to server at {BASE_URL}{Style.RESET_ALL}"
            )
            print("Please start the server with: uvicorn main:app --reload")
            return

        # Authenticate
        if not self.authenticate():
            print(f"{Fore.RED}Cannot proceed without authentication{Style.RESET_ALL}")
            return

        # Run all tests
        self.test_payment_intent_endpoints()
        self.test_stripe_connect_endpoints()
        self.test_payout_endpoints()
        self.test_webhook_endpoints()
        self.test_payment_method_endpoints()
        self.test_refund_endpoints()

        # Generate report
        self.generate_report()


def main():
    """Main entry point"""
    tester = PaymentEndpointTester()
    tester.run_all_tests()


if __name__ == "__main__":
    main()
