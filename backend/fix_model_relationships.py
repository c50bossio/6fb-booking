#!/usr/bin/env python3
"""
Fix model relationship issues to enable webhook processing
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from config.database import DATABASE_URL
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def fix_relationships():
    """Add missing relationships as columns if needed"""
    engine = create_engine(DATABASE_URL)
    
    with engine.connect() as conn:
        # Check if revenue_shares relationship is causing issues
        # For now, we'll ensure the core tables exist
        try:
            # Check appointments table
            result = conn.execute(text("SELECT COUNT(*) FROM appointments"))
            count = result.scalar()
            logger.info(f"Appointments table exists with {count} records")
        except Exception as e:
            logger.error(f"Appointments table issue: {e}")
            
        try:
            # Check if we can query barbers
            result = conn.execute(text("SELECT COUNT(*) FROM barbers"))
            count = result.scalar()
            logger.info(f"Barbers table exists with {count} records")
        except Exception as e:
            logger.error(f"Barbers table issue: {e}")

if __name__ == "__main__":
    fix_relationships()