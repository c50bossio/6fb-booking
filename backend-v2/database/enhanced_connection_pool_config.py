"""
Enhanced Connection Pool Configuration for 6FB-Booking Platform
Optimizes database connection management for high-performance scenarios
Addresses connection pool underutilization and resource management
"""

import os
import logging
import time
from typing import Dict, Any, Optional, Callable
from contextlib import contextmanager
from dataclasses import dataclass
from enum import Enum
from threading import Lock
import threading

from sqlalchemy import create_engine, event, text, pool
from sqlalchemy.engine import Engine
from sqlalchemy.pool import QueuePool, StaticPool, NullPool
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.exc import DisconnectionError, OperationalError

logger = logging.getLogger(__name__)

class ConnectionPoolStrategy(Enum):
    """Connection pool strategies for different environments"""
    DEVELOPMENT = "development"
    STAGING = "staging"
    PRODUCTION = "production"
    HIGH_PERFORMANCE = "high_performance"
    AI_ANALYTICS = "ai_analytics"

@dataclass
class ConnectionPoolMetrics:
    """Connection pool performance metrics"""
    pool_size: int
    checked_in: int
    checked_out: int
    overflow: int
    invalid: int
    total_connections: int
    utilization_percentage: float
    avg_checkout_duration: float
    long_running_connections: int
    connection_errors: int

@dataclass
class PoolConfiguration:
    """Connection pool configuration parameters"""
    pool_size: int
    max_overflow: int
    pool_timeout: int
    pool_recycle: int
    pool_pre_ping: bool
    echo: bool
    echo_pool: bool
    connect_args: Dict[str, Any]
    strategy: ConnectionPoolStrategy

class EnhancedConnectionPoolManager:
    """Enhanced connection pool manager with performance optimization"""
    
    def __init__(self, database_url: str, strategy: ConnectionPoolStrategy = ConnectionPoolStrategy.PRODUCTION):
        self.database_url = database_url
        self.strategy = strategy
        self.metrics_lock = Lock()
        self.connection_metrics: Dict[str, float] = {}
        self.error_count = 0
        self.engine: Optional[Engine] = None
        self.SessionLocal: Optional[sessionmaker] = None
        
        # Initialize connection pool
        self._initialize_connection_pool()
    
    def _get_pool_configuration(self) -> PoolConfiguration:
        """Get optimized pool configuration based on strategy"""
        
        base_connect_args = {
            "connect_timeout": 10,
            "application_name": f"bookedbarber_{self.strategy.value}"
        }
        
        if self.strategy == ConnectionPoolStrategy.DEVELOPMENT:
            return PoolConfiguration(
                pool_size=5,
                max_overflow=2,
                pool_timeout=10,
                pool_recycle=300,
                pool_pre_ping=True,
                echo=os.getenv("DB_ECHO", "false").lower() == "true",
                echo_pool=False,
                connect_args=base_connect_args,
                strategy=self.strategy
            )
        
        elif self.strategy == ConnectionPoolStrategy.STAGING:
            return PoolConfiguration(
                pool_size=15,
                max_overflow=10,
                pool_timeout=20,
                pool_recycle=1800,
                pool_pre_ping=True,
                echo=False,
                echo_pool=False,
                connect_args={
                    **base_connect_args,
                    "sslmode": "prefer",
                    "options": "-c statement_timeout=60000 -c idle_in_transaction_session_timeout=300000"
                },
                strategy=self.strategy
            )
        
        elif self.strategy == ConnectionPoolStrategy.PRODUCTION:
            return PoolConfiguration(
                pool_size=25,
                max_overflow=15,
                pool_timeout=30,
                pool_recycle=3600,
                pool_pre_ping=True,
                echo=False,
                echo_pool=False,
                connect_args={
                    **base_connect_args,
                    "sslmode": "require",
                    "command_timeout": 60,
                    "options": "-c statement_timeout=30000 -c idle_in_transaction_session_timeout=300000 -c tcp_keepalives_idle=300"
                },
                strategy=self.strategy
            )
        
        elif self.strategy == ConnectionPoolStrategy.HIGH_PERFORMANCE:
            return PoolConfiguration(
                pool_size=40,
                max_overflow=20,
                pool_timeout=45,
                pool_recycle=7200,
                pool_pre_ping=True,
                echo=False,
                echo_pool=False,
                connect_args={
                    **base_connect_args,
                    "sslmode": "require",
                    "command_timeout": 120,
                    "options": "-c statement_timeout=60000 -c idle_in_transaction_session_timeout=600000 -c max_connections=200 -c shared_preload_libraries='pg_stat_statements'"
                },
                strategy=self.strategy
            )
        
        elif self.strategy == ConnectionPoolStrategy.AI_ANALYTICS:
            return PoolConfiguration(
                pool_size=50,
                max_overflow=30,
                pool_timeout=60,
                pool_recycle=10800,  # 3 hours for long-running analytics
                pool_pre_ping=True,
                echo=False,
                echo_pool=False,
                connect_args={
                    **base_connect_args,
                    "sslmode": "require",
                    "command_timeout": 300,  # 5 minutes for complex analytics
                    "options": "-c statement_timeout=300000 -c idle_in_transaction_session_timeout=900000 -c work_mem='256MB' -c maintenance_work_mem='1GB'"
                },
                strategy=self.strategy
            )
        
        else:
            # Default to production configuration
            return self._get_pool_configuration_for_strategy(ConnectionPoolStrategy.PRODUCTION)
    
    def _initialize_connection_pool(self):
        """Initialize connection pool with optimized configuration"""
        config = self._get_pool_configuration()
        
        # Determine if we're using SQLite or PostgreSQL
        is_sqlite = "sqlite" in self.database_url.lower()
        is_postgresql = "postgresql" in self.database_url.lower()
        
        engine_args = {
            "pool_size": config.pool_size,
            "max_overflow": config.max_overflow,
            "pool_timeout": config.pool_timeout,
            "pool_recycle": config.pool_recycle,
            "pool_pre_ping": config.pool_pre_ping,
            "echo": config.echo,
            "echo_pool": config.echo_pool,
            "connect_args": config.connect_args
        }
        
        # Adjust for database type
        if is_sqlite:
            engine_args.update({
                "poolclass": StaticPool,
                "pool_size": 1,
                "max_overflow": 0,
                "connect_args": {"check_same_thread": False}
            })
        elif is_postgresql:
            engine_args["poolclass"] = QueuePool
        
        try:
            self.engine = create_engine(self.database_url, **engine_args)
            self._setup_connection_event_listeners()
            
            # Create session factory
            self.SessionLocal = sessionmaker(
                autocommit=False,
                autoflush=False,
                bind=self.engine,
                expire_on_commit=False  # Performance optimization
            )
            
            logger.info(f"Connection pool initialized with strategy: {self.strategy.value}")
            self._log_pool_configuration(config)
            
        except Exception as e:
            logger.error(f"Failed to initialize connection pool: {e}")
            raise
    
    def _setup_connection_event_listeners(self):
        """Setup comprehensive connection event listeners"""
        
        @event.listens_for(self.engine, "connect")
        def set_connection_pragmas(dbapi_connection, connection_record):
            """Optimize connection settings on connect"""
            if "postgresql" in self.database_url:
                with dbapi_connection.cursor() as cursor:
                    try:
                        # Performance optimizations based on strategy
                        if self.strategy in [ConnectionPoolStrategy.HIGH_PERFORMANCE, ConnectionPoolStrategy.AI_ANALYTICS]:
                            cursor.execute("SET random_page_cost = 1.1")
                            cursor.execute("SET effective_cache_size = '2GB'")
                            cursor.execute("SET work_mem = '64MB'")
                            cursor.execute("SET maintenance_work_mem = '512MB'")
                            cursor.execute("SET max_parallel_workers_per_gather = 4")
                            cursor.execute("SET effective_io_concurrency = 300")
                        else:
                            cursor.execute("SET random_page_cost = 1.5")
                            cursor.execute("SET effective_cache_size = '1GB'")
                            cursor.execute("SET work_mem = '32MB'")
                            cursor.execute("SET maintenance_work_mem = '256MB'")
                        
                        # Connection stability
                        cursor.execute("SET tcp_keepalives_idle = 300")
                        cursor.execute("SET tcp_keepalives_interval = 30")
                        cursor.execute("SET tcp_keepalives_count = 3")
                        
                        # Query optimization
                        cursor.execute("SET synchronous_commit = 'on'")
                        cursor.execute("SET commit_delay = 0")
                        
                    except Exception as e:
                        logger.warning(f"Failed to set connection pragmas: {e}")
            
            # Initialize connection tracking
            connection_record.connect_time = time.time()
            connection_record.checkout_count = 0
            connection_record.total_checkout_time = 0.0
        
        @event.listens_for(self.engine, "checkout")
        def track_checkout(dbapi_connection, connection_record, connection_proxy):
            """Track connection checkout for performance monitoring"""
            connection_record.checkout_time = time.time()
            connection_record.checkout_count += 1
            
            with self.metrics_lock:
                connection_id = id(connection_record)
                self.connection_metrics[f"checkout_{connection_id}"] = connection_record.checkout_time
        
        @event.listens_for(self.engine, "checkin")
        def track_checkin(dbapi_connection, connection_record):
            """Track connection checkin and usage metrics"""
            if hasattr(connection_record, 'checkout_time'):
                usage_time = time.time() - connection_record.checkout_time
                connection_record.total_checkout_time += usage_time
                
                # Alert on long-running connections
                if usage_time > 30:  # 30 seconds threshold
                    logger.warning(f"Long-running connection: {usage_time:.2f}s")
                
                # Track metrics
                with self.metrics_lock:
                    connection_id = id(connection_record)
                    if f"checkout_{connection_id}" in self.connection_metrics:
                        del self.connection_metrics[f"checkout_{connection_id}"]
        
        @event.listens_for(self.engine, "close")
        def track_close(dbapi_connection, connection_record):
            """Track connection close events"""
            logger.debug(f"Connection closed - Total checkouts: {getattr(connection_record, 'checkout_count', 0)}")
        
        @event.listens_for(self.engine, "close_detached")
        def track_close_detached(dbapi_connection):
            """Track detached connection closes"""
            logger.debug("Detached connection closed")
        
        @event.listens_for(self.engine, "invalidate")
        def track_invalidate(dbapi_connection, connection_record, exception):
            """Track connection invalidations"""
            logger.warning(f"Connection invalidated: {exception}")
            with self.metrics_lock:
                self.error_count += 1
    
    def _log_pool_configuration(self, config: PoolConfiguration):
        """Log connection pool configuration"""
        logger.info(f"Connection Pool Configuration:")
        logger.info(f"  Strategy: {config.strategy.value}")
        logger.info(f"  Pool Size: {config.pool_size}")
        logger.info(f"  Max Overflow: {config.max_overflow}")
        logger.info(f"  Pool Timeout: {config.pool_timeout}s")
        logger.info(f"  Pool Recycle: {config.pool_recycle}s")
        logger.info(f"  Pre-ping: {config.pool_pre_ping}")
    
    @contextmanager
    def get_db_session(self):
        """Get database session with enhanced error handling and monitoring"""
        if not self.SessionLocal:
            raise RuntimeError("Connection pool not initialized")
        
        session = self.SessionLocal()
        session_start_time = time.time()
        
        try:
            yield session
            session.commit()
            
        except (DisconnectionError, OperationalError) as e:
            logger.error(f"Database connection error: {e}")
            session.rollback()
            with self.metrics_lock:
                self.error_count += 1
            raise
            
        except Exception as e:
            logger.error(f"Database session error: {e}")
            session.rollback()
            raise
            
        finally:
            session_duration = time.time() - session_start_time
            if session_duration > 5.0:  # Log slow sessions
                logger.warning(f"Slow database session: {session_duration:.2f}s")
            
            session.close()
    
    def get_connection_pool_metrics(self) -> ConnectionPoolMetrics:
        """Get comprehensive connection pool metrics"""
        if not self.engine or not hasattr(self.engine, 'pool'):
            return ConnectionPoolMetrics(0, 0, 0, 0, 0, 0, 0.0, 0.0, 0, self.error_count)
        
        pool_obj = self.engine.pool
        
        try:
            pool_size = pool_obj.size()
            checked_in = pool_obj.checkedin()
            checked_out = pool_obj.checkedout()
            overflow = pool_obj.overflow()
            invalid = pool_obj.invalid()
            
            total_connections = checked_in + checked_out + overflow
            utilization = (checked_out / pool_size * 100) if pool_size > 0 else 0
            
            # Calculate average checkout duration
            with self.metrics_lock:
                active_checkouts = len(self.connection_metrics)
                current_time = time.time()
                total_checkout_time = sum(
                    current_time - checkout_time 
                    for checkout_time in self.connection_metrics.values()
                )
                avg_checkout_duration = (
                    total_checkout_time / active_checkouts 
                    if active_checkouts > 0 else 0.0
                )
                
                # Count long-running connections (>30s)
                long_running = sum(
                    1 for checkout_time in self.connection_metrics.values()
                    if current_time - checkout_time > 30
                )
            
            return ConnectionPoolMetrics(
                pool_size=pool_size,
                checked_in=checked_in,
                checked_out=checked_out,
                overflow=overflow,
                invalid=invalid,
                total_connections=total_connections,
                utilization_percentage=utilization,
                avg_checkout_duration=avg_checkout_duration,
                long_running_connections=long_running,
                connection_errors=self.error_count
            )
            
        except Exception as e:
            logger.error(f"Failed to get pool metrics: {e}")
            return ConnectionPoolMetrics(0, 0, 0, 0, 0, 0, 0.0, 0.0, 0, self.error_count)
    
    def health_check(self) -> Dict[str, Any]:
        """Comprehensive database and connection pool health check"""
        try:
            with self.get_db_session() as session:
                # Test basic connectivity
                start_time = time.time()
                session.execute(text("SELECT 1"))
                query_time = time.time() - start_time
                
                # Get pool metrics
                metrics = self.get_connection_pool_metrics()
                
                # Determine health status
                is_healthy = (
                    query_time < 1.0 and  # Query under 1 second
                    metrics.utilization_percentage < 90 and  # Pool not over-utilized
                    metrics.long_running_connections < 5 and  # Few long-running connections
                    metrics.connection_errors < 10  # Limited connection errors
                )
                
                return {
                    "healthy": is_healthy,
                    "strategy": self.strategy.value,
                    "query_response_time": query_time,
                    "pool_metrics": {
                        "pool_size": metrics.pool_size,
                        "checked_in": metrics.checked_in,
                        "checked_out": metrics.checked_out,
                        "overflow": metrics.overflow,
                        "invalid": metrics.invalid,
                        "utilization_percentage": metrics.utilization_percentage,
                        "avg_checkout_duration": metrics.avg_checkout_duration,
                        "long_running_connections": metrics.long_running_connections,
                        "connection_errors": metrics.connection_errors
                    },
                    "recommendations": self._get_performance_recommendations(metrics),
                    "timestamp": time.time()
                }
                
        except Exception as e:
            logger.error(f"Health check failed: {e}")
            return {
                "healthy": False,
                "error": str(e),
                "strategy": self.strategy.value,
                "timestamp": time.time()
            }
    
    def _get_performance_recommendations(self, metrics: ConnectionPoolMetrics) -> List[str]:
        """Get performance optimization recommendations"""
        recommendations = []
        
        if metrics.utilization_percentage > 80:
            recommendations.append("Consider increasing pool_size - utilization over 80%")
        
        if metrics.long_running_connections > 3:
            recommendations.append("Investigate long-running connections - may indicate slow queries")
        
        if metrics.connection_errors > 5:
            recommendations.append("High connection error rate - check database connectivity")
        
        if metrics.avg_checkout_duration > 10:
            recommendations.append("High average checkout duration - optimize query performance")
        
        if metrics.overflow > metrics.pool_size * 0.5:
            recommendations.append("High overflow usage - consider increasing max_overflow")
        
        if not recommendations:
            recommendations.append("Connection pool performance looks optimal")
        
        return recommendations
    
    def reset_metrics(self):
        """Reset performance metrics"""
        with self.metrics_lock:
            self.connection_metrics.clear()
            self.error_count = 0
        logger.info("Connection pool metrics reset")
    
    def close(self):
        """Close connection pool and cleanup resources"""
        if self.engine:
            self.engine.dispose()
            logger.info("Connection pool closed")

# =====================================================
# FACTORY FUNCTIONS
# =====================================================

def create_connection_pool_manager(
    database_url: str, 
    strategy: str = "production"
) -> EnhancedConnectionPoolManager:
    """Factory function to create connection pool manager"""
    strategy_enum = ConnectionPoolStrategy(strategy.lower())
    return EnhancedConnectionPoolManager(database_url, strategy_enum)

def get_optimal_strategy_for_environment() -> ConnectionPoolStrategy:
    """Determine optimal connection pool strategy based on environment"""
    env = os.getenv("ENVIRONMENT", "development").lower()
    
    if env == "development":
        return ConnectionPoolStrategy.DEVELOPMENT
    elif env == "staging":
        return ConnectionPoolStrategy.STAGING
    elif env == "production":
        if os.getenv("HIGH_PERFORMANCE_MODE", "false").lower() == "true":
            return ConnectionPoolStrategy.HIGH_PERFORMANCE
        elif os.getenv("AI_ANALYTICS_MODE", "false").lower() == "true":
            return ConnectionPoolStrategy.AI_ANALYTICS
        else:
            return ConnectionPoolStrategy.PRODUCTION
    else:
        return ConnectionPoolStrategy.PRODUCTION

# =====================================================
# GLOBAL INSTANCE MANAGEMENT
# =====================================================

_global_pool_manager: Optional[EnhancedConnectionPoolManager] = None
_pool_manager_lock = Lock()

def get_global_connection_pool_manager() -> EnhancedConnectionPoolManager:
    """Get or create global connection pool manager"""
    global _global_pool_manager
    
    if _global_pool_manager is None:
        with _pool_manager_lock:
            if _global_pool_manager is None:
                database_url = os.getenv("DATABASE_URL")
                if not database_url:
                    raise ValueError("DATABASE_URL environment variable not set")
                
                strategy = get_optimal_strategy_for_environment()
                _global_pool_manager = EnhancedConnectionPoolManager(database_url, strategy)
    
    return _global_pool_manager

def reset_global_connection_pool():
    """Reset global connection pool (useful for testing)"""
    global _global_pool_manager
    
    with _pool_manager_lock:
        if _global_pool_manager:
            _global_pool_manager.close()
            _global_pool_manager = None

# =====================================================
# FASTAPI DEPENDENCY FUNCTIONS
# =====================================================

def get_optimized_db_session():
    """FastAPI dependency for optimized database sessions"""
    pool_manager = get_global_connection_pool_manager()
    return pool_manager.get_db_session()

def get_db_health_status() -> Dict[str, Any]:
    """FastAPI endpoint for database health status"""
    pool_manager = get_global_connection_pool_manager()
    return pool_manager.health_check()