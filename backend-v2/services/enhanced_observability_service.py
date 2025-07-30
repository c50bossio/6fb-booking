"""
Enhanced Observability Service
Comprehensive observability with distributed tracing, structured logging, and intelligent alerting

This service provides enterprise-grade observability for the 6FB Booking Platform:
- Distributed tracing across all service boundaries
- Structured logging with correlation IDs and business context
- Intelligent alerting with noise reduction and smart escalation
- Performance monitoring with business impact correlation
- Security event tracking and anomaly detection
- Six Figure Barber methodology compliance monitoring
"""

import asyncio
import json
import logging
import time
import uuid
from collections import defaultdict, deque
from contextlib import contextmanager
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Dict, List, Optional, Any, Callable, Union
import threading
from functools import wraps
import traceback
import hashlib

# Third-party imports
import redis
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

# Configure structured logging
class StructuredFormatter(logging.Formatter):
    """Custom formatter for structured logging"""
    
    def format(self, record):
        log_entry = {
            'timestamp': datetime.utcnow().isoformat(),
            'level': record.levelname,
            'logger': record.name,
            'message': record.getMessage(),
            'module': record.module,
            'function': record.funcName,
            'line': record.lineno
        }
        
        # Add extra fields if present
        if hasattr(record, 'trace_id'):
            log_entry['trace_id'] = record.trace_id
        if hasattr(record, 'span_id'):
            log_entry['span_id'] = record.span_id
        if hasattr(record, 'user_id'):
            log_entry['user_id'] = record.user_id
        if hasattr(record, 'session_id'):
            log_entry['session_id'] = record.session_id
        if hasattr(record, 'business_context'):
            log_entry['business_context'] = record.business_context
        if hasattr(record, 'correlation_id'):
            log_entry['correlation_id'] = record.correlation_id
            
        # Add exception info if present
        if record.exc_info:
            log_entry['exception'] = {
                'type': record.exc_info[0].__name__,
                'message': str(record.exc_info[1]),
                'traceback': traceback.format_exception(*record.exc_info)
            }
            
        return json.dumps(log_entry, default=str)

# Set up structured logging
logger = logging.getLogger(__name__)
handler = logging.StreamHandler()
handler.setFormatter(StructuredFormatter())
logger.addHandler(handler)
logger.setLevel(logging.INFO)

class TraceContext(Enum):
    """Business contexts for distributed tracing"""
    BOOKING_FLOW = "booking_flow"
    PAYMENT_PROCESSING = "payment_processing"
    AI_DASHBOARD = "ai_dashboard"
    AUTHENTICATION = "authentication"
    SIX_FIGURE_METHODOLOGY = "six_figure_methodology"
    MOBILE_APP = "mobile_app"
    CUSTOMER_SUPPORT = "customer_support"
    BUSINESS_ANALYTICS = "business_analytics"

class AlertSeverity(Enum):
    """Alert severity levels"""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"

class EventType(Enum):
    """Types of events to track"""
    PERFORMANCE = "performance"
    SECURITY = "security"
    BUSINESS = "business"
    SYSTEM = "system"
    USER_BEHAVIOR = "user_behavior"
    ERROR = "error"
    AUDIT = "audit"

@dataclass
class TraceSpan:
    """Distributed trace span"""
    span_id: str
    trace_id: str
    parent_span_id: Optional[str]
    operation_name: str
    start_time: datetime
    end_time: Optional[datetime] = None
    duration_ms: Optional[float] = None
    context: TraceContext = TraceContext.BOOKING_FLOW
    tags: Dict[str, Any] = field(default_factory=dict)
    logs: List[Dict[str, Any]] = field(default_factory=list)
    business_impact: Optional[float] = None
    error: Optional[str] = None
    service_name: str = "6fb-booking"

@dataclass
class AlertRule:
    """Intelligent alert rule definition"""
    rule_id: str
    name: str
    description: str
    condition: str  # Expression to evaluate
    severity: AlertSeverity
    context: TraceContext
    cooldown_minutes: int = 5
    escalation_minutes: int = 15
    business_hours_only: bool = False
    require_correlation: bool = True
    noise_reduction: bool = True
    auto_resolve: bool = True
    tags: Dict[str, str] = field(default_factory=dict)

@dataclass
class ObservabilityEvent:
    """Observability event with business context"""
    event_id: str
    timestamp: datetime
    event_type: EventType
    context: TraceContext
    message: str
    metadata: Dict[str, Any] = field(default_factory=dict)
    trace_id: Optional[str] = None
    span_id: Optional[str] = None
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    correlation_id: Optional[str] = None
    business_impact: Optional[float] = None
    severity: AlertSeverity = AlertSeverity.INFO

@dataclass
class AlertInstance:
    """Active alert instance"""
    alert_id: str
    rule_id: str
    created_at: datetime
    severity: AlertSeverity
    context: TraceContext
    message: str
    count: int = 1
    last_occurrence: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    escalated: bool = False
    metadata: Dict[str, Any] = field(default_factory=dict)

class DistributedTracer:
    """Distributed tracing implementation"""
    
    def __init__(self):
        self.active_spans: Dict[str, TraceSpan] = {}
        self.completed_spans: deque = deque(maxlen=10000)
        self._local = threading.local()
        
    def start_span(self, operation_name: str, context: TraceContext = TraceContext.BOOKING_FLOW, 
                   parent_span: Optional[TraceSpan] = None, **tags) -> TraceSpan:
        """Start a new trace span"""
        span_id = str(uuid.uuid4())[:8]
        
        # Get or create trace ID
        if parent_span:
            trace_id = parent_span.trace_id
            parent_span_id = parent_span.span_id
        else:
            trace_id = str(uuid.uuid4())[:16]
            parent_span_id = None
            
        span = TraceSpan(
            span_id=span_id,
            trace_id=trace_id,
            parent_span_id=parent_span_id,
            operation_name=operation_name,
            start_time=datetime.utcnow(),
            context=context,
            tags=tags
        )
        
        self.active_spans[span_id] = span
        self._set_current_span(span)
        
        logger.info(f"Started span: {operation_name}", extra={
            'trace_id': trace_id,
            'span_id': span_id,
            'business_context': context.value
        })
        
        return span
        
    def finish_span(self, span: TraceSpan, error: Optional[str] = None):
        """Finish a trace span"""
        span.end_time = datetime.utcnow()
        span.duration_ms = (span.end_time - span.start_time).total_seconds() * 1000
        span.error = error
        
        # Move to completed spans
        if span.span_id in self.active_spans:
            del self.active_spans[span.span_id]
        self.completed_spans.append(span)
        
        logger.info(f"Finished span: {span.operation_name}", extra={
            'trace_id': span.trace_id,
            'span_id': span.span_id,
            'duration_ms': span.duration_ms,
            'business_context': span.context.value,
            'error': error
        })
        
    def get_current_span(self) -> Optional[TraceSpan]:
        """Get current active span"""
        return getattr(self._local, 'current_span', None)
        
    def _set_current_span(self, span: TraceSpan):
        """Set current span in thread local storage"""
        self._local.current_span = span
        
    @contextmanager
    def trace(self, operation_name: str, context: TraceContext = TraceContext.BOOKING_FLOW, **tags):
        """Context manager for tracing operations"""
        parent_span = self.get_current_span()
        span = self.start_span(operation_name, context, parent_span, **tags)
        
        try:
            yield span
        except Exception as e:
            self.finish_span(span, error=str(e))
            raise
        else:
            self.finish_span(span)
        finally:
            if parent_span:
                self._set_current_span(parent_span)

class IntelligentAlerting:
    """Intelligent alerting with noise reduction"""
    
    def __init__(self, redis_client: Optional[redis.Redis] = None):
        self.redis_client = redis_client or redis.Redis(host='localhost', port=6379, db=1)
        self.alert_rules: Dict[str, AlertRule] = {}
        self.active_alerts: Dict[str, AlertInstance] = {}
        self.alert_history: deque = deque(maxlen=1000)
        self.correlation_window = timedelta(minutes=10)
        self._initialize_default_rules()
        
    def _initialize_default_rules(self):
        """Initialize default intelligent alert rules"""
        default_rules = [
            # Critical System Alerts
            AlertRule(
                rule_id="critical_error_spike",
                name="Critical Error Rate Spike",
                description="Critical error rate exceeds threshold",
                condition="error_rate > 1.0 AND context IN ['payment_processing', 'six_figure_methodology']",
                severity=AlertSeverity.CRITICAL,
                context=TraceContext.PAYMENT_PROCESSING,
                cooldown_minutes=2,
                escalation_minutes=5,
                require_correlation=True
            ),
            AlertRule(
                rule_id="payment_failure_pattern",
                name="Payment Processing Failure Pattern",
                description="Multiple payment failures detected",
                condition="payment_failures > 5 IN last_10_minutes",
                severity=AlertSeverity.CRITICAL,
                context=TraceContext.PAYMENT_PROCESSING,
                cooldown_minutes=1,
                escalation_minutes=3,
                business_hours_only=False,
                auto_resolve=False
            ),
            AlertRule(
                rule_id="auth_security_breach",
                name="Authentication Security Breach",
                description="Suspicious authentication activity",
                condition="failed_login_attempts > 10 FROM same_ip IN last_5_minutes",
                severity=AlertSeverity.HIGH,
                context=TraceContext.AUTHENTICATION,
                cooldown_minutes=5,
                escalation_minutes=10,
                require_correlation=True
            ),
            
            # Performance Alerts
            AlertRule(
                rule_id="response_time_degradation",
                name="Response Time Degradation",
                description="API response times significantly increased",
                condition="p95_response_time > 2000 AND increase > 50%",
                severity=AlertSeverity.HIGH,
                context=TraceContext.BOOKING_FLOW,
                cooldown_minutes=5,
                escalation_minutes=15,
                noise_reduction=True
            ),
            AlertRule(
                rule_id="ai_dashboard_performance",
                name="AI Dashboard Performance Issues",
                description="AI Dashboard experiencing performance degradation",
                condition="ai_query_time > 10000 OR dashboard_load_time > 5000",
                severity=AlertSeverity.MEDIUM,
                context=TraceContext.AI_DASHBOARD,
                cooldown_minutes=10,
                escalation_minutes=20
            ),
            
            # Business Impact Alerts
            AlertRule(
                rule_id="revenue_impact_detected",
                name="Revenue Impact Detected",
                description="System issues causing measurable revenue impact",
                condition="estimated_revenue_loss > 100 IN last_hour",
                severity=AlertSeverity.CRITICAL,
                context=TraceContext.SIX_FIGURE_METHODOLOGY,
                cooldown_minutes=1,
                escalation_minutes=5,
                business_hours_only=False,
                auto_resolve=False
            ),
            AlertRule(
                rule_id="customer_experience_degradation",
                name="Customer Experience Degradation",
                description="Multiple customer experience issues detected",
                condition="customer_complaints > 3 OR satisfaction_score < 3.0",
                severity=AlertSeverity.MEDIUM,
                context=TraceContext.CUSTOMER_SUPPORT,
                cooldown_minutes=15,
                escalation_minutes=30
            ),
            
            # System Health Alerts
            AlertRule(
                rule_id="dependency_cascade_failure",
                name="Dependency Cascade Failure",
                description="Multiple dependent services failing",
                condition="failing_dependencies > 2 AND impact_score > 50",
                severity=AlertSeverity.HIGH,
                context=TraceContext.SYSTEM,
                cooldown_minutes=3,
                escalation_minutes=10,
                require_correlation=True
            ),
            AlertRule(
                rule_id="resource_exhaustion",
                name="Resource Exhaustion Warning",
                description="System resources approaching limits",
                condition="cpu > 90 OR memory > 95 OR disk > 98",
                severity=AlertSeverity.HIGH,
                context=TraceContext.SYSTEM,
                cooldown_minutes=5,
                escalation_minutes=15
            ),
            
            # Mobile App Alerts
            AlertRule(
                rule_id="mobile_app_crash_spike",
                name="Mobile App Crash Rate Spike",
                description="Mobile app experiencing high crash rates",
                condition="crash_rate > 2.0 IN last_hour",
                severity=AlertSeverity.HIGH,
                context=TraceContext.MOBILE_APP,
                cooldown_minutes=10,
                escalation_minutes=20
            )
        ]
        
        for rule in default_rules:
            self.alert_rules[rule.rule_id] = rule
            
    async def evaluate_alert_conditions(self, event: ObservabilityEvent) -> List[AlertInstance]:
        """Evaluate alert conditions against incoming events"""
        triggered_alerts = []
        
        try:
            for rule_id, rule in self.alert_rules.items():
                if await self._should_evaluate_rule(rule, event):
                    if await self._evaluate_rule_condition(rule, event):
                        # Check if alert is in cooldown
                        if not await self._is_in_cooldown(rule_id):
                            alert = await self._create_or_update_alert(rule, event)
                            if alert:
                                triggered_alerts.append(alert)
                                
        except Exception as e:
            logger.error(f"Failed to evaluate alert conditions: {e}", extra={
                'event_id': event.event_id,
                'correlation_id': event.correlation_id
            })
            
        return triggered_alerts
        
    async def _should_evaluate_rule(self, rule: AlertRule, event: ObservabilityEvent) -> bool:
        """Check if rule should be evaluated for this event"""
        # Check context match
        if rule.context != event.context and rule.context != TraceContext.SYSTEM:
            return False
            
        # Check business hours requirement
        if rule.business_hours_only:
            current_hour = datetime.utcnow().hour
            if not (9 <= current_hour <= 17):  # Business hours 9 AM - 5 PM UTC
                return False
                
        return True
        
    async def _evaluate_rule_condition(self, rule: AlertRule, event: ObservabilityEvent) -> bool:
        """Evaluate rule condition (simplified implementation)"""
        condition = rule.condition.lower()
        
        # This is a simplified condition evaluator
        # In production, you'd use a proper expression parser
        
        if "error_rate >" in condition:
            # Check error rate from recent events
            error_rate = await self._calculate_error_rate(event.context)
            threshold = float(condition.split("error_rate >")[1].split()[0])
            return error_rate > threshold
            
        elif "payment_failures >" in condition:
            # Check payment failures
            failures = await self._count_payment_failures()
            threshold = int(condition.split("payment_failures >")[1].split()[0])
            return failures > threshold
            
        elif "failed_login_attempts >" in condition:
            # Check failed login attempts
            failures = await self._count_failed_logins(event.metadata.get('ip_address'))
            threshold = int(condition.split("failed_login_attempts >")[1].split()[0])
            return failures > threshold
            
        elif "p95_response_time >" in condition:
            # Check response time percentiles
            p95_time = await self._calculate_p95_response_time(event.context)
            threshold = float(condition.split("p95_response_time >")[1].split()[0])
            return p95_time > threshold
            
        elif "estimated_revenue_loss >" in condition:
            # Check revenue impact
            revenue_loss = await self._calculate_revenue_impact()
            threshold = float(condition.split("estimated_revenue_loss >")[1].split()[0])
            return revenue_loss > threshold
            
        elif "cpu >" in condition or "memory >" in condition or "disk >" in condition:
            # Check resource utilization
            return await self._check_resource_thresholds(condition)
            
        elif "crash_rate >" in condition:
            # Check crash rate
            crash_rate = await self._calculate_crash_rate()
            threshold = float(condition.split("crash_rate >")[1].split()[0])
            return crash_rate > threshold
            
        # Default: evaluate based on event severity
        return event.severity in [AlertSeverity.CRITICAL, AlertSeverity.HIGH]
        
    async def _is_in_cooldown(self, rule_id: str) -> bool:
        """Check if alert rule is in cooldown period"""
        try:
            cooldown_key = f"alert_cooldown:{rule_id}"
            return bool(self.redis_client.get(cooldown_key))
        except Exception:
            return False
            
    async def _create_or_update_alert(self, rule: AlertRule, event: ObservabilityEvent) -> Optional[AlertInstance]:
        """Create new alert or update existing one"""
        try:
            # Check for existing alert
            existing_alert = None
            for alert_id, alert in self.active_alerts.items():
                if alert.rule_id == rule.rule_id and not alert.resolved_at:
                    existing_alert = alert
                    break
                    
            if existing_alert:
                # Update existing alert
                existing_alert.count += 1
                existing_alert.last_occurrence = event.timestamp
                
                # Check for escalation
                if not existing_alert.escalated:
                    time_since_created = event.timestamp - existing_alert.created_at
                    if time_since_created.total_seconds() >= rule.escalation_minutes * 60:
                        existing_alert.escalated = True
                        await self._escalate_alert(existing_alert)
                        
                return existing_alert
            else:
                # Create new alert
                alert_id = str(uuid.uuid4())[:12]
                
                alert = AlertInstance(
                    alert_id=alert_id,
                    rule_id=rule.rule_id,
                    created_at=event.timestamp,
                    severity=rule.severity,
                    context=rule.context,
                    message=f"{rule.name}: {rule.description}",
                    metadata={
                        'event_id': event.event_id,
                        'trace_id': event.trace_id,
                        'correlation_id': event.correlation_id,
                        'business_impact': event.business_impact
                    }
                )
                
                self.active_alerts[alert_id] = alert
                
                # Set cooldown
                cooldown_key = f"alert_cooldown:{rule.rule_id}"
                self.redis_client.setex(cooldown_key, rule.cooldown_minutes * 60, "1")
                
                logger.warning(f"Alert triggered: {rule.name}", extra={
                    'alert_id': alert_id,
                    'rule_id': rule.rule_id,
                    'severity': rule.severity.value,
                    'correlation_id': event.correlation_id
                })
                
                return alert
                
        except Exception as e:
            logger.error(f"Failed to create/update alert: {e}")
            return None
            
    async def _escalate_alert(self, alert: AlertInstance):
        """Escalate alert to higher severity"""
        logger.critical(f"Alert escalated: {alert.message}", extra={
            'alert_id': alert.alert_id,
            'rule_id': alert.rule_id,
            'original_severity': alert.severity.value,
            'escalated': True
        })
        
        # In production, this would trigger escalation workflows
        # such as paging oncall engineers, posting to Slack, etc.

class EnhancedObservabilityService:
    """Comprehensive observability service"""
    
    def __init__(self, redis_client: Optional[redis.Redis] = None):
        self.redis_client = redis_client or redis.Redis(host='localhost', port=6379, db=0)
        self.tracer = DistributedTracer()
        self.alerting = IntelligentAlerting(redis_client)
        self.events_buffer: deque = deque(maxlen=10000)
        self.correlation_cache: Dict[str, List[str]] = defaultdict(list)
        self.business_context_cache: Dict[str, Any] = {}
        
    async def record_event(self, event: ObservabilityEvent) -> bool:
        """Record observability event with intelligent processing"""
        try:
            # Add to events buffer
            self.events_buffer.append(event)
            
            # Store in Redis with TTL
            event_key = f"observability_event:{event.event_id}"
            event_data = {
                'timestamp': event.timestamp.isoformat(),
                'event_type': event.event_type.value,
                'context': event.context.value,
                'message': event.message,
                'metadata': json.dumps(event.metadata, default=str),
                'trace_id': event.trace_id,
                'span_id': event.span_id,
                'user_id': event.user_id,
                'session_id': event.session_id,
                'correlation_id': event.correlation_id,
                'business_impact': event.business_impact,
                'severity': event.severity.value
            }
            
            self.redis_client.setex(event_key, 86400, json.dumps(event_data))  # 24h TTL
            
            # Update correlation tracking
            if event.correlation_id:
                self.correlation_cache[event.correlation_id].append(event.event_id)
                
            # Evaluate alert conditions
            triggered_alerts = await self.alerting.evaluate_alert_conditions(event)
            
            # Log with structured format
            logger.info("Observability event recorded", extra={
                'event_id': event.event_id,
                'event_type': event.event_type.value,
                'context': event.context.value,
                'trace_id': event.trace_id,
                'correlation_id': event.correlation_id,
                'business_impact': event.business_impact,
                'alerts_triggered': len(triggered_alerts)
            })
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to record observability event: {e}", extra={
                'event_id': event.event_id if event else 'unknown'
            })
            return False
            
    def trace_operation(self, operation_name: str, context: TraceContext = TraceContext.BOOKING_FLOW, **tags):
        """Decorator for automatic operation tracing"""
        def decorator(func: Callable) -> Callable:
            @wraps(func)
            async def async_wrapper(*args, **kwargs):
                with self.tracer.trace(operation_name, context, **tags) as span:
                    try:
                        # Add function metadata to span
                        span.tags.update({
                            'function': func.__name__,
                            'module': func.__module__,
                            'args_count': len(args),
                            'kwargs_count': len(kwargs)
                        })
                        
                        result = await func(*args, **kwargs)
                        
                        # Record success event
                        await self.record_event(ObservabilityEvent(
                            event_id=str(uuid.uuid4())[:12],
                            timestamp=datetime.utcnow(),
                            event_type=EventType.PERFORMANCE,
                            context=context,
                            message=f"Operation completed: {operation_name}",
                            trace_id=span.trace_id,
                            span_id=span.span_id,
                            metadata={
                                'duration_ms': span.duration_ms,
                                'success': True
                            }
                        ))
                        
                        return result
                        
                    except Exception as e:
                        # Record error event
                        await self.record_event(ObservabilityEvent(
                            event_id=str(uuid.uuid4())[:12],
                            timestamp=datetime.utcnow(),
                            event_type=EventType.ERROR,
                            context=context,
                            message=f"Operation failed: {operation_name}",
                            trace_id=span.trace_id,
                            span_id=span.span_id,
                            severity=AlertSeverity.HIGH,
                            metadata={
                                'error': str(e),
                                'error_type': type(e).__name__,
                                'traceback': traceback.format_exc()
                            }
                        ))
                        raise
                        
            @wraps(func)
            def sync_wrapper(*args, **kwargs):
                with self.tracer.trace(operation_name, context, **tags) as span:
                    try:
                        span.tags.update({
                            'function': func.__name__,
                            'module': func.__module__,
                            'args_count': len(args),
                            'kwargs_count': len(kwargs)
                        })
                        
                        result = func(*args, **kwargs)
                        return result
                        
                    except Exception as e:
                        logger.error(f"Traced operation failed: {operation_name}", extra={
                            'trace_id': span.trace_id,
                            'span_id': span.span_id,
                            'error': str(e)
                        })
                        raise
                        
            # Return appropriate wrapper based on function type
            if asyncio.iscoroutinefunction(func):
                return async_wrapper
            else:
                return sync_wrapper
                
        return decorator
        
    async def get_trace_analytics(self, context: Optional[TraceContext] = None, 
                                 time_window: timedelta = timedelta(hours=1)) -> Dict[str, Any]:
        """Get comprehensive trace analytics"""
        try:
            end_time = datetime.utcnow()
            start_time = end_time - time_window
            
            # Filter spans by context and time
            relevant_spans = [
                span for span in self.tracer.completed_spans
                if (context is None or span.context == context) and
                   span.start_time >= start_time
            ]
            
            if not relevant_spans:
                return {'message': 'No traces found in time window'}
                
            analytics = {
                'time_window': {
                    'start': start_time.isoformat(),
                    'end': end_time.isoformat(),
                    'duration_hours': time_window.total_seconds() / 3600
                },
                'context': context.value if context else 'all',
                'span_analytics': {
                    'total_spans': len(relevant_spans),
                    'unique_operations': len(set(span.operation_name for span in relevant_spans)),
                    'unique_traces': len(set(span.trace_id for span in relevant_spans))
                },
                'performance_metrics': {},
                'error_analysis': {},
                'business_impact': {},
                'top_operations': []
            }
            
            # Performance metrics
            durations = [span.duration_ms for span in relevant_spans if span.duration_ms]
            if durations:
                analytics['performance_metrics'] = {
                    'avg_duration_ms': sum(durations) / len(durations),
                    'min_duration_ms': min(durations),
                    'max_duration_ms': max(durations),
                    'p50_duration_ms': self._calculate_percentile(durations, 50),
                    'p95_duration_ms': self._calculate_percentile(durations, 95),
                    'p99_duration_ms': self._calculate_percentile(durations, 99)
                }
                
            # Error analysis
            error_spans = [span for span in relevant_spans if span.error]
            analytics['error_analysis'] = {
                'total_errors': len(error_spans),
                'error_rate': (len(error_spans) / len(relevant_spans)) * 100 if relevant_spans else 0,
                'error_types': self._analyze_error_types(error_spans)
            }
            
            # Business impact analysis
            business_impacts = [span.business_impact for span in relevant_spans if span.business_impact]
            if business_impacts:
                analytics['business_impact'] = {
                    'total_impact': sum(business_impacts),
                    'avg_impact': sum(business_impacts) / len(business_impacts),
                    'high_impact_operations': [
                        span.operation_name for span in relevant_spans 
                        if span.business_impact and span.business_impact > 5.0
                    ]
                }
                
            # Top operations by frequency and performance
            operation_stats = defaultdict(lambda: {'count': 0, 'total_duration': 0, 'errors': 0})
            for span in relevant_spans:
                op_name = span.operation_name
                operation_stats[op_name]['count'] += 1
                if span.duration_ms:
                    operation_stats[op_name]['total_duration'] += span.duration_ms
                if span.error:
                    operation_stats[op_name]['errors'] += 1
                    
            analytics['top_operations'] = [
                {
                    'operation': op_name,
                    'count': stats['count'],
                    'avg_duration_ms': stats['total_duration'] / stats['count'] if stats['count'] > 0 else 0,
                    'error_rate': (stats['errors'] / stats['count']) * 100 if stats['count'] > 0 else 0
                }
                for op_name, stats in sorted(operation_stats.items(), 
                                           key=lambda x: x[1]['count'], reverse=True)[:10]
            ]
            
            return analytics
            
        except Exception as e:
            logger.error(f"Failed to get trace analytics: {e}")
            return {'error': str(e)}
            
    async def get_alert_dashboard(self) -> Dict[str, Any]:
        """Get comprehensive alert dashboard"""
        try:
            current_time = datetime.utcnow()
            
            # Active alerts by severity
            active_by_severity = defaultdict(int)
            escalated_alerts = []
            recent_alerts = []
            
            for alert in self.alerting.active_alerts.values():
                if not alert.resolved_at:
                    active_by_severity[alert.severity.value] += 1
                    
                    if alert.escalated:
                        escalated_alerts.append(alert)
                        
                    # Recent alerts (last 4 hours)
                    if current_time - alert.created_at <= timedelta(hours=4):
                        recent_alerts.append(alert)
                        
            # Alert trends
            alert_history_24h = [
                alert for alert in self.alerting.alert_history
                if current_time - alert.created_at <= timedelta(hours=24)
            ]
            
            dashboard = {
                'timestamp': current_time.isoformat(),
                'active_alerts': {
                    'total': sum(active_by_severity.values()),
                    'by_severity': dict(active_by_severity),
                    'escalated': len(escalated_alerts)
                },
                'recent_activity': {
                    'last_4_hours': len(recent_alerts),
                    'last_24_hours': len(alert_history_24h)
                },
                'alert_trends': self._calculate_alert_trends(alert_history_24h),
                'top_alert_rules': self._get_top_alert_rules(),
                'business_impact_summary': await self._calculate_alert_business_impact(),
                'system_health_score': await self._calculate_system_health_score(),
                'recommendations': await self._generate_alert_recommendations()
            }
            
            return dashboard
            
        except Exception as e:
            logger.error(f"Failed to get alert dashboard: {e}")
            return {'error': str(e)}
            
    def _calculate_percentile(self, values: List[float], percentile: float) -> float:
        """Calculate percentile value"""
        if not values:
            return 0.0
        sorted_values = sorted(values)
        k = (len(sorted_values) - 1) * (percentile / 100)
        f = int(k)
        c = k - f
        if f == len(sorted_values) - 1:
            return sorted_values[f]
        return sorted_values[f] * (1 - c) + sorted_values[f + 1] * c
        
    def _analyze_error_types(self, error_spans: List[TraceSpan]) -> Dict[str, int]:
        """Analyze error types from spans"""
        error_types = defaultdict(int)
        for span in error_spans:
            if span.error:
                # Extract error type from error message
                error_msg = span.error.lower()
                if 'timeout' in error_msg:
                    error_types['timeout'] += 1
                elif 'connection' in error_msg:
                    error_types['connection'] += 1
                elif 'authentication' in error_msg or 'unauthorized' in error_msg:
                    error_types['authentication'] += 1
                elif 'validation' in error_msg:
                    error_types['validation'] += 1
                elif 'database' in error_msg or 'sql' in error_msg:
                    error_types['database'] += 1
                else:
                    error_types['other'] += 1
        return dict(error_types)
        
    def _calculate_alert_trends(self, alert_history: List[AlertInstance]) -> Dict[str, Any]:
        """Calculate alert trends over time"""
        if not alert_history:
            return {'trend': 'stable', 'change': 0}
            
        # Group by hour
        hourly_counts = defaultdict(int)
        for alert in alert_history:
            hour_key = alert.created_at.replace(minute=0, second=0, microsecond=0)
            hourly_counts[hour_key] += 1
            
        if len(hourly_counts) < 2:
            return {'trend': 'stable', 'change': 0}
            
        sorted_hours = sorted(hourly_counts.keys())
        recent_half = sorted_hours[len(sorted_hours)//2:]
        earlier_half = sorted_hours[:len(sorted_hours)//2]
        
        recent_avg = sum(hourly_counts[h] for h in recent_half) / len(recent_half)
        earlier_avg = sum(hourly_counts[h] for h in earlier_half) / len(earlier_half)
        
        if recent_avg > earlier_avg * 1.2:
            trend = 'increasing'
        elif recent_avg < earlier_avg * 0.8:
            trend = 'decreasing'
        else:
            trend = 'stable'
            
        change = ((recent_avg - earlier_avg) / earlier_avg * 100) if earlier_avg > 0 else 0
        
        return {
            'trend': trend,
            'change': round(change, 2),
            'recent_avg': round(recent_avg, 2),
            'earlier_avg': round(earlier_avg, 2)
        }
        
    def _get_top_alert_rules(self) -> List[Dict[str, Any]]:
        """Get most frequently triggered alert rules"""
        rule_counts = defaultdict(int)
        for alert in self.alerting.active_alerts.values():
            rule_counts[alert.rule_id] += 1
            
        top_rules = []
        for rule_id, count in sorted(rule_counts.items(), key=lambda x: x[1], reverse=True)[:5]:
            rule = self.alerting.alert_rules.get(rule_id)
            if rule:
                top_rules.append({
                    'rule_id': rule_id,
                    'name': rule.name,
                    'count': count,
                    'severity': rule.severity.value,
                    'context': rule.context.value
                })
                
        return top_rules
        
    async def _calculate_alert_business_impact(self) -> Dict[str, Any]:
        """Calculate business impact of current alerts"""
        total_impact = 0.0
        critical_impact = 0.0
        revenue_affecting_alerts = 0
        customer_affecting_alerts = 0
        
        for alert in self.alerting.active_alerts.values():
            if not alert.resolved_at:
                impact = alert.metadata.get('business_impact', 0.0)
                total_impact += impact
                
                if alert.severity == AlertSeverity.CRITICAL:
                    critical_impact += impact
                    
                if alert.context in [TraceContext.PAYMENT_PROCESSING, TraceContext.SIX_FIGURE_METHODOLOGY]:
                    revenue_affecting_alerts += 1
                    
                if alert.context in [TraceContext.CUSTOMER_SUPPORT, TraceContext.BOOKING_FLOW]:
                    customer_affecting_alerts += 1
                    
        return {
            'total_business_impact': round(total_impact, 2),
            'critical_impact': round(critical_impact, 2),
            'revenue_affecting_alerts': revenue_affecting_alerts,
            'customer_affecting_alerts': customer_affecting_alerts,
            'estimated_hourly_loss': round(total_impact * 0.1, 2)  # Simplified calculation
        }
        
    async def _calculate_system_health_score(self) -> Dict[str, Any]:
        """Calculate overall system health score"""
        try:
            # Base score
            health_score = 100.0
            
            # Deduct points for active alerts
            for alert in self.alerting.active_alerts.values():
                if not alert.resolved_at:
                    if alert.severity == AlertSeverity.CRITICAL:
                        health_score -= 15
                    elif alert.severity == AlertSeverity.HIGH:
                        health_score -= 10
                    elif alert.severity == AlertSeverity.MEDIUM:
                        health_score -= 5
                    else:
                        health_score -= 2
                        
            # Consider recent error rates
            recent_events = [
                event for event in self.events_buffer
                if event.timestamp >= datetime.utcnow() - timedelta(minutes=30)
            ]
            
            if recent_events:
                error_events = [e for e in recent_events if e.event_type == EventType.ERROR]
                error_rate = (len(error_events) / len(recent_events)) * 100
                health_score -= error_rate * 2  # Deduct 2 points per % error rate
                
            # Ensure score stays within bounds
            health_score = max(0, min(100, health_score))
            
            # Determine health status
            if health_score >= 95:
                status = 'excellent'
            elif health_score >= 85:
                status = 'good'
            elif health_score >= 70:
                status = 'fair'
            elif health_score >= 50:
                status = 'poor'
            else:
                status = 'critical'
                
            return {
                'score': round(health_score, 1),
                'status': status,
                'calculation_factors': {
                    'active_alerts': len([a for a in self.alerting.active_alerts.values() if not a.resolved_at]),
                    'recent_error_rate': error_rate if 'error_rate' in locals() else 0
                }
            }
            
        except Exception as e:
            logger.error(f"Failed to calculate system health score: {e}")
            return {'score': 0, 'status': 'unknown', 'error': str(e)}
            
    async def _generate_alert_recommendations(self) -> List[Dict[str, Any]]:
        """Generate intelligent recommendations for alert management"""
        recommendations = []
        
        try:
            # Analyze alert patterns
            active_alerts = [a for a in self.alerting.active_alerts.values() if not a.resolved_at]
            
            # Recommendation: Too many low-severity alerts
            low_severity_count = len([a for a in active_alerts if a.severity == AlertSeverity.LOW])
            if low_severity_count > 10:
                recommendations.append({
                    'type': 'alert_noise_reduction',
                    'priority': 'medium',
                    'description': f'Consider tuning {low_severity_count} low-severity alerts to reduce noise',
                    'action': 'Review and adjust alert thresholds or increase cooldown periods'
                })
                
            # Recommendation: Critical alerts requiring attention
            critical_alerts = [a for a in active_alerts if a.severity == AlertSeverity.CRITICAL]
            if critical_alerts:
                recommendations.append({
                    'type': 'critical_attention_required',
                    'priority': 'high',
                    'description': f'{len(critical_alerts)} critical alerts require immediate attention',
                    'action': 'Review and resolve critical issues immediately'
                })
                
            # Recommendation: Recurring alerts
            rule_counts = defaultdict(int)
            for alert in active_alerts:
                rule_counts[alert.rule_id] += 1
                
            recurring_rules = [rule_id for rule_id, count in rule_counts.items() if count > 3]
            if recurring_rules:
                recommendations.append({
                    'type': 'recurring_issues',
                    'priority': 'medium',
                    'description': f'{len(recurring_rules)} alert rules are triggering repeatedly',
                    'action': 'Investigate root causes for recurring alerts'
                })
                
            # Recommendation: Missing business context
            alerts_without_business_impact = len([
                a for a in active_alerts 
                if not a.metadata.get('business_impact')
            ])
            
            if alerts_without_business_impact > 5:
                recommendations.append({
                    'type': 'business_context_missing',
                    'priority': 'low',
                    'description': f'{alerts_without_business_impact} alerts lack business impact context',
                    'action': 'Enhance alerts with business impact metrics'
                })
                
        except Exception as e:
            logger.error(f"Failed to generate alert recommendations: {e}")
            
        return recommendations

# Global service instance
observability_service = EnhancedObservabilityService()

# Convenience functions for easy integration
def trace(operation_name: str, context: TraceContext = TraceContext.BOOKING_FLOW, **tags):
    """Convenience decorator for tracing operations"""
    return observability_service.trace_operation(operation_name, context, **tags)

async def record_performance_event(operation: str, duration_ms: float, context: TraceContext = TraceContext.BOOKING_FLOW, **metadata):
    """Record a performance event"""
    event = ObservabilityEvent(
        event_id=str(uuid.uuid4())[:12],
        timestamp=datetime.utcnow(),
        event_type=EventType.PERFORMANCE,
        context=context,
        message=f"Performance: {operation}",
        metadata={'duration_ms': duration_ms, **metadata}
    )
    return await observability_service.record_event(event)

async def record_business_event(message: str, context: TraceContext = TraceContext.SIX_FIGURE_METHODOLOGY, business_impact: float = 0.0, **metadata):
    """Record a business event"""
    event = ObservabilityEvent(
        event_id=str(uuid.uuid4())[:12],
        timestamp=datetime.utcnow(),
        event_type=EventType.BUSINESS,
        context=context,
        message=message,
        business_impact=business_impact,
        metadata=metadata
    )
    return await observability_service.record_event(event)

async def record_security_event(message: str, severity: AlertSeverity = AlertSeverity.MEDIUM, **metadata):
    """Record a security event"""
    event = ObservabilityEvent(
        event_id=str(uuid.uuid4())[:12],
        timestamp=datetime.utcnow(),
        event_type=EventType.SECURITY,
        context=TraceContext.AUTHENTICATION,
        message=message,
        severity=severity,
        metadata=metadata
    )
    return await observability_service.record_event(event)