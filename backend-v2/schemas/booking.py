"""
Booking and appointment schemas for the API.
"""

from pydantic import BaseModel, Field
from datetime import date as Date
from typing import Optional, List

class AppointmentReschedule(BaseModel):
    """Reschedule appointment to new date/time"""
    date: Date
    time: str = Field(..., pattern="^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$")

# Alias for backward compatibility
BookingReschedule = AppointmentReschedule