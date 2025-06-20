#!/usr/bin/env python3
"""
Emergency fix for production database schema
"""
import os
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Set production database URL
os.environ['DATABASE_URL'] = os.getenv('DATABASE_URL', '')

from sqlalchemy import create_engine, text
from config.database import DATABASE_URL, Base, engine
import logging

# Import all models
from models import *

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def emergency_fix():
    """Emergency schema fix - add missing columns without dropping tables"""
    try:
        with engine.connect() as conn:
            # Add missing columns to barbers table
            missing_columns = [
                ("ALTER TABLE barbers ADD COLUMN IF NOT EXISTS trafft_employee_id VARCHAR(255)", "trafft_employee_id"),
                ("ALTER TABLE barbers ADD COLUMN IF NOT EXISTS trafft_employee_email VARCHAR(255)", "trafft_employee_email"),
                ("ALTER TABLE barbers ADD COLUMN IF NOT EXISTS hourly_rate FLOAT", "hourly_rate"),
                ("ALTER TABLE barbers ADD COLUMN IF NOT EXISTS average_service_duration INTEGER", "average_service_duration"),
            ]
            
            for sql, col_name in missing_columns:
                try:
                    conn.execute(text(sql))
                    conn.commit()
                    logger.info(f"✅ Added column: {col_name}")
                except Exception as e:
                    if "already exists" in str(e).lower() or "duplicate column" in str(e).lower():
                        logger.info(f"Column {col_name} already exists")
                    else:
                        logger.error(f"Failed to add {col_name}: {e}")
                    conn.rollback()
            
            # Create any missing tables
            logger.info("Creating any missing tables...")
            Base.metadata.create_all(bind=engine, checkfirst=True)
            
            logger.info("✅ Emergency schema fix completed!")
            
    except Exception as e:
        logger.error(f"❌ Emergency fix failed: {e}")
        raise

if __name__ == "__main__":
    logger.info("🚨 Running emergency schema fix...")
    emergency_fix()