"""
Specific caching services for the booking system with TTL management and fallback.
"""

import logging
from typing import List, Optional, Dict, Any
from datetime import datetime, date
from dataclasses import dataclass
from sqlalchemy.orm import Session

from services.redis_service import cache_service
from services.cache_invalidation_service import CacheKeyGenerator
import models

logger = logging.getLogger(__name__)

@dataclass
class CacheConfig:
    """Cache configuration with TTL settings."""
    available_slots_ttl: int = 300  # 5 minutes
    barber_availability_ttl: int = 3600  # 1 hour
    business_hours_ttl: int = 86400  # 24 hours
    user_timezone_ttl: int = 3600  # 1 hour
    booking_settings_ttl: int = 86400  # 24 hours
    next_available_ttl: int = 600  # 10 minutes
    appointment_conflicts_ttl: int = 300  # 5 minutes
    barber_schedule_ttl: int = 1800  # 30 minutes

class BookingCacheService:
    """Caching service specifically for booking-related operations."""
    
    def __init__(self):
        self.cache = cache_service
        self.key_gen = CacheKeyGenerator()
        self.config = CacheConfig()
    
    def is_available(self) -> bool:
        """Check if caching is available."""
        return self.cache.is_available()
    
    # Available Slots Caching
    def get_cached_available_slots(self, target_date: date, user_timezone: Optional[str] = None, 
                                 barber_id: Optional[int] = None) -> Optional[Dict[str, Any]]:
        """Get cached available slots."""
        if not self.is_available():
            return None
        
        key = self.key_gen.available_slots_key(target_date, user_timezone, barber_id)
        
        try:
            cached_data = self.cache.get(key)
            if cached_data:
                logger.debug(f"Cache hit for available slots: {key}")
                return cached_data
        except Exception as e:
            logger.warning(f"Failed to get cached available slots: {e}")
        
        return None
    
    def cache_available_slots(self, target_date: date, slots_data: Dict[str, Any], 
                            user_timezone: Optional[str] = None, 
                            barber_id: Optional[int] = None) -> bool:
        """Cache available slots data."""
        if not self.is_available():
            return False
        
        key = self.key_gen.available_slots_key(target_date, user_timezone, barber_id)
        
        try:
            # Add cache metadata
            cache_data = {
                **slots_data,
                'cached_at': datetime.now().isoformat(),
                'cache_ttl': self.config.available_slots_ttl
            }
            
            success = self.cache.set(key, cache_data, ttl=self.config.available_slots_ttl)
            if success:
                logger.debug(f"Cached available slots: {key}")
            return success
        except Exception as e:
            logger.warning(f"Failed to cache available slots: {e}")
            return False
    
    # Barber Availability Caching
    def get_cached_barber_availability(self, barber_id: int, 
                                     day_of_week: Optional[int] = None) -> Optional[List[Dict[str, Any]]]:
        """Get cached barber availability."""
        if not self.is_available():
            return None
        
        key = self.key_gen.barber_availability_key(barber_id, day_of_week)
        
        try:
            cached_data = self.cache.get(key)
            if cached_data:
                logger.debug(f"Cache hit for barber availability: {key}")
                return cached_data
        except Exception as e:
            logger.warning(f"Failed to get cached barber availability: {e}")
        
        return None
    
    def cache_barber_availability(self, barber_id: int, availability_data: List[Dict[str, Any]], 
                                day_of_week: Optional[int] = None) -> bool:
        """Cache barber availability data."""
        if not self.is_available():
            return False
        
        key = self.key_gen.barber_availability_key(barber_id, day_of_week)
        
        try:
            # Add cache metadata
            cache_data = {
                'availability': availability_data,
                'cached_at': datetime.now().isoformat(),
                'cache_ttl': self.config.barber_availability_ttl
            }
            
            success = self.cache.set(key, cache_data, ttl=self.config.barber_availability_ttl)
            if success:
                logger.debug(f"Cached barber availability: {key}")
            return success
        except Exception as e:
            logger.warning(f"Failed to cache barber availability: {e}")
            return False
    
    # Business Hours Caching
    def get_cached_business_hours(self, location_id: Optional[int] = None) -> Optional[Dict[str, Any]]:
        """Get cached business hours."""
        if not self.is_available():
            return None
        
        key = self.key_gen.business_hours_key(location_id)
        
        try:
            cached_data = self.cache.get(key)
            if cached_data:
                logger.debug(f"Cache hit for business hours: {key}")
                return cached_data
        except Exception as e:
            logger.warning(f"Failed to get cached business hours: {e}")
        
        return None
    
    def cache_business_hours(self, business_hours_data: Dict[str, Any], 
                           location_id: Optional[int] = None) -> bool:
        """Cache business hours data."""
        if not self.is_available():
            return False
        
        key = self.key_gen.business_hours_key(location_id)
        
        try:
            # Add cache metadata
            cache_data = {
                **business_hours_data,
                'cached_at': datetime.now().isoformat(),
                'cache_ttl': self.config.business_hours_ttl
            }
            
            success = self.cache.set(key, cache_data, ttl=self.config.business_hours_ttl)
            if success:
                logger.debug(f"Cached business hours: {key}")
            return success
        except Exception as e:
            logger.warning(f"Failed to cache business hours: {e}")
            return False
    
    # User Timezone Caching
    def get_cached_user_timezone(self, user_id: int) -> Optional[str]:
        """Get cached user timezone."""
        if not self.is_available():
            return None
        
        key = self.key_gen.user_timezone_key(user_id)
        
        try:
            cached_data = self.cache.get(key)
            if cached_data:
                logger.debug(f"Cache hit for user timezone: {key}")
                return cached_data.get('timezone')
        except Exception as e:
            logger.warning(f"Failed to get cached user timezone: {e}")
        
        return None
    
    def cache_user_timezone(self, user_id: int, timezone: str) -> bool:
        """Cache user timezone."""
        if not self.is_available():
            return False
        
        key = self.key_gen.user_timezone_key(user_id)
        
        try:
            cache_data = {
                'timezone': timezone,
                'cached_at': datetime.now().isoformat(),
                'cache_ttl': self.config.user_timezone_ttl
            }
            
            success = self.cache.set(key, cache_data, ttl=self.config.user_timezone_ttl)
            if success:
                logger.debug(f"Cached user timezone: {key}")
            return success
        except Exception as e:
            logger.warning(f"Failed to cache user timezone: {e}")
            return False
    
    # Booking Settings Caching
    def get_cached_booking_settings(self, business_id: Optional[int] = None) -> Optional[Dict[str, Any]]:
        """Get cached booking settings."""
        if not self.is_available():
            return None
        
        key = self.key_gen.booking_settings_key(business_id)
        
        try:
            cached_data = self.cache.get(key)
            if cached_data:
                logger.debug(f"Cache hit for booking settings: {key}")
                return cached_data
        except Exception as e:
            logger.warning(f"Failed to get cached booking settings: {e}")
        
        return None
    
    def cache_booking_settings(self, settings_data: Dict[str, Any], 
                             business_id: Optional[int] = None) -> bool:
        """Cache booking settings."""
        if not self.is_available():
            return False
        
        key = self.key_gen.booking_settings_key(business_id)
        
        try:
            # Add cache metadata
            cache_data = {
                **settings_data,
                'cached_at': datetime.now().isoformat(),
                'cache_ttl': self.config.booking_settings_ttl
            }
            
            success = self.cache.set(key, cache_data, ttl=self.config.booking_settings_ttl)
            if success:
                logger.debug(f"Cached booking settings: {key}")
            return success
        except Exception as e:
            logger.warning(f"Failed to cache booking settings: {e}")
            return False
    
    # Next Available Slot Caching
    def get_cached_next_available(self, start_date: date, 
                                user_timezone: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """Get cached next available slot."""
        if not self.is_available():
            return None
        
        key = self.key_gen.next_available_key(start_date, user_timezone)
        
        try:
            cached_data = self.cache.get(key)
            if cached_data:
                logger.debug(f"Cache hit for next available: {key}")
                return cached_data
        except Exception as e:
            logger.warning(f"Failed to get cached next available: {e}")
        
        return None
    
    def cache_next_available(self, start_date: date, next_available_data: Dict[str, Any], 
                           user_timezone: Optional[str] = None) -> bool:
        """Cache next available slot data."""
        if not self.is_available():
            return False
        
        key = self.key_gen.next_available_key(start_date, user_timezone)
        
        try:
            # Add cache metadata
            cache_data = {
                **next_available_data,
                'cached_at': datetime.now().isoformat(),
                'cache_ttl': self.config.next_available_ttl
            }
            
            success = self.cache.set(key, cache_data, ttl=self.config.next_available_ttl)
            if success:
                logger.debug(f"Cached next available: {key}")
            return success
        except Exception as e:
            logger.warning(f"Failed to cache next available: {e}")
            return False
    
    # Appointment Conflicts Caching
    def get_cached_appointment_conflicts(self, barber_id: int, 
                                       target_date: date) -> Optional[List[Dict[str, Any]]]:
        """Get cached appointment conflicts for a barber and date."""
        if not self.is_available():
            return None
        
        key = self.key_gen.appointment_conflicts_key(barber_id, target_date)
        
        try:
            cached_data = self.cache.get(key)
            if cached_data:
                logger.debug(f"Cache hit for appointment conflicts: {key}")
                return cached_data.get('conflicts', [])
        except Exception as e:
            logger.warning(f"Failed to get cached appointment conflicts: {e}")
        
        return None
    
    def cache_appointment_conflicts(self, barber_id: int, target_date: date, 
                                  conflicts: List[Dict[str, Any]]) -> bool:
        """Cache appointment conflicts data."""
        if not self.is_available():
            return False
        
        key = self.key_gen.appointment_conflicts_key(barber_id, target_date)
        
        try:
            cache_data = {
                'conflicts': conflicts,
                'cached_at': datetime.now().isoformat(),
                'cache_ttl': self.config.appointment_conflicts_ttl
            }
            
            success = self.cache.set(key, cache_data, ttl=self.config.appointment_conflicts_ttl)
            if success:
                logger.debug(f"Cached appointment conflicts: {key}")
            return success
        except Exception as e:
            logger.warning(f"Failed to cache appointment conflicts: {e}")
            return False
    
    # Barber Schedule Caching
    def get_cached_barber_schedule(self, barber_id: int, date_from: date, 
                                 date_to: date) -> Optional[Dict[str, Any]]:
        """Get cached barber schedule for date range."""
        if not self.is_available():
            return None
        
        key = self.key_gen.barber_schedule_key(barber_id, date_from, date_to)
        
        try:
            cached_data = self.cache.get(key)
            if cached_data:
                logger.debug(f"Cache hit for barber schedule: {key}")
                return cached_data
        except Exception as e:
            logger.warning(f"Failed to get cached barber schedule: {e}")
        
        return None
    
    def cache_barber_schedule(self, barber_id: int, date_from: date, date_to: date, 
                            schedule_data: Dict[str, Any]) -> bool:
        """Cache barber schedule data."""
        if not self.is_available():
            return False
        
        key = self.key_gen.barber_schedule_key(barber_id, date_from, date_to)
        
        try:
            # Add cache metadata
            cache_data = {
                **schedule_data,
                'cached_at': datetime.now().isoformat(),
                'cache_ttl': self.config.barber_schedule_ttl
            }
            
            success = self.cache.set(key, cache_data, ttl=self.config.barber_schedule_ttl)
            if success:
                logger.debug(f"Cached barber schedule: {key}")
            return success
        except Exception as e:
            logger.warning(f"Failed to cache barber schedule: {e}")
            return False
    
    # Batch Operations
    def warm_up_cache(self, db: Session, target_dates: List[date], 
                     barber_ids: Optional[List[int]] = None) -> Dict[str, int]:
        """Warm up cache with commonly requested data."""
        stats = {
            'slots_cached': 0,
            'availability_cached': 0,
            'errors': 0
        }
        
        if not self.is_available():
            logger.warning("Cache not available for warm-up")
            return stats
        
        # Get barber IDs if not provided
        if barber_ids is None:
            try:
                barbers = db.query(models.User).filter(
                    models.User.role.in_(["barber", "admin", "super_admin"]),
                    models.User.is_active == True
                ).all()
                barber_ids = [barber.id for barber in barbers]
            except Exception as e:
                logger.error(f"Failed to get barber IDs for cache warm-up: {e}")
                stats['errors'] += 1
                return stats
        
        # Warm up available slots for each date
        for target_date in target_dates:
            try:
                # Import here to avoid circular imports
                from services.booking_service import get_available_slots
                
                # Cache general available slots
                slots_data = get_available_slots(db, target_date)
                if self.cache_available_slots(target_date, slots_data):
                    stats['slots_cached'] += 1
                
                # Cache barber-specific slots
                for barber_id in barber_ids:
                    try:
                        from services.booking_service import get_available_slots_with_barber_availability
                        barber_slots = get_available_slots_with_barber_availability(
                            db, target_date, barber_id
                        )
                        if self.cache_available_slots(target_date, barber_slots, barber_id=barber_id):
                            stats['slots_cached'] += 1
                    except Exception as e:
                        logger.warning(f"Failed to warm up barber {barber_id} slots: {e}")
                        stats['errors'] += 1
                
            except Exception as e:
                logger.error(f"Failed to warm up slots for {target_date}: {e}")
                stats['errors'] += 1
        
        # Warm up barber availability
        for barber_id in barber_ids:
            try:
                from services import barber_availability_service
                
                # Cache availability for each day of the week
                for day_of_week in range(7):
                    availability = barber_availability_service.get_barber_availability(
                        db, barber_id, day_of_week
                    )
                    if availability:
                        availability_data = [
                            {
                                'start_time': av.start_time.isoformat(),
                                'end_time': av.end_time.isoformat(),
                                'is_available': av.is_available
                            }
                            for av in availability
                        ]
                        if self.cache_barber_availability(barber_id, availability_data, day_of_week):
                            stats['availability_cached'] += 1
            except Exception as e:
                logger.error(f"Failed to warm up barber {barber_id} availability: {e}")
                stats['errors'] += 1
        
        logger.info(f"Cache warm-up completed: {stats}")
        return stats
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """Get detailed cache statistics."""
        if not self.is_available():
            return {"available": False}
        
        base_stats = self.cache.get_stats()
        
        # Add booking-specific stats
        booking_stats = {
            "cache_config": {
                "available_slots_ttl": self.config.available_slots_ttl,
                "barber_availability_ttl": self.config.barber_availability_ttl,
                "business_hours_ttl": self.config.business_hours_ttl,
                "user_timezone_ttl": self.config.user_timezone_ttl
            },
            "key_patterns": {
                "available_slots": f"{self.key_gen.AVAILABLE_SLOTS}:*",
                "barber_availability": f"{self.key_gen.BARBER_AVAILABILITY}:*",
                "business_hours": f"{self.key_gen.BUSINESS_HOURS}:*",
                "user_timezone": f"{self.key_gen.USER_TIMEZONE}:*"
            }
        }
        
        return {**base_stats, **booking_stats}
    
    def clear_expired_cache(self) -> int:
        """Clear expired cache entries (Redis handles this automatically, but useful for monitoring)."""
        # Redis automatically handles expiration, but we can provide stats
        if not self.is_available():
            return 0
        
        # This would typically be handled by Redis automatically
        # We can add manual cleanup logic here if needed
        logger.info("Cache expiration is handled automatically by Redis")
        return 0

# Global booking cache service instance
booking_cache = BookingCacheService()