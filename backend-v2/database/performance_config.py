import os
from sqlalchemy import create_engine, event, text
from sqlalchemy.pool import QueuePool, StaticPool
from sqlalchemy.orm import sessionmaker
from sqlalchemy.engine import Engine
import logging
import time
from contextlib import contextmanager
from typing import Generator, Optional

logger = logging.getLogger(__name__)

class ProductionDatabaseConfig:
    """Production-optimized database configuration with advanced connection pooling"""
    
    def __init__(self):
        self.database_url = os.getenv("DATABASE_URL")
        self.environment = os.getenv("ENVIRONMENT", "development")
        self.engine = self._create_production_engine()
        self.SessionLocal = sessionmaker(
            autocommit=False, 
            autoflush=False, 
            bind=self.engine,
            expire_on_commit=False  # Performance optimization
        )
        self._setup_database_indexes()
    
    def _create_production_engine(self) -> Engine:
        """Create production-optimized database engine"""
        
        if self.environment == "production":
            return self._create_production_engine_config()
        elif self.environment == "staging":
            return self._create_staging_engine_config()
        else:
            return self._create_development_engine_config()
    
    def _create_production_engine_config(self) -> Engine:
        """Production environment configuration"""
        config = {
            "poolclass": QueuePool,
            "pool_size": 20,                    # Conservative for production
            "max_overflow": 10,                 # Limited overflow
            "pool_timeout": 30,                 # Connection timeout
            "pool_recycle": 3600,              # Recycle every hour
            "pool_pre_ping": True,             # Health check connections
            "echo": False,                     # No SQL logging
            "echo_pool": False,                # No pool logging
            "connect_args": {
                "connect_timeout": 10,
                "command_timeout": 60,
                "sslmode": "require",
                "application_name": "bookedbarber_prod",
                "options": "-c statement_timeout=30000 -c idle_in_transaction_session_timeout=300000"
            }
        }
        
        engine = create_engine(self.database_url, **config)
        self._add_production_listeners(engine)
        return engine
    
    def _create_staging_engine_config(self) -> Engine:
        """Staging environment configuration"""
        config = {
            "poolclass": QueuePool,
            "pool_size": 10,
            "max_overflow": 5,
            "pool_timeout": 20,
            "pool_recycle": 1800,
            "pool_pre_ping": True,
            "echo": False,
            "connect_args": {
                "connect_timeout": 10,
                "sslmode": "prefer",
                "application_name": "bookedbarber_staging"
            }
        }
        
        engine = create_engine(self.database_url, **config)
        self._add_staging_listeners(engine)
        return engine
    
    def _create_development_engine_config(self) -> Engine:
        """Development environment configuration"""
        config = {
            "poolclass": StaticPool,
            "pool_size": 5,
            "max_overflow": 0,
            "pool_timeout": 10,
            "pool_recycle": 300,
            "echo": os.getenv("DB_ECHO", "false").lower() == "true",
            "connect_args": {"check_same_thread": False} if "sqlite" in self.database_url else {}
        }
        
        engine = create_engine(self.database_url, **config)
        return engine
    
    def _add_production_listeners(self, engine: Engine):
        """Add production-specific connection listeners"""
        
        @event.listens_for(engine, "connect")
        def set_production_pragmas(dbapi_connection, connection_record):
            """Optimize PostgreSQL connection for production"""
            if "postgresql" in self.database_url:
                with dbapi_connection.cursor() as cursor:
                    # Performance optimizations
                    cursor.execute("SET synchronous_commit = 'on'")
                    cursor.execute("SET random_page_cost = 1.1")
                    cursor.execute("SET effective_cache_size = '1GB'")
                    cursor.execute("SET work_mem = '32MB'")
                    cursor.execute("SET maintenance_work_mem = '256MB'")
                    cursor.execute("SET max_parallel_workers_per_gather = 2")
                    cursor.execute("SET effective_io_concurrency = 200")
                    
                    # Connection settings
                    cursor.execute("SET tcp_keepalives_idle = 300")
                    cursor.execute("SET tcp_keepalives_interval = 30")
                    cursor.execute("SET tcp_keepalives_count = 3")
        
        @event.listens_for(engine, "checkout")
        def receive_checkout(dbapi_connection, connection_record, connection_proxy):
            """Track connection checkout for monitoring"""
            connection_record.checkout_time = time.time()
        
        @event.listens_for(engine, "checkin")
        def receive_checkin(dbapi_connection, connection_record):
            """Track connection usage for monitoring"""
            if hasattr(connection_record, 'checkout_time'):
                usage_time = time.time() - connection_record.checkout_time
                if usage_time > 30:  # Log long-running connections
                    logger.warning(f"Long-running database connection: {usage_time:.2f}s")
    
    def _add_staging_listeners(self, engine: Engine):
        """Add staging-specific connection listeners"""
        
        @event.listens_for(engine, "connect")
        def set_staging_pragmas(dbapi_connection, connection_record):
            """Optimize PostgreSQL connection for staging"""
            if "postgresql" in self.database_url:
                with dbapi_connection.cursor() as cursor:
                    cursor.execute("SET work_mem = '16MB'")
                    cursor.execute("SET maintenance_work_mem = '128MB'")
    
    def _setup_database_indexes(self):
        """Create performance-critical database indexes"""
        if self.environment in ["production", "staging"]:
            self._create_performance_indexes()
    
    def _create_performance_indexes(self):
        """Create critical indexes for query performance"""
        indexes = [
            # User authentication indexes
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_active ON users(email) WHERE is_active = true",
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_phone_active ON users(phone) WHERE is_active = true",
            
            # Appointment indexes
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_barber_date ON appointments(barber_id, appointment_datetime)",
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_client_date ON appointments(client_id, appointment_datetime)",
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_status_date ON appointments(status, appointment_datetime)",
            
            # Service indexes
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_services_barber_active ON services(barber_id) WHERE is_active = true",
            
            # Payment indexes
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_barber_date ON payments(barber_id, created_at)",
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_status ON payments(status)",
            
            # Analytics indexes
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_barber_date ON analytics_events(barber_id, created_at)",
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_event_type ON analytics_events(event_type, created_at)",
        ]
        
        try:
            with self.engine.connect() as conn:
                for index_sql in indexes:
                    try:
                        conn.execute(text(index_sql))
                        conn.commit()
                        logger.info(f"Created index: {index_sql[:50]}...")
                    except Exception as e:
                        logger.warning(f"Index creation failed (may already exist): {e}")
                        conn.rollback()
        except Exception as e:
            logger.error(f"Failed to create database indexes: {e}")
    
    @contextmanager
    def get_session(self) -> Generator:
        """Get database session with automatic cleanup and error handling"""
        session = self.SessionLocal()
        try:
            yield session
            session.commit()
        except Exception as e:
            session.rollback()
            logger.error(f"Database session error: {e}")
            raise
        finally:
            session.close()
    
    def get_connection_info(self) -> dict:
        """Get current connection pool information"""
        pool = self.engine.pool
        return {
            "pool_size": pool.size(),
            "checked_in": pool.checkedin(),
            "checked_out": pool.checkedout(),
            "overflow": pool.overflow(),
            "invalid": pool.invalid()
        }
    
    def health_check(self) -> bool:
        """Perform database health check"""
        try:
            with self.get_session() as session:
                session.execute(text("SELECT 1"))
                return True
        except Exception as e:
            logger.error(f"Database health check failed: {e}")
            return False

# Global production database configuration
prod_db_config = ProductionDatabaseConfig()

def get_db_session():
    """FastAPI dependency for optimized database sessions"""
    return prod_db_config.get_session()

def get_db_health() -> dict:
    """Get database health and connection information"""
    return {
        "healthy": prod_db_config.health_check(),
        "connections": prod_db_config.get_connection_info(),
        "environment": prod_db_config.environment
    }