"""
Performance Monitoring Service
Real-time performance tracking, bottleneck detection, and optimization recommendations
with business context awareness and automated alerting
"""

import asyncio
import time
import statistics
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Callable
from dataclasses import dataclass, asdict, field
from collections import defaultdict, deque
from contextlib import asynccontextmanager
import logging
import psutil
import threading
from functools import wraps

from services.enhanced_sentry_monitoring import enhanced_sentry, AlertSeverity


logger = logging.getLogger(__name__)


@dataclass
class PerformanceMetric:
    """Individual performance metric"""
    name: str
    value: float
    unit: str
    timestamp: datetime
    context: Dict[str, Any] = field(default_factory=dict)
    tags: Dict[str, str] = field(default_factory=dict)


@dataclass
class PerformanceAlert:
    """Performance alert configuration"""
    metric_name: str
    threshold: float
    comparison: str  # 'gt', 'lt', 'eq'
    duration_seconds: int
    severity: AlertSeverity
    enabled: bool = True
    last_triggered: Optional[datetime] = None
    cooldown_minutes: int = 30


@dataclass
class EndpointPerformance:
    """Performance data for API endpoints"""
    endpoint: str
    method: str
    avg_response_time: float
    p95_response_time: float
    p99_response_time: float
    error_rate: float
    requests_per_minute: float
    slowest_requests: List[Dict[str, Any]]
    business_impact: str  # 'none', 'low', 'medium', 'high', 'critical'


@dataclass
class SystemPerformance:
    """Overall system performance metrics"""
    cpu_percent: float
    memory_percent: float
    disk_io_read_mb: float
    disk_io_write_mb: float
    network_in_mb: float
    network_out_mb: float
    active_connections: int
    error_rate: float
    avg_response_time: float


class PerformanceMonitoringService:
    """Comprehensive performance monitoring service"""
    
    def __init__(self, 
                 enable_real_time_monitoring: bool = True,
                 metrics_retention_hours: int = 24):
        self.logger = logging.getLogger(__name__)
        
        # Configuration
        self.enable_real_time_monitoring = enable_real_time_monitoring
        self.metrics_retention_hours = metrics_retention_hours
        
        # Metric storage (in-memory with size limits)
        self.metrics_buffer = defaultdict(lambda: deque(maxlen=10000))
        self.endpoint_metrics = defaultdict(lambda: deque(maxlen=1000))
        self.system_metrics = deque(maxlen=2880)  # 24 hours at 30s intervals
        
        # Performance tracking
        self.active_requests = {}
        self.request_stats = defaultdict(list)
        self.slow_query_log = deque(maxlen=100)
        
        # Alert management
        self.performance_alerts = self._create_default_alerts()
        self.alert_history = deque(maxlen=1000)
        
        # Background monitoring
        self._monitoring_task = None
        self._stop_monitoring = False
        
        # Lock for thread safety
        self._lock = threading.RLock()
        
        if enable_real_time_monitoring:
            self._start_background_monitoring()
    
    def _create_default_alerts(self) -> List[PerformanceAlert]:
        """Create default performance alerts"""
        return [
            PerformanceAlert(
                metric_name="api_response_time",
                threshold=2.0,  # 2 seconds
                comparison="gt",
                duration_seconds=300,  # 5 minutes
                severity=AlertSeverity.HIGH,
                cooldown_minutes=15
            ),
            PerformanceAlert(
                metric_name="error_rate",
                threshold=5.0,  # 5%
                comparison="gt",
                duration_seconds=180,  # 3 minutes
                severity=AlertSeverity.CRITICAL,
                cooldown_minutes=10
            ),
            PerformanceAlert(
                metric_name="cpu_percent",
                threshold=80.0,
                comparison="gt",
                duration_seconds=600,  # 10 minutes
                severity=AlertSeverity.MEDIUM,
                cooldown_minutes=20
            ),
            PerformanceAlert(
                metric_name="memory_percent",
                threshold=85.0,
                comparison="gt",
                duration_seconds=300,  # 5 minutes
                severity=AlertSeverity.HIGH,
                cooldown_minutes=15
            ),
            PerformanceAlert(
                metric_name="db_query_time",
                threshold=1.0,  # 1 second
                comparison="gt",
                duration_seconds=120,  # 2 minutes
                severity=AlertSeverity.HIGH,
                cooldown_minutes=10
            )
        ]
    
    def _start_background_monitoring(self):
        """Start background monitoring tasks"""
        if self._monitoring_task is None:
            self._monitoring_task = asyncio.create_task(self._background_monitor())
    
    async def _background_monitor(self):
        """Background monitoring loop"""
        while not self._stop_monitoring:
            try:
                # Collect system metrics
                await self._collect_system_metrics()
                
                # Check performance alerts
                await self._check_performance_alerts()
                
                # Clean up old metrics
                self._cleanup_old_metrics()
                
                # Sleep for 30 seconds
                await asyncio.sleep(30)
                
            except Exception as e:
                self.logger.error(f"Background monitoring error: {e}")
                await asyncio.sleep(60)  # Wait longer on error
    
    async def _collect_system_metrics(self):
        """Collect system performance metrics"""
        try:
            # CPU metrics
            cpu_percent = psutil.cpu_percent(interval=1)
            
            # Memory metrics
            memory = psutil.virtual_memory()
            
            # Disk I/O metrics
            disk_io = psutil.disk_io_counters()
            disk_io_read_mb = disk_io.read_bytes / (1024 * 1024) if disk_io else 0
            disk_io_write_mb = disk_io.write_bytes / (1024 * 1024) if disk_io else 0
            
            # Network metrics
            network = psutil.net_io_counters()
            network_in_mb = network.bytes_recv / (1024 * 1024) if network else 0
            network_out_mb = network.bytes_sent / (1024 * 1024) if network else 0
            
            # Active connections (approximation)
            connections = len(psutil.net_connections(kind='inet'))
            
            # Calculate application metrics
            error_rate = self._calculate_current_error_rate()
            avg_response_time = self._calculate_current_avg_response_time()
            
            # Create system performance record
            system_perf = SystemPerformance(
                cpu_percent=cpu_percent,
                memory_percent=memory.percent,
                disk_io_read_mb=disk_io_read_mb,
                disk_io_write_mb=disk_io_write_mb,
                network_in_mb=network_in_mb,
                network_out_mb=network_out_mb,
                active_connections=connections,
                error_rate=error_rate,
                avg_response_time=avg_response_time
            )
            
            with self._lock:
                self.system_metrics.append({
                    'timestamp': datetime.utcnow(),
                    'metrics': asdict(system_perf)
                })
            
            # Record individual metrics for alerting
            await self.record_metric("cpu_percent", cpu_percent, "percent")
            await self.record_metric("memory_percent", memory.percent, "percent")
            await self.record_metric("error_rate", error_rate, "percent")
            await self.record_metric("api_response_time", avg_response_time, "seconds")
            
        except Exception as e:
            self.logger.error(f"Error collecting system metrics: {e}")
    
    async def record_metric(self, 
                          name: str, 
                          value: float, 
                          unit: str,
                          context: Dict[str, Any] = None,
                          tags: Dict[str, str] = None):
        """Record a performance metric"""
        
        metric = PerformanceMetric(
            name=name,
            value=value,
            unit=unit,
            timestamp=datetime.utcnow(),
            context=context or {},
            tags=tags or {}
        )
        
        with self._lock:
            self.metrics_buffer[name].append(metric)
        
        # Check if this metric triggers any alerts
        await self._check_metric_alerts(metric)
    
    @asynccontextmanager
    async def track_operation(self, 
                            operation_name: str,
                            context: Dict[str, Any] = None,
                            business_impact: str = "low"):
        """Context manager to track operation performance"""
        
        start_time = time.time()
        operation_id = f"{operation_name}_{int(start_time * 1000)}"
        
        # Record operation start
        with self._lock:
            self.active_requests[operation_id] = {
                'name': operation_name,
                'start_time': start_time,
                'context': context or {},
                'business_impact': business_impact
            }
        
        try:
            yield operation_id
        except Exception as e:
            # Record error
            await self.record_metric(
                f"{operation_name}_error",
                1,
                "count",
                context={'error': str(e), 'operation_id': operation_id}
            )
            raise
        finally:
            # Calculate duration and record
            end_time = time.time()
            duration = end_time - start_time
            
            with self._lock:
                if operation_id in self.active_requests:
                    request_info = self.active_requests.pop(operation_id)
                    
                    # Store request stats
                    self.request_stats[operation_name].append({
                        'duration': duration,
                        'timestamp': datetime.utcnow(),
                        'context': request_info['context'],
                        'business_impact': request_info['business_impact']
                    })
                    
                    # Keep only recent stats
                    if len(self.request_stats[operation_name]) > 1000:
                        self.request_stats[operation_name] = self.request_stats[operation_name][-500:]
            
            # Record performance metric
            await self.record_metric(
                f"{operation_name}_duration",
                duration,
                "seconds",
                context=context,
                tags={'business_impact': business_impact}
            )
            
            # Check for slow operations
            if duration > self._get_slow_threshold(operation_name, business_impact):
                await self._record_slow_operation(operation_name, duration, context, business_impact)
    
    def _get_slow_threshold(self, operation_name: str, business_impact: str) -> float:
        """Get slow operation threshold based on operation and business impact"""
        
        base_thresholds = {
            'critical': 0.5,
            'high': 1.0,
            'medium': 2.0,
            'low': 5.0
        }
        
        # Special thresholds for specific operations
        operation_thresholds = {
            'payment_processing': 2.0,
            'booking_creation': 1.5,
            'user_authentication': 1.0,
            'database_query': 0.5,
            'api_request': 2.0
        }
        
        return operation_thresholds.get(
            operation_name, 
            base_thresholds.get(business_impact, 2.0)
        )
    
    async def _record_slow_operation(self, 
                                   operation_name: str, 
                                   duration: float, 
                                   context: Dict[str, Any],
                                   business_impact: str):
        """Record slow operation for analysis"""
        
        slow_op = {
            'operation': operation_name,
            'duration': duration,
            'timestamp': datetime.utcnow(),
            'context': context,
            'business_impact': business_impact
        }
        
        with self._lock:
            self.slow_query_log.append(slow_op)
        
        # Report to Sentry for critical or high impact operations
        if business_impact in ['critical', 'high']:
            await enhanced_sentry.capture_performance_issue(
                operation_name,
                duration,
                context,
                threshold=self._get_slow_threshold(operation_name, business_impact)
            )
    
    def track_api_request(self, func: Callable) -> Callable:
        """Decorator to track API request performance"""
        
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Extract endpoint info from function or kwargs
            endpoint = getattr(func, '__name__', 'unknown_endpoint')
            method = kwargs.get('method', 'GET')
            
            # Determine business impact based on endpoint
            business_impact = self._assess_endpoint_business_impact(endpoint)
            
            async with self.track_operation(
                f"api_{endpoint}",
                context={'method': method, 'endpoint': endpoint},
                business_impact=business_impact
            ) as operation_id:
                
                try:
                    result = await func(*args, **kwargs)
                    
                    # Record success
                    await self.record_metric(
                        f"api_{endpoint}_success",
                        1,
                        "count",
                        context={'method': method}
                    )
                    
                    return result
                    
                except Exception as e:
                    # Record error
                    await self.record_metric(
                        f"api_{endpoint}_error",
                        1,
                        "count",
                        context={'method': method, 'error': str(e)}
                    )
                    raise
        
        return wrapper
    
    async def track_database_query(self, 
                                 query: str, 
                                 duration: float,
                                 context: Dict[str, Any] = None):
        """Track database query performance"""
        
        await self.record_metric(
            "db_query_time",
            duration,
            "seconds",
            context={
                'query': query[:100],  # First 100 chars
                'full_context': context or {}
            }
        )
        
        # Check for slow queries
        if duration > 1.0:  # Queries slower than 1 second
            with self._lock:
                self.slow_query_log.append({
                    'type': 'database_query',
                    'query': query[:200],
                    'duration': duration,
                    'timestamp': datetime.utcnow(),
                    'context': context or {}
                })
    
    async def get_endpoint_performance(self, 
                                     time_window_minutes: int = 60) -> List[EndpointPerformance]:
        """Get performance statistics for API endpoints"""
        
        cutoff_time = datetime.utcnow() - timedelta(minutes=time_window_minutes)
        endpoint_stats = defaultdict(list)
        
        # Collect endpoint metrics from request stats
        with self._lock:
            for operation_name, stats in self.request_stats.items():
                if operation_name.startswith('api_'):
                    endpoint = operation_name[4:]  # Remove 'api_' prefix
                    
                    recent_stats = [
                        s for s in stats 
                        if s['timestamp'] > cutoff_time
                    ]
                    
                    if recent_stats:
                        endpoint_stats[endpoint] = recent_stats
        
        # Calculate performance metrics for each endpoint
        performance_data = []
        
        for endpoint, stats in endpoint_stats.items():
            if not stats:
                continue
            
            durations = [s['duration'] for s in stats]
            method = stats[0]['context'].get('method', 'GET')
            
            # Calculate error rate (would need error tracking)
            error_rate = 0.0  # Placeholder
            
            # Assess business impact
            business_impact = self._assess_endpoint_business_impact(endpoint)
            
            endpoint_perf = EndpointPerformance(
                endpoint=endpoint,
                method=method,
                avg_response_time=statistics.mean(durations),
                p95_response_time=self._percentile(durations, 95),
                p99_response_time=self._percentile(durations, 99),
                error_rate=error_rate,
                requests_per_minute=len(stats) / time_window_minutes,
                slowest_requests=sorted(
                    [{'duration': s['duration'], 'timestamp': s['timestamp'].isoformat()} 
                     for s in stats],
                    key=lambda x: x['duration'],
                    reverse=True
                )[:5],
                business_impact=business_impact
            )
            
            performance_data.append(endpoint_perf)
        
        return sorted(performance_data, key=lambda x: x.avg_response_time, reverse=True)
    
    async def get_system_performance_summary(self, 
                                           time_window_minutes: int = 60) -> Dict[str, Any]:
        """Get system performance summary"""
        
        cutoff_time = datetime.utcnow() - timedelta(minutes=time_window_minutes)
        
        # Get recent system metrics
        with self._lock:
            recent_metrics = [
                m for m in self.system_metrics
                if m['timestamp'] > cutoff_time
            ]
        
        if not recent_metrics:
            return {"error": "No recent metrics available"}
        
        # Calculate averages
        cpu_values = [m['metrics']['cpu_percent'] for m in recent_metrics]
        memory_values = [m['metrics']['memory_percent'] for m in recent_metrics]
        response_time_values = [m['metrics']['avg_response_time'] for m in recent_metrics]
        error_rate_values = [m['metrics']['error_rate'] for m in recent_metrics]
        
        return {
            "time_window_minutes": time_window_minutes,
            "data_points": len(recent_metrics),
            "cpu": {
                "avg_percent": statistics.mean(cpu_values) if cpu_values else 0,
                "max_percent": max(cpu_values) if cpu_values else 0,
                "current_percent": cpu_values[-1] if cpu_values else 0
            },
            "memory": {
                "avg_percent": statistics.mean(memory_values) if memory_values else 0,
                "max_percent": max(memory_values) if memory_values else 0,
                "current_percent": memory_values[-1] if memory_values else 0
            },
            "response_time": {
                "avg_seconds": statistics.mean(response_time_values) if response_time_values else 0,
                "max_seconds": max(response_time_values) if response_time_values else 0,
                "p95_seconds": self._percentile(response_time_values, 95) if response_time_values else 0
            },
            "error_rate": {
                "avg_percent": statistics.mean(error_rate_values) if error_rate_values else 0,
                "max_percent": max(error_rate_values) if error_rate_values else 0,
                "current_percent": error_rate_values[-1] if error_rate_values else 0
            },
            "slow_operations": len(self.slow_query_log),
            "active_requests": len(self.active_requests)
        }
    
    async def get_performance_recommendations(self) -> List[Dict[str, Any]]:
        """Get performance optimization recommendations"""
        
        recommendations = []
        
        # Analyze slow operations
        if len(self.slow_query_log) > 10:
            slow_ops = list(self.slow_query_log)
            
            # Group by operation type
            op_counts = defaultdict(int)
            for op in slow_ops:
                op_counts[op.get('operation', op.get('type', 'unknown'))] += 1
            
            for op_name, count in op_counts.items():
                if count >= 5:
                    recommendations.append({
                        "type": "slow_operation",
                        "priority": "high" if count >= 20 else "medium",
                        "title": f"Optimize {op_name} Performance",
                        "description": f"Operation {op_name} has been slow {count} times recently",
                        "suggested_actions": [
                            "Add database indexes if query-related",
                            "Implement caching for repeated operations",
                            "Consider query optimization",
                            "Review resource allocation"
                        ]
                    })
        
        # Analyze system metrics
        recent_summary = await self.get_system_performance_summary(60)
        
        if recent_summary.get('cpu', {}).get('avg_percent', 0) > 70:
            recommendations.append({
                "type": "high_cpu",
                "priority": "high",
                "title": "High CPU Usage Detected",
                "description": f"Average CPU usage is {recent_summary['cpu']['avg_percent']:.1f}%",
                "suggested_actions": [
                    "Scale horizontally by adding more instances",
                    "Optimize CPU-intensive operations",
                    "Consider using async operations where possible",
                    "Review background job scheduling"
                ]
            })
        
        if recent_summary.get('memory', {}).get('avg_percent', 0) > 75:
            recommendations.append({
                "type": "high_memory",
                "priority": "high",
                "title": "High Memory Usage Detected",
                "description": f"Average memory usage is {recent_summary['memory']['avg_percent']:.1f}%",
                "suggested_actions": [
                    "Implement memory caching with TTL",
                    "Review memory leaks in application code",
                    "Consider increasing available memory",
                    "Optimize data structures and algorithms"
                ]
            })
        
        return recommendations
    
    async def _check_performance_alerts(self):
        """Check if any performance alerts should be triggered"""
        
        current_time = datetime.utcnow()
        
        for alert in self.performance_alerts:
            if not alert.enabled:
                continue
            
            # Check cooldown
            if (alert.last_triggered and 
                current_time - alert.last_triggered < timedelta(minutes=alert.cooldown_minutes)):
                continue
            
            # Check if metric exceeds threshold for specified duration
            if await self._check_alert_condition(alert, current_time):
                await self._trigger_performance_alert(alert)
                alert.last_triggered = current_time
    
    async def _check_alert_condition(self, alert: PerformanceAlert, current_time: datetime) -> bool:
        """Check if alert condition is met"""
        
        # Get recent metrics for this alert
        lookback_time = current_time - timedelta(seconds=alert.duration_seconds)
        
        with self._lock:
            recent_metrics = [
                m for m in self.metrics_buffer.get(alert.metric_name, [])
                if m.timestamp > lookback_time
            ]
        
        if not recent_metrics:
            return False
        
        # Check if all recent values meet the condition
        values = [m.value for m in recent_metrics]
        
        if alert.comparison == 'gt':
            return all(v > alert.threshold for v in values)
        elif alert.comparison == 'lt':
            return all(v < alert.threshold for v in values)
        elif alert.comparison == 'eq':
            return all(abs(v - alert.threshold) < 0.01 for v in values)
        
        return False
    
    async def _trigger_performance_alert(self, alert: PerformanceAlert):
        """Trigger a performance alert"""
        
        self.logger.warning(f"Performance alert triggered: {alert.metric_name}")
        
        # Record alert
        alert_record = {
            'alert_name': alert.metric_name,
            'threshold': alert.threshold,
            'severity': alert.severity.value,
            'timestamp': datetime.utcnow(),
            'comparison': alert.comparison
        }
        
        with self._lock:
            self.alert_history.append(alert_record)
        
        # Send to monitoring system
        await enhanced_sentry.capture_business_event(
            "performance_alert",
            f"Performance alert: {alert.metric_name} {alert.comparison} {alert.threshold}",
            {
                'metric_name': alert.metric_name,
                'threshold': alert.threshold,
                'severity': alert.severity.value,
                'comparison': alert.comparison
            }
        )
    
    def _assess_endpoint_business_impact(self, endpoint: str) -> str:
        """Assess business impact of an endpoint"""
        
        high_impact_endpoints = [
            'payment', 'booking', 'appointment', 'checkout', 'purchase'
        ]
        
        medium_impact_endpoints = [
            'auth', 'login', 'register', 'profile', 'calendar'
        ]
        
        endpoint_lower = endpoint.lower()
        
        if any(keyword in endpoint_lower for keyword in high_impact_endpoints):
            return 'critical'
        elif any(keyword in endpoint_lower for keyword in medium_impact_endpoints):
            return 'high'
        elif 'admin' in endpoint_lower or 'analytics' in endpoint_lower:
            return 'medium'
        else:
            return 'low'
    
    def _calculate_current_error_rate(self) -> float:
        """Calculate current error rate percentage"""
        # This would need integration with actual error tracking
        # For now, return a placeholder
        return 0.0
    
    def _calculate_current_avg_response_time(self) -> float:
        """Calculate current average response time"""
        with self._lock:
            if not self.request_stats:
                return 0.0
            
            recent_durations = []
            cutoff_time = datetime.utcnow() - timedelta(minutes=5)
            
            for stats in self.request_stats.values():
                recent_durations.extend([
                    s['duration'] for s in stats
                    if s['timestamp'] > cutoff_time
                ])
            
            return statistics.mean(recent_durations) if recent_durations else 0.0
    
    def _percentile(self, values: List[float], percentile: int) -> float:
        """Calculate percentile of values"""
        if not values:
            return 0.0
        
        sorted_values = sorted(values)
        index = int(len(sorted_values) * percentile / 100)
        return sorted_values[min(index, len(sorted_values) - 1)]
    
    def _cleanup_old_metrics(self):
        """Clean up metrics older than retention period"""
        cutoff_time = datetime.utcnow() - timedelta(hours=self.metrics_retention_hours)
        
        with self._lock:
            # Clean up metric buffers
            for metric_name, metrics in self.metrics_buffer.items():
                while metrics and metrics[0].timestamp < cutoff_time:
                    metrics.popleft()
            
            # Clean up request stats
            for operation_name, stats in self.request_stats.items():
                self.request_stats[operation_name] = [
                    s for s in stats if s['timestamp'] > cutoff_time
                ]
    
    async def stop_monitoring(self):
        """Stop background monitoring"""
        self._stop_monitoring = True
        if self._monitoring_task:
            self._monitoring_task.cancel()
            try:
                await self._monitoring_task
            except asyncio.CancelledError:
                pass


# Global performance monitoring instance
performance_monitor = PerformanceMonitoringService()