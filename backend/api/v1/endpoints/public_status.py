"""
Public status endpoints for monitoring (no auth required)
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime, timedelta
import os

from config.database import get_db

router = APIRouter()


@router.get("/health-check")
async def public_health_check(db: Session = Depends(get_db)):
    """Simple health check with database status"""
    try:
        # Test database connection
        db.execute(text("SELECT 1"))
        db_status = "connected"
    except:
        db_status = "disconnected"

    return {
        "status": "ok",
        "database": db_status,
        "timestamp": datetime.utcnow().isoformat(),
    }


@router.get("/booking-status")
async def get_public_booking_status(db: Session = Depends(get_db)):
    """Public endpoint to check native booking system status"""
    try:
        # Basic stats only - no sensitive data
        stats = {}

        # Count total appointments
        result = db.execute(
            text(
                """
            SELECT COUNT(*) as count
            FROM appointments
        """
            )
        )
        stats["total_appointments"] = result.scalar() or 0

        # Recent booking activity (last 24h)
        result = db.execute(
            text(
                """
            SELECT COUNT(*) as count
            FROM appointments
            WHERE created_at >= :since
        """
            ),
            {"since": datetime.utcnow() - timedelta(hours=24)},
        )
        stats["appointments_last_24h"] = result.scalar() or 0

        # Last booking time
        result = db.execute(
            text(
                """
            SELECT MAX(created_at) as last_booking
            FROM appointments
        """
            )
        )
        last_booking = result.scalar()
        stats["last_booking"] = last_booking.isoformat() if last_booking else None

        # Count unique barbers and clients
        result = db.execute(
            text(
                """
            SELECT
                COUNT(DISTINCT barber_id) as barbers,
                COUNT(DISTINCT client_id) as clients
            FROM appointments
        """
            )
        )
        row = result.fetchone()
        stats["unique_barbers"] = row[0] or 0
        stats["unique_clients"] = row[1] or 0

        # Count services
        result = db.execute(
            text(
                """
            SELECT COUNT(*) as count
            FROM services
            WHERE is_active = true
        """
            )
        )
        stats["active_services"] = result.scalar() or 0

        # Recent appointments (no personal data)
        result = db.execute(
            text(
                """
            SELECT
                appointment_date,
                status,
                booking_source,
                created_at
            FROM appointments
            ORDER BY created_at DESC
            LIMIT 5
        """
            )
        )

        recent = []
        for row in result:
            recent.append(
                {
                    "date": row[0].isoformat() if row[0] else None,
                    "status": row[1],
                    "source": row[2] or "unknown",
                    "created_at": row[3].isoformat() if row[3] else None,
                }
            )

        stats["recent_appointments"] = recent

        # Overall health
        if stats["total_appointments"] > 0:
            if (
                stats["last_booking"]
                and (
                    datetime.utcnow() - datetime.fromisoformat(stats["last_booking"])
                ).total_seconds()
                < 3600
            ):
                stats["health"] = "🟢 Healthy - Recent bookings"
            elif (
                stats["last_booking"]
                and (
                    datetime.utcnow() - datetime.fromisoformat(stats["last_booking"])
                ).total_seconds()
                < 86400
            ):
                stats["health"] = "🟡 Warning - No recent bookings"
            else:
                stats["health"] = "🔴 Inactive - No recent activity"
        else:
            stats["health"] = "🔴 No data - No bookings yet"

        return {
            "status": "ok",
            "system": "native_booking",
            "stats": stats,
            "check_time": datetime.utcnow().isoformat(),
        }

    except Exception as e:
        return {
            "status": "error",
            "message": str(e),
            "health": "🔴 Error checking status",
        }
