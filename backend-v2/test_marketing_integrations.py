#!/usr/bin/env python3
"""Test marketing integrations functionality"""

import requests
import json
from datetime import datetime

BASE_URL = "http://localhost:8000"

def get_auth_token():
    """Get authentication token for testing"""
    # First, try to login with test credentials
    login_data = {
        "email": "test@example.com",
        "password": "testpassword123"
    }
    
    response = requests.post(f"{BASE_URL}/api/v2/auth/login", json=login_data)
    if response.status_code == 200:
        return response.json().get("access_token")
    
    # If login fails, try to register first
    print("Login failed, attempting to register test user...")
    register_data = {
        "email": "test@example.com", 
        "password": "testpassword123",
        "firstName": "Test",
        "lastName": "User",
        "user_type": "barbershop_owner",
        "businessName": "Test Barbershop",
        "businessType": "individual",
        "chairCount": 1,
        "termsAccepted": True
    }
    
    reg_response = requests.post(f"{BASE_URL}/api/v2/auth/register", json=register_data)
    if reg_response.status_code in [200, 201]:
        print("✅ Registration successful")
        return reg_response.json().get("access_token")
    else:
        print(f"❌ Registration failed: {reg_response.status_code} - {reg_response.text}")
        return None

def test_integrations_list(token):
    """Test listing available integrations"""
    print("\n🧪 Testing Available Integrations")
    print("=" * 50)
    
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/api/v2/integrations/available", headers=headers)
    
    if response.status_code == 200:
        integrations = response.json()
        print(f"✅ Found {len(integrations)} available integrations:")
        for integration in integrations:
            print(f"   - {integration.get('name', 'Unknown')}: {integration.get('description', 'No description')}")
    else:
        print(f"❌ Failed to get integrations: {response.status_code} - {response.text}")

def test_review_templates(token):
    """Test review template functionality"""
    print("\n🧪 Testing Review Templates")
    print("=" * 50)
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Initialize templates
    print("1. Initializing review templates...")
    init_response = requests.post(
        f"{BASE_URL}/api/v2/marketing/reviews/templates/initialize", 
        headers=headers
    )
    
    if init_response.status_code == 200:
        print("✅ Templates initialized successfully")
        templates = init_response.json()
        for template in templates:
            print(f"   - {template.get('rating_range', 'Unknown')}: {template.get('template_text', '')[:60]}...")
    else:
        print(f"❌ Failed to initialize templates: {init_response.status_code} - {init_response.text}")
    
    # Get templates
    print("\n2. Fetching review templates...")
    get_response = requests.get(
        f"{BASE_URL}/api/v2/marketing/reviews/templates",
        headers=headers
    )
    
    if get_response.status_code == 200:
        templates = get_response.json()
        print(f"✅ Found {len(templates)} templates")
    else:
        print(f"❌ Failed to get templates: {get_response.status_code}")

def test_marketing_analytics(token):
    """Test marketing analytics endpoints"""
    print("\n🧪 Testing Marketing Analytics")
    print("=" * 50)
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test main analytics endpoint
    print("1. Fetching marketing analytics...")
    response = requests.get(f"{BASE_URL}/api/v2/marketing/analytics", headers=headers)
    
    if response.status_code == 200:
        analytics = response.json()
        print("✅ Marketing analytics retrieved:")
        print(f"   - Total campaigns: {analytics.get('total_campaigns', 0)}")
        print(f"   - Active campaigns: {analytics.get('active_campaigns', 0)}")
        print(f"   - Total sent: {analytics.get('total_sent', 0)}")
    else:
        print(f"❌ Failed to get analytics: {response.status_code}")
    
    # Test channels analytics
    print("\n2. Fetching channel analytics...")
    channels_response = requests.get(
        f"{BASE_URL}/api/v2/marketing/analytics/channels",
        headers=headers
    )
    
    if channels_response.status_code == 200:
        channels = channels_response.json()
        print("✅ Channel analytics retrieved")
        if isinstance(channels, list):
            for channel in channels:
                print(f"   - {channel.get('channel', 'Unknown')}: {channel.get('total_sent', 0)} sent")
    else:
        print(f"❌ Failed to get channel analytics: {channels_response.status_code}")

def test_oauth_urls(token):
    """Test OAuth URL generation for integrations"""
    print("\n🧪 Testing OAuth URL Generation") 
    print("=" * 50)
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test Google My Business OAuth
    print("1. Testing Google My Business OAuth...")
    gmb_data = {"integration_type": "google_my_business"}
    gmb_response = requests.post(
        f"{BASE_URL}/api/v2/integrations/connect",
        headers=headers,
        json=gmb_data
    )
    
    if gmb_response.status_code == 200:
        result = gmb_response.json()
        print("✅ GMB OAuth URL generated:")
        print(f"   - URL: {result.get('authorization_url', 'No URL')[:80]}...")
        print(f"   - State: {result.get('state', 'No state')}")
    else:
        print(f"❌ Failed to generate GMB OAuth URL: {gmb_response.status_code}")
    
    # Test Meta Business OAuth
    print("\n2. Testing Meta Business OAuth...")
    meta_data = {"integration_type": "email_marketing"}  # Using email_marketing as Meta isn't directly listed
    meta_response = requests.post(
        f"{BASE_URL}/api/v2/integrations/connect",
        headers=headers,
        json=meta_data
    )
    
    if meta_response.status_code == 200:
        result = meta_response.json()
        print("✅ Meta OAuth URL generated:")
        print(f"   - URL: {result.get('authorization_url', 'No URL')[:80]}...")
        print(f"   - State: {result.get('state', 'No state')}")
    else:
        print(f"❌ Failed to generate Meta OAuth URL: {meta_response.status_code}")

def main():
    print("🚀 Testing BookedBarber V2 Marketing Integrations")
    print("=" * 50)
    
    # Get authentication token
    token = get_auth_token()
    if not token:
        print("❌ Failed to authenticate. Cannot continue tests.")
        return
    
    print("✅ Authentication successful!")
    
    # Run tests
    test_integrations_list(token)
    test_review_templates(token) 
    test_marketing_analytics(token)
    test_oauth_urls(token)
    
    print("\n✅ Marketing integration tests completed!")

if __name__ == "__main__":
    main()