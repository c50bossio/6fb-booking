"""
Appointment router - Standardized appointment endpoints using consistent terminology.

This router provides the same functionality as the bookings router but uses 
standardized "appointment" terminology that matches the database model.
Designed to replace the mixed booking/appointment terminology over time.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, datetime, time, timedelta
import schemas
import models
from database import get_db
from routers.auth import get_current_user
from utils.auth import require_admin_role, get_current_user_optional
from services import booking_service

# Create router with standardized appointment terminology
router = APIRouter(
    prefix="/appointments",
    tags=["appointments"]
)

@router.get("/slots", response_model=schemas.SlotsResponse)
def get_available_appointment_slots(
    appointment_date: date = Query(..., description="Date to check availability (YYYY-MM-DD)"),
    timezone: Optional[str] = Query(None, description="User's timezone (e.g., 'America/New_York'). If not provided, uses business timezone."),
    current_user: Optional[schemas.User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """Get available time slots for appointments on a specific date."""
    # Determine timezone to use
    user_timezone = timezone
    if not user_timezone and current_user:
        user_timezone = current_user.timezone
    
    # Get booking settings for validation
    settings = booking_service.get_booking_settings(db)
    
    # Don't allow appointments in the past
    if appointment_date < date.today():
        raise HTTPException(status_code=400, detail="Cannot check slots for past dates")
    
    # Use configurable max advance days
    days_ahead = (appointment_date - date.today()).days
    if days_ahead > settings.max_advance_days:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot schedule appointments more than {settings.max_advance_days} days in advance"
        )
    
    try:
        slots_data = booking_service.get_available_slots(db, appointment_date, user_timezone=user_timezone)
        return slots_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/", response_model=schemas.AppointmentResponse)
def create_appointment(
    appointment: schemas.AppointmentCreate,
    current_user: schemas.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new appointment."""
    try:
        # Convert AppointmentCreate to format expected by service layer
        booking_data = {
            "date": appointment.date,
            "time": appointment.time,
            "service": appointment.service,
            "notes": getattr(appointment, 'notes', None)
        }
        
        # Use existing booking service (will be renamed to appointment service later)
        db_appointment = booking_service.create_booking(db, booking_data, current_user.id)
        return db_appointment
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/quick", response_model=schemas.AppointmentResponse)
def create_quick_appointment(
    appointment: schemas.QuickAppointmentCreate,
    current_user: schemas.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a quick appointment (next available slot)."""
    try:
        # Convert QuickAppointmentCreate to format expected by service layer
        quick_data = {
            "service": appointment.service,
            "notes": getattr(appointment, 'notes', None)
        }
        
        db_appointment = booking_service.create_quick_booking(db, quick_data, current_user.id)
        return db_appointment
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/", response_model=schemas.AppointmentListResponse)
def get_user_appointments(
    skip: int = Query(0, ge=0, description="Number of appointments to skip"),
    limit: int = Query(100, ge=1, le=100, description="Maximum number of appointments to return"),
    status: Optional[str] = Query(None, description="Filter by appointment status"),
    current_user: schemas.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's appointments."""
    try:
        appointments = booking_service.get_user_bookings(db, current_user.id, skip=skip, limit=limit, status=status)
        total = booking_service.count_user_bookings(db, current_user.id, status=status)
        
        return schemas.AppointmentListResponse(
            appointments=appointments,
            total=total
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{appointment_id}", response_model=schemas.AppointmentResponse)
def get_appointment(
    appointment_id: int,
    current_user: schemas.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific appointment by ID."""
    try:
        db_appointment = booking_service.get_booking(db, appointment_id, current_user.id)
        if not db_appointment:
            raise HTTPException(status_code=404, detail="Appointment not found")
        return db_appointment
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{appointment_id}", response_model=schemas.AppointmentResponse)
def update_appointment(
    appointment_id: int,
    appointment: schemas.AppointmentUpdate,
    current_user: schemas.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update an existing appointment."""
    try:
        # Convert AppointmentUpdate to format expected by service layer
        update_data = appointment.dict(exclude_unset=True)
        
        db_appointment = booking_service.update_booking(db, appointment_id, update_data, current_user.id)
        if not db_appointment:
            raise HTTPException(status_code=404, detail="Appointment not found")
        return db_appointment
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{appointment_id}/reschedule", response_model=schemas.AppointmentResponse)
def reschedule_appointment(
    appointment_id: int,
    reschedule_data: schemas.AppointmentReschedule,
    current_user: schemas.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Reschedule an appointment to a new date and time."""
    try:
        # Convert AppointmentReschedule to format expected by service layer
        reschedule_dict = {
            "date": reschedule_data.date,
            "time": reschedule_data.time
        }
        
        db_appointment = booking_service.reschedule_booking(db, appointment_id, reschedule_dict, current_user.id)
        if not db_appointment:
            raise HTTPException(status_code=404, detail="Appointment not found")
        return db_appointment
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{appointment_id}")
def cancel_appointment(
    appointment_id: int,
    current_user: schemas.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Cancel an appointment."""
    try:
        success = booking_service.cancel_booking(db, appointment_id, current_user.id)
        if not success:
            raise HTTPException(status_code=404, detail="Appointment not found")
        return {"message": "Appointment cancelled successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Admin and staff endpoints for appointment management
@router.get("/all/list", response_model=schemas.AppointmentListResponse)
def get_all_appointments(
    skip: int = Query(0, ge=0, description="Number of appointments to skip"),
    limit: int = Query(100, ge=1, le=100, description="Maximum number of appointments to return"),
    status: Optional[str] = Query(None, description="Filter by appointment status"),
    date_from: Optional[date] = Query(None, description="Start date filter"),
    date_to: Optional[date] = Query(None, description="End date filter"),
    barber_id: Optional[int] = Query(None, description="Filter by barber ID"),
    current_user: schemas.User = Depends(require_admin_role),
    db: Session = Depends(get_db)
):
    """Get all appointments (admin/staff only)."""
    try:
        # Use existing booking service with filters
        appointments = booking_service.get_all_bookings(
            db, 
            skip=skip, 
            limit=limit, 
            status=status,
            date_from=date_from,
            date_to=date_to,
            barber_id=barber_id
        )
        total = booking_service.count_all_bookings(
            db, 
            status=status,
            date_from=date_from,
            date_to=date_to,
            barber_id=barber_id
        )
        
        return schemas.AppointmentListResponse(
            appointments=appointments,
            total=total
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/enhanced", response_model=schemas.AppointmentResponse)
def create_enhanced_appointment(
    appointment: schemas.EnhancedAppointmentCreate,
    current_user: schemas.User = Depends(require_admin_role),
    db: Session = Depends(get_db)
):
    """Create an enhanced appointment with full options (admin/staff only)."""
    try:
        # Convert EnhancedAppointmentCreate to format expected by service layer
        enhanced_data = appointment.dict(exclude_unset=True)
        
        # Map the new field names to service layer expectations
        if 'appointment_date' in enhanced_data:
            enhanced_data['date'] = enhanced_data.pop('appointment_date')
        if 'appointment_time' in enhanced_data:
            enhanced_data['time'] = enhanced_data.pop('appointment_time')
        
        db_appointment = booking_service.create_enhanced_booking(db, enhanced_data, current_user.id)
        return db_appointment
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/validate", response_model=schemas.AppointmentValidationResponse)
def validate_appointment(
    validation_request: schemas.AppointmentValidationRequest,
    current_user: schemas.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Validate appointment data against business rules."""
    try:
        # Convert AppointmentValidationRequest to format expected by service layer
        validation_data = validation_request.dict()
        
        # Map the new field names to service layer expectations
        if 'appointment_date' in validation_data:
            validation_data['booking_date'] = validation_data.pop('appointment_date')
        if 'appointment_time' in validation_data:
            validation_data['booking_time'] = validation_data.pop('appointment_time')
        
        validation_result = booking_service.validate_booking_request(db, validation_data)
        
        return schemas.AppointmentValidationResponse(
            is_valid=validation_result['is_valid'],
            violations=validation_result['violations'],
            appointment_allowed=validation_result['booking_allowed']
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))