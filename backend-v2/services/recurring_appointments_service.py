from datetime import datetime, time, timedelta, date
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
import models
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def create_recurring_pattern(
    db: Session,
    user_id: int,
    pattern_type: str,
    preferred_time: time,
    duration_minutes: int,
    start_date: date,
    end_date: Optional[date] = None,
    occurrences: Optional[int] = None,
    days_of_week: Optional[List[int]] = None,
    day_of_month: Optional[int] = None,
    week_of_month: Optional[int] = None,
    barber_id: Optional[int] = None,
    service_id: Optional[int] = None,
    client_id: Optional[int] = None
) -> models.RecurringAppointmentPattern:
    """Create a recurring appointment pattern"""
    
    # Validate pattern parameters
    if pattern_type in ["weekly", "biweekly"] and not days_of_week:
        raise ValueError("days_of_week is required for weekly and biweekly patterns")
    
    if pattern_type == "monthly" and not (day_of_month or week_of_month):
        raise ValueError("day_of_month or week_of_month is required for monthly patterns")
    
    if end_date and occurrences:
        raise ValueError("Cannot specify both end_date and occurrences")
    
    if not end_date and not occurrences:
        raise ValueError("Must specify either end_date or occurrences")
    
    # Validate days_of_week
    if days_of_week:
        if not all(0 <= day <= 6 for day in days_of_week):
            raise ValueError("days_of_week must contain values between 0 (Monday) and 6 (Sunday)")
    
    # Validate day_of_month
    if day_of_month and not (1 <= day_of_month <= 31):
        raise ValueError("day_of_month must be between 1 and 31")
    
    # Validate week_of_month
    if week_of_month and not (1 <= week_of_month <= 4):
        raise ValueError("week_of_month must be between 1 and 4")
    
    pattern = models.RecurringAppointmentPattern(
        user_id=user_id,
        pattern_type=pattern_type,
        days_of_week=days_of_week,
        day_of_month=day_of_month,
        week_of_month=week_of_month,
        preferred_time=preferred_time,
        duration_minutes=duration_minutes,
        start_date=start_date,
        end_date=end_date,
        occurrences=occurrences,
        barber_id=barber_id,
        service_id=service_id,
        client_id=client_id
    )
    
    db.add(pattern)
    db.commit()
    db.refresh(pattern)
    
    return pattern


def get_recurring_patterns(
    db: Session,
    user_id: int,
    is_active: Optional[bool] = None
) -> List[models.RecurringAppointmentPattern]:
    """Get recurring patterns for a user"""
    query = db.query(models.RecurringAppointmentPattern).filter(
        models.RecurringAppointmentPattern.user_id == user_id
    )
    
    if is_active is not None:
        query = query.filter(models.RecurringAppointmentPattern.is_active == is_active)
    
    return query.order_by(models.RecurringAppointmentPattern.created_at.desc()).all()


def update_recurring_pattern(
    db: Session,
    pattern_id: int,
    user_id: int,
    **update_data
) -> Optional[models.RecurringAppointmentPattern]:
    """Update a recurring pattern"""
    pattern = db.query(models.RecurringAppointmentPattern).filter(
        models.RecurringAppointmentPattern.id == pattern_id,
        models.RecurringAppointmentPattern.user_id == user_id
    ).first()
    
    if not pattern:
        return None
    
    for field, value in update_data.items():
        if hasattr(pattern, field):
            setattr(pattern, field, value)
    
    pattern.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(pattern)
    
    return pattern


def delete_recurring_pattern(
    db: Session,
    pattern_id: int,
    user_id: int
) -> bool:
    """Delete a recurring pattern"""
    pattern = db.query(models.RecurringAppointmentPattern).filter(
        models.RecurringAppointmentPattern.id == pattern_id,
        models.RecurringAppointmentPattern.user_id == user_id
    ).first()
    
    if not pattern:
        return False
    
    # Mark as inactive instead of deleting to preserve historical data
    pattern.is_active = False
    pattern.updated_at = datetime.utcnow()
    db.commit()
    
    return True


def calculate_next_occurrence_dates(
    pattern: models.RecurringAppointmentPattern,
    limit: int = 100
) -> List[date]:
    """Calculate the next occurrence dates for a recurring pattern"""
    dates = []
    current_date = pattern.start_date
    occurrences_generated = 0
    
    # Calculate end condition
    max_date = None
    max_occurrences = None
    
    if pattern.end_date:
        max_date = pattern.end_date
    if pattern.occurrences:
        max_occurrences = pattern.occurrences
    
    while len(dates) < limit:
        # Check if we've reached the end condition
        if max_date and current_date > max_date:
            break
        if max_occurrences and occurrences_generated >= max_occurrences:
            break
        
        # Calculate next date based on pattern type
        if pattern.pattern_type == "daily":
            if current_date >= pattern.start_date:
                dates.append(current_date)
                occurrences_generated += 1
            current_date += timedelta(days=1)
            
        elif pattern.pattern_type == "weekly":
            if pattern.days_of_week:
                # Check if current date's weekday is in the pattern
                if current_date.weekday() in pattern.days_of_week and current_date >= pattern.start_date:
                    dates.append(current_date)
                    occurrences_generated += 1
            current_date += timedelta(days=1)
            
        elif pattern.pattern_type == "biweekly":
            if pattern.days_of_week:
                # Check if it's the right week (every other week from start date)
                days_since_start = (current_date - pattern.start_date).days
                week_number = days_since_start // 7
                
                if (week_number % 2 == 0 and 
                    current_date.weekday() in pattern.days_of_week and 
                    current_date >= pattern.start_date):
                    dates.append(current_date)
                    occurrences_generated += 1
            current_date += timedelta(days=1)
            
        elif pattern.pattern_type == "monthly":
            if pattern.day_of_month:
                # Specific day of month
                try:
                    target_date = current_date.replace(day=pattern.day_of_month)
                    if target_date >= pattern.start_date:
                        dates.append(target_date)
                        occurrences_generated += 1
                except ValueError:
                    # Day doesn't exist in this month (e.g., Feb 30), skip to next month
                    pass
                
                # Move to next month
                if current_date.month == 12:
                    current_date = current_date.replace(year=current_date.year + 1, month=1, day=1)
                else:
                    current_date = current_date.replace(month=current_date.month + 1, day=1)
                    
            elif pattern.week_of_month and pattern.days_of_week:
                # Specific week and day of month (e.g., 2nd Tuesday)
                first_day_of_month = current_date.replace(day=1)
                
                for day_of_week in pattern.days_of_week:
                    # Find the nth occurrence of this weekday in the month
                    week_count = 0
                    check_date = first_day_of_month
                    
                    while check_date.month == current_date.month:
                        if check_date.weekday() == day_of_week:
                            week_count += 1
                            if week_count == pattern.week_of_month and check_date >= pattern.start_date:
                                dates.append(check_date)
                                occurrences_generated += 1
                                break
                        check_date += timedelta(days=1)
                
                # Move to next month
                if current_date.month == 12:
                    current_date = current_date.replace(year=current_date.year + 1, month=1, day=1)
                else:
                    current_date = current_date.replace(month=current_date.month + 1, day=1)
        
        # Safety check to prevent infinite loops
        if current_date > date.today() + timedelta(days=365 * 2):  # 2 years from now
            break
    
    return dates


def generate_appointments_from_pattern(
    db: Session,
    pattern_id: int,
    preview_only: bool = False,
    max_appointments: int = 50
) -> List[Dict[str, Any]]:
    """Generate appointments from a recurring pattern"""
    
    pattern = db.query(models.RecurringAppointmentPattern).filter(
        models.RecurringAppointmentPattern.id == pattern_id,
        models.RecurringAppointmentPattern.is_active == True
    ).first()
    
    if not pattern:
        raise ValueError("Recurring pattern not found or inactive")
    
    # Calculate occurrence dates
    occurrence_dates = calculate_next_occurrence_dates(pattern, limit=max_appointments)
    
    # Filter out dates that already have appointments for this pattern
    existing_appointments = db.query(models.Appointment).filter(
        models.Appointment.recurring_pattern_id == pattern_id,
        models.Appointment.status != "cancelled"
    ).all()
    
    existing_dates = {apt.start_time.date() for apt in existing_appointments}
    new_dates = [d for d in occurrence_dates if d not in existing_dates and d >= date.today()]
    
    appointments_data = []
    created_appointments = []
    
    for occurrence_date in new_dates:
        # Create datetime for the appointment
        appointment_datetime = datetime.combine(occurrence_date, pattern.preferred_time)
        
        appointment_data = {
            "date": occurrence_date.isoformat(),
            "time": pattern.preferred_time.strftime("%H:%M"),
            "datetime": appointment_datetime.isoformat(),
            "duration_minutes": pattern.duration_minutes,
            "barber_id": pattern.barber_id,
            "service_id": pattern.service_id,
            "client_id": pattern.client_id,
            "pattern_id": pattern_id
        }
        
        appointments_data.append(appointment_data)
        
        # Create actual appointment if not preview mode
        if not preview_only:
            # Check if slot is available (basic check)
            from services import barber_availability_service
            
            if pattern.barber_id:
                # Calculate end time
                end_time = (appointment_datetime + timedelta(minutes=pattern.duration_minutes)).time()
                
                is_available = barber_availability_service.is_barber_available(
                    db=db,
                    barber_id=pattern.barber_id,
                    check_date=occurrence_date,
                    start_time=pattern.preferred_time,
                    end_time=end_time
                )
                
                if not is_available:
                    appointment_data["status"] = "conflict"
                    appointment_data["message"] = "Barber not available at this time"
                    continue
            
            # Get service info for pricing
            service_name = "Recurring Appointment"
            price = 0.0
            
            if pattern.service_id:
                service = db.query(models.Service).filter(models.Service.id == pattern.service_id).first()
                if service:
                    service_name = service.name
                    price = service.price
            
            # Create the appointment
            appointment = models.Appointment(
                user_id=pattern.user_id,
                barber_id=pattern.barber_id,
                client_id=pattern.client_id,
                service_id=pattern.service_id,
                service_name=service_name,
                start_time=appointment_datetime,
                duration_minutes=pattern.duration_minutes,
                price=price,
                status="scheduled",
                recurring_pattern_id=pattern_id
            )
            
            db.add(appointment)
            created_appointments.append(appointment)
            appointment_data["status"] = "created"
    
    if not preview_only and created_appointments:
        db.commit()
        for apt in created_appointments:
            db.refresh(apt)
    
    return appointments_data


def get_upcoming_recurring_appointments(
    db: Session,
    user_id: int,
    days_ahead: int = 30
) -> List[Dict[str, Any]]:
    """Get upcoming appointments from all active recurring patterns"""
    
    patterns = get_recurring_patterns(db, user_id, is_active=True)
    upcoming_appointments = []
    
    end_date = date.today() + timedelta(days=days_ahead)
    
    for pattern in patterns:
        # Get appointments already scheduled for this pattern
        existing_appointments = db.query(models.Appointment).filter(
            models.Appointment.recurring_pattern_id == pattern.id,
            models.Appointment.start_time >= datetime.combine(date.today(), time.min),
            models.Appointment.start_time <= datetime.combine(end_date, time.max),
            models.Appointment.status != "cancelled"
        ).all()
        
        for apt in existing_appointments:
            upcoming_appointments.append({
                "appointment_id": apt.id,
                "pattern_id": pattern.id,
                "date": apt.start_time.date().isoformat(),
                "time": apt.start_time.time().strftime("%H:%M"),
                "duration_minutes": apt.duration_minutes,
                "status": apt.status,
                "barber_id": apt.barber_id,
                "service_id": apt.service_id,
                "client_id": apt.client_id,
                "pattern_type": pattern.pattern_type
            })
        
        # Check for upcoming occurrences that don't have appointments yet
        occurrence_dates = calculate_next_occurrence_dates(pattern, limit=50)
        existing_dates = {apt.start_time.date() for apt in existing_appointments}
        
        for occurrence_date in occurrence_dates:
            if (occurrence_date >= date.today() and 
                occurrence_date <= end_date and 
                occurrence_date not in existing_dates):
                
                upcoming_appointments.append({
                    "appointment_id": None,
                    "pattern_id": pattern.id,
                    "date": occurrence_date.isoformat(),
                    "time": pattern.preferred_time.strftime("%H:%M"),
                    "duration_minutes": pattern.duration_minutes,
                    "status": "pending_creation",
                    "barber_id": pattern.barber_id,
                    "service_id": pattern.service_id,
                    "client_id": pattern.client_id,
                    "pattern_type": pattern.pattern_type
                })
    
    # Sort by date and time
    upcoming_appointments.sort(key=lambda x: (x["date"], x["time"]))
    
    return upcoming_appointments


def cancel_recurring_appointment_series(
    db: Session,
    pattern_id: int,
    user_id: int,
    cancel_future_only: bool = True
) -> Dict[str, Any]:
    """Cancel a recurring appointment series"""
    
    pattern = db.query(models.RecurringAppointmentPattern).filter(
        models.RecurringAppointmentPattern.id == pattern_id,
        models.RecurringAppointmentPattern.user_id == user_id
    ).first()
    
    if not pattern:
        raise ValueError("Recurring pattern not found")
    
    # Get all appointments for this pattern
    appointments_query = db.query(models.Appointment).filter(
        models.Appointment.recurring_pattern_id == pattern_id
    )
    
    if cancel_future_only:
        # Only cancel future appointments
        appointments_query = appointments_query.filter(
            models.Appointment.start_time >= datetime.now()
        )
    
    appointments = appointments_query.all()
    cancelled_count = 0
    
    for appointment in appointments:
        if appointment.status not in ["cancelled", "completed"]:
            appointment.status = "cancelled"
            cancelled_count += 1
    
    # Deactivate the pattern
    pattern.is_active = False
    pattern.updated_at = datetime.utcnow()
    
    db.commit()
    
    return {
        "pattern_id": pattern_id,
        "cancelled_appointments": cancelled_count,
        "pattern_deactivated": True,
        "cancel_future_only": cancel_future_only
    }


def modify_single_occurrence(
    db: Session,
    appointment_id: int,
    user_id: int,
    new_date: Optional[date] = None,
    new_time: Optional[time] = None,
    new_barber_id: Optional[int] = None,
    cancel: bool = False
) -> models.Appointment:
    """Modify a single occurrence of a recurring appointment"""
    
    appointment = db.query(models.Appointment).filter(
        models.Appointment.id == appointment_id,
        models.Appointment.user_id == user_id,
        models.Appointment.recurring_pattern_id.isnot(None)
    ).first()
    
    if not appointment:
        raise ValueError("Recurring appointment not found")
    
    if cancel:
        appointment.status = "cancelled"
    else:
        if new_date or new_time:
            # Update the appointment time
            current_datetime = appointment.start_time
            new_datetime = datetime.combine(
                new_date or current_datetime.date(),
                new_time or current_datetime.time()
            )
            appointment.start_time = new_datetime
        
        if new_barber_id is not None:
            appointment.barber_id = new_barber_id
    
    db.commit()
    db.refresh(appointment)
    
    return appointment