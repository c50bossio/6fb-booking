"""
Render-optimized database connection module with multiple fallback strategies
Handles various connection scenarios and PostgreSQL-specific requirements
"""

import os
import re
import asyncio
import logging
from typing import Optional, Dict, Any, Union
from urllib.parse import urlparse, parse_qs, unquote
from contextlib import asynccontextmanager, contextmanager

# SQLAlchemy imports
from sqlalchemy import create_engine, event, pool, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import QueuePool, NullPool, StaticPool
from sqlalchemy.exc import OperationalError, DatabaseError

# Async support
try:
    import asyncpg
    from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
    ASYNCPG_AVAILABLE = True
except ImportError:
    ASYNCPG_AVAILABLE = False
    asyncpg = None

# Alternative PostgreSQL drivers
try:
    import psycopg2
    PSYCOPG2_AVAILABLE = True
except ImportError:
    PSYCOPG2_AVAILABLE = False
    psycopg2 = None

try:
    import pg8000
    PG8000_AVAILABLE = True
except ImportError:
    PG8000_AVAILABLE = False
    pg8000 = None

logger = logging.getLogger(__name__)


class RenderDatabaseConfig:
    """
    Comprehensive database configuration for Render deployment
    with automatic fallback strategies
    """
    
    def __init__(self, database_url: Optional[str] = None):
        self.original_url = database_url or os.getenv("DATABASE_URL", "")
        self.parsed_url = None
        self.connection_params = {}
        self.is_render = self._detect_render_environment()
        self.parse_database_url()
    
    def _detect_render_environment(self) -> bool:
        """Detect if running on Render platform"""
        render_indicators = [
            os.getenv("RENDER"),
            os.getenv("RENDER_SERVICE_NAME"),
            os.getenv("RENDER_INSTANCE_ID"),
            os.getenv("IS_PULL_REQUEST")
        ]
        return any(render_indicators)
    
    def parse_database_url(self):
        """
        Parse and normalize database URL with Render-specific handling
        """
        if not self.original_url:
            raise ValueError("DATABASE_URL is not set")
        
        # Handle postgres:// -> postgresql:// conversion
        url = self.original_url
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql://", 1)
        
        # Parse URL components
        try:
            self.parsed_url = urlparse(url)
            
            # Extract connection parameters
            self.connection_params = {
                "host": self.parsed_url.hostname,
                "port": self.parsed_url.port or 5432,
                "database": self.parsed_url.path.lstrip("/") if self.parsed_url.path else None,
                "user": unquote(self.parsed_url.username) if self.parsed_url.username else None,
                "password": unquote(self.parsed_url.password) if self.parsed_url.password else None,
            }
            
            # Parse query parameters
            if self.parsed_url.query:
                query_params = parse_qs(self.parsed_url.query)
                for key, values in query_params.items():
                    self.connection_params[key] = values[0] if values else None
            
            # Render-specific SSL configuration
            if self.is_render and "sslmode" not in self.connection_params:
                self.connection_params["sslmode"] = "require"
            
        except Exception as e:
            logger.error(f"Failed to parse DATABASE_URL: {e}")
            raise
    
    def get_sqlalchemy_url(self, driver: Optional[str] = None) -> str:
        """
        Get SQLAlchemy-compatible database URL with specified driver
        """
        if not self.parsed_url:
            self.parse_database_url()
        
        # Choose driver based on availability
        if driver is None:
            if PSYCOPG2_AVAILABLE:
                driver = "psycopg2"
            elif PG8000_AVAILABLE:
                driver = "pg8000"
            else:
                driver = "postgresql"  # Default, may fail if no driver installed
        
        # Build base URL
        base_url = f"postgresql+{driver}://"
        
        # Add credentials
        if self.connection_params.get("user"):
            base_url += f"{self.connection_params['user']}"
            if self.connection_params.get("password"):
                base_url += f":{self.connection_params['password']}"
            base_url += "@"
        
        # Add host and port
        base_url += f"{self.connection_params['host']}:{self.connection_params['port']}"
        
        # Add database
        if self.connection_params.get("database"):
            base_url += f"/{self.connection_params['database']}"
        
        # Add query parameters
        query_params = []
        for key, value in self.connection_params.items():
            if key not in ["host", "port", "database", "user", "password"] and value:
                query_params.append(f"{key}={value}")
        
        if query_params:
            base_url += "?" + "&".join(query_params)
        
        return base_url
    
    def get_asyncpg_url(self) -> str:
        """Get asyncpg-compatible database URL"""
        if not self.parsed_url:
            self.parse_database_url()
        
        # asyncpg uses postgresql:// scheme
        url = self.original_url
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql://", 1)
        
        return url
    
    def get_connection_dict(self) -> Dict[str, Any]:
        """Get connection parameters as dictionary"""
        return self.connection_params.copy()


class RenderDatabaseConnection:
    """
    Main database connection class with multiple fallback strategies
    """
    
    def __init__(self, database_url: Optional[str] = None):
        self.config = RenderDatabaseConfig(database_url)
        self.engine = None
        self.async_engine = None
        self.SessionLocal = None
        self.AsyncSessionLocal = None
        self.Base = declarative_base()
        self._initialized = False
    
    def get_pool_config(self, is_production: bool = True) -> Dict[str, Any]:
        """Get optimized connection pool configuration"""
        if is_production:
            return {
                "poolclass": QueuePool,
                "pool_size": 20,
                "max_overflow": 30,
                "pool_timeout": 30,
                "pool_recycle": 3600,
                "pool_pre_ping": True,
                "echo": False,
                "echo_pool": False,
            }
        else:
            return {
                "poolclass": QueuePool,
                "pool_size": 5,
                "max_overflow": 10,
                "pool_timeout": 30,
                "pool_recycle": 3600,
                "pool_pre_ping": True,
                "echo": True,
                "echo_pool": True,
            }
    
    def initialize_sync_engine(self, is_production: bool = True) -> bool:
        """
        Initialize synchronous database engine with fallback strategies
        """
        drivers_to_try = []
        
        # Prioritize drivers based on availability
        if PSYCOPG2_AVAILABLE:
            drivers_to_try.append(("psycopg2", psycopg2))
        if PG8000_AVAILABLE:
            drivers_to_try.append(("pg8000", pg8000))
        
        # Try each driver
        for driver_name, driver_module in drivers_to_try:
            try:
                url = self.config.get_sqlalchemy_url(driver_name)
                pool_config = self.get_pool_config(is_production)
                
                # Driver-specific configurations
                if driver_name == "psycopg2":
                    pool_config["connect_args"] = {
                        "sslmode": self.config.connection_params.get("sslmode", "require"),
                        "connect_timeout": 10,
                        "application_name": "6fb_booking_app",
                    }
                elif driver_name == "pg8000":
                    pool_config["connect_args"] = {
                        "ssl_context": True if self.config.connection_params.get("sslmode") == "require" else None,
                        "timeout": 10,
                    }
                
                # Create engine
                self.engine = create_engine(url, **pool_config)
                
                # Test connection
                with self.engine.connect() as conn:
                    conn.execute(text("SELECT 1"))
                
                # Set up session factory
                self.SessionLocal = sessionmaker(
                    autocommit=False,
                    autoflush=False,
                    bind=self.engine,
                    expire_on_commit=False,
                )
                
                logger.info(f"Successfully initialized database with {driver_name} driver")
                return True
                
            except Exception as e:
                logger.warning(f"Failed to initialize with {driver_name}: {e}")
                continue
        
        # If all drivers fail, try raw psycopg2 connection as last resort
        if PSYCOPG2_AVAILABLE:
            try:
                import psycopg2.pool
                
                # Create a connection pool directly
                self.connection_pool = psycopg2.pool.ThreadedConnectionPool(
                    minconn=1,
                    maxconn=20,
                    host=self.config.connection_params["host"],
                    port=self.config.connection_params["port"],
                    database=self.config.connection_params["database"],
                    user=self.config.connection_params["user"],
                    password=self.config.connection_params["password"],
                    sslmode=self.config.connection_params.get("sslmode", "require"),
                )
                
                logger.info("Initialized raw psycopg2 connection pool as fallback")
                return True
                
            except Exception as e:
                logger.error(f"Failed to create raw psycopg2 pool: {e}")
        
        return False
    
    async def initialize_async_engine(self, is_production: bool = True) -> bool:
        """
        Initialize asynchronous database engine with asyncpg
        """
        if not ASYNCPG_AVAILABLE:
            logger.warning("asyncpg not available, skipping async engine initialization")
            return False
        
        try:
            url = self.config.get_asyncpg_url()
            pool_config = self.get_pool_config(is_production)
            
            # Async-specific pool configuration
            pool_config.update({
                "pool_size": 20,
                "max_overflow": 0,  # asyncpg doesn't support overflow
                "echo": not is_production,
            })
            
            # Create async engine
            self.async_engine = create_async_engine(
                url,
                **pool_config
            )
            
            # Test connection
            async with self.async_engine.connect() as conn:
                await conn.execute(text("SELECT 1"))
            
            # Set up async session factory
            self.AsyncSessionLocal = async_sessionmaker(
                self.async_engine,
                class_=AsyncSession,
                expire_on_commit=False,
            )
            
            logger.info("Successfully initialized async database engine")
            return True
            
        except Exception as e:
            logger.error(f"Failed to initialize async engine: {e}")
            return False
    
    def get_db(self):
        """Get synchronous database session (FastAPI dependency)"""
        if not self.SessionLocal:
            raise RuntimeError("Database not initialized. Call initialize_sync_engine first.")
        
        db = self.SessionLocal()
        try:
            yield db
        except Exception as e:
            logger.error(f"Database session error: {e}")
            db.rollback()
            raise
        finally:
            db.close()
    
    async def get_async_db(self):
        """Get asynchronous database session (FastAPI dependency)"""
        if not self.AsyncSessionLocal:
            raise RuntimeError("Async database not initialized. Call initialize_async_engine first.")
        
        async with self.AsyncSessionLocal() as session:
            try:
                yield session
                await session.commit()
            except Exception as e:
                logger.error(f"Async database session error: {e}")
                await session.rollback()
                raise
    
    @contextmanager
    def get_db_session(self):
        """Context manager for synchronous database sessions"""
        if not self.SessionLocal:
            raise RuntimeError("Database not initialized. Call initialize_sync_engine first.")
        
        session = self.SessionLocal()
        try:
            yield session
            session.commit()
        except Exception as e:
            logger.error(f"Database session error: {e}")
            session.rollback()
            raise
        finally:
            session.close()
    
    @asynccontextmanager
    async def get_async_db_session(self):
        """Context manager for asynchronous database sessions"""
        if not self.AsyncSessionLocal:
            raise RuntimeError("Async database not initialized. Call initialize_async_engine first.")
        
        async with self.AsyncSessionLocal() as session:
            try:
                yield session
                await session.commit()
            except Exception as e:
                logger.error(f"Async database session error: {e}")
                await session.rollback()
                raise
    
    def test_connection(self) -> Dict[str, Any]:
        """Test database connectivity and return diagnostic information"""
        results = {
            "sync_engine": False,
            "async_engine": False,
            "raw_connection": False,
            "drivers_available": {
                "psycopg2": PSYCOPG2_AVAILABLE,
                "pg8000": PG8000_AVAILABLE,
                "asyncpg": ASYNCPG_AVAILABLE,
            },
            "connection_params": self.config.connection_params,
            "is_render": self.config.is_render,
        }
        
        # Test sync engine
        if self.engine:
            try:
                with self.engine.connect() as conn:
                    result = conn.execute(text("SELECT version()"))
                    version = result.scalar()
                    results["sync_engine"] = True
                    results["database_version"] = version
            except Exception as e:
                results["sync_engine_error"] = str(e)
        
        # Test raw psycopg2 connection
        if PSYCOPG2_AVAILABLE:
            try:
                import psycopg2
                conn = psycopg2.connect(
                    host=self.config.connection_params["host"],
                    port=self.config.connection_params["port"],
                    database=self.config.connection_params["database"],
                    user=self.config.connection_params["user"],
                    password=self.config.connection_params["password"],
                    sslmode=self.config.connection_params.get("sslmode", "require"),
                )
                with conn.cursor() as cur:
                    cur.execute("SELECT 1")
                    cur.fetchone()
                conn.close()
                results["raw_connection"] = True
            except Exception as e:
                results["raw_connection_error"] = str(e)
        
        return results


# Global connection instance
_db_connection: Optional[RenderDatabaseConnection] = None


def get_render_db_connection() -> RenderDatabaseConnection:
    """Get or create the global database connection instance"""
    global _db_connection
    
    if _db_connection is None:
        _db_connection = RenderDatabaseConnection()
        
        # Initialize synchronous engine
        is_production = os.getenv("ENVIRONMENT", "development").lower() == "production"
        if not _db_connection.initialize_sync_engine(is_production):
            raise RuntimeError("Failed to initialize database connection")
        
        # Optionally initialize async engine
        if ASYNCPG_AVAILABLE:
            asyncio.create_task(_db_connection.initialize_async_engine(is_production))
    
    return _db_connection


# Convenience exports
def get_db():
    """FastAPI dependency for database sessions"""
    return get_render_db_connection().get_db()


def get_async_db():
    """FastAPI dependency for async database sessions"""
    return get_render_db_connection().get_async_db()


def test_render_database_connection():
    """Test and diagnose database connection"""
    try:
        conn = get_render_db_connection()
        results = conn.test_connection()
        
        print("=== Render Database Connection Test ===")
        print(f"Environment: {'Render' if results['is_render'] else 'Local'}")
        print(f"\nDrivers Available:")
        for driver, available in results['drivers_available'].items():
            print(f"  - {driver}: {'✓' if available else '✗'}")
        
        print(f"\nConnection Tests:")
        print(f"  - Sync Engine: {'✓' if results['sync_engine'] else '✗'}")
        if results.get('sync_engine_error'):
            print(f"    Error: {results['sync_engine_error']}")
        
        print(f"  - Raw Connection: {'✓' if results['raw_connection'] else '✗'}")
        if results.get('raw_connection_error'):
            print(f"    Error: {results['raw_connection_error']}")
        
        if results.get('database_version'):
            print(f"\nDatabase Version: {results['database_version']}")
        
        print(f"\nConnection Parameters:")
        for key, value in results['connection_params'].items():
            if key == 'password':
                value = '***' if value else None
            print(f"  - {key}: {value}")
        
        return results
        
    except Exception as e:
        print(f"Failed to test database connection: {e}")
        return None


if __name__ == "__main__":
    # Run connection test
    test_render_database_connection()