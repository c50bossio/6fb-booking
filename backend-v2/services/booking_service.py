from datetime import datetime, time, timedelta, date
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
import models
import pytz
import logging
from services import barber_availability_service
from config import settings

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

def get_available_slots(db: Session, target_date: date, user_timezone: Optional[str] = None, include_next_available: bool = True) -> Dict[str, Any]:
    """Get available time slots for a given date with configurable settings.
    
    Args:
        db: Database session
        target_date: Date to check for available slots
        user_timezone: User's timezone string (e.g., 'America/Los_Angeles'). If None, uses business timezone.
        include_next_available: Whether to find and mark the next available slot
    
    Returns:
        Dict containing available slots with times displayed in user's timezone
    """
    # Get booking settings from database
    settings = get_booking_settings(db)
    
    # Set up timezones
    business_tz = pytz.timezone(settings.business_timezone)
    user_tz = pytz.timezone(user_timezone) if user_timezone else business_tz
    
    logger.info(f"Timezone conversion: Business TZ={settings.business_timezone}, User TZ={user_timezone or settings.business_timezone}")
    
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
        # Convert to user timezone for display
        current_time_user = current_time.astimezone(user_tz)
        
        all_slots.append({
            "time": current_time_user.strftime("%H:%M"),
            "datetime": current_time,  # Keep business timezone datetime for comparisons
            "datetime_user": current_time_user  # User timezone for display
        })
        current_time += timedelta(minutes=settings.slot_duration_minutes)
    
    # Get existing appointments for the day (convert to UTC for database query)
    start_of_day = business_tz.localize(datetime.combine(target_date, time.min))
    end_of_day = business_tz.localize(datetime.combine(target_date, time.max))
    
    # Convert to UTC for database query (assuming database stores in UTC)
    start_of_day_utc = start_of_day.astimezone(pytz.UTC)
    end_of_day_utc = end_of_day.astimezone(pytz.UTC)
    
    existing_appointments = db.query(models.Appointment).filter(
        and_(
            models.Appointment.start_time >= start_of_day_utc,
            models.Appointment.start_time < end_of_day_utc,
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
        slot_start_utc = slot["datetime"].astimezone(pytz.UTC)
        slot_end_utc = slot_end.astimezone(pytz.UTC)
        
        for appointment in existing_appointments:
            # Ensure appointment times are timezone-aware (they should be in UTC from database)
            if appointment.start_time.tzinfo is None:
                appointment_start = pytz.UTC.localize(appointment.start_time)
            else:
                appointment_start = appointment.start_time
                
            appointment_end = appointment_start + timedelta(minutes=appointment.duration_minutes)
            
            # Check if there's any overlap
            if not (slot_end_utc <= appointment_start or slot_start_utc >= appointment_end):
                is_available = False
                break
        
        # Always create slot data, but mark availability correctly
        slot_data = {
            "time": slot["time"],
            "available": is_available,
            "is_next_available": False
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
                "datetime": next_available_slot.isoformat()
            }
        else:
            # Search next few days for the soonest available slot
            # If target_date is today and no slots available, start search from tomorrow
            search_start_date = target_date
            if target_date == date.today() and len(available_slots) == 0:
                search_start_date = target_date + timedelta(days=1)
            
            next_slot = get_next_available_slot(db, search_start_date, user_timezone=user_timezone)
            if next_slot:
                next_available_summary = {
                    "date": next_slot.date().isoformat(),
                    "time": next_slot.strftime("%H:%M"),
                    "datetime": next_slot.isoformat()
                }
    
    return {
        "date": target_date.isoformat(),
        "slots": available_slots,
        "next_available": next_available_summary,
        "business_hours": {
            "start": settings.business_start_time.strftime("%H:%M"),
            "end": settings.business_end_time.strftime("%H:%M")
        },
        "slot_duration_minutes": settings.slot_duration_minutes
    }

def get_next_available_slot(db: Session, start_date: date, user_timezone: Optional[str] = None, max_days_ahead: int = 7) -> Optional[datetime]:
    """Find the next available slot across multiple days.
    
    Args:
        db: Database session
        start_date: Date to start searching from
        user_timezone: User's timezone string. If None, uses business timezone.
        max_days_ahead: Maximum days to search ahead
        
    Returns:
        Datetime of next available slot in user's timezone, or None if no slots available
    """
    settings = get_booking_settings(db)
    
    # Set up timezones
    business_tz = pytz.timezone(settings.business_timezone)
    user_tz = pytz.timezone(user_timezone) if user_timezone else business_tz
    
    # Start searching from the given date
    current_date = start_date
    max_search_date = start_date + timedelta(days=min(max_days_ahead, settings.max_advance_days))
    
    # Calculate the minimum allowed booking time (same logic as slot generation)
    now_business = datetime.now(business_tz)
    
    if current_date == now_business.date():
        min_allowed_time = now_business + timedelta(minutes=settings.min_lead_time_minutes)
        # Round up to next slot interval properly (handle hour overflow)
        min_allowed_time = min_allowed_time.replace(second=0, microsecond=0)
        if min_allowed_time.minute % settings.slot_duration_minutes != 0:
            # Calculate how many minutes to add to reach next slot
            minutes_to_add = settings.slot_duration_minutes - (min_allowed_time.minute % settings.slot_duration_minutes)
            min_allowed_time = min_allowed_time + timedelta(minutes=minutes_to_add)
    else:
        # For future dates, start from beginning of business day
        min_allowed_time = business_tz.localize(datetime.combine(current_date, settings.business_start_time))
    
    while current_date <= max_search_date:
        # Get available slots for this date (without next_available processing to avoid recursion)
        day_slots = get_available_slots(db, current_date, user_timezone=user_timezone, include_next_available=False)
        
        # Find the first available slot that meets the minimum time requirement
        for slot in day_slots["slots"]:
            if slot["available"]:
                # Parse the time and create datetime in business timezone
                time_str = slot["time"]
                hour, minute = map(int, time_str.split(":"))
                
                # Create timezone-aware datetime in business timezone  
                slot_datetime = business_tz.localize(datetime.combine(current_date, time(hour, minute)))
                
                # Use the same time filtering logic as slot generation
                if slot_datetime >= min_allowed_time:
                    # Return in user's timezone
                    return slot_datetime.astimezone(user_tz)
        
        # Move to next day - reset min_allowed_time for future dates
        current_date += timedelta(days=1)
        min_allowed_time = business_tz.localize(datetime.combine(current_date, settings.business_start_time))
    
    return None


def get_available_slots_with_barber_availability(
    db: Session, 
    target_date: date, 
    barber_id: Optional[int] = None, 
    user_timezone: Optional[str] = None, 
    include_next_available: bool = True
) -> Dict[str, Any]:
    """Get available time slots considering barber availability.
    
    Args:
        db: Database session
        target_date: Date to check for available slots
        barber_id: Specific barber ID (optional - if None, returns slots for all available barbers)
        user_timezone: User's timezone string. If None, uses business timezone.
        include_next_available: Whether to find and mark the next available slot
    
    Returns:
        Dict containing available slots with barber availability considered
    """
    # Get booking settings from database
    settings = get_booking_settings(db)
    
    # Set up timezones
    business_tz = pytz.timezone(settings.business_timezone)
    user_tz = pytz.timezone(user_timezone) if user_timezone else business_tz
    
    logger.info(f"Getting slots with barber availability: Barber={barber_id}, Date={target_date}, User TZ={user_timezone or settings.business_timezone}")
    
    if barber_id:
        # Get slots for specific barber
        barber = db.query(models.User).filter(
            models.User.id == barber_id,
            models.User.role.in_(["barber", "admin", "super_admin"]),
            models.User.is_active == True
        ).first()
        
        if not barber:
            raise ValueError(f"Barber with ID {barber_id} not found or not active")
        
        # Check if barber is available for this slot using the barber availability service
        day_of_week = target_date.weekday()
        
        # Get barber's availability for this day
        availability = barber_availability_service.get_barber_availability(db, barber_id, day_of_week)
        
        if not availability:
            return {
                "date": target_date.isoformat(),
                "barber_id": barber_id,
                "barber_name": barber.name,
                "slots": [],
                "next_available": None,
                "business_hours": {
                    "start": settings.business_start_time.strftime("%H:%M"),
                    "end": settings.business_end_time.strftime("%H:%M")
                },
                "slot_duration_minutes": settings.slot_duration_minutes,
                "availability_note": "Barber not available on this day"
            }
        
        # Generate slots based on barber's availability
        all_slots = []
        for av in availability:
            period_slots = _generate_slots_for_period(
                target_date, av.start_time, av.end_time, settings, business_tz, user_tz
            )
            all_slots.extend(period_slots)
        
        # Filter out slots with existing appointments
        available_slots = _filter_slots_by_appointments(
            db, all_slots, target_date, barber_id, settings
        )
        
        # Find next available slot if requested
        next_available_summary = None
        if include_next_available and settings.show_soonest_available:
            next_available_slot = next((slot for slot in available_slots if slot["available"]), None)
            if next_available_slot:
                next_available_summary = {
                    "date": target_date.isoformat(),
                    "time": next_available_slot["time"],
                    "barber_id": barber_id,
                    "barber_name": barber.name
                }
        
        return {
            "date": target_date.isoformat(),
            "barber_id": barber_id,
            "barber_name": barber.name,
            "slots": available_slots,
            "next_available": next_available_summary,
            "business_hours": {
                "start": settings.business_start_time.strftime("%H:%M"),
                "end": settings.business_end_time.strftime("%H:%M")
            },
            "slot_duration_minutes": settings.slot_duration_minutes
        }
    
    else:
        # Get slots for all available barbers
        available_barbers = barber_availability_service.get_available_barbers_for_slot(
            db=db,
            check_date=target_date,
            start_time=settings.business_start_time,
            end_time=settings.business_end_time
        )
        
        barber_slots = []
        overall_next_available = None
        
        for barber in available_barbers:
            barber_data = get_available_slots_with_barber_availability(
                db, target_date, barber.id, user_timezone, include_next_available=False
            )
            
            if barber_data["slots"]:
                barber_slots.append({
                    "barber_id": barber.id,
                    "barber_name": barber.name,
                    "slots": barber_data["slots"]
                })
                
                # Track earliest available slot across all barbers
                if include_next_available and not overall_next_available:
                    first_available = next((slot for slot in barber_data["slots"] if slot["available"]), None)
                    if first_available:
                        overall_next_available = {
                            "date": target_date.isoformat(),
                            "time": first_available["time"],
                            "datetime": f"{target_date.isoformat()}T{first_available['time']}:00",
                            "barber_id": barber.id,
                            "barber_name": barber.name
                        }
        
        return {
            "date": target_date.isoformat(),
            "available_barbers": barber_slots,
            "next_available": overall_next_available,
            "business_hours": {
                "start": settings.business_start_time.strftime("%H:%M"),
                "end": settings.business_end_time.strftime("%H:%M")
            },
            "slot_duration_minutes": settings.slot_duration_minutes
        }


def _generate_slots_for_period(
    target_date: date,
    start_time: time,
    end_time: time,
    settings: models.BookingSettings,
    business_tz: pytz.timezone,
    user_tz: pytz.timezone
) -> List[Dict[str, Any]]:
    """Generate time slots for a specific time period."""
    slots = []
    
    # Create timezone-aware start and end times in business timezone
    naive_start = datetime.combine(target_date, start_time)
    naive_end = datetime.combine(target_date, end_time)
    
    # Make them timezone-aware in business timezone
    period_start = business_tz.localize(naive_start)
    period_end = business_tz.localize(naive_end)
    
    # If this is today, start from current time + lead time buffer
    now_business = datetime.now(business_tz)
    
    if target_date == now_business.date():
        now_plus_buffer = now_business + timedelta(minutes=settings.min_lead_time_minutes)
        
        # Round up to next slot interval properly
        next_slot_time = now_plus_buffer.replace(second=0, microsecond=0)
        if next_slot_time.minute % settings.slot_duration_minutes != 0:
            minutes_to_add = settings.slot_duration_minutes - (next_slot_time.minute % settings.slot_duration_minutes)
            next_slot_time = next_slot_time + timedelta(minutes=minutes_to_add)
        
        # Use the later of period start or next available slot
        period_start = max(period_start, next_slot_time)
    
    current_time = period_start
    while current_time < period_end:
        # Convert to user timezone for display
        current_time_user = current_time.astimezone(user_tz)
        
        slots.append({
            "time": current_time_user.strftime("%H:%M"),
            "datetime": current_time,  # Keep business timezone datetime for comparisons
            "datetime_user": current_time_user  # User timezone for display
        })
        current_time += timedelta(minutes=settings.slot_duration_minutes)
    
    return slots


def _filter_slots_by_appointments(
    db: Session,
    slots: List[Dict[str, Any]],
    target_date: date,
    barber_id: int,
    settings: models.BookingSettings
) -> List[Dict[str, Any]]:
    """Filter slots by checking against existing appointments."""
    # Get existing appointments for this barber on this date
    start_of_day = datetime.combine(target_date, time.min)
    end_of_day = datetime.combine(target_date, time.max)
    
    existing_appointments = db.query(models.Appointment).filter(
        and_(
            models.Appointment.barber_id == barber_id,
            models.Appointment.start_time >= start_of_day,
            models.Appointment.start_time <= end_of_day,
            models.Appointment.status != "cancelled"
        )
    ).all()
    
    available_slots = []
    
    for slot in slots:
        is_available = True
        slot_end = slot["datetime"] + timedelta(minutes=settings.slot_duration_minutes)
        
        # Convert slot times to UTC for comparison with database times
        slot_start_utc = slot["datetime"].astimezone(pytz.UTC)
        slot_end_utc = slot_end.astimezone(pytz.UTC)
        
        for appointment in existing_appointments:
            # Ensure appointment times are timezone-aware
            if appointment.start_time.tzinfo is None:
                appointment_start = pytz.UTC.localize(appointment.start_time)
            else:
                appointment_start = appointment.start_time
                
            appointment_end = appointment_start + timedelta(minutes=appointment.duration_minutes)
            
            # Add buffer times
            buffer_before = timedelta(minutes=appointment.buffer_time_before or 0)
            buffer_after = timedelta(minutes=appointment.buffer_time_after or 0)
            
            appointment_start_with_buffer = appointment_start - buffer_before
            appointment_end_with_buffer = appointment_end + buffer_after
            
            # Check if there's any overlap
            if not (slot_end_utc <= appointment_start_with_buffer or slot_start_utc >= appointment_end_with_buffer):
                is_available = False
                break
        
        available_slots.append({
            "time": slot["time"],
            "available": is_available,
            "is_next_available": False
        })
    
    return available_slots

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
    buffer_time_after: int = 0
) -> models.Appointment:
    """Create a new booking using configurable settings.
    
    Args:
        db: Database session
        user_id: ID of the user making the booking
        booking_date: Date of the booking
        booking_time: Time of the booking in HH:MM format (in user's timezone)
        service: Name of the service
        user_timezone: User's timezone string. If None, uses business timezone.
        
    Returns:
        Created appointment object
    """
    # Get booking settings
    settings = get_booking_settings(db)
    
    # Set up timezones
    business_tz = pytz.timezone(settings.business_timezone)
    user_tz = pytz.timezone(user_timezone) if user_timezone else business_tz
    
    logger.info(f"Creating booking: Business TZ={settings.business_timezone}, User TZ={user_timezone or settings.business_timezone}")
    
    # Validate service
    if service not in SERVICES:
        raise ValueError(f"Invalid service. Available services: {', '.join(SERVICES.keys())}")
    
    # Parse time and create timezone-aware datetime in business timezone
    # Note: We treat the time as being in business timezone by default
    # This is the expected behavior for most booking systems
    hour, minute = map(int, booking_time.split(":"))
    start_time_business = business_tz.localize(datetime.combine(booking_date, time(hour, minute)))
    
    # Convert to user timezone for display/response
    start_time_user = start_time_business.astimezone(user_tz)
    
    # Convert to UTC for storage
    start_time_utc = start_time_business.astimezone(pytz.UTC)
    
    logger.debug(f"Booking time conversion: User TZ={start_time_user}, Business TZ={start_time_business}, UTC={start_time_utc}")
    
    # Validate booking time constraints
    # Get current time in business timezone for validation
    now_business = datetime.now(business_tz)
    min_booking_time = now_business + timedelta(minutes=settings.min_lead_time_minutes)
    max_booking_time = now_business + timedelta(days=settings.max_advance_days)
    
    if start_time_business < min_booking_time:
        raise ValueError(f"Booking must be at least {settings.min_lead_time_minutes} minutes in advance")
    
    if start_time_business > max_booking_time:
        raise ValueError(f"Booking cannot be more than {settings.max_advance_days} days in advance")
    
    # If barber_id is specified, validate barber availability
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
        # If no barber specified, find an available barber
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
    
    # Check if booking is within business hours (using business timezone)
    booking_time_obj = start_time_business.time()
    if booking_time_obj < settings.business_start_time or booking_time_obj >= settings.business_end_time:
        # Format times in user's timezone for error message
        business_start_user = business_tz.localize(datetime.combine(booking_date, settings.business_start_time)).astimezone(user_tz)
        business_end_user = business_tz.localize(datetime.combine(booking_date, settings.business_end_time)).astimezone(user_tz)
        raise ValueError(f"Booking must be within business hours: {business_start_user.strftime('%H:%M')} - {business_end_user.strftime('%H:%M')} (your time)")
    
    # Validate booking against business rules
    from services import booking_rules_service
    
    is_valid, rule_violations = booking_rules_service.validate_booking_against_rules(
        db=db,
        user_id=user_id,
        service_id=None,  # We don't have service_id here, using service name
        barber_id=barber_id,
        booking_date=booking_date,
        booking_time=start_time_business.time(),
        duration_minutes=SERVICES[service]["duration"],
        client_id=client_id
    )
    
    if not is_valid:
        raise ValueError(f"Booking violates business rules: {'; '.join(rule_violations)}")
    
    # Check if slot is available for the specific barber
    service_duration = SERVICES[service]["duration"]
    end_time_utc = start_time_utc + timedelta(minutes=service_duration)
    
    # Check for conflicts - get appointments for the assigned barber only
    potential_conflicts = db.query(models.Appointment).filter(
        and_(
            models.Appointment.barber_id == barber_id,  # Only check this barber's appointments
            models.Appointment.status.in_(["scheduled", "confirmed", "pending"]),  # Active appointments
            models.Appointment.start_time >= start_time_utc - timedelta(hours=1),  # Reduced search window
            models.Appointment.start_time <= start_time_utc + timedelta(hours=1)
        )
    ).all()
    
    # Check for actual conflicts by calculating end times with buffer consideration
    existing = None
    for appointment in potential_conflicts:
        # Ensure appointment times are timezone-aware
        if appointment.start_time.tzinfo is None:
            appointment_start = pytz.UTC.localize(appointment.start_time)
        else:
            appointment_start = appointment.start_time
            
        # Calculate appointment end time with duration
        appointment_end = appointment_start + timedelta(minutes=appointment.duration_minutes)
        
        # Add buffer times for more accurate conflict detection
        appointment_buffer_before = timedelta(minutes=appointment.buffer_time_before or 0)
        appointment_buffer_after = timedelta(minutes=appointment.buffer_time_after or 0)
        
        appointment_start_with_buffer = appointment_start - appointment_buffer_before
        appointment_end_with_buffer = appointment_end + appointment_buffer_after
        
        # Check if there's any overlap (considering buffers)
        if not (end_time_utc <= appointment_start_with_buffer or start_time_utc >= appointment_end_with_buffer):
            existing = appointment
            break
    
    if existing:
        # Provide more helpful error message with barber context
        existing_start_user = pytz.UTC.localize(existing.start_time) if existing.start_time.tzinfo is None else existing.start_time
        existing_start_user = existing_start_user.astimezone(user_tz)
        raise ValueError(f"This barber already has an appointment at {existing_start_user.strftime('%H:%M')} on {booking_date.strftime('%Y-%m-%d')}")
    
    # Create appointment with UTC time
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
        buffer_time_after=buffer_time_after
    )
    
    logger.info(f"Created appointment at {start_time_utc} UTC (user time: {start_time_user})")
    
    db.add(appointment)
    db.commit()
    db.refresh(appointment)
    
    # If this appointment has a client_id, update client metrics
    if client_id:
        try:
            from services import client_service
            client_service.update_client_metrics(db, client_id)
        except Exception as e:
            logger.warning(f"Failed to update client metrics for client {client_id}: {e}")
    
    # Send appointment confirmation notifications
    try:
        notification_service = get_notification_service()
        if notification_service:
            # Get client information for notifications
            client = None
            if client_id:
                client = db.query(models.Client).filter(models.Client.id == client_id).first()
            
            # Get barber information
            barber = db.query(models.User).filter(models.User.id == barber_id).first()
            
            # Get booking settings for business information
            booking_settings = get_booking_settings(db)
            
            # Create notification context
            context = {
                "client_name": f"{client.first_name} {client.last_name}" if client else appointment.user.name,
                "service_name": service,
                "appointment_date": start_time_user.strftime("%B %d, %Y"),
                "appointment_time": start_time_user.strftime("%I:%M %p"),
                "duration": SERVICES[service]["duration"],
                "price": SERVICES[service]["price"],
                "barber_name": barber.name if barber else None,
                "business_name": getattr(settings, 'business_name', getattr(settings, 'app_name', 'BookedBarber')),
                "business_address": getattr(booking_settings, 'business_address', None),
                "business_phone": getattr(settings, 'business_phone', '(555) 123-4567'),
                "current_year": datetime.now().year,
                "appointment_id": appointment.id
            }
            
            # Queue confirmation notification
            notification_service.queue_notification(
                db=db,
                user=appointment.user,
                template_name="appointment_confirmation",
                context=context,
                appointment_id=appointment.id
            )
            
            # Schedule reminder notifications
            notification_service.schedule_appointment_reminders(db, appointment)
            
            logger.info(f"Queued confirmation and reminder notifications for appointment {appointment.id}")
        else:
            logger.warning(f"Notification service not available for appointment {appointment.id}")
            
    except Exception as e:
        logger.error(f"Failed to queue appointment notifications: {e}")
        # Don't fail the booking if notification fails
    
    # Refresh and load relationships
    db.refresh(appointment)
    
    # Explicitly load client relationship if exists
    if appointment.client_id:
        appointment.client = db.query(models.Client).filter(
            models.Client.id == appointment.client_id
        ).first()
    
    # Explicitly load barber relationship if exists  
    if appointment.barber_id:
        appointment.barber = db.query(models.User).filter(
            models.User.id == appointment.barber_id
        ).first()
    
    return appointment


def create_guest_booking(
    db: Session,
    booking_date: date,
    booking_time: str,
    service: str,
    guest_info: Dict[str, Any],
    user_timezone: Optional[str] = None,
    notes: Optional[str] = None
) -> Dict[str, Any]:
    """Create a booking for a guest user (no authentication required).
    
    Args:
        db: Database session
        booking_date: Date of the booking
        booking_time: Time of the booking in HH:MM format
        service: Name of the service
        guest_info: Guest information dictionary with keys: first_name, last_name, email, phone
        user_timezone: User's timezone string. If None, uses business timezone.
        notes: Optional notes for the booking
        
    Returns:
        Dictionary with booking details for guest
    """
    import secrets
    
    # Get booking settings
    settings = get_booking_settings(db)
    
    # Set up timezones
    business_tz = pytz.timezone(settings.business_timezone)
    user_tz = pytz.timezone(user_timezone) if user_timezone else business_tz
    
    logger.info(f"Creating guest booking: Business TZ={settings.business_timezone}, User TZ={user_timezone or settings.business_timezone}")
    
    # Validate service
    if service not in SERVICES:
        raise ValueError(f"Invalid service. Available services: {', '.join(SERVICES.keys())}")
    
    # Parse time and create timezone-aware datetime in business timezone
    hour, minute = map(int, booking_time.split(":"))
    start_time_business = business_tz.localize(datetime.combine(booking_date, time(hour, minute)))
    
    # Convert to UTC for storage
    start_time_utc = start_time_business.astimezone(pytz.UTC)
    
    # Find an available barber for this slot
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
    logger.info(f"Auto-assigned barber {barber.name} (ID: {barber_id}) for guest booking")
    
    # Check if slot is available
    end_time_utc = start_time_utc + timedelta(minutes=SERVICES[service]["duration"])
    
    # Check for conflicts - get all appointments that might overlap (in UTC)
    potential_conflicts = db.query(models.Appointment).filter(
        and_(
            models.Appointment.status != "cancelled",
            models.Appointment.start_time >= start_time_utc - timedelta(hours=2),
            models.Appointment.start_time <= start_time_utc + timedelta(hours=2)
        )
    ).all()
    
    # Check for actual conflicts by calculating end times
    existing = None
    for appointment in potential_conflicts:
        # Ensure appointment times are timezone-aware
        if appointment.start_time.tzinfo is None:
            appointment_start = pytz.UTC.localize(appointment.start_time)
        else:
            appointment_start = appointment.start_time
            
        appointment_end = appointment_start + timedelta(minutes=appointment.duration_minutes)
        
        # Check if there's any overlap
        if not (end_time_utc <= appointment_start or start_time_utc >= appointment_end):
            existing = appointment
            break
    
    if existing:
        raise ValueError("This time slot is already booked")
    
    # Create or find client record for guest
    client_id = None
    try:
        from services import client_service
        
        # Try to find existing client by email
        existing_client = db.query(models.Client).filter(
            models.Client.email == guest_info["email"]
        ).first()
        
        if existing_client:
            client_id = existing_client.id
            logger.info(f"Found existing client {client_id} for email {guest_info['email']}")
        else:
            # Create new client record for the guest
            client_data = {
                "first_name": guest_info["first_name"],
                "last_name": guest_info["last_name"],
                "email": guest_info["email"],
                "phone": guest_info["phone"],
                "communication_preferences": {
                    "sms": True,
                    "email": True, 
                    "marketing": False,
                    "reminders": True,
                    "confirmations": True
                }
            }
            
            new_client = client_service.create_client(
                db=db,
                client_data=client_data,
                created_by_id=None  # Guest booking, no creating user
            )
            client_id = new_client.id
            logger.info(f"Created new client {client_id} for guest {guest_info['email']}")
    except Exception as e:
        logger.warning(f"Failed to create/find client for guest: {e}")
        # Continue without client_id
    
    # Generate confirmation code for guest
    confirmation_code = secrets.token_urlsafe(8).upper()
    
    # Create appointment with UTC time
    appointment = models.Appointment(
        user_id=None,  # No user for guest bookings
        barber_id=barber_id,
        client_id=client_id,
        service_name=service,
        start_time=start_time_utc.replace(tzinfo=None),  # Store as naive datetime in UTC
        duration_minutes=SERVICES[service]["duration"],
        price=SERVICES[service]["price"],
        status="scheduled",
        notes=f"Guest booking - {guest_info['first_name']} {guest_info['last_name']} ({guest_info['email']}, {guest_info['phone']})" + (f" - {notes}" if notes else "")
    )
    
    logger.info(f"Created guest appointment at {start_time_utc} UTC for {guest_info['first_name']} {guest_info['last_name']}")
    
    db.add(appointment)
    db.commit()
    db.refresh(appointment)
    
    # Return guest booking response
    return {
        "id": appointment.id,
        "service": service,
        "date": booking_date.isoformat(),
        "time": booking_time,
        "guest_name": f"{guest_info['first_name']} {guest_info['last_name']}",
        "guest_email": guest_info["email"],
        "guest_phone": guest_info["phone"],
        "amount": SERVICES[service]["price"],
        "status": appointment.status,
        "created_at": appointment.created_at,
        "confirmation_code": confirmation_code
    }


def find_or_create_client_for_user(db: Session, user_id: int) -> Optional[int]:
    """Find existing client record for a user or create one if needed."""
    try:
        # Get user details
        user = db.query(models.User).filter(models.User.id == user_id).first()
        if not user:
            return None
        
        # Try to find existing client by email
        existing_client = db.query(models.Client).filter(
            models.Client.email == user.email
        ).first()
        
        if existing_client:
            return existing_client.id
        
        # Create new client record for the user
        from services import client_service
        
        client_data = {
            "first_name": user.name.split()[0] if user.name else "Unknown",
            "last_name": " ".join(user.name.split()[1:]) if user.name and len(user.name.split()) > 1 else "",
            "email": user.email,
            "phone": user.phone,
            "communication_preferences": {
                "sms": True,
                "email": True, 
                "marketing": False,
                "reminders": True,
                "confirmations": True
            }
        }
        
        new_client = client_service.create_client(
            db=db,
            client_data=client_data,
            created_by_id=user_id  # Self-created
        )
        
        logger.info(f"Auto-created client record {new_client.id} for user {user_id}")
        return new_client.id
        
    except Exception as e:
        logger.error(f"Failed to find/create client for user {user_id}: {e}")
        return None

def get_user_bookings(db: Session, user_id: int, skip: int = 0, limit: int = 100, status: Optional[str] = None) -> List[models.Appointment]:
    """Get all bookings for a user with related client and barber information."""
    from sqlalchemy.orm import joinedload
    
    query = db.query(models.Appointment).filter(
        models.Appointment.user_id == user_id
    ).options(
        joinedload(models.Appointment.client),
        joinedload(models.Appointment.barber)
    )
    
    if status:
        query = query.filter(models.Appointment.status == status)
    
    return query.order_by(models.Appointment.start_time.desc()).offset(skip).limit(limit).all()

def count_user_bookings(db: Session, user_id: int, status: Optional[str] = None) -> int:
    """Count total bookings for a user."""
    query = db.query(models.Appointment).filter(
        models.Appointment.user_id == user_id
    )
    
    if status:
        query = query.filter(models.Appointment.status == status)
    
    return query.count()

def get_booking_by_id(db: Session, booking_id: int, user_id: int) -> Optional[models.Appointment]:
    """Get a specific booking by ID for a user."""
    return db.query(models.Appointment).filter(
        and_(
            models.Appointment.id == booking_id,
            models.Appointment.user_id == user_id
        )
    ).first()

def cancel_booking(db: Session, booking_id: int, user_id: int) -> Optional[models.Appointment]:
    """Cancel a booking."""
    booking = get_booking_by_id(db, booking_id, user_id)
    
    if not booking:
        return None
    
    if booking.status == "cancelled":
        raise ValueError("Booking is already cancelled")
    
    if booking.status == "completed":
        raise ValueError("Cannot cancel a completed booking")
    
    # Check if booking is in the future (compare in UTC)
    now_utc = datetime.now(pytz.UTC)
    booking_start_utc = pytz.UTC.localize(booking.start_time) if booking.start_time.tzinfo is None else booking.start_time
    
    if booking_start_utc <= now_utc:
        raise ValueError("Cannot cancel a booking that has already started")
    
    booking.status = "cancelled"
    db.commit()
    db.refresh(booking)
    
    # Send cancellation notification and cancel any pending notifications
    try:
        # TODO: Re-enable notification service when available
        logger.info(f"Skipping cancellation notifications for appointment {booking.id} - notification service disabled")
        pass
        
        # notification_service = get_notification_service()
        # if notification_service:
        #     # Cancel any pending notifications for this appointment
        #     notification_service.cancel_appointment_notifications(db, booking.id)
        #     
        #     # Get client and barber information for cancellation notification
        #     client = None
        #     if booking.client_id:
        #         client = db.query(models.Client).filter(models.Client.id == booking.client_id).first()
        #     
        #     barber = db.query(models.User).filter(models.User.id == booking.barber_id).first()
        #     
        #     # Create cancellation notification context
        #     context = {
        #         "client_name": client.first_name + " " + client.last_name if client else booking.user.name,
        #         "service_name": booking.service_name,
        #         "appointment_date": booking_start_utc.strftime("%B %d, %Y"),
        #         "appointment_time": booking_start_utc.strftime("%I:%M %p"),
        #         "barber_name": barber.name if barber else None,
        #         "business_name": "6FB Booking",
        #         "business_phone": "(555) 123-4567",
        #         "cancelled_by": "client",
        #         "cancellation_date": datetime.now().strftime("%B %d, %Y"),
        #         "current_year": datetime.now().year
        #     }
        #     
        #     # Queue cancellation notification
        #     notification_service.queue_notification(
        #         db=db,
        #         user=booking.user,
        #         template_name="appointment_cancellation",
        #         context=context,
        #         appointment_id=booking.id
        #         
        #     logger.info(f"Queued cancellation notification and cancelled pending notifications for appointment {booking.id}")
            
    except Exception as e:
        logger.error(f"Failed to handle cancellation notifications: {e}")
        # Don't fail the cancellation if notification fails
    
    return booking


def update_booking(
    db: Session,
    booking_id: int,
    user_id: int,
    update_data: Dict[str, Any]
) -> Optional[models.Appointment]:
    """Update an existing booking.
    
    Args:
        db: Database session
        booking_id: ID of the booking to update
        user_id: ID of the user making the update
        update_data: Dictionary containing fields to update
            - service: New service name (optional)
            - booking_date: New date (optional)
            - booking_time: New time in HH:MM format (optional)
            - notes: Updated notes (optional)
            - barber_id: New barber ID (optional)
            - user_timezone: User's timezone for time conversion (optional)
    
    Returns:
        Updated appointment object or None if booking not found
    """
    # Get the existing booking
    booking = get_booking_by_id(db, booking_id, user_id)
    
    if not booking:
        return None
    
    if booking.status == "cancelled":
        raise ValueError("Cannot update a cancelled booking")
    
    if booking.status == "completed":
        raise ValueError("Cannot update a completed booking")
    
    # Check if booking has already started
    now_utc = datetime.now(pytz.UTC)
    booking_start_utc = pytz.UTC.localize(booking.start_time) if booking.start_time.tzinfo is None else booking.start_time
    
    if booking_start_utc <= now_utc:
        raise ValueError("Cannot update a booking that has already started")
    
    # Get booking settings
    settings = get_booking_settings(db)
    
    # Set up timezones
    user_timezone = update_data.get('user_timezone')
    business_tz = pytz.timezone(settings.business_timezone)
    user_tz = pytz.timezone(user_timezone) if user_timezone else business_tz
    
    # Check if date/time is being changed
    if 'booking_date' in update_data or 'booking_time' in update_data:
        # Get new date and time
        new_date = update_data.get('booking_date', booking.start_time.date())
        new_time = update_data.get('booking_time')
        
        if new_time:
            # Parse time and create timezone-aware datetime
            hour, minute = map(int, new_time.split(":"))
            new_start_time_business = business_tz.localize(datetime.combine(new_date, time(hour, minute)))
        else:
            # Keep existing time but on new date
            old_time = booking.start_time.time()
            new_start_time_business = business_tz.localize(datetime.combine(new_date, old_time))
        
        # Convert to UTC for storage
        new_start_time_utc = new_start_time_business.astimezone(pytz.UTC)
        
        # Validate new booking time constraints
        now_business = datetime.now(business_tz)
        min_booking_time = now_business + timedelta(minutes=settings.min_lead_time_minutes)
        max_booking_time = now_business + timedelta(days=settings.max_advance_days)
        
        if new_start_time_business < min_booking_time:
            raise ValueError(f"Booking must be at least {settings.min_lead_time_minutes} minutes in advance")
        
        if new_start_time_business > max_booking_time:
            raise ValueError(f"Booking cannot be more than {settings.max_advance_days} days in advance")
        
        # Check if booking is within business hours
        booking_time_obj = new_start_time_business.time()
        if booking_time_obj < settings.business_start_time or booking_time_obj >= settings.business_end_time:
            business_start_user = business_tz.localize(datetime.combine(new_date, settings.business_start_time)).astimezone(user_tz)
            business_end_user = business_tz.localize(datetime.combine(new_date, settings.business_end_time)).astimezone(user_tz)
            raise ValueError(f"Booking must be within business hours: {business_start_user.strftime('%H:%M')} - {business_end_user.strftime('%H:%M')} (your time)")
        
        # Determine service duration
        service = update_data.get('service', booking.service_name)
        if service not in SERVICES:
            raise ValueError(f"Invalid service. Available services: {', '.join(SERVICES.keys())}")
        duration_minutes = SERVICES[service]["duration"]
        
        # Determine barber
        barber_id = update_data.get('barber_id', booking.barber_id)
        
        # Check if new slot is available
        end_time_utc = new_start_time_utc + timedelta(minutes=duration_minutes)
        
        # Check for conflicts excluding current booking
        potential_conflicts = db.query(models.Appointment).filter(
            and_(
                models.Appointment.id != booking_id,  # Exclude current booking
                models.Appointment.status != "cancelled",
                models.Appointment.barber_id == barber_id,
                models.Appointment.start_time >= new_start_time_utc - timedelta(hours=2),
                models.Appointment.start_time <= new_start_time_utc + timedelta(hours=2)
            )
        ).all()
        
        # Check for actual conflicts
        for appointment in potential_conflicts:
            if appointment.start_time.tzinfo is None:
                appointment_start = pytz.UTC.localize(appointment.start_time)
            else:
                appointment_start = appointment.start_time
                
            appointment_end = appointment_start + timedelta(minutes=appointment.duration_minutes)
            
            # Check if there's any overlap
            if not (end_time_utc <= appointment_start or new_start_time_utc >= appointment_end):
                raise ValueError("This time slot is already booked")
        
        # Check barber availability
        if barber_id:
            end_time_business = new_start_time_business + timedelta(minutes=duration_minutes)
            is_available = barber_availability_service.is_barber_available(
                db=db,
                barber_id=barber_id,
                check_date=new_date,
                start_time=new_start_time_business.time(),
                end_time=end_time_business.time()
            )
            
            if not is_available:
                raise ValueError(f"Barber is not available at the requested time")
        
        # Update start time
        booking.start_time = new_start_time_utc.replace(tzinfo=None)
    
    # Update other fields if provided
    if 'service' in update_data:
        service = update_data['service']
        if service not in SERVICES:
            raise ValueError(f"Invalid service. Available services: {', '.join(SERVICES.keys())}")
        booking.service_name = service
        booking.duration_minutes = SERVICES[service]["duration"]
        booking.price = SERVICES[service]["price"]
    
    if 'notes' in update_data:
        booking.notes = update_data['notes']
    
    if 'barber_id' in update_data and update_data['barber_id'] != booking.barber_id:
        # Verify new barber exists and is active
        new_barber_id = update_data['barber_id']
        barber = db.query(models.User).filter(
            models.User.id == new_barber_id,
            models.User.role.in_(["barber", "admin", "super_admin"]),
            models.User.is_active == True
        ).first()
        
        if not barber:
            raise ValueError(f"Barber with ID {new_barber_id} not found or not active")
        
        booking.barber_id = new_barber_id
    
    # Commit changes
    db.commit()
    db.refresh(booking)
    
    logger.info(f"Updated booking {booking_id} for user {user_id}")
    
    return booking


def reschedule_booking(
    db: Session,
    booking_id: int,
    user_id: int,
    new_date: date,
    new_time: str,
    user_timezone: Optional[str] = None
) -> Optional[models.Appointment]:
    """Reschedule an existing booking to a new date and time.
    
    Args:
        db: Database session
        booking_id: ID of the booking to reschedule
        user_id: ID of the user making the reschedule
        new_date: New date for the booking
        new_time: New time in HH:MM format (in user's timezone)
        user_timezone: User's timezone string. If None, uses business timezone.
    
    Returns:
        Updated appointment object or None if booking not found
    """
    # Use update_booking with only date and time fields
    update_data = {
        'booking_date': new_date,
        'booking_time': new_time,
        'user_timezone': user_timezone
    }
    
    return update_booking(db, booking_id, user_id, update_data)


def get_all_bookings(
    db: Session, 
    skip: int = 0, 
    limit: int = 100, 
    status: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    barber_id: Optional[int] = None
) -> List[models.Appointment]:
    """Get all bookings for admin/staff view with optional filters.
    
    Args:
        db: Database session
        skip: Number of records to skip (pagination)
        limit: Maximum number of records to return
        status: Filter by appointment status
        date_from: Start date filter
        date_to: End date filter
        barber_id: Filter by barber ID
    
    Returns:
        List of appointment objects
    """
    query = db.query(models.Appointment)
    
    # Apply filters
    if status:
        query = query.filter(models.Appointment.status == status)
    
    if date_from:
        query = query.filter(models.Appointment.start_time >= date_from)
    
    if date_to:
        # Include the entire end date by adding one day
        end_datetime = datetime.combine(date_to + timedelta(days=1), time.min)
        query = query.filter(models.Appointment.start_time < end_datetime)
    
    if barber_id:
        query = query.filter(models.Appointment.barber_id == barber_id)
    
    # Order by start time (most recent first)
    query = query.order_by(models.Appointment.start_time.desc())
    
    # Apply pagination and eager load relationships
    from sqlalchemy.orm import joinedload
    appointments = query.options(
        joinedload(models.Appointment.barber),
        joinedload(models.Appointment.client),
        joinedload(models.Appointment.user)
    ).offset(skip).limit(limit).all()
    
    # Add client information
    for appointment in appointments:
        if appointment.user_id:
            user = db.query(models.User).filter(models.User.id == appointment.user_id).first()
            if user:
                appointment.client_name = user.name or user.email
                appointment.client_email = user.email
                appointment.client_phone = getattr(user, 'phone', None)
        
        # Add barber information
        if appointment.barber_id:
            barber = db.query(models.User).filter(models.User.id == appointment.barber_id).first()
            if barber:
                appointment.barber_name = barber.name or barber.email
    
    return appointments


def count_all_bookings(
    db: Session,
    status: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    barber_id: Optional[int] = None
) -> int:
    """Count all bookings with optional filters.
    
    Args:
        db: Database session
        status: Filter by appointment status
        date_from: Start date filter
        date_to: End date filter
        barber_id: Filter by barber ID
    
    Returns:
        Total count of matching appointments
    """
    query = db.query(models.Appointment)
    
    # Apply same filters as get_all_bookings
    if status:
        query = query.filter(models.Appointment.status == status)
    
    if date_from:
        query = query.filter(models.Appointment.start_time >= date_from)
    
    if date_to:
        # Include the entire end date by adding one day
        end_datetime = datetime.combine(date_to + timedelta(days=1), time.min)
        query = query.filter(models.Appointment.start_time < end_datetime)
    
    if barber_id:
        query = query.filter(models.Appointment.barber_id == barber_id)
    
    return query.count()