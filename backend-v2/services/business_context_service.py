"""
Business Context Extraction Service for BookedBarber V2.
Extracts business information from existing models to provide context for AI-powered review responses.
Implements secure caching and follows established service patterns.
"""

import logging
import re
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timedelta
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, func, distinct
from functools import lru_cache
from dataclasses import dataclass
import redis
import json
import os

from models import User, Service, Client
from location_models import BarbershopLocation, BarberLocation
from models.integration import Integration, IntegrationType
from utils.encryption import decrypt_data


# Configure logging
logger = logging.getLogger(__name__)

# Redis configuration for caching
try:
    redis_client = redis.from_url(os.getenv("REDIS_URL", "redis://localhost:6379"))
    CACHE_ENABLED = True
except Exception as e:
    logger.warning(f"Redis not available, caching disabled: {e}")
    redis_client = None
    CACHE_ENABLED = False

# Cache TTL settings
CACHE_TTL = {
    "business_context": 1800,  # 30 minutes
    "barber_info": 3600,       # 1 hour
    "service_keywords": 7200,   # 2 hours
    "location_seo": 3600       # 1 hour
}


@dataclass
class BusinessContext:
    """Business context data for AI response generation"""
    business_name: str
    location_name: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    specialty_services: List[str] = None
    barber_names: List[str] = None
    total_barbers: int = 0
    years_established: Optional[int] = None
    
    def __post_init__(self):
        if self.specialty_services is None:
            self.specialty_services = []
        if self.barber_names is None:
            self.barber_names = []


@dataclass
class BarberInfo:
    """Individual barber information"""
    id: int
    name: str
    specialties: List[str]
    years_experience: Optional[int] = None
    total_clients: int = 0
    average_rating: Optional[float] = None
    location_names: List[str] = None
    
    def __post_init__(self):
        if self.specialties is None:
            self.specialties = []
        if self.location_names is None:
            self.location_names = []


class BusinessContextService:
    """Service for extracting business context from existing models"""
    
    def __init__(self, db: Session):
        self.db = db
        
        # SEO keywords for local search optimization
        self.industry_keywords = [
            "barber", "barbershop", "barber shop", "hair salon", "men's grooming",
            "haircut", "hair styling", "beard trim", "hot shave", "straight razor",
            "fade", "buzz cut", "scissor cut", "beard grooming", "mustache trim",
            "professional", "experienced", "skilled", "licensed", "certified",
            "clean", "sanitized", "modern", "traditional", "classic", "trendy"
        ]
        
        # Service category keywords mapping
        self.service_keywords_map = {
            "haircut": ["haircut", "hair styling", "fade", "buzz cut", "scissor cut", "trim"],
            "shave": ["shave", "hot shave", "straight razor", "face shave"],
            "beard": ["beard trim", "beard grooming", "beard styling", "mustache"],
            "hair_treatment": ["scalp treatment", "hair wash", "conditioning"],
            "styling": ["hair styling", "pompadour", "slick back", "textured"],
            "color": ["hair color", "highlights", "gray coverage"],
            "package": ["full service", "premium package", "complete grooming"]
        }
    
    def _get_cache_key(self, prefix: str, identifier: Any) -> str:
        """Generate consistent cache key"""
        return f"business_context:{prefix}:{identifier}"
    
    def _get_from_cache(self, key: str) -> Optional[Any]:
        """Get data from cache if available"""
        if not CACHE_ENABLED:
            return None
        
        try:
            cached_data = redis_client.get(key)
            if cached_data:
                return json.loads(cached_data)
        except Exception as e:
            logger.warning(f"Cache get error for key {key}: {e}")
        
        return None
    
    def _set_cache(self, key: str, data: Any, ttl: int) -> None:
        """Set data in cache with TTL"""
        if not CACHE_ENABLED:
            return
        
        try:
            redis_client.setex(key, ttl, json.dumps(data, default=str))
        except Exception as e:
            logger.warning(f"Cache set error for key {key}: {e}")
    
    def _sanitize_input(self, value: Any) -> Any:
        """Sanitize input to prevent injection attacks"""
        if isinstance(value, str):
            # Remove potentially dangerous characters
            sanitized = re.sub(r'[<>"\';\\]', '', value)
            return sanitized.strip()
        elif isinstance(value, int):
            # Ensure reasonable bounds for IDs
            if value < 0 or value > 2147483647:  # Max int32
                raise ValueError(f"Invalid ID value: {value}")
            return value
        return value
    
    def get_business_context(self, user_id: int) -> BusinessContext:
        """
        Extract comprehensive business context for a user/business.
        
        Args:
            user_id: User ID to get context for
            
        Returns:
            BusinessContext object with all available business information
            
        Raises:
            ValueError: If user_id is invalid
            HTTPException: If user not found or access denied
        """
        # Input validation
        user_id = self._sanitize_input(user_id)
        
        # Check cache first
        cache_key = self._get_cache_key("business", user_id)
        cached_context = self._get_from_cache(cache_key)
        if cached_context:
            return BusinessContext(**cached_context)
        
        try:
            # Get user with role information
            user = self.db.query(User).filter(
                and_(User.id == user_id, User.is_active == True)
            ).first()
            
            if not user:
                raise ValueError(f"User with ID {user_id} not found or inactive")
            
            # Initialize context with user data
            business_name = "Professional Barbershop"  # Default fallback
            
            # Try to get business name from BookingSettings or user data
            try:
                from models import BookingSettings
                booking_settings = self.db.query(BookingSettings).first()
                if booking_settings and booking_settings.business_name:
                    business_name = booking_settings.business_name
            except Exception as e:
                logger.debug(f"Could not get booking settings: {e}")
            
            # Get location information if user is associated with a location
            location_info = self._get_location_info(user_id)
            
            # Get barber information for the business
            barber_names = self._get_barber_names(user_id)
            
            # Get specialty services offered
            specialty_services = self._get_business_services(user_id)
            
            # Build context object
            context = BusinessContext(
                business_name=business_name,
                location_name=location_info.get("name"),
                address=location_info.get("address"),
                city=location_info.get("city"),
                state=location_info.get("state"),
                phone=location_info.get("phone") or user.phone,
                email=location_info.get("email") or user.email,
                specialty_services=specialty_services,
                barber_names=barber_names,
                total_barbers=len(barber_names)
            )
            
            # Cache the result
            context_dict = context.__dict__.copy()
            self._set_cache(cache_key, context_dict, CACHE_TTL["business_context"])
            
            return context
            
        except Exception as e:
            logger.error(f"Error getting business context for user {user_id}: {e}")
            raise
    
    def get_barber_info(self, barber_id: int) -> BarberInfo:
        """
        Get detailed information about a specific barber.
        
        Args:
            barber_id: Barber user ID
            
        Returns:
            BarberInfo object with barber details
        """
        # Input validation
        barber_id = self._sanitize_input(barber_id)
        
        # Check cache first
        cache_key = self._get_cache_key("barber", barber_id)
        cached_info = self._get_from_cache(cache_key)
        if cached_info:
            return BarberInfo(**cached_info)
        
        try:
            # Get barber user record
            barber = self.db.query(User).filter(
                and_(
                    User.id == barber_id,
                    User.role == "barber",
                    User.is_active == True
                )
            ).first()
            
            if not barber:
                raise ValueError(f"Barber with ID {barber_id} not found")
            
            # Get barber's specialties from services they offer
            specialties = self._get_barber_specialties(barber_id)
            
            # Get client count
            total_clients = self.db.query(func.count(distinct(Client.id))).filter(
                Client.barber_id == barber_id
            ).scalar() or 0
            
            # Get location names where barber works
            location_names = self._get_barber_locations(barber_id)
            
            # Build barber info
            barber_info = BarberInfo(
                id=barber_id,
                name=barber.name or "Professional Barber",
                specialties=specialties,
                total_clients=total_clients,
                location_names=location_names
            )
            
            # Cache the result
            info_dict = barber_info.__dict__.copy()
            self._set_cache(cache_key, info_dict, CACHE_TTL["barber_info"])
            
            return barber_info
            
        except Exception as e:
            logger.error(f"Error getting barber info for ID {barber_id}: {e}")
            raise
    
    def get_service_keywords(self, service_ids: List[int]) -> List[str]:
        """
        Get SEO keywords for specified services.
        
        Args:
            service_ids: List of service IDs to get keywords for
            
        Returns:
            List of relevant SEO keywords
        """
        # Input validation
        if not service_ids:
            return []
        
        service_ids = [self._sanitize_input(sid) for sid in service_ids]
        
        # Check cache
        cache_key = self._get_cache_key("services", "_".join(map(str, service_ids)))
        cached_keywords = self._get_from_cache(cache_key)
        if cached_keywords:
            return cached_keywords
        
        try:
            # Get services from database
            services = self.db.query(Service).filter(
                and_(
                    Service.id.in_(service_ids),
                    Service.is_active == True
                )
            ).all()
            
            keywords = set()
            
            # Add industry base keywords
            keywords.update(self.industry_keywords[:10])  # Top 10 industry keywords
            
            # Add service-specific keywords
            for service in services:
                # Add service name as keyword
                if service.name:
                    keywords.add(service.name.lower())
                
                # Add category-specific keywords
                if service.category:
                    category_keywords = self.service_keywords_map.get(
                        service.category.value, []
                    )
                    keywords.update(category_keywords)
            
            keyword_list = list(keywords)
            
            # Cache the result
            self._set_cache(cache_key, keyword_list, CACHE_TTL["service_keywords"])
            
            return keyword_list
            
        except Exception as e:
            logger.error(f"Error getting service keywords: {e}")
            return self.industry_keywords[:10]  # Fallback to base keywords
    
    def get_location_seo_terms(self, user_id: int) -> List[str]:
        """
        Get location-specific SEO terms for local search optimization.
        
        Args:
            user_id: User ID to get location terms for
            
        Returns:
            List of location-based SEO terms
        """
        # Input validation
        user_id = self._sanitize_input(user_id)
        
        # Check cache
        cache_key = self._get_cache_key("location_seo", user_id)
        cached_terms = self._get_from_cache(cache_key)
        if cached_terms:
            return cached_terms
        
        try:
            location_info = self._get_location_info(user_id)
            seo_terms = []
            
            if location_info.get("city"):
                city = location_info["city"]
                seo_terms.extend([
                    f"barber {city}",
                    f"barbershop {city}",
                    f"hair salon {city}",
                    f"men's grooming {city}",
                    f"best barber {city}",
                    f"professional barber {city}"
                ])
            
            if location_info.get("state"):
                state = location_info["state"]
                if location_info.get("city"):
                    seo_terms.extend([
                        f"barber {city} {state}",
                        f"barbershop near me {city} {state}"
                    ])
            
            # Add neighborhood terms if available
            if location_info.get("address"):
                # Extract potential neighborhood from address
                address_parts = location_info["address"].split()
                for part in address_parts:
                    if len(part) > 3 and part.isalpha():
                        seo_terms.append(f"barber near {part}")
            
            # Cache the result
            self._set_cache(cache_key, seo_terms, CACHE_TTL["location_seo"])
            
            return seo_terms
            
        except Exception as e:
            logger.error(f"Error getting location SEO terms for user {user_id}: {e}")
            return []
    
    def _get_location_info(self, user_id: int) -> Dict[str, Any]:
        """Get location information for a user"""
        try:
            # Try to get from BarbershopLocation first
            location = self.db.query(BarbershopLocation).join(
                BarberLocation, BarbershopLocation.id == BarberLocation.location_id
            ).filter(
                and_(
                    BarberLocation.barber_id == user_id,
                    BarberLocation.is_active == True,
                    BarbershopLocation.status.in_(["active", "ACTIVE"])
                )
            ).first()
            
            if location:
                return {
                    "name": location.name,
                    "address": location.address,
                    "city": location.city,
                    "state": location.state,
                    "phone": location.phone,
                    "email": location.email
                }
            
        except Exception as e:
            logger.debug(f"Could not get location info from BarbershopLocation: {e}")
        
        return {}
    
    def _get_barber_names(self, user_id: int) -> List[str]:
        """Get names of all barbers in the business"""
        try:
            # Get all active barbers
            barbers = self.db.query(User.name).filter(
                and_(
                    User.role == "barber",
                    User.is_active == True,
                    User.name.isnot(None)
                )
            ).limit(10).all()  # Limit to prevent excessive data
            
            return [barber.name for barber in barbers if barber.name]
            
        except Exception as e:
            logger.debug(f"Could not get barber names: {e}")
            return []
    
    def _get_business_services(self, user_id: int) -> List[str]:
        """Get list of services offered by the business"""
        try:
            # Get active services
            services = self.db.query(Service.name).filter(
                and_(
                    Service.is_active == True,
                    Service.is_bookable_online == True,
                    Service.name.isnot(None)
                )
            ).limit(15).all()  # Limit to most relevant services
            
            return [service.name for service in services if service.name]
            
        except Exception as e:
            logger.debug(f"Could not get business services: {e}")
            return []
    
    def _get_barber_specialties(self, barber_id: int) -> List[str]:
        """Get specialties for a specific barber"""
        try:
            # Get services associated with this barber
            from models import barber_services
            
            specialties = self.db.query(Service.name, Service.category).join(
                barber_services, Service.id == barber_services.c.service_id
            ).filter(
                and_(
                    barber_services.c.barber_id == barber_id,
                    barber_services.c.is_available == True,
                    Service.is_active == True
                )
            ).all()
            
            specialty_list = []
            for name, category in specialties:
                if name:
                    specialty_list.append(name)
                if category:
                    category_keywords = self.service_keywords_map.get(
                        category.value, []
                    )
                    specialty_list.extend(category_keywords[:2])  # Top 2 per category
            
            return list(set(specialty_list))  # Remove duplicates
            
        except Exception as e:
            logger.debug(f"Could not get barber specialties for {barber_id}: {e}")
            return []
    
    def _get_barber_locations(self, barber_id: int) -> List[str]:
        """Get location names where barber works"""
        try:
            locations = self.db.query(BarbershopLocation.name).join(
                BarberLocation, BarbershopLocation.id == BarberLocation.location_id
            ).filter(
                and_(
                    BarberLocation.barber_id == barber_id,
                    BarberLocation.is_active == True,
                    BarbershopLocation.status.in_(["active", "ACTIVE"])
                )
            ).all()
            
            return [loc.name for loc in locations if loc.name]
            
        except Exception as e:
            logger.debug(f"Could not get barber locations for {barber_id}: {e}")
            return []
    
    def clear_cache(self, user_id: Optional[int] = None) -> bool:
        """
        Clear cached business context data.
        
        Args:
            user_id: If provided, clear cache for specific user only
            
        Returns:
            True if cache was cleared successfully
        """
        if not CACHE_ENABLED:
            return True
        
        try:
            if user_id:
                # Clear specific user's cache
                patterns = [
                    self._get_cache_key("business", user_id),
                    self._get_cache_key("barber", user_id),
                    self._get_cache_key("location_seo", user_id),
                ]
                for pattern in patterns:
                    redis_client.delete(pattern)
            else:
                # Clear all business context cache
                keys = redis_client.keys("business_context:*")
                if keys:
                    redis_client.delete(*keys)
            
            return True
            
        except Exception as e:
            logger.error(f"Error clearing cache: {e}")
            return False
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics for monitoring"""
        if not CACHE_ENABLED:
            return {"cache_enabled": False}
        
        try:
            keys = redis_client.keys("business_context:*")
            return {
                "cache_enabled": True,
                "total_keys": len(keys),
                "redis_info": redis_client.info("memory")
            }
        except Exception as e:
            logger.error(f"Error getting cache stats: {e}")
            return {"cache_enabled": True, "error": str(e)}