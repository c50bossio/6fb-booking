"""
Custom validators for booking business rules.

This module provides specialized validators that can be used across
different booking schemas to enforce complex business rules.
"""

from datetime import datetime, date, time, timedelta
from typing import Optional, List, Dict, Any, Tuple
import pytz
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, not_


class BusinessHoursValidator:
    """Validates appointments against business hours configuration"""
    
    def __init__(self, 
                 start_time: time, 
                 end_time: time,
                 blocked_days: Optional[List[int]] = None,
                 holiday_dates: Optional[List[date]] = None):
        self.start_time = start_time
        self.end_time = end_time
        self.blocked_days = blocked_days or []  # 0=Monday, 6=Sunday
        self.holiday_dates = holiday_dates or []
    
    def is_within_hours(self, appointment_time: time) -> Tuple[bool, Optional[str]]:
        """Check if time is within business hours"""
        if appointment_time < self.start_time:
            return False, f"Business opens at {self.start_time.strftime('%I:%M %p')}"
        
        if appointment_time >= self.end_time:
            return False, f"Last appointment must start before {self.end_time.strftime('%I:%M %p')}"
        
        return True, None
    
    def is_working_day(self, appointment_date: date) -> Tuple[bool, Optional[str]]:
        """Check if date is a working day"""
        # Check if it's a blocked day of week
        day_of_week = appointment_date.weekday()
        if day_of_week in self.blocked_days:
            day_names = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
            return False, f"We are closed on {day_names[day_of_week]}s"
        
        # Check if it's a holiday
        if appointment_date in self.holiday_dates:
            return False, f"We are closed on {appointment_date.strftime('%B %d, %Y')} (holiday)"
        
        return True, None
    
    def validate(self, appointment_date: date, appointment_time: time) -> Tuple[bool, Optional[str]]:
        """Full validation of date and time"""
        # Check working day
        is_valid, error = self.is_working_day(appointment_date)
        if not is_valid:
            return False, error
        
        # Check business hours
        is_valid, error = self.is_within_hours(appointment_time)
        if not is_valid:
            return False, error
        
        return True, None


class BookingWindowValidator:
    """Validates booking window constraints"""
    
    def __init__(self,
                 min_advance_minutes: int = 30,
                 max_advance_days: int = 90,
                 same_day_cutoff: Optional[time] = None,
                 timezone: str = "UTC"):
        self.min_advance_minutes = min_advance_minutes
        self.max_advance_days = max_advance_days
        self.same_day_cutoff = same_day_cutoff
        self.timezone = pytz.timezone(timezone)
    
    def validate_advance_booking(self, 
                               appointment_datetime: datetime,
                               current_time: Optional[datetime] = None) -> Tuple[bool, Optional[str]]:
        """Validate advance booking requirements"""
        if current_time is None:
            current_time = datetime.now(self.timezone)
        
        # Ensure both datetimes are timezone-aware
        if appointment_datetime.tzinfo is None:
            appointment_datetime = self.timezone.localize(appointment_datetime)
        
        # Convert to same timezone for comparison
        current_time = current_time.astimezone(self.timezone)
        appointment_datetime = appointment_datetime.astimezone(self.timezone)
        
        # Check minimum advance booking
        min_booking_time = current_time + timedelta(minutes=self.min_advance_minutes)
        if appointment_datetime < min_booking_time:
            hours = self.min_advance_minutes // 60
            minutes = self.min_advance_minutes % 60
            if hours > 0:
                time_str = f"{hours} hour{'s' if hours > 1 else ''}"
                if minutes > 0:
                    time_str += f" and {minutes} minute{'s' if minutes > 1 else ''}"
            else:
                time_str = f"{minutes} minute{'s' if minutes > 1 else ''}"
            
            return False, f"Appointments must be booked at least {time_str} in advance"
        
        # Check maximum advance booking
        max_booking_date = current_time.date() + timedelta(days=self.max_advance_days)
        if appointment_datetime.date() > max_booking_date:
            return False, f"Appointments cannot be booked more than {self.max_advance_days} days in advance"
        
        # Check same-day cutoff
        if self.same_day_cutoff and appointment_datetime.date() == current_time.date():
            cutoff_datetime = self.timezone.localize(
                datetime.combine(current_time.date(), self.same_day_cutoff)
            )
            if current_time > cutoff_datetime:
                return False, f"Same-day appointments must be booked before {self.same_day_cutoff.strftime('%I:%M %p')}"
        
        return True, None


class ServiceDurationValidator:
    """Validates service duration compatibility with schedule"""
    
    def __init__(self, 
                 slot_duration_minutes: int = 30,
                 max_duration_minutes: int = 240,
                 buffer_time_minutes: int = 0):
        self.slot_duration_minutes = slot_duration_minutes
        self.max_duration_minutes = max_duration_minutes
        self.buffer_time_minutes = buffer_time_minutes
    
    def validate_duration(self, duration_minutes: int) -> Tuple[bool, Optional[str]]:
        """Validate service duration"""
        if duration_minutes <= 0:
            return False, "Service duration must be greater than 0"
        
        if duration_minutes > self.max_duration_minutes:
            hours = self.max_duration_minutes // 60
            return False, f"Service duration cannot exceed {hours} hours"
        
        # Check if duration fits into time slots
        if duration_minutes % self.slot_duration_minutes != 0:
            return False, f"Service duration must be in {self.slot_duration_minutes}-minute increments"
        
        return True, None
    
    def calculate_total_duration(self, service_duration: int) -> int:
        """Calculate total duration including buffer time"""
        return service_duration + (self.buffer_time_minutes * 2)
    
    def fits_in_schedule(self, 
                        start_time: time, 
                        duration_minutes: int,
                        end_of_day: time) -> Tuple[bool, Optional[str]]:
        """Check if service fits within business hours"""
        # Calculate end time
        start_datetime = datetime.combine(date.today(), start_time)
        total_duration = self.calculate_total_duration(duration_minutes)
        end_datetime = start_datetime + timedelta(minutes=total_duration)
        
        if end_datetime.time() > end_of_day:
            return False, "This service would extend beyond business hours"
        
        return True, None


class PhoneNumberValidator:
    """Enhanced phone number validation with multiple formats"""
    
    def __init__(self, 
                 default_country: str = "US",
                 allowed_countries: Optional[List[str]] = None):
        self.default_country = default_country
        self.allowed_countries = allowed_countries or ["US", "CA", "GB", "AU"]
    
    def validate_and_format(self, phone: str) -> Tuple[bool, Optional[str], Optional[str]]:
        """
        Validate and format phone number.
        Returns: (is_valid, error_message, formatted_number)
        """
        import phonenumbers
        
        if not phone:
            return False, "Phone number is required", None
        
        # Remove common formatting characters
        phone = phone.strip().replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
        
        # Try parsing with default country
        try:
            parsed = phonenumbers.parse(phone, self.default_country)
            
            # Check if valid
            if not phonenumbers.is_valid_number(parsed):
                return False, "Invalid phone number", None
            
            # Check if country is allowed
            country = phonenumbers.region_code_for_number(parsed)
            if self.allowed_countries and country not in self.allowed_countries:
                return False, f"Phone numbers from {country} are not supported", None
            
            # Format to E.164
            formatted = phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)
            
            return True, None, formatted
            
        except phonenumbers.NumberParseException as e:
            return False, "Invalid phone number format", None


class ConflictValidator:
    """Validates scheduling conflicts"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def check_barber_availability(self,
                                barber_id: int,
                                start_datetime: datetime,
                                duration_minutes: int,
                                exclude_appointment_id: Optional[int] = None) -> Tuple[bool, Optional[str]]:
        """Check if barber is available at the requested time"""
        from models import Appointment  # Import here to avoid circular dependency
        
        end_datetime = start_datetime + timedelta(minutes=duration_minutes)
        
        # Build query for overlapping appointments
        query = self.db.query(Appointment).filter(
            Appointment.barber_id == barber_id,
            Appointment.status.in_(["pending", "confirmed"]),
            or_(
                # New appointment starts during existing appointment
                and_(
                    Appointment.start_time <= start_datetime,
                    Appointment.start_time + timedelta(minutes=Appointment.duration_minutes) > start_datetime
                ),
                # New appointment ends during existing appointment
                and_(
                    Appointment.start_time < end_datetime,
                    Appointment.start_time + timedelta(minutes=Appointment.duration_minutes) >= end_datetime
                ),
                # New appointment completely contains existing appointment
                and_(
                    start_datetime <= Appointment.start_time,
                    end_datetime >= Appointment.start_time + timedelta(minutes=Appointment.duration_minutes)
                )
            )
        )
        
        # Exclude current appointment if updating
        if exclude_appointment_id:
            query = query.filter(Appointment.id != exclude_appointment_id)
        
        conflict = query.first()
        
        if conflict:
            return False, f"This time slot is already booked. The barber is unavailable from {conflict.start_time.strftime('%I:%M %p')} to {(conflict.start_time + timedelta(minutes=conflict.duration_minutes)).strftime('%I:%M %p')}"
        
        return True, None
    
    def check_client_double_booking(self,
                                  client_id: int,
                                  start_datetime: datetime,
                                  duration_minutes: int,
                                  exclude_appointment_id: Optional[int] = None) -> Tuple[bool, Optional[str]]:
        """Check if client already has an appointment at this time"""
        from models import Appointment
        
        end_datetime = start_datetime + timedelta(minutes=duration_minutes)
        
        # Similar query for client conflicts
        query = self.db.query(Appointment).filter(
            Appointment.client_id == client_id,
            Appointment.status.in_(["pending", "confirmed"]),
            or_(
                and_(
                    Appointment.start_time <= start_datetime,
                    Appointment.start_time + timedelta(minutes=Appointment.duration_minutes) > start_datetime
                ),
                and_(
                    Appointment.start_time < end_datetime,
                    Appointment.start_time + timedelta(minutes=Appointment.duration_minutes) >= end_datetime
                )
            )
        )
        
        if exclude_appointment_id:
            query = query.filter(Appointment.id != exclude_appointment_id)
        
        conflict = query.first()
        
        if conflict:
            return False, "You already have an appointment scheduled at this time"
        
        return True, None


class ServiceCompatibilityValidator:
    """Validates service-specific booking rules"""
    
    def validate_age_requirements(self,
                                client_age: Optional[int],
                                min_age: Optional[int],
                                max_age: Optional[int]) -> Tuple[bool, Optional[str]]:
        """Check age requirements for service"""
        if not client_age:
            if min_age or max_age:
                return False, "Age verification required for this service"
            return True, None
        
        if min_age and client_age < min_age:
            return False, f"This service requires clients to be at least {min_age} years old"
        
        if max_age and client_age > max_age:
            return False, f"This service is only available for clients up to {max_age} years old"
        
        return True, None
    
    def validate_consultation_requirements(self,
                                         client_id: int,
                                         requires_consultation: bool,
                                         db: Session) -> Tuple[bool, Optional[str]]:
        """Check if client has completed required consultation"""
        if not requires_consultation:
            return True, None
        
        # Check if client has a completed consultation
        # This would query a consultations table
        # For now, return a placeholder
        return False, "This service requires a consultation. Please book a consultation first."
    
    def validate_patch_test(self,
                          client_id: int,
                          requires_patch_test: bool,
                          patch_test_hours: int,
                          appointment_datetime: datetime,
                          db: Session) -> Tuple[bool, Optional[str]]:
        """Check patch test requirements for chemical services"""
        if not requires_patch_test:
            return True, None
        
        # Check if client has a valid patch test
        # This would query a patch_tests table
        # For now, return a placeholder
        required_date = appointment_datetime - timedelta(hours=patch_test_hours)
        return False, f"This service requires a patch test at least {patch_test_hours} hours before your appointment. Please complete a patch test by {required_date.strftime('%B %d at %I:%M %p')}"


class RecurringBookingValidator:
    """Validates recurring appointment patterns"""
    
    def validate_pattern(self,
                       pattern_type: str,
                       days_of_week: Optional[List[int]],
                       day_of_month: Optional[int],
                       frequency: Optional[int]) -> Tuple[bool, Optional[str]]:
        """Validate recurring pattern configuration"""
        valid_patterns = ["daily", "weekly", "biweekly", "monthly"]
        
        if pattern_type not in valid_patterns:
            return False, f"Pattern type must be one of: {', '.join(valid_patterns)}"
        
        if pattern_type in ["weekly", "biweekly"] and not days_of_week:
            return False, f"{pattern_type.capitalize()} patterns require days of week to be specified"
        
        if pattern_type == "monthly" and not day_of_month:
            return False, "Monthly patterns require day of month to be specified"
        
        if day_of_month and (day_of_month < 1 or day_of_month > 31):
            return False, "Day of month must be between 1 and 31"
        
        return True, None
    
    def generate_occurrences(self,
                           start_date: date,
                           pattern_type: str,
                           end_date: Optional[date] = None,
                           max_occurrences: int = 52) -> List[date]:
        """Generate list of occurrence dates based on pattern"""
        occurrences = []
        current_date = start_date
        
        if not end_date:
            end_date = start_date + timedelta(days=365)  # Default to 1 year
        
        while current_date <= end_date and len(occurrences) < max_occurrences:
            occurrences.append(current_date)
            
            if pattern_type == "daily":
                current_date += timedelta(days=1)
            elif pattern_type == "weekly":
                current_date += timedelta(weeks=1)
            elif pattern_type == "biweekly":
                current_date += timedelta(weeks=2)
            elif pattern_type == "monthly":
                # Handle month boundaries
                if current_date.month == 12:
                    next_month = current_date.replace(year=current_date.year + 1, month=1)
                else:
                    next_month = current_date.replace(month=current_date.month + 1)
                current_date = next_month
        
        return occurrences


# Composite validator that combines multiple validation rules
class BookingValidator:
    """Main validator that orchestrates all booking validations"""
    
    def __init__(self, db: Session, config: Dict[str, Any]):
        self.db = db
        self.config = config
        
        # Initialize component validators
        self.business_hours = BusinessHoursValidator(
            start_time=config.get('business_start_time', time(9, 0)),
            end_time=config.get('business_end_time', time(18, 0)),
            blocked_days=config.get('blocked_days', []),
            holiday_dates=config.get('holiday_dates', [])
        )
        
        self.booking_window = BookingWindowValidator(
            min_advance_minutes=config.get('min_advance_minutes', 30),
            max_advance_days=config.get('max_advance_days', 90),
            same_day_cutoff=config.get('same_day_cutoff'),
            timezone=config.get('timezone', 'UTC')
        )
        
        self.duration_validator = ServiceDurationValidator(
            slot_duration_minutes=config.get('slot_duration_minutes', 30),
            max_duration_minutes=config.get('max_duration_minutes', 240)
        )
        
        self.conflict_validator = ConflictValidator(db)
        self.service_validator = ServiceCompatibilityValidator()
        
    def validate_booking(self, booking_data: Dict[str, Any]) -> Tuple[bool, List[str]]:
        """
        Comprehensive booking validation.
        Returns (is_valid, list_of_errors)
        """
        errors = []
        
        # Extract data
        appointment_date = booking_data['date']
        appointment_time = booking_data['time']
        duration_minutes = booking_data.get('duration_minutes', 30)
        barber_id = booking_data.get('barber_id')
        client_id = booking_data.get('client_id')
        service_data = booking_data.get('service_data', {})
        
        # Create datetime
        appointment_datetime = datetime.combine(appointment_date, appointment_time)
        if booking_data.get('timezone'):
            tz = pytz.timezone(booking_data['timezone'])
            appointment_datetime = tz.localize(appointment_datetime)
        
        # 1. Business hours validation
        is_valid, error = self.business_hours.validate(appointment_date, appointment_time)
        if not is_valid:
            errors.append(error)
        
        # 2. Booking window validation
        is_valid, error = self.booking_window.validate_advance_booking(appointment_datetime)
        if not is_valid:
            errors.append(error)
        
        # 3. Duration validation
        is_valid, error = self.duration_validator.validate_duration(duration_minutes)
        if not is_valid:
            errors.append(error)
        
        # 4. Check if fits in schedule
        is_valid, error = self.duration_validator.fits_in_schedule(
            appointment_time,
            duration_minutes,
            self.config.get('business_end_time', time(18, 0))
        )
        if not is_valid:
            errors.append(error)
        
        # 5. Conflict validation
        if barber_id:
            is_valid, error = self.conflict_validator.check_barber_availability(
                barber_id, appointment_datetime, duration_minutes
            )
            if not is_valid:
                errors.append(error)
        
        if client_id:
            is_valid, error = self.conflict_validator.check_client_double_booking(
                client_id, appointment_datetime, duration_minutes
            )
            if not is_valid:
                errors.append(error)
        
        # 6. Service-specific validations
        if service_data.get('requires_consultation'):
            is_valid, error = self.service_validator.validate_consultation_requirements(
                client_id, True, self.db
            )
            if not is_valid:
                errors.append(error)
        
        if service_data.get('requires_patch_test'):
            is_valid, error = self.service_validator.validate_patch_test(
                client_id, 
                True,
                service_data.get('patch_test_hours', 48),
                appointment_datetime,
                self.db
            )
            if not is_valid:
                errors.append(error)
        
        return len(errors) == 0, errors