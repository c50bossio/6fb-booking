#!/usr/bin/env python3
"""Test booking creation"""

import requests
from datetime import datetime, timedelta


def test_booking_creation():
    """Test creating a booking through the public API"""
    BASE_URL = "http://localhost:8000/api/v1/booking/public"

    # 1. Get shops
    print("1. Getting shops...")
    shops_res = requests.get(f"{BASE_URL}/shops")
    shops = shops_res.json()
    shop = shops[0]
    print(f"   Using shop: {shop['name']} (ID: {shop['id']})")

    # 2. Get barbers
    print("\n2. Getting barbers...")
    barbers_res = requests.get(f"{BASE_URL}/shops/{shop['id']}/barbers")
    barbers = barbers_res.json()
    barber = barbers[0]
    print(
        f"   Using barber: {barber['first_name']} {barber['last_name']} (ID: {barber['id']})"
    )

    # 3. Get services
    print("\n3. Getting services...")
    services_res = requests.get(f"{BASE_URL}/shops/{shop['id']}/services")
    services = services_res.json()
    service = services[0]
    print(
        f"   Using service: {service['name']} - ${service['base_price']} (ID: {service['id']})"
    )

    # 4. Get availability
    print("\n4. Getting availability...")
    # Get next Monday
    today = datetime.now()
    days_until_monday = (7 - today.weekday()) % 7
    if days_until_monday == 0:  # Today is Monday
        days_until_monday = 7  # Get next Monday
    next_monday = today + timedelta(days=days_until_monday)
    date_str = next_monday.strftime("%Y-%m-%d")
    print(f"   Checking availability for: {date_str} ({next_monday.strftime('%A')})")

    avail_res = requests.get(
        f"{BASE_URL}/barbers/{barber['id']}/availability",
        params={
            "service_id": service["id"],
            "start_date": date_str,
            "end_date": date_str,
        },
    )
    availability = avail_res.json()
    available_slots = [slot for slot in availability["slots"] if slot["available"]]

    if not available_slots:
        print("   No available slots found!")
        print(f"   Total slots checked: {len(availability['slots'])}")
        # Show why slots are not available
        for slot in availability["slots"][:5]:
            print(f"   - {slot['start_time']}: {slot.get('reason', 'Unknown')}")
        return

    slot = available_slots[0]
    print(f"   Using slot: {slot['date']} at {slot['start_time']}")

    # 5. Create booking
    print("\n5. Creating booking...")
    booking_data = {
        "location_id": shop["id"],
        "barber_id": barber["id"],
        "service_id": service["id"],
        "appointment_date": slot["date"],
        "appointment_time": slot["start_time"],
        "client_first_name": "Test",
        "client_last_name": "Customer",
        "client_email": "test.customer@example.com",
        "client_phone": "5551234567",
        "notes": "Test booking via API",
        "timezone": shop.get("timezone", "America/New_York"),
    }

    print(f"   Booking data: {booking_data}")

    booking_res = requests.post(f"{BASE_URL}/bookings/create", json=booking_data)

    if booking_res.status_code == 200:
        result = booking_res.json()
        print("\n✅ Booking created successfully!")
        print(f"   Response: {result}")
        # Print specific fields if they exist
        if "confirmation_token" in result:
            print(f"   Confirmation token: {result['confirmation_token']}")
        if "appointment" in result:
            print(f"   Appointment ID: {result['appointment']['id']}")
            print(f"   Status: {result['appointment']['status']}")
        if "message" in result:
            print(f"   Message: {result['message']}")
    else:
        print(f"\n❌ Failed to create booking: {booking_res.status_code}")
        print(f"   Response: {booking_res.text}")


if __name__ == "__main__":
    test_booking_creation()
