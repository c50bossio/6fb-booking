#!/bin/bash

echo "==================================="
echo "Stripe Webhook Setup Script"
echo "==================================="
echo ""

# Check if stripe CLI is installed
if ! command -v stripe &> /dev/null; then
    echo "❌ Stripe CLI not found. Installing..."
    brew install stripe/stripe-cli/stripe
else
    echo "✅ Stripe CLI is installed"
fi

# Check if logged in
echo ""
echo "Checking Stripe CLI login status..."
if ! stripe config --list &> /dev/null; then
    echo "📝 You need to login to Stripe CLI first."
    echo "Running: stripe login"
    echo ""
    stripe login
    echo ""
    echo "✅ Login complete!"
fi

# Start webhook forwarding
echo ""
echo "==================================="
echo "Starting webhook forwarding..."
echo "==================================="
echo ""
echo "The webhook secret will appear below (starts with whsec_)"
echo "Copy it and add it to your backend/.env file"
echo ""
echo "Press Ctrl+C to stop forwarding when you're done testing"
echo ""
echo "==================================="
echo ""

# Start forwarding and show the secret
stripe listen --forward-to localhost:8000/api/v1/webhooks/stripe
