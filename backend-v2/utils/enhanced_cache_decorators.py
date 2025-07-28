"""
Enhanced Cache Decorators for Performance-Critical Operations

This module provides specialized caching decorators tailored for BookedBarber's
most expensive operations to achieve maximum performance gains.
"""

import functools
import hashlib
import json
import logging
import asyncio
from typing import Any, Callable, Optional, Union, List, Dict
from datetime import datetime, timedelta, date
from dataclasses import dataclass

from services.api_cache_service import api_cache_service, CacheStrategy, cache_api_response, invalidate_related_cache

logger = logging.getLogger(__name__)

@dataclass
class CacheConfig:
    """Configuration for specific cache types"""
    ttl: int
    strategy: CacheStrategy
    invalidation_patterns: List[str]
    user_specific: bool = True

# Pre-configured cache settings for different operation types
CACHE_CONFIGS = {
    # Appointment and availability operations (frequently changing)
    "appointment_slots": CacheConfig(
        ttl=300,  # 5 minutes
        strategy=CacheStrategy.REAL_TIME,
        invalidation_patterns=["get_available_slots*", "get_barber_availability*"],
        user_specific=True
    ),
    
    # Analytics operations (can be cached longer)
    "analytics": CacheConfig(
        ttl=1800,  # 30 minutes
        strategy=CacheStrategy.ANALYTICS,
        invalidation_patterns=["get_*_analytics*", "get_dashboard_data*"],
        user_specific=True
    ),
    
    # Business intelligence (moderate caching)
    "business_intelligence": CacheConfig(
        ttl=900,  # 15 minutes
        strategy=CacheStrategy.ANALYTICS,
        invalidation_patterns=["get_business_*", "get_dashboard_*"],
        user_specific=True
    ),
    
    # Static-ish data (aggressive caching)
    "static_data": CacheConfig(
        ttl=3600,  # 1 hour
        strategy=CacheStrategy.AGGRESSIVE,
        invalidation_patterns=["get_services*", "get_locations*", "get_pricing*"],
        user_specific=False
    ),
    
    # User-specific data (moderate caching)
    "user_data": CacheConfig(
        ttl=600,  # 10 minutes
        strategy=CacheStrategy.CONSERVATIVE,
        invalidation_patterns=["get_user_*", "get_barber_profile*"],
        user_specific=True
    )
}

def cache_appointment_slots(ttl: Optional[int] = None):
    """
    Specialized decorator for appointment slot caching with smart invalidation
    
    Usage:
        @cache_appointment_slots()
        def get_available_slots(user_id: int, target_date: date):
            # Expensive slot calculation
            return slots
    """
    config = CACHE_CONFIGS["appointment_slots"]
    return cache_api_response(
        endpoint="get_available_slots",
        strategy=config.strategy,
        ttl=ttl or config.ttl,
        user_specific=config.user_specific
    )

def cache_barber_availability(ttl: Optional[int] = None):
    """
    Specialized decorator for barber availability caching
    
    Usage:
        @cache_barber_availability()
        def get_barber_availability(barber_id: int, date_range: dict):
            # Complex availability calculation
            return availability_data
    """
    config = CACHE_CONFIGS["appointment_slots"]
    return cache_api_response(
        endpoint="get_barber_availability",
        strategy=config.strategy,
        ttl=ttl or config.ttl,
        user_specific=config.user_specific
    )

def cache_analytics_data(endpoint_name: str, ttl: Optional[int] = None):
    """
    Specialized decorator for analytics data caching
    
    Args:
        endpoint_name: Specific analytics endpoint name
        ttl: Custom TTL (optional)
    
    Usage:
        @cache_analytics_data("revenue_analytics")
        def get_revenue_analytics(user_id: int, date_range: dict):
            # Complex analytics calculations
            return analytics_data
    """
    config = CACHE_CONFIGS["analytics"]
    return cache_api_response(
        endpoint=endpoint_name,
        strategy=config.strategy,
        ttl=ttl or config.ttl,
        user_specific=config.user_specific
    )

def cache_business_intelligence(endpoint_name: str, ttl: Optional[int] = None):
    """
    Specialized decorator for business intelligence data caching
    
    Usage:
        @cache_business_intelligence("comprehensive_dashboard")
        def get_comprehensive_dashboard(user_id: int, date_range_days: int):
            # Heavy business intelligence processing
            return dashboard_data
    """
    config = CACHE_CONFIGS["business_intelligence"]
    return cache_api_response(
        endpoint=endpoint_name,
        strategy=config.strategy,
        ttl=ttl or config.ttl,
        user_specific=config.user_specific
    )

def cache_user_profile_data(ttl: Optional[int] = None):
    """
    Specialized decorator for user profile data caching
    
    Usage:
        @cache_user_profile_data()
        def get_user_profile(user_id: int):
            # User profile retrieval and processing
            return profile_data
    """
    config = CACHE_CONFIGS["user_data"]
    return cache_api_response(
        endpoint="get_user_profile",
        strategy=config.strategy,
        ttl=ttl or config.ttl,
        user_specific=config.user_specific
    )

def cache_static_reference_data(endpoint_name: str, ttl: Optional[int] = None):
    """
    Specialized decorator for static reference data (services, locations, etc.)
    
    Usage:
        @cache_static_reference_data("services_list")
        def get_services_list():
            # Service list retrieval
            return services
    """
    config = CACHE_CONFIGS["static_data"]
    return cache_api_response(
        endpoint=endpoint_name,
        strategy=config.strategy,
        ttl=ttl or config.ttl,
        user_specific=config.user_specific
    )

# Composite decorators for complex scenarios
def cache_with_dependency_invalidation(
    endpoint_name: str,
    dependencies: List[str],
    ttl: Optional[int] = None,
    strategy: CacheStrategy = CacheStrategy.CONSERVATIVE
):
    """
    Advanced caching decorator with dependency-based invalidation
    
    Args:
        endpoint_name: Name of the cached endpoint
        dependencies: List of cache patterns to invalidate when data changes
        ttl: Cache TTL in seconds
        strategy: Caching strategy
    
    Usage:
        @cache_with_dependency_invalidation(
            "client_analytics",
            dependencies=["get_appointments*", "get_payments*"],
            ttl=900
        )
        def get_client_analytics(user_id: int):
            # Complex client analytics
            return analytics
    """
    def decorator(func: Callable):
        # Apply the cache decorator
        cached_func = cache_api_response(
            endpoint=endpoint_name,
            strategy=strategy,
            ttl=ttl,
            user_specific=True
        )(func)
        
        # Add dependency tracking
        cached_func._cache_dependencies = dependencies
        
        return cached_func
    
    return decorator

def cache_with_warming(
    endpoint_name: str,
    warm_on_startup: bool = False,
    warm_params: Optional[Dict[str, Any]] = None,
    ttl: Optional[int] = None
):
    """
    Caching decorator with cache warming capability
    
    Args:
        endpoint_name: Name of the cached endpoint
        warm_on_startup: Whether to warm cache on application startup
        warm_params: Parameters to use for cache warming
        ttl: Cache TTL in seconds
    
    Usage:
        @cache_with_warming(
            "popular_services", 
            warm_on_startup=True,
            warm_params={"location_id": 1}
        )
        def get_popular_services(location_id: int):
            # Popular services calculation
            return services
    """
    def decorator(func: Callable):
        cached_func = cache_api_response(
            endpoint=endpoint_name,
            ttl=ttl,
            user_specific=False if warm_params else True
        )(func)
        
        # Add warming metadata
        cached_func._warm_on_startup = warm_on_startup
        cached_func._warm_params = warm_params or {}
        
        return cached_func
    
    return decorator

# Smart invalidation decorators
def invalidate_appointment_cache(func: Callable):
    """
    Decorator to invalidate appointment-related cache after function execution
    
    Usage:
        @invalidate_appointment_cache
        def create_appointment(appointment_data):
            # Create appointment
            return appointment
    """
    return invalidate_related_cache(
        "get_available_slots*",
        "get_barber_availability*",
        "get_appointments*"
    )(func)

def invalidate_analytics_cache(func: Callable):
    """
    Decorator to invalidate analytics cache after function execution
    
    Usage:
        @invalidate_analytics_cache
        def process_payment(payment_data):
            # Process payment (affects analytics)
            return payment_result
    """
    return invalidate_related_cache(
        "get_*_analytics*",
        "get_dashboard_data*",
        "get_business_intelligence*"
    )(func)

def invalidate_user_cache(func: Callable):
    """
    Decorator to invalidate user-specific cache after function execution
    
    Usage:
        @invalidate_user_cache
        def update_user_profile(user_id: int, profile_data):
            # Update user profile
            return updated_profile
    """
    return invalidate_related_cache(
        "get_user_profile*",
        "get_barber_profile*",
        "get_user_*"
    )(func)

# Performance optimization utilities
class CacheOptimizer:
    """Utilities for cache performance optimization"""
    
    @staticmethod
    def create_batch_cache_key(base_key: str, items: List[Any]) -> str:
        """Create a cache key for batch operations"""
        item_hash = hashlib.md5(
            json.dumps([str(item) for item in items], sort_keys=True).encode()
        ).hexdigest()[:12]
        return f"{base_key}:batch:{item_hash}"
    
    @staticmethod
    def extract_user_id_from_args(*args, **kwargs) -> Optional[int]:
        """Smart extraction of user_id from function arguments"""
        # Check kwargs first
        if 'user_id' in kwargs:
            return kwargs['user_id']
        
        if 'barber_id' in kwargs:
            return kwargs['barber_id']
        
        # Check positional arguments
        for arg in args:
            if isinstance(arg, int) and arg > 0:
                return arg
            
            # Check if it's a database session (skip)
            if hasattr(arg, 'query'):
                continue
                
            # Check if it's an object with user_id attribute
            if hasattr(arg, 'user_id'):
                return arg.user_id
                
            if hasattr(arg, 'id'):
                return arg.id
        
        return None
    
    @staticmethod
    def should_cache_response(response_data: Any) -> bool:
        """Determine if a response should be cached based on its content"""
        if response_data is None:
            return False
        
        if isinstance(response_data, dict):
            # Don't cache error responses
            if 'error' in response_data or 'message' in response_data:
                return False
            
            # Don't cache empty results
            if not response_data or response_data == {}:
                return False
        
        if isinstance(response_data, list) and len(response_data) == 0:
            return False
        
        return True

# Conditional caching decorator
def cache_conditionally(
    condition_func: Callable[[Any], bool],
    endpoint_name: str,
    ttl: Optional[int] = None
):
    """
    Cache responses only when a condition is met
    
    Args:
        condition_func: Function that takes the response and returns bool
        endpoint_name: Name of the cached endpoint
        ttl: Cache TTL in seconds
    
    Usage:
        @cache_conditionally(
            lambda result: len(result) > 0,
            "search_results"
        )
        def search_services(query: str):
            # Search logic
            return search_results
    """
    def decorator(func: Callable):
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            # Execute function first
            result = await func(*args, **kwargs) if asyncio.iscoroutinefunction(func) else func(*args, **kwargs)
            
            # Only cache if condition is met
            if condition_func(result):
                # Generate cache key and store
                user_id = CacheOptimizer.extract_user_id_from_args(*args, **kwargs)
                cache_key = api_cache_service._generate_cache_key(
                    endpoint_name, user_id, **{k: v for k, v in kwargs.items() if k != 'db'}
                )
                
                cache_ttl = ttl or 300  # Default 5 minutes
                await api_cache_service.cache_response(cache_key, result, cache_ttl)
            
            return result
        
        return wrapper
    return decorator

# Registry for tracking cached functions
CACHED_FUNCTIONS_REGISTRY = {}

def register_cached_function(func: Callable, config: Dict[str, Any]):
    """Register a cached function for monitoring and management"""
    CACHED_FUNCTIONS_REGISTRY[func.__name__] = {
        'function': func,
        'config': config,
        'registered_at': datetime.now()
    }

def get_cache_registry() -> Dict[str, Any]:
    """Get the registry of all cached functions"""
    return CACHED_FUNCTIONS_REGISTRY

# Usage examples and best practices
"""
USAGE EXAMPLES:

1. Cache appointment slots (high frequency changes):
   @cache_appointment_slots(ttl=300)
   def get_available_slots(user_id: int, date: str):
       return calculate_slots()

2. Cache analytics (moderate frequency changes):
   @cache_analytics_data("revenue_dashboard", ttl=1800)
   def get_revenue_dashboard(user_id: int):
       return complex_revenue_calculation()

3. Cache with invalidation:
   @invalidate_appointment_cache
   def create_appointment(appointment_data):
       return create_new_appointment()

4. Conditional caching:
   @cache_conditionally(
       lambda result: len(result.get('items', [])) > 0,
       "search_results"
   )
   def search_barbers(query: str):
       return search_logic()

5. Complex caching with dependencies:
   @cache_with_dependency_invalidation(
       "client_lifetime_value",
       dependencies=["get_appointments*", "get_payments*"],
       ttl=3600
   )
   def calculate_client_ltv(client_id: int):
       return complex_ltv_calculation()

PERFORMANCE EXPECTATIONS:
- 30-50% reduction in API response times
- 60-80% reduction in database queries for cached operations
- Improved user experience with faster dashboard loads
- Reduced server load during peak hours
"""