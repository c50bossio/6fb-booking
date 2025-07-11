#!/usr/bin/env python3
"""Test integration status and management"""

import requests
import json

BASE_URL = "http://localhost:8000"

def get_auth_token():
    """Get authentication token"""
    login_data = {
        "email": "test@example.com",
        "password": "testpassword123"
    }
    
    response = requests.post(f"{BASE_URL}/api/v1/auth/login", json=login_data)
    if response.status_code == 200:
        return response.json().get("access_token")
    return None

def main():
    print("🚀 Testing Integration Status and Management")
    print("=" * 50)
    
    token = get_auth_token()
    if not token:
        print("❌ Failed to authenticate")
        return
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Get integration status
    print("\n📊 Checking Integration Status...")
    status_response = requests.get(
        f"{BASE_URL}/api/v1/integrations/status", 
        headers=headers
    )
    
    if status_response.status_code == 200:
        integrations = status_response.json()
        print(f"✅ Found {len(integrations)} configured integrations:")
        for integration in integrations:
            print(f"\n   Integration: {integration.get('integration_type', 'Unknown')}")
            print(f"   - Status: {integration.get('status', 'Unknown')}")
            print(f"   - Connected: {integration.get('is_connected', False)}")
            print(f"   - Last Sync: {integration.get('last_sync_at', 'Never')}")
    else:
        print(f"❌ Failed to get status: {status_response.status_code}")
    
    # Check health status
    print("\n🏥 Checking Integration Health...")
    health_response = requests.get(
        f"{BASE_URL}/api/v1/integrations/health/all",
        headers=headers
    )
    
    if health_response.status_code == 200:
        health_data = health_response.json()
        print(f"✅ Overall health: {health_data.get('overall_status', 'Unknown')}")
        print(f"   - Active: {health_data.get('active_count', 0)}")
        print(f"   - Inactive: {health_data.get('inactive_count', 0)}")
        print(f"   - Error: {health_data.get('error_count', 0)}")
    else:
        print(f"❌ Failed to get health: {health_response.status_code}")

if __name__ == "__main__":
    main()