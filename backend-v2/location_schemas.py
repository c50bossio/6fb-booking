"""
Pydantic schemas for location-related models
"""

from pydantic import BaseModel, ConfigDict
from typing import Optional, Dict
from datetime import datetime
from enum import Enum


class CompensationModelEnum(str, Enum):
    BOOTH_RENTAL = "booth_rental"
    COMMISSION = "commission"
    HYBRID = "hybrid"
    CUSTOM = "custom"


class LocationStatusEnum(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    COMING_SOON = "coming_soon"
    CLOSED = "closed"


class LocationBase(BaseModel):
    name: str
    code: str
    address: str
    city: str
    state: str
    zip_code: str
    phone: Optional[str] = None
    email: Optional[str] = None
    status: LocationStatusEnum = LocationStatusEnum.ACTIVE
    compensation_model: CompensationModelEnum = CompensationModelEnum.COMMISSION
    total_chairs: int = 0
    active_chairs: int = 0
    compensation_config: Dict = {}
    business_hours: Dict = {}
    timezone: str = "America/New_York"
    currency: str = "USD"


class LocationCreate(LocationBase):
    pass


class LocationUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    status: Optional[LocationStatusEnum] = None
    compensation_model: Optional[CompensationModelEnum] = None
    total_chairs: Optional[int] = None
    active_chairs: Optional[int] = None
    compensation_config: Optional[Dict] = None
    business_hours: Optional[Dict] = None
    timezone: Optional[str] = None
    currency: Optional[str] = None


class LocationResponse(LocationBase):
    id: int
    manager_id: Optional[int] = None
    owner_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    occupancy_rate: float = 0
    vacant_chairs: int = 0
    
    model_config = ConfigDict(
        from_attributes=True
    )