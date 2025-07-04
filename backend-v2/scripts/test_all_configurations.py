#!/usr/bin/env python3
"""
Quick Configuration Test Script
Test all service configurations with existing implementations

This script provides a simple way to test all external service integrations
using the existing service classes and verify they're working properly.

Usage:
    python scripts/test_all_configurations.py
"""

import os
import sys
import logging
from pathlib import Path
from datetime import datetime

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from config import settings
from database import get_db
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


def test_stripe_integration():
    """Test Stripe payment integration."""
    print("🔷 Testing Stripe Integration...")
    
    try:
        # Test Stripe settings
        if not settings.stripe_secret_key:
            print("   ❌ STRIPE_SECRET_KEY not configured")
            return False
        
        # Test PaymentService
        from services.payment_service import PaymentService
        print("   ✅ PaymentService imported successfully")
        
        # Test StripeIntegrationService
        from services.stripe_integration_service import StripeIntegrationService
        print("   ✅ StripeIntegrationService imported successfully")
        
        # Test Stripe API connection
        import stripe
        stripe.api_key = settings.stripe_secret_key
        account = stripe.Account.retrieve()
        print(f"   ✅ Stripe API connected (Account: {account.id})")
        
        return True
        
    except Exception as e:
        print(f"   ❌ Stripe test failed: {str(e)}")
        return False


def test_sendgrid_integration():
    """Test SendGrid email integration."""
    print("\n📧 Testing SendGrid Integration...")
    
    try:
        # Test SendGrid settings
        if not settings.sendgrid_api_key:
            print("   ❌ SENDGRID_API_KEY not configured")
            return False
        
        # Test NotificationService
        from services.notification_service import NotificationService
        notification_service = NotificationService()
        
        if notification_service.sendgrid_client:
            print("   ✅ NotificationService SendGrid client initialized")
        else:
            print("   ❌ NotificationService SendGrid client not initialized")
            return False
        
        # Test SendGrid API connection
        from sendgrid import SendGridAPIClient
        sg = SendGridAPIClient(settings.sendgrid_api_key)
        response = sg.client.user.get()
        
        if response.status_code == 200:
            print("   ✅ SendGrid API connected successfully")
            return True
        else:
            print(f"   ❌ SendGrid API connection failed: {response.status_code}")
            return False
        
    except Exception as e:
        print(f"   ❌ SendGrid test failed: {str(e)}")
        return False


def test_twilio_integration():
    """Test Twilio SMS integration."""
    print("\n📱 Testing Twilio Integration...")
    
    try:
        # Test Twilio settings
        if not settings.twilio_account_sid:
            print("   ❌ TWILIO_ACCOUNT_SID not configured")
            return False
        
        if not settings.twilio_auth_token:
            print("   ❌ TWILIO_AUTH_TOKEN not configured")
            return False
        
        # Test NotificationService
        from services.notification_service import NotificationService
        notification_service = NotificationService()
        
        if notification_service.twilio_client:
            print("   ✅ NotificationService Twilio client initialized")
        else:
            print("   ❌ NotificationService Twilio client not initialized")
            return False
        
        # Test Twilio API connection
        from twilio.rest import Client as TwilioClient
        client = TwilioClient(settings.twilio_account_sid, settings.twilio_auth_token)
        account = client.api.accounts(settings.twilio_account_sid).fetch()
        print(f"   ✅ Twilio API connected (Account: {account.friendly_name})")
        
        return True
        
    except Exception as e:
        print(f"   ❌ Twilio test failed: {str(e)}")
        return False


def test_google_calendar_integration():
    """Test Google Calendar integration."""
    print("\n📅 Testing Google Calendar Integration...")
    
    try:
        # Test Google Calendar settings
        if not settings.google_client_id:
            print("   ❌ GOOGLE_CLIENT_ID not configured")
            return False
        
        if not settings.google_client_secret:
            print("   ❌ GOOGLE_CLIENT_SECRET not configured")
            return False
        
        # Test GoogleCalendarService
        from services.google_calendar_service import GoogleCalendarService
        db = next(get_db())
        calendar_service = GoogleCalendarService(db)
        print("   ✅ GoogleCalendarService initialized successfully")
        
        # Check user integrations
        from models import User
        users_with_calendar = db.query(User).filter(User.google_calendar_credentials.isnot(None)).count()
        total_users = db.query(User).count()
        
        print(f"   ℹ️  Users with calendar integration: {users_with_calendar}/{total_users}")
        
        return True
        
    except Exception as e:
        print(f"   ❌ Google Calendar test failed: {str(e)}")
        return False


def test_database_connection():
    """Test database connection."""
    print("\n🗄️  Testing Database Connection...")
    
    try:
        db = next(get_db())
        
        # Test basic query
        from models import User
        user_count = db.query(User).count()
        print(f"   ✅ Database connected (Users: {user_count})")
        
        return True
        
    except Exception as e:
        print(f"   ❌ Database test failed: {str(e)}")
        return False


def main():
    """Run all configuration tests."""
    print("🧪 BookedBarber V2 - Service Configuration Tests")
    print("=" * 60)
    print(f"Environment: {settings.environment}")
    print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)
    
    # Configure logging
    logging.basicConfig(level=logging.WARNING)  # Suppress verbose logs
    
    tests = [
        ("Database", test_database_connection),
        ("Stripe", test_stripe_integration),
        ("SendGrid", test_sendgrid_integration),
        ("Twilio", test_twilio_integration),
        ("Google Calendar", test_google_calendar_integration),
    ]
    
    results = {}
    
    for test_name, test_func in tests:
        try:
            results[test_name] = test_func()
        except Exception as e:
            print(f"\n❌ {test_name} test crashed: {str(e)}")
            results[test_name] = False
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 TEST RESULTS SUMMARY")
    print("=" * 60)
    
    passed = sum(1 for result in results.values() if result)
    total = len(results)
    
    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{test_name:20} {status}")
    
    print("-" * 60)
    print(f"Overall: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All services configured and working!")
    elif passed >= total * 0.7:
        print("⚠️  Most services working, check failed services")
    else:
        print("❌ Multiple service issues - review configuration")
    
    print("\n💡 NEXT STEPS:")
    
    if not results.get("Stripe", False):
        print("• Configure Stripe: python scripts/configure_stripe.py --validate")
    
    if not results.get("SendGrid", False):
        print("• Configure SendGrid: python scripts/configure_sendgrid.py --validate")
    
    if not results.get("Twilio", False):
        print("• Configure Twilio: python scripts/configure_twilio.py --validate")
    
    if not results.get("Google Calendar", False):
        print("• Configure Google Calendar: python scripts/configure_google_calendar.py --setup")
    
    print("• Full validation: python scripts/validate_all_services.py --full")
    print("• Configuration guide: SERVICE_CONFIGURATION_GUIDE.md")
    
    print("=" * 60)
    
    # Exit with appropriate code
    if passed == total:
        sys.exit(0)
    elif passed >= total * 0.7:
        sys.exit(1)
    else:
        sys.exit(2)


if __name__ == "__main__":
    main()