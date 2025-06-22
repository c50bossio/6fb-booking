"""
Performance monitoring and optimization endpoints
Enhanced with comprehensive scalability metrics
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional
import time
import psutil
import platform
from datetime import datetime, timedelta

from config.database import get_db, connection_monitor, check_database_health
from models.user import User
from .auth import get_current_user
from utils.cache import get_cache_stats, clear_all_cache, cleanup_expired_cache
from utils.rbac import require_permission, Permission

# Import optimization services
try:
    from services.advanced_cache_service import cache_service
    from services.monitoring_service import monitoring_service
    from services.task_manager import task_manager
    from services.realtime_service import connection_manager
    from middleware.performance_monitoring import PerformanceMonitoringMiddleware
    from middleware.api_optimization import APIOptimizationMiddleware

    ADVANCED_MONITORING_AVAILABLE = True
except ImportError:
    ADVANCED_MONITORING_AVAILABLE = False

router = APIRouter()


@router.get("/cache/stats")
@require_permission(Permission.SYSTEM_ADMIN)
async def get_cache_statistics(current_user: User = Depends(get_current_user)):
    """Get cache performance statistics"""
    return {
        "cache_stats": get_cache_stats(),
        "timestamp": datetime.utcnow().isoformat(),
    }


@router.post("/cache/clear")
@require_permission(Permission.SYSTEM_ADMIN)
async def clear_cache(current_user: User = Depends(get_current_user)):
    """Clear all cache entries"""
    clear_all_cache()
    return {"message": "Cache cleared successfully"}


@router.post("/cache/cleanup")
@require_permission(Permission.SYSTEM_ADMIN)
async def cleanup_cache(current_user: User = Depends(get_current_user)):
    """Clean up expired cache entries"""
    cleanup_expired_cache()
    return {"message": "Expired cache entries cleaned up"}


@router.get("/system/stats")
@require_permission(Permission.SYSTEM_ADMIN)
async def get_system_statistics(current_user: User = Depends(get_current_user)):
    """Get system performance statistics"""
    try:
        # System information
        system_info = {
            "platform": platform.platform(),
            "processor": platform.processor(),
            "architecture": platform.architecture()[0],
            "python_version": platform.python_version(),
        }

        # Memory usage
        memory = psutil.virtual_memory()
        memory_info = {
            "total_mb": round(memory.total / 1024 / 1024, 2),
            "available_mb": round(memory.available / 1024 / 1024, 2),
            "used_mb": round(memory.used / 1024 / 1024, 2),
            "percentage": memory.percent,
        }

        # CPU usage
        cpu_info = {
            "percentage": psutil.cpu_percent(interval=1),
            "count": psutil.cpu_count(),
            "logical_count": psutil.cpu_count(logical=True),
        }

        # Disk usage
        disk = psutil.disk_usage("/")
        disk_info = {
            "total_gb": round(disk.total / 1024 / 1024 / 1024, 2),
            "used_gb": round(disk.used / 1024 / 1024 / 1024, 2),
            "free_gb": round(disk.free / 1024 / 1024 / 1024, 2),
            "percentage": round((disk.used / disk.total) * 100, 2),
        }

        return {
            "timestamp": datetime.utcnow().isoformat(),
            "system": system_info,
            "memory": memory_info,
            "cpu": cpu_info,
            "disk": disk_info,
            "cache": get_cache_stats(),
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get system statistics: {str(e)}",
        )


@router.get("/database/stats")
@require_permission(Permission.SYSTEM_ADMIN)
async def get_database_statistics(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Get database performance statistics"""
    try:
        from sqlalchemy import text

        # Get table sizes and row counts
        table_stats = {}
        tables = [
            "users",
            "appointments",
            "barbers",
            "clients",
            "locations",
            "daily_metrics",
            "weekly_metrics",
            "monthly_metrics",
        ]

        for table in tables:
            try:
                # Get row count
                result = db.execute(text(f"SELECT COUNT(*) FROM {table}")).scalar()
                table_stats[table] = {"row_count": result, "table_name": table}
            except Exception as e:
                table_stats[table] = {"row_count": 0, "error": str(e)}

        # Database connection pool info
        engine = db.get_bind()
        pool_info = {
            "pool_size": getattr(engine.pool, "size", "unknown"),
            "checked_out": getattr(engine.pool, "checkedout", "unknown"),
            "overflow": getattr(engine.pool, "overflow", "unknown"),
            "checked_in": getattr(engine.pool, "checkedin", "unknown"),
        }

        return {
            "timestamp": datetime.utcnow().isoformat(),
            "table_statistics": table_stats,
            "connection_pool": pool_info,
            "database_url": str(engine.url).split("@")[0]
            + "@[HIDDEN]",  # Hide credentials
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get database statistics: {str(e)}",
        )


@router.get("/performance/benchmark")
@require_permission(Permission.SYSTEM_ADMIN)
async def run_performance_benchmark(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Run performance benchmark tests"""
    try:
        benchmark_results = {}

        # Database query benchmark
        start_time = time.time()
        from models.appointment import Appointment

        appointments = db.query(Appointment).limit(100).all()
        db_query_time = time.time() - start_time

        benchmark_results["database"] = {
            "query_time_ms": round(db_query_time * 1000, 2),
            "records_fetched": len(appointments),
            "performance_rating": (
                "excellent"
                if db_query_time < 0.1
                else "good" if db_query_time < 0.5 else "needs_optimization"
            ),
        }

        # Cache performance benchmark
        start_time = time.time()
        from utils.cache import set_in_cache, get_from_cache

        test_data = {
            "test": "performance_data",
            "timestamp": datetime.utcnow().isoformat(),
        }
        set_in_cache("benchmark_test", test_data, 60)
        retrieved_data = get_from_cache("benchmark_test")
        cache_time = time.time() - start_time

        benchmark_results["cache"] = {
            "operation_time_ms": round(cache_time * 1000, 2),
            "data_integrity": retrieved_data == test_data,
            "performance_rating": (
                "excellent"
                if cache_time < 0.01
                else "good" if cache_time < 0.05 else "needs_optimization"
            ),
        }

        # Analytics calculation benchmark
        start_time = time.time()
        from services.sixfb_calculator import SixFBCalculator

        calculator = SixFBCalculator(db)

        # Test with a sample calculation
        from datetime import date

        sample_metrics = calculator.calculate_daily_metrics(1, date.today())
        analytics_time = time.time() - start_time

        benchmark_results["analytics"] = {
            "calculation_time_ms": round(analytics_time * 1000, 2),
            "metrics_generated": len(sample_metrics),
            "performance_rating": (
                "excellent"
                if analytics_time < 0.5
                else "good" if analytics_time < 2.0 else "needs_optimization"
            ),
        }

        # Overall performance rating
        ratings = [
            result["performance_rating"] for result in benchmark_results.values()
        ]
        if all(r == "excellent" for r in ratings):
            overall_rating = "excellent"
        elif all(r in ["excellent", "good"] for r in ratings):
            overall_rating = "good"
        else:
            overall_rating = "needs_optimization"

        return {
            "timestamp": datetime.utcnow().isoformat(),
            "overall_performance": overall_rating,
            "benchmark_results": benchmark_results,
            "recommendations": _get_performance_recommendations(benchmark_results),
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Benchmark failed: {str(e)}",
        )


def _get_performance_recommendations(benchmark_results: Dict[str, Any]) -> list:
    """Generate performance improvement recommendations"""
    recommendations = []

    if benchmark_results["database"]["performance_rating"] == "needs_optimization":
        recommendations.append(
            {
                "category": "database",
                "priority": "high",
                "suggestion": "Consider adding database indexes or optimizing queries",
                "impact": "Significant improvement in page load times",
            }
        )

    if benchmark_results["cache"]["performance_rating"] == "needs_optimization":
        recommendations.append(
            {
                "category": "cache",
                "priority": "medium",
                "suggestion": "Consider implementing Redis for better cache performance",
                "impact": "Faster data retrieval and reduced database load",
            }
        )

    if benchmark_results["analytics"]["performance_rating"] == "needs_optimization":
        recommendations.append(
            {
                "category": "analytics",
                "priority": "high",
                "suggestion": "Implement pre-computed metrics or increase cache TTL",
                "impact": "Much faster dashboard and analytics loading",
            }
        )

    if not recommendations:
        recommendations.append(
            {
                "category": "general",
                "priority": "low",
                "suggestion": "Performance is optimal. Monitor regularly for changes.",
                "impact": "Maintain current performance levels",
            }
        )

    return recommendations


# New comprehensive scalability endpoints


@router.get("/scalability/overview")
@require_permission(Permission.SYSTEM_ADMIN)
async def get_scalability_overview(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Get comprehensive scalability optimization overview"""

    overview = {
        "timestamp": datetime.utcnow().isoformat(),
        "optimizations_enabled": {
            "advanced_caching": ADVANCED_MONITORING_AVAILABLE
            and cache_service is not None,
            "database_optimization": True,
            "connection_pooling": True,
            "performance_monitoring": ADVANCED_MONITORING_AVAILABLE,
            "realtime_updates": ADVANCED_MONITORING_AVAILABLE
            and connection_manager is not None,
            "task_management": ADVANCED_MONITORING_AVAILABLE
            and task_manager is not None,
            "rate_limiting": True,
            "response_compression": True,
        },
        "system_status": {},
        "performance_metrics": {},
        "recommendations": [],
    }

    # Get current system metrics
    try:
        cpu_percent = psutil.cpu_percent()
        memory_percent = psutil.virtual_memory().percent
        disk_percent = psutil.disk_usage("/").percent

        overview["system_status"] = {
            "cpu_usage": cpu_percent,
            "memory_usage": memory_percent,
            "disk_usage": disk_percent,
            "health": "good" if cpu_percent < 70 and memory_percent < 80 else "warning",
        }

        # Database health
        db_health = check_database_health()
        overview["system_status"]["database"] = db_health

        # Performance metrics
        if ADVANCED_MONITORING_AVAILABLE and monitoring_service:
            try:
                metrics_summary = await monitoring_service.get_metrics_summary(
                    60
                )  # Last hour
                overview["performance_metrics"] = metrics_summary
            except Exception as e:
                overview["performance_metrics"] = {"error": str(e)}

        # Generate recommendations
        if cpu_percent > 80:
            overview["recommendations"].append(
                {
                    "category": "infrastructure",
                    "priority": "high",
                    "suggestion": "Consider horizontal scaling - CPU usage is high",
                    "impact": "Improved response times and capacity",
                }
            )

        if memory_percent > 85:
            overview["recommendations"].append(
                {
                    "category": "infrastructure",
                    "priority": "high",
                    "suggestion": "Consider increasing memory or optimizing memory usage",
                    "impact": "Prevent memory-related performance issues",
                }
            )

        if not overview["optimizations_enabled"]["advanced_caching"]:
            overview["recommendations"].append(
                {
                    "category": "caching",
                    "priority": "medium",
                    "suggestion": "Enable advanced caching for better performance",
                    "impact": "Significant reduction in database load and response times",
                }
            )

    except Exception as e:
        overview["system_status"] = {"error": str(e)}

    return overview


@router.get("/scalability/database")
@require_permission(Permission.SYSTEM_ADMIN)
async def get_database_scalability_metrics(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Get comprehensive database scalability metrics"""

    try:
        # Connection pool stats
        pool_stats = connection_monitor.get_stats()

        # Database health check
        health = check_database_health()

        # Get table statistics
        from sqlalchemy import text

        stats = {
            "timestamp": datetime.utcnow().isoformat(),
            "connection_pool": pool_stats,
            "health": health,
            "tables": {},
            "performance": {},
            "optimization_status": {},
        }

        # Enhanced table analysis
        tables = [
            "users",
            "appointments",
            "barbers",
            "clients",
            "payments",
            "services",
            "bookings",
        ]

        for table in tables:
            try:
                # Get row count
                result = db.execute(text(f"SELECT COUNT(*) FROM {table}"))
                count = result.scalar()

                table_stats = {"row_count": count}

                # Get table size for PostgreSQL
                if "postgresql" in str(db.get_bind().url):
                    try:
                        size_result = db.execute(
                            text(
                                f"SELECT pg_size_pretty(pg_total_relation_size('{table}'))"
                            )
                        )
                        size = size_result.scalar()
                        table_stats["size"] = size

                        # Get index information
                        index_result = db.execute(
                            text(
                                f"""
                            SELECT COUNT(*) as index_count
                            FROM pg_indexes WHERE tablename = '{table}'
                        """
                            )
                        )
                        index_count = index_result.scalar()
                        table_stats["indexes"] = index_count

                    except Exception:
                        pass

                stats["tables"][table] = table_stats

            except Exception as e:
                stats["tables"][table] = {"error": str(e)}

        # Performance metrics for PostgreSQL
        if "postgresql" in str(db.get_bind().url):
            try:
                # Connection stats
                result = db.execute(
                    text(
                        """
                    SELECT state, COUNT(*) as count
                    FROM pg_stat_activity
                    GROUP BY state
                """
                    )
                )
                connection_states = {row[0]: row[1] for row in result.fetchall()}
                stats["performance"]["connection_states"] = connection_states

                # Cache hit ratio
                result = db.execute(
                    text(
                        """
                    SELECT round(sum(blks_hit)*100/sum(blks_hit+blks_read), 2) as cache_hit_ratio
                    FROM pg_stat_database WHERE datname = current_database()
                """
                    )
                )
                cache_hit_ratio = result.scalar()
                stats["performance"]["cache_hit_ratio"] = cache_hit_ratio

                # Long running queries
                result = db.execute(
                    text(
                        """
                    SELECT COUNT(*) as long_queries
                    FROM pg_stat_activity
                    WHERE state = 'active'
                    AND now() - query_start > interval '30 seconds'
                """
                    )
                )
                long_queries = result.scalar()
                stats["performance"]["long_running_queries"] = long_queries

            except Exception as e:
                stats["performance"]["postgresql_error"] = str(e)

        # Optimization recommendations
        stats["optimization_status"]["indexes_created"] = True  # From our optimizations
        stats["optimization_status"]["connection_pooling"] = True
        stats["optimization_status"]["query_optimization"] = True

        return stats

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database metrics error: {str(e)}")


@router.get("/scalability/cache")
@require_permission(Permission.SYSTEM_ADMIN)
async def get_cache_scalability_metrics(current_user: User = Depends(get_current_user)):
    """Get comprehensive cache scalability metrics"""

    stats = {
        "timestamp": datetime.utcnow().isoformat(),
        "basic_cache": {},
        "advanced_cache": {},
        "performance_impact": {},
        "recommendations": [],
    }

    # Basic cache stats
    try:
        stats["basic_cache"] = get_cache_stats()
    except Exception as e:
        stats["basic_cache"] = {"error": str(e)}

    # Advanced cache stats
    if ADVANCED_MONITORING_AVAILABLE and cache_service:
        try:
            advanced_stats = cache_service.get_stats()
            stats["advanced_cache"] = advanced_stats

            # Calculate performance impact
            hit_rate = advanced_stats.get("hit_rate", 0)
            if hit_rate > 85:
                stats["performance_impact"]["rating"] = "excellent"
                stats["performance_impact"][
                    "estimated_db_load_reduction"
                ] = f"{hit_rate}%"
            elif hit_rate > 70:
                stats["performance_impact"]["rating"] = "good"
                stats["performance_impact"][
                    "estimated_db_load_reduction"
                ] = f"{hit_rate}%"
            else:
                stats["performance_impact"]["rating"] = "needs_improvement"
                stats["recommendations"].append(
                    {
                        "category": "caching",
                        "priority": "medium",
                        "suggestion": "Optimize cache strategies to improve hit rate",
                        "target": "85%+ hit rate",
                    }
                )

        except Exception as e:
            stats["advanced_cache"] = {"error": str(e)}
    else:
        stats["recommendations"].append(
            {
                "category": "caching",
                "priority": "high",
                "suggestion": "Enable advanced caching service for better performance",
                "impact": "Significant reduction in database load",
            }
        )

    return stats


@router.get("/scalability/realtime")
@require_permission(Permission.SYSTEM_ADMIN)
async def get_realtime_scalability_metrics(
    current_user: User = Depends(get_current_user),
):
    """Get real-time system scalability metrics"""

    stats = {
        "timestamp": datetime.utcnow().isoformat(),
        "websocket": {},
        "tasks": {},
        "load_monitoring": {},
        "capacity": {},
    }

    if ADVANCED_MONITORING_AVAILABLE:
        # WebSocket connection stats
        try:
            ws_stats = connection_manager.get_stats()
            stats["websocket"] = ws_stats

            # Capacity analysis
            active_connections = ws_stats.get("active_connections", 0)
            if active_connections > 5000:
                stats["capacity"]["websocket_status"] = "high_load"
            elif active_connections > 1000:
                stats["capacity"]["websocket_status"] = "moderate_load"
            else:
                stats["capacity"]["websocket_status"] = "low_load"

        except Exception as e:
            stats["websocket"] = {"error": str(e)}

        # Task manager stats
        try:
            task_stats = await task_manager.get_stats()
            stats["tasks"] = task_stats

            # Queue analysis
            queue_size = task_stats.get("queue_size", 0)
            if queue_size > 1000:
                stats["capacity"]["task_queue_status"] = "high_backlog"
            elif queue_size > 100:
                stats["capacity"]["task_queue_status"] = "moderate_backlog"
            else:
                stats["capacity"]["task_queue_status"] = "healthy"

        except Exception as e:
            stats["tasks"] = {"error": str(e)}

    return stats


@router.post("/scalability/optimize-database")
@require_permission(Permission.SYSTEM_ADMIN)
async def run_database_optimization(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Run comprehensive database optimization"""

    try:
        from database_optimizations import optimize_database

        # Run the full optimization suite
        result = optimize_database()

        return {
            "message": "Database optimization completed successfully",
            "result": result,
            "timestamp": datetime.utcnow().isoformat(),
            "next_steps": [
                "Monitor query performance improvements",
                "Check index usage statistics",
                "Verify cache hit ratios",
            ],
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Optimization failed: {str(e)}")


@router.post("/scalability/warm-cache")
@require_permission(Permission.SYSTEM_ADMIN)
async def warm_cache_system(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Warm up all cache layers"""

    results = {
        "timestamp": datetime.utcnow().isoformat(),
        "basic_cache": {"status": "skipped"},
        "advanced_cache": {"status": "skipped"},
    }

    try:
        # Basic cache cleanup
        cleanup_expired_cache()
        results["basic_cache"] = {"status": "cleaned"}

        # Advanced cache warming
        if ADVANCED_MONITORING_AVAILABLE and cache_service:
            await cache_service.warm_up_cache(db)
            results["advanced_cache"] = {"status": "warmed"}

        return {
            "message": "Cache warming completed",
            "results": results,
            "recommendations": [
                "Monitor cache hit rates over the next hour",
                "Check application response times",
                "Consider scheduling regular cache warming",
            ],
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Cache warming failed: {str(e)}")


@router.get("/scalability/trends")
@require_permission(Permission.SYSTEM_ADMIN)
async def get_scalability_trends(
    hours: int = Query(24, ge=1, le=168),  # 1 hour to 1 week
    current_user: User = Depends(get_current_user),
):
    """Get scalability performance trends over time"""

    if ADVANCED_MONITORING_AVAILABLE and monitoring_service:
        try:
            trends = await monitoring_service.get_metrics_summary(
                hours * 60
            )  # Convert to minutes

            # Add scalability-specific analysis
            trends["scalability_analysis"] = {
                "trending_up": [],
                "trending_down": [],
                "stable": [],
                "alerts": [],
            }

            # Analyze trends in the summary data
            summary = trends.get("summary", {})
            for metric_name, metric_data in summary.items():
                if isinstance(metric_data, dict) and "average" in metric_data:
                    avg_value = metric_data["average"]
                    current_value = metric_data["current"]

                    if current_value > avg_value * 1.2:
                        trends["scalability_analysis"]["trending_up"].append(
                            {
                                "metric": metric_name,
                                "current": current_value,
                                "average": avg_value,
                                "increase_percent": (
                                    (current_value - avg_value) / avg_value
                                )
                                * 100,
                            }
                        )
                    elif current_value < avg_value * 0.8:
                        trends["scalability_analysis"]["trending_down"].append(
                            {
                                "metric": metric_name,
                                "current": current_value,
                                "average": avg_value,
                                "decrease_percent": (
                                    (avg_value - current_value) / avg_value
                                )
                                * 100,
                            }
                        )
                    else:
                        trends["scalability_analysis"]["stable"].append(metric_name)

            return trends

        except Exception as e:
            return {"error": f"Failed to get trends: {str(e)}"}

    # Fallback response
    return {
        "error": "Advanced monitoring not available",
        "recommendation": "Enable advanced monitoring for detailed trend analysis",
    }
