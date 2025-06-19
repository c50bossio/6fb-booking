#!/usr/bin/env python3
"""
Fix the clients table schema by recreating it
"""
import sys
from pathlib import Path

# Add backend to path
sys.path.append(str(Path(__file__).parent))


def fix_clients_table():
    """Drop and recreate clients table with correct schema"""
    print("🔧 Fixing clients table schema...")

    try:
        from config.database import engine
        from models.client import Client

        # Drop the existing clients table
        print("🗑️ Dropping existing clients table...")
        Client.__table__.drop(engine, checkfirst=True)

        # Recreate with correct schema
        print("🔨 Creating clients table with correct schema...")
        Client.__table__.create(engine)

        print("✅ Clients table recreated successfully!")

        # Test the new table
        from config.database import SessionLocal

        db = SessionLocal()

        try:
            count = db.query(Client).count()
            print(f"📊 Clients table ready - current count: {count}")
        finally:
            db.close()

        print("\n🎉 Clients table schema fixed!")

    except Exception as e:
        print(f"❌ Schema fix failed: {e}")
        import traceback

        traceback.print_exc()


if __name__ == "__main__":
    fix_clients_table()
