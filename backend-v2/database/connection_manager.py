import os
from sqlalchemy import create_engine, event
from sqlalchemy.pool import QueuePool
from sqlalchemy.orm import sessionmaker
import logging

logger = logging.getLogger(__name__)

class DatabaseConnectionManager:
    """Optimized database connection management for production scaling"""
    
    def __init__(self):
        self.database_url = os.getenv("DATABASE_URL")
        self.engine = self._create_optimized_engine()
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
    
    def _create_optimized_engine(self):
        """Create optimized database engine with connection pooling"""
        
        # Production-optimized connection pool settings
        pool_settings = {
            # Connection Pool Configuration
            "poolclass": QueuePool,
            "pool_size": int(os.getenv("DB_POOL_SIZE", 50)),          # Base connections
            "max_overflow": int(os.getenv("DB_MAX_OVERFLOW", 20)),    # Extra connections
            "pool_timeout": int(os.getenv("DB_POOL_TIMEOUT", 30)),    # Connection timeout
            "pool_recycle": int(os.getenv("DB_POOL_RECYCLE", 3600)),  # Recycle after 1 hour
            "pool_pre_ping": True,                                    # Verify connections
            
            # Performance Settings
            "echo": False,                                            # Disable SQL logging in prod
            "echo_pool": False,                                       # Disable pool logging
            "future": True,                                           # Use SQLAlchemy 2.0 style
            
            # Connection String Parameters
            "connect_args": {
                "connect_timeout": 10,
                "command_timeout": 30,
                "sslmode": "require" if "prod" in os.getenv("ENVIRONMENT", "") else "prefer",
                "application_name": "bookedbarber_v2",
                "options": "-c statement_timeout=30000 -c idle_in_transaction_session_timeout=60000"
            }
        }
        
        engine = create_engine(self.database_url, **pool_settings)
        self._add_connection_listeners(engine)
        return engine
    
    def _add_connection_listeners(self, engine):
        """Add connection event listeners for monitoring and optimization"""
        
        @event.listens_for(engine, "connect")
        def receive_connect(dbapi_connection, connection_record):
            """Optimize connection on connect"""
            logger.debug("New database connection established")
            
            with dbapi_connection.cursor() as cursor:
                cursor.execute("SET synchronous_commit = 'on'")
                cursor.execute("SET random_page_cost = 1.1")
                cursor.execute("SET work_mem = '16MB'")
                cursor.execute("SET maintenance_work_mem = '256MB'")
                cursor.execute("SET max_parallel_workers_per_gather = 2")
    
    def get_session(self):
        """Get database session with automatic cleanup"""
        db = self.SessionLocal()
        try:
            yield db
        finally:
            db.close()

# Global database connection manager
db_manager = DatabaseConnectionManager()

def get_database_session():
    """FastAPI dependency for database sessions"""
    return db_manager.get_session()
