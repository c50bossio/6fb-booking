#!/usr/bin/env python3
"""
Test the native booking flow without Trafft integration
Tests all booking endpoints to ensure everything works correctly
"""
import requests
import json
from datetime import datetime, date, timedelta
from typing import Dict, List, Optional
import sys

# Configuration
BASE_URL = "http://localhost:8000"  # Change to production URL if needed
HEADERS = {"Content-Type": "application/json"}

# Test data
TEST_SHOP_ID = 1  # Assuming location ID 1 exists
TEST_BARBER_ID = 1  # Assuming barber ID 1 exists
TEST_CLIENT = {
    "first_name": "Test",
    "last_name": "Customer",
    "email": "test.customer@example.com",
    "phone": "555-1234",
}


def print_response(response: requests.Response, title: str):
    """Pretty print API response"""
    print(f"\n{'='*60}")
    print(f"{title}")
    print(f"{'='*60}")
    print(f"Status Code: {response.status_code}")

    try:
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)}")
    except:
        print(f"Response: {response.text}")

    print(f"{'='*60}\n")


def test_services_endpoint():
    """Test that services endpoint works"""
    print("\n🔍 Testing Services Endpoint...")

    # Test 1: Get all service categories
    response = requests.get(f"{BASE_URL}/api/v1/services/categories")
    print_response(response, "Get Service Categories")

    if response.status_code != 200:
        print("❌ Failed to get service categories")
        return False

    # Test 2: Get all services
    response = requests.get(f"{BASE_URL}/api/v1/services/")
    print_response(response, "Get All Services")

    if response.status_code != 200:
        print("❌ Failed to get services")
        return False

    services = response.json()
    if not services:
        print("⚠️  No services found. Creating test service...")
        # Would need auth to create service
        return False

    # Test 3: Get specific service
    service_id = services[0]["id"]
    response = requests.get(f"{BASE_URL}/api/v1/services/{service_id}")
    print_response(response, f"Get Service {service_id}")

    return response.status_code == 200


def test_public_booking_endpoints():
    """Test public booking endpoints"""
    print("\n🔍 Testing Public Booking Endpoints...")

    # Test 1: Get barbers for a shop
    response = requests.get(
        f"{BASE_URL}/api/v1/booking/public/shops/{TEST_SHOP_ID}/barbers"
    )
    print_response(response, f"Get Barbers for Shop {TEST_SHOP_ID}")

    if response.status_code != 200:
        print("❌ Failed to get barbers")
        return None

    barbers = response.json()
    if not barbers:
        print("⚠️  No barbers found for this shop")
        return None

    barber_id = barbers[0]["id"]

    # Test 2: Get services for a barber
    response = requests.get(
        f"{BASE_URL}/api/v1/booking/public/barbers/{barber_id}/services"
    )
    print_response(response, f"Get Services for Barber {barber_id}")

    if response.status_code != 200:
        print("❌ Failed to get barber services")
        return None

    services = response.json()
    if not services:
        print("⚠️  No services found for this barber")
        return None

    service_id = services[0]["id"]

    # Test 3: Get availability
    start_date = date.today() + timedelta(days=1)  # Tomorrow
    response = requests.get(
        f"{BASE_URL}/api/v1/booking/public/barbers/{barber_id}/availability",
        params={
            "service_id": service_id,
            "start_date": str(start_date),
            "timezone": "America/New_York",
        },
    )
    print_response(response, f"Get Availability for Barber {barber_id}")

    if response.status_code != 200:
        print("❌ Failed to get availability")
        return None

    availability = response.json()
    available_slots = [
        slot for slot in availability.get("slots", []) if slot["available"]
    ]

    if not available_slots:
        print("⚠️  No available slots found")
        return None

    # Return test data for booking
    return {
        "barber_id": barber_id,
        "service_id": service_id,
        "slot": available_slots[0],
    }


def test_create_booking(booking_data: Dict):
    """Test creating a booking"""
    print("\n🔍 Testing Booking Creation...")

    slot = booking_data["slot"]

    booking_request = {
        "barber_id": booking_data["barber_id"],
        "service_id": booking_data["service_id"],
        "appointment_date": slot["date"],
        "appointment_time": slot["start_time"],
        "client_first_name": TEST_CLIENT["first_name"],
        "client_last_name": TEST_CLIENT["last_name"],
        "client_email": TEST_CLIENT["email"],
        "client_phone": TEST_CLIENT["phone"],
        "notes": "Test booking from native system",
        "timezone": "America/New_York",
    }

    response = requests.post(
        f"{BASE_URL}/api/v1/booking/public/bookings/create",
        json=booking_request,
        headers=HEADERS,
    )
    print_response(response, "Create Booking")

    if response.status_code != 200:
        print("❌ Failed to create booking")
        return None

    booking_response = response.json()
    return booking_response.get("booking_token")


def test_confirm_booking(booking_token: str):
    """Test confirming a booking"""
    print("\n🔍 Testing Booking Confirmation...")

    response = requests.get(
        f"{BASE_URL}/api/v1/booking/public/bookings/confirm/{booking_token}"
    )
    print_response(response, "Confirm Booking")

    return response.status_code == 200


def test_booking_in_main_router():
    """Test that booking endpoints are accessible via main booking router"""
    print("\n🔍 Testing Main Booking Router...")

    # This should work if the booking router is properly included
    response = requests.get(f"{BASE_URL}/api/v1/booking/public/shops/1/barbers")

    if response.status_code == 404:
        print("❌ Booking router not properly configured in main.py")
        print(
            "   The /api/v1/booking prefix should include both public and authenticated endpoints"
        )
        return False

    print("✅ Booking router is properly configured")
    return True


def run_full_test():
    """Run complete booking flow test"""
    print("🚀 Starting Native Booking System Test")
    print("=" * 80)

    # Test 1: Check if services endpoint works
    if not test_services_endpoint():
        print("\n❌ Services endpoint test failed")
        print("   Make sure the services router is included in main.py")
        return

    print("\n✅ Services endpoint working")

    # Test 2: Check if booking router is properly configured
    if not test_booking_in_main_router():
        print("\n❌ Booking router not properly configured")
        return

    # Test 3: Test public booking endpoints
    booking_data = test_public_booking_endpoints()
    if not booking_data:
        print("\n❌ Public booking endpoints test failed")
        return

    print("\n✅ Public booking endpoints working")

    # Test 4: Create a booking
    booking_token = test_create_booking(booking_data)
    if not booking_token:
        print("\n❌ Booking creation failed")
        return

    print(f"\n✅ Booking created successfully! Token: {booking_token}")

    # Test 5: Confirm the booking
    if test_confirm_booking(booking_token):
        print("\n✅ Booking confirmation working")
    else:
        print("\n❌ Booking confirmation failed")
        return

    print("\n" + "=" * 80)
    print("🎉 ALL TESTS PASSED! Native booking system is working correctly")
    print("=" * 80)

    print("\n📋 Summary of working endpoints:")
    print("  - GET  /api/v1/services/categories")
    print("  - GET  /api/v1/services/")
    print("  - GET  /api/v1/services/{service_id}")
    print("  - GET  /api/v1/booking/public/shops/{shop_id}/barbers")
    print("  - GET  /api/v1/booking/public/barbers/{barber_id}/services")
    print("  - GET  /api/v1/booking/public/barbers/{barber_id}/availability")
    print("  - POST /api/v1/booking/public/bookings/create")
    print("  - GET  /api/v1/booking/public/bookings/confirm/{booking_token}")


if __name__ == "__main__":
    try:
        run_full_test()
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        sys.exit(1)
