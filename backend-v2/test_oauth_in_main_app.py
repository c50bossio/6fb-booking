#!/usr/bin/env python3
"""
Test OAuth Configuration in Main App Context
"""

import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

print("🧪 Testing OAuth Configuration in Main App Context")
print("=" * 60)

# Test environment variables
print(f"GOOGLE_CLIENT_ID: {os.getenv('GOOGLE_CLIENT_ID', 'NOT_SET')}")
print(f"FACEBOOK_APP_ID: {os.getenv('FACEBOOK_APP_ID', 'NOT_SET')}")

# Test OAuth service validation
try:
    from services.oauth_service import validate_oauth_config
    
    config_status = validate_oauth_config()
    print(f"\nOAuth Service Validation: {config_status}")
    
    # Check if validation logic is correct
    google_configured = bool(os.getenv('GOOGLE_CLIENT_ID') and os.getenv('GOOGLE_CLIENT_SECRET'))
    facebook_configured = bool(os.getenv('FACEBOOK_APP_ID') and os.getenv('FACEBOOK_APP_SECRET'))
    
    print(f"Direct Google Check: {google_configured}")
    print(f"Direct Facebook Check: {facebook_configured}")
    
    # Test OAuth service initialization
    try:
        from database import get_db
        from services.oauth_service import OAuthService
        
        db = next(get_db())
        oauth_service = OAuthService(db)
        
        print(f"\nOAuth Service Providers: {len(oauth_service.providers)}")
        for name, provider in oauth_service.providers.items():
            print(f"  {name}: client_id={provider.client_id[:20]}...")
            
    except Exception as e:
        print(f"OAuth Service Error: {e}")
        
except Exception as e:
    print(f"Import Error: {e}")

print("\n" + "=" * 60)