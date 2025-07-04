#!/usr/bin/env python3
"""
Simple script to populate agent templates via the API
"""

import requests
import json

API_URL = "http://localhost:8000"

# First, let's create a simple test to see if our agent system works
AGENT_TEMPLATES = [
    {
        "name": "Rebooking Agent",
        "agent_type": "rebooking",
        "description": "Automatically reach out to clients for their next appointment using proven 6FB rebooking strategies",
        "prompt_template": "You are a professional barbershop assistant helping with rebooking appointments.",
        "default_config": {
            "rebooking_intervals": {"default": 28},
            "max_conversations_per_run": 50,
            "supported_channels": ["sms", "email"]
        },
        "is_active": True
    },
    {
        "name": "Birthday Wishes Agent", 
        "agent_type": "birthday_wishes",
        "description": "Send personalized birthday messages with special offers to drive bookings",
        "prompt_template": "You are sending a birthday message to a valued barbershop client.",
        "default_config": {
            "birthday_discount": 20,
            "max_conversations_per_run": 25,
            "supported_channels": ["sms", "email"]
        },
        "is_active": True
    }
]

def test_api_connectivity():
    """Test if the API is running"""
    try:
        response = requests.get(f"{API_URL}/health")
        if response.status_code == 200:
            print("✅ API is running")
            return True
        else:
            print(f"❌ API health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Cannot connect to API: {e}")
        return False

def test_agent_endpoints():
    """Test agent endpoints without authentication"""
    try:
        # Test agent templates endpoint
        response = requests.get(f"{API_URL}/api/v1/agents/templates")
        print(f"📋 Agent templates endpoint: {response.status_code}")
        if response.status_code == 200:
            templates = response.json()
            print(f"   Found {len(templates)} templates")
            for template in templates:
                print(f"   - {template.get('name', 'Unknown')}: {template.get('agent_type', 'Unknown')}")
        
        # Test AI providers endpoint  
        response = requests.get(f"{API_URL}/api/v1/agents/providers")
        print(f"🤖 AI providers endpoint: {response.status_code}")
        if response.status_code == 200:
            providers = response.json()
            print(f"   Available providers: {providers.get('available_providers', [])}")
        
        return True
    except Exception as e:
        print(f"❌ Error testing endpoints: {e}")
        return False

def main():
    """Main function to test the agent system"""
    print("🚀 Testing AI Agent System...")
    
    if not test_api_connectivity():
        print("\n❌ API is not running. Please start the backend with:")
        print("   uvicorn main:app --reload")
        return
    
    print("\n📡 Testing Agent API endpoints...")
    test_agent_endpoints()
    
    print("\n✅ Agent system test completed!")
    print("\nTo test the frontend:")
    print("1. Start the frontend: npm run dev")
    print("2. Visit http://localhost:3000/agents")
    print("3. Try creating an agent")

if __name__ == "__main__":
    main()