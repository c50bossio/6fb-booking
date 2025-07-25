from datetime import datetime, time, timedelta, date
from typing import List, Optional, Dict, Any, Tuple
from sqlalchemy.orm import Session
import models
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class BookingRuleViolation(Exception):
    """Exception raised when a booking violates business rules."""
    def __init__(self, message: str, rule_type: str = None, rule_id: int = None):
        self.message = message
        self.rule_type = rule_type
        self.rule_id = rule_id
        super().__init__(self.message)


def validate_booking_against_rules(
    db: Session,
    user_id: int,
    service_id: Optional[int],
    barber_id: Optional[int],
    booking_date: date,
    booking_time: time,
    duration_minutes: int,
    client_id: Optional[int] = None
) -> Tuple[bool, List[str]]:
    """
    Validate a booking against all applicable rules - OPTIMIZED with timeout protection.
    Returns (is_valid, list_of_violations)
    """
    from utils.database_timeout import timeout_query
    
    @timeout_query(timeout_seconds=15.0)  # Timeout for business rules validation
    def _validate_rules():
        violations = []
        
        try:
            # OPTIMIZED: Get client information with single query
            client = None
            user = None
            
            if client_id:
                client = db.query(models.Client).filter(models.Client.id == client_id).first()
            elif user_id:
                # Single query to get user and potentially find client
                user = db.query(models.User).filter(models.User.id == user_id).first()
                if user and user.email:
                    # OPTIMIZED: Only search for client if user has email
                    client = db.query(models.Client).filter(models.Client.email == user.email).first()
            
            # 1. Validate service-specific rules (with timeout protection)
            if service_id:
                try:
                    service_violations = _validate_service_rules(db, service_id, client, booking_date, booking_time)
                    violations.extend(service_violations)
                except Exception as e:
                    logger.warning(f"Service rules validation failed: {str(e)}")
                    # Continue with other validations
            
            # 2. Validate global booking rules (with timeout protection)
            try:
                global_violations = _validate_global_rules(db, user_id, service_id, barber_id, booking_date, booking_time, duration_minutes)
                violations.extend(global_violations)
            except Exception as e:
                logger.warning(f"Global rules validation failed: {str(e)}")
                # Continue with other validations
            
            # 3. Validate client-specific constraints (with timeout protection)
            if client:
                try:
                    client_violations = _validate_client_constraints(db, client, service_id, booking_date, booking_time)
                    violations.extend(client_violations)
                except Exception as e:
                    logger.warning(f"Client constraints validation failed: {str(e)}")
                    # Continue with other validations
            
            # 4. Validate business hours and special constraints (with timeout protection)
            try:
                business_violations = _validate_business_constraints(db, booking_date, booking_time, duration_minutes)
                violations.extend(business_violations)
            except Exception as e:
                logger.warning(f"Business constraints validation failed: {str(e)}")
                # Continue - business hours might be validated elsewhere
            
            return len(violations) == 0, violations
            
        except Exception as e:
            logger.error(f"Error validating booking rules: {e}")
            return False, [f"Rule validation error: {str(e)}"]
    
    return _validate_rules()


def _validate_service_rules(
    db: Session,
    service_id: int,
    client: Optional[models.Client],
    booking_date: date,
    booking_time: time
) -> List[str]:
    """Validate service-specific booking rules."""
    violations = []
    
    # Get service booking rules
    service_rules = db.query(models.ServiceBookingRule).filter(
        models.ServiceBookingRule.service_id == service_id,
        models.ServiceBookingRule.is_active == True
    ).all()
    
    for rule in service_rules:
        # Age restrictions
        if client and (rule.min_age or rule.max_age):
            if client.date_of_birth:
                age = (date.today() - client.date_of_birth).days // 365
                if rule.min_age and age < rule.min_age:
                    violations.append(f"Minimum age requirement: {rule.min_age} years")
                if rule.max_age and age > rule.max_age:
                    violations.append(f"Maximum age limit: {rule.max_age} years")
        
        # Consultation requirements
        if rule.requires_consultation and client:
            # Check if client has had a consultation for this service
            has_consultation = db.query(models.Appointment).filter(
                models.Appointment.client_id == client.id,
                models.Appointment.service_id == service_id,
                models.Appointment.status == "completed",
                models.Appointment.notes.like("%consultation%")
            ).first()
            
            if not has_consultation:
                violations.append("This service requires a consultation appointment first")
        
        # Patch test requirements
        if rule.requires_patch_test and client:
            # Check if client has had a recent patch test
            patch_test_deadline = datetime.combine(booking_date, booking_time) - timedelta(hours=rule.patch_test_hours_before)
            
            has_patch_test = db.query(models.Appointment).filter(
                models.Appointment.client_id == client.id,
                models.Appointment.start_time >= patch_test_deadline,
                models.Appointment.notes.like("%patch test%"),
                models.Appointment.status == "completed"
            ).first()
            
            if not has_patch_test:
                violations.append(f"Patch test required {rule.patch_test_hours_before} hours before this service")
        
        # Day of week restrictions
        if rule.blocked_days_of_week:
            if booking_date.weekday() in rule.blocked_days_of_week:
                day_name = booking_date.strftime("%A")
                violations.append(f"This service is not available on {day_name}")
        
        # Daily booking limits
        if rule.max_bookings_per_day and client:
            existing_bookings = db.query(models.Appointment).filter(
                models.Appointment.client_id == client.id,
                models.Appointment.service_id == service_id,
                models.Appointment.start_time >= datetime.combine(booking_date, time.min),
                models.Appointment.start_time < datetime.combine(booking_date + timedelta(days=1), time.min),
                models.Appointment.status.in_(["scheduled", "confirmed"])
            ).count()
            
            if existing_bookings >= rule.max_bookings_per_day:
                violations.append(f"Maximum {rule.max_bookings_per_day} booking(s) per day for this service")
        
        # Minimum days between bookings
        if rule.min_days_between_bookings and client:
            recent_booking = db.query(models.Appointment).filter(
                models.Appointment.client_id == client.id,
                models.Appointment.service_id == service_id,
                models.Appointment.start_time >= datetime.combine(booking_date - timedelta(days=rule.min_days_between_bookings), time.min),
                models.Appointment.status.in_(["scheduled", "confirmed", "completed"])
            ).first()
            
            if recent_booking:
                violations.append(f"Minimum {rule.min_days_between_bookings} days required between bookings for this service")
    
    return violations


def _validate_global_rules(
    db: Session,
    user_id: int,
    service_id: Optional[int],
    barber_id: Optional[int],
    booking_date: date,
    booking_time: time,
    duration_minutes: int
) -> List[str]:
    """Validate global booking rules."""
    violations = []
    
    # Get applicable global rules
    global_rules = db.query(models.BookingRule).filter(
        models.BookingRule.is_active == True
    ).order_by(models.BookingRule.priority.desc()).all()
    
    for rule in global_rules:
        # Check if rule applies to this booking
        if not _rule_applies_to_booking(rule, service_id, barber_id, user_id, db):
            continue
        
        params = rule.rule_params or {}
        
        # Validate based on rule type
        if rule.rule_type == "max_advance_booking":
            max_days = params.get("max_days", 30)
            if (booking_date - date.today()).days > max_days:
                violations.append(f"Cannot book more than {max_days} days in advance")
        
        elif rule.rule_type == "min_advance_booking":
            min_hours = params.get("min_hours", 2)
            booking_datetime = datetime.combine(booking_date, booking_time)
            if booking_datetime < datetime.now() + timedelta(hours=min_hours):
                violations.append(f"Minimum {min_hours} hours advance booking required")
        
        elif rule.rule_type == "max_duration":
            max_duration = params.get("max_minutes", 180)
            if duration_minutes > max_duration:
                violations.append(f"Maximum appointment duration: {max_duration} minutes")
        
        elif rule.rule_type == "min_duration":
            min_duration = params.get("min_minutes", 15)
            if duration_minutes < min_duration:
                violations.append(f"Minimum appointment duration: {min_duration} minutes")
        
        elif rule.rule_type == "blackout_dates":
            blackout_dates = params.get("dates", [])
            if booking_date.isoformat() in blackout_dates:
                violations.append("Booking not available on this date")
        
        elif rule.rule_type == "holiday_restrictions":
            # Check if booking date is a holiday
            holidays = params.get("holidays", [])
            booking_date_str = booking_date.strftime("%m-%d")  # MM-DD format
            if booking_date_str in holidays:
                violations.append("Booking not available on holidays")
    
    return violations


def _validate_client_constraints(
    db: Session,
    client: models.Client,
    service_id: Optional[int],
    booking_date: date,
    booking_time: time
) -> List[str]:
    """Validate client-specific constraints."""
    violations = []
    
    # Check client status
    if hasattr(client, 'status') and client.status == 'blocked':
        violations.append("Account is temporarily blocked. Please contact support.")
    
    # Check client type restrictions
    if hasattr(client, 'customer_type'):
        if client.customer_type == 'at_risk':
            # At-risk clients may have restrictions
            violations.append("Please call to book your appointment")
    
    # Check payment history
    if hasattr(client, 'notes') and client.notes:
        if 'payment_issue' in client.notes.lower():
            violations.append("Please resolve outstanding payment issues before booking")
    
    return violations


def _validate_business_constraints(
    db: Session,
    booking_date: date,
    booking_time: time,
    duration_minutes: int
) -> List[str]:
    """Validate business-level constraints."""
    violations = []
    
    # Get booking settings
    settings = db.query(models.BookingSettings).filter(
        models.BookingSettings.business_id == 1
    ).first()
    
    if settings:
        # Check if booking is within business hours
        booking_end_time = (datetime.combine(booking_date, booking_time) + 
                           timedelta(minutes=duration_minutes)).time()
        
        if booking_time < settings.business_start_time:
            violations.append(f"Booking must be after {settings.business_start_time.strftime('%H:%M')}")
        
        if booking_end_time > settings.business_end_time:
            violations.append(f"Booking must end before {settings.business_end_time.strftime('%H:%M')}")
        
        # Check same-day booking restrictions
        if not settings.allow_same_day_booking and booking_date == date.today():
            violations.append("Same-day booking is not allowed")
        
        if (settings.same_day_cutoff_time and 
            booking_date == date.today() and 
            datetime.now().time() > settings.same_day_cutoff_time):
            violations.append(f"Same-day booking cutoff time ({settings.same_day_cutoff_time.strftime('%H:%M')}) has passed")
    
    return violations


def _rule_applies_to_booking(
    rule: models.BookingRule,
    service_id: Optional[int],
    barber_id: Optional[int],
    user_id: int,
    db: Session
) -> bool:
    """Check if a global rule applies to this specific booking."""
    
    if rule.applies_to == "all":
        return True
    
    elif rule.applies_to == "service" and service_id:
        service_ids = rule.service_ids or []
        return service_id in service_ids
    
    elif rule.applies_to == "barber" and barber_id:
        barber_ids = rule.barber_ids or []
        return barber_id in barber_ids
    
    elif rule.applies_to == "client_type":
        # Get client type for user
        user = db.query(models.User).filter(models.User.id == user_id).first()
        if user:
            client = db.query(models.Client).filter(models.Client.email == user.email).first()
            if client and hasattr(client, 'customer_type'):
                client_types = rule.client_types or []
                return client.customer_type in client_types
    
    return False


def create_booking_rule(
    db: Session,
    rule_name: str,
    rule_type: str,
    rule_params: Dict[str, Any],
    applies_to: str = "all",
    service_ids: Optional[List[int]] = None,
    barber_ids: Optional[List[int]] = None,
    client_types: Optional[List[str]] = None,
    priority: int = 0,
    created_by_id: Optional[int] = None
) -> models.BookingRule:
    """Create a new booking rule."""
    
    rule = models.BookingRule(
        rule_name=rule_name,
        rule_type=rule_type,
        rule_params=rule_params,
        applies_to=applies_to,
        service_ids=service_ids,
        barber_ids=barber_ids,
        client_types=client_types,
        priority=priority,
        created_by_id=created_by_id
    )
    
    db.add(rule)
    db.commit()
    db.refresh(rule)
    
    return rule


def get_booking_rules(
    db: Session,
    rule_type: Optional[str] = None,
    is_active: Optional[bool] = None
) -> List[models.BookingRule]:
    """Get booking rules with optional filtering."""
    
    query = db.query(models.BookingRule)
    
    if rule_type:
        query = query.filter(models.BookingRule.rule_type == rule_type)
    
    if is_active is not None:
        query = query.filter(models.BookingRule.is_active == is_active)
    
    return query.order_by(models.BookingRule.priority.desc()).all()


def update_booking_rule(
    db: Session,
    rule_id: int,
    **update_data
) -> Optional[models.BookingRule]:
    """Update a booking rule."""
    
    rule = db.query(models.BookingRule).filter(models.BookingRule.id == rule_id).first()
    
    if not rule:
        return None
    
    for field, value in update_data.items():
        if hasattr(rule, field):
            setattr(rule, field, value)
    
    rule.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(rule)
    
    return rule


def delete_booking_rule(db: Session, rule_id: int) -> bool:
    """Delete (deactivate) a booking rule."""
    
    rule = db.query(models.BookingRule).filter(models.BookingRule.id == rule_id).first()
    
    if not rule:
        return False
    
    rule.is_active = False
    rule.updated_at = datetime.utcnow()
    db.commit()
    
    return True


def get_service_booking_rules(db: Session, service_id: int) -> List[models.ServiceBookingRule]:
    """Get booking rules for a specific service."""
    
    return db.query(models.ServiceBookingRule).filter(
        models.ServiceBookingRule.service_id == service_id,
        models.ServiceBookingRule.is_active == True
    ).all()


def create_service_booking_rule(
    db: Session,
    service_id: int,
    rule_type: str,
    **rule_data
) -> models.ServiceBookingRule:
    """Create a service-specific booking rule."""
    
    rule = models.ServiceBookingRule(
        service_id=service_id,
        rule_type=rule_type,
        **rule_data
    )
    
    db.add(rule)
    db.commit()
    db.refresh(rule)
    
    return rule