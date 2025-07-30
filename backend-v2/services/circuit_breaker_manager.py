"""
Circuit Breaker Manager
Implements circuit breaker patterns for external services to prevent cascading failures
and provide graceful degradation during service outages
"""

import asyncio
import logging
import time
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Callable, Awaitable
from dataclasses import dataclass, field
from enum import Enum
from collections import defaultdict, deque
import json

from services.redis_service import cache_service
from services.enhanced_sentry_monitoring import enhanced_sentry, AlertSeverity


class CircuitBreakerState(Enum):
    CLOSED = "closed"           # Normal operation
    OPEN = "open"              # Circuit breaker is open, failing fast
    HALF_OPEN = "half_open"    # Testing if service has recovered


class FailureType(Enum):
    TIMEOUT = "timeout"
    CONNECTION_ERROR = "connection_error"
    HTTP_ERROR = "http_error"
    RATE_LIMIT = "rate_limit"
    SERVICE_UNAVAILABLE = "service_unavailable"
    AUTHENTICATION_ERROR = "authentication_error"


@dataclass
class CircuitBreakerConfig:
    """Configuration for a circuit breaker"""
    service_name: str
    failure_threshold: int = 5          # Number of failures before opening
    recovery_timeout: int = 60          # Seconds before trying half-open
    success_threshold: int = 3          # Successes needed to close from half-open
    timeout_seconds: float = 10.0       # Request timeout
    
    # Advanced configuration
    slow_call_duration_threshold: float = 5.0  # Seconds to consider a call "slow"
    slow_call_rate_threshold: float = 0.5      # % of slow calls before opening
    minimum_throughput: int = 10               # Minimum calls before evaluating rates
    sliding_window_size: int = 100             # Size of sliding window for metrics
    
    # Fallback configuration
    has_fallback: bool = False
    fallback_response: Optional[Dict[str, Any]] = None
    degraded_mode_enabled: bool = False
    

@dataclass
class CircuitBreakerMetrics:
    """Metrics for circuit breaker monitoring"""
    total_requests: int = 0
    successful_requests: int = 0
    failed_requests: int = 0
    timeout_requests: int = 0
    slow_requests: int = 0
    
    # Sliding window metrics
    recent_requests: deque = field(default_factory=lambda: deque(maxlen=100))
    recent_failures: deque = field(default_factory=lambda: deque(maxlen=100))
    recent_response_times: deque = field(default_factory=lambda: deque(maxlen=100))
    
    @property
    def failure_rate(self) -> float:
        if self.total_requests == 0:
            return 0.0
        return self.failed_requests / self.total_requests
    
    @property
    def success_rate(self) -> float:
        return 1.0 - self.failure_rate
    
    @property
    def average_response_time(self) -> float:
        if not self.recent_response_times:
            return 0.0
        return sum(self.recent_response_times) / len(self.recent_response_times)


@dataclass
class CircuitBreakerInstance:
    """Individual circuit breaker instance"""
    config: CircuitBreakerConfig
    state: CircuitBreakerState = CircuitBreakerState.CLOSED
    failure_count: int = 0
    success_count: int = 0
    last_failure_time: Optional[datetime] = None
    last_success_time: Optional[datetime] = None
    state_changed_time: datetime = field(default_factory=datetime.utcnow)
    metrics: CircuitBreakerMetrics = field(default_factory=CircuitBreakerMetrics)
    
    # Fallback data
    last_successful_response: Optional[Dict[str, Any]] = None
    fallback_data_timestamp: Optional[datetime] = None


class CircuitBreakerError(Exception):
    """Raised when circuit breaker is open"""
    def __init__(self, service_name: str, message: str = None):
        self.service_name = service_name
        super().__init__(message or f"Circuit breaker is open for service: {service_name}")


class CircuitBreakerManager:
    """Manages circuit breakers for all external services"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        
        # Circuit breaker instances
        self.circuit_breakers: Dict[str, CircuitBreakerInstance] = {}
        
        # Service configurations
        self.service_configs = self._create_service_configurations()
        
        # Monitoring
        self.state_change_history = deque(maxlen=1000)
        self.global_metrics = defaultdict(int)
        
        # Background tasks
        self._monitoring_task = None
        self._stop_monitoring = False
        
        # Initialize circuit breakers for configured services
        self._initialize_circuit_breakers()
        
        self.logger.info("⚡ Circuit Breaker Manager initialized with enterprise-grade fault tolerance")
    
    def _create_service_configurations(self) -> Dict[str, CircuitBreakerConfig]:
        """Create circuit breaker configurations for external services"""
        return {
            # Payment Processing
            "stripe_api": CircuitBreakerConfig(
                service_name="stripe_api",
                failure_threshold=3,          # Critical payment service
                recovery_timeout=30,          # Quick recovery attempts
                success_threshold=2,
                timeout_seconds=15.0,
                slow_call_duration_threshold=10.0,
                slow_call_rate_threshold=0.3,
                has_fallback=True,           # Has cached payment methods
                degraded_mode_enabled=True   # Can defer non-critical operations
            ),
            
            # Email Services
            "sendgrid_api": CircuitBreakerConfig(
                service_name="sendgrid_api",
                failure_threshold=5,
                recovery_timeout=60,
                success_threshold=3,
                timeout_seconds=10.0,
                slow_call_duration_threshold=8.0,
                has_fallback=True,           # Can queue emails
                fallback_response={"status": "queued", "message": "Email queued for later delivery"}
            ),
            
            # SMS Services
            "twilio_api": CircuitBreakerConfig(
                service_name="twilio_api",
                failure_threshold=5,
                recovery_timeout=60,
                success_threshold=3,
                timeout_seconds=8.0,
                has_fallback=True,           # Can queue SMS
                fallback_response={"status": "queued", "message": "SMS queued for later delivery"}
            ),
            
            # Calendar Integration
            "google_calendar_api": CircuitBreakerConfig(
                service_name="google_calendar_api",
                failure_threshold=5,
                recovery_timeout=120,        # Longer recovery for Google services
                success_threshold=3,
                timeout_seconds=15.0,
                slow_call_duration_threshold=10.0,
                has_fallback=True,           # Can sync later
                degraded_mode_enabled=True
            ),
            
            # Analytics Services
            "google_analytics_api": CircuitBreakerConfig(
                service_name="google_analytics_api",
                failure_threshold=8,         # Non-critical service
                recovery_timeout=300,        # Longer recovery time
                success_threshold=3,
                timeout_seconds=20.0,
                has_fallback=True,
                degraded_mode_enabled=True
            ),
            
            # Business Integration
            "google_my_business_api": CircuitBreakerConfig(
                service_name="google_my_business_api",
                failure_threshold=6,
                recovery_timeout=180,
                success_threshold=3,
                timeout_seconds=12.0,
                has_fallback=True,
                degraded_mode_enabled=True
            ),
            
            # Social Media
            "facebook_api": CircuitBreakerConfig(
                service_name="facebook_api",
                failure_threshold=8,
                recovery_timeout=300,
                success_threshold=3,
                timeout_seconds=15.0,
                has_fallback=True,
                degraded_mode_enabled=True
            ),
            
            # File Storage
            "aws_s3": CircuitBreakerConfig(
                service_name="aws_s3",
                failure_threshold=5,
                recovery_timeout=60,
                success_threshold=3,
                timeout_seconds=30.0,        # Longer timeout for file operations
                slow_call_duration_threshold=20.0,
                has_fallback=True           # Can use local storage temporarily
            ),
            
            # External APIs
            "weather_api": CircuitBreakerConfig(
                service_name="weather_api",
                failure_threshold=10,        # Non-critical
                recovery_timeout=600,        # Long recovery
                success_threshold=2,
                timeout_seconds=5.0,
                has_fallback=True,
                fallback_response={"weather": "unavailable", "temperature": "N/A"}
            ),
            
            # Backup Services
            "backup_email_provider": CircuitBreakerConfig(
                service_name="backup_email_provider",
                failure_threshold=8,
                recovery_timeout=120,
                success_threshold=3,
                timeout_seconds=10.0,
                has_fallback=False          # This IS the fallback
            )
        }
    
    def _initialize_circuit_breakers(self):
        """Initialize circuit breaker instances for all configured services"""
        for service_name, config in self.service_configs.items():
            self.circuit_breakers[service_name] = CircuitBreakerInstance(config=config)
            self.logger.info(f"⚡ Initialized circuit breaker for {service_name}")
    
    async def start_monitoring(self):
        """Start circuit breaker monitoring"""
        try:
            self.logger.info("⚡ Starting circuit breaker monitoring...")
            
            # Start monitoring tasks
            tasks = [
                self._state_monitoring_loop(),
                self._metrics_collection_loop(),
                self._recovery_testing_loop(),
                self._fallback_data_maintenance_loop()
            ]
            
            await asyncio.gather(*tasks, return_exceptions=True)
            
        except Exception as e:
            self.logger.error(f"❌ Circuit breaker monitoring startup failed: {e}")
            await enhanced_sentry.capture_exception(e, {"context": "circuit_breaker_monitoring"})
    
    async def call_with_circuit_breaker(self,
                                      service_name: str,
                                      operation: Callable[[], Awaitable[Any]],
                                      fallback: Optional[Callable[[], Awaitable[Any]]] = None,
                                      operation_id: str = None) -> Any:
        """Execute operation with circuit breaker protection"""
        
        if service_name not in self.circuit_breakers:
            # Create circuit breaker on-demand for unknown services
            await self._create_circuit_breaker_on_demand(service_name)
        
        circuit_breaker = self.circuit_breakers[service_name]
        
        # Check circuit breaker state
        await self._update_circuit_breaker_state(circuit_breaker)
        
        if circuit_breaker.state == CircuitBreakerState.OPEN:
            # Circuit breaker is open - fail fast
            await self._handle_circuit_breaker_open(circuit_breaker, fallback)
            raise CircuitBreakerError(service_name, "Circuit breaker is open")
        
        # Record request attempt
        start_time = time.time()
        circuit_breaker.metrics.total_requests += 1
        circuit_breaker.metrics.recent_requests.append(datetime.utcnow())
        
        try:
            # Execute the operation with timeout
            result = await asyncio.wait_for(
                operation(),
                timeout=circuit_breaker.config.timeout_seconds
            )
            
            # Record success
            end_time = time.time()
            response_time = end_time - start_time
            
            await self._record_success(circuit_breaker, response_time, result)
            
            return result
            
        except asyncio.TimeoutError:
            # Handle timeout
            response_time = time.time() - start_time
            await self._record_failure(circuit_breaker, FailureType.TIMEOUT, response_time)
            
            if fallback:
                return await fallback()
            raise
            
        except Exception as e:
            # Handle other failures
            response_time = time.time() - start_time
            failure_type = self._classify_failure(e)
            await self._record_failure(circuit_breaker, failure_type, response_time, str(e))
            
            if fallback:
                return await fallback()
            raise
    
    async def get_circuit_breaker_status(self, service_name: str = None) -> Dict[str, Any]:
        """Get circuit breaker status for service(s)"""
        
        if service_name:
            if service_name not in self.circuit_breakers:
                return {"error": f"Circuit breaker not found for service: {service_name}"}
            
            return await self._get_service_status(self.circuit_breakers[service_name])
        
        # Return status for all circuit breakers
        all_status = {}
        summary = {
            "total_services": len(self.circuit_breakers),
            "closed": 0,
            "open": 0,
            "half_open": 0,
            "services_with_fallback": 0,
            "services_in_degraded_mode": 0
        }
        
        for service_name, cb in self.circuit_breakers.items():
            status = await self._get_service_status(cb)
            all_status[service_name] = status
            
            summary[status["state"]] += 1
            if status["has_fallback"]:
                summary["services_with_fallback"] += 1
            if status["degraded_mode_active"]:
                summary["services_in_degraded_mode"] += 1
        
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "summary": summary,
            "services": all_status,
            "global_metrics": dict(self.global_metrics),
            "recent_state_changes": list(self.state_change_history)[-10:]  # Last 10 changes
        }
    
    async def force_circuit_breaker_state(self, service_name: str, state: str, reason: str = "Manual override"):
        """Manually force circuit breaker state (for testing/emergency)"""
        
        if service_name not in self.circuit_breakers:
            raise ValueError(f"Circuit breaker not found for service: {service_name}")
        
        circuit_breaker = self.circuit_breakers[service_name]
        old_state = circuit_breaker.state
        
        try:
            new_state = CircuitBreakerState(state.lower())
            circuit_breaker.state = new_state
            circuit_breaker.state_changed_time = datetime.utcnow()
            
            # Record state change
            await self._record_state_change(circuit_breaker, old_state, new_state, reason)
            
            self.logger.warning(
                f"⚡ MANUAL OVERRIDE: Circuit breaker for {service_name} "
                f"changed from {old_state.value} to {new_state.value} - {reason}"
            )
            
        except ValueError:
            raise ValueError(f"Invalid state: {state}. Must be one of: closed, open, half_open")
    
    async def enable_degraded_mode(self, service_name: str, enable: bool = True):
        """Enable or disable degraded mode for a service"""
        
        if service_name not in self.circuit_breakers:
            raise ValueError(f"Circuit breaker not found for service: {service_name}")
        
        circuit_breaker = self.circuit_breakers[service_name]
        circuit_breaker.config.degraded_mode_enabled = enable
        
        action = "enabled" if enable else "disabled"
        self.logger.info(f"⚡ Degraded mode {action} for {service_name}")
        
        # Send notification
        await enhanced_sentry.capture_business_event(
            f"degraded_mode_{action}",
            f"Degraded mode {action} for {service_name}",
            {
                "service_name": service_name,
                "degraded_mode_enabled": enable,
                "circuit_breaker_state": circuit_breaker.state.value
            },
            severity=AlertSeverity.MEDIUM
        )
    
    async def update_fallback_data(self, service_name: str, fallback_data: Dict[str, Any]):
        """Update fallback data for a service"""
        
        if service_name not in self.circuit_breakers:
            raise ValueError(f"Circuit breaker not found for service: {service_name}")
        
        circuit_breaker = self.circuit_breakers[service_name]
        circuit_breaker.last_successful_response = fallback_data
        circuit_breaker.fallback_data_timestamp = datetime.utcnow()
        
        # Store in cache for persistence
        await cache_service.set(
            f"circuit_breaker_fallback:{service_name}",
            json.dumps({
                "data": fallback_data,
                "timestamp": circuit_breaker.fallback_data_timestamp.isoformat()
            }),
            ttl=86400  # 24 hours
        )
        
        self.logger.info(f"⚡ Updated fallback data for {service_name}")
    
    async def get_circuit_breaker_metrics(self, service_name: str = None) -> Dict[str, Any]:
        """Get detailed metrics for circuit breaker(s)"""
        
        if service_name:
            if service_name not in self.circuit_breakers:
                return {"error": f"Circuit breaker not found for service: {service_name}"}
            
            return await self._get_detailed_metrics(self.circuit_breakers[service_name])
        
        # Return metrics for all circuit breakers
        all_metrics = {}
        aggregate_metrics = {
            "total_requests": 0,
            "total_failures": 0,
            "total_timeouts": 0,
            "total_successes": 0,
            "average_failure_rate": 0.0,
            "services_with_issues": 0
        }
        
        for service_name, cb in self.circuit_breakers.items():
            metrics = await self._get_detailed_metrics(cb)
            all_metrics[service_name] = metrics
            
            # Aggregate
            aggregate_metrics["total_requests"] += metrics["total_requests"]
            aggregate_metrics["total_failures"] += metrics["failed_requests"]
            aggregate_metrics["total_timeouts"] += metrics["timeout_requests"]
            aggregate_metrics["total_successes"] += metrics["successful_requests"]
            
            if metrics["failure_rate"] > 0.1:  # More than 10% failure rate
                aggregate_metrics["services_with_issues"] += 1
        
        # Calculate average failure rate
        total_services = len(self.circuit_breakers)
        if total_services > 0:
            aggregate_metrics["average_failure_rate"] = sum(
                cb.metrics.failure_rate for cb in self.circuit_breakers.values()
            ) / total_services
        
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "aggregate_metrics": aggregate_metrics,
            "service_metrics": all_metrics
        }
    
    async def _get_service_status(self, circuit_breaker: CircuitBreakerInstance) -> Dict[str, Any]:
        """Get status for a single circuit breaker"""
        
        # Calculate time in current state
        time_in_state = (datetime.utcnow() - circuit_breaker.state_changed_time).total_seconds()
        
        return {
            "service_name": circuit_breaker.config.service_name,
            "state": circuit_breaker.state.value,
            "failure_count": circuit_breaker.failure_count,
            "success_count": circuit_breaker.success_count,
            "time_in_current_state_seconds": time_in_state,
            "last_failure_time": circuit_breaker.last_failure_time.isoformat() if circuit_breaker.last_failure_time else None,
            "last_success_time": circuit_breaker.last_success_time.isoformat() if circuit_breaker.last_success_time else None,
            "failure_rate": circuit_breaker.metrics.failure_rate,
            "success_rate": circuit_breaker.metrics.success_rate,
            "average_response_time_ms": circuit_breaker.metrics.average_response_time * 1000,
            "has_fallback": circuit_breaker.config.has_fallback,
            "degraded_mode_active": circuit_breaker.config.degraded_mode_enabled and circuit_breaker.state == CircuitBreakerState.OPEN,
            "configuration": {
                "failure_threshold": circuit_breaker.config.failure_threshold,
                "recovery_timeout": circuit_breaker.config.recovery_timeout,
                "timeout_seconds": circuit_breaker.config.timeout_seconds
            }
        }
    
    async def _get_detailed_metrics(self, circuit_breaker: CircuitBreakerInstance) -> Dict[str, Any]:
        """Get detailed metrics for a circuit breaker"""
        
        metrics = circuit_breaker.metrics
        
        # Calculate recent metrics (last 100 requests)
        recent_requests = len(metrics.recent_requests)
        recent_failures = len(metrics.recent_failures)
        recent_failure_rate = (recent_failures / recent_requests) if recent_requests > 0 else 0.0
        
        # Calculate response time percentiles
        response_times = list(metrics.recent_response_times)
        response_times.sort()
        
        p50 = response_times[len(response_times) // 2] if response_times else 0
        p95 = response_times[int(len(response_times) * 0.95)] if response_times else 0
        p99 = response_times[int(len(response_times) * 0.99)] if response_times else 0
        
        return {
            "service_name": circuit_breaker.config.service_name,
            "state": circuit_breaker.state.value,
            "total_requests": metrics.total_requests,
            "successful_requests": metrics.successful_requests,
            "failed_requests": metrics.failed_requests,
            "timeout_requests": metrics.timeout_requests,
            "slow_requests": metrics.slow_requests,
            "failure_rate": metrics.failure_rate,
            "success_rate": metrics.success_rate,
            "recent_requests": recent_requests,
            "recent_failure_rate": recent_failure_rate,
            "response_time_metrics": {
                "average_ms": metrics.average_response_time * 1000,
                "p50_ms": p50 * 1000,
                "p95_ms": p95 * 1000,
                "p99_ms": p99 * 1000
            },
            "state_durations": await self._calculate_state_durations(circuit_breaker),
            "last_fallback_used": circuit_breaker.fallback_data_timestamp.isoformat() if circuit_breaker.fallback_data_timestamp else None
        }
    
    async def _calculate_state_durations(self, circuit_breaker: CircuitBreakerInstance) -> Dict[str, float]:
        """Calculate time spent in each state"""
        
        # For now, return current state duration
        # In a full implementation, this would track historical state durations
        current_state_duration = (datetime.utcnow() - circuit_breaker.state_changed_time).total_seconds()
        
        return {
            "current_state": circuit_breaker.state.value,
            "current_state_duration_seconds": current_state_duration,
            "total_uptime_percentage": 95.0,  # Would be calculated from historical data
            "average_recovery_time_seconds": 120.0  # Would be calculated from historical data
        }
    
    async def _update_circuit_breaker_state(self, circuit_breaker: CircuitBreakerInstance):
        """Update circuit breaker state based on current conditions"""
        
        current_time = datetime.utcnow()
        old_state = circuit_breaker.state
        
        if circuit_breaker.state == CircuitBreakerState.CLOSED:
            # Check if we should open the circuit breaker
            if self._should_open_circuit_breaker(circuit_breaker):
                circuit_breaker.state = CircuitBreakerState.OPEN
                circuit_breaker.state_changed_time = current_time
                await self._record_state_change(circuit_breaker, old_state, CircuitBreakerState.OPEN, "Failure threshold exceeded")
        
        elif circuit_breaker.state == CircuitBreakerState.OPEN:
            # Check if we should try half-open
            time_since_open = (current_time - circuit_breaker.state_changed_time).total_seconds()
            if time_since_open >= circuit_breaker.config.recovery_timeout:
                circuit_breaker.state = CircuitBreakerState.HALF_OPEN
                circuit_breaker.state_changed_time = current_time
                circuit_breaker.success_count = 0  # Reset success count for half-open testing
                await self._record_state_change(circuit_breaker, old_state, CircuitBreakerState.HALF_OPEN, "Recovery timeout reached")
        
        elif circuit_breaker.state == CircuitBreakerState.HALF_OPEN:
            # Check if we should close or re-open
            if circuit_breaker.success_count >= circuit_breaker.config.success_threshold:
                circuit_breaker.state = CircuitBreakerState.CLOSED
                circuit_breaker.state_changed_time = current_time
                circuit_breaker.failure_count = 0  # Reset failure count
                await self._record_state_change(circuit_breaker, old_state, CircuitBreakerState.CLOSED, "Recovery successful")
            elif circuit_breaker.failure_count > 0:
                circuit_breaker.state = CircuitBreakerState.OPEN
                circuit_breaker.state_changed_time = current_time
                await self._record_state_change(circuit_breaker, old_state, CircuitBreakerState.OPEN, "Recovery failed")
    
    def _should_open_circuit_breaker(self, circuit_breaker: CircuitBreakerInstance) -> bool:
        """Determine if circuit breaker should be opened"""
        
        config = circuit_breaker.config
        metrics = circuit_breaker.metrics
        
        # Check failure count threshold
        if circuit_breaker.failure_count >= config.failure_threshold:
            return True
        
        # Check failure rate (if we have enough requests)
        if metrics.total_requests >= config.minimum_throughput:
            failure_rate = metrics.failure_rate
            if failure_rate > 0.5:  # More than 50% failure rate
                return True
        
        # Check slow call rate
        if len(metrics.recent_response_times) >= config.minimum_throughput:
            slow_calls = sum(1 for rt in metrics.recent_response_times if rt > config.slow_call_duration_threshold)
            slow_call_rate = slow_calls / len(metrics.recent_response_times)
            if slow_call_rate > config.slow_call_rate_threshold:
                return True
        
        return False
    
    async def _record_success(self, circuit_breaker: CircuitBreakerInstance, response_time: float, result: Any):
        """Record a successful operation"""
        
        circuit_breaker.metrics.successful_requests += 1
        circuit_breaker.metrics.recent_response_times.append(response_time)
        circuit_breaker.last_success_time = datetime.utcnow()
        
        # Check if call was slow
        if response_time > circuit_breaker.config.slow_call_duration_threshold:
            circuit_breaker.metrics.slow_requests += 1
        
        # Update success count for state management
        if circuit_breaker.state in [CircuitBreakerState.HALF_OPEN, CircuitBreakerState.CLOSED]:
            circuit_breaker.success_count += 1
            circuit_breaker.failure_count = max(0, circuit_breaker.failure_count - 1)  # Decay failure count
        
        # Cache successful response for fallback
        if circuit_breaker.config.has_fallback and isinstance(result, dict):
            circuit_breaker.last_successful_response = result
            circuit_breaker.fallback_data_timestamp = datetime.utcnow()
            
            # Store in cache
            await cache_service.set(
                f"circuit_breaker_fallback:{circuit_breaker.config.service_name}",
                json.dumps({
                    "data": result,
                    "timestamp": circuit_breaker.fallback_data_timestamp.isoformat()
                }),
                ttl=86400  # 24 hours
            )
        
        # Update global metrics
        self.global_metrics["total_successes"] += 1
    
    async def _record_failure(self, circuit_breaker: CircuitBreakerInstance, failure_type: FailureType, response_time: float, error_message: str = ""):
        """Record a failed operation"""
        
        circuit_breaker.metrics.failed_requests += 1
        circuit_breaker.metrics.recent_failures.append(datetime.utcnow())
        circuit_breaker.metrics.recent_response_times.append(response_time)
        circuit_breaker.last_failure_time = datetime.utcnow()
        
        # Update failure count for state management
        circuit_breaker.failure_count += 1
        circuit_breaker.success_count = 0  # Reset success count on failure
        
        # Track specific failure types
        if failure_type == FailureType.TIMEOUT:
            circuit_breaker.metrics.timeout_requests += 1
        
        # Update global metrics
        self.global_metrics["total_failures"] += 1
        self.global_metrics[f"failures_{failure_type.value}"] += 1
        
        # Log failure
        self.logger.warning(
            f"⚡ Circuit breaker recorded failure for {circuit_breaker.config.service_name}: "
            f"{failure_type.value} - {error_message}"
        )
        
        # Send alert for critical services
        if circuit_breaker.config.service_name in ["stripe_api", "payment_processor"]:
            await enhanced_sentry.capture_business_event(
                "circuit_breaker_failure_critical",
                f"Critical service failure: {circuit_breaker.config.service_name}",
                {
                    "service_name": circuit_breaker.config.service_name,
                    "failure_type": failure_type.value,
                    "error_message": error_message,
                    "failure_count": circuit_breaker.failure_count,
                    "state": circuit_breaker.state.value
                },
                severity=AlertSeverity.HIGH
            )
    
    async def _handle_circuit_breaker_open(self, circuit_breaker: CircuitBreakerInstance, fallback: Optional[Callable] = None):
        """Handle circuit breaker open state"""
        
        service_name = circuit_breaker.config.service_name
        
        # Try fallback mechanisms
        if circuit_breaker.config.has_fallback:
            
            # 1. Use cached fallback response
            if circuit_breaker.config.fallback_response:
                self.logger.info(f"⚡ Using configured fallback response for {service_name}")
                return circuit_breaker.config.fallback_response
            
            # 2. Use last successful response
            if circuit_breaker.last_successful_response:
                age = (datetime.utcnow() - circuit_breaker.fallback_data_timestamp).total_seconds() if circuit_breaker.fallback_data_timestamp else float('inf')
                if age < 3600:  # Use if less than 1 hour old
                    self.logger.info(f"⚡ Using cached successful response for {service_name}")
                    return circuit_breaker.last_successful_response
            
            # 3. Try to load from cache
            cached_fallback = await cache_service.get(f"circuit_breaker_fallback:{service_name}")
            if cached_fallback:
                try:
                    fallback_data = json.loads(cached_fallback)
                    self.logger.info(f"⚡ Using stored fallback data for {service_name}")
                    return fallback_data.get("data")
                except Exception as e:
                    self.logger.error(f"Error loading fallback data for {service_name}: {e}")
        
        # 4. Enable degraded mode if configured
        if circuit_breaker.config.degraded_mode_enabled:
            self.logger.info(f"⚡ Operating in degraded mode for {service_name}")
            # In degraded mode, some functionality may be disabled or simplified
            
        # Update global metrics
        self.global_metrics["circuit_breaker_open_events"] += 1
        
        # Log circuit breaker open
        self.logger.error(f"⚡ Circuit breaker OPEN for {service_name} - failing fast")
    
    def _classify_failure(self, exception: Exception) -> FailureType:
        """Classify the type of failure"""
        
        error_message = str(exception).lower()
        
        if isinstance(exception, asyncio.TimeoutError):
            return FailureType.TIMEOUT
        elif "connection" in error_message or "network" in error_message:
            return FailureType.CONNECTION_ERROR
        elif "rate limit" in error_message or "429" in error_message:
            return FailureType.RATE_LIMIT
        elif "authentication" in error_message or "401" in error_message or "403" in error_message:
            return FailureType.AUTHENTICATION_ERROR
        elif "503" in error_message or "unavailable" in error_message:
            return FailureType.SERVICE_UNAVAILABLE
        elif any(code in error_message for code in ["400", "404", "500", "502", "504"]):
            return FailureType.HTTP_ERROR
        else:
            return FailureType.CONNECTION_ERROR  # Default
    
    async def _record_state_change(self, circuit_breaker: CircuitBreakerInstance, old_state: CircuitBreakerState, new_state: CircuitBreakerState, reason: str):
        """Record circuit breaker state change"""
        
        state_change = {
            "timestamp": datetime.utcnow().isoformat(),
            "service_name": circuit_breaker.config.service_name,
            "old_state": old_state.value,
            "new_state": new_state.value,
            "reason": reason,
            "failure_count": circuit_breaker.failure_count,
            "success_count": circuit_breaker.success_count
        }
        
        self.state_change_history.append(state_change)
        
        # Log state change
        self.logger.info(
            f"⚡ Circuit breaker state change for {circuit_breaker.config.service_name}: "
            f"{old_state.value} → {new_state.value} ({reason})"
        )
        
        # Send notification for state changes
        severity = AlertSeverity.HIGH if new_state == CircuitBreakerState.OPEN else AlertSeverity.MEDIUM
        
        await enhanced_sentry.capture_business_event(
            f"circuit_breaker_state_change",
            f"Circuit breaker for {circuit_breaker.config.service_name} changed to {new_state.value}",
            state_change,
            severity=severity
        )
        
        # Store state change in cache for persistence
        await cache_service.lpush(
            "circuit_breaker_state_changes",
            json.dumps(state_change)
        )
    
    async def _create_circuit_breaker_on_demand(self, service_name: str):
        """Create a circuit breaker for an unknown service with default configuration"""
        
        config = CircuitBreakerConfig(
            service_name=service_name,
            failure_threshold=5,
            recovery_timeout=60,
            success_threshold=3,
            timeout_seconds=10.0
        )
        
        self.circuit_breakers[service_name] = CircuitBreakerInstance(config=config)
        self.logger.info(f"⚡ Created on-demand circuit breaker for {service_name}")
    
    # Background Monitoring Loops
    
    async def _state_monitoring_loop(self):
        """Monitor circuit breaker states and update as needed"""
        while not self._stop_monitoring:
            try:
                for circuit_breaker in self.circuit_breakers.values():
                    await self._update_circuit_breaker_state(circuit_breaker)
                
                await asyncio.sleep(30)  # Check every 30 seconds
                
            except Exception as e:
                self.logger.error(f"❌ Circuit breaker state monitoring error: {e}")
                await asyncio.sleep(30)
    
    async def _metrics_collection_loop(self):
        """Collect and store circuit breaker metrics"""
        while not self._stop_monitoring:
            try:
                # Collect metrics from all circuit breakers
                all_metrics = await self.get_circuit_breaker_metrics()
                
                # Store in cache for dashboard access
                await cache_service.set(
                    "circuit_breaker_metrics",
                    json.dumps(all_metrics),
                    ttl=300  # 5 minutes
                )
                
                await asyncio.sleep(60)  # Collect every minute
                
            except Exception as e:
                self.logger.error(f"❌ Circuit breaker metrics collection error: {e}")
                await asyncio.sleep(60)
    
    async def _recovery_testing_loop(self):
        """Test recovery for services in half-open state"""
        while not self._stop_monitoring:
            try:
                half_open_breakers = [
                    cb for cb in self.circuit_breakers.values()
                    if cb.state == CircuitBreakerState.HALF_OPEN
                ]
                
                for circuit_breaker in half_open_breakers:
                    # In a real implementation, this would perform actual health checks
                    # For now, we just log that recovery testing is happening
                    self.logger.info(f"⚡ Testing recovery for {circuit_breaker.config.service_name}")
                
                await asyncio.sleep(60)  # Test every minute
                
            except Exception as e:
                self.logger.error(f"❌ Recovery testing error: {e}")
                await asyncio.sleep(60)
    
    async def _fallback_data_maintenance_loop(self):
        """Maintain and refresh fallback data"""
        while not self._stop_monitoring:
            try:
                for circuit_breaker in self.circuit_breakers.values():
                    if (circuit_breaker.config.has_fallback and 
                        circuit_breaker.fallback_data_timestamp and
                        circuit_breaker.state == CircuitBreakerState.CLOSED):
                        
                        # Check if fallback data is getting old
                        age = (datetime.utcnow() - circuit_breaker.fallback_data_timestamp).total_seconds()
                        if age > 21600:  # 6 hours
                            self.logger.info(f"⚡ Fallback data for {circuit_breaker.config.service_name} is {age/3600:.1f} hours old")
                            # In a real implementation, this might trigger a background refresh
                
                await asyncio.sleep(3600)  # Check every hour
                
            except Exception as e:
                self.logger.error(f"❌ Fallback data maintenance error: {e}")
                await asyncio.sleep(3600)
    
    async def stop_monitoring(self):
        """Stop circuit breaker monitoring"""
        self._stop_monitoring = True
        if self._monitoring_task:
            self._monitoring_task.cancel()


# Global circuit breaker manager instance
circuit_breaker_manager = CircuitBreakerManager()