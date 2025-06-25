#!/usr/bin/env python3
"""
Customer Dashboard and Stats Test Script
Tests customer-specific dashboard features and appointment management
"""

import requests
import json
from datetime import datetime
from typing import Dict, Optional

# Test Configuration
BASE_URL = "http://localhost:8000"
CUSTOMER_API_BASE = f"{BASE_URL}/api/v1/customer"
HEADERS = {"Content-Type": "application/json"}


class CustomerDashboardTester:
    def __init__(self):
        self.test_results = []
        self.auth_token = None
        self.customer_data = None

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

    def authenticate_test_customer(self, email: str = None, password: str = None):
        """Authenticate with a test customer"""
        print("🔐 Authenticating test customer...")

        # Use provided credentials or try to find an existing customer
        if email and password:
            login_data = {"email": email, "password": password}
        else:
            # Create a new test customer if none provided
            test_email = f"dashboard_test_{int(datetime.now().timestamp())}@example.com"
            test_password = "DashboardTest123!"  # pragma: allowlist secret

            # Register new customer
            register_data = {
                "email": test_email,
                "password": test_password,
                "first_name": "Dashboard",
                "last_name": "Tester",
                "phone": "+1234567890",
            }

            try:
                register_response = requests.post(
                    f"{CUSTOMER_API_BASE}/auth/register",
                    json=register_data,
                    headers=HEADERS,
                )

                if register_response.status_code == 200:
                    print(f"✅ Created test customer: {test_email}")
                    login_data = {"email": test_email, "password": test_password}
                else:
                    print(
                        f"❌ Failed to create test customer: {register_response.text}"
                    )
                    return False

            except Exception as e:
                print(f"❌ Error creating test customer: {str(e)}")
                return False

        # Login
        try:
            login_response = requests.post(
                f"{CUSTOMER_API_BASE}/auth/login", json=login_data, headers=HEADERS
            )

            if login_response.status_code == 200:
                token_data = login_response.json()
                self.auth_token = token_data["access_token"]
                self.customer_data = token_data["customer"]
                print(f"✅ Authenticated as: {self.customer_data['email']}")
                return True
            else:
                print(f"❌ Authentication failed: {login_response.text}")
                return False

        except Exception as e:
            print(f"❌ Authentication error: {str(e)}")
            return False

    def get_auth_headers(self):
        """Get headers with authentication token"""
        return {**HEADERS, "Authorization": f"Bearer {self.auth_token}"}

    def test_customer_profile_access(self):
        """Test customer profile access and data"""
        print("\n👤 Testing Customer Profile Access...")

        try:
            response = requests.get(
                f"{CUSTOMER_API_BASE}/auth/me", headers=self.get_auth_headers()
            )

            if response.status_code == 200:
                profile = response.json()
                self.log_test(
                    "Customer Profile Access",
                    True,
                    {
                        "customer_id": profile.get("id"),
                        "email": profile.get("email"),
                        "full_name": profile.get("full_name"),
                        "is_active": profile.get("is_active"),
                        "is_verified": profile.get("is_verified"),
                        "created_at": profile.get("created_at"),
                        "last_login": profile.get("last_login"),
                    },
                )
            else:
                self.log_test(
                    "Customer Profile Access",
                    False,
                    {"status_code": response.status_code, "response": response.text},
                )

        except Exception as e:
            self.log_test("Customer Profile Access", False, error=str(e))

    def test_customer_appointments(self):
        """Test customer appointment retrieval"""
        print("\n📅 Testing Customer Appointments...")

        try:
            # Test getting customer appointments
            response = requests.get(
                f"{CUSTOMER_API_BASE}/appointments", headers=self.get_auth_headers()
            )

            if response.status_code == 200:
                appointments = response.json()
                self.log_test(
                    "Customer Appointments - Get All",
                    True,
                    {
                        "appointment_count": len(appointments),
                        "appointments": (
                            appointments[:2] if appointments else []
                        ),  # Show first 2
                    },
                )
            else:
                self.log_test(
                    "Customer Appointments - Get All",
                    False,
                    {"status_code": response.status_code, "response": response.text},
                )

        except Exception as e:
            self.log_test("Customer Appointments - Get All", False, error=str(e))

        # Test filtering appointments by status
        try:
            response = requests.get(
                f"{CUSTOMER_API_BASE}/appointments?status=scheduled",
                headers=self.get_auth_headers(),
            )

            if response.status_code == 200:
                scheduled_appointments = response.json()
                self.log_test(
                    "Customer Appointments - Filter by Status",
                    True,
                    {"scheduled_count": len(scheduled_appointments)},
                )
            else:
                self.log_test(
                    "Customer Appointments - Filter by Status",
                    False,
                    {"status_code": response.status_code, "response": response.text},
                )

        except Exception as e:
            self.log_test(
                "Customer Appointments - Filter by Status", False, error=str(e)
            )

    def test_customer_booking_flow(self):
        """Test customer booking functionality"""
        print("\n📝 Testing Customer Booking Flow...")

        # First, get available time slots
        try:
            response = requests.get(
                f"{CUSTOMER_API_BASE}/availability", headers=self.get_auth_headers()
            )

            if response.status_code == 200:
                availability = response.json()
                self.log_test(
                    "Customer Booking - Check Availability",
                    True,
                    {"availability_data": availability},
                )
            else:
                self.log_test(
                    "Customer Booking - Check Availability",
                    False,
                    {"status_code": response.status_code, "response": response.text},
                )

        except Exception as e:
            self.log_test("Customer Booking - Check Availability", False, error=str(e))

        # Test booking creation (would need actual available slots)
        try:
            from datetime import datetime, timedelta

            future_date = datetime.now() + timedelta(days=7)

            booking_data = {
                "barber_id": 1,  # Assuming barber ID 1 exists
                "location_id": 1,  # Assuming location ID 1 exists
                "appointment_datetime": future_date.isoformat(),
                "service_type": "Haircut",
                "notes": "Test booking from dashboard",
            }

            response = requests.post(
                f"{CUSTOMER_API_BASE}/appointments",
                json=booking_data,
                headers=self.get_auth_headers(),
            )

            if response.status_code in [200, 201]:
                booking_result = response.json()
                self.log_test(
                    "Customer Booking - Create Appointment",
                    True,
                    {"appointment_id": booking_result.get("id")},
                )
            else:
                self.log_test(
                    "Customer Booking - Create Appointment",
                    False,
                    {"status_code": response.status_code, "response": response.text},
                )

        except Exception as e:
            self.log_test("Customer Booking - Create Appointment", False, error=str(e))

    def test_customer_preferences(self):
        """Test customer preferences and settings"""
        print("\n⚙️ Testing Customer Preferences...")

        # Test updating preferences
        try:
            preferences_data = {
                "newsletter_subscription": False,
                "preferred_barber_id": 1,
                "preferred_location_id": 1,
            }

            response = requests.put(
                f"{CUSTOMER_API_BASE}/auth/profile",
                json=preferences_data,
                headers=self.get_auth_headers(),
            )

            if response.status_code == 200:
                updated_profile = response.json()
                self.log_test(
                    "Customer Preferences - Update Settings",
                    True,
                    {
                        "newsletter_subscription": updated_profile.get(
                            "newsletter_subscription"
                        ),
                        "preferred_barber_id": updated_profile.get(
                            "preferred_barber_id"
                        ),
                        "preferred_location_id": updated_profile.get(
                            "preferred_location_id"
                        ),
                    },
                )
            else:
                self.log_test(
                    "Customer Preferences - Update Settings",
                    False,
                    {"status_code": response.status_code, "response": response.text},
                )

        except Exception as e:
            self.log_test("Customer Preferences - Update Settings", False, error=str(e))

    def test_customer_stats(self):
        """Test customer statistics and analytics"""
        print("\n📊 Testing Customer Statistics...")

        try:
            response = requests.get(
                f"{CUSTOMER_API_BASE}/stats", headers=self.get_auth_headers()
            )

            if response.status_code == 200:
                stats = response.json()
                self.log_test("Customer Statistics", True, stats)
            else:
                self.log_test(
                    "Customer Statistics",
                    False,
                    {"status_code": response.status_code, "response": response.text},
                )

        except Exception as e:
            self.log_test("Customer Statistics", False, error=str(e))

    def test_customer_payment_methods(self):
        """Test customer payment methods management"""
        print("\n💳 Testing Customer Payment Methods...")

        try:
            response = requests.get(
                f"{CUSTOMER_API_BASE}/payment-methods", headers=self.get_auth_headers()
            )

            if response.status_code == 200:
                payment_methods = response.json()
                self.log_test(
                    "Customer Payment Methods - Get All",
                    True,
                    {"payment_methods_count": len(payment_methods)},
                )
            else:
                self.log_test(
                    "Customer Payment Methods - Get All",
                    False,
                    {"status_code": response.status_code, "response": response.text},
                )

        except Exception as e:
            self.log_test("Customer Payment Methods - Get All", False, error=str(e))

    def run_dashboard_tests(
        self, customer_email: str = None, customer_password: str = None
    ):
        """Run all customer dashboard tests"""
        print("\n" + "=" * 80)
        print("🏪 CUSTOMER DASHBOARD TEST SUITE")
        print("=" * 80)

        # Check if server is running by trying a simple endpoint
        print("🔍 Checking server connectivity...")
        try:
            # Try to reach any endpoint that should work
            response = requests.post(
                f"{CUSTOMER_API_BASE}/auth/register",
                json={},
                headers=HEADERS,
                timeout=5,
            )
            # Even if it returns an error, the server is responding
            print("✅ Server is running and accessible")
        except Exception as e:
            print(f"❌ Cannot connect to server: {str(e)}")
            return

        # Authenticate
        if not self.authenticate_test_customer(customer_email, customer_password):
            print("❌ Authentication failed - cannot proceed with dashboard tests")
            return

        # Run dashboard tests
        self.test_customer_profile_access()
        self.test_customer_appointments()
        self.test_customer_booking_flow()
        self.test_customer_preferences()
        self.test_customer_stats()
        self.test_customer_payment_methods()

        # Generate summary
        self.generate_dashboard_summary()

    def generate_dashboard_summary(self):
        """Generate dashboard test summary"""
        print("\n" + "=" * 80)
        print("📊 DASHBOARD TEST SUMMARY")
        print("=" * 80)

        total_tests = len(self.test_results)
        passed_tests = len([r for r in self.test_results if r["success"]])
        failed_tests = total_tests - passed_tests

        print(f"Total Dashboard Tests: {total_tests}")
        print(f"Passed: {passed_tests} ✅")
        print(f"Failed: {failed_tests} ❌")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")

        print("\n📋 DETAILED RESULTS:")
        for result in self.test_results:
            status = "✅" if result["success"] else "❌"
            print(f"{status} {result['test_name']}")
            if result["error"]:
                print(f"    Error: {result['error']}")

        # Save detailed report
        report_filename = f"customer_dashboard_test_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        report_data = {
            "test_summary": {
                "total_tests": total_tests,
                "passed_tests": passed_tests,
                "failed_tests": failed_tests,
                "success_rate": (passed_tests / total_tests) * 100,
                "test_timestamp": datetime.now().isoformat(),
                "customer_tested": (
                    self.customer_data.get("email") if self.customer_data else None
                ),
            },
            "test_results": self.test_results,
        }

        with open(report_filename, "w") as f:
            json.dump(report_data, f, indent=2)

        print(f"\n💾 Dashboard test report saved to: {report_filename}")
        print("=" * 80)


if __name__ == "__main__":
    import sys

    # Allow passing customer credentials as command line arguments
    customer_email = sys.argv[1] if len(sys.argv) > 1 else None
    customer_password = sys.argv[2] if len(sys.argv) > 2 else None

    tester = CustomerDashboardTester()
    tester.run_dashboard_tests(customer_email, customer_password)
