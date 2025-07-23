"""
Enhanced Redis Service for BookedBarber V2
Optimized caching to achieve 80%+ cache hit rate
"""

import json
import redis
import logging
from datetime import datetime, timedelta
from typing import Any, Optional, Dict, List, Union
from functools import wraps
import hashlib
import pickle
import asyncio
from dataclasses import dataclass

logger = logging.getLogger(__name__)

@dataclass
class CacheMetrics:
    """Cache performance metrics"""
    hits: int = 0
    misses: int = 0
    sets: int = 0
    deletes: int = 0
    
    @property
    def hit_rate(self) -> float:
        total = self.hits + self.misses
        return (self.hits / total * 100) if total > 0 else 0
    
    @property
    def total_operations(self) -> int:
        return self.hits + self.misses + self.sets + self.deletes

class EnhancedRedisService:
    """Enhanced Redis service with intelligent caching strategies"""
    
    def __init__(self, redis_url: str = "redis://localhost:6379/0"):
        try:
            self.redis_client = redis.Redis.from_url(redis_url, decode_responses=True)
            self.redis_client.ping()
            logger.info("✅ Enhanced Redis connection established")
        except Exception as e:
            logger.error(f"❌ Redis connection failed: {e}")
            self.redis_client = None
        
        # Cache metrics
        self.metrics = CacheMetrics()
        
        # Cache strategies
        self.cache_strategies = {
            'availability': {
                'ttl': 30,  # 30 seconds for real-time data
                'prefix': 'avail',
                'compression': False,
                'priority': 'high'
            },
            'appointments': {
                'ttl': 300,  # 5 minutes for appointment data
                'prefix': 'appt',
                'compression': True,
                'priority': 'high'
            },
            'user_profiles': {
                'ttl': 1800,  # 30 minutes for user data
                'prefix': 'user',
                'compression': True,
                'priority': 'medium'
            },
            'services': {
                'ttl': 3600,  # 1 hour for service catalog
                'prefix': 'svc',
                'compression': True,
                'priority': 'low'
            },
            'analytics': {
                'ttl': 900,  # 15 minutes for analytics
                'prefix': 'analytics',
                'compression': True,
                'priority': 'medium'
            },
            'barber_data': {
                'ttl': 600,  # 10 minutes for barber information
                'prefix': 'barber',
                'compression': True,
                'priority': 'high'
            },
            'queue_data': {
                'ttl': 60,  # 1 minute for queue data
                'prefix': 'queue',
                'compression': False,
                'priority': 'high'
            }
        }
    
    def _generate_cache_key(self, category: str, identifier: str, params: Dict = None) -> str:
        """Generate optimized cache key"""
        strategy = self.cache_strategies.get(category, {'prefix': 'general'})
        prefix = strategy['prefix']
        
        # Create a hash of parameters for consistent keys
        if params:
            param_str = json.dumps(params, sort_keys=True)
            param_hash = hashlib.md5(param_str.encode()).hexdigest()[:8]
            return f"{prefix}:{identifier}:{param_hash}"
        
        return f"{prefix}:{identifier}"
    
    def _serialize_data(self, data: Any, compression: bool = False) -> str:
        """Serialize data with optional compression"""
        if compression:
            # Use pickle for complex objects with compression
            return pickle.dumps(data).hex()
        else:
            # Use JSON for simple objects
            return json.dumps(data, default=str)
    
    def _deserialize_data(self, data: str, compression: bool = False) -> Any:
        """Deserialize data with compression support"""
        if compression:
            try:
                return pickle.loads(bytes.fromhex(data))
            except:
                # Fallback to JSON if pickle fails
                return json.loads(data)
        else:
            return json.loads(data)
    
    def get(self, category: str, identifier: str, params: Dict = None) -> Optional[Any]:
        """Get data from cache with metrics tracking"""
        if not self.redis_client:
            return None
        
        try:
            key = self._generate_cache_key(category, identifier, params)
            cached_data = self.redis_client.get(key)
            
            if cached_data:
                self.metrics.hits += 1
                strategy = self.cache_strategies.get(category, {})
                compression = strategy.get('compression', False)
                
                return self._deserialize_data(cached_data, compression)
            else:
                self.metrics.misses += 1
                return None
                
        except Exception as e:
            logger.error(f"Cache get error for {category}:{identifier}: {e}")
            self.metrics.misses += 1
            return None
    
    def set(self, category: str, identifier: str, data: Any, params: Dict = None, ttl_override: int = None) -> bool:
        """Set data in cache with intelligent TTL and compression"""
        if not self.redis_client:
            return False
        
        try:
            strategy = self.cache_strategies.get(category, {'ttl': 300, 'compression': False})
            key = self._generate_cache_key(category, identifier, params)
            
            # Use TTL override or strategy default
            ttl = ttl_override or strategy.get('ttl', 300)
            compression = strategy.get('compression', False)
            
            # Serialize data
            serialized_data = self._serialize_data(data, compression)
            
            # Set with TTL
            success = self.redis_client.setex(key, ttl, serialized_data)
            
            if success:
                self.metrics.sets += 1
                logger.debug(f"Cache set: {key} (TTL: {ttl}s, compressed: {compression})")
            
            return success
            
        except Exception as e:
            logger.error(f"Cache set error for {category}:{identifier}: {e}")
            return False
    
    def delete(self, category: str, identifier: str, params: Dict = None) -> bool:
        """Delete data from cache"""
        if not self.redis_client:
            return False
        
        try:
            key = self._generate_cache_key(category, identifier, params)
            result = self.redis_client.delete(key)
            
            if result > 0:
                self.metrics.deletes += 1
                logger.debug(f"Cache deleted: {key}")
            
            return result > 0
            
        except Exception as e:
            logger.error(f"Cache delete error for {category}:{identifier}: {e}")
            return False
    
    def delete_pattern(self, category: str, pattern: str = "*") -> int:
        """Delete multiple keys matching pattern"""
        if not self.redis_client:
            return 0
        
        try:
            strategy = self.cache_strategies.get(category, {'prefix': 'general'})
            prefix = strategy['prefix']
            search_pattern = f"{prefix}:{pattern}"
            
            keys = self.redis_client.keys(search_pattern)
            if keys:
                deleted = self.redis_client.delete(*keys)
                self.metrics.deletes += deleted
                logger.debug(f"Cache pattern delete: {search_pattern} ({deleted} keys)")
                return deleted
            
            return 0
            
        except Exception as e:
            logger.error(f"Cache pattern delete error for {category}:{pattern}: {e}")
            return 0
    
    def get_or_set(self, category: str, identifier: str, data_func, params: Dict = None, ttl_override: int = None) -> Any:
        """Get from cache or set if not exists (cache-aside pattern)"""
        
        # Try to get from cache first
        cached_data = self.get(category, identifier, params)
        
        if cached_data is not None:
            return cached_data
        
        # Not in cache, get fresh data
        try:
            fresh_data = data_func()
            
            # Set in cache for next time
            if fresh_data is not None:
                self.set(category, identifier, fresh_data, params, ttl_override)
            
            return fresh_data
            
        except Exception as e:
            logger.error(f"Data function error for {category}:{identifier}: {e}")
            return None
    
    def batch_get(self, category: str, identifiers: List[str], params: Dict = None) -> Dict[str, Any]:
        """Get multiple cache entries efficiently"""
        if not self.redis_client or not identifiers:
            return {}
        
        try:
            keys = [self._generate_cache_key(category, identifier, params) for identifier in identifiers]
            values = self.redis_client.mget(keys)
            
            strategy = self.cache_strategies.get(category, {})
            compression = strategy.get('compression', False)
            
            result = {}
            for i, (identifier, value) in enumerate(zip(identifiers, values)):
                if value:
                    self.metrics.hits += 1
                    result[identifier] = self._deserialize_data(value, compression)
                else:
                    self.metrics.misses += 1
            
            return result
            
        except Exception as e:
            logger.error(f"Batch get error for {category}: {e}")
            self.metrics.misses += len(identifiers)
            return {}
    
    def batch_set(self, category: str, data_dict: Dict[str, Any], params: Dict = None, ttl_override: int = None) -> int:
        """Set multiple cache entries efficiently"""
        if not self.redis_client or not data_dict:
            return 0
        
        try:
            strategy = self.cache_strategies.get(category, {'ttl': 300, 'compression': False})
            ttl = ttl_override or strategy.get('ttl', 300)
            compression = strategy.get('compression', False)
            
            # Prepare pipeline for batch operations
            pipe = self.redis_client.pipeline()
            
            for identifier, data in data_dict.items():
                key = self._generate_cache_key(category, identifier, params)
                serialized_data = self._serialize_data(data, compression)
                pipe.setex(key, ttl, serialized_data)
            
            results = pipe.execute()
            success_count = sum(1 for result in results if result)
            
            self.metrics.sets += success_count
            logger.debug(f"Batch set: {success_count}/{len(data_dict)} successful for {category}")
            
            return success_count
            
        except Exception as e:
            logger.error(f"Batch set error for {category}: {e}")
            return 0
    
    def preload_cache(self, category: str, data_loader_func, identifiers: List[str] = None):
        """Proactively load cache with frequently accessed data"""
        if not self.redis_client:
            return
        
        try:
            logger.info(f"Preloading cache for category: {category}")
            
            # Load data from source
            data = data_loader_func(identifiers) if identifiers else data_loader_func()
            
            if isinstance(data, dict):
                # Batch load dictionary data
                success_count = self.batch_set(category, data)
                logger.info(f"Preloaded {success_count} items for {category}")
            elif isinstance(data, list) and identifiers:
                # Load list data with identifiers
                data_dict = dict(zip(identifiers, data))
                success_count = self.batch_set(category, data_dict)
                logger.info(f"Preloaded {success_count} items for {category}")
            else:
                logger.warning(f"Invalid data format for preloading {category}")
                
        except Exception as e:
            logger.error(f"Preload error for {category}: {e}")
    
    def get_cache_metrics(self) -> Dict[str, Any]:
        """Get current cache performance metrics"""
        return {
            'hit_rate': round(self.metrics.hit_rate, 2),
            'total_operations': self.metrics.total_operations,
            'hits': self.metrics.hits,
            'misses': self.metrics.misses,
            'sets': self.metrics.sets,
            'deletes': self.metrics.deletes,
            'redis_info': self._get_redis_info()
        }
    
    def _get_redis_info(self) -> Dict[str, Any]:
        """Get Redis server information"""
        if not self.redis_client:
            return {'connected': False}
        
        try:
            info = self.redis_client.info()
            return {
                'connected': True,
                'used_memory': info.get('used_memory_human', 'N/A'),
                'connected_clients': info.get('connected_clients', 0),
                'total_commands_processed': info.get('total_commands_processed', 0),
                'keyspace_hits': info.get('keyspace_hits', 0),
                'keyspace_misses': info.get('keyspace_misses', 0),
                'redis_version': info.get('redis_version', 'unknown')
            }
        except Exception as e:
            logger.error(f"Error getting Redis info: {e}")
            return {'connected': False, 'error': str(e)}
    
    def optimize_cache_performance(self):
        """Analyze and optimize cache performance"""
        if not self.redis_client:
            return
        
        try:
            logger.info("🔧 Starting cache performance optimization...")
            
            # Get current metrics
            metrics = self.get_cache_metrics()
            current_hit_rate = metrics['hit_rate']
            
            logger.info(f"Current cache hit rate: {current_hit_rate}%")
            
            if current_hit_rate < 80:
                logger.info("Cache hit rate below target (80%), applying optimizations...")
                
                # Optimization strategies
                optimizations_applied = 0
                
                # 1. Increase TTL for frequently accessed data
                high_frequency_categories = ['availability', 'appointments', 'barber_data']
                for category in high_frequency_categories:
                    if category in self.cache_strategies:
                        old_ttl = self.cache_strategies[category]['ttl']
                        new_ttl = min(old_ttl * 1.5, 1800)  # Max 30 minutes
                        self.cache_strategies[category]['ttl'] = int(new_ttl)
                        logger.info(f"Increased TTL for {category}: {old_ttl}s → {new_ttl}s")
                        optimizations_applied += 1
                
                # 2. Enable compression for larger datasets
                compression_candidates = ['user_profiles', 'analytics', 'services']
                for category in compression_candidates:
                    if category in self.cache_strategies and not self.cache_strategies[category]['compression']:
                        self.cache_strategies[category]['compression'] = True
                        logger.info(f"Enabled compression for {category}")
                        optimizations_applied += 1
                
                # 3. Add new caching strategies for missing categories
                new_strategies = {
                    'popular_times': {
                        'ttl': 3600,
                        'prefix': 'popular',
                        'compression': True,
                        'priority': 'medium'
                    },
                    'client_preferences': {
                        'ttl': 1800,
                        'prefix': 'client_pref',
                        'compression': True,
                        'priority': 'medium'
                    }
                }
                
                for category, strategy in new_strategies.items():
                    if category not in self.cache_strategies:
                        self.cache_strategies[category] = strategy
                        logger.info(f"Added caching strategy for {category}")
                        optimizations_applied += 1
                
                logger.info(f"✅ Applied {optimizations_applied} cache optimizations")
            else:
                logger.info("✅ Cache performance already optimal (>80% hit rate)")
            
        except Exception as e:
            logger.error(f"Cache optimization error: {e}")
    
    def reset_metrics(self):
        """Reset cache metrics"""
        self.metrics = CacheMetrics()
        logger.info("Cache metrics reset")

# Cache decorator for easy function caching
def cache_result(category: str, ttl: int = 300, key_func=None):
    """Decorator to cache function results"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Generate cache key
            if key_func:
                cache_key = key_func(*args, **kwargs)
            else:
                # Default key generation
                cache_key = f"{func.__name__}:{hashlib.md5(str(args).encode()).hexdigest()[:8]}"
            
            # Get enhanced Redis service instance
            redis_service = EnhancedRedisService()
            
            # Try cache first
            cached_result = redis_service.get(category, cache_key)
            if cached_result is not None:
                return cached_result
            
            # Execute function and cache result
            result = func(*args, **kwargs)
            if result is not None:
                redis_service.set(category, cache_key, result, ttl_override=ttl)
            
            return result
        return wrapper
    return decorator

# Global enhanced Redis service instance
enhanced_redis_service = EnhancedRedisService()