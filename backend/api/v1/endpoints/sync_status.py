"""
Sync Status Dashboard - Monitor Trafft integration health
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import List, Dict
from datetime import datetime, timedelta

from config.database import get_db
from models.appointment import Appointment
from models.client import Client
from models.barber import Barber
from middleware.auth import require_auth

router = APIRouter()


@router.get("/dashboard")
async def get_sync_dashboard(
    db: Session = Depends(get_db),
    current_user = Depends(require_auth)
):
    """Get comprehensive sync status dashboard"""
    
    # Get sync statistics
    total_appointments = db.query(Appointment).filter(
        Appointment.trafft_appointment_id.isnot(None)
    ).count()
    
    # Recent syncs (last 24 hours)
    recent_syncs = db.query(Appointment).filter(
        Appointment.trafft_last_sync >= datetime.utcnow() - timedelta(hours=24)
    ).count()
    
    # Sync status breakdown
    sync_status = db.query(
        Appointment.trafft_sync_status,
        func.count(Appointment.id).label("count")
    ).filter(
        Appointment.trafft_appointment_id.isnot(None)
    ).group_by(Appointment.trafft_sync_status).all()
    
    # Get recent appointments
    recent_appointments = db.query(Appointment).filter(
        Appointment.trafft_appointment_id.isnot(None)
    ).order_by(desc(Appointment.trafft_last_sync)).limit(10).all()
    
    # Get barber sync status
    barbers_with_trafft = db.query(Barber).filter(
        Barber.trafft_employee_email.isnot(None)
    ).count()
    
    # Get client sync status
    clients_from_trafft = db.query(Client).join(Appointment).filter(
        Appointment.trafft_appointment_id.isnot(None)
    ).distinct().count()
    
    # Calculate sync health score (0-100)
    sync_health = 100
    if total_appointments > 0:
        error_count = next((s[1] for s in sync_status if s[0] == "error"), 0)
        sync_health = int((1 - (error_count / total_appointments)) * 100)
    
    return {
        "sync_health": sync_health,
        "statistics": {
            "total_synced_appointments": total_appointments,
            "recent_syncs_24h": recent_syncs,
            "barbers_connected": barbers_with_trafft,
            "clients_imported": clients_from_trafft
        },
        "sync_status_breakdown": [
            {"status": s[0], "count": s[1]} for s in sync_status
        ],
        "recent_appointments": [
            {
                "id": apt.id,
                "trafft_id": apt.trafft_appointment_id,
                "client_name": apt.client.full_name if apt.client else "Unknown",
                "barber_name": f"{apt.barber.first_name} {apt.barber.last_name}" if apt.barber else "Unknown",
                "service": apt.service_name,
                "date": apt.appointment_date.isoformat() if apt.appointment_date else None,
                "status": apt.status,
                "sync_status": apt.trafft_sync_status,
                "last_sync": apt.trafft_last_sync.isoformat() if apt.trafft_last_sync else None
            }
            for apt in recent_appointments
        ]
    }


@router.get("/webhook-logs")
async def get_webhook_logs(
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user = Depends(require_auth)
):
    """Get recent webhook logs"""
    try:
        import sqlite3
        conn = sqlite3.connect("/tmp/trafft_webhooks.db")
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT timestamp, event_type, content_type, body_raw, body_parsed 
            FROM webhook_logs 
            ORDER BY timestamp DESC 
            LIMIT ?
        """, (limit,))
        
        logs = cursor.fetchall()
        conn.close()
        
        webhook_logs = []
        for log in logs:
            parsed_data = None
            try:
                import json
                parsed_data = json.loads(log[4]) if log[4] else None
            except:
                parsed_data = log[4]
            
            webhook_logs.append({
                "timestamp": log[0],
                "event_type": log[1],
                "content_type": log[2],
                "body_preview": log[3][:100] + "..." if len(log[3]) > 100 else log[3],
                "parsed_data": parsed_data
            })
        
        return {
            "count": len(webhook_logs),
            "logs": webhook_logs
        }
    except Exception as e:
        return {"error": str(e), "logs": []}


@router.get("/sync-errors")
async def get_sync_errors(
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user = Depends(require_auth)
):
    """Get appointments with sync errors"""
    
    error_appointments = db.query(Appointment).filter(
        Appointment.trafft_sync_status == "error"
    ).order_by(desc(Appointment.trafft_last_sync)).limit(limit).all()
    
    return {
        "count": len(error_appointments),
        "errors": [
            {
                "id": apt.id,
                "trafft_id": apt.trafft_appointment_id,
                "error_time": apt.trafft_last_sync.isoformat() if apt.trafft_last_sync else None,
                "appointment_date": apt.appointment_date.isoformat() if apt.appointment_date else None,
                "notes": apt.notes
            }
            for apt in error_appointments
        ]
    }


@router.post("/resync/{appointment_id}")
async def resync_appointment(
    appointment_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(require_auth)
):
    """Manually trigger resync for a specific appointment"""
    
    appointment = db.query(Appointment).filter_by(id=appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    # Mark for resync
    appointment.trafft_sync_status = "pending"
    db.commit()
    
    return {
        "status": "success",
        "message": f"Appointment {appointment_id} marked for resync"
    }


@router.get("/barber-sync-status")
async def get_barber_sync_status(
    db: Session = Depends(get_db),
    current_user = Depends(require_auth)
):
    """Get sync status for all barbers"""
    
    barbers = db.query(Barber).all()
    
    barber_status = []
    for barber in barbers:
        # Count synced appointments
        synced_appointments = db.query(Appointment).filter(
            Appointment.barber_id == barber.id,
            Appointment.trafft_appointment_id.isnot(None)
        ).count()
        
        # Get last sync time
        last_sync = db.query(Appointment.trafft_last_sync).filter(
            Appointment.barber_id == barber.id,
            Appointment.trafft_appointment_id.isnot(None)
        ).order_by(desc(Appointment.trafft_last_sync)).first()
        
        barber_status.append({
            "id": barber.id,
            "name": f"{barber.first_name} {barber.last_name}",
            "email": barber.email,
            "trafft_email": barber.trafft_employee_email,
            "is_connected": bool(barber.trafft_employee_email),
            "synced_appointments": synced_appointments,
            "last_sync": last_sync[0].isoformat() if last_sync and last_sync[0] else None
        })
    
    return {
        "count": len(barber_status),
        "barbers": barber_status
    }