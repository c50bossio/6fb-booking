#!/usr/bin/env python3
"""
Test script for Render database connection with fallback strategies
Run this to verify database connectivity
"""

import os
import sys
from pathlib import Path

# Add backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

# Set test environment variables if not already set
if not os.getenv("DATABASE_URL"):
    # Use a test PostgreSQL URL or SQLite for local testing
    os.environ["DATABASE_URL"] = "sqlite:///./test_6fb_booking.db"
    print("⚠️  No DATABASE_URL found, using SQLite for testing")


def test_render_database_connection():
    """Test the Render database connection module"""
    print("=== Testing Render Database Connection Module ===\n")

    try:
        # Import the module
        from config.render_database import (
            RenderDatabaseConfig,
            RenderDatabaseConnection,
            test_render_database_connection as built_in_test,
            PSYCOPG2_AVAILABLE,
            PG8000_AVAILABLE,
            ASYNCPG_AVAILABLE,
        )

        print("✅ Successfully imported render_database module")

        # Check available drivers
        print("\n📦 Available PostgreSQL Drivers:")
        print(f"  - psycopg2: {'✅' if PSYCOPG2_AVAILABLE else '❌'}")
        print(f"  - pg8000: {'✅' if PG8000_AVAILABLE else '❌'}")
        print(f"  - asyncpg: {'✅' if ASYNCPG_AVAILABLE else '❌'}")

        # Test configuration parsing
        print("\n🔧 Testing Database Configuration:")
        db_url = os.getenv("DATABASE_URL")
        config = RenderDatabaseConfig(db_url)

        print(f"  - Original URL: {db_url[:30]}...")
        print(f"  - Is Render Environment: {config.is_render}")
        print(f"  - Database Host: {config.connection_params.get('host', 'N/A')}")
        print(f"  - Database Name: {config.connection_params.get('database', 'N/A')}")
        print(f"  - SSL Mode: {config.connection_params.get('sslmode', 'N/A')}")

        # Test connection initialization
        print("\n🔌 Testing Connection Initialization:")
        conn = RenderDatabaseConnection(db_url)

        # Try to initialize sync engine
        is_production = os.getenv("ENVIRONMENT", "development").lower() == "production"
        if conn.initialize_sync_engine(is_production):
            print("  ✅ Synchronous engine initialized successfully")

            # Test a simple query
            try:
                from sqlalchemy import text

                with conn.engine.connect() as db_conn:
                    result = db_conn.execute(text("SELECT 1 as test"))
                    row = result.fetchone()
                    print(f"  ✅ Test query successful: {row}")
            except Exception as e:
                print(f"  ❌ Test query failed: {e}")
        else:
            print("  ❌ Failed to initialize synchronous engine")

        # Run built-in test
        print("\n🧪 Running Built-in Connection Test:")
        built_in_test()

    except ImportError as e:
        print(f"❌ Failed to import render_database module: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        import traceback

        traceback.print_exc()
        return False

    return True


def test_fallback_imports():
    """Test importing with different database modules"""
    print("\n=== Testing Database Module Imports ===\n")

    # Test current database.py
    try:
        from config.database import get_db, engine, SessionLocal

        print("✅ Successfully imported config.database")

        # Test if we can create a session
        try:
            db = SessionLocal()
            db.close()
            print("  ✅ Can create database session")
        except Exception as e:
            print(f"  ❌ Cannot create session: {e}")

    except ImportError as e:
        print(f"❌ Failed to import config.database: {e}")

    # Test models
    try:
        from models import User, Service, Appointment

        print("✅ Successfully imported models")
    except ImportError as e:
        print(f"❌ Failed to import models: {e}")


def test_environment_setup():
    """Test environment configuration"""
    print("\n=== Testing Environment Setup ===\n")

    important_vars = [
        "DATABASE_URL",
        "SECRET_KEY",
        "JWT_SECRET_KEY",
        "ENVIRONMENT",
        "RENDER",
        "RENDER_SERVICE_NAME",
    ]

    for var in important_vars:
        value = os.getenv(var)
        if value:
            if var in ["DATABASE_URL", "SECRET_KEY", "JWT_SECRET_KEY"]:
                # Don't print sensitive values
                print(f"✅ {var}: {'*' * 10} (set)")
            else:
                print(f"✅ {var}: {value}")
        else:
            print(f"❌ {var}: not set")


def main():
    """Run all tests"""
    print("🚀 6FB Booking - Render Database Connection Test\n")

    # Test environment
    test_environment_setup()

    # Test the new Render database module
    success = test_render_database_connection()

    # Test fallback imports
    test_fallback_imports()

    print("\n" + "=" * 50)
    if success:
        print("✅ Database connection test completed successfully!")
    else:
        print("❌ Database connection test failed!")
        print("\n💡 Recommendations:")
        print("1. Install PostgreSQL drivers: pip install psycopg2-binary pg8000")
        print("2. Check DATABASE_URL format (should start with postgresql://)")
        print("3. For Render, ensure SSL is enabled (sslmode=require)")
        print("4. Use the render_database module for better compatibility")

    return 0 if success else 1


if __name__ == "__main__":
    sys.exit(main())
