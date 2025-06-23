"""
Enhanced database configuration with Render deployment support
Automatically switches between standard and Render-optimized connections
"""

import os
import logging
from typing import Generator, Optional

logger = logging.getLogger(__name__)

# Detect if we're running on Render
IS_RENDER = bool(os.getenv("RENDER") or os.getenv("RENDER_SERVICE_NAME"))

if IS_RENDER:
    # Use Render-optimized database connection
    logger.info("Detected Render environment, using optimized database connection")
    try:
        from .render_database import (
            get_db,
            get_async_db,
            get_render_db_connection,
            test_render_database_connection,
            RenderDatabaseConnection,
        )

        # Initialize connection on import
        _connection = get_render_db_connection()

        # Export the same interface as the standard database module
        engine = _connection.engine
        SessionLocal = _connection.SessionLocal
        Base = _connection.Base
        get_db_session = _connection.get_db_session
        get_async_db_session = _connection.get_async_db_session

        # Additional exports
        check_database_health = lambda: test_render_database_connection()

        logger.info("Render database connection initialized successfully")

    except Exception as e:
        logger.error(f"Failed to initialize Render database connection: {e}")
        # Fall back to standard database module
        from .database import *
else:
    # Use standard database configuration
    from .database import *


# Additional utility functions for Render deployment
def ensure_database_url():
    """Ensure DATABASE_URL is properly formatted for PostgreSQL"""
    db_url = os.getenv("DATABASE_URL", "")

    if db_url.startswith("postgres://"):
        # Convert postgres:// to postgresql:// for SQLAlchemy compatibility
        new_url = db_url.replace("postgres://", "postgresql://", 1)
        os.environ["DATABASE_URL"] = new_url
        logger.info("Converted postgres:// to postgresql:// in DATABASE_URL")
        return new_url

    return db_url


def get_database_info():
    """Get database connection information (safe for logging)"""
    db_url = os.getenv("DATABASE_URL", "")

    if not db_url:
        return {"status": "not configured"}

    # Parse URL safely without exposing credentials
    if "postgresql" in db_url or "postgres" in db_url:
        db_type = "PostgreSQL"
    elif "sqlite" in db_url:
        db_type = "SQLite"
    elif "mysql" in db_url:
        db_type = "MySQL"
    else:
        db_type = "Unknown"

    info = {
        "type": db_type,
        "is_render": IS_RENDER,
        "has_ssl": "sslmode" in db_url,
    }

    # Extract host if PostgreSQL
    if db_type == "PostgreSQL":
        try:
            from urllib.parse import urlparse

            parsed = urlparse(db_url)
            info["host"] = parsed.hostname or "unknown"
            info["port"] = parsed.port or 5432
        except:
            pass

    return info


# Ensure DATABASE_URL is properly formatted on import
ensure_database_url()

# Log database configuration
db_info = get_database_info()
logger.info(f"Database configuration: {db_info}")

__all__ = [
    "engine",
    "SessionLocal",
    "Base",
    "get_db",
    "get_db_session",
    "check_database_health",
    "get_database_info",
    "IS_RENDER",
]

# Try to import async support if available
try:
    if IS_RENDER and hasattr(_connection, "AsyncSessionLocal"):
        AsyncSessionLocal = _connection.AsyncSessionLocal
        __all__.extend(["get_async_db", "get_async_db_session", "AsyncSessionLocal"])
except:
    pass
