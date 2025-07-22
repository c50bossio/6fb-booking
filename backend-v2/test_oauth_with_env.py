#!/usr/bin/env python3
"""
Test OAuth with environment variables loaded
"""

import os
from dotenv import load_dotenv

# Load .env file
load_dotenv()

print("🔍 Environment Variables After Loading .env:")
print(f"GOOGLE_CLIENT_ID: {os.getenv('GOOGLE_CLIENT_ID', 'NOT_SET')}")
print(f"GOOGLE_CLIENT_SECRET: {os.getenv('GOOGLE_CLIENT_SECRET', 'NOT_SET')[:20]}..." if os.getenv('GOOGLE_CLIENT_SECRET') else "NOT_SET")
print(f"FACEBOOK_APP_ID: {os.getenv('FACEBOOK_APP_ID', 'NOT_SET')}")
print(f"FACEBOOK_APP_SECRET: {os.getenv('FACEBOOK_APP_SECRET', 'NOT_SET')[:10]}..." if os.getenv('FACEBOOK_APP_SECRET') else "NOT_SET")

print("\n🧪 Testing OAuth Configuration:")

try:
    from services.oauth_service import validate_oauth_config, OAuthService
    from database import get_db
    
    # Test validation
    config_status = validate_oauth_config()
    print(f"OAuth Config Status: {config_status}")
    
    # Test OAuth service initialization
    db = next(get_db())
    oauth_service = OAuthService(db)
    
    print(f"Configured providers: {len(oauth_service.providers)}")
    for provider_name, provider in oauth_service.providers.items():
        print(f"  ✅ {provider_name}: {provider.client_id[:20]}...")
    
    if oauth_service.providers:
        print("\n🎉 OAuth is working with real credentials!")
        
        # Test OAuth flow initiation
        if 'google' in oauth_service.providers:
            print("\n🔗 Testing Google OAuth initiation:")
            try:
                import asyncio
                result = asyncio.run(oauth_service.initiate_oauth('google'))
                print(f"  Authorization URL: {result['authorization_url'][:80]}...")
                print(f"  State: {result['state'][:20]}...")
                print("  ✅ Google OAuth flow can be initiated!")
            except Exception as e:
                print(f"  ❌ Error: {e}")
    else:
        print("\n⚠️  No OAuth providers configured")
        
except Exception as e:
    print(f"❌ Error testing OAuth: {e}")

print("\n🚀 OAuth Test Complete!")