"""
AI Business Calendar - Advanced Database Configuration
====================================================
Production-grade database setup with connection pooling, read replicas,
performance optimization, and monitoring for the AI Business Calendar system.
"""

from sqlalchemy import create_engine, event, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import QueuePool, StaticPool
from sqlalchemy.exc import SQLAlchemyError, DisconnectionError
from contextlib import contextmanager, asynccontextmanager
from typing import Dict, Any, Optional, List, Union, AsyncGenerator
import asyncio
import time
import logging
import threading
from dataclasses import dataclass
from enum import Enum
import psutil
import redis
from prometheus_client import Counter, Histogram, Gauge
import hashlib
import json
import os
from functools import wraps

logger = logging.getLogger(__name__)

# Metrics for monitoring
db_connections_active = Gauge('db_connections_active', 'Active database connections')
db_connections_total = Counter('db_connections_total', 'Total database connections created')
db_query_duration = Histogram('db_query_duration_seconds', 'Database query duration')
db_query_errors = Counter('db_query_errors_total', 'Database query errors', ['error_type'])
db_connection_pool_size = Gauge('db_connection_pool_size', 'Connection pool size')
db_connection_pool_checked_out = Gauge('db_connection_pool_checked_out', 'Checked out connections')

class DatabaseRole(Enum):
    """Database role enumeration"""
    PRIMARY = "primary"
    REPLICA = "replica"
    ANALYTICS = "analytics"

class QueryType(Enum):
    """Query type enumeration for routing"""
    READ = "read"
    WRITE = "write"
    ANALYTICS = "analytics"

@dataclass
class DatabaseConfig:
    """Database configuration dataclass"""
    url: str
    role: DatabaseRole
    pool_size: int = 20
    max_overflow: int = 30
    pool_timeout: int = 30
    pool_recycle: int = 3600
    pool_pre_ping: bool = True
    echo: bool = False
    statement_timeout: int = 30000
    lock_timeout: int = 10000
    weight: float = 1.0  # For load balancing
    health_check_interval: int = 30
    
class DatabaseConnectionManager:
    """
    Advanced database connection manager with connection pooling,
    read replicas, health monitoring, and performance optimization.
    """
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.engines: Dict[DatabaseRole, List[Engine]] = {
            DatabaseRole.PRIMARY: [],
            DatabaseRole.REPLICA: [],
            DatabaseRole.ANALYTICS: []
        }
        self.session_factories: Dict[DatabaseRole, List[sessionmaker]] = {
            DatabaseRole.PRIMARY: [],
            DatabaseRole.REPLICA: [],
            DatabaseRole.ANALYTICS: []
        }
        self.health_status: Dict[str, bool] = {}
        self.connection_weights: Dict[str, float] = {}
        self.query_cache = None
        self.metrics_lock = threading.Lock()
        self._setup_engines()
        self._setup_query_cache()
        self._start_health_monitoring()
    
    def _setup_engines(self):
        """Setup database engines with connection pooling"""
        try:
            # Primary database
            primary_config = DatabaseConfig(
                url=self.config["url"],
                role=DatabaseRole.PRIMARY,
                pool_size=self.config.get("pool_size", 20),
                max_overflow=self.config.get("max_overflow", 30),
                pool_timeout=self.config.get("pool_timeout", 30),
                pool_recycle=self.config.get("pool_recycle", 3600),
                pool_pre_ping=self.config.get("pool_pre_ping", True),
                echo=self.config.get("echo", False)
            )
            
            primary_engine = self._create_engine(primary_config)
            self.engines[DatabaseRole.PRIMARY].append(primary_engine)
            self.session_factories[DatabaseRole.PRIMARY].append(
                sessionmaker(bind=primary_engine, expire_on_commit=False)
            )
            
            logger.info(f"Primary database engine created: {self._mask_url(primary_config.url)}")
            
            # Read replica setup
            if "read_replica" in self.config and self.config["read_replica"]:
                replica_config = DatabaseConfig(
                    url=self.config["read_replica"]["url"],
                    role=DatabaseRole.REPLICA,
                    pool_size=max(10, self.config.get("pool_size", 20) // 2),
                    max_overflow=max(15, self.config.get("max_overflow", 30) // 2),
                    pool_timeout=self.config.get("pool_timeout", 30),
                    pool_recycle=self.config.get("pool_recycle", 3600),
                    pool_pre_ping=True,
                    echo=self.config.get("echo", False),
                    weight=self.config["read_replica"].get("weight", 0.3)
                )
                
                replica_engine = self._create_engine(replica_config)
                self.engines[DatabaseRole.REPLICA].append(replica_engine)
                self.session_factories[DatabaseRole.REPLICA].append(
                    sessionmaker(bind=replica_engine, expire_on_commit=False)
                )
                
                self.connection_weights[replica_config.url] = replica_config.weight
                logger.info(f"Read replica engine created: {self._mask_url(replica_config.url)}")
            
            # Analytics database (if configured)
            if "analytics" in self.config and self.config["analytics"]:
                analytics_config = DatabaseConfig(
                    url=self.config["analytics"]["url"],
                    role=DatabaseRole.ANALYTICS,
                    pool_size=max(5, self.config.get("pool_size", 20) // 4),
                    max_overflow=max(10, self.config.get("max_overflow", 30) // 3),
                    pool_timeout=60,  # Longer timeout for analytics
                    pool_recycle=7200,  # Longer recycle for analytics
                    pool_pre_ping=True,
                    echo=False
                )
                
                analytics_engine = self._create_engine(analytics_config)
                self.engines[DatabaseRole.ANALYTICS].append(analytics_engine)
                self.session_factories[DatabaseRole.ANALYTICS].append(
                    sessionmaker(bind=analytics_engine, expire_on_commit=False)
                )
                
                logger.info(f"Analytics database engine created: {self._mask_url(analytics_config.url)}")
                
        except Exception as e:
            logger.error(f"Failed to setup database engines: {e}")
            raise
    
    def _create_engine(self, config: DatabaseConfig) -> Engine:
        """Create optimized database engine with monitoring"""
        engine_args = {
            "pool_size": config.pool_size,
            "max_overflow": config.max_overflow,
            "pool_timeout": config.pool_timeout,
            "pool_recycle": config.pool_recycle,
            "pool_pre_ping": config.pool_pre_ping,
            "echo": config.echo,
            "poolclass": QueuePool,
            "connect_args": {
                "options": f"-c statement_timeout={config.statement_timeout}ms "
                          f"-c lock_timeout={config.lock_timeout}ms "
                          f"-c idle_in_transaction_session_timeout=60000ms"
            }
        }
        
        # SQLite specific optimizations
        if config.url.startswith("sqlite"):
            engine_args.update({
                "poolclass": StaticPool,
                "connect_args": {
                    "check_same_thread": False,
                    "timeout": 30
                }
            })
            logger.warning("Using SQLite - not recommended for production")
        
        engine = create_engine(config.url, **engine_args)
        
        # Add event listeners for monitoring
        self._add_engine_listeners(engine, config)
        
        # Update metrics
        db_connection_pool_size.set(config.pool_size)
        
        return engine
    
    def _add_engine_listeners(self, engine: Engine, config: DatabaseConfig):
        """Add event listeners for database monitoring"""
        
        @event.listens_for(engine, "connect")
        def on_connect(dbapi_connection, connection_record):
            """Handle new database connections"""
            with self.metrics_lock:
                db_connections_total.inc()
                db_connections_active.inc()
                
            logger.debug(f"New database connection established to {config.role.value}")
            
            # PostgreSQL specific optimizations
            if not config.url.startswith("sqlite"):
                with dbapi_connection.cursor() as cursor:
                    # Set connection-level optimizations
                    cursor.execute("SET synchronous_commit = OFF")
                    cursor.execute("SET wal_writer_delay = '200ms'")
                    cursor.execute("SET checkpoint_segments = 32")
                    cursor.execute("SET checkpoint_completion_target = 0.9")
        
        @event.listens_for(engine, "checkout")
        def on_checkout(dbapi_connection, connection_record, connection_proxy):
            """Handle connection checkout from pool"""
            db_connection_pool_checked_out.inc()
        
        @event.listens_for(engine, "checkin")
        def on_checkin(dbapi_connection, connection_record):
            """Handle connection checkin to pool"""
            db_connection_pool_checked_out.dec()
        
        @event.listens_for(engine, "close")
        def on_close(dbapi_connection, connection_record):
            """Handle connection close"""
            with self.metrics_lock:
                db_connections_active.dec()
                
            logger.debug(f"Database connection closed to {config.role.value}")
        
        @event.listens_for(engine, "before_cursor_execute")
        def before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
            """Track query execution time start"""
            context._query_start_time = time.time()
        
        @event.listens_for(engine, "after_cursor_execute")
        def after_cursor_execute(conn, cursor, statement, parameters, context, executemany):
            """Track query execution time end"""
            if hasattr(context, '_query_start_time'):
                duration = time.time() - context._query_start_time
                db_query_duration.observe(duration)
                
                # Log slow queries
                if duration > 1.0:  # Queries slower than 1 second
                    logger.warning(f"Slow query detected ({duration:.2f}s): {statement[:100]}...")
    
    def _setup_query_cache(self):
        """Setup Redis-based query result cache"""
        try:
            cache_config = self.config.get("cache", {})
            if cache_config.get("enabled", True):
                # Get Redis password from environment (secure configuration)
                redis_password = os.getenv("REDIS_PASSWORD")
                
                self.query_cache = redis.Redis(
                    host=cache_config.get("host", "localhost"),
                    port=cache_config.get("port", 6379),
                    password=redis_password,
                    db=cache_config.get("db", 3),  # Separate DB for query cache
                    decode_responses=True,
                    socket_timeout=5,
                    socket_connect_timeout=5,
                    retry_on_timeout=True,
                    health_check_interval=30
                )
                logger.info("Query cache enabled with Redis")
        except Exception as e:
            logger.warning(f"Failed to setup query cache: {e}")
            self.query_cache = None
    
    def _start_health_monitoring(self):
        """Start health monitoring for all database connections"""
        def health_monitor():
            while True:
                try:
                    for role, engines in self.engines.items():
                        for engine in engines:
                            engine_id = f"{role.value}_{id(engine)}"
                            try:
                                with engine.connect() as conn:
                                    conn.execute(text("SELECT 1"))
                                    self.health_status[engine_id] = True
                            except Exception as e:
                                self.health_status[engine_id] = False
                                logger.error(f"Health check failed for {engine_id}: {e}")
                                db_query_errors.labels(error_type="health_check").inc()
                    
                    time.sleep(30)  # Health check every 30 seconds
                except Exception as e:
                    logger.error(f"Health monitoring error: {e}")
                    time.sleep(60)  # Longer sleep on error
        
        health_thread = threading.Thread(target=health_monitor, daemon=True)
        health_thread.start()
        logger.info("Database health monitoring started")
    
    def get_engine(self, query_type: QueryType = QueryType.WRITE) -> Engine:
        """Get appropriate database engine based on query type"""
        try:
            if query_type == QueryType.WRITE:
                # Always use primary for writes
                engines = self.engines[DatabaseRole.PRIMARY]
                if not engines:
                    raise ValueError("No primary database engine available")
                return engines[0]  # For now, just return the first primary engine
            
            elif query_type == QueryType.READ:
                # Use read replica if available and healthy, otherwise primary
                replica_engines = self.engines[DatabaseRole.REPLICA]
                if replica_engines:
                    for engine in replica_engines:
                        engine_id = f"{DatabaseRole.REPLICA.value}_{id(engine)}"
                        if self.health_status.get(engine_id, True):
                            return engine
                
                # Fallback to primary
                primary_engines = self.engines[DatabaseRole.PRIMARY]
                if not primary_engines:
                    raise ValueError("No database engines available")
                return primary_engines[0]
            
            elif query_type == QueryType.ANALYTICS:
                # Use dedicated analytics engine if available
                analytics_engines = self.engines[DatabaseRole.ANALYTICS]
                if analytics_engines:
                    for engine in analytics_engines:
                        engine_id = f"{DatabaseRole.ANALYTICS.value}_{id(engine)}"
                        if self.health_status.get(engine_id, True):
                            return engine
                
                # Fallback to replica, then primary
                return self.get_engine(QueryType.READ)
            
            else:
                raise ValueError(f"Unknown query type: {query_type}")
                
        except Exception as e:
            logger.error(f"Failed to get database engine: {e}")
            db_query_errors.labels(error_type="engine_selection").inc()
            raise
    
    @contextmanager
    def get_session(self, query_type: QueryType = QueryType.WRITE):
        """Get database session with automatic cleanup"""
        engine = self.get_engine(query_type)
        
        # Find corresponding session factory
        for role, engines in self.engines.items():
            if engine in engines:
                session_factory = self.session_factories[role][engines.index(engine)]
                break
        else:
            raise ValueError("Could not find session factory for engine")
        
        session = session_factory()
        try:
            yield session
            session.commit()
        except Exception as e:
            session.rollback()
            logger.error(f"Database session error: {e}")
            db_query_errors.labels(error_type="session_error").inc()
            raise
        finally:
            session.close()
    
    def execute_cached_query(self, query: str, params: Dict = None, ttl: int = 300) -> Any:
        """Execute query with caching support"""
        if not self.query_cache:
            # No cache available, execute directly
            with self.get_session(QueryType.READ) as session:
                result = session.execute(text(query), params or {})
                return result.fetchall()
        
        # Generate cache key
        cache_key = self._generate_cache_key(query, params)
        
        try:
            # Try to get from cache first
            cached_result = self.query_cache.get(cache_key)
            if cached_result:
                return json.loads(cached_result)
        except Exception as e:
            logger.warning(f"Cache read error: {e}")
        
        # Execute query
        with self.get_session(QueryType.READ) as session:
            result = session.execute(text(query), params or {})
            data = result.fetchall()
            
            # Convert to JSON-serializable format
            serializable_data = []
            for row in data:
                if hasattr(row, '_asdict'):
                    serializable_data.append(row._asdict())
                else:
                    serializable_data.append(dict(row))
        
        # Cache the result
        try:
            self.query_cache.setex(
                cache_key,
                ttl,
                json.dumps(serializable_data, default=str)
            )
        except Exception as e:
            logger.warning(f"Cache write error: {e}")
        
        return data
    
    def _generate_cache_key(self, query: str, params: Dict = None) -> str:
        """Generate cache key for query and parameters"""
        query_hash = hashlib.md5(query.encode()).hexdigest()
        if params:
            params_hash = hashlib.md5(json.dumps(params, sort_keys=True).encode()).hexdigest()
            return f"query_cache:{query_hash}:{params_hash}"
        return f"query_cache:{query_hash}"
    
    def invalidate_cache_pattern(self, pattern: str):
        """Invalidate cache entries matching pattern"""
        if not self.query_cache:
            return
        
        try:
            keys = self.query_cache.keys(f"query_cache:*{pattern}*")
            if keys:
                self.query_cache.delete(*keys)
                logger.info(f"Invalidated {len(keys)} cache entries matching pattern: {pattern}")
        except Exception as e:
            logger.error(f"Cache invalidation error: {e}")
    
    def get_connection_stats(self) -> Dict[str, Any]:
        """Get connection pool statistics"""
        stats = {
            "engines": {},
            "health_status": self.health_status.copy(),
            "system_metrics": {
                "memory_usage_mb": psutil.Process().memory_info().rss / 1024 / 1024,
                "cpu_percent": psutil.Process().cpu_percent(),
            }
        }
        
        for role, engines in self.engines.items():
            role_stats = []
            for engine in engines:
                if hasattr(engine.pool, 'size'):
                    pool_stats = {
                        "pool_size": engine.pool.size(),
                        "checked_out": engine.pool.checkedout(),
                        "overflow": engine.pool.overflow(),
                        "invalid": engine.pool.invalid(),
                    }
                else:
                    pool_stats = {"pool_type": "StaticPool"}
                
                role_stats.append(pool_stats)
            
            stats["engines"][role.value] = role_stats
        
        return stats
    
    def _mask_url(self, url: str) -> str:
        """Mask sensitive information in database URL"""
        import re
        return re.sub(r'://[^:]+:[^@]+@', '://***:***@', url)
    
    def close_all_connections(self):
        """Close all database connections"""
        for role, engines in self.engines.items():
            for engine in engines:
                engine.dispose()
                logger.info(f"Closed connections for {role.value} database")
        
        if self.query_cache:
            self.query_cache.close()
            logger.info("Closed query cache connection")

# Query routing decorator
def route_query(query_type: QueryType):
    """Decorator to automatically route queries to appropriate database"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Get database manager from context or dependency injection
            db_manager = kwargs.pop('db_manager', None)
            if not db_manager:
                raise ValueError("Database manager not provided")
            
            with db_manager.get_session(query_type) as session:
                kwargs['session'] = session
                return func(*args, **kwargs)
        return wrapper
    return decorator

# Example usage functions
@route_query(QueryType.READ)
def get_calendar_events(user_id: int, start_date: str, end_date: str, session: Session, **kwargs):
    """Example read query function"""
    query = text("""
        SELECT id, title, start_time, end_time, description
        FROM calendar_events 
        WHERE user_id = :user_id 
        AND start_time >= :start_date 
        AND start_time <= :end_date
        ORDER BY start_time
    """)
    
    result = session.execute(query, {
        "user_id": user_id,
        "start_date": start_date,
        "end_date": end_date
    })
    
    return result.fetchall()

@route_query(QueryType.WRITE)
def create_calendar_event(event_data: Dict[str, Any], session: Session, **kwargs):
    """Example write query function"""
    query = text("""
        INSERT INTO calendar_events (user_id, title, start_time, end_time, description, created_at)
        VALUES (:user_id, :title, :start_time, :end_time, :description, NOW())
        RETURNING id
    """)
    
    result = session.execute(query, event_data)
    return result.fetchone()

@route_query(QueryType.ANALYTICS)
def get_usage_analytics(start_date: str, end_date: str, session: Session, **kwargs):
    """Example analytics query function"""
    query = text("""
        SELECT 
            DATE(created_at) as date,
            COUNT(*) as events_created,
            COUNT(DISTINCT user_id) as unique_users,
            AVG(EXTRACT(EPOCH FROM (end_time - start_time))/60) as avg_duration_minutes
        FROM calendar_events 
        WHERE created_at >= :start_date 
        AND created_at <= :end_date
        GROUP BY DATE(created_at)
        ORDER BY date
    """)
    
    result = session.execute(query, {
        "start_date": start_date,
        "end_date": end_date
    })
    
    return result.fetchall()

# Factory function
def create_database_manager(config: Dict[str, Any]) -> DatabaseConnectionManager:
    """Factory function to create database manager"""
    return DatabaseConnectionManager(config)