#!/usr/bin/env python3
"""
Monitor Render deployment progress for V2 API endpoints
"""

import requests
import json
import time
from datetime import datetime

def check_deployment_status():
    """Check if V2 endpoints are deployed"""
    base_url = "https://sixfb-backend-v2.onrender.com"
    
    print(f"🕐 {datetime.now().strftime('%H:%M:%S')} - Checking deployment status...")
    
    try:
        # Check OpenAPI spec for V2 endpoints
        response = requests.get(f"{base_url}/openapi.json", timeout=10)
        if response.status_code == 200:
            data = response.json()
            paths = data.get('paths', {})
            v2_paths = [path for path in paths.keys() if '/api/v2/' in path]
            v2_auth_paths = [path for path in paths.keys() if '/api/v2/auth' in path]
            
            print(f"  📊 Total endpoints: {len(paths)}")
            print(f"  📊 V2 endpoints: {len(v2_paths)}")
            print(f"  🔐 V2 auth endpoints: {len(v2_auth_paths)}")
            
            if v2_auth_paths:
                print("  ✅ V2 auth endpoints found:")
                for path in sorted(v2_auth_paths):
                    print(f"    {path}")
                return True
            else:
                print("  ⏳ V2 endpoints not yet deployed")
                return False
        else:
            print(f"  ❌ OpenAPI spec error: {response.status_code}")
            return False
            
    except requests.RequestException as e:
        print(f"  ❌ Connection error: {e}")
        return False

def test_v2_auth_endpoint():
    """Test V2 auth endpoint directly"""
    url = "https://sixfb-backend-v2.onrender.com/api/v2/auth/login"
    
    try:
        response = requests.post(
            url,
            json={"email": "test@example.com", "password": "wrongpassword"},
            timeout=10
        )
        
        if response.status_code == 404:
            print(f"  ❌ V2 auth endpoint still returns 404")
            return False
        elif response.status_code in [400, 422]:
            print(f"  ✅ V2 auth endpoint is working! (Status: {response.status_code})")
            print(f"    Response: {response.json()}")
            return True
        else:
            print(f"  ⚠️ Unexpected response: {response.status_code}")
            return False
            
    except requests.RequestException as e:
        print(f"  ❌ Auth endpoint test error: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Monitoring Render deployment for V2 API endpoints...")
    print(f"📍 Target: https://sixfb-backend-v2.onrender.com/api/v2/auth/*")
    print(f"⏰ Started: {datetime.now()}")
    print("-" * 60)
    
    max_attempts = 30  # 15 minutes max
    attempt = 0
    
    while attempt < max_attempts:
        attempt += 1
        
        # Check OpenAPI spec
        v2_deployed = check_deployment_status()
        
        if v2_deployed:
            print("\n🎉 SUCCESS: V2 endpoints are deployed!")
            break
        
        # Also test direct endpoint
        auth_working = test_v2_auth_endpoint()
        if auth_working:
            print("\n🎉 SUCCESS: V2 auth endpoint is responding!")
            break
        
        if attempt < max_attempts:
            print(f"  ⏳ Waiting 30 seconds... (attempt {attempt}/{max_attempts})")
            time.sleep(30)
        
    if attempt >= max_attempts:
        print(f"\n⏰ TIMEOUT: V2 endpoints not deployed after {max_attempts * 30 // 60} minutes")
        print("This might indicate a deployment issue that needs investigation.")
    
    print(f"\n📊 Final status at {datetime.now()}")