#!/usr/bin/env python3
"""Configure Stripe Webhook for Testing"""

import stripe
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

print("🔧 Configuring Stripe Webhook for Testing...")

# For local development, we'll use Stripe CLI
print("\nFor local development, you have two options:")
print("\n1. Use Stripe CLI (Recommended for local testing):")
print("   - Install Stripe CLI: brew install stripe/stripe-cli/stripe")
print("   - Login: stripe login")
print(
    "   - Forward webhooks: stripe listen --forward-to localhost:8000/api/v1/webhooks/stripe"
)
print("   - Copy the webhook signing secret that appears")
print("\n2. Use ngrok for public URL:")
print("   - Install ngrok: brew install ngrok")
print("   - Start tunnel: ngrok http 8000")
print("   - Use the ngrok URL to create webhook in Stripe Dashboard")

# For production deployment
if (
    os.getenv("ENVIRONMENT") == "production"
    or input("\nConfigure production webhook? (y/n): ").lower() == "y"
):
    webhook_url = input(
        "Enter your production webhook URL (e.g., https://yourdomain.com/api/v1/webhooks/stripe): "
    )

    if webhook_url:
        try:
            # Create webhook endpoint
            endpoint = stripe.WebhookEndpoint.create(
                url=webhook_url,
                enabled_events=[
                    "payment_intent.succeeded",
                    "payment_intent.payment_failed",
                    "charge.succeeded",
                    "charge.failed",
                    "customer.created",
                    "account.updated",
                    "transfer.created",
                    "payout.paid",
                    "payout.failed",
                ],
                description="6FB Booking Platform Webhook",
            )

            print(f"\n✅ Webhook configured successfully!")
            print(f"Endpoint ID: {endpoint.id}")
            print(f"Webhook Secret: {endpoint.secret}")
            print(f"\n📝 Add this to your .env file:")
            print(f"STRIPE_WEBHOOK_SECRET={endpoint.secret}")

        except stripe.error.StripeError as e:
            print(f"❌ Error creating webhook: {e}")
else:
    print("\n📝 For local testing with Stripe CLI, add this to your .env file:")
    print("STRIPE_WEBHOOK_SECRET=whsec_[your_signing_secret_from_stripe_cli]")
