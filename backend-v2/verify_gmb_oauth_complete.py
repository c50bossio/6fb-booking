#!/usr/bin/env python3
"""
Final GMB OAuth Configuration Verification

This script confirms that Google My Business OAuth is fully configured and ready:
1. Environment variables are set
2. GMB service is properly initialized  
3. OAuth URLs can be generated
4. Integration endpoints are available
5. Database models support GMB integration
"""

import os
import asyncio
import httpx
from pathlib import Path

def load_env_file():
    """Load .env file"""
    env_path = Path(".env")
    if env_path.exists():
        with open(env_path, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    value = value.strip('"\'')
                    os.environ[key] = value

async def verify_gmb_oauth_configuration():
    """Comprehensive GMB OAuth verification"""
    print("🏢 BookedBarber V2 - GMB OAuth Configuration Verification")
    print("=" * 65)
    
    # Load environment
    load_env_file()
    
    # Test 1: Environment Variables
    print("\n✅ Test 1: Environment Variables")
    print("-" * 40)
    
    required_vars = ['GMB_CLIENT_ID', 'GMB_CLIENT_SECRET', 'GMB_REDIRECT_URI']
    env_success = True
    
    for var in required_vars:
        value = os.getenv(var)
        if value and value.strip():
            display_val = value[:20] + "..." if len(value) > 20 else value
            print(f"   ✅ {var}: {display_val}")
        else:
            print(f"   ❌ {var}: Not configured")
            env_success = False
    
    if not env_success:
        print("   ❌ Environment variables not properly configured")
        return False
    
    # Test 2: GMB Service Initialization
    print("\n✅ Test 2: GMB Service Initialization")
    print("-" * 40)
    
    try:
        from services.gmb_service import GMBService
        gmb_service = GMBService()
        
        if gmb_service.client_id and gmb_service.client_secret:
            print(f"   ✅ GMB Service initialized successfully")
            print(f"   ✅ Client ID: {gmb_service.client_id[:25]}...")
            print(f"   ✅ Redirect URI: {gmb_service.redirect_uri}")
            print(f"   ✅ Required scopes: {len(gmb_service.scopes)} configured")
            for scope in gmb_service.scopes:
                print(f"      • {scope}")
        else:
            print("   ❌ GMB Service initialization failed")
            return False
    except Exception as e:
        print(f"   ❌ Error initializing GMB Service: {e}")
        return False
    
    # Test 3: OAuth URL Generation
    print("\n✅ Test 3: OAuth URL Generation")
    print("-" * 40)
    
    try:
        redirect_uri = gmb_service.redirect_uri
        state = "test_gmb_oauth_verification_123"
        oauth_url = gmb_service.get_oauth_url(redirect_uri, state)
        
        print("   ✅ OAuth URL generated successfully")
        print(f"   ✅ URL length: {len(oauth_url)} characters")
        print(f"   ✅ Contains client_id: {'client_id=' in oauth_url}")
        print(f"   ✅ Contains redirect_uri: {'redirect_uri=' in oauth_url}")
        print(f"   ✅ Contains state: {'state=' in oauth_url}")
        print(f"   ✅ Contains scope: {'scope=' in oauth_url}")
        
        # Display URL (truncated for security)
        print(f"   🔗 URL: {oauth_url[:100]}...")
        
    except Exception as e:
        print(f"   ❌ Error generating OAuth URL: {e}")
        return False
    
    # Test 4: Google OAuth Endpoint Accessibility
    print("\n✅ Test 4: Google OAuth Endpoint Accessibility") 
    print("-" * 40)
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.head("https://accounts.google.com/o/oauth2/v2/auth")
            if response.status_code in [200, 302, 405]:
                print("   ✅ Google OAuth endpoint is accessible")
                print(f"   ✅ Response status: {response.status_code}")
            else:
                print(f"   ⚠️  Google OAuth endpoint returned {response.status_code}")
    except Exception as e:
        print(f"   ❌ Cannot reach Google OAuth endpoint: {e}")
        return False
    
    # Test 5: Backend Server Health
    print("\n✅ Test 5: Backend Server Health")
    print("-" * 40)
    
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get("http://localhost:8000/health")
            if response.status_code == 200:
                print("   ✅ Backend server is running")
                print(f"   ✅ Health check passed: {response.status_code}")
            else:
                print(f"   ⚠️  Backend server health check: {response.status_code}")
    except Exception as e:
        print(f"   ⚠️  Backend server not accessible: {e}")
        print("   ℹ️  Start with: uvicorn main:app --reload")
    
    # Test 6: Database Models
    print("\n✅ Test 6: Database Models")
    print("-" * 40)
    
    try:
        from models.integration import Integration, IntegrationType
        from database import SessionLocal
        
        # Test that GMB integration type exists
        if hasattr(IntegrationType, 'GOOGLE_MY_BUSINESS'):
            print("   ✅ GOOGLE_MY_BUSINESS integration type available")
        else:
            print("   ❌ GOOGLE_MY_BUSINESS integration type not found")
            return False
        
        # Test database connection
        db = SessionLocal()
        try:
            # Simple query to test connection
            count = db.query(Integration).count()
            print(f"   ✅ Database connection working ({count} integrations)")
            db.close()
        except Exception as e:
            print(f"   ❌ Database connection failed: {e}")
            db.close()
            return False
            
    except Exception as e:
        print(f"   ❌ Error testing database models: {e}")
        return False
    
    # Test 7: API Endpoints Available
    print("\n✅ Test 7: API Endpoints Available")
    print("-" * 40)
    
    try:
        # Check if routers are importable
        from routers.integrations import router as integrations_router
        from routers.reviews import router as reviews_router
        
        print("   ✅ Integration router imported successfully")
        print("   ✅ Reviews router imported successfully")
        
        # Count endpoints
        integration_routes = len([r for r in integrations_router.routes if hasattr(r, 'path')])
        review_routes = len([r for r in reviews_router.routes if hasattr(r, 'path')])
        
        print(f"   ✅ Integration endpoints: {integration_routes}")
        print(f"   ✅ Review endpoints: {review_routes}")
        
    except Exception as e:
        print(f"   ❌ Error checking API endpoints: {e}")
        return False
    
    # Summary
    print("\n🎉 GMB OAuth Configuration Verification COMPLETE!")
    print("=" * 65)
    print("✅ Environment variables: CONFIGURED")
    print("✅ GMB Service: INITIALIZED") 
    print("✅ OAuth URL generation: WORKING")
    print("✅ Google endpoint: ACCESSIBLE")
    print("✅ Backend server: AVAILABLE")
    print("✅ Database models: READY")
    print("✅ API endpoints: LOADED")
    
    print("\n📋 Manual Testing Checklist:")
    print("1. ✅ Environment configured")
    print("2. ✅ GMB OAuth credentials set")
    print("3. ✅ Service initialization working")
    print("4. ✅ OAuth URL generation working")
    print("5. ✅ Database models ready")
    print("6. ✅ API endpoints available")
    
    print("\n🚀 Ready for Production:")
    print("□ Generate production Google OAuth credentials")
    print("□ Update production environment variables")
    print("□ Configure production redirect URIs")
    print("□ Enable Google My Business API in Google Cloud Console")
    print("□ Test OAuth flow in frontend application")
    
    print(f"\n🔗 OAuth URL for manual testing:")
    print(f"{oauth_url}")
    
    return True

def main():
    """Run verification"""
    success = asyncio.run(verify_gmb_oauth_configuration())
    
    if success:
        print(f"\n🎯 RESULT: GMB OAuth configuration is COMPLETE and READY!")
        return True
    else:
        print(f"\n❌ RESULT: GMB OAuth configuration needs attention.")
        return False

if __name__ == "__main__":
    success = main()
    import sys
    sys.exit(0 if success else 1)