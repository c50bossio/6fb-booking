#!/usr/bin/env python3
"""
Test Complete Booking Flow for 6FB Booking Platform
Usage: python scripts/test_booking_flow.py [--production]
"""

import sys
import os
import requests
import json
from datetime import datetime, timedelta
import argparse
from typing import Dict, Any
import time

# Color codes for output
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
BLUE = "\033[94m"
RESET = "\033[0m"


class BookingFlowTester:
    def __init__(self, base_url: str, verbose: bool = True):
        self.base_url = base_url.rstrip("/")
        self.verbose = verbose
        self.session = requests.Session()
        self.test_data = {}

    def log(self, message: str, status: str = "info"):
        """Print colored log messages"""
        if not self.verbose:
            return

        colors = {"success": GREEN, "error": RED, "warning": YELLOW, "info": BLUE}
        color = colors.get(status, RESET)
        print(f"{color}{message}{RESET}")

    def test_health_check(self) -> bool:
        """Test if the API is accessible"""
        self.log("\n🏥 Testing API Health Check...", "info")
        try:
            response = self.session.get(f"{self.base_url}/health")
            if response.status_code == 200:
                data = response.json()
                self.log(f"   ✅ API is healthy: {data}", "success")
                return True
            else:
                self.log(f"   ❌ Health check failed: {response.status_code}", "error")
                return False
        except Exception as e:
            self.log(f"   ❌ Connection error: {str(e)}", "error")
            return False

    def test_get_locations(self) -> bool:
        """Test fetching available locations"""
        self.log("\n📍 Testing Get Locations...", "info")
        try:
            response = self.session.get(f"{self.base_url}/api/v1/locations")
            if response.status_code == 200:
                locations = response.json()
                self.log(f"   ✅ Found {len(locations)} locations", "success")
                if locations:
                    self.test_data["location_id"] = locations[0]["id"]
                    self.log(f"   📍 Using location: {locations[0]['name']}", "info")
                return True
            else:
                self.log(
                    f"   ❌ Failed to get locations: {response.status_code}", "error"
                )
                return False
        except Exception as e:
            self.log(f"   ❌ Error: {str(e)}", "error")
            return False

    def test_get_services(self) -> bool:
        """Test fetching available services"""
        self.log("\n💈 Testing Get Services...", "info")
        try:
            response = self.session.get(f"{self.base_url}/api/v1/services")
            if response.status_code == 200:
                services = response.json()
                self.log(f"   ✅ Found {len(services)} services", "success")
                if services:
                    self.test_data["service_id"] = services[0]["id"]
                    self.test_data["service_name"] = services[0]["name"]
                    self.test_data["service_price"] = services[0]["price"]
                    self.test_data["service_duration"] = services[0]["duration"]
                    self.log(
                        f"   💈 Using service: {services[0]['name']} (${services[0]['price']})",
                        "info",
                    )
                return True
            else:
                self.log(
                    f"   ❌ Failed to get services: {response.status_code}", "error"
                )
                return False
        except Exception as e:
            self.log(f"   ❌ Error: {str(e)}", "error")
            return False

    def test_get_barbers(self) -> bool:
        """Test fetching available barbers"""
        self.log("\n👨 Testing Get Barbers...", "info")
        try:
            location_id = self.test_data.get("location_id")
            if not location_id:
                self.log("   ⚠️  No location ID available", "warning")
                return False

            response = self.session.get(
                f"{self.base_url}/api/v1/barbers?location_id={location_id}"
            )
            if response.status_code == 200:
                barbers = response.json()
                self.log(f"   ✅ Found {len(barbers)} barbers", "success")
                if barbers:
                    self.test_data["barber_id"] = barbers[0]["id"]
                    self.test_data["barber_name"] = (
                        f"{barbers[0]['first_name']} {barbers[0]['last_name']}"
                    )
                    self.log(
                        f"   👨 Using barber: {self.test_data['barber_name']}", "info"
                    )
                return True
            else:
                self.log(
                    f"   ❌ Failed to get barbers: {response.status_code}", "error"
                )
                return False
        except Exception as e:
            self.log(f"   ❌ Error: {str(e)}", "error")
            return False

    def test_check_availability(self) -> bool:
        """Test checking barber availability"""
        self.log("\n📅 Testing Check Availability...", "info")
        try:
            barber_id = self.test_data.get("barber_id")
            if not barber_id:
                self.log("   ⚠️  No barber ID available", "warning")
                return False

            # Check availability for next 7 days
            date = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
            response = self.session.get(
                f"{self.base_url}/api/v1/appointments/availability",
                params={
                    "barber_id": barber_id,
                    "date": date,
                    "service_id": self.test_data.get("service_id"),
                },
            )

            if response.status_code == 200:
                slots = response.json()
                self.log(f"   ✅ Found {len(slots)} available time slots", "success")
                if slots:
                    self.test_data["appointment_date"] = date
                    self.test_data["appointment_time"] = slots[0]
                    self.log(f"   📅 Using slot: {date} at {slots[0]}", "info")
                return True
            else:
                self.log(
                    f"   ❌ Failed to check availability: {response.status_code}",
                    "error",
                )
                return False
        except Exception as e:
            self.log(f"   ❌ Error: {str(e)}", "error")
            return False

    def test_create_booking(self) -> bool:
        """Test creating a booking"""
        self.log("\n📝 Testing Create Booking...", "info")
        try:
            booking_data = {
                "service_id": self.test_data.get("service_id"),
                "barber_id": self.test_data.get("barber_id"),
                "appointment_date": self.test_data.get("appointment_date"),
                "appointment_time": self.test_data.get("appointment_time"),
                "client_name": "John Doe",
                "client_email": "john.doe@test.com",
                "client_phone": "+1234567890",
                "notes": "Test booking from API test script",
            }

            response = self.session.post(
                f"{self.base_url}/api/v1/bookings", json=booking_data
            )

            if response.status_code in [200, 201]:
                booking = response.json()
                self.test_data["booking_id"] = booking.get("id") or booking.get(
                    "booking_id"
                )
                self.test_data["confirmation_code"] = booking.get("confirmation_code")
                self.log(f"   ✅ Booking created successfully!", "success")
                self.log(f"   📋 Booking ID: {self.test_data['booking_id']}", "info")
                self.log(
                    f"   🎫 Confirmation Code: {self.test_data['confirmation_code']}",
                    "info",
                )
                return True
            else:
                self.log(
                    f"   ❌ Failed to create booking: {response.status_code}", "error"
                )
                self.log(f"   Response: {response.text}", "error")
                return False
        except Exception as e:
            self.log(f"   ❌ Error: {str(e)}", "error")
            return False

    def test_get_booking_details(self) -> bool:
        """Test retrieving booking details"""
        self.log("\n🔍 Testing Get Booking Details...", "info")
        try:
            booking_id = self.test_data.get("booking_id")
            if not booking_id:
                self.log("   ⚠️  No booking ID available", "warning")
                return False

            response = self.session.get(f"{self.base_url}/api/v1/bookings/{booking_id}")

            if response.status_code == 200:
                booking = response.json()
                self.log(f"   ✅ Booking details retrieved", "success")
                self.log(f"   📋 Status: {booking.get('status')}", "info")
                self.log(f"   💈 Service: {booking.get('service_name')}", "info")
                self.log(f"   👨 Barber: {booking.get('barber_name')}", "info")
                self.log(
                    f"   📅 Date/Time: {booking.get('appointment_date')} {booking.get('appointment_time')}",
                    "info",
                )
                return True
            else:
                self.log(
                    f"   ❌ Failed to get booking details: {response.status_code}",
                    "error",
                )
                return False
        except Exception as e:
            self.log(f"   ❌ Error: {str(e)}", "error")
            return False

    def test_admin_login(self) -> bool:
        """Test admin login"""
        self.log("\n🔐 Testing Admin Login...", "info")
        try:
            login_data = {
                "username": "admin@6fb.com",  # Update with your admin email
                "password": "admin123",  # Update with your admin password
            }

            response = self.session.post(
                f"{self.base_url}/api/v1/auth/login",
                data=login_data,  # Form data, not JSON
            )

            if response.status_code == 200:
                auth_data = response.json()
                self.test_data["access_token"] = auth_data.get("access_token")
                self.session.headers.update(
                    {"Authorization": f"Bearer {self.test_data['access_token']}"}
                )
                self.log(f"   ✅ Admin login successful", "success")
                return True
            else:
                self.log(f"   ❌ Admin login failed: {response.status_code}", "error")
                self.log(f"   Response: {response.text}", "error")
                return False
        except Exception as e:
            self.log(f"   ❌ Error: {str(e)}", "error")
            return False

    def test_admin_get_appointments(self) -> bool:
        """Test admin fetching appointments"""
        self.log("\n📋 Testing Admin Get Appointments...", "info")
        try:
            if not self.test_data.get("access_token"):
                self.log("   ⚠️  Not authenticated as admin", "warning")
                return False

            response = self.session.get(f"{self.base_url}/api/v1/appointments")

            if response.status_code == 200:
                appointments = response.json()
                self.log(f"   ✅ Retrieved {len(appointments)} appointments", "success")
                return True
            else:
                self.log(
                    f"   ❌ Failed to get appointments: {response.status_code}", "error"
                )
                return False
        except Exception as e:
            self.log(f"   ❌ Error: {str(e)}", "error")
            return False

    def run_all_tests(self) -> Dict[str, bool]:
        """Run all booking flow tests"""
        self.log("\n🚀 Starting Booking Flow Tests", "info")
        self.log(f"   🌐 Base URL: {self.base_url}", "info")
        self.log("=" * 50, "info")

        tests = [
            ("Health Check", self.test_health_check),
            ("Get Locations", self.test_get_locations),
            ("Get Services", self.test_get_services),
            ("Get Barbers", self.test_get_barbers),
            ("Check Availability", self.test_check_availability),
            ("Create Booking", self.test_create_booking),
            ("Get Booking Details", self.test_get_booking_details),
            ("Admin Login", self.test_admin_login),
            ("Admin Get Appointments", self.test_admin_get_appointments),
        ]

        results = {}
        for test_name, test_func in tests:
            try:
                results[test_name] = test_func()
                time.sleep(0.5)  # Small delay between tests
            except Exception as e:
                self.log(f"   ❌ Test '{test_name}' crashed: {str(e)}", "error")
                results[test_name] = False

        # Summary
        self.log("\n" + "=" * 50, "info")
        self.log("📊 Test Summary:", "info")
        passed = sum(1 for result in results.values() if result)
        total = len(results)

        for test_name, result in results.items():
            status = "✅ PASS" if result else "❌ FAIL"
            color = "success" if result else "error"
            self.log(f"   {status} - {test_name}", color)

        self.log(f"\n📈 Total: {passed}/{total} tests passed", "info")

        if passed == total:
            self.log(
                "\n🎉 All tests passed! The booking flow is working correctly.",
                "success",
            )
        else:
            self.log(
                f"\n⚠️  {total - passed} tests failed. Please check the errors above.",
                "warning",
            )

        return results


def main():
    parser = argparse.ArgumentParser(description="Test the complete booking flow")
    parser.add_argument(
        "--production", action="store_true", help="Run tests against production API"
    )
    parser.add_argument("--base-url", default=None, help="Custom base URL for API")
    parser.add_argument("--quiet", action="store_true", help="Reduce output verbosity")

    args = parser.parse_args()

    # Determine base URL
    if args.base_url:
        base_url = args.base_url
    elif args.production:
        base_url = "https://sixfb-backend.onrender.com"
    else:
        base_url = "http://localhost:8000"

    # Run tests
    tester = BookingFlowTester(base_url, verbose=not args.quiet)
    results = tester.run_all_tests()

    # Exit with appropriate code
    sys.exit(0 if all(results.values()) else 1)


if __name__ == "__main__":
    main()
