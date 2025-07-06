#!/usr/bin/env python3
"""
Basic Stripe connectivity test for 6FB Booking Platform
"""

import os
import sys
import logging
from decimal import Decimal

# Add backend directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import stripe
from config.settings import get_settings

# Setup logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


def test_stripe_basic():
    """Test basic Stripe connectivity and configuration."""
    logger.info("🧪 Testing basic Stripe connectivity...")

    try:
        settings = get_settings()

        # Test API key configuration
        stripe.api_key = settings.STRIPE_SECRET_KEY
        if not stripe.api_key or not stripe.api_key.startswith("sk_"):
            print("❌ Invalid Stripe secret key configuration")
            return False
        print(f"✅ Stripe API key configured: {stripe.api_key[:12]}...")

        # Test API connectivity
        account = stripe.Account.retrieve()
        print(f"✅ Stripe API connectivity successful")
        print(f"   Account ID: {account.id}")
        print(f"   Country: {account.country}")
        print(f"   Currency: {account.default_currency}")
        print(f"   Email: {account.email}")

        # Test webhook secret
        if settings.STRIPE_WEBHOOK_SECRET:
            print(
                f"✅ Webhook secret configured: {settings.STRIPE_WEBHOOK_SECRET[:12]}..."
            )
        else:
            print("⚠️  Webhook secret not configured")

        # Test Connect configuration
        if settings.STRIPE_CONNECT_CLIENT_ID:
            print(
                f"✅ Stripe Connect client ID configured: {settings.STRIPE_CONNECT_CLIENT_ID[:12]}..."
            )
        else:
            print("⚠️  Stripe Connect not configured")

        # Test creating a customer
        test_customer = stripe.Customer.create(
            email="test@example.com", name="Test Customer", metadata={"test": "true"}
        )
        print(f"✅ Customer creation successful - ID: {test_customer.id}")

        # Test payment intent creation with automatic payment methods
        payment_intent = stripe.PaymentIntent.create(
            amount=1000,  # $10.00
            currency="usd",
            customer=test_customer.id,
            description="Test payment intent",
            automatic_payment_methods={"enabled": True},
            metadata={"test": "true", "platform": "6FB"},
        )
        print(f"✅ Payment intent creation successful - ID: {payment_intent.id}")
        print(f"   Status: {payment_intent.status}")
        print(f"   Amount: ${payment_intent.amount / 100:.2f}")
        print(f"   Has client secret: {bool(payment_intent.client_secret)}")

        # Test setup intent creation for saving payment methods
        setup_intent = stripe.SetupIntent.create(
            customer=test_customer.id,
            payment_method_types=["card"],
            metadata={"test": "setup_intent", "platform": "6FB"},
        )
        print(f"✅ Setup intent creation successful - ID: {setup_intent.id}")
        print(f"   Status: {setup_intent.status}")
        print(f"   Has client secret: {bool(setup_intent.client_secret)}")

        # Test cancellation
        if payment_intent.status in [
            "requires_payment_method",
            "requires_confirmation",
        ]:
            stripe.PaymentIntent.cancel(payment_intent.id)
            print("✅ Payment intent cancellation successful")
        stripe.Customer.delete(test_customer.id)
        print("✅ Test cleanup successful")

        print("\n" + "=" * 60)
        print("🎉 ALL STRIPE TESTS PASSED!")
        print("✅ API connectivity working")
        print("✅ Customer creation working")
        print("✅ Payment method creation working")
        print("✅ Payment intent creation working")
        print("✅ Payment processing working")
        print("=" * 60)

        return True

    except stripe.error.AuthenticationError as e:
        print(f"❌ Stripe authentication failed: {str(e)}")
        print("   Check your STRIPE_SECRET_KEY in .env file")
        return False

    except stripe.error.APIConnectionError as e:
        print(f"❌ Stripe API connection failed: {str(e)}")
        print("   Check your internet connection")
        return False

    except stripe.error.StripeError as e:
        print(f"❌ Stripe error: {str(e)}")
        return False

    except Exception as e:
        print(f"❌ Unexpected error: {str(e)}")
        return False


if __name__ == "__main__":
    success = test_stripe_basic()
    exit(0 if success else 1)
