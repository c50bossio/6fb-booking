"""
Cache health monitoring and management utilities
Provides comprehensive monitoring, diagnostics, and maintenance for the caching system
"""

import asyncio
import time
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum

from services.redis_service import get_redis, is_redis_available
from utils.enhanced_cache import (
    get_cache_stats,
    get_cache_health,
    clear_all_cache,
    cleanup_expired_cache,
    cache_warmer,
    REDIS_AVAILABLE,
)

logger = logging.getLogger(__name__)


class HealthStatus(Enum):
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"


@dataclass
class CacheMetrics:
    """Cache performance metrics"""

    hit_rate: float
    total_requests: int
    hits: int
    misses: int
    sets: int
    deletes: int
    redis_fallbacks: int
    memory_cache_size: int
    redis_available: bool
    timestamp: datetime


@dataclass
class HealthCheckResult:
    """Health check result"""

    status: HealthStatus
    message: str
    metrics: Dict[str, Any]
    recommendations: List[str]
    timestamp: datetime


class CacheHealthMonitor:
    """Comprehensive cache health monitoring"""

    def __init__(self):
        self.redis_service = get_redis()
        self.health_history: List[HealthCheckResult] = []
        self.metrics_history: List[CacheMetrics] = []
        self.max_history = 100  # Keep last 100 health checks

    async def perform_health_check(self) -> HealthCheckResult:
        """Perform comprehensive health check"""
        status = HealthStatus.HEALTHY
        recommendations = []
        metrics = {}

        try:
            # Get basic cache stats
            cache_stats = get_cache_stats()
            cache_health = get_cache_health()

            metrics.update(cache_stats)
            metrics.update(cache_health)

            # Check Redis connectivity
            redis_healthy = await self._check_redis_health()
            metrics["redis_connectivity"] = redis_healthy

            # Check hit rate
            if cache_stats["hit_rate"] < 50 and cache_stats["total_requests"] > 100:
                status = HealthStatus.DEGRADED
                recommendations.append(
                    "Low cache hit rate - consider cache warming or longer TTL"
                )

            # Check Redis fallback rate
            fallback_rate = 0
            if cache_stats["total_requests"] > 0:
                fallback_rate = (
                    cache_stats["redis_fallbacks"] / cache_stats["total_requests"]
                ) * 100
                metrics["redis_fallback_rate"] = fallback_rate

                if fallback_rate > 10:
                    status = HealthStatus.DEGRADED
                    recommendations.append(
                        "High Redis fallback rate - check Redis connectivity"
                    )

            # Check memory cache size
            if cache_stats["memory_cache_size"] > 10000:
                if status == HealthStatus.HEALTHY:
                    status = HealthStatus.DEGRADED
                recommendations.append(
                    "Memory cache size too large - consider cleanup or Redis migration"
                )

            # Check Redis-specific metrics
            if REDIS_AVAILABLE:
                redis_metrics = await self._get_redis_metrics()
                metrics.update(redis_metrics)

                if redis_metrics.get("memory_usage_percent", 0) > 80:
                    status = HealthStatus.DEGRADED
                    recommendations.append(
                        "Redis memory usage high - consider eviction policies"
                    )

            message = f"Cache system {status.value}"
            if recommendations:
                message += f" - {len(recommendations)} issues found"

        except Exception as e:
            status = HealthStatus.UNHEALTHY
            message = f"Health check failed: {str(e)}"
            recommendations.append("Health check system error - investigate logs")
            logger.error(f"Cache health check failed: {e}")

        result = HealthCheckResult(
            status=status,
            message=message,
            metrics=metrics,
            recommendations=recommendations,
            timestamp=datetime.now(),
        )

        # Store in history
        self.health_history.append(result)
        if len(self.health_history) > self.max_history:
            self.health_history.pop(0)

        return result

    async def _check_redis_health(self) -> bool:
        """Check Redis connectivity and basic operations"""
        if not REDIS_AVAILABLE:
            return False

        try:
            # Test basic operations
            test_key = f"health_check:{int(time.time())}"
            await asyncio.get_event_loop().run_in_executor(
                None, self.redis_service.set, test_key, {"test": True}, 10
            )

            value = await asyncio.get_event_loop().run_in_executor(
                None, self.redis_service.get, test_key
            )

            await asyncio.get_event_loop().run_in_executor(
                None, self.redis_service.delete, test_key
            )

            return value is not None and value.get("test") is True

        except Exception as e:
            logger.warning(f"Redis health check failed: {e}")
            return False

    async def _get_redis_metrics(self) -> Dict[str, Any]:
        """Get detailed Redis metrics"""
        if not REDIS_AVAILABLE:
            return {}

        try:
            info = await asyncio.get_event_loop().run_in_executor(
                None, self.redis_service.info
            )

            return {
                "redis_version": info.get("redis_version"),
                "used_memory": info.get("used_memory"),
                "used_memory_human": info.get("used_memory_human"),
                "total_commands_processed": info.get("total_commands_processed"),
                "connected_clients": info.get("connected_clients"),
                "keyspace_hits": info.get("keyspace_hits", 0),
                "keyspace_misses": info.get("keyspace_misses", 0),
                "memory_usage_percent": (
                    info.get("used_memory", 0) / info.get("maxmemory", 1) * 100
                    if info.get("maxmemory", 0) > 0
                    else 0
                ),
            }

        except Exception as e:
            logger.warning(f"Failed to get Redis metrics: {e}")
            return {}

    def get_health_summary(self, hours: int = 24) -> Dict[str, Any]:
        """Get health summary for the last N hours"""
        cutoff = datetime.now() - timedelta(hours=hours)
        recent_checks = [
            check for check in self.health_history if check.timestamp > cutoff
        ]

        if not recent_checks:
            return {"status": "no_data", "checks": 0}

        status_counts = {}
        for check in recent_checks:
            status = check.status.value
            status_counts[status] = status_counts.get(status, 0) + 1

        # Determine overall status
        if status_counts.get("unhealthy", 0) > 0:
            overall_status = "unhealthy"
        elif status_counts.get("degraded", 0) > len(recent_checks) * 0.2:
            overall_status = "degraded"
        else:
            overall_status = "healthy"

        latest_check = recent_checks[-1]

        return {
            "overall_status": overall_status,
            "checks_performed": len(recent_checks),
            "status_breakdown": status_counts,
            "latest_check": {
                "status": latest_check.status.value,
                "message": latest_check.message,
                "timestamp": latest_check.timestamp.isoformat(),
                "recommendations": latest_check.recommendations,
            },
            "period_hours": hours,
        }


class CacheMaintenanceManager:
    """Cache maintenance and optimization utilities"""

    def __init__(self):
        self.redis_service = get_redis()
        self.maintenance_log = []

    async def perform_maintenance(self, force_cleanup: bool = False) -> Dict[str, Any]:
        """Perform routine cache maintenance"""
        maintenance_start = time.time()
        actions_performed = []

        try:
            # Cleanup expired in-memory cache entries
            cleanup_expired_cache()
            actions_performed.append("Cleaned expired memory cache entries")

            # Force cleanup if requested
            if force_cleanup:
                clear_all_cache()
                actions_performed.append("Cleared all cache entries (forced)")

            # Warm critical cache entries
            if cache_warmer:
                await cache_warmer.warm_cache()
                actions_performed.append("Warmed critical cache entries")

            # Redis-specific maintenance
            if REDIS_AVAILABLE:
                redis_actions = await self._perform_redis_maintenance()
                actions_performed.extend(redis_actions)

            maintenance_time = time.time() - maintenance_start

            result = {
                "success": True,
                "duration_seconds": round(maintenance_time, 3),
                "actions_performed": actions_performed,
                "timestamp": datetime.now().isoformat(),
            }

            self.maintenance_log.append(result)
            logger.info(f"Cache maintenance completed in {maintenance_time:.3f}s")

            return result

        except Exception as e:
            logger.error(f"Cache maintenance failed: {e}")
            return {
                "success": False,
                "error": str(e),
                "timestamp": datetime.now().isoformat(),
            }

    async def _perform_redis_maintenance(self) -> List[str]:
        """Perform Redis-specific maintenance tasks"""
        actions = []

        try:
            # Check Redis memory usage
            info = await asyncio.get_event_loop().run_in_executor(
                None, self.redis_service.info
            )

            memory_usage = info.get("used_memory", 0)
            max_memory = info.get("maxmemory", 0)

            if max_memory > 0 and memory_usage / max_memory > 0.8:
                # High memory usage - could trigger eviction policies
                actions.append("High Redis memory usage detected")

            # Get key statistics
            db_size = await asyncio.get_event_loop().run_in_executor(
                None, lambda: len(self.redis_service.keys("*"))
            )
            actions.append(f"Redis contains {db_size} keys")

        except Exception as e:
            logger.warning(f"Redis maintenance check failed: {e}")
            actions.append(f"Redis maintenance check failed: {e}")

        return actions

    def get_maintenance_history(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get recent maintenance history"""
        return self.maintenance_log[-limit:] if self.maintenance_log else []


class CacheDebugger:
    """Cache debugging and diagnostics utility"""

    def __init__(self):
        self.redis_service = get_redis()

    async def debug_key(self, key: str) -> Dict[str, Any]:
        """Debug a specific cache key"""
        debug_info = {
            "key": key,
            "exists_redis": False,
            "exists_memory": False,
            "redis_ttl": None,
            "redis_value": None,
            "memory_value": None,
            "memory_expiry": None,
            "timestamp": datetime.now().isoformat(),
        }

        # Check in-memory cache
        from utils.enhanced_cache import _memory_cache, _cache_expiry

        if key in _memory_cache:
            debug_info["exists_memory"] = True
            debug_info["memory_value"] = (
                str(_memory_cache[key])[:100] + "..."
                if len(str(_memory_cache[key])) > 100
                else str(_memory_cache[key])
            )
            if key in _cache_expiry:
                debug_info["memory_expiry"] = _cache_expiry[key].isoformat()

        # Check Redis
        if REDIS_AVAILABLE:
            try:
                exists = await asyncio.get_event_loop().run_in_executor(
                    None, self.redis_service.exists, key
                )
                debug_info["exists_redis"] = exists

                if exists:
                    ttl = await asyncio.get_event_loop().run_in_executor(
                        None, self.redis_service.ttl, key
                    )
                    debug_info["redis_ttl"] = ttl

                    value = await asyncio.get_event_loop().run_in_executor(
                        None, self.redis_service.get, key
                    )
                    debug_info["redis_value"] = (
                        str(value)[:100] + "..."
                        if len(str(value)) > 100
                        else str(value)
                    )

            except Exception as e:
                debug_info["redis_error"] = str(e)

        return debug_info

    async def list_cache_keys(
        self, pattern: str = "*", limit: int = 100
    ) -> Dict[str, Any]:
        """List cache keys matching pattern"""
        result = {
            "pattern": pattern,
            "redis_keys": [],
            "memory_keys": [],
            "timestamp": datetime.now().isoformat(),
        }

        # Get Redis keys
        if REDIS_AVAILABLE:
            try:
                redis_keys = await asyncio.get_event_loop().run_in_executor(
                    None, self.redis_service.keys, pattern
                )
                result["redis_keys"] = redis_keys[:limit]
                result["redis_total"] = len(redis_keys)
            except Exception as e:
                result["redis_error"] = str(e)

        # Get memory cache keys
        from utils.enhanced_cache import _memory_cache
        import fnmatch

        memory_keys = [
            key for key in _memory_cache.keys() if fnmatch.fnmatch(key, pattern)
        ]
        result["memory_keys"] = memory_keys[:limit]
        result["memory_total"] = len(memory_keys)

        return result

    async def cache_performance_report(self) -> Dict[str, Any]:
        """Generate comprehensive cache performance report"""
        stats = get_cache_stats()
        health = get_cache_health()

        report = {
            "summary": {
                "overall_status": health["status"],
                "hit_rate": stats["hit_rate"],
                "total_requests": stats["total_requests"],
                "redis_available": REDIS_AVAILABLE,
            },
            "performance_metrics": stats,
            "health_status": health,
            "recommendations": [],
            "timestamp": datetime.now().isoformat(),
        }

        # Add performance recommendations
        if stats["hit_rate"] < 60:
            report["recommendations"].append(
                "Consider implementing cache warming for frequently accessed data"
            )

        if stats["redis_fallbacks"] > stats["total_requests"] * 0.05:
            report["recommendations"].append(
                "High Redis fallback rate - check Redis connectivity and stability"
            )

        if stats["memory_cache_size"] > 5000:
            report["recommendations"].append(
                "Large in-memory cache - consider Redis migration or cleanup"
            )

        # Add Redis-specific metrics
        if REDIS_AVAILABLE:
            try:
                redis_info = await asyncio.get_event_loop().run_in_executor(
                    None, self.redis_service.info
                )
                report["redis_metrics"] = {
                    "version": redis_info.get("redis_version"),
                    "memory_usage": redis_info.get("used_memory_human"),
                    "connected_clients": redis_info.get("connected_clients"),
                    "total_commands": redis_info.get("total_commands_processed"),
                }
            except Exception as e:
                report["redis_error"] = str(e)

        return report


# Global instances
health_monitor = CacheHealthMonitor()
maintenance_manager = CacheMaintenanceManager()
cache_debugger = CacheDebugger()


# Convenience functions for API endpoints
async def get_cache_health_status() -> Dict[str, Any]:
    """Get current cache health status"""
    return await health_monitor.perform_health_check()


async def perform_cache_maintenance(force_cleanup: bool = False) -> Dict[str, Any]:
    """Perform cache maintenance"""
    return await maintenance_manager.perform_maintenance(force_cleanup)


async def debug_cache_key(key: str) -> Dict[str, Any]:
    """Debug specific cache key"""
    return await cache_debugger.debug_key(key)


async def get_cache_performance_report() -> Dict[str, Any]:
    """Get comprehensive performance report"""
    return await cache_debugger.cache_performance_report()
