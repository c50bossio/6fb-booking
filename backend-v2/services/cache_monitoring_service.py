"""
Cache Monitoring and Metrics Service

This service provides comprehensive monitoring, metrics collection, and alerting
for the Redis API caching layer to ensure optimal performance and reliability.
"""

import json
import logging
import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
import statistics

from services.api_cache_service import api_cache_service
from services.redis_cache import cache_service
from config import settings

logger = logging.getLogger(__name__)

class AlertLevel(Enum):
    """Alert severity levels"""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"

@dataclass
class CacheAlert:
    """Cache-related alert data"""
    level: AlertLevel
    message: str
    metric_name: str
    current_value: float
    threshold: float
    timestamp: datetime
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'level': self.level.value,
            'message': self.message,
            'metric_name': self.metric_name,
            'current_value': self.current_value,
            'threshold': self.threshold,
            'timestamp': self.timestamp.isoformat()
        }

@dataclass
class CacheMetricSnapshot:
    """Snapshot of cache metrics at a point in time"""
    timestamp: datetime
    hit_rate: float
    total_requests: int
    cache_hits: int
    cache_misses: int
    avg_response_time_cached: float
    avg_response_time_uncached: float
    performance_improvement: float
    redis_memory_usage: Optional[str] = None
    redis_connected_clients: Optional[int] = None
    active_keys: Optional[int] = None

class CacheMonitoringService:
    """
    Comprehensive monitoring service for Redis API caching layer
    """
    
    def __init__(self):
        self.metric_history: List[CacheMetricSnapshot] = []
        self.alerts: List[CacheAlert] = []
        self.monitoring_enabled = True
        
        # Performance thresholds for alerting
        self.thresholds = {
            'min_hit_rate': 40.0,           # Minimum acceptable hit rate (%)
            'max_response_time': 200.0,     # Maximum acceptable response time (ms)
            'min_performance_gain': 20.0,   # Minimum performance improvement (%)
            'max_redis_memory': 80.0,       # Maximum Redis memory usage (%)
            'max_connected_clients': 90,    # Maximum Redis connections
            'max_error_rate': 5.0           # Maximum cache error rate (%)
        }
    
    async def collect_metrics(self) -> CacheMetricSnapshot:
        """
        Collect comprehensive cache metrics
        """
        try:
            # Get API cache service metrics
            api_metrics = api_cache_service.metrics
            
            # Get Redis health information
            redis_health = await cache_service.get_stats()
            redis_info = redis_health.get('redis_health', {})
            
            # Create metric snapshot
            snapshot = CacheMetricSnapshot(
                timestamp=datetime.now(),
                hit_rate=api_metrics.hit_rate,
                total_requests=api_metrics.total_requests,
                cache_hits=api_metrics.cache_hits,
                cache_misses=api_metrics.cache_misses,
                avg_response_time_cached=api_metrics.avg_response_time_cached,
                avg_response_time_uncached=api_metrics.avg_response_time_uncached,
                performance_improvement=api_metrics.performance_improvement,
                redis_memory_usage=redis_info.get('used_memory'),
                redis_connected_clients=redis_info.get('connected_clients'),
                active_keys=await self._count_active_cache_keys()
            )
            
            # Store in history (keep last 100 snapshots)
            self.metric_history.append(snapshot)
            if len(self.metric_history) > 100:
                self.metric_history.pop(0)
            
            # Check for alert conditions
            await self._check_alert_conditions(snapshot)
            
            return snapshot
            
        except Exception as e:
            logger.error(f"Error collecting cache metrics: {e}")
            return CacheMetricSnapshot(
                timestamp=datetime.now(),
                hit_rate=0.0,
                total_requests=0,
                cache_hits=0,
                cache_misses=0,
                avg_response_time_cached=0.0,
                avg_response_time_uncached=0.0,
                performance_improvement=0.0
            )
    
    async def _count_active_cache_keys(self) -> Optional[int]:
        """Count active cache keys in Redis"""
        try:
            if cache_service.redis_manager.is_connected:
                # Use Redis DBSIZE command to get key count
                redis_client = cache_service.redis_manager.redis
                key_count = await redis_client.dbsize()
                return key_count
        except Exception as e:
            logger.warning(f"Could not count Redis keys: {e}")
        return None
    
    async def _check_alert_conditions(self, snapshot: CacheMetricSnapshot):
        """
        Check metric snapshot against thresholds and generate alerts
        """
        alerts_generated = []
        
        # Check hit rate
        if snapshot.hit_rate < self.thresholds['min_hit_rate']:
            alert = CacheAlert(
                level=AlertLevel.WARNING,
                message=f"Cache hit rate ({snapshot.hit_rate:.1f}%) below threshold ({self.thresholds['min_hit_rate']}%)",
                metric_name="hit_rate",
                current_value=snapshot.hit_rate,
                threshold=self.thresholds['min_hit_rate'],
                timestamp=snapshot.timestamp
            )
            alerts_generated.append(alert)
        
        # Check performance improvement
        if snapshot.performance_improvement < self.thresholds['min_performance_gain']:
            alert = CacheAlert(
                level=AlertLevel.WARNING,
                message=f"Performance improvement ({snapshot.performance_improvement:.1f}%) below target ({self.thresholds['min_performance_gain']}%)",
                metric_name="performance_improvement",
                current_value=snapshot.performance_improvement,
                threshold=self.thresholds['min_performance_gain'],
                timestamp=snapshot.timestamp
            )
            alerts_generated.append(alert)
        
        # Check cached response time
        if snapshot.avg_response_time_cached > self.thresholds['max_response_time']:
            alert = CacheAlert(
                level=AlertLevel.ERROR,
                message=f"Cached response time ({snapshot.avg_response_time_cached:.1f}ms) exceeds threshold ({self.thresholds['max_response_time']}ms)",
                metric_name="avg_response_time_cached",
                current_value=snapshot.avg_response_time_cached,
                threshold=self.thresholds['max_response_time'],
                timestamp=snapshot.timestamp
            )
            alerts_generated.append(alert)
        
        # Check Redis connectivity
        if not cache_service.redis_manager.is_connected:
            alert = CacheAlert(
                level=AlertLevel.CRITICAL,
                message="Redis connection lost - cache service degraded",
                metric_name="redis_connected",
                current_value=0,
                threshold=1,
                timestamp=snapshot.timestamp
            )
            alerts_generated.append(alert)
        
        # Add new alerts and maintain alert history
        self.alerts.extend(alerts_generated)
        
        # Keep only recent alerts (last 24 hours)
        cutoff_time = datetime.now() - timedelta(hours=24)
        self.alerts = [alert for alert in self.alerts if alert.timestamp > cutoff_time]
        
        # Log alerts
        for alert in alerts_generated:
            if alert.level in [AlertLevel.ERROR, AlertLevel.CRITICAL]:
                logger.error(f"Cache Alert [{alert.level.value.upper()}]: {alert.message}")
            else:
                logger.warning(f"Cache Alert [{alert.level.value.upper()}]: {alert.message}")
    
    def get_performance_report(self, hours_back: int = 24) -> Dict[str, Any]:
        """
        Generate comprehensive performance report
        """
        cutoff_time = datetime.now() - timedelta(hours=hours_back)
        recent_metrics = [m for m in self.metric_history if m.timestamp > cutoff_time]
        
        if not recent_metrics:
            return {
                "error": "No metrics available for the specified time period"
            }
        
        # Calculate statistics
        hit_rates = [m.hit_rate for m in recent_metrics]
        response_times_cached = [m.avg_response_time_cached for m in recent_metrics if m.avg_response_time_cached > 0]
        response_times_uncached = [m.avg_response_time_uncached for m in recent_metrics if m.avg_response_time_uncached > 0]
        performance_improvements = [m.performance_improvement for m in recent_metrics if m.performance_improvement > 0]
        
        return {
            "period": {
                "hours_back": hours_back,
                "start_time": cutoff_time.isoformat(),
                "end_time": datetime.now().isoformat(),
                "snapshots_analyzed": len(recent_metrics)
            },
            "hit_rate_analysis": {
                "current": hit_rates[-1] if hit_rates else 0,
                "average": statistics.mean(hit_rates) if hit_rates else 0,
                "minimum": min(hit_rates) if hit_rates else 0,
                "maximum": max(hit_rates) if hit_rates else 0,
                "trend": self._calculate_trend(hit_rates) if len(hit_rates) > 1 else "stable"
            },
            "performance_analysis": {
                "avg_improvement_percent": statistics.mean(performance_improvements) if performance_improvements else 0,
                "best_improvement_percent": max(performance_improvements) if performance_improvements else 0,
                "avg_cached_response_ms": statistics.mean(response_times_cached) if response_times_cached else 0,
                "avg_uncached_response_ms": statistics.mean(response_times_uncached) if response_times_uncached else 0
            },
            "redis_health": {
                "connected": cache_service.redis_manager.is_connected,
                "last_memory_usage": recent_metrics[-1].redis_memory_usage if recent_metrics else None,
                "last_connected_clients": recent_metrics[-1].redis_connected_clients if recent_metrics else None,
                "active_keys": recent_metrics[-1].active_keys if recent_metrics else None
            },
            "alerts_summary": {
                "total_alerts": len(self.alerts),
                "critical_alerts": len([a for a in self.alerts if a.level == AlertLevel.CRITICAL]),
                "error_alerts": len([a for a in self.alerts if a.level == AlertLevel.ERROR]),
                "warning_alerts": len([a for a in self.alerts if a.level == AlertLevel.WARNING])
            },
            "recommendations": self._generate_recommendations(recent_metrics)
        }
    
    def _calculate_trend(self, values: List[float]) -> str:
        """Calculate trend direction from a series of values"""
        if len(values) < 2:
            return "stable"
        
        # Simple linear regression to determine trend
        n = len(values)
        x_mean = (n - 1) / 2
        y_mean = statistics.mean(values)
        
        numerator = sum((i - x_mean) * (values[i] - y_mean) for i in range(n))
        denominator = sum((i - x_mean) ** 2 for i in range(n))
        
        if denominator == 0:
            return "stable"
        
        slope = numerator / denominator
        
        if slope > 0.1:
            return "improving"
        elif slope < -0.1:
            return "degrading"
        else:
            return "stable"
    
    def _generate_recommendations(self, metrics: List[CacheMetricSnapshot]) -> List[str]:
        """Generate performance optimization recommendations"""
        if not metrics:
            return ["No metrics available for analysis"]
        
        recommendations = []
        latest = metrics[-1]
        
        # Analyze hit rate
        if latest.hit_rate < 40:
            recommendations.append("Low cache hit rate detected. Consider increasing TTL values for stable data.")
        elif latest.hit_rate > 90:
            recommendations.append("Very high hit rate - monitor for stale data issues and consider cache warming strategies.")
        
        # Analyze performance improvement
        if latest.performance_improvement < 20:
            recommendations.append("Limited performance gains. Review caching strategy for heavy operations.")
        elif latest.performance_improvement > 60:
            recommendations.append("Excellent cache performance! Consider expanding caching to more endpoints.")
        
        # Analyze response times
        if latest.avg_response_time_cached > 100:
            recommendations.append("Cached response times are high. Check Redis latency and network connectivity.")
        
        # Analyze Redis health
        if latest.active_keys and latest.active_keys > 10000:
            recommendations.append("High number of cache keys. Consider implementing key cleanup and TTL optimization.")
        
        # Analyze trends
        hit_rate_trend = self._calculate_trend([m.hit_rate for m in metrics[-10:]])
        if hit_rate_trend == "degrading":
            recommendations.append("Hit rate is declining. Review cache invalidation patterns and TTL settings.")
        
        if not recommendations:
            recommendations.append("Cache performance is optimal. Continue monitoring for any changes.")
        
        return recommendations
    
    async def get_cache_key_analysis(self) -> Dict[str, Any]:
        """
        Analyze cache key patterns and usage
        """
        try:
            if not cache_service.redis_manager.is_connected:
                return {"error": "Redis not connected"}
            
            redis_client = cache_service.redis_manager.redis
            key_patterns = {}
            total_keys = 0
            
            # Scan for keys with different patterns
            patterns_to_check = [
                "api_cache:get_available_slots*",
                "api_cache:get_*_analytics*",
                "api_cache:comprehensive_dashboard*",
                "api_cache:get_user_profile*",
                "api_cache:get_business_*"
            ]
            
            for pattern in patterns_to_check:
                key_count = 0
                async for key in redis_client.scan_iter(match=pattern):
                    key_count += 1
                
                pattern_name = pattern.split(':')[-1].replace('*', '')
                key_patterns[pattern_name] = key_count
                total_keys += key_count
            
            return {
                "total_cache_keys": total_keys,
                "key_patterns": key_patterns,
                "analysis_timestamp": datetime.now().isoformat(),
                "redis_connected": True
            }
            
        except Exception as e:
            logger.error(f"Error analyzing cache keys: {e}")
            return {"error": str(e)}
    
    async def clear_expired_metrics(self):
        """Clear old metrics and alerts"""
        cutoff_time = datetime.now() - timedelta(hours=48)
        
        # Clear old metric snapshots
        self.metric_history = [m for m in self.metric_history if m.timestamp > cutoff_time]
        
        # Clear old alerts
        self.alerts = [a for a in self.alerts if a.timestamp > cutoff_time]
        
        logger.info(f"Cleared expired metrics. Remaining: {len(self.metric_history)} snapshots, {len(self.alerts)} alerts")
    
    def get_real_time_status(self) -> Dict[str, Any]:
        """Get current real-time cache status"""
        latest_metrics = self.metric_history[-1] if self.metric_history else None
        recent_alerts = [a for a in self.alerts if a.timestamp > datetime.now() - timedelta(hours=1)]
        
        return {
            "timestamp": datetime.now().isoformat(),
            "cache_service_status": "healthy" if cache_service.redis_manager.is_connected else "degraded",
            "current_metrics": {
                "hit_rate": latest_metrics.hit_rate if latest_metrics else 0,
                "total_requests": latest_metrics.total_requests if latest_metrics else 0,
                "performance_improvement": latest_metrics.performance_improvement if latest_metrics else 0,
                "avg_cached_response_ms": latest_metrics.avg_response_time_cached if latest_metrics else 0
            },
            "recent_alerts": len(recent_alerts),
            "critical_issues": len([a for a in recent_alerts if a.level == AlertLevel.CRITICAL]),
            "monitoring_enabled": self.monitoring_enabled,
            "uptime_status": "operational" if cache_service.redis_manager.is_connected else "degraded"
        }

# Global monitoring service instance
cache_monitoring_service = CacheMonitoringService()

# Monitoring utilities
async def start_monitoring_loop(interval_seconds: int = 60):
    """
    Start continuous monitoring loop
    """
    logger.info(f"Starting cache monitoring loop with {interval_seconds}s interval")
    
    while cache_monitoring_service.monitoring_enabled:
        try:
            await cache_monitoring_service.collect_metrics()
            await asyncio.sleep(interval_seconds)
        except Exception as e:
            logger.error(f"Error in monitoring loop: {e}")
            await asyncio.sleep(interval_seconds)

async def generate_daily_report() -> Dict[str, Any]:
    """
    Generate comprehensive daily cache performance report
    """
    logger.info("Generating daily cache performance report")
    
    report = cache_monitoring_service.get_performance_report(hours_back=24)
    key_analysis = await cache_monitoring_service.get_cache_key_analysis()
    
    return {
        "report_type": "daily_cache_performance",
        "generated_at": datetime.now().isoformat(),
        "performance_report": report,
        "key_analysis": key_analysis,
        "summary": {
            "overall_health": "good" if report.get("hit_rate_analysis", {}).get("current", 0) > 50 else "needs_attention",
            "key_metrics": {
                "hit_rate": report.get("hit_rate_analysis", {}).get("current", 0),
                "performance_gain": report.get("performance_analysis", {}).get("avg_improvement_percent", 0),
                "total_keys": key_analysis.get("total_cache_keys", 0),
                "alerts_count": report.get("alerts_summary", {}).get("total_alerts", 0)
            }
        }
    }

# Health check endpoint
async def cache_monitoring_health_check() -> Dict[str, Any]:
    """Health check for cache monitoring service"""
    return {
        "status": "healthy" if cache_monitoring_service.monitoring_enabled else "disabled",
        "redis_connected": cache_service.redis_manager.is_connected,
        "metrics_collected": len(cache_monitoring_service.metric_history),
        "active_alerts": len(cache_monitoring_service.alerts),
        "last_collection": cache_monitoring_service.metric_history[-1].timestamp.isoformat() if cache_monitoring_service.metric_history else None
    }