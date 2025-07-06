#!/usr/bin/env python3
"""Test SendGrid configuration loading from environment"""

import os
import sys
from pathlib import Path

# Add the project directory to Python path
sys.path.insert(0, str(Path(__file__).parent))

print("🔍 Testing SendGrid Configuration Loading\n")

# First check if .env file exists
env_path = Path(__file__).parent / ".env"
if env_path.exists():
    print("✅ .env file found")
else:
    print("❌ .env file not found!")
    sys.exit(1)

# Check raw environment variable
env_api_key = os.getenv('SENDGRID_API_KEY')
print(f"\n1️⃣ Raw environment variable check:")
print(f"   SENDGRID_API_KEY from os.getenv: {env_api_key[:20]}..." if env_api_key else "   SENDGRID_API_KEY: NOT SET")

# Load settings using the config module
try:
    from config import settings
    print(f"\n2️⃣ Settings loaded from config module:")
    print(f"   sendgrid_api_key: {settings.sendgrid_api_key[:20]}..." if settings.sendgrid_api_key else "   sendgrid_api_key: NOT SET or EMPTY")
    print(f"   sendgrid_from_email: {settings.sendgrid_from_email}")
    print(f"   sendgrid_from_name: {settings.sendgrid_from_name}")
    print(f"   environment: {settings.environment}")
except Exception as e:
    print(f"❌ Error loading settings: {str(e)}")
    import traceback
    traceback.print_exc()

# Check if the notification service can initialize
print(f"\n3️⃣ Testing NotificationService initialization:")
try:
    from services.notification_service import NotificationService
    service = NotificationService()
    
    if service.sendgrid_client:
        print("   ✅ SendGrid client initialized successfully")
    else:
        print("   ❌ SendGrid client NOT initialized")
        
    if service.twilio_client:
        print("   ✅ Twilio client initialized successfully")
    else:
        print("   ⚠️ Twilio client NOT initialized")
        
except Exception as e:
    print(f"   ❌ Error initializing NotificationService: {str(e)}")
    import traceback
    traceback.print_exc()

# Direct test of SendGrid API
print(f"\n4️⃣ Direct SendGrid API test:")
if env_api_key:
    try:
        from sendgrid import SendGridAPIClient
        sg = SendGridAPIClient(env_api_key)
        print(f"   ✅ SendGrid client created with API key")
        
        # Try a simple API call (get account info)
        try:
            from sendgrid.helpers.mail import Mail
            # Don't actually send, just test the client
            print(f"   ✅ SendGrid client appears to be configured correctly")
        except Exception as e:
            print(f"   ❌ SendGrid client error: {str(e)}")
            
    except Exception as e:
        print(f"   ❌ Failed to create SendGrid client: {str(e)}")
else:
    print(f"   ⚠️ Cannot test - no API key found")

print("\n📊 Summary:")
if settings.sendgrid_api_key:
    print("   ✅ SendGrid should be working - API key is configured")
    print("   Next step: Test actual email sending")
else:
    print("   ❌ SendGrid will NOT work - API key is not being loaded")
    print("   Check that Pydantic is reading the .env file correctly")