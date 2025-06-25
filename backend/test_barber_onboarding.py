#!/usr/bin/env python3
"""
Simple Test Script for Barber Onboarding with Stripe Connect
Tests the specific /payment-splits/connect-account endpoint
"""

import os
import sys
import json
import httpx
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configuration
BASE_URL = os.getenv("BASE_URL", "http://localhost:8000")
API_ENDPOINT = "/api/v1/payment-splits/connect-account"


def print_header(text: str):
    """Print formatted header"""
    print("\n" + "=" * 60)
    print(f"🔧 {text}")
    print("=" * 60)


def print_success(text: str):
    """Print success message"""
    print(f"✅ {text}")


def print_error(text: str):
    """Print error message"""
    print(f"❌ {text}")


def print_info(text: str):
    """Print info message"""
    print(f"ℹ️  {text}")


def test_environment_setup():
    """Test that required environment variables are set"""
    print_header("Checking Environment Setup")

    required_vars = ["STRIPE_SECRET_KEY", "STRIPE_CONNECT_CLIENT_ID"]

    all_good = True
    for var in required_vars:
        value = os.getenv(var)
        if not value:
            print_error(f"{var} is not set in environment")
            all_good = False
        else:
            # Show partial value for verification
            if var == "STRIPE_SECRET_KEY":
                print_success(
                    f"{var} is set (sk_{'live' if value.startswith('sk_live') else 'test'}...)"
                )
            elif var == "STRIPE_CONNECT_CLIENT_ID":
                print_success(f"{var} is set ({value[:10]}...)")

    if not all_good:
        print_error("\nPlease set the missing environment variables in your .env file")
        print_info(
            "You need both STRIPE_SECRET_KEY and STRIPE_CONNECT_CLIENT_ID for Stripe Connect"
        )
        return False

    return True


def test_backend_connection():
    """Test if the backend is running"""
    print_header("Testing Backend Connection")

    try:
        response = httpx.get(f"{BASE_URL}/health", timeout=30.0)
        if response.status_code == 200:
            print_success(f"Backend is running at {BASE_URL}")
            return True
        else:
            print_error(f"Backend responded with status {response.status_code}")
            return False
    except httpx.RequestError as e:
        print_error(f"Cannot connect to backend at {BASE_URL}")
        print_info(
            "Make sure the backend is running with: cd backend && uvicorn main:app --reload"
        )
        return False


def test_connect_account_endpoint():
    """Test the /payment-splits/connect-account endpoint"""
    print_header("Testing Connect Account Endpoint")

    url = f"{BASE_URL}{API_ENDPOINT}"
    print_info(f"Testing endpoint: {url}")

    # Test data for a barber
    test_data = {"barber_id": 1, "platform": "stripe"}

    print_info(f"Request payload: {json.dumps(test_data, indent=2)}")

    try:
        with httpx.Client(timeout=30.0) as client:
            response = client.post(url, json=test_data)

        print_info(f"Response status: {response.status_code}")

        if response.status_code == 200:
            data = response.json()
            print_success("OAuth URL generated successfully!")

            # Display the response
            print_info("\nResponse data:")
            print(json.dumps(data, indent=2))

            # Validate the OAuth URL
            oauth_url = data.get("oauth_url", "")
            if oauth_url and oauth_url.startswith(
                "https://connect.stripe.com/oauth/authorize"
            ):
                print_success("\nOAuth URL format is correct")

                # Show the URL for manual testing
                print_info("\n🔗 To test the barber onboarding flow:")
                print_info("1. Copy this URL and open it in a browser:")
                print(f"\n{oauth_url}\n")

                print_info("2. Complete the Stripe Connect onboarding process")
                print_info("3. You'll be redirected back to your application")
                print_info("4. The barber's account will be connected automatically")

                return True
            else:
                print_error("OAuth URL format is incorrect or missing")
                return False

        elif response.status_code == 422:
            print_error("Validation error - check your request data")
            try:
                error_data = response.json()
                print_info(f"Error details: {json.dumps(error_data, indent=2)}")
            except:
                print_info(f"Error response: {response.text}")
            return False

        else:
            print_error(f"Request failed with status {response.status_code}")
            try:
                error_data = response.json()
                print_info(f"Error details: {json.dumps(error_data, indent=2)}")
            except:
                print_info(f"Error response: {response.text}")
            return False

    except httpx.RequestError as e:
        print_error(f"Request failed: {str(e)}")
        return False


def test_with_different_platforms():
    """Test the endpoint with different platform values"""
    print_header("Testing Different Platforms")

    platforms = ["stripe", "square"]

    for platform in platforms:
        print_info(f"\nTesting with platform: {platform}")

        test_data = {"barber_id": 1, "platform": platform}

        try:
            with httpx.Client(timeout=30.0) as client:
                response = client.post(f"{BASE_URL}{API_ENDPOINT}", json=test_data)

            if response.status_code == 200:
                data = response.json()
                print_success(f"✅ {platform.capitalize()} OAuth URL generated")
                print_info(f"Platform: {data.get('platform', 'N/A')}")
                print_info(f"State token: {data.get('state_token', 'N/A')[:20]}...")
            else:
                print_error(
                    f"❌ {platform.capitalize()} failed with status {response.status_code}"
                )

        except Exception as e:
            print_error(f"❌ {platform.capitalize()} request failed: {str(e)}")


def test_invalid_inputs():
    """Test the endpoint with invalid inputs"""
    print_header("Testing Invalid Inputs")

    test_cases = [
        {
            "description": "Invalid platform",
            "data": {"barber_id": 1, "platform": "paypal"},
        },
        {"description": "Missing barber_id", "data": {"platform": "stripe"}},
        {
            "description": "Invalid barber_id type",
            "data": {"barber_id": "not_a_number", "platform": "stripe"},
        },
        {
            "description": "Negative barber_id",
            "data": {"barber_id": -1, "platform": "stripe"},
        },
    ]

    for test_case in test_cases:
        print_info(f"\nTesting: {test_case['description']}")

        try:
            with httpx.Client(timeout=30.0) as client:
                response = client.post(
                    f"{BASE_URL}{API_ENDPOINT}", json=test_case["data"]
                )

            if response.status_code == 400:
                print_success("✅ Correctly rejected invalid input")
            elif response.status_code == 422:
                print_success("✅ Validation error returned as expected")
            else:
                print_error(f"❌ Unexpected status code: {response.status_code}")

        except Exception as e:
            print_error(f"❌ Request failed: {str(e)}")


def main():
    """Main function to run all tests"""
    print_header("Barber Onboarding Test Suite")
    print_info(f"Target URL: {BASE_URL}")
    print_info(f"Test time: {datetime.now().isoformat()}")

    # Run tests in sequence
    if not test_environment_setup():
        print_error("\n🚫 Environment setup failed. Please fix the issues above.")
        return False

    if not test_backend_connection():
        print_error("\n🚫 Backend connection failed. Please start the backend server.")
        return False

    # Main test
    success = test_connect_account_endpoint()

    if success:
        # Additional tests
        test_with_different_platforms()
        test_invalid_inputs()

        print_header("✅ All Tests Completed Successfully")
        print_info("\nNext steps:")
        print_info("1. Use the OAuth URL above to connect a test Stripe account")
        print_info("2. Check that the callback is handled correctly")
        print_info("3. Verify the barber's account is saved in the database")
        print_info("4. Test payment processing with the connected account")

    else:
        print_header("❌ Tests Failed")
        print_info("\nTroubleshooting:")
        print_info("1. Check that your .env file has the correct Stripe keys")
        print_info("2. Ensure the backend server is running")
        print_info("3. Verify the database is set up correctly")
        print_info("4. Check the backend logs for detailed error messages")

    return success


if __name__ == "__main__":
    main()
