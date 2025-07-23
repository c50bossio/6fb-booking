#!/usr/bin/env python3
"""
OAuth Configuration Test Script

Tests OAuth credentials and endpoints for:
- Google My Business (GMB)  
- Meta Business (Facebook)

This script verifies OAuth configuration without requiring browser interaction.
"""

import os
import sys
import asyncio
import httpx
from pathlib import Path
from urllib.parse import urlencode
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class OAuthConfigurationTest:
    """Test OAuth configuration for marketing integrations"""
    
    def __init__(self):
        self.load_environment()
        
    def load_environment(self):
        """Load environment variables"""
        # Check for .env file
        env_path = Path(".env")
        if env_path.exists():
            logger.info("✅ Found .env file")
            # Load environment variables from .env
            with open(env_path, 'r') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#') and '=' in line:
                        key, value = line.split('=', 1)
                        # Remove quotes if present
                        value = value.strip('"\'')
                        os.environ[key] = value
        else:
            logger.warning("⚠️  No .env file found")
    
    def test_gmb_configuration(self):
        """Test Google My Business OAuth configuration"""
        print("\n🏢 Google My Business OAuth Configuration")
        print("=" * 50)
        
        client_id = os.getenv("GMB_CLIENT_ID") or os.getenv("GOOGLE_CLIENT_ID")
        client_secret = os.getenv("GMB_CLIENT_SECRET") or os.getenv("GOOGLE_CLIENT_SECRET")
        redirect_uri = os.getenv("GMB_REDIRECT_URI", "http://localhost:8000/api/v1/integrations/gmb/callback")
        
        # Check credentials
        if not client_id:
            print("❌ GMB_CLIENT_ID not found")
            return False
        elif client_id and client_id != "":
            print(f"✅ Client ID configured: {client_id[:20]}...")
        
        if not client_secret:
            print("❌ GMB_CLIENT_SECRET not found")  
            return False
        elif client_secret and client_secret != "":
            print(f"✅ Client Secret configured: {client_secret[:10]}...")
            
        print(f"✅ Redirect URI: {redirect_uri}")
        
        # Generate OAuth URL
        oauth_url = self.generate_gmb_oauth_url(client_id, redirect_uri)
        print(f"✅ OAuth URL generated successfully")
        print(f"   URL: {oauth_url[:100]}...")
        
        # Test OAuth endpoint connectivity
        success = asyncio.run(self.test_oauth_endpoint("https://accounts.google.com/o/oauth2/v2/auth"))
        if success:
            print("✅ Google OAuth endpoint is accessible")
        else:
            print("❌ Google OAuth endpoint not accessible")
            
        return True
    
    def test_meta_configuration(self):
        """Test Meta Business OAuth configuration"""
        print("\n📘 Meta Business OAuth Configuration")
        print("=" * 50)
        
        client_id = os.getenv("META_CLIENT_ID")
        client_secret = os.getenv("META_CLIENT_SECRET")
        redirect_uri = os.getenv("META_REDIRECT_URI", "http://localhost:8000/api/v1/integrations/meta/callback")
        
        # Check credentials
        if not client_id:
            print("❌ META_CLIENT_ID not found")
            return False
        elif client_id and client_id != "":
            print(f"✅ Client ID configured: {client_id}")
        
        if not client_secret:
            print("❌ META_CLIENT_SECRET not found")  
            return False
        elif client_secret and client_secret != "":
            print(f"✅ Client Secret configured: {client_secret[:10]}...")
            
        print(f"✅ Redirect URI: {redirect_uri}")
        
        # Generate OAuth URL
        oauth_url = self.generate_meta_oauth_url(client_id, redirect_uri)
        print(f"✅ OAuth URL generated successfully")
        print(f"   URL: {oauth_url[:100]}...")
        
        # Test OAuth endpoint connectivity
        success = asyncio.run(self.test_oauth_endpoint("https://www.facebook.com/v18.0/dialog/oauth"))
        if success:
            print("✅ Meta OAuth endpoint is accessible")
        else:
            print("❌ Meta OAuth endpoint not accessible")
            
        return True
    
    def generate_gmb_oauth_url(self, client_id: str, redirect_uri: str) -> str:
        """Generate GMB OAuth authorization URL"""
        params = {
            'client_id': client_id,
            'redirect_uri': redirect_uri,
            'scope': 'https://www.googleapis.com/auth/business.manage',
            'response_type': 'code',
            'access_type': 'offline',
            'prompt': 'consent',
            'state': 'gmb_oauth_test'
        }
        
        return f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"
    
    def generate_meta_oauth_url(self, client_id: str, redirect_uri: str) -> str:
        """Generate Meta OAuth authorization URL"""
        params = {
            'client_id': client_id,
            'redirect_uri': redirect_uri,
            'scope': 'pages_manage_posts,pages_read_engagement,business_management',
            'response_type': 'code',
            'state': 'meta_oauth_test'
        }
        
        return f"https://www.facebook.com/v18.0/dialog/oauth?{urlencode(params)}"
    
    async def test_oauth_endpoint(self, url: str) -> bool:
        """Test if OAuth endpoint is accessible"""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.head(url)
                return response.status_code in [200, 302, 405]  # 405 is OK for HEAD on OAuth endpoints
        except Exception as e:
            logger.error(f"Error testing endpoint {url}: {e}")
            return False
    
    def test_integration_endpoints(self):
        """Test if integration API endpoints are properly configured"""
        print("\n🔌 Integration API Endpoints")
        print("=" * 50)
        
        # Check if integration routes are imported
        try:
            from routers.integrations import router as integrations_router
            print("✅ Integration router imported successfully")
            
            # List available endpoints
            endpoints = []
            for route in integrations_router.routes:
                if hasattr(route, 'path'):
                    endpoints.append(f"{route.methods} {route.path}")
            
            print(f"✅ Found {len(endpoints)} integration endpoints:")
            for endpoint in endpoints[:5]:  # Show first 5
                print(f"   • {endpoint}")
            if len(endpoints) > 5:
                print(f"   ... and {len(endpoints) - 5} more")
                
        except ImportError as e:
            print(f"❌ Could not import integration router: {e}")
            return False
            
        return True
    
    def test_environment_variables(self):
        """Test all required environment variables"""
        print("\n🔧 Environment Variables Check")  
        print("=" * 50)
        
        required_vars = [
            'GMB_CLIENT_ID',
            'GMB_CLIENT_SECRET', 
            'GMB_REDIRECT_URI',
            'META_CLIENT_ID',
            'META_CLIENT_SECRET',
            'META_REDIRECT_URI'
        ]
        
        optional_vars = [
            'GOOGLE_CLIENT_ID',  # Fallback for GMB
            'GOOGLE_CLIENT_SECRET',  # Fallback for GMB
            'REVIEW_RESPONSE_TEMPLATE_POSITIVE',
            'REVIEW_RESPONSE_TEMPLATE_NEUTRAL',
            'REVIEW_RESPONSE_TEMPLATE_NEGATIVE'
        ]
        
        missing_required = []
        
        for var in required_vars:
            value = os.getenv(var)
            if value and value.strip():
                print(f"✅ {var}: configured")
            else:
                print(f"❌ {var}: missing or empty")
                missing_required.append(var)
        
        print(f"\n📋 Optional Variables:")
        for var in optional_vars:
            value = os.getenv(var)
            if value and value.strip():
                print(f"✅ {var}: configured")
            else:
                print(f"⚠️  {var}: not configured (optional)")
        
        if missing_required:
            print(f"\n❌ Missing required variables: {', '.join(missing_required)}")
            return False
        else:
            print(f"\n✅ All required environment variables configured!")
            return True
    
    def generate_oauth_test_urls(self):
        """Generate OAuth test URLs for manual testing"""
        print("\n🌐 OAuth Test URLs")
        print("=" * 50)
        
        # GMB OAuth URL
        gmb_client_id = os.getenv("GMB_CLIENT_ID") or os.getenv("GOOGLE_CLIENT_ID")
        gmb_redirect_uri = os.getenv("GMB_REDIRECT_URI", "http://localhost:8000/api/v1/integrations/gmb/callback")
        
        if gmb_client_id:
            gmb_url = self.generate_gmb_oauth_url(gmb_client_id, gmb_redirect_uri)
            print(f"🏢 Google My Business OAuth:")
            print(f"   {gmb_url}")
        
        # Meta OAuth URL  
        meta_client_id = os.getenv("META_CLIENT_ID")
        meta_redirect_uri = os.getenv("META_REDIRECT_URI", "http://localhost:8000/api/v1/integrations/meta/callback")
        
        if meta_client_id:
            meta_url = self.generate_meta_oauth_url(meta_client_id, meta_redirect_uri)
            print(f"\n📘 Meta Business OAuth:")
            print(f"   {meta_url}")
        
        print(f"\n📝 Testing Instructions:")
        print(f"1. Start the backend server: uvicorn main:app --reload")
        print(f"2. Click the URLs above to test OAuth flow")
        print(f"3. Check that redirect URIs work correctly")
        print(f"4. Verify tokens are received and stored")


def main():
    """Run OAuth configuration tests"""
    print("🔐 BookedBarber V2 - OAuth Configuration Test")
    print("=" * 60)
    
    tester = OAuthConfigurationTest()
    
    # Run all tests
    tests_passed = 0
    total_tests = 4
    
    try:
        # Test 1: Environment variables
        if tester.test_environment_variables():
            tests_passed += 1
        
        # Test 2: GMB configuration
        if tester.test_gmb_configuration():
            tests_passed += 1
            
        # Test 3: Meta configuration  
        if tester.test_meta_configuration():
            tests_passed += 1
            
        # Test 4: Integration endpoints
        if tester.test_integration_endpoints():
            tests_passed += 1
            
        # Generate test URLs
        tester.generate_oauth_test_urls()
        
        # Summary
        print(f"\n📊 Test Results Summary")
        print("=" * 50)
        print(f"✅ Tests passed: {tests_passed}/{total_tests}")
        print(f"❌ Tests failed: {total_tests - tests_passed}/{total_tests}")
        
        if tests_passed == total_tests:
            print(f"\n🎉 All OAuth configurations are ready!")
            print(f"📋 Next steps:")
            print(f"1. Start the backend server: uvicorn main:app --reload")
            print(f"2. Start the frontend: cd frontend-v2 && npm run dev") 
            print(f"3. Go to Settings > Integrations to test OAuth flows")
            return True
        else:
            print(f"\n⚠️  Some configurations need attention. Check the errors above.")
            return False
            
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)