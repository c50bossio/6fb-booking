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


@router.get("/trafft-status")
async def get_public_trafft_status(db: Session = Depends(get_db)):
    """Public endpoint to check Trafft integration status"""
    try:
        # Basic stats only - no sensitive data
        stats = {}
        
        # Count Trafft appointments
        result = db.execute(text("""
            SELECT COUNT(*) as count 
            FROM appointments 
            WHERE trafft_appointment_id IS NOT NULL
        """))
        stats['total_trafft_appointments'] = result.scalar() or 0
        
        # Recent sync activity (last 24h)
        result = db.execute(text("""
            SELECT COUNT(*) as count 
            FROM appointments 
            WHERE trafft_appointment_id IS NOT NULL 
            AND created_at >= :since
        """), {"since": datetime.utcnow() - timedelta(hours=24)})
        stats['appointments_last_24h'] = result.scalar() or 0
        
        # Last sync time
        result = db.execute(text("""
            SELECT MAX(created_at) as last_sync 
            FROM appointments 
            WHERE trafft_appointment_id IS NOT NULL
        """))
        last_sync = result.scalar()
        stats['last_sync'] = last_sync.isoformat() if last_sync else None
        
        # Count unique barbers and clients
        result = db.execute(text("""
            SELECT 
                COUNT(DISTINCT barber_id) as barbers,
                COUNT(DISTINCT client_id) as clients
            FROM appointments
            WHERE trafft_appointment_id IS NOT NULL
        """))
        row = result.fetchone()
        stats['unique_barbers'] = row[0] or 0
        stats['unique_clients'] = row[1] or 0
        
        # Recent appointments (no personal data)
        result = db.execute(text("""
            SELECT 
                trafft_appointment_id,
                appointment_date,
                status,
                created_at
            FROM appointments
            WHERE trafft_appointment_id IS NOT NULL
            ORDER BY created_at DESC
            LIMIT 5
        """))
        
        recent = []
        for row in result:
            recent.append({
                "trafft_id": row[0],
                "date": row[1].isoformat() if row[1] else None,
                "status": row[2],
                "synced_at": row[3].isoformat() if row[3] else None
            })
        
        stats['recent_appointments'] = recent
        
        # Overall health
        if stats['total_trafft_appointments'] > 0:
            if stats['last_sync'] and (datetime.utcnow() - datetime.fromisoformat(stats['last_sync'])).total_seconds() < 3600:
                stats['health'] = "🟢 Healthy - Syncing actively"
            else:
                stats['health'] = "🟡 Warning - No recent syncs"
        else:
            stats['health'] = "🔴 No data - Waiting for first webhook"
        
        return {
            "status": "ok",
            "integration": "trafft",
            "stats": stats,
            "check_time": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        return {
            "status": "error",
            "message": str(e),
            "health": "🔴 Error checking status"
        }


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
        "timestamp": datetime.utcnow().isoformat()
    }