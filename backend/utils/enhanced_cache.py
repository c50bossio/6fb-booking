"""
Enhanced caching utilities with Redis integration, cache invalidation, and performance monitoring
Provides comprehensive cache management with automatic fallback to in-memory cache
"""

import json
import hashlib
import time
import logging
from typing import Optional, Any, Callable, Dict, List, Set
from datetime import datetime, timedelta
from functools import wraps
from contextlib import contextmanager

from config.settings import settings
from services.redis_service import get_redis, is_redis_available, RedisConnectionError

logger = logging.getLogger(__name__)

# Initialize Redis service
redis_service = get_redis()
REDIS_AVAILABLE = is_redis_available()

if not REDIS_AVAILABLE:
    logger.warning("Redis not available, using in-memory cache")

# In-memory cache fallback with statistics
_memory_cache = {}
_cache_expiry = {}
_cache_stats = {
    "hits": 0,
    "misses": 0,
    "sets": 0,
    "deletes": 0,
    "redis_fallbacks": 0,
    "invalidations": 0,
}

# Cache invalidation patterns for smart cache clearing
INVALIDATION_PATTERNS = {
    "user": ["user:{user_id}", "user:{user_id}:*"],
    "barber": ["barber:{barber_id}", "barber:{barber_id}:*", "availability:*"],
    "appointment": ["appointments:*", "analytics:*", "dashboard:*"],
    "location": ["location:{location_id}", "location:{location_id}:*"],
    "analytics": ["analytics:*", "dashboard:*"],
    "payment": ["payment:*", "payout:*"],
    "dashboard": ["dashboard:*", "analytics:*"],
}

# Cache warming configuration
CACHE_WARMING_JOBS = []
_cache_warming_active = False


class CacheWarmer:
    """Cache warming utility for preloading frequently accessed data"""

    def __init__(self):
        self.jobs = []
        self.is_active = False

    def register_job(self, key_pattern: str, data_func: Callable, ttl: int = 3600):
        """Register a cache warming job"""
        self.jobs.append(
            {
                "key_pattern": key_pattern,
                "data_func": data_func,
                "ttl": ttl,
                "last_run": None,
            }
        )

    async def warm_cache(self):
        """Execute all cache warming jobs"""
        if self.is_active:
            logger.debug("Cache warming already in progress")
            return

        self.is_active = True
        warmed_count = 0

        try:
            for job in self.jobs:
                try:
                    # Check if job needs to run
                    if (
                        job["last_run"]
                        and (datetime.now() - job["last_run"]).seconds < job["ttl"] / 2
                    ):
                        continue

                    # Execute data function
                    data = (
                        await job["data_func"]()
                        if hasattr(job["data_func"], "__call__")
                        else job["data_func"]()
                    )

                    # Generate cache key
                    cache_key = job["key_pattern"]
                    if callable(job["key_pattern"]):
                        cache_key = job["key_pattern"]()

                    # Store in cache
                    set_in_cache(cache_key, data, job["ttl"])
                    job["last_run"] = datetime.now()
                    warmed_count += 1

                    logger.debug(f"Cache warmed: {cache_key}")

                except Exception as e:
                    logger.error(f"Cache warming failed for {job['key_pattern']}: {e}")

            logger.info(f"Cache warming completed: {warmed_count} items warmed")

        finally:
            self.is_active = False


# Global cache warmer instance
cache_warmer = CacheWarmer()


def generate_cache_key(*args, **kwargs) -> str:
    """Generate a cache key from function arguments"""
    key_data = {"args": args, "kwargs": kwargs}
    key_str = json.dumps(key_data, sort_keys=True, default=str)
    return hashlib.md5(key_str.encode()).hexdigest()


def get_from_cache(key: str) -> Optional[Any]:
    """Get value from cache with statistics tracking and Redis fallback"""
    try:
        # Try Redis first if available
        if REDIS_AVAILABLE:
            value = redis_service.get(key)
            if value is not None:
                _cache_stats["hits"] += 1
                logger.debug(f"Cache HIT (Redis): {key}")
                return value
            else:
                _cache_stats["misses"] += 1
                logger.debug(f"Cache MISS (Redis): {key}")
                return None
    except RedisConnectionError:
        _cache_stats["redis_fallbacks"] += 1
        logger.debug(f"Redis fallback for GET: {key}")

    # Fallback to in-memory cache
    if key in _memory_cache:
        # Check if expired
        if key in _cache_expiry and datetime.now() > _cache_expiry[key]:
            del _memory_cache[key]
            del _cache_expiry[key]
            _cache_stats["misses"] += 1
            logger.debug(f"Cache EXPIRED (Memory): {key}")
            return None
        _cache_stats["hits"] += 1
        logger.debug(f"Cache HIT (Memory): {key}")
        return _memory_cache[key]
    else:
        _cache_stats["misses"] += 1
        logger.debug(f"Cache MISS (Memory): {key}")
    return None


def set_in_cache(key: str, value: Any, ttl_seconds: int = 300):
    """Set value in cache with TTL and statistics tracking"""
    _cache_stats["sets"] += 1

    try:
        # Try Redis first if available
        if REDIS_AVAILABLE:
            success = redis_service.set(key, value, ttl_seconds)
            if success:
                logger.debug(f"Cache SET (Redis): {key} (TTL: {ttl_seconds}s)")
                return
    except RedisConnectionError:
        _cache_stats["redis_fallbacks"] += 1
        logger.debug(f"Redis fallback for SET: {key}")

    # Fallback to in-memory cache
    _memory_cache[key] = value
    _cache_expiry[key] = datetime.now() + timedelta(seconds=ttl_seconds)
    logger.debug(f"Cache SET (Memory): {key} (TTL: {ttl_seconds}s)")


def delete_from_cache(key: str):
    """Delete value from cache"""
    _cache_stats["deletes"] += 1

    try:
        # Try Redis first if available
        if REDIS_AVAILABLE:
            redis_service.delete(key)
            logger.debug(f"Cache DELETE (Redis): {key}")
    except RedisConnectionError:
        _cache_stats["redis_fallbacks"] += 1
        logger.debug(f"Redis fallback for DELETE: {key}")

    # Also delete from in-memory cache
    if key in _memory_cache:
        del _memory_cache[key]
    if key in _cache_expiry:
        del _cache_expiry[key]
    logger.debug(f"Cache DELETE (Memory): {key}")


def invalidate_pattern(pattern: str) -> int:
    """Invalidate cache keys matching pattern"""
    deleted_count = 0
    _cache_stats["invalidations"] += 1

    try:
        # Try Redis first if available
        if REDIS_AVAILABLE:
            deleted_count = redis_service.delete_pattern(pattern)
            logger.debug(
                f"Cache INVALIDATE (Redis): {pattern} - {deleted_count} keys deleted"
            )
    except RedisConnectionError:
        _cache_stats["redis_fallbacks"] += 1
        logger.debug(f"Redis fallback for INVALIDATE: {pattern}")

    # Also invalidate from in-memory cache
    keys_to_delete = [k for k in _memory_cache.keys() if pattern.replace("*", "") in k]
    for key in keys_to_delete:
        del _memory_cache[key]
        if key in _cache_expiry:
            del _cache_expiry[key]

    if keys_to_delete:
        logger.debug(
            f"Cache INVALIDATE (Memory): {pattern} - {len(keys_to_delete)} keys deleted"
        )

    return deleted_count + len(keys_to_delete)


def invalidate_by_entity(entity_type: str, entity_id: Optional[str] = None) -> int:
    """Smart cache invalidation by entity type"""
    if entity_type not in INVALIDATION_PATTERNS:
        logger.warning(f"Unknown entity type for cache invalidation: {entity_type}")
        return 0

    total_deleted = 0
    patterns = INVALIDATION_PATTERNS[entity_type]

    for pattern in patterns:
        # Replace placeholders with actual entity ID
        if entity_id and "{" in pattern:
            pattern = pattern.format(**{f"{entity_type}_id": entity_id})

        deleted = invalidate_pattern(pattern)
        total_deleted += deleted
        logger.info(f"Invalidated {deleted} cache entries for pattern: {pattern}")

    return total_deleted


def cache_result(
    ttl_seconds: int = 300, key_prefix: str = "", invalidate_on: List[str] = None
):
    """
    Enhanced decorator to cache function results with smart invalidation

    Args:
        ttl_seconds: Cache TTL in seconds
        key_prefix: Prefix for cache key
        invalidate_on: List of entity types that should invalidate this cache
    """

    def decorator(func: Callable):
        # Store invalidation info for the function
        if invalidate_on:
            cache_key_base = f"{key_prefix}:{func.__name__}"
            for entity_type in invalidate_on:
                if entity_type not in INVALIDATION_PATTERNS:
                    INVALIDATION_PATTERNS[entity_type] = []
                INVALIDATION_PATTERNS[entity_type].append(f"{cache_key_base}:*")

        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            # Generate cache key
            cache_key = (
                f"{key_prefix}:{func.__name__}:{generate_cache_key(*args, **kwargs)}"
            )

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
            cache_key = (
                f"{key_prefix}:{func.__name__}:{generate_cache_key(*args, **kwargs)}"
            )

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


def cache_multi_get(keys: List[str]) -> Dict[str, Any]:
    """Get multiple cache keys efficiently"""
    results = {}

    try:
        if REDIS_AVAILABLE:
            # Use Redis pipeline for efficient multi-get
            with redis_service.pipeline() as pipe:
                for key in keys:
                    pipe.get(key)
                redis_results = pipe.execute()

                for i, key in enumerate(keys):
                    if redis_results[i] is not None:
                        results[key] = json.loads(redis_results[i])
                        _cache_stats["hits"] += 1
                    else:
                        _cache_stats["misses"] += 1

                return results

    except RedisConnectionError:
        _cache_stats["redis_fallbacks"] += 1
        logger.debug("Redis fallback for multi-get")

    # Fallback to in-memory cache
    for key in keys:
        value = get_from_cache(key)
        if value is not None:
            results[key] = value

    return results


def cache_multi_set(items: Dict[str, Any], ttl_seconds: int = 300):
    """Set multiple cache keys efficiently"""
    try:
        if REDIS_AVAILABLE:
            # Use Redis pipeline for efficient multi-set
            with redis_service.pipeline() as pipe:
                for key, value in items.items():
                    pipe.setex(key, ttl_seconds, json.dumps(value, default=str))
                pipe.execute()

                _cache_stats["sets"] += len(items)
                logger.debug(f"Cache MULTI-SET (Redis): {len(items)} keys")
                return

    except RedisConnectionError:
        _cache_stats["redis_fallbacks"] += 1
        logger.debug("Redis fallback for multi-set")

    # Fallback to in-memory cache
    for key, value in items.items():
        set_in_cache(key, value, ttl_seconds)


# Cache key generators for common patterns
class CacheKeys:
    """Standardized cache key generators"""

    @staticmethod
    def analytics(
        metric_type: str,
        start_date: str,
        end_date: str,
        location_id: Optional[int] = None,
        barber_id: Optional[int] = None,
    ) -> str:
        return f"analytics:{metric_type}:{start_date}:{end_date}:{location_id or 'all'}:{barber_id or 'all'}"

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
    def barber_availability(barber_id: int, date: str) -> str:
        return f"availability:barber:{barber_id}:{date}"

    @staticmethod
    def barber_schedule(barber_id: int, week_start: str) -> str:
        return f"schedule:barber:{barber_id}:{week_start}"

    @staticmethod
    def appointments(
        date: str, location_id: Optional[int] = None, barber_id: Optional[int] = None
    ) -> str:
        return f"appointments:{date}:{location_id or 'all'}:{barber_id or 'all'}"

    @staticmethod
    def dashboard_metrics(date: str, user_id: Optional[int] = None) -> str:
        return f"dashboard:metrics:{date}:{user_id or 'all'}"

    @staticmethod
    def payment_method(user_id: int) -> str:
        return f"payment:method:{user_id}"


# Cache monitoring and health checks
def get_cache_stats() -> Dict[str, Any]:
    """Get comprehensive cache performance statistics"""
    total_requests = _cache_stats["hits"] + _cache_stats["misses"]
    hit_rate = (
        (_cache_stats["hits"] / total_requests * 100) if total_requests > 0 else 0
    )

    stats = {
        "hit_rate": round(hit_rate, 2),
        "total_requests": total_requests,
        "memory_cache_size": len(_memory_cache),
        "redis_available": REDIS_AVAILABLE,
        **_cache_stats,
    }

    # Add Redis statistics if available
    if REDIS_AVAILABLE:
        try:
            redis_stats = redis_service.get_stats()
            stats.update({"redis": redis_stats})
        except Exception as e:
            logger.warning(f"Failed to get Redis stats: {e}")

    return stats


def get_cache_health() -> Dict[str, Any]:
    """Get cache health status for monitoring"""
    health = {
        "status": "healthy",
        "redis_available": REDIS_AVAILABLE,
        "memory_cache_size": len(_memory_cache),
        "issues": [],
    }

    # Check hit rate
    stats = get_cache_stats()
    if stats["hit_rate"] < 50 and stats["total_requests"] > 100:
        health["issues"].append("Low cache hit rate")
        health["status"] = "degraded"

    # Check Redis health
    if REDIS_AVAILABLE:
        try:
            redis_health = redis_service.get_stats()
            if not redis_health.get("is_healthy", False):
                health["issues"].append("Redis connection issues")
                health["status"] = "degraded"
        except Exception:
            health["issues"].append("Redis health check failed")
            health["status"] = "degraded"

    # Check memory cache size
    if len(_memory_cache) > 10000:
        health["issues"].append("Memory cache size too large")
        health["status"] = "degraded"

    return health


def clear_all_cache():
    """Clear all cache entries"""
    global _memory_cache, _cache_expiry

    try:
        if REDIS_AVAILABLE:
            redis_service.flush_db()
    except RedisConnectionError:
        logger.warning("Failed to clear Redis cache")

    _memory_cache.clear()
    _cache_expiry.clear()
    logger.info("All cache entries cleared")


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


@contextmanager
def cache_batch():
    """Context manager for batch cache operations"""
    batch_operations = []

    def batch_set(key: str, value: Any, ttl: int = 300):
        batch_operations.append(("set", key, value, ttl))

    def batch_delete(key: str):
        batch_operations.append(("delete", key))

    # Temporarily replace cache functions
    original_set = globals()["set_in_cache"]
    original_delete = globals()["delete_from_cache"]

    globals()["set_in_cache"] = batch_set
    globals()["delete_from_cache"] = batch_delete

    try:
        yield

        # Execute batch operations
        if batch_operations:
            set_operations = {op[1]: op[2] for op in batch_operations if op[0] == "set"}
            delete_operations = [op[1] for op in batch_operations if op[0] == "delete"]

            if set_operations:
                ttl = batch_operations[0][3] if batch_operations[0][0] == "set" else 300
                cache_multi_set(set_operations, ttl)

            for key in delete_operations:
                delete_from_cache(key)

            logger.info(
                f"Executed batch cache operations: {len(set_operations)} sets, {len(delete_operations)} deletes"
            )

    finally:
        # Restore original functions
        globals()["set_in_cache"] = original_set
        globals()["delete_from_cache"] = original_delete


# Performance monitoring decorator
def monitor_cache_performance(func):
    """Decorator to monitor cache function performance"""

    @wraps(func)
    def wrapper(*args, **kwargs):
        start_time = time.time()

        try:
            result = func(*args, **kwargs)
            execution_time = time.time() - start_time

            if execution_time > 0.1:  # Log slow cache operations (>100ms)
                logger.warning(
                    f"Slow cache operation: {func.__name__} took {execution_time:.3f}s"
                )

            return result

        except Exception as e:
            execution_time = time.time() - start_time
            logger.error(
                f"Cache operation failed: {func.__name__} after {execution_time:.3f}s - {e}"
            )
            raise

    return wrapper


# Initialize cache warming for common data
def setup_cache_warming():
    """Setup cache warming for frequently accessed data"""

    def warm_dashboard_data():
        """Warm dashboard cache data"""
        from datetime import date

        today = date.today()

        # This would be implemented to fetch and cache dashboard data
        return {"date": today.isoformat(), "appointments_today": 0, "revenue_today": 0}

    def warm_barber_availability():
        """Warm barber availability cache"""
        # This would be implemented to fetch and cache barber availability
        return {}

    # Register cache warming jobs
    cache_warmer.register_job(
        key_pattern=lambda: CacheKeys.dashboard_metrics(
            datetime.now().date().isoformat()
        ),
        data_func=warm_dashboard_data,
        ttl=1800,  # 30 minutes
    )

    cache_warmer.register_job(
        key_pattern="availability:*",
        data_func=warm_barber_availability,
        ttl=3600,  # 1 hour
    )


# Initialize cache warming on import
setup_cache_warming()
