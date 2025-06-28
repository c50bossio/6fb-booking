"""
Simple test script for payment integration
"""
import requests
import json
from datetime import datetime, timedelta

# Base URL
BASE_URL = "http://localhost:8000"

# Test user credentials
TEST_USER = {
    "email": "test@example.com",
    "password": "testpass123"
}

def test_payment_flow():
    print("=== Testing Payment Integration ===\n")
    
    # Step 1: Login
    print("1. Logging in...")
    login_response = requests.post(
        f"{BASE_URL}/auth/login",
        data={"username": TEST_USER["email"], "password": TEST_USER["password"]}
    )
    
    if login_response.status_code != 200:
        print(f"❌ Login failed: {login_response.status_code}")
        print(f"Response: {login_response.text}")
        return
    
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("✅ Login successful\n")
    
    # Step 2: Create a booking
    print("2. Creating a booking...")
    tomorrow = (datetime.now() + timedelta(days=1)).date()
    booking_data = {
        "date": tomorrow.isoformat(),
        "time": "14:00",
        "service": "Haircut"
    }
    
    booking_response = requests.post(
        f"{BASE_URL}/bookings/",
        json=booking_data,
        headers=headers
    )
    
    if booking_response.status_code != 200:
        print(f"❌ Booking creation failed: {booking_response.status_code}")
        print(f"Response: {booking_response.text}")
        return
    
    booking = booking_response.json()
    booking_id = booking["id"]
    print(f"✅ Booking created with ID: {booking_id}\n")
    
    # Step 3: Create payment intent
    print("3. Creating payment intent...")
    payment_intent_response = requests.post(
        f"{BASE_URL}/payments/create-intent",
        json={"booking_id": booking_id},
        headers=headers
    )
    
    if payment_intent_response.status_code != 200:
        print(f"❌ Payment intent creation failed: {payment_intent_response.status_code}")
        print(f"Response: {payment_intent_response.text}")
        return
    
    payment_data = payment_intent_response.json()
    print(f"✅ Payment intent created")
    print(f"   - Payment Intent ID: {payment_data['payment_intent_id']}")
    print(f"   - Amount: ${payment_data['amount']}")
    print(f"   - Client Secret: {payment_data['client_secret'][:20]}...")
    print("\n")
    
    # Step 4: Simulate payment confirmation (would normally be done by Stripe.js)
    print("4. Confirming payment...")
    confirm_response = requests.post(
        f"{BASE_URL}/payments/confirm",
        json={
            "payment_intent_id": payment_data["payment_intent_id"],
            "booking_id": booking_id
        },
        headers=headers
    )
    
    if confirm_response.status_code != 200:
        print(f"❌ Payment confirmation failed: {confirm_response.status_code}")
        print(f"Response: {confirm_response.text}")
        print("\nNote: This is expected if using test Stripe keys without actual payment processing")
        return
    
    print("✅ Payment confirmed successfully!")
    print(f"Response: {confirm_response.json()}")
    
    # Step 5: Check booking status
    print("\n5. Checking booking status...")
    booking_check = requests.get(
        f"{BASE_URL}/bookings/{booking_id}",
        headers=headers
    )
    
    if booking_check.status_code == 200:
        final_booking = booking_check.json()
        print(f"✅ Booking status: {final_booking['status']}")
    
    print("\n=== Test Complete ===")

if __name__ == "__main__":
    test_payment_flow()