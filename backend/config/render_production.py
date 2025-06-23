"""
Render-specific production database configuration
Optimized for Render's PostgreSQL service
"""

import os
from urllib.parse import urlparse
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import QueuePool

# Parse DATABASE_URL from Render
DATABASE_URL = os.getenv("DATABASE_URL", "")

# Render provides DATABASE_URL in postgres:// format
# SQLAlchemy 2.0+ requires postgresql://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Parse connection parameters for optimization
if DATABASE_URL:
    parsed = urlparse(DATABASE_URL)
    
    # Connection pool settings optimized for Render
    POOL_SIZE = int(os.getenv("POOL_SIZE", "10"))
    MAX_OVERFLOW = int(os.getenv("MAX_OVERFLOW", "20"))
    POOL_TIMEOUT = int(os.getenv("POOL_TIMEOUT", "30"))
    POOL_RECYCLE = int(os.getenv("POOL_RECYCLE", "3600"))  # 1 hour
    POOL_PRE_PING = os.getenv("POOL_PRE_PING", "true").lower() == "true"
    
    # Create engine with optimized settings
    engine = create_engine(
        DATABASE_URL,
        poolclass=QueuePool,
        pool_size=POOL_SIZE,
        max_overflow=MAX_OVERFLOW,
        pool_timeout=POOL_TIMEOUT,
        pool_recycle=POOL_RECYCLE,
        pool_pre_ping=POOL_PRE_PING,
        connect_args={
            "connect_timeout": 10,
            "keepalives": 1,
            "keepalives_idle": 30,
            "keepalives_interval": 10,
            "keepalives_count": 5,
            # SSL configuration for Render PostgreSQL
            "sslmode": "require",
            "target_session_attrs": "read-write",
        },
        # Statement timeout to prevent long-running queries
        execution_options={
            "postgresql_statement_timeout": 30000,  # 30 seconds
        },
    )
    
    # Session configuration
    SessionLocal = sessionmaker(
        autocommit=False,
        autoflush=False,
        bind=engine,
        expire_on_commit=False,  # Prevent lazy loading issues
    )
else:
    # Fallback for local development
    from config.database import engine, SessionLocal

# Export for use in application
__all__ = ["engine", "SessionLocal"]