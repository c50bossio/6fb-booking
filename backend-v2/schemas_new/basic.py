"""
Basic schemas for the booking system.
Contains essential schemas needed by routers.
"""

from pydantic import BaseModel, EmailStr, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime, date, time
from enum import Enum

class UserRole(str, Enum):
    """User roles"""
    admin = "admin"
    user = "user"
    barber = "barber"

class UserBase(BaseModel):
    """Base user schema"""
    email: EmailStr
    name: str
    role: Optional[UserRole] = UserRole.user
    timezone: Optional[str] = None

class UserCreate(UserBase):
    """User creation schema"""
    password: str

class UserLogin(BaseModel):
    """User login schema"""
    email: EmailStr
    password: str

class User(UserBase):
    """User response schema"""
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    model_config = ConfigDict(
        from_attributes=True
    )

class UserResponse(User):
    """Extended user response"""

class TimeSlot(BaseModel):
    """Time slot information"""
    time: time
    available: bool
    booking_id: Optional[int] = None
    blocked_reason: Optional[str] = None

class SlotsResponse(BaseModel):
    """Available slots response"""
    date: date
    timezone: str
    slots: List[TimeSlot]
    business_hours: Dict[str, Any]
    
    model_config = ConfigDict(
        json_encoders = {
            time: lambda v: v.isoformat(),
            date: lambda v: v.isoformat()
        }
)

class TokenResponse(BaseModel):
    """Token response schema"""
    access_token: str
    token_type: str = "bearer"
    expires_in: Optional[int] = None

class HealthCheck(BaseModel):
    """Health check response"""
    status: str
    timestamp: datetime
    version: Optional[str] = None

class Token(BaseModel):
    """Token response schema"""
    access_token: str
    token_type: str = "bearer"
    expires_in: Optional[int] = None
    refresh_token: Optional[str] = None

class PasswordResetResponse(BaseModel):
    """Password reset response"""
    message: str
    success: bool = True

class RegistrationResponse(BaseModel):
    """Registration response"""
    message: str
    user: User
    access_token: Optional[str] = None

class ChangePasswordResponse(BaseModel):
    """Change password response"""
    message: str
    success: bool = True

class BookingCreate(BaseModel):
    """Booking creation schema"""
    date: date
    time: time
    duration: Optional[int] = 60
    service_id: Optional[int] = None
    notes: Optional[str] = None

class BookingUpdate(BaseModel):
    """Booking update schema"""
    date: Optional[date] = None
    time: Optional[time] = None
    duration: Optional[int] = None
    service_id: Optional[int] = None
    notes: Optional[str] = None
    status: Optional[str] = None

class BookingResponse(BaseModel):
    """Booking response schema"""
    id: int
    date: date
    time: time
    duration: int
    status: str
    created_at: datetime
    
    model_config = ConfigDict(
        from_attributes=True,
        json_encoders={
            time: lambda v: v.isoformat(),
            date: lambda v: v.isoformat(),
            datetime: lambda v: v.isoformat()
        }
    )

class BookingListResponse(BaseModel):
    """Booking list response schema"""
    bookings: List[BookingResponse]
    total: int
    page: int
    per_page: int

# Add placeholder schemas for other commonly used types
class ClientCreate(BaseModel):
    """Client creation schema"""
    first_name: str
    last_name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None

class ClientResponse(BaseModel):
    """Client response schema"""
    id: int
    first_name: str
    last_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    
    model_config = ConfigDict(
        from_attributes=True
    )

class ServiceCreate(BaseModel):
    """Service creation schema"""
    name: str
    duration: int
    price: float
    description: Optional[str] = None

class ServiceResponse(BaseModel):
    """Service response schema"""
    id: int
    name: str
    duration: int
    price: float
    description: Optional[str] = None
    
    model_config = ConfigDict(
        from_attributes=True
    )