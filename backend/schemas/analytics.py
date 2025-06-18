"""
Analytics validation schemas
"""
from pydantic import BaseModel, Field, validator
from datetime import date, datetime
from typing import Optional, List, Dict, Any


class AnalyticsDateRange(BaseModel):
    """Date range validation"""
    start_date: date = Field(..., description="Start date for analytics")
    end_date: date = Field(..., description="End date for analytics")
    
    @validator('end_date')
    def end_date_not_before_start(cls, v, values):
        if 'start_date' in values and v < values['start_date']:
            raise ValueError('End date must be after or equal to start date')
        return v
    
    @validator('end_date')
    def dates_not_in_future(cls, v):
        if v > date.today():
            raise ValueError('End date cannot be in the future')
        return v
    
    @validator('start_date')
    def date_range_limit(cls, v, values):
        # Limit date range to 1 year
        if 'end_date' in values:
            days_diff = (values['end_date'] - v).days
            if days_diff > 365:
                raise ValueError('Date range cannot exceed 365 days')
        return v


class RevenueData(BaseModel):
    """Revenue data schema"""
    date: str
    revenue: float = Field(..., ge=0)
    services: float = Field(0, ge=0)
    products: float = Field(0, ge=0)
    tips: float = Field(0, ge=0)


class BookingData(BaseModel):
    """Booking data schema"""
    date: str
    total: int = Field(..., ge=0)
    completed: int = Field(0, ge=0)
    cancelled: int = Field(0, ge=0)
    no_show: int = Field(0, ge=0)
    pending: int = Field(0, ge=0)


class MetricsData(BaseModel):
    """Performance metrics schema"""
    totalRevenue: float = Field(..., ge=0)
    revenueGrowth: float
    totalBookings: int = Field(..., ge=0)
    bookingGrowth: float
    activeClients: int = Field(..., ge=0)
    retention: float = Field(..., ge=0, le=100)
    avgBookingValue: float = Field(..., ge=0)
    utilizationRate: float = Field(..., ge=0, le=100)
    revenueTarget: float = Field(..., ge=0)
    currentRevenue: float = Field(..., ge=0)
    bookingRate: float = Field(..., ge=0, le=100)
    satisfaction: float = Field(..., ge=0, le=5)
    insights: List[Dict[str, str]] = []


class ServiceAnalyticsData(BaseModel):
    """Service analytics schema"""
    name: str
    bookings: int = Field(..., ge=0)
    revenue: float = Field(..., ge=0)
    avg_duration: int = Field(..., ge=0)


class RetentionData(BaseModel):
    """Retention analytics schema"""
    overallRetention: float = Field(..., ge=0, le=100)
    newClients: int = Field(..., ge=0)
    returningClients: int = Field(..., ge=0)
    lostClients: int = Field(..., ge=0)
    avgVisitsPerClient: float = Field(..., ge=0)
    avgLifetimeValue: float = Field(..., ge=0)
    monthlyRetention: List[Dict[str, Any]]
    visitFrequency: List[Dict[str, Any]]
    cohortAnalysis: List[Dict[str, Any]]
    segmentAnalysis: List[Dict[str, Any]]


class PeakHoursData(BaseModel):
    """Peak hours data schema"""
    day: str = Field(..., pattern="^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)$")
    hour: int = Field(..., ge=0, le=23)
    bookings: int = Field(..., ge=0)


class BarberStatsData(BaseModel):
    """Barber statistics schema"""
    id: int
    name: str
    bookings: int = Field(..., ge=0)
    revenue: float = Field(..., ge=0)
    rating: float = Field(..., ge=0, le=5)
    efficiency: float = Field(..., ge=0, le=100)
    retention: float = Field(..., ge=0, le=100)
    productivity: float = Field(..., ge=0, le=100)
    satisfaction: float = Field(..., ge=0, le=100)
    skills: float = Field(..., ge=0, le=100)
    trend: float


class ExportFormat(BaseModel):
    """Export format validation"""
    format: str = Field(..., pattern="^(csv|pdf|excel)$")
    

# Request validators
def validate_date_range(start_date: date, end_date: date) -> AnalyticsDateRange:
    """Validate date range parameters"""
    return AnalyticsDateRange(start_date=start_date, end_date=end_date)


def validate_location_id(location_id: Optional[int]) -> Optional[int]:
    """Validate location ID"""
    if location_id is not None and location_id <= 0:
        raise ValueError("Location ID must be positive")
    return location_id


def validate_barber_id(barber_id: Optional[int]) -> Optional[int]:
    """Validate barber ID"""
    if barber_id is not None and barber_id <= 0:
        raise ValueError("Barber ID must be positive")
    return barber_id