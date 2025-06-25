#!/usr/bin/env python3
"""
Comprehensive Stripe Configuration Verification for Deployed Backend
This script checks all aspects of Stripe configuration including:
1. Environment variables
2. API key validity
3. Webhook configuration
4. Stripe Connect setup
5. API version compatibility
"""

import os
import sys
import stripe
import json
from datetime import datetime
from typing import Dict, List, Optional, Tuple
import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configuration Check Results
check_results = {
    "environment_vars": {},
    "api_key_validation": {},
    "webhook_configuration": {},
    "stripe_connect": {},
    "api_version": {},
    "deployment_readiness": {},
}


def check_environment_variables() -> Dict[str, bool]:
    """Check if all required Stripe environment variables are set"""
    print("\n" + "=" * 60)
    print("1. CHECKING ENVIRONMENT VARIABLES")
    print("=" * 60)

    required_vars = {
        "STRIPE_SECRET_KEY": "Required for payment processing",  # pragma: allowlist secret
        "STRIPE_PUBLISHABLE_KEY": "Required for frontend integration",  # pragma: allowlist secret
        "STRIPE_WEBHOOK_SECRET": "Required for webhook security",  # pragma: allowlist secret
        "STRIPE_CONNECT_CLIENT_ID": "Required for Stripe Connect (barber payouts)",
    }

    results = {}
    for var, description in required_vars.items():
        value = os.getenv(var)
        is_set = bool(value and value.strip())
        results[var] = is_set

        if is_set:
            # Mask sensitive values
            if "SECRET" in var or "KEY" in var:
                masked_value = (
                    value[:7] + "..." + value[-4:] if len(value) > 11 else "***"
                )
            else:
                masked_value = value
            print(f"✅ {var}: Set ({masked_value})")
            print(f"   {description}")
        else:
            print(f"❌ {var}: NOT SET")
            print(f"   {description}")

    check_results["environment_vars"] = results
    return results


def validate_stripe_api_key() -> Dict[str, any]:
    """Validate Stripe API key by making a test request"""
    print("\n" + "=" * 60)
    print("2. VALIDATING STRIPE API KEY")
    print("=" * 60)

    api_key = os.getenv("STRIPE_SECRET_KEY")
    results = {
        "key_present": bool(api_key),
        "key_type": None,
        "key_valid": False,
        "account_info": None,
        "error": None,
    }

    if not api_key:
        print("❌ No STRIPE_SECRET_KEY found")
        check_results["api_key_validation"] = results
        return results

    # Determine key type
    if api_key.startswith("sk_test_"):
        results["key_type"] = "test"
        print("ℹ️  Using TEST key (good for development/staging)")
    elif api_key.startswith("sk_live_"):
        results["key_type"] = "live"
        print("⚠️  Using LIVE key (production mode)")
    else:
        results["key_type"] = "unknown"
        print("⚠️  Unknown key format")

    # Validate key
    stripe.api_key = api_key
    try:
        # Try to retrieve account info
        account = stripe.Account.retrieve()
        results["key_valid"] = True
        results["account_info"] = {
            "id": account.id,
            "email": account.email,
            "country": account.country,
            "charges_enabled": account.charges_enabled,
            "payouts_enabled": account.payouts_enabled,
        }

        print("✅ API key is valid!")
        print(f"   Account ID: {account.id}")
        print(f"   Email: {account.email}")
        print(f"   Country: {account.country}")
        print(f"   Charges enabled: {account.charges_enabled}")
        print(f"   Payouts enabled: {account.payouts_enabled}")

    except stripe.error.AuthenticationError as e:
        results["error"] = str(e)
        print(f"❌ Authentication failed: {e}")
    except Exception as e:
        results["error"] = str(e)
        print(f"❌ Error validating key: {e}")

    check_results["api_key_validation"] = results
    return results


def check_webhook_configuration() -> Dict[str, any]:
    """Check webhook endpoint configuration"""
    print("\n" + "=" * 60)
    print("3. CHECKING WEBHOOK CONFIGURATION")
    print("=" * 60)

    webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET")
    results = {
        "webhook_secret_set": bool(webhook_secret),
        "webhook_endpoints": [],
        "error": None,
    }

    if not webhook_secret:
        print("❌ No STRIPE_WEBHOOK_SECRET found")
        print("   This is required for secure webhook handling")
    else:
        print(f"✅ Webhook secret is set: {webhook_secret[:10]}...")

    # List webhook endpoints from Stripe
    try:
        endpoints = stripe.WebhookEndpoint.list(limit=10)
        for endpoint in endpoints.data:
            endpoint_info = {
                "id": endpoint.id,
                "url": endpoint.url,
                "enabled": endpoint.status == "enabled",
                "enabled_events": endpoint.enabled_events,
                "created": datetime.fromtimestamp(endpoint.created).isoformat(),
            }
            results["webhook_endpoints"].append(endpoint_info)

            status = "✅ ENABLED" if endpoint_info["enabled"] else "❌ DISABLED"
            print(f"\n{status} Webhook: {endpoint.url}")
            print(f"   Events: {', '.join(endpoint.enabled_events[:3])}...")

    except Exception as e:
        results["error"] = str(e)
        print(f"❌ Error listing webhooks: {e}")

    check_results["webhook_configuration"] = results
    return results


def check_stripe_connect_setup() -> Dict[str, any]:
    """Check Stripe Connect configuration for barber payouts"""
    print("\n" + "=" * 60)
    print("4. CHECKING STRIPE CONNECT SETUP")
    print("=" * 60)

    client_id = os.getenv("STRIPE_CONNECT_CLIENT_ID")
    results = {
        "client_id_set": bool(client_id),
        "connect_enabled": False,
        "connected_accounts": 0,
        "error": None,
    }

    if not client_id:
        print("❌ No STRIPE_CONNECT_CLIENT_ID found")
        print("   This is required for barber payouts via Stripe Connect")
    else:
        print(f"✅ Stripe Connect Client ID is set: {client_id}")
        results["connect_enabled"] = True

        # Try to list connected accounts
        try:
            accounts = stripe.Account.list(limit=5)
            results["connected_accounts"] = len(accounts.data)
            print(f"   Connected accounts: {len(accounts.data)}")

            if accounts.data:
                print("\n   Recent connected accounts:")
                for acc in accounts.data[:3]:
                    print(f"   - {acc.id}: {acc.email or 'No email'}")

        except Exception as e:
            results["error"] = str(e)
            print(f"   Error listing connected accounts: {e}")

    check_results["stripe_connect"] = results
    return results


def check_api_version() -> Dict[str, any]:
    """Check Stripe API version compatibility"""
    print("\n" + "=" * 60)
    print("5. CHECKING API VERSION")
    print("=" * 60)

    results = {
        "library_version": stripe.VERSION,
        "api_version": stripe.api_version,
        "account_api_version": None,
        "compatible": True,
        "warnings": [],
    }

    print(f"ℹ️  Stripe Python library version: {stripe.VERSION}")
    print(f"ℹ️  Default API version: {stripe.api_version}")

    try:
        # Get account's default API version
        account = stripe.Account.retrieve()
        if hasattr(account, "api_version"):
            results["account_api_version"] = account.api_version
            print(f"ℹ️  Account API version: {account.api_version}")
    except:
        pass

    # Check for known compatibility issues
    if stripe.VERSION < "5.0.0":
        results["warnings"].append("Consider upgrading stripe library to 5.x or newer")
        print("⚠️  Consider upgrading stripe library to 5.x or newer")

    check_results["api_version"] = results
    return results


def check_deployment_readiness() -> Dict[str, bool]:
    """Overall deployment readiness check"""
    print("\n" + "=" * 60)
    print("6. DEPLOYMENT READINESS SUMMARY")
    print("=" * 60)

    readiness = {
        "basic_payments": False,
        "webhook_handling": False,
        "barber_payouts": False,
        "production_ready": False,
    }

    # Basic payments readiness
    env_check = check_results["environment_vars"]
    api_check = check_results["api_key_validation"]

    if (
        env_check.get("STRIPE_SECRET_KEY")
        and env_check.get("STRIPE_PUBLISHABLE_KEY")
        and api_check.get("key_valid")
    ):
        readiness["basic_payments"] = True
        print("✅ Basic payment processing: READY")
    else:
        print("❌ Basic payment processing: NOT READY")
        print("   - Ensure STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY are set")
        print("   - Verify API key is valid")

    # Webhook handling readiness
    webhook_check = check_results["webhook_configuration"]
    if env_check.get("STRIPE_WEBHOOK_SECRET") and webhook_check.get(
        "webhook_endpoints"
    ):
        readiness["webhook_handling"] = True
        print("✅ Webhook handling: READY")
    else:
        print("❌ Webhook handling: NOT READY")
        print("   - Set STRIPE_WEBHOOK_SECRET in environment")
        print("   - Configure webhook endpoint in Stripe Dashboard")

    # Barber payouts readiness
    connect_check = check_results["stripe_connect"]
    if env_check.get("STRIPE_CONNECT_CLIENT_ID"):
        readiness["barber_payouts"] = True
        print("✅ Barber payouts (Stripe Connect): READY")
    else:
        print("❌ Barber payouts (Stripe Connect): NOT READY")
        print("   - Set STRIPE_CONNECT_CLIENT_ID in environment")

    # Production readiness
    if (
        readiness["basic_payments"]
        and readiness["webhook_handling"]
        and api_check.get("key_type") == "live"
    ):
        readiness["production_ready"] = True
        print("\n🚀 PRODUCTION READY!")
    else:
        print("\n⚠️  NOT PRODUCTION READY")
        if api_check.get("key_type") == "test":
            print("   - Using test keys (switch to live keys for production)")

    check_results["deployment_readiness"] = readiness
    return readiness


def save_report():
    """Save detailed report to file"""
    report_file = (
        f"stripe_config_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    )
    with open(report_file, "w") as f:
        json.dump(check_results, f, indent=2, default=str)
    print(f"\n📄 Detailed report saved to: {report_file}")


def main():
    """Run all Stripe configuration checks"""
    print("\n🔍 STRIPE CONFIGURATION VERIFICATION")
    print("=" * 60)
    print(f"Timestamp: {datetime.now().isoformat()}")
    print(f"Environment: {os.getenv('ENVIRONMENT', 'Not set')}")

    # Run all checks
    check_environment_variables()
    validate_stripe_api_key()
    check_webhook_configuration()
    check_stripe_connect_setup()
    check_api_version()
    check_deployment_readiness()

    # Save report
    save_report()

    # Exit with appropriate code
    if check_results["deployment_readiness"]["basic_payments"]:
        print("\n✅ Basic Stripe functionality is configured!")
        return 0
    else:
        print("\n❌ Stripe configuration incomplete!")
        return 1


if __name__ == "__main__":
    sys.exit(main())
