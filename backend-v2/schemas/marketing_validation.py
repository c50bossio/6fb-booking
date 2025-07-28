"""
Marketing Analytics Input Validation Schemas
===========================================

Provides comprehensive input validation for marketing analytics endpoints
to prevent abuse and ensure data integrity.
"""

from datetime import datetime, timedelta
from typing import Optional
from pydantic import BaseModel, field_validator, Field


class DateRangeValidator(BaseModel):
    """
    Enhanced date range validation for marketing analytics queries.
    
    Enforces reasonable limits to prevent resource exhaustion:
    - Maximum 1 year range for historical data
    - No future dates allowed
    - Start date cannot be more than 2 years ago
    """
    
    start_date: datetime = Field(
        ..., 
        description="Start date for analytics query"
    )
    end_date: datetime = Field(
        ...,
        description="End date for analytics query"
    )
    
    @field_validator('start_date')
    def validate_start_date(cls, v):
        """Validate start date is within reasonable bounds"""
        now = datetime.utcnow()
        
        # Cannot be in the future
        if v > now:
            raise ValueError('Start date cannot be in the future')
        
        # Cannot be more than 2 years ago (data retention policy)
        min_date = now - timedelta(days=730)  # 2 years
        if v < min_date:
            raise ValueError('Start date cannot be more than 2 years ago')
            
        return v
    
    @field_validator('end_date')
    def validate_end_date(cls, v, values):
        """Validate end date and ensure reasonable range"""
        now = datetime.utcnow()
        
        # Cannot be in the future
        if v > now:
            raise ValueError('End date cannot be in the future')
        
        # Check range if start_date is available
        if 'start_date' in values and values['start_date']:
            start = values['start_date']
            
            # End date must be after start date
            if v < start:
                raise ValueError('End date must be after start date')
            
            # Maximum 1 year range for performance
            max_range = timedelta(days=365)
            if v - start > max_range:
                raise ValueError(
                    'Date range cannot exceed 1 year. '
                    'For longer periods, please make multiple requests.'
                )
        
        return v
    
    @field_validator('end_date')
    def validate_minimum_range(cls, v, values):
        """Ensure minimum meaningful range"""
        if 'start_date' in values and values['start_date']:
            start = values['start_date']
            
            # Minimum 1 hour range for meaningful data
            min_range = timedelta(hours=1)
            if v - start < min_range:
                raise ValueError('Date range must be at least 1 hour')
                
        return v


class CampaignFilterValidator(BaseModel):
    """Validation for campaign filtering parameters"""
    
    campaign_id: Optional[str] = Field(
        None,
        min_length=1,
        max_length=255,
        description="Campaign identifier"
    )
    
    utm_source: Optional[str] = Field(
        None,
        min_length=1,
        max_length=100,
        description="UTM source parameter"
    )
    
    utm_medium: Optional[str] = Field(
        None,
        min_length=1,
        max_length=100,
        description="UTM medium parameter"
    )
    
    utm_campaign: Optional[str] = Field(
        None,
        min_length=1,
        max_length=255,
        description="UTM campaign parameter"
    )
    
    @field_validator('*', pre=True)
    def sanitize_input(cls, v):
        """Sanitize string inputs to prevent injection"""
        if isinstance(v, str):
            # Remove any potential SQL/script injection attempts
            forbidden_chars = [';', '--', '/*', '*/', '<', '>', 'script']
            for char in forbidden_chars:
                if char in v.lower():
                    raise ValueError(f'Invalid character sequence detected: {char}')
        return v


class ExportRequestValidator(BaseModel):
    """Validation for data export requests"""
    
    format: str = Field(
        ...,
        regex='^(csv|json|pdf)$',
        description="Export format"
    )
    
    include_raw_data: bool = Field(
        False,
        description="Include raw data in export"
    )
    
    compress: bool = Field(
        False,
        description="Compress export file"
    )
    
    @field_validator('format')
    def validate_format(cls, v):
        """Ensure valid export format"""
        allowed_formats = ['csv', 'json', 'pdf']
        if v not in allowed_formats:
            raise ValueError(f'Format must be one of: {", ".join(allowed_formats)}')
        return v.lower()


class PaginationValidator(BaseModel):
    """Validation for paginated requests"""
    
    page: int = Field(
        1,
        ge=1,
        le=1000,
        description="Page number"
    )
    
    page_size: int = Field(
        20,
        ge=1,
        le=100,
        description="Items per page"
    )
    
    sort_by: Optional[str] = Field(
        None,
        regex='^[a-zA-Z_]+$',
        max_length=50,
        description="Sort field"
    )
    
    sort_order: Optional[str] = Field(
        'desc',
        regex='^(asc|desc)$',
        description="Sort order"
    )


class MetricFilterValidator(BaseModel):
    """Validation for metric filtering"""
    
    metrics: Optional[list[str]] = Field(
        None,
        max_length=20,
        description="Specific metrics to include"
    )
    
    exclude_zero_values: bool = Field(
        False,
        description="Exclude metrics with zero values"
    )
    
    threshold: Optional[float] = Field(
        None,
        ge=0,
        description="Minimum threshold for metric values"
    )
    
    @field_validator('metrics')
    def validate_metrics(cls, v):
        """Validate requested metrics"""
        if v:
            allowed_metrics = [
                'conversions', 'revenue', 'conversion_rate',
                'page_views', 'unique_visitors', 'bounce_rate',
                'average_order_value', 'click_through_rate',
                'cost_per_acquisition', 'return_on_ad_spend'
            ]
            
            invalid_metrics = [m for m in v if m not in allowed_metrics]
            if invalid_metrics:
                raise ValueError(
                    f'Invalid metrics: {", ".join(invalid_metrics)}. '
                    f'Allowed metrics: {", ".join(allowed_metrics)}'
                )
                
        return v