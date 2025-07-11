"""
Enhanced Database Connection Pool Configuration

This module provides optimized connection pool settings for both 
development (SQLite) and production (PostgreSQL) environments.
"""

from sqlalchemy import pool
from typing import Dict, Any
import logging

logger = logging.getLogger(__name__)


class ConnectionPoolConfig:
    """Database connection pool configuration manager"""
    
    @staticmethod
    def get_pool_config(database_url: str, environment: str = "development") -> Dict[str, Any]:
        """
        Get optimized connection pool configuration based on database type and environment
        
        Args:
            database_url: The database connection URL
            environment: The deployment environment (development, staging, production)
            
        Returns:
            Dictionary of connection pool settings
        """
        if "sqlite" in database_url:
            return ConnectionPoolConfig._get_sqlite_config()
        elif "postgresql" in database_url or "postgres" in database_url:
            return ConnectionPoolConfig._get_postgresql_config(environment)
        else:
            logger.warning(f"Unknown database type in URL: {database_url}")
            return {}
    
    @staticmethod
    def _get_sqlite_config() -> Dict[str, Any]:
        """SQLite connection pool configuration for development"""
        return {
            "connect_args": {"check_same_thread": False},
            "poolclass": pool.StaticPool,  # Single connection for SQLite
        }
    
    @staticmethod
    def _get_postgresql_config(environment: str) -> Dict[str, Any]:
        """PostgreSQL connection pool configuration for production"""
        
        # Base configuration
        base_config = {
            "poolclass": pool.QueuePool,
            "pool_pre_ping": True,  # Test connections before using
            "echo_pool": False,     # Don't log pool events in production
        }
        
        # Environment-specific settings
        if environment == "production":
            config = {
                **base_config,
                "pool_size": 50,                    # Larger pool for production
                "max_overflow": 100,                # Allow more overflow connections
                "pool_timeout": 30,                 # 30 second timeout
                "pool_recycle": 1800,              # Recycle connections after 30 minutes
                "connect_args": {
                    "connect_timeout": 10,
                    "application_name": "bookedbarber_prod",
                    "options": "-c statement_timeout=60000",  # 60 second statement timeout
                    "keepalives": 1,
                    "keepalives_idle": 30,
                    "keepalives_interval": 10,
                    "keepalives_count": 5,
                    "sslmode": "require",
                }
            }
        elif environment == "staging":
            config = {
                **base_config,
                "pool_size": 20,
                "max_overflow": 40,
                "pool_timeout": 30,
                "pool_recycle": 3600,              # Recycle after 1 hour
                "connect_args": {
                    "connect_timeout": 10,
                    "application_name": "bookedbarber_staging",
                    "options": "-c statement_timeout=30000",  # 30 second statement timeout
                    "sslmode": "prefer",
                }
            }
        else:  # development
            config = {
                **base_config,
                "pool_size": 10,
                "max_overflow": 20,
                "pool_timeout": 30,
                "pool_recycle": 3600,
                "echo_pool": True,                 # Enable logging for development
                "connect_args": {
                    "connect_timeout": 10,
                    "application_name": "bookedbarber_dev",
                    "options": "-c statement_timeout=30000",
                }
            }
        
        logger.info(
            f"PostgreSQL connection pool configured for {environment}: "
            f"size={config['pool_size']}, max_overflow={config['max_overflow']}"
        )
        
        return config
    
    @staticmethod
    def get_pool_status_query() -> str:
        """
        Get SQL query to check connection pool status in PostgreSQL
        
        Returns:
            SQL query string
        """
        return """
        SELECT 
            pid,
            usename,
            application_name,
            client_addr,
            state,
            state_change,
            query_start,
            wait_event_type,
            wait_event
        FROM pg_stat_activity
        WHERE application_name LIKE 'bookedbarber_%'
        ORDER BY state_change DESC;
        """
    
    @staticmethod
    def get_pool_metrics_query() -> str:
        """
        Get SQL query to retrieve connection pool metrics
        
        Returns:
            SQL query string
        """
        return """
        SELECT 
            COUNT(*) as total_connections,
            COUNT(*) FILTER (WHERE state = 'active') as active_connections,
            COUNT(*) FILTER (WHERE state = 'idle') as idle_connections,
            COUNT(*) FILTER (WHERE state = 'idle in transaction') as idle_in_transaction,
            COUNT(*) FILTER (WHERE wait_event IS NOT NULL) as waiting_connections,
            MAX(EXTRACT(EPOCH FROM (NOW() - state_change))) as max_idle_time_seconds
        FROM pg_stat_activity
        WHERE application_name LIKE 'bookedbarber_%';
        """