#!/usr/bin/env python3
"""
Script to test Stripe webhook locally
Run this after starting your backend server
"""

import requests
import json
import hmac
import hashlib
import time
from datetime import datetime

# Configuration
WEBHOOK_URL = "http://localhost:8000/api/v1/webhooks/stripe"
WEBHOOK_SECRET = "whsec_test_secret"  # Replace with your actual webhook secret

def generate_stripe_signature(payload: str, secret: str) -> str:
    """Generate a Stripe webhook signature"""
    timestamp = int(time.time())
    signed_payload = f"{timestamp}.{payload}"
    
    # Compute HMAC
    signature = hmac.new(
        secret.encode('utf-8'),
        signed_payload.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    
    # Return Stripe-Signature header format
    return f"t={timestamp},v1={signature}"

def send_test_webhook(event_type: str, data: dict):
    """Send a test webhook to the local server"""
    
    # Create event payload
    event = {
        "id": f"evt_test_{int(time.time())}",
        "object": "event",
        "api_version": "2023-10-16",
        "created": int(time.time()),
        "data": {
            "object": data
        },
        "type": event_type,
        "livemode": False,
        "pending_webhooks": 1,
        "request": {
            "id": None,
            "idempotency_key": None
        }
    }
    
    # Convert to JSON
    payload = json.dumps(event)
    
    # Generate signature
    signature = generate_stripe_signature(payload, WEBHOOK_SECRET)
    
    # Send request
    headers = {
        "Content-Type": "application/json",
        "Stripe-Signature": signature
    }
    
    try:
        response = requests.post(WEBHOOK_URL, data=payload, headers=headers)
        print(f"\n{'='*50}")
        print(f"Event Type: {event_type}")
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        print(f"{'='*50}")
        return response
    except Exception as e:
        print(f"Error sending webhook: {e}")
        return None

def test_payment_succeeded():
    """Test payment_intent.succeeded event"""
    data = {
        "id": "pi_test_succeeded",
        "object": "payment_intent",
        "amount": 5000,  # $50.00
        "currency": "usd",
        "status": "succeeded",
        "charges": {
            "object": "list",
            "data": [{
                "id": "ch_test_charge",
                "object": "charge",
                "receipt_url": "https://pay.stripe.com/receipts/test_receipt"
            }]
        },
        "customer": "cus_test_customer",
        "payment_method": "pm_test_method",
        "metadata": {
            "user_id": "1",
            "appointment_id": "1"
        }
    }
    
    send_test_webhook("payment_intent.succeeded", data)

def test_payment_failed():
    """Test payment_intent.payment_failed event"""
    data = {
        "id": "pi_test_failed",
        "object": "payment_intent",
        "amount": 5000,
        "currency": "usd",
        "status": "requires_payment_method",
        "last_payment_error": {
            "code": "card_declined",
            "message": "Your card was declined."
        },
        "customer": "cus_test_customer",
        "metadata": {
            "user_id": "1",
            "appointment_id": "1"
        }
    }
    
    send_test_webhook("payment_intent.payment_failed", data)

def test_refund_updated():
    """Test charge.refund.updated event"""
    data = {
        "id": "re_test_refund",
        "object": "refund",
        "amount": 2500,  # $25.00
        "charge": "ch_test_charge",
        "currency": "usd",
        "metadata": {
            "payment_id": "1",
            "reason": "Customer request"
        },
        "reason": "requested_by_customer",
        "status": "succeeded"
    }
    
    send_test_webhook("charge.refund.updated", data)

def test_customer_created():
    """Test customer.created event"""
    data = {
        "id": "cus_test_new",
        "object": "customer",
        "email": "test@example.com",
        "metadata": {
            "user_id": "1"
        }
    }
    
    send_test_webhook("customer.created", data)

def test_payment_method_attached():
    """Test payment_method.attached event"""
    data = {
        "id": "pm_test_attached",
        "object": "payment_method",
        "card": {
            "brand": "visa",
            "exp_month": 12,
            "exp_year": 2025,
            "last4": "4242"
        },
        "customer": "cus_test_customer",
        "type": "card"
    }
    
    send_test_webhook("payment_method.attached", data)

def main():
    """Run all webhook tests"""
    print("Starting Stripe webhook tests...")
    print(f"Webhook URL: {WEBHOOK_URL}")
    print(f"Make sure your backend server is running!\n")
    
    # Wait for user confirmation
    input("Press Enter to start tests...")
    
    # Run tests
    tests = [
        ("Payment Succeeded", test_payment_succeeded),
        ("Payment Failed", test_payment_failed),
        ("Refund Updated", test_refund_updated),
        ("Customer Created", test_customer_created),
        ("Payment Method Attached", test_payment_method_attached)
    ]
    
    for name, test_func in tests:
        print(f"\n\nTesting: {name}")
        test_func()
        time.sleep(1)  # Small delay between tests
    
    print("\n\nWebhook tests completed!")
    print("\nTo test with real Stripe events, use the Stripe CLI:")
    print("1. Install: brew install stripe/stripe-cli/stripe")
    print("2. Login: stripe login")
    print("3. Forward: stripe listen --forward-to localhost:8000/api/v1/webhooks/stripe")
    print("4. Trigger: stripe trigger payment_intent.succeeded")

if __name__ == "__main__":
    main()