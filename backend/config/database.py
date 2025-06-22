"""
Database configuration and session management
Enhanced with connection pooling and performance optimizations
"""

from sqlalchemy import create_engine, event, pool
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import QueuePool, StaticPool
from typing import Generator
import os
import logging
from contextlib import contextmanager
import time

logger = logging.getLogger(__name__)

# Get database URL from environment or use SQLite for development
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./6fb_booking.db")

# Handle Render's postgres:// URLs (convert to postgresql://)
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Environment settings
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
IS_PRODUCTION = ENVIRONMENT.lower() == "production"


# Database-specific optimizations
def get_database_config():
    """Get optimized database configuration based on database type"""
    if "sqlite" in DATABASE_URL:
        return {
            "connect_args": {
                "check_same_thread": False,
                "timeout": 20,
                "isolation_level": None,  # Autocommit mode
            },
            "poolclass": StaticPool,
            "pool_pre_ping": True,
            "pool_recycle": 300,
            "echo": not IS_PRODUCTION,
            "echo_pool": not IS_PRODUCTION,
        }
    elif "postgresql" in DATABASE_URL:
        return {
            "connect_args": {
                "sslmode": "require" if IS_PRODUCTION else "prefer",
                "connect_timeout": 10,
                "application_name": "6fb_booking_app",
            },
            "poolclass": QueuePool,
            "pool_size": 20,  # Number of persistent connections
            "max_overflow": 30,  # Additional connections beyond pool_size
            "pool_timeout": 30,  # Timeout for getting connection from pool
            "pool_recycle": 3600,  # Recycle connections every hour
            "pool_pre_ping": True,  # Validate connections before use
            "echo": not IS_PRODUCTION,
            "echo_pool": not IS_PRODUCTION,
        }
    else:
        # MySQL or other databases
        return {
            "poolclass": QueuePool,
            "pool_size": 10,
            "max_overflow": 20,
            "pool_timeout": 30,
            "pool_recycle": 3600,
            "pool_pre_ping": True,
            "echo": not IS_PRODUCTION,
        }


# Get database configuration
db_config = get_database_config()

# Create engine with optimized settings
engine = create_engine(DATABASE_URL, **db_config)


# Performance monitoring for database connections
@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    """Set SQLite pragmas for performance optimization"""
    if "sqlite" in DATABASE_URL:
        cursor = dbapi_connection.cursor()
        # Performance optimizations
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.execute("PRAGMA cache_size=1000000")  # 1GB cache
        cursor.execute("PRAGMA temp_store=MEMORY")
        cursor.execute("PRAGMA mmap_size=268435456")  # 256MB memory map
        cursor.execute("PRAGMA optimize")
        cursor.close()
        logger.debug("SQLite pragmas set for performance optimization")


@event.listens_for(engine, "checkout")
def receive_checkout(dbapi_connection, connection_record, connection_proxy):
    """Log connection checkout for monitoring"""
    connection_record.checkout_time = time.time()
    logger.debug(f"Connection checked out: {id(dbapi_connection)}")


@event.listens_for(engine, "checkin")
def receive_checkin(dbapi_connection, connection_record):
    """Log connection checkin and calculate usage time"""
    if hasattr(connection_record, "checkout_time"):
        usage_time = time.time() - connection_record.checkout_time
        if usage_time > 5.0:  # Log long-running connections
            logger.warning(f"Long-running connection: {usage_time:.2f}s")
        logger.debug(
            f"Connection checked in: {id(dbapi_connection)} (used for {usage_time:.2f}s)"
        )


# Enhanced session factory with performance optimizations
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    expire_on_commit=False,  # Keep objects accessible after commit
)

# Create base class for models
Base = declarative_base()


# Connection monitoring
class ConnectionMonitor:
    def __init__(self):
        self.active_connections = 0
        self.total_connections = 0
        self.peak_connections = 0
        self.connection_errors = 0

    def connection_created(self):
        self.active_connections += 1
        self.total_connections += 1
        self.peak_connections = max(self.peak_connections, self.active_connections)

    def connection_closed(self):
        self.active_connections = max(0, self.active_connections - 1)

    def connection_error(self):
        self.connection_errors += 1

    def get_stats(self):
        return {
            "active_connections": self.active_connections,
            "total_connections": self.total_connections,
            "peak_connections": self.peak_connections,
            "connection_errors": self.connection_errors,
            "pool_size": getattr(engine.pool, "size", "N/A"),
            "pool_checked_out": getattr(engine.pool, "checkedout", "N/A"),
            "pool_overflow": getattr(engine.pool, "overflow", "N/A"),
        }


# Global connection monitor
connection_monitor = ConnectionMonitor()


# Enhanced database dependency with error handling and monitoring
def get_db() -> Generator[Session, None, None]:
    """
    Database dependency for FastAPI with enhanced error handling
    """
    db = SessionLocal()
    connection_monitor.connection_created()

    try:
        yield db
    except Exception as e:
        logger.error(f"Database session error: {str(e)}")
        connection_monitor.connection_error()
        db.rollback()
        raise
    finally:
        db.close()
        connection_monitor.connection_closed()


# Context manager for database sessions
@contextmanager
def get_db_session():
    """
    Context manager for database sessions outside of FastAPI
    """
    db = SessionLocal()
    connection_monitor.connection_created()

    try:
        yield db
        db.commit()
    except Exception as e:
        logger.error(f"Database session error: {str(e)}")
        connection_monitor.connection_error()
        db.rollback()
        raise
    finally:
        db.close()
        connection_monitor.connection_closed()


# Bulk operations for better performance
class BulkOperations:
    """Optimized bulk database operations"""

    @staticmethod
    def bulk_insert(db: Session, model_class, records: list, batch_size: int = 1000):
        """Bulk insert records with batching"""
        total_inserted = 0

        for i in range(0, len(records), batch_size):
            batch = records[i : i + batch_size]
            try:
                db.bulk_insert_mappings(model_class, batch)
                db.commit()
                total_inserted += len(batch)
                logger.debug(
                    f"Bulk inserted {len(batch)} {model_class.__name__} records"
                )
            except Exception as e:
                logger.error(
                    f"Bulk insert failed for batch {i//batch_size + 1}: {str(e)}"
                )
                db.rollback()
                raise

        return total_inserted

    @staticmethod
    def bulk_update(db: Session, model_class, updates: list, batch_size: int = 1000):
        """Bulk update records with batching"""
        total_updated = 0

        for i in range(0, len(updates), batch_size):
            batch = updates[i : i + batch_size]
            try:
                db.bulk_update_mappings(model_class, batch)
                db.commit()
                total_updated += len(batch)
                logger.debug(
                    f"Bulk updated {len(batch)} {model_class.__name__} records"
                )
            except Exception as e:
                logger.error(
                    f"Bulk update failed for batch {i//batch_size + 1}: {str(e)}"
                )
                db.rollback()
                raise

        return total_updated


# Query optimization helpers
class QueryOptimizer:
    """Database query optimization utilities"""

    @staticmethod
    def explain_query(db: Session, query):
        """Explain query execution plan (PostgreSQL)"""
        if "postgresql" in DATABASE_URL:
            try:
                from sqlalchemy import text

                explained = db.execute(text(f"EXPLAIN ANALYZE {str(query)}"))
                return [row[0] for row in explained.fetchall()]
            except Exception as e:
                logger.error(f"Query explanation failed: {str(e)}")
                return []
        return ["Query explanation only available for PostgreSQL"]

    @staticmethod
    def get_slow_queries(db: Session, limit: int = 10):
        """Get slow queries (PostgreSQL with pg_stat_statements)"""
        if "postgresql" in DATABASE_URL:
            try:
                from sqlalchemy import text

                result = db.execute(
                    text(
                        """
                    SELECT query, calls, total_time, rows,
                           100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
                    FROM pg_stat_statements
                    WHERE query NOT LIKE '%pg_stat_statements%'
                    ORDER BY total_time DESC
                    LIMIT :limit
                """
                    ),
                    {"limit": limit},
                )

                return [dict(row) for row in result.fetchall()]
            except Exception as e:
                logger.error(f"Slow query analysis failed: {str(e)}")
                return []
        return []


# Database health check
def check_database_health():
    """Check database connection health"""
    try:
        with get_db_session() as db:
            from sqlalchemy import text

            db.execute(text("SELECT 1"))

            # Get connection stats
            stats = connection_monitor.get_stats()

            return {
                "status": "healthy",
                "database_type": (
                    "postgresql" if "postgresql" in DATABASE_URL else "sqlite"
                ),
                "connection_stats": stats,
                "timestamp": time.time(),
            }
    except Exception as e:
        logger.error(f"Database health check failed: {str(e)}")
        return {"status": "unhealthy", "error": str(e), "timestamp": time.time()}


# Export enhanced components
__all__ = [
    "engine",
    "SessionLocal",
    "Base",
    "get_db",
    "get_db_session",
    "BulkOperations",
    "QueryOptimizer",
    "connection_monitor",
    "check_database_health",
]
