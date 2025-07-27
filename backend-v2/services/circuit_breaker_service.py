"""
Circuit Breaker Service for External Dependencies
Implements circuit breaker pattern to prevent cascading failures and ensure graceful degradation
"""

import asyncio
import logging
import time
from typing import Dict, Any, Optional, Callable, Union
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum
import json

from services.redis_service import cache_service


class CircuitState(Enum):
    CLOSED = "closed"      # Normal operation, requests allowed
    OPEN = "open"          # Circuit breaker open, requests blocked
    HALF_OPEN = "half_open"  # Testing if service recovered


@dataclass
class CircuitBreakerConfig:
    failure_threshold: int = 5  # Number of failures before opening
    recovery_timeout: int = 60  # Seconds before attempting recovery
    success_threshold: int = 3  # Successful requests needed to close
    request_timeout: float = 10.0  # Request timeout in seconds
    error_rate_threshold: float = 0.5  # Error rate threshold (50%)
    min_requests: int = 10  # Minimum requests before evaluating error rate


@dataclass
class CircuitBreakerState:
    state: CircuitState = CircuitState.CLOSED
    failure_count: int = 0
    success_count: int = 0
    last_failure_time: Optional[datetime] = None
    last_success_time: Optional[datetime] = None
    request_count: int = 0
    error_count: int = 0
    next_attempt_time: Optional[datetime] = None


class CircuitBreakerService:
    """
    Circuit breaker service managing external dependency resilience
    Prevents cascading failures and ensures graceful degradation
    """
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.circuits: Dict[str, CircuitBreakerState] = {}
        self.configs: Dict[str, CircuitBreakerConfig] = {}
        
        # Initialize default circuit breakers for critical services
        self._initialize_default_circuits()
        
        self.logger.info("🔌 Circuit Breaker Service initialized")
    
    def _initialize_default_circuits(self):
        """Initialize circuit breakers for critical external services"""
        
        # Stripe payment processing
        self.register_circuit("stripe", CircuitBreakerConfig(
            failure_threshold=3,
            recovery_timeout=30,
            success_threshold=2,
            request_timeout=15.0,
            error_rate_threshold=0.3,
            min_requests=5
        ))
        
        # SendGrid email service
        self.register_circuit("sendgrid", CircuitBreakerConfig(
            failure_threshold=5,
            recovery_timeout=60,
            success_threshold=3,
            request_timeout=10.0,
            error_rate_threshold=0.4,
            min_requests=10
        ))
        
        # Twilio SMS service
        self.register_circuit("twilio", CircuitBreakerConfig(
            failure_threshold=3,
            recovery_timeout=45,
            success_threshold=2,
            request_timeout=8.0,
            error_rate_threshold=0.3,
            min_requests=5
        ))
        
        # Google Calendar API
        self.register_circuit("google_calendar", CircuitBreakerConfig(
            failure_threshold=3,
            recovery_timeout=120,
            success_threshold=2,
            request_timeout=20.0,
            error_rate_threshold=0.4,
            min_requests=5
        ))
        
        # Database connections
        self.register_circuit("database", CircuitBreakerConfig(
            failure_threshold=2,
            recovery_timeout=15,
            success_threshold=3,
            request_timeout=5.0,
            error_rate_threshold=0.2,
            min_requests=5
        ))
        
        # Redis cache
        self.register_circuit("redis", CircuitBreakerConfig(
            failure_threshold=3,
            recovery_timeout=30,
            success_threshold=2,
            request_timeout=2.0,
            error_rate_threshold=0.3,
            min_requests=10
        ))
    
    def register_circuit(self, service_name: str, config: CircuitBreakerConfig):
        """Register a new circuit breaker for a service"""
        self.configs[service_name] = config
        self.circuits[service_name] = CircuitBreakerState()
        
        self.logger.info(f"📋 Registered circuit breaker for {service_name}")
    
    async def call(self, service_name: str, func: Callable, *args, **kwargs) -> Any:
        """
        Execute a function with circuit breaker protection
        Returns result on success, raises exception on failure or circuit open
        """
        if service_name not in self.circuits:
            self.logger.warning(f"⚠️ No circuit breaker registered for {service_name}")
            return await func(*args, **kwargs)
        
        circuit = self.circuits[service_name]
        config = self.configs[service_name]
        
        # Check circuit state
        if not self._can_execute(service_name):
            raise CircuitBreakerOpenException(f"Circuit breaker open for {service_name}")
        
        try:
            # Execute with timeout
            start_time = time.time()
            
            if asyncio.iscoroutinefunction(func):
                result = await asyncio.wait_for(
                    func(*args, **kwargs), 
                    timeout=config.request_timeout
                )
            else:
                result = func(*args, **kwargs)
            
            # Record success
            await self._record_success(service_name)
            
            response_time = time.time() - start_time
            self.logger.debug(f"✅ {service_name} call succeeded in {response_time:.2f}s")
            
            return result
            
        except asyncio.TimeoutError as e:
            await self._record_failure(service_name, f"Timeout after {config.request_timeout}s")
            raise CircuitBreakerTimeoutException(f"{service_name} timeout: {e}")
            
        except Exception as e:
            await self._record_failure(service_name, str(e))
            raise
    
    def _can_execute(self, service_name: str) -> bool:
        """Check if a request can be executed based on circuit state"""
        circuit = self.circuits[service_name]
        config = self.configs[service_name]
        current_time = datetime.utcnow()
        
        if circuit.state == CircuitState.CLOSED:
            return True
        
        elif circuit.state == CircuitState.OPEN:
            # Check if recovery timeout has passed
            if (circuit.next_attempt_time and 
                current_time >= circuit.next_attempt_time):
                # Transition to half-open
                circuit.state = CircuitState.HALF_OPEN
                circuit.success_count = 0
                self.logger.info(f"🔄 Circuit breaker for {service_name} transitioning to HALF_OPEN")
                return True
            return False
        
        elif circuit.state == CircuitState.HALF_OPEN:
            # Allow limited requests to test recovery
            return True
        
        return False
    
    async def _record_success(self, service_name: str):
        """Record a successful request"""
        circuit = self.circuits[service_name]
        config = self.configs[service_name]
        
        circuit.success_count += 1
        circuit.request_count += 1
        circuit.last_success_time = datetime.utcnow()
        
        # If in half-open state, check if we can close the circuit
        if circuit.state == CircuitState.HALF_OPEN:
            if circuit.success_count >= config.success_threshold:
                circuit.state = CircuitState.CLOSED
                circuit.failure_count = 0
                circuit.success_count = 0
                circuit.request_count = 0
                circuit.error_count = 0
                circuit.next_attempt_time = None
                
                self.logger.info(f"✅ Circuit breaker for {service_name} CLOSED - service recovered")
        
        # Store state in Redis for persistence
        await self._persist_circuit_state(service_name)
    
    async def _record_failure(self, service_name: str, error_message: str):
        """Record a failed request"""
        circuit = self.circuits[service_name]
        config = self.configs[service_name]
        
        circuit.failure_count += 1
        circuit.error_count += 1
        circuit.request_count += 1
        circuit.last_failure_time = datetime.utcnow()
        
        self.logger.warning(f"❌ {service_name} failure: {error_message}")
        
        # Check if we should open the circuit
        should_open = False
        
        # Failure threshold exceeded
        if circuit.failure_count >= config.failure_threshold:
            should_open = True
            reason = f"failure threshold ({config.failure_threshold}) exceeded"
        
        # Error rate threshold exceeded (if we have enough requests)
        elif circuit.request_count >= config.min_requests:
            error_rate = circuit.error_count / circuit.request_count
            if error_rate >= config.error_rate_threshold:
                should_open = True
                reason = f"error rate ({error_rate:.2f}) exceeded threshold ({config.error_rate_threshold})"
        
        if should_open and circuit.state != CircuitState.OPEN:
            circuit.state = CircuitState.OPEN
            circuit.next_attempt_time = datetime.utcnow() + timedelta(seconds=config.recovery_timeout)
            
            self.logger.error(f"🚨 Circuit breaker for {service_name} OPENED - {reason}")
            
            # Send alert
            await self._send_circuit_breaker_alert(service_name, reason)
        
        # Store state in Redis for persistence
        await self._persist_circuit_state(service_name)
    
    async def _persist_circuit_state(self, service_name: str):
        """Persist circuit breaker state to Redis"""
        try:
            circuit = self.circuits[service_name]
            
            state_data = {
                "state": circuit.state.value,
                "failure_count": circuit.failure_count,
                "success_count": circuit.success_count,
                "request_count": circuit.request_count,
                "error_count": circuit.error_count,
                "last_failure_time": circuit.last_failure_time.isoformat() if circuit.last_failure_time else None,
                "last_success_time": circuit.last_success_time.isoformat() if circuit.last_success_time else None,
                "next_attempt_time": circuit.next_attempt_time.isoformat() if circuit.next_attempt_time else None,
                "timestamp": datetime.utcnow().isoformat()
            }
            
            cache_service.set(f"circuit_breaker:{service_name}", json.dumps(state_data), ttl=3600)
            
        except Exception as e:
            self.logger.error(f"❌ Failed to persist circuit state for {service_name}: {e}")
    
    async def _send_circuit_breaker_alert(self, service_name: str, reason: str):
        """Send alert when circuit breaker opens"""
        try:
            from services.sentry_monitoring import sentry_service
            
            if hasattr(sentry_service, 'capture_message'):
                sentry_service.capture_message(
                    f"Circuit Breaker Opened: {service_name}",
                    level="error",
                    extra={
                        "service": service_name,
                        "reason": reason,
                        "circuit_state": self.circuits[service_name].state.value,
                        "failure_count": self.circuits[service_name].failure_count
                    }
                )
            
        except Exception as e:
            self.logger.error(f"❌ Failed to send circuit breaker alert: {e}")
    
    def force_open(self, service_name: str, reason: str = "Manual override"):
        """Manually open a circuit breaker"""
        if service_name in self.circuits:
            circuit = self.circuits[service_name]
            config = self.configs[service_name]
            
            circuit.state = CircuitState.OPEN
            circuit.next_attempt_time = datetime.utcnow() + timedelta(seconds=config.recovery_timeout)
            
            self.logger.warning(f"🔧 Manually opened circuit breaker for {service_name}: {reason}")
    
    def force_close(self, service_name: str, reason: str = "Manual override"):
        """Manually close a circuit breaker"""
        if service_name in self.circuits:
            circuit = self.circuits[service_name]
            
            circuit.state = CircuitState.CLOSED
            circuit.failure_count = 0
            circuit.success_count = 0
            circuit.next_attempt_time = None
            
            self.logger.info(f"🔧 Manually closed circuit breaker for {service_name}: {reason}")
    
    def get_circuit_status(self, service_name: str) -> Dict[str, Any]:
        """Get current status of a circuit breaker"""
        if service_name not in self.circuits:
            return {"error": f"Circuit breaker not found for {service_name}"}
        
        circuit = self.circuits[service_name]
        config = self.configs[service_name]
        
        return {
            "service": service_name,
            "state": circuit.state.value,
            "failure_count": circuit.failure_count,
            "success_count": circuit.success_count,
            "request_count": circuit.request_count,
            "error_count": circuit.error_count,
            "error_rate": circuit.error_count / max(circuit.request_count, 1),
            "last_failure": circuit.last_failure_time.isoformat() if circuit.last_failure_time else None,
            "last_success": circuit.last_success_time.isoformat() if circuit.last_success_time else None,
            "next_attempt": circuit.next_attempt_time.isoformat() if circuit.next_attempt_time else None,
            "config": {
                "failure_threshold": config.failure_threshold,
                "recovery_timeout": config.recovery_timeout,
                "success_threshold": config.success_threshold,
                "request_timeout": config.request_timeout,
                "error_rate_threshold": config.error_rate_threshold
            }
        }
    
    def get_all_circuits_status(self) -> Dict[str, Any]:
        """Get status of all circuit breakers"""
        return {
            "circuits": {
                name: self.get_circuit_status(name)
                for name in self.circuits.keys()
            },
            "summary": {
                "total_circuits": len(self.circuits),
                "open_circuits": len([c for c in self.circuits.values() if c.state == CircuitState.OPEN]),
                "half_open_circuits": len([c for c in self.circuits.values() if c.state == CircuitState.HALF_OPEN]),
                "closed_circuits": len([c for c in self.circuits.values() if c.state == CircuitState.CLOSED])
            }
        }
    
    async def health_check(self) -> Dict[str, Any]:
        """Health check for circuit breaker service"""
        open_circuits = [
            name for name, circuit in self.circuits.items()
            if circuit.state == CircuitState.OPEN
        ]
        
        status = "healthy"
        if len(open_circuits) > 0:
            status = "degraded" if len(open_circuits) <= 2 else "unhealthy"
        
        return {
            "status": status,
            "open_circuits": open_circuits,
            "total_circuits": len(self.circuits),
            "last_check": datetime.utcnow().isoformat()
        }


# Custom exceptions
class CircuitBreakerException(Exception):
    """Base exception for circuit breaker errors"""
    pass


class CircuitBreakerOpenException(CircuitBreakerException):
    """Raised when circuit breaker is open"""
    pass


class CircuitBreakerTimeoutException(CircuitBreakerException):
    """Raised when request times out"""
    pass


# Global circuit breaker service instance
circuit_breaker_service = CircuitBreakerService()


# Decorator for easy circuit breaker usage
def with_circuit_breaker(service_name: str):
    """Decorator to wrap functions with circuit breaker protection"""
    def decorator(func):
        async def async_wrapper(*args, **kwargs):
            return await circuit_breaker_service.call(service_name, func, *args, **kwargs)
        
        def sync_wrapper(*args, **kwargs):
            return circuit_breaker_service.call(service_name, func, *args, **kwargs)
        
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    
    return decorator