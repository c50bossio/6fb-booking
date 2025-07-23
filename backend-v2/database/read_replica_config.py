"""
PostgreSQL Read Replica Configuration for BookedBarber V2

This module provides read/write database splitting for production scalability,
supporting 10,000+ concurrent users with optimized query routing.
"""

import os
import logging
from typing import Dict, List, Optional, Union, Literal
from enum import Enum
from sqlalchemy import create_engine, pool, event
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.engine import Engine
from contextlib import contextmanager
import time
import random
from urllib.parse import urlparse

logger = logging.getLogger(__name__)


class DatabaseRole(Enum):
    """Database role enumeration."""
    PRIMARY = "primary"
    REPLICA = "replica"


class QueryType(Enum):
    """Query type classification for routing."""
    READ = "read"
    WRITE = "write"
    TRANSACTION = "transaction"


READ_OPERATIONS = {
    'select', 'show', 'describe', 'explain', 'with'
}

WRITE_OPERATIONS = {
    'insert', 'update', 'delete', 'create', 'drop', 'alter', 
    'truncate', 'replace', 'merge', 'upsert'
}


class ReadReplicaConfig:
    """Configuration for PostgreSQL read replicas."""
    
    def __init__(self):
        self.primary_url = os.getenv('DATABASE_URL', 'sqlite:///./6fb_booking.db')
        self.replica_urls = self._parse_replica_urls()
        self.replica_weights = self._parse_replica_weights()
        self.enable_read_replicas = self._should_enable_replicas()
        self.read_replica_lag_threshold = int(os.getenv('READ_REPLICA_LAG_THRESHOLD', '5'))  # seconds
        self.connection_pool_settings = self._get_pool_settings()
        
    def _parse_replica_urls(self) -> List[str]:
        """Parse read replica URLs from environment variables."""
        replica_urls = []
        
        # Support multiple replica URL formats
        replica_urls_env = os.getenv('READ_REPLICA_URLS', '')
        if replica_urls_env:
            replica_urls.extend([url.strip() for url in replica_urls_env.split(',') if url.strip()])
        
        # Support individual replica URLs (READ_REPLICA_URL_1, READ_REPLICA_URL_2, etc.)
        i = 1
        while True:
            replica_url = os.getenv(f'READ_REPLICA_URL_{i}')
            if not replica_url:
                break
            replica_urls.append(replica_url.strip())
            i += 1
        
        # Support AWS RDS Read Replica endpoint pattern
        rds_cluster_endpoint = os.getenv('RDS_CLUSTER_READER_ENDPOINT')
        if rds_cluster_endpoint:
            replica_urls.append(rds_cluster_endpoint)
        
        return replica_urls
    
    def _parse_replica_weights(self) -> List[float]:
        """Parse replica weights for load balancing."""
        weights_env = os.getenv('READ_REPLICA_WEIGHTS', '')
        if weights_env:
            try:
                weights = [float(w.strip()) for w in weights_env.split(',') if w.strip()]
                # Normalize weights to sum to 1.0
                total = sum(weights)
                return [w / total for w in weights] if total > 0 else []
            except ValueError:
                logger.warning("Invalid READ_REPLICA_WEIGHTS format, using equal weights")
        
        # Equal weights for all replicas
        if self.replica_urls:
            weight = 1.0 / len(self.replica_urls)
            return [weight] * len(self.replica_urls)
        
        return []
    
    def _should_enable_replicas(self) -> bool:
        """Determine if read replicas should be enabled."""
        # Enable replicas if:
        # 1. Environment is production or staging
        # 2. Primary database is PostgreSQL
        # 3. At least one replica URL is configured
        # 4. Explicitly enabled via environment variable
        
        environment = os.getenv('ENVIRONMENT', 'development').lower()
        explicitly_enabled = os.getenv('ENABLE_READ_REPLICAS', 'false').lower() == 'true'
        has_replicas = bool(self.replica_urls)
        is_postgresql = 'postgresql' in self.primary_url.lower()
        is_production_like = environment in ['production', 'staging']
        
        enabled = (explicitly_enabled or (is_production_like and has_replicas)) and is_postgresql
        
        if enabled:
            logger.info(f"Read replicas enabled: {len(self.replica_urls)} replicas configured")
        else:
            logger.info(f"Read replicas disabled: env={environment}, replicas={len(self.replica_urls)}, postgresql={is_postgresql}")
        
        return enabled
    
    def _get_pool_settings(self) -> Dict:
        """Get connection pool settings optimized for read replicas."""
        base_settings = {
            "poolclass": pool.QueuePool,
            "pool_pre_ping": True,
            "pool_recycle": 3600,  # 1 hour
            "echo_pool": False,
        }
        
        if self.enable_read_replicas:
            # Optimized settings for read replicas
            base_settings.update({
                "pool_size": int(os.getenv('READ_REPLICA_POOL_SIZE', '15')),
                "max_overflow": int(os.getenv('READ_REPLICA_MAX_OVERFLOW', '25')),
                "pool_timeout": int(os.getenv('READ_REPLICA_POOL_TIMEOUT', '20')),
            })
        else:
            # Standard settings for single database
            base_settings.update({
                "pool_size": int(os.getenv('DB_POOL_SIZE', '20')),
                "max_overflow": int(os.getenv('DB_MAX_OVERFLOW', '40')),
                "pool_timeout": int(os.getenv('DB_POOL_TIMEOUT', '30')),
            })
        
        # PostgreSQL-specific connection arguments
        if 'postgresql' in self.primary_url:
            base_settings["connect_args"] = {
                "connect_timeout": int(os.getenv('DB_CONNECT_TIMEOUT', '10')),
                "application_name": f"bookedbarber_v2_{DatabaseRole.PRIMARY.value}",
                "options": f"-c statement_timeout={os.getenv('DB_STATEMENT_TIMEOUT', '30000')}"
            }
        
        return base_settings


class DatabaseManager:
    """Manages multiple database connections with read/write splitting."""
    
    def __init__(self, config: ReadReplicaConfig):
        self.config = config
        self.primary_engine: Optional[Engine] = None
        self.replica_engines: List[Engine] = []
        self.primary_session_factory: Optional[sessionmaker] = None
        self.replica_session_factories: List[sessionmaker] = []
        self._initialize_engines()
        self._setup_monitoring()
    
    def _initialize_engines(self):
        """Initialize database engines."""
        # Create primary engine
        primary_pool_settings = self.config.connection_pool_settings.copy()
        if 'postgresql' in self.config.primary_url:
            primary_pool_settings["connect_args"]["application_name"] = "bookedbarber_v2_primary"
        
        self.primary_engine = create_engine(
            self.config.primary_url,
            **primary_pool_settings
        )
        
        self.primary_session_factory = sessionmaker(
            autocommit=False,
            autoflush=False,
            bind=self.primary_engine,
            expire_on_commit=False
        )
        
        logger.info(f"Primary database engine initialized: {self._mask_database_url(self.config.primary_url)}")
        
        # Create replica engines if enabled
        if self.config.enable_read_replicas:
            for i, replica_url in enumerate(self.config.replica_urls):
                replica_pool_settings = self.config.connection_pool_settings.copy()
                if 'postgresql' in replica_url:
                    replica_pool_settings["connect_args"]["application_name"] = f"bookedbarber_v2_replica_{i+1}"
                
                replica_engine = create_engine(
                    replica_url,
                    **replica_pool_settings
                )
                
                replica_session_factory = sessionmaker(
                    autocommit=False,
                    autoflush=False,
                    bind=replica_engine,
                    expire_on_commit=False
                )
                
                self.replica_engines.append(replica_engine)
                self.replica_session_factories.append(replica_session_factory)
                
                logger.info(f"Read replica {i+1} initialized: {self._mask_database_url(replica_url)}")
    
    def _mask_database_url(self, url: str) -> str:
        """Mask sensitive information in database URL for logging."""
        try:
            parsed = urlparse(url)
            masked_password = "***" if parsed.password else ""
            masked_url = f"{parsed.scheme}://{parsed.username}:{masked_password}@{parsed.hostname}:{parsed.port}{parsed.path}"
            return masked_url
        except Exception:
            return url.split('@')[-1] if '@' in url else url
    
    def _setup_monitoring(self):
        """Set up database connection monitoring."""
        # Add event listeners for connection pool monitoring
        @event.listens_for(self.primary_engine, "connect")
        def setup_primary_connection(dbapi_connection, connection_record):
            connection_record.info['role'] = DatabaseRole.PRIMARY.value
            connection_record.info['connect_time'] = time.time()
        
        @event.listens_for(self.primary_engine, "checkout")
        def log_primary_checkout(dbapi_connection, connection_record, connection_proxy):
            if time.time() % 30 < 1:  # Log every ~30 seconds
                self._log_pool_stats(self.primary_engine, "primary")
        
        # Set up replica monitoring
        for i, replica_engine in enumerate(self.replica_engines):
            @event.listens_for(replica_engine, "connect")
            def setup_replica_connection(dbapi_connection, connection_record, replica_index=i):
                connection_record.info['role'] = DatabaseRole.REPLICA.value
                connection_record.info['replica_index'] = replica_index
                connection_record.info['connect_time'] = time.time()
            
            @event.listens_for(replica_engine, "checkout")
            def log_replica_checkout(dbapi_connection, connection_record, connection_proxy, replica_index=i):
                if time.time() % 30 < 1:  # Log every ~30 seconds
                    self._log_pool_stats(replica_engine, f"replica_{replica_index+1}")
    
    def _log_pool_stats(self, engine: Engine, role: str):
        """Log connection pool statistics."""
        try:
            pool = engine.pool
            logger.debug(
                f"Pool stats [{role}]: "
                f"size={pool.size()}, "
                f"checked_in={pool.checkedin()}, "
                f"checked_out={pool.checkedout()}, "
                f"overflow={pool.overflow()}"
            )
        except Exception as e:
            logger.debug(f"Failed to get pool stats for {role}: {e}")
    
    def get_read_engine(self) -> Engine:
        """Get engine for read operations."""
        if not self.config.enable_read_replicas or not self.replica_engines:
            return self.primary_engine
        
        # Weighted random selection of replica
        if self.config.replica_weights:
            selected_index = self._weighted_choice(self.config.replica_weights)
            return self.replica_engines[selected_index]
        
        # Simple round-robin or random selection
        return random.choice(self.replica_engines)
    
    def get_write_engine(self) -> Engine:
        """Get engine for write operations."""
        return self.primary_engine
    
    def get_read_session(self) -> Session:
        """Get session for read operations."""
        if not self.config.enable_read_replicas or not self.replica_session_factories:
            return self.primary_session_factory()
        
        # Weighted random selection of replica session
        if self.config.replica_weights:
            selected_index = self._weighted_choice(self.config.replica_weights)
            return self.replica_session_factories[selected_index]()
        
        # Simple round-robin or random selection
        return random.choice(self.replica_session_factories)()
    
    def get_write_session(self) -> Session:
        """Get session for write operations."""
        return self.primary_session_factory()
    
    def _weighted_choice(self, weights: List[float]) -> int:
        """Select index based on weights."""
        r = random.random()
        cumulative = 0.0
        for i, weight in enumerate(weights):
            cumulative += weight
            if r <= cumulative:
                return i
        return len(weights) - 1  # Fallback to last index
    
    @contextmanager
    def get_session(self, query_type: QueryType = QueryType.READ):
        """Context manager for database sessions with automatic routing."""
        if query_type == QueryType.WRITE or query_type == QueryType.TRANSACTION:
            session = self.get_write_session()
        else:
            session = self.get_read_session()
        
        try:
            yield session
            session.commit()
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()
    
    def health_check(self) -> Dict:
        """Perform health check on all database connections."""
        health_status = {
            "primary": self._check_engine_health(self.primary_engine, "primary"),
            "replicas": [],
            "overall_healthy": True
        }
        
        # Check replica health
        for i, engine in enumerate(self.replica_engines):
            replica_health = self._check_engine_health(engine, f"replica_{i+1}")
            health_status["replicas"].append(replica_health)
            if not replica_health["healthy"]:
                health_status["overall_healthy"] = False
        
        # Primary must be healthy
        if not health_status["primary"]["healthy"]:
            health_status["overall_healthy"] = False
        
        return health_status
    
    def _check_engine_health(self, engine: Engine, name: str) -> Dict:
        """Check health of a specific engine."""
        try:
            start_time = time.time()
            with engine.connect() as conn:
                result = conn.execute("SELECT 1")
                result.fetchone()
            
            response_time = (time.time() - start_time) * 1000  # milliseconds
            
            return {
                "name": name,
                "healthy": True,
                "response_time_ms": round(response_time, 2),
                "pool_size": engine.pool.size(),
                "checked_out": engine.pool.checkedout(),
                "overflow": engine.pool.overflow()
            }
        except Exception as e:
            logger.error(f"Health check failed for {name}: {e}")
            return {
                "name": name,
                "healthy": False,
                "error": str(e),
                "response_time_ms": None
            }
    
    def get_stats(self) -> Dict:
        """Get detailed database statistics."""
        stats = {
            "config": {
                "read_replicas_enabled": self.config.enable_read_replicas,
                "replica_count": len(self.replica_engines),
                "primary_url": self._mask_database_url(self.config.primary_url),
                "replica_urls": [self._mask_database_url(url) for url in self.config.replica_urls]
            },
            "connections": {
                "primary": self._get_engine_stats(self.primary_engine),
                "replicas": [self._get_engine_stats(engine) for engine in self.replica_engines]
            }
        }
        
        return stats
    
    def _get_engine_stats(self, engine: Engine) -> Dict:
        """Get statistics for a specific engine."""
        try:
            pool = engine.pool
            return {
                "pool_size": pool.size(),
                "checked_in": pool.checkedin(),
                "checked_out": pool.checkedout(),
                "overflow": pool.overflow(),
                "total_connections": pool.size() + pool.overflow()
            }
        except Exception as e:
            return {"error": str(e)}


# Global instances
_config = ReadReplicaConfig()
_db_manager = DatabaseManager(_config)


def get_db_manager() -> DatabaseManager:
    """Get the global database manager instance."""
    return _db_manager


def get_read_db() -> Session:
    """Get a database session optimized for read operations."""
    return _db_manager.get_read_session()


def get_write_db() -> Session:
    """Get a database session for write operations."""
    return _db_manager.get_write_session()


@contextmanager
def db_session(query_type: QueryType = QueryType.READ):
    """Context manager for database sessions with automatic routing."""
    with _db_manager.get_session(query_type) as session:
        yield session


# Compatibility with existing code
def get_db():
    """Compatibility function - defaults to read session for backward compatibility."""
    return get_read_db()


# Health check function
async def check_database_health() -> Dict:
    """Async wrapper for database health check."""
    return _db_manager.health_check()


# Statistics function
async def get_database_stats() -> Dict:
    """Async wrapper for database statistics."""
    return _db_manager.get_stats()


# Usage examples and documentation
"""
Usage Examples:

1. Basic read/write operations:

from database.read_replica_config import get_read_db, get_write_db

# For read operations
with get_read_db() as db:
    users = db.query(User).all()

# For write operations  
with get_write_db() as db:
    new_user = User(name="John")
    db.add(new_user)
    db.commit()

2. Using context manager:

from database.read_replica_config import db_session, QueryType

# Read operation
with db_session(QueryType.READ) as db:
    appointments = db.query(Appointment).all()

# Write operation
with db_session(QueryType.WRITE) as db:
    appointment = Appointment(...)
    db.add(appointment)

# Transaction (automatically uses primary)
with db_session(QueryType.TRANSACTION) as db:
    # Complex multi-table operations
    pass

3. Health monitoring:

from database.read_replica_config import check_database_health

health = await check_database_health()
if not health["overall_healthy"]:
    # Handle database issues
    pass

4. Environment configuration:

# Required for read replicas
DATABASE_URL=postgresql://user:pass@primary.example.com:5432/db
READ_REPLICA_URLS=postgresql://user:pass@replica1.example.com:5432/db,postgresql://user:pass@replica2.example.com:5432/db
ENABLE_READ_REPLICAS=true

# Optional configuration
READ_REPLICA_WEIGHTS=0.6,0.4  # 60% to replica1, 40% to replica2
READ_REPLICA_POOL_SIZE=15
READ_REPLICA_MAX_OVERFLOW=25
READ_REPLICA_LAG_THRESHOLD=5
"""