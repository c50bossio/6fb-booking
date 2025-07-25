#!/usr/bin/env python3
"""
Quick debug script to test login functionality
"""

import asyncio
import httpx
import json

async def main():
    print("🔍 Testing login functionality...")
    
    # Test the working test user
    login_data = {
        "email": "test@bookedbarber.com",
        "password": "password123"
    }
    
    print(f"Attempting login with: {login_data['email']}")
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "http://localhost:8000/api/v2/auth/login",
            json=login_data,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"Status Code: {response.status_code}")
        print(f"Headers: {dict(response.headers)}")
        
        try:
            response_data = response.json()
            print(f"Response: {json.dumps(response_data, indent=2)}")
        except Exception as e:
            print(f"Response text: {response.text}")
            print(f"JSON parse error: {e}")
    
    # Also test with a nonexistent user to see the error format
    print("\n🔍 Testing with invalid credentials...")
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "http://localhost:8000/api/v2/auth/login",
            json={"email": "nonexistent@test.com", "password": "wrong"},
            headers={"Content-Type": "application/json"}
        )
        
        print(f"Status Code: {response.status_code}")
        try:
            response_data = response.json()
            print(f"Error Response: {json.dumps(response_data, indent=2)}")
        except Exception as e:
            print(f"Response text: {response.text}")

if __name__ == "__main__":
    asyncio.run(main())