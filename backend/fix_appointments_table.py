#!/usr/bin/env python3
"""
Fix the appointments table schema by recreating it
"""
import sys
from pathlib import Path

# Add backend to path
sys.path.append(str(Path(__file__).parent))


def fix_appointments_table():
    """Drop and recreate appointments table with correct schema"""
    print("🔧 Fixing appointments table schema...")

    try:
        from config.database import engine
        from models.appointment import Appointment

        # Drop the existing appointments table
        print("🗑️ Dropping existing appointments table...")
        Appointment.__table__.drop(engine, checkfirst=True)

        # Recreate with correct schema
        print("🔨 Creating appointments table with correct schema...")
        Appointment.__table__.create(engine)

        print("✅ Appointments table recreated successfully!")

        # Test the new table
        from config.database import SessionLocal

        db = SessionLocal()

        try:
            count = db.query(Appointment).count()
            print(f"📊 Appointments table ready - current count: {count}")
        finally:
            db.close()

        print("\n🎉 Database schema fixed!")
        print("💡 Webhook processing should now store data correctly")

    except Exception as e:
        print(f"❌ Schema fix failed: {e}")
        import traceback

        traceback.print_exc()


if __name__ == "__main__":
    fix_appointments_table()
