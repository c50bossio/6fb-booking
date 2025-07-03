"""Simple in-memory cache for database queries to reduce load."""

import time
import hashlib
import json
from typing import Any, Dict, Optional, Callable, TypeVar
from functools import wraps
import threading
import logging

logger = logging.getLogger(__name__)

T = TypeVar('T')

class QueryCache:
    """Simple in-memory cache with TTL support for database queries."""
    
    def __init__(self, default_ttl: int = 300):  # 5 minutes default
        self.cache: Dict[str, Dict[str, Any]] = {}
        self.default_ttl = default_ttl
        self.lock = threading.RLock()
        self.stats = {
            'hits': 0,
            'misses': 0,
            'sets': 0,
            'evictions': 0
        }
    
    def _generate_key(self, func_name: str, *args, **kwargs) -> str:
        """Generate a cache key from function name and arguments."""
        # Create a hashable representation of the arguments
        key_data = {
            'func': func_name,
            'args': str(args),
            'kwargs': json.dumps(kwargs, sort_keys=True, default=str)
        }
        key_string = json.dumps(key_data, sort_keys=True)
        return hashlib.md5(key_string.encode()).hexdigest()
    
    def get(self, key: str) -> Optional[Any]:
        """Get a value from cache if it exists and hasn't expired."""
        with self.lock:
            if key in self.cache:
                entry = self.cache[key]
                if time.time() < entry['expires_at']:
                    self.stats['hits'] += 1
                    return entry['value']
                else:
                    # Expired, remove it
                    del self.cache[key]
                    self.stats['evictions'] += 1
            
            self.stats['misses'] += 1
            return None
    
    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        """Set a value in cache with optional TTL."""
        if ttl is None:
            ttl = self.default_ttl
        
        with self.lock:
            self.cache[key] = {
                'value': value,
                'expires_at': time.time() + ttl,
                'created_at': time.time()
            }
            self.stats['sets'] += 1
    
    def delete(self, key: str) -> None:
        """Delete a key from cache."""
        with self.lock:
            if key in self.cache:
                del self.cache[key]
    
    def clear(self) -> None:
        """Clear all cache entries."""
        with self.lock:
            self.cache.clear()
            self.stats = {
                'hits': 0,
                'misses': 0,
                'sets': 0,
                'evictions': 0
            }
    
    def cleanup_expired(self) -> None:
        """Remove expired entries from cache."""
        current_time = time.time()
        with self.lock:
            expired_keys = [
                key for key, entry in self.cache.items()
                if current_time >= entry['expires_at']
            ]
            for key in expired_keys:
                del self.cache[key]
                self.stats['evictions'] += 1
    
    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics."""
        with self.lock:
            total_requests = self.stats['hits'] + self.stats['misses']
            hit_rate = (self.stats['hits'] / total_requests * 100) if total_requests > 0 else 0
            
            return {
                'cache_size': len(self.cache),
                'hit_rate': f"{hit_rate:.1f}%",
                'total_requests': total_requests,
                **self.stats
            }
    
    def invalidate_pattern(self, pattern: str) -> None:
        """Invalidate cache entries matching a pattern."""
        with self.lock:
            keys_to_delete = [
                key for key in self.cache.keys()
                if pattern in key
            ]
            for key in keys_to_delete:
                del self.cache[key]

# Global cache instance
query_cache = QueryCache()

def cached_query(ttl: int = 300, key_prefix: str = ""):
    """Decorator to cache database query results."""
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @wraps(func)
        def wrapper(*args, **kwargs) -> T:
            # Generate cache key
            cache_key = query_cache._generate_key(
                f"{key_prefix}:{func.__name__}" if key_prefix else func.__name__,
                *args, **kwargs
            )
            
            # Try to get from cache
            cached_result = query_cache.get(cache_key)
            if cached_result is not None:
                logger.debug(f"Cache hit for {func.__name__}")
                return cached_result
            
            # Execute function and cache result
            try:
                result = func(*args, **kwargs)
                query_cache.set(cache_key, result, ttl)
                logger.debug(f"Cache set for {func.__name__}")
                return result
            except Exception as e:
                logger.error(f"Error in cached function {func.__name__}: {str(e)}")
                raise
        
        return wrapper
    return decorator

def invalidate_cache_for_barber(barber_id: int):
    """Invalidate cache entries for a specific barber."""
    query_cache.invalidate_pattern(f"barber_{barber_id}")

def invalidate_cache_for_appointment(appointment_id: int):
    """Invalidate cache entries for a specific appointment."""
    query_cache.invalidate_pattern(f"appointment_{appointment_id}")

def invalidate_cache_for_date(date_str: str):
    """Invalidate cache entries for a specific date."""
    query_cache.invalidate_pattern(date_str)

# Cache-aware query functions
@cached_query(ttl=600, key_prefix="barber_availability")  # 10 minutes
def get_barber_regular_availability_cached(db, barber_id: int, day_of_week: int):
    """Cached version of barber regular availability check."""
    from sqlalchemy import exists
    import models
    
    return db.query(
        exists().where(
            models.BarberAvailability.barber_id == barber_id,
            models.BarberAvailability.day_of_week == day_of_week,
            models.BarberAvailability.is_active == True
        )
    ).scalar()

@cached_query(ttl=300, key_prefix="business_settings")  # 5 minutes
def get_business_settings_cached(db, business_id: int):
    """Cached version of business settings lookup."""
    try:
        import models
        return db.query(models.BusinessSettings).filter(
            models.BusinessSettings.business_id == business_id
        ).first()
    except Exception:
        # Fallback if BusinessSettings model doesn't exist
        return None

@cached_query(ttl=180, key_prefix="barber_services")  # 3 minutes
def get_barber_services_cached(db, barber_id: int):
    """Cached version of barber services lookup."""
    try:
        import models
        return db.query(models.Service).join(models.barber_services).filter(
            models.barber_services.c.barber_id == barber_id,
            models.barber_services.c.is_available == True
        ).all()
    except Exception:
        # Fallback if service tables don't exist
        return []

# Cache cleanup background task
def cleanup_cache_periodically():
    """Clean up expired cache entries. Should be called periodically."""
    query_cache.cleanup_expired()
    
    # Log cache stats periodically
    stats = query_cache.get_stats()
    if stats['total_requests'] > 0:
        logger.info(f"Query cache stats: {stats}")

# Cache middleware for automatic cleanup
class CacheMiddleware:
    """Middleware to automatically clean up cache."""
    
    def __init__(self, cleanup_interval: int = 300):  # 5 minutes
        self.cleanup_interval = cleanup_interval
        self.last_cleanup = time.time()
    
    def __call__(self, request, call_next):
        # Check if cleanup is needed
        current_time = time.time()
        if current_time - self.last_cleanup > self.cleanup_interval:
            cleanup_cache_periodically()
            self.last_cleanup = current_time
        
        # Process request
        response = call_next(request)
        return response