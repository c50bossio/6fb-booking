"""
Redis Client Utility
Provides Redis connection management for caching and session storage
"""

import redis
from typing import Optional
import logging
from config.settings import settings

logger = logging.getLogger(__name__)

# Global Redis client instance
_redis_client: Optional[redis.Redis] = None


def get_redis_client() -> redis.Redis:
    """
    Get or create Redis client instance
    """
    global _redis_client

    if _redis_client is None:
        try:
            # Create Redis connection
            _redis_client = redis.Redis(
                host=(
                    settings.REDIS_HOST
                    if hasattr(settings, "REDIS_HOST")
                    else "localhost"
                ),
                port=settings.REDIS_PORT if hasattr(settings, "REDIS_PORT") else 6379,
                db=settings.REDIS_DB if hasattr(settings, "REDIS_DB") else 0,
                password=(
                    settings.REDIS_PASSWORD
                    if hasattr(settings, "REDIS_PASSWORD")
                    else None
                ),
                decode_responses=True,
                socket_timeout=5,
                socket_connect_timeout=5,
                retry_on_timeout=True,
                health_check_interval=30,
            )

            # Test connection
            _redis_client.ping()
            logger.info("Redis connection established successfully")

        except redis.ConnectionError as e:
            logger.error(f"Failed to connect to Redis: {e}")
            # Fallback to in-memory implementation if Redis is not available
            _redis_client = InMemoryRedis()
            logger.warning("Using in-memory cache as Redis fallback")
        except Exception as e:
            logger.error(f"Unexpected error connecting to Redis: {e}")
            _redis_client = InMemoryRedis()

    return _redis_client


class InMemoryRedis:
    """
    In-memory Redis mock for development/testing when Redis is not available
    Provides basic Redis-like interface
    """

    def __init__(self):
        self._store = {}
        self._ttl = {}
        import time

        self._time = time

    def get(self, key: str) -> Optional[str]:
        """Get value by key"""
        # Check if key has expired
        if key in self._ttl:
            if self._time.time() > self._ttl[key]:
                del self._store[key]
                del self._ttl[key]
                return None

        return self._store.get(key)

    def set(self, key: str, value: str, ex: Optional[int] = None) -> bool:
        """Set key-value pair with optional expiration"""
        self._store[key] = str(value)

        if ex:
            self._ttl[key] = self._time.time() + ex

        return True

    def setex(self, key: str, seconds: int, value: str) -> bool:
        """Set key-value pair with expiration in seconds"""
        return self.set(key, value, ex=seconds)

    def delete(self, *keys) -> int:
        """Delete one or more keys"""
        count = 0
        for key in keys:
            if key in self._store:
                del self._store[key]
                if key in self._ttl:
                    del self._ttl[key]
                count += 1
        return count

    def incr(self, key: str) -> int:
        """Increment value by 1"""
        current = int(self._store.get(key, 0))
        new_value = current + 1
        self._store[key] = str(new_value)
        return new_value

    def ttl(self, key: str) -> int:
        """Get time to live for key"""
        if key not in self._ttl:
            return -1 if key in self._store else -2

        ttl_value = int(self._ttl[key] - self._time.time())
        return max(0, ttl_value)

    def expire(self, key: str, seconds: int) -> bool:
        """Set expiration for existing key"""
        if key in self._store:
            self._ttl[key] = self._time.time() + seconds
            return True
        return False

    def sadd(self, key: str, *values) -> int:
        """Add members to set"""
        if key not in self._store:
            self._store[key] = set()
        elif not isinstance(self._store[key], set):
            raise ValueError("Wrong type for set operation")

        count = 0
        for value in values:
            if value not in self._store[key]:
                self._store[key].add(value)
                count += 1

        return count

    def smembers(self, key: str) -> set:
        """Get all members of set"""
        if key not in self._store:
            return set()

        if not isinstance(self._store[key], set):
            raise ValueError("Wrong type for set operation")

        return self._store[key].copy()

    def ping(self) -> bool:
        """Test connection"""
        return True


def close_redis_connection():
    """
    Close Redis connection if exists
    """
    global _redis_client

    if _redis_client and not isinstance(_redis_client, InMemoryRedis):
        try:
            _redis_client.close()
            logger.info("Redis connection closed")
        except Exception as e:
            logger.error(f"Error closing Redis connection: {e}")

    _redis_client = None
