"""
Comprehensive Observability Service for 6fb-booking Platform
Enterprise-grade observability with metrics, logs, traces, and alerts
designed to achieve 99.9%+ uptime with proactive monitoring
"""

import asyncio
import logging
import time
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Union, Callable
from dataclasses import dataclass, field, asdict
from enum import Enum
from collections import defaultdict, deque
import statistics
import uuid

from services.redis_service import cache_service
from services.enhanced_sentry_monitoring import enhanced_sentry, AlertSeverity


logger = logging.getLogger(__name__)


class MetricType(Enum):
    """Types of metrics"""
    COUNTER = "counter"
    GAUGE = "gauge"
    HISTOGRAM = "histogram"
    SUMMARY = "summary"
    TIMER = "timer"


class AlertSeverity(Enum):
    """Alert severity levels"""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"


class AlertState(Enum):
    """Alert states"""
    PENDING = "pending"
    FIRING = "firing"
    RESOLVED = "resolved"
    SILENCED = "silenced"


@dataclass
class Metric:
    """Metric data structure"""
    name: str
    type: MetricType
    value: Union[float, int]
    timestamp: datetime
    labels: Dict[str, str] = field(default_factory=dict)
    help_text: str = ""
    unit: str = ""


@dataclass
class LogEntry:
    """Log entry structure for centralized logging"""
    timestamp: datetime
    level: str
    service: str
    message: str
    trace_id: Optional[str] = None
    span_id: Optional[str] = None
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "timestamp": self.timestamp.isoformat(),
            "level": self.level,
            "service": self.service,
            "message": self.message,
            "trace_id": self.trace_id,
            "span_id": self.span_id,
            "user_id": self.user_id,
            "session_id": self.session_id,
            "metadata": self.metadata
        }


@dataclass
class TraceSpan:
    """Distributed trace span"""
    trace_id: str
    span_id: str
    parent_span_id: Optional[str]
    operation_name: str
    service_name: str
    start_time: datetime
    end_time: Optional[datetime] = None
    duration_ms: Optional[float] = None
    status: str = "ok"  # ok, error, timeout
    tags: Dict[str, str] = field(default_factory=dict)
    logs: List[Dict[str, Any]] = field(default_factory=list)
    
    def finish(self, status: str = "ok"):
        """Finish the span"""
        self.end_time = datetime.utcnow()
        self.duration_ms = (self.end_time - self.start_time).total_seconds() * 1000
        self.status = status
    
    def add_log(self, level: str, message: str, **kwargs):
        """Add log to span"""
        log_entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": level,
            "message": message,
            **kwargs
        }
        self.logs.append(log_entry)


@dataclass
class AlertRule:
    """Alert rule configuration"""
    name: str
    description: str
    query: str  # PromQL-like query
    condition: str  # threshold condition
    threshold: float
    severity: AlertSeverity
    duration_minutes: int = 5  # How long condition must be true
    cooldown_minutes: int = 30  # Minimum time between alerts
    labels: Dict[str, str] = field(default_factory=dict)
    annotations: Dict[str, str] = field(default_factory=dict)
    enabled: bool = True


@dataclass
class Alert:
    """Active alert instance"""
    id: str
    rule_name: str
    severity: AlertSeverity
    state: AlertState
    message: str
    start_time: datetime
    end_time: Optional[datetime] = None
    labels: Dict[str, str] = field(default_factory=dict)
    annotations: Dict[str, str] = field(default_factory=dict)
    resolved_by: Optional[str] = None
    
    def duration_minutes(self) -> float:
        """Get alert duration in minutes"""
        end = self.end_time or datetime.utcnow()
        return (end - self.start_time).total_seconds() / 60


class ComprehensiveObservabilityService:
    """
    Comprehensive observability service providing metrics, logs, traces,
    and alerting for 99.9%+ uptime monitoring
    """
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        
        # Metrics storage
        self.metrics: Dict[str, deque] = defaultdict(lambda: deque(maxlen=10000))
        self.metric_metadata: Dict[str, Dict[str, Any]] = {}
        
        # Logging
        self.log_buffer: deque = deque(maxlen=50000)
        self.log_levels = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]
        
        # Distributed tracing
        self.active_spans: Dict[str, TraceSpan] = {}
        self.completed_traces: deque = deque(maxlen=1000)
        
        # Alerting
        self.alert_rules: Dict[str, AlertRule] = {}
        self.active_alerts: Dict[str, Alert] = {}
        self.alert_history: deque = deque(maxlen=1000)
        self.alert_channels: List[str] = ["sentry", "email", "slack"]
        
        # Performance tracking
        self.performance_metrics = {
            "total_requests": 0,
            "error_count": 0,
            "average_response_time": 0.0,
            "p95_response_time": 0.0,
            "uptime_percentage": 100.0
        }
        
        # Business metrics
        self.business_metrics = {
            "revenue_per_hour": 0.0,
            "bookings_per_hour": 0,
            "customer_satisfaction_score": 0.0,
            "six_figure_barber_kpis": {}
        }
        
        # Monitoring configuration
        self._monitoring_active = False
        self._monitoring_tasks = []
        
        # Initialize default alert rules
        self._initialize_default_alert_rules()
        
        self.logger.info("📊 Comprehensive Observability Service initialized")
    
    def _initialize_default_alert_rules(self):
        """Initialize default alert rules for critical services"""
        
        # High error rate alert
        self.alert_rules["high_error_rate"] = AlertRule(
            name="high_error_rate",
            description="Error rate exceeds 5% for 2 minutes",
            query="rate(http_requests_total{status=~'5..'}[2m]) / rate(http_requests_total[2m]) * 100",
            condition=">",
            threshold=5.0,
            severity=AlertSeverity.CRITICAL,
            duration_minutes=2,
            labels={"category": "availability", "impact": "customer_facing"},
            annotations={"summary": "High error rate detected", "runbook": "https://runbooks.example.com/high-error-rate"}
        )
        
        # Payment system down
        self.alert_rules["payment_system_down"] = AlertRule(
            name="payment_system_down",
            description="Payment system is unavailable",
            query="up{service='payment_system'}",
            condition="==",
            threshold=0.0,
            severity=AlertSeverity.CRITICAL,
            duration_minutes=1,
            labels={"category": "revenue_critical", "impact": "revenue_loss"},
            annotations={"summary": "Payment system down - immediate revenue impact"}
        )
        
        # Database connection issues
        self.alert_rules["database_connection_high"] = AlertRule(
            name="database_connection_high",
            description="Database connection pool utilization > 80%",
            query="database_connection_pool_utilization",
            condition=">",
            threshold=80.0,
            severity=AlertSeverity.HIGH,
            duration_minutes=3,
            labels={"category": "performance", "impact": "performance_degradation"}
        )
        
        # AI Dashboard slow response
        self.alert_rules["ai_dashboard_slow"] = AlertRule(
            name="ai_dashboard_slow",
            description="AI Dashboard response time > 2 seconds",
            query="histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{service='ai_dashboard'}[5m]))",
            condition=">",
            threshold=2.0,
            severity=AlertSeverity.MEDIUM,
            duration_minutes=5,
            labels={"category": "performance", "impact": "user_experience"}
        )
        
        # Memory usage high
        self.alert_rules["memory_usage_high"] = AlertRule(
            name="memory_usage_high",
            description="Memory usage exceeds 85%",
            query="memory_usage_percentage",
            condition=">",
            threshold=85.0,
            severity=AlertSeverity.HIGH,
            duration_minutes=5,
            labels={"category": "infrastructure", "impact": "stability"}
        )
        
        # Disk space low
        self.alert_rules["disk_space_low"] = AlertRule(
            name="disk_space_low",
            description="Disk space below 15%",
            query="disk_free_percentage",
            condition="<",
            threshold=15.0,
            severity=AlertSeverity.HIGH,
            duration_minutes=1,
            labels={"category": "infrastructure", "impact": "stability"}
        )
        
        # Certificate expiry warning
        self.alert_rules["ssl_cert_expiry"] = AlertRule(
            name="ssl_cert_expiry",
            description="SSL certificate expires within 30 days",
            query="ssl_cert_expiry_days",
            condition="<",
            threshold=30.0,
            severity=AlertSeverity.MEDIUM,
            duration_minutes=1,
            labels={"category": "security", "impact": "service_availability"}
        )
    
    # Metrics Management
    
    async def record_metric(self, name: str, value: Union[float, int], 
                          metric_type: MetricType = MetricType.GAUGE,
                          labels: Optional[Dict[str, str]] = None,
                          help_text: str = "", unit: str = ""):
        """Record a metric value"""
        
        metric = Metric(
            name=name,
            type=metric_type,
            value=value,
            timestamp=datetime.utcnow(),
            labels=labels or {},
            help_text=help_text,
            unit=unit
        )
        
        self.metrics[name].append(metric)
        
        # Store metadata
        self.metric_metadata[name] = {
            "type": metric_type.value,
            "help": help_text,
            "unit": unit
        }
        
        # Check for alert conditions
        await self._evaluate_alert_rules(name, value, labels or {})
    
    async def increment_counter(self, name: str, 
                              labels: Optional[Dict[str, str]] = None,
                              amount: Union[float, int] = 1):
        """Increment a counter metric"""
        
        # Get current value
        current_metrics = list(self.metrics[name])
        current_value = current_metrics[-1].value if current_metrics else 0
        
        await self.record_metric(
            name=name,
            value=current_value + amount,
            metric_type=MetricType.COUNTER,
            labels=labels
        )
    
    async def observe_histogram(self, name: str, value: float,
                              labels: Optional[Dict[str, str]] = None,
                              buckets: Optional[List[float]] = None):
        """Observe a value in a histogram"""
        
        # Default buckets for HTTP response times
        default_buckets = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0]
        buckets = buckets or default_buckets
        
        # Record the observation
        await self.record_metric(
            name=f"{name}_bucket",
            value=value,
            metric_type=MetricType.HISTOGRAM,
            labels=labels
        )
        
        # Update bucket counts
        for bucket in buckets:
            bucket_labels = (labels or {}).copy()
            bucket_labels["le"] = str(bucket)
            
            if value <= bucket:
                await self.increment_counter(f"{name}_bucket", bucket_labels)
    
    async def time_operation(self, name: str, labels: Optional[Dict[str, str]] = None):
        """Context manager for timing operations"""
        
        class TimerContext:
            def __init__(self, observability_service, metric_name, metric_labels):
                self.service = observability_service
                self.metric_name = metric_name
                self.labels = metric_labels
                self.start_time = None
            
            async def __aenter__(self):
                self.start_time = time.time()
                return self
            
            async def __aexit__(self, exc_type, exc_val, exc_tb):
                duration = time.time() - self.start_time
                await self.service.observe_histogram(
                    f"{self.metric_name}_duration_seconds",
                    duration,
                    self.labels
                )
        
        return TimerContext(self, name, labels)
    
    def get_metric_values(self, name: str, 
                         start_time: Optional[datetime] = None,
                         end_time: Optional[datetime] = None) -> List[Metric]:
        """Get metric values within time range"""
        
        metrics = list(self.metrics[name])
        
        if start_time:
            metrics = [m for m in metrics if m.timestamp >= start_time]
        
        if end_time:
            metrics = [m for m in metrics if m.timestamp <= end_time]
        
        return metrics
    
    def calculate_metric_statistics(self, name: str, 
                                  duration_minutes: int = 60) -> Dict[str, float]:
        """Calculate statistics for a metric over a time period"""
        
        end_time = datetime.utcnow()
        start_time = end_time - timedelta(minutes=duration_minutes)
        
        metrics = self.get_metric_values(name, start_time, end_time)
        values = [m.value for m in metrics]
        
        if not values:
            return {}
        
        return {
            "min": min(values),
            "max": max(values),
            "mean": statistics.mean(values),
            "median": statistics.median(values),
            "p95": statistics.quantiles(values, n=20)[18] if len(values) > 1 else values[0],
            "p99": statistics.quantiles(values, n=100)[98] if len(values) > 1 else values[0],
            "count": len(values)
        }
    
    # Logging Management
    
    async def log(self, level: str, service: str, message: str,
                 trace_id: Optional[str] = None, span_id: Optional[str] = None,
                 user_id: Optional[str] = None, session_id: Optional[str] = None,
                 **metadata):
        """Log a message with structured format"""
        
        log_entry = LogEntry(
            timestamp=datetime.utcnow(),
            level=level.upper(),
            service=service,
            message=message,
            trace_id=trace_id,
            span_id=span_id,
            user_id=user_id,
            session_id=session_id,
            metadata=metadata
        )
        
        self.log_buffer.append(log_entry)
        
        # Send to external logging if configured
        await self._send_to_external_logging(log_entry)
        
        # Check for error patterns
        if level.upper() in ["ERROR", "CRITICAL"]:
            await self._evaluate_error_patterns(log_entry)
    
    def query_logs(self, 
                  service: Optional[str] = None,
                  level: Optional[str] = None,
                  start_time: Optional[datetime] = None,
                  end_time: Optional[datetime] = None,
                  limit: int = 100) -> List[LogEntry]:
        """Query logs with filters"""
        
        logs = list(self.log_buffer)
        
        # Apply filters
        if service:
            logs = [log for log in logs if log.service == service]
        
        if level:
            logs = [log for log in logs if log.level == level.upper()]
        
        if start_time:
            logs = [log for log in logs if log.timestamp >= start_time]
        
        if end_time:
            logs = [log for log in logs if log.timestamp <= end_time]
        
        # Sort by timestamp (newest first) and limit
        logs.sort(key=lambda x: x.timestamp, reverse=True)
        return logs[:limit]
    
    # Distributed Tracing
    
    def start_trace(self, operation_name: str, service_name: str,
                   parent_span_id: Optional[str] = None,
                   tags: Optional[Dict[str, str]] = None) -> TraceSpan:
        """Start a new trace span"""
        
        # Generate IDs
        trace_id = str(uuid.uuid4())
        span_id = str(uuid.uuid4())
        
        span = TraceSpan(
            trace_id=trace_id,
            span_id=span_id,
            parent_span_id=parent_span_id,
            operation_name=operation_name,
            service_name=service_name,
            start_time=datetime.utcnow(),
            tags=tags or {}
        )
        
        self.active_spans[span_id] = span
        return span
    
    def finish_span(self, span: TraceSpan, status: str = "ok"):
        """Finish a trace span"""
        
        span.finish(status)
        
        # Move to completed traces
        if span.span_id in self.active_spans:
            del self.active_spans[span.span_id]
        
        self.completed_traces.append(span)
        
        # Send to external tracing if configured
        asyncio.create_task(self._send_to_external_tracing(span))
    
    def get_trace(self, trace_id: str) -> List[TraceSpan]:
        """Get all spans for a trace"""
        
        spans = []
        
        # Check active spans
        for span in self.active_spans.values():
            if span.trace_id == trace_id:
                spans.append(span)
        
        # Check completed traces
        for span in self.completed_traces:
            if span.trace_id == trace_id:
                spans.append(span)
        
        # Sort by start time
        spans.sort(key=lambda x: x.start_time)
        return spans
    
    def trace_operation(self, operation_name: str, service_name: str,
                       parent_span_id: Optional[str] = None,
                       tags: Optional[Dict[str, str]] = None):
        """Context manager for tracing operations"""
        
        class TraceContext:
            def __init__(self, observability_service, op_name, svc_name, parent_id, trace_tags):
                self.service = observability_service
                self.operation_name = op_name
                self.service_name = svc_name
                self.parent_span_id = parent_id
                self.tags = trace_tags
                self.span = None
            
            async def __aenter__(self):
                self.span = self.service.start_trace(
                    self.operation_name,
                    self.service_name,
                    self.parent_span_id,
                    self.tags
                )
                return self.span
            
            async def __aexit__(self, exc_type, exc_val, exc_tb):
                status = "error" if exc_type else "ok"
                if exc_type:
                    self.span.add_log("ERROR", f"Exception: {str(exc_val)}")
                self.service.finish_span(self.span, status)
        
        return TraceContext(self, operation_name, service_name, parent_span_id, tags)
    
    # Alerting Management
    
    async def _evaluate_alert_rules(self, metric_name: str, value: float, labels: Dict[str, str]):
        """Evaluate alert rules against new metric"""
        
        for rule_name, rule in self.alert_rules.items():
            if not rule.enabled:
                continue
            
            # Simple evaluation - in production this would be more sophisticated
            if metric_name in rule.query:
                should_alert = False
                
                if rule.condition == ">" and value > rule.threshold:
                    should_alert = True
                elif rule.condition == "<" and value < rule.threshold:
                    should_alert = True
                elif rule.condition == "==" and value == rule.threshold:
                    should_alert = True
                elif rule.condition == ">=" and value >= rule.threshold:
                    should_alert = True
                elif rule.condition == "<=" and value <= rule.threshold:
                    should_alert = True
                
                if should_alert:
                    await self._trigger_alert(rule, value, labels)
    
    async def _trigger_alert(self, rule: AlertRule, current_value: float, labels: Dict[str, str]):
        """Trigger an alert"""
        
        # Check if alert is already active
        existing_alert = None
        for alert in self.active_alerts.values():
            if alert.rule_name == rule.name and alert.state == AlertState.FIRING:
                existing_alert = alert
                break
        
        if existing_alert:
            return  # Alert already active
        
        # Create new alert
        alert_id = str(uuid.uuid4())
        alert = Alert(
            id=alert_id,
            rule_name=rule.name,
            severity=rule.severity,
            state=AlertState.FIRING,
            message=f"{rule.description} (current value: {current_value})",
            start_time=datetime.utcnow(),
            labels={**rule.labels, **labels},
            annotations=rule.annotations
        )
        
        self.active_alerts[alert_id] = alert
        
        # Send alert notifications
        await self._send_alert_notifications(alert)
        
        self.logger.error(f"🚨 ALERT TRIGGERED: {rule.name} - {alert.message}")
    
    async def resolve_alert(self, alert_id: str, resolved_by: str = "system") -> bool:
        """Resolve an active alert"""
        
        if alert_id not in self.active_alerts:
            return False
        
        alert = self.active_alerts[alert_id]
        alert.state = AlertState.RESOLVED
        alert.end_time = datetime.utcnow()
        alert.resolved_by = resolved_by
        
        # Move to history
        self.alert_history.append(alert)
        del self.active_alerts[alert_id]
        
        # Send resolution notification
        await self._send_alert_resolution_notification(alert)
        
        self.logger.info(f"✅ ALERT RESOLVED: {alert.rule_name} by {resolved_by}")
        
        return True
    
    async def silence_alert(self, alert_id: str, duration_minutes: int = 60) -> bool:
        """Silence an alert for a specified duration"""
        
        if alert_id not in self.active_alerts:
            return False
        
        alert = self.active_alerts[alert_id]
        alert.state = AlertState.SILENCED
        
        # Schedule un-silencing
        asyncio.create_task(self._unsilence_alert_after_delay(alert_id, duration_minutes))
        
        self.logger.info(f"🔇 ALERT SILENCED: {alert.rule_name} for {duration_minutes} minutes")
        
        return True
    
    async def _unsilence_alert_after_delay(self, alert_id: str, delay_minutes: int):
        """Un-silence alert after delay"""
        
        await asyncio.sleep(delay_minutes * 60)
        
        if alert_id in self.active_alerts:
            alert = self.active_alerts[alert_id]
            alert.state = AlertState.FIRING
            self.logger.info(f"🔊 ALERT UN-SILENCED: {alert.rule_name}")
    
    async def _send_alert_notifications(self, alert: Alert):
        """Send alert notifications to configured channels"""
        
        try:
            # Send to Sentry
            sentry_severity = {
                AlertSeverity.CRITICAL: AlertSeverity.CRITICAL,
                AlertSeverity.HIGH: AlertSeverity.HIGH,
                AlertSeverity.MEDIUM: AlertSeverity.MEDIUM,
                AlertSeverity.LOW: AlertSeverity.LOW,
                AlertSeverity.INFO: AlertSeverity.LOW
            }.get(alert.severity, AlertSeverity.MEDIUM)
            
            await enhanced_sentry.capture_business_event(
                "observability_alert",
                alert.message,
                {
                    "alert_id": alert.id,
                    "rule_name": alert.rule_name,
                    "severity": alert.severity.value,
                    "labels": alert.labels,
                    "annotations": alert.annotations
                },
                severity=sentry_severity
            )
            
        except Exception as e:
            self.logger.error(f"❌ Failed to send alert notification: {e}")
    
    async def _send_alert_resolution_notification(self, alert: Alert):
        """Send alert resolution notification"""
        
        try:
            await enhanced_sentry.capture_business_event(
                "observability_alert_resolved",
                f"Alert resolved: {alert.rule_name}",
                {
                    "alert_id": alert.id,
                    "rule_name": alert.rule_name,
                    "duration_minutes": alert.duration_minutes(),
                    "resolved_by": alert.resolved_by
                },
                severity=AlertSeverity.LOW
            )
            
        except Exception as e:
            self.logger.error(f"❌ Failed to send alert resolution notification: {e}")
    
    # Dashboard and Reporting
    
    async def get_observability_dashboard(self) -> Dict[str, Any]:
        """Get comprehensive observability dashboard"""
        
        current_time = datetime.utcnow()
        
        # Get metrics summary
        metrics_summary = await self._get_metrics_summary()
        
        # Get active alerts
        alerts_by_severity = defaultdict(int)
        for alert in self.active_alerts.values():
            alerts_by_severity[alert.severity.value] += 1
        
        # Get recent logs summary
        recent_logs = self.query_logs(start_time=current_time - timedelta(hours=1), limit=1000)
        log_levels = defaultdict(int)
        for log in recent_logs:
            log_levels[log.level] += 1
        
        # Get trace statistics
        recent_traces = [span for span in self.completed_traces 
                        if span.start_time >= current_time - timedelta(hours=1)]
        
        trace_stats = {
            "total_traces": len(recent_traces),
            "error_traces": len([t for t in recent_traces if t.status == "error"]),
            "average_duration_ms": statistics.mean([t.duration_ms for t in recent_traces if t.duration_ms]) if recent_traces else 0,
            "p95_duration_ms": statistics.quantiles([t.duration_ms for t in recent_traces if t.duration_ms], n=20)[18] if len(recent_traces) > 1 else 0
        }
        
        # Calculate system health score
        health_score = self._calculate_system_health_score()
        
        return {
            "timestamp": current_time.isoformat(),
            "system_health": {
                "overall_score": health_score,
                "status": "healthy" if health_score >= 95 else "degraded" if health_score >= 80 else "critical",
                "uptime_percentage": self.performance_metrics["uptime_percentage"]
            },
            "metrics": {
                "total_metrics": len(self.metrics),
                "recent_data_points": sum(len(deque_data) for deque_data in self.metrics.values()),
                "summary": metrics_summary
            },
            "logging": {
                "total_logs_last_hour": len(recent_logs),
                "log_levels": dict(log_levels),
                "error_rate": (log_levels["ERROR"] + log_levels["CRITICAL"]) / len(recent_logs) * 100 if recent_logs else 0
            },
            "tracing": trace_stats,
            "alerting": {
                "active_alerts": len(self.active_alerts),
                "alerts_by_severity": dict(alerts_by_severity),
                "alert_rules": len(self.alert_rules),
                "resolved_alerts_last_24h": len([a for a in self.alert_history 
                                               if a.end_time and a.end_time >= current_time - timedelta(days=1)])
            },
            "performance": self.performance_metrics,
            "business_metrics": self.business_metrics
        }
    
    async def _get_metrics_summary(self) -> Dict[str, Any]:
        """Get summary of key metrics"""
        
        summary = {}
        
        # Key performance metrics
        key_metrics = [
            "http_requests_total",
            "http_request_duration_seconds", 
            "database_connections_active",
            "memory_usage_bytes",
            "cpu_usage_percentage"
        ]
        
        for metric_name in key_metrics:
            if metric_name in self.metrics:
                stats = self.calculate_metric_statistics(metric_name, duration_minutes=60)
                summary[metric_name] = stats
        
        return summary
    
    def _calculate_system_health_score(self) -> float:
        """Calculate overall system health score (0-100)"""
        
        score = 100.0
        
        # Deduct for active critical/high alerts
        for alert in self.active_alerts.values():
            if alert.severity == AlertSeverity.CRITICAL:
                score -= 20
            elif alert.severity == AlertSeverity.HIGH:
                score -= 10
            elif alert.severity == AlertSeverity.MEDIUM:
                score -= 5
        
        # Deduct for recent errors
        recent_logs = self.query_logs(start_time=datetime.utcnow() - timedelta(minutes=30))
        error_count = len([log for log in recent_logs if log.level in ["ERROR", "CRITICAL"]])
        if error_count > 10:
            score -= min(20, error_count)
        
        # Deduct for failed traces
        recent_traces = [span for span in self.completed_traces 
                        if span.start_time >= datetime.utcnow() - timedelta(minutes=30)]
        error_traces = [t for t in recent_traces if t.status == "error"]
        if recent_traces:
            error_rate = len(error_traces) / len(recent_traces)
            if error_rate > 0.05:  # More than 5% error rate
                score -= error_rate * 100
        
        return max(0.0, score)
    
    # External integrations
    
    async def _send_to_external_logging(self, log_entry: LogEntry):
        """Send log to external logging system"""
        
        # This would integrate with systems like:
        # - Elasticsearch/ELK Stack
        # - Splunk
        # - CloudWatch Logs
        # - Google Cloud Logging
        
        # For now, store in cache for access
        cache_key = f"log:{log_entry.timestamp.isoformat()}"
        await cache_service.set(cache_key, json.dumps(log_entry.to_dict()), ttl=3600)
    
    async def _send_to_external_tracing(self, span: TraceSpan):
        """Send trace span to external tracing system"""
        
        # This would integrate with systems like:
        # - Jaeger
        # - Zipkin
        # - AWS X-Ray
        # - Google Cloud Trace
        
        # For now, store in cache for access
        cache_key = f"trace:{span.trace_id}:{span.span_id}"
        await cache_service.set(cache_key, json.dumps(asdict(span)), ttl=3600)
    
    async def _evaluate_error_patterns(self, log_entry: LogEntry):
        """Evaluate error log patterns for automatic alerting"""
        
        # Look for error patterns in recent logs
        recent_errors = self.query_logs(
            level="ERROR",
            start_time=datetime.utcnow() - timedelta(minutes=5),
            limit=100
        )
        
        # Check for error spikes
        if len(recent_errors) > 10:
            await self._trigger_alert(
                AlertRule(
                    name="error_spike",
                    description=f"Error spike detected: {len(recent_errors)} errors in 5 minutes",
                    query="error_count_5m",
                    condition=">",
                    threshold=10.0,
                    severity=AlertSeverity.HIGH
                ),
                len(recent_errors),
                {"service": log_entry.service}
            )
    
    # Business Metrics Integration
    
    async def record_business_metric(self, name: str, value: float, 
                                   category: str = "general",
                                   labels: Optional[Dict[str, str]] = None):
        """Record a business metric"""
        
        self.business_metrics[name] = value
        
        # Also record as a regular metric for alerting
        await self.record_metric(
            f"business_{name}",
            value,
            MetricType.GAUGE,
            labels={"category": category, **(labels or {})}
        )
    
    async def update_six_figure_barber_kpis(self, kpis: Dict[str, float]):
        """Update Six Figure Barber methodology KPIs"""
        
        self.business_metrics["six_figure_barber_kpis"] = kpis
        
        # Record individual KPIs as metrics
        for kpi_name, value in kpis.items():
            await self.record_business_metric(
                f"six_figure_{kpi_name}",
                value,
                "six_figure_methodology"
            )
    
    # Monitoring loops
    
    async def start_monitoring(self):
        """Start observability monitoring"""
        
        if self._monitoring_active:
            return
        
        try:
            self._monitoring_active = True
            
            monitoring_tasks = [
                self._metrics_cleanup_loop(),
                self._alert_evaluation_loop(),
                self._performance_monitoring_loop(),
                self._health_score_calculation_loop()
            ]
            
            self._monitoring_tasks = [asyncio.create_task(task) for task in monitoring_tasks]
            
            self.logger.info("🔍 Observability monitoring started")
            
        except Exception as e:
            self.logger.error(f"❌ Failed to start observability monitoring: {e}")
    
    async def _metrics_cleanup_loop(self):
        """Clean up old metrics data"""
        while self._monitoring_active:
            try:
                # Clean up metrics older than 24 hours
                cutoff_time = datetime.utcnow() - timedelta(hours=24)
                
                for metric_name, metric_deque in self.metrics.items():
                    # Remove old metrics
                    while metric_deque and metric_deque[0].timestamp < cutoff_time:
                        metric_deque.popleft()
                
                await asyncio.sleep(3600)  # Clean up every hour
                
            except Exception as e:
                self.logger.error(f"❌ Metrics cleanup error: {e}")
                await asyncio.sleep(3600)
    
    async def _alert_evaluation_loop(self):
        """Evaluate alert rules periodically"""
        while self._monitoring_active:
            try:
                # Auto-resolve alerts that are no longer triggered
                await self._auto_resolve_alerts()
                
                await asyncio.sleep(60)  # Check every minute
                
            except Exception as e:
                self.logger.error(f"❌ Alert evaluation error: {e}")
                await asyncio.sleep(60)
    
    async def _performance_monitoring_loop(self):
        """Monitor system performance metrics"""
        while self._monitoring_active:
            try:
                # Update performance metrics
                await self._update_performance_metrics()
                
                await asyncio.sleep(300)  # Update every 5 minutes
                
            except Exception as e:
                self.logger.error(f"❌ Performance monitoring error: {e}")
                await asyncio.sleep(300)
    
    async def _health_score_calculation_loop(self):
        """Calculate system health score periodically"""
        while self._monitoring_active:
            try:
                health_score = self._calculate_system_health_score()
                await self.record_metric("system_health_score", health_score)
                
                await asyncio.sleep(60)  # Calculate every minute
                
            except Exception as e:
                self.logger.error(f"❌ Health score calculation error: {e}")
                await asyncio.sleep(60)
    
    async def _auto_resolve_alerts(self):
        """Auto-resolve alerts that are no longer triggered"""
        
        # This would check if alert conditions are still true
        # For now, just check alert age
        max_alert_age_hours = 24
        cutoff_time = datetime.utcnow() - timedelta(hours=max_alert_age_hours)
        
        alerts_to_resolve = []
        for alert_id, alert in self.active_alerts.items():
            if alert.start_time < cutoff_time:
                alerts_to_resolve.append(alert_id)
        
        for alert_id in alerts_to_resolve:
            await self.resolve_alert(alert_id, "auto_timeout")
    
    async def _update_performance_metrics(self):
        """Update performance metrics"""
        
        # Calculate metrics from recent data
        recent_requests = self.get_metric_values("http_requests_total", 
                                                start_time=datetime.utcnow() - timedelta(hours=1))
        
        if recent_requests:
            self.performance_metrics["total_requests"] = len(recent_requests)
        
        # Calculate uptime based on recent health checks
        health_checks = self.get_metric_values("system_health_score",
                                             start_time=datetime.utcnow() - timedelta(hours=24))
        
        if health_checks:
            healthy_checks = [check for check in health_checks if check.value >= 95]
            self.performance_metrics["uptime_percentage"] = (len(healthy_checks) / len(health_checks)) * 100
    
    async def stop_monitoring(self):
        """Stop observability monitoring"""
        
        self._monitoring_active = False
        
        for task in self._monitoring_tasks:
            task.cancel()
        
        if self._monitoring_tasks:
            await asyncio.gather(*self._monitoring_tasks, return_exceptions=True)


# Global comprehensive observability service instance
observability_service = ComprehensiveObservabilityService()