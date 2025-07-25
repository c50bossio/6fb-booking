"""
PostgreSQL Configuration Helper for BookedBarber V2

This module provides PostgreSQL-specific configuration and connection management.
"""

import os
import logging
from typing import Dict, Optional, Any
from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.pool import QueuePool
from config import settings

logger = logging.getLogger(__name__)


class PostgreSQLConfig:
    """PostgreSQL-specific configuration and utilities"""
    
    def __init__(self):
        self.is_postgresql = self.detect_postgresql()
        self.connection_params = self.parse_database_url() if self.is_postgresql else None
    
    def detect_postgresql(self) -> bool:
        """Detect if we're using PostgreSQL based on DATABASE_URL"""
        return settings.database_url.startswith('postgresql://')
    
    def parse_database_url(self) -> Optional[Dict[str, Any]]:
        """Parse PostgreSQL connection parameters from DATABASE_URL"""
        if not self.is_postgresql:
            return None
        
        try:
            # Extract components from DATABASE_URL
            # Format: postgresql://user:password@host:port/dbname
            from urllib.parse import urlparse
            
            parsed = urlparse(settings.database_url)
            
            params = {
                'user': parsed.username,
                'password': parsed.password,
                'host': parsed.hostname,
                'port': parsed.port or 5432,
                'dbname': parsed.path.lstrip('/'),
                'sslmode': os.getenv('DB_SSLMODE', 'prefer'),
                'connect_timeout': int(os.getenv('DB_CONNECTION_TIMEOUT', '10')),
                'application_name': f"BookedBarber-{os.getenv('ENVIRONMENT', 'development')}"
            }
            
            # Add SSL configuration if provided
            ssl_cert = os.getenv('DB_SSLCERT')
            ssl_key = os.getenv('DB_SSLKEY')
            ssl_rootcert = os.getenv('DB_SSLROOTCERT')
            
            if ssl_cert:
                params['sslcert'] = ssl_cert
            if ssl_key:
                params['sslkey'] = ssl_key
            if ssl_rootcert:
                params['sslrootcert'] = ssl_rootcert
            
            return params
            
        except Exception as e:
            logger.error(f"Failed to parse PostgreSQL connection URL: {e}")
            return None
    
    def get_engine_config(self) -> Dict[str, Any]:
        """Get SQLAlchemy engine configuration optimized for PostgreSQL"""
        if not self.is_postgresql:
            return {}
        
        config = {
            'poolclass': QueuePool,
            'pool_size': int(os.getenv('DB_POOL_SIZE', '25')),
            'max_overflow': int(os.getenv('DB_MAX_OVERFLOW', '50')),
            'pool_timeout': int(os.getenv('DB_POOL_TIMEOUT', '30')),
            'pool_recycle': int(os.getenv('DB_POOL_RECYCLE', '3600')),
            'pool_pre_ping': os.getenv('DB_POOL_PRE_PING', 'true').lower() == 'true',
            'echo': os.getenv('DB_LOG_QUERIES', 'false').lower() == 'true',
            'echo_pool': os.getenv('DB_LOG_POOL', 'false').lower() == 'true',
            'connect_args': {
                'connect_timeout': int(os.getenv('DB_CONNECTION_TIMEOUT', '10')),
                'application_name': f"BookedBarber-{os.getenv('ENVIRONMENT', 'development')}",
                'options': f"-c statement_timeout={os.getenv('DB_STATEMENT_TIMEOUT', '30000')}ms"
            }
        }
        
        # Add SSL configuration
        sslmode = os.getenv('DB_SSLMODE')
        if sslmode:
            config['connect_args']['sslmode'] = sslmode
        
        ssl_cert = os.getenv('DB_SSLCERT')
        if ssl_cert:
            config['connect_args']['sslcert'] = ssl_cert
        
        ssl_key = os.getenv('DB_SSLKEY')
        if ssl_key:
            config['connect_args']['sslkey'] = ssl_key
        
        ssl_rootcert = os.getenv('DB_SSLROOTCERT')
        if ssl_rootcert:
            config['connect_args']['sslrootcert'] = ssl_rootcert
        
        return config
    
    def create_optimized_engine(self, database_url: str = None) -> Engine:
        """Create an optimized SQLAlchemy engine for PostgreSQL"""
        url = database_url or settings.database_url
        config = self.get_engine_config()
        
        engine = create_engine(url, **config)
        
        # Add event listeners for PostgreSQL optimization
        if self.is_postgresql:
            self.setup_engine_listeners(engine)
        
        return engine
    
    def setup_engine_listeners(self, engine: Engine):
        """Set up PostgreSQL-specific event listeners"""
        
        @event.listens_for(engine, "connect")
        def set_postgresql_pragma(dbapi_connection, connection_record):
            """Set PostgreSQL-specific connection settings"""
            with dbapi_connection.cursor() as cursor:
                # Set timezone to UTC
                cursor.execute("SET timezone = 'UTC'")
                
                # Enable query planning optimizations
                cursor.execute("SET enable_seqscan = on")
                cursor.execute("SET enable_indexscan = on")
                cursor.execute("SET enable_bitmapscan = on")
                
                # Set work memory for this connection
                work_mem = os.getenv('WORK_MEM', '4MB')
                cursor.execute(f"SET work_mem = '{work_mem}'")
                
                # Set random page cost (lower for SSD)
                random_page_cost = os.getenv('RANDOM_PAGE_COST', '1.1')
                cursor.execute(f"SET random_page_cost = {random_page_cost}")
                
                # Enable just-in-time compilation if available
                cursor.execute("SET jit = on")
                
            dbapi_connection.commit()
        
        @event.listens_for(engine, "before_cursor_execute")
        def log_slow_queries(conn, cursor, statement, parameters, context, executemany):
            """Log slow queries for performance monitoring"""
            import time
            context._query_start_time = time.time()
        
        @event.listens_for(engine, "after_cursor_execute")
        def log_slow_queries_after(conn, cursor, statement, parameters, context, executemany):
            """Log queries that took longer than threshold"""
            import time
            total = time.time() - context._query_start_time
            
            # Log slow queries
            threshold = float(os.getenv('SLOW_QUERY_THRESHOLD', '1.0'))
            if total > threshold:
                logger.warning(f"Slow query ({total:.2f}s): {statement[:200]}...")
    
    def test_connection(self) -> bool:
        """Test PostgreSQL connection"""
        if not self.is_postgresql:
            logger.info("Not using PostgreSQL, skipping connection test")
            return True
        
        try:
            engine = self.create_optimized_engine()
            with engine.connect() as conn:
                result = conn.execute("SELECT version()")
                version = result.fetchone()[0]
                logger.info(f"PostgreSQL connection successful: {version}")
                return True
                
        except Exception as e:
            logger.error(f"PostgreSQL connection failed: {e}")
            return False
    
    def get_database_stats(self) -> Dict[str, Any]:
        """Get PostgreSQL database statistics"""
        if not self.is_postgresql:
            return {}
        
        try:
            engine = self.create_optimized_engine()
            with engine.connect() as conn:
                # Get database size
                result = conn.execute(
                    "SELECT pg_size_pretty(pg_database_size(current_database()))"
                )
                db_size = result.fetchone()[0]
                
                # Get table statistics
                result = conn.execute("""
                    SELECT 
                        schemaname,
                        tablename,
                        n_tup_ins as inserts,
                        n_tup_upd as updates,
                        n_tup_del as deletes,
                        n_live_tup as live_tuples,
                        n_dead_tup as dead_tuples,
                        last_vacuum,
                        last_autovacuum,
                        last_analyze,
                        last_autoanalyze
                    FROM pg_stat_user_tables
                    ORDER BY n_live_tup DESC
                    LIMIT 10
                """)
                table_stats = [dict(row) for row in result]
                
                # Get connection statistics
                result = conn.execute("""
                    SELECT 
                        state,
                        COUNT(*) as count
                    FROM pg_stat_activity
                    WHERE datname = current_database()
                    GROUP BY state
                """)
                connection_stats = {row[0]: row[1] for row in result}
                
                # Get slow queries (if pg_stat_statements is available)
                slow_queries = []
                try:
                    result = conn.execute("""
                        SELECT 
                            query,
                            calls,
                            total_time,
                            mean_time,
                            rows
                        FROM pg_stat_statements
                        WHERE dbid = (SELECT oid FROM pg_database WHERE datname = current_database())
                        ORDER BY mean_time DESC
                        LIMIT 5
                    """)
                    slow_queries = [dict(row) for row in result]
                except:
                    # pg_stat_statements not available
                    pass
                
                return {
                    'database_size': db_size,
                    'table_statistics': table_stats,
                    'connection_statistics': connection_stats,
                    'slow_queries': slow_queries,
                    'timestamp': os.time.time()
                }
                
        except Exception as e:
            logger.error(f"Failed to get database statistics: {e}")
            return {}
    
    def optimize_database(self) -> bool:
        """Run PostgreSQL optimization commands"""
        if not self.is_postgresql:
            return True
        
        try:
            engine = self.create_optimized_engine()
            with engine.connect() as conn:
                # Analyze all tables for query planner
                logger.info("Running ANALYZE on all tables...")
                conn.execute("ANALYZE")
                
                # Get tables that need vacuuming
                result = conn.execute("""
                    SELECT tablename 
                    FROM pg_stat_user_tables 
                    WHERE n_dead_tup > 1000
                    ORDER BY n_dead_tup DESC
                """)
                
                tables_to_vacuum = [row[0] for row in result]
                
                if tables_to_vacuum:
                    logger.info(f"Vacuuming {len(tables_to_vacuum)} tables with dead tuples...")
                    for table in tables_to_vacuum:
                        conn.execute(f"VACUUM {table}")
                
                logger.info("Database optimization completed")
                return True
                
        except Exception as e:
            logger.error(f"Database optimization failed: {e}")
            return False
    
    def setup_monitoring(self) -> bool:
        """Set up PostgreSQL monitoring views and functions"""
        if not self.is_postgresql:
            return True
        
        try:
            engine = self.create_optimized_engine()
            with engine.connect() as conn:
                # Create monitoring schema if it doesn't exist
                conn.execute("CREATE SCHEMA IF NOT EXISTS monitoring")
                
                # Create view for current connections
                conn.execute("""
                    CREATE OR REPLACE VIEW monitoring.current_connections AS
                    SELECT 
                        datname,
                        usename,
                        application_name,
                        client_addr,
                        state,
                        query_start,
                        state_change,
                        query
                    FROM pg_stat_activity
                    WHERE datname IS NOT NULL
                """)
                
                # Create view for table sizes
                conn.execute("""
                    CREATE OR REPLACE VIEW monitoring.table_sizes AS
                    SELECT 
                        schemaname,
                        tablename,
                        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
                        pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
                    FROM pg_tables
                    WHERE schemaname = 'public'
                    ORDER BY size_bytes DESC
                """)
                
                # Create function to log slow queries
                conn.execute("""
                    CREATE OR REPLACE FUNCTION monitoring.log_slow_query(
                        query_text TEXT,
                        execution_time_ms NUMERIC,
                        user_name TEXT DEFAULT current_user,
                        database_name TEXT DEFAULT current_database()
                    ) RETURNS VOID AS $$
                    BEGIN
                        INSERT INTO monitoring.query_performance 
                        (query_hash, query_text, execution_time_ms, user_name, database_name)
                        VALUES (
                            md5(query_text),
                            query_text,
                            execution_time_ms,
                            user_name,
                            database_name
                        );
                    END;
                    $$ LANGUAGE plpgsql;
                """)
                
                logger.info("PostgreSQL monitoring setup completed")
                return True
                
        except Exception as e:
            logger.error(f"Failed to set up monitoring: {e}")
            return False


# Global instance
pg_config = PostgreSQLConfig()


def get_postgresql_engine() -> Engine:
    """Get optimized PostgreSQL engine"""
    return pg_config.create_optimized_engine()


def is_postgresql() -> bool:
    """Check if we're using PostgreSQL"""
    return pg_config.is_postgresql


def test_postgresql_connection() -> bool:
    """Test PostgreSQL connection"""
    return pg_config.test_connection()


def get_database_stats() -> Dict[str, Any]:
    """Get database statistics"""
    return pg_config.get_database_stats()


def optimize_database() -> bool:
    """Optimize database performance"""
    return pg_config.optimize_database()