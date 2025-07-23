#!/usr/bin/env python3
"""
Test OAuth API endpoints directly
"""

import asyncio
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

async def test_oauth_api():
    print("🧪 Testing OAuth API Endpoints Directly")
    print("=" * 50)
    
    # Test imports
    try:
        from api.v1.oauth import router
        from fastapi.testclient import TestClient
        from fastapi import FastAPI
        
        # Create test app
        app = FastAPI()
        app.include_router(router, prefix="/api/v1")
        
        # Create test client
        client = TestClient(app)
        
        print("✅ API imports successful")
        
        # Test config status endpoint
        print("\n📋 Testing /api/v1/oauth/config/status")
        response = client.get("/api/v1/oauth/config/status")
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        
        # Test OAuth providers endpoint
        print("\n📋 Testing /api/v1/oauth/providers")
        response = client.get("/api/v1/oauth/providers")
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        
        # Test Google OAuth initiation
        print("\n📋 Testing /api/v1/oauth/initiate/google")
        response = client.post("/api/v1/oauth/initiate/google")
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        
        # Test Facebook OAuth initiation
        print("\n📋 Testing /api/v1/oauth/initiate/facebook")
        response = client.post("/api/v1/oauth/initiate/facebook")
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        
    except Exception as e:
        print(f"❌ Error testing OAuth API: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_oauth_api())