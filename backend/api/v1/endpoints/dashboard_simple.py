"""
Simple dashboard endpoints that work with current database schema
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime, date
from typing import Dict, Any

from config.database import get_db
from utils.auth_decorators import get_current_user
from models.user import User

router = APIRouter()

@router.get("/appointments/today-simple")
async def get_todays_appointments_simple(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get today's appointments with minimal fields"""
    try:
        # Simple query with only existing columns
        query = """
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
                COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled,
                COALESCE(SUM(CASE WHEN status != 'cancelled' THEN service_revenue ELSE 0 END), 0) as revenue
            FROM appointments
            WHERE appointment_date = CURRENT_DATE
        """
        
        result = db.execute(text(query))
        row = result.fetchone()
        
        stats = {
            "total": row.total if row else 0,
            "upcoming": row.confirmed if row else 0,
            "completed": row.completed if row else 0,
            "cancelled": row.cancelled if row else 0,
            "revenue": float(row.revenue) if row and row.revenue else 0.0
        }
        
        # Get appointment list
        list_query = """
            SELECT 
                a.id,
                a.appointment_date,
                a.appointment_time,
                a.status,
                a.service_name,
                a.service_revenue
            FROM appointments a
            WHERE a.appointment_date = CURRENT_DATE
            ORDER BY a.appointment_time ASC
        """
        
        appointments_result = db.execute(text(list_query))
        appointments = []
        
        for apt in appointments_result:
            appointments.append({
                "id": apt.id,
                "date": apt.appointment_date.isoformat() if apt.appointment_date else None,
                "time": apt.appointment_time.strftime("%I:%M %p") if apt.appointment_time else None,
                "status": apt.status,
                "service": {
                    "name": apt.service_name or "Service",
                    "price": float(apt.service_revenue) if apt.service_revenue else 0.0
                },
                "client": {
                    "name": "Client",
                    "email": "",
                    "phone": ""
                },
                "barber": {
                    "name": "Barber",
                    "email": ""
                },
                "location": "Headlines Barbershop"
            })
        
        return {
            "date": date.today().isoformat(),
            "appointments": appointments,
            "stats": stats
        }
        
    except Exception as e:
        # Return empty but valid structure on error
        return {
            "date": date.today().isoformat(),
            "appointments": [],
            "stats": {
                "total": 0,
                "upcoming": 0,
                "completed": 0,
                "cancelled": 0,
                "revenue": 0.0
            },
            "error": str(e)
        }