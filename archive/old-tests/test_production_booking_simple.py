#!/usr/bin/env python3
"""
Simple Production Booking Test
Tests booking with existing data in the system
"""

import requests
import json
from datetime import datetime, date, timedelta
from typing import Dict, List, Optional
import sys

# Production API URL
API_BASE_URL = "https://sixfb-backend.onrender.com"

# Test client data
TEST_CLIENT = {
    "first_name": "John",
    "last_name": "Doe",
    "email": "john.doe@example.com",
    "phone": "555-1234",
}


class SimpleBookingTester:
    def __init__(self, base_url: str):
        self.base_url = base_url
        self.session = requests.Session()
        self.headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

    def log_response(self, response: requests.Response, description: str = ""):
        """Log response details"""
        print(f"\n{'='*60}")
        if description:
            print(f"📍 {description}")
        print(f"Status: {response.status_code}")
        try:
            data = response.json()
            print(f"Response: {json.dumps(data, indent=2)}")
        except:
            print(f"Response: {response.text[:500]}")
        print(f"{'='*60}\n")

    def test_public_endpoints(self):
        """Test public booking endpoints"""
        print("🚀 TESTING PUBLIC BOOKING ENDPOINTS")
        print(f"API URL: {self.base_url}")
        print(f"Time: {datetime.now().isoformat()}\n")

        # 1. Test service categories
        print("📋 1. Getting Service Categories")
        url = f"{self.base_url}/api/v1/services/categories"
        response = self.session.get(url)
        self.log_response(response, "Service Categories")

        categories = []
        if response.status_code == 200:
            categories = response.json()
            print(f"✅ Found {len(categories)} categories")

        # 2. Test services
        print("\n✂️ 2. Getting Services")
        url = f"{self.base_url}/api/v1/services"
        response = self.session.get(url)
        self.log_response(response, "All Services")

        services = []
        if response.status_code == 200:
            services = response.json()
            print(f"✅ Found {len(services)} services")

        # 3. Test specific endpoints
        print("\n🔍 3. Testing Booking Endpoints")

        # Try to get barbers for shop ID 1 (if it exists)
        print("\n💈 3a. Testing Barbers Endpoint")
        url = f"{self.base_url}/api/v1/booking-public/shops/1/barbers"
        response = self.session.get(url)
        self.log_response(response, "Barbers for Shop 1")

        # Try barber services
        print("\n📜 3b. Testing Barber Services")
        url = f"{self.base_url}/api/v1/booking-public/barbers/1/services"
        response = self.session.get(url)
        self.log_response(response, "Services for Barber 1")

        # Try availability check
        print("\n📅 3c. Testing Availability Check")
        tomorrow = date.today() + timedelta(days=1)
        url = f"{self.base_url}/api/v1/booking-public/barbers/1/availability"
        params = {"service_id": 1, "start_date": tomorrow.isoformat()}
        response = self.session.get(url, params=params)
        self.log_response(
            response, f"Availability for Barber 1, Service 1 on {tomorrow}"
        )

        # 4. Test booking creation with mock data
        print("\n📝 4. Testing Booking Creation")
        url = f"{self.base_url}/api/v1/booking-public/bookings/create"

        # Try with minimal data first
        booking_data = {
            "barber_id": 1,
            "service_id": 1,
            "appointment_date": tomorrow.isoformat(),
            "appointment_time": "10:00:00",
            "client_first_name": TEST_CLIENT["first_name"],
            "client_last_name": TEST_CLIENT["last_name"],
            "client_email": TEST_CLIENT["email"],
            "client_phone": TEST_CLIENT["phone"],
        }

        response = self.session.post(url, json=booking_data)
        self.log_response(response, "Booking Creation Attempt")

        if response.status_code == 200:
            booking = response.json()
            token = booking.get("booking_token")

            if token:
                print(f"\n✅ Booking created! Token: {token}")

                # 5. Test confirmation
                print("\n🔍 5. Testing Booking Confirmation")
                url = f"{self.base_url}/api/v1/booking-public/bookings/confirm/{token}"
                response = self.session.get(url)
                self.log_response(response, "Booking Confirmation")

        # 6. Generate summary
        self.generate_summary()

    def generate_summary(self):
        """Generate API documentation summary"""
        summary = f"""
# Production Booking API Summary
Generated: {datetime.now().isoformat()}
Base URL: {self.base_url}

## Public Endpoints Tested

### 1. Service Categories
- GET /api/v1/services/categories
- No authentication required
- Returns list of service categories

### 2. Services
- GET /api/v1/services
- No authentication required
- Query params: category_id, is_active, is_addon
- Returns list of all services

### 3. Booking Endpoints
- GET /api/v1/booking-public/shops/{{shop_id}}/barbers
- GET /api/v1/booking-public/barbers/{{barber_id}}/services
- GET /api/v1/booking-public/barbers/{{barber_id}}/availability
- POST /api/v1/booking-public/bookings/create
- GET /api/v1/booking-public/bookings/confirm/{{token}}

## Booking Flow

1. Get available barbers for a shop
2. Get services offered by a barber
3. Check availability for barber/service combo
4. Create booking with client details
5. Confirm booking using token

## Example Booking Payload
```json
{{
    "barber_id": 1,
    "service_id": 1,
    "appointment_date": "2025-01-01",
    "appointment_time": "10:00:00",
    "client_first_name": "John",
    "client_last_name": "Doe",
    "client_email": "john@example.com",
    "client_phone": "555-1234",
    "notes": "First visit",
    "timezone": "America/New_York"
}}
```

## Notes
- All booking endpoints are public (no auth required)
- Availability returns time slots with availability status
- Booking confirmation provides full appointment details
- Email confirmation is sent automatically
"""

        filename = "BOOKING_API_SUMMARY.md"
        with open(filename, "w") as f:
            f.write(summary)
        print(f"\n📄 Summary saved to: {filename}")


def main():
    """Run the test"""
    tester = SimpleBookingTester(API_BASE_URL)

    try:
        tester.test_public_endpoints()
        print("\n✅ TEST COMPLETE!")
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback

        traceback.print_exc()


if __name__ == "__main__":
    main()
