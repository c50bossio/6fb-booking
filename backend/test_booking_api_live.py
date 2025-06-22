#!/usr/bin/env python3
"""
Live API Booking System Test
Tests booking functionality through API endpoints with proper authentication
"""

import requests
import json
from datetime import datetime, date, timedelta
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

BASE_URL = "http://localhost:8000/api/v1"

class BookingAPITester:
    def __init__(self):
        self.base_url = BASE_URL
        self.admin_token = None
        self.test_results = []
        
    def print_header(self, text):
        """Print a formatted header"""
        print(f"\n{'=' * 60}")
        print(f"🔍 {text}")
        print('=' * 60)
        
    def print_result(self, success, message, details=None):
        """Print test result"""
        icon = "✅" if success else "❌"
        print(f"{icon} {message}")
        if details:
            if isinstance(details, dict):
                for key, value in details.items():
                    print(f"   {key}: {value}")
            else:
                print(f"   {details}")
    
    def test_health_check(self):
        """Test if the API is running"""
        self.print_header("Testing API Health")
        
        try:
            resp = requests.get(f"{self.base_url}/../health")
            if resp.status_code == 200:
                self.print_result(True, "API is healthy", resp.json())
                return True
            else:
                self.print_result(False, f"API health check failed: {resp.status_code}")
                return False
        except requests.exceptions.ConnectionError:
            self.print_result(False, "Cannot connect to API. Is the server running?")
            print("\n⚠️  Please start the server with:")
            print("   cd /Users/bossio/6fb-booking/backend")
            print("   uvicorn main:app --reload")
            return False
    
    def test_public_endpoints(self):
        """Test public booking endpoints"""
        self.print_header("Testing Public Booking Endpoints")
        
        # 1. Get locations
        print("\n1. Testing /locations endpoint...")
        resp = requests.get(f"{self.base_url}/locations")
        if resp.status_code == 200:
            locations = resp.json()
            self.print_result(True, f"Found {len(locations)} locations")
            if locations:
                location = locations[0]
                location_id = location["id"]
                print(f"   First location: {location['name']} (ID: {location_id})")
                
                # 2. Get barbers for location
                print("\n2. Testing /booking/public/shops/{shop_id}/barbers endpoint...")
                resp = requests.get(f"{self.base_url}/booking/public/shops/{location_id}/barbers")
                if resp.status_code == 200:
                    barbers = resp.json()
                    self.print_result(True, f"Found {len(barbers)} barbers")
                    if barbers:
                        barber = barbers[0]
                        barber_id = barber["id"]
                        print(f"   First barber: {barber['first_name']} {barber['last_name']}")
                        print(f"   Rating: {barber.get('average_rating', 'N/A')} stars")
                        
                        # 3. Get services for barber
                        print("\n3. Testing /booking/public/barbers/{barber_id}/services endpoint...")
                        resp = requests.get(f"{self.base_url}/booking/public/barbers/{barber_id}/services")
                        if resp.status_code == 200:
                            services = resp.json()
                            self.print_result(True, f"Found {len(services)} services")
                            
                            # Group by category
                            by_category = {}
                            for svc in services:
                                cat = svc["category_name"]
                                if cat not in by_category:
                                    by_category[cat] = []
                                by_category[cat].append(svc)
                            
                            for cat, svcs in by_category.items():
                                print(f"\n   {cat}:")
                                for svc in svcs[:2]:  # Show first 2
                                    deposit_info = ""
                                    if svc["requires_deposit"]:
                                        deposit_info = f" (Deposit: ${svc['deposit_amount']})"
                                    print(f"     - {svc['name']}: ${svc['base_price']:.2f} ({svc['duration_minutes']}min){deposit_info}")
                            
                            if services:
                                service = services[0]
                                service_id = service["id"]
                                
                                # 4. Check availability
                                print(f"\n4. Testing /booking/public/barbers/{barber_id}/availability endpoint...")
                                tomorrow = date.today() + timedelta(days=1)
                                params = {
                                    "service_id": service_id,
                                    "start_date": str(tomorrow),
                                    "end_date": str(tomorrow + timedelta(days=3))
                                }
                                
                                resp = requests.get(
                                    f"{self.base_url}/booking/public/barbers/{barber_id}/availability",
                                    params=params
                                )
                                
                                if resp.status_code == 200:
                                    availability = resp.json()
                                    slots = availability["slots"]
                                    available = [s for s in slots if s["available"]]
                                    unavailable = [s for s in slots if not s["available"]]
                                    
                                    self.print_result(True, "Availability check successful", {
                                        "Total slots": len(slots),
                                        "Available": len(available),
                                        "Unavailable": len(unavailable),
                                        "Date range": f"{params['start_date']} to {params['end_date']}"
                                    })
                                    
                                    # Show some available times
                                    if available:
                                        print("\n   Sample available times:")
                                        shown_dates = set()
                                        for slot in available[:10]:
                                            if slot["date"] not in shown_dates:
                                                print(f"\n   {slot['date']}:")
                                                shown_dates.add(slot["date"])
                                            print(f"     {slot['start_time']} - {slot['end_time']}")
                                        
                                        # 5. Test booking creation
                                        self.test_booking_creation(barber_id, service_id, available[0])
                                    else:
                                        self.print_result(False, "No available slots found")
                                        
                                else:
                                    self.print_result(False, f"Availability check failed: {resp.status_code}", resp.text)
                        else:
                            self.print_result(False, f"Get services failed: {resp.status_code}", resp.text)
                else:
                    self.print_result(False, f"Get barbers failed: {resp.status_code}", resp.text)
        else:
            self.print_result(False, f"Get locations failed: {resp.status_code}", resp.text)
    
    def test_booking_creation(self, barber_id, service_id, slot):
        """Test creating a booking"""
        print("\n5. Testing /booking/public/bookings/create endpoint...")
        
        booking_data = {
            "barber_id": barber_id,
            "service_id": service_id,
            "appointment_date": slot["date"],
            "appointment_time": slot["start_time"],
            "client_first_name": "Test",
            "client_last_name": "Customer",
            "client_email": f"test_{datetime.now().timestamp()}@example.com",
            "client_phone": "555-123-4567",
            "notes": "Test booking from API test script",
            "timezone": "America/New_York"
        }
        
        resp = requests.post(
            f"{self.base_url}/booking/public/bookings/create",
            json=booking_data
        )
        
        if resp.status_code == 200:
            result = resp.json()
            self.print_result(True, "Booking created successfully!", {
                "Booking token": result["booking_token"][:20] + "...",
                "Appointment ID": result["appointment_id"],
                "Message": result["confirmation_message"]
            })
            
            print("\n   Appointment details:")
            for key, value in result["appointment_details"].items():
                print(f"     {key}: {value}")
            
            # Test confirmation
            self.test_booking_confirmation(result["booking_token"])
            
            # Test double booking prevention
            self.test_double_booking(booking_data)
            
        else:
            self.print_result(False, f"Booking creation failed: {resp.status_code}", resp.text)
    
    def test_booking_confirmation(self, booking_token):
        """Test booking confirmation"""
        print("\n6. Testing /booking/public/bookings/confirm/{token} endpoint...")
        
        resp = requests.get(f"{self.base_url}/booking/public/bookings/confirm/{booking_token}")
        
        if resp.status_code == 200:
            confirmation = resp.json()
            self.print_result(True, "Booking confirmed successfully!", {
                "Status": confirmation["status"],
                "Service": confirmation["appointment"]["service"],
                "Date/Time": f"{confirmation['appointment']['date']} at {confirmation['appointment']['time']}",
                "Barber": confirmation["barber"]["name"],
                "Client": confirmation["client"]["name"]
            })
        else:
            self.print_result(False, f"Booking confirmation failed: {resp.status_code}")
    
    def test_double_booking(self, original_booking):
        """Test that double booking is prevented"""
        print("\n7. Testing double booking prevention...")
        
        # Try to book the same slot
        resp = requests.post(
            f"{self.base_url}/booking/public/bookings/create",
            json=original_booking
        )
        
        if resp.status_code == 400:
            self.print_result(True, "Double booking correctly prevented", 
                            "System rejected attempt to book already taken slot")
        else:
            self.print_result(False, f"Double booking was not prevented! Status: {resp.status_code}")
    
    def test_booking_rules(self):
        """Test booking rules enforcement"""
        self.print_header("Testing Booking Rules Enforcement")
        
        # This would require getting a barber and service first
        # For now, we'll test with hardcoded IDs if they exist
        
        # Test past date booking
        print("\n1. Testing past date booking prevention...")
        past_booking = {
            "barber_id": 1,
            "service_id": 1,
            "appointment_date": str(date.today() - timedelta(days=1)),
            "appointment_time": "10:00:00",
            "client_first_name": "Past",
            "client_last_name": "Booking",
            "client_email": "past@example.com",
            "client_phone": "555-999-9999"
        }
        
        resp = requests.post(
            f"{self.base_url}/booking/public/bookings/create",
            json=past_booking
        )
        
        if resp.status_code in [400, 422]:
            self.print_result(True, "Past date booking correctly prevented")
        else:
            self.print_result(False, f"Past date booking not prevented: {resp.status_code}")
    
    def test_authenticated_endpoints(self):
        """Test authenticated booking endpoints"""
        self.print_header("Testing Authenticated Endpoints")
        
        # First, we need to login
        print("\n1. Testing authentication...")
        
        # Try with test credentials
        login_data = {
            "username": "admin@6fb.com",
            "password": "admin123"
        }
        
        resp = requests.post(
            f"{self.base_url}/auth/login",
            data=login_data
        )
        
        if resp.status_code == 200:
            self.admin_token = resp.json()["access_token"]
            self.print_result(True, "Authentication successful")
            
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            
            # Test calendar endpoint
            print("\n2. Testing /booking/bookings/calendar endpoint...")
            params = {
                "start_date": str(date.today()),
                "end_date": str(date.today() + timedelta(days=7))
            }
            
            resp = requests.get(
                f"{self.base_url}/booking/bookings/calendar",
                params=params,
                headers=headers
            )
            
            if resp.status_code == 200:
                calendar = resp.json()
                self.print_result(True, "Calendar retrieved successfully", {
                    "Date range": f"{calendar['date_range']['start']} to {calendar['date_range']['end']}",
                    "Total appointments": calendar['summary']['total_appointments'],
                    "Total revenue": f"${calendar['summary']['total_revenue']:.2f}"
                })
            else:
                self.print_result(False, f"Calendar retrieval failed: {resp.status_code}")
                
        else:
            self.print_result(False, "Authentication failed", 
                            "Please ensure test user exists or update credentials")
    
    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting Live Booking API Tests")
        print("=" * 60)
        
        # Check if API is running
        if not self.test_health_check():
            return
        
        # Test public endpoints
        self.test_public_endpoints()
        
        # Test booking rules
        self.test_booking_rules()
        
        # Test authenticated endpoints
        self.test_authenticated_endpoints()
        
        print("\n" + "=" * 60)
        print("✅ All tests completed!")
        print("=" * 60)


def main():
    """Main entry point"""
    tester = BookingAPITester()
    tester.run_all_tests()


if __name__ == "__main__":
    main()