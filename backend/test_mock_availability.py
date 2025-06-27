#!/usr/bin/env python3
"""
Test script to verify mock availability data generation
"""

import asyncio
from datetime import date, timedelta
import httpx
import json

# Configuration
BASE_URL = "http://localhost:8000"
BARBER_ID = 1  # Test barber ID
SERVICE_ID = 1  # Test service ID


async def test_availability_endpoint():
    """Test the availability endpoint with mock data"""
    
    # Test dates
    today = date.today()
    start_date = today + timedelta(days=1)  # Tomorrow
    end_date = start_date + timedelta(days=7)  # Next week
    
    # Build URL with query parameters
    url = f"{BASE_URL}/api/v1/booking/public/barbers/{BARBER_ID}/availability"
    params = {
        "service_id": SERVICE_ID,
        "start_date": str(start_date),
        "end_date": str(end_date),
        "timezone": "America/New_York"
    }
    
    print(f"Testing availability endpoint...")
    print(f"URL: {url}")
    print(f"Parameters: {json.dumps(params, indent=2)}")
    print("-" * 50)
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, params=params)
            response.raise_for_status()
            
            data = response.json()
            
            print(f"Response Status: {response.status_code}")
            print(f"Barber ID: {data.get('barber_id')}")
            print(f"Service ID: {data.get('service_id')}")
            print(f"Timezone: {data.get('timezone')}")
            print(f"Total slots: {len(data.get('slots', []))}")
            print("-" * 50)
            
            # Display first day's slots
            if data.get('slots'):
                first_date = data['slots'][0]['date']
                print(f"\nSlots for {first_date}:")
                
                for slot in data['slots']:
                    if slot['date'] == first_date:
                        status = "✅ Available" if slot['available'] else f"❌ {slot.get('reason', 'Unavailable')}"
                        print(f"  {slot['start_time']} - {slot['end_time']}: {status}")
                
                # Summary statistics
                total_slots = len(data['slots'])
                available_slots = sum(1 for slot in data['slots'] if slot['available'])
                
                print(f"\nSummary:")
                print(f"  Total slots: {total_slots}")
                print(f"  Available slots: {available_slots}")
                print(f"  Booked/Unavailable slots: {total_slots - available_slots}")
                print(f"  Availability rate: {(available_slots/total_slots)*100:.1f}%")
            
        except httpx.HTTPError as e:
            print(f"HTTP Error: {e}")
        except Exception as e:
            print(f"Error: {e}")


if __name__ == "__main__":
    print("Mock Availability Data Test")
    print("=" * 50)
    asyncio.run(test_availability_endpoint())