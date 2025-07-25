from __future__ import annotations
from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from datetime import date as Date, time as Time
from enum import Enum
import pytz

# Base Response Schema
class BaseResponse(BaseModel):
    """Standard API response format"""
    success: bool
    message: str
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

# User Type Enum for 14-day trial system
class UserType(str, Enum):
    CLIENT = "client"
    BARBER = "barber"
    BARBERSHOP = "barbershop"

# Auth schemas
class UserLogin(BaseModel):
    email: EmailStr  # Modern API - use 'email' directly
    password: str

class Token(BaseModel):
    access_token: str
    refresh_token: Optional[str] = None
    token_type: str = "bearer"

class TokenData(BaseModel):
    username: Optional[str] = None
    
class RefreshTokenRequest(BaseModel):
    refresh_token: str

class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str
    
    @validator('new_password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        return v

class PasswordResetResponse(BaseModel):
    message: str
    detail: Optional[str] = None

class RegistrationResponse(BaseModel):
    message: str
    user: 'User'

class CompleteRegistrationData(BaseModel):
    """Complete registration data including user account and organization setup"""
    # User account data
    firstName: str = Field(..., min_length=1, max_length=100)
    lastName: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8)
    user_type: UserType
    
    # Business/Organization data
    businessName: str = Field(..., min_length=1, max_length=255)
    businessType: str = Field(..., pattern="^(individual|studio|salon|enterprise)$")
    address: Dict[str, str]  # street, city, state, zipCode
    phone: Optional[str] = None
    website: Optional[str] = None
    chairCount: int = Field(1, ge=1, le=1000)
    barberCount: int = Field(1, ge=1, le=1000)
    description: Optional[str] = None
    
    # Pricing data
    pricingInfo: Optional[Dict[str, Any]] = None  # chairs, monthlyTotal, tier
    
    # Consent data
    consent: Dict[str, bool]  # terms, privacy, marketing, testData
    
    @validator('consent')
    def validate_consent(cls, v):
        required_consents = ['terms', 'privacy']
        for consent_type in required_consents:
            if consent_type not in v or not v[consent_type]:
                raise ValueError(f'{consent_type} consent is required')
        return v

class CompleteRegistrationResponse(BaseModel):
    """Response from complete registration with user and organization"""
    message: str
    user: 'User'
    organization: 'OrganizationResponse'

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str
    
    @validator('new_password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not any(c.islower() for c in v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain at least one digit')
        return v

# Test Data Customization schemas
class ServiceConfig(BaseModel):
    """Configuration for individual services in test data"""
    name: str = Field(..., min_length=1, max_length=100)
    duration_minutes: int = Field(15, ge=5, le=300)
    base_price: float = Field(20.0, ge=0, le=1000)
    description: Optional[str] = None
    category: str = "haircut"  # Will be validated against ServiceCategoryEnum

class TestDataCustomization(BaseModel):
    """Customization options for test data creation"""
    # Data volume controls
    client_count: int = Field(20, ge=5, le=100, description="Number of test clients to create")
    appointment_count: int = Field(50, ge=10, le=200, description="Number of test appointments to create")
    payment_count: int = Field(30, ge=5, le=100, description="Number of test payments to create")
    
    # Date range controls
    start_date_days_ago: int = Field(90, ge=1, le=365, description="How many days in the past to start creating appointments")
    end_date_days_ahead: int = Field(30, ge=1, le=180, description="How many days in the future to create appointments")
    
    # Service customization
    services: Optional[List[ServiceConfig]] = Field(None, description="Custom services to create (if not provided, uses defaults)")
    
    # Enterprise/multi-location options
    include_enterprise: bool = Field(False, description="Include multi-location enterprise test data")
    location_count: int = Field(3, ge=1, le=10, description="Number of locations to create for enterprise data")
    
    # Client distribution options
    vip_client_percentage: int = Field(20, ge=0, le=100, description="Percentage of clients that should be VIP")
    new_client_percentage: int = Field(25, ge=0, le=100, description="Percentage of clients that should be new")
    
    @validator('vip_client_percentage', 'new_client_percentage')
    def validate_percentages(cls, v, values):
        if v < 0 or v > 100:
            raise ValueError('Percentages must be between 0 and 100')
        return v

class TestDataCreationRequest(BaseModel):
    """Request schema for creating test data with customization"""
    customization: Optional[TestDataCustomization] = Field(None, description="Customization options (uses defaults if not provided)")

class TestDataCreationResponse(BaseModel):
    """Response schema for test data creation"""
    success: bool
    message: str
    created: Dict[str, int]  # Counts of created items
    customization_applied: Optional[TestDataCustomization] = None

class ChangePasswordResponse(BaseModel):
    message: str

# Client Registration schemas
class ClientRegistrationData(BaseModel):
    """Simple registration data for clients booking appointments"""
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8)
    phone: Optional[str] = None
    marketing_consent: bool = False
    
    @validator('password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        return v

class ClientRegistrationResponse(BaseModel):
    """Response from client registration with auto-login tokens"""
    message: str
    user: 'User'
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

# Email verification schemas
class EmailVerificationRequest(BaseModel):
    email: EmailStr

class EmailVerificationResponse(BaseModel):
    message: str
    detail: Optional[str] = None

class VerificationStatusResponse(BaseModel):
    email_verified: bool
    verification_required: bool = True

class UserBase(BaseModel):
    email: EmailStr
    name: str

class UserCreate(UserBase):
    password: str
    user_type: UserType = UserType.CLIENT
    create_test_data: Optional[bool] = False
    
    @validator('password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not any(c.islower() for c in v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain at least one digit')
        return v

class PrimaryOrganization(BaseModel):
    """Primary organization information for User schema"""
    id: int
    name: str
    billing_plan: str
    subscription_status: str

class User(UserBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    # Unified Role System
    unified_role: Optional[str] = None
    role_migrated: Optional[bool] = False
    
    # Legacy fields (deprecated, kept for backwards compatibility)
    role: Optional[str] = "user"
    user_type: Optional[str] = None
    
    # Core user fields
    timezone: Optional[str] = "UTC"
    email_verified: bool = False
    verified_at: Optional[datetime] = None
    
    # Organization fields (for new organization system)
    primary_organization_id: Optional[int] = None
    primary_organization: Optional[PrimaryOrganization] = None
    
    # Trial and subscription fields (legacy - prefer organization-based)
    trial_started_at: Optional[datetime] = None
    trial_expires_at: Optional[datetime] = None
    trial_active: Optional[bool] = False
    subscription_status: Optional[str] = None
    is_trial_active: Optional[bool] = False
    trial_days_remaining: Optional[int] = None
    
    # Permission helpers (computed on frontend)
    is_business_owner: Optional[bool] = False
    is_staff_member: Optional[bool] = False
    is_system_admin: Optional[bool] = False
    can_manage_billing: Optional[bool] = False
    can_manage_staff: Optional[bool] = False
    can_view_analytics: Optional[bool] = False
    
    # Onboarding fields
    onboarding_completed: Optional[bool] = False
    onboarding_status: Optional[Dict[str, Any]] = None
    is_new_user: Optional[bool] = True
    
    class Config:
        from_attributes = True

class UserResponse(User):
    pass

class RoleUpdate(BaseModel):
    role: str = Field(..., description="New role for the user")
    
    @validator('role')
    def validate_role(cls, v):
        valid_roles = ["user", "admin", "super_admin", "barber", "manager"]
        if v not in valid_roles:
            raise ValueError(f"Role must be one of: {', '.join(valid_roles)}")
        return v

class UserInDB(User):
    hashed_password: str

# Timezone schemas
class TimezoneUpdate(BaseModel):
    timezone: str

class OnboardingUpdate(BaseModel):
    completed: Optional[bool] = None
    completed_steps: Optional[List[str]] = None
    current_step: Optional[int] = None
    skipped: Optional[bool] = None

class TimezoneUpdateValidated(BaseModel):
    timezone: str = Field(..., description="Valid timezone identifier (e.g., 'America/New_York')")
    
    @validator('timezone')
    def validate_timezone(cls, v):
        if v not in pytz.all_timezones:
            raise ValueError(f"Invalid timezone: {v}. Must be a valid timezone identifier.")
        return v

class TimezoneUpdateRequest(BaseModel):
    timezone: str = Field(..., description="Valid timezone identifier (e.g., 'America/New_York')")
    
    @validator('timezone')
    def validate_timezone(cls, v):
        if v not in pytz.all_timezones:
            raise ValueError(f"Invalid timezone: {v}. Must be a valid timezone identifier.")
        return v

class TimezoneInfo(BaseModel):
    name: str = Field(..., description="Timezone identifier (e.g., 'America/New_York')")
    offset: str = Field(..., description="Current UTC offset (e.g., '-05:00')")
    display_name: str = Field(..., description="Human-readable display name")

class TimezoneListResponse(BaseModel):
    timezones: List[TimezoneInfo]
    total: int

class TimezoneUpdateRequest(BaseModel):
    timezone: str = Field(..., description="Valid timezone identifier")
    auto_detected: bool = Field(False, description="Whether this timezone was auto-detected")
    
    @validator('timezone')
    def validate_timezone(cls, v):
        if v not in pytz.all_timezones:
            raise ValueError(f"Invalid timezone: {v}. Must be a valid timezone identifier.")
        return v

class TimezoneDetectionRequest(BaseModel):
    detected_timezone: str = Field(..., description="Browser-detected timezone")
    confidence: Optional[float] = Field(None, ge=0.0, le=1.0, description="Detection confidence score")
    browser_info: Optional[Dict[str, Any]] = Field(None, description="Additional browser information")
    
    @validator('detected_timezone')
    def validate_timezone(cls, v):
        if v not in pytz.all_timezones:
            raise ValueError(f"Invalid timezone: {v}. Must be a valid timezone identifier.")
        return v

class BusinessHoursResponse(BaseModel):
    date: str = Field(..., description="Date in YYYY-MM-DD format")
    business_hours: Dict[str, str] = Field(..., description="Business hours with start/end times")
    timezone: str = Field(..., description="Timezone for the displayed times")
    timezone_info: TimezoneInfo = Field(..., description="Detailed timezone information")

class TimezoneConversionResponse(BaseModel):
    source_timezone: str
    target_timezone: str
    source_datetime: str
    target_datetime: str
    conversion_type: str
    created_at: str

class UserResponse(User):
    """Enhanced user response with additional fields"""

# Booking schemas
class TimeSlot(BaseModel):
    time: str
    available: bool

class TimeSlotEnhanced(BaseModel):
    time: str = Field(..., description="Time slot in HH:MM format", example="14:30")
    available: bool = Field(..., description="Whether this time slot is available for booking")
    is_next_available: bool = Field(False, description="Whether this is the next available slot for booking")

class NextAvailableSlot(BaseModel):
    date: str = Field(..., description="Date in YYYY-MM-DD format")
    time: str = Field(..., description="Time in HH:MM format") 
    datetime: str = Field(..., description="Combined datetime in ISO format")

class BusinessHours(BaseModel):
    start: str = Field(..., description="Business start time in HH:MM format", example="09:00")
    end: str = Field(..., description="Business end time in HH:MM format", example="18:00")
    
    @validator('start', 'end')
    def validate_time_format(cls, v):
        try:
            # Validate HH:MM format
            time_parts = v.split(':')
            if len(time_parts) != 2:
                raise ValueError
            hour, minute = int(time_parts[0]), int(time_parts[1])
            if not (0 <= hour <= 23 and 0 <= minute <= 59):
                raise ValueError
            return v
        except (ValueError, IndexError):
            raise ValueError('Time must be in HH:MM format (24-hour)')

class SlotsResponse(BaseModel):
    date: str = Field(..., description="Date for the requested slots in YYYY-MM-DD format")
    slots: List[TimeSlotEnhanced] = Field(..., description="List of available time slots for the date")
    next_available: Optional[NextAvailableSlot] = Field(None, description="Next available slot if none available on requested date")
    business_hours: BusinessHours = Field(..., description="Business operating hours")
    slot_duration_minutes: int = Field(..., description="Duration of each booking slot in minutes", example=30)

class BookingSettingsResponse(BaseModel):
    id: int = Field(..., description="Unique identifier for booking settings")
    business_id: int = Field(..., description="Business identifier")
    business_name: str = Field(..., description="Name of the business")
    min_lead_time_minutes: int = Field(..., description="Minimum lead time required for bookings in minutes", example=60)
    max_advance_days: int = Field(..., description="Maximum days in advance bookings can be made", example=30)
    same_day_cutoff_time: Optional[str] = Field(None, description="Cutoff time for same-day bookings in HH:MM format", example="12:00")
    business_start_time: str = Field(..., description="Business start time in HH:MM format", example="09:00")
    business_end_time: str = Field(..., description="Business end time in HH:MM format", example="18:00")
    slot_duration_minutes: int = Field(..., description="Duration of each booking slot in minutes", example=30)
    show_soonest_available: bool = Field(..., description="Whether to show the soonest available slot")
    allow_same_day_booking: bool = Field(..., description="Whether same-day bookings are allowed")
    require_advance_booking: bool = Field(..., description="Whether advance booking is required")
    business_type: str = Field(..., description="Type of business", example="barbershop")
    created_at: datetime = Field(..., description="When the settings were created")
    updated_at: datetime = Field(..., description="When the settings were last updated")
    
    class Config:
        from_attributes = True

class BookingSettingsUpdate(BaseModel):
    business_name: Optional[str] = Field(None, description="Name of the business")
    min_lead_time_minutes: Optional[int] = Field(None, description="Minimum lead time required for bookings in minutes", example=60)
    max_advance_days: Optional[int] = Field(None, description="Maximum days in advance bookings can be made", example=30)
    same_day_cutoff_time: Optional[str] = Field(None, description="Cutoff time for same-day bookings in HH:MM format", example="12:00")
    business_start_time: Optional[str] = Field(None, description="Business start time in HH:MM format", example="09:00")
    business_end_time: Optional[str] = Field(None, description="Business end time in HH:MM format", example="18:00")
    slot_duration_minutes: Optional[int] = Field(None, description="Duration of each booking slot in minutes", example=30)
    show_soonest_available: Optional[bool] = Field(None, description="Whether to show the soonest available slot")
    allow_same_day_booking: Optional[bool] = Field(None, description="Whether same-day bookings are allowed")
    require_advance_booking: Optional[bool] = Field(None, description="Whether advance booking is required")
    business_type: Optional[str] = Field(None, description="Type of business", example="barbershop")
    
    @validator('same_day_cutoff_time', 'business_start_time', 'business_end_time')
    def validate_time_format(cls, v):
        if v is not None:
            try:
                # Validate HH:MM format
                time_parts = v.split(':')
                if len(time_parts) != 2:
                    raise ValueError
                hour, minute = int(time_parts[0]), int(time_parts[1])
                if not (0 <= hour <= 23 and 0 <= minute <= 59):
                    raise ValueError
                return v
            except (ValueError, IndexError):
                raise ValueError('Time must be in HH:MM format (24-hour)')
        return v

# Legacy booking schemas - Moved to end of file for consistency
# These are now aliases to standardized Appointment schemas (see end of file)
# Keeping placeholders here to maintain import locations for existing code

# Payment schemas
class PaymentIntentCreate(BaseModel):
    booking_id: int
    gift_certificate_code: Optional[str] = None

class PaymentIntentResponse(BaseModel):
    client_secret: Optional[str]
    payment_intent_id: Optional[str]
    amount: float
    original_amount: float
    gift_certificate_used: float
    payment_id: int

class PaymentConfirm(BaseModel):
    payment_intent_id: Optional[str]
    booking_id: int

class PaymentResponse(BaseModel):
    id: int
    amount: float
    status: str
    stripe_payment_intent_id: Optional[str]
    platform_fee: float
    barber_amount: float
    commission_rate: float
    refund_amount: float
    gift_certificate_amount_used: float
    created_at: datetime
    
    class Config:
        from_attributes = True

class RefundCreate(BaseModel):
    payment_id: int
    amount: float = Field(..., gt=0, description="Refund amount must be greater than 0")
    reason: str = Field(..., min_length=1, max_length=500, description="Reason for refund")

class RefundResponse(BaseModel):
    id: int
    payment_id: int
    amount: float
    reason: str
    status: str
    stripe_refund_id: Optional[str]
    initiated_by_id: int
    created_at: datetime
    processed_at: Optional[datetime]
    
    class Config:
        from_attributes = True

class GiftCertificateCreate(BaseModel):
    amount: float = Field(..., gt=0, description="Gift certificate amount")
    purchaser_name: str = Field(..., min_length=1, max_length=100)
    purchaser_email: EmailStr
    recipient_name: Optional[str] = Field(None, max_length=100)
    recipient_email: Optional[EmailStr] = None
    message: Optional[str] = Field(None, max_length=500)
    validity_months: int = Field(12, ge=1, le=60, description="Validity period in months")

class GiftCertificateResponse(BaseModel):
    id: int
    code: str
    amount: float
    balance: float
    status: str
    purchaser_name: str
    purchaser_email: str
    recipient_name: Optional[str]
    recipient_email: Optional[str]
    message: Optional[str]
    valid_from: datetime
    valid_until: datetime
    created_at: datetime
    used_at: Optional[datetime]
    
    class Config:
        from_attributes = True

class GiftCertificateValidate(BaseModel):
    code: str = Field(..., min_length=1, max_length=50)

class PaymentHistoryFilter(BaseModel):
    user_id: Optional[int] = None
    barber_id: Optional[int] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    status: Optional[str] = None
    page: int = Field(1, ge=1)
    page_size: int = Field(50, ge=1, le=100)

class PaymentHistoryResponse(BaseModel):
    payments: List[PaymentResponse]
    total: int
    page: int
    page_size: int
    total_pages: int

class PaymentReportRequest(BaseModel):
    start_date: datetime
    end_date: datetime
    barber_id: Optional[int] = None

class PaymentReportResponse(BaseModel):
    period: Dict[str, str]
    revenue: Dict[str, float]
    commissions: Dict[str, float]
    transactions: Dict[str, int]
    averages: Dict[str, float]

class PayoutCreate(BaseModel):
    barber_id: int
    start_date: datetime
    end_date: datetime

class PayoutResponse(BaseModel):
    id: int
    barber_id: int
    amount: float
    status: str
    period_start: datetime
    period_end: datetime
    payment_count: int
    stripe_transfer_id: Optional[str]
    created_at: datetime
    processed_at: Optional[datetime]
    
    class Config:
        from_attributes = True


# Client schemas
class ClientBase(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone: Optional[str] = None
    date_of_birth: Optional[Date] = None
    notes: Optional[str] = None
    tags: Optional[str] = None
    preferred_barber_id: Optional[int] = None
    preferred_services: Optional[List[str]] = []
    communication_preferences: Optional[dict] = {
        "sms": True,
        "email": True,
        "marketing": False
    }


class ClientCreate(ClientBase):
    pass


class ClientUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    date_of_birth: Optional[Date] = None
    notes: Optional[str] = None
    tags: Optional[str] = None
    preferred_barber_id: Optional[int] = None
    preferred_services: Optional[List[str]] = None
    communication_preferences: Optional[dict] = None


class Client(ClientBase):
    id: int
    customer_type: str
    total_visits: int
    total_spent: float
    average_ticket: float
    visit_frequency_days: Optional[int]
    no_show_count: int
    cancellation_count: int
    referral_count: int
    first_visit_date: Optional[datetime]
    last_visit_date: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class ClientList(BaseModel):
    clients: List[Client]
    total: int
    page: int
    page_size: int


class ClientHistory(BaseModel):
    appointments: List[BookingResponse]
    total_appointments: int
    total_spent: float
    average_ticket: float
    no_shows: int
    cancellations: int


# Service schemas
class ServiceCategoryEnum(str, Enum):
    HAIRCUT = "haircut"
    SHAVE = "shave"
    BEARD = "beard"
    HAIR_TREATMENT = "hair_treatment"
    STYLING = "styling"
    COLOR = "color"
    PACKAGE = "package"
    OTHER = "other"


class ServiceBase(BaseModel):
    name: str
    description: Optional[str] = None
    category: ServiceCategoryEnum
    sku: Optional[str] = None
    base_price: float = Field(..., ge=0)
    min_price: Optional[float] = Field(None, ge=0)
    max_price: Optional[float] = Field(None, ge=0)
    duration_minutes: int = Field(30, ge=5, le=480)  # 5 minutes to 8 hours
    buffer_time_minutes: int = Field(0, ge=0, le=60)
    is_active: bool = True
    is_bookable_online: bool = True
    max_advance_booking_days: Optional[int] = Field(None, ge=1, le=365)
    min_advance_booking_hours: Optional[int] = Field(None, ge=0, le=168)  # Up to 1 week
    is_package: bool = False
    package_discount_percent: Optional[float] = Field(None, ge=0, le=100)
    package_discount_amount: Optional[float] = Field(None, ge=0)
    display_order: int = 0
    image_url: Optional[str] = None


class ServiceCreate(ServiceBase):
    package_item_ids: Optional[List[int]] = None
    
    @validator('package_item_ids')
    def validate_package_items(cls, v, values):
        if v and not values.get('is_package'):
            raise ValueError('Package items can only be set for package services')
        return v
    
    @validator('min_price', 'max_price')
    def validate_price_range(cls, v, values):
        if 'base_price' in values:
            if values.get('min_price') and values['min_price'] > values['base_price']:
                raise ValueError('Min price cannot be greater than base price')
            if values.get('max_price') and values['max_price'] < values['base_price']:
                raise ValueError('Max price cannot be less than base price')
        return v


class ServiceUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[ServiceCategoryEnum] = None
    sku: Optional[str] = None
    base_price: Optional[float] = Field(None, ge=0)
    min_price: Optional[float] = Field(None, ge=0)
    max_price: Optional[float] = Field(None, ge=0)
    duration_minutes: Optional[int] = Field(None, ge=5, le=480)
    buffer_time_minutes: Optional[int] = Field(None, ge=0, le=60)
    is_active: Optional[bool] = None
    is_bookable_online: Optional[bool] = None
    max_advance_booking_days: Optional[int] = Field(None, ge=1, le=365)
    min_advance_booking_hours: Optional[int] = Field(None, ge=0, le=168)
    is_package: Optional[bool] = None
    package_discount_percent: Optional[float] = Field(None, ge=0, le=100)
    package_discount_amount: Optional[float] = Field(None, ge=0)
    display_order: Optional[int] = None
    image_url: Optional[str] = None
    package_item_ids: Optional[List[int]] = None


class ServiceResponse(ServiceBase):
    id: int
    created_at: datetime
    updated_at: datetime
    created_by_id: Optional[int]
    package_items: Optional[List['ServiceResponse']] = []
    pricing_rules: Optional[List['ServicePricingRuleResponse']] = []
    booking_rules: Optional[List['ServiceBookingRuleResponse']] = []
    
    class Config:
        from_attributes = True


# Service Pricing Rule schemas
class ServicePricingRuleBase(BaseModel):
    rule_type: str  # time_of_day, day_of_week, date_range, demand
    start_time: Optional[Time] = None
    end_time: Optional[Time] = None
    day_of_week: Optional[int] = Field(None, ge=0, le=6)  # 0-6 for Monday-Sunday
    start_date: Optional[Date] = None
    end_date: Optional[Date] = None
    price_adjustment_type: str  # percentage, fixed
    price_adjustment_value: float
    priority: int = 0
    is_active: bool = True


class ServicePricingRuleCreate(ServicePricingRuleBase):
    @validator('rule_type')
    def validate_rule_type(cls, v):
        valid_types = ['time_of_day', 'day_of_week', 'date_range', 'demand']
        if v not in valid_types:
            raise ValueError(f'Rule type must be one of {valid_types}')
        return v
    
    @validator('price_adjustment_type')
    def validate_adjustment_type(cls, v):
        valid_types = ['percentage', 'fixed']
        if v not in valid_types:
            raise ValueError(f'Adjustment type must be one of {valid_types}')
        return v


class ServicePricingRuleResponse(ServicePricingRuleBase):
    id: int
    service_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True


# Service Booking Rule schemas
class ServiceBookingRuleBase(BaseModel):
    rule_type: str
    min_age: Optional[int] = Field(None, ge=0, le=150)
    max_age: Optional[int] = Field(None, ge=0, le=150)
    requires_consultation: bool = False
    requires_patch_test: bool = False
    patch_test_hours_before: int = 48
    max_bookings_per_day: Optional[int] = Field(None, ge=1)
    min_days_between_bookings: Optional[int] = Field(None, ge=1)
    blocked_days_of_week: Optional[List[int]] = None  # 0-6 for days
    required_service_ids: Optional[List[int]] = None
    incompatible_service_ids: Optional[List[int]] = None
    is_active: bool = True
    message: Optional[str] = None


class ServiceBookingRuleCreate(ServiceBookingRuleBase):
    @validator('blocked_days_of_week')
    def validate_days(cls, v):
        if v:
            for day in v:
                if day < 0 or day > 6:
                    raise ValueError('Day of week must be between 0 (Monday) and 6 (Sunday)')
        return v


class ServiceBookingRuleResponse(ServiceBookingRuleBase):
    id: int
    service_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True


# Service Template Schemas - 6FB Preset System
class ServiceTemplateBase(BaseModel):
    """Base schema for Six Figure Barber service templates"""
    name: str = Field(..., min_length=1, max_length=100, description="Template internal name")
    display_name: str = Field(..., min_length=1, max_length=100, description="User-friendly display name")
    description: Optional[str] = Field(None, max_length=1000, description="Template description")
    category: ServiceCategoryEnum = Field(..., description="Service category")
    
    # 6FB Methodology Alignment
    six_fb_tier: str = Field(..., description="6FB tier: starter, professional, premium, luxury")
    methodology_score: float = Field(0.0, ge=0, le=100, description="0-100 alignment with 6FB principles")
    revenue_impact: str = Field(..., description="Revenue impact: high, medium, low")
    client_relationship_impact: str = Field(..., description="Client relationship impact: high, medium, low")
    
    # Preset Configuration
    suggested_base_price: float = Field(..., ge=0, description="Suggested base price")
    suggested_min_price: Optional[float] = Field(None, ge=0, description="Suggested minimum price")
    suggested_max_price: Optional[float] = Field(None, ge=0, description="Suggested maximum price")
    duration_minutes: int = Field(30, ge=5, le=480, description="Service duration in minutes")
    buffer_time_minutes: int = Field(5, ge=0, le=60, description="Buffer time between appointments")
    
    # 6FB Business Logic
    requires_consultation: bool = Field(False, description="Whether service requires consultation")
    upsell_opportunities: List[int] = Field(default_factory=list, description="Related service template IDs for upselling")
    client_value_tier: str = Field("standard", description="Client value tier: standard, premium, luxury")
    profit_margin_target: Optional[float] = Field(None, ge=0, le=100, description="Target profit margin percentage")
    
    # Template Metadata
    template_type: str = Field("preset", description="Template type: preset, user_created, community")
    is_six_fb_certified: bool = Field(True, description="6FB methodology certified")
    target_market: Optional[str] = Field(None, description="Target market: urban, suburban, rural, luxury")
    recommended_for: List[str] = Field(default_factory=list, description="Recommended user types")
    
    @validator('six_fb_tier')
    def validate_six_fb_tier(cls, v):
        valid_tiers = ['starter', 'professional', 'premium', 'luxury']
        if v not in valid_tiers:
            raise ValueError(f'6FB tier must be one of: {", ".join(valid_tiers)}')
        return v
    
    @validator('revenue_impact', 'client_relationship_impact')
    def validate_impact_level(cls, v):
        valid_levels = ['high', 'medium', 'low']
        if v not in valid_levels:
            raise ValueError(f'Impact level must be one of: {", ".join(valid_levels)}')
        return v
    
    @validator('client_value_tier')
    def validate_client_value_tier(cls, v):
        valid_tiers = ['standard', 'premium', 'luxury']
        if v not in valid_tiers:
            raise ValueError(f'Client value tier must be one of: {", ".join(valid_tiers)}')
        return v


class ServiceTemplateCreate(ServiceTemplateBase):
    """Create a new service template"""
    service_details: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Detailed service configuration")
    pricing_strategy: Optional[Dict[str, Any]] = Field(default_factory=dict, description="6FB pricing methodology")
    business_rules: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Booking rules and restrictions")
    template_image_url: Optional[str] = Field(None, description="Template image URL")
    demo_images: List[str] = Field(default_factory=list, description="Demo image URLs")


class ServiceTemplateUpdate(BaseModel):
    """Update existing service template"""
    display_name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=1000)
    suggested_base_price: Optional[float] = Field(None, ge=0)
    suggested_min_price: Optional[float] = Field(None, ge=0)
    suggested_max_price: Optional[float] = Field(None, ge=0)
    duration_minutes: Optional[int] = Field(None, ge=5, le=480)
    buffer_time_minutes: Optional[int] = Field(None, ge=0, le=60)
    requires_consultation: Optional[bool] = None
    client_value_tier: Optional[str] = None
    profit_margin_target: Optional[float] = Field(None, ge=0, le=100)
    template_image_url: Optional[str] = None
    is_active: Optional[bool] = None
    is_featured: Optional[bool] = None


class ServiceTemplateResponse(ServiceTemplateBase):
    """Service template response with metadata"""
    id: int
    popularity_score: float = Field(0.0, description="Usage/adoption score")
    success_rate: float = Field(0.0, description="Business success rate using template")
    usage_count: int = Field(0, description="Number of times template has been used")
    is_active: bool = Field(True, description="Whether template is active")
    is_featured: bool = Field(False, description="Whether template is featured")
    created_at: datetime
    updated_at: datetime
    created_by_id: Optional[int] = None
    
    # Computed properties
    pricing_range_display: str = Field(..., description="Display-friendly pricing range")
    is_six_figure_aligned: bool = Field(..., description="Meets 6FB methodology standards")
    
    class Config:
        from_attributes = True


class ServiceTemplateListResponse(BaseModel):
    """List of service templates with pagination"""
    templates: List[ServiceTemplateResponse]
    total: int
    page: int = 1
    page_size: int = 50
    has_next: bool = False
    has_previous: bool = False


class ServiceTemplateApplyRequest(BaseModel):
    """Request to apply a service template to user's services"""
    template_id: int = Field(..., description="Service template ID to apply")
    custom_price: Optional[float] = Field(None, ge=0, description="Custom price (overrides template price)")
    custom_name: Optional[str] = Field(None, min_length=1, max_length=100, description="Custom service name")
    custom_description: Optional[str] = Field(None, max_length=500, description="Custom service description")
    apply_business_rules: bool = Field(True, description="Apply template's business rules")
    apply_pricing_rules: bool = Field(True, description="Apply template's pricing rules")


class ServiceTemplateApplyResponse(BaseModel):
    """Response after applying a service template"""
    service_id: int = Field(..., description="ID of created service")
    template_id: int = Field(..., description="Applied template ID")
    applied_price: float = Field(..., description="Final applied price")
    customizations_applied: Dict[str, Any] = Field(default_factory=dict, description="Applied customizations")
    business_rules_created: List[int] = Field(default_factory=list, description="Created business rule IDs")
    message: str = Field(..., description="Success message")


class ServiceTemplateCategoryBase(BaseModel):
    """Base schema for service template categories"""
    name: str = Field(..., min_length=1, max_length=50, description="Category internal name")
    display_name: str = Field(..., min_length=1, max_length=100, description="Category display name")
    description: Optional[str] = Field(None, max_length=500, description="Category description")
    six_fb_pathway: Optional[str] = Field(None, description="6FB pathway: beginner, intermediate, advanced, master")
    business_impact: str = Field(..., description="Business impact: foundation, growth, optimization, mastery")
    icon_name: Optional[str] = Field(None, description="Icon name for UI")
    color_theme: Optional[str] = Field(None, description="Color theme for UI")
    display_order: int = Field(0, description="Display order")


class ServiceTemplateCategoryResponse(ServiceTemplateCategoryBase):
    """Service template category response"""
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class ServiceTemplateFilterRequest(BaseModel):
    """Request filters for service template search"""
    category: Optional[ServiceCategoryEnum] = None
    six_fb_tier: Optional[str] = None
    revenue_impact: Optional[str] = None
    client_relationship_impact: Optional[str] = None
    min_price: Optional[float] = Field(None, ge=0)
    max_price: Optional[float] = Field(None, ge=0)
    requires_consultation: Optional[bool] = None
    target_market: Optional[str] = None
    is_six_fb_certified: Optional[bool] = None
    is_featured: Optional[bool] = None
    search_query: Optional[str] = Field(None, max_length=100, description="Search in name and description")


# Barber Availability Schemas
class BarberAvailabilityBase(BaseModel):
    day_of_week: int = Field(..., ge=0, le=6, description="Day of week (0=Monday, 6=Sunday)")
    start_time: Time = Field(..., description="Start time for availability")
    end_time: Time = Field(..., description="End time for availability")
    is_active: bool = True

    @validator('end_time')
    def validate_time_range(cls, v, values):
        if 'start_time' in values and v <= values['start_time']:
            raise ValueError('End time must be after start time')
        return v


class BarberAvailabilityCreate(BarberAvailabilityBase):
    pass


class BarberAvailabilityUpdate(BaseModel):
    day_of_week: Optional[int] = Field(None, ge=0, le=6)
    start_time: Optional[Time] = None
    end_time: Optional[Time] = None
    is_active: Optional[bool] = None


class BarberAvailabilityResponse(BarberAvailabilityBase):
    id: int
    barber_id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class BarberTimeOffBase(BaseModel):
    start_date: Date = Field(..., description="Start date for time off")
    end_date: Date = Field(..., description="End date for time off")
    start_time: Optional[Time] = None
    end_time: Optional[Time] = None
    reason: Optional[str] = None
    notes: Optional[str] = None

    @validator('end_date')
    def validate_date_range(cls, v, values):
        if 'start_date' in values and v < values['start_date']:
            raise ValueError('End date must be after start date')
        return v


class BarberTimeOffCreate(BarberTimeOffBase):
    pass


class BarberTimeOffUpdate(BaseModel):
    start_date: Optional[Date] = None
    end_date: Optional[Date] = None
    start_time: Optional[Time] = None
    end_time: Optional[Time] = None
    reason: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None


class BarberTimeOffResponse(BarberTimeOffBase):
    id: int
    barber_id: int
    status: str
    approved_by_id: Optional[int]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class BarberSpecialAvailabilityBase(BaseModel):
    date: Date = Field(..., description="Date for special availability")
    start_time: Time = Field(..., description="Start time")
    end_time: Time = Field(..., description="End time")
    availability_type: str = Field("available", description="Type: available or unavailable")
    notes: Optional[str] = None

    @validator('availability_type')
    def validate_availability_type(cls, v):
        if v not in ['available', 'unavailable']:
            raise ValueError('Availability type must be "available" or "unavailable"')
        return v


class BarberSpecialAvailabilityCreate(BarberSpecialAvailabilityBase):
    pass


class BarberSpecialAvailabilityResponse(BarberSpecialAvailabilityBase):
    id: int
    barber_id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# Recurring Appointment Schemas
class RecurringPatternBase(BaseModel):
    pattern_type: str = Field(..., description="daily, weekly, biweekly, monthly")
    days_of_week: Optional[List[int]] = Field(None, description="Days of week for weekly patterns")
    day_of_month: Optional[int] = Field(None, ge=1, le=31, description="Day of month for monthly patterns")
    week_of_month: Optional[int] = Field(None, ge=1, le=4, description="Week of month for monthly patterns")
    preferred_time: Time = Field(..., description="Preferred appointment time")
    duration_minutes: int = Field(..., ge=15, le=480, description="Duration in minutes")
    start_date: Date = Field(..., description="Start date for recurring pattern")
    end_date: Optional[Date] = Field(None, description="End date (optional)")
    occurrences: Optional[int] = Field(None, ge=1, description="Number of occurrences (alternative to end_date)")
    barber_id: Optional[int] = None
    service_id: Optional[int] = None

    @validator('pattern_type')
    def validate_pattern_type(cls, v):
        valid_types = ['daily', 'weekly', 'biweekly', 'monthly']
        if v not in valid_types:
            raise ValueError(f'Pattern type must be one of {valid_types}')
        return v

    @validator('days_of_week')
    def validate_days_of_week(cls, v, values):
        if v and values.get('pattern_type') in ['weekly', 'biweekly']:
            if not all(0 <= day <= 6 for day in v):
                raise ValueError('Days of week must be between 0 (Monday) and 6 (Sunday)')
        return v


class RecurringPatternCreate(RecurringPatternBase):
    pass


class RecurringPatternUpdate(BaseModel):
    pattern_type: Optional[str] = None
    days_of_week: Optional[List[int]] = None
    day_of_month: Optional[int] = Field(None, ge=1, le=31)
    week_of_month: Optional[int] = Field(None, ge=1, le=4)
    preferred_time: Optional[Time] = None
    duration_minutes: Optional[int] = Field(None, ge=15, le=480)
    start_date: Optional[Date] = None
    end_date: Optional[Date] = None
    occurrences: Optional[int] = Field(None, ge=1)
    barber_id: Optional[int] = None
    service_id: Optional[int] = None
    is_active: Optional[bool] = None


class RecurringPatternResponse(RecurringPatternBase):
    id: int
    user_id: int
    client_id: Optional[int]
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# Blackout Date Schemas
class BlackoutDateBase(BaseModel):
    blackout_date: Date = Field(..., description="Date to block out")
    end_date: Optional[Date] = Field(None, description="End date for multi-day blackouts")
    start_time: Optional[Time] = Field(None, description="Start time for partial day blackouts")
    end_time: Optional[Time] = Field(None, description="End time for partial day blackouts")
    reason: str = Field(..., description="Reason for blackout")
    blackout_type: str = Field("full_day", description="Type of blackout")
    is_recurring: bool = Field(False, description="Whether this is a recurring blackout")
    recurrence_pattern: Optional[str] = Field(None, description="Recurrence pattern")
    recurrence_end_date: Optional[Date] = Field(None, description="End date for recurring blackouts")
    allow_emergency_bookings: bool = Field(False, description="Allow emergency bookings")
    affects_existing_appointments: bool = Field(True, description="Affects existing appointments")
    auto_reschedule: bool = Field(False, description="Auto-reschedule affected appointments")
    description: Optional[str] = None
    location_id: Optional[int] = None
    barber_id: Optional[int] = None

    @validator('blackout_type')
    def validate_blackout_type(cls, v):
        valid_types = ['full_day', 'partial_day', 'recurring']
        if v not in valid_types:
            raise ValueError(f'Blackout type must be one of {valid_types}')
        return v


class BlackoutDateCreate(BlackoutDateBase):
    pass


class BlackoutDateUpdate(BaseModel):
    blackout_date: Optional[Date] = None
    end_date: Optional[Date] = None
    start_time: Optional[Time] = None
    end_time: Optional[Time] = None
    reason: Optional[str] = None
    blackout_type: Optional[str] = None
    is_recurring: Optional[bool] = None
    recurrence_pattern: Optional[str] = None
    recurrence_end_date: Optional[Date] = None
    allow_emergency_bookings: Optional[bool] = None
    affects_existing_appointments: Optional[bool] = None
    auto_reschedule: Optional[bool] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class BlackoutDateResponse(BlackoutDateBase):
    id: int
    created_by_id: int
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


# Recurring Series Schemas
class RecurringSeriesBase(BaseModel):
    series_name: Optional[str] = None
    series_description: Optional[str] = None
    payment_type: str = Field("per_appointment", description="Payment type for series")
    total_series_price: Optional[float] = None

    @validator('payment_type')
    def validate_payment_type(cls, v):
        valid_types = ['per_appointment', 'series_upfront', 'subscription']
        if v not in valid_types:
            raise ValueError(f'Payment type must be one of {valid_types}')
        return v


class RecurringSeriesCreate(RecurringSeriesBase):
    pattern_id: int


class RecurringSeriesUpdate(BaseModel):
    series_name: Optional[str] = None
    series_description: Optional[str] = None
    payment_type: Optional[str] = None
    total_series_price: Optional[float] = None
    series_status: Optional[str] = None


class RecurringSeriesResponse(RecurringSeriesBase):
    id: int
    pattern_id: int
    user_id: int
    paid_amount: float
    payment_status: str
    total_planned: int
    total_completed: int
    total_cancelled: int
    total_rescheduled: int
    series_status: str
    completion_percentage: float
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime]
    
    class Config:
        from_attributes = True


# Enhanced Appointment Schema for recurring appointments
class RecurringAppointmentInstance(BaseModel):
    appointment_id: Optional[int] = None
    recurring_pattern_id: int
    recurring_series_id: Optional[int] = None
    scheduled_date: Date
    scheduled_time: Time
    duration_minutes: int
    barber_id: Optional[int] = None
    service_id: Optional[int] = None
    status: str = "pending"
    is_recurring_instance: bool = True
    recurrence_sequence: Optional[int] = None
    original_scheduled_date: Optional[Date] = None
    
    
class AppointmentSeriesManagement(BaseModel):
    action: str = Field(..., description="Action to perform")
    appointment_id: Optional[int] = None
    apply_to_series: bool = Field(False, description="Apply to entire series")
    new_date: Optional[Date] = None
    new_time: Optional[Time] = None
    new_barber_id: Optional[int] = None
    reason: Optional[str] = None
    
    @validator('action')
    def validate_action(cls, v):
        valid_actions = ['reschedule', 'cancel', 'modify', 'complete']
        if v not in valid_actions:
            raise ValueError(f'Action must be one of {valid_actions}')
        return v


# Enhanced Booking Schemas
class BookingRuleBase(BaseModel):
    rule_name: str = Field(..., description="Unique name for the rule")
    rule_type: str = Field(..., description="Type of rule (e.g., buffer_time, max_bookings_per_day)")
    rule_params: Dict[str, Any] = Field(..., description="Rule parameters as JSON")
    applies_to: str = Field("all", description="What this rule applies to: all, service, barber, client_type")
    service_ids: Optional[List[int]] = None
    barber_ids: Optional[List[int]] = None
    client_types: Optional[List[str]] = None
    priority: int = Field(0, description="Rule priority (higher values override lower)")
    is_active: bool = True


class BookingRuleCreate(BookingRuleBase):
    pass


class BookingRuleUpdate(BaseModel):
    rule_name: Optional[str] = None
    rule_type: Optional[str] = None
    rule_params: Optional[Dict[str, Any]] = None
    applies_to: Optional[str] = None
    service_ids: Optional[List[int]] = None
    barber_ids: Optional[List[int]] = None
    client_types: Optional[List[str]] = None
    priority: Optional[int] = None
    is_active: Optional[bool] = None


class BookingRuleResponse(BookingRuleBase):
    id: int
    business_id: int
    created_at: datetime
    updated_at: datetime
    created_by_id: Optional[int]
    
    class Config:
        from_attributes = True


# Enhanced Booking Create schema with new fields
# EnhancedBookingCreate - Moved to end of file as alias to EnhancedAppointmentCreate


# Barber availability checking schema
class BarberAvailabilityCheck(BaseModel):
    barber_id: int
    date: Date
    start_time: Optional[Time] = None
    end_time: Optional[Time] = None


class AvailableBarber(BaseModel):
    barber_id: int
    barber_name: str
    available_slots: List[TimeSlotEnhanced]


class BarberAvailabilityByDateResponse(BaseModel):
    date: str
    available_barbers: List[AvailableBarber]


# Google Calendar Integration Schemas
class CalendarConnectionStatus(BaseModel):
    connected: bool
    valid: Optional[bool] = None
    calendar_count: Optional[int] = None
    selected_calendar_id: Optional[str] = None
    error: Optional[str] = None


class GoogleCalendar(BaseModel):
    id: str
    summary: str
    primary: bool = False
    accessRole: str
    timeZone: Optional[str] = None


class CalendarListResponse(BaseModel):
    calendars: List[GoogleCalendar]


class CalendarSelectRequest(BaseModel):
    calendar_id: str = Field(..., description="Google Calendar ID to use for syncing")


class CalendarAvailabilityRequest(BaseModel):
    start_time: datetime = Field(..., description="Start time to check availability")
    end_time: datetime = Field(..., description="End time to check availability")


class CalendarAvailabilityResponse(BaseModel):
    available: bool
    start_time: str
    end_time: str


class CalendarFreeBusyRequest(BaseModel):
    start_date: datetime = Field(..., description="Start date for free/busy query")
    end_date: datetime = Field(..., description="End date for free/busy query")


class BusyPeriod(BaseModel):
    start: str
    end: str


class CalendarFreeBusyResponse(BaseModel):
    start_time: str
    end_time: str
    calendar_id: str
    busy_periods: List[BusyPeriod]


class CalendarSyncRequest(BaseModel):
    start_date: datetime = Field(..., description="Start date for syncing appointments")
    end_date: datetime = Field(..., description="End date for syncing appointments")


class CalendarSyncResponse(BaseModel):
    message: str
    results: Dict[str, Any] = Field(..., description="Sync results with counts and errors")


class CalendarValidationResponse(BaseModel):
    connected: bool
    valid_credentials: bool
    can_list_calendars: bool
    can_create_events: bool
    selected_calendar: Optional[GoogleCalendar] = None
    errors: List[str] = []


class CalendarEventResponse(BaseModel):
    message: str
    google_event_id: Optional[str] = None


# Analytics schemas
class DateRange(BaseModel):
    start_date: datetime = Field(..., description="Start date for the range")
    end_date: datetime = Field(..., description="End date for the range")
    
    @validator('end_date')
    def validate_date_range(cls, v, values):
        if 'start_date' in values and v < values['start_date']:
            raise ValueError('End date must be after start date')
        return v


class AnalyticsDateRangeFilter(BaseModel):
    start_date: Optional[Date] = Field(None, description="Start date for analytics filter")
    end_date: Optional[Date] = Field(None, description="End date for analytics filter")
    user_id: Optional[int] = Field(None, description="User ID to filter analytics (admin only)")
    group_by: Optional[str] = Field("month", description="Group by period: day, week, month, year")


class AnalyticsResponse(BaseModel):
    """Base analytics response with common metadata"""
    generated_at: datetime = Field(..., description="When the analytics were generated")
    date_range: Optional[Dict[str, str]] = Field(None, description="Date range used for analytics")
    user_id: Optional[int] = Field(None, description="User ID for filtered analytics")


class RevenueAnalyticsResponse(AnalyticsResponse):
    summary: Dict[str, Any] = Field(..., description="Revenue summary statistics")
    data: List[Dict[str, Any]] = Field(..., description="Revenue data points")


class AppointmentAnalyticsResponse(AnalyticsResponse):
    summary: Dict[str, Any] = Field(..., description="Appointment summary statistics")
    by_service: Dict[str, Any] = Field(..., description="Service breakdown")
    by_time_slot: Dict[str, Any] = Field(..., description="Time slot analysis")


class ClientRetentionAnalyticsResponse(AnalyticsResponse):
    summary: Dict[str, Any] = Field(..., description="Client retention summary")
    segments: Dict[str, Any] = Field(..., description="Client segmentation")
    trends: Dict[str, Any] = Field(..., description="Retention trends")


class BarberPerformanceResponse(AnalyticsResponse):
    summary: Dict[str, Any] = Field(..., description="Performance summary")
    revenue: Dict[str, Any] = Field(..., description="Revenue metrics")
    efficiency: Dict[str, Any] = Field(..., description="Efficiency metrics")
    client_metrics: Dict[str, Any] = Field(..., description="Client relationship metrics")
    service_performance: Dict[str, Any] = Field(..., description="Service-specific performance")
    peak_performance: Dict[str, Any] = Field(..., description="Peak hour and day analysis")


class SixFigureBarberResponse(AnalyticsResponse):
    current_performance: Dict[str, Any] = Field(..., description="Current performance metrics")
    targets: Dict[str, Any] = Field(..., description="Target metrics and goals")
    recommendations: Dict[str, Any] = Field(..., description="Strategic recommendations")
    action_items: List[Dict[str, str]] = Field(..., description="Prioritized action items")


class BusinessInsight(BaseModel):
    type: str = Field(..., description="Type of insight (revenue, retention, etc.)")
    priority: str = Field(..., description="Priority level: high, medium, low")
    title: str = Field(..., description="Insight title")
    description: str = Field(..., description="Detailed description")
    action: str = Field(..., description="Recommended action")


class QuickAction(BaseModel):
    title: str = Field(..., description="Action title")
    category: str = Field(..., description="Action category")
    urgency: str = Field(..., description="Urgency level")
    description: str = Field(..., description="Action description")


class DashboardAnalyticsResponse(AnalyticsResponse):
    key_metrics: Dict[str, Any] = Field(..., description="Key performance indicators")
    revenue_analytics: Dict[str, Any] = Field(..., description="Revenue analytics data")
    appointment_analytics: Dict[str, Any] = Field(..., description="Appointment analytics data")
    retention_metrics: Dict[str, Any] = Field(..., description="Client retention data")
    clv_analytics: Dict[str, Any] = Field(..., description="Customer lifetime value data")
    pattern_analytics: Dict[str, Any] = Field(..., description="Appointment pattern data")
    comparative_data: Dict[str, Any] = Field(..., description="Comparative analytics")
    business_insights: List[BusinessInsight] = Field(..., description="Business insights")
    quick_actions: List[QuickAction] = Field(..., description="Quick action recommendations")
    barber_performance: Optional[Dict[str, Any]] = Field(None, description="Barber-specific performance data")


class PerformanceScore(BaseModel):
    overall_score: int = Field(..., description="Overall performance score")
    max_score: int = Field(..., description="Maximum possible score")
    percentage: float = Field(..., description="Performance percentage")
    grade: str = Field(..., description="Letter grade (A-F)")
    factors: List[Dict[str, Any]] = Field(..., description="Score breakdown by factors")


class BusinessRecommendation(BaseModel):
    category: str = Field(..., description="Recommendation category")
    priority: str = Field(..., description="Priority level")
    title: str = Field(..., description="Recommendation title")
    description: str = Field(..., description="Detailed description")
    expected_impact: str = Field(..., description="Expected impact of implementation")
    implementation_time: str = Field(..., description="Estimated implementation time")
    resources_needed: List[str] = Field(..., description="Required resources")


class BusinessInsightsResponse(AnalyticsResponse):
    insights: List[BusinessInsight] = Field(..., description="Business insights")
    quick_actions: List[QuickAction] = Field(..., description="Quick action items")
    performance_score: PerformanceScore = Field(..., description="Overall performance score")
    recommendations: List[BusinessRecommendation] = Field(..., description="Detailed recommendations")
    benchmarks: Dict[str, Any] = Field(..., description="Industry benchmarks")


class AnalyticsExportRequest(BaseModel):
    export_type: str = Field(..., description="Type of data to export")
    format: str = Field("json", description="Export format")
    start_date: Optional[Date] = Field(None, description="Start date for export")
    end_date: Optional[Date] = Field(None, description="End date for export")
    user_id: Optional[int] = Field(None, description="User ID filter")


class AnalyticsExportResponse(BaseModel):
    export_type: str = Field(..., description="Type of exported data")
    format: str = Field(..., description="Export format")
    generated_at: datetime = Field(..., description="Export generation timestamp")
    date_range: Dict[str, Optional[str]] = Field(..., description="Date range for export")
    user_id: Optional[int] = Field(None, description="User ID filter")
    data: Dict[str, Any] = Field(..., description="Exported analytics data")
    note: Optional[str] = Field(None, description="Additional notes about the export")


# Notification schemas
class NotificationPreferenceCreate(BaseModel):
    email_enabled: Optional[bool] = True
    email_appointment_confirmation: Optional[bool] = True
    email_appointment_reminder: Optional[bool] = True
    email_appointment_changes: Optional[bool] = True
    email_marketing: Optional[bool] = False
    sms_enabled: Optional[bool] = True
    sms_appointment_confirmation: Optional[bool] = True
    sms_appointment_reminder: Optional[bool] = True
    sms_appointment_changes: Optional[bool] = True
    sms_marketing: Optional[bool] = False
    reminder_hours: Optional[List[int]] = [24, 2]

class NotificationPreferenceResponse(BaseModel):
    id: int
    user_id: int
    email_enabled: bool
    email_appointment_confirmation: bool
    email_appointment_reminder: bool
    email_appointment_changes: bool
    email_marketing: bool
    sms_enabled: bool
    sms_appointment_confirmation: bool
    sms_appointment_reminder: bool
    sms_appointment_changes: bool
    sms_marketing: bool
    reminder_hours: List[int]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class NotificationTemplateResponse(BaseModel):
    id: int
    name: str
    template_type: str
    subject: Optional[str]
    variables: List[str]
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class NotificationHistoryResponse(BaseModel):
    id: int
    notification_type: str
    template_name: str
    recipient: str
    subject: Optional[str]
    status: str
    scheduled_for: datetime
    sent_at: Optional[datetime]
    attempts: int
    error_message: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True

class NotificationStatsResponse(BaseModel):
    period_days: int
    since_date: str
    email: Dict[str, int]
    sms: Dict[str, int]
    service_stats: Optional[Dict[str, Any]] = None
    user_specific: Optional[bool] = False

class NotificationQueueItem(BaseModel):
    id: int
    user_id: int
    appointment_id: Optional[int]
    notification_type: str
    template_name: str
    recipient: str
    subject: Optional[str]
    body: str
    status: str
    scheduled_for: datetime
    sent_at: Optional[datetime]
    attempts: int
    error_message: Optional[str]
    notification_metadata: Optional[Dict[str, Any]]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class BulkNotificationRequest(BaseModel):
    template_name: str
    user_ids: List[int]
    context: Dict[str, Any]
    scheduled_for: Optional[datetime] = None
    appointment_id: Optional[int] = None

class BulkNotificationResponse(BaseModel):
    message: str
    notifications_queued: int
    user_ids_processed: List[int]
    errors: Optional[List[str]] = None

# Import schemas
class ImportUploadResponse(BaseModel):
    import_id: str = Field(..., description="Unique identifier for the import job")
    filename: str = Field(..., description="Original filename")
    source_type: str = Field(..., description="Type of import source (booksy, square, csv, etc.)")
    import_type: str = Field(..., description="Type of data being imported (clients, appointments, etc.)")
    file_size: int = Field(..., description="File size in bytes")
    status: str = Field(..., description="Current import status")
    message: str = Field(..., description="Success or status message")
    uploaded_at: str = Field(..., description="Upload timestamp")

class ImportStatusResponse(BaseModel):
    import_id: str = Field(..., description="Unique identifier for the import job")
    filename: Optional[str] = Field(None, description="Original filename")
    source_type: Optional[str] = Field(None, description="Import source type")
    import_type: Optional[str] = Field(None, description="Type of data being imported")
    status: str = Field(..., description="Current status: uploaded, validating, validated, importing, completed, failed")
    progress: int = Field(..., description="Progress percentage (0-100)", ge=0, le=100)
    total_records: int = Field(..., description="Total number of records in the file")
    processed_records: int = Field(..., description="Number of records processed so far")
    successful_imports: int = Field(..., description="Number of successfully imported records")
    failed_imports: int = Field(..., description="Number of failed import attempts")
    errors: List[str] = Field(..., description="List of error messages")
    warnings: List[str] = Field(..., description="List of warning messages")
    uploaded_at: Optional[str] = Field(None, description="Upload timestamp")
    started_at: Optional[str] = Field(None, description="Import start timestamp")
    completed_at: Optional[str] = Field(None, description="Import completion timestamp")
    estimated_completion: Optional[str] = Field(None, description="Estimated completion time")

class ImportPreviewRequest(BaseModel):
    field_mapping: Optional[Dict[str, str]] = Field(None, description="Custom field mapping for import")
    max_preview_records: int = Field(10, description="Maximum number of records to preview", ge=1, le=100)
    validation_level: str = Field("moderate", description="Validation strictness: strict, moderate, lenient")

class ImportPreviewRecord(BaseModel):
    row_number: int = Field(..., description="Row number in the source file")
    data: Dict[str, Any] = Field(..., description="Record data with mapped fields")
    validation_status: str = Field(..., description="Validation result: valid, warning, error")
    validation_messages: List[str] = Field(..., description="Validation messages for this record")
    is_duplicate: bool = Field(False, description="Whether this record appears to be a duplicate")
    suggested_action: str = Field(..., description="Recommended action: import, skip, merge, review")

class ImportValidationResult(BaseModel):
    total_records: int = Field(..., description="Total number of records validated")
    valid_records: int = Field(..., description="Number of valid records")
    warning_records: int = Field(..., description="Number of records with warnings")
    error_records: int = Field(..., description="Number of records with errors")
    validation_errors: List[str] = Field(..., description="List of validation error messages")
    field_mapping_issues: List[str] = Field(..., description="Issues with field mapping")

class ImportPreviewResponse(BaseModel):
    import_id: str = Field(..., description="Import job identifier")
    preview_records: List[ImportPreviewRecord] = Field(..., description="Sample records from the import")
    total_records: int = Field(..., description="Total number of records in the file")
    field_mapping: Dict[str, str] = Field(..., description="Suggested or confirmed field mapping")
    validation_results: ImportValidationResult = Field(..., description="Overall validation results")
    potential_duplicates: int = Field(..., description="Number of potential duplicate records")
    data_quality_issues: List[str] = Field(..., description="Data quality concerns identified")
    import_recommendations: List[str] = Field(..., description="Recommendations for successful import")
    estimated_duration: str = Field(..., description="Estimated time to complete import")

class ImportExecutionRequest(BaseModel):
    field_mapping: Dict[str, str] = Field(..., description="Field mapping for import")
    duplicate_handling: str = Field("skip", description="How to handle duplicates: skip, update, merge")
    validation_level: str = Field("moderate", description="Validation strictness: strict, moderate, lenient")
    rollback_on_error: bool = Field(True, description="Whether to rollback on error")
    error_threshold: int = Field(10, description="Maximum number of errors before stopping", ge=0, le=1000)
    notify_on_completion: bool = Field(True, description="Send notification when import completes")
    batch_size: int = Field(100, description="Number of records to process in each batch", ge=1, le=1000)

class ImportExecutionResponse(BaseModel):
    import_id: str = Field(..., description="Import job identifier")
    status: str = Field(..., description="Import status")
    message: str = Field(..., description="Execution status message")
    started_at: str = Field(..., description="Import start timestamp")
    execution_options: Dict[str, Any] = Field(..., description="Options used for execution")

class ImportRollbackRequest(BaseModel):
    rollback_type: str = Field(..., description="Type of rollback: soft_delete, hard_delete, deactivate")
    reason: str = Field(..., description="Reason for rollback", min_length=1, max_length=500)
    selective_criteria: Optional[Dict[str, Any]] = Field(None, description="Criteria for selective rollback")
    confirm_rollback: bool = Field(..., description="Confirmation that rollback is intended")

class ImportRollbackResponse(BaseModel):
    import_id: str = Field(..., description="Import job identifier")
    rollback_id: str = Field(..., description="Unique rollback operation identifier")
    status: str = Field(..., description="Rollback status")
    message: str = Field(..., description="Rollback status message")
    rollback_type: str = Field(..., description="Type of rollback being performed")
    started_at: str = Field(..., description="Rollback start timestamp")

class ImportHistoryItem(BaseModel):
    import_id: str = Field(..., description="Import job identifier")
    filename: str = Field(..., description="Original filename")
    source_type: str = Field(..., description="Import source type")
    import_type: str = Field(..., description="Type of data imported")
    status: str = Field(..., description="Final import status")
    total_records: int = Field(..., description="Total number of records")
    successful_imports: int = Field(..., description="Number of successful imports")
    failed_imports: int = Field(..., description="Number of failed imports")
    uploaded_at: str = Field(..., description="Upload timestamp")
    completed_at: Optional[str] = Field(None, description="Completion timestamp")
    uploaded_by: int = Field(..., description="User ID who uploaded the import")

class ImportHistoryResponse(BaseModel):
    imports: List[ImportHistoryItem] = Field(..., description="List of import jobs")
    total: int = Field(..., description="Total number of imports")
    page: int = Field(..., description="Current page number")
    page_size: int = Field(..., description="Records per page")
    total_pages: int = Field(..., description="Total number of pages")

# Forward reference updates
ServiceResponse.model_rebuild()


# Booking Rules Schemas
class BookingRuleBase(BaseModel):
    rule_name: str = Field(..., description="Unique name for the rule")
    rule_type: str = Field(..., description="Type of rule (e.g., max_advance_booking, min_duration)")
    rule_params: Dict[str, Any] = Field(..., description="Rule parameters as JSON")
    applies_to: str = Field("all", description="Who the rule applies to: all, service, barber, client_type")
    service_ids: Optional[List[int]] = Field(None, description="Service IDs if applies_to='service'")
    barber_ids: Optional[List[int]] = Field(None, description="Barber IDs if applies_to='barber'")
    client_types: Optional[List[str]] = Field(None, description="Client types if applies_to='client_type'")
    priority: int = Field(0, description="Rule priority (higher overrides lower)")
    is_active: bool = Field(True, description="Whether the rule is active")

class BookingRuleCreate(BookingRuleBase):
    pass

class BookingRuleUpdate(BaseModel):
    rule_name: Optional[str] = None
    rule_type: Optional[str] = None
    rule_params: Optional[Dict[str, Any]] = None
    applies_to: Optional[str] = None
    service_ids: Optional[List[int]] = None
    barber_ids: Optional[List[int]] = None
    client_types: Optional[List[str]] = None
    priority: Optional[int] = None
    is_active: Optional[bool] = None

class BookingRuleResponse(BookingRuleBase):
    id: int
    business_id: int
    created_at: datetime
    updated_at: datetime
    created_by_id: Optional[int] = None
    
    class Config:
        from_attributes = True

class ServiceBookingRuleBase(BaseModel):
    rule_type: str = Field(..., description="Type of service rule")
    min_age: Optional[int] = Field(None, description="Minimum age requirement")
    max_age: Optional[int] = Field(None, description="Maximum age limit")
    requires_consultation: bool = Field(False, description="Whether consultation is required")
    requires_patch_test: bool = Field(False, description="Whether patch test is required")
    patch_test_hours_before: int = Field(48, description="Hours before appointment patch test is required")
    max_bookings_per_day: Optional[int] = Field(None, description="Maximum bookings per day per client")
    min_days_between_bookings: Optional[int] = Field(None, description="Minimum days between bookings")
    blocked_days_of_week: Optional[List[int]] = Field(None, description="Blocked days (0=Monday, 6=Sunday)")
    required_service_ids: Optional[List[int]] = Field(None, description="Services that must be booked together")
    incompatible_service_ids: Optional[List[int]] = Field(None, description="Services that can't be booked together")
    message: Optional[str] = Field(None, description="Custom message when rule applies")
    is_active: bool = Field(True, description="Whether the rule is active")

class ServiceBookingRuleCreate(ServiceBookingRuleBase):
    pass

class ServiceBookingRuleUpdate(BaseModel):
    rule_type: Optional[str] = None
    min_age: Optional[int] = None
    max_age: Optional[int] = None
    requires_consultation: Optional[bool] = None
    requires_patch_test: Optional[bool] = None
    patch_test_hours_before: Optional[int] = None
    max_bookings_per_day: Optional[int] = None
    min_days_between_bookings: Optional[int] = None
    blocked_days_of_week: Optional[List[int]] = None
    required_service_ids: Optional[List[int]] = None
    incompatible_service_ids: Optional[List[int]] = None
    message: Optional[str] = None
    is_active: Optional[bool] = None

class ServiceBookingRuleResponse(ServiceBookingRuleBase):
    id: int
    service_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

# BookingValidationRequest/Response - Moved to end of file as aliases to Appointment schemas

# Stripe Connect Schemas
class StripeConnectOnboardingResponse(BaseModel):
    account_id: str
    onboarding_url: str
    message: str = "Complete your Stripe Connect onboarding to receive payouts"

class StripeConnectStatusResponse(BaseModel):
    connected: bool
    account_id: Optional[str] = None
    account_status: Optional[str] = None
    payouts_enabled: bool = False
    details_submitted: bool = False
    charges_enabled: bool = False
    onboarding_url: Optional[str] = None


# SMS Conversation Schemas - For Direct Customer Text Messaging
class SMSMessageBase(BaseModel):
    body: str = Field(..., description="The SMS message text content")

class SMSMessageCreate(SMSMessageBase):
    from_phone: str = Field(..., description="Business phone number sending the message")

class SMSMessageResponse(SMSMessageBase):
    id: int
    conversation_id: int
    direction: str = Field(..., description="'inbound' from customer or 'outbound' from business")
    from_phone: str = Field(..., description="Sender's phone number")
    to_phone: str = Field(..., description="Recipient's phone number")
    status: str = Field(..., description="Message delivery status")
    twilio_sid: Optional[str] = Field(None, description="Twilio message ID for tracking")
    sent_by_user_id: Optional[int] = Field(None, description="Which staff member sent the message")
    sent_at: Optional[datetime] = Field(None, description="When message was sent")
    delivered_at: Optional[datetime] = Field(None, description="When message was delivered")
    read_at: Optional[datetime] = Field(None, description="When business read incoming message")
    failed_at: Optional[datetime] = Field(None, description="When message failed to send")
    error_code: Optional[str] = Field(None, description="Error code if message failed")
    error_message: Optional[str] = Field(None, description="Error description if message failed")
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class SMSConversationBase(BaseModel):
    customer_phone: str = Field(..., description="Customer's actual phone number (E.164 format)")
    customer_name: Optional[str] = Field(None, description="Customer's name if known")

class SMSConversationCreate(SMSConversationBase):
    pass

class SMSConversationUpdate(BaseModel):
    customer_name: Optional[str] = None
    barber_id: Optional[int] = Field(None, description="Assign conversation to specific barber")
    status: Optional[str] = Field(None, description="active, archived, or blocked")
    tags: Optional[List[str]] = Field(None, description="Tags for organizing conversations")
    notes: Optional[str] = Field(None, description="Internal notes about customer")

class SMSConversationResponse(SMSConversationBase):
    id: int
    client_id: Optional[int] = Field(None, description="Linked client record if exists")
    barber_id: Optional[int] = Field(None, description="Assigned barber handling this conversation")
    status: str = Field(..., description="Conversation status: active, archived, blocked")
    last_message_at: Optional[datetime] = Field(None, description="When last message was sent/received")
    last_message_from: Optional[str] = Field(None, description="'customer' or 'business'")
    total_messages: int = Field(0, description="Total messages in conversation")
    unread_customer_messages: int = Field(0, description="Messages from customer not yet read")
    tags: Optional[List[str]] = Field(None, description="Organization tags")
    notes: Optional[str] = Field(None, description="Internal staff notes")
    created_at: datetime
    updated_at: datetime
    
    # Related data
    messages: Optional[List[SMSMessageResponse]] = Field(None, description="Recent messages in thread")
    client: Optional['Client'] = Field(None, description="Linked client profile")
    barber: Optional['User'] = Field(None, description="Assigned barber info")
    
    class Config:
        from_attributes = True


# Webhook schemas
class WebhookEndpointBase(BaseModel):
    url: str = Field(..., description="Webhook endpoint URL")
    name: str = Field(..., description="Friendly name for the webhook")
    description: Optional[str] = Field(None, description="Description of the webhook purpose")
    events: List[str] = Field(..., description="List of events to subscribe to")
    auth_type: str = Field("none", description="Authentication type: none, bearer, basic, hmac, api_key")
    auth_config: Optional[Dict[str, Any]] = Field(None, description="Authentication configuration")
    headers: Optional[Dict[str, str]] = Field(None, description="Additional custom headers")
    is_active: bool = Field(True, description="Whether the webhook is active")
    max_retries: int = Field(3, ge=0, le=10, description="Maximum number of retry attempts")
    retry_delay_seconds: int = Field(60, ge=10, le=3600, description="Delay between retries in seconds")
    timeout_seconds: int = Field(30, ge=5, le=120, description="Request timeout in seconds")


class WebhookEndpointCreate(WebhookEndpointBase):
    pass


class WebhookEndpointUpdate(BaseModel):
    url: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    events: Optional[List[str]] = None
    auth_type: Optional[str] = None
    auth_config: Optional[Dict[str, Any]] = None
    headers: Optional[Dict[str, str]] = None
    is_active: Optional[bool] = None
    max_retries: Optional[int] = Field(None, ge=0, le=10)
    retry_delay_seconds: Optional[int] = Field(None, ge=10, le=3600)
    timeout_seconds: Optional[int] = Field(None, ge=5, le=120)


class WebhookEndpointResponse(WebhookEndpointBase):
    id: str
    created_at: datetime
    updated_at: datetime
    total_deliveries: int = Field(0, description="Total webhook deliveries attempted")
    successful_deliveries: int = Field(0, description="Number of successful deliveries")
    failed_deliveries: int = Field(0, description="Number of failed deliveries")
    success_rate: float = Field(100.0, description="Success rate percentage")
    last_triggered_at: Optional[datetime] = Field(None, description="Last time webhook was triggered")
    last_success_at: Optional[datetime] = Field(None, description="Last successful delivery")
    last_failure_at: Optional[datetime] = Field(None, description="Last failed delivery")
    
    class Config:
        from_attributes = True


class WebhookLogResponse(BaseModel):
    id: str
    endpoint_id: str
    event_type: str = Field(..., description="Type of event that triggered the webhook")
    event_id: Optional[str] = Field(None, description="ID of the entity that triggered the event")
    status: str = Field(..., description="Delivery status: pending, success, failed, retrying")
    status_code: Optional[int] = Field(None, description="HTTP response status code")
    request_url: str = Field(..., description="URL the request was sent to")
    request_method: str = Field("POST", description="HTTP method used")
    request_headers: Optional[Dict[str, str]] = Field(None, description="Request headers sent")
    request_body: Optional[Dict[str, Any]] = Field(None, description="Request payload sent")
    response_headers: Optional[Dict[str, str]] = Field(None, description="Response headers received")
    response_body: Optional[str] = Field(None, description="Response body received")
    response_time_ms: Optional[int] = Field(None, description="Response time in milliseconds")
    error_message: Optional[str] = Field(None, description="Error message if delivery failed")
    retry_count: int = Field(0, description="Number of retry attempts")
    next_retry_at: Optional[datetime] = Field(None, description="When the next retry is scheduled")
    created_at: datetime
    delivered_at: Optional[datetime] = Field(None, description="When the webhook was delivered")
    completed_at: Optional[datetime] = Field(None, description="When processing completed")
    
    class Config:
        from_attributes = True


class WebhookTestRequest(BaseModel):
    event_type: str = Field(..., description="Event type to test")


class WebhookListParams(BaseModel):
    is_active: Optional[bool] = None
    event_type: Optional[str] = None
    skip: int = Field(0, ge=0)
    limit: int = Field(100, ge=1, le=100)


# Appointment schemas - Consistent naming to match database model
# These provide standardized "Appointment" terminology instead of mixed "Booking" terminology

class AppointmentCreate(BaseModel):
    """Create a new appointment - standardized schema matching database model"""
    date: Date
    time: str = Field(..., pattern="^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$")  # HH:MM format
    service: str
    notes: Optional[str] = None
    barber_id: Optional[int] = None
    
    @validator('service')
    def validate_service(cls, v):
        valid_services = ["Haircut", "Shave", "Haircut & Shave"]
        if v not in valid_services:
            raise ValueError(f"Service must be one of: {', '.join(valid_services)}")
        return v

class QuickAppointmentCreate(BaseModel):
    """Quick appointment creation - standardized schema"""
    service: str = Field(..., description="Service type for the appointment", example="Haircut")
    notes: Optional[str] = Field(None, description="Optional special instructions or notes", example="Please use scissors only")
    
    @validator('service')
    def validate_service(cls, v):
        valid_services = ["Haircut", "Shave", "Haircut & Shave"]
        if v not in valid_services:
            raise ValueError(f"Service must be one of: {', '.join(valid_services)}")
        return v

class AppointmentResponse(BaseModel):
    """Appointment response - matches database Appointment model fields"""
    id: int
    user_id: Optional[int] = None
    barber_id: Optional[int] = None
    client_id: Optional[int] = None
    service_id: Optional[int] = None
    service_name: str
    start_time: datetime
    duration_minutes: int
    price: float
    status: str
    notes: Optional[str] = None
    recurring_pattern_id: Optional[int] = None
    google_event_id: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

class AppointmentListResponse(BaseModel):
    """List of appointments response"""
    appointments: List[AppointmentResponse]
    total: int

class AppointmentUpdate(BaseModel):
    """Update existing appointment - standardized schema"""
    date: Optional[Date] = None
    time: Optional[str] = Field(None, pattern="^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$")
    service: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None
    
    @validator('service')
    def validate_service(cls, v):
        if v is not None:
            valid_services = ["Haircut", "Shave", "Haircut & Shave"]
            if v not in valid_services:
                raise ValueError(f"Service must be one of: {', '.join(valid_services)}")
        return v
    
    @validator('status')
    def validate_status(cls, v):
        if v is not None:
            valid_statuses = ["pending", "confirmed", "cancelled", "completed", "no_show"]
            if v not in valid_statuses:
                raise ValueError(f"Status must be one of: {', '.join(valid_statuses)}")
        return v

class AppointmentReschedule(BaseModel):
    """Reschedule appointment to new date/time"""
    date: Date
    time: str = Field(..., pattern="^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$")

class AppointmentValidationRequest(BaseModel):
    """Request validation for appointment creation/updates"""
    service_id: Optional[int] = None
    barber_id: Optional[int] = None
    appointment_date: Date = Field(..., description="Date of the appointment")
    appointment_time: Time = Field(..., description="Time of the appointment")
    duration_minutes: int = Field(..., description="Duration in minutes")
    client_id: Optional[int] = None

class AppointmentValidationResponse(BaseModel):
    """Response for appointment validation"""
    is_valid: bool = Field(..., description="Whether the appointment is valid")
    violations: List[str] = Field(..., description="List of rule violations")
    appointment_allowed: bool = Field(..., description="Whether appointment can proceed")

# Enhanced appointment creation with full options
class EnhancedAppointmentCreate(BaseModel):
    """Enhanced appointment creation with all available options"""
    service_id: Optional[int] = Field(None, description="Service ID from service catalog")
    service_name: Optional[str] = Field(None, description="Service name (fallback if service_id not provided)")
    barber_id: Optional[int] = Field(None, description="Preferred barber ID")
    client_id: Optional[int] = Field(None, description="Client ID for barber-created appointments")
    appointment_date: Date = Field(..., description="Date of the appointment")
    appointment_time: str = Field(..., pattern="^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$", description="Time in HH:MM format")
    duration_minutes: Optional[int] = Field(None, description="Custom duration (overrides service default)")
    price: Optional[float] = Field(None, description="Custom price (overrides service default)")
    notes: Optional[str] = Field(None, description="Special instructions or notes")
    buffer_time_before: Optional[int] = Field(0, description="Buffer time before appointment (minutes)")
    buffer_time_after: Optional[int] = Field(0, description="Buffer time after appointment (minutes)")
    timezone: Optional[str] = Field(None, description="Client timezone for time conversion")

# Legacy Booking schemas - Deprecated but maintained for backward compatibility
# TODO: Remove these after frontend migration to Appointment schemas
BookingCreate = AppointmentCreate  # Alias for backward compatibility
QuickBookingCreate = QuickAppointmentCreate  # Alias for backward compatibility
BookingResponse = AppointmentResponse  # Alias for backward compatibility
BookingListResponse = AppointmentListResponse  # Alias for backward compatibility
BookingUpdate = AppointmentUpdate  # Alias for backward compatibility
BookingReschedule = AppointmentReschedule  # Alias for backward compatibility
BookingValidationRequest = AppointmentValidationRequest  # Alias for backward compatibility
BookingValidationResponse = AppointmentValidationResponse  # Alias for backward compatibility
EnhancedBookingCreate = EnhancedAppointmentCreate  # Alias for backward compatibility

# Guest booking schemas for public booking API
class GuestInfo(BaseModel):
    """Guest contact information for bookings"""
    first_name: str = Field(..., min_length=1, max_length=50)
    last_name: str = Field(..., min_length=1, max_length=50)
    email: EmailStr
    phone: Optional[str] = Field(None, pattern=r'^\+?[\d\s\-\(\)]+$')

class GuestBookingCreate(BaseModel):
    """Create booking for guest user (no authentication required)"""
    date: Date = Field(..., description="Booking date")
    time: str = Field(..., pattern="^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$", description="Time in HH:MM format")
    service: str = Field(..., description="Service name")
    guest_info: GuestInfo = Field(..., description="Guest contact information")
    notes: Optional[str] = Field(None, max_length=500, description="Additional notes")
    timezone: Optional[str] = Field(None, description="Guest timezone")
    captcha_token: Optional[str] = Field(None, description="reCAPTCHA token for verification")

class GuestQuickBookingCreate(BaseModel):
    """Create quick booking for guest user (next available slot)"""
    service: str = Field(..., description="Service name")
    guest_info: GuestInfo = Field(..., description="Guest contact information")
    notes: Optional[str] = Field(None, max_length=500, description="Additional notes")
    timezone: Optional[str] = Field(None, description="Guest timezone")
    captcha_token: Optional[str] = Field(None, description="reCAPTCHA token for verification")

class GuestBookingResponse(BaseModel):
    """Response for guest booking creation"""
    id: int
    date: Date
    time: str
    service: str
    guest_name: str
    guest_email: str
    guest_phone: Optional[str] = None
    notes: Optional[str] = None
    status: str
    created_at: datetime
    booking_reference: Optional[str] = None
    
    class Config:
        from_attributes = True

# Marketing Suite Schemas
class MarketingCampaignCreate(BaseModel):
    """Create a new marketing campaign"""
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    campaign_type: str = Field(..., description="email or sms")
    template_id: Optional[int] = Field(None, description="Marketing template to use")
    subject: Optional[str] = Field(None, description="Email subject (required for email campaigns)")
    content: str = Field(..., description="Campaign content (plain text or HTML for email)")
    recipient_list_id: Optional[int] = Field(None, description="Contact list to send to")
    recipient_segment_id: Optional[int] = Field(None, description="Segment to send to")
    scheduled_for: Optional[datetime] = Field(None, description="Schedule for future sending")
    tags: Optional[List[str]] = Field(default_factory=list)
    
    @validator('campaign_type')
    def validate_campaign_type(cls, v):
        if v not in ['email', 'sms']:
            raise ValueError('Campaign type must be email or sms')
        return v
    
    @validator('subject')
    def validate_subject(cls, v, values):
        if values.get('campaign_type') == 'email' and not v:
            raise ValueError('Subject is required for email campaigns')
        return v

class MarketingCampaignUpdate(BaseModel):
    """Update a marketing campaign"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    template_id: Optional[int] = None
    subject: Optional[str] = None
    content: Optional[str] = None
    recipient_list_id: Optional[int] = None
    recipient_segment_id: Optional[int] = None
    scheduled_for: Optional[datetime] = None
    tags: Optional[List[str]] = None

class MarketingCampaignResponse(BaseModel):
    """Marketing campaign response"""
    id: int
    name: str
    description: Optional[str] = None
    campaign_type: str
    template_id: Optional[int] = None
    subject: Optional[str] = None
    content: str
    recipient_list_id: Optional[int] = None
    recipient_segment_id: Optional[int] = None
    status: str  # draft, scheduled, sending, sent, failed
    scheduled_for: Optional[datetime] = None
    sent_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    created_by_id: int
    tags: List[str] = []
    
    # Analytics fields
    total_recipients: int = 0
    sent_count: int = 0
    delivered_count: int = 0
    opened_count: int = 0
    clicked_count: int = 0
    bounced_count: int = 0
    unsubscribed_count: int = 0
    
    class Config:
        from_attributes = True

class MarketingCampaignListResponse(BaseModel):
    """List response for marketing campaigns"""
    campaigns: List[MarketingCampaignResponse]
    total: int
    skip: int
    limit: int

class MarketingTemplateCreate(BaseModel):
    """Create a new marketing template"""
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    template_type: str = Field(..., description="email or sms")
    category: Optional[str] = Field(None, description="Template category")
    subject: Optional[str] = Field(None, description="Email subject template")
    content: str = Field(..., description="Template content with variables")
    variables: Optional[List[str]] = Field(default_factory=list, description="Available template variables")
    preview_data: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Sample data for preview")
    
    @validator('template_type')
    def validate_template_type(cls, v):
        if v not in ['email', 'sms']:
            raise ValueError('Template type must be email or sms')
        return v

class MarketingTemplateUpdate(BaseModel):
    """Update a marketing template"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    category: Optional[str] = None
    subject: Optional[str] = None
    content: Optional[str] = None
    variables: Optional[List[str]] = None
    preview_data: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None

class MarketingTemplateResponse(BaseModel):
    """Marketing template response"""
    id: int
    name: str
    description: Optional[str] = None
    template_type: str
    category: Optional[str] = None
    subject: Optional[str] = None
    content: str
    variables: List[str] = []
    preview_data: Dict[str, Any] = {}
    is_active: bool
    created_at: datetime
    updated_at: datetime
    created_by_id: int
    usage_count: int = 0
    
    class Config:
        from_attributes = True

class ContactListCreate(BaseModel):
    """Create a new contact list"""
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)

class ContactListResponse(BaseModel):
    """Contact list response"""
    id: int
    name: str
    description: Optional[str] = None
    contact_count: int = 0
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class ContactSegmentCreate(BaseModel):
    """Create a new contact segment with dynamic criteria"""
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    criteria: Dict[str, Any] = Field(..., description="Segment criteria as JSON")
    
    @validator('criteria')
    def validate_criteria(cls, v):
        # Validate that criteria has required structure
        if not isinstance(v, dict):
            raise ValueError('Criteria must be a dictionary')
        return v

class ContactSegmentResponse(BaseModel):
    """Contact segment response"""
    id: int
    name: str
    description: Optional[str] = None
    criteria: Dict[str, Any]
    contact_count: int = 0
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class CampaignSendRequest(BaseModel):
    """Request to send a campaign"""
    test_mode: bool = Field(False, description="Send as test to limited recipients")
    test_recipients: Optional[List[str]] = Field(None, description="Test recipient emails/phones")

class ContactImportResponse(BaseModel):
    """Response for contact import operation"""
    imported: int
    updated: int
    skipped: int
    errors: List[Dict[str, str]] = []
    total_processed: int

class ContactExportRequest(BaseModel):
    """Request to export contacts"""
    list_id: Optional[int] = None
    segment_id: Optional[int] = None
    fields: List[str] = Field(default_factory=lambda: ['name', 'email', 'phone', 'subscribed'])

class ContactBulkActionRequest(BaseModel):
    """Bulk action on contacts"""
    contact_ids: List[int] = Field(..., min_items=1)
    action: str = Field(..., description="subscribe, unsubscribe, add_to_list, remove_from_list, delete")
    action_data: Optional[Dict[str, Any]] = Field(None, description="Additional data for action")
    
    @validator('action')
    def validate_action(cls, v):
        valid_actions = ['subscribe', 'unsubscribe', 'add_to_list', 'remove_from_list', 'delete']
        if v not in valid_actions:
            raise ValueError(f'Action must be one of {valid_actions}')
        return v

class CampaignAnalyticsResponse(BaseModel):
    """Detailed analytics for a campaign"""
    campaign_id: int
    campaign_name: str
    campaign_type: str
    status: str
    sent_at: Optional[datetime] = None
    
    # Delivery metrics
    total_recipients: int
    sent_count: int
    delivered_count: int
    delivery_rate: float
    
    # Engagement metrics
    opened_count: int
    open_rate: float
    clicked_count: int
    click_rate: float
    click_to_open_rate: float
    
    # Negative metrics
    bounced_count: int
    bounce_rate: float
    unsubscribed_count: int
    unsubscribe_rate: float
    spam_reports: int
    
    # Time-based metrics
    first_open_time: Optional[datetime] = None
    last_open_time: Optional[datetime] = None
    average_time_to_open: Optional[float] = None  # in hours
    
    # Device/client breakdown (for email)
    device_stats: Optional[Dict[str, int]] = None
    client_stats: Optional[Dict[str, int]] = None
    
    # Geographic data
    location_stats: Optional[Dict[str, int]] = None
    
    # Link performance (for email)
    link_clicks: Optional[List[Dict[str, Any]]] = None
    
    class Config:
        from_attributes = True

class MarketingUsageResponse(BaseModel):
    """Marketing usage statistics"""
    period: str
    start_date: datetime
    end_date: datetime
    
    # Email usage
    emails_sent: int
    email_limit: Optional[int] = None
    email_usage_percentage: Optional[float] = None
    
    # SMS usage
    sms_sent: int
    sms_limit: Optional[int] = None
    sms_usage_percentage: Optional[float] = None
    
    # Campaign stats
    campaigns_created: int
    campaigns_sent: int
    
    # Contact stats
    total_contacts: int
    new_contacts: int
    unsubscribed_contacts: int
    
    # Cost estimation (if applicable)
    estimated_cost: Optional[float] = None
    cost_breakdown: Optional[Dict[str, float]] = None
    
    class Config:
        from_attributes = True

# Notification Preferences Schemas
class EmailPreferences(BaseModel):
    """Email notification preferences"""
    appointment_confirmation: Optional[bool] = True
    appointment_reminder: Optional[bool] = True
    appointment_changes: Optional[bool] = True
    appointment_cancellation: Optional[bool] = True
    payment_confirmation: Optional[bool] = True
    payment_failed: Optional[bool] = True
    marketing: Optional[bool] = False
    news_updates: Optional[bool] = False
    promotional: Optional[bool] = False
    system_alerts: Optional[bool] = True
    frequency: Optional[str] = "immediate"  # immediate, daily, weekly, never


class SMSPreferences(BaseModel):
    """SMS notification preferences"""
    appointment_confirmation: Optional[bool] = True
    appointment_reminder: Optional[bool] = True
    appointment_changes: Optional[bool] = True
    appointment_cancellation: Optional[bool] = True
    payment_confirmation: Optional[bool] = False
    payment_failed: Optional[bool] = True
    marketing: Optional[bool] = False
    promotional: Optional[bool] = False
    system_alerts: Optional[bool] = False
    frequency: Optional[str] = "immediate"  # immediate, daily, never


class AdvancedSettings(BaseModel):
    """Advanced notification settings"""
    reminder_hours: Optional[List[int]] = [24, 2]
    quiet_hours_enabled: Optional[bool] = False
    quiet_hours_start: Optional[str] = "22:00"
    quiet_hours_end: Optional[str] = "08:00"
    weekend_notifications: Optional[bool] = True


class ComplianceInfo(BaseModel):
    """GDPR compliance information"""
    consent_given_at: Optional[datetime] = None
    data_processing_consent: Optional[bool] = True
    marketing_consent: Optional[bool] = False
    last_updated_at: Optional[datetime] = None


class NotificationPreferencesResponse(BaseModel):
    """Complete notification preferences response"""
    user_id: int
    email_enabled: bool
    sms_enabled: bool
    timezone: str
    email_preferences: EmailPreferences
    sms_preferences: SMSPreferences
    advanced_settings: AdvancedSettings
    compliance: ComplianceInfo

    class Config:
        from_attributes = True


class NotificationPreferencesUpdate(BaseModel):
    """Update notification preferences request"""
    email_enabled: Optional[bool] = None
    sms_enabled: Optional[bool] = None
    timezone: Optional[str] = None
    email_preferences: Optional[EmailPreferences] = None
    sms_preferences: Optional[SMSPreferences] = None
    advanced_settings: Optional[AdvancedSettings] = None
    marketing_consent: Optional[bool] = None
    data_processing_consent: Optional[bool] = None

    @validator('timezone')
    def validate_timezone(cls, v):
        if v is not None:
            try:
                pytz.timezone(v)
            except pytz.exceptions.UnknownTimeZoneError:
                raise ValueError(f'Invalid timezone: {v}')
        return v

    @validator('email_preferences')
    def validate_email_frequency(cls, v):
        if v and hasattr(v, 'frequency') and v.frequency:
            valid_frequencies = ['immediate', 'daily', 'weekly', 'never']
            if v.frequency not in valid_frequencies:
                raise ValueError(f'Invalid email frequency. Must be one of: {valid_frequencies}')
        return v

    @validator('sms_preferences')
    def validate_sms_frequency(cls, v):
        if v and hasattr(v, 'frequency') and v.frequency:
            valid_frequencies = ['immediate', 'daily', 'never']
            if v.frequency not in valid_frequencies:
                raise ValueError(f'Invalid SMS frequency. Must be one of: {valid_frequencies}')
        return v


class UnsubscribeRequest(BaseModel):
    """Unsubscribe request"""
    token: str
    unsubscribe_type: str = "marketing_only"  # marketing_only, email_all, sms_all, all

    @validator('unsubscribe_type')
    def validate_unsubscribe_type(cls, v):
        valid_types = ['marketing_only', 'email_all', 'sms_all', 'all']
        if v not in valid_types:
            raise ValueError(f'Invalid unsubscribe type. Must be one of: {valid_types}')
        return v


class UnsubscribeResponse(BaseModel):
    """Unsubscribe response"""
    status: str
    message: str
    unsubscribe_type: str


class NotificationChannelResponse(BaseModel):
    """Notification channel information"""
    name: str
    display_name: str
    description: Optional[str] = None
    supports_marketing: bool
    supports_transactional: bool
    requires_consent: bool


class PreferenceAuditLog(BaseModel):
    """Preference change audit log entry"""
    field_changed: str
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    change_reason: str
    changed_at: datetime
    changed_by_ip: Optional[str] = None

    class Config:
        from_attributes = True


# ================================================================================
# EMAIL ANALYTICS SCHEMAS
# ================================================================================

class EmailMetricsResponse(BaseModel):
    """Email performance metrics response"""
    period: Dict[str, str]
    counts: Dict[str, int]
    rates: Dict[str, float]
    total_sent: int
    total_delivered: int

    class Config:
        from_attributes = True


class EmailCampaignResponse(BaseModel):
    """Email campaign performance response"""
    id: int
    name: str
    template_name: str
    subject: str
    sent_count: int
    delivered_count: int
    opened_count: int
    unique_opens: int
    clicked_count: int
    unique_clicks: int
    bounced_count: int
    unsubscribed_count: int
    delivery_rate: float
    open_rate: float
    click_rate: float
    bounce_rate: float
    unsubscribe_rate: float
    created_at: str
    updated_at: Optional[str] = None

    class Config:
        from_attributes = True


class EmailEngagementResponse(BaseModel):
    """User email engagement response"""
    user_id: int
    engagement_score: float
    emails_received: int
    emails_opened: int
    emails_clicked: int
    last_activity: Optional[str] = None

    class Config:
        from_attributes = True


class TopClickedUrl(BaseModel):
    """Top clicked URL information"""
    url: str
    clicks: int
    unique_clicks: int


class TopClickedUrlsResponse(BaseModel):
    """Top clicked URLs response"""
    urls: List[TopClickedUrl]

    class Config:
        from_attributes = True


# Organization Schemas

class BillingPlan(str, Enum):
    INDIVIDUAL = "individual"
    STUDIO = "studio"
    SALON = "salon"
    ENTERPRISE = "enterprise"

class UserRole(str, Enum):
    OWNER = "owner"
    MANAGER = "manager"
    BARBER = "barber"
    RECEPTIONIST = "receptionist"
    VIEWER = "viewer"

class OrganizationType(str, Enum):
    HEADQUARTERS = "headquarters"
    LOCATION = "location"
    FRANCHISE = "franchise"
    INDEPENDENT = "independent"

class OrganizationBase(BaseModel):
    """Base organization schema"""
    name: str = Field(..., min_length=1, max_length=255)
    slug: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    street_address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    country: str = "US"
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    website: Optional[str] = None
    timezone: str = "UTC"
    business_hours: Optional[Dict[str, Any]] = None

class OrganizationCreate(OrganizationBase):
    """Schema for creating an organization"""
    chairs_count: int = Field(1, ge=1, le=1000)
    billing_plan: BillingPlan = BillingPlan.INDIVIDUAL
    organization_type: OrganizationType = OrganizationType.INDEPENDENT
    parent_organization_id: Optional[int] = None
    billing_contact_email: Optional[EmailStr] = None
    tax_id: Optional[str] = None

class OrganizationUpdate(BaseModel):
    """Schema for updating an organization"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    street_address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    country: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    website: Optional[str] = None
    timezone: Optional[str] = None
    business_hours: Optional[Dict[str, Any]] = None
    chairs_count: Optional[int] = Field(None, ge=1, le=1000)
    billing_plan: Optional[BillingPlan] = None
    billing_contact_email: Optional[EmailStr] = None
    tax_id: Optional[str] = None
    monthly_revenue_limit: Optional[float] = Field(None, ge=0)
    features_enabled: Optional[Dict[str, Any]] = None

class OrganizationResponse(OrganizationBase):
    """Schema for organization response"""
    id: int
    chairs_count: int
    billing_plan: str
    subscription_status: str
    organization_type: str
    parent_organization_id: Optional[int] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    # Computed fields
    total_chairs_count: Optional[int] = None
    is_enterprise: Optional[bool] = None
    enabled_features: Optional[Dict[str, Any]] = None
    
    # Billing fields
    monthly_revenue_limit: Optional[float] = None
    billing_contact_email: Optional[str] = None
    tax_id: Optional[str] = None
    stripe_account_id: Optional[str] = None

    class Config:
        from_attributes = True

class UserOrganizationBase(BaseModel):
    """Base user-organization relationship schema"""
    role: UserRole = UserRole.BARBER
    is_primary: bool = False
    permissions: Optional[Dict[str, Any]] = None
    can_manage_billing: bool = False
    can_manage_staff: bool = False
    can_view_analytics: bool = True

class UserOrganizationCreate(UserOrganizationBase):
    """Schema for creating user-organization relationship"""
    user_id: int
    organization_id: int

class UserOrganizationUpdate(BaseModel):
    """Schema for updating user-organization relationship"""
    role: Optional[UserRole] = None
    is_primary: Optional[bool] = None
    permissions: Optional[Dict[str, Any]] = None
    can_manage_billing: Optional[bool] = None
    can_manage_staff: Optional[bool] = None
    can_view_analytics: Optional[bool] = None

class UserOrganizationResponse(UserOrganizationBase):
    """Schema for user-organization response"""
    id: int
    user_id: int
    organization_id: int
    joined_at: datetime
    created_at: datetime
    last_accessed_at: Optional[datetime] = None
    
    # Related data
    organization: Optional[OrganizationResponse] = None

    class Config:
        from_attributes = True

class OrganizationWithUsers(OrganizationResponse):
    """Organization with associated users"""
    user_organizations: List[UserOrganizationResponse] = []
    total_users: Optional[int] = None

class UserWithOrganizations(BaseModel):
    """User with their organizations"""
    id: int
    email: str
    name: str
    organizations: List[UserOrganizationResponse] = []
    primary_organization: Optional[OrganizationResponse] = None

    class Config:
        from_attributes = True

class OrganizationStatsResponse(BaseModel):
    """Organization statistics response"""
    organization_id: int
    total_chairs: int
    active_staff: int
    monthly_appointments: int
    monthly_revenue: float
    trial_days_remaining: Optional[int] = None
    subscription_status: str
    enabled_features: Dict[str, Any]

class BillingPlanFeatures(BaseModel):
    """Features available for each billing plan"""
    appointments: bool = True
    payments: bool = True
    analytics: bool = True
    sms_notifications: bool = True
    email_marketing: bool = False
    google_calendar: bool = True
    staff_management: bool = False
    inventory_management: bool = False
    multi_location: bool = False
    api_access: bool = False
    white_label: bool = False
    max_staff: Optional[int] = None

# Billing schemas
class BillingPlanTier(BaseModel):
    """Pricing tier for billing plans"""
    chairs_from: int
    chairs_to: Optional[int] = None  # None means unlimited
    price_per_chair_monthly: float
    price_per_chair_yearly: float  # Yearly price per chair (with discount)

class BillingPlanResponse(BaseModel):
    """Available billing plans with pricing tiers"""
    plan_name: str
    base_features: BillingPlanFeatures
    pricing_tiers: List[BillingPlanTier]
    trial_days: int = 14
    minimum_chairs: int = 1
    yearly_discount_percentage: float = 20.0  # 20% discount for yearly billing

class PriceCalculationRequest(BaseModel):
    """Request body for price calculation"""
    chairs_count: int = Field(..., ge=1, description="Number of chairs to calculate pricing for")
    billing_cycle: str = Field("monthly", pattern="^(monthly|yearly)$", description="Billing cycle: monthly or yearly")
    
    @validator('chairs_count')
    def validate_chairs(cls, v):
        if v < 1:
            raise ValueError('Chairs count must be at least 1')
        if v > 1000:
            raise ValueError('Chairs count cannot exceed 1000')
        return v

class PriceCalculationResponse(BaseModel):
    """Response with calculated pricing"""
    chairs_count: int
    billing_cycle: str
    price_per_chair: float
    total_monthly: float
    total_yearly: float
    savings_yearly: float  # Amount saved with yearly billing
    applicable_tier: BillingPlanTier
    features_included: BillingPlanFeatures

class BillingContact(BaseModel):
    """Billing contact information"""
    name: str
    email: EmailStr
    phone: Optional[str] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    country: str = "US"

class SubscriptionCreateRequest(BaseModel):
    """Create subscription request"""
    organization_id: int
    chairs_count: int = Field(..., ge=1, description="Number of chairs for subscription")
    billing_cycle: str = Field("monthly", pattern="^(monthly|yearly)$")
    payment_method_id: str  # Stripe payment method ID
    billing_contact: BillingContact
    promo_code: Optional[str] = None
    
    @validator('chairs_count')
    def validate_chairs(cls, v):
        if v < 1:
            raise ValueError('Chairs count must be at least 1')
        return v

class SubscriptionUpdateRequest(BaseModel):
    """Update subscription request"""
    chairs_count: Optional[int] = Field(None, ge=1, description="New number of chairs")
    billing_cycle: Optional[str] = Field(None, pattern="^(monthly|yearly)$")
    payment_method_id: Optional[str] = None  # Update payment method
    billing_contact: Optional[BillingContact] = None
    
    @validator('chairs_count')
    def validate_chairs(cls, v):
        if v is not None and v < 1:
            raise ValueError('Chairs count must be at least 1')
        return v

class SubscriptionResponse(BaseModel):
    """Full subscription details"""
    id: int
    organization_id: int
    stripe_subscription_id: str
    stripe_customer_id: str
    status: str  # active, trialing, past_due, canceled, incomplete
    chairs_count: int
    billing_cycle: str
    current_period_start: datetime
    current_period_end: datetime
    trial_end: Optional[datetime] = None
    trial_days_remaining: Optional[int] = None
    cancel_at_period_end: bool = False
    canceled_at: Optional[datetime] = None
    price_per_chair: float
    total_monthly: float
    total_yearly: float
    next_billing_date: datetime
    payment_method_last4: Optional[str] = None
    payment_method_brand: Optional[str] = None
    billing_contact: BillingContact
    features_enabled: BillingPlanFeatures
    created_at: datetime
    updated_at: datetime
    
    @validator('trial_days_remaining')
    def calculate_trial_days(cls, v, values):
        if 'trial_end' in values and values['trial_end']:
            days_remaining = (values['trial_end'] - datetime.utcnow()).days
            return max(0, days_remaining)
        return v

    class Config:
        from_attributes = True

class SubscriptionCancelRequest(BaseModel):
    """Cancel subscription request"""
    organization_id: int
    reason: Optional[str] = None
    feedback: Optional[str] = None
    cancel_immediately: bool = False  # If False, cancels at end of billing period

class SubscriptionCancelResponse(BaseModel):
    """Response after canceling subscription"""
    message: str
    subscription_id: int
    cancel_at: datetime  # When the subscription will be canceled
    refund_amount: Optional[float] = None  # If any refund is due

class PaymentHistoryItem(BaseModel):
    """Individual payment history item"""
    id: str  # Stripe payment intent ID
    amount: float
    currency: str = "usd"
    status: str  # succeeded, failed, pending
    description: str
    created_at: datetime
    invoice_url: Optional[str] = None

class PaymentHistoryResponse(BaseModel):
    """Payment history for organization"""
    organization_id: int
    payments: List[PaymentHistoryItem]
    total_paid: float
    next_payment_date: Optional[datetime] = None
    next_payment_amount: Optional[float] = None

class TrialStatusResponse(BaseModel):
    """Trial status information"""
    organization_id: int
    is_in_trial: bool
    trial_start_date: datetime
    trial_end_date: datetime
    trial_days_remaining: int
    features_available: BillingPlanFeatures
    requires_payment_method: bool
    
    @validator('trial_days_remaining')
    def calculate_remaining_days(cls, v, values):
        if 'trial_end_date' in values:
            days_remaining = (values['trial_end_date'] - datetime.utcnow()).days
            return max(0, days_remaining)
        return v

# ============= Location Schemas (Using Organization Model) =============

class LocationResponse(BaseModel):
    """Response model for location (organization) data"""
    id: int
    name: str
    slug: str
    street_address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    country: str = 'US'
    phone: Optional[str] = None
    email: Optional[str] = None
    timezone: str = 'UTC'
    business_hours: Optional[dict] = None
    chairs_count: int = 1
    organization_type: str
    parent_organization_id: Optional[int] = None
    is_active: bool = True
    
    # Computed fields
    full_address: Optional[str] = None
    
    class Config:
        from_attributes = True
        
    @validator('full_address', always=True)
    def compute_full_address(cls, v, values):
        """Compute full address from components"""
        parts = []
        if values.get('street_address'):
            parts.append(values['street_address'])
        if values.get('city'):
            parts.append(values['city'])
        if values.get('state') and values.get('zip_code'):
            parts.append(f"{values['state']} {values['zip_code']}")
        elif values.get('state'):
            parts.append(values['state'])
        elif values.get('zip_code'):
            parts.append(values['zip_code'])
        if values.get('country') and values['country'] != 'US':
            parts.append(values['country'])
        return ', '.join(parts) if parts else None

class LocationListResponse(BaseModel):
    """Response for location list with metadata"""
    locations: List[LocationResponse]
    total: int
    has_multiple_locations: bool
    headquarters: Optional[LocationResponse] = None

class LocationCreate(BaseModel):
    """Schema for creating a location (simplified organization)"""
    name: str
    street_address: str
    city: str
    state: str
    zip_code: str
    country: str = 'US'
    phone: Optional[str] = None
    email: Optional[str] = None
    timezone: str = 'America/New_York'
    business_hours: Optional[dict] = None
    chairs_count: int = Field(1, ge=1)
    parent_organization_id: Optional[int] = None

class LocationUpdate(BaseModel):
    """Schema for updating a location"""
    name: Optional[str] = None
    street_address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    country: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    timezone: Optional[str] = None
    business_hours: Optional[dict] = None
    chairs_count: Optional[int] = Field(None, ge=1)
    is_active: Optional[bool] = None

# Model rebuilds to resolve forward references
SMSConversationResponse.model_rebuild()
OrganizationResponse.model_rebuild()
UserOrganizationResponse.model_rebuild()