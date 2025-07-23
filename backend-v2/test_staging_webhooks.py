#!/usr/bin/env python3
"""
Staging Webhook Testing Script

Tests staging webhook endpoints with various payloads and scenarios.
"""

import asyncio
import aiohttp
import json
import hmac
import hashlib
import time
from typing import Dict, Any

async def test_staging_webhooks():
    """Test all staging webhook endpoints"""
    base_url = "http://localhost:8001"
    
    async with aiohttp.ClientSession() as session:
        
        # Test 1: Webhook availability
        print("Testing staging webhook availability...")
        
        try:
            async with session.get(f"{base_url}/staging/webhooks/test") as response:
                if response.status == 200:
                    result = await response.json()
                    print(f"✅ Staging webhooks active: {result}")
                else:
                    print(f"❌ Staging webhooks not available: {response.status}")
        except Exception as e:
            print(f"❌ Connection error: {e}")
        
        # Test 2: Stripe webhook simulation
        print("\nTesting Stripe webhook simulation...")
        
        test_stripe_payload = {
            "id": "evt_test_staging_123",
            "type": "payment_intent.succeeded",
            "data": {
                "object": {
                    "id": "pi_test_staging_123",
                    "amount": 3500,
                    "currency": "usd",
                    "status": "succeeded"
                }
            }
        }
        
        # Create test signature
        webhook_secret = "whsec_staging_test_secret"
        payload_string = json.dumps(test_stripe_payload)
        timestamp = int(time.time())
        signature_payload = f"{timestamp}.{payload_string}"
        signature = hmac.new(
            webhook_secret.encode(),
            signature_payload.encode(),
            hashlib.sha256
        ).hexdigest()
        
        headers = {
            "stripe-signature": f"t={timestamp},v1={signature}",
            "content-type": "application/json"
        }
        
        try:
            async with session.post(
                f"{base_url}/staging/webhooks/stripe",
                json=test_stripe_payload,
                headers=headers
            ) as response:
                result = await response.json()
                print(f"✅ Stripe webhook test: {result}")
        except Exception as e:
            print(f"❌ Stripe webhook test failed: {e}")
        
        # Test 3: SMS webhook simulation
        print("\nTesting SMS webhook simulation...")
        
        test_sms_data = {
            "From": "+1234567890",
            "To": "+1987654321", 
            "Body": "Test SMS message for staging",
            "MessageSid": "SM_test_staging_123"
        }
        
        try:
            async with session.post(
                f"{base_url}/staging/webhooks/sms",
                data=test_sms_data
            ) as response:
                result = await response.json()
                print(f"✅ SMS webhook test: {result}")
        except Exception as e:
            print(f"❌ SMS webhook test failed: {e}")
        
        # Test 4: Webhook validation
        print("\nTesting webhook validation...")
        
        validation_test = {
            "webhook_type": "stripe",
            "test_payload": test_stripe_payload
        }
        
        try:
            async with session.post(
                f"{base_url}/staging/webhooks/validate",
                json=validation_test
            ) as response:
                result = await response.json()
                print(f"✅ Webhook validation test: {result}")
        except Exception as e:
            print(f"❌ Webhook validation test failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_staging_webhooks())
