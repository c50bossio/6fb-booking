"""
Database management and monitoring API for BookedBarber V2.
Provides health checks, performance metrics, and read replica management.
"""

from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
import logging

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel, Field

from database.read_replica_config import get_db_manager, check_database_health, get_database_stats
from dependencies_v2 import get_pool_health, pool_monitor
from utils.auth import get_current_user
from utils.permissions import require_permission
from models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v2/database",
    tags=["database"]
)


# Response models
class DatabaseHealthResponse(BaseModel):
    overall_healthy: bool
    primary: Dict[str, Any]
    replicas: List[Dict[str, Any]]
    timestamp: datetime
    read_replicas_enabled: bool


class ConnectionPoolMetrics(BaseModel):
    name: str
    pool_size: int
    checked_in: int
    checked_out: int
    overflow: int
    utilization_percent: float
    total_available: int


class ConnectionPoolHealth(BaseModel):
    healthy: bool
    warnings: List[str]
    metrics: Dict[str, Any]


class DatabaseStats(BaseModel):
    config: Dict[str, Any]
    connections: Dict[str, Any]
    performance: Optional[Dict[str, Any]] = None


class ReplicaLagResponse(BaseModel):
    replica_name: str
    lag_seconds: Optional[float]
    healthy: bool
    last_checked: datetime


@router.get("/health", response_model=DatabaseHealthResponse)
async def get_database_health(
    current_user: User = Depends(get_current_user)
):
    """
    Get comprehensive database health status including all replicas.
    """
    try:
        # Check basic permissions (any authenticated user can check health)
        health_data = await check_database_health()
        
        return DatabaseHealthResponse(
            overall_healthy=health_data["overall_healthy"],
            primary=health_data["primary"],
            replicas=health_data["replicas"],
            timestamp=datetime.utcnow(),
            read_replicas_enabled=get_db_manager().config.enable_read_replicas
        )
        
    except Exception as e:
        logger.error(f"Failed to get database health: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve database health")


@router.get("/pool-health", response_model=ConnectionPoolHealth)
async def get_connection_pool_health(
    current_user: User = Depends(get_current_user)
):
    """
    Get connection pool health and utilization metrics.
    """
    try:
        pool_health = get_pool_health()
        return ConnectionPoolHealth(**pool_health)
        
    except Exception as e:
        logger.error(f"Failed to get pool health: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve pool health")


@router.get("/stats", response_model=DatabaseStats)
async def get_database_statistics(
    current_user: User = Depends(get_current_user)
):
    """
    Get detailed database statistics and configuration.
    """
    # Require admin permission for detailed stats
    require_permission(current_user, "database:admin")
    
    try:
        stats_data = await get_database_stats()
        return DatabaseStats(**stats_data)
        
    except Exception as e:
        logger.error(f"Failed to get database stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve database statistics")


@router.get("/pool-metrics")
async def get_pool_metrics(
    current_user: User = Depends(get_current_user)
):
    """
    Get real-time connection pool metrics for all databases.
    """
    # Require admin permission for pool metrics
    require_permission(current_user, "database:admin")
    
    try:
        metrics = pool_monitor.get_pool_metrics()
        
        # Format metrics for API response
        formatted_metrics = {
            "primary": ConnectionPoolMetrics(**metrics["primary"]).dict(),
            "replicas": [ConnectionPoolMetrics(**replica).dict() for replica in metrics["replicas"]],
            "timestamp": datetime.utcnow(),
            "total_databases": 1 + len(metrics["replicas"])
        }
        
        return formatted_metrics
        
    except Exception as e:
        logger.error(f"Failed to get pool metrics: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve pool metrics")


@router.get("/replica-lag")
async def get_replica_lag(
    current_user: User = Depends(get_current_user)
):
    """
    Check replication lag for all read replicas.
    """
    # Require admin permission for replication monitoring
    require_permission(current_user, "database:admin")
    
    try:
        db_manager = get_db_manager()
        
        if not db_manager.config.enable_read_replicas:
            return {
                "read_replicas_enabled": False,
                "message": "Read replicas not enabled"
            }
        
        lag_results = []
        
        # Check each replica
        for i, engine in enumerate(db_manager.replica_engines):
            replica_name = f"replica_{i+1}"
            
            try:
                # Query replica lag (PostgreSQL specific)
                with engine.connect() as conn:
                    result = conn.execute("""
                        SELECT 
                            CASE 
                                WHEN pg_is_in_recovery() THEN 
                                    EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp()))
                                ELSE 
                                    0
                            END as lag_seconds
                    """)
                    
                    lag_seconds = result.scalar()
                    
                    lag_results.append(ReplicaLagResponse(
                        replica_name=replica_name,
                        lag_seconds=lag_seconds,
                        healthy=lag_seconds is not None and lag_seconds < db_manager.config.read_replica_lag_threshold,
                        last_checked=datetime.utcnow()
                    ))
                    
            except Exception as e:
                logger.error(f"Failed to check lag for {replica_name}: {e}")
                lag_results.append(ReplicaLagResponse(
                    replica_name=replica_name,
                    lag_seconds=None,
                    healthy=False,
                    last_checked=datetime.utcnow()
                ))
        
        return {
            "read_replicas_enabled": True,
            "replica_count": len(lag_results),
            "lag_threshold_seconds": db_manager.config.read_replica_lag_threshold,
            "replicas": [lag.dict() for lag in lag_results],
            "overall_healthy": all(lag.healthy for lag in lag_results)
        }
        
    except Exception as e:
        logger.error(f"Failed to check replica lag: {e}")
        raise HTTPException(status_code=500, detail="Failed to check replica lag")


@router.post("/test-connection")
async def test_database_connection(
    database_type: str = "primary",  # "primary", "replica", "all"
    current_user: User = Depends(get_current_user)
):
    """
    Test database connections for debugging purposes.
    """
    # Require admin permission for connection testing
    require_permission(current_user, "database:admin")
    
    try:
        db_manager = get_db_manager()
        test_results = {}
        
        if database_type in ["primary", "all"]:
            # Test primary connection
            try:
                with db_manager.primary_engine.connect() as conn:
                    start_time = datetime.utcnow()
                    result = conn.execute("SELECT version(), current_timestamp")
                    row = result.fetchone()
                    end_time = datetime.utcnow()
                    
                    test_results["primary"] = {
                        "healthy": True,
                        "response_time_ms": (end_time - start_time).total_seconds() * 1000,
                        "database_version": row[0] if row else None,
                        "server_time": row[1].isoformat() if row and len(row) > 1 else None
                    }
            except Exception as e:
                test_results["primary"] = {
                    "healthy": False,
                    "error": str(e)
                }
        
        if database_type in ["replica", "all"] and db_manager.config.enable_read_replicas:
            # Test replica connections
            test_results["replicas"] = []
            
            for i, engine in enumerate(db_manager.replica_engines):
                replica_name = f"replica_{i+1}"
                try:
                    with engine.connect() as conn:
                        start_time = datetime.utcnow()
                        result = conn.execute("SELECT version(), current_timestamp, pg_is_in_recovery()")
                        row = result.fetchone()
                        end_time = datetime.utcnow()
                        
                        test_results["replicas"].append({
                            "name": replica_name,
                            "healthy": True,
                            "response_time_ms": (end_time - start_time).total_seconds() * 1000,
                            "database_version": row[0] if row else None,
                            "server_time": row[1].isoformat() if row and len(row) > 1 else None,
                            "is_replica": row[2] if row and len(row) > 2 else None
                        })
                except Exception as e:
                    test_results["replicas"].append({
                        "name": replica_name,
                        "healthy": False,
                        "error": str(e)
                    })
        
        return {
            "test_type": database_type,
            "timestamp": datetime.utcnow(),
            "results": test_results
        }
        
    except Exception as e:
        logger.error(f"Failed to test database connections: {e}")
        raise HTTPException(status_code=500, detail="Failed to test database connections")


@router.post("/optimize-pools")
async def optimize_connection_pools(
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user)
):
    """
    Optimize connection pools by clearing idle connections.
    """
    # Require admin permission for pool optimization
    require_permission(current_user, "database:admin")
    
    def optimize_pools():
        """Background task to optimize connection pools."""
        try:
            db_manager = get_db_manager()
            
            # Dispose and recreate connection pools
            db_manager.primary_engine.dispose()
            for engine in db_manager.replica_engines:
                engine.dispose()
            
            logger.info("Connection pools optimized successfully")
            
        except Exception as e:
            logger.error(f"Failed to optimize connection pools: {e}")
    
    background_tasks.add_task(optimize_pools)
    
    return {
        "message": "Connection pool optimization initiated",
        "timestamp": datetime.utcnow()
    }


@router.get("/performance-history")
async def get_performance_history(
    hours: int = 24,
    current_user: User = Depends(get_current_user)
):
    """
    Get database performance history (simplified version - would integrate with monitoring system).
    """
    # Require admin permission for performance history
    require_permission(current_user, "database:admin")
    
    if not (1 <= hours <= 168):  # Max 1 week
        raise HTTPException(status_code=400, detail="Hours must be between 1 and 168")
    
    # This would typically integrate with your monitoring system (Prometheus, CloudWatch, etc.)
    # For now, return current metrics as a baseline
    try:
        current_health = await check_database_health()
        current_stats = await get_database_stats()
        
        # Mock historical data structure
        return {
            "time_range_hours": hours,
            "current_status": current_health,
            "current_stats": current_stats,
            "historical_data": {
                "message": "Historical data would be provided by monitoring system integration",
                "suggested_integrations": [
                    "Prometheus + Grafana",
                    "AWS CloudWatch",
                    "DataDog",
                    "New Relic"
                ]
            },
            "timestamp": datetime.utcnow()
        }
        
    except Exception as e:
        logger.error(f"Failed to get performance history: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve performance history")


@router.get("/configuration")
async def get_database_configuration(
    current_user: User = Depends(get_current_user)
):
    """
    Get database configuration details (admin only).
    """
    # Require admin permission for configuration details
    require_permission(current_user, "database:admin")
    
    try:
        db_manager = get_db_manager()
        config = db_manager.config
        
        return {
            "read_replicas_enabled": config.enable_read_replicas,
            "replica_count": len(config.replica_urls),
            "primary_url_masked": db_manager._mask_database_url(config.primary_url),
            "replica_urls_masked": [db_manager._mask_database_url(url) for url in config.replica_urls],
            "replica_weights": config.replica_weights,
            "connection_pool_settings": {
                "pool_size": config.connection_pool_settings.get("pool_size"),
                "max_overflow": config.connection_pool_settings.get("max_overflow"),
                "pool_timeout": config.connection_pool_settings.get("pool_timeout"),
                "pool_recycle": config.connection_pool_settings.get("pool_recycle")
            },
            "lag_threshold_seconds": config.read_replica_lag_threshold,
            "environment": config.config.environment if hasattr(config, 'config') else 'unknown'
        }
        
    except Exception as e:
        logger.error(f"Failed to get database configuration: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve database configuration")


# Include router in main application
__all__ = ["router"]