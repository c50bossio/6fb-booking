"""
Performance Monitoring Middleware for 6FB Booking System
Request tracking, load monitoring, and performance analytics
"""
import time
import logging
import asyncio
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
from collections import defaultdict, deque
from dataclasses import dataclass, asdict
import json
import uuid
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from starlette.types import ASGIApp
import psutil

logger = logging.getLogger(__name__)

@dataclass
class RequestMetrics:
    """Individual request metrics"""
    request_id: str
    method: str
    path: str
    status_code: int
    response_time_ms: float
    request_size_bytes: int
    response_size_bytes: int
    user_agent: str
    client_ip: str
    timestamp: datetime
    user_id: Optional[str] = None
    endpoint_category: Optional[str] = None
    cache_hit: bool = False
    database_queries: int = 0
    database_query_time_ms: float = 0
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization"""
        return {
            'request_id': self.request_id,
            'method': self.method,
            'path': self.path,
            'status_code': self.status_code,
            'response_time_ms': self.response_time_ms,
            'request_size_bytes': self.request_size_bytes,
            'response_size_bytes': self.response_size_bytes,
            'user_agent': self.user_agent,
            'client_ip': self.client_ip,
            'timestamp': self.timestamp.isoformat(),
            'user_id': self.user_id,
            'endpoint_category': self.endpoint_category,
            'cache_hit': self.cache_hit,
            'database_queries': self.database_queries,
            'database_query_time_ms': self.database_query_time_ms
        }

@dataclass
class EndpointStats:
    """Endpoint performance statistics"""
    path: str
    method: str
    total_requests: int = 0
    successful_requests: int = 0
    failed_requests: int = 0
    avg_response_time: float = 0
    min_response_time: float = float('inf')
    max_response_time: float = 0
    p95_response_time: float = 0
    total_bytes_sent: int = 0
    total_bytes_received: int = 0
    last_request: Optional[datetime] = None
    
    def update(self, metrics: RequestMetrics):
        """Update stats with new request metrics"""
        self.total_requests += 1
        self.last_request = metrics.timestamp
        
        if 200 <= metrics.status_code < 400:
            self.successful_requests += 1
        else:
            self.failed_requests += 1
        
        # Update response time stats
        self.avg_response_time = (
            (self.avg_response_time * (self.total_requests - 1) + metrics.response_time_ms) 
            / self.total_requests
        )
        self.min_response_time = min(self.min_response_time, metrics.response_time_ms)
        self.max_response_time = max(self.max_response_time, metrics.response_time_ms)
        
        # Update byte counts
        self.total_bytes_sent += metrics.response_size_bytes
        self.total_bytes_received += metrics.request_size_bytes
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            'path': self.path,
            'method': self.method,
            'total_requests': self.total_requests,
            'successful_requests': self.successful_requests,
            'failed_requests': self.failed_requests,
            'success_rate': (self.successful_requests / max(1, self.total_requests)) * 100,
            'avg_response_time': round(self.avg_response_time, 2),
            'min_response_time': self.min_response_time if self.min_response_time != float('inf') else 0,
            'max_response_time': self.max_response_time,
            'p95_response_time': self.p95_response_time,
            'total_bytes_sent': self.total_bytes_sent,
            'total_bytes_received': self.total_bytes_received,
            'last_request': self.last_request.isoformat() if self.last_request else None
        }

class LoadMonitor:
    """Monitor system load and performance"""
    
    def __init__(self):
        self.start_time = time.time()
        self.request_counts = defaultdict(int)  # requests per minute
        self.response_times = deque(maxlen=1000)  # last 1000 response times
        self.active_requests = 0
        self.peak_active_requests = 0
        self.total_requests = 0
        self.total_errors = 0
        
        # System metrics
        self.cpu_usage_history = deque(maxlen=60)  # last 60 readings
        self.memory_usage_history = deque(maxlen=60)
        
        # Request rate limiting
        self.requests_per_second = deque(maxlen=60)  # last 60 seconds
        self.current_second = int(time.time())
        self.current_second_count = 0
    
    def record_request_start(self):
        """Record request start"""
        self.active_requests += 1
        self.peak_active_requests = max(self.peak_active_requests, self.active_requests)
        self.total_requests += 1
        
        # Update requests per second
        current_second = int(time.time())
        if current_second != self.current_second:
            self.requests_per_second.append(self.current_second_count)
            self.current_second = current_second
            self.current_second_count = 1
        else:
            self.current_second_count += 1
    
    def record_request_end(self, response_time: float, is_error: bool = False):
        """Record request completion"""
        self.active_requests = max(0, self.active_requests - 1)
        self.response_times.append(response_time)
        
        if is_error:
            self.total_errors += 1
        
        # Record in time bucket (per minute)
        minute_key = int(time.time() // 60)
        self.request_counts[minute_key] += 1
        
        # Clean old minute buckets (keep last 60 minutes)
        cutoff_time = minute_key - 60
        keys_to_remove = [k for k in self.request_counts.keys() if k < cutoff_time]
        for key in keys_to_remove:
            del self.request_counts[key]
    
    def update_system_metrics(self):
        """Update system performance metrics"""
        try:
            cpu_percent = psutil.cpu_percent(interval=None)
            memory_percent = psutil.virtual_memory().percent
            
            self.cpu_usage_history.append(cpu_percent)
            self.memory_usage_history.append(memory_percent)
            
        except Exception as e:
            logger.error(f"Error updating system metrics: {str(e)}")
    
    def get_current_load(self) -> Dict[str, Any]:
        """Get current system load metrics"""
        current_time = time.time()
        uptime = current_time - self.start_time
        
        # Calculate requests per minute
        current_minute = int(current_time // 60)
        requests_last_minute = sum(
            count for minute, count in self.request_counts.items()
            if minute >= current_minute - 1
        )
        
        # Calculate average response time
        avg_response_time = (
            sum(self.response_times) / len(self.response_times)
            if self.response_times else 0
        )
        
        # Calculate p95 response time
        if self.response_times:
            sorted_times = sorted(self.response_times)
            p95_index = int(len(sorted_times) * 0.95)
            p95_response_time = sorted_times[p95_index] if p95_index < len(sorted_times) else avg_response_time
        else:
            p95_response_time = 0
        
        # Calculate error rate
        error_rate = (self.total_errors / max(1, self.total_requests)) * 100
        
        # Current requests per second
        current_rps = sum(self.requests_per_second) / max(1, len(self.requests_per_second))
        
        return {
            'uptime_seconds': uptime,
            'active_requests': self.active_requests,
            'peak_active_requests': self.peak_active_requests,
            'total_requests': self.total_requests,
            'total_errors': self.total_errors,
            'error_rate_percent': round(error_rate, 2),
            'requests_per_minute': requests_last_minute,
            'requests_per_second': round(current_rps, 2),
            'avg_response_time_ms': round(avg_response_time, 2),
            'p95_response_time_ms': round(p95_response_time, 2),
            'cpu_usage_percent': self.cpu_usage_history[-1] if self.cpu_usage_history else 0,
            'memory_usage_percent': self.memory_usage_history[-1] if self.memory_usage_history else 0,
            'timestamp': datetime.utcnow().isoformat()
        }
    
    def get_performance_trends(self) -> Dict[str, Any]:
        """Get performance trends over time"""
        return {
            'cpu_usage_trend': list(self.cpu_usage_history),
            'memory_usage_trend': list(self.memory_usage_history),
            'response_time_trend': list(self.response_times)[-60:],  # last 60 response times
            'requests_per_second_trend': list(self.requests_per_second),
            'timestamp': datetime.utcnow().isoformat()
        }


class PerformanceMetricsCollector:
    """Collect and store performance metrics"""
    
    def __init__(self, max_stored_requests: int = 10000):
        self.max_stored_requests = max_stored_requests
        self.request_history: deque = deque(maxlen=max_stored_requests)
        self.endpoint_stats: Dict[str, EndpointStats] = {}
        self.load_monitor = LoadMonitor()
        
        # Categorize endpoints
        self.endpoint_categories = {
            '/api/v1/auth': 'authentication',
            '/api/v1/appointments': 'appointments',
            '/api/v1/bookings': 'bookings',
            '/api/v1/payments': 'payments',
            '/api/v1/analytics': 'analytics',
            '/api/v1/users': 'users',
            '/api/v1/barbers': 'barbers',
            '/health': 'system',
            '/docs': 'documentation',
            '/ws': 'websocket'
        }
    
    def categorize_endpoint(self, path: str) -> str:
        """Categorize endpoint based on path"""
        for prefix, category in self.endpoint_categories.items():
            if path.startswith(prefix):
                return category
        return 'other'
    
    def record_request(self, metrics: RequestMetrics):
        """Record request metrics"""
        # Store in history
        self.request_history.append(metrics)
        
        # Update endpoint stats
        endpoint_key = f"{metrics.method}:{metrics.path}"
        if endpoint_key not in self.endpoint_stats:
            self.endpoint_stats[endpoint_key] = EndpointStats(
                path=metrics.path,
                method=metrics.method
            )
        
        self.endpoint_stats[endpoint_key].update(metrics)
        
        # Update load monitor
        self.load_monitor.record_request_end(
            metrics.response_time_ms,
            metrics.status_code >= 400
        )
    
    def get_endpoint_performance(self, limit: int = 20) -> List[Dict[str, Any]]:
        """Get top performing/worst performing endpoints"""
        sorted_endpoints = sorted(
            self.endpoint_stats.values(),
            key=lambda x: x.total_requests,
            reverse=True
        )
        
        return [endpoint.to_dict() for endpoint in sorted_endpoints[:limit]]
    
    def get_slow_endpoints(self, threshold_ms: float = 1000, limit: int = 10) -> List[Dict[str, Any]]:
        """Get slowest endpoints"""
        slow_endpoints = [
            endpoint for endpoint in self.endpoint_stats.values()
            if endpoint.avg_response_time > threshold_ms
        ]
        
        slow_endpoints.sort(key=lambda x: x.avg_response_time, reverse=True)
        return [endpoint.to_dict() for endpoint in slow_endpoints[:limit]]
    
    def get_error_prone_endpoints(self, min_requests: int = 10, limit: int = 10) -> List[Dict[str, Any]]:
        """Get endpoints with highest error rates"""
        error_endpoints = []
        
        for endpoint in self.endpoint_stats.values():
            if endpoint.total_requests >= min_requests:
                error_rate = (endpoint.failed_requests / endpoint.total_requests) * 100
                if error_rate > 0:
                    endpoint_dict = endpoint.to_dict()
                    endpoint_dict['error_rate'] = error_rate
                    error_endpoints.append(endpoint_dict)
        
        error_endpoints.sort(key=lambda x: x['error_rate'], reverse=True)
        return error_endpoints[:limit]
    
    def get_category_performance(self) -> Dict[str, Any]:
        """Get performance metrics by endpoint category"""
        category_stats = defaultdict(lambda: {
            'total_requests': 0,
            'total_response_time': 0,
            'total_errors': 0,
            'endpoints': []
        })
        
        for endpoint in self.endpoint_stats.values():
            category = self.categorize_endpoint(endpoint.path)
            stats = category_stats[category]
            
            stats['total_requests'] += endpoint.total_requests
            stats['total_response_time'] += endpoint.avg_response_time * endpoint.total_requests
            stats['total_errors'] += endpoint.failed_requests
            stats['endpoints'].append(endpoint.path)
        
        # Calculate averages
        result = {}
        for category, stats in category_stats.items():
            if stats['total_requests'] > 0:
                result[category] = {
                    'total_requests': stats['total_requests'],
                    'avg_response_time': stats['total_response_time'] / stats['total_requests'],
                    'error_rate': (stats['total_errors'] / stats['total_requests']) * 100,
                    'unique_endpoints': len(set(stats['endpoints']))
                }
        
        return result
    
    def get_time_series_data(self, hours: int = 24) -> Dict[str, Any]:
        """Get time series performance data"""
        cutoff_time = datetime.utcnow() - timedelta(hours=hours)
        
        # Filter recent requests
        recent_requests = [
            req for req in self.request_history
            if req.timestamp >= cutoff_time
        ]
        
        # Group by hour
        hourly_stats = defaultdict(lambda: {
            'requests': 0,
            'errors': 0,
            'total_response_time': 0,
            'response_times': []
        })
        
        for request in recent_requests:
            hour_key = request.timestamp.replace(minute=0, second=0, microsecond=0)
            stats = hourly_stats[hour_key]
            
            stats['requests'] += 1
            if request.status_code >= 400:
                stats['errors'] += 1
            stats['total_response_time'] += request.response_time_ms
            stats['response_times'].append(request.response_time_ms)
        
        # Convert to time series
        time_series = []
        for hour, stats in sorted(hourly_stats.items()):
            avg_response_time = (
                stats['total_response_time'] / stats['requests']
                if stats['requests'] > 0 else 0
            )
            
            error_rate = (stats['errors'] / stats['requests'] * 100) if stats['requests'] > 0 else 0
            
            # Calculate p95
            if stats['response_times']:
                sorted_times = sorted(stats['response_times'])
                p95_index = int(len(sorted_times) * 0.95)
                p95_response_time = sorted_times[p95_index] if p95_index < len(sorted_times) else avg_response_time
            else:
                p95_response_time = 0
            
            time_series.append({
                'timestamp': hour.isoformat(),
                'requests': stats['requests'],
                'error_rate': round(error_rate, 2),
                'avg_response_time': round(avg_response_time, 2),
                'p95_response_time': round(p95_response_time, 2)
            })
        
        return {
            'hours': hours,
            'data_points': len(time_series),
            'time_series': time_series,
            'summary': {
                'total_requests': len(recent_requests),
                'total_errors': sum(1 for req in recent_requests if req.status_code >= 400),
                'avg_response_time': sum(req.response_time_ms for req in recent_requests) / len(recent_requests) if recent_requests else 0
            }
        }


class PerformanceMonitoringMiddleware(BaseHTTPMiddleware):
    """Middleware for comprehensive performance monitoring"""
    
    def __init__(self, app: ASGIApp, enable_detailed_logging: bool = False):
        super().__init__(app)
        self.enable_detailed_logging = enable_detailed_logging
        self.metrics_collector = PerformanceMetricsCollector()
        
        # Start background task for system metrics
        asyncio.create_task(self._background_system_monitoring())
    
    async def dispatch(self, request: Request, call_next) -> Response:
        """Process request and collect metrics"""
        # Generate request ID
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        
        # Record request start
        start_time = time.time()
        self.metrics_collector.load_monitor.record_request_start()
        
        try:
            # Get request size
            request_size = 0
            if hasattr(request, 'body'):
                try:
                    body = await request.body()
                    request_size = len(body) if body else 0
                except Exception:
                    request_size = 0
            
            # Process request
            response = await call_next(request)
            
            # Calculate response time
            response_time_ms = (time.time() - start_time) * 1000
            
            # Get response size
            response_size = 0
            if hasattr(response, 'headers') and 'content-length' in response.headers:
                try:
                    response_size = int(response.headers['content-length'])
                except (ValueError, KeyError):
                    response_size = 0
            
            # Extract user info (if available)
            user_id = getattr(request.state, 'user_id', None)
            
            # Create metrics
            metrics = RequestMetrics(
                request_id=request_id,
                method=request.method,
                path=request.url.path,
                status_code=response.status_code,
                response_time_ms=response_time_ms,
                request_size_bytes=request_size,
                response_size_bytes=response_size,
                user_agent=request.headers.get('user-agent', ''),
                client_ip=self._get_client_ip(request),
                timestamp=datetime.utcnow(),
                user_id=str(user_id) if user_id else None,
                endpoint_category=self.metrics_collector.categorize_endpoint(request.url.path),
                cache_hit=response.headers.get('x-cache-status') == 'hit',
                database_queries=getattr(request.state, 'db_queries', 0),
                database_query_time_ms=getattr(request.state, 'db_query_time', 0)
            )
            
            # Record metrics
            self.metrics_collector.record_request(metrics)
            
            # Add performance headers
            response.headers['X-Request-ID'] = request_id
            response.headers['X-Response-Time'] = f"{response_time_ms:.2f}ms"
            
            # Detailed logging for slow requests
            if self.enable_detailed_logging and response_time_ms > 1000:
                logger.warning(
                    f"Slow request: {request.method} {request.url.path} "
                    f"took {response_time_ms:.2f}ms (Request ID: {request_id})"
                )
            
            return response
            
        except Exception as e:
            # Record error metrics
            response_time_ms = (time.time() - start_time) * 1000
            
            error_metrics = RequestMetrics(
                request_id=request_id,
                method=request.method,
                path=request.url.path,
                status_code=500,
                response_time_ms=response_time_ms,
                request_size_bytes=0,
                response_size_bytes=0,
                user_agent=request.headers.get('user-agent', ''),
                client_ip=self._get_client_ip(request),
                timestamp=datetime.utcnow(),
                endpoint_category=self.metrics_collector.categorize_endpoint(request.url.path)
            )
            
            self.metrics_collector.record_request(error_metrics)
            
            logger.error(f"Request error: {str(e)} (Request ID: {request_id})")
            raise
    
    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP address"""
        # Check forwarded headers
        forwarded_for = request.headers.get('x-forwarded-for')
        if forwarded_for:
            return forwarded_for.split(',')[0].strip()
        
        real_ip = request.headers.get('x-real-ip')
        if real_ip:
            return real_ip
        
        return request.client.host if request.client else 'unknown'
    
    async def _background_system_monitoring(self):
        """Background task for system metrics collection"""
        while True:
            try:
                self.metrics_collector.load_monitor.update_system_metrics()
                await asyncio.sleep(30)  # Update every 30 seconds
            except Exception as e:
                logger.error(f"Background monitoring error: {str(e)}")
                await asyncio.sleep(60)  # Wait longer on error
    
    def get_performance_summary(self) -> Dict[str, Any]:
        """Get comprehensive performance summary"""
        return {
            'load_metrics': self.metrics_collector.load_monitor.get_current_load(),
            'endpoint_performance': self.metrics_collector.get_endpoint_performance(limit=10),
            'slow_endpoints': self.metrics_collector.get_slow_endpoints(limit=5),
            'error_prone_endpoints': self.metrics_collector.get_error_prone_endpoints(limit=5),
            'category_performance': self.metrics_collector.get_category_performance(),
            'performance_trends': self.metrics_collector.load_monitor.get_performance_trends(),
            'timestamp': datetime.utcnow().isoformat()
        }
    
    def get_detailed_analytics(self, hours: int = 24) -> Dict[str, Any]:
        """Get detailed analytics for specified time period"""
        return {
            'time_series': self.metrics_collector.get_time_series_data(hours),
            'load_metrics': self.metrics_collector.load_monitor.get_current_load(),
            'endpoint_performance': self.metrics_collector.get_endpoint_performance(limit=20),
            'category_breakdown': self.metrics_collector.get_category_performance(),
            'timestamp': datetime.utcnow().isoformat()
        }


# Export main components
__all__ = [
    'RequestMetrics',
    'EndpointStats',
    'LoadMonitor',
    'PerformanceMetricsCollector',
    'PerformanceMonitoringMiddleware'
]