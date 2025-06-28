#!/usr/bin/env python3
"""
Fix database schema to match current models
"""
import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine, text
from config.database import DATABASE_URL, Base, engine
import logging

# Import all models to ensure they're registered
from models import *

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def fix_schema():
    """Create all tables with correct schema"""
    try:
        # Drop and recreate all tables to ensure correct schema
        logger.info("🔄 Recreating database tables with correct schema...")

        # This will create all tables based on current model definitions
        Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)

        logger.info("✅ Database schema fixed successfully!")

        # Verify tables exist
        with engine.connect() as conn:
            result = conn.execute(
                text(
                    """
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = 'public'
                ORDER BY table_name
            """
                )
            )
            tables = [row[0] for row in result]
            logger.info(f"📊 Created tables: {', '.join(tables)}")

    except Exception as e:
        logger.error(f"❌ Failed to fix schema: {e}")
        raise


if __name__ == "__main__":
    fix_schema()
