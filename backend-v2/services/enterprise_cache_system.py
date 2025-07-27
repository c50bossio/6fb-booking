"""
Enterprise-Grade Multi-Level Caching System
Provides L1 (memory) + L2 (Redis) + L3 (Database) caching with intelligent cache management.
"""

import asyncio
import json
import hashlib
import logging
import time
from typing import Any, Dict, List, Optional, Union, Callable, TypeVar, Generic
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from enum import Enum
from collections import OrderedDict
import threading
from functools import wraps
import aioredis
import pickle
import zlib
from sqlalchemy import text
from sqlalchemy.orm import Session

from db import get_db
from services.redis_cache import cache_service

logger = logging.getLogger(__name__)

T = TypeVar('T')

class CacheLevel(Enum):
    L1_MEMORY = "L1_memory"
    L2_REDIS = "L2_redis"
    L3_DATABASE = "L3_database"
    MISS = "miss"

class CacheStrategy(Enum):
    WRITE_THROUGH = "write_through"      # Write to all levels simultaneously
    WRITE_BEHIND = "write_behind"        # Write to L1, async write to L2/L3
    WRITE_AROUND = "write_around"        # Write only to L2/L3, skip L1
    READ_THROUGH = "read_through"        # Read through all levels on miss

@dataclass
class CacheMetrics:
    """Cache performance metrics"""
    l1_hits: int = 0
    l1_misses: int = 0
    l2_hits: int = 0
    l2_misses: int = 0
    l3_hits: int = 0
    l3_misses: int = 0
    evictions: int = 0
    total_requests: int = 0
    avg_response_time_ms: float = 0.0
    cache_efficiency: float = 0.0
    memory_usage_mb: float = 0.0

@dataclass
class CacheEntry:
    """Individual cache entry with metadata"""
    key: str
    value: Any
    created_at: datetime
    accessed_at: datetime
    access_count: int
    ttl_seconds: int
    size_bytes: int
    level: CacheLevel
    tags: List[str] = None
    
    def is_expired(self) -> bool:
        if self.ttl_seconds <= 0:
            return False
        return (datetime.now() - self.created_at).total_seconds() > self.ttl_seconds
    
    def touch(self):
        """Update access time and count"""
        self.accessed_at = datetime.now()
        self.access_count += 1

class LRUCache(Generic[T]):
    """Thread-safe LRU cache implementation"""
    
    def __init__(self, max_size: int = 1000, max_memory_mb: int = 100):
        self.max_size = max_size
        self.max_memory_bytes = max_memory_mb * 1024 * 1024
        self.cache: OrderedDict[str, CacheEntry] = OrderedDict()
        self.current_memory_bytes = 0
        self.lock = threading.RLock()
        self.metrics = CacheMetrics()
    
    def get(self, key: str) -> Optional[T]:
        with self.lock:
            if key in self.cache:
                entry = self.cache[key]
                
                # Check expiration
                if entry.is_expired():
                    self._remove_entry(key)
                    self.metrics.l1_misses += 1
                    return None
                
                # Move to end (most recently used)
                self.cache.move_to_end(key)
                entry.touch()
                self.metrics.l1_hits += 1
                return entry.value
            
            self.metrics.l1_misses += 1
            return None
    
    def set(self, key: str, value: T, ttl_seconds: int = 0, tags: List[str] = None) -> bool:
        with self.lock:
            # Calculate size
            try:
                size_bytes = len(pickle.dumps(value))
            except Exception:
                size_bytes = len(str(value).encode('utf-8'))
            
            # Check if single item exceeds memory limit
            if size_bytes > self.max_memory_bytes:
                logger.warning(f"Cache item too large: {size_bytes} bytes > {self.max_memory_bytes} bytes")
                return False
            
            # Create entry
            entry = CacheEntry(
                key=key,
                value=value,
                created_at=datetime.now(),
                accessed_at=datetime.now(),
                access_count=1,
                ttl_seconds=ttl_seconds,
                size_bytes=size_bytes,
                level=CacheLevel.L1_MEMORY,
                tags=tags or []
            )
            
            # Remove existing entry if present
            if key in self.cache:
                self._remove_entry(key)
            
            # Ensure we have space
            while (len(self.cache) >= self.max_size or 
                   self.current_memory_bytes + size_bytes > self.max_memory_bytes):
                if not self._evict_lru():
                    logger.warning("Unable to evict LRU item")
                    return False
            
            # Add new entry
            self.cache[key] = entry
            self.current_memory_bytes += size_bytes
            return True
    
    def remove(self, key: str) -> bool:
        with self.lock:
            if key in self.cache:
                self._remove_entry(key)
                return True
            return False
    
    def clear(self):
        with self.lock:
            self.cache.clear()
            self.current_memory_bytes = 0
    
    def clear_by_tags(self, tags: List[str]):
        """Clear all entries matching any of the provided tags"""
        with self.lock:
            keys_to_remove = []
            for key, entry in self.cache.items():
                if entry.tags and any(tag in entry.tags for tag in tags):
                    keys_to_remove.append(key)
            
            for key in keys_to_remove:
                self._remove_entry(key)
    
    def _remove_entry(self, key: str):
        """Remove entry and update memory usage"""
        if key in self.cache:
            entry = self.cache.pop(key)
            self.current_memory_bytes -= entry.size_bytes
    
    def _evict_lru(self) -> bool:
        """Evict least recently used item"""
        if not self.cache:
            return False
        
        # Get LRU item (first item)
        lru_key = next(iter(self.cache))
        self._remove_entry(lru_key)
        self.metrics.evictions += 1
        return True
    
    def get_stats(self) -> Dict[str, Any]:
        with self.lock:
            total_requests = self.metrics.l1_hits + self.metrics.l1_misses
            hit_rate = (self.metrics.l1_hits / total_requests * 100) if total_requests > 0 else 0
            
            return {
                "size": len(self.cache),
                "max_size": self.max_size,
                "memory_usage_mb": self.current_memory_bytes / 1024 / 1024,
                "max_memory_mb": self.max_memory_bytes / 1024 / 1024,
                "hit_rate": hit_rate,
                "hits": self.metrics.l1_hits,
                "misses": self.metrics.l1_misses,
                "evictions": self.metrics.evictions
            }

class EnterpriseCacheSystem:
    """Enterprise-grade multi-level caching system"""
    
    def __init__(
        self,
        l1_max_size: int = 10000,
        l1_max_memory_mb: int = 500,
        l2_enabled: bool = True,
        compression_enabled: bool = True,
        compression_threshold: int = 1024
    ):
        # L1 Cache (Memory)
        self.l1_cache = LRUCache(max_size=l1_max_size, max_memory_mb=l1_max_memory_mb)
        
        # L2 Cache (Redis)
        self.l2_enabled = l2_enabled
        self.redis_client = cache_service
        
        # Configuration
        self.compression_enabled = compression_enabled
        self.compression_threshold = compression_threshold
        
        # Metrics
        self.global_metrics = CacheMetrics()
        self.start_time = datetime.now()
        
        # Cache invalidation patterns
        self.invalidation_patterns = {
            "users": ["user:*", "session:*"],
            "appointments": ["appointments:*", "slots:*", "calendar:*"],
            "payments": ["payments:*", "revenue:*"],
            "analytics": ["analytics:*", "dashboard:*"]
        }
        
        # Background tasks
        self._cleanup_task = None
        self._start_background_tasks()
    
    async def get(
        self, 
        key: str, 
        fallback_func: Optional[Callable] = None,
        ttl_seconds: int = 300,
        tags: List[str] = None,
        strategy: CacheStrategy = CacheStrategy.READ_THROUGH
    ) -> Optional[Any]:
        """
        Get value from multi-level cache with fallback
        """
        start_time = time.time()
        self.global_metrics.total_requests += 1
        
        try:
            # L1 Cache (Memory)
            value = self.l1_cache.get(key)
            if value is not None:
                logger.debug(f"Cache L1 HIT: {key}")
                self._update_response_time(start_time)
                return value
            
            # L2 Cache (Redis)
            if self.l2_enabled:
                try:
                    redis_value = await self.redis_client.get(key)
                    if redis_value is not None:
                        # Decompress if needed
                        if self.compression_enabled:
                            redis_value = self._decompress(redis_value)
                        
                        # Populate L1 cache
                        self.l1_cache.set(key, redis_value, ttl_seconds, tags)
                        
                        self.global_metrics.l2_hits += 1
                        logger.debug(f"Cache L2 HIT: {key}")
                        self._update_response_time(start_time)
                        return redis_value
                    else:
                        self.global_metrics.l2_misses += 1
                        
                except Exception as e:
                    logger.warning(f"L2 cache error for key {key}: {e}")
                    self.global_metrics.l2_misses += 1
            
            # L3 Cache / Fallback function
            if fallback_func:
                try:
                    value = await fallback_func() if asyncio.iscoroutinefunction(fallback_func) else fallback_func()
                    
                    if value is not None:
                        # Store in cache layers
                        await self.set(key, value, ttl_seconds, tags, strategy)
                        self.global_metrics.l3_hits += 1
                        logger.debug(f"Cache L3 HIT (fallback): {key}")
                        self._update_response_time(start_time)
                        return value
                        
                except Exception as e:
                    logger.error(f"Fallback function error for key {key}: {e}")
                    self.global_metrics.l3_misses += 1
            
            # Complete miss
            self._update_response_time(start_time)
            return None
            
        except Exception as e:
            logger.error(f"Cache get error for key {key}: {e}")
            self._update_response_time(start_time)
            return None
    
    async def set(
        self,
        key: str,
        value: Any,
        ttl_seconds: int = 300,
        tags: List[str] = None,
        strategy: CacheStrategy = CacheStrategy.WRITE_THROUGH
    ) -> bool:
        """
        Set value in multi-level cache
        """
        try:
            success = True
            
            if strategy == CacheStrategy.WRITE_THROUGH:
                # Write to all levels simultaneously
                l1_success = self.l1_cache.set(key, value, ttl_seconds, tags)
                l2_success = await self._set_l2(key, value, ttl_seconds) if self.l2_enabled else True
                success = l1_success and l2_success
                
            elif strategy == CacheStrategy.WRITE_BEHIND:
                # Write to L1 immediately, L2 asynchronously
                success = self.l1_cache.set(key, value, ttl_seconds, tags)
                if self.l2_enabled:
                    asyncio.create_task(self._set_l2(key, value, ttl_seconds))
                    
            elif strategy == CacheStrategy.WRITE_AROUND:
                # Skip L1, write only to L2
                if self.l2_enabled:
                    success = await self._set_l2(key, value, ttl_seconds)
                    
            return success
            
        except Exception as e:
            logger.error(f"Cache set error for key {key}: {e}")
            return False
    
    async def delete(self, key: str) -> bool:
        """Delete key from all cache levels"""
        try:
            l1_removed = self.l1_cache.remove(key)
            l2_removed = False
            
            if self.l2_enabled:
                try:
                    l2_removed = await self.redis_client.delete(key) > 0
                except Exception as e:
                    logger.warning(f"L2 cache delete error for key {key}: {e}")
            
            return l1_removed or l2_removed
            
        except Exception as e:
            logger.error(f"Cache delete error for key {key}: {e}")
            return False
    
    async def invalidate_pattern(self, pattern: str):
        """Invalidate cache entries matching pattern"""
        try:
            # Invalidate L1 by tags if pattern matches
            if pattern in self.invalidation_patterns:
                tags = self.invalidation_patterns[pattern]
                self.l1_cache.clear_by_tags(tags)
            
            # Invalidate L2 by pattern
            if self.l2_enabled:
                await self.redis_client.clear_pattern(pattern)
                
        except Exception as e:
            logger.error(f"Cache invalidation error for pattern {pattern}: {e}")
    
    async def invalidate_tags(self, tags: List[str]):
        """Invalidate cache entries by tags"""
        try:
            # L1 invalidation
            self.l1_cache.clear_by_tags(tags)
            
            # L2 invalidation (would need tag support in Redis)
            # For now, we use pattern matching
            if self.l2_enabled:
                for tag in tags:
                    await self.redis_client.clear_pattern(f"*{tag}*")
                    
        except Exception as e:
            logger.error(f"Cache tag invalidation error for tags {tags}: {e}")
    
    async def warm_cache(self, warm_functions: Dict[str, Callable]):
        """Warm cache with commonly accessed data"""
        logger.info("Starting cache warming...")
        
        for key, func in warm_functions.items():
            try:
                if asyncio.iscoroutinefunction(func):
                    value = await func()
                else:
                    value = func()
                
                if value is not None:
                    await self.set(key, value, ttl_seconds=3600)  # 1 hour TTL for warmed data
                    logger.debug(f"Warmed cache key: {key}")
                    
            except Exception as e:
                logger.warning(f"Cache warming failed for key {key}: {e}")
        
        logger.info("Cache warming completed")
    
    async def _set_l2(self, key: str, value: Any, ttl_seconds: int) -> bool:
        """Set value in L2 (Redis) cache"""
        try:
            # Compress if enabled and value is large enough
            if self.compression_enabled:
                serialized = pickle.dumps(value)
                if len(serialized) > self.compression_threshold:
                    value = self._compress(serialized)
                else:
                    value = serialized
            else:
                value = pickle.dumps(value)
            
            await self.redis_client.set(key, value, ttl_seconds)
            return True
            
        except Exception as e:
            logger.warning(f"L2 cache set error for key {key}: {e}")
            return False
    
    def _compress(self, data: bytes) -> bytes:
        """Compress data using zlib"""
        try:
            return zlib.compress(data)
        except Exception:
            return data
    
    def _decompress(self, data: bytes) -> Any:
        """Decompress and deserialize data"""
        try:
            # Try decompression first
            try:
                decompressed = zlib.decompress(data)
                return pickle.loads(decompressed)
            except zlib.error:
                # Not compressed, try direct deserialization
                return pickle.loads(data)
        except Exception as e:
            logger.warning(f"Cache decompression error: {e}")
            return None
    
    def _update_response_time(self, start_time: float):
        """Update average response time metric"""
        response_time_ms = (time.time() - start_time) * 1000
        
        # Update running average
        total_requests = self.global_metrics.total_requests
        current_avg = self.global_metrics.avg_response_time_ms
        self.global_metrics.avg_response_time_ms = (
            (current_avg * (total_requests - 1) + response_time_ms) / total_requests
        )
    
    def _start_background_tasks(self):
        """Start background maintenance tasks"""
        async def cleanup_task():
            while True:
                try:
                    await asyncio.sleep(300)  # Run every 5 minutes
                    await self._cleanup_expired_entries()
                except Exception as e:
                    logger.error(f"Cache cleanup task error: {e}")
        
        self._cleanup_task = asyncio.create_task(cleanup_task())
    
    async def _cleanup_expired_entries(self):
        """Clean up expired entries from L1 cache"""
        try:
            expired_keys = []
            
            with self.l1_cache.lock:
                for key, entry in self.l1_cache.cache.items():
                    if entry.is_expired():
                        expired_keys.append(key)
            
            for key in expired_keys:
                self.l1_cache.remove(key)
            
            if expired_keys:
                logger.debug(f"Cleaned up {len(expired_keys)} expired cache entries")
                
        except Exception as e:
            logger.error(f"Cache cleanup error: {e}")
    
    def get_comprehensive_stats(self) -> Dict[str, Any]:
        """Get comprehensive cache statistics"""
        l1_stats = self.l1_cache.get_stats()
        
        total_hits = self.global_metrics.l1_hits + self.global_metrics.l2_hits + self.global_metrics.l3_hits
        total_requests = self.global_metrics.total_requests
        overall_hit_rate = (total_hits / total_requests * 100) if total_requests > 0 else 0
        
        uptime_hours = (datetime.now() - self.start_time).total_seconds() / 3600
        
        return {
            "timestamp": datetime.now().isoformat(),
            "uptime_hours": uptime_hours,
            "overall_stats": {
                "total_requests": total_requests,
                "hit_rate": overall_hit_rate,
                "avg_response_time_ms": self.global_metrics.avg_response_time_ms,
                "cache_efficiency": overall_hit_rate  # Simplified efficiency metric
            },
            "l1_cache": l1_stats,
            "l2_cache": {
                "enabled": self.l2_enabled,
                "hits": self.global_metrics.l2_hits,
                "misses": self.global_metrics.l2_misses
            },
            "level_distribution": {
                "l1_hits": self.global_metrics.l1_hits,
                "l2_hits": self.global_metrics.l2_hits,
                "l3_hits": self.global_metrics.l3_hits,
                "misses": total_requests - total_hits
            },
            "compression": {
                "enabled": self.compression_enabled,
                "threshold_bytes": self.compression_threshold
            }
        }

# Global enterprise cache instance
enterprise_cache = EnterpriseCacheSystem()

# Decorators for easy caching

def cache_result(
    key_pattern: str = None,
    ttl_seconds: int = 300,
    tags: List[str] = None,
    strategy: CacheStrategy = CacheStrategy.READ_THROUGH
):
    """
    Decorator to cache function results
    
    Usage:
    @cache_result(key_pattern="user:{user_id}", ttl_seconds=600)
    async def get_user(user_id: int):
        return await db.get_user(user_id)
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Generate cache key
            if key_pattern:
                # Replace placeholders in key pattern
                cache_key = key_pattern
                
                # Replace positional args
                for i, arg in enumerate(args):
                    cache_key = cache_key.replace(f"{{{i}}}", str(arg))
                
                # Replace keyword args
                for key, value in kwargs.items():
                    cache_key = cache_key.replace(f"{{{key}}}", str(value))
                    
            else:
                # Default key generation
                args_str = "_".join(str(arg) for arg in args)
                kwargs_str = "_".join(f"{k}={v}" for k, v in sorted(kwargs.items()))
                cache_key = f"{func.__name__}:{hashlib.md5(f'{args_str}_{kwargs_str}'.encode()).hexdigest()[:12]}"
            
            # Try to get from cache
            cached_result = await enterprise_cache.get(
                cache_key,
                fallback_func=lambda: func(*args, **kwargs),
                ttl_seconds=ttl_seconds,
                tags=tags,
                strategy=strategy
            )
            
            return cached_result
        
        return wrapper
    return decorator

def invalidate_cache_on_change(patterns: List[str]):
    """
    Decorator to invalidate cache when function is called
    
    Usage:
    @invalidate_cache_on_change(["user:*", "session:*"])
    async def update_user(user_id: int, data: dict):
        return await db.update_user(user_id, data)
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            result = await func(*args, **kwargs) if asyncio.iscoroutinefunction(func) else func(*args, **kwargs)
            
            # Invalidate cache patterns
            for pattern in patterns:
                await enterprise_cache.invalidate_pattern(pattern)
            
            return result
        
        return wrapper
    return decorator

# Export main components
__all__ = [
    "EnterpriseCacheSystem",
    "CacheLevel", 
    "CacheStrategy",
    "cache_result",
    "invalidate_cache_on_change",
    "enterprise_cache"
]