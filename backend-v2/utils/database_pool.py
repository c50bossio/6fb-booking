"""
Database Connection Pooling and Circuit Breaker System
Production-grade database resilience for agent operations
"""

import asyncio
import logging
import sqlite3
import time
import threading
from contextlib import contextmanager, asynccontextmanager
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
from enum import Enum
from typing import Dict, List, Optional, Any, Union, Callable, AsyncGenerator
from queue import Queue, Empty, Full
import json
from pathlib import Path

from .agent_error_handler import (
    DatabaseError, CircuitBreaker, CircuitBreakerConfig, 
    CircuitBreakerState, ErrorSeverity, error_handler
)


class PoolState(Enum):
    INITIALIZING = "initializing"
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"
    SHUTDOWN = "shutdown"


class ConnectionState(Enum):
    AVAILABLE = "available"
    IN_USE = "in_use"
    INVALID = "invalid"
    EXPIRED = "expired"


@dataclass
class ConnectionMetrics:
    """Metrics for database connections"""
    connection_id: str
    created_at: datetime
    last_used: datetime
    total_queries: int = 0
    successful_queries: int = 0
    failed_queries: int = 0
    average_query_time_ms: float = 0.0
    state: ConnectionState = ConnectionState.AVAILABLE
    
    def record_query(self, duration_ms: float, success: bool):
        """Record query execution metrics"""
        self.total_queries += 1
        self.last_used = datetime.now()
        
        if success:
            self.successful_queries += 1
        else:
            self.failed_queries += 1
        
        # Update average query time
        self.average_query_time_ms = (
            (self.average_query_time_ms * (self.total_queries - 1) + duration_ms) 
            / self.total_queries
        )
    
    @property
    def success_rate_percent(self) -> float:
        """Calculate query success rate"""
        if self.total_queries == 0:
            return 100.0
        return (self.successful_queries / self.total_queries) * 100


@dataclass
class PoolConfiguration:
    """Database pool configuration"""
    database_path: str
    min_connections: int = 5
    max_connections: int = 20
    connection_timeout_seconds: int = 30
    idle_timeout_seconds: int = 300
    max_connection_age_seconds: int = 3600
    health_check_interval_seconds: int = 60
    circuit_breaker_config: CircuitBreakerConfig = None
    enable_metrics: bool = True
    enable_query_logging: bool = False


class DatabaseConnection:
    """Enhanced database connection with monitoring"""
    
    def __init__(self, connection_id: str, database_path: str, enable_metrics: bool = True):
        self.connection_id = connection_id
        self.database_path = database_path
        self.enable_metrics = enable_metrics
        self.logger = logging.getLogger(f"db_connection.{connection_id}")
        
        # Connection state
        self._connection: Optional[sqlite3.Connection] = None
        self._lock = threading.Lock()
        self.is_valid = True
        
        # Metrics
        self.metrics = ConnectionMetrics(
            connection_id=connection_id,
            created_at=datetime.now(),
            last_used=datetime.now()
        )
        
        # Initialize connection
        self._connect()
    
    def _connect(self):
        """Establish database connection"""
        try:
            self._connection = sqlite3.connect(
                self.database_path,
                timeout=30,
                check_same_thread=False,
                isolation_level=None  # Autocommit mode
            )
            
            # Configure connection
            self._connection.execute("PRAGMA journal_mode=WAL")
            self._connection.execute("PRAGMA synchronous=NORMAL")
            self._connection.execute("PRAGMA cache_size=10000")
            self._connection.execute("PRAGMA temp_store=MEMORY")
            
            self.is_valid = True
            self.logger.debug(f"Connection {self.connection_id} established")
            
        except Exception as e:
            self.is_valid = False
            self.logger.error(f"Failed to connect {self.connection_id}: {e}")
            raise DatabaseError(f"Connection failed: {e}")
    
    def execute_query(self, query: str, params: tuple = None) -> List[tuple]:
        """Execute query with metrics and error handling"""
        if not self.is_valid or not self._connection:
            raise DatabaseError("Connection is invalid")
        
        start_time = time.time()
        success = False
        
        try:
            with self._lock:
                cursor = self._connection.cursor()
                
                if params:
                    result = cursor.execute(query, params).fetchall()
                else:
                    result = cursor.execute(query).fetchall()
                
                cursor.close()
                success = True
                return result
                
        except Exception as e:
            self.logger.error(f"Query failed on {self.connection_id}: {e}")
            self._check_connection_health()
            raise DatabaseError(f"Query execution failed: {e}")
        
        finally:
            duration_ms = (time.time() - start_time) * 1000
            if self.enable_metrics:
                self.metrics.record_query(duration_ms, success)
    
    def execute_transaction(self, queries: List[tuple]) -> bool:
        """Execute multiple queries in a transaction"""
        if not self.is_valid or not self._connection:
            raise DatabaseError("Connection is invalid")
        
        start_time = time.time()
        success = False
        
        try:
            with self._lock:
                # Start transaction
                self._connection.execute("BEGIN TRANSACTION")
                
                try:
                    for query, params in queries:
                        if params:
                            self._connection.execute(query, params)
                        else:
                            self._connection.execute(query)
                    
                    self._connection.execute("COMMIT")
                    success = True
                    return True
                    
                except Exception as e:
                    self._connection.execute("ROLLBACK")
                    self.logger.error(f"Transaction failed on {self.connection_id}: {e}")
                    raise DatabaseError(f"Transaction failed: {e}")
                
        except Exception as e:
            self._check_connection_health()
            raise
        
        finally:
            duration_ms = (time.time() - start_time) * 1000
            if self.enable_metrics:
                self.metrics.record_query(duration_ms, success)
    
    def _check_connection_health(self):
        """Check if connection is still healthy"""
        try:
            self._connection.execute("SELECT 1").fetchone()
        except Exception:
            self.is_valid = False
            self.metrics.state = ConnectionState.INVALID
            self.logger.warning(f"Connection {self.connection_id} marked as invalid")
    
    def close(self):
        """Close the database connection"""
        if self._connection:
            try:
                self._connection.close()
            except Exception as e:
                self.logger.error(f"Error closing connection {self.connection_id}: {e}")
        
        self.is_valid = False
        self.metrics.state = ConnectionState.EXPIRED
    
    @property
    def age_seconds(self) -> float:
        """Get connection age in seconds"""
        return (datetime.now() - self.metrics.created_at).total_seconds()
    
    @property
    def idle_seconds(self) -> float:
        """Get time since last use in seconds"""
        return (datetime.now() - self.metrics.last_used).total_seconds()


class DatabaseConnectionPool:
    """High-performance database connection pool with circuit breaker"""
    
    def __init__(self, config: PoolConfiguration):
        self.config = config
        self.logger = logging.getLogger("database_pool")
        
        # Connection pool
        self.available_connections: Queue = Queue()
        self.all_connections: Dict[str, DatabaseConnection] = {}
        self.connections_in_use: Dict[str, DatabaseConnection] = {}
        
        # Pool state
        self.state = PoolState.INITIALIZING
        self.pool_lock = threading.Lock()
        
        # Circuit breaker
        self.circuit_breaker = CircuitBreaker(
            "database_pool",
            self.config.circuit_breaker_config or CircuitBreakerConfig()
        )
        
        # Health monitoring
        self.health_monitor_thread = None
        self.shutdown_event = threading.Event()
        
        # Pool metrics
        self.pool_metrics = {
            "total_connections_created": 0,
            "total_queries_executed": 0,
            "total_transactions_executed": 0,
            "connection_checkout_count": 0,
            "connection_checkout_failures": 0,
            "circuit_breaker_trips": 0,
            "last_health_check": None
        }
        
        # Initialize pool
        self._initialize_pool()
        self._start_health_monitor()
    
    def _initialize_pool(self):
        """Initialize the connection pool"""
        try:
            # Create minimum connections
            for i in range(self.config.min_connections):
                connection = self._create_connection()
                self.available_connections.put(connection, block=False)
            
            self.state = PoolState.HEALTHY
            self.logger.info(f"Database pool initialized with {self.config.min_connections} connections")
            
        except Exception as e:
            self.state = PoolState.UNHEALTHY
            self.logger.error(f"Failed to initialize database pool: {e}")
            raise DatabaseError(f"Pool initialization failed: {e}")
    
    def _create_connection(self) -> DatabaseConnection:
        """Create a new database connection"""
        connection_id = f"conn_{len(self.all_connections) + 1}_{int(time.time())}"
        
        try:
            connection = DatabaseConnection(
                connection_id=connection_id,
                database_path=self.config.database_path,
                enable_metrics=self.config.enable_metrics
            )
            
            with self.pool_lock:
                self.all_connections[connection_id] = connection
                self.pool_metrics["total_connections_created"] += 1
            
            self.logger.debug(f"Created new connection: {connection_id}")
            return connection
            
        except Exception as e:
            self.logger.error(f"Failed to create connection {connection_id}: {e}")
            raise
    
    @contextmanager
    def get_connection(self, timeout_seconds: Optional[int] = None):
        """Get a connection from the pool with context manager"""
        timeout = timeout_seconds or self.config.connection_timeout_seconds
        connection = None
        
        try:
            # Check circuit breaker
            if not self.circuit_breaker.can_execute():
                self.pool_metrics["circuit_breaker_trips"] += 1
                raise DatabaseError("Database circuit breaker is open")
            
            # Get connection from pool
            start_time = time.time()
            
            try:
                connection = self.available_connections.get(timeout=timeout)
                self.pool_metrics["connection_checkout_count"] += 1
                
            except Empty:
                # Pool is empty, try to create new connection if under limit
                with self.pool_lock:
                    if len(self.all_connections) < self.config.max_connections:
                        connection = self._create_connection()
                        self.pool_metrics["connection_checkout_count"] += 1
                    else:
                        self.pool_metrics["connection_checkout_failures"] += 1
                        raise DatabaseError("Connection pool exhausted and at maximum capacity")
            
            # Validate connection
            if not connection.is_valid:
                self._remove_invalid_connection(connection)
                connection = self._create_connection()
            
            # Mark as in use
            with self.pool_lock:
                self.connections_in_use[connection.connection_id] = connection
            
            # Record successful checkout
            self.circuit_breaker.record_success()
            
            yield connection
            
        except Exception as e:
            # Record failure
            self.circuit_breaker.record_failure()
            
            if connection:
                self._mark_connection_invalid(connection)
            
            self.logger.error(f"Error getting database connection: {e}")
            raise DatabaseError(f"Failed to get database connection: {e}")
        
        finally:
            # Return connection to pool
            if connection:
                self._return_connection(connection)
    
    def _return_connection(self, connection: DatabaseConnection):
        """Return a connection to the pool"""
        try:
            with self.pool_lock:
                # Remove from in-use tracking
                if connection.connection_id in self.connections_in_use:
                    del self.connections_in_use[connection.connection_id]
                
                # Check if connection should be retired
                if (connection.age_seconds > self.config.max_connection_age_seconds or
                    not connection.is_valid):
                    self._remove_invalid_connection(connection)
                    return
                
                # Return to available pool
                try:
                    self.available_connections.put(connection, block=False)
                    connection.metrics.state = ConnectionState.AVAILABLE
                except Full:
                    # Pool is full, close excess connection
                    self._remove_invalid_connection(connection)
                    
        except Exception as e:
            self.logger.error(f"Error returning connection {connection.connection_id}: {e}")
            self._remove_invalid_connection(connection)
    
    def _remove_invalid_connection(self, connection: DatabaseConnection):
        """Remove and close an invalid connection"""
        try:
            with self.pool_lock:
                if connection.connection_id in self.all_connections:
                    del self.all_connections[connection.connection_id]
                
                if connection.connection_id in self.connections_in_use:
                    del self.connections_in_use[connection.connection_id]
            
            connection.close()
            self.logger.debug(f"Removed invalid connection: {connection.connection_id}")
            
        except Exception as e:
            self.logger.error(f"Error removing connection {connection.connection_id}: {e}")
    
    def _mark_connection_invalid(self, connection: DatabaseConnection):
        """Mark a connection as invalid"""
        connection.is_valid = False
        connection.metrics.state = ConnectionState.INVALID
    
    def _start_health_monitor(self):
        """Start background health monitoring"""
        def health_monitor_loop():
            while not self.shutdown_event.is_set():
                try:
                    self._perform_health_check()
                    self._cleanup_connections()
                    time.sleep(self.config.health_check_interval_seconds)
                except Exception as e:
                    self.logger.error(f"Error in health monitor: {e}")
                    time.sleep(5)
        
        self.health_monitor_thread = threading.Thread(
            target=health_monitor_loop, 
            daemon=True,
            name="db_pool_health_monitor"
        )
        self.health_monitor_thread.start()
        self.logger.info("Database pool health monitor started")
    
    def _perform_health_check(self):
        """Perform health check on all connections"""
        unhealthy_connections = []
        
        with self.pool_lock:
            for connection_id, connection in self.all_connections.items():
                try:
                    # Skip connections currently in use
                    if connection_id in self.connections_in_use:
                        continue
                    
                    # Test connection with simple query
                    connection.execute_query("SELECT 1")
                    
                except Exception as e:
                    self.logger.warning(f"Health check failed for {connection_id}: {e}")
                    unhealthy_connections.append(connection)
        
        # Remove unhealthy connections
        for connection in unhealthy_connections:
            self._remove_invalid_connection(connection)
        
        # Update pool state
        self._update_pool_state()
        self.pool_metrics["last_health_check"] = datetime.now().isoformat()
    
    def _cleanup_connections(self):
        """Clean up idle and expired connections"""
        connections_to_remove = []
        
        with self.pool_lock:
            for connection_id, connection in self.all_connections.items():
                # Skip connections currently in use
                if connection_id in self.connections_in_use:
                    continue
                
                # Check for expired connections
                if (connection.age_seconds > self.config.max_connection_age_seconds or
                    connection.idle_seconds > self.config.idle_timeout_seconds):
                    connections_to_remove.append(connection)
        
        # Remove expired connections (but maintain minimum)
        for connection in connections_to_remove:
            if len(self.all_connections) > self.config.min_connections:
                self._remove_invalid_connection(connection)
    
    def _update_pool_state(self):
        """Update overall pool health state"""
        total_connections = len(self.all_connections)
        healthy_connections = sum(
            1 for conn in self.all_connections.values() 
            if conn.is_valid
        )
        
        if total_connections == 0:
            self.state = PoolState.UNHEALTHY
        elif healthy_connections == 0:
            self.state = PoolState.UNHEALTHY
        elif healthy_connections < self.config.min_connections:
            self.state = PoolState.DEGRADED
        else:
            self.state = PoolState.HEALTHY
    
    def execute_query(self, query: str, params: tuple = None) -> List[tuple]:
        """Execute query using pool connection"""
        with self.get_connection() as connection:
            result = connection.execute_query(query, params)
            self.pool_metrics["total_queries_executed"] += 1
            return result
    
    def execute_transaction(self, queries: List[tuple]) -> bool:
        """Execute transaction using pool connection"""
        with self.get_connection() as connection:
            result = connection.execute_transaction(queries)
            self.pool_metrics["total_transactions_executed"] += 1
            return result
    
    def get_pool_status(self) -> Dict[str, Any]:
        """Get comprehensive pool status"""
        with self.pool_lock:
            connection_metrics = []
            
            for connection in self.all_connections.values():
                connection_metrics.append({
                    "connection_id": connection.connection_id,
                    "state": connection.metrics.state.value,
                    "age_seconds": connection.age_seconds,
                    "idle_seconds": connection.idle_seconds,
                    "total_queries": connection.metrics.total_queries,
                    "success_rate_percent": connection.metrics.success_rate_percent,
                    "average_query_time_ms": connection.metrics.average_query_time_ms
                })
            
            pool_status = {
                "pool_state": self.state.value,
                "total_connections": len(self.all_connections),
                "available_connections": self.available_connections.qsize(),
                "connections_in_use": len(self.connections_in_use),
                "circuit_breaker_state": self.circuit_breaker.state.value,
                "pool_metrics": self.pool_metrics.copy(),
                "connection_details": connection_metrics,
                "configuration": asdict(self.config)
            }
        
        return pool_status
    
    def shutdown(self):
        """Gracefully shutdown the connection pool"""
        self.logger.info("Shutting down database connection pool")
        
        # Signal health monitor to stop
        self.shutdown_event.set()
        
        # Wait for health monitor to finish
        if self.health_monitor_thread:
            self.health_monitor_thread.join(timeout=5)
        
        # Close all connections
        with self.pool_lock:
            for connection in self.all_connections.values():
                connection.close()
            
            self.all_connections.clear()
            self.connections_in_use.clear()
            
            # Empty the queue
            while not self.available_connections.empty():
                try:
                    self.available_connections.get_nowait()
                except Empty:
                    break
        
        self.state = PoolState.SHUTDOWN
        self.logger.info("Database connection pool shutdown complete")


# Global database pool instance
_global_pool: Optional[DatabaseConnectionPool] = None
_pool_lock = threading.Lock()


def initialize_database_pool(config: PoolConfiguration) -> DatabaseConnectionPool:
    """Initialize the global database pool"""
    global _global_pool
    
    with _pool_lock:
        if _global_pool is not None:
            _global_pool.shutdown()
        
        _global_pool = DatabaseConnectionPool(config)
        return _global_pool


def get_database_pool() -> DatabaseConnectionPool:
    """Get the global database pool instance"""
    global _global_pool
    
    if _global_pool is None:
        # Create default pool for SQLite
        default_config = PoolConfiguration(
            database_path="bookedbarber.db",
            min_connections=5,
            max_connections=20
        )
        return initialize_database_pool(default_config)
    
    return _global_pool


def shutdown_database_pool():
    """Shutdown the global database pool"""
    global _global_pool
    
    with _pool_lock:
        if _global_pool is not None:
            _global_pool.shutdown()
            _global_pool = None


# Convenience functions
@contextmanager
def get_db_connection():
    """Get database connection from global pool"""
    pool = get_database_pool()
    with pool.get_connection() as connection:
        yield connection


def execute_query(query: str, params: tuple = None) -> List[tuple]:
    """Execute query using global pool"""
    pool = get_database_pool()
    return pool.execute_query(query, params)


def execute_transaction(queries: List[tuple]) -> bool:
    """Execute transaction using global pool"""
    pool = get_database_pool()
    return pool.execute_transaction(queries)


def get_db_pool_status() -> Dict[str, Any]:
    """Get global pool status"""
    pool = get_database_pool()
    return pool.get_pool_status()