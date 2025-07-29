import os
import redis
import json
import logging
import pickle
from typing import Any, Optional, Union, Dict, List
from datetime import datetime, timedelta
from functools import wraps
import hashlib

logger = logging.getLogger(__name__)

class RedisManager:
    """Production-ready Redis caching manager with advanced features"""
    
    def __init__(self):
        self.redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
        self.environment = os.getenv("ENVIRONMENT", "development")
        self.client = self._create_redis_client()
        self.default_ttl = int(os.getenv("CACHE_DEFAULT_TTL", 3600))  # 1 hour
        self.key_prefix = f"bb_v2_{self.environment}"
        
    def _create_redis_client(self) -> redis.Redis:
        """Create optimized Redis client"""
        try:
            client = redis.from_url(
                self.redis_url,
                encoding="utf-8",
                decode_responses=True,
                socket_timeout=5,
                socket_connect_timeout=5,
                socket_keepalive=True,
                socket_keepalive_options={},
                health_check_interval=30,
                max_connections=20,
                retry_on_timeout=True
            )
            
            # Test connection
            client.ping()
            logger.info(f"Redis connection established: {self.redis_url}")
            return client
        except Exception as e:
            logger.error(f"Redis connection failed: {e}")
            return self._create_fallback_client()
    
    def _create_fallback_client(self):
        """Create fallback for when Redis is unavailable"""
        class MockRedis:
            def get(self, key): return None
            def set(self, key, value, ex=None): return True
            def delete(self, *keys): return 0
            def exists(self, key): return False
            def flushdb(self): return True
            def ping(self): return True
            def keys(self, pattern): return []
            def pipeline(self): return self
            def execute(self): return []
            def __enter__(self): return self
            def __exit__(self, *args): pass
        
        logger.warning("Using mock Redis client - caching disabled")
        return MockRedis()
    
    def _make_key(self, key: str, namespace: str = "general") -> str:
        """Create namespaced cache key"""
        return f"{self.key_prefix}:{namespace}:{key}"
    
    def _serialize_value(self, value: Any) -> str:
        """Serialize value for Redis storage"""
        try:
            if isinstance(value, (dict, list)):
                return json.dumps(value, default=str)
            elif isinstance(value, (int, float, str, bool)):
                return str(value)
            else:
                return pickle.dumps(value).hex()
        except Exception as e:
            logger.error(f"Serialization error: {e}")
            return str(value)
    
    def _deserialize_value(self, value: str, value_type: str = "auto") -> Any:
        """Deserialize value from Redis"""
        if not value:
            return None
            
        try:
            if value_type == "json" or (value_type == "auto" and value.startswith(('[', '{'))):
                return json.loads(value)
            elif value_type == "pickle" or (value_type == "auto" and len(value) > 100 and all(c in '0123456789abcdef' for c in value)):
                return pickle.loads(bytes.fromhex(value))
            else:
                return value
        except Exception as e:
            logger.error(f"Deserialization error: {e}")
            return value
    
    def get(self, key: str, namespace: str = "general", default: Any = None) -> Any:
        """Get value from cache"""
        try:
            cache_key = self._make_key(key, namespace)
            value = self.client.get(cache_key)
            
            if value is None:
                return default
            
            return self._deserialize_value(value)
        except Exception as e:
            logger.error(f"Cache get error: {e}")
            return default
    
    def set(self, key: str, value: Any, ttl: Optional[int] = None, namespace: str = "general") -> bool:
        """Set value in cache with TTL"""
        try:
            cache_key = self._make_key(key, namespace)
            serialized_value = self._serialize_value(value)
            ttl = ttl or self.default_ttl
            
            return self.client.set(cache_key, serialized_value, ex=ttl)
        except Exception as e:
            logger.error(f"Cache set error: {e}")
            return False
    
    def delete(self, key: str, namespace: str = "general") -> bool:
        """Delete key from cache"""
        try:
            cache_key = self._make_key(key, namespace)
            return bool(self.client.delete(cache_key))
        except Exception as e:
            logger.error(f"Cache delete error: {e}")
            return False
    
    def exists(self, key: str, namespace: str = "general") -> bool:
        """Check if key exists in cache"""
        try:
            cache_key = self._make_key(key, namespace)
            return bool(self.client.exists(cache_key))
        except Exception as e:
            logger.error(f"Cache exists error: {e}")
            return False
    
    def get_or_set(self, key: str, func, ttl: Optional[int] = None, namespace: str = "general") -> Any:
        """Get value from cache or set it using function"""
        cached_value = self.get(key, namespace)
        if cached_value is not None:
            return cached_value
        
        # Execute function and cache result
        value = func()
        self.set(key, value, ttl, namespace)
        return value
    
    def invalidate_pattern(self, pattern: str, namespace: str = "general") -> int:
        """Invalidate all keys matching pattern"""
        try:
            cache_pattern = self._make_key(pattern, namespace)
            keys = self.client.keys(cache_pattern)
            if keys:
                return self.client.delete(*keys)
            return 0
        except Exception as e:
            logger.error(f"Cache pattern invalidation error: {e}")
            return 0
    
    def cache_user_data(self, user_id: int, data: Dict, ttl: int = 1800) -> bool:
        """Cache user-specific data (30 minutes default)"""
        return self.set(f"user_{user_id}", data, ttl, "users")
    
    def get_user_data(self, user_id: int) -> Optional[Dict]:
        """Get cached user data"""
        return self.get(f"user_{user_id}", "users")
    
    def cache_appointment_data(self, appointment_id: int, data: Dict, ttl: int = 600) -> bool:
        """Cache appointment data (10 minutes default)"""
        return self.set(f"appointment_{appointment_id}", data, ttl, "appointments")
    
    def invalidate_user_cache(self, user_id: int) -> bool:
        """Invalidate all cache for specific user"""
        patterns = [
            f"user_{user_id}",
            f"*_user_{user_id}",
            f"appointments_user_{user_id}",
            f"schedule_user_{user_id}"
        ]
        
        total_deleted = 0
        for pattern in patterns:
            total_deleted += self.invalidate_pattern(pattern, "users")
            total_deleted += self.invalidate_pattern(pattern, "appointments")
            total_deleted += self.invalidate_pattern(pattern, "schedule")
        
        return total_deleted > 0
    
    def cache_api_response(self, endpoint: str, params: Dict, response: Any, ttl: int = 300) -> bool:
        """Cache API response (5 minutes default)"""
        # Create unique key based on endpoint and parameters
        param_hash = hashlib.md5(json.dumps(params, sort_keys=True).encode()).hexdigest()
        key = f"api_{endpoint}_{param_hash}"
        return self.set(key, response, ttl, "api")
    
    def get_cached_api_response(self, endpoint: str, params: Dict) -> Any:
        """Get cached API response"""
        param_hash = hashlib.md5(json.dumps(params, sort_keys=True).encode()).hexdigest()
        key = f"api_{endpoint}_{param_hash}"
        return self.get(key, "api")
    
    def cache_analytics_data(self, query_hash: str, data: Any, ttl: int = 1800) -> bool:
        """Cache analytics query results (30 minutes default)"""
        return self.set(f"analytics_{query_hash}", data, ttl, "analytics")
    
    def health_check(self) -> Dict:
        """Get Redis health information"""
        try:
            ping_result = self.client.ping()
            info = self.client.info()
            
            return {
                "connected": ping_result,
                "memory_used": info.get("used_memory_human", "unknown"),
                "connected_clients": info.get("connected_clients", 0),
                "total_keys": len(self.client.keys(f"{self.key_prefix}:*")),
                "environment": self.environment
            }
        except Exception as e:
            logger.error(f"Redis health check failed: {e}")
            return {
                "connected": False,
                "error": str(e),
                "environment": self.environment
            }
    
    def clear_all_cache(self) -> bool:
        """Clear all application cache (use with caution)"""
        try:
            keys = self.client.keys(f"{self.key_prefix}:*")
            if keys:
                return bool(self.client.delete(*keys))
            return True
        except Exception as e:
            logger.error(f"Cache clear error: {e}")
            return False

# Global Redis manager instance
redis_manager = RedisManager()

def cache_result(ttl: int = 3600, namespace: str = "general"):
    """Decorator to cache function results"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Create cache key from function name and arguments
            cache_key = f"{func.__name__}_{hash(str(args) + str(sorted(kwargs.items())))}"
            
            # Try to get from cache
            cached_result = redis_manager.get(cache_key, namespace)
            if cached_result is not None:
                return cached_result
            
            # Execute function and cache result
            result = func(*args, **kwargs)
            redis_manager.set(cache_key, result, ttl, namespace)
            return result
        
        return wrapper
    return decorator

def invalidate_cache(pattern: str, namespace: str = "general"):
    """Helper function to invalidate cache patterns"""
    return redis_manager.invalidate_pattern(pattern, namespace)

# Cache health check function
def get_cache_health() -> Dict:
    """Get cache system health"""
    return redis_manager.health_check()