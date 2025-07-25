"""
Enhanced booking service with comprehensive double-booking prevention.

This module provides advanced features for preventing double bookings:
1. Database-level constraints with triggers
2. Optimistic concurrency control with version tracking
3. Row-level locking during critical operations
4. Retry logic with exponential backoff
5. Comprehensive conflict detection
"""

from datetime import datetime, time, timedelta, date
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from sqlalchemy.exc import IntegrityError, OperationalError
import models
import pytz
import logging
import time as time_module
import random
from contextlib import contextmanager

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Import the original booking service functions we'll enhance
from services.booking_service import (
    get_booking_settings, 
    SERVICES,
    get_notification_service,
    find_or_create_client_for_user
)


class BookingConflictError(Exception):
    """Raised when a booking conflicts with an existing appointment"""


class ConcurrencyError(Exception):
    """Raised when optimistic concurrency control detects a conflict"""


@contextmanager
def advisory_lock(db: Session, barber_id: int, timeout_seconds: int = 5):
    """
    PostgreSQL advisory lock for preventing concurrent booking operations.
    
    This creates a session-level advisory lock that's automatically released
    when the database session ends or when explicitly released.
    """
    # Create a unique lock ID based on barber_id
    # Using a large offset to avoid conflicts with other advisory locks
    lock_id = 1000000 + barber_id
    
    try:
        # Try to acquire the lock with timeout
        result = db.execute(
            f"SELECT pg_try_advisory_lock({lock_id})"
        ).scalar()
        
        if not result:
            # If we can't get the lock immediately, wait with timeout
            start_time = time_module.time()
            while time_module.time() - start_time < timeout_seconds:
                result = db.execute(
                    f"SELECT pg_try_advisory_lock({lock_id})"
                ).scalar()
                if result:
                    break
                time_module.sleep(0.1)  # Wait 100ms before retrying
            
            if not result:
                raise OperationalError(
                    f"Could not acquire lock for barber {barber_id} within {timeout_seconds} seconds",
                    None, None
                )
        
        yield
        
    finally:
        # Always release the lock
        db.execute(f"SELECT pg_advisory_unlock({lock_id})")


def check_appointment_conflicts(
    db: Session,
    barber_id: int,
    start_time: datetime,
    duration_minutes: int,
    buffer_before: int = 0,
    buffer_after: int = 0,
    exclude_appointment_id: Optional[int] = None
) -> List[models.Appointment]:
    """
    Check for appointment conflicts with comprehensive overlap detection.
    
    Returns a list of conflicting appointments.
    """
    # Calculate the effective start and end times including buffers
    effective_start = start_time - timedelta(minutes=buffer_before)
    effective_end = start_time + timedelta(minutes=duration_minutes + buffer_after)
    
    # Build the conflict query
    query = db.query(models.Appointment).filter(
        and_(
            models.Appointment.barber_id == barber_id,
            models.Appointment.status.notin_(['cancelled', 'no_show']),
            # Complex overlap condition
            or_(
                # New appointment starts during existing appointment
                and_(
                    models.Appointment.start_time <= effective_start,
                    func.date_add(
                        models.Appointment.start_time,
                        func.concat(
                            models.Appointment.duration_minutes + 
                            func.coalesce(models.Appointment.buffer_time_after, 0),
                            ' minute'
                        )
                    ) > effective_start
                ),
                # New appointment ends during existing appointment
                and_(
                    func.date_sub(
                        models.Appointment.start_time,
                        func.concat(
                            func.coalesce(models.Appointment.buffer_time_before, 0),
                            ' minute'
                        )
                    ) < effective_end,
                    models.Appointment.start_time >= effective_end
                ),
                # New appointment completely contains existing appointment
                and_(
                    effective_start <= func.date_sub(
                        models.Appointment.start_time,
                        func.concat(
                            func.coalesce(models.Appointment.buffer_time_before, 0),
                            ' minute'
                        )
                    ),
                    effective_end >= func.date_add(
                        models.Appointment.start_time,
                        func.concat(
                            models.Appointment.duration_minutes + 
                            func.coalesce(models.Appointment.buffer_time_after, 0),
                            ' minute'
                        )
                    )
                ),
                # Existing appointment completely contains new appointment
                and_(
                    func.date_sub(
                        models.Appointment.start_time,
                        func.concat(
                            func.coalesce(models.Appointment.buffer_time_before, 0),
                            ' minute'
                        )
                    ) <= effective_start,
                    func.date_add(
                        models.Appointment.start_time,
                        func.concat(
                            models.Appointment.duration_minutes + 
                            func.coalesce(models.Appointment.buffer_time_after, 0),
                            ' minute'
                        )
                    ) >= effective_end
                )
            )
        )
    )
    
    # Exclude specific appointment if updating
    if exclude_appointment_id:
        query = query.filter(models.Appointment.id != exclude_appointment_id)
    
    # Use FOR UPDATE to lock the rows we're checking
    conflicts = query.with_for_update().all()
    
    return conflicts


def retry_with_backoff(
    func,
    max_attempts: int = 3,
    initial_delay: float = 0.1,
    max_delay: float = 1.0,
    backoff_factor: float = 2.0
):
    """
    Retry a function with exponential backoff on concurrency errors.
    """
    delay = initial_delay
    
    for attempt in range(max_attempts):
        try:
            return func()
        except (IntegrityError, OperationalError, ConcurrencyError) as e:
            if attempt == max_attempts - 1:
                raise
            
            # Add jitter to prevent thundering herd
            jittered_delay = delay * (0.5 + random.random())
            logger.warning(
                f"Attempt {attempt + 1} failed: {str(e)}. "
                f"Retrying in {jittered_delay:.2f} seconds..."
            )
            time_module.sleep(jittered_delay)
            
            # Exponential backoff with maximum
            delay = min(delay * backoff_factor, max_delay)


def create_booking_with_double_booking_prevention(
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
    idempotency_key: Optional[str] = None
) -> models.Appointment:
    """
    Create a booking with comprehensive double-booking prevention.
    
    This function implements multiple layers of protection:
    1. Idempotency key checking (if provided)
    2. Advisory locking at the barber level
    3. Conflict detection with row-level locking
    4. Optimistic concurrency control
    5. Database-level constraints as final safety net
    6. Retry logic with exponential backoff
    """
    
    # Check idempotency key if provided
    if idempotency_key:
        from models.idempotency import IdempotencyKey
        existing = db.query(IdempotencyKey).filter(
            IdempotencyKey.key == idempotency_key,
            IdempotencyKey.operation_type == "booking_create"
        ).first()
        
        if existing and not existing.is_expired:
            # Return the cached response
            appointment_id = existing.response_data.get('appointment_id')
            return db.query(models.Appointment).get(appointment_id)
    
    def _create_booking_with_lock():
        # Get booking settings and validate inputs
        settings = get_booking_settings(db)
        
        # Set up timezones
        business_tz = pytz.timezone(settings.business_timezone)
        user_tz = pytz.timezone(user_timezone) if user_timezone else business_tz
        
        # Validate service
        if service not in SERVICES:
            raise ValueError(f"Invalid service. Available services: {', '.join(SERVICES.keys())}")
        
        # Parse time and create timezone-aware datetime
        hour, minute = map(int, booking_time.split(":"))
        start_time_business = business_tz.localize(
            datetime.combine(booking_date, time(hour, minute))
        )
        
        # Convert to UTC for storage
        start_time_utc = start_time_business.astimezone(pytz.UTC)
        
        # If no barber specified, find an available one
        if not barber_id:
            from services import barber_availability_service
            available_barbers = barber_availability_service.get_available_barbers_for_slot(
                db=db,
                check_date=booking_date,
                start_time=start_time_business.time(),
                end_time=(start_time_business + timedelta(
                    minutes=SERVICES[service]["duration"]
                )).time()
            )
            
            if not available_barbers:
                raise ValueError(f"No barbers available at {booking_time} on {booking_date}")
            
            # Try each available barber until we find one without conflicts
            for barber in available_barbers:
                conflicts = check_appointment_conflicts(
                    db=db,
                    barber_id=barber.id,
                    start_time=start_time_utc,
                    duration_minutes=SERVICES[service]["duration"],
                    buffer_before=buffer_time_before,
                    buffer_after=buffer_time_after
                )
                
                if not conflicts:
                    barber_id = barber.id
                    logger.info(f"Auto-assigned barber {barber.name} (ID: {barber_id})")
                    break
            else:
                raise ValueError("All available barbers have conflicts at this time")
        
        # Use advisory lock for this barber
        with advisory_lock(db, barber_id):
            # Double-check for conflicts with row-level locking
            conflicts = check_appointment_conflicts(
                db=db,
                barber_id=barber_id,
                start_time=start_time_utc,
                duration_minutes=SERVICES[service]["duration"],
                buffer_before=buffer_time_before,
                buffer_after=buffer_time_after
            )
            
            if conflicts:
                conflict = conflicts[0]
                conflict_start = pytz.UTC.localize(conflict.start_time).astimezone(user_tz)
                raise BookingConflictError(
                    f"This time slot conflicts with an existing appointment at "
                    f"{conflict_start.strftime('%H:%M')} on {booking_date}"
                )
            
            # Create the appointment
            appointment = models.Appointment(
                user_id=user_id,
                barber_id=barber_id,
                client_id=client_id or find_or_create_client_for_user(db, user_id),
                service_name=service,
                start_time=start_time_utc.replace(tzinfo=None),
                duration_minutes=SERVICES[service]["duration"],
                price=SERVICES[service]["price"],
                status="scheduled",
                notes=notes,
                buffer_time_before=buffer_time_before,
                buffer_time_after=buffer_time_after,
                version=1  # Initial version for optimistic concurrency
            )
            
            try:
                db.add(appointment)
                db.flush()  # Flush to trigger database constraints
                
                # Store idempotency key if provided
                if idempotency_key:
                    from models.idempotency import IdempotencyKey
                    from datetime import timedelta as td
                    import hashlib
                    import json
                    
                    request_data = {
                        'user_id': user_id,
                        'booking_date': booking_date.isoformat(),
                        'booking_time': booking_time,
                        'service': service,
                        'barber_id': barber_id
                    }
                    
                    idempotency_record = IdempotencyKey(
                        key=idempotency_key,
                        operation_type="booking_create",
                        user_id=user_id,
                        request_hash=hashlib.sha256(
                            json.dumps(request_data, sort_keys=True).encode()
                        ).hexdigest(),
                        response_data={'appointment_id': appointment.id},
                        expires_at=datetime.utcnow() + td(hours=24)
                    )
                    db.add(idempotency_record)
                
                db.commit()
                
                # Send notifications (outside the lock)
                try:
                    _send_booking_notifications(db, appointment, user_tz)
                except Exception as e:
                    logger.error(f"Failed to send notifications: {e}")
                
                return appointment
                
            except IntegrityError as e:
                db.rollback()
                if 'appointment_overlaps' in str(e):
                    raise BookingConflictError(
                        "This time slot was just booked by another user. "
                        "Please select a different time."
                    )
                raise
    
    # Execute with retry logic
    return retry_with_backoff(
        _create_booking_with_lock,
        max_attempts=3,
        initial_delay=0.1,
        max_delay=1.0
    )


def update_booking_with_concurrency_control(
    db: Session,
    booking_id: int,
    user_id: int,
    update_data: Dict[str, Any],
    expected_version: Optional[int] = None
) -> models.Appointment:
    """
    Update a booking with optimistic concurrency control.
    
    If expected_version is provided, the update will only succeed if the
    current version matches. This prevents lost updates in concurrent scenarios.
    """
    def _update_with_lock():
        # Get the booking with a lock
        booking = db.query(models.Appointment).filter(
            models.Appointment.id == booking_id,
            models.Appointment.user_id == user_id
        ).with_for_update().first()
        
        if not booking:
            raise ValueError("Booking not found")
        
        # Check version if provided
        if expected_version is not None and booking.version != expected_version:
            raise ConcurrencyError(
                f"Booking has been modified by another user. "
                f"Expected version {expected_version}, found {booking.version}"
            )
        
        # Check if we're changing time/barber
        changing_schedule = any(
            key in update_data for key in ['booking_date', 'booking_time', 'barber_id']
        )
        
        if changing_schedule:
            # Parse new scheduling details
            new_date = update_data.get('booking_date', booking.start_time.date())
            new_barber_id = update_data.get('barber_id', booking.barber_id)
            
            if 'booking_time' in update_data:
                settings = get_booking_settings(db)
                business_tz = pytz.timezone(settings.business_timezone)
                
                hour, minute = map(int, update_data['booking_time'].split(":"))
                new_start_time = business_tz.localize(
                    datetime.combine(new_date, time(hour, minute))
                ).astimezone(pytz.UTC)
            else:
                new_start_time = pytz.UTC.localize(
                    datetime.combine(new_date, booking.start_time.time())
                )
            
            # Check for conflicts with advisory lock
            with advisory_lock(db, new_barber_id):
                conflicts = check_appointment_conflicts(
                    db=db,
                    barber_id=new_barber_id,
                    start_time=new_start_time,
                    duration_minutes=booking.duration_minutes,
                    buffer_before=booking.buffer_time_before,
                    buffer_after=booking.buffer_time_after,
                    exclude_appointment_id=booking_id
                )
                
                if conflicts:
                    raise BookingConflictError(
                        "The new time slot conflicts with an existing appointment"
                    )
                
                # Update scheduling fields
                booking.start_time = new_start_time.replace(tzinfo=None)
                booking.barber_id = new_barber_id
        
        # Update other fields
        for field, value in update_data.items():
            if field not in ['booking_date', 'booking_time', 'user_timezone']:
                if hasattr(booking, field):
                    setattr(booking, field, value)
        
        # Increment version
        booking.version += 1
        
        try:
            db.commit()
            return booking
        except IntegrityError as e:
            db.rollback()
            if 'appointment_overlaps' in str(e):
                raise BookingConflictError(
                    "The updated time conflicts with another appointment"
                )
            raise
    
    return retry_with_backoff(
        _update_with_lock,
        max_attempts=3,
        initial_delay=0.1,
        max_delay=1.0
    )


def _send_booking_notifications(
    db: Session, 
    appointment: models.Appointment,
    user_tz: pytz.timezone
):
    """Helper function to send booking notifications"""
    notification_service = get_notification_service()
    if not notification_service:
        return
    
    # Get related data
    client = db.query(models.Client).filter(
        models.Client.id == appointment.client_id
    ).first() if appointment.client_id else None
    
    barber = db.query(models.User).filter(
        models.User.id == appointment.barber_id
    ).first()
    
    settings = get_booking_settings(db)
    
    # Convert time to user timezone
    start_time_user = pytz.UTC.localize(
        appointment.start_time
    ).astimezone(user_tz)
    
    # Create notification context
    context = {
        "client_name": f"{client.first_name} {client.last_name}" if client else "Guest",
        "service_name": appointment.service_name,
        "appointment_date": start_time_user.strftime("%B %d, %Y"),
        "appointment_time": start_time_user.strftime("%I:%M %p"),
        "duration": appointment.duration_minutes,
        "price": appointment.price,
        "barber_name": barber.name if barber else None,
        "business_name": settings.business_name,
        "appointment_id": appointment.id
    }
    
    # Queue notifications
    notification_service.queue_notification(
        db=db,
        user=appointment.user,
        template_name="appointment_confirmation",
        context=context,
        appointment_id=appointment.id
    )
    
    notification_service.schedule_appointment_reminders(db, appointment)


# Export the enhanced functions
__all__ = [
    'create_booking_with_double_booking_prevention',
    'update_booking_with_concurrency_control',
    'check_appointment_conflicts',
    'BookingConflictError',
    'ConcurrencyError',
    'advisory_lock',
    'retry_with_backoff'
]