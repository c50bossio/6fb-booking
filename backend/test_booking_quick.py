#!/usr/bin/env python3
"""
Quick Booking System Test
Tests core booking functionality with existing data
"""

import requests
from datetime import datetime, date, timedelta
import json

BASE_URL = "http://localhost:8000/api/v1"

def test_booking_flow():
    """Test the basic booking flow"""
    print("🚀 Quick Booking System Test")
    print("=" * 50)
    
    # 1. Get locations
    print("\n1️⃣ Getting locations...")
    resp = requests.get(f"{BASE_URL}/locations")
    if resp.status_code == 200:
        locations = resp.json()
        print(f"✅ Found {len(locations)} locations")
        if locations:
            location_id = locations[0]["id"]
            print(f"   Using location: {locations[0]['name']} (ID: {location_id})")
        else:
            print("❌ No locations found!")
            return
    else:
        print(f"❌ Failed to get locations: {resp.status_code}")
        return
    
    # 2. Get barbers for the location
    print("\n2️⃣ Getting barbers...")
    resp = requests.get(f"{BASE_URL}/booking/public/shops/{location_id}/barbers")
    if resp.status_code == 200:
        barbers = resp.json()
        print(f"✅ Found {len(barbers)} barbers")
        if barbers:
            barber = barbers[0]
            barber_id = barber["id"]
            print(f"   Using barber: {barber['first_name']} {barber['last_name']} (ID: {barber_id})")
            print(f"   Rating: {barber.get('average_rating', 'N/A')} ({barber.get('total_reviews', 0)} reviews)")
        else:
            print("❌ No barbers found!")
            return
    else:
        print(f"❌ Failed to get barbers: {resp.status_code}")
        print(f"   Response: {resp.text}")
        return
    
    # 3. Get services for the barber
    print("\n3️⃣ Getting services...")
    resp = requests.get(f"{BASE_URL}/booking/public/barbers/{barber_id}/services")
    if resp.status_code == 200:
        services = resp.json()
        print(f"✅ Found {len(services)} services")
        if services:
            # Group by category
            categories = {}
            for service in services:
                cat = service["category_name"]
                if cat not in categories:
                    categories[cat] = []
                categories[cat].append(service)
            
            print("   Services by category:")
            for cat, svcs in categories.items():
                print(f"   - {cat}: {len(svcs)} services")
                for svc in svcs[:3]:  # Show first 3 services
                    print(f"     • {svc['name']} - ${svc['base_price']:.2f} ({svc['duration_minutes']} min)")
            
            # Select first service for testing
            service = services[0]
            service_id = service["id"]
            print(f"\n   Selected for booking: {service['name']} (${service['base_price']:.2f})")
        else:
            print("❌ No services found!")
            return
    else:
        print(f"❌ Failed to get services: {resp.status_code}")
        return
    
    # 4. Check availability
    print("\n4️⃣ Checking availability...")
    tomorrow = date.today() + timedelta(days=1)
    next_week = tomorrow + timedelta(days=7)
    
    params = {
        "service_id": service_id,
        "start_date": str(tomorrow),
        "end_date": str(next_week),
        "timezone": "America/New_York"
    }
    
    resp = requests.get(
        f"{BASE_URL}/booking/public/barbers/{barber_id}/availability",
        params=params
    )
    
    if resp.status_code == 200:
        availability = resp.json()
        slots = availability["slots"]
        available_slots = [s for s in slots if s["available"]]
        
        print(f"✅ Found {len(slots)} total slots ({len(available_slots)} available)")
        
        # Group by date
        slots_by_date = {}
        for slot in available_slots[:20]:  # Show first 20 available
            date_str = slot["date"]
            if date_str not in slots_by_date:
                slots_by_date[date_str] = []
            slots_by_date[date_str].append(slot)
        
        print("   Available times:")
        for date_str, date_slots in list(slots_by_date.items())[:3]:  # Show first 3 days
            print(f"   📅 {date_str}:")
            for slot in date_slots[:5]:  # Show first 5 slots per day
                print(f"      {slot['start_time']} - {slot['end_time']}")
        
        if available_slots:
            selected_slot = available_slots[0]
            print(f"\n   Selected slot: {selected_slot['date']} at {selected_slot['start_time']}")
        else:
            print("❌ No available slots found!")
            return
    else:
        print(f"❌ Failed to get availability: {resp.status_code}")
        print(f"   Response: {resp.text}")
        return
    
    # 5. Create a booking
    print("\n5️⃣ Creating booking...")
    booking_data = {
        "barber_id": barber_id,
        "service_id": service_id,
        "appointment_date": selected_slot["date"],
        "appointment_time": selected_slot["start_time"],
        "client_first_name": "Test",
        "client_last_name": "Customer",
        "client_email": f"test{datetime.now().timestamp()}@example.com",
        "client_phone": "555-123-4567",
        "notes": "This is a test booking",
        "timezone": "America/New_York"
    }
    
    resp = requests.post(
        f"{BASE_URL}/booking/public/bookings/create",
        json=booking_data
    )
    
    if resp.status_code == 200:
        booking_result = resp.json()
        booking_token = booking_result["booking_token"]
        appointment_id = booking_result["appointment_id"]
        
        print("✅ Booking created successfully!")
        print(f"   Booking token: {booking_token[:20]}...")
        print(f"   Appointment ID: {appointment_id}")
        print(f"   Message: {booking_result['confirmation_message']}")
        print("   Details:")
        for key, value in booking_result["appointment_details"].items():
            print(f"   - {key}: {value}")
    else:
        print(f"❌ Failed to create booking: {resp.status_code}")
        print(f"   Response: {resp.text}")
        return
    
    # 6. Confirm the booking
    print("\n6️⃣ Confirming booking...")
    resp = requests.get(f"{BASE_URL}/booking/public/bookings/confirm/{booking_token}")
    
    if resp.status_code == 200:
        confirmation = resp.json()
        print("✅ Booking confirmed!")
        print(f"   Status: {confirmation['status']}")
        print(f"   Appointment: {confirmation['appointment']['service']} on {confirmation['appointment']['date']} at {confirmation['appointment']['time']}")
        print(f"   Barber: {confirmation['barber']['name']}")
        print(f"   Client: {confirmation['client']['name']} ({confirmation['client']['email']})")
        print(f"   Location: {confirmation['location']['name']}")
    else:
        print(f"❌ Failed to confirm booking: {resp.status_code}")
    
    # 7. Test booking rules
    print("\n7️⃣ Testing booking rules...")
    
    # Try to book the same slot again
    print("   Testing double booking prevention...")
    resp = requests.post(
        f"{BASE_URL}/booking/public/bookings/create",
        json=booking_data
    )
    
    if resp.status_code == 400:
        print("   ✅ Double booking correctly prevented")
    else:
        print(f"   ❌ Double booking not prevented! Status: {resp.status_code}")
    
    # Try to book in the past
    print("   Testing past date prevention...")
    past_booking = booking_data.copy()
    past_booking["appointment_date"] = str(date.today() - timedelta(days=1))
    past_booking["client_email"] = "past@example.com"
    
    resp = requests.post(
        f"{BASE_URL}/booking/public/bookings/create",
        json=past_booking
    )
    
    if resp.status_code in [400, 422]:
        print("   ✅ Past date booking correctly prevented")
    else:
        print(f"   ❌ Past date booking not prevented! Status: {resp.status_code}")
    
    print("\n✅ All tests completed!")
    print("=" * 50)


if __name__ == "__main__":
    test_booking_flow()