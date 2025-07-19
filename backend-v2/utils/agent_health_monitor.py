"""
Agent Health Monitoring and Performance Tracking
Real-time monitoring of agent operations with alerting and metrics
"""

import asyncio
import json
import logging
import time
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
from enum import Enum
from typing import Dict, List, Optional, Any, Callable
from pathlib import Path
import sqlite3
import threading
from concurrent.futures import ThreadPoolExecutor
import statistics

from .agent_error_handler import ErrorSeverity, ErrorCategory, error_handler


class HealthStatus(Enum):
    HEALTHY = "healthy"
    DEGRADED = "degraded"  
    UNHEALTHY = "unhealthy"
    CRITICAL = "critical"


class MetricType(Enum):
    COUNTER = "counter"
    GAUGE = "gauge"
    HISTOGRAM = "histogram"
    TIMER = "timer"


@dataclass
class PerformanceMetric:
    """Individual performance measurement"""
    name: str
    metric_type: MetricType
    value: float
    timestamp: datetime
    labels: Dict[str, str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "type": self.metric_type.value,
            "value": self.value,
            "timestamp": self.timestamp.isoformat(),
            "labels": self.labels or {}
        }


@dataclass
class HealthCheck:
    """Health check configuration and result"""
    name: str
    check_function: Callable
    interval_seconds: int
    timeout_seconds: int = 30
    retry_count: int = 3
    enabled: bool = True
    last_run: Optional[datetime] = None
    last_status: Optional[HealthStatus] = None
    last_error: Optional[str] = None
    consecutive_failures: int = 0


@dataclass 
class AgentMetrics:
    """Comprehensive agent performance metrics"""
    agent_id: str
    timestamp: datetime
    
    # Task execution metrics
    tasks_completed: int = 0
    tasks_failed: int = 0
    tasks_in_progress: int = 0
    average_task_duration: float = 0.0
    
    # Performance metrics
    cpu_usage_percent: float = 0.0
    memory_usage_mb: float = 0.0
    response_time_ms: float = 0.0
    
    # Error metrics
    error_rate_percent: float = 0.0
    last_error_time: Optional[datetime] = None
    consecutive_errors: int = 0
    
    # Health status
    health_status: HealthStatus = HealthStatus.HEALTHY
    health_message: str = "All systems operational"


class AlertManager:
    """Manages alerts and notifications for agent health issues"""
    
    def __init__(self):
        self.alert_rules: List[Dict[str, Any]] = []
        self.active_alerts: Dict[str, Dict[str, Any]] = {}
        self.alert_history: List[Dict[str, Any]] = []
        self.logger = logging.getLogger("alert_manager")
        self._load_default_rules()
    
    def _load_default_rules(self):
        """Load default alerting rules"""
        self.alert_rules = [
            {
                "name": "high_error_rate",
                "condition": lambda metrics: metrics.error_rate_percent > 10,
                "severity": "high",
                "message": "Agent error rate exceeds 10%",
                "cooldown_minutes": 15
            },
            {
                "name": "consecutive_failures",
                "condition": lambda metrics: metrics.consecutive_errors >= 5,
                "severity": "critical", 
                "message": "Agent has 5+ consecutive errors",
                "cooldown_minutes": 5
            },
            {
                "name": "high_response_time",
                "condition": lambda metrics: metrics.response_time_ms > 5000,
                "severity": "medium",
                "message": "Agent response time exceeds 5 seconds",
                "cooldown_minutes": 30
            },
            {
                "name": "memory_usage",
                "condition": lambda metrics: metrics.memory_usage_mb > 1000,
                "severity": "medium",
                "message": "Agent memory usage exceeds 1GB",
                "cooldown_minutes": 20
            }
        ]
    
    def check_alerts(self, metrics: AgentMetrics) -> List[Dict[str, Any]]:
        """Check metrics against alert rules and trigger alerts"""
        triggered_alerts = []
        
        for rule in self.alert_rules:
            alert_key = f"{metrics.agent_id}_{rule['name']}"
            
            try:
                if rule["condition"](metrics):
                    # Check if alert is already active with cooldown
                    if alert_key in self.active_alerts:
                        last_triggered = self.active_alerts[alert_key]["timestamp"]
                        cooldown = timedelta(minutes=rule["cooldown_minutes"])
                        if datetime.now() - last_triggered < cooldown:
                            continue  # Still in cooldown
                    
                    # Trigger new alert
                    alert = {
                        "alert_id": f"{alert_key}_{int(time.time())}",
                        "agent_id": metrics.agent_id,
                        "rule_name": rule["name"],
                        "severity": rule["severity"],
                        "message": rule["message"],
                        "timestamp": datetime.now(),
                        "metrics_snapshot": asdict(metrics)
                    }
                    
                    self.active_alerts[alert_key] = alert
                    self.alert_history.append(alert)
                    triggered_alerts.append(alert)
                    
                    self.logger.warning(
                        f"ALERT [{rule['severity'].upper()}] {metrics.agent_id}: {rule['message']}"
                    )
                    
                else:
                    # Alert condition no longer met, resolve if active
                    if alert_key in self.active_alerts:
                        self.logger.info(f"RESOLVED: Alert {alert_key} for {metrics.agent_id}")
                        del self.active_alerts[alert_key]
                        
            except Exception as e:
                self.logger.error(f"Error evaluating alert rule {rule['name']}: {e}")
        
        return triggered_alerts
    
    def get_active_alerts(self, agent_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get currently active alerts"""
        alerts = list(self.active_alerts.values())
        if agent_id:
            alerts = [a for a in alerts if a["agent_id"] == agent_id]
        return alerts


class MetricsCollector:
    """Collects and stores performance metrics"""
    
    def __init__(self, db_path: str = "agent_metrics.db"):
        self.db_path = db_path
        self.metrics_buffer: List[PerformanceMetric] = []
        self.buffer_lock = threading.Lock()
        self.logger = logging.getLogger("metrics_collector")
        self._init_database()
        
        # Start background flush task
        self.flush_interval = 30  # seconds
        self._start_flush_task()
    
    def _init_database(self):
        """Initialize metrics database"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS performance_metrics (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    metric_type TEXT NOT NULL,
                    value REAL NOT NULL,
                    timestamp TEXT NOT NULL,
                    labels TEXT,
                    agent_id TEXT,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_timestamp ON performance_metrics(timestamp)
            """)
            
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_agent_id ON performance_metrics(agent_id)
            """)
            
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_name ON performance_metrics(name)
            """)
    
    def record_metric(self, metric: PerformanceMetric):
        """Record a performance metric"""
        with self.buffer_lock:
            self.metrics_buffer.append(metric)
            
            # Flush if buffer is getting large
            if len(self.metrics_buffer) >= 100:
                self._flush_metrics()
    
    def _flush_metrics(self):
        """Flush metrics buffer to database"""
        if not self.metrics_buffer:
            return
        
        try:
            with sqlite3.connect(self.db_path) as conn:
                for metric in self.metrics_buffer:
                    conn.execute("""
                        INSERT INTO performance_metrics 
                        (name, metric_type, value, timestamp, labels, agent_id)
                        VALUES (?, ?, ?, ?, ?, ?)
                    """, (
                        metric.name,
                        metric.metric_type.value,
                        metric.value,
                        metric.timestamp.isoformat(),
                        json.dumps(metric.labels or {}),
                        metric.labels.get("agent_id") if metric.labels else None
                    ))
            
            self.logger.debug(f"Flushed {len(self.metrics_buffer)} metrics to database")
            self.metrics_buffer.clear()
            
        except Exception as e:
            self.logger.error(f"Failed to flush metrics: {e}")
    
    def _start_flush_task(self):
        """Start background flush task"""
        def flush_loop():
            while True:
                time.sleep(self.flush_interval)
                with self.buffer_lock:
                    self._flush_metrics()
        
        flush_thread = threading.Thread(target=flush_loop, daemon=True)
        flush_thread.start()
    
    def get_metrics_summary(self, agent_id: str, hours: int = 1) -> Dict[str, Any]:
        """Get metrics summary for an agent"""
        cutoff = (datetime.now() - timedelta(hours=hours)).isoformat()
        
        with sqlite3.connect(self.db_path) as conn:
            # Get basic statistics
            stats = conn.execute("""
                SELECT 
                    COUNT(*) as total_metrics,
                    AVG(value) as avg_value,
                    MIN(value) as min_value,
                    MAX(value) as max_value
                FROM performance_metrics 
                WHERE agent_id = ? AND timestamp > ?
            """, (agent_id, cutoff)).fetchone()
            
            # Get metrics by type
            by_type = dict(conn.execute("""
                SELECT name, COUNT(*) as count
                FROM performance_metrics 
                WHERE agent_id = ? AND timestamp > ?
                GROUP BY name
                ORDER BY count DESC
            """, (agent_id, cutoff)).fetchall())
        
        return {
            "agent_id": agent_id,
            "time_period_hours": hours,
            "total_metrics": stats[0] if stats else 0,
            "average_value": stats[1] if stats else 0,
            "min_value": stats[2] if stats else 0,
            "max_value": stats[3] if stats else 0,
            "metrics_by_type": by_type
        }


class AgentHealthMonitor:
    """Main health monitoring system for AI agents"""
    
    def __init__(self, monitoring_interval: int = 60):
        self.monitoring_interval = monitoring_interval
        self.health_checks: Dict[str, HealthCheck] = {}
        self.agent_metrics: Dict[str, AgentMetrics] = {}
        self.metrics_collector = MetricsCollector()
        self.alert_manager = AlertManager()
        self.logger = logging.getLogger("agent_health_monitor")
        
        # Monitoring state
        self.monitoring_active = False
        self.monitor_thread = None
        
        # Register default health checks
        self._register_default_health_checks()
    
    def _register_default_health_checks(self):
        """Register default health checks"""
        self.register_health_check(
            "database_connectivity",
            self._check_database_connectivity,
            interval_seconds=60
        )
        
        self.register_health_check(
            "error_handler_status",
            self._check_error_handler_status,
            interval_seconds=120
        )
        
        self.register_health_check(
            "agent_response_times",
            self._check_agent_response_times,
            interval_seconds=300
        )
    
    def register_health_check(self, 
                            name: str,
                            check_function: Callable,
                            interval_seconds: int = 60,
                            timeout_seconds: int = 30,
                            retry_count: int = 3):
        """Register a new health check"""
        self.health_checks[name] = HealthCheck(
            name=name,
            check_function=check_function,
            interval_seconds=interval_seconds,
            timeout_seconds=timeout_seconds,
            retry_count=retry_count
        )
        self.logger.info(f"Registered health check: {name}")
    
    def start_monitoring(self):
        """Start continuous health monitoring"""
        if self.monitoring_active:
            self.logger.warning("Monitoring already active")
            return
        
        self.monitoring_active = True
        self.monitor_thread = threading.Thread(target=self._monitoring_loop, daemon=True)
        self.monitor_thread.start()
        self.logger.info("Agent health monitoring started")
    
    def stop_monitoring(self):
        """Stop health monitoring"""
        self.monitoring_active = False
        if self.monitor_thread:
            self.monitor_thread.join(timeout=5)
        self.logger.info("Agent health monitoring stopped")
    
    def _monitoring_loop(self):
        """Main monitoring loop"""
        while self.monitoring_active:
            try:
                # Run health checks
                for check_name, health_check in self.health_checks.items():
                    if health_check.enabled:
                        self._run_health_check(health_check)
                
                # Update agent metrics
                self._collect_agent_metrics()
                
                # Check for alerts
                self._check_alerts()
                
                time.sleep(self.monitoring_interval)
                
            except Exception as e:
                self.logger.error(f"Error in monitoring loop: {e}")
                time.sleep(5)  # Brief pause before retrying
    
    def _run_health_check(self, health_check: HealthCheck):
        """Execute a single health check"""
        now = datetime.now()
        
        # Check if it's time to run this check
        if (health_check.last_run and 
            now - health_check.last_run < timedelta(seconds=health_check.interval_seconds)):
            return
        
        health_check.last_run = now
        
        try:
            with ThreadPoolExecutor(max_workers=1) as executor:
                future = executor.submit(health_check.check_function)
                result = future.result(timeout=health_check.timeout_seconds)
                
                if result:
                    health_check.last_status = HealthStatus.HEALTHY
                    health_check.last_error = None
                    health_check.consecutive_failures = 0
                else:
                    health_check.last_status = HealthStatus.UNHEALTHY
                    health_check.consecutive_failures += 1
                    
        except Exception as e:
            health_check.last_status = HealthStatus.CRITICAL
            health_check.last_error = str(e)
            health_check.consecutive_failures += 1
            self.logger.error(f"Health check {health_check.name} failed: {e}")
    
    def _collect_agent_metrics(self):
        """Collect metrics for all active agents"""
        # This would be expanded to collect from actual agent instances
        # For now, simulate basic metrics collection
        
        for agent_id in ["agent_1", "agent_2", "agent_3"]:
            metrics = AgentMetrics(
                agent_id=agent_id,
                timestamp=datetime.now(),
                tasks_completed=self._get_agent_tasks_completed(agent_id),
                error_rate_percent=self._get_agent_error_rate(agent_id),
                response_time_ms=self._get_agent_response_time(agent_id),
                health_status=self._determine_agent_health(agent_id)
            )
            
            self.agent_metrics[agent_id] = metrics
            
            # Record as performance metrics
            self.metrics_collector.record_metric(PerformanceMetric(
                name="tasks_completed",
                metric_type=MetricType.COUNTER,
                value=metrics.tasks_completed,
                timestamp=metrics.timestamp,
                labels={"agent_id": agent_id}
            ))
            
            self.metrics_collector.record_metric(PerformanceMetric(
                name="error_rate_percent",
                metric_type=MetricType.GAUGE,
                value=metrics.error_rate_percent,
                timestamp=metrics.timestamp,
                labels={"agent_id": agent_id}
            ))
    
    def _check_alerts(self):
        """Check metrics against alert rules"""
        for agent_id, metrics in self.agent_metrics.items():
            alerts = self.alert_manager.check_alerts(metrics)
            for alert in alerts:
                self._handle_alert(alert)
    
    def _handle_alert(self, alert: Dict[str, Any]):
        """Handle triggered alert"""
        # Log the alert
        self.logger.warning(f"ALERT: {alert['message']} (Agent: {alert['agent_id']})")
        
        # Here you would integrate with external alerting systems:
        # - Send email notifications
        # - Post to Slack/Discord
        # - Create tickets in monitoring systems
        # - Trigger automated remediation
    
    def _check_database_connectivity(self) -> bool:
        """Health check for database connectivity"""
        try:
            with sqlite3.connect("agent_errors.db", timeout=5) as conn:
                conn.execute("SELECT 1").fetchone()
            return True
        except Exception:
            return False
    
    def _check_error_handler_status(self) -> bool:
        """Health check for error handler status"""
        try:
            health_status = error_handler.get_health_status()
            # Check if any circuit breakers are open
            for cb_name, cb_status in health_status["circuit_breakers"].items():
                if cb_status["state"] == "open":
                    return False
            return True
        except Exception:
            return False
    
    def _check_agent_response_times(self) -> bool:
        """Health check for agent response times"""
        try:
            # Check average response times across all agents
            total_response_time = sum(
                metrics.response_time_ms for metrics in self.agent_metrics.values()
            )
            avg_response_time = total_response_time / len(self.agent_metrics) if self.agent_metrics else 0
            
            # Consider healthy if average response time is under 3 seconds
            return avg_response_time < 3000
        except Exception:
            return False
    
    def _get_agent_tasks_completed(self, agent_id: str) -> int:
        """Get completed task count for agent (placeholder)"""
        # This would connect to actual agent task tracking
        return 0
    
    def _get_agent_error_rate(self, agent_id: str) -> float:
        """Get error rate for agent (placeholder)"""
        # This would calculate from error tracking
        return 0.0
    
    def _get_agent_response_time(self, agent_id: str) -> float:
        """Get average response time for agent (placeholder)"""
        # This would calculate from performance metrics
        return 100.0
    
    def _determine_agent_health(self, agent_id: str) -> HealthStatus:
        """Determine overall health status for agent"""
        # Simple health determination based on error rate
        error_rate = self._get_agent_error_rate(agent_id)
        
        if error_rate == 0:
            return HealthStatus.HEALTHY
        elif error_rate < 5:
            return HealthStatus.DEGRADED
        elif error_rate < 15:
            return HealthStatus.UNHEALTHY
        else:
            return HealthStatus.CRITICAL
    
    def get_system_health(self) -> Dict[str, Any]:
        """Get comprehensive system health report"""
        # Health check status
        health_check_status = {}
        for name, check in self.health_checks.items():
            health_check_status[name] = {
                "status": check.last_status.value if check.last_status else "unknown",
                "last_run": check.last_run.isoformat() if check.last_run else None,
                "consecutive_failures": check.consecutive_failures,
                "last_error": check.last_error
            }
        
        # Agent health summary
        agent_health = {}
        for agent_id, metrics in self.agent_metrics.items():
            agent_health[agent_id] = {
                "status": metrics.health_status.value,
                "error_rate": metrics.error_rate_percent,
                "response_time_ms": metrics.response_time_ms,
                "tasks_completed": metrics.tasks_completed
            }
        
        # Active alerts
        active_alerts = self.alert_manager.get_active_alerts()
        
        # Overall system status
        critical_checks = [
            check for check in self.health_checks.values()
            if check.last_status == HealthStatus.CRITICAL
        ]
        
        if critical_checks:
            overall_status = HealthStatus.CRITICAL
        elif any(metrics.health_status in [HealthStatus.UNHEALTHY, HealthStatus.CRITICAL]
                for metrics in self.agent_metrics.values()):
            overall_status = HealthStatus.UNHEALTHY
        elif any(metrics.health_status == HealthStatus.DEGRADED
                for metrics in self.agent_metrics.values()):
            overall_status = HealthStatus.DEGRADED
        else:
            overall_status = HealthStatus.HEALTHY
        
        return {
            "overall_status": overall_status.value,
            "timestamp": datetime.now().isoformat(),
            "health_checks": health_check_status,
            "agent_health": agent_health,
            "active_alerts": [
                {k: v for k, v in alert.items() if k != "metrics_snapshot"}
                for alert in active_alerts
            ],
            "monitoring_active": self.monitoring_active
        }


# Global health monitor instance
health_monitor = AgentHealthMonitor()


# Convenience functions
def start_agent_monitoring():
    """Start the global health monitoring system"""
    health_monitor.start_monitoring()


def stop_agent_monitoring():
    """Stop the global health monitoring system"""
    health_monitor.stop_monitoring()


def get_agent_health() -> Dict[str, Any]:
    """Get current system health status"""
    return health_monitor.get_system_health()


def record_agent_metric(name: str, value: float, agent_id: str, metric_type: MetricType = MetricType.GAUGE):
    """Record a performance metric for an agent"""
    metric = PerformanceMetric(
        name=name,
        metric_type=metric_type,
        value=value,
        timestamp=datetime.now(),
        labels={"agent_id": agent_id}
    )
    health_monitor.metrics_collector.record_metric(metric)