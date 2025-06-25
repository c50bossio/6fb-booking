#!/usr/bin/env python3
"""
Debug Stripe Configuration on Render Deployment
This script is designed to be run on the deployed server to diagnose issues
"""

import os
import sys
import stripe
import json
from datetime import datetime
import traceback


def safe_print(message):
    """Print with timestamp and flush immediately"""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] {message}", flush=True)


def mask_sensitive(value: str, var_name: str) -> str:
    """Mask sensitive values for safe logging"""
    if not value:
        return "NOT SET"

    if "SECRET" in var_name or "KEY" in var_name:
        if len(value) > 11:
            return f"{value[:7]}...{value[-4:]}"
        else:
            return "***"
    return value


def debug_environment():
    """Debug environment configuration"""
    safe_print("=" * 60)
    safe_print("ENVIRONMENT CONFIGURATION")
    safe_print("=" * 60)

    # Check deployment environment
    safe_print(f"ENVIRONMENT: {os.getenv('ENVIRONMENT', 'not set')}")
    safe_print(f"Python Version: {sys.version}")
    safe_print(f"Current Directory: {os.getcwd()}")

    # Check for .env files
    env_files = [".env", ".env.production", ".env.stripe"]
    for env_file in env_files:
        if os.path.exists(env_file):
            safe_print(f"✅ Found {env_file}")
        else:
            safe_print(f"❌ {env_file} not found")


def debug_stripe_env_vars():
    """Debug Stripe environment variables"""
    safe_print("\n" + "=" * 60)
    safe_print("STRIPE ENVIRONMENT VARIABLES")
    safe_print("=" * 60)

    stripe_vars = [
        "STRIPE_SECRET_KEY",
        "STRIPE_PUBLISHABLE_KEY",
        "STRIPE_WEBHOOK_SECRET",
        "STRIPE_CONNECT_CLIENT_ID",
    ]

    var_status = {}
    for var in stripe_vars:
        value = os.getenv(var)
        if value:
            masked = mask_sensitive(value, var)
            safe_print(f"✅ {var}: {masked}")

            # Additional checks for key format
            if var == "STRIPE_SECRET_KEY":
                if value.startswith("sk_test_"):
                    safe_print("   ℹ️  Using TEST mode key")
                elif value.startswith("sk_live_"):
                    safe_print("   ⚠️  Using LIVE mode key")
                else:
                    safe_print("   ❌ Invalid key format")
        else:
            safe_print(f"❌ {var}: NOT SET")
            var_status[var] = False

    return var_status


def debug_stripe_initialization():
    """Debug Stripe SDK initialization"""
    safe_print("\n" + "=" * 60)
    safe_print("STRIPE SDK INITIALIZATION")
    safe_print("=" * 60)

    api_key = os.getenv("STRIPE_SECRET_KEY")
    if not api_key:
        safe_print("❌ Cannot initialize Stripe - no API key")
        return False

    try:
        # Initialize Stripe
        stripe.api_key = api_key
        safe_print(f"✅ Stripe SDK initialized")
        safe_print(f"   Library version: {stripe.VERSION}")
        safe_print(f"   API version: {stripe.api_version}")

        # Test API connection
        account = stripe.Account.retrieve()
        safe_print(f"✅ API connection successful")
        safe_print(f"   Account ID: {account.id}")
        safe_print(f"   Account email: {account.email}")

        return True

    except stripe.error.AuthenticationError as e:
        safe_print(f"❌ Authentication failed: {e}")
        safe_print("   Check if your API key is correct and active")
        return False
    except stripe.error.APIConnectionError as e:
        safe_print(f"❌ Network/Connection error: {e}")
        safe_print("   Check if Render can reach Stripe API endpoints")
        return False
    except Exception as e:
        safe_print(f"❌ Unexpected error: {e}")
        safe_print(f"   Traceback: {traceback.format_exc()}")
        return False


def debug_webhook_setup():
    """Debug webhook configuration"""
    safe_print("\n" + "=" * 60)
    safe_print("WEBHOOK CONFIGURATION")
    safe_print("=" * 60)

    webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET")
    if not webhook_secret:
        safe_print("❌ STRIPE_WEBHOOK_SECRET not set")
        return False

    safe_print(f"✅ Webhook secret configured: {webhook_secret[:10]}...")

    # Check if we can list webhooks
    try:
        endpoints = stripe.WebhookEndpoint.list(limit=5)
        safe_print(f"ℹ️  Found {len(endpoints.data)} webhook endpoints:")

        for endpoint in endpoints.data:
            status = "ENABLED" if endpoint.status == "enabled" else "DISABLED"
            safe_print(f"   - [{status}] {endpoint.url}")

            # Check if URL matches expected pattern
            if "render.com" in endpoint.url or "onrender.com" in endpoint.url:
                safe_print("     ✅ Render webhook URL detected")

        return True
    except Exception as e:
        safe_print(f"⚠️  Cannot list webhooks: {e}")
        return False


def debug_stripe_connect():
    """Debug Stripe Connect configuration"""
    safe_print("\n" + "=" * 60)
    safe_print("STRIPE CONNECT CONFIGURATION")
    safe_print("=" * 60)

    client_id = os.getenv("STRIPE_CONNECT_CLIENT_ID")
    if not client_id:
        safe_print("❌ STRIPE_CONNECT_CLIENT_ID not set")
        safe_print("   Barber payouts via Stripe Connect will not work")
        return False

    safe_print(f"✅ Stripe Connect Client ID: {client_id}")

    # Try to list connected accounts
    try:
        accounts = stripe.Account.list(limit=3)
        safe_print(f"ℹ️  Connected accounts: {len(accounts.data)}")
        return True
    except Exception as e:
        safe_print(f"⚠️  Cannot list connected accounts: {e}")
        return False


def test_payment_intent_creation():
    """Test creating a payment intent"""
    safe_print("\n" + "=" * 60)
    safe_print("TESTING PAYMENT INTENT CREATION")
    safe_print("=" * 60)

    try:
        # Create a test payment intent
        intent = stripe.PaymentIntent.create(
            amount=1000,  # $10.00
            currency="usd",
            description="Test payment intent from debug script",
            metadata={"test": "true", "source": "debug_script"},
        )

        safe_print("✅ Successfully created test payment intent!")
        safe_print(f"   ID: {intent.id}")
        safe_print(f"   Status: {intent.status}")
        safe_print(f"   Amount: ${intent.amount / 100:.2f}")

        # Cancel it immediately to avoid charges
        cancelled = stripe.PaymentIntent.cancel(intent.id)
        safe_print(f"   Cancelled: {cancelled.status == 'canceled'}")

        return True

    except Exception as e:
        safe_print(f"❌ Failed to create payment intent: {e}")
        safe_print(f"   This indicates a serious configuration issue")
        return False


def generate_debug_report():
    """Generate a comprehensive debug report"""
    safe_print("\n" + "=" * 60)
    safe_print("GENERATING DEBUG REPORT")
    safe_print("=" * 60)

    report = {
        "timestamp": datetime.now().isoformat(),
        "environment": os.getenv("ENVIRONMENT", "not set"),
        "checks": {
            "environment": debug_environment(),
            "env_vars": debug_stripe_env_vars(),
            "initialization": debug_stripe_initialization(),
            "webhooks": debug_webhook_setup(),
            "connect": debug_stripe_connect(),
            "payment_test": test_payment_intent_creation(),
        },
        "recommendations": [],
    }

    # Generate recommendations
    if not os.getenv("STRIPE_SECRET_KEY"):
        report["recommendations"].append(
            "Set STRIPE_SECRET_KEY environment variable in Render dashboard"
        )

    if not os.getenv("STRIPE_WEBHOOK_SECRET"):
        report["recommendations"].append(
            "Set STRIPE_WEBHOOK_SECRET and configure webhook endpoint"
        )

    if not os.getenv("STRIPE_CONNECT_CLIENT_ID"):
        report["recommendations"].append(
            "Set STRIPE_CONNECT_CLIENT_ID for barber payouts"
        )

    # Save report
    report_file = f"stripe_debug_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    try:
        with open(report_file, "w") as f:
            json.dump(report, f, indent=2, default=str)
        safe_print(f"\n✅ Debug report saved to: {report_file}")
    except Exception as e:
        safe_print(f"❌ Failed to save report: {e}")

    # Print recommendations
    if report["recommendations"]:
        safe_print("\n📋 RECOMMENDATIONS:")
        for i, rec in enumerate(report["recommendations"], 1):
            safe_print(f"   {i}. {rec}")
    else:
        safe_print("\n✅ No critical issues found!")


def main():
    """Main debug function"""
    safe_print("\n🔍 STRIPE CONFIGURATION DEBUG TOOL FOR RENDER")
    safe_print("=" * 60)
    safe_print("This tool will help diagnose Stripe configuration issues")
    safe_print("on your Render deployment.")

    try:
        generate_debug_report()
    except Exception as e:
        safe_print(f"\n❌ CRITICAL ERROR: {e}")
        safe_print(traceback.format_exc())
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
