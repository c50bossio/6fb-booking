"""
Backend caching utilities
"""
import json
import hashlib
from typing import Optional, Any, Callable
from datetime import datetime, timedelta
from functools import wraps
import redis
from config.settings import settings

# Initialize Redis client (optional, falls back to in-memory if not available)
try:
    redis_client = redis.Redis(
        host=settings.REDIS_HOST,
        port=settings.REDIS_PORT,
        db=settings.REDIS_DB,
        decode_responses=True
    )
    redis_client.ping()
    REDIS_AVAILABLE = True
except:
    redis_client = None
    REDIS_AVAILABLE = False
    print("Redis not available, using in-memory cache")

# In-memory cache fallback
_memory_cache = {}
_cache_expiry = {}


def generate_cache_key(*args, **kwargs) -> str:
    """Generate a cache key from function arguments"""
    key_data = {
        'args': args,
        'kwargs': kwargs
    }
    key_str = json.dumps(key_data, sort_keys=True, default=str)
    return hashlib.md5(key_str.encode()).hexdigest()


def get_from_cache(key: str) -> Optional[Any]:
    """Get value from cache"""
    if REDIS_AVAILABLE and redis_client:
        value = redis_client.get(key)
        if value:
            return json.loads(value)
    else:
        # Check in-memory cache
        if key in _memory_cache:
            # Check if expired
            if key in _cache_expiry and datetime.now() > _cache_expiry[key]:
                del _memory_cache[key]
                del _cache_expiry[key]
                return None
            return _memory_cache[key]
    return None


def set_in_cache(key: str, value: Any, ttl_seconds: int = 300):
    """Set value in cache with TTL"""
    if REDIS_AVAILABLE and redis_client:
        redis_client.setex(key, ttl_seconds, json.dumps(value, default=str))
    else:
        # Use in-memory cache
        _memory_cache[key] = value
        _cache_expiry[key] = datetime.now() + timedelta(seconds=ttl_seconds)


def delete_from_cache(key: str):
    """Delete value from cache"""
    if REDIS_AVAILABLE and redis_client:
        redis_client.delete(key)
    else:
        if key in _memory_cache:
            del _memory_cache[key]
        if key in _cache_expiry:
            del _cache_expiry[key]


def invalidate_pattern(pattern: str):
    """Invalidate cache keys matching pattern"""
    if REDIS_AVAILABLE and redis_client:
        for key in redis_client.scan_iter(match=pattern):
            redis_client.delete(key)
    else:
        # In-memory pattern matching
        keys_to_delete = [k for k in _memory_cache.keys() if pattern.replace('*', '') in k]
        for key in keys_to_delete:
            del _memory_cache[key]
            if key in _cache_expiry:
                del _cache_expiry[key]


def cache_result(ttl_seconds: int = 300, key_prefix: str = ""):
    """
    Decorator to cache function results
    
    Args:
        ttl_seconds: Cache TTL in seconds
        key_prefix: Prefix for cache key
    """
    def decorator(func: Callable):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            # Generate cache key
            cache_key = f"{key_prefix}:{func.__name__}:{generate_cache_key(*args, **kwargs)}"
            
            # Try to get from cache
            cached_value = get_from_cache(cache_key)
            if cached_value is not None:
                return cached_value
            
            # Execute function
            result = await func(*args, **kwargs)
            
            # Store in cache
            set_in_cache(cache_key, result, ttl_seconds)
            
            return result
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            # Generate cache key
            cache_key = f"{key_prefix}:{func.__name__}:{generate_cache_key(*args, **kwargs)}"
            
            # Try to get from cache
            cached_value = get_from_cache(cache_key)
            if cached_value is not None:
                return cached_value
            
            # Execute function
            result = func(*args, **kwargs)
            
            # Store in cache
            set_in_cache(cache_key, result, ttl_seconds)
            
            return result
        
        # Return appropriate wrapper based on function type
        import asyncio
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    
    return decorator


# Cache key generators for common patterns
class CacheKeys:
    @staticmethod
    def analytics(metric_type: str, start_date: str, end_date: str, location_id: Optional[int] = None) -> str:
        return f"analytics:{metric_type}:{start_date}:{end_date}:{location_id or 'all'}"
    
    @staticmethod
    def user(user_id: int) -> str:
        return f"user:{user_id}"
    
    @staticmethod
    def location(location_id: int) -> str:
        return f"location:{location_id}"
    
    @staticmethod
    def barber(barber_id: int) -> str:
        return f"barber:{barber_id}"
    
    @staticmethod
    def appointments(date: str, location_id: Optional[int] = None) -> str:
        return f"appointments:{date}:{location_id or 'all'}"


# Cleanup old cache entries periodically
def cleanup_expired_cache():
    """Remove expired entries from in-memory cache"""
    if not REDIS_AVAILABLE:
        now = datetime.now()
        expired_keys = [k for k, v in _cache_expiry.items() if v < now]
        for key in expired_keys:
            if key in _memory_cache:
                del _memory_cache[key]
            del _cache_expiry[key]