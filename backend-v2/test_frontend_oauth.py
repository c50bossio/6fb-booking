#!/usr/bin/env python3
"""
Test OAuth functionality for frontend integration
"""

import asyncio
import json
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

async def test_frontend_oauth():
    print("🌐 Testing OAuth Integration for Frontend (localhost:3000)")
    print("=" * 60)
    
    # Direct test of OAuth service functionality
    try:
        from services.oauth_service import OAuthService, validate_oauth_config
        from database import get_db
        
        # Test OAuth configuration
        config_status = validate_oauth_config()
        print(f"✅ OAuth Config Status: {config_status}")
        
        if config_status.get('google') and config_status.get('facebook'):
            print("✅ Both Google and Facebook OAuth are configured")
            
            # Test OAuth service
            db = next(get_db())
            oauth_service = OAuthService(db)
            
            # Test Google OAuth initiation
            print("\n🔍 Testing Google OAuth Flow:")
            google_result = await oauth_service.initiate_oauth('google')
            print(f"  ✅ Google Authorization URL: {google_result['authorization_url'][:80]}...")
            print(f"  ✅ State: {google_result['state'][:20]}...")
            
            # Test Facebook OAuth initiation  
            print("\n🔍 Testing Facebook OAuth Flow:")
            facebook_result = await oauth_service.initiate_oauth('facebook')
            print(f"  ✅ Facebook Authorization URL: {facebook_result['authorization_url'][:80]}...")
            print(f"  ✅ State: {facebook_result['state'][:20]}...")
            
            print("\n🎉 OAuth Integration Ready for Frontend!")
            print("📋 Frontend Integration Instructions:")
            print("1. Visit: http://localhost:3000/login")
            print("2. Click 'Continue with Google' or 'Continue with Facebook'")
            print("3. You'll be redirected to the provider for authentication")
            print("4. After authentication, you'll return to the app")
            
            print("\n🔗 Ready URLs:")
            print("• Google OAuth URL: Generated dynamically when button is clicked")
            print("• Facebook OAuth URL: Generated dynamically when button is clicked")
            print("• Frontend Login: http://localhost:3000/login")
            print("• Frontend Register: http://localhost:3000/register")
            
        else:
            print(f"❌ OAuth not fully configured: {config_status}")
            
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_frontend_oauth())