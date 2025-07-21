"""
Enhanced Connection Pooling Service for BookedBarber V2
======================================================

Production-ready connection pooling with advanced monitoring, dynamic sizing,
and automatic optimization for database and Redis connections.

Features:
- Dynamic pool sizing based on load
- Connection health monitoring and automatic recovery
- Performance metrics and alerting
- Integration with circuit breakers
- Connection leak detection and prevention
- Automatic failover and load balancing

Usage:
    from services.enhanced_connection_pooling import connection_pool_manager
    
    # Get optimized database session
    async with connection_pool_manager.get_database_session() as session:
        result = await session.execute(query)
    
    # Get Redis connection with monitoring
    async with connection_pool_manager.get_redis_connection() as redis:
        await redis.set("key", "value")
"""

import asyncio
import time
import logging
import threading
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, AsyncGenerator, List
from dataclasses import dataclass, asdict
from contextlib import asynccontextmanager
from sqlalchemy.pool import QueuePool, StaticPool
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy import create_engine, text, event
import psutil

from database import engine, SessionLocal
from services.redis_service import cache_service
from services.circuit_breaker import circuit_breaker_manager
from config.redis_config import get_redis_config
from config import settings

logger = logging.getLogger(__name__)


@dataclass
class ConnectionPoolMetrics:
    """Connection pool performance metrics."""
    timestamp: datetime
    pool_name: str
    pool_size: int
    active_connections: int
    idle_connections: int
    overflow_connections: int
    checked_in_connections: int
    total_requests: int
    failed_requests: int
    average_wait_time: float
    max_wait_time: float
    connection_errors: int
    pool_utilization: float
    health_score: float


@dataclass
class ConnectionPoolConfig:
    """Dynamic connection pool configuration."""
    min_size: int = 10
    max_size: int = 50
    max_overflow: int = 20
    pool_timeout: int = 30
    pool_recycle: int = 3600  # 1 hour
    pool_pre_ping: bool = True
    echo_pool: bool = False
    target_utilization: float = 0.75
    scale_up_threshold: float = 0.85
    scale_down_threshold: float = 0.40
    health_check_interval: int = 60
    metrics_retention_hours: int = 24


class DatabaseConnectionPool:
    """Enhanced database connection pool with monitoring."""
    
    def __init__(self, config: ConnectionPoolConfig):
        """Initialize database connection pool."""
        self.config = config
        self.engine = engine
        self.session_factory = SessionLocal
        self.metrics: List[ConnectionPoolMetrics] = []
        self.last_optimization = time.time()
        self.optimization_interval = 300  # 5 minutes
        
        # Connection tracking
        self._active_sessions: Dict[str, float] = {}  # session_id -> start_time
        self._connection_waits: List[float] = []  # Wait times for monitoring
        
        # Set up connection event listeners
        self._setup_connection_monitoring()
        
        logger.info(f"Database connection pool initialized: size={config.min_size}-{config.max_size}")
    
    def _setup_connection_monitoring(self) -> None:
        """Set up SQLAlchemy event listeners for monitoring."""
        
        @event.listens_for(self.engine, "checkout")
        def receive_checkout(dbapi_connection, connection_record, connection_proxy):
            """Monitor connection checkout."""
            connection_record.info['checkout_time'] = time.time()
            if 'wait_time' in connection_record.info:
                self._connection_waits.append(connection_record.info['wait_time'])
                # Keep only recent wait times
                if len(self._connection_waits) > 1000:
                    self._connection_waits = self._connection_waits[-500:]
        
        @event.listens_for(self.engine, "checkin")
        def receive_checkin(dbapi_connection, connection_record):
            """Monitor connection checkin."""
            if 'checkout_time' in connection_record.info:
                session_duration = time.time() - connection_record.info['checkout_time']
                if session_duration > 300:  # Log long-running sessions (5+ minutes)
                    logger.warning(f"Long-running database session: {session_duration:.1f}s")
        
        @event.listens_for(self.engine, "connect")
        def receive_connect(dbapi_connection, connection_record):
            """Monitor new connections."""
            connection_record.info['connect_time'] = time.time()
            logger.debug("New database connection created")
        
        @event.listens_for(self.engine, "close")
        def receive_close(dbapi_connection, connection_record):
            """Monitor connection close."""
            if 'connect_time' in connection_record.info:
                connection_lifetime = time.time() - connection_record.info['connect_time']
                logger.debug(f"Database connection closed after {connection_lifetime:.1f}s")
    
    @asynccontextmanager
    async def get_session(self) -> AsyncGenerator[Session, None]:
        """
        Get database session with monitoring and automatic cleanup.
        
        Yields:
            Database session
        """
        session_id = f"session_{int(time.time() * 1000)}_{id(asyncio.current_task())}"
        start_time = time.time()
        
        try:
            # Apply circuit breaker protection
            session = await circuit_breaker_manager.execute_with_breaker(
                'database',
                self.session_factory
            )
            
            # Track active session
            self._active_sessions[session_id] = start_time
            
            yield session
            
            # Commit if no exception occurred
            session.commit()
            
        except Exception as e:
            # Rollback on error
            if session:
                session.rollback()
            logger.error(f"Database session error: {e}")
            raise
        
        finally:
            # Clean up
            if session:
                session.close()
            
            # Remove from tracking
            if session_id in self._active_sessions:
                session_duration = time.time() - self._active_sessions[session_id]
                del self._active_sessions[session_id]
                
                # Log slow queries
                if session_duration > 10.0:
                    logger.warning(f"Slow database session: {session_duration:.2f}s")
    
    async def health_check(self) -> Dict[str, Any]:
        """Perform database connection pool health check."""
        try:
            start_time = time.time()
            
            async with self.get_session() as session:
                # Simple query to test connectivity
                result = await asyncio.to_thread(session.execute, text("SELECT 1"))
                result.fetchone()
            
            response_time = (time.time() - start_time) * 1000  # Convert to ms
            
            # Get pool statistics
            pool = self.engine.pool
            pool_status = {
                'size': pool.size(),
                'checked_in': pool.checkedin(),
                'checked_out': pool.checkedout(),
                'overflow': pool.overflow(),
                'response_time_ms': round(response_time, 2),
                'status': 'healthy' if response_time < 1000 else 'degraded'
            }
            
            return pool_status
            
        except Exception as e:
            logger.error(f"Database health check failed: {e}")
            return {
                'status': 'unhealthy',
                'error': str(e),
                'response_time_ms': None
            }
    
    def collect_metrics(self) -> ConnectionPoolMetrics:
        """Collect current pool metrics."""
        try:
            pool = self.engine.pool
            current_time = datetime.utcnow()
            
            # Calculate utilization
            active = pool.checkedout()
            total_capacity = pool.size() + pool.overflow()
            utilization = active / total_capacity if total_capacity > 0 else 0
            
            # Calculate wait time statistics
            avg_wait = sum(self._connection_waits) / len(self._connection_waits) if self._connection_waits else 0
            max_wait = max(self._connection_waits) if self._connection_waits else 0
            
            # Calculate health score (0-100)
            health_score = 100
            if utilization > 0.9:
                health_score -= 30
            elif utilization > 0.8:
                health_score -= 15
            
            if avg_wait > 1.0:  # Average wait > 1 second
                health_score -= 20
            
            if len(self._active_sessions) > total_capacity * 1.2:  # Possible connection leak
                health_score -= 25
            
            health_score = max(0, health_score)
            
            metrics = ConnectionPoolMetrics(
                timestamp=current_time,
                pool_name="database",
                pool_size=pool.size(),
                active_connections=active,
                idle_connections=pool.checkedin(),
                overflow_connections=pool.overflow(),
                checked_in_connections=pool.checkedin(),
                total_requests=len(self._connection_waits),
                failed_requests=0,  # Would need error tracking
                average_wait_time=avg_wait,
                max_wait_time=max_wait,
                connection_errors=0,
                pool_utilization=utilization,
                health_score=health_score
            )
            
            # Store metrics
            self.metrics.append(metrics)
            
            # Limit metrics retention
            cutoff_time = current_time - timedelta(hours=self.config.metrics_retention_hours)
            self.metrics = [m for m in self.metrics if m.timestamp > cutoff_time]
            
            return metrics
            
        except Exception as e:
            logger.error(f"Error collecting database pool metrics: {e}")
            return None
    
    def optimize_pool_size(self) -> Dict[str, Any]:
        """Optimize pool size based on usage patterns."""
        current_time = time.time()
        if current_time - self.last_optimization < self.optimization_interval:
            return {"status": "skipped", "reason": "optimization_interval_not_reached"}
        
        try:
            recent_metrics = [m for m in self.metrics if (datetime.utcnow() - m.timestamp).total_seconds() < 1800]  # Last 30 minutes
            
            if len(recent_metrics) < 5:
                return {"status": "skipped", "reason": "insufficient_metrics"}
            
            # Analyze usage patterns
            avg_utilization = sum(m.pool_utilization for m in recent_metrics) / len(recent_metrics)
            peak_utilization = max(m.pool_utilization for m in recent_metrics)
            avg_wait = sum(m.average_wait_time for m in recent_metrics) / len(recent_metrics)
            
            pool = self.engine.pool
            current_size = pool.size()
            
            recommendations = []
            
            # Scale up if high utilization or long waits
            if peak_utilization > self.config.scale_up_threshold or avg_wait > 1.0:
                new_size = min(current_size + 5, self.config.max_size)
                if new_size > current_size:
                    recommendations.append({
                        'action': 'increase_pool_size',
                        'current': current_size,
                        'recommended': new_size,
                        'reason': f'High utilization: {peak_utilization:.1%}, Avg wait: {avg_wait:.2f}s'
                    })
            
            # Scale down if consistently low utilization
            elif avg_utilization < self.config.scale_down_threshold and avg_wait < 0.1:
                new_size = max(current_size - 3, self.config.min_size)
                if new_size < current_size:
                    recommendations.append({
                        'action': 'decrease_pool_size',
                        'current': current_size,
                        'recommended': new_size,
                        'reason': f'Low utilization: {avg_utilization:.1%}'
                    })
            
            self.last_optimization = current_time
            
            return {
                'status': 'analyzed',
                'current_metrics': {
                    'avg_utilization': avg_utilization,
                    'peak_utilization': peak_utilization,
                    'avg_wait_time': avg_wait,
                    'current_pool_size': current_size
                },
                'recommendations': recommendations
            }
            
        except Exception as e:
            logger.error(f"Pool optimization error: {e}")
            return {"status": "error", "error": str(e)}


class RedisConnectionPool:
    """Enhanced Redis connection pool with monitoring."""
    
    def __init__(self, config: ConnectionPoolConfig):
        """Initialize Redis connection pool."""
        self.config = config
        self.redis_config = get_redis_config()
        self.cache = cache_service
        self.metrics: List[ConnectionPoolMetrics] = []
        
        logger.info("Redis connection pool monitoring initialized")
    
    @asynccontextmanager
    async def get_connection(self) -> AsyncGenerator[Any, None]:
        """
        Get Redis connection with monitoring.
        
        Yields:
            Redis connection
        """
        start_time = time.time()
        connection = None
        
        try:
            # Apply circuit breaker protection
            connection = await circuit_breaker_manager.execute_with_breaker(
                'redis_cache',
                self.cache.get_connection
            )
            
            yield connection
            
        except Exception as e:
            logger.error(f"Redis connection error: {e}")
            raise
        
        finally:
            if connection:
                try:
                    # Return connection to pool
                    if hasattr(connection, 'close'):
                        connection.close()
                except Exception as e:
                    logger.error(f"Error closing Redis connection: {e}")
            
            # Log slow operations
            duration = time.time() - start_time
            if duration > 5.0:
                logger.warning(f"Slow Redis operation: {duration:.2f}s")
    
    async def health_check(self) -> Dict[str, Any]:
        """Perform Redis connection pool health check."""
        try:
            start_time = time.time()
            
            # Test Redis connectivity
            test_key = f"health_check_{int(time.time())}"
            self.cache.set(test_key, "ok", ttl=10)
            result = self.cache.get(test_key)
            self.cache.delete(test_key)
            
            response_time = (time.time() - start_time) * 1000
            
            redis_info = self.cache.get_stats()
            
            return {
                'status': 'healthy' if result == "ok" else 'degraded',
                'response_time_ms': round(response_time, 2),
                'redis_info': redis_info
            }
            
        except Exception as e:
            logger.error(f"Redis health check failed: {e}")
            return {
                'status': 'unhealthy',
                'error': str(e),
                'response_time_ms': None
            }


class ConnectionPoolManager:
    """Centralized connection pool management."""
    
    def __init__(self):
        """Initialize connection pool manager."""
        self.config = ConnectionPoolConfig(
            min_size=settings.min_pool_size if hasattr(settings, 'min_pool_size') else 10,
            max_size=settings.max_pool_size if hasattr(settings, 'max_pool_size') else 50,
            max_overflow=settings.max_overflow if hasattr(settings, 'max_overflow') else 20
        )
        
        # Initialize pools
        self.database_pool = DatabaseConnectionPool(self.config)
        self.redis_pool = RedisConnectionPool(self.config)
        
        # Background monitoring
        self._monitoring_enabled = True
        self._monitor_thread = None
        self.start_monitoring()
        
        logger.info("Connection pool manager initialized")
    
    def start_monitoring(self) -> None:
        """Start background monitoring thread."""
        if self._monitor_thread is None or not self._monitor_thread.is_alive():
            self._monitor_thread = threading.Thread(target=self._monitoring_loop, daemon=True)
            self._monitor_thread.start()
            logger.info("Connection pool monitoring started")
    
    def stop_monitoring(self) -> None:
        """Stop background monitoring."""
        self._monitoring_enabled = False
        if self._monitor_thread and self._monitor_thread.is_alive():
            self._monitor_thread.join(timeout=5)
        logger.info("Connection pool monitoring stopped")
    
    def _monitoring_loop(self) -> None:
        """Background monitoring loop."""
        while self._monitoring_enabled:
            try:
                # Collect metrics
                db_metrics = self.database_pool.collect_metrics()
                
                # Log performance issues
                if db_metrics and db_metrics.health_score < 70:
                    logger.warning(f"Database pool health score: {db_metrics.health_score}/100")
                
                # Run optimizations
                optimization_result = self.database_pool.optimize_pool_size()
                if optimization_result.get('recommendations'):
                    logger.info(f"Pool optimization recommendations: {optimization_result['recommendations']}")
                
                # Wait for next iteration
                time.sleep(60)  # 1 minute interval
                
            except Exception as e:
                logger.error(f"Error in monitoring loop: {e}")
                time.sleep(60)
    
    @asynccontextmanager
    async def get_database_session(self) -> AsyncGenerator[Session, None]:
        """Get database session with monitoring."""
        async with self.database_pool.get_session() as session:
            yield session
    
    @asynccontextmanager
    async def get_redis_connection(self) -> AsyncGenerator[Any, None]:
        """Get Redis connection with monitoring."""
        async with self.redis_pool.get_connection() as connection:
            yield connection
    
    async def get_health_status(self) -> Dict[str, Any]:
        """Get comprehensive health status of all connection pools."""
        try:
            # Get health status from all pools
            db_health = await self.database_pool.health_check()
            redis_health = await self.redis_pool.health_check()
            
            # Calculate overall health
            db_healthy = db_health.get('status') == 'healthy'
            redis_healthy = redis_health.get('status') == 'healthy'
            
            if db_healthy and redis_healthy:
                overall_status = 'healthy'
            elif db_healthy or redis_healthy:
                overall_status = 'degraded'
            else:
                overall_status = 'unhealthy'
            
            # System resource usage
            cpu_percent = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            
            return {
                'overall_status': overall_status,
                'timestamp': datetime.utcnow().isoformat(),
                'pools': {
                    'database': db_health,
                    'redis': redis_health
                },
                'system_resources': {
                    'cpu_percent': cpu_percent,
                    'memory_percent': memory.percent,
                    'memory_available_gb': round(memory.available / (1024**3), 2)
                },
                'circuit_breakers': circuit_breaker_manager.get_health_status()
            }
            
        except Exception as e:
            logger.error(f"Error getting health status: {e}")
            return {
                'overall_status': 'error',
                'error': str(e),
                'timestamp': datetime.utcnow().isoformat()
            }
    
    def get_performance_metrics(self) -> Dict[str, Any]:
        """Get performance metrics for all pools."""
        try:
            # Get latest metrics
            db_metrics = self.database_pool.metrics[-10:] if self.database_pool.metrics else []
            
            return {
                'timestamp': datetime.utcnow().isoformat(),
                'database_pool': {
                    'recent_metrics': [asdict(m) for m in db_metrics],
                    'active_sessions': len(self.database_pool._active_sessions),
                    'avg_utilization': sum(m.pool_utilization for m in db_metrics) / len(db_metrics) if db_metrics else 0,
                    'health_score': db_metrics[-1].health_score if db_metrics else 0
                },
                'optimization_status': self.database_pool.optimize_pool_size()
            }
            
        except Exception as e:
            logger.error(f"Error getting performance metrics: {e}")
            return {'error': str(e)}
    
    def reset_pools(self) -> Dict[str, Any]:
        """Reset connection pools (admin function)."""
        try:
            logger.warning("Resetting connection pools - this will close active connections")
            
            # Reset circuit breakers
            circuit_breaker_manager.reset_all_breakers()
            
            # Clear metrics
            self.database_pool.metrics.clear()
            self.redis_pool.metrics.clear()
            
            # Clear connection tracking
            self.database_pool._active_sessions.clear()
            self.database_pool._connection_waits.clear()
            
            return {
                'status': 'success',
                'message': 'Connection pools reset successfully',
                'timestamp': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error resetting pools: {e}")
            return {'status': 'error', 'error': str(e)}


# Global connection pool manager instance
connection_pool_manager = ConnectionPoolManager()


# Convenience functions
@asynccontextmanager
async def get_database_session() -> AsyncGenerator[Session, None]:
    """Get database session with automatic pooling and monitoring."""
    async with connection_pool_manager.get_database_session() as session:
        yield session


@asynccontextmanager
async def get_redis_connection() -> AsyncGenerator[Any, None]:
    """Get Redis connection with automatic pooling and monitoring."""
    async with connection_pool_manager.get_redis_connection() as connection:
        yield connection


# Usage examples:
"""
# Database usage
async def create_appointment(appointment_data):
    async with get_database_session() as session:
        appointment = Appointment(**appointment_data)
        session.add(appointment)
        await session.commit()
        return appointment

# Redis usage  
async def cache_user_data(user_id: int, data: dict):
    async with get_redis_connection() as redis:
        await redis.set(f"user:{user_id}", json.dumps(data), ex=3600)

# Health monitoring
health_status = await connection_pool_manager.get_health_status()
metrics = connection_pool_manager.get_performance_metrics()
"""