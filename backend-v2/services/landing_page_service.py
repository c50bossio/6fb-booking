"""Service for handling landing page functionality and GMB integration."""

from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
import logging
from cachetools import TTLCache
import secrets

from models import Organization
from models.integration import Integration, IntegrationType
from schemas_new.landing_page import (
    LandingPageConfig,
    LandingPageResponse,
    TestimonialData,
    ServicePreview,
    LandingPageTrackingEvent,
    LandingPagePresets
)
from services.guest_booking_service import GuestBookingService
from services.gmb_service import GMBService

logger = logging.getLogger(__name__)

# Cache for testimonials and landing page data (TTL: 1 hour)
testimonials_cache = TTLCache(maxsize=1000, ttl=3600)
landing_page_cache = TTLCache(maxsize=500, ttl=1800)  # 30 minutes


class LandingPageService:
    """Service for managing organization landing pages."""
    
    @staticmethod
    def get_organization_landing_config(
        db: Session,
        organization: Organization
    ) -> LandingPageConfig:
        """Get landing page configuration for an organization."""
        
        # Get config from organization's landing_page_config field
        config_data = {}
        if hasattr(organization, 'landing_page_config') and organization.landing_page_config:
            config_data = organization.landing_page_config
        
        # Set defaults if not configured
        defaults = {
            "enabled": False,
            "logo_url": None,
            "primary_color": "#000000",
            "accent_color": "#FFD700",
            "background_preset": "professional_dark",
            "custom_headline": None,
            "show_testimonials": True,
            "testimonial_source": "gmb_auto",
            "custom_testimonials": None
        }
        
        # Merge with defaults
        for key, default_value in defaults.items():
            if key not in config_data:
                config_data[key] = default_value
        
        return LandingPageConfig(**config_data)
    
    @staticmethod
    def update_landing_config(
        db: Session,
        organization: Organization,
        config_updates: Dict[str, Any]
    ) -> LandingPageConfig:
        """Update landing page configuration."""
        
        # Get current config
        current_config = LandingPageService.get_organization_landing_config(db, organization)
        current_dict = current_config.dict()
        
        # Update with new values
        current_dict.update(config_updates)
        
        # Validate updated config
        updated_config = LandingPageConfig(**current_dict)
        
        # Save to organization
        organization.landing_page_config = updated_config.dict()
        db.commit()
        
        # Clear cache
        cache_key = f"landing_page_{organization.slug}"
        landing_page_cache.pop(cache_key, None)
        
        return updated_config
    
    @staticmethod
    async def get_gmb_testimonials(
        db: Session,
        organization: Organization,
        limit: int = 3
    ) -> List[TestimonialData]:
        """Get testimonials from Google My Business integration using real GMB API."""
        
        cache_key = f"gmb_testimonials_{organization.id}"
        
        # Check cache first
        if cache_key in testimonials_cache:
            return testimonials_cache[cache_key]
        
        testimonials = []
        
        try:
            # Check if organization has GMB integration
            gmb_integration = db.query(Integration).filter(
                Integration.user_id == organization.primary_owner.id if organization.primary_owner else None,
                Integration.integration_type == IntegrationType.GOOGLE_MY_BUSINESS,
                Integration.is_active == True
            ).first()
            
            if gmb_integration:
                # Use GMB service to get real reviews
                gmb_service = GMBService()
                
                # Get business locations for this integration
                try:
                    locations = await gmb_service.get_business_locations(gmb_integration)
                    
                    # Collect reviews from all locations
                    all_reviews = []
                    for location in locations:
                        try:
                            location_reviews = await gmb_service.get_location_reviews(
                                gmb_integration, 
                                location.location_id, 
                                page_size=20  # Get more reviews to filter from
                            )
                            all_reviews.extend(location_reviews)
                        except Exception as e:
                            logger.warning(f"Failed to get reviews for location {location.location_id}: {e}")
                            continue
                    
                    # Filter for 4+ star reviews with text content
                    filtered_reviews = []
                    for review in all_reviews:
                        rating = review.get('starRating', {}).get('value', 0)
                        comment = review.get('comment', '')
                        
                        if rating >= 4 and comment.strip():
                            filtered_reviews.append(review)
                    
                    # Sort by rating (desc) then date (desc)
                    sorted_reviews = sorted(
                        filtered_reviews,
                        key=lambda x: (
                            x.get('starRating', {}).get('value', 0),
                            x.get('createTime', '')
                        ),
                        reverse=True
                    )
                    
                    # Convert to TestimonialData format
                    for review in sorted_reviews[:limit]:
                        try:
                            # Parse the createTime (ISO format)
                            create_time = review.get('createTime', '')
                            if create_time:
                                # Handle different timestamp formats
                                if create_time.endswith('Z'):
                                    review_date = datetime.fromisoformat(create_time.replace('Z', '+00:00'))
                                else:
                                    review_date = datetime.fromisoformat(create_time)
                            else:
                                review_date = datetime.utcnow()
                            
                            # Get reviewer info
                            reviewer = review.get('reviewer', {})
                            reviewer_name = reviewer.get('displayName', 'Anonymous')
                            reviewer_photo = reviewer.get('profilePhotoUrl')
                            
                            testimonial = TestimonialData(
                                id=f"gmb_{review.get('name', secrets.token_hex(8)).split('/')[-1]}",
                                reviewer_name=reviewer_name,
                                review_text=review.get('comment', '').strip(),
                                rating=int(review.get('starRating', {}).get('value', 5)),
                                date=review_date,
                                source="gmb",
                                reviewer_photo_url=reviewer_photo
                            )
                            testimonials.append(testimonial)
                        except Exception as e:
                            logger.warning(f"Failed to parse GMB review: {e}")
                            continue
                    
                except Exception as e:
                    logger.error(f"Failed to fetch GMB reviews for organization {organization.id}: {e}")
            
        except Exception as e:
            logger.error(f"Error fetching GMB testimonials for organization {organization.id}: {e}")
        
        # Cache the results (even if empty, to avoid repeated API calls)
        testimonials_cache[cache_key] = testimonials
        
        return testimonials
    
    @staticmethod
    def get_generic_testimonials(limit: int = 3) -> List[TestimonialData]:
        """Get generic testimonials as fallback."""
        
        presets = LandingPagePresets.get_default_presets()
        generic_testimonials = []
        
        for i, template in enumerate(presets.testimonial_templates[:limit]):
            testimonial = TestimonialData(
                id=template['id'],
                reviewer_name=template['reviewer_name'],
                review_text=template['review_text'],
                rating=template['rating'],
                date=datetime.utcnow() - timedelta(days=i*7),  # Spread out dates
                source=template['source']
            )
            generic_testimonials.append(testimonial)
        
        return generic_testimonials
    
    @staticmethod
    async def get_testimonials(
        db: Session,
        organization: Organization,
        config: LandingPageConfig,
        limit: int = 3
    ) -> List[TestimonialData]:
        """Get testimonials based on configuration."""
        
        if not config.show_testimonials:
            return []
        
        if config.testimonial_source == "gmb_auto":
            # Try GMB first, fallback to generic
            gmb_testimonials = await LandingPageService.get_gmb_testimonials(db, organization, limit)
            if gmb_testimonials:
                return gmb_testimonials
            else:
                return LandingPageService.get_generic_testimonials(limit)
        
        elif config.testimonial_source == "generic":
            return LandingPageService.get_generic_testimonials(limit)
        
        elif config.testimonial_source == "custom" and config.custom_testimonials:
            # Convert custom testimonials to TestimonialData format
            custom_testimonials = []
            for i, custom in enumerate(config.custom_testimonials[:limit]):
                testimonial = TestimonialData(
                    id=custom.get('id', f"custom_{i}"),
                    reviewer_name=custom.get('reviewer_name', 'Anonymous'),
                    review_text=custom.get('review_text', ''),
                    rating=custom.get('rating', 5),
                    date=datetime.fromisoformat(custom.get('date', datetime.utcnow().isoformat())),
                    source="custom"
                )
                custom_testimonials.append(testimonial)
            return custom_testimonials
        
        return []
    
    @staticmethod
    def get_featured_services(
        db: Session,
        organization: Organization,
        limit: int = 4
    ) -> List[ServicePreview]:
        """Get featured services for the landing page."""
        
        # Get services from organization barbers
        services = GuestBookingService.get_organization_services(db, organization, active_only=True)
        
        # Convert to ServicePreview format
        service_previews = []
        for service in services[:limit]:
            preview = ServicePreview(
                id=service.id,
                name=service.name,
                description=service.description,
                duration=service.duration,
                price=service.price,
                is_featured=True  # Mark as featured for landing page
            )
            service_previews.append(preview)
        
        return service_previews
    
    @staticmethod
    async def get_landing_page_data(
        db: Session,
        organization_slug: str
    ) -> Optional[LandingPageResponse]:
        """Get complete landing page data for an organization."""
        
        cache_key = f"landing_page_{organization_slug}"
        
        # Check cache first
        if cache_key in landing_page_cache:
            return landing_page_cache[cache_key]
        
        # Get organization
        organization = db.query(Organization).filter(
            Organization.slug == organization_slug,
            Organization.is_active == True
        ).first()
        
        if not organization:
            return None
        
        # Get landing page config
        config = LandingPageService.get_organization_landing_config(db, organization)
        
        # If landing page is not enabled, return None
        if not config.enabled:
            return None
        
        # Get testimonials (now async)
        testimonials = await LandingPageService.get_testimonials(db, organization, config)
        
        # Get featured services
        services = LandingPageService.get_featured_services(db, organization)
        
        # Build address string
        address_parts = []
        if organization.street_address:
            address_parts.append(organization.street_address)
        if organization.city:
            address_parts.append(organization.city)
        if organization.state:
            address_parts.append(organization.state)
        address = ", ".join(address_parts) if address_parts else None
        
        # Create landing page response
        landing_page = LandingPageResponse(
            organization_id=organization.id,
            organization_name=organization.name,
            organization_slug=organization.slug,
            description=organization.description,
            phone=organization.phone,
            email=organization.email,
            address=address,
            config=config,
            services=services,
            testimonials=testimonials,
            booking_url=f"/book/{organization.slug}",
            timezone=organization.timezone,
            last_updated=datetime.utcnow()
        )
        
        # Cache the result
        landing_page_cache[cache_key] = landing_page
        
        return landing_page
    
    @staticmethod
    def track_landing_page_event(
        db: Session,
        event: LandingPageTrackingEvent
    ) -> bool:
        """Track landing page events for analytics."""
        
        try:
            # Get organization
            organization = db.query(Organization).filter(
                Organization.slug == event.organization_slug
            ).first()
            
            if not organization:
                return False
            
            # Store event in tracking table (if tracking model exists)
            # For now, we'll just log it
            logger.info(f"Landing page event: {event.event_type} for {event.organization_slug}")
            
            # TODO: Implement tracking storage when tracking model is available
            # tracking_event = TrackingEvent(
            #     organization_id=organization.id,
            #     event_type=event.event_type,
            #     event_data=event.dict(),
            #     created_at=datetime.utcnow()
            # )
            # db.add(tracking_event)
            # db.commit()
            
            return True
            
        except Exception as e:
            logger.error(f"Error tracking landing page event: {e}")
            return False
    
    @staticmethod
    def get_available_presets() -> LandingPagePresets:
        """Get available landing page presets."""
        return LandingPagePresets.get_default_presets()
    
    @staticmethod
    def generate_landing_page_url(organization_slug: str, base_url: str = "https://bookedbarber.com") -> str:
        """Generate landing page URL for an organization."""
        return f"{base_url}/{organization_slug}"
    
    @staticmethod
    def generate_booking_page_url(organization_slug: str, base_url: str = "https://bookedbarber.com") -> str:
        """Generate direct booking page URL for an organization."""
        return f"{base_url}/book/{organization_slug}"


# Create singleton instance
landing_page_service = LandingPageService()