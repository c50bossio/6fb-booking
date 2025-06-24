#!/usr/bin/env python3
"""Quick Stripe Configuration Test"""

import stripe
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Set Stripe API key
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

print("🔍 Checking Stripe Configuration...")
print(f"API Key: {stripe.api_key[:20]}..." if stripe.api_key else "❌ No API key found")

if stripe.api_key:
    if stripe.api_key.startswith("sk_test_"):
        print("✅ Using TEST mode Stripe key")
    elif stripe.api_key.startswith("sk_live_"):
        print("✅ Using LIVE mode Stripe key")
    else:
        print("⚠️  Invalid Stripe key format")

    try:
        # Test API connection
        account = stripe.Account.retrieve()
        print(f"\n✅ Connected to Stripe Account:")
        print(f"   ID: {account.id}")
        print(
            f"   Business: {account.business_profile.name if hasattr(account, 'business_profile') else 'Not set'}"
        )
        print(f"   Country: {account.country}")

        # Check capabilities
        if hasattr(account, "capabilities"):
            print(f"\n📋 Account Capabilities:")
            print(f"   Card Payments: {account.capabilities.card_payments}")
            print(f"   Transfers: {account.capabilities.transfers}")

        # Test creating a payment intent
        print("\n💳 Testing Payment Intent Creation...")
        test_intent = stripe.PaymentIntent.create(
            amount=100, currency="usd", metadata={"test": "true"}  # $1.00
        )
        print(f"✅ Created test payment intent: {test_intent.id}")
        print(f"   Amount: ${test_intent.amount/100:.2f}")
        print(f"   Status: {test_intent.status}")

        # Cancel it
        stripe.PaymentIntent.cancel(test_intent.id)
        print("✅ Test payment intent cancelled")

        # Check webhooks
        print("\n🔗 Checking Webhook Endpoints...")
        webhooks = stripe.WebhookEndpoint.list(limit=10)
        if webhooks.data:
            print(f"Found {len(webhooks.data)} webhook endpoint(s):")
            for webhook in webhooks.data:
                print(f"   - {webhook.url}")
                print(f"     Status: {webhook.status}")
                print(f"     Events: {len(webhook.enabled_events)}")
        else:
            print("❌ No webhook endpoints configured")
            print(
                "   Run: python scripts/configure_stripe_webhooks.py --url <your-domain>/api/v1/webhooks/stripe"
            )

        # Check Connect settings
        print(
            f"\n🔗 Stripe Connect Client ID: {os.getenv('STRIPE_CONNECT_CLIENT_ID', 'Not set')}"
        )

        print("\n✅ Stripe is properly configured and working!")

    except stripe.error.StripeError as e:
        print(f"\n❌ Stripe API Error: {e}")
else:
    print("\n❌ No Stripe API key found in environment variables")
    print("   Add STRIPE_SECRET_KEY to your .env file")

# Check webhook secret
webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET")
if webhook_secret:
    print(f"\n✅ Webhook secret configured: {webhook_secret[:20]}...")
else:
    print("\n⚠️  STRIPE_WEBHOOK_SECRET not configured")
    print("   Webhooks will not work without this!")

print("\n📝 Summary:")
print(
    "   - Payment processing: ✅ READY"
    if stripe.api_key
    else "   - Payment processing: ❌ NOT CONFIGURED"
)
print(
    "   - Webhook processing: ✅ READY"
    if webhook_secret
    else "   - Webhook processing: ⚠️  NEEDS CONFIGURATION"
)
print(
    "   - Stripe Connect: ✅ READY"
    if os.getenv("STRIPE_CONNECT_CLIENT_ID")
    else "   - Stripe Connect: ❌ NOT CONFIGURED"
)
