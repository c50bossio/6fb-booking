#!/usr/bin/env python3
"""
Simple Stripe Configuration Test
Tests basic Stripe functionality without authentication
"""

import os
import sys
import stripe
from dotenv import load_dotenv


def test_stripe_config():
    """Test basic Stripe configuration and connectivity"""
    print("🔧 Simple Stripe Configuration Test")
    print("=" * 50)

    # Load environment variables
    load_dotenv("/Users/bossio/6fb-booking/backend/.env")

    # Get Stripe keys
    secret_key = os.getenv("STRIPE_SECRET_KEY")
    publishable_key = os.getenv("STRIPE_PUBLISHABLE_KEY")
    webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET")
    connect_client_id = os.getenv("STRIPE_CONNECT_CLIENT_ID")

    print("\n1. ✅ Environment Configuration Check:")
    print(
        f"   Secret Key: {'✅ Set' if secret_key else '❌ Missing'} ({secret_key[:15]}...)"
    )
    print(
        f"   Publishable Key: {'✅ Set' if publishable_key else '❌ Missing'} ({publishable_key[:15]}...)"
    )
    print(f"   Webhook Secret: {'✅ Set' if webhook_secret else '❌ Missing'}")
    print(f"   Connect Client ID: {'✅ Set' if connect_client_id else '❌ Missing'}")

    if not secret_key:
        print("❌ No secret key found!")
        return False

    # Set Stripe API key
    stripe.api_key = secret_key

    print("\n2. 🔌 Testing Stripe API Connection:")
    try:
        # Test basic API connection
        account = stripe.Account.retrieve()
        print(f"   ✅ Connected to Stripe!")
        print(f"   Account ID: {account.id}")
        print(f"   Country: {account.country}")
        print(f"   Currency: {account.default_currency}")
        print(f"   Type: {account.type}")

        # Test payment methods
        print("\n3. 💳 Testing Payment Methods:")
        try:
            payment_methods = stripe.PaymentMethod.list(limit=1)
            print(f"   ✅ Payment Methods API accessible")
        except Exception as e:
            print(f"   ⚠️  Payment Methods: {str(e)}")

        # Test products (for subscription-based features)
        print("\n4. 📦 Testing Products API:")
        try:
            products = stripe.Product.list(limit=1)
            print(f"   ✅ Products API accessible")
        except Exception as e:
            print(f"   ⚠️  Products: {str(e)}")

        # Test creating a test payment intent
        print("\n5. 💰 Testing Payment Intent Creation:")
        try:
            intent = stripe.PaymentIntent.create(
                amount=100,  # $1.00 in cents
                currency="usd",
                payment_method_types=["card"],
                description="Test payment intent from setup verification",
            )
            print(f"   ✅ Payment Intent created: {intent.id}")
            print(f"   Status: {intent.status}")
            print(f"   Amount: ${intent.amount/100:.2f}")

            # Cancel the test intent
            stripe.PaymentIntent.cancel(intent.id)
            print(f"   ✅ Test intent cancelled successfully")

        except Exception as e:
            print(f"   ❌ Payment Intent creation failed: {str(e)}")
            return False

        print("\n6. 🎯 Frontend Configuration Check:")
        frontend_env = "/Users/bossio/6fb-booking/frontend/.env.local"
        if os.path.exists(frontend_env):
            with open(frontend_env, "r") as f:
                content = f.read()
                if publishable_key and publishable_key in content:
                    print("   ✅ Frontend has matching publishable key")
                else:
                    print("   ⚠️  Frontend publishable key may not match")
        else:
            print("   ⚠️  Frontend .env.local not found")

        print("\n" + "=" * 50)
        print("🎉 STRIPE SETUP TEST: ✅ PASSED!")
        print("\nNext steps:")
        print("1. Start frontend: cd frontend && npm run dev")
        print("2. Test booking flow at http://localhost:3000")
        print("3. Create test appointment with payment")
        print("4. Use test card: 4242 4242 4242 4242")

        return True

    except stripe.error.AuthenticationError as e:
        print(f"   ❌ Authentication failed: {str(e)}")
        print("   Check your secret key is correct")
        return False
    except stripe.error.APIConnectionError as e:
        print(f"   ❌ Network error: {str(e)}")
        print("   Check your internet connection")
        return False
    except Exception as e:
        print(f"   ❌ Unexpected error: {str(e)}")
        return False


if __name__ == "__main__":
    success = test_stripe_config()
    sys.exit(0 if success else 1)
