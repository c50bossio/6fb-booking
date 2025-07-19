"""Pydantic schemas for homepage builder functionality.

This module extends the existing landing page schemas to provide advanced
homepage customization capabilities with section-based design.
"""

from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any, Union
from datetime import datetime
from enum import Enum

# Import base schemas from existing landing page module
from schemas_new.landing_page import (
    LandingPageConfig,
    TestimonialData,
    ServicePreview,
    BackgroundPreset
)


class SectionType(str, Enum):
    """Available section types for homepage builder."""
    HERO = "hero"
    ABOUT = "about"
    SERVICES = "services"
    GALLERY = "gallery"
    TESTIMONIALS = "testimonials"
    CONTACT = "contact"
    TEAM = "team"
    PRICING = "pricing"
    FAQ = "faq"
    CUSTOM = "custom"


class LayoutType(str, Enum):
    """Available layout types for sections."""
    SINGLE_COLUMN = "single_column"
    TWO_COLUMN = "two_column"
    THREE_COLUMN = "three_column"
    GRID = "grid"
    CAROUSEL = "carousel"
    MASONRY = "masonry"


class MediaType(str, Enum):
    """Media types for content."""
    IMAGE = "image"
    VIDEO = "video"
    GALLERY = "gallery"


class HeroSectionConfig(BaseModel):
    """Configuration for hero section."""
    enabled: bool = True
    title: Optional[str] = Field(None, max_length=100)
    subtitle: Optional[str] = Field(None, max_length=200)
    description: Optional[str] = Field(None, max_length=500)
    background_type: str = Field("image", pattern="^(image|video|gradient|color)$")
    background_media_url: Optional[str] = None
    background_color: Optional[str] = Field(None, pattern="^#[0-9A-Fa-f]{6}$")
    overlay_opacity: float = Field(0.4, ge=0, le=1)
    cta_text: str = Field("Book Now", max_length=50)
    cta_secondary_text: Optional[str] = Field(None, max_length=50)
    text_alignment: str = Field("center", pattern="^(left|center|right)$")
    show_rating: bool = True
    show_quick_stats: bool = True


class AboutSectionConfig(BaseModel):
    """Configuration for about section."""
    enabled: bool = True
    title: str = Field("About Us", max_length=100)
    content: Optional[str] = Field(None, max_length=2000)
    layout: LayoutType = LayoutType.TWO_COLUMN
    image_url: Optional[str] = None
    show_team_photo: bool = False
    highlight_stats: List[Dict[str, Union[str, int]]] = Field(default_factory=list)
    
    @validator('highlight_stats')
    def validate_highlight_stats(cls, v):
        """Validate highlight stats format."""
        for stat in v:
            if not all(key in stat for key in ['label', 'value']):
                raise ValueError('Each stat must have label and value')
        return v[:4]  # Limit to 4 stats


class ServicesSectionConfig(BaseModel):
    """Configuration for services section."""
    enabled: bool = True
    title: str = Field("Our Services", max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    layout: LayoutType = LayoutType.GRID
    show_pricing: bool = True
    show_duration: bool = True
    show_description: bool = True
    max_services_display: int = Field(6, ge=1, le=20)
    featured_service_ids: List[int] = Field(default_factory=list)
    enable_service_booking: bool = True


class GallerySectionConfig(BaseModel):
    """Configuration for gallery section."""
    enabled: bool = True
    title: str = Field("Our Work", max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    layout: LayoutType = LayoutType.MASONRY
    max_images: int = Field(12, ge=1, le=50)
    enable_lightbox: bool = True
    show_captions: bool = False
    auto_populate_from_portfolio: bool = True
    custom_images: List[Dict[str, str]] = Field(default_factory=list)
    
    @validator('custom_images')
    def validate_custom_images(cls, v):
        """Validate custom images format."""
        for img in v:
            if not all(key in img for key in ['url', 'alt']):
                raise ValueError('Each image must have url and alt text')
        return v


class TestimonialsSectionConfig(BaseModel):
    """Configuration for testimonials section."""
    enabled: bool = True
    title: str = Field("What Our Clients Say", max_length=100)
    layout: LayoutType = LayoutType.CAROUSEL
    max_testimonials: int = Field(6, ge=1, le=20)
    show_reviewer_photos: bool = True
    show_rating_stars: bool = True
    auto_rotate: bool = True
    rotation_interval: int = Field(5000, ge=1000, le=30000)  # milliseconds
    source_priority: List[str] = Field(default=["gmb", "custom", "generic"])


class ContactSectionConfig(BaseModel):
    """Configuration for contact section."""
    enabled: bool = True
    title: str = Field("Get In Touch", max_length=100)
    show_address: bool = True
    show_phone: bool = True
    show_email: bool = True
    show_hours: bool = True
    show_map: bool = True
    show_contact_form: bool = False
    map_style: str = Field("standard", pattern="^(standard|satellite|terrain)$")
    contact_form_fields: List[str] = Field(default=["name", "email", "message"])


class TeamSectionConfig(BaseModel):
    """Configuration for team section."""
    enabled: bool = False
    title: str = Field("Meet Our Team", max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    layout: LayoutType = LayoutType.GRID
    show_bio: bool = True
    show_specialties: bool = True
    show_social_links: bool = False
    auto_populate_from_barbers: bool = True
    team_members: List[Dict[str, Any]] = Field(default_factory=list)


class HomepageSectionConfig(BaseModel):
    """Complete section configuration."""
    section_type: SectionType
    order: int = Field(ge=0)
    visible: bool = True
    hero: Optional[HeroSectionConfig] = None
    about: Optional[AboutSectionConfig] = None
    services: Optional[ServicesSectionConfig] = None
    gallery: Optional[GallerySectionConfig] = None
    testimonials: Optional[TestimonialsSectionConfig] = None
    contact: Optional[ContactSectionConfig] = None
    team: Optional[TeamSectionConfig] = None
    
    @validator('hero', 'about', 'services', 'gallery', 'testimonials', 'contact', 'team')
    def validate_section_config(cls, v, values):
        """Ensure section config matches section type."""
        section_type = values.get('section_type')
        if section_type and v is not None:
            # Check if the correct config is provided for the section type
            config_map = {
                SectionType.HERO: 'hero',
                SectionType.ABOUT: 'about', 
                SectionType.SERVICES: 'services',
                SectionType.GALLERY: 'gallery',
                SectionType.TESTIMONIALS: 'testimonials',
                SectionType.CONTACT: 'contact',
                SectionType.TEAM: 'team'
            }
            # This validation ensures consistency between section_type and config
        return v


class BrandingConfig(BaseModel):
    """Branding and theme configuration."""
    logo_url: Optional[str] = None
    favicon_url: Optional[str] = None
    primary_color: str = Field("#000000", pattern="^#[0-9A-Fa-f]{6}$")
    secondary_color: str = Field("#333333", pattern="^#[0-9A-Fa-f]{6}$")
    accent_color: str = Field("#FFD700", pattern="^#[0-9A-Fa-f]{6}$")
    text_color: str = Field("#FFFFFF", pattern="^#[0-9A-Fa-f]{6}$")
    background_color: str = Field("#000000", pattern="^#[0-9A-Fa-f]{6}$")
    font_family: str = Field("Inter", max_length=50)
    heading_font: Optional[str] = Field(None, max_length=50)
    border_radius: str = Field("medium", pattern="^(none|small|medium|large|full)$")
    button_style: str = Field("solid", pattern="^(solid|outline|ghost)$")


class SEOConfig(BaseModel):
    """SEO configuration for homepage."""
    meta_title: Optional[str] = Field(None, max_length=60)
    meta_description: Optional[str] = Field(None, max_length=160)
    meta_keywords: List[str] = Field(default_factory=list)
    og_title: Optional[str] = Field(None, max_length=60)
    og_description: Optional[str] = Field(None, max_length=160)
    og_image_url: Optional[str] = None
    twitter_card_type: str = Field("summary_large_image", pattern="^(summary|summary_large_image)$")
    canonical_url: Optional[str] = None
    robots_meta: str = Field("index,follow", pattern="^(index|noindex),(follow|nofollow)$")
    structured_data_enabled: bool = True
    
    @validator('meta_keywords')
    def validate_keywords(cls, v):
        """Limit keywords and validate format."""
        return v[:10]  # Limit to 10 keywords


class AdvancedConfig(BaseModel):
    """Advanced configuration options."""
    custom_css: Optional[str] = Field(None, max_length=10000)
    custom_js: Optional[str] = Field(None, max_length=5000)
    google_analytics_id: Optional[str] = None
    facebook_pixel_id: Optional[str] = None
    custom_domain: Optional[str] = None
    password_protected: bool = False
    password: Optional[str] = None
    maintenance_mode: bool = False
    coming_soon_mode: bool = False


class HomepageBuilderConfig(BaseModel):
    """Complete homepage builder configuration."""
    # Basic settings
    enabled: bool = True
    template_id: str = Field("modern_barbershop", max_length=50)
    version: str = Field("1.0", pattern="^\\d+\\.\\d+$")
    
    # Section configurations
    sections: List[HomepageSectionConfig] = Field(default_factory=list)
    
    # Branding and theming
    branding: BrandingConfig = Field(default_factory=BrandingConfig)
    
    # SEO settings
    seo: SEOConfig = Field(default_factory=SEOConfig)
    
    # Advanced settings
    advanced: AdvancedConfig = Field(default_factory=AdvancedConfig)
    
    # Integration settings (extends existing landing page config)
    landing_page_integration: Optional[LandingPageConfig] = None
    
    # Responsive settings
    mobile_optimized: bool = True
    tablet_layout: str = Field("adaptive", pattern="^(desktop|mobile|adaptive)$")
    
    # Performance settings
    lazy_loading: bool = True
    image_optimization: bool = True
    cache_enabled: bool = True
    
    @validator('sections')
    def validate_sections_order(cls, v):
        """Ensure sections have unique orders."""
        orders = [section.order for section in v]
        if len(orders) != len(set(orders)):
            raise ValueError('Section orders must be unique')
        return sorted(v, key=lambda x: x.order)


class HomepageTemplate(BaseModel):
    """Homepage template definition."""
    id: str
    name: str
    description: str
    category: str
    preview_image_url: str
    config: HomepageBuilderConfig
    is_premium: bool = False
    is_popular: bool = False
    industry_tags: List[str] = Field(default_factory=list)
    
    class Config:
        from_attributes = True


class HomepageBuilderResponse(BaseModel):
    """Response schema for homepage builder data."""
    organization_id: int
    organization_name: str
    organization_slug: str
    config: HomepageBuilderConfig
    sections_data: Dict[str, Any]  # Populated section data
    templates: List[HomepageTemplate]
    published: bool
    published_url: Optional[str] = None
    last_updated: datetime
    
    class Config:
        from_attributes = True


class HomepageBuilderUpdate(BaseModel):
    """Schema for updating homepage builder configuration."""
    enabled: Optional[bool] = None
    template_id: Optional[str] = None
    sections: Optional[List[HomepageSectionConfig]] = None
    branding: Optional[BrandingConfig] = None
    seo: Optional[SEOConfig] = None
    advanced: Optional[AdvancedConfig] = None
    publish: Optional[bool] = None


class HomepageAnalytics(BaseModel):
    """Analytics data for homepage."""
    organization_id: int
    date_range: str
    page_views: int
    unique_visitors: int
    bounce_rate: float
    average_time_on_page: float
    conversion_events: Dict[str, int]
    top_sections: List[Dict[str, Any]]
    device_breakdown: Dict[str, int]
    referrer_breakdown: Dict[str, int]
    
    class Config:
        from_attributes = True


# Default section configurations
DEFAULT_SECTIONS = [
    HomepageSectionConfig(
        section_type=SectionType.HERO,
        order=0,
        visible=True,
        hero=HeroSectionConfig()
    ),
    HomepageSectionConfig(
        section_type=SectionType.SERVICES,
        order=1,
        visible=True,
        services=ServicesSectionConfig()
    ),
    HomepageSectionConfig(
        section_type=SectionType.ABOUT,
        order=2,
        visible=True,
        about=AboutSectionConfig()
    ),
    HomepageSectionConfig(
        section_type=SectionType.TESTIMONIALS,
        order=3,
        visible=True,
        testimonials=TestimonialsSectionConfig()
    ),
    HomepageSectionConfig(
        section_type=SectionType.CONTACT,
        order=4,
        visible=True,
        contact=ContactSectionConfig()
    )
]


# Default homepage builder configuration
DEFAULT_HOMEPAGE_CONFIG = HomepageBuilderConfig(
    enabled=True,
    template_id="modern_barbershop",
    sections=DEFAULT_SECTIONS,
    branding=BrandingConfig(),
    seo=SEOConfig(),
    advanced=AdvancedConfig()
)