"""
Cache Decorators for Expensive Operations

This module provides decorators for caching expensive function calls
with intelligent key generation and invalidation strategies.
"""

import functools
import hashlib
import json
import logging
from typing import Any, Callable, Optional, Union, List
from datetime import datetime

from services.redis_service import cache_service

logger = logging.getLogger(__name__)


def generate_cache_key(prefix: str, *args, **kwargs) -> str:
    """
    Generate a unique cache key based on function arguments.
    
    Args:
        prefix: Cache key prefix (usually function name)
        *args: Function positional arguments
        **kwargs: Function keyword arguments
        
    Returns:
        Unique cache key string
    """
    # Create a deterministic string representation of arguments
    key_parts = [prefix]
    
    # Add positional arguments
    for arg in args:
        if isinstance(arg, (str, int, float, bool)):
            key_parts.append(str(arg))
        elif hasattr(arg, 'id'):  # For ORM objects
            key_parts.append(f"{arg.__class__.__name__}:{arg.id}")
        else:
            # Hash complex objects
            key_parts.append(hashlib.md5(str(arg).encode()).hexdigest()[:8])
    
    # Add keyword arguments (sorted for consistency)
    for k, v in sorted(kwargs.items()):
        if isinstance(v, (str, int, float, bool)):
            key_parts.append(f"{k}:{v}")
        else:
            key_parts.append(f"{k}:{hashlib.md5(str(v).encode()).hexdigest()[:8]}")
    
    return ":".join(key_parts)


def cache_result(
    ttl: int = 300,
    prefix: Optional[str] = None,
    key_func: Optional[Callable] = None,
    condition: Optional[Callable] = None,
    tags: Optional[List[str]] = None
):
    """
    Decorator to cache function results in Redis.
    
    Args:
        ttl: Time to live in seconds (default: 5 minutes)
        prefix: Custom cache key prefix (default: function name)
        key_func: Custom key generation function
        condition: Function to determine if result should be cached
        tags: List of tags for cache invalidation
        
    Usage:
        @cache_result(ttl=600)
        def expensive_function(user_id: int):
            # Expensive computation
            return result
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            # Check if Redis is available
            if not cache_service.is_available():
                logger.debug(f"Cache not available, executing {func.__name__} without caching")
                return func(*args, **kwargs)
            
            # Generate cache key
            cache_prefix = prefix or f"func:{func.__module__}.{func.__name__}"
            
            if key_func:
                cache_key = key_func(*args, **kwargs)
            else:
                cache_key = generate_cache_key(cache_prefix, *args, **kwargs)
            
            # Try to get from cache
            try:
                cached_value = cache_service.get(cache_key)
                if cached_value is not None:
                    logger.debug(f"Cache hit for key: {cache_key}")
                    return cached_value
            except Exception as e:
                logger.warning(f"Error retrieving from cache: {e}")
            
            # Execute function
            logger.debug(f"Cache miss for key: {cache_key}")
            result = func(*args, **kwargs)
            
            # Check if result should be cached
            if condition and not condition(result):
                return result
            
            # Cache the result
            try:
                cache_service.set(cache_key, result, ttl=ttl)
                
                # Add tags if specified
                if tags:
                    for tag in tags:
                        tag_key = f"tag:{tag}"
                        cache_service.add_to_set(tag_key, cache_key, ttl=ttl)
                        
                logger.debug(f"Cached result for key: {cache_key} with TTL: {ttl}s")
            except Exception as e:
                logger.warning(f"Error caching result: {e}")
            
            return result
        
        # Add cache management methods to the wrapper
        wrapper.invalidate = lambda *args, **kwargs: invalidate_cache(
            generate_cache_key(prefix or f"func:{func.__module__}.{func.__name__}", *args, **kwargs)
        )
        wrapper.invalidate_all = lambda: invalidate_pattern(
            f"{prefix or f'func:{func.__module__}.{func.__name__}'}:*"
        )
        
        return wrapper
    return decorator


def cache_analytics(ttl: int = 900):
    """
    Specialized decorator for analytics functions with 15-minute default TTL.
    
    Args:
        ttl: Time to live in seconds (default: 15 minutes)
    """
    return cache_result(
        ttl=ttl,
        prefix="analytics",
        condition=lambda result: result is not None and result != {}
    )


def cache_user_data(ttl: int = 300):
    """
    Specialized decorator for user-specific data with 5-minute default TTL.
    
    Args:
        ttl: Time to live in seconds (default: 5 minutes)
    """
    def key_func(*args, **kwargs):
        # Extract user_id from arguments
        user_id = kwargs.get('user_id')
        if not user_id and args:
            # Try to get from positional args
            if hasattr(args[0], 'id'):  # If first arg is user object
                user_id = args[0].id
            elif len(args) > 1 and isinstance(args[1], int):  # If second arg is user_id
                user_id = args[1]
        
        func_name = kwargs.get('_func_name', 'unknown')
        return f"user:{user_id}:{func_name}"
    
    return cache_result(ttl=ttl, key_func=key_func)


def cache_list_result(ttl: int = 600):
    """
    Specialized decorator for list/collection results with pagination support.
    
    Args:
        ttl: Time to live in seconds (default: 10 minutes)
    """
    def key_func(*args, **kwargs):
        # Include pagination parameters in key
        skip = kwargs.get('skip', 0)
        limit = kwargs.get('limit', 50)
        filters = kwargs.get('filters', {})
        
        # Create deterministic filter string
        filter_str = json.dumps(filters, sort_keys=True) if filters else "no-filters"
        filter_hash = hashlib.md5(filter_str.encode()).hexdigest()[:8]
        
        func_name = kwargs.get('_func_name', 'unknown')
        return f"list:{func_name}:skip:{skip}:limit:{limit}:filters:{filter_hash}"
    
    return cache_result(ttl=ttl, key_func=key_func)


def invalidate_cache(key: str) -> bool:
    """
    Invalidate a specific cache key.
    
    Args:
        key: Cache key to invalidate
        
    Returns:
        True if successful, False otherwise
    """
    try:
        return cache_service.delete(key)
    except Exception as e:
        logger.error(f"Error invalidating cache key {key}: {e}")
        return False


def invalidate_pattern(pattern: str) -> int:
    """
    Invalidate all cache keys matching a pattern.
    
    Args:
        pattern: Redis key pattern (e.g., "user:123:*")
        
    Returns:
        Number of keys deleted
    """
    try:
        return cache_service.delete_pattern(pattern)
    except Exception as e:
        logger.error(f"Error invalidating cache pattern {pattern}: {e}")
        return 0


def invalidate_user_cache(user_id: Union[int, str]) -> int:
    """
    Invalidate all cache entries for a specific user.
    
    Args:
        user_id: User ID to invalidate cache for
        
    Returns:
        Number of keys deleted
    """
    patterns = [
        f"user:{user_id}:*",
        f"analytics:*:user_id:{user_id}:*",
        f"func:*:user_id:{user_id}:*"
    ]
    
    total_deleted = 0
    for pattern in patterns:
        total_deleted += invalidate_pattern(pattern)
    
    logger.info(f"Invalidated {total_deleted} cache keys for user {user_id}")
    return total_deleted


def invalidate_analytics_cache() -> int:
    """
    Invalidate all analytics cache entries.
    
    Returns:
        Number of keys deleted
    """
    return invalidate_pattern("analytics:*")


def cache_warmup(func: Callable, *args, **kwargs) -> Any:
    """
    Pre-populate cache by calling a function.
    
    Args:
        func: Function to call
        *args: Function arguments
        **kwargs: Function keyword arguments
        
    Returns:
        Function result
    """
    logger.info(f"Warming up cache for {func.__name__}")
    return func(*args, **kwargs)


class CacheManager:
    """
    Centralized cache management for the application.
    """
    
    @staticmethod
    def get_cache_stats() -> dict:
        """Get comprehensive cache statistics."""
        stats = cache_service.get_stats()
        
        if stats.get('available'):
            # Add application-specific stats
            stats['analytics_keys'] = len(cache_service.get_set("tag:analytics"))
            stats['user_data_keys'] = len(cache_service.get_set("tag:user_data"))
            
        return stats
    
    @staticmethod
    def clear_expired() -> int:
        """
        Clear expired cache entries.
        Note: Redis handles this automatically, but this can be used for custom logic.
        """
        # Redis automatically removes expired keys
        # This method is a placeholder for any custom expiration logic
        return 0
    
    @staticmethod
    def clear_all() -> bool:
        """
        Clear all cache data. Use with extreme caution!
        """
        logger.warning("Clearing all cache data")
        return cache_service.clear_all()