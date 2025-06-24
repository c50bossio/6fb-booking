"""
Enhanced Cache Service with Multi-Level Caching and Intelligent Management
Provides comprehensive caching capabilities with L1 (memory) and L2 (Redis) cache layers,
intelligent cache warming, compression, and advanced invalidation strategies.
"""

import json
import pickle
import gzip
import hashlib
import time
import asyncio
import threading
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Union, Callable, Set, Tuple
from dataclasses import dataclass, field
from enum import Enum
import logging
from functools import wraps, lru_cache
from collections import defaultdict, OrderedDict
import weakref
import sys

from config.cache_config import (
    get_cache_connection_manager, 
    get_cache_config, 
    cache_key_manager,
    CacheConfig
)

logger = logging.getLogger(__name__)


class CacheLevel(Enum):
    """Cache levels for multi-level caching"""
    L1_MEMORY = "l1_memory"
    L2_REDIS = "l2_redis"
    BOTH = "both"


class SerializationFormat(Enum):
    """Serialization formats for cache data"""
    JSON = "json"
    PICKLE = "pickle"
    RAW = "raw"


@dataclass
class CacheEntry:
    """Cache entry with metadata"""
    key: str
    value: Any
    ttl: int
    created_at: float
    accessed_at: float
    access_count: int = 0
    tags: Set[str] = field(default_factory=set)
    dependencies: Set[str] = field(default_factory=set)
    serialization_format: SerializationFormat = SerializationFormat.JSON
    compressed: bool = False
    original_size: int = 0
    compressed_size: int = 0
    
    def is_expired(self) -> bool:
        """Check if cache entry is expired"""
        if self.ttl <= 0:  # No expiration
            return False
        return time.time() > (self.created_at + self.ttl)
    
    def touch(self):
        """Update access time and count"""
        self.accessed_at = time.time()
        self.access_count += 1


class CacheStats:
    """Cache statistics and performance metrics"""
    
    def __init__(self):
        self.l1_hits = 0
        self.l1_misses = 0
        self.l2_hits = 0
        self.l2_misses = 0
        self.sets = 0
        self.deletes = 0
        self.evictions = 0
        self.errors = 0
        self.slow_operations = 0
        self.compression_saves = 0
        self.total_compressed_size = 0
        self.total_uncompressed_size = 0
        self._lock = threading.Lock()
    
    def record_l1_hit(self):
        with self._lock:
            self.l1_hits += 1
    
    def record_l1_miss(self):
        with self._lock:
            self.l1_misses += 1
    
    def record_l2_hit(self):
        with self._lock:
            self.l2_hits += 1
    
    def record_l2_miss(self):
        with self._lock:
            self.l2_misses += 1
    
    def record_set(self):
        with self._lock:
            self.sets += 1
    
    def record_delete(self):
        with self._lock:
            self.deletes += 1
    
    def record_eviction(self):
        with self._lock:
            self.evictions += 1
    
    def record_error(self):
        with self._lock:
            self.errors += 1
    
    def record_slow_operation(self):
        with self._lock:
            self.slow_operations += 1
    
    def record_compression(self, original_size: int, compressed_size: int):
        with self._lock:
            self.compression_saves += 1
            self.total_uncompressed_size += original_size
            self.total_compressed_size += compressed_size
    
    def get_stats(self) -> Dict[str, Any]:
        """Get current statistics"""
        with self._lock:
            total_hits = self.l1_hits + self.l2_hits
            total_requests = total_hits + self.l1_misses + self.l2_misses
            
            hit_rate = (total_hits / total_requests * 100) if total_requests > 0 else 0
            l1_hit_rate = (self.l1_hits / total_requests * 100) if total_requests > 0 else 0
            l2_hit_rate = (self.l2_hits / total_requests * 100) if total_requests > 0 else 0
            
            compression_ratio = (
                (self.total_compressed_size / self.total_uncompressed_size)
                if self.total_uncompressed_size > 0 else 0
            )
            
            return {
                "total_requests": total_requests,
                "total_hits": total_hits,
                "hit_rate_percent": round(hit_rate, 2),
                "l1_hits": self.l1_hits,
                "l1_misses": self.l1_misses,
                "l1_hit_rate_percent": round(l1_hit_rate, 2),
                "l2_hits": self.l2_hits,
                "l2_misses": self.l2_misses,
                "l2_hit_rate_percent": round(l2_hit_rate, 2),
                "sets": self.sets,
                "deletes": self.deletes,
                "evictions": self.evictions,
                "errors": self.errors,
                "slow_operations": self.slow_operations,
                "compression_saves": self.compression_saves,
                "compression_ratio": round(compression_ratio, 3),
                "space_saved_bytes": self.total_uncompressed_size - self.total_compressed_size
            }


class L1Cache:
    """In-memory L1 cache with LRU eviction"""
    
    def __init__(self, max_size: int = 1000, max_memory_mb: int = 100):
        self.max_size = max_size
        self.max_memory_bytes = max_memory_mb * 1024 * 1024
        self._cache = OrderedDict()
        self._lock = threading.RLock()
        self._current_memory = 0
    
    def get(self, key: str) -> Optional[CacheEntry]:
        """Get entry from L1 cache"""
        with self._lock:
            if key in self._cache:
                entry = self._cache[key]
                if entry.is_expired():
                    del self._cache[key]
                    self._current_memory -= self._estimate_size(entry)
                    return None
                
                # Move to end (most recently used)
                self._cache.move_to_end(key)
                entry.touch()
                return entry
            return None
    
    def set(self, key: str, entry: CacheEntry):
        """Set entry in L1 cache with LRU eviction"""
        with self._lock:
            entry_size = self._estimate_size(entry)
            
            # Remove existing entry if present
            if key in self._cache:
                old_entry = self._cache[key]
                self._current_memory -= self._estimate_size(old_entry)
                del self._cache[key]
            
            # Evict if necessary
            while (len(self._cache) >= self.max_size or 
                   self._current_memory + entry_size > self.max_memory_bytes):
                if not self._cache:
                    break
                self._evict_lru()
            
            # Add new entry
            self._cache[key] = entry
            self._current_memory += entry_size
    
    def delete(self, key: str) -> bool:
        """Delete entry from L1 cache"""
        with self._lock:
            if key in self._cache:
                entry = self._cache[key]
                self._current_memory -= self._estimate_size(entry)
                del self._cache[key]
                return True
            return False
    
    def clear(self):
        """Clear all entries from L1 cache"""
        with self._lock:
            self._cache.clear()
            self._current_memory = 0
    
    def get_size(self) -> int:
        """Get current cache size"""
        return len(self._cache)
    
    def get_memory_usage(self) -> int:
        """Get current memory usage in bytes"""
        return self._current_memory
    
    def _evict_lru(self):
        """Evict least recently used entry"""
        if self._cache:
            key, entry = self._cache.popitem(last=False)
            self._current_memory -= self._estimate_size(entry)
    
    def _estimate_size(self, entry: CacheEntry) -> int:
        """Estimate memory size of cache entry"""
        try:
            return sys.getsizeof(entry.value) + sys.getsizeof(entry.key) + 200  # Overhead
        except:
            return 1024  # Default estimate


class CacheSerializer:
    """Handles serialization and compression of cache data"""
    
    @staticmethod
    def serialize(value: Any, format: SerializationFormat = SerializationFormat.JSON) -> bytes:
        """Serialize value to bytes"""
        if format == SerializationFormat.RAW:
            if isinstance(value, (str, bytes)):
                return value.encode() if isinstance(value, str) else value
            else:
                raise ValueError("RAW format only supports str/bytes")
        
        elif format == SerializationFormat.JSON:
            try:
                return json.dumps(value, default=str).encode()
            except (TypeError, ValueError):
                # Fallback to pickle for non-JSON serializable objects
                return pickle.dumps(value)
        
        elif format == SerializationFormat.PICKLE:
            return pickle.dumps(value)
        
        else:
            raise ValueError(f"Unsupported serialization format: {format}")
    
    @staticmethod
    def deserialize(data: bytes, format: SerializationFormat = SerializationFormat.JSON) -> Any:
        """Deserialize bytes to value"""
        if format == SerializationFormat.RAW:
            return data.decode()
        
        elif format == SerializationFormat.JSON:
            try:
                return json.loads(data.decode())
            except (json.JSONDecodeError, UnicodeDecodeError):
                # Fallback to pickle
                return pickle.loads(data)
        
        elif format == SerializationFormat.PICKLE:
            return pickle.loads(data)
        
        else:
            raise ValueError(f"Unsupported serialization format: {format}")
    
    @staticmethod
    def compress(data: bytes, threshold: int = 1024) -> Tuple[bytes, bool]:
        """Compress data if it exceeds threshold"""
        if len(data) >= threshold:
            compressed = gzip.compress(data)
            if len(compressed) < len(data):
                return compressed, True
        return data, False
    
    @staticmethod
    def decompress(data: bytes, compressed: bool) -> bytes:
        """Decompress data if it was compressed"""
        if compressed:
            return gzip.decompress(data)
        return data


class EnhancedCacheService:
    """Enhanced cache service with multi-level caching and intelligent management"""
    
    def __init__(self, config: Optional[CacheConfig] = None):
        self.config = config or get_cache_config()
        self.connection_manager = get_cache_connection_manager()
        self.redis_client = self.connection_manager.get_client()
        
        # Initialize L1 cache
        self.l1_cache = L1Cache(max_size=1000, max_memory_mb=100)
        
        # Statistics
        self.stats = CacheStats()
        
        # Serializer
        self.serializer = CacheSerializer()
        
        # Tag management
        self._tag_keys = defaultdict(set)
        self._tag_lock = threading.RLock()
        
        # Cache warming
        self._warming_tasks = set()
        self._warming_lock = threading.Lock()
        
        logger.info("Enhanced cache service initialized")
    
    def get(self, key: str, default: Any = None, cache_level: CacheLevel = CacheLevel.BOTH) -> Any:
        """Get value from cache with multi-level support"""
        start_time = time.time()
        
        try:
            # Try L1 cache first
            if cache_level in (CacheLevel.L1_MEMORY, CacheLevel.BOTH):
                entry = self.l1_cache.get(key)
                if entry is not None:
                    self.stats.record_l1_hit()
                    return entry.value
                else:
                    self.stats.record_l1_miss()
            
            # Try L2 cache (Redis)
            if cache_level in (CacheLevel.L2_REDIS, CacheLevel.BOTH):
                redis_key = cache_key_manager.make_key(key)
                
                with self.connection_manager.timed_operation():
                    data = self.redis_client.get(redis_key)
                
                if data is not None:
                    self.stats.record_l2_hit()
                    
                    # Deserialize from Redis
                    try:
                        entry_data = json.loads(data)
                        value = self._deserialize_entry_value(entry_data)
                        
                        # Populate L1 cache
                        if cache_level == CacheLevel.BOTH:
                            entry = CacheEntry(
                                key=key,
                                value=value,
                                ttl=entry_data.get('ttl', self.config.default_ttl),
                                created_at=entry_data.get('created_at', time.time()),
                                accessed_at=time.time(),
                                tags=set(entry_data.get('tags', [])),
                                dependencies=set(entry_data.get('dependencies', []))
                            )
                            self.l1_cache.set(key, entry)
                        
                        return value
                    except Exception as e:
                        logger.error(f"Failed to deserialize cache entry {key}: {e}")
                        self.stats.record_error()
                else:
                    self.stats.record_l2_miss()
            
            return default
            
        except Exception as e:
            logger.error(f"Cache get error for key {key}: {e}")
            self.stats.record_error()
            return default
        
        finally:
            elapsed = time.time() - start_time
            if elapsed > 0.1:  # 100ms threshold
                self.stats.record_slow_operation()
    
    def set(self, 
            key: str, 
            value: Any, 
            ttl: Optional[int] = None,
            tags: Optional[Set[str]] = None,
            dependencies: Optional[Set[str]] = None,
            cache_level: CacheLevel = CacheLevel.BOTH,
            serialization_format: SerializationFormat = SerializationFormat.JSON) -> bool:
        """Set value in cache with multi-level support"""
        start_time = time.time()
        
        try:
            ttl = ttl or self.config.default_ttl
            ttl = min(ttl, self.config.max_ttl)  # Enforce max TTL
            tags = tags or set()
            dependencies = dependencies or set()
            
            # Create cache entry
            entry = CacheEntry(
                key=key,
                value=value,
                ttl=ttl,
                created_at=time.time(),
                accessed_at=time.time(),
                tags=tags,
                dependencies=dependencies,
                serialization_format=serialization_format
            )
            
            # Set in L1 cache
            if cache_level in (CacheLevel.L1_MEMORY, CacheLevel.BOTH):
                self.l1_cache.set(key, entry)
            
            # Set in L2 cache (Redis)
            if cache_level in (CacheLevel.L2_REDIS, CacheLevel.BOTH):
                redis_key = cache_key_manager.make_key(key)
                
                # Serialize value
                serialized_value = self._serialize_entry_value(value, serialization_format)
                
                # Prepare entry data for Redis
                entry_data = {
                    'value': serialized_value,
                    'ttl': ttl,
                    'created_at': entry.created_at,
                    'tags': list(tags),
                    'dependencies': list(dependencies),
                    'serialization_format': serialization_format.value,
                    'compressed': entry.compressed,
                    'original_size': entry.original_size,
                    'compressed_size': entry.compressed_size
                }
                
                with self.connection_manager.timed_operation():
                    self.redis_client.setex(
                        redis_key,
                        ttl if ttl > 0 else self.config.max_ttl,
                        json.dumps(entry_data)
                    )
                
                # Update tag index
                self._update_tag_index(key, tags)
            
            self.stats.record_set()
            return True
            
        except Exception as e:
            logger.error(f"Cache set error for key {key}: {e}")
            self.stats.record_error()
            return False
        
        finally:
            elapsed = time.time() - start_time
            if elapsed > 0.1:  # 100ms threshold
                self.stats.record_slow_operation()
    
    def delete(self, key: str, cache_level: CacheLevel = CacheLevel.BOTH) -> bool:
        """Delete key from cache"""
        try:
            success = True
            
            # Delete from L1 cache
            if cache_level in (CacheLevel.L1_MEMORY, CacheLevel.BOTH):
                self.l1_cache.delete(key)
            
            # Delete from L2 cache (Redis)
            if cache_level in (CacheLevel.L2_REDIS, CacheLevel.BOTH):
                redis_key = cache_key_manager.make_key(key)
                with self.connection_manager.timed_operation():
                    deleted = self.redis_client.delete(redis_key)
                    success = success and bool(deleted)
            
            self.stats.record_delete()
            return success
            
        except Exception as e:
            logger.error(f"Cache delete error for key {key}: {e}")
            self.stats.record_error()
            return False
    
    def exists(self, key: str, cache_level: CacheLevel = CacheLevel.BOTH) -> bool:
        """Check if key exists in cache"""
        try:
            # Check L1 cache
            if cache_level in (CacheLevel.L1_MEMORY, CacheLevel.BOTH):
                entry = self.l1_cache.get(key)
                if entry is not None:
                    return True
            
            # Check L2 cache (Redis)
            if cache_level in (CacheLevel.L2_REDIS, CacheLevel.BOTH):
                redis_key = cache_key_manager.make_key(key)
                with self.connection_manager.timed_operation():
                    return bool(self.redis_client.exists(redis_key))
            
            return False
            
        except Exception as e:
            logger.error(f"Cache exists error for key {key}: {e}")
            self.stats.record_error()
            return False
    
    def invalidate_by_tags(self, tags: Set[str]) -> int:
        """Invalidate cache entries by tags"""
        try:
            invalidated_count = 0
            
            with self._tag_lock:
                keys_to_delete = set()
                
                for tag in tags:
                    if tag in self._tag_keys:
                        keys_to_delete.update(self._tag_keys[tag])
                
                # Delete keys
                for key in keys_to_delete:
                    if self.delete(key):
                        invalidated_count += 1
                
                # Clean up tag index
                for tag in tags:
                    if tag in self._tag_keys:
                        del self._tag_keys[tag]
            
            logger.info(f"Invalidated {invalidated_count} cache entries by tags: {tags}")
            return invalidated_count
            
        except Exception as e:
            logger.error(f"Tag invalidation error: {e}")
            self.stats.record_error()
            return 0
    
    def invalidate_by_pattern(self, pattern: str) -> int:
        """Invalidate cache entries by key pattern"""
        try:
            redis_pattern = cache_key_manager.make_pattern(pattern)
            
            with self.connection_manager.timed_operation():
                keys = self.redis_client.keys(redis_pattern)
            
            if keys:
                with self.connection_manager.timed_operation():
                    deleted = self.redis_client.delete(*keys)
                
                # Also clear from L1 cache
                for redis_key in keys:
                    # Extract original key from Redis key
                    original_key = redis_key.replace(self.config.redis_prefix, "")
                    self.l1_cache.delete(original_key)
                
                logger.info(f"Invalidated {deleted} cache entries by pattern: {pattern}")
                return deleted
            
            return 0
            
        except Exception as e:
            logger.error(f"Pattern invalidation error: {e}")
            self.stats.record_error()
            return 0
    
    def clear_all(self, cache_level: CacheLevel = CacheLevel.BOTH) -> bool:
        """Clear all cache entries"""
        try:
            # Clear L1 cache
            if cache_level in (CacheLevel.L1_MEMORY, CacheLevel.BOTH):
                self.l1_cache.clear()
            
            # Clear L2 cache (Redis)
            if cache_level in (CacheLevel.L2_REDIS, CacheLevel.BOTH):
                with self.connection_manager.timed_operation():
                    self.redis_client.flushdb()
            
            # Clear tag index
            with self._tag_lock:
                self._tag_keys.clear()
            
            logger.info("Cache cleared successfully")
            return True
            
        except Exception as e:
            logger.error(f"Cache clear error: {e}")
            self.stats.record_error()
            return False
    
    def warm_cache(self, keys_and_values: Dict[str, Any], ttl: Optional[int] = None) -> int:
        """Warm cache with predefined data"""
        success_count = 0
        
        for key, value in keys_and_values.items():
            if self.set(key, value, ttl=ttl):
                success_count += 1
        
        logger.info(f"Cache warmed with {success_count}/{len(keys_and_values)} entries")
        return success_count
    
    def get_stats(self) -> Dict[str, Any]:
        """Get comprehensive cache statistics"""
        base_stats = self.stats.get_stats()
        
        # Add L1 cache stats
        base_stats.update({
            "l1_cache_size": self.l1_cache.get_size(),
            "l1_cache_memory_usage_bytes": self.l1_cache.get_memory_usage(),
            "l1_cache_memory_usage_mb": round(self.l1_cache.get_memory_usage() / 1024 / 1024, 2)
        })
        
        # Add connection manager stats
        connection_stats = self.connection_manager.get_metrics()
        base_stats.update({
            "redis_" + k: v for k, v in connection_stats.items()
        })
        
        return base_stats
    
    def health_check(self) -> Dict[str, Any]:
        """Perform comprehensive health check"""
        try:
            # Test basic operations
            test_key = "health_check_" + str(int(time.time()))
            test_value = {"test": True, "timestamp": time.time()}
            
            # Test set
            set_success = self.set(test_key, test_value, ttl=60)
            
            # Test get
            retrieved_value = self.get(test_key)
            get_success = retrieved_value == test_value
            
            # Test delete
            delete_success = self.delete(test_key)
            
            # Get backend health
            backend_health = self.connection_manager.health_check()
            
            return {
                "status": "healthy" if (set_success and get_success and delete_success) else "degraded",
                "operations": {
                    "set": set_success,
                    "get": get_success,
                    "delete": delete_success
                },
                "backend": backend_health,
                "stats": self.get_stats()
            }
            
        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e),
                "backend": self.connection_manager.health_check()
            }
    
    def _serialize_entry_value(self, value: Any, format: SerializationFormat) -> str:
        """Serialize entry value for storage"""
        try:
            # Serialize to bytes
            data = self.serializer.serialize(value, format)
            
            # Compress if enabled and beneficial
            if self.config.compression_enabled:
                compressed_data, is_compressed = self.serializer.compress(
                    data, self.config.compression_threshold
                )
                
                if is_compressed:
                    self.stats.record_compression(len(data), len(compressed_data))
                    # Store compressed data as base64 for JSON compatibility
                    import base64
                    return base64.b64encode(compressed_data).decode()
            
            # Store uncompressed data as base64 for JSON compatibility
            import base64
            return base64.b64encode(data).decode()
            
        except Exception as e:
            logger.error(f"Serialization error: {e}")
            raise
    
    def _deserialize_entry_value(self, entry_data: Dict[str, Any]) -> Any:
        """Deserialize entry value from storage"""
        try:
            import base64
            
            # Decode from base64
            data = base64.b64decode(entry_data['value'].encode())
            
            # Decompress if needed
            if entry_data.get('compressed', False):
                data = self.serializer.decompress(data, True)
            
            # Deserialize
            format_str = entry_data.get('serialization_format', 'json')
            format_enum = SerializationFormat(format_str)
            
            return self.serializer.deserialize(data, format_enum)
            
        except Exception as e:
            logger.error(f"Deserialization error: {e}")
            raise
    
    def _update_tag_index(self, key: str, tags: Set[str]):
        """Update tag index for cache invalidation"""
        with self._tag_lock:
            for tag in tags:
                self._tag_keys[tag].add(key)


# Decorator for caching function results
def cached(ttl: int = 3600, 
           tags: Optional[Set[str]] = None,
           key_func: Optional[Callable] = None,
           cache_level: CacheLevel = CacheLevel.BOTH):
    """Decorator for caching function results"""
    
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Generate cache key
            if key_func:
                cache_key = key_func(*args, **kwargs)
            else:
                # Default key generation
                key_parts = [func.__name__]
                key_parts.extend(str(arg) for arg in args)
                key_parts.extend(f"{k}={v}" for k, v in sorted(kwargs.items()))
                cache_key = hashlib.md5(":".join(key_parts).encode()).hexdigest()
            
            # Try to get from cache
            cached_result = cache_service.get(cache_key, cache_level=cache_level)
            if cached_result is not None:
                return cached_result
            
            # Execute function and cache result
            result = func(*args, **kwargs)
            cache_service.set(cache_key, result, ttl=ttl, tags=tags, cache_level=cache_level)
            
            return result
        
        return wrapper
    return decorator


# Global cache service instance
cache_service = EnhancedCacheService()

# Export public interface
__all__ = [
    "EnhancedCacheService",
    "CacheLevel",
    "SerializationFormat", 
    "CacheEntry",
    "CacheStats",
    "cached",
    "cache_service"
]