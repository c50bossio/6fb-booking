#!/usr/bin/env python3
"""
Create tables for recurring appointment functionality
"""

import sys
import os

sys.path.append(".")

from sqlalchemy import create_engine, text
from config.database import DATABASE_URL
from models.appointment_series import (
    AppointmentSeries,
    SeriesExclusion,
    SeriesChangeLog,
)


def create_recurring_tables():
    """Create the recurring appointment tables"""

    # Get database URL
    engine = create_engine(DATABASE_URL)

    print("🔄 Creating recurring appointment tables...")

    try:
        # Import all models to ensure they're registered
        from models import (
            AppointmentSeries,
            SeriesExclusion,
            SeriesChangeLog,
            Appointment,
            Client,
        )

        # Import Base
        from config.database import Base

        # Create the new tables
        print("Creating appointment_series table...")
        AppointmentSeries.__table__.create(engine, checkfirst=True)

        print("Creating series_exclusions table...")
        SeriesExclusion.__table__.create(engine, checkfirst=True)

        print("Creating series_change_log table...")
        SeriesChangeLog.__table__.create(engine, checkfirst=True)

        # Add series_id column to appointments table if it doesn't exist
        print("Adding series_id column to appointments table...")
        try:
            with engine.connect() as conn:
                # Check if column exists
                result = conn.execute(text("PRAGMA table_info(appointments)"))
                columns = [row[1] for row in result.fetchall()]

                if "series_id" not in columns:
                    conn.execute(
                        text("ALTER TABLE appointments ADD COLUMN series_id INTEGER")
                    )
                    conn.commit()
                    print("✅ Added series_id column to appointments table")
                else:
                    print("✅ series_id column already exists in appointments table")

        except Exception as e:
            print(f"⚠️  Warning: Could not add series_id column: {e}")

        print("✅ Recurring appointment tables created successfully!")

        # Verify tables were created
        print("\n🔍 Verifying table creation...")
        with engine.connect() as conn:
            # Check appointment_series table
            result = conn.execute(
                text(
                    "SELECT name FROM sqlite_master WHERE type='table' AND name='appointment_series'"
                )
            )
            if result.fetchone():
                print("✅ appointment_series table exists")
            else:
                print("❌ appointment_series table not found")

            # Check series_exclusions table
            result = conn.execute(
                text(
                    "SELECT name FROM sqlite_master WHERE type='table' AND name='series_exclusions'"
                )
            )
            if result.fetchone():
                print("✅ series_exclusions table exists")
            else:
                print("❌ series_exclusions table not found")

            # Check series_change_log table
            result = conn.execute(
                text(
                    "SELECT name FROM sqlite_master WHERE type='table' AND name='series_change_log'"
                )
            )
            if result.fetchone():
                print("✅ series_change_log table exists")
            else:
                print("❌ series_change_log table not found")

        print("\n🎉 Recurring appointment system ready!")
        return True

    except Exception as e:
        print(f"❌ Error creating tables: {e}")
        import traceback

        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = create_recurring_tables()
    sys.exit(0 if success else 1)
