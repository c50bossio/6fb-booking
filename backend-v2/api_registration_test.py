#!/usr/bin/env python3
"""
API-based Registration Test
Tests the registration API directly without browser automation
"""

import requests
import json
from datetime import datetime
import time

def test_registration_api():
    """Test the registration API endpoint directly"""
    print("🚀 Starting API Registration Test")
    print("=" * 50)
    
    # Test data
    timestamp = int(datetime.now().timestamp())
    test_email = f"e2e.test.{timestamp}@example.com"
    
    registration_data = {
        "name": "E2E Test User",
        "email": test_email,
        "password": "StrongTestPass123!",
        "confirm_password": "StrongTestPass123!",
        "user_type": "client",
        "accept_terms": True,
        "accept_privacy": True,
        "accept_marketing": False,
        "create_test_data": True
    }
    
    print(f"📧 Test email: {test_email}")
    print(f"👤 Test user: {registration_data['name']}")
    
    # Step 1: Test backend health
    print("\n🔍 Step 1: Testing Backend Health")
    try:
        health_response = requests.get("http://localhost:8000/health", timeout=5)
        if health_response.status_code == 200:
            print("✅ Backend is running and healthy")
        else:
            print(f"⚠️ Backend health check returned: {health_response.status_code}")
    except requests.exceptions.RequestException as e:
        print(f"❌ Backend health check failed: {e}")
        return False
    
    # Step 2: Test auth router
    print("\n🔍 Step 2: Testing Auth Router")
    try:
        auth_test_response = requests.get("http://localhost:8000/api/v1/auth/test", timeout=5)
        if auth_test_response.status_code == 200:
            print("✅ Auth router is responding")
            print(f"   Response: {auth_test_response.json()}")
        else:
            print(f"⚠️ Auth test returned: {auth_test_response.status_code}")
    except requests.exceptions.RequestException as e:
        print(f"❌ Auth router test failed: {e}")
        return False
    
    # Step 3: Test password policy endpoint
    print("\n🔍 Step 3: Testing Password Policy")
    try:
        policy_response = requests.get("http://localhost:8000/api/v1/auth/password-policy", timeout=5)
        if policy_response.status_code == 200:
            print("✅ Password policy endpoint working")
            policy_data = policy_response.json()
            print(f"   Policy: {policy_data.get('policy', 'No policy returned')}")
        else:
            print(f"⚠️ Password policy returned: {policy_response.status_code}")
    except requests.exceptions.RequestException as e:
        print(f"❌ Password policy test failed: {e}")
    
    # Step 4: Test registration endpoint
    print("\n📝 Step 4: Testing Registration Endpoint")
    try:
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
        
        # Make registration request
        registration_response = requests.post(
            "http://localhost:8000/api/v1/auth/register",
            json=registration_data,
            headers=headers,
            timeout=10
        )
        
        print(f"📡 Registration response status: {registration_response.status_code}")
        
        if registration_response.status_code == 200:
            print("✅ Registration successful!")
            response_data = registration_response.json()
            print(f"   Message: {response_data.get('message', 'No message')}")
            
            if 'user' in response_data:
                user_data = response_data['user']
                print(f"   User ID: {user_data.get('id', 'Unknown')}")
                print(f"   User Email: {user_data.get('email', 'Unknown')}")
                print(f"   Email Verified: {user_data.get('email_verified', 'Unknown')}")
                print(f"   Trial Active: {user_data.get('trial_active', 'Unknown')}")
            
            return True
        
        elif registration_response.status_code == 422:
            print("❌ Validation error:")
            try:
                error_data = registration_response.json()
                if 'detail' in error_data:
                    for error in error_data['detail']:
                        print(f"   • {error.get('loc', ['unknown'])[1:]}: {error.get('msg', 'Unknown error')}")
            except:
                print(f"   Raw error: {registration_response.text}")
            return False
            
        elif registration_response.status_code == 400:
            print("❌ Bad request:")
            try:
                error_data = registration_response.json()
                print(f"   Error: {error_data.get('detail', 'Unknown error')}")
            except:
                print(f"   Raw error: {registration_response.text}")
            return False
        
        else:
            print(f"❌ Unexpected status code: {registration_response.status_code}")
            print(f"   Response: {registration_response.text}")
            return False
    
    except requests.exceptions.RequestException as e:
        print(f"❌ Registration request failed: {e}")
        return False
    
    # Step 5: Test duplicate registration (should fail)
    print("\n🔍 Step 5: Testing Duplicate Registration (Should Fail)")
    try:
        duplicate_response = requests.post(
            "http://localhost:8000/api/v1/auth/register",
            json=registration_data,
            headers=headers,
            timeout=10
        )
        
        if duplicate_response.status_code == 400:
            print("✅ Duplicate registration properly rejected")
            error_data = duplicate_response.json()
            print(f"   Error: {error_data.get('detail', 'Unknown error')}")
        else:
            print(f"⚠️ Unexpected duplicate response: {duplicate_response.status_code}")
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Duplicate registration test failed: {e}")
    
    return True

def test_frontend_availability():
    """Test that the frontend is serving the registration page"""
    print("\n🌐 Testing Frontend Availability")
    print("=" * 30)
    
    try:
        frontend_response = requests.get("http://localhost:3000/register", timeout=5)
        
        if frontend_response.status_code == 200:
            print("✅ Frontend registration page is accessible")
            
            # Check for key form elements in HTML
            html_content = frontend_response.text
            form_elements = [
                'name="name"',
                'name="email"',
                'name="userType"',
                'name="password"',
                'name="confirmPassword"',
                'type="submit"'
            ]
            
            print("🔍 Checking form elements:")
            all_found = True
            for element in form_elements:
                if element in html_content:
                    print(f"   ✅ {element} found")
                else:
                    print(f"   ❌ {element} missing")
                    all_found = False
            
            # Check for accessibility features
            accessibility_features = [
                'aria-required="true"',
                'aria-describedby',
                'for="name"',
                'for="email"'
            ]
            
            print("♿ Checking accessibility features:")
            for feature in accessibility_features:
                if feature in html_content:
                    print(f"   ✅ {feature} found")
                else:
                    print(f"   ❌ {feature} missing")
            
            return all_found
        else:
            print(f"❌ Frontend returned status: {frontend_response.status_code}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Frontend test failed: {e}")
        return False

def run_comprehensive_test():
    """Run both API and frontend tests"""
    print("🎯 Comprehensive Registration Test Suite")
    print("=" * 60)
    
    # Test frontend availability
    frontend_ok = test_frontend_availability()
    
    # Test API functionality
    api_ok = test_registration_api()
    
    # Summary
    print("\n📋 Test Summary")
    print("=" * 30)
    
    tests = {
        "Frontend page loads": frontend_ok,
        "API registration works": api_ok
    }
    
    all_passed = all(tests.values())
    
    for test_name, passed in tests.items():
        status = "✅" if passed else "❌"
        print(f"{status} {test_name}")
    
    if all_passed:
        print("\n🎉 All tests passed! Registration system is working correctly.")
        print("✨ The registration flow is ready for users!")
    else:
        print("\n⚠️ Some tests failed. Please review the issues above.")
    
    return all_passed

if __name__ == "__main__":
    success = run_comprehensive_test()
    exit(0 if success else 1)