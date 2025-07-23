from sqlalchemy import create_engine, pool, event
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from config import settings
import logging
import time

logger = logging.getLogger(__name__)

# Import enhanced connection pool configuration
try:
    from database.connection_pool_config import ConnectionPoolConfig
    ENHANCED_POOL_CONFIG = True
except ImportError:
    ENHANCED_POOL_CONFIG = False
    logger.warning("Enhanced connection pool configuration not available")

# Import Sentry monitoring if available
try:
    from services.sentry_monitoring import database_monitor
    SENTRY_MONITORING_AVAILABLE = True
except ImportError:
    SENTRY_MONITORING_AVAILABLE = False
    logger.info("Sentry monitoring not available for database operations")

# Import connection pool monitoring
try:
    from services.connection_pool_monitor import create_pool_monitor
    POOL_MONITORING_AVAILABLE = True
except ImportError:
    POOL_MONITORING_AVAILABLE = False
    logger.info("Connection pool monitoring not available")

# Configure connection pool settings
if ENHANCED_POOL_CONFIG:
    # Use enhanced configuration
    pool_settings = ConnectionPoolConfig.get_pool_config(
        settings.database_url,
        settings.environment
    )
else:
    # Fallback to basic configuration
    pool_settings = {}
    if "sqlite" not in settings.database_url:
        # PostgreSQL connection pooling settings for production
        pool_settings = {
            "poolclass": pool.QueuePool,
            "pool_size": 20,                    # Number of connections to maintain in pool
            "max_overflow": 40,                 # Maximum overflow connections
            "pool_timeout": 30,                 # Timeout for getting connection from pool
            "pool_recycle": 3600,              # Recycle connections after 1 hour
            "pool_pre_ping": True,             # Test connections before using
            "echo_pool": settings.debug,        # Log pool checkouts/checkins in debug mode
            "connect_args": {
                "connect_timeout": 10,          # Connection timeout in seconds
                "application_name": "bookedbarber_v2",
                "options": "-c statement_timeout=30000"  # 30 second statement timeout
            }
        }
        logger.info(f"Database connection pool configured: size={pool_settings['pool_size']}, max_overflow={pool_settings['max_overflow']}")
    else:
        # SQLite settings for development
        pool_settings = {
            "connect_args": {"check_same_thread": False},
            "poolclass": pool.StaticPool       # Use StaticPool for SQLite
        }

# Create engine with production-ready settings
engine = create_engine(
    settings.database_url,
    **pool_settings
)

# Set up connection pool monitoring
pool_monitor = None
if POOL_MONITORING_AVAILABLE:
    try:
        pool_monitor = create_pool_monitor(engine)
        logger.info("Connection pool monitoring enabled")
    except Exception as e:
        logger.warning(f"Failed to set up connection pool monitoring: {e}")

# Set up Sentry database monitoring if available
if SENTRY_MONITORING_AVAILABLE:
    try:
        database_monitor.setup_database_monitoring(engine)
        logger.info("Sentry database monitoring enabled")
    except Exception as e:
        logger.warning(f"Failed to set up Sentry database monitoring: {e}")

# Add event listeners for connection pool monitoring
if "postgresql" in settings.database_url:
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        """Set up connection parameters on connect"""
        connection_record.info['connect_time'] = time.time()
        
    @event.listens_for(engine, "checkout")
    def receive_checkout(dbapi_connection, connection_record, connection_proxy):
        """Log when connection is checked out from pool"""
        checkout_time = time.time()
        if 'connect_time' in connection_record.info:
            age = checkout_time - connection_record.info['connect_time']
            if age > 300:  # Log if connection is older than 5 minutes
                logger.debug(f"Checking out connection aged {age:.1f} seconds")
                
    @event.listens_for(engine, "checkin")
    def receive_checkin(dbapi_connection, connection_record):
        """Log when connection is returned to pool"""
        if pool_monitor and hasattr(pool_monitor, 'log_pool_stats'):
            # Periodically log pool statistics
            if time.time() % 60 < 1:  # Log approximately once per minute
                pool_monitor.log_pool_stats()

# Create session factory with optimized settings
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    expire_on_commit=False  # Prevent unnecessary DB hits after commit
)

# Create base class for models using modern SQLAlchemy 2.0 syntax
class Base(DeclarativeBase):
    pass

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()