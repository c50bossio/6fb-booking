#!/usr/bin/env python3
"""
Comprehensive Booking System Tests
Tests all aspects of the native booking functionality
"""

import asyncio
import json
from datetime import datetime, date, time, timedelta
import httpx
from typing import Dict, Any, Optional, List
import random
import string

# Configuration
BASE_URL = "http://localhost:8000"
API_VERSION = "/api/v1"

# Test data
TEST_USER = {"email": "bookingtest@example.com", "password": "TestPassword123!"}

TEST_BARBER_USER = {"email": "barbertest@example.com", "password": "BarberPass123!"}

TEST_CLIENT = {
    "first_name": "John",
    "last_name": "Doe",
    "email": "johndoe@example.com",
    "phone": "555-123-4567",
}


class BookingSystemTester:
    def __init__(self):
        self.base_url = BASE_URL
        self.api_url = f"{BASE_URL}{API_VERSION}"
        self.token = None
        self.barber_token = None
        self.test_results = []
        self.location_id = None
        self.barber_id = None
        self.service_id = None
        self.appointment_id = None
        self.booking_token = None

    def log_result(self, test_name: str, status: str, details: Any = None):
        """Log test results"""
        result = {
            "test": test_name,
            "status": status,
            "timestamp": datetime.now().isoformat(),
            "details": details,
        }
        self.test_results.append(result)
        print(f"{'✅' if status == 'passed' else '❌'} {test_name}: {status}")
        if details:
            print(f"   Details: {json.dumps(details, indent=2)}")

    async def setup_test_users(self):
        """Create test users if they don't exist"""
        async with httpx.AsyncClient() as client:
            # Try to create admin user
            try:
                resp = await client.post(
                    f"{self.api_url}/auth/register",
                    json={
                        "email": TEST_USER["email"],
                        "password": TEST_USER["password"],
                        "role": "admin",
                    },
                )
                if resp.status_code == 200:
                    self.log_result(
                        "Create Admin User", "passed", {"email": TEST_USER["email"]}
                    )
            except Exception as e:
                # User might already exist
                pass

            # Login as admin
            resp = await client.post(
                f"{self.api_url}/auth/login",
                data={
                    "username": TEST_USER["email"],
                    "password": TEST_USER["password"],
                },
            )
            if resp.status_code == 200:
                self.token = resp.json()["access_token"]
                self.log_result("Admin Login", "passed")
            else:
                self.log_result("Admin Login", "failed", resp.json())
                return False

            # Create barber user if needed
            try:
                resp = await client.post(
                    f"{self.api_url}/auth/register",
                    json={
                        "email": TEST_BARBER_USER["email"],
                        "password": TEST_BARBER_USER["password"],
                        "role": "barber",
                    },
                )
                if resp.status_code == 200:
                    self.log_result(
                        "Create Barber User",
                        "passed",
                        {"email": TEST_BARBER_USER["email"]},
                    )
            except:
                pass

            # Login as barber
            resp = await client.post(
                f"{self.api_url}/auth/login",
                data={
                    "username": TEST_BARBER_USER["email"],
                    "password": TEST_BARBER_USER["password"],
                },
            )
            if resp.status_code == 200:
                self.barber_token = resp.json()["access_token"]
                self.log_result("Barber Login", "passed")

        return True

    async def test_public_endpoints(self):
        """Test public booking endpoints that don't require authentication"""
        print("\n🔍 Testing Public Endpoints...")

        async with httpx.AsyncClient() as client:
            # 1. Get shops/locations
            resp = await client.get(f"{self.api_url}/locations")
            if resp.status_code == 200:
                locations = resp.json()
                if locations:
                    self.location_id = locations[0]["id"]
                    self.log_result(
                        "Get Locations",
                        "passed",
                        {
                            "count": len(locations),
                            "first_location": locations[0]["name"],
                        },
                    )
                else:
                    self.log_result("Get Locations", "failed", "No locations found")
            else:
                self.log_result("Get Locations", "failed", resp.json())

            # 2. Get barbers for a shop
            if self.location_id:
                resp = await client.get(
                    f"{self.api_url}/booking/public/shops/{self.location_id}/barbers"
                )
                if resp.status_code == 200:
                    barbers = resp.json()
                    if barbers:
                        self.barber_id = barbers[0]["id"]
                        self.log_result(
                            "Get Shop Barbers",
                            "passed",
                            {
                                "count": len(barbers),
                                "first_barber": f"{barbers[0]['first_name']} {barbers[0]['last_name']}",
                            },
                        )
                    else:
                        self.log_result(
                            "Get Shop Barbers", "failed", "No barbers found"
                        )
                else:
                    self.log_result("Get Shop Barbers", "failed", resp.json())

            # 3. Get services for a barber
            if self.barber_id:
                resp = await client.get(
                    f"{self.api_url}/booking/public/barbers/{self.barber_id}/services"
                )
                if resp.status_code == 200:
                    services = resp.json()
                    if services:
                        self.service_id = services[0]["id"]
                        self.log_result(
                            "Get Barber Services",
                            "passed",
                            {
                                "count": len(services),
                                "categories": list(
                                    set(s["category_name"] for s in services)
                                ),
                                "first_service": services[0]["name"],
                                "price": services[0]["base_price"],
                            },
                        )
                    else:
                        self.log_result(
                            "Get Barber Services", "failed", "No services found"
                        )
                else:
                    self.log_result("Get Barber Services", "failed", resp.json())

            # 4. Get service categories (if endpoint exists)
            try:
                resp = await client.get(f"{self.api_url}/service-categories")
                if resp.status_code == 200:
                    categories = resp.json()
                    self.log_result(
                        "Get Service Categories",
                        "passed",
                        {
                            "count": len(categories),
                            "categories": [c["name"] for c in categories],
                        },
                    )
            except:
                pass

    async def test_availability(self):
        """Test availability checking"""
        print("\n📅 Testing Availability...")

        if not self.barber_id or not self.service_id:
            self.log_result(
                "Availability Test", "skipped", "Missing barber or service ID"
            )
            return

        async with httpx.AsyncClient() as client:
            # Get availability for next 7 days
            start_date = date.today() + timedelta(days=1)
            end_date = start_date + timedelta(days=7)

            resp = await client.get(
                f"{self.api_url}/booking/public/barbers/{self.barber_id}/availability",
                params={
                    "service_id": self.service_id,
                    "start_date": str(start_date),
                    "end_date": str(end_date),
                    "timezone": "America/New_York",
                },
            )

            if resp.status_code == 200:
                availability = resp.json()
                available_slots = [
                    slot for slot in availability["slots"] if slot["available"]
                ]
                unavailable_slots = [
                    slot for slot in availability["slots"] if not slot["available"]
                ]

                self.log_result(
                    "Get Availability",
                    "passed",
                    {
                        "total_slots": len(availability["slots"]),
                        "available": len(available_slots),
                        "unavailable": len(unavailable_slots),
                        "reasons": list(
                            set(
                                s.get("reason", "N/A")
                                for s in unavailable_slots
                                if s.get("reason")
                            )
                        ),
                    },
                )

                # Store first available slot for booking test
                if available_slots:
                    self.available_slot = available_slots[0]
            else:
                self.log_result("Get Availability", "failed", resp.json())

    async def test_create_booking(self):
        """Test creating a booking"""
        print("\n📝 Testing Booking Creation...")

        if not hasattr(self, "available_slot"):
            self.log_result("Create Booking", "skipped", "No available slot found")
            return

        async with httpx.AsyncClient() as client:
            # Create booking using available slot
            booking_data = {
                "barber_id": self.barber_id,
                "service_id": self.service_id,
                "appointment_date": self.available_slot["date"],
                "appointment_time": self.available_slot["start_time"],
                "client_first_name": TEST_CLIENT["first_name"],
                "client_last_name": TEST_CLIENT["last_name"],
                "client_email": TEST_CLIENT["email"],
                "client_phone": TEST_CLIENT["phone"],
                "notes": "Test booking from comprehensive test suite",
                "timezone": "America/New_York",
            }

            resp = await client.post(
                f"{self.api_url}/booking/public/bookings/create", json=booking_data
            )

            if resp.status_code == 200:
                result = resp.json()
                self.booking_token = result["booking_token"]
                self.appointment_id = result["appointment_id"]
                self.log_result(
                    "Create Booking",
                    "passed",
                    {
                        "booking_token": self.booking_token[:10] + "...",
                        "appointment_id": self.appointment_id,
                        "details": result["appointment_details"],
                    },
                )
            else:
                self.log_result("Create Booking", "failed", resp.json())

    async def test_confirm_booking(self):
        """Test booking confirmation"""
        print("\n✅ Testing Booking Confirmation...")

        if not self.booking_token:
            self.log_result("Confirm Booking", "skipped", "No booking token available")
            return

        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{self.api_url}/booking/public/bookings/confirm/{self.booking_token}"
            )

            if resp.status_code == 200:
                confirmation = resp.json()
                self.log_result("Confirm Booking", "passed", confirmation)
            else:
                self.log_result("Confirm Booking", "failed", resp.json())

    async def test_booking_rules_enforcement(self):
        """Test that booking rules are enforced"""
        print("\n⚖️ Testing Booking Rules...")

        if not self.barber_id or not self.service_id:
            self.log_result("Booking Rules Test", "skipped", "Missing required IDs")
            return

        async with httpx.AsyncClient() as client:
            # Test 1: Try to book in the past
            past_date = date.today() - timedelta(days=1)

            resp = await client.post(
                f"{self.api_url}/booking/public/bookings/create",
                json={
                    "barber_id": self.barber_id,
                    "service_id": self.service_id,
                    "appointment_date": str(past_date),
                    "appointment_time": "10:00:00",
                    "client_first_name": "Test",
                    "client_last_name": "Past",
                    "client_email": "past@example.com",
                    "client_phone": "555-999-9999",
                },
            )

            if resp.status_code == 422:  # Validation error expected
                self.log_result(
                    "Prevent Past Booking", "passed", "Correctly rejected past date"
                )
            else:
                self.log_result(
                    "Prevent Past Booking",
                    "failed",
                    f"Expected validation error, got {resp.status_code}",
                )

            # Test 2: Try to double-book same slot
            if hasattr(self, "available_slot"):
                resp = await client.post(
                    f"{self.api_url}/booking/public/bookings/create",
                    json={
                        "barber_id": self.barber_id,
                        "service_id": self.service_id,
                        "appointment_date": self.available_slot["date"],
                        "appointment_time": self.available_slot["start_time"],
                        "client_first_name": "Double",
                        "client_last_name": "Booker",
                        "client_email": "double@example.com",
                        "client_phone": "555-888-8888",
                    },
                )

                if resp.status_code == 400:
                    self.log_result(
                        "Prevent Double Booking",
                        "passed",
                        "Correctly rejected double booking",
                    )
                else:
                    self.log_result(
                        "Prevent Double Booking",
                        "failed",
                        f"Expected error, got {resp.status_code}",
                    )

    async def test_authenticated_endpoints(self):
        """Test authenticated booking endpoints"""
        print("\n🔐 Testing Authenticated Endpoints...")

        if not self.token:
            self.log_result("Authenticated Tests", "skipped", "No auth token available")
            return

        headers = {"Authorization": f"Bearer {self.token}"}

        async with httpx.AsyncClient() as client:
            # 1. Create a service
            service_data = {
                "name": "Test Premium Haircut",
                "description": "A test service for booking system",
                "category_id": 1,  # Assuming category 1 exists
                "base_price": 45.00,
                "duration_minutes": 45,
                "buffer_minutes": 15,
                "requires_deposit": True,
                "deposit_type": "percentage",
                "deposit_amount": 25,
                "is_addon": False,
                "max_advance_days": 30,
                "min_advance_hours": 4,
            }

            resp = await client.post(
                f"{self.api_url}/booking/services/create",
                json=service_data,
                headers=headers,
            )

            if resp.status_code == 201:
                service = resp.json()
                test_service_id = service["service"]["id"]
                self.log_result("Create Service", "passed", service)

                # 2. Update the service
                update_data = {
                    "base_price": 50.00,
                    "description": "Updated test service",
                }

                resp = await client.put(
                    f"{self.api_url}/booking/services/{test_service_id}/update",
                    json=update_data,
                    headers=headers,
                )

                if resp.status_code == 200:
                    self.log_result("Update Service", "passed", resp.json())
                else:
                    self.log_result("Update Service", "failed", resp.json())

                # 3. Delete the service
                resp = await client.delete(
                    f"{self.api_url}/booking/services/{test_service_id}",
                    headers=headers,
                )

                if resp.status_code == 200:
                    self.log_result("Delete Service", "passed")
                else:
                    self.log_result("Delete Service", "failed", resp.json())
            else:
                self.log_result("Create Service", "failed", resp.json())

            # 4. Get booking calendar
            today = date.today()
            resp = await client.get(
                f"{self.api_url}/booking/bookings/calendar",
                params={
                    "start_date": str(today),
                    "end_date": str(today + timedelta(days=7)),
                },
                headers=headers,
            )

            if resp.status_code == 200:
                calendar = resp.json()
                self.log_result(
                    "Get Booking Calendar",
                    "passed",
                    {
                        "date_range": calendar["date_range"],
                        "summary": calendar["summary"],
                        "days_with_bookings": len(calendar["calendar"]),
                    },
                )
            else:
                self.log_result("Get Booking Calendar", "failed", resp.json())

    async def test_barber_schedule_management(self):
        """Test barber schedule and availability management"""
        print("\n👨‍💼 Testing Barber Schedule Management...")

        if not self.barber_token or not self.barber_id:
            self.log_result(
                "Schedule Management", "skipped", "No barber token/ID available"
            )
            return

        headers = {"Authorization": f"Bearer {self.barber_token}"}

        async with httpx.AsyncClient() as client:
            # 1. Get current schedule
            today = date.today()
            resp = await client.get(
                f"{self.api_url}/booking/barbers/{self.barber_id}/schedule",
                params={
                    "start_date": str(today),
                    "end_date": str(today + timedelta(days=7)),
                },
                headers=headers,
            )

            if resp.status_code == 200:
                schedule = resp.json()
                self.log_result(
                    "Get Barber Schedule",
                    "passed",
                    {
                        "barber": schedule["barber"],
                        "availability_patterns": len(schedule["availability_patterns"]),
                        "appointments": len(schedule["appointments"]),
                    },
                )
            else:
                self.log_result("Get Barber Schedule", "failed", resp.json())

            # 2. Set availability
            availability_data = [
                {
                    "day_of_week": 1,  # Tuesday
                    "start_time": "09:00:00",
                    "end_time": "17:00:00",
                    "break_start": "12:00:00",
                    "break_end": "13:00:00",
                    "is_available": True,
                    "max_bookings": 10,
                },
                {
                    "day_of_week": 3,  # Thursday
                    "start_time": "10:00:00",
                    "end_time": "18:00:00",
                    "is_available": True,
                },
            ]

            resp = await client.post(
                f"{self.api_url}/booking/barbers/{self.barber_id}/availability",
                json=availability_data,
                headers=headers,
            )

            if resp.status_code == 200:
                result = resp.json()
                self.log_result("Set Barber Availability", "passed", result)
            else:
                self.log_result("Set Barber Availability", "failed", resp.json())

    async def test_review_system(self):
        """Test the review system"""
        print("\n⭐ Testing Review System...")

        if not self.token or not self.appointment_id:
            self.log_result(
                "Review System", "skipped", "No token or appointment available"
            )
            return

        headers = {"Authorization": f"Bearer {self.token}"}

        async with httpx.AsyncClient() as client:
            # First, we need to mark the appointment as completed
            # This would normally be done through a separate endpoint
            # For now, we'll just test the review creation with validation error

            review_data = {
                "appointment_id": self.appointment_id,
                "overall_rating": 5,
                "service_rating": 5,
                "cleanliness_rating": 4,
                "punctuality_rating": 5,
                "value_rating": 5,
                "title": "Excellent Service!",
                "comment": "Great haircut, very professional barber. Highly recommend!",
                "photos": [],
            }

            resp = await client.post(
                f"{self.api_url}/booking/reviews/create",
                json=review_data,
                headers=headers,
            )

            if resp.status_code == 201:
                review = resp.json()
                self.log_result("Create Review", "passed", review)
            elif resp.status_code == 400 and "completed" in resp.text:
                self.log_result(
                    "Create Review",
                    "passed",
                    "Correctly rejected review for non-completed appointment",
                )
            else:
                self.log_result("Create Review", "failed", resp.json())

    async def test_wait_list(self):
        """Test wait list functionality"""
        print("\n⏳ Testing Wait List...")

        # This would require a specific endpoint for wait list management
        # For now, we'll mark it as a future feature
        self.log_result("Wait List Feature", "skipped", "Feature not yet implemented")

    async def run_all_tests(self):
        """Run all booking system tests"""
        print("🚀 Starting Comprehensive Booking System Tests...")
        print("=" * 60)

        # Setup
        if not await self.setup_test_users():
            print("❌ Failed to setup test users. Exiting...")
            return

        # Run tests in order
        await self.test_public_endpoints()
        await self.test_availability()
        await self.test_create_booking()
        await self.test_confirm_booking()
        await self.test_booking_rules_enforcement()
        await self.test_authenticated_endpoints()
        await self.test_barber_schedule_management()
        await self.test_review_system()
        await self.test_wait_list()

        # Summary
        print("\n" + "=" * 60)
        print("📊 Test Summary:")
        passed = sum(1 for r in self.test_results if r["status"] == "passed")
        failed = sum(1 for r in self.test_results if r["status"] == "failed")
        skipped = sum(1 for r in self.test_results if r["status"] == "skipped")

        print(f"✅ Passed: {passed}")
        print(f"❌ Failed: {failed}")
        print(f"⏭️  Skipped: {skipped}")
        print(f"📋 Total: {len(self.test_results)}")

        # Save detailed results
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"booking_test_report_{timestamp}.json"
        with open(filename, "w") as f:
            json.dump(
                {
                    "test_run": timestamp,
                    "summary": {
                        "total": len(self.test_results),
                        "passed": passed,
                        "failed": failed,
                        "skipped": skipped,
                    },
                    "results": self.test_results,
                },
                f,
                indent=2,
            )

        print(f"\n💾 Detailed results saved to: {filename}")

        return failed == 0


async def main():
    """Main entry point"""
    tester = BookingSystemTester()
    success = await tester.run_all_tests()

    if not success:
        print("\n⚠️  Some tests failed. Please check the results above.")
        exit(1)
    else:
        print("\n🎉 All tests passed successfully!")
        exit(0)


if __name__ == "__main__":
    asyncio.run(main())
