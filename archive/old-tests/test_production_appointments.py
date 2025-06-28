#!/usr/bin/env python3
"""
Test Production Appointment Booking Flow
Tests the complete appointment booking flow through the live API

Flow:
1. Authenticate as admin
2. Get locations
3. Get barbers
4. Check availability
5. Create appointment
6. Document all API calls
"""

import requests
import json
from datetime import datetime, date, timedelta, time
from typing import Dict, List, Optional
import sys
from pprint import pprint

# Production API URL
API_BASE_URL = "https://sixfb-backend.onrender.com"

# Admin credentials
ADMIN_EMAIL = "admin@6fb.com"
ADMIN_PASSWORD = "admin123"

# Test client data
TEST_CLIENT = {
    "first_name": "Test",
    "last_name": "Client",
    "email": "test.client@example.com",
    "phone": "555-0123",
}


class AppointmentBookingTester:
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
                print(f"Response Text: {response.text[:500]}")
        print(f"{'='*80}\n")

    def authenticate(self) -> bool:
        """Authenticate and get JWT token"""
        print("\n🔐 AUTHENTICATING AS ADMIN")
        url = f"{self.base_url}/api/v1/auth/token"
        data = {"username": ADMIN_EMAIL, "password": ADMIN_PASSWORD}

        # Use form data for OAuth2PasswordRequestForm
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
        """Get all locations"""
        print("\n🏢 GETTING LOCATIONS")
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

    def get_barbers(self) -> List[Dict]:
        """Get all barbers"""
        print("\n💈 GETTING BARBERS")
        url = f"{self.base_url}/api/v1/barbers"

        response = self.session.get(url, headers=self.headers)
        self.log_request("GET", url, None, response)

        if response.status_code == 200:
            barbers = response.json()
            print(f"✅ Found {len(barbers)} barbers")
            return barbers
        else:
            print("❌ Failed to get barbers")
            return []

    def check_availability(self, barber_id: int, date_str: str) -> Dict:
        """Check barber availability"""
        print(f"\n📅 CHECKING AVAILABILITY FOR BARBER {barber_id}")
        url = f"{self.base_url}/api/v1/appointments/availability/{barber_id}"
        params = {"date": date_str}

        response = self.session.get(url, params=params, headers=self.headers)
        self.log_request("GET", f"{url}?date={date_str}", None, response)

        if response.status_code == 200:
            availability = response.json()
            print("✅ Got availability data")
            return availability
        else:
            print("❌ Failed to get availability")
            return {}

    def create_appointment(self, appointment_data: Dict) -> Dict:
        """Create an appointment"""
        print("\n📝 CREATING APPOINTMENT")
        url = f"{self.base_url}/api/v1/appointments/"

        response = self.session.post(url, json=appointment_data, headers=self.headers)
        self.log_request("POST", url, appointment_data, response)

        if response.status_code in [200, 201]:
            appointment = response.json()
            print("✅ Appointment created successfully!")
            print(f"   ID: {appointment.get('id')}")
            return appointment
        else:
            print("❌ Failed to create appointment")
            return {}

    def get_appointment(self, appointment_id: int) -> Dict:
        """Get appointment details"""
        print(f"\n🔍 GETTING APPOINTMENT {appointment_id}")
        url = f"{self.base_url}/api/v1/appointments/{appointment_id}"

        response = self.session.get(url, headers=self.headers)
        self.log_request("GET", url, None, response)

        if response.status_code == 200:
            appointment = response.json()
            print("✅ Got appointment details")
            return appointment
        else:
            print("❌ Failed to get appointment")
            return {}

    def create_test_data(self):
        """Create test data if needed"""
        print("\n📊 ENSURING TEST DATA EXISTS")

        # Check if we have locations
        locations = self.get_locations()

        if not locations:
            print("⚠️ No locations found. Creating test location...")
            url = f"{self.base_url}/api/v1/locations"
            location_data = {
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

            response = self.session.post(url, json=location_data, headers=self.headers)
            if response.status_code in [200, 201]:
                location = response.json()
                locations = [location]
                print(f"✅ Created location: {location['name']}")
            else:
                print(f"❌ Failed to create location: {response.text}")

        # Check if we have barbers
        barbers = self.get_barbers()

        if not barbers and locations:
            print("⚠️ No barbers found. Creating test barber...")
            # First create a user
            url = f"{self.base_url}/api/v1/auth/register"
            user_data = {
                "email": "test.barber@example.com",
                "password": "TestPassword123!",
                "first_name": "Test",
                "last_name": "Barber",
                "role": "barber",
                "primary_location_id": locations[0]["id"],
            }

            response = self.session.post(url, json=user_data, headers=self.headers)
            if response.status_code in [200, 201]:
                user = response.json()

                # Create barber profile
                url = f"{self.base_url}/api/v1/barbers"
                barber_data = {
                    "user_id": user["id"],
                    "location_id": locations[0]["id"],
                    "first_name": "Test",
                    "last_name": "Barber",
                    "email": "test.barber@example.com",
                    "phone": "555-0124",
                    "commission_rate": 0.6,
                    "booth_rental_amount": 0.0,
                    "compensation_type": "commission",
                    "is_active": True,
                }

                response = self.session.post(
                    url, json=barber_data, headers=self.headers
                )
                if response.status_code in [200, 201]:
                    barber = response.json()
                    barbers = [barber]
                    print(
                        f"✅ Created barber: {barber['first_name']} {barber['last_name']}"
                    )

        return locations, barbers

    def run_complete_flow(self):
        """Run the complete booking flow"""
        print("🚀 STARTING APPOINTMENT BOOKING TEST")
        print(f"API URL: {self.base_url}")
        print(f"Timestamp: {datetime.now().isoformat()}")

        # Step 1: Authenticate
        if not self.authenticate():
            print("Failed to authenticate. Exiting.")
            return

        # Step 2: Get or create test data
        locations, barbers = self.create_test_data()

        if not locations or not barbers:
            print("Failed to ensure test data. Exiting.")
            return

        # Use first location and barber
        location = locations[0]
        barber = barbers[0]

        print(f"\nUsing location: {location['name']} (ID: {location['id']})")
        print(
            f"Using barber: {barber['first_name']} {barber['last_name']} (ID: {barber['id']})"
        )

        # Step 3: Check availability
        tomorrow = date.today() + timedelta(days=1)
        availability = self.check_availability(barber["id"], tomorrow.isoformat())

        # Step 4: Create appointment
        appointment_data = {
            "barber_id": barber["id"],
            "client_id": None,  # Will be created with appointment
            "appointment_date": tomorrow.isoformat(),
            "appointment_time": "10:00:00",
            "duration_minutes": 30,
            "service_name": "Test Haircut",
            "service_category": "Haircuts",
            "service_revenue": 35.0,
            "customer_type": "new",
            "status": "scheduled",
            "client_first_name": TEST_CLIENT["first_name"],
            "client_last_name": TEST_CLIENT["last_name"],
            "client_email": TEST_CLIENT["email"],
            "client_phone": TEST_CLIENT["phone"],
            "client_notes": "Test appointment via API",
        }

        appointment = self.create_appointment(appointment_data)

        if appointment and appointment.get("id"):
            # Step 5: Verify appointment
            confirmed = self.get_appointment(appointment["id"])

            print("\n✅ APPOINTMENT BOOKING TEST COMPLETE!")
            self.generate_documentation(appointment, confirmed)
        else:
            print("\n❌ Failed to complete booking flow")

    def generate_documentation(self, appointment: Dict, confirmed: Dict):
        """Generate documentation of API calls"""
        doc = f"""
# Production Appointment Booking API Documentation
Generated: {datetime.now().isoformat()}
API Base URL: {self.base_url}

## Authentication
- Endpoint: POST /api/v1/auth/token
- Form Data: username=email&password=password
- Returns: JWT token

## Appointment Booking Flow

### 1. Get Locations
- Endpoint: GET /api/v1/locations
- Auth: Required
- Returns: List of locations

### 2. Get Barbers
- Endpoint: GET /api/v1/barbers
- Auth: Required
- Returns: List of barbers

### 3. Check Availability
- Endpoint: GET /api/v1/appointments/availability/{{barber_id}}
- Auth: Required
- Parameters:
  - date: ISO date (YYYY-MM-DD)
- Returns: Available time slots

### 4. Create Appointment
- Endpoint: POST /api/v1/appointments/
- Auth: Required
- Payload:
```json
{{
    "barber_id": 1,
    "appointment_date": "YYYY-MM-DD",
    "appointment_time": "HH:MM:SS",
    "duration_minutes": 30,
    "service_name": "Haircut",
    "service_category": "Haircuts",
    "service_revenue": 35.0,
    "customer_type": "new",
    "status": "scheduled",
    "client_first_name": "John",
    "client_last_name": "Doe",
    "client_email": "john@example.com",
    "client_phone": "555-1234",
    "client_notes": "First visit"
}}
```
- Returns: Created appointment with ID

### 5. Get Appointment Details
- Endpoint: GET /api/v1/appointments/{{appointment_id}}
- Auth: Required
- Returns: Full appointment details

## Test Results
- Appointment ID: {appointment.get('id', 'N/A')}
- Status: {appointment.get('status', 'N/A')}
- Date: {appointment.get('appointment_date', 'N/A')}
- Time: {appointment.get('appointment_time', 'N/A')}

## Additional Endpoints

### Dashboard Appointments
- GET /api/v1/dashboard/appointments/today
- GET /api/v1/dashboard/appointments/upcoming
- GET /api/v1/dashboard/appointments/week

### Appointment Management
- PUT /api/v1/appointments/{{appointment_id}} - Update appointment
- DELETE /api/v1/appointments/{{appointment_id}} - Cancel appointment
"""

        # Save documentation
        with open("PRODUCTION_APPOINTMENT_API_DOCUMENTATION.md", "w") as f:
            f.write(doc)
        print(f"\nDocumentation saved to: PRODUCTION_APPOINTMENT_API_DOCUMENTATION.md")


def main():
    """Run the booking test"""
    tester = AppointmentBookingTester(API_BASE_URL)

    try:
        tester.run_complete_flow()
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback

        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
