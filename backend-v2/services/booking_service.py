from datetime import datetime, time, timedelta, date
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
import models

# Fixed service configuration
SERVICES = {
    "Haircut": {"duration": 30, "price": 30},
    "Shave": {"duration": 30, "price": 20},
    "Haircut & Shave": {"duration": 30, "price": 45}
}

# Business hours
BUSINESS_START = time(9, 0)  # 9 AM
BUSINESS_END = time(17, 0)   # 5 PM
SLOT_DURATION = 30  # minutes

def get_available_slots(db: Session, target_date: date) -> List[dict]:
    """Get available time slots for a given date."""
    # Generate all possible slots for the day
    all_slots = []
    current_time = datetime.combine(target_date, BUSINESS_START)
    end_time = datetime.combine(target_date, BUSINESS_END)
    
    while current_time < end_time:
        all_slots.append({
            "time": current_time.strftime("%H:%M"),
            "datetime": current_time
        })
        current_time += timedelta(minutes=SLOT_DURATION)
    
    # Get existing appointments for the day
    start_of_day = datetime.combine(target_date, time.min)
    end_of_day = datetime.combine(target_date, time.max)
    
    existing_appointments = db.query(models.Appointment).filter(
        and_(
            models.Appointment.start_time >= start_of_day,
            models.Appointment.start_time < end_of_day,
            models.Appointment.status != "cancelled"
        )
    ).all()
    
    # Mark slots as unavailable if they conflict with existing appointments
    available_slots = []
    for slot in all_slots:
        is_available = True
        slot_end = slot["datetime"] + timedelta(minutes=SLOT_DURATION)
        
        for appointment in existing_appointments:
            appointment_end = appointment.start_time + timedelta(minutes=appointment.duration_minutes)
            # Check if there's any overlap
            if not (slot_end <= appointment.start_time or slot["datetime"] >= appointment_end):
                is_available = False
                break
        
        if is_available:
            available_slots.append({
                "time": slot["time"],
                "available": True
            })
    
    return available_slots

def create_booking(
    db: Session,
    user_id: int,
    booking_date: date,
    booking_time: str,
    service: str
) -> models.Appointment:
    """Create a new booking."""
    # Validate service
    if service not in SERVICES:
        raise ValueError(f"Invalid service. Available services: {', '.join(SERVICES.keys())}")
    
    # Parse time and create datetime
    hour, minute = map(int, booking_time.split(":"))
    start_time = datetime.combine(booking_date, time(hour, minute))
    
    # Check if slot is available
    end_time = start_time + timedelta(minutes=SLOT_DURATION)
    
    # Check for conflicts
    existing = db.query(models.Appointment).filter(
        and_(
            models.Appointment.status != "cancelled",
            or_(
                and_(
                    models.Appointment.start_time >= start_time,
                    models.Appointment.start_time < end_time
                ),
                and_(
                    models.Appointment.start_time <= start_time,
                    models.Appointment.start_time + timedelta(minutes=models.Appointment.duration_minutes) > start_time
                )
            )
        )
    ).first()
    
    if existing:
        raise ValueError("This time slot is already booked")
    
    # Create appointment
    appointment = models.Appointment(
        user_id=user_id,
        service_name=service,
        start_time=start_time,
        duration_minutes=SERVICES[service]["duration"],
        price=SERVICES[service]["price"],
        status="scheduled"
    )
    
    db.add(appointment)
    db.commit()
    db.refresh(appointment)
    
    return appointment

def get_user_bookings(db: Session, user_id: int) -> List[models.Appointment]:
    """Get all bookings for a user."""
    return db.query(models.Appointment).filter(
        models.Appointment.user_id == user_id
    ).order_by(models.Appointment.start_time.desc()).all()

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
    
    # Check if booking is in the future
    if booking.start_time <= datetime.now():
        raise ValueError("Cannot cancel a booking that has already started")
    
    booking.status = "cancelled"
    db.commit()
    db.refresh(booking)
    
    return booking