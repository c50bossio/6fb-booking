from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, datetime, time, timedelta
import warnings
import schemas
import models
from database import get_db
from routers.auth import get_current_user
from utils.auth import require_admin_role, get_current_user_optional
from services import booking_service

# DEPRECATION WARNING: This router is deprecated in favor of /appointments
# The /bookings endpoints will be removed in a future version
warnings.warn(
    "The /bookings router is deprecated. Please use /appointments endpoints instead. "
    "This router will be removed in a future version.",
    DeprecationWarning,
    stacklevel=2
)

router = APIRouter(
    prefix="/bookings",
    tags=["bookings (deprecated)"],
    deprecated=True
)

@router.get("/slots", response_model=schemas.SlotsResponse)
def get_available_slots(
    booking_date: date = Query(..., description="Date to check availability (YYYY-MM-DD)"),
    timezone: Optional[str] = Query(None, description="User's timezone (e.g., 'America/New_York'). If not provided, uses business timezone."),
    current_user: Optional[schemas.User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """Get available time slots for a specific date with enhanced information."""
    # Determine timezone to use
    user_timezone = timezone
    if not user_timezone and current_user:
        user_timezone = current_user.timezone
    # Get booking settings for validation
    settings = booking_service.get_booking_settings(db)
    
    # Don't allow booking in the past
    if booking_date < date.today():
        raise HTTPException(status_code=400, detail="Cannot check slots for past dates")
    
    # Use configurable max advance days instead of hardcoded value
    days_ahead = (booking_date - date.today()).days
    if days_ahead > settings.max_advance_days:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot book more than {settings.max_advance_days} days in advance"
        )
    
    try:
        slots_data = booking_service.get_available_slots(db, booking_date, user_timezone=user_timezone)
        return slots_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/", response_model=schemas.BookingResponse)
def create_booking(
    booking: schemas.BookingCreate,
    current_user: schemas.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new booking."""
    # Validate date
    if booking.date < date.today():
        raise HTTPException(status_code=400, detail="Cannot book appointments in the past")
    
    # Get booking settings for validation
    settings = booking_service.get_booking_settings(db)
    
    # Parse booking datetime
    try:
        time_parts = booking.time.split(":")
        hour = int(time_parts[0])
        minute = int(time_parts[1])
        booking_datetime = datetime.combine(booking.date, time(hour, minute))
    except (ValueError, IndexError):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid time format: {booking.time}. Please use HH:MM format."
        )
    
    # Make booking_datetime timezone-aware using user's timezone or business timezone
    import pytz
    user_tz_str = current_user.timezone if current_user else settings.business_timezone
    user_tz = pytz.timezone(user_tz_str)
    booking_datetime_aware = user_tz.localize(booking_datetime)
    
    # Use configurable lead time validation
    min_booking_time = settings.get_min_booking_time(user_tz_str)
    if booking_datetime_aware < min_booking_time:
        next_available = min_booking_time.strftime('%H:%M')
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot book appointments for {booking.time}. Please select a time at least {settings.min_lead_time_minutes} minutes from now ({next_available}) or choose a future date."
        )
    
    # Use configurable max advance validation
    max_booking_time = settings.get_max_booking_time(user_tz_str)
    if booking_datetime_aware > max_booking_time:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot book more than {settings.max_advance_days} days in advance"
        )
    
    try:
        # Auto-create or find client record for the user
        client_id = booking_service.find_or_create_client_for_user(db, current_user.id)
        
        # Use user's timezone for booking
        appointment = booking_service.create_booking(
            db=db,
            user_id=current_user.id,
            booking_date=booking.date,
            booking_time=booking.time,
            service=booking.service,
            user_timezone=current_user.timezone,
            client_id=client_id,
            notes=getattr(booking, 'notes', None)
        )
        return appointment
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        import traceback
        traceback.print_exc()  # This will help us see the full error
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/", response_model=schemas.BookingListResponse)
def get_user_bookings(
    current_user: schemas.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all bookings for the current user."""
    bookings = booking_service.get_user_bookings(db, current_user.id)
    return {
        "appointments": bookings,  # Changed from "bookings" to "appointments" to match schema
        "total": len(bookings)
    }

@router.get("/my")
def redirect_my_bookings(
    current_user: schemas.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Redirect for common mistake - /bookings/my doesn't exist.
    This prevents 422 errors from /{booking_id} catching 'my' as an ID.
    """
    import warnings
    warnings.warn(
        "The endpoint /bookings/my is incorrect. Use /bookings/ instead. "
        "This endpoint will be removed in a future version.",
        DeprecationWarning,
        stacklevel=2
    )
    # Return a helpful error with the correct endpoint
    raise HTTPException(
        status_code=301,
        detail="This endpoint has moved. Please use GET /api/v2/bookings/ instead.",
        headers={"Location": "/api/v2/bookings/"}
    )

@router.get("/{booking_id}", response_model=schemas.BookingResponse)
def get_booking_details(
    booking_id: int,
    current_user: schemas.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get details of a specific booking."""
    booking = booking_service.get_booking_by_id(db, booking_id, current_user.id)
    
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    return booking

@router.put("/{booking_id}/cancel", response_model=schemas.BookingResponse)
def cancel_booking(
    booking_id: int,
    current_user: schemas.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Cancel a booking."""
    try:
        booking = booking_service.cancel_booking(db, booking_id, current_user.id)
        
        if not booking:
            raise HTTPException(status_code=404, detail="Booking not found")
        
        return booking
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{booking_id}", response_model=schemas.BookingResponse)
def update_booking(
    booking_id: int,
    booking_update: schemas.BookingUpdate,
    current_user: schemas.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update an existing booking."""
    try:
        # Convert the Pydantic model to dict and remove None values
        update_data = booking_update.model_dump(exclude_unset=True)
        
        # Add user timezone if available
        if current_user.timezone:
            update_data['user_timezone'] = current_user.timezone
        
        # Handle date and time field mapping
        if 'date' in update_data:
            update_data['booking_date'] = update_data.pop('date')
        if 'time' in update_data:
            update_data['booking_time'] = update_data.pop('time')
        
        booking = booking_service.update_booking(
            db=db,
            booking_id=booking_id,
            user_id=current_user.id,
            update_data=update_data
        )
        
        if not booking:
            raise HTTPException(status_code=404, detail="Booking not found")
        
        return booking
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{booking_id}/reschedule", response_model=schemas.BookingResponse)
def reschedule_booking(
    booking_id: int,
    reschedule_data: schemas.BookingReschedule,
    current_user: schemas.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Reschedule an existing booking to a new date and time."""
    try:
        booking = booking_service.reschedule_booking(
            db=db,
            booking_id=booking_id,
            user_id=current_user.id,
            new_date=reschedule_data.date,
            new_time=reschedule_data.time,
            user_timezone=current_user.timezone
        )
        
        if not booking:
            raise HTTPException(status_code=404, detail="Booking not found")
        
        return booking
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/quick", response_model=schemas.BookingResponse)
def quick_booking(
    quick_booking: schemas.QuickBookingCreate,
    current_user: schemas.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a booking for the next available slot."""
    try:
        # Get the next available slot starting from today in user's timezone
        next_slot = booking_service.get_next_available_slot(db, date.today(), user_timezone=current_user.timezone)
        
        if not next_slot:
            raise HTTPException(
                status_code=400, 
                detail="No available slots found. Please try booking for a later date."
            )
        
        # Auto-create or find client record for the user
        client_id = booking_service.find_or_create_client_for_user(db, current_user.id)
        
        # Create booking for the next available slot
        appointment = booking_service.create_booking(
            db=db,
            user_id=current_user.id,
            booking_date=next_slot.date(),
            booking_time=next_slot.strftime("%H:%M"),
            service=quick_booking.service,
            user_timezone=current_user.timezone,
            client_id=client_id,
            notes=quick_booking.notes
        )
        
        return appointment
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/slots/next-available", response_model=schemas.NextAvailableSlot)
def get_next_available_slot(
    start_date: Optional[date] = Query(None, description="Date to start searching from (defaults to today)"),
    max_days: int = Query(7, description="Maximum days ahead to search", ge=1, le=30),
    timezone: Optional[str] = Query(None, description="User's timezone (e.g., 'America/New_York'). If not provided, uses business timezone."),
    current_user: Optional[schemas.User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """Get the next available booking slot across multiple days."""
    # Determine timezone to use
    user_timezone = timezone
    if not user_timezone and current_user:
        user_timezone = current_user.timezone
    search_date = start_date or date.today()
    
    # Don't allow searching in the past
    if search_date < date.today():
        raise HTTPException(status_code=400, detail="Cannot search for slots in the past")
    
    # Get booking settings for validation
    settings = booking_service.get_booking_settings(db)
    
    # Limit search range by business settings
    max_search_days = min(max_days, settings.max_advance_days)
    
    try:
        next_slot = booking_service.get_next_available_slot(db, search_date, user_timezone=user_timezone, max_days_ahead=max_search_days)
        
        if not next_slot:
            raise HTTPException(
                status_code=404, 
                detail=f"No available slots found in the next {max_search_days} days"
            )
        
        return {
            "date": next_slot.date().isoformat(),
            "time": next_slot.strftime("%H:%M"),
            "datetime": next_slot.isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/slots/barber/{barber_id}", response_model=schemas.SlotsResponse)
def get_available_slots_for_barber(
    barber_id: int,
    booking_date: date = Query(..., description="Date to check availability (YYYY-MM-DD)"),
    timezone: Optional[str] = Query(None, description="User's timezone (e.g., 'America/New_York'). If not provided, uses business timezone."),
    current_user: Optional[schemas.User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """Get available time slots for a specific barber on a specific date."""
    # Determine timezone to use
    user_timezone = timezone
    if not user_timezone and current_user:
        user_timezone = current_user.timezone
    
    # Get booking settings for validation
    settings = booking_service.get_booking_settings(db)
    
    # Don't allow booking in the past
    if booking_date < date.today():
        raise HTTPException(status_code=400, detail="Cannot check slots for past dates")
    
    # Use configurable max advance days instead of hardcoded value
    days_ahead = (booking_date - date.today()).days
    if days_ahead > settings.max_advance_days:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot book more than {settings.max_advance_days} days in advance"
        )
    
    try:
        slots_data = booking_service.get_available_slots_with_barber_availability(
            db, booking_date, barber_id=barber_id, user_timezone=user_timezone
        )
        return slots_data
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/slots/all-barbers", response_model=schemas.BarberAvailabilityByDateResponse)
def get_available_slots_all_barbers(
    booking_date: date = Query(..., description="Date to check availability (YYYY-MM-DD)"),
    timezone: Optional[str] = Query(None, description="User's timezone (e.g., 'America/New_York'). If not provided, uses business timezone."),
    current_user: Optional[schemas.User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """Get available time slots for all barbers on a specific date."""
    # Determine timezone to use
    user_timezone = timezone
    if not user_timezone and current_user:
        user_timezone = current_user.timezone
    
    # Get booking settings for validation
    settings = booking_service.get_booking_settings(db)
    
    # Don't allow booking in the past
    if booking_date < date.today():
        raise HTTPException(status_code=400, detail="Cannot check slots for past dates")
    
    # Use configurable max advance days instead of hardcoded value
    days_ahead = (booking_date - date.today()).days
    if days_ahead > settings.max_advance_days:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot book more than {settings.max_advance_days} days in advance"
        )
    
    try:
        slots_data = booking_service.get_available_slots_with_barber_availability(
            db, booking_date, barber_id=None, user_timezone=user_timezone
        )
        return slots_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/enhanced", response_model=schemas.BookingResponse)
def create_enhanced_booking(
    booking: schemas.EnhancedBookingCreate,
    current_user: schemas.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new booking with enhanced features (barber selection, buffer times)."""
    # Validate date
    if booking.date < date.today():
        raise HTTPException(status_code=400, detail="Cannot book appointments in the past")
    
    # Get booking settings for validation
    settings = booking_service.get_booking_settings(db)
    
    # Parse booking datetime
    try:
        time_parts = booking.time.split(":")
        hour = int(time_parts[0])
        minute = int(time_parts[1])
        booking_datetime = datetime.combine(booking.date, time(hour, minute))
    except (ValueError, IndexError):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid time format: {booking.time}. Please use HH:MM format."
        )
    
    # Use configurable lead time validation
    min_booking_time = settings.get_min_booking_time()
    if booking_datetime < min_booking_time:
        next_available = min_booking_time.strftime('%H:%M')
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot book appointments for {booking.time}. Please select a time at least {settings.min_lead_time_minutes} minutes from now ({next_available}) or choose a future date."
        )
    
    # Use configurable max advance validation
    max_booking_time = settings.get_max_booking_time()
    if booking_datetime > max_booking_time:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot book more than {settings.max_advance_days} days in advance"
        )
    
    try:
        # Use enhanced booking service with barber selection and buffer times
        appointment = booking_service.create_booking(
            db=db,
            user_id=current_user.id,
            booking_date=booking.date,
            booking_time=booking.time,
            service=booking.service,
            user_timezone=current_user.timezone,
            barber_id=booking.barber_id,
            client_id=booking.client_id,
            notes=booking.notes,
            buffer_time_before=booking.buffer_time_before or 0,
            buffer_time_after=booking.buffer_time_after or 0
        )
        return appointment
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/settings/booking", response_model=schemas.BookingSettingsResponse)
def get_booking_settings(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current booking settings. Requires authentication."""
    try:
        settings = booking_service.get_booking_settings(db)
        
        # Convert time objects to strings for JSON serialization
        settings_dict = {
            "id": settings.id,
            "business_id": settings.business_id,
            "business_name": settings.business_name,
            "min_lead_time_minutes": settings.min_lead_time_minutes,
            "max_advance_days": settings.max_advance_days,
            "same_day_cutoff_time": settings.same_day_cutoff_time.strftime("%H:%M") if settings.same_day_cutoff_time else None,
            "business_start_time": settings.business_start_time.strftime("%H:%M"),
            "business_end_time": settings.business_end_time.strftime("%H:%M"),
            "slot_duration_minutes": settings.slot_duration_minutes,
            "show_soonest_available": settings.show_soonest_available,
            "allow_same_day_booking": settings.allow_same_day_booking,
            "require_advance_booking": settings.require_advance_booking,
            "business_type": settings.business_type,
            "created_at": settings.created_at,
            "updated_at": settings.updated_at
        }
        
        return settings_dict
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/settings/booking", response_model=schemas.BookingSettingsResponse)
def update_booking_settings(
    settings_update: schemas.BookingSettingsUpdate,
    admin_user: models.User = Depends(require_admin_role),
    db: Session = Depends(get_db)
):
    """Update booking settings. Requires admin role."""
    try:
        # Get current settings
        settings = booking_service.get_booking_settings(db)
        
        # Update only provided fields
        update_data = settings_update.dict(exclude_unset=True)
        
        for field, value in update_data.items():
            if field in ["same_day_cutoff_time", "business_start_time", "business_end_time"] and value:
                # Convert time strings to time objects
                try:
                    hour, minute = map(int, value.split(":"))
                    time_obj = time(hour, minute)
                    setattr(settings, field, time_obj)
                except (ValueError, AttributeError):
                    raise HTTPException(
                        status_code=400, 
                        detail=f"Invalid time format for {field}. Use HH:MM format."
                    )
            else:
                setattr(settings, field, value)
        
        # Update timestamp
        settings.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(settings)
        
        # Convert back to response format
        settings_dict = {
            "id": settings.id,
            "business_id": settings.business_id,
            "business_name": settings.business_name,
            "min_lead_time_minutes": settings.min_lead_time_minutes,
            "max_advance_days": settings.max_advance_days,
            "same_day_cutoff_time": settings.same_day_cutoff_time.strftime("%H:%M") if settings.same_day_cutoff_time else None,
            "business_start_time": settings.business_start_time.strftime("%H:%M"),
            "business_end_time": settings.business_end_time.strftime("%H:%M"),
            "slot_duration_minutes": settings.slot_duration_minutes,
            "show_soonest_available": settings.show_soonest_available,
            "allow_same_day_booking": settings.allow_same_day_booking,
            "require_advance_booking": settings.require_advance_booking,
            "business_type": settings.business_type,
            "created_at": settings.created_at,
            "updated_at": settings.updated_at
        }
        
        return settings_dict
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Guest Booking Endpoints (No Authentication Required)
@router.post("/guest", response_model=schemas.GuestBookingResponse)
def create_guest_booking(
    booking: schemas.GuestBookingCreate,
    db: Session = Depends(get_db)
):
    """Create a booking for a guest user (no authentication required)."""
    # Validate date
    if booking.date < date.today():
        raise HTTPException(status_code=400, detail="Cannot book appointments in the past")
    
    # Get booking settings for validation
    settings = booking_service.get_booking_settings(db)
    
    # Parse booking datetime
    try:
        time_parts = booking.time.split(":")
        hour = int(time_parts[0])
        minute = int(time_parts[1])
        booking_datetime = datetime.combine(booking.date, time(hour, minute))
    except (ValueError, IndexError):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid time format: {booking.time}. Please use HH:MM format."
        )
    
    # Make booking_datetime timezone-aware using business timezone
    import pytz
    business_tz = pytz.timezone(settings.business_timezone)
    booking_datetime_aware = business_tz.localize(booking_datetime)
    
    # Use configurable lead time validation
    min_booking_time = settings.get_min_booking_time(settings.business_timezone)
    if booking_datetime_aware < min_booking_time:
        next_available = min_booking_time.strftime('%H:%M')
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot book appointments for {booking.time}. Please select a time at least {settings.min_lead_time_minutes} minutes from now ({next_available}) or choose a future date."
        )
    
    # Use configurable max advance validation
    max_booking_time = settings.get_max_booking_time(settings.business_timezone)
    if booking_datetime_aware > max_booking_time:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot book more than {settings.max_advance_days} days in advance"
        )
    
    try:
        # Create guest booking
        appointment = booking_service.create_guest_booking(
            db=db,
            booking_date=booking.date,
            booking_time=booking.time,
            service=booking.service,
            guest_info=booking.guest_info,
            user_timezone=booking.timezone or settings.business_timezone,
            notes=booking.notes
        )
        return appointment
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/guest/quick", response_model=schemas.GuestBookingResponse)
def create_guest_quick_booking(
    quick_booking: schemas.GuestQuickBookingCreate,
    db: Session = Depends(get_db)
):
    """Create a quick booking for guest user (next available slot, no authentication required)."""
    try:
        # Get booking settings
        settings = booking_service.get_booking_settings(db)
        
        # Get the next available slot starting from today in business timezone
        next_slot = booking_service.get_next_available_slot(db, date.today(), user_timezone=settings.business_timezone)
        
        if not next_slot:
            raise HTTPException(
                status_code=400, 
                detail="No available slots found. Please try booking for a later date."
            )
        
        # Create guest booking for the next available slot
        appointment = booking_service.create_guest_booking(
            db=db,
            booking_date=next_slot.date(),
            booking_time=next_slot.strftime("%H:%M"),
            service=quick_booking.service,
            guest_info=quick_booking.guest_info,
            user_timezone=settings.business_timezone
        )
        
        return appointment
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))