#!/usr/bin/env python3
"""
Add missing columns to database tables
"""
import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine, text
from config.database import DATABASE_URL
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def add_missing_columns():
    """Add missing columns to barbers table"""
    engine = create_engine(DATABASE_URL)

    with engine.connect() as conn:
        try:
            # Add missing columns to barbers table
            columns_to_add = [
                ("trafft_employee_id", "VARCHAR(255)"),
                ("trafft_employee_email", "VARCHAR(255)"),
                ("hourly_rate", "FLOAT"),
                ("average_service_duration", "INTEGER"),
            ]

            for column_name, column_type in columns_to_add:
                try:
                    conn.execute(
                        text(
                            f"ALTER TABLE barbers ADD COLUMN {column_name} {column_type}"
                        )
                    )
                    logger.info(f"✅ Added column: {column_name}")
                    conn.commit()
                except Exception as e:
                    if "already exists" in str(e).lower():
                        logger.info(f"Column {column_name} already exists")
                    else:
                        logger.error(f"Failed to add {column_name}: {e}")
                    conn.rollback()

            logger.info("✅ Database schema updated")

        except Exception as e:
            logger.error(f"❌ Failed to update schema: {e}")


if __name__ == "__main__":
    logger.info("🚀 Adding missing database columns...")
    add_missing_columns()
