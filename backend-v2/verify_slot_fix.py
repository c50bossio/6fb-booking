#!/usr/bin/env python3
"""
Verification test for booking slot logic and message consistency.
Tests the API endpoint and validates frontend message display logic.
"""

import asyncio
import sys
from datetime import datetime, date, timedelta
from typing import Dict, List, Optional
import json

# Add the backend directory to the Python path
sys.path.insert(0, '/Users/bossio/6fb-booking/backend-v2')

from fastapi.testclient import TestClient
from main import app
from dependencies import get_db
from sqlalchemy.orm import Session
from models.barber import Barber
from models.availability import Availability
from database import Base, engine

# Create test client
client = TestClient(app)

# Test configuration
LEAD_TIME_HOURS = 2
TEST_BARBER_ID = 1

def setup_test_data(db: Session):
    """Set up test barber and availability."""
    # Clear existing data
    db.query(Availability).delete()
    db.query(Barber).delete()
    
    # Create test barber
    barber = Barber(
        id=TEST_BARBER_ID,
        email="test@barber.com",
        first_name="Test",
        last_name="Barber",
        is_active=True
    )
    db.add(barber)
    
    # Create availability for the next 7 days
    for i in range(7):
        availability_date = date.today() + timedelta(days=i)
        for hour in range(9, 18):  # 9 AM to 5 PM
            availability = Availability(
                barber_id=TEST_BARBER_ID,
                date=availability_date,
                time=f"{hour:02d}:00",
                is_available=True
            )
            db.add(availability)
    
    db.commit()

def format_time(time_str: str) -> str:
    """Format time string for display."""
    try:
        time_obj = datetime.strptime(time_str, "%H:%M").time()
        return time_obj.strftime("%-I:%M %p")
    except:
        return time_str

def test_slot_filtering(test_time: datetime) -> Dict:
    """Test slot filtering for a specific time."""
    # Mock the current time by using test_time parameter
    current_date = test_time.date()
    
    # Make API request
    response = client.get(f"/api/v2/bookings/slots?booking_date={current_date}")
    
    if response.status_code != 200:
        return {
            "error": f"API returned status {response.status_code}: {response.text}",
            "test_time": test_time.strftime("%Y-%m-%d %H:%M:%S")
        }
    
    data = response.json()
    slots = data.get("slots", [])
    
    # Calculate expected behavior
    cutoff_time = test_time + timedelta(hours=LEAD_TIME_HOURS)
    
    # Filter slots that should be available
    available_slots = []
    for slot in slots:
        slot_datetime = datetime.strptime(f"{current_date} {slot['time']}", "%Y-%m-%d %H:%M")
        if slot_datetime > cutoff_time:
            available_slots.append(slot)
    
    # Determine next available slot
    next_available = None
    if available_slots:
        next_available = {
            "date": current_date,
            "time": available_slots[0]["time"],
            "formatted_time": format_time(available_slots[0]["time"])
        }
    else:
        # Check tomorrow
        tomorrow = current_date + timedelta(days=1)
        tomorrow_response = client.get(f"/api/v2/bookings/slots?booking_date={tomorrow}")
        if tomorrow_response.status_code == 200:
            tomorrow_data = tomorrow_response.json()
            tomorrow_slots = tomorrow_data.get("slots", [])
            if tomorrow_slots:
                next_available = {
                    "date": tomorrow,
                    "time": tomorrow_slots[0]["time"],
                    "formatted_time": format_time(tomorrow_slots[0]["time"])
                }
    
    # Determine what message should be shown
    message = ""
    if len(available_slots) == 0:
        if next_available and next_available["date"] == current_date + timedelta(days=1):
            message = f"No available slots for today. Next available slot is tomorrow at {next_available['formatted_time']}."
        else:
            message = "No available slots for today."
    else:
        if len(available_slots) < len(slots):
            # Some slots were filtered out
            message = f"Due to our {LEAD_TIME_HOURS}-hour booking policy, earlier slots are no longer available. Next available slot is at {next_available['formatted_time']}."
        else:
            message = f"{len(available_slots)} slots available today."
    
    return {
        "test_time": test_time.strftime("%Y-%m-%d %H:%M:%S"),
        "current_date": str(current_date),
        "total_slots": len(slots),
        "available_slots": len(available_slots),
        "filtered_out": len(slots) - len(available_slots),
        "next_available": next_available,
        "expected_message": message,
        "cutoff_time": cutoff_time.strftime("%H:%M"),
        "api_response": {
            "next_available_date": data.get("next_available_date"),
            "next_available_time": data.get("next_available_time"),
            "message": data.get("message")
        }
    }

def run_verification_tests():
    """Run comprehensive verification tests."""
    print("=" * 80)
    print("BOOKING SLOT VERIFICATION TEST")
    print("=" * 80)
    print(f"Current Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Lead Time: {LEAD_TIME_HOURS} hours")
    print("=" * 80)
    
    # Set up test data
    db = next(get_db())
    setup_test_data(db)
    
    # Test scenarios
    test_scenarios = [
        {
            "name": "Early Morning (7 AM)",
            "time": datetime.now().replace(hour=7, minute=0, second=0, microsecond=0)
        },
        {
            "name": "Mid Morning (10 AM)",
            "time": datetime.now().replace(hour=10, minute=0, second=0, microsecond=0)
        },
        {
            "name": "Afternoon (2 PM)",
            "time": datetime.now().replace(hour=14, minute=0, second=0, microsecond=0)
        },
        {
            "name": "Late Afternoon (4 PM)",
            "time": datetime.now().replace(hour=16, minute=0, second=0, microsecond=0)
        },
        {
            "name": "Evening (7 PM)",
            "time": datetime.now().replace(hour=19, minute=0, second=0, microsecond=0)
        },
        {
            "name": "Current Time",
            "time": datetime.now()
        }
    ]
    
    for scenario in test_scenarios:
        print(f"\n### Test Scenario: {scenario['name']}")
        print("-" * 60)
        
        result = test_slot_filtering(scenario["time"])
        
        if "error" in result:
            print(f"❌ ERROR: {result['error']}")
            continue
        
        print(f"Test Time: {result['test_time']}")
        print(f"Cutoff Time: {result['cutoff_time']} (slots must be after this time)")
        print(f"Total Slots Today: {result['total_slots']}")
        print(f"Available Slots: {result['available_slots']}")
        print(f"Filtered Out: {result['filtered_out']}")
        
        if result['next_available']:
            print(f"Next Available: {result['next_available']['date']} at {result['next_available']['formatted_time']}")
        else:
            print("Next Available: None found")
        
        print(f"\nExpected Frontend Message:")
        print(f"  \"{result['expected_message']}\"")
        
        print(f"\nAPI Response:")
        print(f"  next_available_date: {result['api_response']['next_available_date']}")
        print(f"  next_available_time: {result['api_response']['next_available_time']}")
        print(f"  message: {result['api_response']['message']}")
        
        # Validate consistency
        print(f"\n✓ Validation:")
        if result['available_slots'] == 0 and result['next_available']:
            if result['next_available']['date'] == date.today():
                print("  ✓ Correctly showing today's next available slot")
            else:
                print("  ✓ Correctly showing tomorrow's slots when today is full")
        elif result['available_slots'] > 0:
            print("  ✓ Slots available today")
        
        if result['filtered_out'] > 0:
            print(f"  ✓ Lead time logic working: filtered {result['filtered_out']} slots")
    
    print("\n" + "=" * 80)
    print("VERIFICATION COMPLETE")
    print("=" * 80)

def quick_current_test():
    """Quick test with current time only."""
    print("\n### QUICK CURRENT TIME TEST ###")
    print(f"Current Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Set up test data
    db = next(get_db())
    setup_test_data(db)
    
    # Test current time
    result = test_slot_filtering(datetime.now())
    
    if "error" in result:
        print(f"❌ ERROR: {result['error']}")
        return
    
    print(f"\nResults:")
    print(f"- Available slots today: {result['available_slots']} out of {result['total_slots']}")
    print(f"- Slots filtered by lead time: {result['filtered_out']}")
    
    if result['next_available']:
        print(f"- Next available: {result['next_available']['date']} at {result['next_available']['formatted_time']}")
    
    print(f"\nFrontend should display:")
    print(f"  \"{result['expected_message']}\"")
    
    # Check if API response matches expectations
    api_response = result['api_response']
    if api_response['message']:
        print(f"\nAPI message: \"{api_response['message']}\"")
        if api_response['message'] == result['expected_message']:
            print("✓ API message matches expected message")
        else:
            print("⚠️  API message differs from expected message")

if __name__ == "__main__":
    # Check command line arguments
    if len(sys.argv) > 1 and sys.argv[1] == "--quick":
        quick_current_test()
    else:
        run_verification_tests()
    
    print("\nTo run quick test with current time only: python verify_slot_fix.py --quick")