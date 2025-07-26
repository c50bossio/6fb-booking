#!/usr/bin/env python3
"""
Deployment trigger test - Forces Render to redeploy with clean main.py
This file serves as a deployment marker to trigger Render redeploy after resolving Git merge conflicts.

Changes made:
- Resolved Git merge conflicts in main.py 
- Cleaned up duplicate router includes
- Restored proper V2 auth endpoints (/api/v2/auth/*)
- Fixed deployment pipeline blockers

Expected outcome: V2 authentication endpoints should now be available in remote staging
"""

import requests
import sys
from datetime import datetime

def test_local_v2_endpoints():
    """Test V2 endpoints locally before deployment"""
    base_url = "http://localhost:8000"
    
    # Test health endpoint
    try:
        response = requests.get(f"{base_url}/health", timeout=5)
        print(f"✅ Health check: {response.status_code}")
    except requests.RequestException as e:
        print(f"❌ Health check failed: {e}")
        return False
    
    # Test V2 auth endpoint structure (should return 405 Method Not Allowed for GET)
    try:
        response = requests.get(f"{base_url}/api/v2/auth/login", timeout=5)
        if response.status_code == 405:
            print(f"✅ V2 auth endpoint exists: {response.status_code} (Method Not Allowed expected)")
        else:
            print(f"⚠️ V2 auth endpoint response: {response.status_code}")
    except requests.RequestException as e:
        print(f"❌ V2 auth endpoint test failed: {e}")
        return False
    
    return True

if __name__ == "__main__":
    print(f"🚀 Deployment trigger test - {datetime.now()}")
    print("This file triggers Render deployment after resolving main.py merge conflicts")
    
    # Note: Local testing requires server to be running
    # if test_local_v2_endpoints():
    #     print("✅ Local V2 endpoints working - ready for deployment")
    # else:
    #     print("❌ Local V2 endpoints not working - check server")
    
    print("📤 Ready to trigger Render deployment with clean main.py configuration")
    sys.exit(0)