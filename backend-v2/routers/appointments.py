"""
Appointment router - Standardized appointment endpoints using consistent terminology.

This router provides the same functionality as the bookings router but uses 
standardized "appointment" terminology that matches the database model.
Designed to replace the mixed booking/appointment terminology over time.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, datetime, time, timedelta
import time as time_module
import logging
import uuid
import schemas
import models
from database import get_db
from routers.auth import get_current_user
from utils.auth import require_admin_role, get_current_user_optional

def require_admin_or_enterprise_owner(current_user: schemas.User = Depends(get_current_user)) -> schemas.User:
    """Allow admin or enterprise owner access"""
    if current_user.role == "admin":
        return current_user
    if hasattr(current_user, 'unified_role') and current_user.unified_role in ["enterprise_owner", "shop_owner", "super_admin"]:
        return current_user
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Admin or enterprise owner access required"
    )
from services import booking_service
from services.appointment_enhancement import enhance_appointments_list
from utils.rate_limit import (
    booking_create_rate_limit,
    guest_booking_rate_limit,
    booking_slots_rate_limit,
    booking_reschedule_rate_limit,
    booking_cancel_rate_limit
)
from services.captcha_service import captcha_service

# Configure logger for this module
logger = logging.getLogger(__name__)

# Create router with standardized appointment terminology
router = APIRouter(
    prefix="/appointments",
    tags=["appointments"]
)

# DEBUG: Minimal test endpoint to isolate the hang issue
@router.post("/debug-test")
def debug_test_endpoint():
    """Minimal test endpoint with no dependencies"""
    logger.info("DEBUG: Minimal endpoint called successfully")
    return {"status": "ok", "message": "minimal endpoint works"}

@router.post("/debug-test-auth")
def debug_test_auth_endpoint(current_user: schemas.User = Depends(get_current_user)):
    """Test endpoint with only auth dependency"""
    logger.info(f"DEBUG: Auth test endpoint called for user {current_user.id}")
    return {"status": "ok", "message": "auth endpoint works", "user_id": current_user.id}

@router.post("/debug-test-db")
def debug_test_db_endpoint(db: Session = Depends(get_db)):
    """Test endpoint with only database dependency"""
    logger.info("DEBUG: DB test endpoint called")
    return {"status": "ok", "message": "db endpoint works"}

@router.post("/debug-test-combined")
def debug_test_combined_endpoint(
    appointment: schemas.AppointmentCreate,
    current_user: schemas.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Test endpoint with ALL appointment creation dependencies"""
    logger.info(f"DEBUG: Combined test endpoint called for user {current_user.id}")
    logger.info(f"DEBUG: Appointment data - Date: {appointment.date}, Time: {appointment.time}, Service: {appointment.service}")
    return {
        "status": "ok", 
        "message": "combined endpoint works",
        "user_id": current_user.id,
        "appointment_date": appointment.date.isoformat(),
        "appointment_time": appointment.time,
        "service": appointment.service
    }

@router.get("/slots", response_model=schemas.SlotsResponse)
@booking_slots_rate_limit
def get_available_appointment_slots(
    request: Request,
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
@booking_create_rate_limit  # RE-ENABLED AFTER FIXING RATE LIMITING TIMEOUT
def create_appointment(
    request: Request,
    appointment: schemas.AppointmentCreate,
    current_user: schemas.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new appointment."""
    # IMMEDIATE logging to catch any blocking issues
    logger.info("APPOINTMENT_API: Function entry - immediate log")
    
    # Get request ID from middleware (if available) or generate one
    request_id = getattr(request.state, 'request_id', str(uuid.uuid4())[:8])
    logger.info(f"APPOINTMENT_API [{request_id}]: Got request ID")
    
    start_time = time_module.time()
    logger.info(f"APPOINTMENT_API [{request_id}]: Got start time")
    
    # Add a hard timeout of 30 seconds for the entire appointment creation
    import signal
    logger.info(f"APPOINTMENT_API [{request_id}]: Imported signal")
    
    def timeout_handler(signum, frame):
        logger.error(f"APPOINTMENT_API [{request_id}]: Hard timeout after 30 seconds")
        raise HTTPException(status_code=504, detail="Appointment creation timed out")
    
    # Set timeout signal
    old_handler = signal.signal(signal.SIGALRM, timeout_handler)
    signal.alarm(30)  # 30 second timeout
    logger.info(f"APPOINTMENT_API [{request_id}]: Timeout handler set")
    
    # Log request initiation
    logger.info(
        f"APPOINTMENT_API [{request_id}]: Starting appointment creation for user {current_user.id} "
        f"(IP: {request.client.host if request.client else 'unknown'})"
    )
    
    try:
        # Log and validate incoming request data
        logger.info(f"APPOINTMENT_API [{request_id}]: Request data - Date: {appointment.date}, Time: {appointment.time}, Service: {appointment.service}")
        
        # Convert date string to date object if needed
        from datetime import datetime
        if isinstance(appointment.date, str):
            booking_date = datetime.strptime(appointment.date, "%Y-%m-%d").date()
        else:
            booking_date = appointment.date
        
        # Log schema validation success
        schema_validation_time = time_module.time()
        logger.info(f"APPOINTMENT_API [{request_id}]: Schema validation completed in {schema_validation_time - start_time:.3f}s")
        
        # Log before calling service
        logger.info(
            f"APPOINTMENT_API [{request_id}]: Calling booking_service.create_booking with "
            f"date={booking_date}, time={appointment.time}, service={appointment.service}, "
            f"user_id={current_user.id}, barber_id={getattr(appointment, 'barber_id', None)}"
        )
        
        service_start_time = time_module.time()
        
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
        
        service_end_time = time_module.time()
        service_duration = service_end_time - service_start_time
        
        # Log service completion
        logger.info(
            f"APPOINTMENT_API [{request_id}]: Service call completed in {service_duration:.3f}s "
            f"- Created appointment ID: {db_appointment.id if db_appointment else 'None'}"
        )
        
        # Log total API request time
        total_time = time_module.time() - start_time
        logger.info(
            f"APPOINTMENT_API [{request_id}]: Request completed successfully in {total_time:.3f}s "
            f"(Schema: {schema_validation_time - start_time:.3f}s, Service: {service_duration:.3f}s)"
        )
        
        # Clear timeout
        signal.alarm(0)
        signal.signal(signal.SIGALRM, old_handler)
        
        return db_appointment
        
    except HTTPException as http_exc:
        # Clear timeout on exception
        signal.alarm(0)
        signal.signal(signal.SIGALRM, old_handler)
        
        # Log HTTP exceptions with timing
        error_time = time_module.time() - start_time
        logger.error(
            f"APPOINTMENT_API [{request_id}]: HTTP exception after {error_time:.3f}s - "
            f"Status: {http_exc.status_code}, Detail: {http_exc.detail}"
        )
        raise
        
    except Exception as e:
        # Clear timeout on exception
        signal.alarm(0)
        signal.signal(signal.SIGALRM, old_handler)
        
        # Log unexpected exceptions with timing and full context
        error_time = time_module.time() - start_time
        logger.error(
            f"APPOINTMENT_API [{request_id}]: Unexpected error after {error_time:.3f}s - "
            f"Type: {type(e).__name__}, Message: {str(e)}, "
            f"User: {current_user.id}, Date: {appointment.date}, Time: {appointment.time}"
        )
        
        # Check if this might be a timeout or connection issue
        if 'timeout' in str(e).lower() or 'connection' in str(e).lower():
            logger.error(f"APPOINTMENT_API [{request_id}]: Potential timeout/connection issue detected")
            raise HTTPException(
                status_code=504, 
                detail="Request timeout - the server took too long to process your appointment request"
            )
        
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/quick", response_model=schemas.AppointmentResponse)
@booking_create_rate_limit
def create_quick_appointment(
    request: Request,
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
        
        db_appointment = booking_service.update_booking(db, appointment_id, current_user.id, update_data)
        if not db_appointment:
            raise HTTPException(status_code=404, detail="Appointment not found")
        return db_appointment
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{appointment_id}/reschedule", response_model=schemas.AppointmentResponse)
@booking_reschedule_rate_limit
def reschedule_appointment(
    request: Request,
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
@booking_cancel_rate_limit
def cancel_appointment(
    request: Request,
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
    current_user: schemas.User = Depends(require_admin_or_enterprise_owner),
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
@booking_cancel_rate_limit
def cancel_appointment_alt(
    request: Request,
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
@guest_booking_rate_limit
async def create_guest_appointment(
    request: Request,
    booking: schemas.GuestBookingCreate,
    db: Session = Depends(get_db)
):
    """Create appointment for guest user (no authentication required)."""
    try:
        # Get guest identifier for tracking
        guest_identifier = captcha_service.get_guest_identifier({
            'remote_ip': request.client.host if request.client else None,
            'guest_info': booking.guest_info
        })
        
        # Check if CAPTCHA is required
        if captcha_service.is_captcha_required(guest_identifier):
            # Verify CAPTCHA token if provided
            captcha_token = getattr(booking, 'captcha_token', None)
            if not captcha_token:
                raise HTTPException(
                    status_code=400,
                    detail="CAPTCHA verification required due to multiple failed attempts"
                )
            
            # Verify the CAPTCHA
            is_valid = await captcha_service.verify_captcha(
                captcha_token,
                request.client.host if request.client else None
            )
            
            if not is_valid:
                # Track another failed attempt
                captcha_service.track_failed_attempt(guest_identifier)
                raise HTTPException(
                    status_code=400,
                    detail="Invalid CAPTCHA. Please try again."
                )
            
            # Clear CAPTCHA requirement on successful verification
            captcha_service.clear_captcha_requirement(guest_identifier)
        
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
        
        # Clear failed attempts on successful booking
        captcha_service.clear_failed_attempts(guest_identifier)
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        # Track failed attempt
        guest_identifier = captcha_service.get_guest_identifier({
            'remote_ip': request.client.host if request.client else None,
            'guest_info': booking.guest_info
        })
        attempt_count, captcha_required = captcha_service.track_failed_attempt(guest_identifier)
        
        # Include CAPTCHA requirement in error response if needed
        error_detail = str(e)
        if captcha_required:
            error_detail += ". CAPTCHA verification will be required for your next attempt."
        
        raise HTTPException(status_code=400, detail=error_detail)


@router.post("/guest/quick", response_model=schemas.GuestBookingResponse) 
@guest_booking_rate_limit
async def create_guest_quick_appointment(
    request: Request,
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
        
        # Get guest identifier for tracking
        guest_identifier = captcha_service.get_guest_identifier({
            'remote_ip': request.client.host if request.client else None,
            'guest_info': booking.guest_info
        })
        
        # Check if CAPTCHA is required
        if captcha_service.is_captcha_required(guest_identifier):
            # Verify CAPTCHA token if provided
            captcha_token = getattr(booking, 'captcha_token', None)
            if not captcha_token:
                raise HTTPException(
                    status_code=400,
                    detail="CAPTCHA verification required due to multiple failed attempts"
                )
            
            # Verify the CAPTCHA
            is_valid = await captcha_service.verify_captcha(
                captcha_token,
                request.client.host if request.client else None
            )
            
            if not is_valid:
                # Track another failed attempt
                captcha_service.track_failed_attempt(guest_identifier)
                raise HTTPException(
                    status_code=400,
                    detail="Invalid CAPTCHA. Please try again."
                )
            
            # Clear CAPTCHA requirement on successful verification
            captcha_service.clear_captcha_requirement(guest_identifier)
        
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
        
        # Clear failed attempts on successful booking
        captcha_service.clear_failed_attempts(guest_identifier)
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Guest quick booking error: {e}")
        
        # Track failed attempt
        guest_identifier = captcha_service.get_guest_identifier({
            'remote_ip': request.client.host if request.client else None,
            'guest_info': booking.guest_info
        })
        attempt_count, captcha_required = captcha_service.track_failed_attempt(guest_identifier)
        
        # Include CAPTCHA requirement in error response if needed
        error_detail = str(e)
        if captcha_required:
            error_detail += ". CAPTCHA verification will be required for your next attempt."
        
        raise HTTPException(status_code=400, detail=error_detail)

@router.post("/guest/captcha-status")
async def check_guest_captcha_status(
    request: Request,
    guest_info: schemas.GuestInfo,
    db: Session = Depends(get_db)
):
    """Check if CAPTCHA is required for a guest based on their booking attempts."""
    guest_identifier = captcha_service.get_guest_identifier({
        'remote_ip': request.client.host if request.client else None,
        'guest_info': guest_info
    })
    
    captcha_required = captcha_service.is_captcha_required(guest_identifier)
    
    return {
        "captcha_required": captcha_required,
        "message": "CAPTCHA verification required" if captcha_required else "No CAPTCHA required"
    }