#!/usr/bin/env python3
"""
Test the complete public booking flow
"""
import requests
import json
from datetime import datetime, timedelta, date
import time

# API base URL - adjust as needed
BASE_URL = "http://localhost:8000/api/v1/booking/public"


def test_booking_flow():
    """Test the complete public booking flow"""
    print("Starting public booking flow test...\n")

    # Step 1: Get all barbers
    print("1. Getting all barbers...")
    response = requests.get(f"{BASE_URL}/barbers")
    if response.status_code != 200:
        print(f"Error getting barbers: {response.status_code}")
        print(response.text)
        return

    barbers = response.json()
    print(f"Found {len(barbers)} barbers")

    if not barbers:
        print("No barbers found. Please ensure database is seeded.")
        return

    # Use first barber
    barber = barbers[0]
    print(
        f"Using barber: {barber['first_name']} {barber['last_name']} (ID: {barber['id']})"
    )

    # Step 2: Get services for this barber
    print(f"\n2. Getting services for barber {barber['id']}...")
    response = requests.get(f"{BASE_URL}/barbers/{barber['id']}/services")
    if response.status_code != 200:
        print(f"Error getting services: {response.status_code}")
        print(response.text)
        return

    services = response.json()
    print(f"Found {len(services)} services")

    if not services:
        print("No services found for this barber.")
        return

    # Use first service
    service = services[0]
    print(
        f"Using service: {service['name']} (ID: {service['id']}, Price: ${service['base_price']})"
    )

    # Step 3: Check availability
    tomorrow = (date.today() + timedelta(days=1)).isoformat()
    tomorrow_day = (date.today() + timedelta(days=1)).strftime("%A")
    print(f"\n3. Checking availability for {tomorrow} ({tomorrow_day})...")

    params = {"start_date": tomorrow, "service_id": service["id"]}

    response = requests.get(
        f"{BASE_URL}/barbers/{barber['id']}/availability", params=params
    )
    if response.status_code != 200:
        print(f"Error checking availability: {response.status_code}")
        print(response.text)
        return

    availability_data = response.json()
    print(f"Availability response: {json.dumps(availability_data, indent=2)[:200]}...")

    # Find available slots
    available_slots = []
    if "slots" in availability_data:
        available_slots = [
            slot for slot in availability_data["slots"] if slot["available"]
        ]

    if not available_slots:
        print("No available slots found.")
        return

    # Use first available slot
    slot = available_slots[0]
    print(f"Using slot: {slot['date']} at {slot['start_time']}")

    # Step 4: Create booking
    print("\n4. Creating booking...")
    booking_data = {
        "barber_id": barber["id"],
        "service_id": service["id"],
        "appointment_date": slot["date"],
        "appointment_time": slot["start_time"],
        "client_first_name": "Test",
        "client_last_name": "Customer",
        "client_email": "test@example.com",  # pragma: allowlist secret
        "client_phone": "5551234567",  # pragma: allowlist secret
        "notes": "Test booking from API",
        "timezone": "America/New_York",
    }

    print(f"Booking data: {json.dumps(booking_data, indent=2)}")

    response = requests.post(f"{BASE_URL}/bookings/create", json=booking_data)
    if response.status_code != 200:
        print(f"Error creating booking: {response.status_code}")
        print(response.text)
        return

    booking_response = response.json()
    print(f"\nBooking created successfully!")
    print(f"Booking token: {booking_response.get('booking_token')}")
    print(f"Appointment ID: {booking_response.get('appointment_id')}")
    print(f"Confirmation: {booking_response.get('confirmation_message')}")
    print(
        f"Details: {json.dumps(booking_response.get('appointment_details', {}), indent=2)}"
    )

    # Step 5: Confirm booking
    if booking_response.get("booking_token"):
        print(f"\n5. Confirming booking with token...")
        response = requests.get(
            f"{BASE_URL}/bookings/confirm/{booking_response['booking_token']}"
        )
        if response.status_code != 200:
            print(f"Error confirming booking: {response.status_code}")
            print(response.text)
            return

        confirmation = response.json()
        print(f"Booking confirmed!")
        print(f"Status: {confirmation.get('status')}")
        print(
            f"Appointment: {json.dumps(confirmation.get('appointment', {}), indent=2)}"
        )

    print("\n✅ Public booking flow test completed successfully!")


if __name__ == "__main__":
    try:
        test_booking_flow()
    except Exception as e:
        print(f"❌ Test failed with error: {e}")
        import traceback

        traceback.print_exc()
