from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, List
from datetime import datetime, date

# Auth schemas
class UserLogin(BaseModel):
    username: EmailStr  # Using email as username
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class TokenData(BaseModel):
    username: Optional[str] = None

class UserBase(BaseModel):
    email: EmailStr
    name: str

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    created_at: datetime
    role: Optional[str] = "user"
    
    class Config:
        from_attributes = True

class UserInDB(User):
    hashed_password: str

# Booking schemas
class TimeSlot(BaseModel):
    time: str
    available: bool

class BookingCreate(BaseModel):
    date: date
    time: str = Field(..., pattern="^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$")  # HH:MM format
    service: str
    
    @validator('service')
    def validate_service(cls, v):
        valid_services = ["Haircut", "Shave", "Haircut & Shave"]
        if v not in valid_services:
            raise ValueError(f"Service must be one of: {', '.join(valid_services)}")
        return v

class BookingResponse(BaseModel):
    id: int
    user_id: int
    service_name: str
    start_time: datetime
    duration_minutes: int
    price: float
    status: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class BookingListResponse(BaseModel):
    bookings: List[BookingResponse]
    total: int

# Payment schemas
class PaymentIntentCreate(BaseModel):
    booking_id: int

class PaymentIntentResponse(BaseModel):
    client_secret: str
    payment_intent_id: str
    amount: float

class PaymentConfirm(BaseModel):
    payment_intent_id: str
    booking_id: int

class PaymentResponse(BaseModel):
    id: int
    amount: float
    status: str
    stripe_payment_intent_id: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True