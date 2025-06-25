#!/usr/bin/env python3
"""
Test simple booking creation without availability check
"""
import requests
import json
from datetime import date, timedelta

# API base URL
BASE_URL = "http://localhost:8000/api/v1/booking/public"


def test_simple_booking():
    """Test creating a booking with fixed values"""
    print("Testing simple booking creation...\n")

    # Use fixed values for testing
    tomorrow = (date.today() + timedelta(days=1)).isoformat()

    booking_data = {
        "barber_id": 1,
        "service_id": 1,
        "appointment_date": tomorrow,
        "appointment_time": "10:00",
        "client_first_name": "Test",
        "client_last_name": "Customer",
        "client_email": "test@example.com",  # pragma: allowlist secret
        "client_phone": "5551234567",  # pragma: allowlist secret
        "notes": "Test booking from API",
        "timezone": "America/New_York",
    }

    print(f"Booking data: {json.dumps(booking_data, indent=2)}")

    print("\nCreating booking...")
    response = requests.post(f"{BASE_URL}/bookings/create", json=booking_data)

    print(f"Response status: {response.status_code}")
    print(f"Response body: {json.dumps(response.json(), indent=2)}")

    if response.status_code == 200:
        print("\n✅ Booking created successfully!")
        booking_response = response.json()

        # Try to confirm the booking
        if booking_response.get("booking_token"):
            print(f"\nConfirming booking with token...")
            confirm_response = requests.get(
                f"{BASE_URL}/bookings/confirm/{booking_response['booking_token']}"
            )
            print(f"Confirmation status: {confirm_response.status_code}")
            if confirm_response.status_code == 200:
                print("✅ Booking confirmed!")
                print(
                    f"Confirmation details: {json.dumps(confirm_response.json(), indent=2)[:500]}..."
                )
    else:
        print("\n❌ Booking creation failed")


if __name__ == "__main__":
    test_simple_booking()
