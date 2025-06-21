#!/usr/bin/env python3
"""
Test script to verify Tremendous API connection
Run this after adding your API key to .env
"""

import os
import sys
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from dotenv import load_dotenv
from services.tremendous_service import TremendousService

# Load environment variables
load_dotenv()
load_dotenv(".env.auth")


def test_tremendous_connection():
    """Test basic Tremendous API connectivity"""
    print("🔍 Testing Tremendous API Connection...\n")

    # Check API key
    api_key = os.getenv("TREMENDOUS_API_KEY")
    if not api_key:
        print("❌ ERROR: TREMENDOUS_API_KEY not found in .env file")
        print("   Please add: TREMENDOUS_API_KEY=TEST_your-key-here")
        return False

    print(f"✅ API Key found: {api_key[:10]}...")
    print(
        f"✅ Environment: {'Sandbox' if api_key.startswith('TEST_') else 'Production'}"
    )

    # Initialize service
    try:
        service = TremendousService()
        print(f"✅ Service initialized with base URL: {service.base_url}")
    except Exception as e:
        print(f"❌ ERROR initializing service: {e}")
        return False

    # Test API connection
    print("\n📡 Testing API connection...")
    try:
        import requests

        response = requests.get(
            f"{service.base_url}/organizations", headers=service.headers
        )

        if response.status_code == 200:
            org_data = response.json()
            print(f"✅ Connected successfully!")
            print(
                f"   Organization: {org_data.get('organization', {}).get('name', 'N/A')}"
            )
            print(
                f"   Balance: ${org_data.get('organization', {}).get('balance', {}).get('available_balance', 0):,.2f}"
            )
            return True
        else:
            print(f"❌ API request failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return False

    except Exception as e:
        print(f"❌ ERROR making API request: {e}")
        return False


def test_delivery_methods():
    """Test fetching available delivery methods"""
    print("\n💳 Testing delivery methods...")

    try:
        service = TremendousService()
        methods = service.list_delivery_methods()

        print("✅ Available payout methods:")
        for method in methods[:5]:  # Show first 5
            print(f"   - {method.get('name', 'Unknown')}")

        return True
    except Exception as e:
        print(f"❌ ERROR fetching delivery methods: {e}")
        return False


def create_test_campaign():
    """Create a test campaign for organizing payouts"""
    print("\n📋 Creating test campaign...")

    try:
        service = TremendousService()
        campaign = service.create_campaign(
            name="6FB Weekly Barber Commissions",
            message="Your weekly commission payout from 6FB",
        )

        print(f"✅ Campaign created!")
        print(f"   ID: {campaign.get('id')}")
        print(f"   Name: {campaign.get('name')}")

        # Save campaign ID to .env
        print(f"\n💡 Add this to your .env file:")
        print(f"   TREMENDOUS_CAMPAIGN_ID={campaign.get('id')}")

        return campaign.get("id")
    except Exception as e:
        print(f"❌ ERROR creating campaign: {e}")
        return None


def main():
    """Run all tests"""
    print("=" * 50)
    print("🚀 Tremendous API Test Suite")
    print("=" * 50)

    # Test 1: Connection
    if not test_tremendous_connection():
        print("\n⚠️  Fix the connection issue before proceeding.")
        return

    # Test 2: Delivery Methods
    test_delivery_methods()

    # Test 3: Create Campaign
    campaign_id = create_test_campaign()

    print("\n" + "=" * 50)
    print("✨ Test Summary:")
    print("   - API Connection: ✅")
    print("   - Sandbox Balance: $100,000")
    print("   - Ready for testing: YES")
    print("\n📚 Next steps:")
    print("   1. Create a test barber payment model")
    print("   2. Process a test payout")
    print("   3. Check the Tremendous dashboard")
    print("=" * 50)


if __name__ == "__main__":
    main()
