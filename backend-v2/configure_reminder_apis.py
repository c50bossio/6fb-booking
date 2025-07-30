#!/usr/bin/env python3
"""
API Configuration Script for BookedBarber V2 Reminder System

This script helps configure third-party API keys for the reminder system:
- Twilio (SMS reminders)
- SendGrid (Email reminders) 
- Stripe (Billing for reminder plans)

Usage:
    python configure_reminder_apis.py --setup twilio
    python configure_reminder_apis.py --setup sendgrid
    python configure_reminder_apis.py --setup stripe
    python configure_reminder_apis.py --validate-all
"""

import os
import sys
import argparse
from pathlib import Path
import requests
from typing import Dict, Any

def load_env_file(filepath: str = ".env") -> Dict[str, str]:
    """Load environment variables from .env file"""
    env_vars = {}
    env_path = Path(filepath)
    
    if not env_path.exists():
        print(f"❌ Environment file {filepath} not found")
        return env_vars
    
    with open(env_path, 'r') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                env_vars[key] = value.strip('"')
    
    return env_vars

def update_env_file(filepath: str, updates: Dict[str, str]):
    """Update environment file with new values"""
    env_path = Path(filepath)
    lines = []
    
    if env_path.exists():
        with open(env_path, 'r') as f:
            lines = f.readlines()
    
    # Update existing values or add new ones
    updated_keys = set()
    for i, line in enumerate(lines):
        if '=' in line and not line.strip().startswith('#'):
            key = line.split('=')[0].strip()
            if key in updates:
                lines[i] = f'{key}="{updates[key]}"\n'
                updated_keys.add(key)
    
    # Add new keys that weren't found
    for key, value in updates.items():
        if key not in updated_keys:
            lines.append(f'{key}="{value}"\n')
    
    # Write back to file
    with open(env_path, 'w') as f:
        f.writelines(lines)
    
    print(f"✅ Updated {filepath} with {len(updates)} API configurations")

def validate_twilio(account_sid: str, auth_token: str, phone_number: str) -> bool:
    """Validate Twilio API credentials"""
    print("🔍 Validating Twilio credentials...")
    
    if not all([account_sid, auth_token, phone_number]):
        print("❌ Missing Twilio credentials")
        return False
    
    if account_sid.startswith("ACdev_") or auth_token.startswith("dev_"):
        print("⚠️ Using development placeholder credentials")
        return True
    
    try:
        # Simple validation - check if we can access the account
        import base64
        credentials = base64.b64encode(f"{account_sid}:{auth_token}".encode()).decode()
        
        response = requests.get(
            f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}.json",
            headers={"Authorization": f"Basic {credentials}"},
            timeout=10
        )
        
        if response.status_code == 200:
            print("✅ Twilio credentials validated successfully")
            return True
        else:
            print(f"❌ Twilio validation failed: {response.status_code}")
            return False
    
    except Exception as e:
        print(f"❌ Twilio validation error: {e}")
        return False

def validate_sendgrid(api_key: str) -> bool:
    """Validate SendGrid API key"""
    print("🔍 Validating SendGrid credentials...")
    
    if not api_key:
        print("❌ Missing SendGrid API key")
        return False
    
    if api_key.startswith("SG.dev_"):
        print("⚠️ Using development placeholder credentials")
        return True
    
    try:
        response = requests.get(
            "https://api.sendgrid.com/v3/user/profile",
            headers={"Authorization": f"Bearer {api_key}"},
            timeout=10
        )
        
        if response.status_code == 200:
            print("✅ SendGrid credentials validated successfully")
            return True
        else:
            print(f"❌ SendGrid validation failed: {response.status_code}")
            return False
    
    except Exception as e:
        print(f"❌ SendGrid validation error: {e}")
        return False

def validate_stripe(secret_key: str) -> bool:
    """Validate Stripe API key"""
    print("🔍 Validating Stripe credentials...")
    
    if not secret_key:
        print("❌ Missing Stripe secret key")
        return False
    
    if not secret_key.startswith("sk_"):
        print("❌ Invalid Stripe key format")
        return False
    
    try:
        response = requests.get(
            "https://api.stripe.com/v1/account",
            headers={"Authorization": f"Bearer {secret_key}"},
            timeout=10
        )
        
        if response.status_code == 200:
            print("✅ Stripe credentials validated successfully")
            return True
        else:
            print(f"❌ Stripe validation failed: {response.status_code}")
            return False
    
    except Exception as e:
        print(f"❌ Stripe validation error: {e}")
        return False

def setup_twilio():
    """Interactive Twilio setup"""
    print("🔧 Twilio SMS Setup")
    print("=" * 50)
    print("1. Go to https://console.twilio.com/")
    print("2. Sign up for free account (get $15 credit)")
    print("3. Get your Account SID and Auth Token")
    print("4. Purchase a phone number (~$1/month)")
    print()
    
    account_sid = input("Enter your Twilio Account SID: ").strip()
    auth_token = input("Enter your Twilio Auth Token: ").strip()
    phone_number = input("Enter your Twilio Phone Number (e.g., +1234567890): ").strip()
    
    if validate_twilio(account_sid, auth_token, phone_number):
        updates = {
            "TWILIO_ACCOUNT_SID": account_sid,
            "TWILIO_AUTH_TOKEN": auth_token,
            "TWILIO_PHONE_NUMBER": phone_number
        }
        update_env_file(".env", updates)
        print("✅ Twilio configuration saved!")
        return True
    else:
        print("❌ Twilio configuration failed")
        return False

def setup_sendgrid():
    """Interactive SendGrid setup"""
    print("🔧 SendGrid Email Setup")
    print("=" * 50)
    print("1. Go to https://sendgrid.com/")
    print("2. Sign up for free account (100 emails/day)")
    print("3. Create API key with full access")
    print("4. Verify your sending domain")
    print()
    
    api_key = input("Enter your SendGrid API Key: ").strip()
    from_email = input("Enter your FROM email address: ").strip()
    from_name = input("Enter your FROM name (default: BookedBarber): ").strip() or "BookedBarber"
    
    if validate_sendgrid(api_key):
        updates = {
            "SENDGRID_API_KEY": api_key,
            "SENDGRID_FROM_EMAIL": from_email,
            "SENDGRID_FROM_NAME": from_name
        }
        update_env_file(".env", updates)
        print("✅ SendGrid configuration saved!")
        return True
    else:
        print("❌ SendGrid configuration failed")
        return False

def setup_stripe():
    """Interactive Stripe setup"""
    print("🔧 Stripe Billing Setup")
    print("=" * 50)
    print("1. Go to https://dashboard.stripe.com/test/apikeys")
    print("2. Use existing account or create new one")
    print("3. Copy test keys for development")
    print("4. Set up webhook endpoint later")
    print()
    
    secret_key = input("Enter your Stripe Secret Key: ").strip()
    publishable_key = input("Enter your Stripe Publishable Key: ").strip()
    
    if validate_stripe(secret_key):
        updates = {
            "STRIPE_SECRET_KEY": secret_key,
            "STRIPE_PUBLISHABLE_KEY": publishable_key
        }
        update_env_file(".env", updates)
        print("✅ Stripe configuration saved!")
        return True
    else:
        print("❌ Stripe configuration failed")
        return False

def validate_all():
    """Validate all API configurations"""
    print("🔍 VALIDATING ALL API CONFIGURATIONS")
    print("=" * 50)
    
    env_vars = load_env_file(".env")
    
    results = {}
    
    # Validate Twilio
    results['twilio'] = validate_twilio(
        env_vars.get("TWILIO_ACCOUNT_SID", ""),
        env_vars.get("TWILIO_AUTH_TOKEN", ""),
        env_vars.get("TWILIO_PHONE_NUMBER", "")
    )
    
    # Validate SendGrid
    results['sendgrid'] = validate_sendgrid(
        env_vars.get("SENDGRID_API_KEY", "")
    )
    
    # Validate Stripe
    results['stripe'] = validate_stripe(
        env_vars.get("STRIPE_SECRET_KEY", "")
    )
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 VALIDATION SUMMARY")
    print("=" * 50)
    
    total = len(results)
    passed = sum(1 for r in results.values() if r)
    
    for service, status in results.items():
        icon = "✅" if status else "❌"
        print(f"{icon} {service.upper()}: {'READY' if status else 'NOT CONFIGURED'}")
    
    print(f"\n📈 Overall Status: {passed}/{total} services ready")
    
    if passed == total:
        print("🎉 ALL SERVICES CONFIGURED!")
        print("🚀 Reminder system ready for testing!")
        return True
    else:
        print("⚠️ Some services need configuration")
        print("💡 Run with --setup <service> to configure missing services")
        return False

def quick_setup():
    """Quick setup with test/mock configurations"""
    print("🚀 QUICK SETUP - TEST/MOCK MODE")
    print("=" * 50)
    print("Setting up reminder system with test/mock configurations...")
    print("This allows you to test the system without real API keys.")
    print()
    
    updates = {
        # Twilio test configuration
        "TWILIO_ACCOUNT_SID": "ACtest_development_mode_sid",
        "TWILIO_AUTH_TOKEN": "test_development_mode_token",
        "TWILIO_PHONE_NUMBER": "+18135483884",
        
        # SendGrid test configuration
        "SENDGRID_API_KEY": "SG.test_development_mode_key",
        "SENDGRID_FROM_EMAIL": "noreply@bookedbarber.local",
        "SENDGRID_FROM_NAME": "BookedBarber",
        
        # Stripe test configuration (using existing test keys)
        "STRIPE_SECRET_KEY": os.getenv("STRIPE_SECRET_KEY", ""),
        "STRIPE_PUBLISHABLE_KEY": os.getenv("STRIPE_PUBLISHABLE_KEY", "")
    }
    
    update_env_file(".env", updates)
    
    print("✅ Test/mock configuration complete!")
    print("📝 The system will log messages instead of sending real SMS/emails")
    print("💳 Stripe billing will work in test mode")
    print("🧪 Perfect for development and testing!")
    
    return True

def main():
    parser = argparse.ArgumentParser(description="Configure BookedBarber V2 Reminder APIs")
    parser.add_argument("--setup", choices=["twilio", "sendgrid", "stripe"], 
                       help="Setup specific service")
    parser.add_argument("--validate-all", action="store_true",
                       help="Validate all API configurations") 
    parser.add_argument("--quick-setup", action="store_true",
                       help="Quick setup with test/mock configurations")
    
    args = parser.parse_args()
    
    if args.setup == "twilio":
        return setup_twilio()
    elif args.setup == "sendgrid":
        return setup_sendgrid()
    elif args.setup == "stripe":
        return setup_stripe()
    elif args.validate_all:
        return validate_all()
    elif args.quick_setup:
        return quick_setup()
    else:
        print("📋 BookedBarber V2 Reminder System API Configuration")
        print("=" * 60)
        print()
        print("🎯 RECOMMENDED: Quick setup for immediate testing")
        print("   python configure_reminder_apis.py --quick-setup")
        print()
        print("🔧 Individual service setup:")
        print("   python configure_reminder_apis.py --setup twilio")
        print("   python configure_reminder_apis.py --setup sendgrid") 
        print("   python configure_reminder_apis.py --setup stripe")
        print()
        print("✅ Validate all configurations:")
        print("   python configure_reminder_apis.py --validate-all")
        print()
        print("📖 For detailed setup instructions, see: QUICK_API_SETUP.md")
        return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)