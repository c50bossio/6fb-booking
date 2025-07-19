#!/usr/bin/env python3
"""
Analyze the booking contradiction: Why does the API say "next available is June 28th at 4:30 PM"
but also say "0 slots available for June 28th"?
"""

import requests
import json
from datetime import datetime, time

def analyze_booking_contradiction():
    print("🔍 ANALYZING BOOKING CONTRADICTION")
    print("=" * 60)
    print(f"🕐 Current time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"📅 Today's date: June 28, 2025")
    print()
    
    # Get auth token
    auth_data = {"email": "test@example.com", "password": "Test123!"}
    response = requests.post("http://localhost:8000/api/v2/auth/login", json=auth_data)
    
    if response.status_code != 200:
        print("❌ Authentication failed")
        return
        
    token = response.json().get("access_token")
    headers = {"Authorization": f"Bearer {token}"}
    
    print("🌐 API DATA ANALYSIS")
    print("-" * 40)
    
    # Test 1: Get slots for June 28th
    print("📊 1. Checking slots for June 28th, 2025...")
    slots_response = requests.get("http://localhost:8000/api/v2/bookings/slots?booking_date=2025-06-28", headers=headers)
    
    if slots_response.status_code == 200:
        slots_data = slots_response.json()
        print(f"   ✅ API Response received")
        print(f"   📈 Slots returned: {len(slots_data.get('slots', []))}")
        print(f"   🏢 Business hours: {slots_data.get('business_hours')}")
        print(f"   ⏱️  Slot duration: {slots_data.get('slot_duration_minutes')} minutes")
        
        if slots_data.get('next_available'):
            next_avail = slots_data['next_available']
            print(f"   🎯 Next available: {next_avail['date']} at {next_avail['time']}")
            
            # THIS IS THE KEY ANALYSIS
            if next_avail['date'] == '2025-06-28' and len(slots_data.get('slots', [])) == 0:
                print(f"\n❌ LOGICAL CONTRADICTION FOUND!")
                print(f"   🤔 API says: Next available is TODAY (June 28th) at {next_avail['time']}")
                print(f"   🤔 API also says: 0 slots available for today")
                print(f"   ❓ If 4:30 PM is available TODAY, why isn't it in the slots array?")
                
                # Let's investigate further
                current_time = datetime.now().time()
                available_time = time(16, 30)  # 4:30 PM
                
                print(f"\n🔍 DETAILED INVESTIGATION:")
                print(f"   🕐 Current time: {current_time}")
                print(f"   🎯 'Available' time: {available_time}")
                print(f"   📏 Time difference: {available_time > current_time}")
                
                if available_time > current_time:
                    print(f"   ✅ 4:30 PM is AFTER current time - should be available!")
                    print(f"   🐛 BUG: Slot filtering logic is incorrectly removing valid future slots")
                else:
                    print(f"   ❌ 4:30 PM is BEFORE current time - should not be available")
            else:
                print(f"   ✅ No contradiction - next available is {next_avail['date']}")
        else:
            print(f"   ❌ No next_available data returned")
    else:
        print(f"   ❌ API failed: {slots_response.status_code}")
        return
    
    # Test 2: Global next available
    print(f"\n📊 2. Checking global next available...")
    global_response = requests.get("http://localhost:8000/api/v2/bookings/slots/next-available", headers=headers)
    
    if global_response.status_code == 200:
        global_data = global_response.json()
        print(f"   ✅ Global next available: {global_data['date']} at {global_data['time']}")
        
        # Compare with date-specific
        if slots_data.get('next_available'):
            date_specific = slots_data['next_available']
            if (global_data['date'] != date_specific['date'] or 
                global_data['time'] != date_specific['time']):
                print(f"   ❌ INCONSISTENCY between global and date-specific!")
                print(f"      Global: {global_data['date']} at {global_data['time']}")
                print(f"      Date-specific: {date_specific['date']} at {date_specific['time']}")
            else:
                print(f"   ✅ Global and date-specific are consistent")
    else:
        print(f"   ❌ Global API failed: {global_response.status_code}")
    
    # Test 3: Check what's happening at 4:30 PM specifically
    print(f"\n📊 3. Investigating 4:30 PM slot specifically...")
    
    # Let's check all appointments for today to see if 4:30 PM is actually booked
    bookings_response = requests.get("http://localhost:8000/api/v2/bookings/", headers=headers)
    
    if bookings_response.status_code == 200:
        bookings_data = bookings_response.json()
        today_bookings = []
        
        for booking in bookings_data.get('bookings', []):
            if booking.get('start_time', '').startswith('2025-06-28'):
                today_bookings.append(booking)
        
        print(f"   📋 Total bookings today: {len(today_bookings)}")
        
        # Check if 4:30 PM slot is booked
        slot_430_booked = False
        for booking in today_bookings:
            start_time = booking.get('start_time', '')
            if '16:30' in start_time:  # 4:30 PM
                slot_430_booked = True
                print(f"   ❌ 4:30 PM slot IS booked: {booking}")
                break
        
        if not slot_430_booked:
            print(f"   ✅ 4:30 PM slot is NOT booked")
            print(f"   🐛 BUG CONFIRMED: Available slot is being filtered out incorrectly!")
        
        # Show all today's bookings
        print(f"   📋 All bookings for today:")
        for booking in today_bookings:
            start_time = booking.get('start_time', '')
            service = booking.get('service_name', 'Unknown')
            status = booking.get('status', 'Unknown')
            print(f"      - {start_time} | {service} | {status}")
    else:
        print(f"   ❌ Bookings API failed: {bookings_response.status_code}")
    
    print(f"\n🎯 CONCLUSION")
    print("=" * 60)
    
    if (slots_data.get('next_available', {}).get('date') == '2025-06-28' and 
        len(slots_data.get('slots', [])) == 0):
        print("❌ CONTRADICTION CONFIRMED!")
        print("📝 The issue is in the slot generation/filtering logic")
        print("🔧 Need to investigate why available slots are being filtered out")
        print("📁 Check: services/booking_service.py - slot filtering logic")
        print("🎯 Likely issue: Lead time calculation or business hours logic")
    else:
        print("✅ No contradiction found in current data")

if __name__ == "__main__":
    analyze_booking_contradiction()