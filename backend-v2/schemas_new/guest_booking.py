"""Pydantic schemas for guest booking functionality."""

from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, List
from datetime import datetime
import re


class GuestBookingBase(BaseModel):
    """Base schema for guest booking data."""
    guest_name: str = Field(..., min_length=2, max_length=100)
    guest_email: EmailStr
    guest_phone: str = Field(..., min_length=10, max_length=20)
    service_id: int
    appointment_datetime: datetime
    appointment_timezone: str = Field(..., min_length=1, max_length=50)
    notes: Optional[str] = Field(None, max_length=500)
    marketing_consent: bool = False
    reminder_preference: str = Field("email", pattern="^(email|sms|both|none)$")
    
    @validator('guest_phone')
    def validate_phone(cls, v):
        """Validate phone number format."""
        # Remove all non-numeric characters
        phone_digits = re.sub(r'\D', '', v)
        
        # Check if it's a valid phone number (10-15 digits)
        if len(phone_digits) < 10 or len(phone_digits) > 15:
            raise ValueError('Phone number must be between 10 and 15 digits')
        
        return v
    
    @validator('appointment_datetime')
    def validate_future_datetime(cls, v):
        """Ensure appointment is in the future."""
        if v <= datetime.utcnow():
            raise ValueError('Appointment datetime must be in the future')
        return v


class GuestBookingCreate(GuestBookingBase):
    """Schema for creating a guest booking."""
    barber_id: Optional[int] = None  # Optional if organization has default barber
    referral_source: Optional[str] = None
    booking_page_url: Optional[str] = None
    

class GuestBookingUpdate(BaseModel):
    """Schema for updating a guest booking."""
    appointment_datetime: Optional[datetime] = None
    appointment_timezone: Optional[str] = None
    notes: Optional[str] = Field(None, max_length=500)
    reminder_preference: Optional[str] = Field(None, pattern="^(email|sms|both|none)$")
    
    @validator('appointment_datetime')
    def validate_future_datetime(cls, v):
        """Ensure appointment is in the future."""
        if v and v <= datetime.utcnow():
            raise ValueError('Appointment datetime must be in the future')
        return v


class GuestBookingResponse(BaseModel):
    """Schema for guest booking response."""
    id: int
    confirmation_code: str
    guest_name: str
    guest_email: str
    guest_phone: str
    organization_id: int
    organization_name: str
    barber_id: Optional[int]
    barber_name: Optional[str]
    service_id: int
    service_name: str
    appointment_datetime: datetime
    appointment_timezone: str
    duration_minutes: int
    service_price: float
    deposit_amount: float
    status: str
    payment_status: str
    notes: Optional[str]
    marketing_consent: bool
    reminder_preference: str
    created_at: datetime
    
    class Config:
        from_attributes = True


class GuestBookingLookup(BaseModel):
    """Schema for looking up a guest booking."""
    confirmation_code: str
    email_or_phone: str


class PublicAvailabilitySlot(BaseModel):
    """Schema for available time slots."""
    time: str  # HH:MM format
    datetime: datetime  # Full datetime in UTC
    available: bool
    duration_minutes: int
    barber_id: Optional[int] = None
    barber_name: Optional[str] = None


class PublicAvailabilityResponse(BaseModel):
    """Schema for availability response."""
    date: str  # YYYY-MM-DD format
    organization_id: int
    timezone: str
    slots: List[PublicAvailabilitySlot]
    next_available_date: Optional[str] = None
    

class PublicServiceInfo(BaseModel):
    """Schema for public service information."""
    id: int
    name: str
    description: Optional[str]
    duration: int  # minutes
    price: float
    is_active: bool
    category: Optional[str] = None
    
    class Config:
        from_attributes = True


class PublicBarberInfo(BaseModel):
    """Schema for public barber information."""
    id: int
    name: str
    bio: Optional[str] = None
    photo_url: Optional[str] = None
    specialties: Optional[List[str]] = None
    rating: Optional[float] = None
    review_count: Optional[int] = None
    

class BookingConfirmationEmail(BaseModel):
    """Schema for booking confirmation email data."""
    guest_name: str
    guest_email: str
    organization_name: str
    barber_name: Optional[str]
    service_name: str
    appointment_datetime: datetime
    appointment_timezone: str
    duration_minutes: int
    service_price: float
    confirmation_code: str
    organization_phone: Optional[str]
    organization_address: Optional[str]
    booking_url: str
    

class BookingReminderNotification(BaseModel):
    """Schema for booking reminder notification."""
    guest_name: str
    guest_phone: Optional[str]
    guest_email: str
    appointment_datetime: datetime
    appointment_timezone: str
    organization_name: str
    barber_name: Optional[str]
    service_name: str
    confirmation_code: str
    reminder_type: str  # email or sms