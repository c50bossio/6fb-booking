#!/usr/bin/env python3
"""
Test authentication directly to verify it works
"""
import sys
sys.path.append('.')

from fastapi import FastAPI
from fastapi.testclient import TestClient
from routers.auth_simple import router as auth_router

# Create a minimal FastAPI app for testing
app = FastAPI()
app.include_router(auth_router, prefix="/api/v2")

# Create test client
client = TestClient(app)

# Test login endpoint
def test_login():
    print("Testing login endpoint...")
    response = client.post(
        "/api/v2/auth-simple/login",
        json={"email": "admin@bookedbarber.com", "password": "password123"}
    )
    
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.json()}")
    
    if response.status_code == 200:
        data = response.json()
        print("✅ Login successful!")
        print(f"Access token: {data.get('access_token', 'Not found')[:50]}...")
        print(f"Token type: {data.get('token_type', 'Not found')}")
    else:
        print("❌ Login failed!")
        print(f"Error: {response.json()}")

if __name__ == "__main__":
    test_login()