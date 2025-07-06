#!/usr/bin/env python3
"""
Test script to debug the analytics API datetime validation issue
"""

import requests
import json
from datetime import datetime, timedelta
from urllib.parse import quote

# Test the analytics endpoint with different datetime formats
BASE_URL = "http://localhost:8000"

def test_analytics_endpoint():
    print("🔍 Testing analytics endpoint datetime validation...")
    
    # Test different datetime formats
    now = datetime.utcnow()
    start_date = now - timedelta(days=30)
    
    formats_to_test = [
        # Current format (likely causing issues)
        (start_date.isoformat() + 'Z', now.isoformat() + 'Z'),
        
        # Alternative formats
        (start_date.strftime('%Y-%m-%dT%H:%M:%S'), now.strftime('%Y-%m-%dT%H:%M:%S')),
        (start_date.strftime('%Y-%m-%d %H:%M:%S'), now.strftime('%Y-%m-%d %H:%M:%S')),
        (start_date.strftime('%Y-%m-%d'), now.strftime('%Y-%m-%d')),
        
        # Without timezone
        (start_date.isoformat(), now.isoformat()),
    ]
    
    headers = {
        'Accept': 'application/json',
        'Authorization': 'Bearer fake-token-for-testing'
    }
    
    for i, (start_str, end_str) in enumerate(formats_to_test):
        print(f"\n--- Test {i+1}: start_date='{start_str}', end_date='{end_str}' ---")
        
        # Test with direct datetime strings
        url = f"{BASE_URL}/api/v1/agents/analytics"
        params = {
            'start_date': start_str,
            'end_date': end_str
        }
        
        try:
            response = requests.get(url, params=params, headers=headers)
            print(f"Status: {response.status_code}")
            
            if response.status_code != 200:
                try:
                    error_data = response.json()
                    print(f"Error: {json.dumps(error_data, indent=2)}")
                except:
                    print(f"Error (raw): {response.text}")
            else:
                print("✅ Success!")
                
        except Exception as e:
            print(f"❌ Request failed: {e}")

def test_auth_endpoint():
    """Test if we can access any authenticated endpoint to check auth"""
    print("\n🔐 Testing authentication...")
    
    url = f"{BASE_URL}/api/v1/auth/me"
    headers = {'Accept': 'application/json'}
    
    try:
        response = requests.get(url, headers=headers)
        print(f"Auth status: {response.status_code}")
        if response.status_code == 200:
            print("✅ User is authenticated")
        else:
            print(f"❌ Not authenticated: {response.text}")
    except Exception as e:
        print(f"❌ Auth check failed: {e}")

def test_endpoint_without_params():
    """Test analytics endpoint without any parameters"""
    print("\n📊 Testing analytics endpoint without parameters...")
    
    url = f"{BASE_URL}/api/v1/agents/analytics"
    headers = {'Accept': 'application/json'}
    
    try:
        response = requests.get(url, headers=headers)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            print("✅ Success without parameters!")
            data = response.json()
            print(f"Response keys: {list(data.keys())}")
        else:
            try:
                error_data = response.json()
                print(f"Error: {json.dumps(error_data, indent=2)}")
            except:
                print(f"Error (raw): {response.text}")
                
    except Exception as e:
        print(f"❌ Request failed: {e}")

if __name__ == "__main__":
    print("🚀 Starting analytics API debugging...")
    
    test_auth_endpoint()
    test_endpoint_without_params()
    test_analytics_endpoint()
    
    print("\n✅ Debugging complete!")