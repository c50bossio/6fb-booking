#!/usr/bin/env python3
"""Quick API connectivity test"""

import requests
import time

def test_api_connectivity():
    """Test basic API connectivity"""
    print("Testing API connectivity...")
    
    endpoints = [
        "http://localhost:8000/api/v2/health",
        "http://localhost:8000/docs",
        "http://localhost:8000/",
        "http://localhost:8000/api/v2/",
    ]
    
    for endpoint in endpoints:
        try:
            print(f"Testing {endpoint}...")
            response = requests.get(endpoint, timeout=5)
            print(f"✓ {endpoint}: {response.status_code} - {len(response.content)} bytes")
        except requests.exceptions.Timeout:
            print(f"✗ {endpoint}: Timeout")
        except requests.exceptions.ConnectionError:
            print(f"✗ {endpoint}: Connection Error")
        except Exception as e:
            print(f"✗ {endpoint}: {e}")
    
    # Test frontend
    try:
        print(f"Testing frontend...")
        response = requests.get("http://localhost:3000", timeout=5)
        print(f"✓ Frontend: {response.status_code} - {len(response.content)} bytes")
    except Exception as e:
        print(f"✗ Frontend: {e}")

if __name__ == "__main__":
    test_api_connectivity()