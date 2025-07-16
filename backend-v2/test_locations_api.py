#!/usr/bin/env python3
"""
Test script for the locations API endpoint.
This script tests the /api/v1/locations endpoint with authentication.
"""

import requests
import json
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

BASE_URL = "http://localhost:8000"

def login_admin():
    """Login as admin user and return access token."""
    
    login_data = {
        "email": "admin@sixfb.com",
        "password": "admin123"  # Common test password
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/v1/auth/login",
            json=login_data,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            token_data = response.json()
            logger.info("✅ Successfully authenticated as admin")
            return token_data.get("access_token")
        else:
            logger.error(f"❌ Login failed: {response.status_code} - {response.text}")
            return None
            
    except Exception as e:
        logger.error(f"❌ Login error: {e}")
        return None

def test_locations_endpoint(access_token):
    """Test the locations API endpoint."""
    
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    
    try:
        # Test GET /api/v1/locations
        logger.info("🔍 Testing GET /api/v1/locations...")
        
        response = requests.get(
            f"{BASE_URL}/api/v1/locations",
            headers=headers
        )
        
        logger.info(f"Response status: {response.status_code}")
        logger.info(f"Response headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            locations = response.json()
            logger.info(f"✅ Successfully retrieved {len(locations)} locations")
            
            # Pretty print the locations
            for i, location in enumerate(locations, 1):
                logger.info(f"\n📍 Location {i}:")
                logger.info(f"  Name: {location.get('name')}")
                logger.info(f"  Code: {location.get('code')}")
                logger.info(f"  Status: {location.get('status')}")
                logger.info(f"  Address: {location.get('address')}, {location.get('city')}, {location.get('state')} {location.get('zip_code')}")
                logger.info(f"  Phone: {location.get('phone')}")
                logger.info(f"  Email: {location.get('email')}")
                logger.info(f"  Chairs: {location.get('active_chairs')}/{location.get('total_chairs')}")
                logger.info(f"  Occupancy Rate: {location.get('occupancy_rate'):.1f}%")
                logger.info(f"  Vacant Chairs: {location.get('vacant_chairs')}")
                logger.info(f"  Compensation Model: {location.get('compensation_model')}")
                logger.info(f"  Created: {location.get('created_at')}")
            
            return True
            
        else:
            logger.error(f"❌ Failed to retrieve locations: {response.status_code}")
            logger.error(f"Response: {response.text}")
            return False
            
    except Exception as e:
        logger.error(f"❌ Error testing locations endpoint: {e}")
        return False

def test_specific_location(access_token, location_id):
    """Test getting a specific location by ID."""
    
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    
    try:
        logger.info(f"🔍 Testing GET /api/v1/locations/{location_id}...")
        
        response = requests.get(
            f"{BASE_URL}/api/v1/locations/{location_id}",
            headers=headers
        )
        
        logger.info(f"Response status: {response.status_code}")
        
        if response.status_code == 200:
            location = response.json()
            logger.info(f"✅ Successfully retrieved location: {location.get('name')}")
            logger.info(f"  Details: {json.dumps(location, indent=2, default=str)}")
            return True
            
        else:
            logger.error(f"❌ Failed to retrieve location {location_id}: {response.status_code}")
            logger.error(f"Response: {response.text}")
            return False
            
    except Exception as e:
        logger.error(f"❌ Error testing specific location endpoint: {e}")
        return False

def test_api_health():
    """Test the API health endpoint."""
    
    try:
        logger.info("🔍 Testing API health endpoint...")
        
        response = requests.get(f"{BASE_URL}/health")
        
        if response.status_code == 200:
            logger.info("✅ API health check passed")
            return True
        else:
            logger.error(f"❌ API health check failed: {response.status_code}")
            return False
            
    except Exception as e:
        logger.error(f"❌ Error testing API health: {e}")
        return False

if __name__ == "__main__":
    logger.info("🚀 Starting locations API test...")
    
    # Test API health first
    if not test_api_health():
        logger.error("❌ API health check failed. Make sure the server is running.")
        exit(1)
    
    # Login as admin
    access_token = login_admin()
    if not access_token:
        logger.error("❌ Failed to authenticate. Cannot test locations endpoint.")
        exit(1)
    
    # Test locations endpoint
    success = test_locations_endpoint(access_token)
    if not success:
        logger.error("❌ Locations API test failed.")
        exit(1)
    
    # Test specific location
    logger.info("\n" + "="*50)
    test_specific_location(access_token, 1)
    
    logger.info("\n✅ All tests completed successfully!")
    logger.info("The locations API endpoint is working correctly.")