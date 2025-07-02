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
from services.appointment_enhancement import enhance_appointments_list

# Create router with standardized appointment terminology
router = APIRouter(
    prefix="/appointments",
    tags=["appointments"]
)

@router.get("/slots", response_model=schemas.SlotsResponse)
def get_available_appointment_slots(
    appointment_date: date = Query(..., description="Date to check availability (YYYY-MM-DD)"),
    barber_id: Optional[int] = Query(None, description="Specific barber ID to filter availability"),
    service_id: Optional[int] = Query(None, description="Service ID to check duration-specific availability"),
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
        # Use the barber-aware version to get slots for specific barber or all available barbers
        # This prevents the issue where ALL slots are marked unavailable
        slots_data = booking_service.get_available_slots_with_barber_availability(
            db, 
            appointment_date, 
            barber_id=barber_id,  # Get slots for specific barber if provided, otherwise all available barbers
            service_id=service_id,  # Pass service_id if provided
            user_timezone=user_timezone
        )
        
        # Convert the barber-specific format to the expected format
        # Aggregate all available slots from all barbers
        all_slots = []
        seen_times = set()
        
        for barber_info in slots_data.get("available_barbers", []):
            for slot in barber_info.get("slots", []):
                if slot["time"] not in seen_times and slot.get("available", False):
                    seen_times.add(slot["time"])
                    all_slots.append({
                        "time": slot["time"],
                        "available": True,
                        "is_next_available": False
                    })
        
        # Sort slots by time
        all_slots.sort(key=lambda s: s["time"])
        
        # Mark the first available slot if needed
        if all_slots and slots_data.get("next_available"):
            next_time = slots_data["next_available"].get("time")
            for slot in all_slots:
                if slot["time"] == next_time:
                    slot["is_next_available"] = True
                    break
        
        # Fix next_available to include datetime field
        next_available = slots_data.get("next_available")
        if next_available and "datetime" not in next_available:
            # Construct datetime from date and time
            date_str = next_available.get("date", appointment_date.isoformat())
            time_str = next_available.get("time", "00:00")
            next_available["datetime"] = f"{date_str}T{time_str}:00"
        
        return {
            "date": appointment_date.isoformat(),
            "slots": all_slots,
            "next_available": next_available,
            "business_hours": slots_data.get("business_hours"),
            "slot_duration_minutes": slots_data.get("slot_duration_minutes", 30)
        }
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
        # Convert date string to date object if needed
        from datetime import datetime
        if isinstance(appointment.date, str):
            booking_date = datetime.strptime(appointment.date, "%Y-%m-%d").date()
        else:
            booking_date = appointment.date
        
        # Use existing booking service with correct signature
        db_appointment = booking_service.create_booking(
            db=db,
            user_id=current_user.id,
            booking_date=booking_date,
            booking_time=appointment.time,
            service=appointment.service,
            user_timezone=getattr(current_user, 'timezone', None),
            notes=getattr(appointment, 'notes', None),
            barber_id=getattr(appointment, 'barber_id', None)
        )
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
        
        # Enhance appointments with barber and client names
        enhanced_appointments = enhance_appointments_list(appointments, db)
        
        return {
            "appointments": enhanced_appointments,
            "total": total
        }
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
        # Parse date and time for service layer
        from datetime import datetime
        
        # Handle both string and date objects
        if isinstance(reschedule_data.date, str):
            new_date = datetime.strptime(reschedule_data.date, '%Y-%m-%d').date()
        else:
            new_date = reschedule_data.date
            
        new_time = reschedule_data.time
        timezone = reschedule_data.timezone if hasattr(reschedule_data, 'timezone') else None
        
        db_appointment = booking_service.reschedule_booking(
            db=db,
            booking_id=appointment_id,
            user_id=current_user.id,
            new_date=new_date,
            new_time=new_time,
            user_timezone=timezone
        )
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
        
        # Enhance appointments with barber and client names
        enhanced_appointments = enhance_appointments_list(appointments, db)
        
        return {
            "appointments": enhanced_appointments,
            "total": total
        }
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
        
        # Use create_booking with enhanced data
        db_appointment = booking_service.create_booking(
            db=db,
            user_id=current_user.id,
            booking_date=enhanced_data.get('date'),
            booking_time=enhanced_data.get('time'),
            service=enhanced_data.get('service'),
            user_timezone=enhanced_data.get('user_timezone'),
            client_id=enhanced_data.get('client_id'),
            notes=enhanced_data.get('notes'),
            barber_id=enhanced_data.get('barber_id'),
            buffer_time_before=enhanced_data.get('buffer_time_before', 0),
            buffer_time_after=enhanced_data.get('buffer_time_after', 0)
        )
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


# Missing endpoints migrated from bookings router

@router.get("/slots/next-available", response_model=schemas.NextAvailableSlot)
def get_next_available_appointment_slot(
    current_user: Optional[schemas.User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """Get the next available appointment slot."""
    try:
        # Use the same service as the deprecated bookings router
        # Start from today's date
        from datetime import date
        next_slot = booking_service.get_next_available_slot(db, start_date=date.today())
        if next_slot:
            return {
                "date": next_slot.date().isoformat(),
                "time": next_slot.strftime("%H:%M"),
                "datetime": next_slot.isoformat()
            }
        else:
            raise HTTPException(status_code=404, detail="No available slots found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/settings", response_model=schemas.BookingSettingsResponse)
def get_appointment_settings(
    current_user: schemas.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get appointment booking settings."""
    settings = booking_service.get_booking_settings(db)
    return settings


@router.put("/settings", response_model=schemas.BookingSettingsResponse) 
def update_appointment_settings(
    updates: schemas.BookingSettingsUpdate,
    current_user: schemas.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update appointment booking settings (admin only)."""
    require_admin_role(current_user)
    settings = booking_service.update_booking_settings(db, updates)
    return settings


@router.put("/{appointment_id}/cancel", response_model=schemas.AppointmentResponse)
def cancel_appointment(
    appointment_id: int,
    current_user: schemas.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Cancel an appointment."""
    # Get the appointment
    appointment = db.query(models.Appointment).filter(
        models.Appointment.id == appointment_id
    ).first()
    
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    # Check permissions
    if (current_user.role not in ["admin", "super_admin"] and 
        appointment.user_id != current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to cancel this appointment")
    
    # Update status
    appointment.status = "cancelled"
    db.commit()
    db.refresh(appointment)
    
    return appointment


@router.post("/guest", response_model=schemas.GuestBookingResponse)
def create_guest_appointment(
    booking: schemas.GuestBookingCreate,
    db: Session = Depends(get_db)
):
    """Create appointment for guest user (no authentication required)."""
    try:
        # Use the booking service to create the appointment
        from datetime import datetime
        
        # Convert date string to date object if needed
        if isinstance(booking.date, str):
            booking_date = datetime.strptime(booking.date, "%Y-%m-%d").date()
        else:
            booking_date = booking.date
        
        # Handle guest_info - check if it's already a dict or pydantic model
        if hasattr(booking.guest_info, 'first_name'):
            # It's a pydantic model
            guest_info_dict = {
                "first_name": booking.guest_info.first_name,
                "last_name": booking.guest_info.last_name,
                "email": booking.guest_info.email,
                "phone": booking.guest_info.phone
            }
        else:
            # It's already a dict
            guest_info_dict = booking.guest_info
        
        result = booking_service.create_guest_booking(
            db=db,
            booking_date=booking_date,
            booking_time=booking.time,
            service=booking.service,
            guest_info=guest_info_dict,
            user_timezone=getattr(booking, 'timezone', None),
            notes=getattr(booking, 'notes', None)
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/guest/quick", response_model=schemas.GuestBookingResponse) 
def create_guest_quick_appointment(
    booking: schemas.GuestQuickBookingCreate,
    db: Session = Depends(get_db)
):
    """Create quick appointment for guest user (next available slot)."""
    try:
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Guest quick booking request: {booking}")
        logger.info(f"Guest info type: {type(booking.guest_info)}")
        logger.info(f"Guest info value: {booking.guest_info}")
        
        # Find next available slot
        from datetime import date
        next_slot = booking_service.get_next_available_slot(db, start_date=date.today())
        if not next_slot:
            raise HTTPException(status_code=404, detail="No available slots found")
        
        # Handle guest_info - try multiple approaches
        try:
            # Try as pydantic model first
            guest_info_dict = {
                "first_name": booking.guest_info.first_name,
                "last_name": booking.guest_info.last_name,
                "email": booking.guest_info.email,
                "phone": booking.guest_info.phone
            }
        except AttributeError:
            # Try as dict
            try:
                guest_info_dict = {
                    "first_name": booking.guest_info["first_name"],
                    "last_name": booking.guest_info["last_name"],
                    "email": booking.guest_info["email"],
                    "phone": booking.guest_info["phone"]
                }
            except (KeyError, TypeError):
                # Use the dict directly if it's already properly formatted
                guest_info_dict = booking.guest_info
        
        logger.info(f"Final guest_info_dict: {guest_info_dict}")
        
        # Create the guest booking using the next available slot
        result = booking_service.create_guest_booking(
            db=db,
            booking_date=next_slot.date(),
            booking_time=next_slot.strftime("%H:%M"),
            service=booking.service,
            guest_info=guest_info_dict,
            user_timezone=getattr(booking, 'timezone', None),
            notes=getattr(booking, 'notes', None)
        )
        return result
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Guest quick booking error: {e}")
        raise HTTPException(status_code=400, detail=str(e))