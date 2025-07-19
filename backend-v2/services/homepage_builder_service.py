"""Service for homepage builder functionality.

This service extends the existing landing page service to provide advanced
homepage customization capabilities with section-based design.
"""

from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any, Union
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc
import json
import logging
from cachetools import TTLCache
import secrets

from models import User, Service, Organization
from models.integration import Integration, IntegrationType
from schemas_new.homepage_builder import (
    HomepageBuilderConfig,
    HomepageBuilderResponse,
    HomepageBuilderUpdate,
    HomepageTemplate,
    HomepageSectionConfig,
    SectionType,
    DEFAULT_HOMEPAGE_CONFIG,
    DEFAULT_SECTIONS,
    HeroSectionConfig,
    AboutSectionConfig,
    ServicesSectionConfig,
    GallerySectionConfig,
    TestimonialsSectionConfig,
    ContactSectionConfig,
    TeamSectionConfig,
    BrandingConfig,
    SEOConfig,
    AdvancedConfig
)
from schemas_new.landing_page import (
    TestimonialData,
    ServicePreview
)
from services.landing_page_service import LandingPageService
from services.guest_booking_service import GuestBookingService

logger = logging.getLogger(__name__)

# Cache for homepage builder data (TTL: 1 hour)
homepage_cache = TTLCache(maxsize=500, ttl=3600)
templates_cache = TTLCache(maxsize=100, ttl=86400)  # 24 hours


class HomepageBuilderService:
    """Service for managing advanced homepage builder functionality."""
    
    @staticmethod
    def get_organization_homepage_config(
        db: Session,
        organization: Organization
    ) -> HomepageBuilderConfig:
        """Get homepage builder configuration for an organization."""
        
        # Check for existing homepage builder config in landing_page_config
        config_data = {}
        if hasattr(organization, 'landing_page_config') and organization.landing_page_config:
            config_data = organization.landing_page_config
            
            # Check if this is a homepage builder config (has sections)
            if 'sections' in config_data and 'branding' in config_data:
                try:
                    return HomepageBuilderConfig(**config_data)
                except Exception as e:
                    logger.warning(f"Failed to parse homepage builder config: {e}")
        
        # If no homepage builder config exists, create default
        return DEFAULT_HOMEPAGE_CONFIG
    
    @staticmethod
    def update_homepage_config(
        db: Session,
        organization: Organization,
        config_updates: HomepageBuilderUpdate
    ) -> HomepageBuilderConfig:
        """Update homepage builder configuration."""
        
        # Get current config
        current_config = HomepageBuilderService.get_organization_homepage_config(db, organization)
        current_dict = current_config.dict()
        
        # Apply updates
        update_dict = config_updates.dict(exclude_unset=True)
        
        # Handle nested updates carefully
        for key, value in update_dict.items():
            if key in ['branding', 'seo', 'advanced'] and value is not None:
                # Merge nested configs
                if key in current_dict and current_dict[key]:
                    current_dict[key].update(value)
                else:
                    current_dict[key] = value
            elif key == 'sections' and value is not None:
                # Replace sections entirely
                current_dict[key] = [section.dict() for section in value]
            else:
                current_dict[key] = value
        
        # Validate updated config
        try:
            updated_config = HomepageBuilderConfig(**current_dict)
        except Exception as e:
            logger.error(f"Failed to validate updated homepage config: {e}")
            raise ValueError(f"Invalid configuration: {e}")
        
        # Save to organization
        organization.landing_page_config = updated_config.dict()
        db.commit()
        
        # Clear cache
        cache_key = f"homepage_builder_{organization.slug}"
        homepage_cache.pop(cache_key, None)
        
        return updated_config
    
    @staticmethod
    def get_section_data(
        db: Session,
        organization: Organization,
        section_config: HomepageSectionConfig
    ) -> Dict[str, Any]:
        """Get populated data for a specific section."""
        
        section_data = {
            "type": section_config.section_type,
            "order": section_config.order,
            "visible": section_config.visible
        }
        
        if section_config.section_type == SectionType.HERO:
            hero_config = section_config.hero
            if hero_config:
                section_data.update({
                    "title": hero_config.title or f"Welcome to {organization.name}",
                    "subtitle": hero_config.subtitle or "Professional Barber Services",
                    "description": hero_config.description or organization.description,
                    "background_media_url": hero_config.background_media_url,
                    "cta_text": hero_config.cta_text,
                    "cta_secondary_text": hero_config.cta_secondary_text,
                    "booking_url": f"/book/{organization.slug}"
                })
                
                if hero_config.show_rating:
                    # Get average rating from testimonials or reviews
                    section_data["rating"] = {
                        "value": 4.8,  # TODO: Calculate from actual reviews
                        "count": 127   # TODO: Get actual review count
                    }
        
        elif section_config.section_type == SectionType.SERVICES:
            services_config = section_config.services
            if services_config:
                services = HomepageBuilderService.get_services_data(
                    db, organization, services_config
                )
                section_data.update({
                    "title": services_config.title,
                    "description": services_config.description,
                    "services": services,
                    "layout": services_config.layout,
                    "show_pricing": services_config.show_pricing,
                    "show_duration": services_config.show_duration
                })
        
        elif section_config.section_type == SectionType.ABOUT:
            about_config = section_config.about
            if about_config:
                section_data.update({
                    "title": about_config.title,
                    "content": about_config.content or organization.description,
                    "layout": about_config.layout,
                    "image_url": about_config.image_url,
                    "highlight_stats": about_config.highlight_stats
                })
        
        elif section_config.section_type == SectionType.GALLERY:
            gallery_config = section_config.gallery
            if gallery_config:
                gallery_data = HomepageBuilderService.get_gallery_data(
                    db, organization, gallery_config
                )
                section_data.update({
                    "title": gallery_config.title,
                    "description": gallery_config.description,
                    "images": gallery_data,
                    "layout": gallery_config.layout,
                    "enable_lightbox": gallery_config.enable_lightbox
                })
        
        elif section_config.section_type == SectionType.TESTIMONIALS:
            testimonials_config = section_config.testimonials
            if testimonials_config:
                # Use existing landing page service for testimonials
                landing_config = LandingPageService.get_organization_landing_config(db, organization)
                testimonials = []
                try:
                    # This is async, so we'll need to handle it differently in a real implementation
                    # For now, provide fallback data
                    testimonials = LandingPageService.get_generic_testimonials(
                        limit=testimonials_config.max_testimonials
                    )
                except Exception as e:
                    logger.warning(f"Failed to get testimonials: {e}")
                
                section_data.update({
                    "title": testimonials_config.title,
                    "testimonials": [t.dict() for t in testimonials],
                    "layout": testimonials_config.layout,
                    "show_reviewer_photos": testimonials_config.show_reviewer_photos,
                    "auto_rotate": testimonials_config.auto_rotate
                })
        
        elif section_config.section_type == SectionType.CONTACT:
            contact_config = section_config.contact
            if contact_config:
                section_data.update({
                    "title": contact_config.title,
                    "address": {
                        "street": organization.street_address,
                        "city": organization.city,
                        "state": organization.state,
                        "zip_code": organization.zip_code
                    },
                    "phone": organization.phone,
                    "email": organization.email,
                    "show_map": contact_config.show_map,
                    "show_contact_form": contact_config.show_contact_form
                })
        
        elif section_config.section_type == SectionType.TEAM:
            team_config = section_config.team
            if team_config:
                team_data = HomepageBuilderService.get_team_data(
                    db, organization, team_config
                )
                section_data.update({
                    "title": team_config.title,
                    "description": team_config.description,
                    "team_members": team_data,
                    "layout": team_config.layout,
                    "show_bio": team_config.show_bio,
                    "show_specialties": team_config.show_specialties
                })
        
        return section_data
    
    @staticmethod
    def get_services_data(
        db: Session,
        organization: Organization,
        config: ServicesSectionConfig
    ) -> List[Dict[str, Any]]:
        """Get services data for services section."""
        
        # Get services from organization
        services = GuestBookingService.get_organization_services(
            db, organization, active_only=True
        )
        
        # Filter to featured services if specified
        if config.featured_service_ids:
            services = [s for s in services if s.id in config.featured_service_ids]
        
        # Limit to max display count
        services = services[:config.max_services_display]
        
        # Convert to display format
        services_data = []
        for service in services:
            service_data = {
                "id": service.id,
                "name": service.name,
                "description": service.description if config.show_description else None,
                "duration": service.duration if config.show_duration else None,
                "price": service.price if config.show_pricing else None,
                "booking_enabled": config.enable_service_booking
            }
            services_data.append(service_data)
        
        return services_data
    
    @staticmethod
    def get_gallery_data(
        db: Session,
        organization: Organization,
        config: GallerySectionConfig
    ) -> List[Dict[str, str]]:
        """Get gallery data for gallery section."""
        
        images = []
        
        # Auto-populate from portfolio if enabled
        if config.auto_populate_from_portfolio:
            # TODO: Get images from organization portfolio/media
            # For now, use placeholder data
            portfolio_images = [
                {"url": "/assets/gallery/sample1.jpg", "alt": "Haircut style 1"},
                {"url": "/assets/gallery/sample2.jpg", "alt": "Haircut style 2"},
                {"url": "/assets/gallery/sample3.jpg", "alt": "Haircut style 3"}
            ]
            images.extend(portfolio_images)
        
        # Add custom images
        if config.custom_images:
            images.extend(config.custom_images)
        
        # Limit to max images
        return images[:config.max_images]
    
    @staticmethod
    def get_team_data(
        db: Session,
        organization: Organization,
        config: TeamSectionConfig
    ) -> List[Dict[str, Any]]:
        """Get team data for team section."""
        
        team_members = []
        
        if config.auto_populate_from_barbers:
            # Get barbers from organization
            # TODO: Implement proper barber fetching from user_organizations
            # For now, return sample data
            sample_barbers = [
                {
                    "id": 1,
                    "name": "Mike Johnson",
                    "title": "Senior Barber",
                    "bio": "15+ years of experience in classic and modern styles",
                    "photo_url": "/assets/team/barber1.jpg",
                    "specialties": ["Fades", "Beard Trim", "Classic Cuts"]
                }
            ]
            team_members.extend(sample_barbers)
        
        # Add custom team members
        if config.team_members:
            team_members.extend(config.team_members)
        
        return team_members
    
    @staticmethod
    async def get_homepage_builder_data(
        db: Session,
        organization_slug: str
    ) -> Optional[HomepageBuilderResponse]:
        """Get complete homepage builder data for an organization."""
        
        cache_key = f"homepage_builder_{organization_slug}"
        
        # Check cache first
        if cache_key in homepage_cache:
            return homepage_cache[cache_key]
        
        # Get organization
        organization = db.query(Organization).filter(
            Organization.slug == organization_slug,
            Organization.is_active == True
        ).first()
        
        if not organization:
            return None
        
        # Get homepage config
        config = HomepageBuilderService.get_organization_homepage_config(db, organization)
        
        # If homepage builder is not enabled, return None
        if not config.enabled:
            return None
        
        # Get populated section data
        sections_data = {}
        for section_config in config.sections:
            if section_config.visible:
                section_data = HomepageBuilderService.get_section_data(
                    db, organization, section_config
                )
                sections_data[section_config.section_type] = section_data
        
        # Get available templates
        templates = HomepageBuilderService.get_available_templates()
        
        # Create response
        homepage_data = HomepageBuilderResponse(
            organization_id=organization.id,
            organization_name=organization.name,
            organization_slug=organization.slug,
            config=config,
            sections_data=sections_data,
            templates=templates,
            published=config.enabled,
            published_url=f"/{organization.slug}" if config.enabled else None,
            last_updated=datetime.utcnow()
        )
        
        # Cache the result
        homepage_cache[cache_key] = homepage_data
        
        return homepage_data
    
    @staticmethod
    def get_available_templates() -> List[HomepageTemplate]:
        """Get available homepage templates."""
        
        cache_key = "homepage_templates"
        
        # Check cache first
        if cache_key in templates_cache:
            return templates_cache[cache_key]
        
        # Define available templates
        templates = [
            HomepageTemplate(
                id="modern_barbershop",
                name="Modern Barbershop",
                description="Clean, professional design perfect for contemporary barbershops",
                category="modern",
                preview_image_url="/assets/templates/modern_barbershop.jpg",
                config=HomepageBuilderConfig(
                    template_id="modern_barbershop",
                    sections=DEFAULT_SECTIONS,
                    branding=BrandingConfig(
                        primary_color="#1a1a1a",
                        accent_color="#FFD700",
                        font_family="Inter"
                    )
                ),
                is_popular=True,
                industry_tags=["barbershop", "modern", "professional"]
            ),
            HomepageTemplate(
                id="classic_barber",
                name="Classic Barber",
                description="Traditional barbershop aesthetic with vintage charm",
                category="classic",
                preview_image_url="/assets/templates/classic_barber.jpg",
                config=HomepageBuilderConfig(
                    template_id="classic_barber",
                    sections=DEFAULT_SECTIONS,
                    branding=BrandingConfig(
                        primary_color="#8B4513",
                        accent_color="#FFD700",
                        font_family="Playfair Display"
                    )
                ),
                industry_tags=["barbershop", "classic", "vintage"]
            ),
            HomepageTemplate(
                id="luxury_salon",
                name="Luxury Salon",
                description="Premium design for high-end barbershops and salons",
                category="luxury",
                preview_image_url="/assets/templates/luxury_salon.jpg",
                config=HomepageBuilderConfig(
                    template_id="luxury_salon",
                    sections=DEFAULT_SECTIONS,
                    branding=BrandingConfig(
                        primary_color="#000000",
                        accent_color="#C9A961",
                        font_family="Cormorant Garamond"
                    )
                ),
                is_premium=True,
                industry_tags=["salon", "luxury", "premium"]
            ),
            HomepageTemplate(
                id="minimalist",
                name="Minimalist",
                description="Clean, simple design focusing on services and booking",
                category="minimalist",
                preview_image_url="/assets/templates/minimalist.jpg",
                config=HomepageBuilderConfig(
                    template_id="minimalist",
                    sections=[
                        HomepageSectionConfig(
                            section_type=SectionType.HERO,
                            order=0,
                            visible=True,
                            hero=HeroSectionConfig(
                                background_type="color",
                                background_color="#f8f9fa"
                            )
                        ),
                        HomepageSectionConfig(
                            section_type=SectionType.SERVICES,
                            order=1,
                            visible=True,
                            services=ServicesSectionConfig()
                        ),
                        HomepageSectionConfig(
                            section_type=SectionType.CONTACT,
                            order=2,
                            visible=True,
                            contact=ContactSectionConfig()
                        )
                    ],
                    branding=BrandingConfig(
                        primary_color="#343a40",
                        accent_color="#007bff",
                        font_family="System UI"
                    )
                ),
                industry_tags=["minimal", "clean", "simple"]
            )
        ]
        
        # Cache the templates
        templates_cache[cache_key] = templates
        
        return templates
    
    @staticmethod
    def get_template_by_id(template_id: str) -> Optional[HomepageTemplate]:
        """Get a specific template by ID."""
        templates = HomepageBuilderService.get_available_templates()
        return next((t for t in templates if t.id == template_id), None)
    
    @staticmethod
    def apply_template(
        db: Session,
        organization: Organization,
        template_id: str,
        preserve_content: bool = True
    ) -> HomepageBuilderConfig:
        """Apply a template to an organization's homepage."""
        
        template = HomepageBuilderService.get_template_by_id(template_id)
        if not template:
            raise ValueError(f"Template {template_id} not found")
        
        # Get current config if preserving content
        current_config = None
        if preserve_content:
            current_config = HomepageBuilderService.get_organization_homepage_config(
                db, organization
            )
        
        # Start with template config
        new_config = template.config.copy()
        
        # Preserve existing content if requested
        if preserve_content and current_config:
            # Preserve custom content in sections
            for section in new_config.sections:
                # Find matching section in current config
                current_section = next(
                    (s for s in current_config.sections if s.section_type == section.section_type),
                    None
                )
                if current_section:
                    # Preserve custom text content
                    if section.hero and current_section.hero:
                        if current_section.hero.title:
                            section.hero.title = current_section.hero.title
                        if current_section.hero.subtitle:
                            section.hero.subtitle = current_section.hero.subtitle
                    
                    # Similar preservation for other section types...
        
        # Update the configuration
        update = HomepageBuilderUpdate(
            template_id=template_id,
            sections=new_config.sections,
            branding=new_config.branding,
            seo=new_config.seo,
            advanced=new_config.advanced
        )
        
        return HomepageBuilderService.update_homepage_config(db, organization, update)
    
    @staticmethod
    def duplicate_from_landing_page(
        db: Session,
        organization: Organization
    ) -> HomepageBuilderConfig:
        """Create homepage builder config from existing landing page config."""
        
        # Get existing landing page config
        landing_config = LandingPageService.get_organization_landing_config(db, organization)
        
        # Convert to homepage builder format
        sections = DEFAULT_SECTIONS.copy()
        
        # Update branding based on landing page
        branding = BrandingConfig(
            logo_url=landing_config.logo_url,
            primary_color=landing_config.primary_color,
            accent_color=landing_config.accent_color
        )
        
        # Update hero section with landing page data
        for section in sections:
            if section.section_type == SectionType.HERO and section.hero:
                section.hero.title = landing_config.custom_headline
        
        homepage_config = HomepageBuilderConfig(
            enabled=landing_config.enabled,
            template_id="modern_barbershop",
            sections=sections,
            branding=branding
        )
        
        # Save the new config
        organization.landing_page_config = homepage_config.dict()
        db.commit()
        
        return homepage_config
    
    @staticmethod
    def publish_homepage(
        db: Session,
        organization: Organization
    ) -> bool:
        """Publish the homepage (enable it)."""
        
        config = HomepageBuilderService.get_organization_homepage_config(db, organization)
        if not config.enabled:
            update = HomepageBuilderUpdate(enabled=True)
            HomepageBuilderService.update_homepage_config(db, organization, update)
        
        return True
    
    @staticmethod
    def unpublish_homepage(
        db: Session,
        organization: Organization
    ) -> bool:
        """Unpublish the homepage (disable it)."""
        
        update = HomepageBuilderUpdate(enabled=False)
        HomepageBuilderService.update_homepage_config(db, organization, update)
        return True


# Create singleton instance
homepage_builder_service = HomepageBuilderService()