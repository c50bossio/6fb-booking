"""
Debug endpoints for troubleshooting - DEVELOPMENT ONLY
"""

from fastapi import APIRouter, HTTPException, status
from sqlalchemy.orm import Session
from typing import Dict, Any
import logging
import os

router = APIRouter()
logger = logging.getLogger(__name__)

def require_development():
    """Ensure endpoint is only accessible in development"""
    environment = os.getenv("ENVIRONMENT", "development").lower()
    if environment != "development":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Not found"
        )


@router.get("/database-test")
async def test_database_connection():
    """Test database connection and table creation"""
    require_development()
    try:
        from config.database import SessionLocal, engine, Base

        # Test basic connection
        db = SessionLocal()
        from sqlalchemy import text

        result = db.execute(text("SELECT 1 as test"))
        test_value = result.fetchone()[0]
        db.close()

        # Test appointments table
        db = SessionLocal()
        appointments_result = db.execute(text("SELECT COUNT(*) FROM appointments"))
        appointments_count = appointments_result.fetchone()[0]
        db.close()

        return {
            "status": "success",
            "database_connection": "working",
            "test_query": test_value,
            "appointments_count": appointments_count,
            "message": "Database is fully operational",
        }

    except Exception as e:
        logger.error(f"Database test failed: {e}")
        return {
            "status": "error",
            "error": str(e),
            "message": "Database connection failed",
        }


