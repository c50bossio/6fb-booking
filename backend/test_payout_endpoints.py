#!/usr/bin/env python3
"""
Comprehensive test suite for payout API endpoints
Tests all payout functionality including listing, processing, and cancellation
"""

import os
import sys
import json
import requests
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Dict, Any, List

# Add backend to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from config.database import SessionLocal, engine
from models.user import User
from models.barber import Barber
from models.barber_payment import (
    BarberPaymentModel,
    CommissionPayment,
    PaymentStatus,
    PaymentType,
)
from utils.security import get_password_hash
from sqlalchemy import text

# Base URL for API
BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000")

# Test user credentials
TEST_ADMIN_EMAIL = "admin@6fb.com"
TEST_ADMIN_PASSWORD = "admin123"
TEST_BARBER_EMAIL = "barber1@6fb.com"
TEST_BARBER_PASSWORD = "barber123"


# Colors for output
class Colors:
    GREEN = "\033[92m"
    RED = "\033[91m"
    YELLOW = "\033[93m"
    BLUE = "\033[94m"
    RESET = "\033[0m"


def print_test_header(test_name: str):
    """Print a formatted test header"""
    print(f"\n{Colors.BLUE}{'='*60}{Colors.RESET}")
    print(f"{Colors.BLUE}🧪 {test_name}{Colors.RESET}")
    print(f"{Colors.BLUE}{'='*60}{Colors.RESET}")


def print_success(message: str):
    """Print success message"""
    print(f"{Colors.GREEN}✅ {message}{Colors.RESET}")


def print_error(message: str):
    """Print error message"""
    print(f"{Colors.RED}❌ {message}{Colors.RESET}")


def print_info(message: str):
    """Print info message"""
    print(f"{Colors.YELLOW}ℹ️  {message}{Colors.RESET}")


def setup_test_data():
    """Set up test data in the database"""
    print_test_header("Setting up test data")

    db = SessionLocal()
    try:
        # Clear existing test data
        db.execute(
            text(
                "DELETE FROM commission_payments WHERE barber_id IN (SELECT id FROM barbers WHERE name LIKE 'Test Barber%')"
            )
        )
        db.execute(
            text(
                "DELETE FROM barber_payment_models WHERE barber_id IN (SELECT id FROM barbers WHERE name LIKE 'Test Barber%')"
            )
        )
        db.execute(text("DELETE FROM barbers WHERE name LIKE 'Test Barber%'"))
        db.execute(
            text("DELETE FROM users WHERE email IN (:admin_email, :barber_email)"),
            {"admin_email": TEST_ADMIN_EMAIL, "barber_email": TEST_BARBER_EMAIL},
        )
        db.commit()

        # Create admin user
        admin_user = User(
            email=TEST_ADMIN_EMAIL,
            first_name="Admin",
            last_name="User",
            hashed_password=get_password_hash(TEST_ADMIN_PASSWORD),
            role="super_admin",
            is_active=True,
        )
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)
        print_success(f"Created admin user: {admin_user.email}")

        # Create barber user
        barber_user = User(
            email=TEST_BARBER_EMAIL,
            first_name="Test",
            last_name="Barber",
            hashed_password=get_password_hash(TEST_BARBER_PASSWORD),
            role="barber",
            is_active=True,
        )
        db.add(barber_user)
        db.commit()
        db.refresh(barber_user)
        print_success(f"Created barber user: {barber_user.email}")

        # Create barbers with different payment setups
        barbers_data = [
            {
                "name": "Test Barber 1 - Stripe Connected",
                "user_id": barber_user.id,
                "stripe_account_id": "acct_1RcDzPAKiRITDSzw",  # Test account ID
                "payment_status": PaymentStatus.PENDING,
            },
            {
                "name": "Test Barber 2 - No Stripe",
                "user_id": None,
                "stripe_account_id": None,
                "payment_status": PaymentStatus.PENDING,
            },
            {
                "name": "Test Barber 3 - Completed Payouts",
                "user_id": None,
                "stripe_account_id": "acct_test123",
                "payment_status": PaymentStatus.PAID,
            },
        ]

        barbers = []
        for barber_data in barbers_data:
            barber = Barber(
                name=barber_data["name"],
                email=f"{barber_data['name'].replace(' ', '_').lower()}@test.com",
                phone="+1234567890",
                user_id=barber_data["user_id"],
                stripe_account_id=barber_data["stripe_account_id"],
            )
            db.add(barber)
            db.commit()
            db.refresh(barber)
            barbers.append(barber)
            print_success(f"Created barber: {barber.name}")

        # Create payment models for barbers
        for i, barber in enumerate(barbers):
            payment_model = BarberPaymentModel(
                barber_id=barber.id,
                payment_type=PaymentType.COMMISSION,
                service_commission_rate=0.7,  # 70% commission
                product_commission_rate=0.5,  # 50% for products
                booth_rent_amount=0,
                payment_frequency="weekly",
                stripe_connect_account_id=barber.stripe_account_id,
                active=True,
            )
            db.add(payment_model)
            db.commit()
            db.refresh(payment_model)

            # Create commission payments for testing
            if i == 0:  # First barber - pending payouts
                for j in range(3):
                    commission = CommissionPayment(
                        payment_model_id=payment_model.id,
                        barber_id=barber.id,
                        period_start=datetime.utcnow() - timedelta(days=14 + j * 7),
                        period_end=datetime.utcnow() - timedelta(days=7 + j * 7),
                        service_revenue=1000.00,
                        service_commission_rate=0.7,
                        service_commission_amount=700.00,
                        product_revenue=200.00,
                        product_commission_rate=0.5,
                        product_commission_amount=100.00,
                        total_commission=800.00,
                        total_paid=800.00,
                        shop_owner_amount=400.00,
                        barber_amount=800.00,
                        status=PaymentStatus.PENDING,
                        payment_method="stripe_connect",
                    )
                    db.add(commission)

            elif i == 1:  # Second barber - mixed statuses
                statuses = [
                    PaymentStatus.PENDING,
                    PaymentStatus.OVERDUE,
                    PaymentStatus.CANCELLED,
                ]
                for j, status in enumerate(statuses):
                    commission = CommissionPayment(
                        payment_model_id=payment_model.id,
                        barber_id=barber.id,
                        period_start=datetime.utcnow() - timedelta(days=14 + j * 7),
                        period_end=datetime.utcnow() - timedelta(days=7 + j * 7),
                        service_revenue=500.00,
                        service_commission_rate=0.7,
                        service_commission_amount=350.00,
                        product_revenue=0,
                        product_commission_rate=0,
                        product_commission_amount=0,
                        total_commission=350.00,
                        total_paid=350.00,
                        shop_owner_amount=150.00,
                        barber_amount=350.00,
                        status=status,
                        payment_method="manual",
                    )
                    db.add(commission)

            elif i == 2:  # Third barber - completed payouts
                for j in range(2):
                    commission = CommissionPayment(
                        payment_model_id=payment_model.id,
                        barber_id=barber.id,
                        period_start=datetime.utcnow() - timedelta(days=28 + j * 7),
                        period_end=datetime.utcnow() - timedelta(days=21 + j * 7),
                        service_revenue=1500.00,
                        service_commission_rate=0.7,
                        service_commission_amount=1050.00,
                        product_revenue=300.00,
                        product_commission_rate=0.5,
                        product_commission_amount=150.00,
                        total_commission=1200.00,
                        total_paid=1200.00,
                        shop_owner_amount=600.00,
                        barber_amount=1200.00,
                        status=PaymentStatus.PAID,
                        payment_method="stripe_connect",
                        paid_date=datetime.utcnow() - timedelta(days=20 + j * 7),
                        stripe_transfer_id=f"tr_test_{j+1}",
                    )
                    db.add(commission)

        db.commit()
        print_success("Test data setup complete")

        return {
            "admin_user": admin_user,
            "barber_user": barber_user,
            "barbers": barbers,
        }

    except Exception as e:
        db.rollback()
        print_error(f"Error setting up test data: {str(e)}")
        raise
    finally:
        db.close()


def get_auth_token(email: str, password: str) -> str:
    """Get authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/v1/auth/login", json={"email": email, "password": password}
    )
    if response.status_code == 200:
        return response.json()["access_token"]
    else:
        raise Exception(f"Failed to login: {response.text}")


def test_get_payouts_list(token: str):
    """Test GET /api/v1/payouts endpoint"""
    print_test_header("Testing GET /api/v1/payouts")

    headers = {"Authorization": f"Bearer {token}"}

    # Test 1: Get all payouts
    response = requests.get(f"{BASE_URL}/api/v1/payouts", headers=headers)
    if response.status_code == 200:
        data = response.json()
        print_success(f"Retrieved {len(data['payouts'])} payouts")
        print_info(f"Stats: {json.dumps(data['stats'], indent=2)}")

        # Verify response structure
        assert "payouts" in data
        assert "stats" in data
        assert "total_pending" in data["stats"]
        assert "total_completed" in data["stats"]

        # Test individual payout structure
        if data["payouts"]:
            payout = data["payouts"][0]
            required_fields = [
                "id",
                "barber_id",
                "barber_name",
                "amount",
                "fee",
                "net_amount",
                "status",
                "payment_method",
                "payout_date",
                "created_at",
            ]
            for field in required_fields:
                assert field in payout, f"Missing field: {field}"
            print_success("Payout response structure is valid")
    else:
        print_error(f"Failed to get payouts: {response.text}")
        return False

    # Test 2: Filter by status
    print_info("\nTesting status filter...")
    response = requests.get(
        f"{BASE_URL}/api/v1/payouts?status=pending", headers=headers
    )
    if response.status_code == 200:
        data = response.json()
        pending_count = len([p for p in data["payouts"] if p["status"] == "pending"])
        print_success(f"Filter by status=pending returned {pending_count} payouts")
    else:
        print_error(f"Failed to filter by status: {response.text}")

    # Test 3: Filter by barber_id
    print_info("\nTesting barber_id filter...")
    if test_data and test_data["barbers"]:
        barber_id = test_data["barbers"][0].id
        response = requests.get(
            f"{BASE_URL}/api/v1/payouts?barber_id={barber_id}", headers=headers
        )
        if response.status_code == 200:
            data = response.json()
            print_success(
                f"Filter by barber_id={barber_id} returned {len(data['payouts'])} payouts"
            )
        else:
            print_error(f"Failed to filter by barber_id: {response.text}")

    # Test 4: Date range filter
    print_info("\nTesting date range filter...")
    start_date = (datetime.utcnow() - timedelta(days=30)).isoformat()
    end_date = datetime.utcnow().isoformat()
    response = requests.get(
        f"{BASE_URL}/api/v1/payouts?start_date={start_date}&end_date={end_date}",
        headers=headers,
    )
    if response.status_code == 200:
        data = response.json()
        print_success(f"Date range filter returned {len(data['payouts'])} payouts")
    else:
        print_error(f"Failed to filter by date range: {response.text}")

    return True


def test_process_payout(token: str, payout_id: str):
    """Test POST /api/v1/payouts/{payout_id}/process endpoint"""
    print_test_header(f"Testing POST /api/v1/payouts/{payout_id}/process")

    headers = {"Authorization": f"Bearer {token}"}

    response = requests.post(
        f"{BASE_URL}/api/v1/payouts/{payout_id}/process", headers=headers
    )

    if response.status_code == 200:
        data = response.json()
        print_success(f"Payout processed successfully: {data['message']}")
        return True
    elif response.status_code == 400:
        print_info(
            f"Expected error (no real Stripe account): {response.json()['detail']}"
        )
        return True  # This is expected in test environment
    else:
        print_error(f"Failed to process payout: {response.text}")
        return False


def test_cancel_payout(token: str, payout_id: str):
    """Test POST /api/v1/payouts/{payout_id}/cancel endpoint"""
    print_test_header(f"Testing POST /api/v1/payouts/{payout_id}/cancel")

    headers = {"Authorization": f"Bearer {token}"}

    response = requests.post(
        f"{BASE_URL}/api/v1/payouts/{payout_id}/cancel", headers=headers
    )

    if response.status_code == 200:
        data = response.json()
        print_success(f"Payout cancelled successfully: {data['message']}")
        return True
    else:
        print_error(f"Failed to cancel payout: {response.text}")
        return False


def test_create_manual_payout(token: str, barber_id: int):
    """Test POST /api/v1/payouts/barbers/payout endpoint"""
    print_test_header("Testing POST /api/v1/payouts/barbers/payout")

    headers = {"Authorization": f"Bearer {token}"}

    payout_data = {
        "barber_id": barber_id,
        "amount": 250.50,
        "method": "manual",
        "description": "Test manual payout",
    }

    response = requests.post(
        f"{BASE_URL}/api/v1/payouts/barbers/payout", headers=headers, json=payout_data
    )

    if response.status_code == 200:
        data = response.json()
        print_success(f"Manual payout created: {data['message']}")
        print_info(f"Payout ID: {data['payout_id']}")
        return data["payout_id"]
    else:
        print_error(f"Failed to create manual payout: {response.text}")
        return None


def test_barber_access(barber_token: str):
    """Test barber's access to their own payouts"""
    print_test_header("Testing Barber Access to Own Payouts")

    headers = {"Authorization": f"Bearer {barber_token}"}

    response = requests.get(f"{BASE_URL}/api/v1/payouts", headers=headers)

    if response.status_code == 200:
        data = response.json()
        print_success(f"Barber can view their payouts: {len(data['payouts'])} found")

        # Verify barber only sees their own payouts
        if data["payouts"]:
            barber_ids = set(p["barber_id"] for p in data["payouts"])
            if len(barber_ids) == 1:
                print_success("Barber only sees their own payouts")
            else:
                print_error("Barber sees payouts from multiple barbers!")
    else:
        print_error(f"Barber cannot access payouts: {response.text}")


def test_unauthorized_access():
    """Test unauthorized access to payouts"""
    print_test_header("Testing Unauthorized Access")

    # Test without token
    response = requests.get(f"{BASE_URL}/api/v1/payouts")

    if response.status_code == 401:
        print_success("Unauthorized access properly blocked")
    else:
        print_error(
            f"Unexpected response for unauthorized access: {response.status_code}"
        )


def test_invalid_payout_operations(token: str):
    """Test invalid payout operations"""
    print_test_header("Testing Invalid Payout Operations")

    headers = {"Authorization": f"Bearer {token}"}

    # Test 1: Process non-existent payout
    print_info("Testing non-existent payout...")
    response = requests.post(
        f"{BASE_URL}/api/v1/payouts/99999/process", headers=headers
    )
    if response.status_code == 404:
        print_success("Non-existent payout properly returns 404")
    else:
        print_error(f"Unexpected response: {response.status_code}")

    # Test 2: Cancel already paid payout
    print_info("\nTesting cancel on completed payout...")
    # First get a completed payout
    response = requests.get(
        f"{BASE_URL}/api/v1/payouts?status=completed", headers=headers
    )
    if response.status_code == 200 and response.json()["payouts"]:
        completed_payout_id = response.json()["payouts"][0]["id"]
        response = requests.post(
            f"{BASE_URL}/api/v1/payouts/{completed_payout_id}/cancel", headers=headers
        )
        if response.status_code == 400:
            print_success("Cannot cancel completed payout - properly blocked")
        else:
            print_error(f"Unexpected response: {response.status_code}")

    # Test 3: Create payout for non-existent barber
    print_info("\nTesting payout for non-existent barber...")
    response = requests.post(
        f"{BASE_URL}/api/v1/payouts/barbers/payout",
        headers=headers,
        json={"barber_id": 99999, "amount": 100, "method": "manual"},
    )
    if response.status_code == 404:
        print_success("Non-existent barber properly returns 404")
    else:
        print_error(f"Unexpected response: {response.status_code}")


def run_all_tests():
    """Run all payout endpoint tests"""
    print(f"\n{Colors.BLUE}{'='*60}{Colors.RESET}")
    print(f"{Colors.BLUE}🚀 Starting Payout API Tests{Colors.RESET}")
    print(f"{Colors.BLUE}{'='*60}{Colors.RESET}")

    try:
        # Setup test data
        global test_data
        test_data = setup_test_data()

        # Get auth tokens
        print_info("\nGetting authentication tokens...")
        admin_token = get_auth_token(TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD)
        print_success("Admin token obtained")

        barber_token = get_auth_token(TEST_BARBER_EMAIL, TEST_BARBER_PASSWORD)
        print_success("Barber token obtained")

        # Run tests
        test_results = []

        # Test 1: Get payouts list
        test_results.append(("Get Payouts List", test_get_payouts_list(admin_token)))

        # Test 2: Test unauthorized access
        test_results.append(("Unauthorized Access", test_unauthorized_access()))

        # Test 3: Test barber access
        test_results.append(("Barber Access", test_barber_access(barber_token)))

        # Get a pending payout for testing
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(
            f"{BASE_URL}/api/v1/payouts?status=pending", headers=headers
        )
        if response.status_code == 200 and response.json()["payouts"]:
            pending_payout_id = response.json()["payouts"][0]["id"]

            # Test 4: Process payout
            test_results.append(
                ("Process Payout", test_process_payout(admin_token, pending_payout_id))
            )

            # Test 5: Cancel payout (use a different pending payout)
            if len(response.json()["payouts"]) > 1:
                cancel_payout_id = response.json()["payouts"][1]["id"]
                test_results.append(
                    ("Cancel Payout", test_cancel_payout(admin_token, cancel_payout_id))
                )

        # Test 6: Create manual payout
        if test_data and test_data["barbers"]:
            barber_id = test_data["barbers"][0].id
            manual_payout_id = test_create_manual_payout(admin_token, barber_id)
            test_results.append(("Create Manual Payout", manual_payout_id is not None))

        # Test 7: Invalid operations
        test_results.append(
            ("Invalid Operations", test_invalid_payout_operations(admin_token))
        )

        # Print summary
        print(f"\n{Colors.BLUE}{'='*60}{Colors.RESET}")
        print(f"{Colors.BLUE}📊 Test Summary{Colors.RESET}")
        print(f"{Colors.BLUE}{'='*60}{Colors.RESET}")

        passed = sum(1 for _, result in test_results if result)
        total = len(test_results)

        for test_name, result in test_results:
            status = (
                f"{Colors.GREEN}✅ PASSED{Colors.RESET}"
                if result
                else f"{Colors.RED}❌ FAILED{Colors.RESET}"
            )
            print(f"{test_name}: {status}")

        print(f"\n{Colors.BLUE}Total: {passed}/{total} tests passed{Colors.RESET}")

        if passed == total:
            print(f"\n{Colors.GREEN}🎉 All tests passed!{Colors.RESET}")
        else:
            print(f"\n{Colors.RED}⚠️  Some tests failed!{Colors.RESET}")

        return passed == total

    except Exception as e:
        print_error(f"Test suite failed with error: {str(e)}")
        return False


if __name__ == "__main__":
    # Check if server is running
    try:
        response = requests.get(f"{BASE_URL}/health")
        if response.status_code != 200:
            print_error(
                "Server is not running! Start it with: uvicorn main:app --reload"
            )
            sys.exit(1)
    except requests.exceptions.ConnectionError:
        print_error(
            "Cannot connect to server! Start it with: uvicorn main:app --reload"
        )
        sys.exit(1)

    # Run tests
    success = run_all_tests()
    sys.exit(0 if success else 1)
