"""Pydantic schemas for landing page functionality."""

from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime


class LandingPageConfig(BaseModel):
    """Configuration schema for organization landing page."""
    enabled: bool = True
    logo_url: Optional[str] = None
    primary_color: str = Field("#000000", pattern="^#[0-9A-Fa-f]{6}$")
    accent_color: str = Field("#FFD700", pattern="^#[0-9A-Fa-f]{6}$")
    background_preset: str = Field("professional_dark", pattern="^[a-z_]+$")
    custom_headline: Optional[str] = Field(None, max_length=100)
    show_testimonials: bool = True
    testimonial_source: str = Field("gmb_auto", pattern="^(gmb_auto|generic|custom)$")
    custom_testimonials: Optional[List[Dict[str, Any]]] = None
    
    @validator('background_preset')
    def validate_background_preset(cls, v):
        """Validate background preset options."""
        valid_presets = [
            'professional_dark',
            'clean_light',
            'barbershop_classic',
            'modern_gradient',
            'vintage_leather'
        ]
        if v not in valid_presets:
            raise ValueError(f'Background preset must be one of: {", ".join(valid_presets)}')
        return v
    
    @validator('testimonial_source')
    def validate_testimonial_source(cls, v):
        """Validate testimonial source options."""
        valid_sources = ['gmb_auto', 'generic', 'custom']
        if v not in valid_sources:
            raise ValueError(f'Testimonial source must be one of: {", ".join(valid_sources)}')
        return v


class TestimonialData(BaseModel):
    """Schema for testimonial data."""
    id: str
    reviewer_name: str
    review_text: str
    rating: int = Field(..., ge=1, le=5)
    date: datetime
    source: str = Field(..., pattern="^(gmb|generic|custom)$")
    reviewer_photo_url: Optional[str] = None
    
    @validator('review_text')
    def validate_review_text(cls, v):
        """Validate review text length."""
        if len(v) > 300:
            return v[:297] + "..."
        return v


class ServicePreview(BaseModel):
    """Schema for service preview on landing page."""
    id: int
    name: str
    description: Optional[str]
    duration: int
    price: float
    is_featured: bool = False
    
    class Config:
        from_attributes = True


class LandingPageResponse(BaseModel):
    """Schema for complete landing page data."""
    # Organization info
    organization_id: int
    organization_name: str
    organization_slug: str
    description: Optional[str]
    phone: Optional[str]
    email: Optional[str]
    address: Optional[str]
    
    # Landing page config
    config: LandingPageConfig
    
    # Content data
    services: List[ServicePreview]
    testimonials: List[TestimonialData]
    
    # Booking info
    booking_url: str
    timezone: str
    
    # Analytics
    page_views: int = 0
    conversion_rate: float = 0.0
    
    # Metadata
    last_updated: datetime


class LandingPageTrackingEvent(BaseModel):
    """Schema for landing page tracking events."""
    event_type: str = Field(..., pattern="^(page_view|cta_click|booking_started|booking_completed)$")
    organization_slug: str
    session_id: Optional[str] = None
    user_agent: Optional[str] = None
    ip_address: Optional[str] = None
    referrer: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    
    @validator('event_type')
    def validate_event_type(cls, v):
        """Validate event type options."""
        valid_types = ['page_view', 'cta_click', 'booking_started', 'booking_completed']
        if v not in valid_types:
            raise ValueError(f'Event type must be one of: {", ".join(valid_types)}')
        return v


class LandingPageConfigUpdate(BaseModel):
    """Schema for updating landing page configuration."""
    enabled: Optional[bool] = None
    logo_url: Optional[str] = None
    primary_color: Optional[str] = Field(None, pattern="^#[0-9A-Fa-f]{6}$")
    accent_color: Optional[str] = Field(None, pattern="^#[0-9A-Fa-f]{6}$")
    background_preset: Optional[str] = None
    custom_headline: Optional[str] = Field(None, max_length=100)
    show_testimonials: Optional[bool] = None
    testimonial_source: Optional[str] = None
    custom_testimonials: Optional[List[Dict[str, Any]]] = None
    
    @validator('background_preset')
    def validate_background_preset(cls, v):
        """Validate background preset options."""
        if v is None:
            return v
        valid_presets = [
            'professional_dark',
            'clean_light',
            'barbershop_classic',
            'modern_gradient',
            'vintage_leather'
        ]
        if v not in valid_presets:
            raise ValueError(f'Background preset must be one of: {", ".join(valid_presets)}')
        return v


class LandingPageAnalytics(BaseModel):
    """Schema for landing page analytics data."""
    organization_id: int
    date_range: str
    page_views: int
    unique_visitors: int
    cta_clicks: int
    booking_starts: int
    booking_completions: int
    conversion_rate: float
    bounce_rate: float
    average_session_duration: float
    top_referrers: List[Dict[str, Any]]
    device_breakdown: Dict[str, int]
    
    @property
    def click_through_rate(self) -> float:
        """Calculate click-through rate from page views to CTA clicks."""
        if self.page_views == 0:
            return 0.0
        return (self.cta_clicks / self.page_views) * 100
    
    @property
    def booking_conversion_rate(self) -> float:
        """Calculate conversion rate from CTA clicks to completed bookings."""
        if self.cta_clicks == 0:
            return 0.0
        return (self.booking_completions / self.cta_clicks) * 100


class BackgroundPreset(BaseModel):
    """Schema for background preset options."""
    key: str
    name: str
    description: str
    preview_url: str
    css_classes: str
    is_premium: bool = False
    
    class Config:
        from_attributes = True


class LandingPagePresets(BaseModel):
    """Schema for available landing page presets."""
    backgrounds: List[BackgroundPreset]
    default_colors: Dict[str, Dict[str, str]]
    testimonial_templates: List[Dict[str, Any]]
    
    @classmethod
    def get_default_presets(cls) -> "LandingPagePresets":
        """Get default preset options."""
        return cls(
            backgrounds=[
                BackgroundPreset(
                    key="professional_dark",
                    name="Professional Dark",
                    description="Sleek dark theme with gold accents",
                    preview_url="/assets/presets/professional_dark.jpg",
                    css_classes="bg-gradient-to-br from-gray-900 to-black"
                ),
                BackgroundPreset(
                    key="clean_light",
                    name="Clean Light",
                    description="Clean white background with subtle shadows",
                    preview_url="/assets/presets/clean_light.jpg",
                    css_classes="bg-gradient-to-br from-gray-50 to-white"
                ),
                BackgroundPreset(
                    key="barbershop_classic",
                    name="Barbershop Classic",
                    description="Traditional barbershop feel with warm tones",
                    preview_url="/assets/presets/barbershop_classic.jpg",
                    css_classes="bg-gradient-to-br from-amber-50 to-orange-100"
                ),
                BackgroundPreset(
                    key="modern_gradient",
                    name="Modern Gradient",
                    description="Contemporary gradient with blue accents",
                    preview_url="/assets/presets/modern_gradient.jpg",
                    css_classes="bg-gradient-to-br from-blue-600 to-purple-700"
                ),
                BackgroundPreset(
                    key="vintage_leather",
                    name="Vintage Leather",
                    description="Rich leather texture with vintage styling",
                    preview_url="/assets/presets/vintage_leather.jpg",
                    css_classes="bg-gradient-to-br from-amber-800 to-yellow-900"
                )
            ],
            default_colors={
                "professional_dark": {"primary": "#000000", "accent": "#FFD700"},
                "clean_light": {"primary": "#1F2937", "accent": "#3B82F6"},
                "barbershop_classic": {"primary": "#8B4513", "accent": "#FF6B35"},
                "modern_gradient": {"primary": "#FFFFFF", "accent": "#10B981"},
                "vintage_leather": {"primary": "#FBBF24", "accent": "#DC2626"}
            },
            testimonial_templates=[
                {
                    "id": "generic_1",
                    "reviewer_name": "Mike T.",
                    "review_text": "Best haircut I've ever had! Professional and friendly service every time.",
                    "rating": 5,
                    "source": "generic"
                },
                {
                    "id": "generic_2", 
                    "reviewer_name": "Sarah L.",
                    "review_text": "Amazing attention to detail. I always leave feeling confident and looking great!",
                    "rating": 5,
                    "source": "generic"
                },
                {
                    "id": "generic_3",
                    "reviewer_name": "David R.",
                    "review_text": "Consistently excellent service. The barbers really know their craft.",
                    "rating": 5,
                    "source": "generic"
                }
            ]
        )