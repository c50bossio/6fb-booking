#!/usr/bin/env python3
"""
Find the exact bug causing "Next available: Today at 4:30 PM" 
when no slots show for today
"""

import requests
from datetime import datetime

# Login
auth = requests.post("http://localhost:8000/api/v1/auth/login", 
                    json={"email": "test@example.com", "password": "Test123!"})
token = auth.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}

print("🔍 FINDING THE BUG")
print("=" * 60)
print(f"Current time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

# Step 1: What does the API actually return for June 28?
response = requests.get("http://localhost:8000/api/v1/bookings/slots?booking_date=2025-06-28", headers=headers)
data = response.json()

print(f"\n📊 API Response for June 28:")
print(f"Slots count: {len(data['slots'])}")
print(f"Slots: {data['slots']}")

if data.get('next_available'):
    na = data['next_available']
    print(f"\nNext Available from API:")
    print(f"  Date: {na['date']}")
    print(f"  Time: {na['time']}")
    print(f"  DateTime: {na['datetime']}")
    
    # Check if this is TODAY
    if na['date'] == '2025-06-28':
        print("\n❌ BUG CONFIRMED!")
        print("API says next available is TODAY but returned 0 slots for today!")
        
        # Let's check why 4:30 PM isn't showing
        current_time = datetime.now()
        slot_time = datetime.strptime(f"2025-06-28 {na['time']}", "%Y-%m-%d %H:%M")
        
        print(f"\nTime Analysis:")
        print(f"  Current time: {current_time}")
        print(f"  Slot time: {slot_time}")
        print(f"  Slot is in future: {slot_time > current_time}")
        
        # Check if this slot is booked
        bookings = requests.get("http://localhost:8000/api/v1/bookings/", headers=headers)
        if bookings.status_code == 200:
            all_bookings = bookings.json()['bookings']
            slot_booked = any(b['start_time'] == na['datetime'] for b in all_bookings)
            print(f"  Slot is booked: {slot_booked}")
            
            if slot_booked:
                print("\n🐛 ROOT CAUSE: Slot is booked but still reported as 'next available'!")
            else:
                print("\n🐛 ROOT CAUSE: Slot is available but filtered out of display!")

# Step 2: Check what the global next available says
print("\n📊 Global Next Available:")
global_resp = requests.get("http://localhost:8000/api/v1/bookings/slots/next-available", headers=headers)
if global_resp.status_code == 200:
    global_data = global_resp.json()
    print(f"  Date: {global_data['date']}")
    print(f"  Time: {global_data['time']}")
    
    if global_data['date'] != data.get('next_available', {}).get('date'):
        print("  ❌ INCONSISTENCY between endpoints!")

print("\n🎯 CONCLUSION:")
print("The bug is in the backend logic that determines 'next_available'")
print("It's returning a slot that either:")
print("1. Is already booked (data integrity issue)")
print("2. Should be displayed but isn't (filtering logic issue)")