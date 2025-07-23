import json
import hashlib
import logging
from typing import Any, Dict, List, Optional
from datetime import datetime, timedelta
import redis
from functools import wraps

logger = logging.getLogger(__name__)

class DatabaseCache:
    """Redis-based database caching layer"""
    
    def __init__(self, redis_url: str = None):
        self.redis_client = redis.from_url(redis_url) if redis_url else None
        self.default_ttl = 300  # 5 minutes
        self.cache_key_prefix = "bookedbarber:db:"
        
        self.ttl_settings = {
            'user_profile': 1800,      # 30 minutes
            'barber_schedule': 300,    # 5 minutes
            'appointment_list': 300,   # 5 minutes
            'revenue_data': 600,       # 10 minutes
            'analytics_data': 1800,    # 30 minutes
            'service_list': 3600,      # 1 hour
            'static_data': 86400       # 24 hours
        }
    
    def _generate_cache_key(self, key_parts: List[str]) -> str:
        """Generate consistent cache key"""
        key_string = ":".join(str(part) for part in key_parts)
        key_hash = hashlib.md5(key_string.encode()).hexdigest()[:12]
        return f"{self.cache_key_prefix}{key_hash}:{key_string}"
    
    def get(self, key_parts: List[str]) -> Optional[Any]:
        """Get data from cache"""
        if not self.redis_client:
            return None
        
        try:
            cache_key = self._generate_cache_key(key_parts)
            cached_data = self.redis_client.get(cache_key)
            
            if cached_data:
                return json.loads(cached_data)
            return None
            
        except Exception as e:
            logger.error(f"Cache get error: {e}")
            return None
    
    def set(self, key_parts: List[str], data: Any, ttl: Optional[int] = None, data_type: str = 'default') -> bool:
        """Set data in cache"""
        if not self.redis_client:
            return False
        
        try:
            cache_key = self._generate_cache_key(key_parts)
            
            if ttl is None:
                ttl = self.ttl_settings.get(data_type, self.default_ttl)
            
            serialized_data = json.dumps(data, default=str)
            self.redis_client.setex(cache_key, ttl, serialized_data)
            
            logger.debug(f"Cached data with key {cache_key} for {ttl} seconds")
            return True
            
        except Exception as e:
            logger.error(f"Cache set error: {e}")
            return False

# Global cache instance
db_cache = DatabaseCache()

def cached_query(key_parts: List[str], ttl: Optional[int] = None, data_type: str = 'default'):
    """Decorator for caching database query results"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            cache_key_parts = key_parts + [str(arg) for arg in args] + [f"{k}:{v}" for k, v in sorted(kwargs.items())]
            
            cached_result = db_cache.get(cache_key_parts)
            if cached_result is not None:
                logger.debug(f"Cache hit for query: {func.__name__}")
                return cached_result
            
            result = func(*args, **kwargs)
            
            if result is not None:
                db_cache.set(cache_key_parts, result, ttl, data_type)
                logger.debug(f"Cached result for query: {func.__name__}")
            
            return result
        return wrapper
    return decorator
