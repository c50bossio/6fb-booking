"""
Cache invalidation strategies and managers for the booking system.
"""

import logging
from typing import List, Optional, Dict, Any, Set
from datetime import datetime, date
from enum import Enum
from services.redis_service import cache_service

logger = logging.getLogger(__name__)

class CacheInvalidationEvent(Enum):
    """Types of events that trigger cache invalidation."""
    APPOINTMENT_CREATED = "appointment_created"
    APPOINTMENT_UPDATED = "appointment_updated"
    APPOINTMENT_CANCELLED = "appointment_cancelled"
    APPOINTMENT_DELETED = "appointment_deleted"
    BARBER_AVAILABILITY_CHANGED = "barber_availability_changed"
    BUSINESS_SETTINGS_UPDATED = "business_settings_updated"
    USER_TIMEZONE_CHANGED = "user_timezone_changed"
    BOOKING_SETTINGS_CHANGED = "booking_settings_changed"
    BARBER_SCHEDULE_UPDATED = "barber_schedule_updated"

class CacheKeyGenerator:
    """Generates consistent cache keys for the booking system."""
    
    # Cache key prefixes
    AVAILABLE_SLOTS = "slots"
    BARBER_AVAILABILITY = "barber_avail"
    BUSINESS_HOURS = "business_hours"
    USER_TIMEZONE = "user_tz"
    BOOKING_SETTINGS = "booking_settings"
    NEXT_AVAILABLE = "next_avail"
    BARBER_SCHEDULE = "barber_schedule"
    APPOINTMENT_CONFLICTS = "appt_conflicts"
    
    @classmethod
    def available_slots_key(cls, target_date: date, user_timezone: Optional[str] = None, 
                           barber_id: Optional[int] = None) -> str:
        """Generate key for available time slots."""
        base_key = f"{cls.AVAILABLE_SLOTS}:{target_date.isoformat()}"
        
        if barber_id:
            base_key += f":barber_{barber_id}"
        
        if user_timezone:
            base_key += f":tz_{user_timezone.replace('/', '_')}"
        
        return base_key
    
    @classmethod
    def barber_availability_key(cls, barber_id: int, day_of_week: Optional[int] = None) -> str:
        """Generate key for barber availability schedule."""
        if day_of_week is not None:
            return f"{cls.BARBER_AVAILABILITY}:barber_{barber_id}:day_{day_of_week}"
        return f"{cls.BARBER_AVAILABILITY}:barber_{barber_id}"
    
    @classmethod
    def business_hours_key(cls, location_id: Optional[int] = None) -> str:
        """Generate key for business hours configuration."""
        if location_id:
            return f"{cls.BUSINESS_HOURS}:location_{location_id}"
        return f"{cls.BUSINESS_HOURS}:default"
    
    @classmethod
    def user_timezone_key(cls, user_id: int) -> str:
        """Generate key for user timezone preferences."""
        return f"{cls.USER_TIMEZONE}:user_{user_id}"
    
    @classmethod
    def booking_settings_key(cls, business_id: Optional[int] = None) -> str:
        """Generate key for booking settings."""
        if business_id:
            return f"{cls.BOOKING_SETTINGS}:business_{business_id}"
        return f"{cls.BOOKING_SETTINGS}:default"
    
    @classmethod
    def next_available_key(cls, start_date: date, user_timezone: Optional[str] = None) -> str:
        """Generate key for next available slot lookup."""
        base_key = f"{cls.NEXT_AVAILABLE}:{start_date.isoformat()}"
        
        if user_timezone:
            base_key += f":tz_{user_timezone.replace('/', '_')}"
        
        return base_key
    
    @classmethod
    def barber_schedule_key(cls, barber_id: int, date_from: date, date_to: date) -> str:
        """Generate key for barber schedule cache."""
        return f"{cls.BARBER_SCHEDULE}:barber_{barber_id}:{date_from.isoformat()}:{date_to.isoformat()}"
    
    @classmethod
    def appointment_conflicts_key(cls, barber_id: int, target_date: date) -> str:
        """Generate key for appointment conflicts cache."""
        return f"{cls.APPOINTMENT_CONFLICTS}:barber_{barber_id}:{target_date.isoformat()}"
    
    @classmethod
    def get_pattern_for_prefix(cls, prefix: str) -> str:
        """Get pattern for deleting all keys with a prefix."""
        return f"{prefix}:*"
    
    @classmethod
    def get_patterns_for_date(cls, target_date: date) -> List[str]:
        """Get all cache key patterns that include a specific date."""
        date_str = target_date.isoformat()
        return [
            f"{cls.AVAILABLE_SLOTS}:{date_str}*",
            f"{cls.NEXT_AVAILABLE}:{date_str}*",
            f"{cls.APPOINTMENT_CONFLICTS}:*:{date_str}",
            f"{cls.BARBER_SCHEDULE}:*:{date_str}*",
            f"{cls.BARBER_SCHEDULE}:*:*:{date_str}"
        ]
    
    @classmethod
    def get_patterns_for_barber(cls, barber_id: int) -> List[str]:
        """Get all cache key patterns that include a specific barber."""
        return [
            f"{cls.BARBER_AVAILABILITY}:barber_{barber_id}*",
            f"{cls.AVAILABLE_SLOTS}:*:barber_{barber_id}*",
            f"{cls.BARBER_SCHEDULE}:barber_{barber_id}:*",
            f"{cls.APPOINTMENT_CONFLICTS}:barber_{barber_id}:*"
        ]

class CacheInvalidationStrategy:
    """Defines cache invalidation rules for different events."""
    
    def __init__(self):
        self.key_generator = CacheKeyGenerator()
    
    def get_keys_to_invalidate(self, event: CacheInvalidationEvent, 
                              context: Dict[str, Any]) -> List[str]:
        """Get list of cache key patterns to invalidate based on event and context."""
        patterns = []
        
        if event == CacheInvalidationEvent.APPOINTMENT_CREATED:
            patterns.extend(self._handle_appointment_created(context))
        elif event == CacheInvalidationEvent.APPOINTMENT_UPDATED:
            patterns.extend(self._handle_appointment_updated(context))
        elif event == CacheInvalidationEvent.APPOINTMENT_CANCELLED:
            patterns.extend(self._handle_appointment_cancelled(context))
        elif event == CacheInvalidationEvent.APPOINTMENT_DELETED:
            patterns.extend(self._handle_appointment_deleted(context))
        elif event == CacheInvalidationEvent.BARBER_AVAILABILITY_CHANGED:
            patterns.extend(self._handle_barber_availability_changed(context))
        elif event == CacheInvalidationEvent.BUSINESS_SETTINGS_UPDATED:
            patterns.extend(self._handle_business_settings_updated(context))
        elif event == CacheInvalidationEvent.USER_TIMEZONE_CHANGED:
            patterns.extend(self._handle_user_timezone_changed(context))
        elif event == CacheInvalidationEvent.BOOKING_SETTINGS_CHANGED:
            patterns.extend(self._handle_booking_settings_changed(context))
        elif event == CacheInvalidationEvent.BARBER_SCHEDULE_UPDATED:
            patterns.extend(self._handle_barber_schedule_updated(context))
        
        return patterns
    
    def _handle_appointment_created(self, context: Dict[str, Any]) -> List[str]:
        """Handle cache invalidation for appointment creation."""
        patterns = []
        
        appointment_date = context.get('appointment_date')
        barber_id = context.get('barber_id')
        
        if appointment_date:
            # Invalidate available slots for the date
            patterns.extend(self.key_generator.get_patterns_for_date(appointment_date))
            
            # Invalidate next available slot lookups
            patterns.append(f"{self.key_generator.NEXT_AVAILABLE}:*")
        
        if barber_id:
            # Invalidate barber-specific caches
            patterns.extend(self.key_generator.get_patterns_for_barber(barber_id))
        
        return patterns
    
    def _handle_appointment_updated(self, context: Dict[str, Any]) -> List[str]:
        """Handle cache invalidation for appointment updates."""
        patterns = []
        
        old_date = context.get('old_date')
        new_date = context.get('new_date')
        old_barber_id = context.get('old_barber_id')
        new_barber_id = context.get('new_barber_id')
        
        # Invalidate for old date/barber
        if old_date:
            patterns.extend(self.key_generator.get_patterns_for_date(old_date))
        if old_barber_id:
            patterns.extend(self.key_generator.get_patterns_for_barber(old_barber_id))
        
        # Invalidate for new date/barber
        if new_date and new_date != old_date:
            patterns.extend(self.key_generator.get_patterns_for_date(new_date))
        if new_barber_id and new_barber_id != old_barber_id:
            patterns.extend(self.key_generator.get_patterns_for_barber(new_barber_id))
        
        # Always invalidate next available lookups
        patterns.append(f"{self.key_generator.NEXT_AVAILABLE}:*")
        
        return patterns
    
    def _handle_appointment_cancelled(self, context: Dict[str, Any]) -> List[str]:
        """Handle cache invalidation for appointment cancellation."""
        return self._handle_appointment_created(context)  # Same logic
    
    def _handle_appointment_deleted(self, context: Dict[str, Any]) -> List[str]:
        """Handle cache invalidation for appointment deletion."""
        return self._handle_appointment_created(context)  # Same logic
    
    def _handle_barber_availability_changed(self, context: Dict[str, Any]) -> List[str]:
        """Handle cache invalidation for barber availability changes."""
        patterns = []
        
        barber_id = context.get('barber_id')
        
        if barber_id:
            # Invalidate all barber-specific caches
            patterns.extend(self.key_generator.get_patterns_for_barber(barber_id))
            
            # Invalidate general availability lookups
            patterns.append(f"{self.key_generator.AVAILABLE_SLOTS}:*")
            patterns.append(f"{self.key_generator.NEXT_AVAILABLE}:*")
        
        return patterns
    
    def _handle_business_settings_updated(self, context: Dict[str, Any]) -> List[str]:
        """Handle cache invalidation for business settings updates."""
        # Business settings changes affect all cached data
        return [
            f"{self.key_generator.BUSINESS_HOURS}:*",
            f"{self.key_generator.AVAILABLE_SLOTS}:*",
            f"{self.key_generator.NEXT_AVAILABLE}:*",
            f"{self.key_generator.BOOKING_SETTINGS}:*"
        ]
    
    def _handle_user_timezone_changed(self, context: Dict[str, Any]) -> List[str]:
        """Handle cache invalidation for user timezone changes."""
        patterns = []
        
        user_id = context.get('user_id')
        old_timezone = context.get('old_timezone')
        new_timezone = context.get('new_timezone')
        
        if user_id:
            # Invalidate user-specific timezone cache
            patterns.append(self.key_generator.user_timezone_key(user_id))
        
        # Invalidate timezone-specific slot caches
        if old_timezone:
            old_tz_safe = old_timezone.replace('/', '_')
            patterns.append(f"{self.key_generator.AVAILABLE_SLOTS}:*:tz_{old_tz_safe}")
            patterns.append(f"{self.key_generator.NEXT_AVAILABLE}:*:tz_{old_tz_safe}")
        
        if new_timezone:
            new_tz_safe = new_timezone.replace('/', '_')
            patterns.append(f"{self.key_generator.AVAILABLE_SLOTS}:*:tz_{new_tz_safe}")
            patterns.append(f"{self.key_generator.NEXT_AVAILABLE}:*:tz_{new_tz_safe}")
        
        return patterns
    
    def _handle_booking_settings_changed(self, context: Dict[str, Any]) -> List[str]:
        """Handle cache invalidation for booking settings changes."""
        # Booking settings changes affect most cached data
        return [
            f"{self.key_generator.BOOKING_SETTINGS}:*",
            f"{self.key_generator.AVAILABLE_SLOTS}:*",
            f"{self.key_generator.NEXT_AVAILABLE}:*",
            f"{self.key_generator.BUSINESS_HOURS}:*"
        ]
    
    def _handle_barber_schedule_updated(self, context: Dict[str, Any]) -> List[str]:
        """Handle cache invalidation for barber schedule updates."""
        patterns = []
        
        barber_id = context.get('barber_id')
        
        if barber_id:
            patterns.extend(self.key_generator.get_patterns_for_barber(barber_id))
        
        return patterns

class CacheInvalidationManager:
    """Manages cache invalidation operations."""
    
    def __init__(self):
        self.strategy = CacheInvalidationStrategy()
        self.cache = cache_service
    
    def invalidate(self, event: CacheInvalidationEvent, context: Dict[str, Any]) -> int:
        """Invalidate cache based on event and context."""
        if not self.cache.is_available():
            logger.warning("Cache not available for invalidation")
            return 0
        
        patterns = self.strategy.get_keys_to_invalidate(event, context)
        total_deleted = 0
        
        for pattern in patterns:
            try:
                deleted = self.cache.delete_pattern(pattern)
                total_deleted += deleted
                if deleted > 0:
                    logger.debug(f"Invalidated {deleted} keys matching pattern: {pattern}")
            except Exception as e:
                logger.error(f"Failed to invalidate cache pattern '{pattern}': {e}")
        
        if total_deleted > 0:
            logger.info(f"Cache invalidation completed: {total_deleted} keys deleted for event {event.value}")
        
        return total_deleted
    
    def invalidate_appointment_created(self, appointment_date: date, barber_id: int) -> int:
        """Convenience method for appointment creation invalidation."""
        context = {
            'appointment_date': appointment_date,
            'barber_id': barber_id
        }
        return self.invalidate(CacheInvalidationEvent.APPOINTMENT_CREATED, context)
    
    def invalidate_appointment_updated(self, old_date: date, new_date: date, 
                                     old_barber_id: int, new_barber_id: int) -> int:
        """Convenience method for appointment update invalidation."""
        context = {
            'old_date': old_date,
            'new_date': new_date,
            'old_barber_id': old_barber_id,
            'new_barber_id': new_barber_id
        }
        return self.invalidate(CacheInvalidationEvent.APPOINTMENT_UPDATED, context)
    
    def invalidate_appointment_cancelled(self, appointment_date: date, barber_id: int) -> int:
        """Convenience method for appointment cancellation invalidation."""
        context = {
            'appointment_date': appointment_date,
            'barber_id': barber_id
        }
        return self.invalidate(CacheInvalidationEvent.APPOINTMENT_CANCELLED, context)
    
    def invalidate_barber_availability(self, barber_id: int) -> int:
        """Convenience method for barber availability invalidation."""
        context = {'barber_id': barber_id}
        return self.invalidate(CacheInvalidationEvent.BARBER_AVAILABILITY_CHANGED, context)
    
    def invalidate_business_settings(self) -> int:
        """Convenience method for business settings invalidation."""
        return self.invalidate(CacheInvalidationEvent.BUSINESS_SETTINGS_UPDATED, {})
    
    def invalidate_user_timezone(self, user_id: int, old_timezone: str, new_timezone: str) -> int:
        """Convenience method for user timezone invalidation."""
        context = {
            'user_id': user_id,
            'old_timezone': old_timezone,
            'new_timezone': new_timezone
        }
        return self.invalidate(CacheInvalidationEvent.USER_TIMEZONE_CHANGED, context)
    
    def invalidate_booking_settings(self) -> int:
        """Convenience method for booking settings invalidation."""
        return self.invalidate(CacheInvalidationEvent.BOOKING_SETTINGS_CHANGED, {})
    
    def invalidate_date_range(self, start_date: date, end_date: date) -> int:
        """Invalidate all cache entries for a date range."""
        total_deleted = 0
        current_date = start_date
        
        while current_date <= end_date:
            patterns = CacheKeyGenerator.get_patterns_for_date(current_date)
            
            for pattern in patterns:
                try:
                    deleted = self.cache.delete_pattern(pattern)
                    total_deleted += deleted
                except Exception as e:
                    logger.error(f"Failed to invalidate pattern '{pattern}': {e}")
            
            current_date += datetime.timedelta(days=1)
        
        logger.info(f"Invalidated cache for date range {start_date} to {end_date}: {total_deleted} keys")
        return total_deleted
    
    def invalidate_all_slots(self) -> int:
        """Invalidate all slot-related cache entries."""
        patterns = [
            f"{CacheKeyGenerator.AVAILABLE_SLOTS}:*",
            f"{CacheKeyGenerator.NEXT_AVAILABLE}:*",
            f"{CacheKeyGenerator.APPOINTMENT_CONFLICTS}:*"
        ]
        
        total_deleted = 0
        for pattern in patterns:
            try:
                deleted = self.cache.delete_pattern(pattern)
                total_deleted += deleted
            except Exception as e:
                logger.error(f"Failed to invalidate pattern '{pattern}': {e}")
        
        logger.info(f"Invalidated all slot caches: {total_deleted} keys")
        return total_deleted
    
    def get_invalidation_summary(self) -> Dict[str, Any]:
        """Get summary of what would be invalidated for each event type."""
        summary = {}
        
        # Sample context for each event type
        sample_contexts = {
            CacheInvalidationEvent.APPOINTMENT_CREATED: {
                'appointment_date': date.today(),
                'barber_id': 1
            },
            CacheInvalidationEvent.BARBER_AVAILABILITY_CHANGED: {
                'barber_id': 1
            },
            CacheInvalidationEvent.BUSINESS_SETTINGS_UPDATED: {},
            CacheInvalidationEvent.USER_TIMEZONE_CHANGED: {
                'user_id': 1,
                'old_timezone': 'America/New_York',
                'new_timezone': 'America/Los_Angeles'
            }
        }
        
        for event, context in sample_contexts.items():
            patterns = self.strategy.get_keys_to_invalidate(event, context)
            summary[event.value] = {
                'patterns': patterns,
                'pattern_count': len(patterns)
            }
        
        return summary

# Global cache invalidation manager
cache_invalidation_manager = CacheInvalidationManager()