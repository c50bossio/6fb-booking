#!/usr/bin/env python3
"""
Test script for OAuth integration flows and marketing integrations.
Tests GMB, Meta, and other OAuth providers.
"""

import requests
import time
from typing import Optional
from urllib.parse import urlparse

# Configuration
BASE_URL = "http://localhost:8000"
API_VERSION = "/api/v1"

# Test user credentials
TEST_USER = {
    "email": "oauth_test@example.com",
    "password": "OAuthTest123!"  # Strong password
}

# Color codes for output
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'

def print_test_header(test_name: str):
    """Print formatted test header"""
    print(f"\n{BLUE}{'='*60}{RESET}")
    print(f"{BLUE}Testing: {test_name}{RESET}")
    print(f"{BLUE}{'='*60}{RESET}")

def print_result(success: bool, message: str):
    """Print colored result message"""
    color = GREEN if success else RED
    status = "✓ PASS" if success else "✗ FAIL"
    print(f"{color}{status}: {message}{RESET}")

def create_test_user():
    """Create a test user for authentication"""
    print_test_header("User Registration")
    
    # Try to register user
    response = requests.post(
        f"{BASE_URL}{API_VERSION}/auth/register",
        json={
            "email": TEST_USER["email"],
            "password": TEST_USER["password"],
            "name": "Test User",  # Changed from full_name to name
            "phone": "+1234567890",
            "user_type": "barber"
        }
    )
    
    if response.status_code == 200:
        print_result(True, "User created successfully (requires email verification)")
        return response.json()
    elif response.status_code == 201:
        print_result(True, "User created successfully")
        return response.json()
    elif response.status_code == 400 and "already registered" in response.text:
        print_result(True, "User already exists")
        return None
    else:
        print_result(False, f"Failed to create user: {response.text}")
        return None

def login() -> Optional[str]:
    """Login and get access token"""
    print_test_header("User Login")
    
    response = requests.post(
        f"{BASE_URL}{API_VERSION}/auth/login",
        json=TEST_USER
    )
    
    if response.status_code == 200:
        data = response.json()
        print_result(True, "Login successful")
        return data["access_token"]
    else:
        print_result(False, f"Login failed: {response.text}")
        return None

def test_integrations_list(token: str):
    """Test listing all integrations"""
    print_test_header("List Integrations")
    
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(
        f"{BASE_URL}{API_VERSION}/integrations/status",
        headers=headers
    )
    
    if response.status_code == 200:
        integrations = response.json()
        print_result(True, f"Retrieved {len(integrations)} integrations")
        for integration in integrations:
            print(f"  - {integration.get('name', 'Unknown')} ({integration.get('integration_type')}): {integration.get('status')}")
        return integrations
    else:
        print_result(False, f"Failed to list integrations: {response.text}")
        return []

def test_oauth_initiate(token: str, provider: str):
    """Test OAuth flow initiation"""
    print_test_header(f"OAuth Initiate - {provider.upper()}")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test initiation
    response = requests.post(
        f"{BASE_URL}{API_VERSION}/integrations/connect",
        headers=headers,
        json={
            "integration_type": provider,
            "redirect_uri": f"http://localhost:3000/settings/integrations",
            "scopes": []
        }
    )
    
    if response.status_code == 200:
        data = response.json()
        print_result(True, "OAuth initiation successful")
        print(f"  Authorization URL: {data.get('authorization_url', 'N/A')[:80]}...")
        print(f"  State: {data.get('state', 'N/A')}")
        
        # Parse the authorization URL
        parsed = urlparse(data.get('authorization_url', ''))
        print(f"  Host: {parsed.netloc}")
        
        return data
    else:
        print_result(False, f"OAuth initiation failed: {response.text}")
        return None

def test_mock_oauth_callback(token: str, provider: str, state: str):
    """Test OAuth callback with mock code"""
    print_test_header(f"OAuth Callback - {provider.upper()}")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Simulate OAuth callback
    response = requests.get(
        f"{BASE_URL}{API_VERSION}/integrations/callback",
        headers=headers,
        params={
            "code": "mock-authorization-code-12345",
            "state": state,
            "integration_type": provider  # Added required parameter
        }
    )
    
    if response.status_code == 200:
        data = response.json()
        print_result(True, "OAuth callback processed successfully")
        print(f"  Success: {data.get('success')}")
        print(f"  Integration ID: {data.get('integration_id')}")
        print(f"  Message: {data.get('message')}")
        return data
    else:
        print_result(False, f"OAuth callback failed: {response.text}")
        return None

def test_integration_health(token: str, integration_id: int):
    """Test integration health check"""
    print_test_header(f"Integration Health Check - ID: {integration_id}")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    response = requests.get(
        f"{BASE_URL}{API_VERSION}/integrations/health/{integration_id}",
        headers=headers
    )
    
    if response.status_code == 200:
        data = response.json()
        print_result(True, "Health check completed")
        print(f"  Healthy: {data.get('healthy')}")
        print(f"  Status: {data.get('status')}")
        print(f"  Last Check: {data.get('last_check')}")
        return data
    else:
        print_result(False, f"Health check failed: {response.text}")
        return None

def test_conversion_tracking(token: str):
    """Test conversion tracking endpoints"""
    print_test_header("Conversion Tracking")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Track a test event
    import uuid
    event_data = {
        "event_id": str(uuid.uuid4()),  # Unique event ID to avoid duplicates
        "event_name": "test_booking",
        "event_type": "purchase",
        "event_value": 50.00,
        "event_data": {
            "service": "Haircut",
            "barber": "Test Barber"
        },
        "utm_source": "google",
        "utm_medium": "cpc",
        "utm_campaign": "summer_sale"
    }
    
    response = requests.post(
        f"{BASE_URL}{API_VERSION}/tracking/event",
        headers=headers,
        json=event_data
    )
    
    if response.status_code == 200:
        data = response.json()
        print_result(True, "Event tracked successfully")
        print(f"  Event ID: {data.get('event_id')}")
        print(f"  Status: {data.get('status')}")
        return data
    else:
        print_result(False, f"Event tracking failed: {response.text}")
        return None

def test_review_templates(token: str):
    """Test review response templates"""
    print_test_header("Review Response Templates")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # First, get existing templates
    response = requests.get(
        f"{BASE_URL}{API_VERSION}/reviews/templates",
        headers=headers
    )
    
    if response.status_code == 200:
        templates = response.json()
        print_result(True, f"Retrieved {len(templates)} review templates")
        
        # Create a test template if none exist
        if not templates:
            template_data = {
                "name": "5-Star Response Template",
                "template_text": "Thank you so much, {reviewer_name}! We're thrilled you enjoyed your experience at {business_name}. Your satisfaction is our top priority!",
                "category": "positive",
                "min_rating": 4.0,
                "max_rating": 5.0,
                "platform": "GOOGLE",
                "seo_keywords": ["barbershop", "haircut", "professional"],
                "is_active": True,
                "priority": 100
            }
            
            create_response = requests.post(
                f"{BASE_URL}{API_VERSION}/reviews/templates",
                headers=headers,
                json=template_data
            )
            
            if create_response.status_code == 200:
                print_result(True, "Created test review template")
                return create_response.json()
            else:
                print_result(False, f"Failed to create template: {create_response.text}")
                return None
        else:
            return templates[0]
    else:
        print_result(False, f"Failed to get templates: {response.text}")
        return None

def main():
    """Run all integration tests"""
    print(f"\n{YELLOW}BookedBarber Marketing Integrations Test Suite{RESET}")
    print(f"{YELLOW}Testing against: {BASE_URL}{RESET}")
    
    # Create user if needed
    create_test_user()
    
    # Login
    token = login()
    if not token:
        print(f"\n{RED}Cannot proceed without authentication{RESET}")
        return
    
    # Test listing integrations
    integrations = test_integrations_list(token)
    
    # Test OAuth flows for different providers
    # Note: The API expects lowercase values
    providers = ["google_my_business", "stripe"]
    
    for provider in providers:
        # Initiate OAuth
        oauth_data = test_oauth_initiate(token, provider)
        if oauth_data and oauth_data.get("state"):
            # Simulate callback
            time.sleep(1)  # Small delay to simulate user action
            callback_data = test_mock_oauth_callback(
                token, 
                provider,
                oauth_data["state"]
            )
            
            # Check health if integration was created
            if callback_data and callback_data.get("integration_id"):
                time.sleep(1)
                test_integration_health(token, callback_data["integration_id"])
    
    # Test conversion tracking
    test_conversion_tracking(token)
    
    # Test review response generation
    test_review_templates(token)
    
    # Summary
    print(f"\n{YELLOW}{'='*60}{RESET}")
    print(f"{YELLOW}Test Suite Complete!{RESET}")
    print(f"{YELLOW}{'='*60}{RESET}")

if __name__ == "__main__":
    main()