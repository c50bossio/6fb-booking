#!/usr/bin/env python3
"""
Test script for appointment rate limiting and CAPTCHA functionality.

This script tests:
1. Rate limiting on booking endpoints
2. CAPTCHA requirement triggering after failed attempts
3. Different rate limits for authenticated vs guest users
"""

import asyncio
import httpx
from datetime import date, timedelta
import json
import time

# Configuration
BASE_URL = "http://localhost:8000/api/v1"
TEST_EMAIL = "ratelimit_test@example.com"
TEST_PASSWORD = "testpassword123"

# Test guest info
GUEST_INFO = {
    "first_name": "Test",
    "last_name": "Guest",
    "email": "testguest@example.com",
    "phone": "+1234567890"
}

async def test_booking_slots_rate_limit():
    """Test rate limiting on booking slots endpoint."""
    print("\n=== Testing Booking Slots Rate Limit ===")
    print("Rate limit: 60/minute (production), 100/minute (development)")
    
    async with httpx.AsyncClient() as client:
        # Make rapid requests to test rate limit
        success_count = 0
        rate_limited = False
        
        for i in range(70):  # Try to exceed the limit
            try:
                response = await client.get(
                    f"{BASE_URL}/appointments/slots",
                    params={
                        "appointment_date": (date.today() + timedelta(days=1)).isoformat(),
                        "barber_id": 1
                    }
                )
                if response.status_code == 200:
                    success_count += 1
                elif response.status_code == 429:
                    rate_limited = True
                    print(f"Rate limited after {success_count} successful requests")
                    print(f"Response: {response.json()}")
                    break
            except Exception as e:
                print(f"Error: {e}")
                break
            
            # Small delay to avoid overwhelming the server
            await asyncio.sleep(0.1)
        
        if not rate_limited:
            print(f"Completed {success_count} requests without rate limiting")
            print("(This is normal in development mode with higher limits)")

async def test_guest_booking_rate_limit():
    """Test rate limiting on guest booking endpoint."""
    print("\n=== Testing Guest Booking Rate Limit ===")
    print("Rate limit: 3/hour (production), 10/hour (development)")
    
    async with httpx.AsyncClient() as client:
        success_count = 0
        rate_limited = False
        
        for i in range(15):  # Try to exceed the limit
            try:
                response = await client.post(
                    f"{BASE_URL}/appointments/guest",
                    json={
                        "date": (date.today() + timedelta(days=1)).isoformat(),
                        "time": f"10:{i:02d}",  # Different times to avoid conflicts
                        "service": "Test Service",
                        "guest_info": GUEST_INFO,
                        "notes": f"Test booking {i}"
                    }
                )
                
                if response.status_code in [200, 201]:
                    success_count += 1
                    print(f"Guest booking {i+1} successful")
                elif response.status_code == 429:
                    rate_limited = True
                    print(f"\nRate limited after {success_count} successful requests")
                    print(f"Response: {response.json()}")
                    break
                elif response.status_code == 400:
                    # This might be a booking conflict or CAPTCHA requirement
                    error_detail = response.json().get("detail", "")
                    print(f"Booking {i+1} failed: {error_detail}")
                    if "CAPTCHA" in error_detail:
                        print("CAPTCHA requirement triggered!")
                        break
            except Exception as e:
                print(f"Error: {e}")
                break
            
            await asyncio.sleep(0.5)  # Small delay between requests
        
        if not rate_limited:
            print(f"\nCompleted {success_count} requests")

async def test_captcha_triggering():
    """Test CAPTCHA requirement after failed attempts."""
    print("\n=== Testing CAPTCHA Triggering ===")
    print("CAPTCHA required after 2 failed attempts")
    
    async with httpx.AsyncClient() as client:
        # First, check initial CAPTCHA status
        response = await client.post(
            f"{BASE_URL}/appointments/guest/captcha-status",
            json=GUEST_INFO
        )
        print(f"Initial CAPTCHA status: {response.json()}")
        
        # Make invalid bookings to trigger failures
        print("\nMaking invalid booking attempts...")
        for i in range(3):
            response = await client.post(
                f"{BASE_URL}/appointments/guest",
                json={
                    "date": "1999-01-01",  # Past date to trigger error
                    "time": "10:00",
                    "service": "Test Service",
                    "guest_info": GUEST_INFO
                }
            )
            print(f"Attempt {i+1}: Status={response.status_code}, Detail={response.json().get('detail', '')}")
            
            # Check CAPTCHA status after each attempt
            captcha_response = await client.post(
                f"{BASE_URL}/appointments/guest/captcha-status",
                json=GUEST_INFO
            )
            print(f"CAPTCHA status after attempt {i+1}: {captcha_response.json()}")
            
            await asyncio.sleep(0.5)

async def test_authenticated_booking_rate_limit():
    """Test rate limiting for authenticated users."""
    print("\n=== Testing Authenticated Booking Rate Limit ===")
    print("Rate limit: 30/hour (production), 50/hour (development)")
    
    async with httpx.AsyncClient() as client:
        # First, try to login (this might fail if user doesn't exist)
        print("Attempting to login...")
        login_response = await client.post(
            f"{BASE_URL}/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        
        if login_response.status_code != 200:
            print("Login failed, skipping authenticated tests")
            return
        
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Test booking creation rate limit
        success_count = 0
        rate_limited = False
        
        for i in range(35):  # Try to approach the limit
            try:
                response = await client.post(
                    f"{BASE_URL}/appointments/",
                    headers=headers,
                    json={
                        "date": (date.today() + timedelta(days=1)).isoformat(),
                        "time": f"14:{i:02d}",
                        "service": "Test Service",
                        "barber_id": 1
                    }
                )
                
                if response.status_code in [200, 201]:
                    success_count += 1
                elif response.status_code == 429:
                    rate_limited = True
                    print(f"Rate limited after {success_count} successful requests")
                    print(f"Response: {response.json()}")
                    break
                elif response.status_code == 400:
                    print(f"Booking {i+1} failed: {response.json().get('detail', '')}")
            except Exception as e:
                print(f"Error: {e}")
                break
            
            await asyncio.sleep(0.5)
        
        print(f"Completed {success_count} authenticated bookings")

async def main():
    """Run all tests."""
    print("=== Appointment Rate Limiting and CAPTCHA Tests ===")
    print("Note: Make sure the backend server is running on localhost:8000")
    print("Some tests may behave differently in development vs production mode")
    
    await test_booking_slots_rate_limit()
    await test_guest_booking_rate_limit()
    await test_captcha_triggering()
    await test_authenticated_booking_rate_limit()
    
    print("\n=== Tests Complete ===")

if __name__ == "__main__":
    asyncio.run(main())