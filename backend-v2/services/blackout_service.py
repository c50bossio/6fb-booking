"""
Blackout Date Management Service
Comprehensive service for managing blackout dates and their impact on appointments
"""

from datetime import datetime, time, timedelta, date
from typing import List, Optional, Dict, Any, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
import models
import schemas
import logging
from dateutil.relativedelta import relativedelta

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class BlackoutDateService:
    """Service for comprehensive blackout date management"""
    
    @staticmethod
    def create_blackout_date(
        db: Session,
        blackout_data: schemas.BlackoutDateCreate,
        created_by_id: int
    ) -> models.BlackoutDate:
        """Create a new blackout date"""
        
        # Validate date range
        if blackout_data.end_date and blackout_data.end_date < blackout_data.blackout_date:
            raise ValueError("End date cannot be before start date")
        
        # Validate time range for partial day blackouts
        if (blackout_data.blackout_type == "partial_day" and 
            blackout_data.start_time and blackout_data.end_time):
            if blackout_data.end_time <= blackout_data.start_time:
                raise ValueError("End time must be after start time")
        
        blackout = models.BlackoutDate(
            blackout_date=blackout_data.blackout_date,
            end_date=blackout_data.end_date,
            start_time=blackout_data.start_time,
            end_time=blackout_data.end_time,
            reason=blackout_data.reason,
            blackout_type=blackout_data.blackout_type,
            is_recurring=blackout_data.is_recurring,
            recurrence_pattern=blackout_data.recurrence_pattern,
            recurrence_end_date=blackout_data.recurrence_end_date,
            allow_emergency_bookings=blackout_data.allow_emergency_bookings,
            affects_existing_appointments=blackout_data.affects_existing_appointments,
            auto_reschedule=blackout_data.auto_reschedule,
            description=blackout_data.description,
            location_id=blackout_data.location_id,
            barber_id=blackout_data.barber_id,
            created_by_id=created_by_id
        )
        
        db.add(blackout)
        db.commit()
        db.refresh(blackout)
        
        # Handle existing appointments if needed
        if blackout.affects_existing_appointments:
            BlackoutDateService._handle_existing_appointments(db, blackout)
        
        return blackout
    
    @staticmethod
    def get_blackout_dates(
        db: Session,
        location_id: Optional[int] = None,
        barber_id: Optional[int] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        include_recurring: bool = True
    ) -> List[models.BlackoutDate]:
        """Get blackout dates based on criteria"""
        
        query = db.query(models.BlackoutDate).filter(
            models.BlackoutDate.is_active == True
        )
        
        if location_id is not None:
            query = query.filter(
                or_(
                    models.BlackoutDate.location_id == location_id,
                    models.BlackoutDate.location_id.is_(None)  # Global blackouts
                )
            )
        
        if barber_id is not None:
            query = query.filter(
                or_(
                    models.BlackoutDate.barber_id == barber_id,
                    models.BlackoutDate.barber_id.is_(None)  # Global blackouts
                )
            )
        
        if start_date:
            query = query.filter(
                or_(
                    models.BlackoutDate.blackout_date >= start_date,
                    and_(
                        models.BlackoutDate.end_date.isnot(None),
                        models.BlackoutDate.end_date >= start_date
                    )
                )
            )
        
        if end_date:
            query = query.filter(models.BlackoutDate.blackout_date <= end_date)
        
        blackouts = query.order_by(models.BlackoutDate.blackout_date).all()
        
        # Expand recurring blackouts if requested
        if include_recurring:
            expanded_blackouts = []
            for blackout in blackouts:
                if blackout.is_recurring:
                    expanded_blackouts.extend(
                        BlackoutDateService._expand_recurring_blackout(blackout, start_date, end_date)
                    )
                else:
                    expanded_blackouts.append(blackout)
            return expanded_blackouts
        
        return blackouts
    
    @staticmethod
    def _expand_recurring_blackout(
        blackout: models.BlackoutDate,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None
    ) -> List[models.BlackoutDate]:
        """Expand a recurring blackout into individual occurrences"""
        
        if not blackout.is_recurring or not blackout.recurrence_pattern:
            return [blackout]
        
        # Set reasonable defaults for date range
        if not start_date:
            start_date = max(blackout.blackout_date, date.today())
        if not end_date:
            end_date = blackout.recurrence_end_date or (date.today() + timedelta(days=365))
        
        occurrences = []
        current_date = max(blackout.blackout_date, start_date)
        
        while current_date <= end_date and (not blackout.recurrence_end_date or current_date <= blackout.recurrence_end_date):
            # Create a virtual blackout for this occurrence
            occurrence = models.BlackoutDate(
                id=blackout.id,  # Keep original ID for reference
                blackout_date=current_date,
                end_date=current_date if not blackout.end_date else current_date + (blackout.end_date - blackout.blackout_date),
                start_time=blackout.start_time,
                end_time=blackout.end_time,
                reason=blackout.reason,
                blackout_type=blackout.blackout_type,
                is_recurring=True,
                allow_emergency_bookings=blackout.allow_emergency_bookings,
                affects_existing_appointments=blackout.affects_existing_appointments,
                auto_reschedule=blackout.auto_reschedule,
                description=blackout.description,
                location_id=blackout.location_id,
                barber_id=blackout.barber_id,
                created_by_id=blackout.created_by_id,
                is_active=blackout.is_active
            )
            occurrences.append(occurrence)
            
            # Move to next occurrence based on pattern
            if blackout.recurrence_pattern == "weekly":
                current_date += timedelta(weeks=1)
            elif blackout.recurrence_pattern == "monthly":
                current_date += relativedelta(months=1)
            elif blackout.recurrence_pattern == "annually":
                current_date += relativedelta(years=1)
            else:
                break  # Unknown pattern
        
        return occurrences
    
    @staticmethod
    def is_date_time_blocked(
        db: Session,
        check_date: date,
        check_time: Optional[time] = None,
        location_id: Optional[int] = None,
        barber_id: Optional[int] = None,
        duration_minutes: int = 0
    ) -> Tuple[bool, Optional[models.BlackoutDate], str]:
        """
        Check if a specific date/time is blocked by blackout dates
        Returns (is_blocked, blackout_object, reason)
        """
        
        blackouts = BlackoutDateService.get_blackout_dates(
            db=db,
            location_id=location_id,
            barber_id=barber_id,
            start_date=check_date,
            end_date=check_date,
            include_recurring=True
        )
        
        for blackout in blackouts:
            # Check if date is within blackout range
            blackout_start = blackout.blackout_date
            blackout_end = blackout.end_date or blackout.blackout_date
            
            if not (blackout_start <= check_date <= blackout_end):
                continue
            
            # For full day blackouts, no need to check time
            if blackout.blackout_type == "full_day":
                reason = f"Full day blackout: {blackout.reason}"
                return True, blackout, reason
            
            # For partial day blackouts, check time overlap
            if (blackout.blackout_type == "partial_day" and 
                blackout.start_time and blackout.end_time and check_time):
                
                # Calculate appointment end time
                if duration_minutes > 0:
                    appointment_start = datetime.combine(check_date, check_time)
                    appointment_end = appointment_start + timedelta(minutes=duration_minutes)
                    check_end_time = appointment_end.time()
                else:
                    check_end_time = check_time
                
                # Check for time overlap
                if (check_time < blackout.end_time and check_end_time > blackout.start_time):
                    reason = f"Partial day blackout ({blackout.start_time}-{blackout.end_time}): {blackout.reason}"
                    return True, blackout, reason
        
        return False, None, ""
    
    @staticmethod
    def _handle_existing_appointments(db: Session, blackout: models.BlackoutDate):
        """Handle existing appointments affected by a new blackout"""
        
        # Find appointments that conflict with the blackout
        query = db.query(models.Appointment).filter(
            models.Appointment.status.in_(["pending", "confirmed"]),
            func.date(models.Appointment.start_time) == blackout.blackout_date
        )
        
        if blackout.barber_id:
            query = query.filter(models.Appointment.barber_id == blackout.barber_id)
        
        if blackout.location_id:
            query = query.filter(models.Appointment.location_id == blackout.location_id)
        
        affected_appointments = query.all()
        
        for appointment in affected_appointments:
            appointment_time = appointment.start_time.time()
            appointment_end = (appointment.start_time + timedelta(minutes=appointment.duration_minutes)).time()
            
            # Check if appointment conflicts with blackout
            conflicts = False
            
            if blackout.blackout_type == "full_day":
                conflicts = True
            elif (blackout.blackout_type == "partial_day" and 
                  blackout.start_time and blackout.end_time):
                # Check for time overlap
                if appointment_time < blackout.end_time and appointment_end > blackout.start_time:
                    conflicts = True
            
            if conflicts:
                if blackout.auto_reschedule:
                    # Try to reschedule the appointment
                    new_slot = BlackoutDateService._find_alternative_slot(
                        db, appointment, blackout
                    )
                    if new_slot:
                        appointment.start_time = new_slot
                        appointment.notes = (appointment.notes or "") + f"\n[Auto-rescheduled due to {blackout.reason}]"
                        logger.info(f"Auto-rescheduled appointment {appointment.id} due to blackout")
                    else:
                        # Could not reschedule, mark as needs attention
                        appointment.status = "requires_rescheduling"
                        appointment.notes = (appointment.notes or "") + f"\n[Conflicts with blackout: {blackout.reason}]"
                else:
                    # Mark appointment as conflicted
                    appointment.status = "conflicted"
                    appointment.notes = (appointment.notes or "") + f"\n[Conflicts with blackout: {blackout.reason}]"
        
        db.commit()
        
        return len(affected_appointments)
    
    @staticmethod
    def _find_alternative_slot(
        db: Session,
        appointment: models.Appointment,
        blackout: models.BlackoutDate
    ) -> Optional[datetime]:
        """Find an alternative time slot for a conflicted appointment"""
        
        original_date = appointment.start_time.date()
        original_time = appointment.start_time.time()
        
        # Try the same day first (before or after blackout)
        if blackout.blackout_type == "partial_day" and blackout.start_time and blackout.end_time:
            # Try before blackout starts
            candidate_end_time = (datetime.combine(original_date, blackout.start_time) - 
                                 timedelta(minutes=appointment.duration_minutes)).time()
            
            if candidate_end_time >= time(9, 0):  # Assuming business starts at 9 AM
                candidate_start = datetime.combine(original_date, candidate_end_time)
                if not BlackoutDateService._has_conflicts(db, candidate_start, appointment):
                    return candidate_start
            
            # Try after blackout ends
            if blackout.end_time <= time(17, 0):  # Assuming business ends at 6 PM
                candidate_start = datetime.combine(original_date, blackout.end_time)
                candidate_end = candidate_start + timedelta(minutes=appointment.duration_minutes)
                
                if candidate_end.time() <= time(18, 0):
                    if not BlackoutDateService._has_conflicts(db, candidate_start, appointment):
                        return candidate_start
        
        # Try next available day (up to 7 days)
        for days_ahead in range(1, 8):
            candidate_date = original_date + timedelta(days=days_ahead)
            candidate_start = datetime.combine(candidate_date, original_time)
            
            # Check if this slot is available
            if not BlackoutDateService._has_conflicts(db, candidate_start, appointment):
                return candidate_start
        
        return None
    
    @staticmethod
    def _has_conflicts(
        db: Session,
        candidate_start: datetime,
        original_appointment: models.Appointment
    ) -> bool:
        """Check if a candidate time slot has conflicts"""
        
        candidate_end = candidate_start + timedelta(minutes=original_appointment.duration_minutes)
        
        # Check for blackouts
        is_blocked, _, _ = BlackoutDateService.is_date_time_blocked(
            db=db,
            check_date=candidate_start.date(),
            check_time=candidate_start.time(),
            location_id=original_appointment.location_id,
            barber_id=original_appointment.barber_id,
            duration_minutes=original_appointment.duration_minutes
        )
        
        if is_blocked:
            return True
        
        # Check for existing appointments
        existing_appointments = db.query(models.Appointment).filter(
            models.Appointment.id != original_appointment.id,
            models.Appointment.barber_id == original_appointment.barber_id,
            func.date(models.Appointment.start_time) == candidate_start.date(),
            models.Appointment.status.in_(["pending", "confirmed"])
        ).all()
        
        for existing in existing_appointments:
            existing_end = existing.start_time + timedelta(minutes=existing.duration_minutes)
            
            # Check for overlap
            if not (candidate_end <= existing.start_time or candidate_start >= existing_end):
                return True
        
        return False
    
    @staticmethod
    def update_blackout_date(
        db: Session,
        blackout_id: int,
        update_data: schemas.BlackoutDateUpdate,
        user_id: int
    ) -> models.BlackoutDate:
        """Update an existing blackout date"""
        
        blackout = db.query(models.BlackoutDate).filter(
            models.BlackoutDate.id == blackout_id,
            models.BlackoutDate.created_by_id == user_id
        ).first()
        
        if not blackout:
            raise ValueError("Blackout date not found")
        
        # Update fields
        update_dict = update_data.dict(exclude_unset=True)
        for key, value in update_dict.items():
            setattr(blackout, key, value)
        
        db.commit()
        db.refresh(blackout)
        
        return blackout
    
    @staticmethod
    def delete_blackout_date(
        db: Session,
        blackout_id: int,
        user_id: int
    ) -> bool:
        """Delete (deactivate) a blackout date"""
        
        blackout = db.query(models.BlackoutDate).filter(
            models.BlackoutDate.id == blackout_id,
            models.BlackoutDate.created_by_id == user_id
        ).first()
        
        if not blackout:
            return False
        
        blackout.is_active = False
        db.commit()
        
        return True
    
    @staticmethod
    def get_blackout_impact_report(
        db: Session,
        blackout_id: int,
        user_id: int
    ) -> Dict[str, Any]:
        """Get a report of how a blackout affects existing appointments"""
        
        blackout = db.query(models.BlackoutDate).filter(
            models.BlackoutDate.id == blackout_id,
            models.BlackoutDate.created_by_id == user_id
        ).first()
        
        if not blackout:
            raise ValueError("Blackout date not found")
        
        # Find affected appointments (without actually modifying them)
        query = db.query(models.Appointment).filter(
            models.Appointment.status.in_(["pending", "confirmed"]),
            func.date(models.Appointment.start_time) >= blackout.blackout_date
        )
        
        if blackout.end_date:
            query = query.filter(func.date(models.Appointment.start_time) <= blackout.end_date)
        else:
            query = query.filter(func.date(models.Appointment.start_time) == blackout.blackout_date)
        
        if blackout.barber_id:
            query = query.filter(models.Appointment.barber_id == blackout.barber_id)
        
        if blackout.location_id:
            query = query.filter(models.Appointment.location_id == blackout.location_id)
        
        potentially_affected = query.all()
        
        affected_appointments = []
        for appointment in potentially_affected:
            appointment_time = appointment.start_time.time()
            appointment_end = (appointment.start_time + timedelta(minutes=appointment.duration_minutes)).time()
            
            conflicts = False
            if blackout.blackout_type == "full_day":
                conflicts = True
            elif (blackout.blackout_type == "partial_day" and 
                  blackout.start_time and blackout.end_time):
                if appointment_time < blackout.end_time and appointment_end > blackout.start_time:
                    conflicts = True
            
            if conflicts:
                affected_appointments.append({
                    "appointment_id": appointment.id,
                    "start_time": appointment.start_time.isoformat(),
                    "duration_minutes": appointment.duration_minutes,
                    "client_name": appointment.client.name if appointment.client else "Unknown",
                    "service_name": appointment.service.name if appointment.service else appointment.service_name,
                    "can_reschedule": blackout.auto_reschedule
                })
        
        return {
            "blackout_id": blackout.id,
            "blackout_date": blackout.blackout_date.isoformat(),
            "blackout_type": blackout.blackout_type,
            "reason": blackout.reason,
            "total_affected": len(affected_appointments),
            "affected_appointments": affected_appointments,
            "auto_reschedule_enabled": blackout.auto_reschedule
        }


# Export the service
__all__ = ["BlackoutDateService"]