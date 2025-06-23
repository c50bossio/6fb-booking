#!/usr/bin/env python3
"""
Test script to verify services endpoint functionality
"""

import requests
import json
from typing import Dict, Any

# Local server URL
LOCAL_URL = "http://localhost:8000"

def test_endpoint(endpoint: str, method: str = "GET", data: Dict[Any, Any] = None) -> None:
    """Test a specific endpoint"""
    url = f"{LOCAL_URL}{endpoint}"
    
    print(f"\n{'='*60}")
    print(f"Testing: {method} {endpoint}")
    print(f"{'='*60}")
    
    try:
        if method == "GET":
            response = requests.get(url)
        elif method == "POST":
            response = requests.post(url, json=data)
        else:
            print(f"Method {method} not supported in this test")
            return
            
        print(f"Status Code: {response.status_code}")
        print(f"Headers: {dict(response.headers)}")
        
        try:
            json_response = response.json()
            print(f"Response: {json.dumps(json_response, indent=2)}")
        except:
            print(f"Response Text: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("ERROR: Cannot connect to server. Is it running?")
    except Exception as e:
        print(f"ERROR: {type(e).__name__}: {str(e)}")

def main():
    """Run all service endpoint tests"""
    
    print("6FB Booking Platform - Services Endpoint Test")
    print("=" * 60)
    
    # Test service categories endpoint
    test_endpoint("/api/v1/services/categories")
    
    # Test services endpoint
    test_endpoint("/api/v1/services")
    
    # Test services with filters
    test_endpoint("/api/v1/services?is_active=true")
    test_endpoint("/api/v1/services?category_id=1")
    
    # Test health endpoint for comparison
    test_endpoint("/api/v1/health")
    
    # Test root endpoint
    test_endpoint("/")

if __name__ == "__main__":
    main()