"""
Enhanced booking validation schemas with comprehensive input validation and sanitization.

This module provides robust validation for all booking-related inputs to ensure:
- Data integrity and consistency
- Protection against XSS and injection attacks
- Business rule enforcement
- Clear error messaging for users
"""

from pydantic import BaseModel, Field, field_validator, EmailStr, model_validator, ConfigDict
from datetime import date as Date, datetime, time as Time, timedelta
from typing import Optional, List
import re
import bleach
import phonenumbers
from phonenumbers import NumberParseException
import pytz
from enum import Enum

# Configuration constants
MIN_BOOKING_ADVANCE_MINUTES = 15  # Minimum advance booking time
MAX_BOOKING_ADVANCE_DAYS = 365   # Maximum days in advance for booking
MAX_NOTES_LENGTH = 500           # Maximum length for notes field
MIN_SERVICE_DURATION = 15        # Minimum service duration in minutes
MAX_SERVICE_DURATION = 480       # Maximum service duration (8 hours)
BUSINESS_HOURS_START = Time(6, 0)  # Earliest possible business hour
BUSINESS_HOURS_END = Time(23, 0)   # Latest possible business hour

class BookingStatus(str, Enum):
    """Valid booking statuses"""
    PENDING = "pending"
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"
    COMPLETED = "completed"
    NO_SHOW = "no_show"

class TimeSlotIncrement(int, Enum):
    """Valid time slot increments in minutes"""
    FIFTEEN = 15
    THIRTY = 30
    FORTY_FIVE = 45
    SIXTY = 60

def sanitize_html(value: str) -> str:
    """
    Sanitize HTML content to prevent XSS attacks.
    Allows only basic formatting tags.
    """
    if not value:
        return value
    
    # Define allowed tags and attributes
    allowed_tags = []  # No HTML tags allowed in booking data
    allowed_attributes = {}
    
    # Clean the HTML
    cleaned = bleach.clean(
        value,
        tags=allowed_tags,
        attributes=allowed_attributes,
        strip=True
    )
    
    # Additional cleanup: remove multiple spaces and newlines
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()
    
    return cleaned

def validate_phone_number(phone: str, default_region: str = "US") -> str:
    """
    Validate and format phone number.
    Returns formatted phone number in E.164 format.
    """
    if not phone:
        return phone
    
    try:
        # Parse the phone number
        parsed = phonenumbers.parse(phone, default_region)
        
        # Validate the number
        if not phonenumbers.is_valid_number(parsed):
            raise ValueError("Invalid phone number")
        
        # Format to E.164
        return phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)
    
    except NumberParseException:
        raise ValueError("Invalid phone number format")

class BusinessHoursValidation(BaseModel):
    """Validates business hours configuration"""
    start_time: Time = Field(..., description="Business start time")
    end_time: Time = Field(..., description="Business end time")
    
    @field_validator('start_time')
    @classmethod
    def validate_start_time(cls, v):
        if v < BUSINESS_HOURS_START or v > BUSINESS_HOURS_END:
            raise ValueError(f"Start time must be between {BUSINESS_HOURS_START} and {BUSINESS_HOURS_END}")
        return v
    
    @field_validator('end_time')
    @classmethod
    def validate_end_time(cls, v, values):
        if v < BUSINESS_HOURS_START or v > BUSINESS_HOURS_END:
            raise ValueError(f"End time must be between {BUSINESS_HOURS_START} and {BUSINESS_HOURS_END}")
        
        if 'start_time' in values and v <= values['start_time']:
            raise ValueError("End time must be after start time")
        
        return v

class DateValidation(BaseModel):
    """Base class for date validation"""
    date: Date = Field(..., description="Booking date")
    timezone: Optional[str] = Field(None, description="Timezone for date validation")
    
    @field_validator('date')
    @classmethod
    def validate_date_not_past(cls, v, values):
        """Ensure date is not in the past"""
        # Get timezone if provided
        tz = pytz.UTC
        if 'timezone' in values and values['timezone']:
            try:
                tz = pytz.timezone(values['timezone'])
            except:
                pass
        
        # Get current date in the specified timezone
        now = datetime.now(tz).date()
        
        if v < now:
            raise ValueError("Booking date cannot be in the past")
        
        return v
    
    @field_validator('date')
    @classmethod
    def validate_booking_window(cls, v, values):
        """Ensure date is within allowed booking window"""
        # Get timezone if provided
        tz = pytz.UTC
        if 'timezone' in values and values['timezone']:
            try:
                tz = pytz.timezone(values['timezone'])
            except:
                pass
        
        # Get current date in the specified timezone
        now = datetime.now(tz).date()
        max_date = now + timedelta(days=MAX_BOOKING_ADVANCE_DAYS)
        
        if v > max_date:
            raise ValueError(f"Bookings can only be made up to {MAX_BOOKING_ADVANCE_DAYS} days in advance")
        
        return v

class TimeSlotValidation(BaseModel):
    """Validates time slot selection"""
    time: str = Field(..., pattern="^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$", description="Time in HH:MM format")
    business_hours: Optional[BusinessHoursValidation] = None
    
    @field_validator('time')
    @classmethod
    def validate_time_format(cls, v):
        """Validate time format and extract components"""
        try:
            hours, minutes = map(int, v.split(':'))
            if not (0 <= hours <= 23 and 0 <= minutes <= 59):
                raise ValueError
            return v
        except:
            raise ValueError("Time must be in HH:MM format (24-hour)")
    
    @field_validator('time')
    @classmethod
    def validate_time_increment(cls, v):
        """Ensure time is on valid increment (15, 30, 45, or 60 minutes)"""
        _, minutes = map(int, v.split(':'))
        
        valid_minutes = [0, 15, 30, 45]
        if minutes not in valid_minutes:
            raise ValueError("Appointment times must be on 15-minute increments (00, 15, 30, or 45)")
        
        return v
    
    @model_validator(mode='before')
    def validate_within_business_hours(cls, values):
        """Ensure time is within business hours if provided"""
        time_str = values.get('time')
        business_hours = values.get('business_hours')
        
        if time_str and business_hours:
            hours, minutes = map(int, time_str.split(':'))
            appointment_time = Time(hours, minutes)
            
            if appointment_time < business_hours.start_time or appointment_time >= business_hours.end_time:
                raise ValueError(
                    f"Appointment time must be between {business_hours.start_time.strftime('%H:%M')} "
                    f"and {business_hours.end_time.strftime('%H:%M')}"
                )
        
        return values

class ServiceValidation(BaseModel):
    """Validates service selection and configuration"""
    service_id: Optional[int] = Field(None, gt=0, description="Service ID from catalog")
    service_name: Optional[str] = Field(None, min_length=1, max_length=100, description="Service name")
    duration_minutes: Optional[int] = Field(
        None, 
        ge=MIN_SERVICE_DURATION, 
        le=MAX_SERVICE_DURATION,
        description="Service duration in minutes"
    )
    
    @field_validator('service_name')
    @classmethod
    def sanitize_service_name(cls, v):
        """Sanitize service name"""
        if v:
            return sanitize_html(v)
        return v
    
    @model_validator(mode='before')
    def validate_service_selection(cls, values):
        """Ensure either service_id or service_name is provided"""
        service_id = values.get('service_id')
        service_name = values.get('service_name')
        
        if not service_id and not service_name:
            raise ValueError("Either service_id or service_name must be provided")
        
        return values

class BarberValidation(BaseModel):
    """Validates barber selection"""
    barber_id: Optional[int] = Field(None, gt=0, description="Barber ID")
    
    # Additional fields for availability checking could be added here

class GuestInfoValidation(BaseModel):
    """Enhanced validation for guest information"""
    first_name: str = Field(..., min_length=1, max_length=50)
    last_name: str = Field(..., min_length=1, max_length=50)
    email: EmailStr
    phone: Optional[str] = Field(None, min_length=10, max_length=20)
    
    @field_validator('first_name', 'last_name')
    @classmethod
    def sanitize_names(cls, v):
        """Sanitize names and validate format"""
        # Remove HTML
        v = sanitize_html(v)
        
        # Remove numbers and special characters (except spaces, hyphens, apostrophes)
        v = re.sub(r'[^a-zA-Z\s\-\']', '', v).strip()
        
        if not v:
            raise ValueError("Name must contain valid characters")
        
        # Capitalize properly
        return ' '.join(word.capitalize() for word in v.split())
    
    @field_validator('phone')
    @classmethod
    def validate_phone(cls, v):
        """Validate and format phone number"""
        if v:
            return validate_phone_number(v)
        return v
    
    @field_validator('email')
    @classmethod
    def validate_email_domain(cls, v):
        """Additional email validation"""
        # Check for disposable email domains (basic list)
        disposable_domains = [
            'tempmail.com', 'throwaway.email', 'guerrillamail.com',
            '10minutemail.com', 'mailinator.com'
        ]
        
        domain = v.split('@')[1].lower()
        if domain in disposable_domains:
            raise ValueError("Please use a permanent email address")
        
        return v.lower()

class NotesValidation(BaseModel):
    """Validates notes and special instructions"""
    notes: Optional[str] = Field(None, max_length=MAX_NOTES_LENGTH)
    
    @field_validator('notes')
    @classmethod
    def sanitize_notes(cls, v):
        """Sanitize notes field"""
        if v:
            # Remove HTML and excessive whitespace
            v = sanitize_html(v)
            
            # Limit length after sanitization
            if len(v) > MAX_NOTES_LENGTH:
                v = v[:MAX_NOTES_LENGTH]
            
            return v
        return v

class BookingWindowValidation(BaseModel):
    """Validates booking window constraints"""
    min_advance_booking_minutes: int = Field(default=MIN_BOOKING_ADVANCE_MINUTES, ge=0)
    max_advance_booking_days: int = Field(default=MAX_BOOKING_ADVANCE_DAYS, ge=1, le=365)
    same_day_cutoff_time: Optional[Time] = None
    
    @field_validator('same_day_cutoff_time')
    @classmethod
    def validate_cutoff_time(cls, v):
        """Validate same-day cutoff time"""
        if v and (v < Time(0, 0) or v > Time(23, 59)):
            raise ValueError("Cutoff time must be a valid time")
        return v

class EnhancedAppointmentCreate(BaseModel):
    """
    Enhanced appointment creation with comprehensive validation.
    Includes all validation rules and sanitization.
    """
    # Date and time
    date: Date = Field(..., description="Appointment date")
    time: str = Field(..., pattern="^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$", description="Time in HH:MM format")
    timezone: Optional[str] = Field("UTC", description="Client timezone")
    
    # Service selection
    service_id: Optional[int] = Field(None, gt=0, description="Service ID from catalog")
    service_name: Optional[str] = Field(None, min_length=1, max_length=100, description="Service name")
    duration_minutes: Optional[int] = Field(None, ge=MIN_SERVICE_DURATION, le=MAX_SERVICE_DURATION)
    
    # Barber selection
    barber_id: Optional[int] = Field(None, gt=0, description="Preferred barber ID")
    
    # Client information (for guest bookings)
    guest_info: Optional[GuestInfoValidation] = None
    client_id: Optional[int] = Field(None, gt=0, description="Existing client ID")
    
    # Additional information
    notes: Optional[str] = Field(None, max_length=MAX_NOTES_LENGTH)
    price: Optional[float] = Field(None, gt=0, le=10000, description="Custom price override")
    
    # Business rules
    buffer_time_before: Optional[int] = Field(0, ge=0, le=60, description="Buffer before appointment")
    buffer_time_after: Optional[int] = Field(0, ge=0, le=60, description="Buffer after appointment")
    
    # Validation
    captcha_token: Optional[str] = Field(None, description="reCAPTCHA token for guest bookings")
    
    @field_validator('timezone')
    @classmethod
    def validate_timezone(cls, v):
        """Validate timezone"""
        if v:
            try:
                pytz.timezone(v)
            except pytz.exceptions.UnknownTimeZoneError:
                raise ValueError(f"Invalid timezone: {v}")
        return v
    
    @field_validator('date')
    @classmethod
    def validate_date(cls, v, values):
        """Comprehensive date validation"""
        # Get timezone
        tz = pytz.UTC
        if 'timezone' in values and values['timezone']:
            try:
                tz = pytz.timezone(values['timezone'])
            except:
                pass
        
        # Current datetime in specified timezone
        now = datetime.now(tz)
        today = now.date()
        
        # Check not in past
        if v < today:
            raise ValueError("Cannot book appointments in the past")
        
        # Check within booking window
        max_date = today + timedelta(days=MAX_BOOKING_ADVANCE_DAYS)
        if v > max_date:
            raise ValueError(f"Cannot book more than {MAX_BOOKING_ADVANCE_DAYS} days in advance")
        
        return v
    
    @field_validator('time')
    @classmethod
    def validate_time(cls, v, values):
        """Comprehensive time validation"""
        # Parse time
        try:
            hours, minutes = map(int, v.split(':'))
            appointment_time = Time(hours, minutes)
        except:
            raise ValueError("Invalid time format. Use HH:MM")
        
        # Check time increment
        if minutes not in [0, 15, 30, 45]:
            raise ValueError("Appointments must start on 15-minute increments")
        
        # Check if same day booking
        if 'date' in values and 'timezone' in values:
            tz = pytz.UTC
            if values['timezone']:
                try:
                    tz = pytz.timezone(values['timezone'])
                except:
                    pass
            
            now = datetime.now(tz)
            if values['date'] == now.date():
                # Same day booking - check minimum advance time
                appointment_datetime = tz.localize(
                    datetime.combine(values['date'], appointment_time)
                )
                min_booking_time = now + timedelta(minutes=MIN_BOOKING_ADVANCE_MINUTES)
                
                if appointment_datetime < min_booking_time:
                    raise ValueError(
                        f"Same-day appointments must be booked at least "
                        f"{MIN_BOOKING_ADVANCE_MINUTES} minutes in advance"
                    )
        
        return v
    
    @field_validator('service_name')
    @classmethod
    def sanitize_service_name(cls, v):
        """Sanitize service name"""
        if v:
            return sanitize_html(v)
        return v
    
    @field_validator('notes')
    @classmethod
    def sanitize_notes(cls, v):
        """Sanitize and validate notes"""
        if v:
            # Remove HTML
            v = sanitize_html(v)
            
            # Check length after sanitization
            if len(v) > MAX_NOTES_LENGTH:
                raise ValueError(f"Notes cannot exceed {MAX_NOTES_LENGTH} characters")
            
            return v
        return v
    
    @field_validator('price')
    @classmethod
    def validate_price(cls, v):
        """Validate price is reasonable"""
        if v is not None:
            if v <= 0:
                raise ValueError("Price must be greater than 0")
            if v > 10000:
                raise ValueError("Price seems unusually high. Please verify.")
            
            # Round to 2 decimal places
            return round(v, 2)
        return v
    
    @model_validator(mode='before')
    def validate_service(cls, values):
        """Ensure service is properly specified"""
        service_id = values.get('service_id')
        service_name = values.get('service_name')
        
        if not service_id and not service_name:
            raise ValueError("Either service_id or service_name must be provided")
        
        return values
    
    @model_validator(mode='before')
    def validate_client_info(cls, values):
        """Ensure client information is provided"""
        guest_info = values.get('guest_info')
        client_id = values.get('client_id')
        
        if not guest_info and not client_id:
            raise ValueError("Either guest_info or client_id must be provided")
        
        if guest_info and client_id:
            raise ValueError("Cannot provide both guest_info and client_id")
        
        return values
    
    @model_validator(mode='before')
    def validate_duration_compatibility(cls, values):
        """Ensure duration is compatible with time slots"""
        duration = values.get('duration_minutes')
        
        if duration:
            # Ensure duration is in 15-minute increments
            if duration % 15 != 0:
                raise ValueError("Duration must be in 15-minute increments")
        
        return values

class AppointmentUpdate(BaseModel):
    """Enhanced appointment update validation"""
    date: Optional[Date] = None
    time: Optional[str] = Field(None, pattern="^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$")
    service_id: Optional[int] = Field(None, gt=0)
    service_name: Optional[str] = Field(None, min_length=1, max_length=100)
    barber_id: Optional[int] = Field(None, gt=0)
    duration_minutes: Optional[int] = Field(None, ge=MIN_SERVICE_DURATION, le=MAX_SERVICE_DURATION)
    notes: Optional[str] = Field(None, max_length=MAX_NOTES_LENGTH)
    status: Optional[BookingStatus] = None
    
    # Apply same validators as create
    # Validators will be handled by individual field_validators on each field

class BulkAvailabilityCheck(BaseModel):
    """Validate bulk availability check requests"""
    dates: List[Date] = Field(..., min_length=1, max_length=30, description="Dates to check")
    service_id: Optional[int] = Field(None, gt=0)
    barber_id: Optional[int] = Field(None, gt=0)
    timezone: Optional[str] = Field("UTC")
    
    @field_validator('dates')
    @classmethod
    def validate_dates(cls, v):
        """Ensure dates are valid and in future"""
        today = datetime.now(pytz.UTC).date()
        
        for date in v:
            if date < today:
                raise ValueError("All dates must be in the future")
        
        # Sort dates
        return sorted(v)
    
    @field_validator('timezone')
    @classmethod
    def validate_timezone(cls, v):
        """Validate timezone"""
        try:
            pytz.timezone(v)
        except pytz.exceptions.UnknownTimeZoneError:
            raise ValueError(f"Invalid timezone: {v}")
        return v

# Error message templates for better UX
ERROR_MESSAGES = {
    'date_past': "The selected date has already passed. Please choose a future date.",
    'date_too_far': f"Appointments can only be booked up to {MAX_BOOKING_ADVANCE_DAYS} days in advance.",
    'time_invalid': "Please select a valid appointment time (on 15-minute intervals).",
    'time_too_soon': f"Appointments must be booked at least {MIN_BOOKING_ADVANCE_MINUTES} minutes in advance.",
    'service_required': "Please select a service for your appointment.",
    'guest_info_required': "Please provide your contact information.",
    'phone_invalid': "Please provide a valid phone number including area code.",
    'email_invalid': "Please provide a valid email address.",
    'notes_too_long': f"Notes cannot exceed {MAX_NOTES_LENGTH} characters.",
    'business_hours': "The selected time is outside of business hours.",
}

def get_user_friendly_error(error: str) -> str:
    """Convert validation errors to user-friendly messages"""
    for key, message in ERROR_MESSAGES.items():
        if key in error.lower():
            return message
    return error