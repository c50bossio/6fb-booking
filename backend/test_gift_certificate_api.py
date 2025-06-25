"""Test the gift certificate API endpoints."""

import requests
import json
from datetime import datetime

# Base URL - update this to match your server
BASE_URL = "http://localhost:8000/api/v1"


def test_validate_gift_certificate():
    """Test validating a gift certificate."""
    # Test with an invalid code
    response = requests.get(f"{BASE_URL}/gift-certificates/validate/INVALID-CODE")
    print("Invalid code validation:", response.json())

    # Test with a valid code (use one from the database)
    # You'll need to update this with an actual code from your database
    valid_code = "UB8P-R8TM-KTV4-XNV3"
    response = requests.get(f"{BASE_URL}/gift-certificates/validate/{valid_code}")
    print(f"\nValid code validation for {valid_code}:", response.json())


def test_purchase_gift_certificate():
    """Test purchasing a gift certificate (requires Stripe test keys)."""
    data = {
        "recipient_name": "Test Recipient",
        "recipient_email": "recipient@example.com",
        "amount": 50.00,
        "payment_method_id": "pm_card_visa",  # Stripe test payment method
        "message": "Test gift certificate purchase",
        "sender_name": "Test Sender",
        "sender_email": "sender@example.com",
    }

    # This will fail without proper authentication
    # You'll need to add proper headers with authentication token
    headers = {"Content-Type": "application/json"}
    response = requests.post(
        f"{BASE_URL}/gift-certificates/purchase", json=data, headers=headers
    )

    print("Purchase response:", response.status_code, response.text)


def test_api_status():
    """Test if the API is running."""
    try:
        response = requests.get(f"{BASE_URL}/public/status")
        print("API Status:", response.json())
    except Exception as e:
        print("API is not running or not accessible:", str(e))


if __name__ == "__main__":
    print("Testing Gift Certificate API Endpoints...")
    print("=" * 50)

    # Test API status first
    test_api_status()

    print("\n" + "=" * 50)
    print("Testing Gift Certificate Validation...")
    test_validate_gift_certificate()

    print("\n" + "=" * 50)
    print(
        "Note: Purchase endpoint requires authentication and will likely fail without proper setup"
    )
