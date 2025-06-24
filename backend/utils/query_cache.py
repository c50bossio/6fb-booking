"""
Database Query Caching with SQLAlchemy Integration
Provides intelligent query result caching with model-aware cache invalidation,
bulk query optimization, and cache warming for frequently accessed data.
"""

import hashlib
import time
import json
from typing import Any, Dict, List, Optional, Set, Type, Union, Callable
from dataclasses import dataclass
from collections import defaultdict
import logging
import threading
from contextlib import contextmanager

from sqlalchemy import event, inspect, text
from sqlalchemy.orm import Session, Query
from sqlalchemy.orm.base import instance_state
from sqlalchemy.engine import Engine
from sqlalchemy.ext.declarative import DeclarativeMeta
from sqlalchemy.sql import Select

from services.enhanced_cache_service import cache_service, CacheLevel, SerializationFormat
from config.database import Base

logger = logging.getLogger(__name__)


@dataclass
class QueryCacheConfig:
    """Configuration for query caching"""
    default_ttl: int = 300  # 5 minutes
    max_ttl: int = 3600     # 1 hour
    cache_level: CacheLevel = CacheLevel.BOTH
    enable_model_tracking: bool = True
    enable_bulk_operations: bool = True
    cache_key_prefix: str = "query"
    track_query_stats: bool = True


class QueryKeyGenerator:
    """Generates cache keys for database queries"""
    
    @staticmethod
    def generate_query_key(query: Union[Query, str], params: Optional[Dict[str, Any]] = None) -> str:
        """Generate cache key for query"""
        if isinstance(query, Query):
            # For SQLAlchemy Query objects
            query_str = str(query.statement.compile(compile_kwargs={"literal_binds": True}))
        else:
            # For raw SQL strings
            query_str = str(query)
        
        key_parts = [query_str]
        
        # Add parameters if provided
        if params:
            # Sort parameters for consistent keys
            sorted_params = sorted(params.items())
            key_parts.append(json.dumps(sorted_params, sort_keys=True, default=str))
        
        # Create hash of combined parts
        key_string = "|".join(key_parts)
        return hashlib.sha256(key_string.encode()).hexdigest()
    
    @staticmethod
    def generate_model_key(model_class: Type, primary_key: Any) -> str:
        """Generate cache key for model instance"""
        return f"model:{model_class.__name__}:{primary_key}"
    
    @staticmethod
    def generate_table_tag(model_class: Type) -> str:
        """Generate cache tag for model table"""
        return f"table:{model_class.__tablename__}"


class ModelTracker:
    """Tracks model changes for cache invalidation"""
    
    def __init__(self):
        self.tracked_models: Set[Type] = set()
        self.model_dependencies: Dict[Type, Set[str]] = defaultdict(set)
        self._lock = threading.RLock()
    
    def track_model(self, model_class: Type, cache_tags: Optional[Set[str]] = None):
        """Track model for cache invalidation"""
        with self._lock:
            self.tracked_models.add(model_class)
            if cache_tags:
                self.model_dependencies[model_class].update(cache_tags)
    
    def get_tags_for_model(self, model_class: Type) -> Set[str]:
        """Get cache tags associated with model"""
        with self._lock:
            tags = {QueryKeyGenerator.generate_table_tag(model_class)}
            tags.update(self.model_dependencies.get(model_class, set()))
            return tags
    
    def get_affected_tags(self, models: List[Type]) -> Set[str]:
        """Get all cache tags affected by model changes"""
        affected_tags = set()
        for model_class in models:
            affected_tags.update(self.get_tags_for_model(model_class))
        return affected_tags


class QueryCache:
    """Main query caching implementation"""
    
    def __init__(self, config: Optional[QueryCacheConfig] = None):
        self.config = config or QueryCacheConfig()
        self.model_tracker = ModelTracker()
        self.key_generator = QueryKeyGenerator()
        
        # Statistics
        self.hits = 0
        self.misses = 0
        self.invalidations = 0
        self.errors = 0
        self._stats_lock = threading.Lock()
        
        # Query performance tracking
        self.slow_queries: List[Dict[str, Any]] = []
        self.query_times: Dict[str, float] = {}
        
        logger.info("Query cache initialized")
    
    def cache_query_result(self, 
                          query: Union[Query, str], 
                          result: Any,
                          ttl: Optional[int] = None,
                          tags: Optional[Set[str]] = None,
                          params: Optional[Dict[str, Any]] = None) -> bool:
        """Cache query result"""
        try:
            ttl = ttl or self.config.default_ttl
            ttl = min(ttl, self.config.max_ttl)
            
            cache_key = self.key_generator.generate_query_key(query, params)
            full_key = f"{self.config.cache_key_prefix}:{cache_key}"
            
            # Serialize result for caching
            serialized_result = self._serialize_query_result(result)
            
            success = cache_service.set(
                full_key,
                serialized_result,
                ttl=ttl,
                tags=tags or set(),
                cache_level=self.config.cache_level,
                serialization_format=SerializationFormat.PICKLE  # Better for complex objects
            )
            
            if success:
                logger.debug(f"Cached query result: {cache_key[:16]}...")
            
            return success
            
        except Exception as e:
            logger.error(f"Failed to cache query result: {e}")
            self._record_error()
            return False
    
    def get_cached_result(self, 
                         query: Union[Query, str],
                         params: Optional[Dict[str, Any]] = None) -> Optional[Any]:
        """Get cached query result"""
        try:
            cache_key = self.key_generator.generate_query_key(query, params)
            full_key = f"{self.config.cache_key_prefix}:{cache_key}"
            
            cached_data = cache_service.get(full_key, cache_level=self.config.cache_level)
            
            if cached_data is not None:
                self._record_hit()
                result = self._deserialize_query_result(cached_data)
                logger.debug(f"Query cache HIT: {cache_key[:16]}...")
                return result
            else:
                self._record_miss()
                logger.debug(f"Query cache MISS: {cache_key[:16]}...")
                return None
                
        except Exception as e:
            logger.error(f"Failed to get cached query result: {e}")
            self._record_error()
            return None
    
    def invalidate_by_models(self, model_classes: List[Type]) -> int:
        """Invalidate cache by affected models"""
        try:
            affected_tags = self.model_tracker.get_affected_tags(model_classes)
            if affected_tags:
                count = cache_service.invalidate_by_tags(affected_tags)
                self.invalidations += count
                logger.info(f"Invalidated {count} cached queries for models: {[m.__name__ for m in model_classes]}")
                return count
            return 0
            
        except Exception as e:
            logger.error(f"Failed to invalidate cache by models: {e}")
            self._record_error()
            return 0
    
    def cache_model_instance(self, 
                           instance: Any, 
                           ttl: Optional[int] = None) -> bool:
        """Cache individual model instance"""
        try:
            if not hasattr(instance, '__tablename__'):
                return False
            
            model_class = instance.__class__
            primary_key = self._get_primary_key(instance)
            
            if primary_key is None:
                return False
            
            cache_key = self.key_generator.generate_model_key(model_class, primary_key)
            tags = self.model_tracker.get_tags_for_model(model_class)
            
            # Serialize model instance
            instance_data = self._serialize_model_instance(instance)
            
            return cache_service.set(
                cache_key,
                instance_data,
                ttl=ttl or self.config.default_ttl,
                tags=tags,
                cache_level=self.config.cache_level,
                serialization_format=SerializationFormat.PICKLE
            )
            
        except Exception as e:
            logger.error(f"Failed to cache model instance: {e}")
            self._record_error()
            return False
    
    def get_cached_model(self, 
                        model_class: Type, 
                        primary_key: Any) -> Optional[Any]:
        """Get cached model instance"""
        try:
            cache_key = self.key_generator.generate_model_key(model_class, primary_key)
            cached_data = cache_service.get(cache_key, cache_level=self.config.cache_level)
            
            if cached_data is not None:
                return self._deserialize_model_instance(cached_data, model_class)
            
            return None
            
        except Exception as e:
            logger.error(f"Failed to get cached model: {e}")
            self._record_error()
            return None
    
    def warm_cache_for_model(self, 
                           model_class: Type, 
                           session: Session,
                           limit: int = 100) -> int:
        """Warm cache with frequently accessed model instances"""
        try:
            # Get most recently accessed instances
            query = session.query(model_class).limit(limit)
            instances = query.all()
            
            cached_count = 0
            for instance in instances:
                if self.cache_model_instance(instance):
                    cached_count += 1
            
            logger.info(f"Warmed cache with {cached_count} {model_class.__name__} instances")
            return cached_count
            
        except Exception as e:
            logger.error(f"Failed to warm cache for model {model_class.__name__}: {e}")
            self._record_error()
            return 0
    
    def track_query_performance(self, query_key: str, execution_time: float):
        """Track query performance for optimization"""
        if self.config.track_query_stats:
            self.query_times[query_key] = execution_time
            
            # Track slow queries
            if execution_time > 1.0:  # Queries slower than 1 second
                self.slow_queries.append({
                    'query_key': query_key,
                    'execution_time': execution_time,
                    'timestamp': time.time()
                })
                
                # Keep only recent slow queries
                if len(self.slow_queries) > 100:
                    self.slow_queries = self.slow_queries[-50:]
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get cache statistics"""
        with self._stats_lock:
            total_requests = self.hits + self.misses
            hit_rate = (self.hits / total_requests * 100) if total_requests > 0 else 0
            
            return {
                "hits": self.hits,
                "misses": self.misses,
                "hit_rate_percent": round(hit_rate, 2),
                "invalidations": self.invalidations,
                "errors": self.errors,
                "tracked_models": len(self.model_tracker.tracked_models),
                "slow_queries_count": len(self.slow_queries),
                "avg_query_time": sum(self.query_times.values()) / len(self.query_times) if self.query_times else 0
            }
    
    def _serialize_query_result(self, result: Any) -> Any:
        """Serialize query result for caching"""
        if isinstance(result, list):
            # Handle list of model instances
            return [self._serialize_model_instance(item) if hasattr(item, '__tablename__') else item 
                   for item in result]
        elif hasattr(result, '__tablename__'):
            # Handle single model instance
            return self._serialize_model_instance(result)
        else:
            # Handle scalar results
            return result
    
    def _deserialize_query_result(self, cached_data: Any) -> Any:
        """Deserialize cached query result"""
        if isinstance(cached_data, list):
            # Handle list of potentially mixed data
            return [self._deserialize_model_instance(item, None) if isinstance(item, dict) and 'model_class' in item else item
                   for item in cached_data]
        elif isinstance(cached_data, dict) and 'model_class' in cached_data:
            # Handle single model instance
            return self._deserialize_model_instance(cached_data, None)
        else:
            # Handle scalar results
            return cached_data
    
    def _serialize_model_instance(self, instance: Any) -> Dict[str, Any]:
        """Serialize model instance to dict"""
        if not hasattr(instance, '__tablename__'):
            return instance
        
        # Get model attributes
        mapper = inspect(instance.__class__)
        data = {}
        
        for column in mapper.columns:
            value = getattr(instance, column.name, None)
            # Handle datetime and other non-JSON serializable types
            if hasattr(value, 'isoformat'):
                data[column.name] = value.isoformat()
            else:
                data[column.name] = value
        
        # Store model class information for deserialization
        data['model_class'] = f"{instance.__class__.__module__}.{instance.__class__.__name__}"
        
        return data
    
    def _deserialize_model_instance(self, data: Dict[str, Any], model_class: Optional[Type] = None) -> Any:
        """Deserialize dict to model instance"""
        if not isinstance(data, dict):
            return data
        
        if 'model_class' not in data:
            return data
        
        # Get model class
        if model_class is None:
            module_name, class_name = data['model_class'].rsplit('.', 1)
            # This is simplified - in practice, you'd need a model registry
            # For now, we'll just return the data dict
            return {k: v for k, v in data.items() if k != 'model_class'}
        
        # Create instance (simplified - actual implementation would be more complex)
        instance_data = {k: v for k, v in data.items() if k != 'model_class'}
        return instance_data
    
    def _get_primary_key(self, instance: Any) -> Optional[Any]:
        """Get primary key value from model instance"""
        try:
            mapper = inspect(instance.__class__)
            primary_keys = mapper.primary_key
            
            if len(primary_keys) == 1:
                return getattr(instance, primary_keys[0].name)
            else:
                # Composite primary key
                return tuple(getattr(instance, pk.name) for pk in primary_keys)
                
        except Exception:
            return None
    
    def _record_hit(self):
        with self._stats_lock:
            self.hits += 1
    
    def _record_miss(self):
        with self._stats_lock:
            self.misses += 1
    
    def _record_error(self):
        with self._stats_lock:
            self.errors += 1


class CachedQuery:
    """Wrapper for cached query execution"""
    
    def __init__(self, session: Session, query_cache: QueryCache):
        self.session = session
        self.cache = query_cache
    
    def execute_cached(self, 
                      query: Union[Query, str],
                      params: Optional[Dict[str, Any]] = None,
                      ttl: Optional[int] = None,
                      tags: Optional[Set[str]] = None,
                      force_refresh: bool = False) -> Any:
        """Execute query with caching"""
        start_time = time.time()
        
        try:
            # Check cache first (unless force refresh)
            if not force_refresh:
                cached_result = self.cache.get_cached_result(query, params)
                if cached_result is not None:
                    return cached_result
            
            # Execute query
            if isinstance(query, Query):
                result = query.all() if hasattr(query, 'all') else query
            else:
                # Raw SQL query
                if params:
                    result = self.session.execute(text(query), params).fetchall()
                else:
                    result = self.session.execute(text(query)).fetchall()
            
            # Cache result
            execution_time = time.time() - start_time
            query_key = self.cache.key_generator.generate_query_key(query, params)
            self.cache.track_query_performance(query_key, execution_time)
            
            self.cache.cache_query_result(query, result, ttl, tags, params)
            
            return result
            
        except Exception as e:
            logger.error(f"Cached query execution failed: {e}")
            raise


# SQLAlchemy event listeners for automatic cache invalidation
def setup_cache_invalidation_listeners(query_cache: QueryCache):
    """Setup SQLAlchemy event listeners for automatic cache invalidation"""
    
    @event.listens_for(Session, 'after_commit')
    def invalidate_cache_on_commit(session):
        """Invalidate cache after database commit"""
        if not hasattr(session, '_changed_models'):
            return
        
        changed_models = list(session._changed_models)
        if changed_models:
            query_cache.invalidate_by_models(changed_models)
            delattr(session, '_changed_models')
    
    @event.listens_for(Session, 'after_flush')
    def track_model_changes(session, flush_context):
        """Track model changes during flush"""
        if not hasattr(session, '_changed_models'):
            session._changed_models = set()
        
        # Track new instances
        for instance in session.new:
            if hasattr(instance, '__tablename__'):
                session._changed_models.add(instance.__class__)
        
        # Track modified instances
        for instance in session.dirty:
            if hasattr(instance, '__tablename__'):
                session._changed_models.add(instance.__class__)
        
        # Track deleted instances
        for instance in session.deleted:
            if hasattr(instance, '__tablename__'):
                session._changed_models.add(instance.__class__)


# Context manager for cached database sessions
@contextmanager
def cached_session(session_factory: Callable[[], Session], 
                  query_cache: Optional[QueryCache] = None):
    """Context manager for database sessions with query caching"""
    if query_cache is None:
        query_cache = global_query_cache
    
    session = session_factory()
    cached_query = CachedQuery(session, query_cache)
    
    try:
        yield session, cached_query
    finally:
        session.close()


# Decorator for caching query methods
def cache_query(ttl: int = 300, tags: Optional[Set[str]] = None):
    """Decorator for caching query method results"""
    def decorator(func):
        def wrapper(*args, **kwargs):
            # Generate cache key from function name and arguments
            key_parts = [func.__name__]
            key_parts.extend(str(arg) for arg in args[1:])  # Skip self
            key_parts.extend(f"{k}={v}" for k, v in sorted(kwargs.items()))
            
            cache_key = hashlib.md5("|".join(key_parts).encode()).hexdigest()
            
            # Try cache first
            cached_result = cache_service.get(f"method:{cache_key}")
            if cached_result is not None:
                return cached_result
            
            # Execute method
            result = func(*args, **kwargs)
            
            # Cache result
            cache_service.set(
                f"method:{cache_key}",
                result,
                ttl=ttl,
                tags=tags or set()
            )
            
            return result
        
        return wrapper
    return decorator


# Global query cache instance
global_query_cache = QueryCache()

# Export public interface
__all__ = [
    "QueryCache",
    "QueryCacheConfig",
    "CachedQuery",
    "ModelTracker",
    "QueryKeyGenerator",
    "cached_session",
    "cache_query",
    "setup_cache_invalidation_listeners",
    "global_query_cache"
]