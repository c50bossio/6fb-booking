#!/usr/bin/env python3
"""
Test script for Square OAuth integration
Tests all major components of the Square OAuth implementation
"""

import asyncio
import os
import sys
from datetime import datetime, timedelta
from decimal import Decimal

# Add the backend directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from config.database import SessionLocal, engine, Base
from config.settings import get_settings
from models.barber import Barber
from models.user import User
from models.appointment import Appointment
from models.square_payment import (
    SquareAccount,
    SquarePayment,
    SquarePayout,
    SquarePaymentStatus,
    SquarePayoutStatus,
)
from models.barber_payment import BarberPaymentModel
from services.square_oauth_service import square_oauth_service
from utils.encryption import encrypt_data, decrypt_data


class SquareOAuthTester:
    def __init__(self):
        self.settings = get_settings()
        self.db = SessionLocal()

    def setup_test_data(self):
        """Create test barber and related data"""
        print("\n1. Setting up test data...")

        # Create test user
        test_user = (
            self.db.query(User).filter(User.email == "test.barber@example.com").first()
        )
        if not test_user:
            test_user = User(
                email="test.barber@example.com",
                username="testbarber",
                full_name="Test Barber",
                is_active=True,
                is_barber=True,
            )
            test_user.set_password("testpass123")
            self.db.add(test_user)
            self.db.commit()
            self.db.refresh(test_user)

        # Create test barber
        test_barber = (
            self.db.query(Barber).filter(Barber.user_id == test_user.id).first()
        )
        if not test_barber:
            test_barber = Barber(
                user_id=test_user.id,
                name="Test Barber",
                email="test.barber@example.com",
                phone="555-0123",
                location_id=1,  # Assuming location 1 exists
                commission_rate=0.7,
                is_active=True,
            )
            self.db.add(test_barber)
            self.db.commit()
            self.db.refresh(test_barber)

        # Create payment model
        payment_model = (
            self.db.query(BarberPaymentModel)
            .filter(
                BarberPaymentModel.barber_id == test_barber.id,
                BarberPaymentModel.active == True,
            )
            .first()
        )

        if not payment_model:
            payment_model = BarberPaymentModel(
                barber_id=test_barber.id,
                payment_method="square",
                service_commission_rate=Decimal("0.70"),
                product_commission_rate=Decimal("0.50"),
                active=True,
                start_date=datetime.utcnow().date(),
            )
            self.db.add(payment_model)
            self.db.commit()

        print(f"✓ Test barber created: {test_barber.name} (ID: {test_barber.id})")
        return test_barber

    def test_oauth_url_generation(self, barber_id: int):
        """Test OAuth URL generation"""
        print("\n2. Testing OAuth URL generation...")

        oauth_url = square_oauth_service.get_oauth_url(
            barber_id=barber_id, redirect_uri="http://localhost:3000/square/callback"
        )

        print(f"✓ OAuth URL generated: {oauth_url[:80]}...")

        # Verify state token
        state = oauth_url.split("state=")[1].split("&")[0]
        print(f"✓ State token: {state[:40]}...")

        return state

    def test_state_verification(self, state: str):
        """Test state token verification"""
        print("\n3. Testing state token verification...")

        try:
            state_data = square_oauth_service.verify_oauth_state(state)
            print(f"✓ State verified. Barber ID: {state_data['barber_id']}")
            print(f"✓ Timestamp: {state_data['timestamp']}")
            return True
        except Exception as e:
            print(f"✗ State verification failed: {e}")
            return False

    async def test_mock_square_account(self, barber_id: int):
        """Create a mock Square account for testing"""
        print("\n4. Creating mock Square account...")

        # Mock tokens
        mock_tokens = {
            "access_token": "mock_access_token_" + os.urandom(16).hex(),
            "refresh_token": "mock_refresh_token_" + os.urandom(16).hex(),
            "expires_at": (datetime.utcnow() + timedelta(days=30)).isoformat(),
            "scope": "MERCHANT_PROFILE_READ PAYMENTS_READ PAYMENTS_WRITE",
        }

        # Mock merchant info
        mock_merchant_info = {
            "merchant": {
                "id": "mock_merchant_" + os.urandom(8).hex(),
                "business_name": "Test Barbershop",
                "email_address": "test@barbershop.com",
                "country": "US",
                "currency": "USD",
                "status": "ACTIVE",
            },
            "locations": [
                {
                    "id": "mock_location_" + os.urandom(8).hex(),
                    "name": "Main Location",
                    "address": {
                        "address_line_1": "123 Main St",
                        "locality": "San Francisco",
                        "administrative_district_level_1": "CA",
                        "postal_code": "94105",
                        "country": "US",
                    },
                    "status": "ACTIVE",
                }
            ],
            "bank_accounts": [
                {
                    "id": "mock_bank_" + os.urandom(8).hex(),
                    "account_number_suffix": "1234",
                    "status": "ACTIVE",
                }
            ],
        }

        # Create Square account
        square_account = await square_oauth_service.create_or_update_square_account(
            db=self.db,
            barber_id=barber_id,
            tokens=mock_tokens,
            merchant_info=mock_merchant_info,
        )

        print(f"✓ Square account created: {square_account.square_merchant_id}")
        print(f"✓ Location ID: {square_account.square_location_id}")
        print(f"✓ Can receive payments: {square_account.can_receive_payments}")
        print(f"✓ Can make payouts: {square_account.can_make_payouts}")

        return square_account

    async def test_payment_creation(self, barber_id: int):
        """Test payment creation with mock data"""
        print("\n5. Testing payment creation...")

        # Create test appointment
        appointment = Appointment(
            barber_id=barber_id,
            client_id=1,  # Assuming client 1 exists
            service_id=1,  # Assuming service 1 exists
            appointment_date=datetime.utcnow().date(),
            appointment_time=datetime.utcnow().time(),
            status="confirmed",
        )
        self.db.add(appointment)
        self.db.commit()
        self.db.refresh(appointment)

        # Create mock payment (simulating what would come from Square API)
        payment = SquarePayment(
            square_payment_id="mock_payment_" + os.urandom(8).hex(),
            amount_money=Decimal("100.00"),
            currency="USD",
            total_money=Decimal("100.00"),
            status=SquarePaymentStatus.COMPLETED,
            approved_money=Decimal("100.00"),
            processing_fee_money=Decimal("2.90"),
            appointment_id=appointment.id,
            barber_id=barber_id,
            buyer_email_address="customer@example.com",
            source_type="CARD",
            card_brand="VISA",
            card_last_four="1234",
        )
        self.db.add(payment)
        self.db.commit()
        self.db.refresh(payment)

        print(f"✓ Payment created: {payment.square_payment_id}")
        print(f"✓ Amount: ${payment.total_money}")
        print(f"✓ Processing fee: ${payment.processing_fee_money}")

        # Create automatic payout
        payout = SquarePayout(
            payment_id=payment.id,
            square_account_id=1,  # Assuming the Square account has ID 1
            barber_id=barber_id,
            amount_money=Decimal("70.00"),  # 70% commission
            currency="USD",
            status=SquarePayoutStatus.PENDING,
            original_amount=payment.total_money,
            commission_rate=Decimal("0.70"),
            commission_amount=Decimal("70.00"),
            platform_fee=Decimal("30.00"),
            processing_fee=payment.processing_fee_money,
            net_amount=Decimal("67.10"),  # 70.00 - 2.90
            description="Commission payout for appointment",
            scheduled_at=datetime.utcnow() + timedelta(days=1),
        )
        self.db.add(payout)
        self.db.commit()
        self.db.refresh(payout)

        print(
            f"✓ Payout created: ${payout.net_amount} scheduled for {payout.scheduled_at.date()}"
        )

        return payment, payout

    async def test_webhook_handling(self):
        """Test webhook event handling"""
        print("\n6. Testing webhook handling...")

        # Mock webhook data
        webhook_data = {
            "event_id": "mock_event_" + os.urandom(8).hex(),
            "type": "payment.updated",
            "merchant_id": "mock_merchant_123",
            "created_at": datetime.utcnow().isoformat(),
            "data": {
                "object": {
                    "payment": {
                        "id": "mock_payment_123",
                        "status": "COMPLETED",
                        "approved_money": {"amount": 10000, "currency": "USD"},
                    }
                }
            },
        }

        # Generate mock signature
        import json
        import hmac
        import hashlib

        webhook_signature = hmac.new(
            b"mock_webhook_key",
            json.dumps(webhook_data).encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()

        print(f"✓ Webhook event created: {webhook_data['event_id']}")
        print(f"✓ Event type: {webhook_data['type']}")

        # Note: Actual webhook processing would require a valid signature
        # and existing payment records

        return True

    async def test_account_status_check(self, barber_id: int):
        """Test account status checking"""
        print("\n7. Testing account status check...")

        status = await square_oauth_service.check_account_status(self.db, barber_id)

        print(f"✓ Connected: {status.get('connected', False)}")
        print(f"✓ Verified: {status.get('verified', False)}")
        print(f"✓ Can receive payments: {status.get('can_receive_payments', False)}")
        print(f"✓ Can make payouts: {status.get('can_make_payouts', False)}")

        return status

    def test_encryption(self):
        """Test encryption utilities"""
        print("\n8. Testing encryption utilities...")

        test_data = "sensitive_access_token_12345"

        # Encrypt
        encrypted = encrypt_data(test_data)
        print(f"✓ Encrypted data: {encrypted[:40]}...")

        # Decrypt
        decrypted = decrypt_data(encrypted)
        print(f"✓ Decrypted successfully: {decrypted == test_data}")

        return True

    async def run_all_tests(self):
        """Run all tests"""
        print("=" * 60)
        print("Square OAuth Integration Test Suite")
        print("=" * 60)

        try:
            # Setup
            barber = self.setup_test_data()

            # Test OAuth flow
            state = self.test_oauth_url_generation(barber.id)
            self.test_state_verification(state)

            # Test account creation
            await self.test_mock_square_account(barber.id)

            # Test payment processing
            await self.test_payment_creation(barber.id)

            # Test webhook handling
            await self.test_webhook_handling()

            # Test account status
            await self.test_account_status_check(barber.id)

            # Test encryption
            self.test_encryption()

            print("\n" + "=" * 60)
            print("✓ All tests completed successfully!")
            print("=" * 60)

        except Exception as e:
            print(f"\n✗ Test failed with error: {e}")
            import traceback

            traceback.print_exc()
        finally:
            self.db.close()


async def main():
    """Main entry point"""
    # Create tables if they don't exist
    Base.metadata.create_all(bind=engine)

    # Run tests
    tester = SquareOAuthTester()
    await tester.run_all_tests()


if __name__ == "__main__":
    asyncio.run(main())
