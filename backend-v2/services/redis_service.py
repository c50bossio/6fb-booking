"""
Redis connection management service with connection pooling and failover capabilities.
"""

import redis
import redis.connection
import logging
import asyncio
from typing import Optional, Any, Dict, List
from contextlib import contextmanager
import json
from datetime import datetime, timedelta
import pickle
import time
from config import settings

logger = logging.getLogger(__name__)

class RedisConnectionManager:
    """Manages Redis connections with pooling and failover."""
    
    _instance: Optional['RedisConnectionManager'] = None
    _connection_pool: Optional[redis.ConnectionPool] = None
    _client: Optional[redis.Redis] = None
    _is_healthy: bool = False
    _last_health_check: datetime = datetime.now()
    _health_check_interval: int = 30  # seconds
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        if not hasattr(self, '_initialized'):
            self._initialize_connection()
            self._initialized = True
    
    def _initialize_connection(self) -> None:
        """Initialize Redis connection pool with environment-aware configuration."""
        try:
            # Get environment and configuration
            environment = getattr(settings, 'environment', 'development')
            elasticache_enabled = getattr(settings, 'aws_elasticache_enabled', False)
            
            # Parse Redis URL based on environment
            redis_url = getattr(settings, 'redis_url', 'redis://localhost:6379/0')
            
            # Override with local Redis in development if ElastiCache URL is configured
            if environment == 'development' and 'amazonaws.com' in redis_url:
                redis_url = 'redis://localhost:6379/0'
                logger.info("Development mode: Using local Redis instead of ElastiCache")
            elif environment == 'production' and elasticache_enabled:
                logger.info("Production mode: Using AWS ElastiCache")
            
            # Get pool configuration from settings
            max_connections = getattr(settings, 'redis_max_connections', 20)
            socket_timeout = getattr(settings, 'redis_socket_timeout', 5)
            
            # Create connection pool with optimized settings
            pool_kwargs = {
                'max_connections': max_connections,
                'retry_on_timeout': True,
                'retry_on_error': [redis.exceptions.ConnectionError],
                'health_check_interval': 30,
                'socket_connect_timeout': socket_timeout,
                'socket_timeout': socket_timeout,
            }
            
            # Add SSL configuration if enabled
            if getattr(settings, 'redis_ssl', False):
                pool_kwargs['connection_class'] = redis.SSLConnection
                logger.info("SSL enabled for Redis connection")
            
            self._connection_pool = redis.ConnectionPool.from_url(
                redis_url,
                **pool_kwargs
            )
            
            # Create Redis client
            self._client = redis.Redis(
                connection_pool=self._connection_pool,
                decode_responses=True,  # Automatically decode byte responses to strings
                socket_keepalive=True,
                socket_keepalive_options={}
            )
            
            # Test connection
            self._test_connection()
            
            # Log connection details
            masked_url = redis_url.split('@')[-1] if '@' in redis_url else redis_url
            logger.info(f"Redis connection pool initialized successfully to {masked_url}")
            logger.info(f"Environment: {environment}, Max connections: {max_connections}")
            
        except Exception as e:
            logger.error(f"Failed to initialize Redis connection: {e}")
            if environment == 'development':
                logger.error("Make sure Redis is running locally: redis-server")
            self._client = None
            self._is_healthy = False
    
    def _test_connection(self) -> bool:
        """Test Redis connection health."""
        try:
            if self._client:
                self._client.ping()
                self._is_healthy = True
                self._last_health_check = datetime.now()
                return True
        except Exception as e:
            logger.warning(f"Redis health check failed: {e}")
            self._is_healthy = False
        return False
    
    def get_client(self) -> Optional[redis.Redis]:
        """Get Redis client with health checking."""
        # Periodic health check
        now = datetime.now()
        if (now - self._last_health_check).seconds > self._health_check_interval:
            self._test_connection()
        
        if not self._is_healthy and self._client:
            # Try to reconnect
            try:
                self._initialize_connection()
            except Exception as e:
                logger.error(f"Failed to reconnect to Redis: {e}")
        
        return self._client if self._is_healthy else None
    
    def is_available(self) -> bool:
        """Check if Redis is available."""
        return self._is_healthy and self._client is not None
    
    @contextmanager
    def get_connection(self):
        """Context manager for Redis connections with automatic cleanup."""
        client = self.get_client()
        try:
            yield client
        except Exception as e:
            logger.error(f"Redis operation failed: {e}")
            raise
        finally:
            # Connection is returned to pool automatically
            pass
    
    def close(self) -> None:
        """Close Redis connection pool."""
        if self._connection_pool:
            self._connection_pool.disconnect()
            logger.info("Redis connection pool closed")


class RedisSerializer:
    """Handles serialization/deserialization for Redis values."""
    
    @staticmethod
    def serialize(value: Any) -> str:
        """Serialize value for Redis storage."""
        if isinstance(value, (str, int, float, bool)):
            return json.dumps(value)
        elif isinstance(value, (dict, list, tuple)):
            return json.dumps(value)
        elif isinstance(value, datetime):
            return json.dumps(value.isoformat())
        else:
            # Fallback to pickle for complex objects
            return f"pickle:{pickle.dumps(value).hex()}"
    
    @staticmethod
    def deserialize(value: Any) -> Any:
        """Deserialize value from Redis."""
        try:
            # Handle bytes from Redis when decode_responses=False
            if isinstance(value, bytes):
                value = value.decode('utf-8')
            
            # Convert to string if not already
            if not isinstance(value, str):
                return value
                
            if value.startswith("pickle:"):
                # Handle pickled data
                hex_data = value[7:]
                return pickle.loads(bytes.fromhex(hex_data))
            else:
                # Handle JSON data
                return json.loads(value)
        except (json.JSONDecodeError, ValueError, pickle.PickleError, UnicodeDecodeError) as e:
            logger.warning(f"Failed to deserialize Redis value: {e}")
            return value  # Return raw value as fallback


class RedisCacheService:
    """Core Redis caching service with TTL management."""
    
    def __init__(self):
        self.redis_manager = RedisConnectionManager()
        self.serializer = RedisSerializer()
        self._default_ttl = 300  # 5 minutes default TTL
    
    def get(self, key: str) -> Optional[Any]:
        """Get value from cache."""
        try:
            with self.redis_manager.get_connection() as client:
                if client is None:
                    return None
                
                value = client.get(key)
                if value is not None:
                    return self.serializer.deserialize(value)
                return None
        except Exception as e:
            logger.warning(f"Cache get operation failed for key '{key}': {e}")
            return None
    
    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """Set value in cache with TTL."""
        try:
            with self.redis_manager.get_connection() as client:
                if client is None:
                    return False
                
                serialized_value = self.serializer.serialize(value)
                ttl = ttl or self._default_ttl
                
                result = client.setex(key, ttl, serialized_value)
                return bool(result)
        except Exception as e:
            logger.warning(f"Cache set operation failed for key '{key}': {e}")
            return False
    
    def delete(self, key: str) -> bool:
        """Delete key from cache."""
        try:
            with self.redis_manager.get_connection() as client:
                if client is None:
                    return False
                
                result = client.delete(key)
                return result > 0
        except Exception as e:
            logger.warning(f"Cache delete operation failed for key '{key}': {e}")
            return False
    
    def delete_pattern(self, pattern: str) -> int:
        """Delete all keys matching pattern."""
        try:
            with self.redis_manager.get_connection() as client:
                if client is None:
                    return 0
                
                keys = client.keys(pattern)
                if keys:
                    return client.delete(*keys)
                return 0
        except Exception as e:
            logger.warning(f"Cache delete pattern operation failed for pattern '{pattern}': {e}")
            return 0
    
    def exists(self, key: str) -> bool:
        """Check if key exists in cache."""
        try:
            with self.redis_manager.get_connection() as client:
                if client is None:
                    return False
                
                return bool(client.exists(key))
        except Exception as e:
            logger.warning(f"Cache exists operation failed for key '{key}': {e}")
            return False
    
    def expire(self, key: str, ttl: int) -> bool:
        """Set TTL for existing key."""
        try:
            with self.redis_manager.get_connection() as client:
                if client is None:
                    return False
                
                return bool(client.expire(key, ttl))
        except Exception as e:
            logger.warning(f"Cache expire operation failed for key '{key}': {e}")
            return False
    
    def ttl(self, key: str) -> Optional[int]:
        """Get TTL for key."""
        try:
            with self.redis_manager.get_connection() as client:
                if client is None:
                    return None
                
                ttl = client.ttl(key)
                return ttl if ttl >= 0 else None
        except Exception as e:
            logger.warning(f"Cache TTL operation failed for key '{key}': {e}")
            return None
    
    def mget(self, keys: List[str]) -> Dict[str, Any]:
        """Get multiple values from cache."""
        try:
            with self.redis_manager.get_connection() as client:
                if client is None:
                    return {}
                
                values = client.mget(keys)
                result = {}
                
                for key, value in zip(keys, values):
                    if value is not None:
                        result[key] = self.serializer.deserialize(value)
                
                return result
        except Exception as e:
            logger.warning(f"Cache mget operation failed: {e}")
            return {}
    
    def mset(self, mapping: Dict[str, Any], ttl: Optional[int] = None) -> bool:
        """Set multiple values in cache."""
        try:
            with self.redis_manager.get_connection() as client:
                if client is None:
                    return False
                
                # Serialize all values
                serialized_mapping = {
                    key: self.serializer.serialize(value) 
                    for key, value in mapping.items()
                }
                
                # Use pipeline for efficiency
                with client.pipeline() as pipe:
                    pipe.mset(serialized_mapping)
                    
                    # Set TTL for each key if specified
                    if ttl:
                        for key in mapping.keys():
                            pipe.expire(key, ttl)
                    
                    pipe.execute()
                
                return True
        except Exception as e:
            logger.warning(f"Cache mset operation failed: {e}")
            return False
    
    def increment(self, key: str, amount: int = 1, ttl: Optional[int] = None) -> Optional[int]:
        """Increment counter in cache."""
        try:
            with self.redis_manager.get_connection() as client:
                if client is None:
                    return None
                
                with client.pipeline() as pipe:
                    pipe.incr(key, amount)
                    if ttl and not client.exists(key):
                        pipe.expire(key, ttl)
                    
                    result = pipe.execute()
                    return result[0]
        except Exception as e:
            logger.warning(f"Cache increment operation failed for key '{key}': {e}")
            return None
    
    def add_to_set(self, key: str, *values: Any, ttl: Optional[int] = None) -> bool:
        """Add values to a set in cache."""
        try:
            with self.redis_manager.get_connection() as client:
                if client is None:
                    return False
                
                serialized_values = [self.serializer.serialize(value) for value in values]
                
                with client.pipeline() as pipe:
                    pipe.sadd(key, *serialized_values)
                    if ttl:
                        pipe.expire(key, ttl)
                    
                    pipe.execute()
                
                return True
        except Exception as e:
            logger.warning(f"Cache set add operation failed for key '{key}': {e}")
            return False
    
    def get_set(self, key: str) -> List[Any]:
        """Get all members of a set from cache."""
        try:
            with self.redis_manager.get_connection() as client:
                if client is None:
                    return []
                
                values = client.smembers(key)
                return [self.serializer.deserialize(value) for value in values]
        except Exception as e:
            logger.warning(f"Cache set get operation failed for key '{key}': {e}")
            return []
    
    def is_available(self) -> bool:
        """Check if Redis cache is available."""
        return self.redis_manager.is_available()
    
    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics."""
        try:
            with self.redis_manager.get_connection() as client:
                if client is None:
                    return {"available": False}
                
                info = client.info()
                return {
                    "available": True,
                    "used_memory": info.get("used_memory", 0),
                    "used_memory_human": info.get("used_memory_human", "0B"),
                    "connected_clients": info.get("connected_clients", 0),
                    "total_connections_received": info.get("total_connections_received", 0),
                    "total_commands_processed": info.get("total_commands_processed", 0),
                    "keyspace_hits": info.get("keyspace_hits", 0),
                    "keyspace_misses": info.get("keyspace_misses", 0),
                    "hit_rate": self._calculate_hit_rate(info)
                }
        except Exception as e:
            logger.warning(f"Failed to get cache stats: {e}")
            return {"available": False, "error": str(e)}
    
    def _calculate_hit_rate(self, info: Dict[str, Any]) -> float:
        """Calculate cache hit rate."""
        hits = info.get("keyspace_hits", 0)
        misses = info.get("keyspace_misses", 0)
        total = hits + misses
        
        if total == 0:
            return 0.0
        
        return round((hits / total) * 100, 2)
    
    def clear_all(self) -> bool:
        """Clear all cache data. Use with caution!"""
        try:
            with self.redis_manager.get_connection() as client:
                if client is None:
                    return False
                
                client.flushdb()
                logger.warning("All cache data cleared")
                return True
        except Exception as e:
            logger.error(f"Failed to clear cache: {e}")
            return False


# Global cache service instance
cache_service = RedisCacheService()