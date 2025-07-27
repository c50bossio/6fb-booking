"""
SRE Middleware for Automatic Request Monitoring
Implements comprehensive request tracking, performance monitoring, and error detection
"""

import time
import uuid
import logging
from typing import Callable, Optional, Dict, Any
from datetime import datetime
import json

from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from services.observability_service import observability_service, TraceContext
from services.circuit_breaker_service import circuit_breaker_service, CircuitBreakerOpenException
from services.sre_orchestrator import sre_orchestrator
from services.redis_service import cache_service


class SREMiddleware(BaseHTTPMiddleware):
    """
    SRE middleware providing automatic:
    - Request/response monitoring
    - Performance tracking
    - Error detection and incident creation
    - Circuit breaker integration
    - Distributed tracing
    - Business metrics collection
    """
    
    def __init__(
        self,
        app: ASGIApp,
        enable_tracing: bool = True,
        enable_circuit_breakers: bool = True,
        enable_performance_monitoring: bool = True,
        enable_business_metrics: bool = True
    ):
        super().__init__(app)
        self.logger = logging.getLogger(__name__)
        self.enable_tracing = enable_tracing
        self.enable_circuit_breakers = enable_circuit_breakers
        self.enable_performance_monitoring = enable_performance_monitoring
        self.enable_business_metrics = enable_business_metrics
        
        # Configuration
        self.slow_request_threshold_ms = 2000  # 2 seconds
        self.error_rate_check_interval = 100   # Check every 100 requests
        self.request_counter = 0
        
        self.logger.info("📊 SRE Middleware initialized")
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Process request with comprehensive SRE monitoring"""
        
        start_time = time.time()
        request_id = str(uuid.uuid4())
        trace_context = None
        
        # Add request ID to headers
        request.state.request_id = request_id
        
        try:
            # Start distributed tracing
            if self.enable_tracing:
                operation_name = f"{request.method} {request.url.path}"
                trace_context = observability_service.start_trace(operation_name)
                request.state.trace_context = trace_context
                
                # Add request details to trace
                observability_service.add_span_log(
                    trace_context,
                    f"Request started: {request.method} {request.url.path}",
                    "info",
                    {
                        "request_id": request_id,
                        "method": request.method,
                        "path": str(request.url.path),
                        "query_params": str(request.query_params),
                        "user_agent": request.headers.get("user-agent"),
                        "client_ip": self._get_client_ip(request)
                    }
                )
            
            # Check circuit breakers for external dependencies
            if self.enable_circuit_breakers:
                await self._check_circuit_breakers(request, trace_context)
            
            # Check for graceful degradation mode
            degradation_mode = await self._check_graceful_degradation()
            if degradation_mode:
                request.state.degradation_mode = degradation_mode
            
            # Process the request
            response = await call_next(request)
            
            # Record successful request metrics
            await self._record_request_success(request, response, start_time, trace_context)
            
            return response
            
        except CircuitBreakerOpenException as e:
            # Handle circuit breaker errors
            response = await self._handle_circuit_breaker_error(request, e, start_time, trace_context)
            return response
            
        except Exception as e:
            # Handle all other errors
            response = await self._handle_request_error(request, e, start_time, trace_context)
            return response
            
        finally:
            # Finish tracing
            if self.enable_tracing and trace_context:
                observability_service.finish_span(trace_context, "ok")
            
            # Increment request counter
            self.request_counter += 1
            
            # Periodic error rate checking
            if self.request_counter % self.error_rate_check_interval == 0:
                await self._check_error_rates()
    
    async def _check_circuit_breakers(self, request: Request, trace_context: Optional[TraceContext]):
        """Check if any circuit breakers should affect this request"""
        
        # Check if this request uses external services
        path = request.url.path
        
        # Payment endpoints - check Stripe circuit breaker
        if "/payments" in path or "/billing" in path:
            stripe_circuit = circuit_breaker_service.circuits.get("stripe")
            if stripe_circuit and stripe_circuit.state.value == "open":
                if trace_context:
                    observability_service.add_span_log(
                        trace_context,
                        "Stripe circuit breaker is open",
                        "warning"
                    )
                # Allow request to continue but flag for degraded mode
                request.state.stripe_unavailable = True
        
        # Email endpoints - check SendGrid circuit breaker
        if "/notifications" in path or "/email" in path:
            sendgrid_circuit = circuit_breaker_service.circuits.get("sendgrid")
            if sendgrid_circuit and sendgrid_circuit.state.value == "open":
                if trace_context:
                    observability_service.add_span_log(
                        trace_context,
                        "SendGrid circuit breaker is open",
                        "warning"
                    )
                request.state.sendgrid_unavailable = True
        
        # SMS endpoints - check Twilio circuit breaker
        if "/sms" in path:
            twilio_circuit = circuit_breaker_service.circuits.get("twilio")
            if twilio_circuit and twilio_circuit.state.value == "open":
                if trace_context:
                    observability_service.add_span_log(
                        trace_context,
                        "Twilio circuit breaker is open",
                        "warning"
                    )
                request.state.twilio_unavailable = True
    
    async def _check_graceful_degradation(self) -> Optional[Dict[str, Any]]:
        """Check if graceful degradation mode is enabled"""
        try:
            degradation_data = cache_service.get("graceful_degradation")
            if degradation_data:
                return json.loads(degradation_data)
        except Exception:
            pass
        return None
    
    async def _record_request_success(self, request: Request, response: Response, 
                                    start_time: float, trace_context: Optional[TraceContext]):
        """Record metrics for successful request"""
        
        duration_ms = (time.time() - start_time) * 1000
        
        # Record basic request metrics
        if self.enable_performance_monitoring:
            observability_service.record_request(
                endpoint=self._normalize_endpoint(request.url.path),
                method=request.method,
                status_code=response.status_code,
                duration_ms=duration_ms,
                user_id=getattr(request.state, 'user_id', None)
            )
        
        # Record business metrics for Six Figure Barber endpoints
        if self.enable_business_metrics:
            await self._record_business_metrics(request, response, duration_ms)
        
        # Check for slow requests
        if duration_ms > self.slow_request_threshold_ms:
            await self._handle_slow_request(request, duration_ms, trace_context)
        
        # Add response details to trace
        if trace_context:
            observability_service.add_span_log(
                trace_context,
                f"Request completed: {response.status_code}",
                "info",
                {
                    "status_code": response.status_code,
                    "duration_ms": duration_ms,
                    "response_size": response.headers.get("content-length", "unknown")
                }
            )
    
    async def _record_business_metrics(self, request: Request, response: Response, duration_ms: float):
        """Record Six Figure Barber business metrics"""
        
        path = request.url.path
        method = request.method
        
        # Booking-related metrics
        if "/bookings" in path:
            if method == "POST" and response.status_code == 201:
                observability_service.record_business_metric(
                    "booking_created", 1,
                    {"endpoint": path, "duration_ms": duration_ms}
                )
            elif method == "DELETE" and response.status_code == 200:
                observability_service.record_business_metric(
                    "booking_cancelled", 1,
                    {"endpoint": path}
                )
        
        # Payment-related metrics
        elif "/payments" in path:
            if method == "POST" and response.status_code == 200:
                observability_service.record_business_metric(
                    "payment_processed", 1,
                    {"endpoint": path, "duration_ms": duration_ms}
                )
        
        # Calendar-related metrics
        elif "/calendar" in path:
            observability_service.record_business_metric(
                "calendar_access", 1,
                {"endpoint": path, "method": method}
            )
        
        # Analytics-related metrics
        elif "/analytics" in path:
            observability_service.record_business_metric(
                "analytics_query", 1,
                {"endpoint": path, "duration_ms": duration_ms}
            )
        
        # Commission-related metrics
        elif "/commissions" in path:
            observability_service.record_business_metric(
                "commission_calculation", 1,
                {"endpoint": path, "duration_ms": duration_ms}
            )
    
    async def _handle_slow_request(self, request: Request, duration_ms: float, 
                                 trace_context: Optional[TraceContext]):
        """Handle slow request detection"""
        
        self.logger.warning(
            f"⏱️ Slow request detected: {request.method} {request.url.path} "
            f"took {duration_ms:.1f}ms (threshold: {self.slow_request_threshold_ms}ms)"
        )
        
        # Record slow request metric
        observability_service.record_metric(
            "slow_requests_total", 1,
            {
                "endpoint": self._normalize_endpoint(request.url.path),
                "method": request.method,
                "duration_bucket": self._get_duration_bucket(duration_ms)
            }
        )
        
        # Add to trace
        if trace_context:
            observability_service.add_span_log(
                trace_context,
                f"Slow request warning: {duration_ms:.1f}ms",
                "warning",
                {"threshold_ms": self.slow_request_threshold_ms}
            )
        
        # Check if this indicates a performance issue
        if duration_ms > self.slow_request_threshold_ms * 3:  # 6+ seconds
            await self._trigger_performance_incident(request, duration_ms)
    
    async def _handle_circuit_breaker_error(self, request: Request, error: CircuitBreakerOpenException,
                                          start_time: float, trace_context: Optional[TraceContext]) -> Response:
        """Handle circuit breaker open errors"""
        
        duration_ms = (time.time() - start_time) * 1000
        
        self.logger.error(f"🚫 Circuit breaker error: {error}")
        
        # Record error metrics
        observability_service.record_request(
            endpoint=self._normalize_endpoint(request.url.path),
            method=request.method,
            status_code=503,
            duration_ms=duration_ms
        )
        
        # Add to trace
        if trace_context:
            observability_service.finish_span(
                trace_context, "error",
                {"error_type": "circuit_breaker", "error_message": str(error)}
            )
        
        # Return graceful error response
        return JSONResponse(
            status_code=503,
            content={
                "error": "Service temporarily unavailable",
                "message": "External service is currently unavailable. Please try again later.",
                "retry_after": 60,
                "request_id": request.state.request_id
            }
        )
    
    async def _handle_request_error(self, request: Request, error: Exception,
                                  start_time: float, trace_context: Optional[TraceContext]) -> Response:
        """Handle general request errors"""
        
        duration_ms = (time.time() - start_time) * 1000
        
        self.logger.error(f"❌ Request error: {error}", exc_info=True)
        
        # Determine status code
        status_code = getattr(error, 'status_code', 500)
        
        # Record error metrics
        observability_service.record_request(
            endpoint=self._normalize_endpoint(request.url.path),
            method=request.method,
            status_code=status_code,
            duration_ms=duration_ms
        )
        
        # Record error-specific metric
        observability_service.record_metric(
            "request_errors_total", 1,
            {
                "endpoint": self._normalize_endpoint(request.url.path),
                "method": request.method,
                "error_type": type(error).__name__,
                "status_code": str(status_code)
            }
        )
        
        # Add to trace
        if trace_context:
            observability_service.finish_span(
                trace_context, "error",
                {
                    "error_type": type(error).__name__,
                    "error_message": str(error),
                    "status_code": status_code
                }
            )
        
        # Check if this indicates a system issue
        if status_code == 500:
            await self._check_error_spike(request)
        
        # Return appropriate error response
        if status_code >= 500:
            return JSONResponse(
                status_code=status_code,
                content={
                    "error": "Internal server error",
                    "message": "An unexpected error occurred. Our team has been notified.",
                    "request_id": request.state.request_id
                }
            )
        else:
            return JSONResponse(
                status_code=status_code,
                content={
                    "error": getattr(error, 'detail', str(error)),
                    "request_id": request.state.request_id
                }
            )
    
    async def _check_error_rates(self):
        """Check system error rates periodically"""
        try:
            # Get current error rate from observability service
            performance = observability_service.get_system_performance()
            error_rate = performance.get("overall_error_rate", 0)
            
            # Check if error rate exceeds threshold
            if error_rate > sre_orchestrator.error_rate_threshold:
                await self._trigger_error_rate_incident(error_rate)
                
        except Exception as e:
            self.logger.error(f"❌ Error rate check failed: {e}")
    
    async def _trigger_performance_incident(self, request: Request, duration_ms: float):
        """Trigger incident for severe performance degradation"""
        
        incident_id = f"performance_{int(time.time())}"
        
        from services.sre_orchestrator import IncidentSeverity
        
        await sre_orchestrator._create_incident(
            incident_id,
            IncidentSeverity.HIGH,
            f"Severe performance degradation detected",
            ["api"],
            f"Request {request.method} {request.url.path} took {duration_ms:.1f}ms "
            f"(>{self.slow_request_threshold_ms * 3}ms threshold)"
        )
    
    async def _trigger_error_rate_incident(self, error_rate: float):
        """Trigger incident for high error rate"""
        
        incident_id = f"error_rate_{int(time.time())}"
        
        from services.sre_orchestrator import IncidentSeverity
        
        await sre_orchestrator._create_incident(
            incident_id,
            IncidentSeverity.CRITICAL,
            f"High error rate detected: {error_rate:.2%}",
            ["api"],
            f"System error rate ({error_rate:.2%}) exceeds threshold "
            f"({sre_orchestrator.error_rate_threshold:.2%})"
        )
    
    async def _check_error_spike(self, request: Request):
        """Check for error spikes that might indicate system issues"""
        
        # Get recent error count for this endpoint
        endpoint = self._normalize_endpoint(request.url.path)
        
        # This would typically check a sliding window of errors
        # For now, we'll use a simple check
        recent_errors_key = f"errors:{endpoint}:recent"
        
        try:
            # Increment error count
            error_count = cache_service.get(recent_errors_key) or 0
            error_count = int(error_count) + 1
            cache_service.set(recent_errors_key, str(error_count), ttl=300)  # 5 minute window
            
            # Check if error spike detected
            if error_count > 10:  # More than 10 errors in 5 minutes
                await self._trigger_error_spike_incident(endpoint, error_count)
                
        except Exception as e:
            self.logger.error(f"❌ Error spike check failed: {e}")
    
    async def _trigger_error_spike_incident(self, endpoint: str, error_count: int):
        """Trigger incident for error spike"""
        
        incident_id = f"error_spike_{endpoint}_{int(time.time())}"
        
        from services.sre_orchestrator import IncidentSeverity
        
        await sre_orchestrator._create_incident(
            incident_id,
            IncidentSeverity.HIGH,
            f"Error spike detected on {endpoint}",
            ["api"],
            f"Endpoint {endpoint} has {error_count} errors in last 5 minutes"
        )
    
    def _normalize_endpoint(self, path: str) -> str:
        """Normalize endpoint path for metrics (remove IDs, etc.)"""
        
        # Replace UUIDs and IDs with placeholders
        import re
        
        # Replace UUIDs
        path = re.sub(r'/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', '/{uuid}', path)
        
        # Replace numeric IDs
        path = re.sub(r'/\d+(?=/|$)', '/{id}', path)
        
        return path
    
    def _get_duration_bucket(self, duration_ms: float) -> str:
        """Get duration bucket for metrics"""
        
        if duration_ms < 100:
            return "fast"
        elif duration_ms < 500:
            return "normal"
        elif duration_ms < 1000:
            return "slow"
        elif duration_ms < 2000:
            return "very_slow"
        else:
            return "extremely_slow"
    
    def _get_client_ip(self, request: Request) -> str:
        """Get client IP address from request"""
        
        # Check for forwarded headers
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        
        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip
        
        # Fallback to direct client IP
        if request.client:
            return request.client.host
        
        return "unknown"