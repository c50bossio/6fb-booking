#!/usr/bin/env python3
"""
Quick Stripe Configuration Verification
Checks if Stripe keys are properly configured and valid
"""

import os
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

try:
    from config.settings import settings
    import stripe

    print("🔍 Stripe Configuration Check")
    print("=" * 50)

    # Check if keys are set
    has_secret = bool(
        settings.STRIPE_SECRET_KEY
        and settings.STRIPE_SECRET_KEY != "your-stripe-secret-key"
    )
    has_publishable = bool(
        settings.STRIPE_PUBLISHABLE_KEY
        and settings.STRIPE_PUBLISHABLE_KEY != "your-stripe-publishable-key"
    )
    has_webhook_secret = bool(
        settings.STRIPE_WEBHOOK_SECRET
        and settings.STRIPE_WEBHOOK_SECRET != "your-stripe-webhook-secret"
    )
    has_connect_client = bool(
        settings.STRIPE_CONNECT_CLIENT_ID
        and settings.STRIPE_CONNECT_CLIENT_ID != "your-stripe-connect-client-id"
    )

    print(f"✓ Secret Key Configured: {'✅' if has_secret else '❌'}")
    if has_secret:
        print(
            f"  - Key Type: {'TEST' if 'test' in settings.STRIPE_SECRET_KEY else 'LIVE'}"
        )
        print(f"  - Key Prefix: {settings.STRIPE_SECRET_KEY[:14]}...")

    print(f"✓ Publishable Key Configured: {'✅' if has_publishable else '❌'}")
    if has_publishable:
        print(
            f"  - Key Type: {'TEST' if 'test' in settings.STRIPE_PUBLISHABLE_KEY else 'LIVE'}"
        )
        print(f"  - Key Prefix: {settings.STRIPE_PUBLISHABLE_KEY[:14]}...")

    print(f"✓ Webhook Secret Configured: {'✅' if has_webhook_secret else '❌'}")
    if has_webhook_secret:
        print(f"  - Secret Prefix: {settings.STRIPE_WEBHOOK_SECRET[:10]}...")

    print(f"✓ Connect Client ID Configured: {'✅' if has_connect_client else '❌'}")
    if has_connect_client:
        print(f"  - Client ID: {settings.STRIPE_CONNECT_CLIENT_ID}")

    # Test Stripe connection if secret key is set
    if has_secret:
        print("\n🔌 Testing Stripe API Connection...")
        try:
            stripe.api_key = settings.STRIPE_SECRET_KEY
            # Try to retrieve account info
            account = stripe.Account.retrieve()
            print(f"✅ Successfully connected to Stripe!")
            print(f"  - Account ID: {account.id}")
            print(f"  - Account Type: {account.type}")
            print(f"  - Default Currency: {account.default_currency}")

            # Check if we can list payment methods
            payment_methods = stripe.PaymentMethod.list(type="card", limit=1)
            print(f"✅ API permissions verified")

        except stripe.error.AuthenticationError as e:
            print(f"❌ Authentication failed: {str(e)}")
            print("   Please check your Stripe secret key is correct")
        except Exception as e:
            print(f"❌ Connection test failed: {str(e)}")
    else:
        print("\n❌ Cannot test Stripe connection - no secret key configured")

    # Overall status
    all_configured = all(
        [has_secret, has_publishable, has_webhook_secret, has_connect_client]
    )

    print("\n" + "=" * 50)
    if all_configured:
        print("✅ All Stripe configurations are set!")
        print("\nNext steps:")
        print("1. Run the payment system tests: python test_payment_system.py")
        print("2. Set up webhooks in Stripe Dashboard")
        print("3. Test the complete payment flow")
    else:
        print("❌ Some Stripe configurations are missing!")
        print("\nRequired environment variables:")
        if not has_secret:
            print("- STRIPE_SECRET_KEY")
        if not has_publishable:
            print("- STRIPE_PUBLISHABLE_KEY")
        if not has_webhook_secret:
            print("- STRIPE_WEBHOOK_SECRET")
        if not has_connect_client:
            print("- STRIPE_CONNECT_CLIENT_ID")

except ImportError as e:
    print(f"❌ Failed to import settings: {e}")
    print("Make sure you're in the backend directory and have installed dependencies")
except Exception as e:
    print(f"❌ Unexpected error: {e}")
