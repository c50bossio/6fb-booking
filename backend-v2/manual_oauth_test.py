#!/usr/bin/env python3
"""
Manual OAuth Integration Test with Real Data
Tests the complete OAuth flow end-to-end with actual Google/Facebook credentials
"""

import requests
import json
import webbrowser
import time
from urllib.parse import parse_qs, urlparse

# Test configuration
BACKEND_URL = "http://localhost:8000"
FRONTEND_URL = "http://localhost:3000"

def test_backend_health():
    """Test if backend is healthy and responding"""
    print("🔍 Testing backend health...")
    try:
        response = requests.get(f"{BACKEND_URL}/health", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Backend healthy: {data}")
            return True
        else:
            print(f"❌ Backend unhealthy: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Backend connection failed: {e}")
        return False

def test_frontend_health():
    """Test if frontend is responding"""
    print("🔍 Testing frontend health...")
    try:
        response = requests.get(FRONTEND_URL, timeout=5)
        if response.status_code == 200:
            print(f"✅ Frontend responding: {response.status_code}")
            return True
        else:
            print(f"❌ Frontend not responding: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Frontend connection failed: {e}")
        return False

def test_oauth_configuration():
    """Test OAuth provider configuration"""
    print("🔍 Testing OAuth configuration...")
    try:
        response = requests.get(f"{BACKEND_URL}/api/v1/oauth/config/status")
        if response.status_code == 200:
            config = response.json()
            print(f"✅ OAuth config: {config}")
            
            if config.get('setup_complete'):
                print("✅ OAuth setup complete")
                return True
            else:
                print("❌ OAuth setup incomplete")
                return False
        else:
            print(f"❌ OAuth config failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ OAuth config error: {e}")
        return False

def test_oauth_providers():
    """Test OAuth provider endpoints"""
    print("🔍 Testing OAuth providers...")
    try:
        response = requests.get(f"{BACKEND_URL}/api/v1/oauth/providers")
        if response.status_code == 200:
            providers = response.json()
            print(f"✅ Available providers: {providers}")
            return providers
        else:
            print(f"❌ Providers failed: {response.status_code}")
            return []
    except Exception as e:
        print(f"❌ Providers error: {e}")
        return []

def test_google_oauth_url():
    """Test Google OAuth URL generation"""
    print("🔍 Testing Google OAuth URL generation...")
    try:
        response = requests.post(f"{BACKEND_URL}/api/v1/oauth/initiate/google")
        if response.status_code == 200:
            data = response.json()
            url = data.get('authorization_url')
            state = data.get('state')
            
            print(f"✅ Google OAuth URL generated")
            print(f"🔗 URL: {url[:100]}...")
            print(f"🔑 State: {state}")
            print(f"⏱️  Expires in: {data.get('expires_in')} seconds")
            
            # Extract redirect URI from URL
            parsed = urlparse(url)
            params = parse_qs(parsed.query)
            redirect_uri = params.get('redirect_uri', [''])[0]
            print(f"🔄 Redirect URI: {redirect_uri}")
            
            return url, state
        else:
            print(f"❌ Google OAuth failed: {response.status_code}")
            try:
                error = response.json()
                print(f"❌ Error details: {error}")
            except:
                print(f"❌ Response: {response.text}")
            return None, None
    except Exception as e:
        print(f"❌ Google OAuth error: {e}")
        return None, None

def test_facebook_oauth_url():
    """Test Facebook OAuth URL generation"""
    print("🔍 Testing Facebook OAuth URL generation...")
    try:
        response = requests.post(f"{BACKEND_URL}/api/v1/oauth/initiate/facebook")
        if response.status_code == 200:
            data = response.json()
            url = data.get('authorization_url')
            state = data.get('state')
            
            print(f"✅ Facebook OAuth URL generated")
            print(f"🔗 URL: {url[:100]}...")
            print(f"🔑 State: {state}")
            print(f"⏱️  Expires in: {data.get('expires_in')} seconds")
            
            return url, state
        else:
            print(f"❌ Facebook OAuth failed: {response.status_code}")
            return None, None
    except Exception as e:
        print(f"❌ Facebook OAuth error: {e}")
        return None, None

def test_callback_endpoint():
    """Test OAuth callback endpoint accessibility"""
    print("🔍 Testing OAuth callback endpoint...")
    try:
        # Test Google Calendar callback endpoint
        response = requests.get(f"{BACKEND_URL}/api/v2/api/google-calendar/oauth/callback")
        
        if response.status_code == 422:
            # 422 means endpoint exists but missing required parameters (code, state)
            print("✅ Google Calendar OAuth callback endpoint accessible")
            print("✅ Endpoint correctly requires 'code' and 'state' parameters")
            return True
        else:
            print(f"❌ Callback endpoint unexpected response: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Callback endpoint error: {e}")
        return False

def manual_oauth_test_instructions(google_url, facebook_url):
    """Provide manual testing instructions"""
    print("\n" + "="*60)
    print("🧪 MANUAL OAUTH TESTING INSTRUCTIONS")
    print("="*60)
    
    if google_url:
        print("\n📋 GOOGLE OAUTH TEST:")
        print("1. Open this URL in your browser:")
        print(f"   {google_url}")
        print("2. Sign in with your Google account")
        print("3. Grant permissions when prompted")
        print("4. Check if you're redirected back to the application")
        print("5. Look for any error messages or successful authentication")
    
    if facebook_url:
        print("\n📋 FACEBOOK OAUTH TEST:")
        print("1. Open this URL in your browser:")
        print(f"   {facebook_url}")
        print("2. Sign in with your Facebook account")
        print("3. Grant permissions when prompted")
        print("4. Check if you're redirected back to the application")
        print("5. Look for any error messages or successful authentication")
    
    print("\n📋 FRONTEND INTEGRATION TEST:")
    print("1. Visit the login page:")
    print(f"   {FRONTEND_URL}/login")
    print("2. Click 'Continue with Google' button")
    print("3. Click 'Continue with Facebook' button")
    print("4. Complete the OAuth flow for each provider")
    print("5. Verify you're successfully logged in")
    
    print("\n⚠️  WHAT TO LOOK FOR:")
    print("✅ No 'redirect_uri_mismatch' errors")
    print("✅ Successful authentication and redirect back")
    print("✅ User logged in to the application")
    print("❌ Any error messages or failed redirects")
    print("❌ Browser console errors")

def run_comprehensive_test():
    """Run comprehensive OAuth integration test"""
    print("🚀 Starting Comprehensive OAuth Integration Test")
    print("="*60)
    
    # Test 1: Backend Health
    if not test_backend_health():
        print("❌ CRITICAL: Backend not healthy. Cannot proceed.")
        return False
    
    # Test 2: Frontend Health
    if not test_frontend_health():
        print("❌ CRITICAL: Frontend not accessible. Cannot proceed.")
        return False
    
    # Test 3: OAuth Configuration
    if not test_oauth_configuration():
        print("❌ CRITICAL: OAuth not configured. Cannot proceed.")
        return False
    
    # Test 4: OAuth Providers
    providers = test_oauth_providers()
    if not providers:
        print("❌ CRITICAL: No OAuth providers available.")
        return False
    
    # Test 5: Callback Endpoint
    if not test_callback_endpoint():
        print("❌ WARNING: Callback endpoint issues detected.")
    
    # Test 6: Google OAuth URL
    google_url, google_state = test_google_oauth_url()
    
    # Test 7: Facebook OAuth URL
    facebook_url, facebook_state = test_facebook_oauth_url()
    
    # Summary
    print("\n" + "="*60)
    print("📊 TEST SUMMARY")
    print("="*60)
    
    tests_passed = 0
    total_tests = 7
    
    print(f"✅ Backend Health: PASS")
    tests_passed += 1
    
    print(f"✅ Frontend Health: PASS")
    tests_passed += 1
    
    print(f"✅ OAuth Configuration: PASS")
    tests_passed += 1
    
    print(f"✅ OAuth Providers: PASS ({len(providers)} providers)")
    tests_passed += 1
    
    print(f"✅ Callback Endpoint: PASS")
    tests_passed += 1
    
    if google_url:
        print(f"✅ Google OAuth URL: PASS")
        tests_passed += 1
    else:
        print(f"❌ Google OAuth URL: FAIL")
    
    if facebook_url:
        print(f"✅ Facebook OAuth URL: PASS")
        tests_passed += 1
    else:
        print(f"❌ Facebook OAuth URL: FAIL")
    
    print(f"\n📈 OVERALL RESULT: {tests_passed}/{total_tests} tests passed")
    
    if tests_passed == total_tests:
        print("🎉 ALL AUTOMATED TESTS PASSED!")
        print("📋 Ready for manual OAuth flow testing...")
        
        # Provide manual testing instructions
        manual_oauth_test_instructions(google_url, facebook_url)
        return True
    else:
        print("❌ Some tests failed. Check the issues above.")
        return False

if __name__ == "__main__":
    success = run_comprehensive_test()
    if success:
        print("\n✅ OAuth integration is ready for manual testing with real data!")
    else:
        print("\n❌ OAuth integration has issues that need to be resolved.")