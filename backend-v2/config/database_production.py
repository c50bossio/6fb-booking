"""
Production Database Configuration for BookedBarber V2
====================================================

This module contains optimized database configurations for production deployment.
Includes connection pooling, monitoring, and performance settings.
"""

import os
from typing import Dict, Any, Optional
from sqlalchemy import create_engine, pool
from sqlalchemy.orm import sessionmaker
from sqlalchemy.engine import Engine
import logging

logger = logging.getLogger(__name__)


class ProductionDatabaseConfig:
    """Production-optimized database configuration."""
    
    # Connection Pool Settings
    POOL_SETTINGS = {
        'postgresql': {
            'poolclass': pool.QueuePool,
            'pool_size': 20,                    # Base connections in pool
            'max_overflow': 50,                 # Additional connections under load
            'pool_timeout': 30,                 # Seconds to wait for connection
            'pool_recycle': 3600,               # Recycle connections every hour
            'pool_pre_ping': True,              # Verify connections before use
            'pool_reset_on_return': 'commit',   # Reset connection state
        },
        'sqlite': {
            'poolclass': pool.StaticPool,
            'pool_timeout': 20,
            'pool_recycle': 3600,
            'connect_args': {
                'check_same_thread': False,
                'timeout': 20
            }
        }
    }
    
    # PostgreSQL Connection Parameters
    POSTGRESQL_CONNECT_ARGS = {
        'connect_timeout': 10,                  # Connection timeout
        'statement_timeout': 30000,             # Query timeout (30 seconds)
        'idle_in_transaction_session_timeout': 60000,  # Idle transaction timeout
        'application_name': 'BookedBarber_V2',
        'options': '-c default_transaction_isolation=read_committed'
    }
    
    # Performance Monitoring Settings
    MONITORING_CONFIG = {
        'echo': False,                          # Set to True for query logging
        'echo_pool': False,                     # Set to True for pool logging
        'enable_query_profiling': True,         # Custom query profiling
        'slow_query_threshold': 1.0,            # Log queries > 1 second
        'connection_timeout_threshold': 5.0,    # Log connection waits > 5 seconds
    }
    
    @classmethod
    def create_production_engine(
        cls, 
        database_url: str, 
        **engine_kwargs
    ) -> Engine:
        """Create a production-optimized database engine.
        
        Args:
            database_url: Database connection URL
            **engine_kwargs: Additional engine arguments
            
        Returns:
            Configured SQLAlchemy engine
        """
        # Determine database type
        is_postgresql = database_url.startswith('postgresql')
        
        # Base engine configuration
        config = {
            'echo': cls.MONITORING_CONFIG['echo'],
            'echo_pool': cls.MONITORING_CONFIG['echo_pool'],
            'future': True,  # Use SQLAlchemy 2.0 style
        }
        
        # Add pool settings based on database type
        if is_postgresql:
            config.update(cls.POOL_SETTINGS['postgresql'])
            config['connect_args'] = cls.POSTGRESQL_CONNECT_ARGS.copy()
        else:
            config.update(cls.POOL_SETTINGS['sqlite'])
            
        # Override with any provided kwargs
        config.update(engine_kwargs)
        
        # Create engine
        engine = create_engine(database_url, **config)
        
        # Setup monitoring if enabled
        if cls.MONITORING_CONFIG['enable_query_profiling']:
            cls._setup_query_profiling(engine)
            
        logger.info(f"Production database engine created for: {database_url[:50]}...")
        logger.info(f"Pool size: {config.get('pool_size', 'N/A')}, "
                   f"Max overflow: {config.get('max_overflow', 'N/A')}")
        
        return engine
    
    @classmethod
    def _setup_query_profiling(cls, engine: Engine):
        """Setup query profiling and monitoring."""
        from sqlalchemy import event
        import time
        
        slow_threshold = cls.MONITORING_CONFIG['slow_query_threshold']
        timeout_threshold = cls.MONITORING_CONFIG['connection_timeout_threshold']
        
        @event.listens_for(engine, "before_cursor_execute")
        def receive_before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
            context._query_start_time = time.time()
            
        @event.listens_for(engine, "after_cursor_execute")
        def receive_after_cursor_execute(conn, cursor, statement, parameters, context, executemany):
            total_time = time.time() - context._query_start_time
            
            if total_time > slow_threshold:
                logger.warning(f"Slow query detected: {total_time:.3f}s")
                logger.warning(f"Query: {statement[:200]}...")
                
        @event.listens_for(engine, "connect")
        def receive_connect(dbapi_connection, connection_record):
            logger.debug("Database connection established")
            
        @event.listens_for(engine, "checkout")
        def receive_checkout(dbapi_connection, connection_record, connection_proxy):
            connection_record.checkout_time = time.time()
            
        @event.listens_for(engine, "checkin")
        def receive_checkin(dbapi_connection, connection_record):
            if hasattr(connection_record, 'checkout_time'):
                checkout_duration = time.time() - connection_record.checkout_time
                if checkout_duration > timeout_threshold:
                    logger.warning(f"Long connection checkout: {checkout_duration:.3f}s")
    
    @classmethod
    def get_session_factory(cls, engine: Engine) -> sessionmaker:
        """Create a session factory with production settings.
        
        Args:
            engine: Database engine
            
        Returns:
            Configured session factory
        """
        return sessionmaker(
            bind=engine,
            autocommit=False,
            autoflush=False,    # Explicit control over when to flush
            expire_on_commit=False  # Keep objects accessible after commit
        )


class DatabaseHealthChecker:
    """Health checking utilities for production monitoring."""
    
    def __init__(self, engine: Engine):
        self.engine = engine
        
    def check_connection_health(self) -> Dict[str, Any]:
        """Check database connection health."""
        try:
            # Test basic connection
            with self.engine.connect() as conn:
                result = conn.execute("SELECT 1")
                result.fetchone()
                
            # Get pool status
            pool = self.engine.pool
            pool_status = {
                'pool_size': pool.size(),
                'checked_in': pool.checkedin(),
                'checked_out': pool.checkedout(),
                'overflow': pool.overflow(),
                'invalid': pool.invalid()
            }
            
            return {
                'status': 'healthy',
                'connection_test': 'passed',
                'pool_status': pool_status
            }
            
        except Exception as e:
            return {
                'status': 'unhealthy',
                'error': str(e),
                'connection_test': 'failed'
            }
    
    def get_database_stats(self) -> Optional[Dict[str, Any]]:
        """Get database-specific statistics (PostgreSQL only)."""
        if not str(self.engine.url).startswith('postgresql'):
            return None
            
        try:
            with self.engine.connect() as conn:
                # Database size
                size_result = conn.execute("""
                    SELECT pg_size_pretty(pg_database_size(current_database())) as db_size
                """).fetchone()
                
                # Connection stats
                conn_result = conn.execute("""
                    SELECT 
                        count(*) as total_connections,
                        count(*) FILTER (WHERE state = 'active') as active_connections,
                        count(*) FILTER (WHERE state = 'idle') as idle_connections
                    FROM pg_stat_activity 
                    WHERE datname = current_database()
                """).fetchone()
                
                # Cache hit ratio
                cache_result = conn.execute("""
                    SELECT 
                        round(sum(blks_hit) * 100.0 / sum(blks_hit + blks_read), 2) as cache_hit_ratio
                    FROM pg_stat_database
                    WHERE datname = current_database()
                """).fetchone()
                
                return {
                    'database_size': size_result[0] if size_result else 'unknown',
                    'total_connections': conn_result[0] if conn_result else 0,
                    'active_connections': conn_result[1] if conn_result else 0,
                    'idle_connections': conn_result[2] if conn_result else 0,
                    'cache_hit_ratio': cache_result[0] if cache_result else 0
                }
                
        except Exception as e:
            logger.error(f"Error getting database stats: {e}")
            return None


# Environment-specific configurations
def get_production_config() -> Dict[str, Any]:
    """Get production database configuration."""
    return {
        'database_url': os.getenv('DATABASE_URL'),
        'pool_size': int(os.getenv('DB_POOL_SIZE', '20')),
        'max_overflow': int(os.getenv('DB_MAX_OVERFLOW', '50')),
        'pool_timeout': int(os.getenv('DB_POOL_TIMEOUT', '30')),
        'enable_monitoring': os.getenv('DB_ENABLE_MONITORING', 'true').lower() == 'true',
        'slow_query_threshold': float(os.getenv('DB_SLOW_QUERY_THRESHOLD', '1.0'))
    }


def get_staging_config() -> Dict[str, Any]:
    """Get staging database configuration."""
    config = get_production_config()
    # Reduce pool sizes for staging
    config.update({
        'pool_size': 10,
        'max_overflow': 20,
        'enable_monitoring': True,  # Always monitor in staging
        'slow_query_threshold': 0.5  # Lower threshold for testing
    })
    return config


def get_development_config() -> Dict[str, Any]:
    """Get development database configuration."""
    return {
        'database_url': os.getenv('DATABASE_URL', 'sqlite:///./dev.db'),
        'pool_size': 5,
        'max_overflow': 10,
        'pool_timeout': 20,
        'enable_monitoring': True,
        'slow_query_threshold': 0.1,  # Very low threshold for development
        'echo': os.getenv('DB_ECHO', 'false').lower() == 'true'
    }


# Factory function for creating configured engines
def create_optimized_engine(environment: str = 'production') -> Engine:
    """Create an optimized database engine for the specified environment.
    
    Args:
        environment: 'production', 'staging', or 'development'
        
    Returns:
        Configured SQLAlchemy engine
    """
    config_map = {
        'production': get_production_config,
        'staging': get_staging_config,
        'development': get_development_config
    }
    
    if environment not in config_map:
        raise ValueError(f"Unknown environment: {environment}")
        
    config = config_map[environment]()
    database_url = config.pop('database_url')
    
    if not database_url:
        raise ValueError("DATABASE_URL not configured")
        
    return ProductionDatabaseConfig.create_production_engine(
        database_url=database_url,
        **config
    )