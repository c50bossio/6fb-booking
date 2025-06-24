#!/usr/bin/env python3
"""
Configure Stripe Webhooks for Production
This script helps set up Stripe webhook endpoints and retrieve the webhook secret
"""

import stripe
import os
import sys
from typing import List, Dict
import argparse
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
load_dotenv(".env.production", override=True)


def setup_stripe_webhook(
    endpoint_url: str,
    events: List[str],
    description: str = "6FB Booking Platform Webhook",
) -> Dict[str, str]:
    """
    Create or update a Stripe webhook endpoint
    
    Args:
        endpoint_url: The URL where Stripe will send webhook events
        events: List of event types to listen for
        description: Description for the webhook endpoint
    
    Returns:
        Dict with endpoint_id and secret
    """
    stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
    
    if not stripe.api_key:
        raise ValueError("STRIPE_SECRET_KEY not found in environment variables")
    
    if not stripe.api_key.startswith("sk_live_"):
        print("⚠️  WARNING: Using test Stripe key. Switch to live key for production!")
    
    try:
        # Check if endpoint already exists
        existing_endpoints = stripe.WebhookEndpoint.list(limit=100)
        
        for endpoint in existing_endpoints.data:
            if endpoint.url == endpoint_url:
                print(f"✅ Found existing webhook endpoint: {endpoint.id}")
                print(f"   URL: {endpoint.url}")
                print(f"   Status: {endpoint.status}")
                
                # Update the endpoint to ensure it has all required events
                updated_endpoint = stripe.WebhookEndpoint.modify(
                    endpoint.id,
                    enabled_events=events,
                    description=description,
                )
                
                return {
                    "endpoint_id": updated_endpoint.id,
                    "secret": updated_endpoint.secret,
                    "url": updated_endpoint.url,
                    "status": updated_endpoint.status,
                }
        
        # Create new endpoint
        print(f"📍 Creating new webhook endpoint: {endpoint_url}")
        new_endpoint = stripe.WebhookEndpoint.create(
            url=endpoint_url,
            enabled_events=events,
            description=description,
        )
        
        print(f"✅ Webhook endpoint created successfully!")
        print(f"   ID: {new_endpoint.id}")
        print(f"   Secret: {new_endpoint.secret}")
        
        return {
            "endpoint_id": new_endpoint.id,
            "secret": new_endpoint.secret,
            "url": new_endpoint.url,
            "status": new_endpoint.status,
        }
        
    except stripe.error.StripeError as e:
        print(f"❌ Stripe API error: {e}")
        sys.exit(1)


def get_required_webhook_events() -> List[str]:
    """Get the list of webhook events our platform needs to handle"""
    return [
        # Payment events
        "payment_intent.succeeded",
        "payment_intent.payment_failed",
        "payment_intent.canceled",
        "payment_intent.processing",
        "payment_intent.requires_action",
        
        # Charge events (for backwards compatibility)
        "charge.succeeded",
        "charge.failed",
        "charge.refunded",
        "charge.dispute.created",
        
        # Customer events
        "customer.created",
        "customer.updated",
        "customer.deleted",
        
        # Payment method events
        "payment_method.attached",
        "payment_method.detached",
        "payment_method.updated",
        
        # Stripe Connect events
        "account.updated",
        "account.application.authorized",
        "account.application.deauthorized",
        "account.external_account.created",
        "account.external_account.updated",
        
        # Transfer and payout events
        "transfer.created",
        "transfer.updated",
        "transfer.failed",
        "payout.created",
        "payout.updated",
        "payout.failed",
        "payout.paid",
        
        # Balance events
        "balance.available",
        
        # Capability updates (for Connect)
        "capability.updated",
        
        # Person updates (for Connect verification)
        "person.created",
        "person.updated",
        "person.deleted",
    ]


def verify_webhook_configuration():
    """Verify that webhook is properly configured"""
    stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
    
    print("\n🔍 Verifying Stripe configuration...")
    
    # Check API key
    if not stripe.api_key:
        print("❌ STRIPE_SECRET_KEY not configured")
        return False
    
    key_type = "LIVE" if stripe.api_key.startswith("sk_live_") else "TEST"
    print(f"✅ Using {key_type} Stripe API key")
    
    # Test API connection
    try:
        account = stripe.Account.retrieve()
        print(f"✅ Connected to Stripe account: {account.id}")
        print(f"   Business name: {account.business_profile.name or 'Not set'}")
        print(f"   Country: {account.country}")
        
        # Check capabilities
        if hasattr(account, "capabilities"):
            print(f"   Card payments: {account.capabilities.card_payments}")
            print(f"   Transfers: {account.capabilities.transfers}")
        
    except stripe.error.StripeError as e:
        print(f"❌ Cannot connect to Stripe: {e}")
        return False
    
    # List current webhooks
    print("\n📋 Current webhook endpoints:")
    try:
        endpoints = stripe.WebhookEndpoint.list(limit=10)
        if not endpoints.data:
            print("   No webhook endpoints configured")
        else:
            for endpoint in endpoints.data:
                print(f"   - {endpoint.url}")
                print(f"     Status: {endpoint.status}")
                print(f"     Events: {len(endpoint.enabled_events)} configured")
        
    except stripe.error.StripeError as e:
        print(f"❌ Cannot list webhooks: {e}")
        return False
    
    return True


def main():
    parser = argparse.ArgumentParser(
        description="Configure Stripe webhooks for 6FB Booking Platform"
    )
    parser.add_argument(
        "--url",
        help="Webhook endpoint URL (e.g., https://yourdomain.com/api/v1/webhooks/stripe)",
        required=False,
    )
    parser.add_argument(
        "--verify-only",
        action="store_true",
        help="Only verify current configuration without making changes",
    )
    parser.add_argument(
        "--production",
        action="store_true",
        help="Use production environment variables",
    )
    
    args = parser.parse_args()
    
    if args.production:
        load_dotenv(".env.production", override=True)
    
    # Verify configuration
    if not verify_webhook_configuration():
        print("\n⚠️  Please configure your Stripe API keys first!")
        sys.exit(1)
    
    if args.verify_only:
        print("\n✅ Verification complete!")
        return
    
    if not args.url:
        print("\n⚡ To configure webhooks, run with --url parameter:")
        print("   python configure_stripe_webhooks.py --url https://yourdomain.com/api/v1/webhooks/stripe")
        return
    
    # Configure webhook
    events = get_required_webhook_events()
    print(f"\n🔧 Configuring webhook with {len(events)} event types...")
    
    result = setup_stripe_webhook(
        endpoint_url=args.url,
        events=events,
        description="6FB Booking Platform - Production Webhook",
    )
    
    print("\n✅ Webhook configuration complete!")
    print("\n📝 Add this to your .env or .env.production file:")
    print(f"STRIPE_WEBHOOK_SECRET={result['secret']}")
    
    print("\n🔒 Keep this secret secure and never commit it to version control!")


if __name__ == "__main__":
    main()