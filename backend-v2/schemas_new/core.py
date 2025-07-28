"""
Core schemas for the analytics system.
"""
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class DateRange(BaseModel):
    """Date range for analytics queries"""
    start_date: datetime
    end_date: datetime
    
    model_config = ConfigDict(
        json_encoders={
            datetime: lambda v: v.isoformat()
        }
    )