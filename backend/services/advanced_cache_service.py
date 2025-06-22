"""
Advanced Caching Service for 6FB Booking System
Multi-tier caching with Redis, memory cache, and intelligent invalidation
"""

import json
import pickle
import hashlib
import logging
import asyncio
from typing import Any, Optional, List, Dict, Union, Callable
from datetime import datetime, timedelta
from functools import wraps
import redis
from cachetools import TTLCache, LRUCache
import time
from sqlalchemy.orm import Session
from contextlib import asynccontextmanager

logger = logging.getLogger(__name__)


class CacheConfig:
    """Cache configuration settings"""

    # Redis settings
    REDIS_HOST = "localhost"
    REDIS_PORT = 6379
    REDIS_DB = 0
    REDIS_PASSWORD = None
    REDIS_SOCKET_TIMEOUT = 5
    REDIS_CONNECTION_POOL_SIZE = 50

    # Memory cache settings
    MEMORY_CACHE_SIZE = 10000
    MEMORY_CACHE_TTL = 3600  # 1 hour

    # Cache key prefixes
    KEY_PREFIX = "6fb_booking:"
    ANALYTICS_PREFIX = "analytics:"
    APPOINTMENT_PREFIX = "appointment:"
    BARBER_PREFIX = "barber:"
    USER_PREFIX = "user:"
    BOOKING_PREFIX = "booking:"

    # Default TTLs (in seconds)
    DEFAULT_TTL = 3600  # 1 hour
    SHORT_TTL = 300  # 5 minutes
    LONG_TTL = 86400  # 1 day
    PERMANENT_TTL = 604800  # 1 week


class CacheStats:
    """Cache performance statistics"""

    def __init__(self):
        self.hits = 0
        self.misses = 0
        self.sets = 0
        self.deletes = 0
        self.errors = 0
        self.start_time = time.time()

    def hit(self):
        self.hits += 1

    def miss(self):
        self.misses += 1

    def set(self):
        self.sets += 1

    def delete(self):
        self.deletes += 1

    def error(self):
        self.errors += 1

    @property
    def hit_rate(self) -> float:
        total = self.hits + self.misses
        return (self.hits / total * 100) if total > 0 else 0

    @property
    def total_operations(self) -> int:
        return self.hits + self.misses + self.sets + self.deletes

    def to_dict(self) -> Dict[str, Any]:
        return {
            "hits": self.hits,
            "misses": self.misses,
            "sets": self.sets,
            "deletes": self.deletes,
            "errors": self.errors,
            "hit_rate": round(self.hit_rate, 2),
            "total_operations": self.total_operations,
            "uptime_seconds": int(time.time() - self.start_time),
        }


class AdvancedCacheService:
    """Multi-tier caching service with Redis and memory cache"""

    def __init__(self, config: CacheConfig = None):
        self.config = config or CacheConfig()
        self.stats = CacheStats()

        # Initialize Redis connection
        self._init_redis()

        # Initialize memory cache
        self.memory_cache = TTLCache(
            maxsize=self.config.MEMORY_CACHE_SIZE, ttl=self.config.MEMORY_CACHE_TTL
        )

        # Cache invalidation patterns
        self.invalidation_patterns = {
            "appointment": ["analytics:", "barber:", "booking:"],
            "user": ["user:", "auth:"],
            "barber": ["barber:", "analytics:", "booking:"],
            "payment": ["analytics:", "appointment:", "barber:"],
            "booking": ["booking:", "barber:", "analytics:"],
        }

        logger.info("Advanced Cache Service initialized")

    def _init_redis(self):
        """Initialize Redis connection with connection pooling"""
        try:
            # Create connection pool
            self.redis_pool = redis.ConnectionPool(
                host=self.config.REDIS_HOST,
                port=self.config.REDIS_PORT,
                db=self.config.REDIS_DB,
                password=self.config.REDIS_PASSWORD,
                socket_timeout=self.config.REDIS_SOCKET_TIMEOUT,
                max_connections=self.config.REDIS_CONNECTION_POOL_SIZE,
                decode_responses=False,  # Keep binary for pickle
            )

            # Create Redis client
            self.redis_client = redis.Redis(connection_pool=self.redis_pool)

            # Test connection
            self.redis_client.ping()
            self.redis_available = True
            logger.info("Redis connection established successfully")

        except Exception as e:
            logger.warning(
                f"Redis connection failed: {str(e)}. Falling back to memory-only cache."
            )
            self.redis_client = None
            self.redis_available = False

    def _generate_cache_key(self, key: str, prefix: str = None) -> str:
        """Generate standardized cache key"""
        prefix = prefix or ""
        return f"{self.config.KEY_PREFIX}{prefix}{key}"

    def _serialize_data(self, data: Any) -> bytes:
        """Serialize data for caching"""
        try:
            # Use pickle for complex objects, JSON for simple ones
            if isinstance(data, (dict, list, str, int, float, bool)) or data is None:
                return json.dumps(data, default=str).encode("utf-8")
            else:
                return pickle.dumps(data)
        except Exception as e:
            logger.error(f"Serialization error: {str(e)}")
            return pickle.dumps(data)

    def _deserialize_data(self, data: bytes) -> Any:
        """Deserialize cached data"""
        try:
            # Try JSON first
            return json.loads(data.decode("utf-8"))
        except (json.JSONDecodeError, UnicodeDecodeError):
            try:
                # Fall back to pickle
                return pickle.loads(data)
            except Exception as e:
                logger.error(f"Deserialization error: {str(e)}")
                return None

    async def get(self, key: str, prefix: str = None) -> Optional[Any]:
        """Get value from cache (memory first, then Redis)"""
        cache_key = self._generate_cache_key(key, prefix)

        try:
            # Try memory cache first
            if cache_key in self.memory_cache:
                self.stats.hit()
                logger.debug(f"Memory cache hit: {cache_key}")
                return self.memory_cache[cache_key]

            # Try Redis cache
            if self.redis_available:
                data = self.redis_client.get(cache_key)
                if data is not None:
                    deserialized_data = self._deserialize_data(data)
                    # Store in memory cache for next time
                    self.memory_cache[cache_key] = deserialized_data
                    self.stats.hit()
                    logger.debug(f"Redis cache hit: {cache_key}")
                    return deserialized_data

            # Cache miss
            self.stats.miss()
            logger.debug(f"Cache miss: {cache_key}")
            return None

        except Exception as e:
            self.stats.error()
            logger.error(f"Cache get error for key {cache_key}: {str(e)}")
            return None

    async def set(
        self, key: str, value: Any, ttl: int = None, prefix: str = None
    ) -> bool:
        """Set value in cache (both memory and Redis)"""
        cache_key = self._generate_cache_key(key, prefix)
        ttl = ttl or self.config.DEFAULT_TTL

        try:
            # Store in memory cache
            self.memory_cache[cache_key] = value

            # Store in Redis cache
            if self.redis_available:
                serialized_data = self._serialize_data(value)
                self.redis_client.setex(cache_key, ttl, serialized_data)

            self.stats.set()
            logger.debug(f"Cache set: {cache_key} (TTL: {ttl}s)")
            return True

        except Exception as e:
            self.stats.error()
            logger.error(f"Cache set error for key {cache_key}: {str(e)}")
            return False

    async def delete(self, key: str, prefix: str = None) -> bool:
        """Delete value from cache"""
        cache_key = self._generate_cache_key(key, prefix)

        try:
            # Remove from memory cache
            self.memory_cache.pop(cache_key, None)

            # Remove from Redis cache
            if self.redis_available:
                self.redis_client.delete(cache_key)

            self.stats.delete()
            logger.debug(f"Cache delete: {cache_key}")
            return True

        except Exception as e:
            self.stats.error()
            logger.error(f"Cache delete error for key {cache_key}: {str(e)}")
            return False

    async def delete_pattern(self, pattern: str) -> int:
        """Delete all keys matching pattern"""
        if not self.redis_available:
            # For memory cache, we need to iterate
            keys_to_delete = [k for k in self.memory_cache.keys() if pattern in k]
            for key in keys_to_delete:
                del self.memory_cache[key]
            return len(keys_to_delete)

        try:
            # Get all keys matching pattern
            pattern_key = self._generate_cache_key(pattern)
            keys = self.redis_client.keys(f"{pattern_key}*")

            if keys:
                # Delete from Redis
                deleted_count = self.redis_client.delete(*keys)

                # Delete from memory cache
                for key in keys:
                    self.memory_cache.pop(key.decode("utf-8"), None)

                logger.info(f"Deleted {deleted_count} keys matching pattern: {pattern}")
                return deleted_count

            return 0

        except Exception as e:
            self.stats.error()
            logger.error(f"Cache delete pattern error for {pattern}: {str(e)}")
            return 0

    async def invalidate_related(self, entity_type: str, entity_id: str = None):
        """Invalidate cache entries related to entity changes"""
        patterns = self.invalidation_patterns.get(entity_type, [])

        total_deleted = 0
        for pattern in patterns:
            if entity_id:
                # Invalidate specific entity caches
                specific_pattern = f"{pattern}{entity_id}"
                deleted = await self.delete_pattern(specific_pattern)
                total_deleted += deleted

            # Invalidate general pattern caches (like analytics)
            deleted = await self.delete_pattern(pattern)
            total_deleted += deleted

        logger.info(f"Invalidated {total_deleted} cache entries for {entity_type}")
        return total_deleted

    async def get_or_set(
        self, key: str, factory_func: Callable, ttl: int = None, prefix: str = None
    ) -> Any:
        """Get from cache or execute factory function and cache result"""
        # Try to get from cache first
        cached_value = await self.get(key, prefix)
        if cached_value is not None:
            return cached_value

        # Execute factory function
        try:
            if asyncio.iscoroutinefunction(factory_func):
                value = await factory_func()
            else:
                value = factory_func()

            # Cache the result
            if value is not None:
                await self.set(key, value, ttl, prefix)

            return value

        except Exception as e:
            logger.error(f"Factory function error for key {key}: {str(e)}")
            return None

    def get_stats(self) -> Dict[str, Any]:
        """Get cache performance statistics"""
        stats = self.stats.to_dict()

        # Add memory cache stats
        stats["memory_cache"] = {
            "size": len(self.memory_cache),
            "max_size": self.memory_cache.maxsize,
            "ttl": self.memory_cache.ttl,
        }

        # Add Redis stats if available
        if self.redis_available:
            try:
                redis_info = self.redis_client.info("memory")
                stats["redis"] = {
                    "connected": True,
                    "used_memory": redis_info.get("used_memory_human", "Unknown"),
                    "max_memory": redis_info.get("maxmemory_human", "Unlimited"),
                    "keys": self.redis_client.dbsize(),
                }
            except Exception as e:
                stats["redis"] = {"connected": False, "error": str(e)}
        else:
            stats["redis"] = {"connected": False}

        return stats

    async def warm_up_cache(self, db: Session):
        """Pre-populate cache with frequently accessed data"""
        logger.info("Starting cache warm-up...")

        try:
            # Import here to avoid circular imports
            from models import User, Barber, Location, Service

            # Warm up active users
            active_users = db.query(User).filter(User.is_active == True).all()
            for user in active_users:
                await self.set(
                    f"user:{user.id}",
                    user,
                    self.config.LONG_TTL,
                    self.config.USER_PREFIX,
                )

            # Warm up active barbers
            active_barbers = db.query(Barber).filter(Barber.is_active == True).all()
            for barber in active_barbers:
                await self.set(
                    f"barber:{barber.id}",
                    barber,
                    self.config.LONG_TTL,
                    self.config.BARBER_PREFIX,
                )

            # Warm up active services
            active_services = db.query(Service).filter(Service.is_active == True).all()
            for service in active_services:
                await self.set(
                    f"service:{service.id}",
                    service,
                    self.config.LONG_TTL,
                    self.config.BOOKING_PREFIX,
                )

            logger.info(
                f"Cache warm-up completed. Cached {len(active_users)} users, {len(active_barbers)} barbers, {len(active_services)} services"
            )

        except Exception as e:
            logger.error(f"Cache warm-up error: {str(e)}")

    async def cleanup_expired(self):
        """Clean up expired cache entries"""
        if not self.redis_available:
            return

        try:
            # Redis handles TTL automatically, but we can clean up memory cache
            current_time = time.time()
            expired_keys = []

            for key in list(self.memory_cache.keys()):
                # TTLCache handles expiration automatically, but we can force cleanup
                try:
                    _ = self.memory_cache[key]  # This will remove expired items
                except KeyError:
                    expired_keys.append(key)

            logger.info(f"Cleaned up {len(expired_keys)} expired memory cache entries")

        except Exception as e:
            logger.error(f"Cache cleanup error: {str(e)}")


# Decorator for automatic caching
def cached(ttl: int = None, prefix: str = None, key_generator: Callable = None):
    """Decorator for automatic function result caching"""

    def decorator(func):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            # Generate cache key
            if key_generator:
                cache_key = key_generator(*args, **kwargs)
            else:
                # Default key generation
                func_name = func.__name__
                args_str = str(args) + str(sorted(kwargs.items()))
                cache_key = f"{func_name}:{hashlib.md5(args_str.encode()).hexdigest()}"

            # Try to get from cache
            cached_result = await cache_service.get(cache_key, prefix)
            if cached_result is not None:
                return cached_result

            # Execute function
            if asyncio.iscoroutinefunction(func):
                result = await func(*args, **kwargs)
            else:
                result = func(*args, **kwargs)

            # Cache result
            if result is not None:
                await cache_service.set(cache_key, result, ttl, prefix)

            return result

        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            return asyncio.run(async_wrapper(*args, **kwargs))

        return async_wrapper if asyncio.iscoroutinefunction(func) else sync_wrapper

    return decorator


# Global cache service instance
cache_service = AdvancedCacheService()


# Cache warming functions
async def warm_appointment_cache(db: Session, days: int = 7):
    """Warm cache with recent appointments"""
    from models import Appointment
    from datetime import datetime, timedelta

    end_date = datetime.now().date()
    start_date = end_date - timedelta(days=days)

    appointments = (
        db.query(Appointment)
        .filter(
            Appointment.appointment_date >= start_date,
            Appointment.appointment_date <= end_date,
        )
        .all()
    )

    for appointment in appointments:
        await cache_service.set(
            f"appointment:{appointment.id}",
            appointment,
            CacheConfig.DEFAULT_TTL,
            CacheConfig.APPOINTMENT_PREFIX,
        )

    logger.info(f"Warmed cache with {len(appointments)} recent appointments")


async def warm_analytics_cache(db: Session):
    """Warm cache with common analytics queries"""
    # This would contain complex analytics queries that are frequently accessed
    pass


# Export main components
__all__ = [
    "AdvancedCacheService",
    "CacheConfig",
    "CacheStats",
    "cache_service",
    "cached",
    "warm_appointment_cache",
    "warm_analytics_cache",
]
