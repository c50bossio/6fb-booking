#!/usr/bin/env python3
"""
Test Production Booking Flow
Tests the complete booking flow through the live API at https://sixfb-backend.onrender.com

Flow:
1. Authenticate as admin to get token
2. Get available locations/shops
3. Get barbers for a shop
4. Get services available
5. Check availability for a barber/service
6. Create a booking
7. Confirm the booking
8. Document all API calls
"""

import requests
import json
from datetime import datetime, date, timedelta
from typing import Dict, List, Optional
import sys
from pprint import pprint

# Production API URL
API_BASE_URL = "https://sixfb-backend.onrender.com"

# Admin credentials (from CLAUDE.md)
ADMIN_EMAIL = "admin@6fb.com"
ADMIN_PASSWORD = "admin123"

# Test client data
TEST_CLIENT = {
    "first_name": "Test",
    "last_name": "Client",
    "email": "test.client@example.com",
    "phone": "555-0123",
}


class BookingAPITester:
    def __init__(self, base_url: str):
        self.base_url = base_url
        self.session = requests.Session()
        self.auth_token = None
        self.headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
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
                print(f"Response Text: {response.text}")
        print(f"{'='*80}\n")

    def authenticate(self) -> bool:
        """Authenticate and get JWT token"""
        print("\n1. AUTHENTICATING AS ADMIN")
        url = f"{self.base_url}/api/v1/auth/token"
        data = {"username": ADMIN_EMAIL, "password": ADMIN_PASSWORD}

        # Use form data instead of JSON for OAuth2PasswordRequestForm
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

    def get_locations(self) -> List[Dict]:
        """Get all active locations"""
        print("\n2. GETTING LOCATIONS")
        url = f"{self.base_url}/api/v1/locations"

        response = self.session.get(url, headers=self.headers)
        self.log_request("GET", url, None, response)

        if response.status_code == 200:
            locations = response.json()
            print(f"✅ Found {len(locations)} locations")
            return locations
        else:
            print("❌ Failed to get locations")
            return []

    def get_barbers_for_shop(self, shop_id: int) -> List[Dict]:
        """Get barbers for a specific shop"""
        print(f"\n3. GETTING BARBERS FOR SHOP {shop_id}")
        url = f"{self.base_url}/api/v1/booking/public/shops/{shop_id}/barbers"

        # Try without auth first (public endpoint)
        temp_headers = {k: v for k, v in self.headers.items() if k != "Authorization"}
        response = self.session.get(url, headers=temp_headers)
        self.log_request("GET", url, None, response)

        if response.status_code == 200:
            barbers = response.json()
            print(f"✅ Found {len(barbers)} barbers")
            return barbers
        else:
            print("❌ Failed to get barbers")
            return []

    def get_services(self) -> List[Dict]:
        """Get all available services"""
        print("\n4. GETTING SERVICES")
        url = f"{self.base_url}/api/v1/services"

        response = self.session.get(url, headers=self.headers)
        self.log_request("GET", url, None, response)

        if response.status_code == 200:
            services = response.json()
            print(f"✅ Found {len(services)} services")
            return services
        else:
            print("❌ Failed to get services")
            return []

    def get_barber_services(self, barber_id: int) -> List[Dict]:
        """Get services for a specific barber"""
        print(f"\n4b. GETTING SERVICES FOR BARBER {barber_id}")
        url = f"{self.base_url}/api/v1/booking/public/barbers/{barber_id}/services"

        # Try without auth first (public endpoint)
        temp_headers = {k: v for k, v in self.headers.items() if k != "Authorization"}
        response = self.session.get(url, headers=temp_headers)
        self.log_request("GET", url, None, response)

        if response.status_code == 200:
            services = response.json()
            print(f"✅ Found {len(services)} services for barber")
            return services
        else:
            print("❌ Failed to get barber services")
            return []

    def check_availability(
        self, barber_id: int, service_id: int, start_date: date
    ) -> Dict:
        """Check availability for a barber and service"""
        print(f"\n5. CHECKING AVAILABILITY")
        url = f"{self.base_url}/api/v1/booking/public/barbers/{barber_id}/availability"
        params = {
            "service_id": service_id,
            "start_date": start_date.isoformat(),
            "end_date": (start_date + timedelta(days=7)).isoformat(),
        }

        # Try without auth first (public endpoint)
        temp_headers = {k: v for k, v in self.headers.items() if k != "Authorization"}
        response = self.session.get(url, params=params, headers=temp_headers)
        self.log_request(
            "GET",
            f"{url}?{'&'.join([f'{k}={v}' for k,v in params.items()])}",
            None,
            response,
        )

        if response.status_code == 200:
            availability = response.json()
            available_slots = [
                slot for slot in availability.get("slots", []) if slot["available"]
            ]
            print(f"✅ Found {len(available_slots)} available slots")
            return availability
        else:
            print("❌ Failed to check availability")
            return {}

    def create_booking(
        self,
        barber_id: int,
        service_id: int,
        appointment_date: date,
        appointment_time: str,
    ) -> Dict:
        """Create a booking"""
        print(f"\n6. CREATING BOOKING")
        url = f"{self.base_url}/api/v1/booking/public/bookings/create"

        data = {
            "barber_id": barber_id,
            "service_id": service_id,
            "appointment_date": appointment_date.isoformat(),
            "appointment_time": appointment_time,
            "client_first_name": TEST_CLIENT["first_name"],
            "client_last_name": TEST_CLIENT["last_name"],
            "client_email": TEST_CLIENT["email"],
            "client_phone": TEST_CLIENT["phone"],
            "notes": "Test booking from API",
            "timezone": "America/New_York",
        }

        # Try without auth first (public endpoint)
        temp_headers = {k: v for k, v in self.headers.items() if k != "Authorization"}
        response = self.session.post(url, json=data, headers=temp_headers)
        self.log_request("POST", url, data, response)

        if response.status_code == 200:
            booking = response.json()
            print("✅ Booking created successfully!")
            print(f"   Booking Token: {booking.get('booking_token')}")
            print(f"   Appointment ID: {booking.get('appointment_id')}")
            return booking
        else:
            print("❌ Failed to create booking")
            return {}

    def confirm_booking(self, booking_token: str) -> Dict:
        """Confirm a booking using token"""
        print(f"\n7. CONFIRMING BOOKING")
        url = f"{self.base_url}/api/v1/booking/public/bookings/confirm/{booking_token}"

        # Try without auth first (public endpoint)
        temp_headers = {k: v for k, v in self.headers.items() if k != "Authorization"}
        response = self.session.get(url, headers=temp_headers)
        self.log_request("GET", url, None, response)

        if response.status_code == 200:
            confirmation = response.json()
            print("✅ Booking confirmed successfully!")
            return confirmation
        else:
            print("❌ Failed to confirm booking")
            return {}

    def run_complete_flow(self):
        """Run the complete booking flow"""
        print("STARTING PRODUCTION BOOKING TEST")
        print(f"API URL: {self.base_url}")
        print(f"Timestamp: {datetime.now().isoformat()}")

        # Step 1: Authenticate
        if not self.authenticate():
            print("Failed to authenticate. Exiting.")
            return

        # Step 2: Get locations
        locations = self.get_locations()
        if not locations:
            print("No locations found. Exiting.")
            return

        # Use first location
        location = locations[0]
        print(f"\nUsing location: {location['name']} (ID: {location['id']})")

        # Step 3: Get barbers for the location
        barbers = self.get_barbers_for_shop(location["id"])
        if not barbers:
            print("No barbers found. Trying to get all barbers...")
            # Try getting barbers through authenticated endpoint
            url = f"{self.base_url}/api/v1/barbers"
            response = self.session.get(url, headers=self.headers)
            if response.status_code == 200:
                all_barbers = response.json()
                barbers = [
                    b for b in all_barbers if b.get("location_id") == location["id"]
                ]

        if not barbers:
            print("No barbers found. Exiting.")
            return

        # Use first barber
        barber = barbers[0]
        print(
            f"\nUsing barber: {barber.get('first_name', '')} {barber.get('last_name', '')} (ID: {barber['id']})"
        )

        # Step 4: Get services
        services = self.get_barber_services(barber["id"])
        if not services:
            # Try getting all services
            services = self.get_services()

        if not services:
            print("No services found. Exiting.")
            return

        # Use first non-addon service
        service = next(
            (s for s in services if not s.get("is_addon", False)), services[0]
        )
        print(
            f"\nUsing service: {service['name']} - ${service['base_price']} ({service['duration_minutes']} min)"
        )

        # Step 5: Check availability
        tomorrow = date.today() + timedelta(days=1)
        availability = self.check_availability(barber["id"], service["id"], tomorrow)

        if not availability or not availability.get("slots"):
            print("No availability found. Exiting.")
            return

        # Find first available slot
        available_slot = next(
            (slot for slot in availability["slots"] if slot["available"]), None
        )
        if not available_slot:
            print("No available slots found. Exiting.")
            return

        print(
            f"\nUsing slot: {available_slot['date']} at {available_slot['start_time']}"
        )

        # Step 6: Create booking
        booking = self.create_booking(
            barber["id"],
            service["id"],
            datetime.fromisoformat(available_slot["date"]).date(),
            available_slot["start_time"],
        )

        if not booking or not booking.get("booking_token"):
            print("Failed to create booking. Exiting.")
            return

        # Step 7: Confirm booking
        confirmation = self.confirm_booking(booking["booking_token"])

        print("\n" + "=" * 80)
        print("BOOKING TEST COMPLETE!")
        print("=" * 80)

        # Generate documentation
        self.generate_documentation(booking, confirmation)

    def generate_documentation(self, booking: Dict, confirmation: Dict):
        """Generate documentation of API calls"""
        doc = f"""
# Production Booking API Documentation
Generated: {datetime.now().isoformat()}
API Base URL: {self.base_url}

## Authentication
- Endpoint: POST /api/v1/auth/login
- Payload: {{"username": "email", "password": "password"}}
- Returns: {{"access_token": "JWT_TOKEN", ...}}

## Public Booking Endpoints

### 1. Get Barbers for Shop
- Endpoint: GET /api/v1/booking/public/shops/{{shop_id}}/barbers
- Auth: Not required (public)
- Returns: List of barber profiles

### 2. Get Services for Barber
- Endpoint: GET /api/v1/booking/public/barbers/{{barber_id}}/services
- Auth: Not required (public)
- Returns: List of available services

### 3. Check Availability
- Endpoint: GET /api/v1/booking/public/barbers/{{barber_id}}/availability
- Auth: Not required (public)
- Parameters:
  - service_id: Service ID
  - start_date: ISO date (YYYY-MM-DD)
  - end_date: ISO date (optional)
- Returns: Available time slots

### 4. Create Booking
- Endpoint: POST /api/v1/booking/public/bookings/create
- Auth: Not required (public)
- Payload:
```json
{{
    "barber_id": 1,
    "service_id": 1,
    "appointment_date": "YYYY-MM-DD",
    "appointment_time": "HH:MM:SS",
    "client_first_name": "First",
    "client_last_name": "Last",
    "client_email": "email@example.com",
    "client_phone": "555-0123",
    "notes": "Optional notes",
    "timezone": "America/New_York"
}}
```
- Returns: Booking confirmation with token

### 5. Confirm Booking
- Endpoint: GET /api/v1/booking/public/bookings/confirm/{{booking_token}}
- Auth: Not required (public)
- Returns: Full booking details

## Test Results
- Booking Token: {booking.get('booking_token', 'N/A')}
- Appointment ID: {booking.get('appointment_id', 'N/A')}
- Status: {confirmation.get('status', 'N/A')}

## Additional Endpoints

### Get All Services
- Endpoint: GET /api/v1/services
- Auth: Optional
- Returns: List of all services

### Get All Locations
- Endpoint: GET /api/v1/locations
- Auth: Required
- Returns: List of all locations
"""

        # Save documentation
        with open("PRODUCTION_BOOKING_API_DOCUMENTATION.md", "w") as f:
            f.write(doc)
        print(f"\nDocumentation saved to: PRODUCTION_BOOKING_API_DOCUMENTATION.md")


def main():
    """Run the booking test"""
    tester = BookingAPITester(API_BASE_URL)

    try:
        tester.run_complete_flow()
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback

        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
