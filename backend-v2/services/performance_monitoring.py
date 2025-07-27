"""
Enterprise-Grade Application Performance Monitoring (APM) System
Provides comprehensive performance tracking, real-time monitoring, and intelligent alerting.
"""

import time
import asyncio
import logging
import psutil
import threading
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Callable
from dataclasses import dataclass, asdict
from enum import Enum
from collections import defaultdict, deque
import json
import redis
from sqlalchemy import text
from sqlalchemy.orm import Session

from db import get_db
from services.redis_cache import cache_service

logger = logging.getLogger(__name__)

class PerformanceLevel(Enum):
    EXCELLENT = "excellent"  # 90-100 score
    GOOD = "good"           # 70-89 score  
    DEGRADED = "degraded"   # 50-69 score
    CRITICAL = "critical"   # 0-49 score

@dataclass
class PerformanceMetric:
    """Individual performance metric data point"""
    timestamp: datetime
    metric_name: str
    value: float
    unit: str
    tags: Dict[str, str] = None
    threshold_warning: Optional[float] = None
    threshold_critical: Optional[float] = None

@dataclass
class APIPerformanceSnapshot:
    """Snapshot of API performance metrics"""
    endpoint: str
    method: str
    response_time_ms: float
    status_code: int
    user_id: Optional[int] = None
    timestamp: datetime = None
    
    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.now()

@dataclass
class SystemHealthSnapshot:
    """Comprehensive system health snapshot"""
    timestamp: datetime
    cpu_percent: float
    memory_percent: float
    disk_percent: float
    active_connections: int
    database_response_time_ms: float
    cache_hit_rate: float
    error_rate: float
    performance_score: int
    status: PerformanceLevel

class PerformanceTracker:
    """Real-time performance tracking with intelligent alerting"""
    
    def __init__(self):
        self.metrics_buffer = deque(maxlen=10000)  # Store last 10k metrics
        self.api_metrics = defaultdict(list)  # Store API performance by endpoint
        self.system_metrics = deque(maxlen=1000)  # Store last 1k system snapshots
        self.alert_thresholds = self._initialize_thresholds()
        self.performance_history = deque(maxlen=24*60)  # 24 hours of minute-by-minute data
        self.alerting_enabled = True
        self.monitoring_active = False
        self._lock = threading.Lock()
        
    def _initialize_thresholds(self) -> Dict[str, Dict[str, float]]:
        """Initialize performance thresholds for alerting"""
        return {
            "api_response_time": {
                "warning": 500.0,   # 500ms
                "critical": 2000.0  # 2 seconds
            },
            "cpu_usage": {
                "warning": 70.0,    # 70%
                "critical": 90.0    # 90%
            },
            "memory_usage": {
                "warning": 80.0,    # 80%
                "critical": 95.0    # 95%
            },
            "disk_usage": {
                "warning": 85.0,    # 85%
                "critical": 95.0    # 95%
            },
            "error_rate": {
                "warning": 5.0,     # 5%
                "critical": 15.0    # 15%
            },
            "database_response_time": {
                "warning": 100.0,   # 100ms
                "critical": 500.0   # 500ms
            }
        }
    
    async def track_api_performance(self, snapshot: APIPerformanceSnapshot):
        """Track API endpoint performance"""
        with self._lock:
            endpoint_key = f"{snapshot.method}:{snapshot.endpoint}"
            self.api_metrics[endpoint_key].append(snapshot)
            
            # Keep only last 1000 entries per endpoint
            if len(self.api_metrics[endpoint_key]) > 1000:
                self.api_metrics[endpoint_key] = self.api_metrics[endpoint_key][-1000:]
        
        # Check for performance degradation
        await self._check_api_performance_alerts(snapshot)
        
        # Store in cache for real-time dashboard
        await self._cache_api_metric(snapshot)
    
    async def track_system_health(self) -> SystemHealthSnapshot:
        """Capture and track comprehensive system health"""
        try:
            # System metrics
            cpu_percent = psutil.cpu_percent(interval=0.1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            
            # Database performance
            db_response_time = await self._measure_database_performance()
            
            # Cache performance
            cache_hit_rate = await self._get_cache_hit_rate()
            
            # Error rate calculation
            error_rate = await self._calculate_recent_error_rate()
            
            # Network connections
            try:
                active_connections = len(psutil.net_connections())
            except (psutil.AccessDenied, psutil.NoSuchProcess):
                active_connections = 0
            
            # Calculate performance score
            performance_score = self._calculate_performance_score(
                cpu_percent, memory.percent, disk.percent, 
                db_response_time, error_rate
            )
            
            # Determine status level
            if performance_score >= 90:
                status = PerformanceLevel.EXCELLENT
            elif performance_score >= 70:
                status = PerformanceLevel.GOOD
            elif performance_score >= 50:
                status = PerformanceLevel.DEGRADED
            else:
                status = PerformanceLevel.CRITICAL
            
            snapshot = SystemHealthSnapshot(
                timestamp=datetime.now(),
                cpu_percent=cpu_percent,
                memory_percent=memory.percent,
                disk_percent=disk.percent / disk.total * 100,
                active_connections=active_connections,
                database_response_time_ms=db_response_time,
                cache_hit_rate=cache_hit_rate,
                error_rate=error_rate,
                performance_score=performance_score,
                status=status
            )
            
            with self._lock:
                self.system_metrics.append(snapshot)
            
            # Store in cache for dashboard
            await self._cache_system_health(snapshot)
            
            # Check for alerts
            await self._check_system_health_alerts(snapshot)
            
            return snapshot
            
        except Exception as e:
            logger.error(f"Error tracking system health: {e}")
            # Return minimal snapshot on error
            return SystemHealthSnapshot(
                timestamp=datetime.now(),
                cpu_percent=0.0,
                memory_percent=0.0,
                disk_percent=0.0,
                active_connections=0,
                database_response_time_ms=0.0,
                cache_hit_rate=0.0,
                error_rate=100.0,
                performance_score=0,
                status=PerformanceLevel.CRITICAL
            )
    
    async def _measure_database_performance(self) -> float:
        """Measure database response time"""
        try:
            start_time = time.time()
            
            # Use dependency injection to get database session
            db_gen = get_db()
            db = next(db_gen)
            
            try:
                # Simple query to measure response time
                db.execute(text("SELECT 1"))
                return (time.time() - start_time) * 1000  # Convert to ms
            finally:
                db.close()
                
        except Exception as e:
            logger.warning(f"Database performance measurement failed: {e}")
            return 999.0  # Return high value to indicate issue
    
    async def _get_cache_hit_rate(self) -> float:
        """Calculate cache hit rate over recent period"""
        try:
            # Get cache statistics from Redis
            cache_stats = await cache_service.get("cache_stats")
            if cache_stats:
                hits = cache_stats.get("hits", 0)
                misses = cache_stats.get("misses", 0)
                total = hits + misses
                return (hits / total * 100) if total > 0 else 0.0
            return 0.0
        except Exception:
            return 0.0
    
    async def _calculate_recent_error_rate(self) -> float:
        """Calculate error rate from recent API calls"""
        try:
            # Get recent API metrics (last 5 minutes)
            recent_time = datetime.now() - timedelta(minutes=5)
            total_requests = 0
            error_requests = 0
            
            with self._lock:
                for endpoint_metrics in self.api_metrics.values():
                    for metric in endpoint_metrics:
                        if metric.timestamp >= recent_time:
                            total_requests += 1
                            if metric.status_code >= 400:
                                error_requests += 1
            
            return (error_requests / total_requests * 100) if total_requests > 0 else 0.0
            
        except Exception:
            return 0.0
    
    def _calculate_performance_score(
        self, 
        cpu_percent: float, 
        memory_percent: float, 
        disk_percent: float,
        db_response_time: float,
        error_rate: float
    ) -> int:
        """Calculate overall performance score (0-100)"""
        
        score = 100
        
        # CPU penalty
        if cpu_percent > 90:
            score -= 30
        elif cpu_percent > 70:
            score -= 15
        elif cpu_percent > 50:
            score -= 5
        
        # Memory penalty
        if memory_percent > 95:
            score -= 25
        elif memory_percent > 80:
            score -= 12
        elif memory_percent > 65:
            score -= 5
        
        # Disk penalty
        if disk_percent > 95:
            score -= 20
        elif disk_percent > 85:
            score -= 10
        elif disk_percent > 75:
            score -= 3
        
        # Database performance penalty
        if db_response_time > 500:
            score -= 20
        elif db_response_time > 200:
            score -= 10
        elif db_response_time > 100:
            score -= 5
        
        # Error rate penalty
        if error_rate > 15:
            score -= 25
        elif error_rate > 5:
            score -= 10
        elif error_rate > 1:
            score -= 3
        
        return max(0, score)
    
    async def _check_api_performance_alerts(self, snapshot: APIPerformanceSnapshot):
        """Check API performance against thresholds and trigger alerts"""
        if not self.alerting_enabled:
            return
        
        response_time = snapshot.response_time_ms
        thresholds = self.alert_thresholds["api_response_time"]
        
        if response_time > thresholds["critical"]:
            await self._send_alert(
                "CRITICAL",
                f"API endpoint {snapshot.endpoint} response time critical: {response_time:.1f}ms",
                {
                    "endpoint": snapshot.endpoint,
                    "response_time_ms": response_time,
                    "threshold": thresholds["critical"],
                    "status_code": snapshot.status_code
                }
            )
        elif response_time > thresholds["warning"]:
            await self._send_alert(
                "WARNING",
                f"API endpoint {snapshot.endpoint} response time elevated: {response_time:.1f}ms",
                {
                    "endpoint": snapshot.endpoint,
                    "response_time_ms": response_time,
                    "threshold": thresholds["warning"],
                    "status_code": snapshot.status_code
                }
            )
    
    async def _check_system_health_alerts(self, snapshot: SystemHealthSnapshot):
        """Check system health metrics against thresholds"""
        if not self.alerting_enabled:
            return
        
        alerts = []
        
        # CPU alerts
        if snapshot.cpu_percent > self.alert_thresholds["cpu_usage"]["critical"]:
            alerts.append(("CRITICAL", f"CPU usage critical: {snapshot.cpu_percent:.1f}%"))
        elif snapshot.cpu_percent > self.alert_thresholds["cpu_usage"]["warning"]:
            alerts.append(("WARNING", f"CPU usage elevated: {snapshot.cpu_percent:.1f}%"))
        
        # Memory alerts
        if snapshot.memory_percent > self.alert_thresholds["memory_usage"]["critical"]:
            alerts.append(("CRITICAL", f"Memory usage critical: {snapshot.memory_percent:.1f}%"))
        elif snapshot.memory_percent > self.alert_thresholds["memory_usage"]["warning"]:
            alerts.append(("WARNING", f"Memory usage elevated: {snapshot.memory_percent:.1f}%"))
        
        # Database alerts
        if snapshot.database_response_time_ms > self.alert_thresholds["database_response_time"]["critical"]:
            alerts.append(("CRITICAL", f"Database response time critical: {snapshot.database_response_time_ms:.1f}ms"))
        elif snapshot.database_response_time_ms > self.alert_thresholds["database_response_time"]["warning"]:
            alerts.append(("WARNING", f"Database response time elevated: {snapshot.database_response_time_ms:.1f}ms"))
        
        # Send all alerts
        for severity, message in alerts:
            await self._send_alert(severity, message, asdict(snapshot))
    
    async def _send_alert(self, severity: str, message: str, context: Dict):
        """Send performance alert (implement your alerting mechanism)"""
        alert_data = {
            "timestamp": datetime.now().isoformat(),
            "severity": severity,
            "message": message,
            "context": context,
            "source": "performance_monitor"
        }
        
        # Log the alert
        logger.warning(f"PERFORMANCE ALERT [{severity}]: {message}")
        
        # Store alert in cache for dashboard
        await cache_service.set(
            f"performance_alert:{datetime.now().timestamp()}",
            alert_data,
            ttl=3600  # Keep alerts for 1 hour
        )
        
        # TODO: Integrate with your alerting system (email, Slack, PagerDuty, etc.)
    
    async def _cache_api_metric(self, snapshot: APIPerformanceSnapshot):
        """Cache API metric for real-time dashboard"""
        await cache_service.set(
            f"api_metric:{snapshot.endpoint}:{snapshot.timestamp.timestamp()}",
            asdict(snapshot),
            ttl=300  # Keep for 5 minutes
        )
    
    async def _cache_system_health(self, snapshot: SystemHealthSnapshot):
        """Cache system health for dashboard"""
        await cache_service.set(
            "current_system_health",
            asdict(snapshot),
            ttl=60  # Keep current health for 1 minute
        )
    
    async def get_performance_summary(self) -> Dict[str, Any]:
        """Get comprehensive performance summary"""
        current_health = await self.track_system_health()
        
        # Calculate API performance statistics
        api_stats = self._calculate_api_statistics()
        
        # Get recent performance trend
        trend = self._calculate_performance_trend()
        
        return {
            "timestamp": datetime.now().isoformat(),
            "current_health": asdict(current_health),
            "api_performance": api_stats,
            "performance_trend": trend,
            "thresholds": self.alert_thresholds,
            "monitoring_status": "active" if self.monitoring_active else "inactive"
        }
    
    def _calculate_api_statistics(self) -> Dict[str, Any]:
        """Calculate API performance statistics"""
        recent_time = datetime.now() - timedelta(minutes=15)
        
        endpoint_stats = {}
        total_requests = 0
        total_response_time = 0
        error_count = 0
        
        with self._lock:
            for endpoint, metrics in self.api_metrics.items():
                recent_metrics = [m for m in metrics if m.timestamp >= recent_time]
                
                if recent_metrics:
                    response_times = [m.response_time_ms for m in recent_metrics]
                    errors = [m for m in recent_metrics if m.status_code >= 400]
                    
                    endpoint_stats[endpoint] = {
                        "requests": len(recent_metrics),
                        "avg_response_time": sum(response_times) / len(response_times),
                        "max_response_time": max(response_times),
                        "error_rate": len(errors) / len(recent_metrics) * 100,
                        "p95_response_time": sorted(response_times)[int(len(response_times) * 0.95)] if len(response_times) > 20 else max(response_times)
                    }
                    
                    total_requests += len(recent_metrics)
                    total_response_time += sum(response_times)
                    error_count += len(errors)
        
        return {
            "endpoints": endpoint_stats,
            "overall": {
                "total_requests": total_requests,
                "avg_response_time": total_response_time / total_requests if total_requests > 0 else 0,
                "error_rate": error_count / total_requests * 100 if total_requests > 0 else 0
            }
        }
    
    def _calculate_performance_trend(self) -> str:
        """Calculate performance trend over recent period"""
        if len(self.system_metrics) < 10:
            return "insufficient_data"
        
        recent_scores = [m.performance_score for m in list(self.system_metrics)[-10:]]
        older_scores = [m.performance_score for m in list(self.system_metrics)[-20:-10]] if len(self.system_metrics) >= 20 else []
        
        if not older_scores:
            return "stable"
        
        recent_avg = sum(recent_scores) / len(recent_scores)
        older_avg = sum(older_scores) / len(older_scores)
        
        diff = recent_avg - older_avg
        
        if diff > 5:
            return "improving"
        elif diff < -5:
            return "degrading"
        else:
            return "stable"
    
    def start_monitoring(self):
        """Start continuous performance monitoring"""
        self.monitoring_active = True
        
        async def monitoring_loop():
            while self.monitoring_active:
                try:
                    await self.track_system_health()
                    await asyncio.sleep(60)  # Monitor every minute
                except Exception as e:
                    logger.error(f"Monitoring loop error: {e}")
                    await asyncio.sleep(10)  # Short retry delay
        
        # Start monitoring in background
        asyncio.create_task(monitoring_loop())
        logger.info("Performance monitoring started")
    
    def stop_monitoring(self):
        """Stop continuous performance monitoring"""
        self.monitoring_active = False
        logger.info("Performance monitoring stopped")

# Global performance tracker instance
performance_tracker = PerformanceTracker()

# Performance monitoring decorators
def monitor_api_performance(func: Callable) -> Callable:
    """Decorator to automatically monitor API endpoint performance"""
    async def wrapper(*args, **kwargs):
        start_time = time.time()
        
        try:
            # Extract request information if available
            request = None
            for arg in args:
                if hasattr(arg, 'method') and hasattr(arg, 'url'):
                    request = arg
                    break
            
            result = await func(*args, **kwargs)
            
            # Track successful request
            if request:
                response_time_ms = (time.time() - start_time) * 1000
                snapshot = APIPerformanceSnapshot(
                    endpoint=str(request.url.path),
                    method=request.method,
                    response_time_ms=response_time_ms,
                    status_code=getattr(result, 'status_code', 200)
                )
                await performance_tracker.track_api_performance(snapshot)
            
            return result
            
        except Exception as e:
            # Track failed request
            if request:
                response_time_ms = (time.time() - start_time) * 1000
                snapshot = APIPerformanceSnapshot(
                    endpoint=str(request.url.path),
                    method=request.method,
                    response_time_ms=response_time_ms,
                    status_code=500
                )
                await performance_tracker.track_api_performance(snapshot)
            
            raise
    
    return wrapper

def monitor_function_performance(metric_name: str):
    """Decorator to monitor arbitrary function performance"""
    def decorator(func: Callable) -> Callable:
        async def wrapper(*args, **kwargs):
            start_time = time.time()
            
            try:
                result = await func(*args, **kwargs) if asyncio.iscoroutinefunction(func) else func(*args, **kwargs)
                execution_time_ms = (time.time() - start_time) * 1000
                
                # Create metric
                metric = PerformanceMetric(
                    timestamp=datetime.now(),
                    metric_name=metric_name,
                    value=execution_time_ms,
                    unit="ms",
                    tags={"function": func.__name__, "status": "success"}
                )
                
                performance_tracker.metrics_buffer.append(metric)
                return result
                
            except Exception as e:
                execution_time_ms = (time.time() - start_time) * 1000
                
                # Create error metric
                metric = PerformanceMetric(
                    timestamp=datetime.now(),
                    metric_name=metric_name,
                    value=execution_time_ms,
                    unit="ms",
                    tags={"function": func.__name__, "status": "error", "error": str(e)}
                )
                
                performance_tracker.metrics_buffer.append(metric)
                raise
        
        return wrapper
    return decorator