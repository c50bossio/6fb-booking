"""
Dashboard Router for 6FB Booking Platform V2

Provides dashboard-specific endpoints including:
- Client metrics and statistics
- Quick dashboard KPIs
- Overview data for main dashboard
"""

from datetime import datetime, timedelta
from typing import Dict, Optional, Any
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_

from db import get_db
from dependencies import get_current_user
from models import User, Appointment, Client, Payment

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

@router.get("/client-metrics")
async def get_client_metrics(
    period: Optional[str] = Query("30d", description="Period for metrics: 7d, 30d, 90d, 1y"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get client metrics for dashboard
    
    Returns key client statistics and trends
    """
    # Calculate date range based on period
    end_date = datetime.now()
    if period == "7d":
        start_date = end_date - timedelta(days=7)
    elif period == "30d":
        start_date = end_date - timedelta(days=30)
    elif period == "90d":
        start_date = end_date - timedelta(days=90)
    elif period == "1y":
        start_date = end_date - timedelta(days=365)
    else:
        start_date = end_date - timedelta(days=30)  # Default to 30 days
    
    # Get total clients
    total_clients = db.query(func.count(Client.id)).scalar() or 0
    
    # Get new clients in period
    new_clients = db.query(func.count(Client.id)).filter(
        Client.created_at >= start_date
    ).scalar() or 0
    
    # Get active clients (clients with appointments in period)
    active_clients = db.query(func.count(func.distinct(Appointment.client_id))).filter(
        and_(
            Appointment.start_time >= start_date,
            Appointment.start_time <= end_date,
            Appointment.status.in_(["confirmed", "completed"])
        )
    ).scalar() or 0
    
    # Get total appointments in period
    total_appointments = db.query(func.count(Appointment.id)).filter(
        and_(
            Appointment.start_time >= start_date,
            Appointment.start_time <= end_date
        )
    ).scalar() or 0
    
    # Get completed appointments
    completed_appointments = db.query(func.count(Appointment.id)).filter(
        and_(
            Appointment.start_time >= start_date,
            Appointment.start_time <= end_date,
            Appointment.status == "completed"
        )
    ).scalar() or 0
    
    # Calculate completion rate
    completion_rate = (completed_appointments / total_appointments * 100) if total_appointments > 0 else 0
    
    # Get revenue (if payment table exists)
    try:
        total_revenue = db.query(func.sum(Payment.amount)).filter(
            and_(
                Payment.created_at >= start_date,
                Payment.created_at <= end_date,
                Payment.status == "completed"
            )
        ).scalar() or 0
        total_revenue = float(total_revenue)
    except:
        total_revenue = 0
    
    # Calculate previous period for trends
    previous_start = start_date - (end_date - start_date)
    previous_end = start_date
    
    # Get previous period clients for trend calculation
    previous_clients = db.query(func.count(Client.id)).filter(
        and_(
            Client.created_at >= previous_start,
            Client.created_at < previous_end
        )
    ).scalar() or 0
    
    # Calculate growth rate
    client_growth_rate = 0
    if previous_clients > 0:
        client_growth_rate = ((new_clients - previous_clients) / previous_clients) * 100
    elif new_clients > 0:
        client_growth_rate = 100  # First clients
    
    return {
        "period": period,
        "date_range": {
            "start": start_date.isoformat(),
            "end": end_date.isoformat()
        },
        "clients": {
            "total": total_clients,
            "new": new_clients,
            "active": active_clients,
            "growth_rate": round(client_growth_rate, 1)
        },
        "appointments": {
            "total": total_appointments,
            "completed": completed_appointments,
            "completion_rate": round(completion_rate, 1)
        },
        "revenue": {
            "total": total_revenue,
            "average_per_appointment": round(total_revenue / completed_appointments, 2) if completed_appointments > 0 else 0
        },
        "trends": {
            "period_comparison": {
                "current_new_clients": new_clients,
                "previous_new_clients": previous_clients,
                "growth_percentage": round(client_growth_rate, 1)
            }
        }
    }

@router.get("/overview")
async def get_dashboard_overview(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get high-level dashboard overview data
    """
    today = datetime.now().date()
    
    # Today's appointments
    todays_appointments = db.query(func.count(Appointment.id)).filter(
        func.date(Appointment.start_time) == today
    ).scalar() or 0
    
    # This week's revenue
    week_start = today - timedelta(days=today.weekday())
    week_end = week_start + timedelta(days=6)
    
    try:
        weekly_revenue = db.query(func.sum(Payment.amount)).filter(
            and_(
                func.date(Payment.created_at) >= week_start,
                func.date(Payment.created_at) <= week_end,
                Payment.status == "completed"
            )
        ).scalar() or 0
        weekly_revenue = float(weekly_revenue)
    except:
        weekly_revenue = 0
    
    # Total clients
    total_clients = db.query(func.count(Client.id)).scalar() or 0
    
    # Upcoming appointments (next 7 days)
    upcoming_appointments = db.query(func.count(Appointment.id)).filter(
        and_(
            Appointment.start_time >= datetime.now(),
            Appointment.start_time <= datetime.now() + timedelta(days=7),
            Appointment.status.in_(["confirmed", "pending"])
        )
    ).scalar() or 0
    
    return {
        "today": {
            "appointments": todays_appointments,
            "date": today.isoformat()
        },
        "week": {
            "revenue": weekly_revenue,
            "start_date": week_start.isoformat(),
            "end_date": week_end.isoformat()
        },
        "totals": {
            "clients": total_clients,
            "upcoming_appointments": upcoming_appointments
        },
        "quick_stats": {
            "appointments_today": todays_appointments,
            "revenue_this_week": weekly_revenue,
            "total_clients": total_clients,
            "upcoming_appointments": upcoming_appointments
        }
    }