"""
Pydantic schemas for secure input validation across endpoints.
These schemas enforce strict validation rules to prevent injection attacks.
"""

from pydantic import BaseModel, Field, field_validator, EmailStr, constr, conint, condecimal
from typing import Optional, List, Dict, Any
from datetime import datetime, date, time
from decimal import Decimal

# Common string constraints
NameStr = constr(min_length=1, max_length=100, pattern=r'^[a-zA-Z\s\'-]+$')
SlugStr = constr(min_length=3, max_length=50, pattern=r'^[a-z0-9-]+$')
PhoneStr = constr(pattern=r'^\+?1?\d{10,15}$')
SafeTextStr = constr(max_length=1000)
SafeLongTextStr = constr(max_length=5000)

# File upload schemas
class FileUploadRequest(BaseModel):
    """Validated file upload parameters"""
    filename: constr(min_length=1, max_length=255)
    content_type: constr(pattern=r'^[a-zA-Z0-9\-/]+$')
    
    @field_validator('filename')
    @classmethod
    def validate_filename(cls, v):
        # Remove path components
        import os
        return os.path.basename(v)

# Appointment schemas with strict validation
class AppointmentCreateRequest(BaseModel):
    """Validated appointment creation request"""
    service_id: conint(gt=0)
    barber_id: conint(gt=0)
    start_time: datetime
    end_time: Optional[datetime] = None
    notes: Optional[SafeTextStr] = None
    recurring: bool = False
    recurring_weeks: Optional[conint(ge=1, le=52)] = None
    
    @field_validator('start_time')
    @classmethod
    def validate_start_time(cls, v):
        # Must be in the future
        if v <= datetime.now():
            raise ValueError('Appointment must be in the future')
        # Must be within 1 year
        if v > datetime.now().replace(year=datetime.now().year + 1):
            raise ValueError('Appointment cannot be more than 1 year in advance')
        return v
    
    @field_validator('end_time')
    @classmethod
    def validate_end_time(cls, v, values):
        if v and 'start_time' in values:
            if v <= values['start_time']:
                raise ValueError('End time must be after start time')
            # Maximum appointment duration of 8 hours
            if (v - values['start_time']).total_seconds() > 8 * 3600:
                raise ValueError('Appointment duration cannot exceed 8 hours')
        return v

class AppointmentRescheduleRequest(BaseModel):
    """Validated appointment reschedule request"""
    new_start_time: datetime
    new_end_time: Optional[datetime] = None
    reason: Optional[SafeTextStr] = None
    
    @field_validator('new_start_time')
    @classmethod
    def validate_new_start_time(cls, v):
        if v <= datetime.now():
            raise ValueError('New appointment time must be in the future')
        return v

class GuestBookingRequest(BaseModel):
    """Validated guest booking request"""
    name: NameStr
    email: EmailStr
    phone: PhoneStr
    service_id: conint(gt=0)
    barber_id: conint(gt=0)
    start_time: datetime
    notes: Optional[SafeTextStr] = None
    captcha_token: Optional[str] = None
    
    @field_validator('phone')
    @classmethod
    def clean_phone(cls, v):
        import re
        return re.sub(r'[\s\-\(\)]+', '', v)

# Payment schemas with amount validation
class PaymentIntentRequest(BaseModel):
    """Validated payment intent creation"""
    appointment_id: conint(gt=0)
    amount: condecimal(gt=0, max_digits=8, decimal_places=2, le=10000)
    tip_amount: Optional[condecimal(ge=0, max_digits=6, decimal_places=2, le=1000)] = Decimal('0')
    payment_method_id: Optional[constr(max_length=100)] = None
    save_payment_method: bool = False
    gift_certificate_code: Optional[constr(max_length=50, pattern=r'^[A-Z0-9-]+$')] = None

class RefundRequest(BaseModel):
    """Validated refund request"""
    payment_id: conint(gt=0)
    amount: Optional[condecimal(gt=0, max_digits=8, decimal_places=2)]
    reason: constr(min_length=1, max_length=500)
    
    @field_validator('amount')
    @classmethod
    def validate_amount(cls, v):
        if v and v > Decimal('10000'):
            raise ValueError('Refund amount cannot exceed $10,000')
        return v

class GiftCertificateRequest(BaseModel):
    """Validated gift certificate creation"""
    amount: condecimal(gt=0, max_digits=6, decimal_places=2, le=1000)
    recipient_email: EmailStr
    recipient_name: NameStr
    sender_name: NameStr
    sender_email: EmailStr
    message: Optional[SafeTextStr] = None
    validity_months: conint(ge=1, le=24) = 12

# Service schemas
class ServiceCreateRequest(BaseModel):
    """Validated service creation"""
    name: constr(min_length=1, max_length=100)
    description: Optional[SafeTextStr] = None
    price: condecimal(gt=0, max_digits=6, decimal_places=2, le=9999)
    duration_minutes: conint(ge=5, le=480)  # 5 min to 8 hours
    category: constr(max_length=50)
    is_active: bool = True
    max_advance_booking_days: Optional[conint(ge=1, le=365)] = 90
    
    @field_validator('name')
    @classmethod
    def validate_name(cls, v):
        # Basic alphanumeric with some special chars
        import re
        if not re.match(r'^[a-zA-Z0-9\s\-&\']+$', v):
            raise ValueError('Service name contains invalid characters')
        return v

# User registration schemas
class BusinessRegistrationRequest(BaseModel):
    """Validated business registration"""
    business_name: constr(min_length=2, max_length=100)
    business_type: constr(pattern=r'^(individual|shop|enterprise)$')
    slug: SlugStr
    description: Optional[SafeTextStr] = None
    phone: PhoneStr
    email: EmailStr
    address: constr(max_length=200)
    city: constr(max_length=100)
    state: constr(min_length=2, max_length=2, pattern=r'^[A-Z]{2}$')
    zip_code: constr(pattern=r'^\d{5}(-\d{4})?$')
    timezone: constr(max_length=50)
    business_hours: Optional[Dict[str, Any]] = None
    
    @field_validator('business_hours')
    @classmethod
    def validate_business_hours(cls, v):
        if v:
            valid_days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
            for day, hours in v.items():
                if day not in valid_days:
                    raise ValueError(f'Invalid day: {day}')
                if not isinstance(hours, dict):
                    raise ValueError(f'Invalid hours format for {day}')
        return v

# Export/Import schemas
class ExportRequest(BaseModel):
    """Validated data export request"""
    entity_type: constr(pattern=r'^(clients|appointments|services|payments)$')
    format: constr(pattern=r'^(csv|excel|json)$') = 'csv'
    date_range: Optional[Dict[str, date]] = None
    filters: Optional[Dict[str, Any]] = None
    fields: Optional[List[constr(max_length=50)]] = None
    
    @field_validator('fields')
    @classmethod
    def validate_fields(cls, v):
        if v and len(v) > 50:
            raise ValueError('Cannot export more than 50 fields')
        return v
    
    @field_validator('filters')
    @classmethod
    def validate_filters(cls, v):
        if v and len(v) > 10:
            raise ValueError('Too many filters specified')
        return v

# Date/Time filter schemas
class DateTimeFilter(BaseModel):
    """Validated datetime filter parameters"""
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    timezone: Optional[constr(max_length=50)] = 'UTC'
    
    @field_validator('end_date')
    @classmethod
    def validate_date_range(cls, v, values):
        if v and 'start_date' in values and values['start_date']:
            if v < values['start_date']:
                raise ValueError('end_date must be after start_date')
            # Maximum range of 1 year
            if (v - values['start_date']).days > 365:
                raise ValueError('Date range cannot exceed 1 year')
        return v

# List filter schemas
class ListFilterRequest(BaseModel):
    """Validated list/search parameters"""
    skip: conint(ge=0, le=10000) = 0
    limit: conint(ge=1, le=100) = 20
    sort_by: Optional[constr(max_length=50, pattern=r'^[a-zA-Z_]+$')] = None
    sort_order: Optional[constr(pattern=r'^(asc|desc)$')] = 'asc'
    search: Optional[constr(max_length=100)] = None
    
    @field_validator('search')
    @classmethod
    def sanitize_search(cls, v):
        if v:
            # Remove potential SQL injection characters
            import re
            v = re.sub(r'[^\w\s\-@.]', '', v)
        return v

# Commission schemas
class CommissionCalculationRequest(BaseModel):
    """Validated commission calculation"""
    barber_id: conint(gt=0)
    amount: condecimal(gt=0, max_digits=8, decimal_places=2, le=10000)
    commission_type: constr(pattern=r'^(service|retail|pos)$')
    product_id: Optional[conint(gt=0)] = None

class CommissionRateUpdateRequest(BaseModel):
    """Validated commission rate update"""
    rate: condecimal(ge=0, le=1, decimal_places=4)
    effective_date: Optional[date] = None
    reason: Optional[SafeTextStr] = None

# Integration schemas
class IntegrationConfigRequest(BaseModel):
    """Validated integration configuration"""
    provider: constr(pattern=r'^[a-z_]+$', max_length=50)
    config: Dict[str, Any]
    
    @field_validator('config')
    @classmethod
    def validate_config_size(cls, v):
        import json
        if len(json.dumps(v)) > 10000:
            raise ValueError('Configuration too large')
        return v

# Webhook validation
class WebhookPayloadValidator(BaseModel):
    """Base webhook payload validator"""
    webhook_id: Optional[str] = None
    timestamp: datetime
    event_type: constr(max_length=100)
    data: Dict[str, Any]
    
    @field_validator('data')
    @classmethod
    def validate_data_size(cls, v):
        import json
        if len(json.dumps(v)) > 100000:  # 100KB max
            raise ValueError('Webhook payload too large')
        return v
    
    @field_validator('timestamp')
    @classmethod
    def validate_timestamp(cls, v):
        # Webhook must be recent (within 5 minutes)
        if abs((datetime.now() - v).total_seconds()) > 300:
            raise ValueError('Webhook timestamp is too old or in the future')
        return v