"""
Redis Cache Configuration and Connection Management
Enhanced caching infrastructure with multi-environment support and health monitoring
"""

import redis
from redis.connection import ConnectionPool
from redis.sentinel import Sentinel
from typing import Optional, Dict, Any, List, Union
import logging
import os
import json
import time
from urllib.parse import urlparse
from functools import lru_cache
from dataclasses import dataclass
from enum import Enum
import threading
from contextlib import contextmanager

logger = logging.getLogger(__name__)


class CacheBackend(Enum):
    """Available cache backends"""
    MEMORY = "memory"
    REDIS = "redis"
    REDIS_CLUSTER = "redis_cluster"
    REDIS_SENTINEL = "redis_sentinel"


@dataclass
class CacheConfig:
    """Cache configuration settings"""
    # Redis connection settings
    redis_url: str = "redis://localhost:6379"
    redis_password: Optional[str] = None
    redis_db: int = 0
    redis_prefix: str = "6fb:"
    
    # Connection pool settings
    max_connections: int = 50
    retry_on_timeout: bool = True
    socket_timeout: int = 5
    socket_connect_timeout: int = 5
    connection_pool_kwargs: Dict[str, Any] = None
    
    # Cache behavior settings
    default_ttl: int = 3600  # 1 hour
    max_ttl: int = 86400 * 7  # 1 week
    compression_enabled: bool = True
    compression_threshold: int = 1024  # Compress if data > 1KB
    
    # Performance settings
    pipeline_size: int = 100
    cluster_enabled: bool = False
    sentinel_enabled: bool = False
    sentinel_hosts: List[str] = None
    sentinel_service_name: str = "mymaster"
    
    # Environment settings
    backend: CacheBackend = CacheBackend.REDIS
    enable_circuit_breaker: bool = True
    circuit_breaker_threshold: int = 5
    circuit_breaker_timeout: int = 60
    
    # Monitoring settings
    enable_metrics: bool = True
    slow_query_threshold: float = 0.1  # 100ms
    
    def __post_init__(self):
        if self.connection_pool_kwargs is None:
            self.connection_pool_kwargs = {}
        if self.sentinel_hosts is None:
            self.sentinel_hosts = []


class CacheCircuitBreaker:
    """Circuit breaker for cache operations"""
    
    def __init__(self, threshold: int = 5, timeout: int = 60):
        self.threshold = threshold
        self.timeout = timeout
        self.failure_count = 0
        self.last_failure_time = None
        self.state = "CLOSED"  # CLOSED, OPEN, HALF_OPEN
        self._lock = threading.Lock()
    
    def call(self, func, *args, **kwargs):
        """Execute function with circuit breaker protection"""
        with self._lock:
            if self.state == "OPEN":
                if self._should_attempt_reset():
                    self.state = "HALF_OPEN"
                else:
                    raise redis.ConnectionError("Cache circuit breaker is OPEN")
        
        try:
            result = func(*args, **kwargs)
            self._on_success()
            return result
        except (redis.ConnectionError, redis.TimeoutError, redis.RedisError) as e:
            self._on_failure()
            raise e
    
    def _should_attempt_reset(self) -> bool:
        """Check if enough time has passed to attempt reset"""
        if self.last_failure_time is None:
            return True
        return time.time() - self.last_failure_time >= self.timeout
    
    def _on_success(self):
        """Reset circuit breaker on successful operation"""
        with self._lock:
            self.failure_count = 0
            self.state = "CLOSED"
    
    def _on_failure(self):
        """Handle failure in circuit breaker"""
        with self._lock:
            self.failure_count += 1
            self.last_failure_time = time.time()
            
            if self.failure_count >= self.threshold:
                self.state = "OPEN"
                logger.warning(f"Cache circuit breaker opened after {self.failure_count} failures")


class CacheConnectionManager:
    """Manages Redis connections with fallback and monitoring"""
    
    def __init__(self, config: CacheConfig):
        self.config = config
        self.connection_pool = None
        self.redis_client = None
        self.sentinel = None
        self.circuit_breaker = CacheCircuitBreaker(
            config.circuit_breaker_threshold,
            config.circuit_breaker_timeout
        ) if config.enable_circuit_breaker else None
        self._initialized = False
        self._lock = threading.Lock()
        
        # Metrics
        self.hit_count = 0
        self.miss_count = 0
        self.error_count = 0
        self.slow_queries = 0
    
    def initialize(self):
        """Initialize Redis connection based on configuration"""
        with self._lock:
            if self._initialized:
                return
            
            try:
                if self.config.backend == CacheBackend.MEMORY:
                    self._initialize_memory_backend()
                elif self.config.backend == CacheBackend.REDIS_SENTINEL:
                    self._initialize_sentinel()
                elif self.config.backend == CacheBackend.REDIS_CLUSTER:
                    self._initialize_cluster()
                else:
                    self._initialize_redis()
                
                self._initialized = True
                logger.info(f"Cache backend initialized: {self.config.backend.value}")
                
            except Exception as e:
                logger.error(f"Failed to initialize cache backend: {e}")
                self._initialize_fallback()
    
    def _initialize_redis(self):
        """Initialize standard Redis connection"""
        # Parse Redis URL
        parsed = urlparse(self.config.redis_url)
        
        pool_kwargs = {
            'host': parsed.hostname or 'localhost',
            'port': parsed.port or 6379,
            'db': self.config.redis_db,
            'password': self.config.redis_password or parsed.password,
            'max_connections': self.config.max_connections,
            'retry_on_timeout': self.config.retry_on_timeout,
            'socket_timeout': self.config.socket_timeout,
            'socket_connect_timeout': self.config.socket_connect_timeout,
            'decode_responses': True,
            **self.config.connection_pool_kwargs
        }
        
        self.connection_pool = ConnectionPool(**pool_kwargs)
        self.redis_client = redis.Redis(connection_pool=self.connection_pool)
        
        # Test connection
        self.redis_client.ping()
    
    def _initialize_sentinel(self):
        """Initialize Redis Sentinel connection"""
        if not self.config.sentinel_hosts:
            raise ValueError("Sentinel hosts must be configured for sentinel backend")
        
        sentinel_hosts = [(host.split(':')[0], int(host.split(':')[1]) if ':' in host else 26379) 
                         for host in self.config.sentinel_hosts]
        
        self.sentinel = Sentinel(sentinel_hosts)
        self.redis_client = self.sentinel.master_for(
            self.config.sentinel_service_name,
            password=self.config.redis_password,
            db=self.config.redis_db,
            decode_responses=True
        )
        
        # Test connection
        self.redis_client.ping()
    
    def _initialize_cluster(self):
        """Initialize Redis Cluster connection"""
        try:
            from rediscluster import RedisCluster
            
            startup_nodes = [{"host": "127.0.0.1", "port": "7000"}]  # Default
            self.redis_client = RedisCluster(
                startup_nodes=startup_nodes,
                decode_responses=True,
                password=self.config.redis_password
            )
            
            # Test connection
            self.redis_client.ping()
            
        except ImportError:
            logger.error("redis-py-cluster not installed. Falling back to standard Redis.")
            self._initialize_redis()
    
    def _initialize_memory_backend(self):
        """Initialize in-memory cache backend (for development)"""
        from threading import RLock
        
        class MemoryCache:
            def __init__(self):
                self._data = {}
                self._expiry = {}
                self._lock = RLock()
            
            def set(self, key, value, ex=None):
                with self._lock:
                    self._data[key] = value
                    if ex:
                        self._expiry[key] = time.time() + ex
                    return True
            
            def get(self, key):
                with self._lock:
                    if key in self._expiry and time.time() > self._expiry[key]:
                        del self._data[key]
                        del self._expiry[key]
                        return None
                    return self._data.get(key)
            
            def delete(self, key):
                with self._lock:
                    self._data.pop(key, None)
                    self._expiry.pop(key, None)
                    return True
            
            def exists(self, key):
                return self.get(key) is not None
            
            def ping(self):
                return True
            
            def flushdb(self):
                with self._lock:
                    self._data.clear()
                    self._expiry.clear()
                return True
        
        self.redis_client = MemoryCache()
        logger.info("Using in-memory cache backend")
    
    def _initialize_fallback(self):
        """Initialize fallback cache (memory-based)"""
        logger.warning("Initializing fallback memory cache due to Redis connection failure")
        self.config.backend = CacheBackend.MEMORY
        self._initialize_memory_backend()
    
    def get_client(self):
        """Get Redis client with initialization check"""
        if not self._initialized:
            self.initialize()
        return self.redis_client
    
    def health_check(self) -> Dict[str, Any]:
        """Perform health check on cache backend"""
        try:
            client = self.get_client()
            start_time = time.time()
            client.ping()
            response_time = time.time() - start_time
            
            return {
                "status": "healthy",
                "backend": self.config.backend.value,
                "response_time_ms": round(response_time * 1000, 2),
                "circuit_breaker_state": self.circuit_breaker.state if self.circuit_breaker else "disabled",
                "metrics": self.get_metrics()
            }
        except Exception as e:
            return {
                "status": "unhealthy",
                "backend": self.config.backend.value,
                "error": str(e),
                "circuit_breaker_state": self.circuit_breaker.state if self.circuit_breaker else "disabled"
            }
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get cache performance metrics"""
        total_requests = self.hit_count + self.miss_count
        hit_rate = (self.hit_count / total_requests * 100) if total_requests > 0 else 0
        
        return {
            "hit_count": self.hit_count,
            "miss_count": self.miss_count,
            "hit_rate_percent": round(hit_rate, 2),
            "error_count": self.error_count,
            "slow_queries": self.slow_queries,
            "total_requests": total_requests
        }
    
    def record_hit(self):
        """Record cache hit"""
        self.hit_count += 1
    
    def record_miss(self):
        """Record cache miss"""
        self.miss_count += 1
    
    def record_error(self):
        """Record cache error"""
        self.error_count += 1
    
    def record_slow_query(self):
        """Record slow query"""
        self.slow_queries += 1
    
    @contextmanager
    def timed_operation(self):
        """Context manager for timing cache operations"""
        start_time = time.time()
        try:
            yield
        finally:
            elapsed = time.time() - start_time
            if elapsed > self.config.slow_query_threshold:
                self.record_slow_query()


class CacheKeyManager:
    """Manages cache key generation and namespacing"""
    
    def __init__(self, prefix: str = "6fb:"):
        self.prefix = prefix
    
    def make_key(self, *parts) -> str:
        """Generate cache key from parts"""
        key_parts = [str(part) for part in parts if part is not None]
        return self.prefix + ":".join(key_parts)
    
    def make_tag_key(self, tag: str) -> str:
        """Generate tag key for cache invalidation"""
        return self.make_key("tag", tag)
    
    def make_pattern(self, *parts) -> str:
        """Generate cache key pattern for bulk operations"""
        pattern_parts = [str(part) if part != "*" else "*" for part in parts]
        return self.prefix + ":".join(pattern_parts)


# Global configuration and connection manager
@lru_cache()
def get_cache_config() -> CacheConfig:
    """Get cache configuration from environment"""
    # Determine backend based on environment
    environment = os.getenv("ENVIRONMENT", "development")
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
    
    # Use memory backend for development if Redis is not available
    backend = CacheBackend.REDIS
    if environment == "development":
        try:
            # Test Redis connection
            test_client = redis.from_url(redis_url, socket_connect_timeout=1)
            test_client.ping()
        except:
            logger.info("Redis not available in development, using memory backend")
            backend = CacheBackend.MEMORY
    
    config = CacheConfig(
        redis_url=redis_url,
        redis_password=os.getenv("REDIS_PASSWORD"),
        redis_db=int(os.getenv("REDIS_DB", "0")),
        redis_prefix=os.getenv("REDIS_PREFIX", "6fb:"),
        backend=backend,
        default_ttl=int(os.getenv("CACHE_DEFAULT_TTL", "3600")),
        max_ttl=int(os.getenv("CACHE_MAX_TTL", str(86400 * 7))),
        compression_enabled=os.getenv("CACHE_COMPRESSION", "true").lower() == "true",
        enable_circuit_breaker=os.getenv("CACHE_CIRCUIT_BREAKER", "true").lower() == "true",
        enable_metrics=os.getenv("CACHE_METRICS", "true").lower() == "true"
    )
    
    return config


# Global connection manager instance
_connection_manager = None
_manager_lock = threading.Lock()


def get_cache_connection_manager() -> CacheConnectionManager:
    """Get global cache connection manager instance"""
    global _connection_manager
    
    if _connection_manager is None:
        with _manager_lock:
            if _connection_manager is None:
                config = get_cache_config()
                _connection_manager = CacheConnectionManager(config)
                _connection_manager.initialize()
    
    return _connection_manager


def get_redis_client():
    """Get Redis client for direct access"""
    manager = get_cache_connection_manager()
    return manager.get_client()


def get_cache_health() -> Dict[str, Any]:
    """Get cache system health status"""
    try:
        manager = get_cache_connection_manager()
        return manager.health_check()
    except Exception as e:
        return {
            "status": "error",
            "error": str(e)
        }


# Cache key manager instance
cache_key_manager = CacheKeyManager()

# Export public interface
__all__ = [
    "CacheConfig",
    "CacheBackend", 
    "CacheConnectionManager",
    "CacheKeyManager",
    "get_cache_config",
    "get_cache_connection_manager",
    "get_redis_client",
    "get_cache_health",
    "cache_key_manager"
]