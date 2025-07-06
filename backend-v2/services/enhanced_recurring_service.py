"""
Enhanced Recurring Appointments Service
Comprehensive service for managing recurring appointment patterns, series, and conflicts
"""

from datetime import datetime, time, timedelta, date
from typing import List, Optional, Dict, Any, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, text
import models
import schemas
import pytz
import logging
from dateutil.relativedelta import relativedelta
from calendar import monthrange
import holidays
from dataclasses import dataclass

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class ConflictInfo:
    """Data class for conflict information"""
    conflict_type: str
    conflict_date: date
    conflict_time: time
    details: Dict[str, Any]
    suggested_resolution: Optional[str] = None


@dataclass
class AppointmentGenerationResult:
    """Result of appointment generation process"""
    successful_appointments: List[Dict[str, Any]]
    conflicts: List[ConflictInfo]
    skipped_dates: List[date]
    total_generated: int
    total_conflicts: int


class HolidayService:
    """Service for managing holidays and blackout dates"""
    
    @staticmethod
    def get_holidays(country_code: str = "US", year: int = None) -> List[date]:
        """Get list of holidays for a given country and year"""
        if year is None:
            year = datetime.now().year
        
        try:
            country_holidays = holidays.country_holidays(country_code, years=year)
            return list(country_holidays.keys())
        except Exception as e:
            logger.warning(f"Could not load holidays for {country_code}: {e}")
            return []
    
    @staticmethod
    def is_holiday(check_date: date, country_code: str = "US") -> bool:
        """Check if a date is a holiday"""
        try:
            country_holidays = holidays.country_holidays(country_code, years=check_date.year)
            return check_date in country_holidays
        except Exception:
            return False


class BlackoutDateService:
    """Service for managing blackout dates"""
    
    @staticmethod
    def get_blackout_dates(
        db: Session,
        location_id: Optional[int] = None,
        barber_id: Optional[int] = None,
        start_date: date = None,
        end_date: date = None
    ) -> List[models.BlackoutDate]:
        """Get blackout dates for specified criteria"""
        query = db.query(models.BlackoutDate).filter(
            models.BlackoutDate.is_active == True
        )
        
        if location_id:
            query = query.filter(models.BlackoutDate.location_id == location_id)
        
        if barber_id:
            query = query.filter(
                or_(
                    models.BlackoutDate.barber_id == barber_id,
                    models.BlackoutDate.barber_id.is_(None)  # Global blackouts
                )
            )
        
        if start_date:
            query = query.filter(models.BlackoutDate.blackout_date >= start_date)
        
        if end_date:
            query = query.filter(models.BlackoutDate.blackout_date <= end_date)
        
        return query.all()
    
    @staticmethod
    def is_date_blocked(
        db: Session,
        check_date: date,
        location_id: Optional[int] = None,
        barber_id: Optional[int] = None,
        check_time: Optional[time] = None
    ) -> Tuple[bool, Optional[models.BlackoutDate]]:
        """Check if a specific date/time is blocked"""
        blackouts = BlackoutDateService.get_blackout_dates(
            db, location_id, barber_id, check_date, check_date
        )
        
        for blackout in blackouts:
            # Check date range
            if blackout.end_date:
                if not (blackout.blackout_date <= check_date <= blackout.end_date):
                    continue
            else:
                if blackout.blackout_date != check_date:
                    continue
            
            # Check time range for partial day blackouts
            if (blackout.blackout_type == "partial_day" and 
                blackout.start_time and blackout.end_time and check_time):
                if not (blackout.start_time <= check_time <= blackout.end_time):
                    continue
            
            return True, blackout
        
        return False, None


class ConflictDetectionService:
    """Service for detecting and resolving conflicts in recurring appointments"""
    
    @staticmethod
    def detect_appointment_conflicts(
        db: Session,
        appointment_date: date,
        appointment_time: time,
        duration_minutes: int,
        barber_id: Optional[int] = None,
        location_id: Optional[int] = None,
        exclude_appointment_id: Optional[int] = None
    ) -> List[ConflictInfo]:
        """Detect conflicts for a proposed appointment slot"""
        conflicts = []
        
        # Calculate appointment end time
        start_datetime = datetime.combine(appointment_date, appointment_time)
        end_datetime = start_datetime + timedelta(minutes=duration_minutes)
        
        # Check for overlapping appointments
        query = db.query(models.Appointment).filter(
            models.Appointment.start_time.cast(models.Date) == appointment_date,
            models.Appointment.status.in_(["pending", "confirmed"]),
        )
        
        if barber_id:
            query = query.filter(models.Appointment.barber_id == barber_id)
        
        if exclude_appointment_id:
            query = query.filter(models.Appointment.id != exclude_appointment_id)
        
        existing_appointments = query.all()
        
        for apt in existing_appointments:
            existing_start = apt.start_time
            existing_end = existing_start + timedelta(minutes=apt.duration_minutes)
            
            # Check for overlap
            if not (end_datetime <= existing_start or start_datetime >= existing_end):
                conflicts.append(ConflictInfo(
                    conflict_type="double_booking",
                    conflict_date=appointment_date,
                    conflict_time=appointment_time,
                    details={
                        "existing_appointment_id": apt.id,
                        "existing_start": existing_start.isoformat(),
                        "existing_end": existing_end.isoformat(),
                        "overlap_minutes": min(end_datetime, existing_end).timestamp() - 
                                         max(start_datetime, existing_start).timestamp()
                    },
                    suggested_resolution="reschedule"
                ))
        
        # Check blackout dates
        is_blocked, blackout = BlackoutDateService.is_date_blocked(
            db, appointment_date, location_id, barber_id, appointment_time
        )
        
        if is_blocked:
            conflicts.append(ConflictInfo(
                conflict_type="blackout_date",
                conflict_date=appointment_date,
                conflict_time=appointment_time,
                details={
                    "blackout_id": blackout.id,
                    "blackout_reason": blackout.reason,
                    "blackout_type": blackout.blackout_type,
                    "allow_emergency": blackout.allow_emergency_bookings
                },
                suggested_resolution="skip" if not blackout.allow_emergency_bookings else "manual_review"
            ))
        
        # Check holidays if pattern excludes them
        if HolidayService.is_holiday(appointment_date):
            conflicts.append(ConflictInfo(
                conflict_type="holiday",
                conflict_date=appointment_date,
                conflict_time=appointment_time,
                details={"holiday_type": "national"},
                suggested_resolution="skip"
            ))
        
        return conflicts


class RecurringSeriesService:
    """Service for managing recurring appointment series"""
    
    @staticmethod
    def create_series(
        db: Session,
        pattern_id: int,
        user_id: int,
        series_data: schemas.RecurringSeriesCreate
    ) -> models.RecurringAppointmentSeries:
        """Create a new recurring appointment series"""
        
        # Verify pattern exists and belongs to user
        pattern = db.query(models.RecurringAppointmentPattern).filter(
            models.RecurringAppointmentPattern.id == pattern_id,
            models.RecurringAppointmentPattern.user_id == user_id
        ).first()
        
        if not pattern:
            raise ValueError("Recurring pattern not found")
        
        series = models.RecurringAppointmentSeries(
            pattern_id=pattern_id,
            user_id=user_id,
            series_name=series_data.series_name,
            series_description=series_data.series_description,
            payment_type=series_data.payment_type,
            total_series_price=series_data.total_series_price
        )
        
        db.add(series)
        db.commit()
        db.refresh(series)
        
        return series
    
    @staticmethod
    def update_series_progress(
        db: Session,
        series_id: int,
        completed_count: Optional[int] = None,
        cancelled_count: Optional[int] = None,
        rescheduled_count: Optional[int] = None
    ) -> models.RecurringAppointmentSeries:
        """Update series progress tracking"""
        
        series = db.query(models.RecurringAppointmentSeries).filter(
            models.RecurringAppointmentSeries.id == series_id
        ).first()
        
        if not series:
            raise ValueError("Series not found")
        
        if completed_count is not None:
            series.total_completed = completed_count
        
        if cancelled_count is not None:
            series.total_cancelled = cancelled_count
        
        if rescheduled_count is not None:
            series.total_rescheduled = rescheduled_count
        
        # Calculate completion percentage
        if series.total_planned > 0:
            series.completion_percentage = (series.total_completed / series.total_planned) * 100
        
        # Update series status
        if series.completion_percentage >= 100:
            series.series_status = "completed"
            series.completed_at = datetime.utcnow()
        elif series.completion_percentage > 0:
            series.series_status = "in_progress"
        
        series.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(series)
        
        return series


class EnhancedRecurringService:
    """Enhanced service for recurring appointment management"""
    
    @staticmethod
    def calculate_next_occurrence_dates(
        pattern: models.RecurringAppointmentPattern,
        limit: int = 50,
        start_from: Optional[date] = None
    ) -> List[date]:
        """Calculate next occurrence dates for a recurring pattern"""
        
        if start_from is None:
            start_from = max(pattern.start_date, date.today())
        
        occurrence_dates = []
        current_date = start_from
        
        # Safety limit to prevent infinite loops
        max_iterations = limit * 10
        iterations = 0
        
        while len(occurrence_dates) < limit and iterations < max_iterations:
            iterations += 1
            
            # Check if we've exceeded the end date or occurrence limit
            if pattern.end_date and current_date > pattern.end_date:
                break
            
            if pattern.occurrences and len(occurrence_dates) >= pattern.occurrences:
                break
            
            # Check if current date matches the pattern
            if EnhancedRecurringService._date_matches_pattern(pattern, current_date):
                # Check if date should be excluded
                if not pattern.should_exclude_date(current_date):
                    occurrence_dates.append(current_date)
            
            # Move to next date based on pattern type
            current_date = EnhancedRecurringService._get_next_candidate_date(pattern, current_date)
            
            # Prevent infinite loops for malformed patterns
            if current_date > date.today() + timedelta(days=365 * 2):  # 2 years limit
                break
        
        return occurrence_dates
    
    @staticmethod
    def _date_matches_pattern(pattern: models.RecurringAppointmentPattern, check_date: date) -> bool:
        """Check if a date matches the recurring pattern"""
        
        if pattern.pattern_type == "daily":
            # For daily patterns, every date matches (subject to other constraints)
            return True
        
        elif pattern.pattern_type in ["weekly", "biweekly"]:
            if not pattern.days_of_week:
                return False
            
            # Check if the weekday matches
            weekday = check_date.weekday()  # 0 = Monday, 6 = Sunday
            if weekday not in pattern.days_of_week:
                return False
            
            # For biweekly, check if it's the right week
            if pattern.pattern_type == "biweekly":
                weeks_since_start = (check_date - pattern.start_date).days // 7
                return weeks_since_start % 2 == 0
            
            return True
        
        elif pattern.pattern_type == "monthly":
            if pattern.day_of_month:
                # Fixed day of month (e.g., 15th of every month)
                return check_date.day == pattern.day_of_month
            
            elif pattern.week_of_month and pattern.weekday_of_month is not None:
                # Specific weekday of specific week (e.g., 2nd Tuesday)
                first_day = check_date.replace(day=1)
                first_weekday = first_day.weekday()
                
                # Find the target weekday in the target week
                target_weekday = pattern.weekday_of_month
                target_week = pattern.week_of_month
                
                # Calculate the date of the target weekday in the target week
                days_to_add = (target_weekday - first_weekday) % 7
                days_to_add += (target_week - 1) * 7
                
                target_date = first_day + timedelta(days=days_to_add)
                
                # Make sure the target date is still in the same month
                if target_date.month != check_date.month:
                    return False
                
                return check_date == target_date
        
        return False
    
    @staticmethod
    def _get_next_candidate_date(pattern: models.RecurringAppointmentPattern, current_date: date) -> date:
        """Get the next candidate date based on pattern type"""
        
        if pattern.pattern_type == "daily":
            return current_date + timedelta(days=pattern.interval_value or 1)
        
        elif pattern.pattern_type in ["weekly", "biweekly"]:
            interval_days = 7 if pattern.pattern_type == "weekly" else 14
            interval_days *= (pattern.interval_value or 1)
            return current_date + timedelta(days=1)  # Check day by day
        
        elif pattern.pattern_type == "monthly":
            # Move to next month
            if current_date.day == monthrange(current_date.year, current_date.month)[1]:
                # Last day of month, move to next month
                return (current_date + timedelta(days=1)).replace(day=1)
            else:
                return current_date + timedelta(days=1)
        
        return current_date + timedelta(days=1)
    
    @staticmethod
    def generate_appointment_series(
        db: Session,
        pattern_id: int,
        user_id: int,
        preview_only: bool = False,
        max_appointments: int = 50,
        auto_resolve_conflicts: bool = True
    ) -> AppointmentGenerationResult:
        """Generate a series of appointments from a recurring pattern"""
        
        # Get the pattern
        pattern = db.query(models.RecurringAppointmentPattern).filter(
            models.RecurringAppointmentPattern.id == pattern_id,
            models.RecurringAppointmentPattern.user_id == user_id
        ).first()
        
        if not pattern:
            raise ValueError("Recurring pattern not found")
        
        # Calculate occurrence dates
        occurrence_dates = EnhancedRecurringService.calculate_next_occurrence_dates(
            pattern, limit=max_appointments
        )
        
        successful_appointments = []
        conflicts = []
        skipped_dates = []
        
        for i, occurrence_date in enumerate(occurrence_dates):
            appointment_datetime = datetime.combine(occurrence_date, pattern.preferred_time)
            
            # Check for conflicts
            appointment_conflicts = ConflictDetectionService.detect_appointment_conflicts(
                db=db,
                appointment_date=occurrence_date,
                appointment_time=pattern.preferred_time,
                duration_minutes=pattern.duration_minutes,
                barber_id=pattern.barber_id,
                location_id=pattern.location_id
            )
            
            if appointment_conflicts:
                conflicts.extend(appointment_conflicts)
                
                # Check if we can auto-resolve
                if auto_resolve_conflicts and pattern.reschedule_on_conflict:
                    # Try to find alternative time slots
                    resolved_slot = EnhancedRecurringService._find_alternative_slot(
                        db, occurrence_date, pattern, appointment_conflicts
                    )
                    
                    if resolved_slot:
                        appointment_datetime = resolved_slot
                    else:
                        skipped_dates.append(occurrence_date)
                        continue
                else:
                    skipped_dates.append(occurrence_date)
                    continue
            
            # Create appointment if not preview only
            appointment_data = {
                "user_id": user_id,
                "barber_id": pattern.barber_id,
                "client_id": pattern.client_id,
                "service_id": pattern.service_id,
                "location_id": pattern.location_id,
                "start_time": appointment_datetime,
                "duration_minutes": pattern.duration_minutes,
                "price": pattern.get_effective_price(100.0),  # Default price, should come from service
                "status": "pending",
                "recurring_pattern_id": pattern_id,
                "is_recurring_instance": True,
                "recurrence_sequence": i + 1,
                "buffer_time_before": pattern.buffer_time_before,
                "buffer_time_after": pattern.buffer_time_after
            }
            
            if not preview_only:
                appointment = models.Appointment(**appointment_data)
                db.add(appointment)
                appointment_data["appointment_id"] = appointment.id
            
            successful_appointments.append(appointment_data)
        
        if not preview_only:
            # Update pattern tracking
            pattern.last_generated_date = date.today()
            pattern.total_generated += len(successful_appointments)
            
            db.commit()
        
        return AppointmentGenerationResult(
            successful_appointments=successful_appointments,
            conflicts=conflicts,
            skipped_dates=skipped_dates,
            total_generated=len(successful_appointments),
            total_conflicts=len(conflicts)
        )
    
    @staticmethod
    def _find_alternative_slot(
        db: Session,
        target_date: date,
        pattern: models.RecurringAppointmentPattern,
        conflicts: List[ConflictInfo]
    ) -> Optional[datetime]:
        """Find an alternative time slot on the same day"""
        
        # Try different time slots (±2 hours from original time)
        original_time = pattern.preferred_time
        original_datetime = datetime.combine(date.today(), original_time)
        
        for offset_minutes in range(-120, 121, 30):  # Try every 30 minutes
            if offset_minutes == 0:
                continue  # Skip original time
            
            candidate_datetime = original_datetime + timedelta(minutes=offset_minutes)
            candidate_time = candidate_datetime.time()
            
            # Check business hours (assuming 9 AM to 6 PM)
            if candidate_time < time(9, 0) or candidate_time > time(18, 0):
                continue
            
            # Check for conflicts at this time
            test_conflicts = ConflictDetectionService.detect_appointment_conflicts(
                db=db,
                appointment_date=target_date,
                appointment_time=candidate_time,
                duration_minutes=pattern.duration_minutes,
                barber_id=pattern.barber_id,
                location_id=pattern.location_id
            )
            
            if not test_conflicts:
                return datetime.combine(target_date, candidate_time)
        
        return None
    
    @staticmethod
    def manage_appointment_series(
        db: Session,
        action_data: schemas.AppointmentSeriesManagement,
        user_id: int
    ) -> Dict[str, Any]:
        """Manage individual appointments or entire series"""
        
        result = {
            "action": action_data.action,
            "success": False,
            "affected_appointments": [],
            "message": ""
        }
        
        if action_data.appointment_id:
            # Get the specific appointment
            appointment = db.query(models.Appointment).filter(
                models.Appointment.id == action_data.appointment_id,
                models.Appointment.user_id == user_id
            ).first()
            
            if not appointment:
                result["message"] = "Appointment not found"
                return result
            
            appointments_to_update = [appointment]
            
            # If applying to series, get all future appointments in the series
            if action_data.apply_to_series and appointment.recurring_pattern_id:
                future_appointments = db.query(models.Appointment).filter(
                    models.Appointment.recurring_pattern_id == appointment.recurring_pattern_id,
                    models.Appointment.start_time >= appointment.start_time,
                    models.Appointment.status.in_(["pending", "confirmed"])
                ).all()
                appointments_to_update = future_appointments
        
        else:
            result["message"] = "No appointment ID provided"
            return result
        
        # Apply the action to selected appointments
        for apt in appointments_to_update:
            if action_data.action == "reschedule":
                if action_data.new_date and action_data.new_time:
                    # Store original date if not already stored
                    if not apt.original_scheduled_date:
                        apt.original_scheduled_date = apt.start_time.date()
                    
                    # Update appointment time
                    apt.start_time = datetime.combine(action_data.new_date, action_data.new_time)
                    
                    if action_data.new_barber_id:
                        apt.barber_id = action_data.new_barber_id
                    
                    result["affected_appointments"].append({
                        "appointment_id": apt.id,
                        "new_start_time": apt.start_time.isoformat(),
                        "action": "rescheduled"
                    })
            
            elif action_data.action == "cancel":
                apt.status = "cancelled"
                result["affected_appointments"].append({
                    "appointment_id": apt.id,
                    "action": "cancelled"
                })
            
            elif action_data.action == "complete":
                apt.status = "completed"
                result["affected_appointments"].append({
                    "appointment_id": apt.id,
                    "action": "completed"
                })
        
        db.commit()
        
        # Update series progress if applicable
        if appointments_to_update and appointments_to_update[0].recurring_series_id:
            RecurringSeriesService.update_series_progress(
                db, appointments_to_update[0].recurring_series_id
            )
        
        result["success"] = True
        result["message"] = f"Successfully {action_data.action}d {len(appointments_to_update)} appointment(s)"
        
        return result


# Export all services
__all__ = [
    "EnhancedRecurringService",
    "RecurringSeriesService", 
    "ConflictDetectionService",
    "BlackoutDateService",
    "HolidayService",
    "AppointmentGenerationResult",
    "ConflictInfo"
]