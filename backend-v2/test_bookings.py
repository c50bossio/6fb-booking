#!/usr/bin/env python3
"""Test script for booking endpoints."""

import requests
from datetime import date, timedelta
import json

BASE_URL = "http://localhost:8000"

def test_booking_flow():
    print("Testing Booking API Endpoints...")
    
    # First, register a user
    print("\n1. Registering a test user...")
    register_data = {
        "email": "booking_test@example.com",
        "name": "Booking Test User",
        "password": "testpass123"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/auth/register", json=register_data)
        if response.status_code == 200:
            print("✓ User registered successfully")
        elif response.status_code == 400 and "already registered" in response.text:
            print("✓ User already exists, proceeding with login")
        else:
            print(f"✗ Registration failed: {response.text}")
    except Exception as e:
        print(f"✗ Error during registration: {e}")
    
    # Login to get token
    print("\n2. Logging in...")
    login_data = {
        "username": "booking_test@example.com",
        "password": "testpass123"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/auth/login", data=login_data)
        if response.status_code == 200:
            token_data = response.json()
            access_token = token_data["access_token"]
            print("✓ Login successful")
            
            # Set up headers with token
            headers = {"Authorization": f"Bearer {access_token}"}
            
            # Test getting available slots
            print("\n3. Getting available slots for tomorrow...")
            tomorrow = (date.today() + timedelta(days=1)).isoformat()
            
            response = requests.get(
                f"{BASE_URL}/bookings/slots",
                params={"booking_date": tomorrow},
                headers=headers
            )
            
            if response.status_code == 200:
                slots = response.json()
                print(f"✓ Found {len(slots)} available slots")
                if slots:
                    print(f"   First few slots: {[s['time'] for s in slots[:3]]}")
            else:
                print(f"✗ Failed to get slots: {response.text}")
            
            # Test creating a booking
            print("\n4. Creating a booking...")
            booking_data = {
                "date": tomorrow,
                "time": "10:00",
                "service": "Haircut"
            }
            
            response = requests.post(
                f"{BASE_URL}/bookings/",
                json=booking_data,
                headers=headers
            )
            
            if response.status_code == 200:
                booking = response.json()
                booking_id = booking["id"]
                print(f"✓ Booking created successfully (ID: {booking_id})")
                print(f"   Service: {booking['service_name']}")
                print(f"   Time: {booking['start_time']}")
                print(f"   Price: ${booking['price']}")
                
                # Test getting user bookings
                print("\n5. Getting user bookings...")
                response = requests.get(f"{BASE_URL}/bookings/", headers=headers)
                
                if response.status_code == 200:
                    bookings_data = response.json()
                    print(f"✓ User has {bookings_data['total']} booking(s)")
                else:
                    print(f"✗ Failed to get bookings: {response.text}")
                
                # Test getting specific booking
                print(f"\n6. Getting booking details (ID: {booking_id})...")
                response = requests.get(f"{BASE_URL}/bookings/{booking_id}", headers=headers)
                
                if response.status_code == 200:
                    print("✓ Successfully retrieved booking details")
                else:
                    print(f"✗ Failed to get booking details: {response.text}")
                
                # Test cancelling booking
                print(f"\n7. Cancelling booking (ID: {booking_id})...")
                response = requests.put(f"{BASE_URL}/bookings/{booking_id}/cancel", headers=headers)
                
                if response.status_code == 200:
                    cancelled_booking = response.json()
                    print(f"✓ Booking cancelled successfully")
                    print(f"   Status: {cancelled_booking['status']}")
                else:
                    print(f"✗ Failed to cancel booking: {response.text}")
                
            else:
                print(f"✗ Failed to create booking: {response.text}")
                
        else:
            print(f"✗ Login failed: {response.text}")
            
    except Exception as e:
        print(f"✗ Error during testing: {e}")

if __name__ == "__main__":
    print("Make sure the FastAPI server is running on http://localhost:8000")
    print("You can start it with: uvicorn main:app --reload")
    input("Press Enter to continue with tests...")
    
    test_booking_flow()