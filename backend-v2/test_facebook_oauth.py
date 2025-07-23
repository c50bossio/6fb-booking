#!/usr/bin/env python3
"""
Test Facebook OAuth configuration
"""

import os
from dotenv import load_dotenv

# Load .env file
load_dotenv()

print("🔍 Facebook OAuth Configuration Check:")
print(f"FACEBOOK_APP_ID: {os.getenv('FACEBOOK_APP_ID', 'NOT_SET')}")

# Check if it's real credentials or placeholder
app_id = os.getenv('FACEBOOK_APP_ID', '')
if app_id and not app_id.startswith('your_'):
    print("✅ Facebook App ID appears to be real!")
    
    # Test if we can create a valid Facebook OAuth URL
    try:
        from services.oauth_service import validate_oauth_config
        config_status = validate_oauth_config()
        print(f"Facebook OAuth Status: {'✅ Configured' if config_status.get('facebook') else '❌ Not configured'}")
        
        if config_status.get('facebook'):
            print("\n🎉 Facebook OAuth is ready to use!")
            print("You can now:")
            print("1. Test Facebook login on http://localhost:8001")
            print("2. Use Facebook OAuth in your app")
            print("3. Access /api/v1/oauth/initiate/facebook endpoint")
        
    except Exception as e:
        print(f"❌ Error testing Facebook OAuth: {e}")
        
else:
    print("❌ Facebook OAuth still uses placeholder credentials")
    print("\n📋 To complete setup:")
    print("1. Go to https://developers.facebook.com")
    print("2. Create a new app")
    print("3. Add Facebook Login product")
    print("4. Copy App ID and App Secret to .env file")
    print(f"5. Replace: FACEBOOK_APP_ID={app_id}")

print("\n🔗 Test URL: http://localhost:8001/api/v1/oauth/providers")