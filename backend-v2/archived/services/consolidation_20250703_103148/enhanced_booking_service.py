"""
Enhanced booking service with comprehensive timezone handling.
This service replaces the existing booking service with proper timezone support.
"""

from datetime import datetime, time, timedelta, date
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_
import models
import pytz
import logging
from services import barber_availability_service
from services.timezone_service import timezone_service

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Import notification service (with lazy loading to avoid circular imports)
def get_notification_service():
    try:
        from services.notification_service import notification_service
        return notification_service
    except ImportError:
        logger.warning("Notification service not available")
        return None

# Fixed service configuration
SERVICES = {
    "Haircut": {"duration": 30, "price": 30},
    "Shave": {"duration": 30, "price": 20},
    "Haircut & Shave": {"duration": 30, "price": 45}
}

def get_booking_settings(db: Session) -> models.BookingSettings:
    """Get booking settings from database, create default if none exist."""
    settings = db.query(models.BookingSettings).filter(
        models.BookingSettings.business_id == 1
    ).first()
    
    if not settings:
        # Create default settings
        settings = models.BookingSettings.get_default_settings()
        db.add(settings)
        db.commit()
        db.refresh(settings)
    
    return settings


def get_available_slots(
    db: Session, 
    target_date: date, 
    user_timezone: Optional[str] = None,
    user_id: Optional[int] = None,
    location_id: Optional[int] = None,
    include_next_available: bool = True
) -> Dict[str, Any]:
    """Get available time slots for a given date with comprehensive timezone handling.
    
    Args:
        db: Database session
        target_date: Date to check for available slots
        user_timezone: User's timezone string (e.g., 'America/Los_Angeles')
        user_id: User ID for timezone lookup if user_timezone not provided
        location_id: Location ID for location-specific timezone
        include_next_available: Whether to find and mark the next available slot
    
    Returns:
        Dict containing available slots with times displayed in user's timezone
    """
    # Get booking settings from database
    settings = get_booking_settings(db)
    
    # Determine user timezone
    if not user_timezone and user_id:
        user = db.query(models.User).filter(models.User.id == user_id).first()
        if user:
            user_timezone = timezone_service.get_user_timezone(user)
    
    if not user_timezone:
        user_timezone = 'UTC'
    
    # Get business timezone
    business_tz_str = timezone_service.get_business_timezone(db, location_id)
    business_tz = pytz.timezone(business_tz_str)
    user_tz = pytz.timezone(user_timezone)
    
    logger.info(f"Enhanced slot calculation: Business TZ={business_tz_str}, User TZ={user_timezone}, Date={target_date}")
    
    # Generate all possible slots for the day in business timezone
    all_slots = []
    
    # Create timezone-aware start and end times in business timezone
    naive_start = datetime.combine(target_date, settings.business_start_time)
    naive_end = datetime.combine(target_date, settings.business_end_time)
    
    # Make them timezone-aware in business timezone
    start_time = business_tz.localize(naive_start)
    end_time = business_tz.localize(naive_end)
    
    logger.debug(f"Business hours: {start_time} to {end_time} (business timezone)")
    
    # If this is today, start from current time + lead time buffer
    # Get current time in business timezone
    now_business = datetime.now(business_tz)
    
    if target_date == now_business.date():
        now_plus_buffer = now_business + timedelta(minutes=settings.min_lead_time_minutes)
        
        # Round up to next slot interval properly (handle hour overflow)
        next_slot_time = now_plus_buffer.replace(second=0, microsecond=0)
        if next_slot_time.minute % settings.slot_duration_minutes != 0:
            # Calculate how many minutes to add to reach next slot
            minutes_to_add = settings.slot_duration_minutes - (next_slot_time.minute % settings.slot_duration_minutes)
            next_slot_time = next_slot_time + timedelta(minutes=minutes_to_add)
        
        # Use the later of business start or next available slot
        start_time = max(start_time, next_slot_time)
        
        logger.debug(f"Today's slots start from: {start_time} (business timezone)")
    
    current_time = start_time
    while current_time < end_time:
        # Convert to user timezone for display using timezone service
        current_time_user = timezone_service.convert_datetime(
            dt=current_time,
            from_tz=business_tz_str,
            to_tz=user_timezone,
            log_conversion=True,
            db=db,
            user_id=user_id,
            conversion_type='slot_display'
        )
        
        all_slots.append({
            "time": current_time_user.strftime("%H:%M"),
            "datetime": current_time,  # Keep business timezone datetime for comparisons
            "datetime_user": current_time_user,  # User timezone for display
            "timezone_info": {
                "business_time": current_time.strftime("%H:%M"),
                "user_time": current_time_user.strftime("%H:%M"),
                "business_tz": business_tz_str,
                "user_tz": user_timezone
            }
        })
        current_time += timedelta(minutes=settings.slot_duration_minutes)
    
    # Get existing appointments for the day (convert to UTC for database query)
    start_of_day = business_tz.localize(datetime.combine(target_date, time.min))
    end_of_day = business_tz.localize(datetime.combine(target_date, time.max))
    
    # Convert to UTC for database query (assuming database stores in UTC)
    start_of_day_utc = timezone_service.convert_to_utc(start_of_day, business_tz_str)
    end_of_day_utc = timezone_service.convert_to_utc(end_of_day, business_tz_str)
    
    existing_appointments = db.query(models.Appointment).filter(
        and_(
            models.Appointment.start_time >= start_of_day_utc.replace(tzinfo=None),
            models.Appointment.start_time < end_of_day_utc.replace(tzinfo=None),
            models.Appointment.status != "cancelled"
        )
    ).all()
    
    logger.debug(f"Found {len(existing_appointments)} existing appointments for {target_date}")
    
    # Mark slots as unavailable if they conflict with existing appointments
    available_slots = []
    next_available_slot = None
    
    for slot in all_slots:
        is_available = True
        slot_end = slot["datetime"] + timedelta(minutes=settings.slot_duration_minutes)
        
        # Convert slot times to UTC for comparison with database times
        slot_start_utc = timezone_service.convert_to_utc(slot["datetime"], business_tz_str)
        slot_end_utc = timezone_service.convert_to_utc(slot_end, business_tz_str)
        
        for appointment in existing_appointments:
            # Ensure appointment times are timezone-aware (they should be in UTC from database)
            if appointment.start_time.tzinfo is None:
                appointment_start = pytz.UTC.localize(appointment.start_time)
            else:
                appointment_start = appointment.start_time
                
            appointment_end = appointment_start + timedelta(minutes=appointment.duration_minutes)
            
            # Check if there's any overlap
            if not (slot_end_utc.replace(tzinfo=None) <= appointment_start.replace(tzinfo=None) or 
                   slot_start_utc.replace(tzinfo=None) >= appointment_end.replace(tzinfo=None)):
                is_available = False
                break
        
        # Create slot data with enhanced timezone information
        slot_data = {
            "time": slot["time"],
            "available": is_available,
            "is_next_available": False,
            "timezone_info": slot["timezone_info"]
        }
        
        # Mark the first available slot as next available if enabled
        if is_available and include_next_available and settings.show_soonest_available and next_available_slot is None:
            next_available_slot = slot["datetime_user"]  # Use user timezone for display
            slot_data["is_next_available"] = True
        
        available_slots.append(slot_data)
    
    # Find next available slot across multiple days if today is full
    next_available_summary = None
    if include_next_available and settings.show_soonest_available:
        if next_available_slot:
            next_available_summary = {
                "date": target_date.isoformat(),
                "time": next_available_slot.strftime("%H:%M"),
                "datetime": next_available_slot.isoformat(),
                "timezone": user_timezone
            }
        else:
            # Search next few days for the soonest available slot
            search_start_date = target_date
            if target_date == date.today() and len([s for s in available_slots if s["available"]]) == 0:
                search_start_date = target_date + timedelta(days=1)
            
            next_slot = get_next_available_slot(
                db, 
                search_start_date, 
                user_timezone=user_timezone,
                user_id=user_id,
                location_id=location_id
            )
            if next_slot:
                next_available_summary = {
                    "date": next_slot.date().isoformat(),
                    "time": next_slot.strftime("%H:%M"),
                    "datetime": next_slot.isoformat(),
                    "timezone": user_timezone
                }
    
    # Get business hours in user timezone for display
    business_start_user, business_end_user = timezone_service.get_business_hours_in_timezone(
        db=db,
        target_timezone=user_timezone,
        location_id=location_id,
        date_obj=target_date
    )
    
    return {
        "date": target_date.isoformat(),
        "slots": available_slots,
        "next_available": next_available_summary,
        "business_hours": {
            "start": business_start_user.strftime("%H:%M") if business_start_user else settings.business_start_time.strftime("%H:%M"),
            "end": business_end_user.strftime("%H:%M") if business_end_user else settings.business_end_time.strftime("%H:%M"),
            "timezone": user_timezone
        },
        "slot_duration_minutes": settings.slot_duration_minutes,
        "timezone_info": {
            "user_timezone": user_timezone,
            "business_timezone": business_tz_str,
            "location_id": location_id
        }
    }


def get_next_available_slot(
    db: Session, 
    start_date: date, 
    user_timezone: Optional[str] = None,
    user_id: Optional[int] = None,
    location_id: Optional[int] = None,
    max_days_ahead: int = 7
) -> Optional[datetime]:
    """Find the next available slot across multiple days with timezone awareness.
    
    Args:
        db: Database session
        start_date: Date to start searching from
        user_timezone: User's timezone string
        user_id: User ID for timezone lookup
        location_id: Location ID for location-specific timezone
        max_days_ahead: Maximum days to search ahead
        
    Returns:
        Datetime of next available slot in user's timezone, or None if no slots available
    """
    settings = get_booking_settings(db)
    
    # Determine user timezone
    if not user_timezone and user_id:
        user = db.query(models.User).filter(models.User.id == user_id).first()
        if user:
            user_timezone = timezone_service.get_user_timezone(user)
    
    if not user_timezone:
        user_timezone = 'UTC'
    
    # Get business timezone
    business_tz_str = timezone_service.get_business_timezone(db, location_id)
    business_tz = pytz.timezone(business_tz_str)
    user_tz = pytz.timezone(user_timezone)
    
    # Start searching from the given date
    current_date = start_date
    max_search_date = start_date + timedelta(days=min(max_days_ahead, settings.max_advance_days))
    
    # Calculate the minimum allowed booking time
    now_business = datetime.now(business_tz)
    
    if current_date == now_business.date():
        min_allowed_time = now_business + timedelta(minutes=settings.min_lead_time_minutes)
        # Round up to next slot interval properly
        min_allowed_time = min_allowed_time.replace(second=0, microsecond=0)
        if min_allowed_time.minute % settings.slot_duration_minutes != 0:
            minutes_to_add = settings.slot_duration_minutes - (min_allowed_time.minute % settings.slot_duration_minutes)
            min_allowed_time = min_allowed_time + timedelta(minutes=minutes_to_add)
    else:
        # For future dates, start from beginning of business day
        min_allowed_time = business_tz.localize(datetime.combine(current_date, settings.business_start_time))
    
    while current_date <= max_search_date:
        # Get available slots for this date (without next_available processing to avoid recursion)
        day_slots = get_available_slots(
            db, 
            current_date, 
            user_timezone=user_timezone,
            user_id=user_id,
            location_id=location_id,
            include_next_available=False
        )
        
        # Find the first available slot that meets the minimum time requirement
        for slot in day_slots["slots"]:
            if slot["available"]:
                # Parse the time and create datetime in business timezone  
                time_str = slot["time"]
                hour, minute = map(int, time_str.split(":"))
                
                # Create timezone-aware datetime in user timezone first, then convert to business timezone
                slot_datetime_user = user_tz.localize(datetime.combine(current_date, time(hour, minute)))
                slot_datetime_business = timezone_service.convert_datetime(
                    dt=slot_datetime_user,
                    from_tz=user_timezone,
                    to_tz=business_tz_str
                )
                
                # Use the same time filtering logic as slot generation
                if slot_datetime_business >= min_allowed_time:
                    # Return in user's timezone
                    return slot_datetime_user
        
        # Move to next day - reset min_allowed_time for future dates
        current_date += timedelta(days=1)
        min_allowed_time = business_tz.localize(datetime.combine(current_date, settings.business_start_time))
    
    return None


def create_booking(
    db: Session,
    user_id: int,
    booking_date: date,
    booking_time: str,
    service: str,
    user_timezone: Optional[str] = None,
    client_id: Optional[int] = None,
    notes: Optional[str] = None,
    barber_id: Optional[int] = None,
    buffer_time_before: int = 0,
    buffer_time_after: int = 0,
    location_id: Optional[int] = None
) -> models.Appointment:
    """Create a new booking with comprehensive timezone handling.
    
    Args:
        db: Database session
        user_id: ID of the user making the booking
        booking_date: Date of the booking
        booking_time: Time of the booking in HH:MM format (in user's timezone)
        service: Name of the service
        user_timezone: User's timezone string
        client_id: Client ID if available
        notes: Optional notes for the booking
        barber_id: Specific barber ID
        buffer_time_before: Buffer time before appointment
        buffer_time_after: Buffer time after appointment
        location_id: Location ID for the booking
        
    Returns:
        Created appointment object
    """
    # Get booking settings
    settings = get_booking_settings(db)
    
    # Get user and determine timezone
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise ValueError(f"User {user_id} not found")
    
    if not user_timezone:
        user_timezone = timezone_service.get_user_timezone(user)
    
    # Get business timezone
    business_tz_str = timezone_service.get_business_timezone(db, location_id)
    
    logger.info(f"Creating booking: Business TZ={business_tz_str}, User TZ={user_timezone}")
    
    # Validate service
    if service not in SERVICES:
        raise ValueError(f"Invalid service. Available services: {', '.join(SERVICES.keys())}")
    
    # Parse time and create timezone-aware datetime in user timezone
    hour, minute = map(int, booking_time.split(":"))
    start_time_user = pytz.timezone(user_timezone).localize(
        datetime.combine(booking_date, time(hour, minute))
    )
    
    # Convert to business timezone for validation
    start_time_business = timezone_service.convert_datetime(
        dt=start_time_user,
        from_tz=user_timezone,
        to_tz=business_tz_str,
        log_conversion=True,
        db=db,
        user_id=user_id,
        conversion_type='booking_creation'
    )
    
    # Convert to UTC for storage
    start_time_utc = timezone_service.convert_to_utc(
        dt=start_time_business,
        from_tz=business_tz_str,
        log_conversion=True,
        db=db,
        user_id=user_id,
        conversion_type='booking_storage'
    )
    
    logger.debug(f"Booking time conversion: User TZ={start_time_user}, Business TZ={start_time_business}, UTC={start_time_utc}")
    
    # Validate booking time constraints in business timezone
    now_business = datetime.now(pytz.timezone(business_tz_str))
    min_booking_time = now_business + timedelta(minutes=settings.min_lead_time_minutes)
    max_booking_time = now_business + timedelta(days=settings.max_advance_days)
    
    if start_time_business < min_booking_time:
        raise ValueError(f"Booking must be at least {settings.min_lead_time_minutes} minutes in advance")
    
    if start_time_business > max_booking_time:
        raise ValueError(f"Booking cannot be more than {settings.max_advance_days} days in advance")
    
    # Check if booking is within business hours (using business timezone)
    booking_time_obj = start_time_business.time()
    if booking_time_obj < settings.business_start_time or booking_time_obj >= settings.business_end_time:
        # Format times in user's timezone for error message
        business_start_user, business_end_user = timezone_service.get_business_hours_in_timezone(
            db=db,
            target_timezone=user_timezone,
            location_id=location_id,
            date_obj=booking_date
        )
        if business_start_user and business_end_user:
            raise ValueError(f"Booking must be within business hours: {business_start_user.strftime('%H:%M')} - {business_end_user.strftime('%H:%M')} (your time)")
        else:
            raise ValueError(f"Booking is outside business hours")
    
    # Handle barber assignment
    if barber_id:
        # Verify barber exists and is active
        barber = db.query(models.User).filter(
            models.User.id == barber_id,
            models.User.role.in_(["barber", "admin", "super_admin"]),
            models.User.is_active == True
        ).first()
        
        if not barber:
            raise ValueError(f"Barber with ID {barber_id} not found or not active")
        
        # Check if barber is available at this time
        end_time_business = start_time_business + timedelta(minutes=SERVICES[service]["duration"])
        is_available = barber_availability_service.is_barber_available(
            db=db,
            barber_id=barber_id,
            check_date=booking_date,
            start_time=start_time_business.time(),
            end_time=end_time_business.time()
        )
        
        if not is_available:
            raise ValueError(f"Barber is not available at {booking_time} on {booking_date}")
    else:
        # Find an available barber
        available_barbers = barber_availability_service.get_available_barbers_for_slot(
            db=db,
            check_date=booking_date,
            start_time=start_time_business.time(),
            end_time=(start_time_business + timedelta(minutes=SERVICES[service]["duration"])).time()
        )
        
        if not available_barbers:
            raise ValueError(f"No barbers available at {booking_time} on {booking_date}")
        
        # Assign first available barber
        barber = available_barbers[0]
        barber_id = barber.id
        logger.info(f"Auto-assigned barber {barber.name} (ID: {barber_id}) for booking")
    
    # Check for conflicts
    service_duration = SERVICES[service]["duration"]
    end_time_utc = start_time_utc + timedelta(minutes=service_duration)
    
    # Check for conflicts - get appointments for the assigned barber only
    potential_conflicts = db.query(models.Appointment).filter(
        and_(
            models.Appointment.barber_id == barber_id,
            models.Appointment.status.in_(["scheduled", "confirmed", "pending"]),
            models.Appointment.start_time >= start_time_utc.replace(tzinfo=None) - timedelta(hours=1),
            models.Appointment.start_time <= start_time_utc.replace(tzinfo=None) + timedelta(hours=1)
        )
    ).all()
    
    # Check for actual conflicts
    for appointment in potential_conflicts:
        if appointment.start_time.tzinfo is None:
            appointment_start = pytz.UTC.localize(appointment.start_time)
        else:
            appointment_start = appointment.start_time
            
        appointment_end = appointment_start + timedelta(minutes=appointment.duration_minutes)
        
        # Add buffer times
        appointment_buffer_before = timedelta(minutes=appointment.buffer_time_before or 0)
        appointment_buffer_after = timedelta(minutes=appointment.buffer_time_after or 0)
        
        appointment_start_with_buffer = appointment_start - appointment_buffer_before
        appointment_end_with_buffer = appointment_end + appointment_buffer_after
        
        # Check if there's any overlap
        if not (end_time_utc.replace(tzinfo=None) <= appointment_start_with_buffer.replace(tzinfo=None) or 
               start_time_utc.replace(tzinfo=None) >= appointment_end_with_buffer.replace(tzinfo=None)):
            existing_start_user = timezone_service.convert_from_utc(appointment_start, user_timezone)
            raise ValueError(f"This barber already has an appointment at {existing_start_user.strftime('%H:%M')} on {booking_date.strftime('%Y-%m-%d')}")
    
    # Create appointment with UTC time and timezone tracking
    appointment = models.Appointment(
        user_id=user_id,
        barber_id=barber_id,
        client_id=client_id,
        service_name=service,
        start_time=start_time_utc.replace(tzinfo=None),  # Store as naive datetime in UTC
        duration_minutes=SERVICES[service]["duration"],
        price=SERVICES[service]["price"],
        status="scheduled",
        notes=notes,
        buffer_time_before=buffer_time_before,
        buffer_time_after=buffer_time_after,
        location_id=location_id,
        # Enhanced timezone tracking
        created_timezone=user_timezone,
        user_timezone=user_timezone,
        display_timezone=user_timezone
    )
    
    logger.info(f"Created appointment at {start_time_utc} UTC (user time: {start_time_user})")
    
    db.add(appointment)
    db.commit()
    db.refresh(appointment)
    
    # Send appointment confirmation notifications
    try:
        notification_service = get_notification_service()
        if notification_service:
            # Create enhanced notification context with timezone information
            context = {
                "client_name": f"{appointment.client.first_name} {appointment.client.last_name}" if appointment.client else user.name,
                "service_name": service,
                "appointment_date": start_time_user.strftime("%B %d, %Y"),
                "appointment_time": start_time_user.strftime("%I:%M %p"),
                "appointment_timezone": user_timezone,
                "duration": SERVICES[service]["duration"],
                "price": SERVICES[service]["price"],
                "barber_name": barber.name if barber else None,
                "business_name": getattr(settings, 'business_name', 'BookedBarber'),
                "business_phone": getattr(settings, 'business_phone', '(555) 123-4567'),
                "current_year": datetime.now().year,
                "appointment_id": appointment.id,
                "timezone_info": {
                    "user_timezone": user_timezone,
                    "business_timezone": business_tz_str,
                    "display_time_user": start_time_user.strftime("%I:%M %p %Z"),
                    "display_time_business": start_time_business.strftime("%I:%M %p %Z")
                }
            }
            
            # Queue confirmation notification
            notification_service.queue_notification(
                db=db,
                user=user,
                template_name="appointment_confirmation",
                context=context,
                appointment_id=appointment.id
            )
            
            # Schedule reminder notifications
            notification_service.schedule_appointment_reminders(db, appointment)
            
            logger.info(f"Queued confirmation and reminder notifications for appointment {appointment.id}")
            
    except Exception as e:
        logger.error(f"Failed to queue appointment notifications: {e}")
        # Don't fail the booking if notification fails
    
    return appointment


# Helper function to maintain backward compatibility
def create_booking_legacy(
    db: Session,
    user_id: int,
    booking_date: date,
    booking_time: str,
    service: str,
    user_timezone: Optional[str] = None,
    **kwargs
) -> models.Appointment:
    """Legacy wrapper for create_booking function."""
    return create_booking(
        db=db,
        user_id=user_id,
        booking_date=booking_date,
        booking_time=booking_time,
        service=service,
        user_timezone=user_timezone,
        **kwargs
    )