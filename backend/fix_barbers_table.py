#!/usr/bin/env python3
"""
Fix the barbers table schema by recreating it
"""
import sys
from pathlib import Path

# Add backend to path
sys.path.append(str(Path(__file__).parent))


def fix_barbers_table():
    """Drop and recreate barbers table with correct schema"""
    print("🔧 Fixing barbers table schema...")

    try:
        from config.database import engine
        from models.barber import Barber

        # Drop the existing barbers table
        print("🗑️ Dropping existing barbers table...")
        Barber.__table__.drop(engine, checkfirst=True)

        # Recreate with correct schema
        print("🔨 Creating barbers table with correct schema...")
        Barber.__table__.create(engine)

        print("✅ Barbers table recreated successfully!")

        # Test the new table
        from config.database import SessionLocal

        db = SessionLocal()

        try:
            count = db.query(Barber).count()
            print(f"📊 Barbers table ready - current count: {count}")
        finally:
            db.close()

        print("\n🎉 Barbers table schema fixed!")

    except Exception as e:
        print(f"❌ Schema fix failed: {e}")
        import traceback

        traceback.print_exc()


if __name__ == "__main__":
    fix_barbers_table()
