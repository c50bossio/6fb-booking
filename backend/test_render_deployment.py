#!/usr/bin/env python3
"""
Test script to verify Render deployment
"""

import requests
import json
from typing import Dict, Any

# Render deployment URL
RENDER_URL = "https://sixfb-backend.onrender.com"

def test_endpoint(endpoint: str, method: str = "GET", data: Dict[Any, Any] = None) -> None:
    """Test a specific endpoint on Render"""
    url = f"{RENDER_URL}{endpoint}"
    
    print(f"\n{'='*60}")
    print(f"Testing: {method} {endpoint}")
    print(f"URL: {url}")
    print(f"{'='*60}")
    
    try:
        if method == "GET":
            response = requests.get(url, timeout=30)
        elif method == "POST":
            response = requests.post(url, json=data, timeout=30)
        else:
            print(f"Method {method} not supported in this test")
            return
            
        print(f"Status Code: {response.status_code}")
        print(f"Response Time: {response.elapsed.total_seconds():.2f}s")
        
        # Print headers (selected ones)
        print("\nHeaders:")
        for header in ['content-type', 'server', 'date', 'x-request-id']:
            if header in response.headers:
                print(f"  {header}: {response.headers[header]}")
        
        # Try to parse response
        try:
            json_response = response.json()
            print(f"\nResponse: {json.dumps(json_response, indent=2)[:500]}...")
        except:
            print(f"\nResponse Text: {response.text[:500]}...")
            
    except requests.exceptions.Timeout:
        print("ERROR: Request timed out (30s)")
    except requests.exceptions.ConnectionError as e:
        print(f"ERROR: Connection failed - {str(e)}")
    except Exception as e:
        print(f"ERROR: {type(e).__name__}: {str(e)}")

def main():
    """Run deployment tests"""
    
    print("6FB Booking Platform - Render Deployment Test")
    print("=" * 60)
    print(f"Testing URL: {RENDER_URL}")
    
    # Test root endpoint
    test_endpoint("/")
    
    # Test health endpoint
    test_endpoint("/api/v1/health")
    
    # Test service categories endpoint
    test_endpoint("/api/v1/services/categories")
    
    # Test services endpoint
    test_endpoint("/api/v1/services")
    
    # Test services with filters
    test_endpoint("/api/v1/services?is_active=true&limit=5")
    
    # Test appointments endpoint (to see if other endpoints work)
    test_endpoint("/api/v1/appointments")
    
    # Test clients endpoint (to see if other endpoints work)
    test_endpoint("/api/v1/clients")

if __name__ == "__main__":
    main()