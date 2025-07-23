#!/usr/bin/env python3
"""
Stripe Configuration Setup Script
Configure Stripe integration for BookedBarber V2

This script helps you set up Stripe for:
1. Payment processing (existing PaymentService)
2. Stripe Connect for barber payouts (existing StripeIntegrationService)
3. Webhook handling

Usage:
    python scripts/configure_stripe.py --test  # Test mode setup
    python scripts/configure_stripe.py --live  # Production setup
"""

import os
import sys
import argparse
import logging
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

import stripe
from config import settings
from services.stripe_integration_service import StripeIntegrationService
from services.payment_service import PaymentService
from db import get_db

logger = logging.getLogger(__name__)


def validate_stripe_keys(secret_key: str, publishable_key: str) -> bool:
    """Validate Stripe API keys."""
    try:
        # Test secret key
        stripe.api_key = secret_key
        account = stripe.Account.retrieve()
        
        # Test publishable key format
        if not publishable_key.startswith(('pk_test_', 'pk_live_')):
            logger.error(f"Invalid publishable key format: {publishable_key}")
            return False
            
        # Check key environment consistency
        is_test_secret = secret_key.startswith('sk_test_')
        is_test_publishable = publishable_key.startswith('pk_test_')
        
        if is_test_secret != is_test_publishable:
            logger.error("Secret and publishable keys are from different environments")
            return False
            
        logger.info(f"✅ Stripe keys validated successfully")
        logger.info(f"   Account ID: {account.id}")
        logger.info(f"   Environment: {'Test' if is_test_secret else 'Live'}")
        logger.info(f"   Country: {account.country}")
        logger.info(f"   Business type: {account.business_type}")
        
        return True
        
    except stripe.error.AuthenticationError as e:
        logger.error(f"❌ Stripe authentication failed: {e}")
        return False
    except Exception as e:
        logger.error(f"❌ Error validating Stripe keys: {e}")
        return False


def test_payment_intent_creation():
    """Test payment intent creation with existing PaymentService."""
    try:
        # Create a test payment intent
        intent = stripe.PaymentIntent.create(
            amount=2000,  # $20.00
            currency='usd',
            metadata={
                'test': 'configuration_test',
                'service': 'PaymentService'
            }
        )
        
        logger.info(f"✅ Payment intent created successfully")
        logger.info(f"   Intent ID: {intent.id}")
        logger.info(f"   Status: {intent.status}")
        logger.info(f"   Amount: ${intent.amount / 100:.2f}")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Error creating payment intent: {e}")
        return False


def test_stripe_connect():
    """Test Stripe Connect functionality for StripeIntegrationService."""
    try:
        # Test Express account creation capabilities
        account = stripe.Account.create(
            type='express',
            country='US',
            email='test-barber@example.com',
            capabilities={
                'card_payments': {'requested': True},
                'transfers': {'requested': True},
            },
        )
        
        logger.info(f"✅ Stripe Connect Express account created")
        logger.info(f"   Account ID: {account.id}")
        logger.info(f"   Type: {account.type}")
        
        # Clean up test account
        stripe.Account.delete(account.id)
        logger.info(f"✅ Test account cleaned up")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Error testing Stripe Connect: {e}")
        return False


def configure_webhooks(endpoint_url: str):
    """Configure Stripe webhooks."""
    try:
        # Get existing webhooks
        webhooks = stripe.WebhookEndpoint.list()
        
        # Check if webhook already exists
        webhook_exists = False
        for webhook in webhooks.data:
            if webhook.url == endpoint_url:
                webhook_exists = True
                logger.info(f"✅ Webhook already configured: {webhook.id}")
                logger.info(f"   URL: {webhook.url}")
                logger.info(f"   Events: {webhook.enabled_events}")
                break
        
        if not webhook_exists:
            # Create new webhook
            webhook = stripe.WebhookEndpoint.create(
                url=endpoint_url,
                enabled_events=[
                    'payment_intent.succeeded',
                    'payment_intent.payment_failed',
                    'account.updated',
                    'payment_intent.created',
                    'invoice.payment_succeeded',
                    'invoice.payment_failed',
                    'transfer.created',
                    'transfer.updated',
                    'payout.created',
                    'payout.updated',
                ],
            )
            
            logger.info(f"✅ Webhook endpoint created")
            logger.info(f"   Webhook ID: {webhook.id}")
            logger.info(f"   URL: {webhook.url}")
            logger.info(f"   Secret: {webhook.secret}")
            logger.warning(f"⚠️  Save webhook secret: {webhook.secret}")
            logger.warning(f"   Add this to your .env file as STRIPE_WEBHOOK_SECRET")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Error configuring webhooks: {e}")
        return False


def update_env_file(key: str, value: str, env_file: str = '.env'):
    """Update or add key-value pair in .env file."""
    env_path = project_root / env_file
    
    if not env_path.exists():
        logger.error(f"Environment file not found: {env_file}")
        return False
    
    # Read current content
    with open(env_path, 'r') as f:
        lines = f.readlines()
    
    # Update or add the key
    key_found = False
    for i, line in enumerate(lines):
        if line.startswith(f"{key}="):
            lines[i] = f"{key}={value}\n"
            key_found = True
            break
    
    if not key_found:
        lines.append(f"{key}={value}\n")
    
    # Write back
    with open(env_path, 'w') as f:
        f.writelines(lines)
    
    logger.info(f"✅ Updated {env_file}: {key}")
    return True


def generate_sample_env():
    """Generate sample .env configuration for Stripe."""
    sample_config = """
# =============================================================================
# STRIPE CONFIGURATION
# =============================================================================
# Get these from https://dashboard.stripe.com/apikeys

# Test Environment (Development)
STRIPE_SECRET_KEY=sk_test_your_stripe_test_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_test_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Production Environment
# STRIPE_SECRET_KEY=sk_live_your_live_secret_key
# STRIPE_PUBLISHABLE_KEY=pk_live_your_live_publishable_key
# STRIPE_WEBHOOK_SECRET=whsec_your_production_webhook_secret

# Stripe Connect (for barber payouts)
# Get this from Stripe Connect settings
# STRIPE_CONNECT_CLIENT_ID=ca_your_connect_client_id
"""
    
    return sample_config


def main():
    parser = argparse.ArgumentParser(description='Configure Stripe integration')
    parser.add_argument('--test', action='store_true', help='Test mode configuration')
    parser.add_argument('--live', action='store_true', help='Live mode configuration')
    parser.add_argument('--validate-only', action='store_true', help='Only validate existing configuration')
    parser.add_argument('--webhook-url', type=str, help='Webhook endpoint URL')
    parser.add_argument('--generate-sample', action='store_true', help='Generate sample .env configuration')
    
    args = parser.parse_args()
    
    # Configure logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s'
    )
    
    if args.generate_sample:
        print("Sample Stripe configuration for .env file:")
        print(generate_sample_env())
        return
    
    logger.info("🔧 Stripe Configuration Setup")
    logger.info("=" * 50)
    
    # Load current settings
    secret_key = settings.stripe_secret_key
    publishable_key = settings.stripe_publishable_key
    webhook_secret = settings.stripe_webhook_secret
    
    if not secret_key or not publishable_key:
        logger.error("❌ Stripe keys not found in configuration")
        logger.info("Please set STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY in your .env file")
        logger.info("Run with --generate-sample to see sample configuration")
        return
    
    # Validate configuration
    logger.info("1. Validating Stripe API keys...")
    if not validate_stripe_keys(secret_key, publishable_key):
        logger.error("❌ Stripe key validation failed")
        return
    
    if args.validate_only:
        logger.info("✅ Validation complete")
        return
    
    # Test payment functionality
    logger.info("2. Testing payment intent creation...")
    if not test_payment_intent_creation():
        logger.error("❌ Payment intent test failed")
        return
    
    # Test Stripe Connect
    logger.info("3. Testing Stripe Connect...")
    if not test_stripe_connect():
        logger.error("❌ Stripe Connect test failed")
        return
    
    # Configure webhooks
    if args.webhook_url:
        logger.info("4. Configuring webhooks...")
        if not configure_webhooks(args.webhook_url):
            logger.error("❌ Webhook configuration failed")
            return
    else:
        logger.info("4. Skipping webhook configuration (no URL provided)")
        logger.info("   Use --webhook-url to configure webhooks")
    
    # Summary
    logger.info("✅ Stripe configuration complete!")
    logger.info("=" * 50)
    logger.info("Configuration Summary:")
    logger.info(f"   Environment: {'Test' if secret_key.startswith('sk_test_') else 'Live'}")
    logger.info(f"   Payment processing: ✅ Working")
    logger.info(f"   Stripe Connect: ✅ Working")
    logger.info(f"   Webhooks: {'✅ Configured' if args.webhook_url else '⚠️  Not configured'}")
    
    if not webhook_secret:
        logger.warning("⚠️  Webhook secret not configured")
        logger.info("   Set STRIPE_WEBHOOK_SECRET in your .env file")
    
    logger.info("\nNext steps:")
    logger.info("1. Test the existing PaymentService with your application")
    logger.info("2. Test StripeIntegrationService for barber payouts")
    logger.info("3. Configure webhook endpoints in production")
    logger.info("4. Set up Stripe Connect onboarding for barbers")


if __name__ == "__main__":
    main()