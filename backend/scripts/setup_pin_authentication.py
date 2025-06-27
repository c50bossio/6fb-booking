#!/usr/bin/env python3
"""
Setup script for PIN authentication system
Runs migration and provides basic testing functionality
"""

import os
import sys
import asyncio
from pathlib import Path

# Add the backend directory to the path so we can import our modules
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from alembic.config import Config
from alembic import command
from sqlalchemy.orm import Session
from config.database import get_db, engine
from services.barber_pin_service import BarberPINService
from models.barber import Barber
from models.pos_session import POSSession


def run_migration():
    """Run the PIN authentication migration"""
    try:
        # Configure alembic
        alembic_cfg = Config(str(backend_dir / "alembic.ini"))
        alembic_cfg.set_main_option("script_location", str(backend_dir / "alembic"))

        print("Running PIN authentication migration...")
        command.upgrade(alembic_cfg, "head")
        print("✅ Migration completed successfully!")
        return True

    except Exception as e:
        print(f"❌ Migration failed: {e}")
        return False


def test_pin_service():
    """Test the PIN service functionality"""
    print("\n🧪 Testing PIN service functionality...")

    # Get database session
    db = next(get_db())
    pin_service = BarberPINService(db)

    try:
        # Find a test barber or create one
        test_barber = db.query(Barber).first()

        if not test_barber:
            print("⚠️  No barbers found in database. Creating test barber...")
            test_barber = Barber(
                email="test_barber@6fb.com",
                first_name="Test",
                last_name="Barber",
                business_name="Test Barbershop",
            )
            db.add(test_barber)
            db.commit()
            db.refresh(test_barber)

        barber_id = test_barber.id
        test_pin = "1234"

        print(f"Testing with barber ID: {barber_id}")

        # Test 1: Set PIN
        print("1. Testing PIN setup...")
        try:
            pin_service.set_pin(barber_id, test_pin)
            print("   ✅ PIN setup successful")
        except Exception as e:
            print(f"   ❌ PIN setup failed: {e}")
            return False

        # Test 2: Verify correct PIN
        print("2. Testing correct PIN verification...")
        success, message = pin_service.verify_pin(barber_id, test_pin)
        if success:
            print("   ✅ PIN verification successful")
        else:
            print(f"   ❌ PIN verification failed: {message}")
            return False

        # Test 3: Create POS session
        print("3. Testing POS session creation...")
        session_token = pin_service.create_pos_session(
            barber_id=barber_id, device_info="Test Device", ip_address="127.0.0.1"
        )
        if session_token:
            print(f"   ✅ Session created: {session_token[:16]}...")
        else:
            print("   ❌ Session creation failed")
            return False

        # Test 4: Validate session
        print("4. Testing session validation...")
        is_valid, session_info = pin_service.validate_session(session_token)
        if is_valid:
            print("   ✅ Session validation successful")
            print(f"   Session expires at: {session_info['expires_at']}")
        else:
            print("   ❌ Session validation failed")
            return False

        # Test 5: Get PIN status
        print("5. Testing PIN status...")
        status = pin_service.get_pin_status(barber_id)
        print(
            f"   PIN Status: has_pin={status['has_pin']}, attempts={status['pin_attempts']}"
        )

        # Test 6: Test wrong PIN
        print("6. Testing wrong PIN...")
        success, message = pin_service.verify_pin(barber_id, "9999")
        if not success:
            print(f"   ✅ Wrong PIN correctly rejected: {message}")
        else:
            print("   ❌ Wrong PIN was accepted (this is bad!)")
            return False

        # Test 7: Logout session
        print("7. Testing session logout...")
        logout_success = pin_service.logout_session(session_token)
        if logout_success:
            print("   ✅ Session logout successful")
        else:
            print("   ❌ Session logout failed")
            return False

        print("\n🎉 All PIN service tests passed!")
        return True

    except Exception as e:
        print(f"❌ PIN service test failed: {e}")
        return False
    finally:
        db.close()


def check_database_schema():
    """Check if the database schema includes our new tables and columns"""
    print("\n🔍 Checking database schema...")

    try:
        from sqlalchemy import inspect

        inspector = inspect(engine)

        # Check barbers table has new columns
        barber_columns = [col["name"] for col in inspector.get_columns("barbers")]
        required_barber_columns = [
            "pin_hash",
            "pin_attempts",
            "pin_locked_until",
            "pin_last_used",
        ]

        print("Checking barbers table columns...")
        for col in required_barber_columns:
            if col in barber_columns:
                print(f"   ✅ {col}")
            else:
                print(f"   ❌ {col} - MISSING")
                return False

        # Check pos_sessions table exists
        tables = inspector.get_table_names()
        if "pos_sessions" in tables:
            print("✅ pos_sessions table exists")

            # Check pos_sessions columns
            pos_columns = [col["name"] for col in inspector.get_columns("pos_sessions")]
            required_pos_columns = [
                "id",
                "session_token",
                "barber_id",
                "device_info",
                "ip_address",
                "is_active",
                "expires_at",
                "last_activity",
                "login_method",
                "logout_reason",
            ]

            print("Checking pos_sessions table columns...")
            for col in required_pos_columns:
                if col in pos_columns:
                    print(f"   ✅ {col}")
                else:
                    print(f"   ❌ {col} - MISSING")
                    return False
        else:
            print("❌ pos_sessions table - MISSING")
            return False

        # Check indexes
        pos_indexes = inspector.get_indexes("pos_sessions")
        print(f"📊 Found {len(pos_indexes)} indexes on pos_sessions table")

        print("\n✅ Database schema check passed!")
        return True

    except Exception as e:
        print(f"❌ Database schema check failed: {e}")
        return False


def main():
    """Main setup function"""
    print("🔐 Setting up PIN Authentication System for 6FB Booking")
    print("=" * 60)

    # Step 1: Run migration
    if not run_migration():
        print("❌ Setup failed at migration step")
        return False

    # Step 2: Check database schema
    if not check_database_schema():
        print("❌ Setup failed at schema validation step")
        return False

    # Step 3: Test PIN service
    if not test_pin_service():
        print("❌ Setup failed at service testing step")
        return False

    print("\n" + "=" * 60)
    print("🎉 PIN Authentication System setup completed successfully!")
    print("\nNext steps:")
    print("1. Update your API router to include the PIN endpoints")
    print("2. Test the API endpoints manually or with Postman")
    print("3. Integrate with your POS frontend")
    print("\nAPI endpoints will be available at:")
    print("- POST /api/v1/barber-pin/setup")
    print("- POST /api/v1/barber-pin/authenticate")
    print("- POST /api/v1/barber-pin/validate-session")
    print("- GET  /api/v1/barber-pin/status/{barber_id}")
    print("- And more... (see barber_pin_auth.py for full list)")

    return True


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
