"""
Debug endpoints for troubleshooting
"""

from fastapi import APIRouter, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, Any
import logging

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/database-test")
async def test_database_connection():
    """Test database connection and table creation"""
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


@router.get("/trafft-webhook-test")
async def test_trafft_webhook_processing():
    """Test if Trafft webhook processing components are working"""
    try:
        # Test imports
        from services.trafft_sync_service import TrafftSyncService
        from models.appointment import Appointment
        from models.location import Location
        from models.barber import Barber
        from models.client import Client

        # Test database connection for webhook processing
        from config.database import SessionLocal

        db = SessionLocal()

        # Test table queries
        locations_count = db.query(Location).count()
        barbers_count = db.query(Barber).count()
        clients_count = db.query(Client).count()
        appointments_count = db.query(Appointment).count()

        db.close()

        return {
            "status": "success",
            "webhook_components": "all_imported",
            "database_counts": {
                "locations": locations_count,
                "barbers": barbers_count,
                "clients": clients_count,
                "appointments": appointments_count,
            },
            "message": "Trafft webhook processing is ready",
        }

    except Exception as e:
        logger.error(f"Trafft webhook test failed: {e}")
        return {
            "status": "error",
            "error": str(e),
            "message": "Trafft webhook processing has issues",
        }
