"""
Database Connection Pool Monitoring Service

Monitors connection pool health and performance metrics.
"""

from typing import Dict, Any
from sqlalchemy import text
import logging
from datetime import datetime
import psutil

logger = logging.getLogger(__name__)


class ConnectionPoolMonitor:
    """Monitor and report on database connection pool health"""
    
    def __init__(self, engine):
        self.engine = engine
        self.pool = engine.pool
        
    def get_pool_status(self) -> Dict[str, Any]:
        """Get current connection pool status and metrics"""
        
        try:
            pool_status = {
                "timestamp": datetime.utcnow().isoformat(),
                "pool_type": type(self.pool).__name__,
                "database_type": "postgresql" if "postgresql" in str(self.engine.url) else "sqlite",
            }
            
            # Get pool statistics if available
            if hasattr(self.pool, 'size'):
                pool_status.update({
                    "pool_size": self.pool.size(),
                    "checked_out_connections": self.pool.checkedout(),
                    "overflow": self.pool.overflow(),
                    "total": self.pool.size() + self.pool.overflow(),
                })
            
            # Get system metrics
            pool_status["system_metrics"] = self._get_system_metrics()
            
            # Get database-specific metrics
            if "postgresql" in str(self.engine.url):
                pool_status["database_metrics"] = self._get_postgresql_metrics()
            
            return pool_status
            
        except Exception as e:
            logger.error(f"Error getting pool status: {e}")
            return {
                "timestamp": datetime.utcnow().isoformat(),
                "error": str(e)
            }
    
    def _get_system_metrics(self) -> Dict[str, Any]:
        """Get system-level metrics"""
        try:
            return {
                "cpu_percent": psutil.cpu_percent(interval=1),
                "memory_percent": psutil.virtual_memory().percent,
                "open_files": len(psutil.Process().open_files()),
                "num_threads": psutil.Process().num_threads(),
            }
        except Exception as e:
            logger.error(f"Error getting system metrics: {e}")
            return {}
    
    def _get_postgresql_metrics(self) -> Dict[str, Any]:
        """Get PostgreSQL-specific connection metrics"""
        try:
            with self.engine.connect() as conn:
                # Get connection statistics
                result = conn.execute(text("""
                    SELECT 
                        COUNT(*) as total_connections,
                        COUNT(*) FILTER (WHERE state = 'active') as active_connections,
                        COUNT(*) FILTER (WHERE state = 'idle') as idle_connections,
                        COUNT(*) FILTER (WHERE state = 'idle in transaction') as idle_in_transaction,
                        COUNT(*) FILTER (WHERE wait_event IS NOT NULL) as waiting_connections
                    FROM pg_stat_activity
                    WHERE datname = current_database()
                """)).fetchone()
                
                metrics = {
                    "total_connections": result.total_connections,
                    "active_connections": result.active_connections,
                    "idle_connections": result.idle_connections,
                    "idle_in_transaction": result.idle_in_transaction,
                    "waiting_connections": result.waiting_connections,
                }
                
                # Get database size
                size_result = conn.execute(text("""
                    SELECT pg_database_size(current_database()) as database_size
                """)).fetchone()
                
                metrics["database_size_mb"] = size_result.database_size / (1024 * 1024)
                
                # Get cache hit ratio
                cache_result = conn.execute(text("""
                    SELECT 
                        sum(heap_blks_hit) / NULLIF(sum(heap_blks_hit) + sum(heap_blks_read), 0) as cache_hit_ratio
                    FROM pg_statio_user_tables
                """)).fetchone()
                
                metrics["cache_hit_ratio"] = float(cache_result.cache_hit_ratio or 0)
                
                return metrics
                
        except Exception as e:
            logger.error(f"Error getting PostgreSQL metrics: {e}")
            return {}
    
    def check_pool_health(self) -> Dict[str, Any]:
        """Check connection pool health and return warnings if any"""
        
        health_check = {
            "healthy": True,
            "warnings": [],
            "recommendations": []
        }
        
        try:
            status = self.get_pool_status()
            
            # Check for high connection usage
            if "checked_out_connections" in status:
                usage_percent = (status["checked_out_connections"] / status["pool_size"]) * 100
                if usage_percent > 80:
                    health_check["warnings"].append(
                        f"High connection pool usage: {usage_percent:.1f}%"
                    )
                    health_check["recommendations"].append(
                        "Consider increasing pool_size in database configuration"
                    )
                    health_check["healthy"] = False
            
            # Check for excessive overflow
            if "overflow" in status and status["overflow"] > status["pool_size"] * 0.5:
                health_check["warnings"].append(
                    f"Excessive overflow connections: {status['overflow']}"
                )
                health_check["recommendations"].append(
                    "Investigate long-running queries or increase base pool_size"
                )
                health_check["healthy"] = False
            
            # Check PostgreSQL-specific metrics
            if "database_metrics" in status:
                db_metrics = status["database_metrics"]
                
                # Check for too many idle in transaction
                if db_metrics.get("idle_in_transaction", 0) > 5:
                    health_check["warnings"].append(
                        f"High idle in transaction count: {db_metrics['idle_in_transaction']}"
                    )
                    health_check["recommendations"].append(
                        "Review transaction management in application code"
                    )
                
                # Check cache hit ratio
                if db_metrics.get("cache_hit_ratio", 1) < 0.9:
                    health_check["warnings"].append(
                        f"Low cache hit ratio: {db_metrics['cache_hit_ratio']:.2%}"
                    )
                    health_check["recommendations"].append(
                        "Consider increasing shared_buffers in PostgreSQL configuration"
                    )
            
            # Check system metrics
            if "system_metrics" in status:
                sys_metrics = status["system_metrics"]
                
                if sys_metrics.get("cpu_percent", 0) > 80:
                    health_check["warnings"].append(
                        f"High CPU usage: {sys_metrics['cpu_percent']}%"
                    )
                    
                if sys_metrics.get("memory_percent", 0) > 85:
                    health_check["warnings"].append(
                        f"High memory usage: {sys_metrics['memory_percent']}%"
                    )
            
            return health_check
            
        except Exception as e:
            logger.error(f"Error checking pool health: {e}")
            return {
                "healthy": False,
                "warnings": [f"Health check failed: {str(e)}"],
                "recommendations": ["Check application logs for details"]
            }
    
    def log_pool_stats(self):
        """Log current pool statistics"""
        try:
            status = self.get_pool_status()
            
            if "error" not in status:
                logger.info(
                    f"Connection Pool Status - "
                    f"Type: {status.get('pool_type', 'Unknown')}, "
                    f"Size: {status.get('pool_size', 'N/A')}, "
                    f"Checked Out: {status.get('checked_out_connections', 'N/A')}, "
                    f"Overflow: {status.get('overflow', 'N/A')}"
                )
                
                if "database_metrics" in status:
                    db_metrics = status["database_metrics"]
                    logger.info(
                        f"Database Connections - "
                        f"Total: {db_metrics.get('total_connections', 'N/A')}, "
                        f"Active: {db_metrics.get('active_connections', 'N/A')}, "
                        f"Idle: {db_metrics.get('idle_connections', 'N/A')}"
                    )
        except Exception as e:
            logger.error(f"Error logging pool stats: {e}")


def create_pool_monitor(engine) -> ConnectionPoolMonitor:
    """Factory function to create a connection pool monitor"""
    return ConnectionPoolMonitor(engine)