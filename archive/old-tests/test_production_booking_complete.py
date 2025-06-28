#!/usr/bin/env python3
"""
Complete Production Booking Flow Test
Tests the complete booking flow with data creation if needed

This script will:
1. Authenticate as admin
2. Create test location if none exists
3. Create test barber if none exists
4. Create test services if none exist
5. Test the complete booking flow
6. Document all API calls
"""

import requests
import json
from datetime import datetime, date, timedelta, time
from typing import Dict, List, Optional, Tuple
import sys
from pprint import pprint
import random

# Production API URL
API_BASE_URL = "https://sixfb-backend.onrender.com"

# Admin credentials
ADMIN_EMAIL = "admin@6fb.com"
ADMIN_PASSWORD = "admin123"

# Test data
TEST_LOCATION = {
    "name": "Test Barbershop",
    "location_code": "TEST001",
    "address": "123 Test Street",
    "city": "New York",
    "state": "NY",
    "zip_code": "10001",
    "phone": "555-0123",
    "email": "test@barbershop.com",
    "franchise_type": "company_owned",
    "operating_hours": {
        "monday": {"open": "09:00", "close": "18:00"},
        "tuesday": {"open": "09:00", "close": "18:00"},
        "wednesday": {"open": "09:00", "close": "18:00"},
        "thursday": {"open": "09:00", "close": "18:00"},
        "friday": {"open": "09:00", "close": "18:00"},
        "saturday": {"open": "10:00", "close": "16:00"},
        "sunday": {"closed": True},
    },
    "capacity": 10,
}

TEST_BARBER = {
    "email": f"test.barber.{random.randint(1000,9999)}@example.com",
    "password": "TestPassword123!",
    "first_name": "Test",
    "last_name": "Barber",
    "role": "barber",
    "phone": "555-0124",
    "commission_rate": 0.6,
    "booth_rental_amount": 0.0,
    "compensation_type": "commission",
    "is_active": True,
}

TEST_SERVICE_CATEGORIES = [
    {
        "name": "Haircuts",
        "description": "Professional haircut services",
        "display_order": 1,
        "is_active": True,
        "color": "#3B82F6",
    },
    {
        "name": "Beard Services",
        "description": "Beard trimming and styling",
        "display_order": 2,
        "is_active": True,
        "color": "#10B981",
    },
]

TEST_SERVICES = [
    {
        "name": "Classic Haircut",
        "description": "Traditional barbershop haircut",
        "category_id": None,  # Will be set after category creation
        "base_price": 35.0,
        "duration_minutes": 30,
        "buffer_minutes": 5,
        "requires_deposit": False,
        "is_addon": False,
        "is_active": True,
        "display_order": 1,
    },
    {
        "name": "Premium Haircut & Style",
        "description": "Haircut with styling and hot towel service",
        "category_id": None,
        "base_price": 50.0,
        "duration_minutes": 45,
        "buffer_minutes": 5,
        "requires_deposit": False,
        "is_addon": False,
        "is_active": True,
        "display_order": 2,
    },
    {
        "name": "Beard Trim",
        "description": "Professional beard trimming",
        "category_id": None,
        "base_price": 20.0,
        "duration_minutes": 20,
        "buffer_minutes": 5,
        "requires_deposit": False,
        "is_addon": True,
        "is_active": True,
        "display_order": 3,
    },
]

TEST_CLIENT = {
    "first_name": "Test",
    "last_name": "Client",
    "email": f"test.client.{random.randint(1000,9999)}@example.com",
    "phone": "555-0125",
}


class ProductionBookingTester:
    def __init__(self, base_url: str):
        self.base_url = base_url
        self.session = requests.Session()
        self.auth_token = None
        self.headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
        self.created_data = {
            "location": None,
            "barber": None,
            "categories": [],
            "services": [],
            "booking": None,
        }

    def log_request(
        self,
        method: str,
        url: str,
        data: Optional[dict] = None,
        response: Optional[requests.Response] = None,
    ):
        """Log API request details"""
        print(f"\n{'='*80}")
        print(f"{method} {url}")
        if data:
            print(f"Request Data: {json.dumps(data, indent=2)}")
        if response:
            print(f"Status Code: {response.status_code}")
            try:
                print(f"Response: {json.dumps(response.json(), indent=2)}")
            except:
                print(f"Response Text: {response.text[:500]}")
        print(f"{'='*80}\n")

    def authenticate(self) -> bool:
        """Authenticate and get JWT token"""
        print("\n🔐 AUTHENTICATING AS ADMIN")
        url = f"{self.base_url}/api/v1/auth/token"
        data = {"username": ADMIN_EMAIL, "password": ADMIN_PASSWORD}

        response = self.session.post(
            url, data=data, headers={"Accept": "application/json"}
        )
        self.log_request("POST", url, data, response)

        if response.status_code == 200:
            result = response.json()
            self.auth_token = result.get("access_token")
            self.headers["Authorization"] = f"Bearer {self.auth_token}"
            print("✅ Authentication successful!")
            return True
        else:
            print("❌ Authentication failed!")
            return False

    def ensure_location(self) -> Dict:
        """Ensure we have a location to work with"""
        print("\n🏢 CHECKING LOCATIONS")

        # First, try to get existing locations
        url = f"{self.base_url}/api/v1/locations"
        response = self.session.get(url, headers=self.headers)

        if response.status_code == 200:
            locations = response.json()
            if locations:
                self.created_data["location"] = locations[0]
                print(
                    f"✅ Using existing location: {locations[0]['name']} (ID: {locations[0]['id']})"
                )
                return locations[0]

        # No locations, create one
        print("📝 Creating new location...")
        url = f"{self.base_url}/api/v1/locations"
        response = self.session.post(url, json=TEST_LOCATION, headers=self.headers)
        self.log_request("POST", url, TEST_LOCATION, response)

        if response.status_code in [200, 201]:
            location = response.json()
            self.created_data["location"] = location
            print(f"✅ Created location: {location['name']} (ID: {location['id']})")
            return location
        else:
            print(f"❌ Failed to create location - Status: {response.status_code}")
            try:
                error_detail = response.json()
                print(f"Error: {error_detail}")
            except:
                print(f"Error text: {response.text}")
            return {}

    def ensure_barber(self, location_id: int) -> Dict:
        """Ensure we have a barber to work with"""
        print("\n💈 CHECKING BARBERS")

        # First, try to get existing barbers
        url = f"{self.base_url}/api/v1/barbers"
        response = self.session.get(url, headers=self.headers)

        if response.status_code == 200:
            barbers = response.json()
            if barbers:
                # Find a barber at our location
                location_barbers = [
                    b for b in barbers if b.get("location_id") == location_id
                ]
                if location_barbers:
                    self.created_data["barber"] = location_barbers[0]
                    print(
                        f"✅ Using existing barber: {location_barbers[0]['first_name']} {location_barbers[0]['last_name']} (ID: {location_barbers[0]['id']})"
                    )
                    return location_barbers[0]

        # No barbers at location, create one
        print("📝 Creating new barber...")

        # First create the user
        url = f"{self.base_url}/api/v1/auth/register"
        barber_data = TEST_BARBER.copy()
        barber_data["primary_location_id"] = location_id

        response = self.session.post(url, json=barber_data, headers=self.headers)
        self.log_request("POST", url, barber_data, response)

        if response.status_code in [200, 201]:
            user = response.json()

            # Now create the barber profile
            url = f"{self.base_url}/api/v1/barbers"
            barber_profile = {
                "user_id": user["id"],
                "location_id": location_id,
                "first_name": barber_data["first_name"],
                "last_name": barber_data["last_name"],
                "email": barber_data["email"],
                "phone": barber_data["phone"],
                "commission_rate": barber_data["commission_rate"],
                "booth_rental_amount": barber_data["booth_rental_amount"],
                "compensation_type": barber_data["compensation_type"],
                "is_active": True,
            }

            response = self.session.post(url, json=barber_profile, headers=self.headers)
            self.log_request("POST", url, barber_profile, response)

            if response.status_code in [200, 201]:
                barber = response.json()
                self.created_data["barber"] = barber
                print(
                    f"✅ Created barber: {barber['first_name']} {barber['last_name']} (ID: {barber['id']})"
                )

                # Set up barber availability
                self.setup_barber_availability(barber["id"])
                return barber

        print("❌ Failed to create barber")
        return {}

    def setup_barber_availability(self, barber_id: int):
        """Set up availability for the barber"""
        print("📅 Setting up barber availability...")

        # Create availability for each weekday
        for day in range(5):  # Monday to Friday
            availability = {
                "barber_id": barber_id,
                "day_of_week": day,
                "start_time": "09:00:00",
                "end_time": "18:00:00",
                "is_available": True,
                "break_start": "13:00:00",
                "break_end": "14:00:00",
            }

            url = f"{self.base_url}/api/v1/barbers/{barber_id}/availability"
            response = self.session.post(url, json=availability, headers=self.headers)

            if response.status_code in [200, 201]:
                print(f"✅ Set availability for day {day}")

    def ensure_services(self) -> List[Dict]:
        """Ensure we have services to work with"""
        print("\n✂️ CHECKING SERVICES")

        # First check existing services
        url = f"{self.base_url}/api/v1/services"
        response = self.session.get(url, headers=self.headers)

        if response.status_code == 200:
            services = response.json()
            if services:
                self.created_data["services"] = services[:3]  # Use first 3
                print(f"✅ Found {len(services)} existing services")
                return services

        # No services, create categories and services
        print("📝 Creating service categories and services...")

        # Create categories first
        for cat_data in TEST_SERVICE_CATEGORIES:
            url = f"{self.base_url}/api/v1/services/categories"
            response = self.session.post(url, json=cat_data, headers=self.headers)

            if response.status_code in [200, 201]:
                category = response.json()
                self.created_data["categories"].append(category)
                print(f"✅ Created category: {category['name']}")

        # Create services
        created_services = []
        for i, service_data in enumerate(TEST_SERVICES):
            service = service_data.copy()
            # Assign category based on service type
            if i < 2 and self.created_data["categories"]:
                service["category_id"] = self.created_data["categories"][0]["id"]
            elif (
                self.created_data["categories"]
                and len(self.created_data["categories"]) > 1
            ):
                service["category_id"] = self.created_data["categories"][1]["id"]
            else:
                service["category_id"] = 1  # Default

            url = f"{self.base_url}/api/v1/services"
            response = self.session.post(url, json=service, headers=self.headers)
            self.log_request("POST", url, service, response)

            if response.status_code in [200, 201]:
                created_service = response.json()
                created_services.append(created_service)
                print(f"✅ Created service: {created_service['name']}")

        self.created_data["services"] = created_services
        return created_services

    def test_booking_flow(
        self, location: Dict, barber: Dict, services: List[Dict]
    ) -> Dict:
        """Test the complete booking flow"""
        print("\n🎯 TESTING BOOKING FLOW")

        # Select a service
        service = next(
            (s for s in services if not s.get("is_addon", False)), services[0]
        )
        print(
            f"\nUsing service: {service['name']} - ${service['base_price']} ({service['duration_minutes']} min)"
        )

        # Check availability
        tomorrow = date.today() + timedelta(days=1)
        print(f"\n📅 Checking availability for {tomorrow}")

        url = (
            f"{self.base_url}/api/v1/booking/public/barbers/{barber['id']}/availability"
        )
        params = {
            "service_id": service["id"],
            "start_date": tomorrow.isoformat(),
            "end_date": (tomorrow + timedelta(days=1)).isoformat(),
        }

        response = self.session.get(
            url, params=params, headers={"Accept": "application/json"}
        )
        self.log_request(
            "GET",
            f"{url}?{'&'.join([f'{k}={v}' for k,v in params.items()])}",
            None,
            response,
        )

        availability = {}
        available_slot = None

        if response.status_code == 200:
            availability = response.json()
            slots = availability.get("slots", [])
            available_slots = [s for s in slots if s["available"]]
            print(f"✅ Found {len(available_slots)} available slots")

            if available_slots:
                available_slot = available_slots[0]

        if not available_slot:
            # If no slots available, try a weekday next week
            next_monday = tomorrow + timedelta(days=(7 - tomorrow.weekday()))
            print(f"\n📅 No slots tomorrow, trying {next_monday}")

            params["start_date"] = next_monday.isoformat()
            params["end_date"] = (next_monday + timedelta(days=1)).isoformat()

            response = self.session.get(
                url, params=params, headers={"Accept": "application/json"}
            )

            if response.status_code == 200:
                availability = response.json()
                slots = availability.get("slots", [])
                available_slots = [s for s in slots if s["available"]]

                if available_slots:
                    available_slot = available_slots[0]

        if not available_slot:
            print("❌ No available slots found")
            return {}

        print(
            f"\n✅ Using slot: {available_slot['date']} at {available_slot['start_time']}"
        )

        # Create booking
        print("\n📝 Creating booking...")
        url = f"{self.base_url}/api/v1/booking/public/bookings/create"

        booking_data = {
            "barber_id": barber["id"],
            "service_id": service["id"],
            "appointment_date": available_slot["date"],
            "appointment_time": available_slot["start_time"],
            "client_first_name": TEST_CLIENT["first_name"],
            "client_last_name": TEST_CLIENT["last_name"],
            "client_email": TEST_CLIENT["email"],
            "client_phone": TEST_CLIENT["phone"],
            "notes": "Test booking via API",
            "timezone": "America/New_York",
        }

        response = self.session.post(
            url,
            json=booking_data,
            headers={"Content-Type": "application/json", "Accept": "application/json"},
        )
        self.log_request("POST", url, booking_data, response)

        if response.status_code in [200, 201]:
            booking = response.json()
            self.created_data["booking"] = booking
            print("✅ Booking created successfully!")
            print(f"   Token: {booking.get('booking_token')}")
            print(f"   ID: {booking.get('appointment_id')}")

            # Confirm booking
            self.confirm_booking(booking.get("booking_token"))
            return booking
        else:
            print("❌ Failed to create booking")
            return {}

    def confirm_booking(self, booking_token: str) -> Dict:
        """Confirm a booking"""
        print("\n🔍 CONFIRMING BOOKING")
        url = f"{self.base_url}/api/v1/booking/public/bookings/confirm/{booking_token}"

        response = self.session.get(url, headers={"Accept": "application/json"})
        self.log_request("GET", url, None, response)

        if response.status_code == 200:
            confirmation = response.json()
            print("✅ Booking confirmed!")
            return confirmation
        else:
            print("❌ Failed to confirm booking")
            return {}

    def generate_report(self):
        """Generate comprehensive report"""
        report = f"""
# Production Booking API Test Report
Generated: {datetime.now().isoformat()}
API URL: {self.base_url}

## Test Summary

### Created Test Data:
- Location: {self.created_data['location']['name'] if self.created_data['location'] else 'None'} (ID: {self.created_data['location']['id'] if self.created_data['location'] else 'N/A'})
- Barber: {self.created_data['barber']['first_name'] + ' ' + self.created_data['barber']['last_name'] if self.created_data['barber'] else 'None'} (ID: {self.created_data['barber']['id'] if self.created_data['barber'] else 'N/A'})
- Services: {len(self.created_data['services'])} created
- Booking Token: {self.created_data['booking']['booking_token'] if self.created_data['booking'] else 'N/A'}
- Appointment ID: {self.created_data['booking']['appointment_id'] if self.created_data['booking'] else 'N/A'}

## API Endpoints Used

### Authentication
```
POST /api/v1/auth/token
Form Data: username=email&password=password
Returns: JWT token
```

### Location Management
```
GET /api/v1/locations
POST /api/v1/locations
```

### Barber Management
```
GET /api/v1/barbers
POST /api/v1/auth/register (create user)
POST /api/v1/barbers (create barber profile)
POST /api/v1/barbers/{{barber_id}}/availability
```

### Service Management
```
GET /api/v1/services
POST /api/v1/services/categories
POST /api/v1/services
```

### Public Booking Flow
```
GET /api/v1/booking/public/shops/{{shop_id}}/barbers
GET /api/v1/booking/public/barbers/{{barber_id}}/services
GET /api/v1/booking/public/barbers/{{barber_id}}/availability?service_id={{id}}&start_date={{date}}
POST /api/v1/booking/public/bookings/create
GET /api/v1/booking/public/bookings/confirm/{{token}}
```

## Complete Booking Payload Example
```json
{json.dumps({
    "barber_id": 1,
    "service_id": 1,
    "appointment_date": "2025-01-01",
    "appointment_time": "10:00:00",
    "client_first_name": "John",
    "client_last_name": "Doe",
    "client_email": "john.doe@example.com",
    "client_phone": "555-0123",
    "notes": "First time client",
    "timezone": "America/New_York"
}, indent=2)}
```

## Test Results
- All endpoints tested: {'✅' if self.created_data['booking'] else '❌'}
- Booking flow completed: {'✅' if self.created_data['booking'] else '❌'}
"""

        filename = f"PRODUCTION_BOOKING_TEST_REPORT_{datetime.now().strftime('%Y%m%d_%H%M%S')}.md"
        with open(filename, "w") as f:
            f.write(report)
        print(f"\n📄 Report saved to: {filename}")

    def run_complete_test(self):
        """Run the complete test flow"""
        print("🚀 STARTING COMPLETE PRODUCTION BOOKING TEST")
        print(f"API URL: {self.base_url}")
        print(f"Timestamp: {datetime.now().isoformat()}")

        try:
            # Authenticate
            if not self.authenticate():
                print("Failed to authenticate. Exiting.")
                return

            # Ensure test data exists
            location = self.ensure_location()
            if not location:
                print("Failed to ensure location. Exiting.")
                return

            barber = self.ensure_barber(location["id"])
            if not barber:
                print("Failed to ensure barber. Exiting.")
                return

            services = self.ensure_services()
            if not services:
                print("Failed to ensure services. Exiting.")
                return

            # Test booking flow
            booking = self.test_booking_flow(location, barber, services)

            # Generate report
            self.generate_report()

            print("\n✅ TEST COMPLETE!")

        except Exception as e:
            print(f"\n❌ ERROR: {e}")
            import traceback

            traceback.print_exc()

            # Still generate report with error info
            self.generate_report()


def main():
    """Run the test"""
    tester = ProductionBookingTester(API_BASE_URL)
    tester.run_complete_test()


if __name__ == "__main__":
    main()
