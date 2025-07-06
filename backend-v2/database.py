from sqlalchemy import create_engine, pool
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from config import settings
import logging

logger = logging.getLogger(__name__)

# Import Sentry monitoring if available
try:
    from services.sentry_monitoring import database_monitor
    SENTRY_MONITORING_AVAILABLE = True
except ImportError:
    SENTRY_MONITORING_AVAILABLE = False
    logger.info("Sentry monitoring not available for database operations")

# Configure connection pool settings based on environment
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

# Set up Sentry database monitoring if available
if SENTRY_MONITORING_AVAILABLE:
    try:
        database_monitor.setup_database_monitoring(engine)
        logger.info("Sentry database monitoring enabled")
    except Exception as e:
        logger.warning(f"Failed to set up Sentry database monitoring: {e}")

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