"""
Pydantic schemas for conversion tracking and attribution.
"""

from pydantic import BaseModel, Field, validator, field_validator
from typing import Dict, List, Optional, Any
from datetime import datetime
from enum import Enum
import re

from models.tracking import EventType, AttributionModel, ConversionStatus


class ConversionEventCreate(BaseModel):
    """Schema for creating a new conversion event"""
    event_id: Optional[str] = Field(None, description="Unique event ID for deduplication")
    event_name: str = Field(..., description="Name of the event (e.g., 'booking_completed')")
    event_type: EventType = Field(..., description="Type of conversion event")
    event_value: Optional[float] = Field(None, description="Monetary value of the event")
    event_currency: Optional[str] = Field("USD", description="Currency code")
    event_data: Optional[Dict[str, Any]] = Field(None, description="Additional event data")
    
    # Source information
    source_url: Optional[str] = Field(None, description="URL where event occurred")
    user_agent: Optional[str] = Field(None, description="User agent string")
    ip_address: Optional[str] = Field(None, description="User IP address (will be hashed)")
    client_id: Optional[str] = Field(None, description="Google Analytics client ID")
    session_id: Optional[str] = Field(None, description="Session identifier")
    
    # Attribution data
    utm_source: Optional[str] = Field(None, description="UTM source parameter")
    utm_medium: Optional[str] = Field(None, description="UTM medium parameter")
    utm_campaign: Optional[str] = Field(None, description="UTM campaign parameter")
    utm_term: Optional[str] = Field(None, description="UTM term parameter")
    utm_content: Optional[str] = Field(None, description="UTM content parameter")
    referrer: Optional[str] = Field(None, description="HTTP referrer")
    
    @validator('event_value')
    def validate_event_value(cls, v):
        if v is not None and v < 0:
            raise ValueError('Event value must be non-negative')
        return v
    
    @validator('event_currency')
    def validate_currency(cls, v):
        if v and len(v) != 3:
            raise ValueError('Currency must be a 3-letter code')
        return v.upper() if v else 'USD'


class ConversionEventResponse(BaseModel):
    """Schema for conversion event response"""
    id: int
    user_id: int
    event_id: str
    event_name: str
    event_type: EventType
    event_value: Optional[float]
    event_currency: str
    channel: Optional[str]
    status: ConversionStatus
    created_at: datetime
    
    # Sync status
    gtm_synced: bool
    meta_synced: bool
    google_ads_synced: bool
    
    # Attribution
    attribution_path_id: Optional[int] = None
    
    class Config:
        from_attributes = True


class AttributionReport(BaseModel):
    """Schema for attribution reporting"""
    model: AttributionModel
    total_revenue: float
    total_conversions: int
    channels: List[Dict[str, Any]]
    period_start: datetime
    period_end: datetime


class ChannelPerformance(BaseModel):
    """Schema for channel performance metrics"""
    channel: str
    conversions: int
    revenue: float
    attributed_revenue: float
    conversion_rate: float
    roi: float


class ConversionAnalytics(BaseModel):
    """Schema for conversion analytics response"""
    total_conversions: int
    total_revenue: float
    conversion_rate: float
    average_order_value: float
    channel_performance: List[ChannelPerformance]
    top_converting_pages: List[Dict[str, Any]]
    conversion_funnel: List[Dict[str, Any]]
    period_start: datetime
    period_end: datetime


class TrackingConfigUpdate(BaseModel):
    """Schema for updating tracking configuration"""
    # GTM settings
    gtm_container_id: Optional[str] = None
    gtm_enabled: Optional[bool] = None
    gtm_server_url: Optional[str] = None
    
    # Meta settings
    meta_pixel_id: Optional[str] = None
    meta_enabled: Optional[bool] = None
    meta_test_event_code: Optional[str] = None
    
    # Google Ads settings
    google_ads_conversion_id: Optional[str] = None
    google_ads_enabled: Optional[bool] = None
    google_ads_conversion_labels: Optional[Dict[str, str]] = None
    
    # Attribution settings
    attribution_window_days: Optional[int] = Field(None, ge=1, le=90)
    default_attribution_model: Optional[AttributionModel] = None
    
    # Advanced settings
    conversion_value_rules: Optional[Dict[str, Any]] = None
    excluded_domains: Optional[List[str]] = None


class TrackingConfigResponse(BaseModel):
    """Schema for tracking configuration response"""
    id: int
    user_id: int
    
    # Platform settings
    gtm_enabled: bool
    gtm_container_id: Optional[str]
    meta_enabled: bool
    meta_pixel_id: Optional[str]
    google_ads_enabled: bool
    google_ads_conversion_id: Optional[str]
    
    # Attribution settings
    attribution_window_days: int
    default_attribution_model: AttributionModel
    
    # Privacy settings
    enable_enhanced_conversions: bool
    hash_user_data: bool
    
    created_at: datetime
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True


class ConversionGoalCreate(BaseModel):
    """Schema for creating a conversion goal"""
    name: str = Field(..., description="Goal name")
    description: Optional[str] = Field(None, description="Goal description")
    event_name: str = Field(..., description="Event that triggers this goal")
    event_type: EventType = Field(..., description="Type of event")
    value: Optional[float] = Field(None, description="Fixed goal value")
    value_expression: Optional[str] = Field(None, description="Dynamic value calculation")
    conditions: Optional[Dict[str, Any]] = Field(None, description="Additional conditions")
    is_active: bool = Field(True, description="Whether goal is active")


class ConversionGoalResponse(BaseModel):
    """Schema for conversion goal response"""
    id: int
    user_id: int
    name: str
    description: Optional[str]
    event_name: str
    event_type: EventType
    value: Optional[float]
    value_expression: Optional[str]
    conditions: Optional[Dict[str, Any]]
    is_active: bool
    total_conversions: int
    total_value: float
    created_at: datetime
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True


class CampaignTrackingCreate(BaseModel):
    """Schema for creating campaign tracking"""
    campaign_id: str = Field(..., description="External campaign ID")
    campaign_name: str = Field(..., description="Campaign name")
    campaign_source: str = Field(..., description="Campaign source (google_ads, meta, etc.)")
    campaign_medium: str = Field(..., description="Campaign medium")
    start_date: datetime = Field(..., description="Campaign start date")
    end_date: Optional[datetime] = Field(None, description="Campaign end date")
    total_cost: float = Field(0.0, description="Total campaign cost")
    currency: str = Field("USD", description="Currency code")


class CampaignTrackingResponse(BaseModel):
    """Schema for campaign tracking response"""
    id: int
    user_id: int
    campaign_id: str
    campaign_name: str
    campaign_source: str
    campaign_medium: str
    start_date: datetime
    end_date: Optional[datetime]
    total_cost: float
    currency: str
    
    # Performance metrics
    impressions: int
    clicks: int
    conversions: int
    conversion_value: float
    
    # Calculated metrics
    ctr: Optional[float]
    conversion_rate: Optional[float]
    cpc: Optional[float]
    cpa: Optional[float]
    roas: Optional[float]
    
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime]
    last_sync_at: Optional[datetime]
    
    class Config:
        from_attributes = True


class PlatformTestRequest(BaseModel):
    """Schema for testing platform connections"""
    platform: str = Field(..., description="Platform to test (gtm, meta, google_ads)")
    config: Dict[str, Any] = Field(..., description="Platform-specific configuration")


class PlatformTestResponse(BaseModel):
    """Schema for platform test response"""
    success: bool
    message: str
    details: Optional[Dict[str, Any]] = None


# Customer Pixel Management Schemas

class TrackingPixelUpdate(BaseModel):
    """Schema for updating organization tracking pixels"""
    
    gtm_container_id: Optional[str] = Field(None, max_length=50, description="Google Tag Manager Container ID (GTM-XXXXXXX)")
    ga4_measurement_id: Optional[str] = Field(None, max_length=50, description="Google Analytics 4 Measurement ID (G-XXXXXXXXXX)")
    meta_pixel_id: Optional[str] = Field(None, max_length=50, description="Meta/Facebook Pixel ID")
    google_ads_conversion_id: Optional[str] = Field(None, max_length=50, description="Google Ads Conversion ID (AW-XXXXXXXXX)")
    google_ads_conversion_label: Optional[str] = Field(None, max_length=50, description="Google Ads Conversion Label")
    tracking_enabled: Optional[bool] = Field(None, description="Enable/disable all tracking pixels")
    custom_tracking_code: Optional[str] = Field(None, description="Custom HTML/JS tracking code")
    tracking_settings: Optional[Dict[str, Any]] = Field(None, description="Advanced tracking settings")
    
    @field_validator('gtm_container_id')
    def validate_gtm_id(cls, v):
        if v and not re.match(r'^GTM-[A-Z0-9]{6,}$', v):
            raise ValueError('Invalid GTM Container ID format. Must be GTM-XXXXXXX')
        return v
    
    @field_validator('ga4_measurement_id')
    def validate_ga4_id(cls, v):
        if v and not re.match(r'^G-[A-Z0-9]{10,}$', v):
            raise ValueError('Invalid GA4 Measurement ID format. Must be G-XXXXXXXXXX')
        return v
    
    @field_validator('meta_pixel_id')
    def validate_meta_pixel_id(cls, v):
        if v and not re.match(r'^\d{10,20}$', v):
            raise ValueError('Invalid Meta Pixel ID format. Must be numeric')
        return v
    
    @field_validator('google_ads_conversion_id')
    def validate_google_ads_id(cls, v):
        if v and not re.match(r'^AW-\d{9,}$', v):
            raise ValueError('Invalid Google Ads Conversion ID format. Must be AW-XXXXXXXXX')
        return v
    
    @field_validator('custom_tracking_code')
    def validate_custom_code(cls, v):
        if v:
            # Basic security check - no script tags with src
            if re.search(r'<script[^>]+src\s*=', v, re.IGNORECASE):
                raise ValueError('External script sources not allowed in custom tracking code')
            # Limit length
            if len(v) > 10000:
                raise ValueError('Custom tracking code too long (max 10000 characters)')
        return v
    
    class Config:
        json_schema_extra = {
            "example": {
                "gtm_container_id": "GTM-ABC123",
                "ga4_measurement_id": "G-1234567890",
                "meta_pixel_id": "123456789012345",
                "google_ads_conversion_id": "AW-123456789",
                "google_ads_conversion_label": "abcDEFghijk",
                "tracking_enabled": True,
                "tracking_settings": {
                    "enhanced_conversions": True,
                    "cookieless_tracking": False
                }
            }
        }


class TrackingPixelResponse(BaseModel):
    """Schema for tracking pixel response"""
    
    gtm_container_id: Optional[str] = None
    ga4_measurement_id: Optional[str] = None
    meta_pixel_id: Optional[str] = None
    google_ads_conversion_id: Optional[str] = None
    google_ads_conversion_label: Optional[str] = None
    tracking_enabled: bool = True
    custom_tracking_code: Optional[str] = None
    tracking_settings: Optional[Dict[str, Any]] = None
    
    class Config:
        from_attributes = True


class TrackingTestResult(BaseModel):
    """Schema for pixel test results"""
    
    pixel_type: str = Field(..., description="Type of pixel tested (gtm, ga4, meta, google_ads)")
    is_valid: bool = Field(..., description="Whether the pixel ID is valid")
    is_active: bool = Field(..., description="Whether the pixel is firing correctly")
    message: str = Field(..., description="Test result message")
    details: Optional[Dict[str, Any]] = Field(None, description="Additional test details")
    
    class Config:
        json_schema_extra = {
            "example": {
                "pixel_type": "gtm",
                "is_valid": True,
                "is_active": True,
                "message": "GTM container loaded successfully",
                "details": {
                    "container_version": "2",
                    "tags_count": 5
                }
            }
        }


class PublicTrackingPixels(BaseModel):
    """Schema for public-facing tracking pixels (used on booking pages)"""
    
    gtm_container_id: Optional[str] = None
    ga4_measurement_id: Optional[str] = None
    meta_pixel_id: Optional[str] = None
    google_ads_conversion_id: Optional[str] = None
    google_ads_conversion_label: Optional[str] = None
    custom_tracking_code: Optional[str] = None
    tracking_enabled: bool = True
    
    class Config:
        from_attributes = True


class PixelInstructions(BaseModel):
    """Schema for pixel setup instructions"""
    
    pixel_type: str = Field(..., description="Type of pixel (gtm, ga4, meta, google_ads)")
    title: str = Field(..., description="Instruction title")
    description: str = Field(..., description="Brief description of the pixel")
    setup_steps: List[str] = Field(..., description="Step-by-step setup instructions")
    format_example: str = Field(..., description="Example of correct ID format")
    validation_regex: str = Field(..., description="Regex pattern for validation")
    help_url: Optional[str] = Field(None, description="URL to official documentation")
    
    class Config:
        json_schema_extra = {
            "example": {
                "pixel_type": "gtm",
                "title": "Google Tag Manager Setup",
                "description": "Track all website events with GTM",
                "setup_steps": [
                    "Go to tagmanager.google.com",
                    "Create or select a container",
                    "Copy your Container ID"
                ],
                "format_example": "GTM-ABC123",
                "validation_regex": "^GTM-[A-Z0-9]{6,}$",
                "help_url": "https://support.google.com/tagmanager/answer/6103696"
            }
        }