#!/usr/bin/env python3
"""
Comprehensive Customer Booking API Tests
Tests all customer booking endpoints including authentication, data integrity, and edge cases
"""

import requests
import json
import logging
from datetime import datetime, timedelta, date
from pathlib import Path
import sqlite3

# Setup logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# API Configuration
BASE_URL = "http://localhost:8000"
API_BASE = f"{BASE_URL}/api/v1"

# Test customer credentials (use working customer)
TEST_CUSTOMERS = [
    {
        "email": "api_test_customer@example.com",
        "password": "ApiTest123!",  # pragma: allowlist secret
        "name": "API Tester",
    }
]


class CustomerBookingAPITester:
    def __init__(self):
        self.session = requests.Session()
        self.current_customer = None
        self.access_token = None
        self.test_results = {
            "authentication": {},
            "appointments": {},
            "stats": {},
            "reschedule": {},
            "cancel": {},
            "database": {},
            "summary": {},
        }

    def authenticate_customer(self, customer_data):
        """Authenticate a customer and get access token"""

        logger.info(
            f"🔐 Authenticating customer: {customer_data['name']} ({customer_data['email']})"
        )

        try:
            # Login request - customer auth expects JSON with email/password
            login_data = {
                "email": customer_data["email"],
                "password": customer_data["password"],
            }

            response = self.session.post(
                f"{API_BASE}/customer/auth/login",
                json=login_data,
                headers={"Content-Type": "application/json"},
            )

            if response.status_code == 200:
                token_data = response.json()
                self.access_token = token_data.get("access_token")
                self.current_customer = customer_data

                # Set authorization header for future requests
                self.session.headers.update(
                    {"Authorization": f"Bearer {self.access_token}"}
                )

                logger.info(f"✅ Authentication successful for {customer_data['name']}")
                return True

            else:
                logger.error(
                    f"❌ Authentication failed: {response.status_code} - {response.text}"
                )
                return False

        except Exception as e:
            logger.error(f"❌ Authentication error: {e}")
            return False

    def test_get_customer_appointments(self):
        """Test GET /api/v1/customer/appointments endpoint"""

        logger.info("🧪 Testing GET /customer/appointments")

        try:
            # Test basic appointments retrieval
            response = self.session.get(f"{API_BASE}/customer/appointments")

            self.test_results["appointments"]["basic_get"] = {
                "status_code": response.status_code,
                "success": response.status_code == 200,
            }

            if response.status_code == 200:
                data = response.json()
                appointments = data.get("appointments", [])

                logger.info(f"✅ Retrieved {len(appointments)} appointments")

                # Test appointment data structure
                if appointments:
                    sample_apt = appointments[0]
                    required_fields = [
                        "id",
                        "barber_name",
                        "service_name",
                        "appointment_date",
                        "appointment_time",
                        "location_name",
                        "status",
                    ]

                    missing_fields = [
                        field for field in required_fields if field not in sample_apt
                    ]

                    self.test_results["appointments"]["data_structure"] = {
                        "has_required_fields": len(missing_fields) == 0,
                        "missing_fields": missing_fields,
                        "sample_appointment": sample_apt,
                    }

                    if missing_fields:
                        logger.warning(f"⚠️  Missing required fields: {missing_fields}")
                    else:
                        logger.info("✅ All required appointment fields present")

                # Test filtering
                logger.info("🧪 Testing appointment filtering...")

                # Test status filter
                status_response = self.session.get(
                    f"{API_BASE}/customer/appointments?status=completed"
                )

                # Test upcoming filter
                upcoming_response = self.session.get(
                    f"{API_BASE}/customer/appointments?upcoming_only=true"
                )

                # Test date range filter
                date_from = (datetime.now() - timedelta(days=90)).strftime("%Y-%m-%d")
                date_to = datetime.now().strftime("%Y-%m-%d")
                date_response = self.session.get(
                    f"{API_BASE}/customer/appointments?date_from={date_from}&date_to={date_to}"
                )

                self.test_results["appointments"]["filtering"] = {
                    "status_filter": status_response.status_code == 200,
                    "upcoming_filter": upcoming_response.status_code == 200,
                    "date_range_filter": date_response.status_code == 200,
                }

                logger.info("✅ Appointment filtering tests completed")

            else:
                logger.error(
                    f"❌ Failed to retrieve appointments: {response.status_code}"
                )

        except Exception as e:
            logger.error(f"❌ Error testing appointments endpoint: {e}")
            self.test_results["appointments"]["error"] = str(e)

    def test_get_customer_stats(self):
        """Test GET /api/v1/customer/stats endpoint"""

        logger.info("🧪 Testing GET /customer/stats")

        try:
            response = self.session.get(f"{API_BASE}/customer/stats")

            self.test_results["stats"]["basic_get"] = {
                "status_code": response.status_code,
                "success": response.status_code == 200,
            }

            if response.status_code == 200:
                stats = response.json()

                required_stats = [
                    "totalAppointments",
                    "upcomingAppointments",
                    "completedAppointments",
                    "cancelledAppointments",
                    "totalSpent",
                    "favoriteBarber",
                    "favoriteService",
                ]

                missing_stats = [stat for stat in required_stats if stat not in stats]

                self.test_results["stats"]["data_structure"] = {
                    "has_required_stats": len(missing_stats) == 0,
                    "missing_stats": missing_stats,
                    "stats_data": stats,
                }

                if missing_stats:
                    logger.warning(f"⚠️  Missing required stats: {missing_stats}")
                else:
                    logger.info("✅ All required customer stats present")

                # Validate stat values
                validation_results = {
                    "total_appointments_positive": stats.get("totalAppointments", 0)
                    >= 0,
                    "upcoming_appointments_valid": stats.get("upcomingAppointments", 0)
                    >= 0,
                    "completed_appointments_valid": stats.get(
                        "completedAppointments", 0
                    )
                    >= 0,
                    "total_spent_positive": stats.get("totalSpent", 0) >= 0,
                    "favorite_barber_present": bool(stats.get("favoriteBarber")),
                    "favorite_service_present": bool(stats.get("favoriteService")),
                }

                self.test_results["stats"]["validation"] = validation_results

                logger.info(f"📊 Customer Stats: {json.dumps(stats, indent=2)}")

            else:
                logger.error(f"❌ Failed to retrieve stats: {response.status_code}")

        except Exception as e:
            logger.error(f"❌ Error testing stats endpoint: {e}")
            self.test_results["stats"]["error"] = str(e)

    def test_get_specific_appointment(self):
        """Test GET /api/v1/customer/appointments/{id} endpoint"""

        logger.info("🧪 Testing GET /customer/appointments/{id}")

        try:
            # First get list of appointments to find an ID
            list_response = self.session.get(f"{API_BASE}/customer/appointments")

            if list_response.status_code == 200:
                appointments = list_response.json().get("appointments", [])

                if appointments:
                    test_appointment_id = appointments[0]["id"]

                    # Test getting specific appointment
                    response = self.session.get(
                        f"{API_BASE}/customer/appointments/{test_appointment_id}"
                    )

                    self.test_results["appointments"]["specific_get"] = {
                        "status_code": response.status_code,
                        "success": response.status_code == 200,
                        "appointment_id": test_appointment_id,
                    }

                    if response.status_code == 200:
                        appointment = response.json()
                        logger.info(
                            f"✅ Retrieved specific appointment: {appointment['service_name']} on {appointment['appointment_date']}"
                        )
                    else:
                        logger.error(
                            f"❌ Failed to get specific appointment: {response.status_code}"
                        )

                    # Test invalid appointment ID
                    invalid_response = self.session.get(
                        f"{API_BASE}/customer/appointments/999999"
                    )

                    self.test_results["appointments"]["invalid_id"] = {
                        "status_code": invalid_response.status_code,
                        "returns_404": invalid_response.status_code == 404,
                    }

                    if invalid_response.status_code == 404:
                        logger.info("✅ Invalid appointment ID correctly returns 404")
                    else:
                        logger.warning(
                            f"⚠️  Invalid ID returned: {invalid_response.status_code}"
                        )

                else:
                    logger.warning(
                        "⚠️  No appointments found to test specific retrieval"
                    )

            else:
                logger.error(
                    "❌ Could not retrieve appointments list for specific ID test"
                )

        except Exception as e:
            logger.error(f"❌ Error testing specific appointment endpoint: {e}")
            self.test_results["appointments"]["specific_error"] = str(e)

    def test_reschedule_appointment(self):
        """Test PUT /api/v1/customer/appointments/{id}/reschedule endpoint"""

        logger.info("🧪 Testing PUT /customer/appointments/{id}/reschedule")

        try:
            # Find a future appointment to reschedule
            response = self.session.get(
                f"{API_BASE}/customer/appointments?upcoming_only=true"
            )

            if response.status_code == 200:
                appointments = response.json().get("appointments", [])

                if appointments:
                    test_appointment = appointments[0]
                    appointment_id = test_appointment["id"]

                    # Test reschedule to a future date
                    new_date = (datetime.now() + timedelta(days=30)).strftime(
                        "%Y-%m-%d"
                    )
                    new_time = "14:30:00"

                    reschedule_data = {
                        "appointment_date": new_date,
                        "appointment_time": new_time,
                        "reason": "Customer test reschedule",
                    }

                    reschedule_response = self.session.put(
                        f"{API_BASE}/customer/appointments/{appointment_id}/reschedule",
                        json=reschedule_data,
                    )

                    self.test_results["reschedule"]["basic_reschedule"] = {
                        "status_code": reschedule_response.status_code,
                        "success": reschedule_response.status_code == 200,
                        "appointment_id": appointment_id,
                        "new_date": new_date,
                        "new_time": new_time,
                    }

                    if reschedule_response.status_code == 200:
                        logger.info(
                            f"✅ Successfully rescheduled appointment to {new_date} {new_time}"
                        )
                    else:
                        logger.error(
                            f"❌ Reschedule failed: {reschedule_response.status_code} - {reschedule_response.text}"
                        )

                    # Test invalid reschedule (past date)
                    past_date = (datetime.now() - timedelta(days=1)).strftime(
                        "%Y-%m-%d"
                    )
                    invalid_data = {
                        "appointment_date": past_date,
                        "appointment_time": "10:00:00",
                    }

                    invalid_response = self.session.put(
                        f"{API_BASE}/customer/appointments/{appointment_id}/reschedule",
                        json=invalid_data,
                    )

                    self.test_results["reschedule"]["invalid_past_date"] = {
                        "status_code": invalid_response.status_code,
                        "correctly_rejected": invalid_response.status_code == 400,
                    }

                    if invalid_response.status_code == 400:
                        logger.info("✅ Past date reschedule correctly rejected")
                    else:
                        logger.warning(
                            f"⚠️  Past date reschedule status: {invalid_response.status_code}"
                        )

                else:
                    logger.warning(
                        "⚠️  No upcoming appointments found to test reschedule"
                    )

            else:
                logger.error(
                    "❌ Could not retrieve upcoming appointments for reschedule test"
                )

        except Exception as e:
            logger.error(f"❌ Error testing reschedule endpoint: {e}")
            self.test_results["reschedule"]["error"] = str(e)

    def test_cancel_appointment(self):
        """Test PUT /api/v1/customer/appointments/{id}/cancel endpoint"""

        logger.info("🧪 Testing PUT /customer/appointments/{id}/cancel")

        try:
            # Find a future appointment to cancel
            response = self.session.get(
                f"{API_BASE}/customer/appointments?upcoming_only=true"
            )

            if response.status_code == 200:
                appointments = response.json().get("appointments", [])

                # Find a confirmed appointment to cancel
                confirmed_appointments = [
                    apt for apt in appointments if apt["status"] == "confirmed"
                ]

                if confirmed_appointments:
                    test_appointment = confirmed_appointments[0]
                    appointment_id = test_appointment["id"]

                    cancel_data = {"reason": "Customer test cancellation"}

                    cancel_response = self.session.put(
                        f"{API_BASE}/customer/appointments/{appointment_id}/cancel",
                        json=cancel_data,
                    )

                    self.test_results["cancel"]["basic_cancel"] = {
                        "status_code": cancel_response.status_code,
                        "success": cancel_response.status_code == 200,
                        "appointment_id": appointment_id,
                    }

                    if cancel_response.status_code == 200:
                        logger.info(
                            f"✅ Successfully cancelled appointment {appointment_id}"
                        )

                        # Verify appointment is actually cancelled
                        verify_response = self.session.get(
                            f"{API_BASE}/customer/appointments/{appointment_id}"
                        )

                        if verify_response.status_code == 200:
                            appointment = verify_response.json()
                            if appointment["status"] == "cancelled":
                                logger.info(
                                    "✅ Appointment status correctly updated to cancelled"
                                )
                                self.test_results["cancel"]["status_updated"] = True
                            else:
                                logger.warning(
                                    f"⚠️  Appointment status is: {appointment['status']}"
                                )
                                self.test_results["cancel"]["status_updated"] = False

                    else:
                        logger.error(
                            f"❌ Cancel failed: {cancel_response.status_code} - {cancel_response.text}"
                        )

                    # Test cancelling already cancelled appointment
                    double_cancel_response = self.session.put(
                        f"{API_BASE}/customer/appointments/{appointment_id}/cancel",
                        json={"reason": "Test double cancel"},
                    )

                    self.test_results["cancel"]["double_cancel"] = {
                        "status_code": double_cancel_response.status_code,
                        "correctly_rejected": double_cancel_response.status_code == 404,
                    }

                else:
                    logger.warning(
                        "⚠️  No confirmed appointments found to test cancellation"
                    )

            else:
                logger.error("❌ Could not retrieve appointments for cancel test")

        except Exception as e:
            logger.error(f"❌ Error testing cancel endpoint: {e}")
            self.test_results["cancel"]["error"] = str(e)

    def test_database_relationships(self):
        """Test that database relationships work correctly"""

        logger.info("🧪 Testing database relationships")

        try:
            db_path = Path("6fb_booking.db")
            conn = sqlite3.connect(str(db_path))
            cursor = conn.cursor()

            # Test customer-appointment relationship
            cursor.execute(
                """
                SELECT
                    c.email,
                    c.first_name,
                    c.last_name,
                    COUNT(a.id) as appointment_count
                FROM customers c
                LEFT JOIN appointments a ON c.id = a.customer_id
                WHERE c.email = ?
                GROUP BY c.id
            """,
                (self.current_customer["email"],),
            )

            result = cursor.fetchone()

            if result:
                email, first_name, last_name, appointment_count = result

                self.test_results["database"]["customer_appointment_link"] = {
                    "customer_found": True,
                    "appointment_count": appointment_count,
                    "customer_name": f"{first_name} {last_name}",
                }

                logger.info(
                    f"✅ Customer {first_name} {last_name} has {appointment_count} linked appointments"
                )

            else:
                logger.error("❌ Customer not found in database")
                self.test_results["database"]["customer_appointment_link"] = {
                    "customer_found": False
                }

            # Test appointment data integrity
            cursor.execute(
                """
                SELECT
                    COUNT(*) as total_appointments,
                    COUNT(CASE WHEN customer_id IS NOT NULL THEN 1 END) as linked_appointments,
                    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_appointments,
                    COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as upcoming_appointments
                FROM appointments
                WHERE customer_id = (SELECT id FROM customers WHERE email = ?)
            """,
                (self.current_customer["email"],),
            )

            integrity_result = cursor.fetchone()

            if integrity_result:
                total, linked, completed, upcoming = integrity_result

                self.test_results["database"]["data_integrity"] = {
                    "total_appointments": total,
                    "linked_appointments": linked,
                    "completed_appointments": completed,
                    "upcoming_appointments": upcoming,
                    "all_linked": total == linked,
                }

                logger.info(
                    f"✅ Data integrity: {linked}/{total} appointments properly linked"
                )

            conn.close()

        except Exception as e:
            logger.error(f"❌ Database relationship test error: {e}")
            self.test_results["database"]["error"] = str(e)

    def run_comprehensive_tests(self):
        """Run all customer booking API tests"""

        logger.info("🚀 Starting comprehensive customer booking API tests")

        test_passed = 0
        test_failed = 0

        for customer in TEST_CUSTOMERS:
            logger.info(f"\n{'='*60}")
            logger.info(f"Testing customer: {customer['name']} ({customer['email']})")
            logger.info(f"{'='*60}")

            # Authenticate
            if self.authenticate_customer(customer):
                self.test_results["authentication"][customer["email"]] = True

                # Run all tests for this customer
                try:
                    self.test_get_customer_appointments()
                    self.test_get_customer_stats()
                    self.test_get_specific_appointment()
                    self.test_reschedule_appointment()
                    self.test_cancel_appointment()
                    self.test_database_relationships()

                    test_passed += 1

                except Exception as e:
                    logger.error(f"❌ Tests failed for {customer['name']}: {e}")
                    test_failed += 1

            else:
                self.test_results["authentication"][customer["email"]] = False
                test_failed += 1
                logger.error(
                    f"❌ Skipping tests for {customer['name']} due to authentication failure"
                )

        # Generate summary
        self.test_results["summary"] = {
            "customers_tested": len(TEST_CUSTOMERS),
            "customers_passed": test_passed,
            "customers_failed": test_failed,
            "success_rate": f"{(test_passed / len(TEST_CUSTOMERS)) * 100:.1f}%",
        }

        return self.test_results

    def generate_test_report(self):
        """Generate a comprehensive test report"""

        report = {
            "test_run_timestamp": datetime.now().isoformat(),
            "customer_booking_api_test_results": self.test_results,
        }

        # Save to file
        report_filename = f"customer_booking_test_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"

        with open(report_filename, "w") as f:
            json.dump(report, f, indent=2, default=str)

        logger.info(f"📊 Test report saved to: {report_filename}")

        # Print summary
        logger.info(f"\n{'='*80}")
        logger.info("📊 CUSTOMER BOOKING API TEST SUMMARY")
        logger.info(f"{'='*80}")

        summary = self.test_results["summary"]
        logger.info(f"Customers Tested: {summary['customers_tested']}")
        logger.info(f"Customers Passed: {summary['customers_passed']}")
        logger.info(f"Customers Failed: {summary['customers_failed']}")
        logger.info(f"Success Rate: {summary['success_rate']}")

        # Authentication summary
        auth_results = self.test_results["authentication"]
        auth_success = sum(1 for result in auth_results.values() if result)
        logger.info(f"Authentication Success: {auth_success}/{len(auth_results)}")

        return report_filename


def main():
    """Main function to run customer booking API tests"""

    logger.info("🎯 Customer Booking API Comprehensive Test Suite")
    logger.info("=" * 80)

    # Check if server is running
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=5)
        if response.status_code != 200:
            logger.error(
                "❌ Server is not responding properly. Please start the backend server."
            )
            return False
    except requests.exceptions.RequestException:
        logger.error(
            "❌ Cannot connect to server. Please ensure the backend is running on localhost:8000"
        )
        return False

    logger.info("✅ Server is running and accessible")

    # Run tests
    tester = CustomerBookingAPITester()
    test_results = tester.run_comprehensive_tests()

    # Generate report
    report_file = tester.generate_test_report()

    # Determine if tests passed overall
    summary = test_results["summary"]
    success_rate = float(summary["success_rate"].rstrip("%"))

    if success_rate >= 80:
        logger.info("🎉 Customer booking API tests PASSED!")
        return True
    else:
        logger.error("❌ Customer booking API tests FAILED!")
        return False


if __name__ == "__main__":
    success = main()
    if not success:
        exit(1)
