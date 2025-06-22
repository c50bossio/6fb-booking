#!/usr/bin/env python3
"""
Comprehensive test of the 6FB booking system
"""
import os
import requests
import json
from datetime import datetime, timedelta

# Set environment variables
os.environ['DATA_ENCRYPTION_KEY'] = 'bu8Qx6fNbUKCJ_0Y4hcyCJfg1HlzYyZQ-6lw5odtplc='

BASE_URL = "http://localhost:8000"

def test_auth_flow():
    """Test authentication flow"""
    print("\n🔐 Testing Authentication Flow")
    print("-" * 40)
    
    # Login
    response = requests.post(
        f"{BASE_URL}/api/v1/auth/token",
        data={"username": "test@6fb.com", "password": "test123"}
    )
    
    if response.status_code == 200:
        token_data = response.json()
        print("✅ Login successful")
        print(f"   User: {token_data['user']['email']}")
        print(f"   Role: {token_data['user']['role']}")
        return token_data['access_token']
    else:
        print(f"❌ Login failed: {response.status_code}")
        return None

def test_booking_flow(token=None):
    """Test booking endpoints"""
    print("\n📅 Testing Booking Flow")
    print("-" * 40)
    
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    # 1. Get shops/locations
    print("\n1. Getting barbershops:")
    response = requests.get(f"{BASE_URL}/api/v1/booking-public/shops/1/barbers")
    if response.status_code == 200:
        barbers = response.json()
        print(f"✅ Found {len(barbers)} barbers")
        if barbers:
            print(f"   First barber: {barbers[0]['first_name']} {barbers[0]['last_name']}")
    else:
        print(f"❌ Failed to get barbers: {response.status_code}")
    
    # 2. Get services
    print("\n2. Getting services:")
    response = requests.get(f"{BASE_URL}/api/v1/booking-public/barbers/1/services")
    if response.status_code == 200:
        services = response.json()
        print(f"✅ Found {len(services)} services")
        if services:
            print(f"   First service: {services[0]['name']} - ${services[0]['base_price']}")
            service_id = services[0]['id']
        else:
            service_id = 1
    else:
        print(f"❌ Failed to get services: {response.status_code}")
        service_id = 1
    
    # 3. Get availability
    print("\n3. Getting availability:")
    tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
    response = requests.get(
        f"{BASE_URL}/api/v1/booking-public/barbers/1/availability",
        params={"service_id": service_id, "start_date": tomorrow}
    )
    if response.status_code == 200:
        availability = response.json()
        slots = availability.get('slots', [])
        print(f"✅ Found {len(slots)} available slots")
        if slots:
            print(f"   First slot: {slots[0]['date']} at {slots[0]['start_time']}")
    else:
        print(f"❌ Failed to get availability: {response.status_code}")

def test_payment_flow(token):
    """Test payment connection flow"""
    print("\n💳 Testing Payment Connection Flow")
    print("-" * 40)
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Check Stripe connection status
    response = requests.get(
        f"{BASE_URL}/api/v1/stripe-connect/status/1",
        headers=headers
    )
    
    if response.status_code == 200:
        status = response.json()
        print(f"✅ Stripe Status Check:")
        print(f"   Connected: {status['connected']}")
        print(f"   Account ID: {status.get('stripe_account_id', 'N/A')}")
        print(f"   Payouts Enabled: {status.get('payouts_enabled', False)}")
    else:
        print(f"❌ Failed to check Stripe status: {response.status_code}")

def test_barber_dashboard(token):
    """Test barber dashboard endpoints"""
    print("\n💈 Testing Barber Dashboard")
    print("-" * 40)
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Get barber profile
    response = requests.get(
        f"{BASE_URL}/api/v1/barbers/profile",
        headers=headers
    )
    
    if response.status_code == 200:
        profile = response.json()
        print(f"✅ Barber Profile:")
        print(f"   Name: {profile.get('first_name', 'N/A')} {profile.get('last_name', 'N/A')}")
        print(f"   Active: {profile.get('is_active', False)}")
    else:
        print(f"❌ Failed to get barber profile: {response.status_code}")

def main():
    print("🧪 Comprehensive 6FB System Test")
    print("=" * 50)
    
    # Test authentication
    token = test_auth_flow()
    
    # Test booking flow (public endpoints)
    test_booking_flow()
    
    if token:
        # Test authenticated endpoints
        test_payment_flow(token)
        test_barber_dashboard(token)
    
    print("\n✅ Test completed!")

if __name__ == "__main__":
    main()