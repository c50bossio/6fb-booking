"""
Comprehensive Monitoring and Health Check Service for 6FB Booking System
Performance metrics, error tracking, health checks, and alerting
"""

import asyncio
import logging
import time
import psutil
import platform
from typing import Dict, List, Any, Optional, Callable
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from collections import defaultdict, deque
import json
from enum import Enum
from sqlalchemy.orm import Session
from sqlalchemy import text
import redis.asyncio as redis

logger = logging.getLogger(__name__)


class HealthStatus(Enum):
    """Health check status levels"""

    HEALTHY = "healthy"
    WARNING = "warning"
    CRITICAL = "critical"
    DOWN = "down"


class AlertLevel(Enum):
    """Alert severity levels"""

    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


@dataclass
class HealthCheck:
    """Health check result"""

    name: str
    status: HealthStatus
    message: str
    details: Dict[str, Any] = None
    timestamp: datetime = None
    response_time_ms: float = 0

    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.utcnow()
        if self.details is None:
            self.details = {}


@dataclass
class Metric:
    """Performance metric"""

    name: str
    value: float
    unit: str = ""
    tags: Dict[str, str] = None
    timestamp: datetime = None

    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.utcnow()
        if self.tags is None:
            self.tags = {}


@dataclass
class Alert:
    """System alert"""

    id: str
    level: AlertLevel
    title: str
    message: str
    component: str
    tags: Dict[str, str] = None
    timestamp: datetime = None
    resolved: bool = False
    resolved_at: Optional[datetime] = None

    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.utcnow()
        if self.tags is None:
            self.tags = {}


class SystemMetricsCollector:
    """Collect system performance metrics"""

    def __init__(self):
        self.process = psutil.Process()
        self.start_time = time.time()

    def collect_system_metrics(self) -> List[Metric]:
        """Collect system-level metrics"""
        metrics = []

        try:
            # CPU metrics
            cpu_percent = psutil.cpu_percent(interval=1)
            metrics.append(Metric("system.cpu.usage", cpu_percent, "percent"))

            cpu_count = psutil.cpu_count()
            metrics.append(Metric("system.cpu.count", cpu_count, "cores"))

            # Memory metrics
            memory = psutil.virtual_memory()
            metrics.append(Metric("system.memory.usage", memory.percent, "percent"))
            metrics.append(Metric("system.memory.available", memory.available, "bytes"))
            metrics.append(Metric("system.memory.total", memory.total, "bytes"))
            metrics.append(Metric("system.memory.used", memory.used, "bytes"))

            # Disk metrics
            disk = psutil.disk_usage("/")
            metrics.append(Metric("system.disk.usage", disk.percent, "percent"))
            metrics.append(Metric("system.disk.free", disk.free, "bytes"))
            metrics.append(Metric("system.disk.total", disk.total, "bytes"))

            # Network metrics
            network = psutil.net_io_counters()
            metrics.append(
                Metric("system.network.bytes_sent", network.bytes_sent, "bytes")
            )
            metrics.append(
                Metric("system.network.bytes_recv", network.bytes_recv, "bytes")
            )
            metrics.append(
                Metric("system.network.packets_sent", network.packets_sent, "packets")
            )
            metrics.append(
                Metric("system.network.packets_recv", network.packets_recv, "packets")
            )

        except Exception as e:
            logger.error(f"Error collecting system metrics: {str(e)}")

        return metrics

    def collect_process_metrics(self) -> List[Metric]:
        """Collect process-specific metrics"""
        metrics = []

        try:
            # Process CPU and memory
            cpu_percent = self.process.cpu_percent()
            memory_info = self.process.memory_info()
            memory_percent = self.process.memory_percent()

            metrics.append(Metric("process.cpu.usage", cpu_percent, "percent"))
            metrics.append(Metric("process.memory.rss", memory_info.rss, "bytes"))
            metrics.append(Metric("process.memory.vms", memory_info.vms, "bytes"))
            metrics.append(Metric("process.memory.percent", memory_percent, "percent"))

            # Process info
            num_threads = self.process.num_threads()
            num_fds = self.process.num_fds() if hasattr(self.process, "num_fds") else 0

            metrics.append(Metric("process.threads.count", num_threads, "threads"))
            metrics.append(
                Metric("process.file_descriptors.count", num_fds, "descriptors")
            )

            # Uptime
            uptime = time.time() - self.start_time
            metrics.append(Metric("process.uptime", uptime, "seconds"))

        except Exception as e:
            logger.error(f"Error collecting process metrics: {str(e)}")

        return metrics


class DatabaseHealthChecker:
    """Database health checks and metrics"""

    def __init__(self, db_session_factory):
        self.db_session_factory = db_session_factory

    async def check_database_connection(self) -> HealthCheck:
        """Check database connectivity"""
        start_time = time.time()

        try:
            with self.db_session_factory() as db:
                # Simple connectivity test
                result = db.execute(text("SELECT 1"))
                result.fetchone()

                response_time = (time.time() - start_time) * 1000

                return HealthCheck(
                    name="database_connection",
                    status=HealthStatus.HEALTHY,
                    message="Database connection successful",
                    response_time_ms=response_time,
                )

        except Exception as e:
            response_time = (time.time() - start_time) * 1000
            return HealthCheck(
                name="database_connection",
                status=HealthStatus.CRITICAL,
                message=f"Database connection failed: {str(e)}",
                response_time_ms=response_time,
            )

    async def check_database_performance(self) -> HealthCheck:
        """Check database performance metrics"""
        start_time = time.time()

        try:
            with self.db_session_factory() as db:
                # Check for long-running queries (PostgreSQL)
                try:
                    result = db.execute(
                        text(
                            """
                        SELECT count(*) as long_queries
                        FROM pg_stat_activity
                        WHERE state = 'active'
                        AND now() - query_start > interval '30 seconds'
                    """
                        )
                    )
                    long_queries = result.scalar()

                    if long_queries > 5:
                        status = HealthStatus.WARNING
                        message = f"{long_queries} long-running queries detected"
                    else:
                        status = HealthStatus.HEALTHY
                        message = "Database performance normal"

                except Exception:
                    # Fallback for non-PostgreSQL databases
                    status = HealthStatus.HEALTHY
                    message = "Database performance check not available"
                    long_queries = 0

                response_time = (time.time() - start_time) * 1000

                return HealthCheck(
                    name="database_performance",
                    status=status,
                    message=message,
                    details={"long_queries": long_queries},
                    response_time_ms=response_time,
                )

        except Exception as e:
            response_time = (time.time() - start_time) * 1000
            return HealthCheck(
                name="database_performance",
                status=HealthStatus.CRITICAL,
                message=f"Database performance check failed: {str(e)}",
                response_time_ms=response_time,
            )

    def collect_database_metrics(self) -> List[Metric]:
        """Collect database metrics"""
        metrics = []

        try:
            with self.db_session_factory() as db:
                # Connection count
                try:
                    result = db.execute(text("SELECT count(*) FROM pg_stat_activity"))
                    connection_count = result.scalar()
                    metrics.append(
                        Metric(
                            "database.connections.active",
                            connection_count,
                            "connections",
                        )
                    )
                except Exception:
                    pass  # Not PostgreSQL or query failed

                # Table sizes (example for appointments table)
                try:
                    result = db.execute(text("SELECT count(*) FROM appointments"))
                    appointment_count = result.scalar()
                    metrics.append(
                        Metric(
                            "database.appointments.count", appointment_count, "records"
                        )
                    )
                except Exception:
                    pass

                try:
                    result = db.execute(text("SELECT count(*) FROM users"))
                    user_count = result.scalar()
                    metrics.append(
                        Metric("database.users.count", user_count, "records")
                    )
                except Exception:
                    pass

        except Exception as e:
            logger.error(f"Error collecting database metrics: {str(e)}")

        return metrics


class RedisHealthChecker:
    """Redis health checks and metrics"""

    def __init__(self, redis_client=None):
        self.redis_client = redis_client

    async def check_redis_connection(self) -> HealthCheck:
        """Check Redis connectivity"""
        if not self.redis_client:
            return HealthCheck(
                name="redis_connection",
                status=HealthStatus.WARNING,
                message="Redis client not configured",
            )

        start_time = time.time()

        try:
            await self.redis_client.ping()
            response_time = (time.time() - start_time) * 1000

            return HealthCheck(
                name="redis_connection",
                status=HealthStatus.HEALTHY,
                message="Redis connection successful",
                response_time_ms=response_time,
            )

        except Exception as e:
            response_time = (time.time() - start_time) * 1000
            return HealthCheck(
                name="redis_connection",
                status=HealthStatus.CRITICAL,
                message=f"Redis connection failed: {str(e)}",
                response_time_ms=response_time,
            )

    async def collect_redis_metrics(self) -> List[Metric]:
        """Collect Redis metrics"""
        metrics = []

        if not self.redis_client:
            return metrics

        try:
            info = await self.redis_client.info()

            # Memory metrics
            if "used_memory" in info:
                metrics.append(
                    Metric("redis.memory.used", info["used_memory"], "bytes")
                )
            if "used_memory_peak" in info:
                metrics.append(
                    Metric("redis.memory.peak", info["used_memory_peak"], "bytes")
                )

            # Connection metrics
            if "connected_clients" in info:
                metrics.append(
                    Metric(
                        "redis.clients.connected", info["connected_clients"], "clients"
                    )
                )

            # Key count
            dbsize = await self.redis_client.dbsize()
            metrics.append(Metric("redis.keys.count", dbsize, "keys"))

            # Hit rate
            if "keyspace_hits" in info and "keyspace_misses" in info:
                hits = info["keyspace_hits"]
                misses = info["keyspace_misses"]
                total = hits + misses
                hit_rate = (hits / total * 100) if total > 0 else 0
                metrics.append(Metric("redis.hit_rate", hit_rate, "percent"))

        except Exception as e:
            logger.error(f"Error collecting Redis metrics: {str(e)}")

        return metrics


class ApplicationHealthChecker:
    """Application-specific health checks"""

    def __init__(self):
        self.start_time = time.time()
        self.request_count = 0
        self.error_count = 0
        self.response_times = deque(maxlen=1000)  # Keep last 1000 response times

    def record_request(self, response_time: float, is_error: bool = False):
        """Record request metrics"""
        self.request_count += 1
        if is_error:
            self.error_count += 1
        self.response_times.append(response_time)

    async def check_application_health(self) -> HealthCheck:
        """Check overall application health"""
        uptime = time.time() - self.start_time
        error_rate = (self.error_count / max(1, self.request_count)) * 100

        # Calculate average response time
        avg_response_time = (
            sum(self.response_times) / len(self.response_times)
            if self.response_times
            else 0
        )

        # Determine status
        if error_rate > 10:
            status = HealthStatus.CRITICAL
            message = f"High error rate: {error_rate:.1f}%"
        elif error_rate > 5:
            status = HealthStatus.WARNING
            message = f"Elevated error rate: {error_rate:.1f}%"
        elif avg_response_time > 5000:  # 5 seconds
            status = HealthStatus.WARNING
            message = f"Slow response times: {avg_response_time:.0f}ms"
        else:
            status = HealthStatus.HEALTHY
            message = "Application healthy"

        return HealthCheck(
            name="application_health",
            status=status,
            message=message,
            details={
                "uptime_seconds": uptime,
                "total_requests": self.request_count,
                "error_count": self.error_count,
                "error_rate_percent": error_rate,
                "avg_response_time_ms": avg_response_time,
            },
        )

    def collect_application_metrics(self) -> List[Metric]:
        """Collect application metrics"""
        metrics = []

        # Request metrics
        metrics.append(Metric("app.requests.total", self.request_count, "requests"))
        metrics.append(Metric("app.requests.errors", self.error_count, "requests"))

        # Error rate
        error_rate = (self.error_count / max(1, self.request_count)) * 100
        metrics.append(Metric("app.error_rate", error_rate, "percent"))

        # Response time metrics
        if self.response_times:
            avg_response_time = sum(self.response_times) / len(self.response_times)
            metrics.append(Metric("app.response_time.avg", avg_response_time, "ms"))

            # 95th percentile
            sorted_times = sorted(self.response_times)
            p95_index = int(len(sorted_times) * 0.95)
            p95_response_time = (
                sorted_times[p95_index]
                if p95_index < len(sorted_times)
                else avg_response_time
            )
            metrics.append(Metric("app.response_time.p95", p95_response_time, "ms"))

        # Uptime
        uptime = time.time() - self.start_time
        metrics.append(Metric("app.uptime", uptime, "seconds"))

        return metrics


class AlertManager:
    """Manage system alerts and notifications"""

    def __init__(self):
        self.alerts: Dict[str, Alert] = {}
        self.alert_rules: List[Dict[str, Any]] = []
        self.notification_handlers: List[Callable] = []

    def add_alert_rule(
        self,
        name: str,
        condition: Callable[[List[Metric]], bool],
        level: AlertLevel,
        message: str,
    ):
        """Add alert rule"""
        self.alert_rules.append(
            {"name": name, "condition": condition, "level": level, "message": message}
        )

    def add_notification_handler(self, handler: Callable):
        """Add notification handler"""
        self.notification_handlers.append(handler)

    async def check_alerts(
        self, metrics: List[Metric], health_checks: List[HealthCheck]
    ):
        """Check alert conditions"""
        # Check metric-based alerts
        for rule in self.alert_rules:
            try:
                if rule["condition"](metrics):
                    await self.create_alert(
                        rule["name"],
                        rule["level"],
                        rule["name"],
                        rule["message"],
                        "metrics",
                    )
            except Exception as e:
                logger.error(f"Error checking alert rule {rule['name']}: {str(e)}")

        # Check health-based alerts
        for health_check in health_checks:
            if health_check.status in [HealthStatus.CRITICAL, HealthStatus.DOWN]:
                await self.create_alert(
                    f"health_{health_check.name}",
                    AlertLevel.CRITICAL,
                    f"Health Check Failed: {health_check.name}",
                    health_check.message,
                    "health_check",
                )
            elif health_check.status == HealthStatus.WARNING:
                await self.create_alert(
                    f"health_{health_check.name}",
                    AlertLevel.WARNING,
                    f"Health Check Warning: {health_check.name}",
                    health_check.message,
                    "health_check",
                )

    async def create_alert(
        self, alert_id: str, level: AlertLevel, title: str, message: str, component: str
    ):
        """Create or update alert"""
        if alert_id in self.alerts and not self.alerts[alert_id].resolved:
            # Alert already exists and is not resolved
            return

        alert = Alert(
            id=alert_id, level=level, title=title, message=message, component=component
        )

        self.alerts[alert_id] = alert

        # Send notifications
        for handler in self.notification_handlers:
            try:
                await handler(alert)
            except Exception as e:
                logger.error(f"Error sending alert notification: {str(e)}")

        logger.warning(f"Alert created: {title} - {message}")

    async def resolve_alert(self, alert_id: str):
        """Resolve an alert"""
        if alert_id in self.alerts:
            self.alerts[alert_id].resolved = True
            self.alerts[alert_id].resolved_at = datetime.utcnow()
            logger.info(f"Alert resolved: {alert_id}")

    def get_active_alerts(self) -> List[Alert]:
        """Get all active (unresolved) alerts"""
        return [alert for alert in self.alerts.values() if not alert.resolved]


class MonitoringService:
    """Main monitoring service coordinator"""

    def __init__(self, db_session_factory, redis_client=None):
        self.db_session_factory = db_session_factory
        self.redis_client = redis_client

        # Initialize components
        self.system_metrics = SystemMetricsCollector()
        self.db_health = DatabaseHealthChecker(db_session_factory)
        self.redis_health = RedisHealthChecker(redis_client)
        self.app_health = ApplicationHealthChecker()
        self.alert_manager = AlertManager()

        # Storage for metrics and health checks
        self.recent_metrics: deque = deque(maxlen=1000)
        self.recent_health_checks: deque = deque(maxlen=100)

        # Monitoring state
        self.is_running = False
        self.last_collection = None

        # Setup default alert rules
        self.setup_default_alerts()

    def setup_default_alerts(self):
        """Setup default alert rules"""
        # High CPU usage
        self.alert_manager.add_alert_rule(
            "high_cpu_usage",
            lambda metrics: any(
                m.name == "system.cpu.usage" and m.value > 80 for m in metrics
            ),
            AlertLevel.WARNING,
            "High CPU usage detected",
        )

        # High memory usage
        self.alert_manager.add_alert_rule(
            "high_memory_usage",
            lambda metrics: any(
                m.name == "system.memory.usage" and m.value > 85 for m in metrics
            ),
            AlertLevel.WARNING,
            "High memory usage detected",
        )

        # High disk usage
        self.alert_manager.add_alert_rule(
            "high_disk_usage",
            lambda metrics: any(
                m.name == "system.disk.usage" and m.value > 90 for m in metrics
            ),
            AlertLevel.CRITICAL,
            "High disk usage detected",
        )

        # High error rate
        self.alert_manager.add_alert_rule(
            "high_error_rate",
            lambda metrics: any(
                m.name == "app.error_rate" and m.value > 5 for m in metrics
            ),
            AlertLevel.ERROR,
            "High application error rate detected",
        )

    async def start_monitoring(self, interval_seconds: int = 60):
        """Start continuous monitoring"""
        if self.is_running:
            return

        self.is_running = True
        logger.info(f"Monitoring service started with {interval_seconds}s interval")

        while self.is_running:
            try:
                await self.collect_all_metrics()
                await asyncio.sleep(interval_seconds)
            except Exception as e:
                logger.error(f"Monitoring collection error: {str(e)}")
                await asyncio.sleep(interval_seconds)

    async def stop_monitoring(self):
        """Stop monitoring"""
        self.is_running = False
        logger.info("Monitoring service stopped")

    async def collect_all_metrics(self):
        """Collect all metrics and perform health checks"""
        collection_start = time.time()

        # Collect metrics
        all_metrics = []

        # System metrics
        all_metrics.extend(self.system_metrics.collect_system_metrics())
        all_metrics.extend(self.system_metrics.collect_process_metrics())

        # Database metrics
        all_metrics.extend(self.db_health.collect_database_metrics())

        # Redis metrics
        if self.redis_client:
            redis_metrics = await self.redis_health.collect_redis_metrics()
            all_metrics.extend(redis_metrics)

        # Application metrics
        all_metrics.extend(self.app_health.collect_application_metrics())

        # Store metrics
        self.recent_metrics.extend(all_metrics)

        # Perform health checks
        health_checks = []

        # Database health
        db_connection_check = await self.db_health.check_database_connection()
        db_performance_check = await self.db_health.check_database_performance()
        health_checks.extend([db_connection_check, db_performance_check])

        # Redis health
        if self.redis_client:
            redis_check = await self.redis_health.check_redis_connection()
            health_checks.append(redis_check)

        # Application health
        app_check = await self.app_health.check_application_health()
        health_checks.append(app_check)

        # Store health checks
        self.recent_health_checks.extend(health_checks)

        # Check alerts
        await self.alert_manager.check_alerts(all_metrics, health_checks)

        collection_time = time.time() - collection_start
        self.last_collection = datetime.utcnow()

        logger.debug(f"Metrics collection completed in {collection_time:.2f}s")

    def record_request(self, response_time: float, is_error: bool = False):
        """Record request metrics for application monitoring"""
        self.app_health.record_request(response_time, is_error)

    async def get_current_status(self) -> Dict[str, Any]:
        """Get current system status"""
        # Get latest health checks
        latest_health = {}
        for check in reversed(self.recent_health_checks):
            if check.name not in latest_health:
                latest_health[check.name] = check

        # Overall status
        overall_status = HealthStatus.HEALTHY
        for check in latest_health.values():
            if (
                check.status == HealthStatus.CRITICAL
                or check.status == HealthStatus.DOWN
            ):
                overall_status = HealthStatus.CRITICAL
                break
            elif (
                check.status == HealthStatus.WARNING
                and overall_status == HealthStatus.HEALTHY
            ):
                overall_status = HealthStatus.WARNING

        # Get active alerts
        active_alerts = self.alert_manager.get_active_alerts()

        return {
            "overall_status": overall_status.value,
            "timestamp": datetime.utcnow().isoformat(),
            "last_collection": (
                self.last_collection.isoformat() if self.last_collection else None
            ),
            "health_checks": {
                name: asdict(check) for name, check in latest_health.items()
            },
            "active_alerts": len(active_alerts),
            "monitoring_running": self.is_running,
            "system_info": {
                "platform": platform.platform(),
                "python_version": platform.python_version(),
                "architecture": platform.architecture()[0],
            },
        }

    async def get_metrics_summary(self, time_range_minutes: int = 60) -> Dict[str, Any]:
        """Get metrics summary for specified time range"""
        cutoff_time = datetime.utcnow() - timedelta(minutes=time_range_minutes)

        # Filter recent metrics
        relevant_metrics = [
            m for m in self.recent_metrics if m.timestamp >= cutoff_time
        ]

        # Group metrics by name
        metrics_by_name = defaultdict(list)
        for metric in relevant_metrics:
            metrics_by_name[metric.name].append(metric.value)

        # Calculate summaries
        summary = {}
        for name, values in metrics_by_name.items():
            if values:
                summary[name] = {
                    "current": values[-1],
                    "average": sum(values) / len(values),
                    "min": min(values),
                    "max": max(values),
                    "count": len(values),
                }

        return {
            "time_range_minutes": time_range_minutes,
            "metrics_count": len(relevant_metrics),
            "unique_metrics": len(summary),
            "summary": summary,
            "timestamp": datetime.utcnow().isoformat(),
        }


# Global monitoring service instance
monitoring_service = None


def initialize_monitoring_service(db_session_factory, redis_client=None):
    """Initialize global monitoring service"""
    global monitoring_service
    monitoring_service = MonitoringService(db_session_factory, redis_client)
    return monitoring_service


# Export main components
__all__ = [
    "HealthStatus",
    "AlertLevel",
    "HealthCheck",
    "Metric",
    "Alert",
    "MonitoringService",
    "initialize_monitoring_service",
    "monitoring_service",
]
