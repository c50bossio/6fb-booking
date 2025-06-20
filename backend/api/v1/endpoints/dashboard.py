"""
Dashboard endpoints for appointment views
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import text, and_, or_
from datetime import datetime, date, timedelta
from typing import Optional, List, Dict
import pytz

from config.database import get_db
from utils.auth_decorators import get_current_user
from models.user import User

router = APIRouter()


@router.get("/appointments/today")
async def get_todays_appointments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    barber_id: Optional[int] = Query(None, description="Filter by specific barber"),
    location_id: Optional[int] = Query(None, description="Filter by specific location")
):
    """Get today's appointments with optional filters"""
    try:
        # Get today's date range in UTC
        today = date.today()
        start_of_day = datetime.combine(today, datetime.min.time())
        end_of_day = datetime.combine(today, datetime.max.time())
        
        # Simple query with just appointments
        query = """
            SELECT 
                a.id,
                a.appointment_date,
                a.appointment_time,
                a.status,
                a.service_name,
                COALESCE(a.service_revenue, 0) as service_revenue
            FROM appointments a
            WHERE a.appointment_date = :today
        """
        
        # Add filters
        params = {
            "today": today
        }
        
        if barber_id:
            query += " AND a.barber_id = :barber_id"
            params["barber_id"] = barber_id
            
        if location_id:
            query += " AND a.location_id = :location_id"
            params["location_id"] = location_id
            
        # Order by time
        query += " ORDER BY a.appointment_time ASC"
        
        result = db.execute(text(query), params)
        
        appointments = []
        for row in result:
            appointments.append({
                "id": row.id,
                "date": row.appointment_date.isoformat() if row.appointment_date else None,
                "time": row.appointment_time.strftime("%I:%M %p") if row.appointment_time else None,
                "status": row.status,
                "service": {
                    "name": row.service_name or "Service",
                    "price": float(row.service_revenue) if row.service_revenue else 0
                },
                "client": {
                    "name": "Test Customer",
                    "email": "test@example.com",
                    "phone": ""
                },
                "barber": {
                    "name": "Barber",
                    "email": ""
                },
                "location": "Headlines Barbershop"
            })
        
        # Get summary stats
        stats = {
            "total": len(appointments),
            "upcoming": len([a for a in appointments if a["status"] not in ["completed", "cancelled"]]),
            "completed": len([a for a in appointments if a["status"] == "completed"]),
            "cancelled": len([a for a in appointments if a["status"] == "cancelled"]),
            "revenue": sum(a["service"]["price"] for a in appointments if a["status"] != "cancelled")
        }
        
        return {
            "date": today.isoformat(),
            "appointments": appointments,
            "stats": stats
        }
        
    except Exception as e:
        return {
            "error": str(e),
            "appointments": [],
            "stats": {}
        }


@router.get("/appointments/week")
async def get_week_appointments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    barber_id: Optional[int] = Query(None),
    location_id: Optional[int] = Query(None)
):
    """Get appointments for the current week"""
    try:
        # Get week date range
        today = date.today()
        start_of_week = today - timedelta(days=today.weekday())
        end_of_week = start_of_week + timedelta(days=6)
        
        query = """
            SELECT 
                a.appointment_date,
                COUNT(*) as total_appointments,
                COUNT(CASE WHEN a.status != 'cancelled' THEN 1 END) as confirmed_appointments,
                SUM(CASE WHEN a.status != 'cancelled' THEN a.service_revenue ELSE 0 END) as daily_revenue
            FROM appointments a
            WHERE a.appointment_date BETWEEN :start_date AND :end_date
        """
        
        params = {
            "start_date": start_of_week,
            "end_date": end_of_week
        }
        
        if barber_id:
            query += " AND a.barber_id = :barber_id"
            params["barber_id"] = barber_id
            
        if location_id:
            query += " AND a.location_id = :location_id"
            params["location_id"] = location_id
            
        query += " GROUP BY a.appointment_date ORDER BY a.appointment_date"
        
        result = db.execute(text(query), params)
        
        daily_data = []
        for row in result:
            daily_data.append({
                "date": row.appointment_date.isoformat(),
                "day_name": row.appointment_date.strftime("%A"),
                "total_appointments": row.total_appointments,
                "confirmed_appointments": row.confirmed_appointments,
                "revenue": float(row.daily_revenue) if row.daily_revenue else 0
            })
        
        return {
            "week_start": start_of_week.isoformat(),
            "week_end": end_of_week.isoformat(),
            "daily_data": daily_data,
            "totals": {
                "appointments": sum(d["confirmed_appointments"] for d in daily_data),
                "revenue": sum(d["revenue"] for d in daily_data)
            }
        }
        
    except Exception as e:
        return {
            "error": str(e),
            "daily_data": [],
            "totals": {}
        }


@router.get("/appointments/upcoming")
async def get_upcoming_appointments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    limit: int = Query(10, description="Number of appointments to return"),
    barber_id: Optional[int] = Query(None)
):
    """Get upcoming appointments"""
    try:
        now = datetime.now()
        
        query = """
            SELECT 
                a.id,
                a.trafft_appointment_id,
                a.appointment_date,
                a.appointment_time,
                a.service_name,
                a.service_revenue,
                CONCAT(c.first_name, ' ', c.last_name) as client_name,
                c.phone as client_phone,
                CONCAT(b.first_name, ' ', b.last_name) as barber_name
            FROM appointments a
            LEFT JOIN clients c ON a.client_id = c.id
            LEFT JOIN barbers b ON a.barber_id = b.id
            WHERE a.status NOT IN ('cancelled', 'completed', 'no_show')
            AND (a.appointment_date > :today OR 
                 (a.appointment_date = :today AND a.appointment_time >= :current_time))
        """
        
        params = {
            "today": now.date(),
            "current_time": now.time()
        }
        
        if barber_id:
            query += " AND a.barber_id = :barber_id"
            params["barber_id"] = barber_id
            
        query += " ORDER BY a.appointment_date, a.appointment_time LIMIT :limit"
        params["limit"] = limit
        
        result = db.execute(text(query), params)
        
        appointments = []
        for row in result:
            appointments.append({
                "id": row.id,
                "trafft_id": row.trafft_appointment_id,
                "datetime": f"{row.appointment_date} {row.appointment_time}",
                "service": row.service_name,
                "price": float(row.service_revenue) if row.service_revenue else 0,
                "client": row.client_name,
                "client_phone": row.client_phone,
                "barber": row.barber_name,
                "location": "Headlines Barbershop"
            })
        
        return {
            "count": len(appointments),
            "appointments": appointments
        }
        
    except Exception as e:
        return {
            "error": str(e),
            "count": 0,
            "appointments": []
        }