"""
Comprehensive Observability Service
Provides metrics collection, distributed tracing, and system observability for 99.99% uptime
"""

import asyncio
import logging
import time
import json
import uuid
from typing import Dict, List, Any, Optional, Union
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from contextlib import asynccontextmanager
from collections import defaultdict, deque
import threading

from services.redis_service import cache_service


@dataclass
class Metric:
    name: str
    value: Union[int, float]
    labels: Dict[str, str] = field(default_factory=dict)
    timestamp: datetime = field(default_factory=datetime.utcnow)
    metric_type: str = "gauge"  # gauge, counter, histogram, summary


@dataclass
class Span:
    trace_id: str
    span_id: str
    parent_span_id: Optional[str]
    operation_name: str
    start_time: datetime
    end_time: Optional[datetime] = None
    duration_ms: Optional[float] = None
    tags: Dict[str, Any] = field(default_factory=dict)
    logs: List[Dict[str, Any]] = field(default_factory=list)
    status: str = "ok"  # ok, error, timeout


@dataclass
class TraceContext:
    trace_id: str
    span_id: str
    parent_span_id: Optional[str] = None


class ObservabilityService:
    """
    Comprehensive observability service providing:
    - Metrics collection and aggregation
    - Distributed tracing
    - Performance monitoring
    - SLA tracking
    - Custom dashboards data
    """
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        
        # Metrics storage
        self.metrics_buffer: deque = deque(maxlen=10000)
        self.metrics_aggregates: Dict[str, Dict] = defaultdict(dict)
        
        # Tracing storage
        self.active_spans: Dict[str, Span] = {}
        self.completed_traces: deque = deque(maxlen=1000)
        
        # Performance tracking
        self.response_times: Dict[str, deque] = defaultdict(lambda: deque(maxlen=1000))
        self.error_counts: Dict[str, int] = defaultdict(int)
        self.request_counts: Dict[str, int] = defaultdict(int)
        
        # SLA metrics
        self.sla_metrics = {
            "uptime_percentage": 100.0,
            "error_rate": 0.0,
            "p95_response_time": 0.0,
            "p99_response_time": 0.0,
            "incidents_24h": 0,
            "mttr_minutes": 0.0
        }
        
        # Background tasks
        self._metrics_flush_task = None
        self._aggregation_task = None
        
        self.logger.info("📊 Observability Service initialized")
    
    async def start(self):
        """Start observability background tasks"""
        try:
            self._metrics_flush_task = asyncio.create_task(self._metrics_flush_loop())
            self._aggregation_task = asyncio.create_task(self._aggregation_loop())
            
            self.logger.info("✅ Observability background tasks started")
            
        except Exception as e:
            self.logger.error(f"❌ Failed to start observability tasks: {e}")
    
    async def stop(self):
        """Stop observability background tasks"""
        if self._metrics_flush_task:
            self._metrics_flush_task.cancel()
        if self._aggregation_task:
            self._aggregation_task.cancel()
        
        self.logger.info("⏹️ Observability service stopped")
    
    # Metrics Collection
    def record_metric(self, name: str, value: Union[int, float], 
                     labels: Optional[Dict[str, str]] = None, 
                     metric_type: str = "gauge"):
        """Record a metric value"""
        metric = Metric(
            name=name,
            value=value,
            labels=labels or {},
            metric_type=metric_type
        )
        
        self.metrics_buffer.append(metric)
        
        # Real-time aggregation for critical metrics
        if name in ["request_duration", "error_rate", "cpu_usage", "memory_usage"]:
            self._update_real_time_aggregates(metric)
    
    def increment_counter(self, name: str, labels: Optional[Dict[str, str]] = None, 
                         amount: int = 1):
        """Increment a counter metric"""
        self.record_metric(name, amount, labels, "counter")
    
    def record_histogram(self, name: str, value: float, 
                        labels: Optional[Dict[str, str]] = None):
        """Record a histogram value (for latencies, sizes, etc.)"""
        self.record_metric(name, value, labels, "histogram")
        
        # Store for percentile calculations
        key = f"{name}:{json.dumps(labels or {}, sort_keys=True)}"
        self.response_times[key].append(value)
    
    def record_request(self, endpoint: str, method: str, status_code: int, 
                      duration_ms: float, user_id: Optional[str] = None):
        """Record HTTP request metrics"""
        labels = {
            "endpoint": endpoint,
            "method": method,
            "status": str(status_code),
            "status_class": f"{status_code // 100}xx"
        }
        
        if user_id:
            labels["user_type"] = "authenticated"
        else:
            labels["user_type"] = "anonymous"
        
        # Record metrics
        self.increment_counter("http_requests_total", labels)
        self.record_histogram("http_request_duration_ms", duration_ms, labels)
        
        # Track for SLA calculations
        self.request_counts[endpoint] += 1
        if status_code >= 400:
            self.error_counts[endpoint] += 1
        
        # Store response time for percentiles
        self.response_times[endpoint].append(duration_ms)
    
    def record_business_metric(self, metric_name: str, value: Union[int, float], 
                              context: Optional[Dict[str, str]] = None):
        """Record Six Figure Barber business metrics"""
        labels = context or {}
        labels["business_metric"] = "true"
        
        self.record_metric(f"sixfb_{metric_name}", value, labels, "gauge")
        
        # Store in Redis for dashboard access
        try:
            cache_key = f"business_metric:{metric_name}"
            metric_data = {
                "value": value,
                "context": context,
                "timestamp": datetime.utcnow().isoformat()
            }
            cache_service.set(cache_key, json.dumps(metric_data), ttl=3600)
        except Exception as e:
            self.logger.error(f"❌ Failed to cache business metric: {e}")
    
    # Distributed Tracing
    def start_trace(self, operation_name: str, 
                   parent_context: Optional[TraceContext] = None) -> TraceContext:
        """Start a new trace or span"""
        trace_id = parent_context.trace_id if parent_context else str(uuid.uuid4())
        span_id = str(uuid.uuid4())
        parent_span_id = parent_context.span_id if parent_context else None
        
        span = Span(
            trace_id=trace_id,
            span_id=span_id,
            parent_span_id=parent_span_id,
            operation_name=operation_name,
            start_time=datetime.utcnow()
        )
        
        self.active_spans[span_id] = span
        
        return TraceContext(trace_id, span_id, parent_span_id)
    
    def finish_span(self, context: TraceContext, status: str = "ok", 
                   tags: Optional[Dict[str, Any]] = None):
        """Finish a span"""
        if context.span_id in self.active_spans:
            span = self.active_spans[context.span_id]
            span.end_time = datetime.utcnow()
            span.duration_ms = (span.end_time - span.start_time).total_seconds() * 1000
            span.status = status
            
            if tags:
                span.tags.update(tags)
            
            # Move to completed traces
            self.completed_traces.append(span)
            del self.active_spans[context.span_id]
            
            # Record metrics
            self.record_histogram(
                "trace_duration_ms",
                span.duration_ms,
                {"operation": span.operation_name, "status": status}
            )
    
    def add_span_log(self, context: TraceContext, message: str, 
                    level: str = "info", fields: Optional[Dict[str, Any]] = None):
        """Add a log entry to a span"""
        if context.span_id in self.active_spans:
            span = self.active_spans[context.span_id]
            span.logs.append({
                "timestamp": datetime.utcnow().isoformat(),
                "level": level,
                "message": message,
                "fields": fields or {}
            })
    
    @asynccontextmanager
    async def trace_async(self, operation_name: str, 
                         parent_context: Optional[TraceContext] = None):
        """Async context manager for tracing"""
        context = self.start_trace(operation_name, parent_context)
        try:
            yield context
            self.finish_span(context, "ok")
        except Exception as e:
            self.finish_span(context, "error", {"error": str(e)})
            raise
    
    # Performance Monitoring
    def calculate_percentiles(self, values: List[float]) -> Dict[str, float]:
        """Calculate percentiles for a list of values"""
        if not values:
            return {"p50": 0, "p90": 0, "p95": 0, "p99": 0}
        
        sorted_values = sorted(values)
        length = len(sorted_values)
        
        return {
            "p50": sorted_values[int(length * 0.5)],
            "p90": sorted_values[int(length * 0.9)],
            "p95": sorted_values[int(length * 0.95)],
            "p99": sorted_values[int(length * 0.99)]
        }
    
    def get_endpoint_performance(self, endpoint: str) -> Dict[str, Any]:
        """Get performance metrics for a specific endpoint"""
        response_times = list(self.response_times[endpoint])
        request_count = self.request_counts[endpoint]
        error_count = self.error_counts[endpoint]
        
        percentiles = self.calculate_percentiles(response_times)
        
        return {
            "endpoint": endpoint,
            "request_count": request_count,
            "error_count": error_count,
            "error_rate": error_count / max(request_count, 1),
            "avg_response_time": sum(response_times) / max(len(response_times), 1),
            "percentiles": percentiles,
            "last_updated": datetime.utcnow().isoformat()
        }
    
    def get_system_performance(self) -> Dict[str, Any]:
        """Get overall system performance metrics"""
        all_response_times = []
        total_requests = 0
        total_errors = 0
        
        for endpoint, times in self.response_times.items():
            all_response_times.extend(times)
        
        for endpoint, count in self.request_counts.items():
            total_requests += count
            total_errors += self.error_counts[endpoint]
        
        percentiles = self.calculate_percentiles(all_response_times)
        
        return {
            "total_requests": total_requests,
            "total_errors": total_errors,
            "overall_error_rate": total_errors / max(total_requests, 1),
            "avg_response_time": sum(all_response_times) / max(len(all_response_times), 1),
            "percentiles": percentiles,
            "active_spans": len(self.active_spans),
            "completed_traces": len(self.completed_traces),
            "last_updated": datetime.utcnow().isoformat()
        }
    
    # SLA Tracking
    def update_sla_metrics(self):
        """Update SLA metrics based on current data"""
        try:
            # Calculate uptime percentage
            total_requests = sum(self.request_counts.values())
            total_errors = sum(self.error_counts.values())
            
            if total_requests > 0:
                error_rate = total_errors / total_requests
                uptime = (1 - error_rate) * 100
                self.sla_metrics["uptime_percentage"] = uptime
                self.sla_metrics["error_rate"] = error_rate
            
            # Calculate response time percentiles
            all_response_times = []
            for times in self.response_times.values():
                all_response_times.extend(times)
            
            if all_response_times:
                percentiles = self.calculate_percentiles(all_response_times)
                self.sla_metrics["p95_response_time"] = percentiles["p95"]
                self.sla_metrics["p99_response_time"] = percentiles["p99"]
            
            # Store in Redis for dashboard
            cache_service.set("sla_metrics", json.dumps(self.sla_metrics), ttl=300)
            
        except Exception as e:
            self.logger.error(f"❌ Failed to update SLA metrics: {e}")
    
    # Dashboard Data
    def get_dashboard_data(self) -> Dict[str, Any]:
        """Get comprehensive data for observability dashboard"""
        return {
            "system_performance": self.get_system_performance(),
            "sla_metrics": self.sla_metrics,
            "top_endpoints": self._get_top_endpoints(),
            "error_breakdown": self._get_error_breakdown(),
            "recent_traces": self._get_recent_traces(),
            "metrics_summary": self._get_metrics_summary(),
            "timestamp": datetime.utcnow().isoformat()
        }
    
    def _get_top_endpoints(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get top endpoints by request count"""
        endpoint_data = [
            self.get_endpoint_performance(endpoint)
            for endpoint in self.request_counts.keys()
        ]
        
        return sorted(endpoint_data, key=lambda x: x["request_count"], reverse=True)[:limit]
    
    def _get_error_breakdown(self) -> Dict[str, Any]:
        """Get error breakdown by endpoint and type"""
        return {
            "by_endpoint": {
                endpoint: self.error_counts[endpoint]
                for endpoint in sorted(self.error_counts.keys(), 
                                     key=lambda x: self.error_counts[x], reverse=True)[:10]
            },
            "total_errors": sum(self.error_counts.values()),
            "error_rate": sum(self.error_counts.values()) / max(sum(self.request_counts.values()), 1)
        }
    
    def _get_recent_traces(self, limit: int = 20) -> List[Dict[str, Any]]:
        """Get recent completed traces"""
        recent_traces = list(self.completed_traces)[-limit:]
        
        return [
            {
                "trace_id": trace.trace_id,
                "operation": trace.operation_name,
                "duration_ms": trace.duration_ms,
                "status": trace.status,
                "start_time": trace.start_time.isoformat(),
                "tags": trace.tags
            }
            for trace in recent_traces
        ]
    
    def _get_metrics_summary(self) -> Dict[str, Any]:
        """Get summary of collected metrics"""
        return {
            "metrics_in_buffer": len(self.metrics_buffer),
            "active_spans": len(self.active_spans),
            "completed_traces": len(self.completed_traces),
            "tracked_endpoints": len(self.request_counts),
            "last_metric_time": self.metrics_buffer[-1].timestamp.isoformat() if self.metrics_buffer else None
        }
    
    # Background Tasks
    async def _metrics_flush_loop(self):
        """Flush metrics to storage periodically"""
        while True:
            try:
                await self._flush_metrics()
                await asyncio.sleep(60)  # Flush every minute
            except Exception as e:
                self.logger.error(f"❌ Metrics flush error: {e}")
                await asyncio.sleep(60)
    
    async def _flush_metrics(self):
        """Flush metrics buffer to Redis"""
        if not self.metrics_buffer:
            return
        
        try:
            # Prepare metrics for storage
            metrics_data = []
            
            # Drain the buffer
            while self.metrics_buffer:
                metric = self.metrics_buffer.popleft()
                metrics_data.append({
                    "name": metric.name,
                    "value": metric.value,
                    "labels": metric.labels,
                    "timestamp": metric.timestamp.isoformat(),
                    "type": metric.metric_type
                })
            
            if metrics_data:
                # Store in Redis with timestamp-based key
                timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M")
                cache_key = f"metrics_batch:{timestamp}"
                
                cache_service.set(cache_key, json.dumps(metrics_data), ttl=86400)
                
                self.logger.debug(f"📊 Flushed {len(metrics_data)} metrics to storage")
        
        except Exception as e:
            self.logger.error(f"❌ Failed to flush metrics: {e}")
    
    async def _aggregation_loop(self):
        """Update aggregations and SLA metrics periodically"""
        while True:
            try:
                self.update_sla_metrics()
                await self._update_dashboard_cache()
                await asyncio.sleep(30)  # Update every 30 seconds
            except Exception as e:
                self.logger.error(f"❌ Aggregation error: {e}")
                await asyncio.sleep(30)
    
    async def _update_dashboard_cache(self):
        """Update dashboard data cache"""
        try:
            dashboard_data = self.get_dashboard_data()
            cache_service.set("observability_dashboard", json.dumps(dashboard_data), ttl=60)
        except Exception as e:
            self.logger.error(f"❌ Failed to update dashboard cache: {e}")
    
    def _update_real_time_aggregates(self, metric: Metric):
        """Update real-time metric aggregates"""
        key = f"{metric.name}:{json.dumps(metric.labels, sort_keys=True)}"
        
        if key not in self.metrics_aggregates:
            self.metrics_aggregates[key] = {
                "sum": 0,
                "count": 0,
                "min": float('inf'),
                "max": float('-inf'),
                "last_value": 0
            }
        
        agg = self.metrics_aggregates[key]
        agg["sum"] += metric.value
        agg["count"] += 1
        agg["min"] = min(agg["min"], metric.value)
        agg["max"] = max(agg["max"], metric.value)
        agg["last_value"] = metric.value
    
    # API for external access
    def get_metric_value(self, name: str, labels: Optional[Dict[str, str]] = None) -> Optional[float]:
        """Get current value of a specific metric"""
        key = f"{name}:{json.dumps(labels or {}, sort_keys=True)}"
        agg = self.metrics_aggregates.get(key)
        return agg["last_value"] if agg else None
    
    def health_check(self) -> Dict[str, Any]:
        """Health check for observability service"""
        return {
            "status": "healthy",
            "metrics_buffer_size": len(self.metrics_buffer),
            "active_spans": len(self.active_spans),
            "background_tasks_running": bool(self._metrics_flush_task and self._aggregation_task),
            "last_check": datetime.utcnow().isoformat()
        }


# Global observability service instance
observability_service = ObservabilityService()


# Decorator for automatic tracing
def trace_calls(operation_name: str = None):
    """Decorator to automatically trace function calls"""
    def decorator(func):
        async def async_wrapper(*args, **kwargs):
            op_name = operation_name or f"{func.__module__}.{func.__name__}"
            async with observability_service.trace_async(op_name) as context:
                try:
                    result = await func(*args, **kwargs)
                    observability_service.add_span_log(
                        context, f"Function {func.__name__} completed successfully"
                    )
                    return result
                except Exception as e:
                    observability_service.add_span_log(
                        context, f"Function {func.__name__} failed: {str(e)}", "error"
                    )
                    raise
        
        def sync_wrapper(*args, **kwargs):
            op_name = operation_name or f"{func.__module__}.{func.__name__}"
            context = observability_service.start_trace(op_name)
            try:
                result = func(*args, **kwargs)
                observability_service.finish_span(context, "ok")
                return result
            except Exception as e:
                observability_service.finish_span(context, "error", {"error": str(e)})
                raise
        
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    
    return decorator