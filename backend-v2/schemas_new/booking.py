"""
Booking and appointment schemas for the API.
"""

from pydantic import BaseModel, Field, validator
from datetime import date as Date
from typing import Optional, List

class AppointmentReschedule(BaseModel):
    """Reschedule appointment to new date/time"""
    date: Date
    time: str = Field(..., pattern="^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$")

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

class NextAvailableSlot(BaseModel):
    """Next available time slot"""
    date: str = Field(..., description="Date in YYYY-MM-DD format")
    time: str = Field(..., description="Time in HH:MM format") 
    datetime: str = Field(..., description="Combined datetime in ISO format")

# Aliases for backward compatibility
BookingReschedule = AppointmentReschedule
QuickBookingCreate = QuickAppointmentCreate