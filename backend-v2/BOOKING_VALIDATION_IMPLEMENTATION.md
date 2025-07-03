# Comprehensive Booking Input Validation Implementation

## Overview

This implementation provides robust input validation and sanitization for all booking-related data in the BookedBarber platform. The system ensures data integrity, prevents security vulnerabilities, and provides clear feedback to users.

## Files Created

### Core Validation Schemas
- **`schemas_new/booking_validation.py`** - Enhanced Pydantic schemas with comprehensive validation
- **`validators/booking_validators.py`** - Custom business rule validators
- **`validators/__init__.py`** - Validator module exports

### Example Implementation
- **`routers/appointments_enhanced.py`** - Demonstrates usage in API endpoints
- **`test_booking_validation.py`** - Test script showing all validation features

## Key Features Implemented

### 1. Input Sanitization
- **HTML/XSS Prevention**: Uses `bleach` library to strip malicious HTML
- **Phone Number Formatting**: Validates and formats to E.164 standard
- **Name Sanitization**: Removes numbers and special characters, proper capitalization
- **Email Validation**: Includes disposable email domain detection

### 2. Date and Time Validation
- **Past Date Prevention**: Ensures bookings are in the future
- **Booking Window**: Configurable min/max advance booking periods
- **Time Slot Increments**: Enforces 15-minute appointment slots
- **Same-Day Cutoffs**: Configurable cutoff times for same-day bookings
- **Timezone Support**: Proper timezone handling for validation

### 3. Business Hours Validation
- **Operating Hours**: Validates appointments within business hours
- **Day-of-Week Blocking**: Support for closed days (e.g., Sundays)
- **Holiday Support**: Configurable holiday date blocking
- **Service Duration**: Ensures appointments fit within operating hours

### 4. Service Validation
- **Service Existence**: Validates service IDs against catalog
- **Duration Constraints**: Min/max duration limits (15 minutes - 8 hours)
- **Price Validation**: Reasonable price range checks with 2-decimal rounding
- **Service Compatibility**: Validates duration fits in time slots

### 5. Client Information Validation
- **Guest Information**: Name, email, phone validation for walk-ins
- **Client ID Validation**: Ensures valid existing client references
- **Mutual Exclusivity**: Prevents both guest_info and client_id being provided

### 6. Advanced Business Rules
- **Barber Availability**: Checks for scheduling conflicts
- **Double Booking Prevention**: Prevents client from booking overlapping appointments
- **Service Requirements**: Age restrictions, consultations, patch tests
- **Recurring Patterns**: Validates recurring appointment configurations

## Validation Components

### Core Validators

```python
# Business hours checking
BusinessHoursValidator(
    start_time=time(9, 0),
    end_time=time(18, 0),
    blocked_days=[6],  # Sundays
    holiday_dates=[date(2025, 12, 25)]
)

# Booking window constraints
BookingWindowValidator(
    min_advance_minutes=30,
    max_advance_days=90,
    same_day_cutoff=time(12, 0),
    timezone="America/New_York"
)

# Service duration validation
ServiceDurationValidator(
    slot_duration_minutes=30,
    max_duration_minutes=240,
    buffer_time_minutes=15
)
```

### Main Validation Schema

```python
class EnhancedAppointmentCreate(BaseModel):
    # Core appointment data
    date: Date
    time: str = Field(..., pattern="^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$")
    timezone: Optional[str] = "UTC"
    
    # Service selection
    service_id: Optional[int] = Field(None, gt=0)
    service_name: Optional[str] = Field(None, min_length=1, max_length=100)
    duration_minutes: Optional[int] = Field(None, ge=15, le=480)
    
    # Client information
    guest_info: Optional[GuestInfoValidation] = None
    client_id: Optional[int] = Field(None, gt=0)
    
    # Additional data
    notes: Optional[str] = Field(None, max_length=500)
    price: Optional[float] = Field(None, gt=0, le=10000)
    
    # Comprehensive validation methods...
```

## Usage Examples

### API Endpoint Implementation

```python
@router.post("/appointments")
async def create_appointment(
    appointment_data: EnhancedAppointmentCreate,
    current_user: User = Depends(require_user),
    db: Session = Depends(get_db)
):
    # Get business configuration
    booking_settings = get_booking_settings(current_user.business_id)
    
    # Configure validator
    validator = BookingValidator(db, booking_settings)
    
    # Validate booking
    is_valid, errors = validator.validate_booking(appointment_data)
    
    if not is_valid:
        user_errors = [get_user_friendly_error(e) for e in errors]
        raise HTTPException(400, {"errors": user_errors})
    
    # Create appointment...
```

### Real-time Validation

```python
@router.post("/appointments/validate")
async def validate_only(appointment_data: EnhancedAppointmentCreate):
    """Validate without creating - for real-time UI feedback"""
    validator = BookingValidator(db, config)
    is_valid, errors = validator.validate_booking(appointment_data)
    
    return {
        "valid": is_valid,
        "errors": [get_user_friendly_error(e) for e in errors]
    }
```

## Security Features

### XSS Prevention
- All text inputs sanitized with `bleach`
- HTML tags stripped from user input
- Special character handling in names

### Data Validation
- Phone numbers validated with `phonenumbers` library
- Email validation with domain checking
- Input length limits enforced

### Business Rule Enforcement
- Prevents scheduling conflicts
- Enforces advance booking requirements
- Validates against business policies

## Error Handling

### User-Friendly Messages
Technical errors are converted to clear, actionable messages:

```python
ERROR_MESSAGES = {
    'date_past': "The selected date has already passed. Please choose a future date.",
    'time_too_soon': "Appointments must be booked at least 30 minutes in advance.",
    'business_hours': "The selected time is outside of business hours.",
    'phone_invalid': "Please provide a valid phone number including area code."
}
```

### Validation Response Format
```json
{
    "valid": false,
    "errors": [
        "The selected date has already passed. Please choose a future date.",
        "Appointments must be booked at least 30 minutes in advance."
    ]
}
```

## Configuration

### Business Settings Integration
The system integrates with existing `BookingSettings` model:

```python
validator_config = {
    'business_start_time': settings.business_start_time,
    'business_end_time': settings.business_end_time,
    'min_advance_minutes': settings.min_lead_time_minutes,
    'max_advance_days': settings.max_advance_days,
    'slot_duration_minutes': settings.slot_duration_minutes,
    'timezone': user.timezone
}
```

## Testing

Run the test script to see all validation features:

```bash
cd backend-v2
python test_booking_validation.py
```

The test demonstrates:
- Input sanitization
- Date/time validation
- Phone number formatting
- Email validation
- Business rule enforcement
- Error message conversion

## Dependencies

Add to `requirements.txt`:
```txt
bleach>=6.0.0
phonenumbers>=8.13.0
pytz>=2023.3
```

## Integration Points

### Frontend Integration
- Use `/appointments/validate` endpoint for real-time validation
- Show user-friendly error messages
- Implement client-side pre-validation for better UX

### Database Integration
- Integrates with existing models (`Appointment`, `Service`, `Client`)
- Uses `BookingSettings` for business configuration
- Supports optimistic locking with version field

### Service Integration
- Works with existing `BookingService`
- Compatible with calendar sync services
- Supports notification triggers

## Performance Considerations

- Validation runs in-memory (fast)
- Database queries only for conflict checking
- Configurable validation strictness
- Efficient regex patterns for format validation

## Future Enhancements

1. **Advanced Conflict Detection**
   - Travel time between locations
   - Equipment availability
   - Staff skill matching

2. **Dynamic Pricing Validation**
   - Peak hour pricing rules
   - Seasonal adjustments
   - Demand-based pricing

3. **Enhanced Client Validation**
   - Credit score checking
   - Previous no-show history
   - Loyalty program integration

4. **Machine Learning Integration**
   - Fraud detection
   - Booking pattern analysis
   - Optimal scheduling suggestions

## Monitoring and Metrics

Track validation performance:
- Validation failure rates
- Most common validation errors
- Performance impact measurements
- User experience improvements

This comprehensive validation system ensures data integrity while providing excellent user experience through clear feedback and robust security measures.