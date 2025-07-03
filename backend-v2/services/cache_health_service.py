"""
Redis cache health checking and monitoring service.
"""

import logging
import time
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from enum import Enum

from services.redis_service import cache_service
from services.booking_cache_service import booking_cache

logger = logging.getLogger(__name__)

class HealthStatus(Enum):
    """Health status levels."""
    HEALTHY = "healthy"
    WARNING = "warning"
    CRITICAL = "critical"
    UNKNOWN = "unknown"

@dataclass
class HealthMetric:
    """Individual health metric."""
    name: str
    value: Any
    status: HealthStatus
    threshold: Optional[Any] = None
    message: Optional[str] = None
    timestamp: Optional[str] = None
    
    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.now().isoformat()

@dataclass
class HealthCheckResult:
    """Complete health check result."""
    overall_status: HealthStatus
    timestamp: str
    duration_ms: float
    metrics: List[HealthMetric]
    summary: Dict[str, Any]
    recommendations: List[str]

class CacheHealthChecker:
    """Performs health checks on the Redis cache system."""
    
    def __init__(self):
        self.cache = cache_service
        self.booking_cache = booking_cache
        
        # Health thresholds
        self.thresholds = {
            'response_time_ms': 100,  # Response time should be under 100ms
            'memory_usage_mb': 512,   # Memory usage warning at 512MB
            'hit_rate_min': 70.0,     # Hit rate should be above 70%
            'connection_count_max': 100,  # Max connections warning
            'error_rate_max': 1.0     # Error rate should be under 1%
        }
    
    def perform_health_check(self) -> HealthCheckResult:
        """Perform comprehensive health check."""
        start_time = time.time()
        metrics = []
        recommendations = []
        
        # Check Redis availability
        availability_metric = self._check_availability()
        metrics.append(availability_metric)
        
        if availability_metric.status == HealthStatus.CRITICAL:
            # If Redis is down, return early
            duration = (time.time() - start_time) * 1000
            return HealthCheckResult(
                overall_status=HealthStatus.CRITICAL,
                timestamp=datetime.now().isoformat(),
                duration_ms=duration,
                metrics=metrics,
                summary={"redis_available": False},
                recommendations=["Redis is unavailable - check connection and Redis server status"]
            )
        
        # Check response time
        response_time_metric = self._check_response_time()
        metrics.append(response_time_metric)
        
        # Check memory usage
        memory_metric = self._check_memory_usage()
        metrics.append(memory_metric)
        
        # Check connection health
        connection_metric = self._check_connection_health()
        metrics.append(connection_metric)
        
        # Check cache hit rate
        hit_rate_metric = self._check_hit_rate()
        metrics.append(hit_rate_metric)
        
        # Check cache operations
        operations_metric = self._check_cache_operations()
        metrics.append(operations_metric)
        
        # Check for expiration issues
        expiration_metric = self._check_expiration_health()
        metrics.append(expiration_metric)
        
        # Generate recommendations
        recommendations = self._generate_recommendations(metrics)
        
        # Determine overall status
        overall_status = self._determine_overall_status(metrics)
        
        # Calculate duration
        duration = (time.time() - start_time) * 1000
        
        # Create summary
        summary = self._create_summary(metrics)
        
        return HealthCheckResult(
            overall_status=overall_status,
            timestamp=datetime.now().isoformat(),
            duration_ms=duration,
            metrics=metrics,
            summary=summary,
            recommendations=recommendations
        )
    
    def _check_availability(self) -> HealthMetric:
        """Check if Redis is available."""
        try:
            is_available = self.cache.is_available()
            status = HealthStatus.HEALTHY if is_available else HealthStatus.CRITICAL
            message = "Redis is available" if is_available else "Redis is not available"
            
            return HealthMetric(
                name="availability",
                value=is_available,
                status=status,
                message=message
            )
        except Exception as e:
            return HealthMetric(
                name="availability",
                value=False,
                status=HealthStatus.CRITICAL,
                message=f"Availability check failed: {e}"
            )
    
    def _check_response_time(self) -> HealthMetric:
        """Check Redis response time."""
        try:
            start_time = time.time()
            
            # Perform a simple operation
            test_key = f"health_check:{int(time.time())}"
            self.cache.set(test_key, "test_value", ttl=5)
            value = self.cache.get(test_key)
            self.cache.delete(test_key)
            
            response_time_ms = (time.time() - start_time) * 1000
            
            if response_time_ms < self.thresholds['response_time_ms']:
                status = HealthStatus.HEALTHY
                message = f"Response time is good: {response_time_ms:.2f}ms"
            elif response_time_ms < self.thresholds['response_time_ms'] * 2:
                status = HealthStatus.WARNING
                message = f"Response time is slow: {response_time_ms:.2f}ms"
            else:
                status = HealthStatus.CRITICAL
                message = f"Response time is very slow: {response_time_ms:.2f}ms"
            
            return HealthMetric(
                name="response_time_ms",
                value=round(response_time_ms, 2),
                status=status,
                threshold=self.thresholds['response_time_ms'],
                message=message
            )
        except Exception as e:
            return HealthMetric(
                name="response_time_ms",
                value=None,
                status=HealthStatus.CRITICAL,
                message=f"Response time check failed: {e}"
            )
    
    def _check_memory_usage(self) -> HealthMetric:
        """Check Redis memory usage."""
        try:
            stats = self.cache.get_stats()
            
            if not stats.get("available", False):
                return HealthMetric(
                    name="memory_usage_mb",
                    value=None,
                    status=HealthStatus.UNKNOWN,
                    message="Cannot get memory stats - Redis unavailable"
                )
            
            used_memory = stats.get("used_memory", 0)
            used_memory_mb = used_memory / (1024 * 1024)  # Convert to MB
            
            if used_memory_mb < self.thresholds['memory_usage_mb']:
                status = HealthStatus.HEALTHY
                message = f"Memory usage is normal: {used_memory_mb:.2f}MB"
            elif used_memory_mb < self.thresholds['memory_usage_mb'] * 2:
                status = HealthStatus.WARNING
                message = f"Memory usage is high: {used_memory_mb:.2f}MB"
            else:
                status = HealthStatus.CRITICAL
                message = f"Memory usage is very high: {used_memory_mb:.2f}MB"
            
            return HealthMetric(
                name="memory_usage_mb",
                value=round(used_memory_mb, 2),
                status=status,
                threshold=self.thresholds['memory_usage_mb'],
                message=message
            )
        except Exception as e:
            return HealthMetric(
                name="memory_usage_mb",
                value=None,
                status=HealthStatus.CRITICAL,
                message=f"Memory usage check failed: {e}"
            )
    
    def _check_connection_health(self) -> HealthMetric:
        """Check Redis connection health."""
        try:
            stats = self.cache.get_stats()
            
            if not stats.get("available", False):
                return HealthMetric(
                    name="connection_health",
                    value=None,
                    status=HealthStatus.CRITICAL,
                    message="Cannot get connection stats - Redis unavailable"
                )
            
            connected_clients = stats.get("connected_clients", 0)
            
            if connected_clients < self.thresholds['connection_count_max']:
                status = HealthStatus.HEALTHY
                message = f"Connection count is normal: {connected_clients}"
            elif connected_clients < self.thresholds['connection_count_max'] * 1.5:
                status = HealthStatus.WARNING
                message = f"Connection count is high: {connected_clients}"
            else:
                status = HealthStatus.CRITICAL
                message = f"Connection count is very high: {connected_clients}"
            
            return HealthMetric(
                name="connected_clients",
                value=connected_clients,
                status=status,
                threshold=self.thresholds['connection_count_max'],
                message=message
            )
        except Exception as e:
            return HealthMetric(
                name="connection_health",
                value=None,
                status=HealthStatus.CRITICAL,
                message=f"Connection health check failed: {e}"
            )
    
    def _check_hit_rate(self) -> HealthMetric:
        """Check cache hit rate."""
        try:
            stats = self.cache.get_stats()
            
            if not stats.get("available", False):
                return HealthMetric(
                    name="hit_rate",
                    value=None,
                    status=HealthStatus.UNKNOWN,
                    message="Cannot get hit rate - Redis unavailable"
                )
            
            hit_rate = stats.get("hit_rate", 0.0)
            
            if hit_rate >= self.thresholds['hit_rate_min']:
                status = HealthStatus.HEALTHY
                message = f"Hit rate is good: {hit_rate}%"
            elif hit_rate >= self.thresholds['hit_rate_min'] * 0.7:
                status = HealthStatus.WARNING
                message = f"Hit rate is low: {hit_rate}%"
            else:
                status = HealthStatus.CRITICAL
                message = f"Hit rate is very low: {hit_rate}%"
            
            return HealthMetric(
                name="hit_rate",
                value=hit_rate,
                status=status,
                threshold=self.thresholds['hit_rate_min'],
                message=message
            )
        except Exception as e:
            return HealthMetric(
                name="hit_rate",
                value=None,
                status=HealthStatus.CRITICAL,
                message=f"Hit rate check failed: {e}"
            )
    
    def _check_cache_operations(self) -> HealthMetric:
        """Check if basic cache operations work."""
        try:
            test_key = f"health_ops_test:{int(time.time())}"
            test_value = {"test": True, "timestamp": time.time()}
            
            # Test SET operation
            set_result = self.cache.set(test_key, test_value, ttl=5)
            if not set_result:
                return HealthMetric(
                    name="cache_operations",
                    value=False,
                    status=HealthStatus.CRITICAL,
                    message="Cache SET operation failed"
                )
            
            # Test GET operation
            get_result = self.cache.get(test_key)
            if get_result != test_value:
                return HealthMetric(
                    name="cache_operations",
                    value=False,
                    status=HealthStatus.CRITICAL,
                    message="Cache GET operation failed or returned wrong value"
                )
            
            # Test DELETE operation
            delete_result = self.cache.delete(test_key)
            if not delete_result:
                return HealthMetric(
                    name="cache_operations",
                    value=False,
                    status=HealthStatus.WARNING,
                    message="Cache DELETE operation failed"
                )
            
            return HealthMetric(
                name="cache_operations",
                value=True,
                status=HealthStatus.HEALTHY,
                message="All cache operations working correctly"
            )
        except Exception as e:
            return HealthMetric(
                name="cache_operations",
                value=False,
                status=HealthStatus.CRITICAL,
                message=f"Cache operations check failed: {e}"
            )
    
    def _check_expiration_health(self) -> HealthMetric:
        """Check if cache expiration is working properly."""
        try:
            test_key = f"health_exp_test:{int(time.time())}"
            
            # Set a key with 1 second TTL
            self.cache.set(test_key, "expiration_test", ttl=1)
            
            # Check that it exists
            if not self.cache.exists(test_key):
                return HealthMetric(
                    name="expiration_health",
                    value=False,
                    status=HealthStatus.WARNING,
                    message="Key was not set properly for expiration test"
                )
            
            # Wait for expiration
            time.sleep(1.1)
            
            # Check that it's gone
            if self.cache.exists(test_key):
                return HealthMetric(
                    name="expiration_health",
                    value=False,
                    status=HealthStatus.WARNING,
                    message="Cache expiration may not be working - key still exists after TTL"
                )
            
            return HealthMetric(
                name="expiration_health",
                value=True,
                status=HealthStatus.HEALTHY,
                message="Cache expiration is working correctly"
            )
        except Exception as e:
            return HealthMetric(
                name="expiration_health",
                value=None,
                status=HealthStatus.WARNING,
                message=f"Expiration health check failed: {e}"
            )
    
    def _determine_overall_status(self, metrics: List[HealthMetric]) -> HealthStatus:
        """Determine overall health status from individual metrics."""
        critical_count = sum(1 for m in metrics if m.status == HealthStatus.CRITICAL)
        warning_count = sum(1 for m in metrics if m.status == HealthStatus.WARNING)
        
        if critical_count > 0:
            return HealthStatus.CRITICAL
        elif warning_count > 0:
            return HealthStatus.WARNING
        else:
            return HealthStatus.HEALTHY
    
    def _create_summary(self, metrics: List[HealthMetric]) -> Dict[str, Any]:
        """Create summary from metrics."""
        summary = {}
        
        for metric in metrics:
            summary[metric.name] = {
                "value": metric.value,
                "status": metric.status.value,
                "message": metric.message
            }
        
        # Add counts
        summary["health_summary"] = {
            "total_metrics": len(metrics),
            "healthy": sum(1 for m in metrics if m.status == HealthStatus.HEALTHY),
            "warning": sum(1 for m in metrics if m.status == HealthStatus.WARNING),
            "critical": sum(1 for m in metrics if m.status == HealthStatus.CRITICAL),
            "unknown": sum(1 for m in metrics if m.status == HealthStatus.UNKNOWN)
        }
        
        return summary
    
    def _generate_recommendations(self, metrics: List[HealthMetric]) -> List[str]:
        """Generate recommendations based on health metrics."""
        recommendations = []
        
        for metric in metrics:
            if metric.status == HealthStatus.CRITICAL:
                if metric.name == "availability":
                    recommendations.append("Check Redis server status and network connectivity")
                elif metric.name == "response_time_ms":
                    recommendations.append("Check Redis server performance and network latency")
                elif metric.name == "memory_usage_mb":
                    recommendations.append("Consider increasing Redis memory limit or clearing unused data")
                elif metric.name == "cache_operations":
                    recommendations.append("Check Redis server logs for errors")
            
            elif metric.status == HealthStatus.WARNING:
                if metric.name == "hit_rate":
                    recommendations.append("Review cache TTL settings and cache key strategies")
                elif metric.name == "connected_clients":
                    recommendations.append("Monitor connection pool usage and consider tuning")
                elif metric.name == "memory_usage_mb":
                    recommendations.append("Monitor memory usage and plan for scaling")
        
        # Add general recommendations
        if not recommendations:
            recommendations.append("Cache system is healthy - continue monitoring")
        
        return recommendations

class CacheMonitoringService:
    """Service for continuous cache monitoring and alerting."""
    
    def __init__(self):
        self.health_checker = CacheHealthChecker()
        self.last_check_result: Optional[HealthCheckResult] = None
        self.health_history: List[HealthCheckResult] = []
        self.max_history_size = 100
    
    def get_current_health(self) -> HealthCheckResult:
        """Get current health status."""
        result = self.health_checker.perform_health_check()
        
        # Store in history
        self.last_check_result = result
        self.health_history.append(result)
        
        # Trim history if needed
        if len(self.health_history) > self.max_history_size:
            self.health_history = self.health_history[-self.max_history_size:]
        
        return result
    
    def get_health_trends(self, hours: int = 24) -> Dict[str, Any]:
        """Get health trends over specified time period."""
        cutoff_time = datetime.now() - timedelta(hours=hours)
        
        recent_checks = [
            check for check in self.health_history
            if datetime.fromisoformat(check.timestamp) > cutoff_time
        ]
        
        if not recent_checks:
            return {"error": "No health check data available for the specified period"}
        
        # Calculate trends
        status_counts = {}
        avg_response_time = 0
        response_time_count = 0
        
        for check in recent_checks:
            status = check.overall_status.value
            status_counts[status] = status_counts.get(status, 0) + 1
            
            # Find response time metric
            for metric in check.metrics:
                if metric.name == "response_time_ms" and metric.value is not None:
                    avg_response_time += metric.value
                    response_time_count += 1
        
        if response_time_count > 0:
            avg_response_time = avg_response_time / response_time_count
        
        return {
            "period_hours": hours,
            "total_checks": len(recent_checks),
            "status_distribution": status_counts,
            "average_response_time_ms": round(avg_response_time, 2),
            "latest_check": recent_checks[-1].timestamp if recent_checks else None,
            "uptime_percentage": round(
                (status_counts.get("healthy", 0) + status_counts.get("warning", 0)) / 
                len(recent_checks) * 100, 2
            ) if recent_checks else 0
        }
    
    def get_cache_utilization(self) -> Dict[str, Any]:
        """Get cache utilization metrics."""
        if not self.last_check_result:
            self.get_current_health()
        
        if not self.last_check_result:
            return {"error": "Unable to get cache utilization data"}
        
        utilization = {}
        
        for metric in self.last_check_result.metrics:
            if metric.name in ["memory_usage_mb", "hit_rate", "connected_clients"]:
                utilization[metric.name] = {
                    "current": metric.value,
                    "threshold": metric.threshold,
                    "status": metric.status.value,
                    "percentage_of_threshold": round(
                        (metric.value / metric.threshold * 100) if metric.threshold and metric.value else 0, 2
                    )
                }
        
        return utilization
    
    def generate_health_report(self) -> Dict[str, Any]:
        """Generate comprehensive health report."""
        current_health = self.get_current_health()
        trends = self.get_health_trends(24)
        utilization = self.get_cache_utilization()
        
        return {
            "report_timestamp": datetime.now().isoformat(),
            "current_health": asdict(current_health),
            "24_hour_trends": trends,
            "utilization": utilization,
            "recommendations": current_health.recommendations,
            "next_check_recommended": (datetime.now() + timedelta(minutes=5)).isoformat()
        }

# Global cache health and monitoring services
cache_health_checker = CacheHealthChecker()
cache_monitoring_service = CacheMonitoringService()