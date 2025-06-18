from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from typing import Optional, List
from datetime import date, datetime, timedelta
from pydantic import BaseModel

from database import get_db
from models import Appointment, Client, Barber

router = APIRouter()

# Pydantic models for request/response
class AppointmentCreate(BaseModel):
    client_id: int
    appointment_date: date
    appointment_time: Optional[datetime] = None
    service_revenue: float
    tip_amount: float = 0.0
    product_revenue: float = 0.0
    customer_type: str  # "new" or "returning"
    reference_source: Optional[str] = None
    service_name: Optional[str] = None
    payment_method: Optional[str] = "cash"
    barber_notes: Optional[str] = None

class AppointmentUpdate(BaseModel):
    service_revenue: Optional[float] = None
    tip_amount: Optional[float] = None
    product_revenue: Optional[float] = None
    customer_type: Optional[str] = None
    reference_source: Optional[str] = None
    status: Optional[str] = None
    barber_notes: Optional[str] = None

@router.get("/")
async def get_appointments(
    barber_id: int = Query(1, description="Barber ID - will be from auth in production"),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    customer_type: Optional[str] = Query(None, description="new or returning"),
    status: Optional[str] = Query(None, description="scheduled, completed, cancelled, no_show"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """Get appointments with optional filtering"""
    try:
        query = db.query(Appointment).filter(Appointment.barber_id == barber_id)
        
        # Apply filters
        if start_date:
            query = query.filter(Appointment.appointment_date >= start_date)
        if end_date:
            query = query.filter(Appointment.appointment_date <= end_date)
        if customer_type:
            query = query.filter(Appointment.customer_type == customer_type)
        if status:
            query = query.filter(Appointment.status == status)
        
        # Order by date descending and apply pagination
        appointments = query.order_by(Appointment.appointment_date.desc()).offset(offset).limit(limit).all()
        
        # Get total count for pagination
        total_count = query.count()
        
        return {
            "success": True,
            "data": {
                "appointments": [
                    {
                        "id": apt.id,
                        "appointment_date": apt.appointment_date,
                        "appointment_time": apt.appointment_time,
                        "client_name": apt.client.full_name if apt.client else "Unknown",
                        "service_revenue": apt.service_revenue,
                        "tip_amount": apt.tip_amount,
                        "product_revenue": apt.product_revenue,
                        "total_revenue": apt.total_revenue,
                        "customer_type": apt.customer_type,
                        "reference_source": apt.reference_source,
                        "status": apt.status,
                        "service_name": apt.service_name
                    }
                    for apt in appointments
                ],
                "pagination": {
                    "total": total_count,
                    "offset": offset,
                    "limit": limit,
                    "has_more": offset + limit < total_count
                }
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching appointments: {str(e)}")

@router.post("/")
async def create_appointment(
    appointment_data: AppointmentCreate,
    barber_id: int = Query(1, description="Barber ID - will be from auth in production"),
    db: Session = Depends(get_db)
):
    """Create a new appointment manually"""
    try:
        # Verify client exists and belongs to this barber
        client = db.query(Client).filter(
            and_(Client.id == appointment_data.client_id, Client.barber_id == barber_id)
        ).first()
        
        if not client:
            raise HTTPException(status_code=404, detail="Client not found")
        
        # Create new appointment
        new_appointment = Appointment(
            barber_id=barber_id,
            client_id=appointment_data.client_id,
            appointment_date=appointment_data.appointment_date,
            appointment_time=appointment_data.appointment_time,
            service_revenue=appointment_data.service_revenue,
            tip_amount=appointment_data.tip_amount,
            product_revenue=appointment_data.product_revenue,
            customer_type=appointment_data.customer_type,
            reference_source=appointment_data.reference_source,
            service_name=appointment_data.service_name,
            payment_method=appointment_data.payment_method,
            barber_notes=appointment_data.barber_notes,
            status="completed",  # Manual entries are typically completed appointments
            is_completed=True,
            completion_time=datetime.now()
        )
        
        db.add(new_appointment)
        db.commit()
        db.refresh(new_appointment)
        
        return {
            "success": True,
            "data": {
                "id": new_appointment.id,
                "message": "Appointment created successfully"
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error creating appointment: {str(e)}")

@router.put("/{appointment_id}")
async def update_appointment(
    appointment_id: int,
    appointment_data: AppointmentUpdate,
    barber_id: int = Query(1, description="Barber ID - will be from auth in production"),
    db: Session = Depends(get_db)
):
    """Update an existing appointment"""
    try:
        # Find appointment belonging to this barber
        appointment = db.query(Appointment).filter(
            and_(Appointment.id == appointment_id, Appointment.barber_id == barber_id)
        ).first()
        
        if not appointment:
            raise HTTPException(status_code=404, detail="Appointment not found")
        
        # Update fields that are provided
        update_data = appointment_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(appointment, field, value)
        
        db.commit()
        db.refresh(appointment)
        
        return {
            "success": True,
            "data": {
                "id": appointment.id,
                "message": "Appointment updated successfully"
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error updating appointment: {str(e)}")

@router.get("/daily-summary")
async def get_daily_summary(
    barber_id: int = Query(1, description="Barber ID - will be from auth in production"),
    target_date: Optional[date] = Query(None, description="Date for summary, defaults to today"),
    db: Session = Depends(get_db)
):
    """Get daily appointment summary for 6FB dashboard"""
    if target_date is None:
        target_date = date.today()
    
    try:
        # Get all appointments for the day
        appointments = db.query(Appointment).filter(
            and_(
                Appointment.barber_id == barber_id,
                Appointment.appointment_date == target_date
            )
        ).all()
        
        # Calculate summary metrics
        completed_appointments = [apt for apt in appointments if apt.status == "completed"]
        
        summary = {
            "date": target_date,
            "total_scheduled": len(appointments),
            "completed": len(completed_appointments),
            "cancelled": len([apt for apt in appointments if apt.status == "cancelled"]),
            "no_shows": len([apt for apt in appointments if apt.status == "no_show"]),
            "total_revenue": sum(apt.total_revenue for apt in completed_appointments),
            "service_revenue": sum(apt.service_revenue or 0 for apt in completed_appointments),
            "tips": sum(apt.tip_amount or 0 for apt in completed_appointments),
            "product_revenue": sum(apt.product_revenue or 0 for apt in completed_appointments),
            "new_customers": len([apt for apt in completed_appointments if apt.customer_type == "new"]),
            "returning_customers": len([apt for apt in completed_appointments if apt.customer_type == "returning"]),
            "average_ticket": sum(apt.total_revenue for apt in completed_appointments) / len(completed_appointments) if completed_appointments else 0,
            "appointments": [
                {
                    "id": apt.id,
                    "time": apt.appointment_time.strftime("%H:%M") if apt.appointment_time else "N/A",
                    "client_name": apt.client.full_name if apt.client else "Unknown",
                    "service": apt.service_name or "Standard Cut",
                    "revenue": apt.total_revenue,
                    "status": apt.status,
                    "customer_type": apt.customer_type
                }
                for apt in sorted(appointments, key=lambda x: x.appointment_time or datetime.min)
            ]
        }
        
        return {"success": True, "data": summary}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating daily summary: {str(e)}")

@router.post("/trafft-webhook")
async def handle_trafft_webhook(
    webhook_data: dict,
    db: Session = Depends(get_db)
):
    """Handle incoming Trafft webhooks"""
    # TODO: Implement Trafft webhook handling
    # This will be implemented in Phase 2 when Trafft integration is built
    return {
        "success": True,
        "message": "Trafft webhook received",
        "data": {
            "event_type": webhook_data.get("event_type", "unknown"),
            "processed": False,
            "note": "Trafft webhook processing will be implemented in Phase 2"
        }
    }

@router.delete("/{appointment_id}")
async def delete_appointment(
    appointment_id: int,
    barber_id: int = Query(1, description="Barber ID - will be from auth in production"),
    db: Session = Depends(get_db)
):
    """Delete an appointment (soft delete by marking as cancelled)"""
    try:
        appointment = db.query(Appointment).filter(
            and_(Appointment.id == appointment_id, Appointment.barber_id == barber_id)
        ).first()
        
        if not appointment:
            raise HTTPException(status_code=404, detail="Appointment not found")
        
        # Soft delete by marking as cancelled
        appointment.status = "cancelled"
        db.commit()
        
        return {
            "success": True,
            "message": "Appointment cancelled successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error deleting appointment: {str(e)}")