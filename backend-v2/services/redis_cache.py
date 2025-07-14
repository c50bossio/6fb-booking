"""
Enhanced Redis Cache Service for BookedBarber V2
Provides comprehensive caching for API responses, session management, and data optimization.
"""

import json
import pickle
import hashlib
import logging
import asyncio
from typing import Any, Dict, List, Optional, Union, Callable
from datetime import datetime, timedelta
from functools import wraps
from dataclasses import dataclass, asdict

import redis.asyncio as redis
from redis.asyncio import ConnectionPool
from sqlalchemy.orm import Session

from config import settings

logger = logging.getLogger(__name__)

@dataclass
class CacheStats:
    """Cache statistics data class"""
    hits: int = 0
    misses: int = 0
    sets: int = 0
    deletes: int = 0
    errors: int = 0
    
    @property
    def hit_rate(self) -> float:
        total = self.hits + self.misses
        return (self.hits / total * 100) if total > 0 else 0.0

class RedisManager:
    """Advanced Redis connection and management"""
    
    def __init__(self):
        self.pool: Optional[ConnectionPool] = None
        self.redis: Optional[redis.Redis] = None
        self.stats = CacheStats()
        self._connected = False
    
    async def initialize(self):
        """Initialize Redis connection with optimized settings"""
        try:
            # Create connection pool with optimized settings
            self.pool = ConnectionPool(
                host=settings.redis_host,
                port=settings.redis_port,
                db=0,  # Use database 0 for main cache
                max_connections=settings.redis_max_connections,
                socket_timeout=settings.redis_socket_timeout,
                socket_connect_timeout=10,
                socket_keepalive=True,
                socket_keepalive_options={},
                health_check_interval=30,  # Health check every 30 seconds
                retry_on_timeout=True,
                retry_on_error=[ConnectionError, TimeoutError],
                decode_responses=False,  # Keep as bytes for pickle support
            )
            
            self.redis = redis.Redis(connection_pool=self.pool)
            
            # Test connection
            await self.redis.ping()
            self._connected = True
            
            logger.info("✅ Redis connection established successfully")
            
        except Exception as e:
            logger.error(f"❌ Failed to connect to Redis: {e}")
            self._connected = False
            # Initialize a mock redis for fallback
            self.redis = MockRedis()
    
    async def close(self):
        """Close Redis connection"""
        if self.redis:
            await self.redis.close()
        if self.pool:
            await self.pool.disconnect()
        self._connected = False
    
    @property
    def is_connected(self) -> bool:
        return self._connected
    
    async def health_check(self) -> Dict[str, Any]:
        """Perform comprehensive health check"""
        try:
            start_time = datetime.now()
            
            # Basic connectivity test
            await self.redis.ping()
            
            # Performance test
            test_key = "health_check_test"
            await self.redis.set(test_key, "test_value", ex=10)
            retrieved = await self.redis.get(test_key)
            await self.redis.delete(test_key)
            
            latency = (datetime.now() - start_time).total_seconds() * 1000
            
            # Get Redis info
            info = await self.redis.info()
            
            return {
                "status": "healthy",
                "latency_ms": round(latency, 2),
                "connected_clients": info.get("connected_clients", 0),
                "used_memory": info.get("used_memory_human", "unknown"),
                "hit_rate": self.stats.hit_rate,
                "total_requests": self.stats.hits + self.stats.misses,
                "uptime_seconds": info.get("uptime_in_seconds", 0)
            }
            
        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e),
                "latency_ms": None
            }

class MockRedis:
    """Mock Redis for fallback when Redis is unavailable"""
    
    def __init__(self):
        self._store = {}
        self._expiry = {}
    
    async def ping(self):
        return True
    
    async def set(self, key: str, value: Any, ex: Optional[int] = None):
        self._store[key] = value
        if ex:
            self._expiry[key] = datetime.now() + timedelta(seconds=ex)
        return True
    
    async def get(self, key: str):
        if key in self._expiry and datetime.now() > self._expiry[key]:
            del self._store[key]
            del self._expiry[key]
            return None
        return self._store.get(key)
    
    async def delete(self, key: str):
        self._store.pop(key, None)
        self._expiry.pop(key, None)
        return 1
    
    async def exists(self, key: str):
        return key in self._store
    
    async def close(self):
        pass
    
    async def info(self):
        return {"connected_clients": 1, "used_memory_human": "mock"}

class EnhancedCacheService:
    """Enhanced caching service with intelligent cache management"""
    
    def __init__(self):
        self.redis_manager = RedisManager()
        self.namespace = "bookedbarber_v2"
        self.default_ttl = 300  # 5 minutes default TTL
        
    async def initialize(self):
        """Initialize the cache service"""
        await self.redis_manager.initialize()
    
    def _generate_key(self, namespace: str, *args, **kwargs) -> str:
        """Generate a cache key from arguments"""
        # Create a deterministic key from arguments
        key_data = {
            'args': args,
            'kwargs': sorted(kwargs.items()) if kwargs else {}
        }
        
        key_string = json.dumps(key_data, sort_keys=True, default=str)
        key_hash = hashlib.md5(key_string.encode()).hexdigest()[:12]
        
        return f"{self.namespace}:{namespace}:{key_hash}"
    
    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        try:
            if not self.redis_manager.is_connected:
                return None
            
            data = await self.redis_manager.redis.get(key)
            
            if data is None:
                self.redis_manager.stats.misses += 1
                return None
            
            self.redis_manager.stats.hits += 1
            
            # Try to deserialize as JSON first, then pickle
            try:
                return json.loads(data.decode() if isinstance(data, bytes) else data)
            except (json.JSONDecodeError, UnicodeDecodeError):
                return pickle.loads(data)
                
        except Exception as e:
            logger.warning(f"Cache get error for key {key}: {e}")
            self.redis_manager.stats.errors += 1
            return None
    
    async def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """Set value in cache"""
        try:
            if not self.redis_manager.is_connected:
                return False
            
            # Serialize data
            try:
                # Try JSON first for better performance and readability
                serialized = json.dumps(value, default=str)
            except (TypeError, ValueError):
                # Fall back to pickle for complex objects
                serialized = pickle.dumps(value)
            
            ttl = ttl or self.default_ttl
            await self.redis_manager.redis.set(key, serialized, ex=ttl)
            
            self.redis_manager.stats.sets += 1
            return True
            
        except Exception as e:
            logger.warning(f"Cache set error for key {key}: {e}")
            self.redis_manager.stats.errors += 1
            return False
    
    async def delete(self, key: str) -> bool:
        """Delete value from cache"""
        try:
            if not self.redis_manager.is_connected:
                return False
            
            result = await self.redis_manager.redis.delete(key)
            
            if result:
                self.redis_manager.stats.deletes += 1
            
            return bool(result)
            
        except Exception as e:
            logger.warning(f"Cache delete error for key {key}: {e}")
            self.redis_manager.stats.errors += 1
            return False
    
    async def exists(self, key: str) -> bool:
        """Check if key exists in cache"""
        try:
            if not self.redis_manager.is_connected:
                return False
            
            return bool(await self.redis_manager.redis.exists(key))
            
        except Exception as e:
            logger.warning(f"Cache exists error for key {key}: {e}")
            return False
    
    async def clear_pattern(self, pattern: str) -> int:
        """Clear all keys matching a pattern"""
        try:
            if not self.redis_manager.is_connected:
                return 0
            
            # Use scan for memory-efficient pattern deletion
            deleted_count = 0
            async for key in self.redis_manager.redis.scan_iter(match=pattern):
                await self.redis_manager.redis.delete(key)
                deleted_count += 1
            
            return deleted_count
            
        except Exception as e:
            logger.warning(f"Cache clear pattern error for {pattern}: {e}")
            return 0
    
    async def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        health = await self.redis_manager.health_check()
        
        return {
            "cache_stats": asdict(self.redis_manager.stats),
            "redis_health": health,
            "connection_status": "connected" if self.redis_manager.is_connected else "disconnected"
        }

# Global cache instance
cache_service = EnhancedCacheService()

def cached_response(
    namespace: str,
    ttl: Optional[int] = None,
    key_generator: Optional[Callable] = None
):
    """Decorator for caching function responses"""
    
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Generate cache key
            if key_generator:
                cache_key = key_generator(*args, **kwargs)
            else:
                cache_key = cache_service._generate_key(namespace, *args, **kwargs)
            
            # Try to get from cache
            cached_result = await cache_service.get(cache_key)
            if cached_result is not None:
                return cached_result
            
            # Execute function and cache result
            result = await func(*args, **kwargs) if asyncio.iscoroutinefunction(func) else func(*args, **kwargs)
            
            # Cache the result
            await cache_service.set(cache_key, result, ttl)
            
            return result
        
        return wrapper
    return decorator

def cache_invalidator(patterns: List[str]):
    """Decorator for cache invalidation after function execution"""
    
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Execute function first
            result = await func(*args, **kwargs) if asyncio.iscoroutinefunction(func) else func(*args, **kwargs)
            
            # Invalidate cache patterns
            for pattern in patterns:
                await cache_service.clear_pattern(f"{cache_service.namespace}:{pattern}:*")
            
            return result
        
        return wrapper
    return decorator

class SpecializedCaches:
    """Specialized cache managers for different data types"""
    
    @staticmethod
    async def cache_user_session(user_id: int, session_data: Dict[str, Any], ttl: int = 1800):
        """Cache user session data (30 minutes default)"""
        key = f"session:user:{user_id}"
        await cache_service.set(key, session_data, ttl)
    
    @staticmethod
    async def get_user_session(user_id: int) -> Optional[Dict[str, Any]]:
        """Get user session data"""
        key = f"session:user:{user_id}"
        return await cache_service.get(key)
    
    @staticmethod
    async def cache_appointment_slots(barber_id: int, date_str: str, slots: List[Dict], ttl: int = 600):
        """Cache available appointment slots (10 minutes default)"""
        key = f"slots:barber:{barber_id}:date:{date_str}"
        await cache_service.set(key, slots, ttl)
    
    @staticmethod
    async def get_appointment_slots(barber_id: int, date_str: str) -> Optional[List[Dict]]:
        """Get cached appointment slots"""
        key = f"slots:barber:{barber_id}:date:{date_str}"
        return await cache_service.get(key)
    
    @staticmethod
    async def cache_business_analytics(location_id: int, analytics_data: Dict[str, Any], ttl: int = 3600):
        """Cache business analytics (1 hour default)"""
        key = f"analytics:location:{location_id}"
        await cache_service.set(key, analytics_data, ttl)
    
    @staticmethod
    async def get_business_analytics(location_id: int) -> Optional[Dict[str, Any]]:
        """Get cached business analytics"""
        key = f"analytics:location:{location_id}"
        return await cache_service.get(key)
    
    @staticmethod
    async def invalidate_user_cache(user_id: int):
        """Invalidate all cache entries for a user"""
        patterns = [
            f"session:user:{user_id}",
            f"*:user:{user_id}:*",
            f"user:{user_id}:*"
        ]
        
        for pattern in patterns:
            await cache_service.clear_pattern(pattern)
    
    @staticmethod
    async def invalidate_barber_cache(barber_id: int):
        """Invalidate all cache entries for a barber"""
        patterns = [
            f"slots:barber:{barber_id}:*",
            f"*:barber:{barber_id}:*",
            f"barber:{barber_id}:*"
        ]
        
        for pattern in patterns:
            await cache_service.clear_pattern(pattern)

# Example usage decorators for common BookedBarber operations

@cached_response("appointments", ttl=300)
async def get_cached_appointments(user_id: int, db: Session):
    """Example cached appointment retrieval"""
    pass  # Implementation would go here

@cache_invalidator(["appointments", "slots"])
async def create_appointment_with_cache_invalidation(*args, **kwargs):
    """Example appointment creation with cache invalidation"""
    pass  # Implementation would go here

# Initialize cache service on module import
async def init_cache():
    """Initialize cache service"""
    await cache_service.initialize()

# Health check function
async def cache_health_check() -> Dict[str, Any]:
    """Get comprehensive cache health status"""
    return await cache_service.get_stats()