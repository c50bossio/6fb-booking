"""
Comprehensive Booking Validation System for Six Figure Barber Methodology

This module implements comprehensive validation for appointment bookings that align with
Six Figure Barber business principles:
- Premium service validation and pricing integrity
- Quality assurance through proper scheduling constraints
- Client experience optimization through business rule enforcement
- Revenue optimization through upselling and service mix validation

Key Features:
- Real-time conflict detection and prevention
- Six Figure Barber service standards validation
- Premium positioning business rules
- Client tier and loyalty program integration
- Dynamic pricing validation
- Service duration and quality standards
"""

from datetime import datetime, date, time, timedelta
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session
from decimal import Decimal
import re
import logging
import models
from utils.timezone import get_business_timezone, convert_to_timezone
import pytz

# Configure logger
logger = logging.getLogger(__name__)

# Six Figure Barber Service Configuration
SIX_FIGURE_SERVICES = {
    "Signature Cut": {
        "duration_minutes": 60,
        "base_price": 120.00,
        "category": "signature",
        "requires_consultation": True,
        "minimum_advance_hours": 4,
        "premium_positioning": True,
        "recommended_interval_days": 21,
        "upsell_services": ["Beard Service", "Executive Package"]
    },
    "Executive Package": {
        "duration_minutes": 120,
        "base_price": 300.00,
        "category": "premium",
        "requires_consultation": True,
        "minimum_advance_hours": 24,
        "premium_positioning": True,
        "recommended_interval_days": 28,
        "requires_premium_slot": True,
        "buffer_time_minutes": 30
    },
    "Haircut": {
        "duration_minutes": 45,
        "base_price": 85.00,
        "category": "signature",
        "requires_consultation": False,
        "minimum_advance_hours": 2,
        "premium_positioning": False,
        "recommended_interval_days": 21,
        "upsell_services": ["Signature Cut", "Beard Service"]
    },
    "Beard Service": {
        "duration_minutes": 30,
        "base_price": 65.00,
        "category": "premium",
        "requires_consultation": False,
        "minimum_advance_hours": 2,
        "premium_positioning": False,
        "recommended_interval_days": 14,
        "can_combine_with": ["Haircut", "Signature Cut"]
    },
    "Grooming Package": {
        "duration_minutes": 90,
        "base_price": 220.00,
        "category": "premium",
        "requires_consultation": True,
        "minimum_advance_hours": 12,
        "premium_positioning": True,
        "recommended_interval_days": 28,
        "buffer_time_minutes": 15
    },
    "Shave": {
        "duration_minutes": 30,
        "base_price": 50.00,
        "category": "standard",
        "requires_consultation": False,
        "minimum_advance_hours": 1,
        "premium_positioning": False,
        "recommended_interval_days": 7,
        "upsell_services": ["Haircut", "Beard Service"]
    },
    "Haircut & Shave": {
        "duration_minutes": 75,
        "base_price": 140.00,
        "category": "signature",
        "requires_consultation": False,
        "minimum_advance_hours": 3,
        "premium_positioning": True,
        "recommended_interval_days": 21
    }
}

# Business Configuration for Six Figure Barber Standards
BUSINESS_RULES = {
    # Quality and Premium Positioning
    "minimum_service_duration": 30,  # No service under 30 minutes
    "maximum_service_duration": 180,  # Maximum 3 hours per appointment
    "consultation_time_minutes": 15,  # Built-in consultation for new clients
    
    # Scheduling and Operations
    "slot_duration_minutes": 30,  # Standard scheduling slots
    "buffer_between_appointments": 15,  # Cleanup and preparation time
    "premium_service_buffer": 30,  # Extra buffer for premium services
    
    # Advance Booking Rules
    "minimum_booking_notice_hours": 2,  # Minimum advance notice
    "maximum_advance_booking_days": 60,  # Maximum booking horizon
    "same_day_booking_cutoff_hour": 12,  # No same-day bookings after noon
    
    # Premium Experience Standards
    "vip_client_priority_hours": 24,  # VIP clients get 24h priority
    "new_client_consultation_required": True,  # New clients must have consultation
    "premium_weekend_only": False,  # Allow premium services on weekends
    
    # Revenue Optimization
    "minimum_service_price": 50.00,  # No service below $50
    "upselling_opportunity_threshold": 0.7,  # Show upsells for 70%+ match
    "loyalty_discount_max_percent": 15,  # Maximum loyalty discount
    
    # Business Hours and Availability
    "default_business_start": time(9, 0),  # 9:00 AM
    "default_business_end": time(18, 0),   # 6:00 PM
    "lunch_break_start": time(12, 30),     # Optional lunch break
    "lunch_break_end": time(13, 30),       # 1 hour lunch
    "weekend_operations": True,            # Weekend bookings allowed
    "holiday_premium_required": True      # Only premium services on holidays
}

class BookingValidationError(Exception):
    """Custom exception for booking validation errors"""
    def __init__(self, message: str, field: str = None, code: str = None, suggestions: List[str] = None):
        self.message = message
        self.field = field
        self.code = code
        self.suggestions = suggestions or []
        super().__init__(self.message)

class ValidationResult:
    """Container for validation results"""
    def __init__(self):
        self.is_valid = True
        self.errors: List[Dict[str, Any]] = []
        self.warnings: List[Dict[str, Any]] = []
        self.suggestions: List[str] = []
        self.upselling_opportunities: List[Dict[str, Any]] = []
        
    def add_error(self, message: str, field: str = None, code: str = None):
        self.is_valid = False
        self.errors.append({
            "message": message,
            "field": field,
            "code": code,
            "severity": "error"
        })
        
    def add_warning(self, message: str, field: str = None, code: str = None):
        self.warnings.append({
            "message": message,
            "field": field,
            "code": code,
            "severity": "warning"
        })
        
    def add_suggestion(self, message: str):
        self.suggestions.append(message)
        
    def add_upsell_opportunity(self, service: str, reason: str, additional_revenue: float):
        self.upselling_opportunities.append({
            "service": service,
            "reason": reason,
            "additional_revenue": additional_revenue,
            "category": "upselling"
        })

def validate_comprehensive_booking(
    db: Session,
    user_id: int,
    booking_date: date,
    booking_time: str,
    service_name: str,
    barber_id: Optional[int] = None,
    client_id: Optional[int] = None,
    notes: Optional[str] = None,
    user_timezone: Optional[str] = None
) -> ValidationResult:
    """
    Comprehensive booking validation implementing Six Figure Barber methodology
    
    Args:
        db: Database session
        user_id: ID of user making the booking
        booking_date: Date of the appointment
        booking_time: Time of the appointment (HH:MM format)
        service_name: Name of the requested service
        barber_id: Optional specific barber ID
        client_id: Optional client ID (for staff bookings)
        notes: Optional appointment notes
        user_timezone: User's timezone
        
    Returns:
        ValidationResult with validation status, errors, warnings, and suggestions
    """
    result = ValidationResult()
    
    try:
        # 1. Validate basic input data
        _validate_basic_input(result, booking_date, booking_time, service_name)
        if not result.is_valid:
            return result
            
        # 2. Validate service and get service info
        service_info = _validate_service_selection(result, service_name)
        if not service_info:
            return result
            
        # 3. Validate date and time constraints
        _validate_datetime_constraints(result, booking_date, booking_time, service_info, user_timezone)
        
        # 4. Validate business hours and availability
        _validate_business_hours(db, result, booking_date, booking_time, service_info)
        
        # 5. Check for booking conflicts
        _validate_booking_conflicts(db, result, booking_date, booking_time, service_info, barber_id)
        
        # 6. Validate barber availability and qualifications
        if barber_id:
            _validate_barber_availability(db, result, barber_id, booking_date, booking_time, service_info)
        
        # 7. Validate client information and history
        user = db.query(models.User).filter(models.User.id == user_id).first()
        if user:
            _validate_client_constraints(db, result, user, client_id, service_info, booking_date)
        
        # 8. Apply Six Figure Barber methodology rules
        _apply_six_figure_methodology_rules(db, result, user, service_info, booking_date, booking_time)
        
        # 9. Generate upselling and revenue optimization suggestions
        _generate_upselling_opportunities(result, service_info, user)
        
        # 10. Validate pricing and payment requirements
        _validate_pricing_requirements(db, result, service_info, user)
        
        logger.info(f"Booking validation completed for user {user_id}: {len(result.errors)} errors, {len(result.warnings)} warnings")
        
    except Exception as e:
        logger.error(f"Error during booking validation: {str(e)}")
        result.add_error(
            "Validation system error. Please try again or contact support.",
            code="VALIDATION_SYSTEM_ERROR"
        )
        
    return result

def _validate_basic_input(result: ValidationResult, booking_date: date, booking_time: str, service_name: str):
    """Validate basic input parameters"""
    
    # Date validation
    if not booking_date:
        result.add_error("Appointment date is required", "date", "REQUIRED_FIELD")
        return
        
    if booking_date < date.today():
        result.add_error("Cannot book appointments in the past", "date", "PAST_DATE")
        return
    
    # Time validation
    if not booking_time:
        result.add_error("Appointment time is required", "time", "REQUIRED_FIELD")
        return
        
    if not re.match(r'^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$', booking_time):
        result.add_error(
            "Please enter a valid time in HH:MM format", 
            "time", 
            "INVALID_FORMAT"
        )
        return
    
    # Service validation
    if not service_name:
        result.add_error("Service selection is required", "service", "REQUIRED_FIELD")

def _validate_service_selection(result: ValidationResult, service_name: str) -> Optional[Dict[str, Any]]:
    """Validate service selection and return service info"""
    
    if service_name not in SIX_FIGURE_SERVICES:
        result.add_error(
            f"Service '{service_name}' is not available. Please select from our premium service menu.",
            "service",
            "INVALID_SERVICE"
        )
        available_services = list(SIX_FIGURE_SERVICES.keys())
        result.add_suggestion(f"Available services: {', '.join(available_services)}")
        return None
        
    service_info = SIX_FIGURE_SERVICES[service_name]
    
    # Add service information as suggestions
    if service_info.get("requires_consultation"):
        result.add_suggestion(f"{service_name} includes a personalized consultation for exceptional results")
        
    if service_info.get("premium_positioning"):
        result.add_suggestion(f"{service_name} is part of our premium Six Figure Barber experience")
        
    return service_info

def _validate_datetime_constraints(
    result: ValidationResult, 
    booking_date: date, 
    booking_time: str, 
    service_info: Dict[str, Any],
    user_timezone: Optional[str]
):
    """Validate date and time constraints according to business rules"""
    
    # Parse booking time
    try:
        hour, minute = map(int, booking_time.split(':'))
        booking_datetime = datetime.combine(booking_date, time(hour, minute))
    except ValueError:
        result.add_error("Invalid time format", "time", "INVALID_FORMAT")
        return
    
    now = datetime.now()
    
    # Minimum advance booking validation
    min_advance_hours = service_info.get("minimum_advance_hours", BUSINESS_RULES["minimum_booking_notice_hours"])
    min_booking_time = now + timedelta(hours=min_advance_hours)
    
    if booking_datetime < min_booking_time:
        result.add_error(
            f"This service requires at least {min_advance_hours} hours advance notice for proper preparation",
            "time",
            "INSUFFICIENT_NOTICE"
        )
    
    # Maximum advance booking validation
    max_advance_date = now.date() + timedelta(days=BUSINESS_RULES["maximum_advance_booking_days"])
    if booking_date > max_advance_date:
        result.add_error(
            f"Appointments can only be booked up to {BUSINESS_RULES['maximum_advance_booking_days']} days in advance",
            "date",
            "TOO_FAR_ADVANCE"
        )
    
    # Same-day booking restrictions
    if booking_date == date.today() and now.hour >= BUSINESS_RULES["same_day_booking_cutoff_hour"]:
        if service_info.get("category") in ["premium", "signature"]:
            result.add_error(
                "Premium services require advance booking and cannot be scheduled same-day after noon",
                "date",
                "SAME_DAY_PREMIUM_RESTRICTED"
            )
    
    # Weekend premium service recommendations
    if booking_date.weekday() >= 5 and service_info.get("category") == "standard":  # Weekend
        result.add_warning(
            "Weekend appointments are perfect for our premium services to maintain your Six Figure look",
            "service",
            "WEEKEND_PREMIUM_SUGGESTED"
        )

def _validate_business_hours(
    db: Session,
    result: ValidationResult, 
    booking_date: date, 
    booking_time: str, 
    service_info: Dict[str, Any]
):
    """Validate appointment falls within business hours"""
    
    # Get business hours from settings or use defaults
    settings = db.query(models.BookingSettings).filter(
        models.BookingSettings.business_id == 1
    ).first()
    
    if settings:
        business_start = settings.business_start_time
        business_end = settings.business_end_time
    else:
        business_start = BUSINESS_RULES["default_business_start"]
        business_end = BUSINESS_RULES["default_business_end"]
    
    # Parse appointment time
    hour, minute = map(int, booking_time.split(':'))
    appointment_time = time(hour, minute)
    
    # Calculate appointment end time
    duration_minutes = service_info["duration_minutes"]
    buffer_minutes = service_info.get("buffer_time_minutes", BUSINESS_RULES["buffer_between_appointments"])
    total_minutes = duration_minutes + buffer_minutes
    
    appointment_end = datetime.combine(booking_date, appointment_time) + timedelta(minutes=total_minutes)
    appointment_end_time = appointment_end.time()
    
    # Validate start time
    if appointment_time < business_start:
        result.add_error(
            f"Appointments must be scheduled after {business_start.strftime('%I:%M %p')} when our premium experience begins",
            "time",
            "BEFORE_BUSINESS_HOURS"
        )
    
    # Validate end time
    if appointment_end_time > business_end:
        result.add_error(
            f"Appointment must end before {business_end.strftime('%I:%M %p')}. This {service_info['duration_minutes']}-minute service would end at {appointment_end_time.strftime('%I:%M %p')}",
            "time",
            "AFTER_BUSINESS_HOURS"
        )
    
    # Check lunch break if configured
    lunch_start = BUSINESS_RULES.get("lunch_break_start")
    lunch_end = BUSINESS_RULES.get("lunch_break_end")
    
    if lunch_start and lunch_end:
        if not (appointment_end_time <= lunch_start or appointment_time >= lunch_end):
            result.add_warning(
                f"This appointment overlaps with lunch break ({lunch_start.strftime('%I:%M %p')} - {lunch_end.strftime('%I:%M %p')})",
                "time",
                "LUNCH_BREAK_OVERLAP"
            )

def _validate_booking_conflicts(
    db: Session,
    result: ValidationResult,
    booking_date: date,
    booking_time: str,
    service_info: Dict[str, Any],
    barber_id: Optional[int]
):
    """Check for conflicts with existing bookings"""
    
    # Calculate appointment window with buffer
    hour, minute = map(int, booking_time.split(':'))
    appointment_start = datetime.combine(booking_date, time(hour, minute))
    
    duration_minutes = service_info["duration_minutes"]
    buffer_minutes = service_info.get("buffer_time_minutes", BUSINESS_RULES["buffer_between_appointments"])
    appointment_end = appointment_start + timedelta(minutes=duration_minutes + buffer_minutes)
    
    # Query existing appointments for the day
    day_start = datetime.combine(booking_date, time.min)
    day_end = datetime.combine(booking_date, time.max)
    
    query = db.query(models.Appointment).filter(
        models.Appointment.start_time >= day_start,
        models.Appointment.start_time <= day_end,
        models.Appointment.status.in_(["scheduled", "confirmed"])
    )
    
    # Filter by barber if specified
    if barber_id:
        query = query.filter(models.Appointment.barber_id == barber_id)
    
    existing_appointments = query.all()
    
    # Check for conflicts
    conflicts = []
    for appointment in existing_appointments:
        existing_start = appointment.start_time
        existing_end = existing_start + timedelta(minutes=appointment.duration_minutes + BUSINESS_RULES["buffer_between_appointments"])
        
        # Check for overlap
        if not (appointment_end <= existing_start or appointment_start >= existing_end):
            conflicts.append(appointment)
    
    if conflicts:
        conflict_times = [conflict.start_time.strftime("%I:%M %p") for conflict in conflicts]
        result.add_error(
            f"This time conflicts with existing appointments at {', '.join(conflict_times)}. Please select a different time.",
            "time",
            "BOOKING_CONFLICT"
        )
        
        # Suggest alternative times
        result.add_suggestion("Use our time slot finder to see all available times for this service")

def _validate_barber_availability(
    db: Session,
    result: ValidationResult,
    barber_id: int,
    booking_date: date,
    booking_time: str,
    service_info: Dict[str, Any]
):
    """Validate barber availability and qualifications"""
    
    # Check if barber exists and is active
    barber = db.query(models.User).filter(
        models.User.id == barber_id,
        models.User.role.in_(["barber", "admin", "super_admin"]),
        models.User.is_active == True
    ).first()
    
    if not barber:
        result.add_error(
            "Selected barber is not available",
            "barber_id",
            "BARBER_NOT_AVAILABLE"
        )
        return
    
    # Check barber's working hours for the specific day
    day_of_week = booking_date.weekday()
    
    try:
        from services import barber_availability_service
        
        availability = barber_availability_service.get_barber_availability(db, barber_id, day_of_week)
        
        if not availability:
            result.add_error(
                f"{barber.name} is not available on {booking_date.strftime('%A')}s",
                "barber_id",
                "BARBER_NOT_WORKING_DAY"
            )
            return
        
        # Check if the appointment time falls within barber's working hours
        hour, minute = map(int, booking_time.split(':'))
        appointment_time = time(hour, minute)
        
        # Calculate appointment end time
        duration_minutes = service_info["duration_minutes"]
        appointment_end = datetime.combine(booking_date, appointment_time) + timedelta(minutes=duration_minutes)
        appointment_end_time = appointment_end.time()
        
        # Check against all availability periods
        time_fits = False
        for avail in availability:
            if avail.start_time <= appointment_time and appointment_end_time <= avail.end_time:
                time_fits = True
                break
        
        if not time_fits:
            working_hours = [f"{av.start_time.strftime('%I:%M %p')} - {av.end_time.strftime('%I:%M %p')}" for av in availability]
            result.add_error(
                f"{barber.name} is available during: {', '.join(working_hours)}",
                "time",
                "TIME_OUTSIDE_BARBER_HOURS"
            )
            
    except ImportError:
        # Fallback if barber availability service is not available
        result.add_warning(
            "Unable to verify barber availability. Please confirm with your barber.",
            "barber_id",
            "AVAILABILITY_CHECK_UNAVAILABLE"
        )

def _validate_client_constraints(
    db: Session,
    result: ValidationResult,
    user: models.User,
    client_id: Optional[int],
    service_info: Dict[str, Any],
    booking_date: date
):
    """Validate client-specific constraints and requirements"""
    
    # Determine the actual client
    client = None
    if client_id:
        client = db.query(models.Client).filter(models.Client.id == client_id).first()
    elif user.email:
        client = db.query(models.Client).filter(models.Client.email == user.email).first()
    
    # New client consultation requirements
    if service_info.get("requires_consultation") and BUSINESS_RULES["new_client_consultation_required"]:
        if not client:
            result.add_suggestion(
                f"{service_info.get('duration_minutes', 30) + 15}-minute appointment includes consultation for first-time premium service"
            )
        else:
            # Check if client has had this service before
            previous_appointments = db.query(models.Appointment).filter(
                models.Appointment.client_id == client.id,
                models.Appointment.service_name == service_info,
                models.Appointment.status == "completed"
            ).count()
            
            if previous_appointments == 0:
                result.add_suggestion(
                    "First-time service includes extended consultation to ensure perfect results"
                )
    
    # Check client status and restrictions
    if client:
        # VIP client benefits
        if hasattr(client, 'customer_tier') and client.customer_tier == 'vip':
            result.add_suggestion(
                "VIP clients enjoy priority booking and premium amenities"
            )
        
        # Check for any client restrictions
        if hasattr(client, 'status') and client.status == 'blocked':
            result.add_error(
                "This client account has restrictions. Please contact support.",
                "client_id",
                "CLIENT_RESTRICTED"
            )
        
        # Check client preferences and history
        recent_appointments = db.query(models.Appointment).filter(
            models.Appointment.client_id == client.id,
            models.Appointment.start_time >= booking_date - timedelta(days=30)
        ).order_by(models.Appointment.start_time.desc()).limit(3).all()
        
        if recent_appointments:
            last_service = recent_appointments[0].service_name
            if last_service in SIX_FIGURE_SERVICES:
                recommended_interval = SIX_FIGURE_SERVICES[last_service].get("recommended_interval_days", 21)
                days_since_last = (booking_date - recent_appointments[0].start_time.date()).days
                
                if days_since_last < recommended_interval:
                    result.add_warning(
                        f"Last {last_service} was {days_since_last} days ago. Recommended interval is {recommended_interval} days for optimal results.",
                        "date",
                        "FREQUENT_BOOKING"
                    )

def _apply_six_figure_methodology_rules(
    db: Session,
    result: ValidationResult,
    user: models.User,
    service_info: Dict[str, Any],
    booking_date: date,
    booking_time: str
):
    """Apply Six Figure Barber methodology-specific business rules"""
    
    # Premium service standards
    if service_info.get("premium_positioning"):
        result.add_suggestion(
            "Premium services include luxury amenities and extended styling consultation"
        )
        
        # Premium service time requirements
        if service_info.get("requires_premium_slot"):
            # Check if this is a premium time slot (no rush periods)
            hour = int(booking_time.split(':')[0])
            
            # Avoid rush hours for premium services
            if 11 <= hour <= 13 or 17 <= hour <= 19:  # Lunch rush and evening rush
                result.add_warning(
                    "Premium services are best scheduled during quieter hours for the full luxury experience",
                    "time",
                    "PREMIUM_TIMING_SUGGESTION"
                )
    
    # Service combination recommendations
    if "upsell_services" in service_info:
        for upsell_service in service_info["upsell_services"]:
            if upsell_service in SIX_FIGURE_SERVICES:
                upsell_price = SIX_FIGURE_SERVICES[upsell_service]["base_price"]
                combo_savings = (service_info["base_price"] + upsell_price) * 0.1  # 10% combo discount
                
                result.add_upsell_opportunity(
                    upsell_service,
                    f"Perfect complement to {service_info}. Save ${combo_savings:.0f} when combined.",
                    upsell_price
                )
    
    # Weekend and special day handling
    if booking_date.weekday() >= 5:  # Weekend
        if service_info.get("category") == "premium":
            result.add_suggestion(
                "Weekend premium appointments include complimentary styling product samples"
            )
    
    # Revenue optimization suggestions
    base_price = service_info["base_price"]
    if base_price < 100 and service_info.get("category") != "premium":
        premium_alternatives = [name for name, info in SIX_FIGURE_SERVICES.items() 
                              if info.get("category") == "premium" and info["base_price"] > base_price]
        
        if premium_alternatives:
            result.add_suggestion(
                f"Consider upgrading to our premium services: {', '.join(premium_alternatives[:2])}"
            )

def _generate_upselling_opportunities(result: ValidationResult, service_info: Dict[str, Any], user: models.User):
    """Generate upselling opportunities based on Six Figure Barber methodology"""
    
    service_category = service_info.get("category")
    base_price = service_info["base_price"]
    
    # Category-based upselling
    if service_category == "standard":
        # Suggest premium upgrades
        premium_services = [name for name, info in SIX_FIGURE_SERVICES.items() 
                          if info.get("category") in ["signature", "premium"]]
        
        for premium_service in premium_services[:2]:  # Limit to top 2 suggestions
            premium_info = SIX_FIGURE_SERVICES[premium_service]
            additional_value = premium_info["base_price"] - base_price
            
            result.add_upsell_opportunity(
                premium_service,
                f"Upgrade to premium experience with enhanced techniques and luxury amenities",
                additional_value
            )
    
    # Service-specific upselling
    service_name = next(name for name, info in SIX_FIGURE_SERVICES.items() if info == service_info)
    
    if service_name == "Haircut":
        result.add_upsell_opportunity(
            "Beard Service",
            "Complete your look with professional beard styling",
            SIX_FIGURE_SERVICES["Beard Service"]["base_price"]
        )
        
        result.add_upsell_opportunity(
            "Signature Cut",
            "Upgrade to our signature experience with personalized styling consultation",
            SIX_FIGURE_SERVICES["Signature Cut"]["base_price"] - base_price
        )
    
    elif service_name == "Shave":
        result.add_upsell_opportunity(
            "Haircut & Shave",
            "Save with our popular combination service",
            SIX_FIGURE_SERVICES["Haircut & Shave"]["base_price"] - base_price
        )
    
    # Time-based seasonal suggestions
    month = datetime.now().month
    if month in [11, 12, 1]:  # Holiday season
        result.add_suggestion(
            "Holiday Special: Book a premium service to look your best for the season's events"
        )
    elif month in [5, 6, 7]:  # Wedding season
        result.add_suggestion(
            "Wedding Season: Our Executive Package ensures you look perfect for special occasions"
        )

def _validate_pricing_requirements(db: Session, result: ValidationResult, service_info: Dict[str, Any], user: models.User):
    """Validate pricing requirements and payment constraints"""
    
    base_price = service_info["base_price"]
    
    # Minimum price validation (Six Figure Barber standards)
    if base_price < BUSINESS_RULES["minimum_service_price"]:
        result.add_warning(
            f"Service price ${base_price} is below our premium standard of ${BUSINESS_RULES['minimum_service_price']}",
            "pricing",
            "BELOW_PREMIUM_PRICE"
        )
    
    # Premium pricing validation
    if service_info.get("premium_positioning") and base_price < 100:
        result.add_warning(
            "Premium services should be priced to reflect their exceptional value",
            "pricing",
            "PREMIUM_PRICING_ALIGNMENT"
        )
    
    # VIP client discount validation
    client = None
    if user.email:
        client = db.query(models.Client).filter(models.Client.email == user.email).first()
    
    if client and hasattr(client, 'customer_tier') and client.customer_tier == 'vip':
        max_discount = base_price * (BUSINESS_RULES["loyalty_discount_max_percent"] / 100)
        result.add_suggestion(
            f"VIP discount available up to ${max_discount:.0f} on this service"
        )

def get_service_suggestions(service_name: str, user_tier: str = "standard") -> List[Dict[str, Any]]:
    """Get service-specific suggestions and recommendations"""
    
    suggestions = []
    
    if service_name not in SIX_FIGURE_SERVICES:
        return suggestions
    
    service_info = SIX_FIGURE_SERVICES[service_name]
    
    # Add duration and experience information
    suggestions.append({
        "type": "experience",
        "message": f"Your {service_info['duration_minutes']}-minute {service_name} includes premium techniques and personalized attention"
    })
    
    # Add preparation suggestions
    if service_info.get("requires_consultation"):
        suggestions.append({
            "type": "preparation",
            "message": "Arrive 10 minutes early for your consultation to discuss style goals and preferences"
        })
    
    # Add aftercare suggestions
    suggestions.append({
        "type": "aftercare", 
        "message": f"Your {service_name} is designed to maintain its look for {service_info.get('recommended_interval_days', 21)} days with proper care"
    })
    
    # Add upselling suggestions
    if "upsell_services" in service_info:
        for upsell in service_info["upsell_services"][:2]:  # Limit to 2 suggestions
            upsell_info = SIX_FIGURE_SERVICES.get(upsell)
            if upsell_info:
                suggestions.append({
                    "type": "upsell",
                    "message": f"Enhance your experience with {upsell} for the complete Six Figure Barber transformation",
                    "service": upsell,
                    "additional_cost": upsell_info["base_price"]
                })
    
    return suggestions

def validate_appointment_reschedule(
    db: Session,
    appointment_id: int,
    new_date: date,
    new_time: str,
    user_id: int
) -> ValidationResult:
    """Validate appointment rescheduling according to business rules"""
    
    result = ValidationResult()
    
    # Get existing appointment
    appointment = db.query(models.Appointment).filter(
        models.Appointment.id == appointment_id
    ).first()
    
    if not appointment:
        result.add_error("Appointment not found", "appointment_id", "NOT_FOUND")
        return result
    
    # Check user permissions
    if appointment.user_id != user_id and appointment.client_id != user_id:
        result.add_error("Not authorized to reschedule this appointment", "authorization", "NOT_AUTHORIZED")
        return result
    
    # Check reschedule timing restrictions
    now = datetime.now()
    appointment_start = appointment.start_time
    
    # Can't reschedule appointments that are too close to start time
    if appointment_start - now < timedelta(hours=2):
        result.add_error(
            "Appointments cannot be rescheduled within 2 hours of the scheduled time",
            "timing",
            "TOO_CLOSE_TO_RESCHEDULE"
        )
    
    # Validate new date/time using existing validation
    service_name = appointment.service_name
    if service_name in SIX_FIGURE_SERVICES:
        service_info = SIX_FIGURE_SERVICES[service_name]
        
        _validate_basic_input(result, new_date, new_time, service_name)
        if result.is_valid:
            _validate_datetime_constraints(result, new_date, new_time, service_info, None)
            _validate_business_hours(db, result, new_date, new_time, service_info)
            _validate_booking_conflicts(db, result, new_date, new_time, service_info, appointment.barber_id)
    
    # Add rescheduling fee information if applicable
    original_date = appointment_start.date()
    days_notice = (new_date - original_date).days
    
    if days_notice < 1:  # Same day or next day
        result.add_warning(
            "Same-day rescheduling may incur a service fee",
            "pricing",
            "RESCHEDULE_FEE_APPLICABLE"
        )
    
    return result

# Helper functions for API integration
def format_validation_response(validation_result: ValidationResult) -> Dict[str, Any]:
    """Format validation result for API response"""
    
    return {
        "is_valid": validation_result.is_valid,
        "errors": validation_result.errors,
        "warnings": validation_result.warnings,
        "suggestions": validation_result.suggestions,
        "upselling_opportunities": validation_result.upselling_opportunities,
        "business_rules_applied": True,
        "six_figure_methodology": True
    }