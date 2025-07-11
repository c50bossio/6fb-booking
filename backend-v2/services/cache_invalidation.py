"""
Cache Invalidation Service

Handles intelligent cache invalidation when data changes to ensure
cache consistency across the application.
"""

import logging
from typing import List, Optional, Set
from datetime import date

from services.redis_service import cache_service
from utils.cache_decorators import invalidate_pattern, invalidate_user_cache

logger = logging.getLogger(__name__)


class CacheInvalidationService:
    """
    Centralized service for handling cache invalidation logic.
    """
    
    @staticmethod
    def invalidate_user_data(user_id: int) -> int:
        """
        Invalidate all cached data for a specific user.
        
        Args:
            user_id: User ID to invalidate cache for
            
        Returns:
            Number of keys invalidated
        """
        patterns = [
            f"user:{user_id}:*",
            f"analytics:*user_id:{user_id}*",
            f"dashboard:*user_id:{user_id}*",
            f"func:*user_id:{user_id}*",
            f"availability:barber:{user_id}:*",
            f"booked_slots:barber:{user_id}:*",
            f"barber_schedule:*barber_id:{user_id}*"
        ]
        
        total = 0
        for pattern in patterns:
            count = invalidate_pattern(pattern)
            total += count
            if count > 0:
                logger.debug(f"Invalidated {count} keys for pattern: {pattern}")
        
        logger.info(f"Total invalidated {total} cache keys for user {user_id}")
        return total
    
    @staticmethod
    def invalidate_appointment_data(
        appointment_id: int,
        user_id: Optional[int] = None,
        barber_id: Optional[int] = None,
        date: Optional[date] = None
    ) -> int:
        """
        Invalidate cache related to appointment changes.
        
        Args:
            appointment_id: Appointment ID that changed
            user_id: User ID associated with appointment
            barber_id: Barber ID associated with appointment
            date: Date of the appointment
            
        Returns:
            Number of keys invalidated
        """
        patterns = []
        
        # Appointment-specific patterns
        patterns.append(f"*appointment:{appointment_id}*")
        
        # User-specific patterns
        if user_id:
            patterns.extend([
                f"user:{user_id}:appointments*",
                f"analytics:*user_id:{user_id}*",
                f"dashboard:*user_id:{user_id}*"
            ])
        
        # Barber-specific patterns
        if barber_id:
            patterns.extend([
                f"availability:barber:{barber_id}:*",
                f"booked_slots:barber:{barber_id}:*",
                f"barber_schedule:*barber_id:{barber_id}*",
                f"appointment_stats:*barber_id:{barber_id}*"
            ])
        
        # Date-specific patterns
        if date:
            patterns.extend([
                f"*date:{date.isoformat()}*",
                f"availability:*:date:{date.isoformat()}:*",
                f"booked_slots:*:date:{date.isoformat()}"
            ])
        
        total = 0
        for pattern in patterns:
            count = invalidate_pattern(pattern)
            total += count
            if count > 0:
                logger.debug(f"Invalidated {count} keys for pattern: {pattern}")
        
        logger.info(f"Total invalidated {total} cache keys for appointment {appointment_id}")
        return total
    
    @staticmethod
    def invalidate_payment_data(
        payment_id: int,
        user_id: Optional[int] = None,
        appointment_id: Optional[int] = None
    ) -> int:
        """
        Invalidate cache related to payment changes.
        
        Args:
            payment_id: Payment ID that changed
            user_id: User ID associated with payment
            appointment_id: Appointment ID associated with payment
            
        Returns:
            Number of keys invalidated
        """
        patterns = [
            f"*payment:{payment_id}*",
            "analytics:*",  # All analytics cache since payments affect revenue
            "dashboard:*"   # All dashboard cache
        ]
        
        if user_id:
            patterns.extend([
                f"user:{user_id}:payments*",
                f"user:{user_id}:revenue*"
            ])
        
        if appointment_id:
            patterns.append(f"*appointment:{appointment_id}*")
        
        total = 0
        for pattern in patterns:
            count = invalidate_pattern(pattern)
            total += count
            if count > 0:
                logger.debug(f"Invalidated {count} keys for pattern: {pattern}")
        
        logger.info(f"Total invalidated {total} cache keys for payment {payment_id}")
        return total
    
    @staticmethod
    def invalidate_client_data(client_id: int, user_id: Optional[int] = None) -> int:
        """
        Invalidate cache related to client changes.
        
        Args:
            client_id: Client ID that changed
            user_id: User ID associated with client
            
        Returns:
            Number of keys invalidated
        """
        patterns = [
            f"*client:{client_id}*",
            f"client:*:id:{client_id}*"
        ]
        
        if user_id:
            patterns.extend([
                f"user:{user_id}:clients*",
                f"analytics:*user_id:{user_id}*"
            ])
        
        total = 0
        for pattern in patterns:
            count = invalidate_pattern(pattern)
            total += count
            if count > 0:
                logger.debug(f"Invalidated {count} keys for pattern: {pattern}")
        
        logger.info(f"Total invalidated {total} cache keys for client {client_id}")
        return total
    
    @staticmethod
    def invalidate_service_data(service_id: int, user_id: Optional[int] = None) -> int:
        """
        Invalidate cache related to service changes.
        
        Args:
            service_id: Service ID that changed
            user_id: User ID associated with service
            
        Returns:
            Number of keys invalidated
        """
        patterns = [
            f"*service:{service_id}*",
            f"service:*:id:{service_id}*"
        ]
        
        if user_id:
            patterns.extend([
                f"user:{user_id}:services*",
                f"availability:barber:{user_id}:*"  # Service duration affects availability
            ])
        
        total = 0
        for pattern in patterns:
            count = invalidate_pattern(pattern)
            total += count
            if count > 0:
                logger.debug(f"Invalidated {count} keys for pattern: {pattern}")
        
        logger.info(f"Total invalidated {total} cache keys for service {service_id}")
        return total
    
    @staticmethod
    def invalidate_analytics_cache() -> int:
        """
        Invalidate all analytics-related cache.
        
        Returns:
            Number of keys invalidated
        """
        patterns = [
            "analytics:*",
            "dashboard:*",
            "appointment_stats:*",
            "*revenue*",
            "*metrics*"
        ]
        
        total = 0
        for pattern in patterns:
            count = invalidate_pattern(pattern)
            total += count
            if count > 0:
                logger.debug(f"Invalidated {count} keys for pattern: {pattern}")
        
        logger.info(f"Total invalidated {total} analytics cache keys")
        return total
    
    @staticmethod
    def invalidate_organization_data(organization_id: int) -> int:
        """
        Invalidate cache for all users in an organization.
        
        Args:
            organization_id: Organization ID
            
        Returns:
            Number of keys invalidated
        """
        patterns = [
            f"*organization:{organization_id}*",
            f"org:{organization_id}:*",
            "dashboard:*user_ids:*"  # Multi-user dashboards
        ]
        
        total = 0
        for pattern in patterns:
            count = invalidate_pattern(pattern)
            total += count
            if count > 0:
                logger.debug(f"Invalidated {count} keys for pattern: {pattern}")
        
        logger.info(f"Total invalidated {total} cache keys for organization {organization_id}")
        return total
    
    @staticmethod
    def smart_invalidate(entity_type: str, entity_id: int, **kwargs) -> int:
        """
        Smart cache invalidation based on entity type and relationships.
        
        Args:
            entity_type: Type of entity ('user', 'appointment', 'payment', etc.)
            entity_id: ID of the entity
            **kwargs: Additional context (user_id, date, etc.)
            
        Returns:
            Number of keys invalidated
        """
        invalidation_map = {
            'user': CacheInvalidationService.invalidate_user_data,
            'appointment': CacheInvalidationService.invalidate_appointment_data,
            'payment': CacheInvalidationService.invalidate_payment_data,
            'client': CacheInvalidationService.invalidate_client_data,
            'service': CacheInvalidationService.invalidate_service_data,
            'organization': CacheInvalidationService.invalidate_organization_data
        }
        
        handler = invalidation_map.get(entity_type)
        if not handler:
            logger.warning(f"No invalidation handler for entity type: {entity_type}")
            return 0
        
        # Call the appropriate handler
        if entity_type in ['appointment', 'payment', 'client', 'service']:
            return handler(entity_id, **kwargs)
        else:
            return handler(entity_id)


# Global instance for easy access
cache_invalidator = CacheInvalidationService()