"""
Core schemas for the analytics system.
"""
from datetime import datetime
from pydantic import BaseModel
from typing import Optional

class DateRange(BaseModel):
    """Date range for analytics queries"""
    start_date: datetime
    end_date: datetime
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }