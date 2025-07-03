from datetime import datetime, time, timedelta, date
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
import models
import pytz
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def get_barber_availability(db: Session, barber_id: int, day_of_week: Optional[int] = None) -> List[models.BarberAvailability]:
    """Get regular weekly availability for a barber"""
    query = db.query(models.BarberAvailability).filter(
        models.BarberAvailability.barber_id == barber_id,
        models.BarberAvailability.is_active == True
    )
    
    if day_of_week is not None:
        query = query.filter(models.BarberAvailability.day_of_week == day_of_week)
    
    return query.order_by(models.BarberAvailability.day_of_week, models.BarberAvailability.start_time).all()


def create_barber_availability(
    db: Session, 
    barber_id: int, 
    day_of_week: int, 
    start_time: time, 
    end_time: time
) -> models.BarberAvailability:
    """Create or update regular availability for a barber"""
    
    # Check if availability already exists for this day
    existing = db.query(models.BarberAvailability).filter(
        models.BarberAvailability.barber_id == barber_id,
        models.BarberAvailability.day_of_week == day_of_week,
        models.BarberAvailability.is_active == True
    ).first()
    
    if existing:
        # Update existing availability
        existing.start_time = start_time
        existing.end_time = end_time
        existing.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(existing)
        return existing
    else:
        # Create new availability
        availability = models.BarberAvailability(
            barber_id=barber_id,
            day_of_week=day_of_week,
            start_time=start_time,
            end_time=end_time
        )
        db.add(availability)
        db.commit()
        db.refresh(availability)
        return availability


def update_barber_availability(
    db: Session,
    availability_id: int,
    barber_id: int,
    **update_data
) -> Optional[models.BarberAvailability]:
    """Update barber availability"""
    availability = db.query(models.BarberAvailability).filter(
        models.BarberAvailability.id == availability_id,
        models.BarberAvailability.barber_id == barber_id
    ).first()
    
    if not availability:
        return None
    
    for field, value in update_data.items():
        if hasattr(availability, field):
            setattr(availability, field, value)
    
    availability.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(availability)
    return availability


def delete_barber_availability(db: Session, availability_id: int, barber_id: int) -> bool:
    """Delete barber availability"""
    availability = db.query(models.BarberAvailability).filter(
        models.BarberAvailability.id == availability_id,
        models.BarberAvailability.barber_id == barber_id
    ).first()
    
    if not availability:
        return False
    
    db.delete(availability)
    db.commit()
    return True


def create_time_off_request(
    db: Session,
    barber_id: int,
    start_date: date,
    end_date: date,
    start_time: Optional[time] = None,
    end_time: Optional[time] = None,
    reason: Optional[str] = None,
    notes: Optional[str] = None
) -> models.BarberTimeOff:
    """Create a time off request for a barber"""
    
    # Check for overlapping time off requests
    existing = db.query(models.BarberTimeOff).filter(
        models.BarberTimeOff.barber_id == barber_id,
        models.BarberTimeOff.status != "cancelled",
        or_(
            and_(
                models.BarberTimeOff.start_date <= start_date,
                models.BarberTimeOff.end_date >= start_date
            ),
            and_(
                models.BarberTimeOff.start_date <= end_date,
                models.BarberTimeOff.end_date >= end_date
            ),
            and_(
                models.BarberTimeOff.start_date >= start_date,
                models.BarberTimeOff.end_date <= end_date
            )
        )
    ).first()
    
    if existing:
        raise ValueError(f"Time off request overlaps with existing request from {existing.start_date} to {existing.end_date}")
    
    time_off = models.BarberTimeOff(
        barber_id=barber_id,
        start_date=start_date,
        end_date=end_date,
        start_time=start_time,
        end_time=end_time,
        reason=reason,
        notes=notes,
        status="approved"  # Auto-approve for now, can be changed to "requested" for approval workflow
    )
    
    db.add(time_off)
    db.commit()
    db.refresh(time_off)
    return time_off


def get_barber_time_off(
    db: Session, 
    barber_id: int, 
    start_date: Optional[date] = None,
    end_date: Optional[date] = None
) -> List[models.BarberTimeOff]:
    """Get time off requests for a barber"""
    query = db.query(models.BarberTimeOff).filter(
        models.BarberTimeOff.barber_id == barber_id,
        models.BarberTimeOff.status != "cancelled"
    )
    
    if start_date:
        query = query.filter(models.BarberTimeOff.end_date >= start_date)
    
    if end_date:
        query = query.filter(models.BarberTimeOff.start_date <= end_date)
    
    return query.order_by(models.BarberTimeOff.start_date).all()


def create_special_availability(
    db: Session,
    barber_id: int,
    date: date,
    start_time: time,
    end_time: time,
    availability_type: str = "available",
    notes: Optional[str] = None
) -> models.BarberSpecialAvailability:
    """Create special availability for a specific date"""
    
    special_availability = models.BarberSpecialAvailability(
        barber_id=barber_id,
        date=date,
        start_time=start_time,
        end_time=end_time,
        availability_type=availability_type,
        notes=notes
    )
    
    db.add(special_availability)
    db.commit()
    db.refresh(special_availability)
    return special_availability


def get_barber_special_availability(
    db: Session,
    barber_id: int,
    date: Optional[date] = None
) -> List[models.BarberSpecialAvailability]:
    """Get special availability for a barber"""
    query = db.query(models.BarberSpecialAvailability).filter(
        models.BarberSpecialAvailability.barber_id == barber_id
    )
    
    if date:
        query = query.filter(models.BarberSpecialAvailability.date == date)
    
    return query.order_by(models.BarberSpecialAvailability.date, models.BarberSpecialAvailability.start_time).all()


def is_barber_available(
    db: Session,
    barber_id: int,
    check_date: date,
    start_time: time,
    end_time: time,
    exclude_appointment_id: Optional[int] = None
) -> bool:
    """Check if a barber is available during a specific time slot - OPTIMIZED"""
    
    from utils.database_timeout import timeout_query
    from sqlalchemy import exists
    
    @timeout_query(timeout_seconds=15.0)
    def _check_availability():
        # Get day of week (0=Monday, 6=Sunday)
        day_of_week = check_date.weekday()
        
        # OPTIMIZED: Single query to check regular availability using EXISTS
        has_regular_availability = db.query(
            exists().where(
                and_(
                    models.BarberAvailability.barber_id == barber_id,
                    models.BarberAvailability.day_of_week == day_of_week,
                    models.BarberAvailability.is_active == True,
                    models.BarberAvailability.start_time <= start_time,
                    models.BarberAvailability.end_time >= end_time
                )
            )
        ).scalar()
        
        if not has_regular_availability:
            return False
        
        # OPTIMIZED: Single query to check time off using EXISTS
        has_time_off = db.query(
            exists().where(
                and_(
                    models.BarberTimeOff.barber_id == barber_id,
                    models.BarberTimeOff.status == "approved",
                    models.BarberTimeOff.start_date <= check_date,
                    models.BarberTimeOff.end_date >= check_date
                )
            )
        ).scalar()
        
        if has_time_off:
            # Only fetch the actual time off record if it exists
            time_off = db.query(models.BarberTimeOff).filter(
                models.BarberTimeOff.barber_id == barber_id,
                models.BarberTimeOff.status == "approved",
                models.BarberTimeOff.start_date <= check_date,
                models.BarberTimeOff.end_date >= check_date
            ).first()
            
            if time_off:
                # Check if time off covers the requested time
                if time_off.start_time is None or time_off.end_time is None:
                    # Full day time off
                    return False
                else:
                    # Partial day time off
                    if not (end_time <= time_off.start_time or start_time >= time_off.end_time):
                        return False
        
        # OPTIMIZED: Check special availability using EXISTS first
        has_special_availability = db.query(
            exists().where(
                and_(
                    models.BarberSpecialAvailability.barber_id == barber_id,
                    models.BarberSpecialAvailability.date == check_date,
                    models.BarberSpecialAvailability.start_time <= start_time,
                    models.BarberSpecialAvailability.end_time >= end_time
                )
            )
        ).scalar()
        
        if has_special_availability:
            # Only fetch the record if it exists
            special_availability = db.query(models.BarberSpecialAvailability).filter(
                models.BarberSpecialAvailability.barber_id == barber_id,
                models.BarberSpecialAvailability.date == check_date,
                models.BarberSpecialAvailability.start_time <= start_time,
                models.BarberSpecialAvailability.end_time >= end_time
            ).first()
            
            if special_availability and special_availability.availability_type == "unavailable":
                return False
        
        # OPTIMIZED: Use EXISTS to check for appointment conflicts
        check_start_datetime = datetime.combine(check_date, start_time)
        check_end_datetime = datetime.combine(check_date, end_time)
        
        conflict_query = db.query(
            exists().where(
                and_(
                    models.Appointment.barber_id == barber_id,
                    models.Appointment.status.in_(["scheduled", "confirmed", "pending"]),
                    # Time overlap check with buffer consideration
                    or_(
                        # Requested time starts during existing appointment (with buffer)
                        and_(
                            models.Appointment.start_time <= check_start_datetime,
                            models.Appointment.start_time + timedelta(minutes=models.Appointment.duration_minutes) > check_start_datetime
                        ),
                        # Existing appointment starts during requested time
                        and_(
                            models.Appointment.start_time >= check_start_datetime,
                            models.Appointment.start_time < check_end_datetime
                        )
                    )
                )
            )
        )
        
        if exclude_appointment_id:
            conflict_query = conflict_query.filter(models.Appointment.id != exclude_appointment_id)
        
        has_conflict = conflict_query.scalar()
        
        return not has_conflict
    
    return _check_availability()


def get_available_barbers_for_slot(
    db: Session,
    check_date: date,
    start_time: time,
    end_time: time,
    service_id: Optional[int] = None
) -> List[models.User]:
    """Get all barbers available for a specific time slot - OPTIMIZED"""
    
    from utils.database_timeout import timeout_query
    
    @timeout_query(timeout_seconds=20.0)
    def _get_available_barbers():
        # Get all active barbers
        barber_query = db.query(models.User).filter(
            models.User.role.in_(["barber", "admin"]),
            models.User.is_active == True
        )
        
        # If service_id is provided, filter barbers who offer this service
        if service_id:
            barber_query = barber_query.join(models.barber_services).filter(
                models.barber_services.c.service_id == service_id,
                models.barber_services.c.is_available == True
            )
        
        # OPTIMIZED: Limit the number of barbers we check to prevent excessive queries
        all_barbers = barber_query.limit(50).all()  # Reasonable limit for performance
        available_barbers = []
        
        # OPTIMIZED: Check availability in batches to reduce total query time
        for barber in all_barbers:
            try:
                if is_barber_available(db, barber.id, check_date, start_time, end_time):
                    available_barbers.append(barber)
            except Exception as e:
                logger.warning(f"Error checking availability for barber {barber.id}: {str(e)}")
                continue  # Skip this barber if there's an error
        
        return available_barbers
    
    return _get_available_barbers()


def get_barber_schedule(
    db: Session,
    barber_id: int,
    start_date: date,
    end_date: date,
    timezone_str: str = "UTC"
) -> Dict[str, Any]:
    """Get comprehensive schedule for a barber including appointments, availability, and time off"""
    
    # Set up timezone
    tz = pytz.timezone(timezone_str)
    
    # Get appointments in date range
    appointments = db.query(models.Appointment).filter(
        models.Appointment.barber_id == barber_id,
        models.Appointment.start_time >= datetime.combine(start_date, time.min),
        models.Appointment.start_time < datetime.combine(end_date + timedelta(days=1), time.min),
        models.Appointment.status.in_(["scheduled", "confirmed", "pending"])
    ).order_by(models.Appointment.start_time).all()
    
    # Get regular availability
    regular_availability = get_barber_availability(db, barber_id)
    
    # Get time off requests
    time_off_requests = get_barber_time_off(db, barber_id, start_date, end_date)
    
    # Get special availability
    special_availability = db.query(models.BarberSpecialAvailability).filter(
        models.BarberSpecialAvailability.barber_id == barber_id,
        models.BarberSpecialAvailability.date >= start_date,
        models.BarberSpecialAvailability.date <= end_date
    ).order_by(models.BarberSpecialAvailability.date, models.BarberSpecialAvailability.start_time).all()
    
    return {
        "barber_id": barber_id,
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "appointments": [
            {
                "id": apt.id,
                "start_time": apt.start_time.astimezone(tz).isoformat() if apt.start_time.tzinfo else tz.localize(apt.start_time).isoformat(),
                "duration_minutes": apt.duration_minutes,
                "service_name": apt.service_name,
                "status": apt.status,
                "client_id": apt.client_id,
                "buffer_time_before": apt.buffer_time_before,
                "buffer_time_after": apt.buffer_time_after
            }
            for apt in appointments
        ],
        "regular_availability": [
            {
                "id": av.id,
                "day_of_week": av.day_of_week,
                "start_time": av.start_time.strftime("%H:%M"),
                "end_time": av.end_time.strftime("%H:%M"),
                "is_active": av.is_active
            }
            for av in regular_availability
        ],
        "time_off": [
            {
                "id": to.id,
                "start_date": to.start_date.isoformat(),
                "end_date": to.end_date.isoformat(),
                "start_time": to.start_time.strftime("%H:%M") if to.start_time else None,
                "end_time": to.end_time.strftime("%H:%M") if to.end_time else None,
                "reason": to.reason,
                "status": to.status
            }
            for to in time_off_requests
        ],
        "special_availability": [
            {
                "id": sa.id,
                "date": sa.date.isoformat(),
                "start_time": sa.start_time.strftime("%H:%M"),
                "end_time": sa.end_time.strftime("%H:%M"),
                "availability_type": sa.availability_type,
                "notes": sa.notes
            }
            for sa in special_availability
        ]
    }