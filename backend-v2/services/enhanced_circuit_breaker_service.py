"""
Enhanced Circuit Breaker Service for API Integration Reliability

This service provides sophisticated circuit breaker patterns for API integrations:
- Configurable failure thresholds and recovery timeouts
- Exponential backoff and jitter for recovery attempts
- Health check integration for proactive monitoring
- Metrics collection for performance analysis
- Adaptive thresholds based on service behavior
"""

import asyncio
import logging
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Callable
from enum import Enum
from dataclasses import dataclass
import random

logger = logging.getLogger(__name__)


class CircuitBreakerState(Enum):
    """Circuit breaker states"""
    CLOSED = "closed"       # Normal operation
    OPEN = "open"          # Failing, requests blocked
    HALF_OPEN = "half_open" # Testing recovery


@dataclass
class CircuitBreakerConfig:
    """Configuration for circuit breaker"""
    failure_threshold: int = 5
    recovery_timeout: int = 60
    success_threshold: int = 3  # Successes needed to close from half-open
    timeout: int = 30
    expected_exception: type = Exception
    name: str = "circuit_breaker"
    
    # Advanced configuration
    max_recovery_timeout: int = 300  # Maximum recovery timeout
    backoff_multiplier: float = 2.0
    jitter: bool = True
    adaptive_threshold: bool = True
    health_check_interval: int = 30


@dataclass
class CircuitBreakerMetrics:
    """Metrics for circuit breaker performance"""
    total_requests: int = 0
    successful_requests: int = 0
    failed_requests: int = 0
    circuit_opened_count: int = 0
    circuit_closed_count: int = 0
    current_failure_count: int = 0
    current_success_count: int = 0
    last_failure_time: Optional[datetime] = None
    last_success_time: Optional[datetime] = None
    avg_response_time: float = 0.0
    state_transitions: List[Dict[str, Any]] = None
    
    def __post_init__(self):
        if self.state_transitions is None:
            self.state_transitions = []


class CircuitBreakerException(Exception):
    """Exception raised when circuit breaker is open"""
    pass


class EnhancedCircuitBreaker:
    """
    Enhanced circuit breaker with adaptive behavior and comprehensive monitoring
    """
    
    def __init__(self, config: CircuitBreakerConfig):
        self.config = config
        self.state = CircuitBreakerState.CLOSED
        self.metrics = CircuitBreakerMetrics()
        
        self.last_failure_time = None
        self.next_attempt_time = None
        self.current_recovery_timeout = config.recovery_timeout
        
        # Adaptive threshold tracking
        self.recent_success_rates = []
        self.baseline_failure_rate = 0.1  # 10% baseline failure rate
        
        # Health check task
        self._health_check_task = None
        if config.health_check_interval > 0:
            self._health_check_task = asyncio.create_task(self._periodic_health_check())
    
    async def __call__(self, func: Callable, *args, **kwargs):
        """
        Execute function with circuit breaker protection
        """
        await self._check_circuit_state()
        
        start_time = time.time()
        self.metrics.total_requests += 1
        
        try:
            result = await func(*args, **kwargs)
            await self._record_success(time.time() - start_time)
            return result
            
        except self.config.expected_exception as e:
            await self._record_failure()
            raise
        except Exception as e:
            # Unexpected exceptions don't count as failures for circuit breaker
            raise
    
    async def _check_circuit_state(self):
        """Check if circuit breaker allows requests"""
        current_time = time.time()
        
        if self.state == CircuitBreakerState.OPEN:
            if self.next_attempt_time and current_time >= self.next_attempt_time:
                await self._transition_to_half_open()
            else:
                raise CircuitBreakerException(
                    f"Circuit breaker '{self.config.name}' is OPEN. "
                    f"Next attempt in {int(self.next_attempt_time - current_time)}s"
                )
        
        elif self.state == CircuitBreakerState.HALF_OPEN:
            # Allow limited requests in half-open state
            pass
    
    async def _record_success(self, response_time: float):
        """Record successful request"""
        self.metrics.successful_requests += 1
        self.metrics.current_success_count += 1
        self.metrics.current_failure_count = 0  # Reset failure count
        self.metrics.last_success_time = datetime.utcnow()
        
        # Update average response time
        total_time = self.metrics.avg_response_time * (self.metrics.successful_requests - 1)
        self.metrics.avg_response_time = (total_time + response_time) / self.metrics.successful_requests
        
        # Handle state transitions
        if self.state == CircuitBreakerState.HALF_OPEN:
            if self.metrics.current_success_count >= self.config.success_threshold:
                await self._transition_to_closed()
        
        # Update adaptive threshold
        if self.config.adaptive_threshold:
            await self._update_adaptive_threshold(success=True)
    
    async def _record_failure(self):
        """Record failed request"""
        self.metrics.failed_requests += 1
        self.metrics.current_failure_count += 1
        self.metrics.current_success_count = 0  # Reset success count
        self.metrics.last_failure_time = datetime.utcnow()
        self.last_failure_time = time.time()
        
        # Check if we should open the circuit
        failure_threshold = await self._get_adaptive_failure_threshold()
        
        if (self.state == CircuitBreakerState.CLOSED and 
            self.metrics.current_failure_count >= failure_threshold):
            await self._transition_to_open()
        
        elif self.state == CircuitBreakerState.HALF_OPEN:
            # Any failure in half-open state returns to open
            await self._transition_to_open()
        
        # Update adaptive threshold
        if self.config.adaptive_threshold:
            await self._update_adaptive_threshold(success=False)
    
    async def _transition_to_open(self):
        """Transition circuit breaker to OPEN state"""
        previous_state = self.state
        self.state = CircuitBreakerState.OPEN
        self.metrics.circuit_opened_count += 1
        
        # Calculate next attempt time with exponential backoff and jitter
        backoff_time = self.current_recovery_timeout
        
        if self.config.jitter:
            # Add jitter to prevent thundering herd
            jitter_range = backoff_time * 0.1  # 10% jitter
            backoff_time += random.uniform(-jitter_range, jitter_range)
        
        self.next_attempt_time = time.time() + backoff_time
        
        # Increase recovery timeout for next time (exponential backoff)
        self.current_recovery_timeout = min(
            self.current_recovery_timeout * self.config.backoff_multiplier,
            self.config.max_recovery_timeout
        )
        
        await self._log_state_transition(previous_state, CircuitBreakerState.OPEN)
        
        logger.warning(
            f"Circuit breaker '{self.config.name}' OPENED. "
            f"Next attempt in {backoff_time:.1f}s. "
            f"Failure count: {self.metrics.current_failure_count}"
        )
    
    async def _transition_to_half_open(self):
        """Transition circuit breaker to HALF_OPEN state"""
        previous_state = self.state
        self.state = CircuitBreakerState.HALF_OPEN
        self.metrics.current_success_count = 0
        self.metrics.current_failure_count = 0
        
        await self._log_state_transition(previous_state, CircuitBreakerState.HALF_OPEN)
        
        logger.info(
            f"Circuit breaker '{self.config.name}' transitioned to HALF_OPEN. "
            f"Testing service recovery..."
        )
    
    async def _transition_to_closed(self):
        """Transition circuit breaker to CLOSED state"""
        previous_state = self.state
        self.state = CircuitBreakerState.CLOSED
        self.metrics.circuit_closed_count += 1
        
        # Reset recovery timeout to initial value
        self.current_recovery_timeout = self.config.recovery_timeout
        self.next_attempt_time = None
        
        await self._log_state_transition(previous_state, CircuitBreakerState.CLOSED)
        
        logger.info(
            f"Circuit breaker '{self.config.name}' CLOSED. "
            f"Service recovered successfully. "
            f"Success count: {self.metrics.current_success_count}"
        )
    
    async def _log_state_transition(self, from_state: CircuitBreakerState, to_state: CircuitBreakerState):
        """Log state transition with metrics"""
        transition = {
            "timestamp": datetime.utcnow().isoformat(),
            "from_state": from_state.value,
            "to_state": to_state.value,
            "failure_count": self.metrics.current_failure_count,
            "success_count": self.metrics.current_success_count,
            "total_requests": self.metrics.total_requests
        }
        
        self.metrics.state_transitions.append(transition)
        
        # Keep only last 50 transitions
        if len(self.metrics.state_transitions) > 50:
            self.metrics.state_transitions = self.metrics.state_transitions[-50:]
    
    async def _get_adaptive_failure_threshold(self) -> int:
        """Get adaptive failure threshold based on recent performance"""
        if not self.config.adaptive_threshold:
            return self.config.failure_threshold
        
        # Calculate recent success rate
        if len(self.recent_success_rates) < 5:
            return self.config.failure_threshold
        
        avg_success_rate = sum(self.recent_success_rates) / len(self.recent_success_rates)
        
        # Adjust threshold based on recent performance
        if avg_success_rate > 0.95:  # Very good performance
            return self.config.failure_threshold + 2
        elif avg_success_rate > 0.90:  # Good performance
            return self.config.failure_threshold + 1
        elif avg_success_rate < 0.80:  # Poor performance
            return max(2, self.config.failure_threshold - 1)
        else:
            return self.config.failure_threshold
    
    async def _update_adaptive_threshold(self, success: bool):
        """Update adaptive threshold based on recent results"""
        # Calculate success rate over recent window
        window_size = 20
        recent_results = getattr(self, '_recent_results', [])
        recent_results.append(success)
        
        if len(recent_results) > window_size:
            recent_results = recent_results[-window_size:]
        
        self._recent_results = recent_results
        
        # Update success rate tracking
        if len(recent_results) >= window_size:
            success_rate = sum(recent_results) / len(recent_results)
            self.recent_success_rates.append(success_rate)
            
            # Keep only recent success rates
            if len(self.recent_success_rates) > 10:
                self.recent_success_rates = self.recent_success_rates[-10:]
    
    async def _periodic_health_check(self):
        """Perform periodic health checks"""
        while True:
            try:
                await asyncio.sleep(self.config.health_check_interval)
                
                # Check if we should adjust thresholds based on long-term performance
                if self.metrics.total_requests > 100:
                    overall_success_rate = (
                        self.metrics.successful_requests / self.metrics.total_requests
                    )
                    
                    # Log health status
                    logger.debug(
                        f"Circuit breaker '{self.config.name}' health check: "
                        f"State={self.state.value}, "
                        f"Success rate={overall_success_rate:.2%}, "
                        f"Avg response time={self.metrics.avg_response_time:.2f}s"
                    )
                
            except Exception as e:
                logger.error(f"Error in circuit breaker health check: {str(e)}")
    
    async def force_open(self):
        """Force circuit breaker to open state (for testing/maintenance)"""
        await self._transition_to_open()
        logger.warning(f"Circuit breaker '{self.config.name}' was forcibly opened")
    
    async def force_close(self):
        """Force circuit breaker to closed state (for recovery)"""
        await self._transition_to_closed()
        logger.info(f"Circuit breaker '{self.config.name}' was forcibly closed")
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get comprehensive circuit breaker metrics"""
        success_rate = 0.0
        if self.metrics.total_requests > 0:
            success_rate = self.metrics.successful_requests / self.metrics.total_requests
        
        return {
            "name": self.config.name,
            "state": self.state.value,
            "metrics": {
                "total_requests": self.metrics.total_requests,
                "successful_requests": self.metrics.successful_requests,
                "failed_requests": self.metrics.failed_requests,
                "success_rate": f"{success_rate:.2%}",
                "circuit_opened_count": self.metrics.circuit_opened_count,
                "circuit_closed_count": self.metrics.circuit_closed_count,
                "current_failure_count": self.metrics.current_failure_count,
                "current_success_count": self.metrics.current_success_count,
                "avg_response_time": f"{self.metrics.avg_response_time:.3f}s",
                "last_failure_time": self.metrics.last_failure_time.isoformat() if self.metrics.last_failure_time else None,
                "last_success_time": self.metrics.last_success_time.isoformat() if self.metrics.last_success_time else None
            },
            "configuration": {
                "failure_threshold": self.config.failure_threshold,
                "recovery_timeout": self.config.recovery_timeout,
                "success_threshold": self.config.success_threshold,
                "adaptive_threshold": self.config.adaptive_threshold
            },
            "state_transitions": self.metrics.state_transitions[-10:]  # Last 10 transitions
        }
    
    async def reset(self):
        """Reset circuit breaker to initial state"""
        self.state = CircuitBreakerState.CLOSED
        self.metrics = CircuitBreakerMetrics()
        self.last_failure_time = None
        self.next_attempt_time = None
        self.current_recovery_timeout = self.config.recovery_timeout
        self.recent_success_rates = []
        
        logger.info(f"Circuit breaker '{self.config.name}' has been reset")
    
    async def cleanup(self):
        """Clean up circuit breaker resources"""
        if self._health_check_task:
            self._health_check_task.cancel()
            try:
                await self._health_check_task
            except asyncio.CancelledError:
                pass


class CircuitBreakerManager:
    """
    Manager for multiple circuit breakers with centralized monitoring
    """
    
    def __init__(self):
        self.circuit_breakers: Dict[str, EnhancedCircuitBreaker] = {}
        self._monitoring_task = None
        self._start_monitoring()
    
    def create_circuit_breaker(
        self,
        name: str,
        failure_threshold: int = 5,
        recovery_timeout: int = 60,
        **kwargs
    ) -> EnhancedCircuitBreaker:
        """Create and register a new circuit breaker"""
        config = CircuitBreakerConfig(
            name=name,
            failure_threshold=failure_threshold,
            recovery_timeout=recovery_timeout,
            **kwargs
        )
        
        circuit_breaker = EnhancedCircuitBreaker(config)
        self.circuit_breakers[name] = circuit_breaker
        
        logger.info(f"Created circuit breaker '{name}' with threshold {failure_threshold}")
        return circuit_breaker
    
    def get_circuit_breaker(self, name: str) -> Optional[EnhancedCircuitBreaker]:
        """Get circuit breaker by name"""
        return self.circuit_breakers.get(name)
    
    def get_all_metrics(self) -> Dict[str, Any]:
        """Get metrics for all circuit breakers"""
        return {
            name: cb.get_metrics()
            for name, cb in self.circuit_breakers.items()
        }
    
    def get_health_status(self) -> Dict[str, Any]:
        """Get overall health status"""
        total_breakers = len(self.circuit_breakers)
        open_breakers = sum(
            1 for cb in self.circuit_breakers.values()
            if cb.state == CircuitBreakerState.OPEN
        )
        
        health_status = "healthy"
        if open_breakers > 0:
            if open_breakers == total_breakers:
                health_status = "critical"
            else:
                health_status = "degraded"
        
        return {
            "overall_health": health_status,
            "total_circuit_breakers": total_breakers,
            "open_circuit_breakers": open_breakers,
            "healthy_circuit_breakers": total_breakers - open_breakers,
            "timestamp": datetime.utcnow().isoformat()
        }
    
    def _start_monitoring(self):
        """Start monitoring task for all circuit breakers"""
        self._monitoring_task = asyncio.create_task(self._monitor_circuit_breakers())
    
    async def _monitor_circuit_breakers(self):
        """Monitor all circuit breakers and log status"""
        while True:
            try:
                await asyncio.sleep(300)  # Monitor every 5 minutes
                
                health_status = self.get_health_status()
                
                if health_status["overall_health"] != "healthy":
                    logger.warning(
                        f"Circuit breakers health check: {health_status['overall_health']} - "
                        f"{health_status['open_circuit_breakers']}/{health_status['total_circuit_breakers']} open"
                    )
                
            except Exception as e:
                logger.error(f"Error in circuit breaker monitoring: {str(e)}")
    
    async def reset_all(self):
        """Reset all circuit breakers"""
        for circuit_breaker in self.circuit_breakers.values():
            await circuit_breaker.reset()
        
        logger.info("All circuit breakers have been reset")
    
    async def cleanup(self):
        """Clean up all circuit breakers and monitoring"""
        if self._monitoring_task:
            self._monitoring_task.cancel()
            try:
                await self._monitoring_task
            except asyncio.CancelledError:
                pass
        
        for circuit_breaker in self.circuit_breakers.values():
            await circuit_breaker.cleanup()
        
        self.circuit_breakers.clear()
        logger.info("Circuit breaker manager cleanup completed")


# Global circuit breaker manager instance
circuit_breaker_manager = CircuitBreakerManager()


# Decorator for easy circuit breaker usage
def with_circuit_breaker(
    name: str,
    failure_threshold: int = 5,
    recovery_timeout: int = 60,
    **kwargs
):
    """Decorator to add circuit breaker protection to functions"""
    def decorator(func):
        circuit_breaker = circuit_breaker_manager.create_circuit_breaker(
            name, failure_threshold, recovery_timeout, **kwargs
        )
        
        async def wrapper(*args, **kwargs):
            return await circuit_breaker(func, *args, **kwargs)
        
        return wrapper
    return decorator