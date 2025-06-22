"""
Backend caching utilities with performance monitoring
Enhanced with advanced cache service integration
"""
import json
import hashlib
import time
import logging
from typing import Optional, Any, Callable
from datetime import datetime, timedelta
from functools import wraps
import redis
from config.settings import settings

logger = logging.getLogger(__name__)

# Try to import advanced cache service
try:
    from services.advanced_cache_service import cache_service, CacheConfig
    ADVANCED_CACHE_AVAILABLE = True
except ImportError:
    ADVANCED_CACHE_AVAILABLE = False
    logger.warning("Advanced cache service not available, using basic cache")

# Initialize Redis client (optional, falls back to in-memory if not available)
try:
    redis_client = redis.Redis(
        host=getattr(settings, 'REDIS_HOST', 'localhost'),
        port=getattr(settings, 'REDIS_PORT', 6379),
        db=getattr(settings, 'REDIS_DB', 0),
        decode_responses=True
    )
    redis_client.ping()
    REDIS_AVAILABLE = True
except:
    redis_client = None
    REDIS_AVAILABLE = False
    logger.warning("Redis not available, using in-memory cache")

# In-memory cache fallback with statistics
_memory_cache = {}
_cache_expiry = {}
_cache_stats = {
    'hits': 0,
    'misses': 0,
    'sets': 0,
    'deletes': 0
}


def generate_cache_key(*args, **kwargs) -> str:
    """Generate a cache key from function arguments"""
    key_data = {
        'args': args,
        'kwargs': kwargs
    }
    key_str = json.dumps(key_data, sort_keys=True, default=str)
    return hashlib.md5(key_str.encode()).hexdigest()


def get_from_cache(key: str) -> Optional[Any]:
    """Get value from cache with statistics tracking"""
    if REDIS_AVAILABLE and redis_client:
        value = redis_client.get(key)
        if value:
            _cache_stats['hits'] += 1
            logger.debug(f"Cache HIT (Redis): {key}")
            return json.loads(value)
        else:
            _cache_stats['misses'] += 1
            logger.debug(f"Cache MISS (Redis): {key}")
    else:
        # Check in-memory cache
        if key in _memory_cache:
            # Check if expired
            if key in _cache_expiry and datetime.now() > _cache_expiry[key]:
                del _memory_cache[key]
                del _cache_expiry[key]
                _cache_stats['misses'] += 1
                logger.debug(f"Cache EXPIRED (Memory): {key}")
                return None
            _cache_stats['hits'] += 1
            logger.debug(f"Cache HIT (Memory): {key}")
            return _memory_cache[key]
        else:
            _cache_stats['misses'] += 1
            logger.debug(f"Cache MISS (Memory): {key}")
    return None


def set_in_cache(key: str, value: Any, ttl_seconds: int = 300):
    """Set value in cache with TTL and statistics tracking"""
    _cache_stats['sets'] += 1
    
    if REDIS_AVAILABLE and redis_client:
        redis_client.setex(key, ttl_seconds, json.dumps(value, default=str))
        logger.debug(f"Cache SET (Redis): {key} (TTL: {ttl_seconds}s)")
    else:
        # Use in-memory cache
        _memory_cache[key] = value
        _cache_expiry[key] = datetime.now() + timedelta(seconds=ttl_seconds)
        logger.debug(f"Cache SET (Memory): {key} (TTL: {ttl_seconds}s)")


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


# Cache statistics and management
def get_cache_stats() -> dict:
    """Get cache performance statistics"""
    total_requests = _cache_stats['hits'] + _cache_stats['misses']
    hit_rate = (_cache_stats['hits'] / total_requests * 100) if total_requests > 0 else 0
    
    return {
        'hit_rate': round(hit_rate, 2),
        'total_requests': total_requests,
        'cache_size': len(_memory_cache),
        'redis_available': REDIS_AVAILABLE,
        **_cache_stats
    }

def clear_all_cache():
    """Clear all cache entries"""
    global _memory_cache, _cache_expiry
    
    if REDIS_AVAILABLE and redis_client:
        redis_client.flushdb()
    
    _memory_cache.clear()
    _cache_expiry.clear()
    logger.info("All cache entries cleared")

# Performance monitoring decorator
def monitor_performance(func):
    """Decorator to monitor function performance"""
    @wraps(func)
    def wrapper(*args, **kwargs):
        start_time = time.time()
        
        try:
            result = func(*args, **kwargs)
            execution_time = time.time() - start_time
            
            if execution_time > 1.0:  # Log slow queries (>1 second)
                logger.warning(f"Slow query detected: {func.__name__} took {execution_time:.2f}s")
            elif execution_time > 0.5:  # Log medium queries (>500ms)
                logger.info(f"Medium query: {func.__name__} took {execution_time:.2f}s")
            
            return result
            
        except Exception as e:
            execution_time = time.time() - start_time
            logger.error(f"Query failed: {func.__name__} after {execution_time:.2f}s - {e}")
            raise
    
    return wrapper

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
        
        if expired_keys:
            logger.debug(f"Cleaned up {len(expired_keys)} expired cache entries")