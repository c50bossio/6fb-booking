"""
Circuit Breaker Pattern Implementation for BookedBarber V2
=========================================================

Production-ready circuit breaker implementation for protecting against external service failures.
Implements the Circuit Breaker pattern with three states: CLOSED, OPEN, and HALF_OPEN.

Features:
- Automatic failure detection and recovery
- Configurable failure thresholds and timeouts
- Metrics collection and monitoring
- Redis-based state storage for distributed systems
- Integration with external services (Stripe, SendGrid, Twilio, etc.)

Usage:
    from services.circuit_breaker import circuit_breaker_manager
    
    # Apply circuit breaker to external service calls
    @circuit_breaker_manager.protect("stripe_payments")
    async def process_payment(payment_data):
        return await stripe_client.create_payment_intent(payment_data)
"""

import asyncio
import time
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, Callable, Union
from dataclasses import dataclass, asdict
from enum import Enum
from functools import wraps

from services.redis_cache import cache_service
from config.redis_config import get_redis_config

logger = logging.getLogger(__name__)


class CircuitBreakerState(Enum):
    """Circuit breaker states."""
    CLOSED = "closed"        # Normal operation
    OPEN = "open"           # Failing, requests blocked
    HALF_OPEN = "half_open" # Testing recovery


@dataclass
class CircuitBreakerConfig:
    """Circuit breaker configuration."""
    failure_threshold: int = 5          # Failures to trigger OPEN
    recovery_timeout: int = 60          # Seconds before trying HALF_OPEN
    success_threshold: int = 3          # Successes to close from HALF_OPEN
    timeout: float = 30.0               # Request timeout in seconds
    expected_exception: tuple = ()       # Expected exception types
    fallback_function: Optional[Callable] = None


@dataclass
class CircuitBreakerStats:
    """Circuit breaker statistics."""
    state: CircuitBreakerState
    failure_count: int
    success_count: int
    total_requests: int
    last_failure_time: Optional[float]
    last_success_time: Optional[float]
    state_changed_time: float
    next_attempt_time: Optional[float]


class CircuitBreakerError(Exception):
    """Circuit breaker specific exceptions."""
    pass


class CircuitBreakerOpenError(CircuitBreakerError):
    """Raised when circuit breaker is open."""
    pass


class CircuitBreaker:
    """Circuit breaker implementation for a single service."""
    
    def __init__(self, name: str, config: CircuitBreakerConfig):
        """
        Initialize circuit breaker.
        
        Args:
            name: Unique name for the circuit breaker
            config: Circuit breaker configuration
        """
        self.name = name
        self.config = config
        self.redis_config = get_redis_config()
        self.cache = cache_service
        
        # Redis keys for storing state
        self.stats_key = f"{self.redis_config.prefix_cache}circuit_breaker:{name}:stats"
        self.metrics_key = f"{self.redis_config.prefix_cache}circuit_breaker:{name}:metrics"
        
        # Initialize stats if not exists
        self._initialize_stats()
        
        logger.info(f"Circuit breaker '{name}' initialized with threshold={config.failure_threshold}")
    
    def _initialize_stats(self) -> None:
        """Initialize circuit breaker stats if not exists."""
        if not self.cache.exists(self.stats_key):
            initial_stats = CircuitBreakerStats(
                state=CircuitBreakerState.CLOSED,
                failure_count=0,
                success_count=0,
                total_requests=0,
                last_failure_time=None,
                last_success_time=None,
                state_changed_time=time.time(),
                next_attempt_time=None
            )
            self._save_stats(initial_stats)
    
    def _load_stats(self) -> CircuitBreakerStats:
        """Load stats from Redis."""
        try:
            stats_data = self.cache.get(self.stats_key)
            if stats_data:
                stats_dict = stats_data
                # Convert state string back to enum
                stats_dict['state'] = CircuitBreakerState(stats_dict['state'])
                return CircuitBreakerStats(**stats_dict)
        except Exception as e:
            logger.error(f"Error loading circuit breaker stats for {self.name}: {e}")
        
        # Return default stats if loading fails
        return CircuitBreakerStats(
            state=CircuitBreakerState.CLOSED,
            failure_count=0,
            success_count=0,
            total_requests=0,
            last_failure_time=None,
            last_success_time=None,
            state_changed_time=time.time(),
            next_attempt_time=None
        )
    
    def _save_stats(self, stats: CircuitBreakerStats) -> None:
        """Save stats to Redis."""
        try:
            stats_dict = asdict(stats)
            # Convert enum to string for JSON serialization
            stats_dict['state'] = stats.state.value
            self.cache.set(self.stats_key, stats_dict, ttl=3600)
        except Exception as e:
            logger.error(f"Error saving circuit breaker stats for {self.name}: {e}")
    
    def _record_success(self) -> None:
        """Record a successful request."""
        stats = self._load_stats()
        stats.success_count += 1
        stats.total_requests += 1
        stats.last_success_time = time.time()
        
        current_time = time.time()
        
        # State transitions
        if stats.state == CircuitBreakerState.HALF_OPEN:
            if stats.success_count >= self.config.success_threshold:
                # Transition to CLOSED
                logger.info(f"Circuit breaker '{self.name}' transitioning to CLOSED")
                stats.state = CircuitBreakerState.CLOSED
                stats.state_changed_time = current_time
                stats.failure_count = 0
                stats.success_count = 0
                stats.next_attempt_time = None
        
        self._save_stats(stats)
    
    def _record_failure(self, exception: Exception) -> None:
        """Record a failed request."""
        stats = self._load_stats()
        stats.failure_count += 1
        stats.total_requests += 1
        stats.last_failure_time = time.time()
        
        current_time = time.time()
        
        # State transitions
        if stats.state == CircuitBreakerState.CLOSED:
            if stats.failure_count >= self.config.failure_threshold:
                # Transition to OPEN
                logger.warning(f"Circuit breaker '{self.name}' transitioning to OPEN after {stats.failure_count} failures")
                stats.state = CircuitBreakerState.OPEN
                stats.state_changed_time = current_time
                stats.next_attempt_time = current_time + self.config.recovery_timeout
                
                # Reset counters
                stats.success_count = 0
        
        elif stats.state == CircuitBreakerState.HALF_OPEN:
            # Transition back to OPEN
            logger.warning(f"Circuit breaker '{self.name}' transitioning back to OPEN from HALF_OPEN")
            stats.state = CircuitBreakerState.OPEN
            stats.state_changed_time = current_time
            stats.next_attempt_time = current_time + self.config.recovery_timeout
            stats.success_count = 0
        
        self._save_stats(stats)
        
        # Log failure details
        logger.error(f"Circuit breaker '{self.name}' recorded failure: {exception}")
    
    def _can_execute(self) -> bool:
        """Check if request can be executed."""
        stats = self._load_stats()
        current_time = time.time()
        
        if stats.state == CircuitBreakerState.CLOSED:
            return True
        
        elif stats.state == CircuitBreakerState.OPEN:
            if stats.next_attempt_time and current_time >= stats.next_attempt_time:
                # Transition to HALF_OPEN
                logger.info(f"Circuit breaker '{self.name}' transitioning to HALF_OPEN for testing")
                stats.state = CircuitBreakerState.HALF_OPEN
                stats.state_changed_time = current_time
                stats.success_count = 0
                stats.next_attempt_time = None
                self._save_stats(stats)
                return True
            return False
        
        elif stats.state == CircuitBreakerState.HALF_OPEN:
            return True
        
        return False
    
    async def call(self, func: Callable, *args, **kwargs) -> Any:
        """
        Execute function with circuit breaker protection.
        
        Args:
            func: Function to execute
            *args: Function arguments
            **kwargs: Function keyword arguments
            
        Returns:
            Function result
            
        Raises:
            CircuitBreakerOpenError: When circuit breaker is open
            Exception: Original function exceptions
        """
        # Check if we can execute
        if not self._can_execute():
            stats = self._load_stats()
            if self.config.fallback_function:
                logger.info(f"Circuit breaker '{self.name}' is open, executing fallback")
                return await self.config.fallback_function(*args, **kwargs)
            else:
                next_attempt = stats.next_attempt_time or time.time()
                raise CircuitBreakerOpenError(
                    f"Circuit breaker '{self.name}' is open. Next attempt at {datetime.fromtimestamp(next_attempt)}"
                )
        
        # Execute function with timeout
        try:
            if asyncio.iscoroutinefunction(func):
                result = await asyncio.wait_for(func(*args, **kwargs), timeout=self.config.timeout)
            else:
                result = func(*args, **kwargs)
            
            # Record success
            self._record_success()
            return result
        
        except asyncio.TimeoutError as e:
            logger.error(f"Circuit breaker '{self.name}' timeout after {self.config.timeout}s")
            self._record_failure(e)
            raise
        
        except Exception as e:
            # Check if this is an expected exception type
            if self.config.expected_exception and isinstance(e, self.config.expected_exception):
                self._record_failure(e)
            raise
    
    def get_stats(self) -> CircuitBreakerStats:
        """Get current circuit breaker statistics."""
        return self._load_stats()
    
    def reset(self) -> None:
        """Reset circuit breaker to initial state."""
        logger.info(f"Resetting circuit breaker '{self.name}'")
        initial_stats = CircuitBreakerStats(
            state=CircuitBreakerState.CLOSED,
            failure_count=0,
            success_count=0,
            total_requests=0,
            last_failure_time=None,
            last_success_time=None,
            state_changed_time=time.time(),
            next_attempt_time=None
        )
        self._save_stats(initial_stats)


class CircuitBreakerManager:
    """Manages multiple circuit breakers for different services."""
    
    def __init__(self):
        """Initialize circuit breaker manager."""
        self.breakers: Dict[str, CircuitBreaker] = {}
        self.redis_config = get_redis_config()
        
        # Default configurations for different service types
        self.default_configs = {
            'stripe_payments': CircuitBreakerConfig(
                failure_threshold=3,
                recovery_timeout=60,
                success_threshold=2,
                timeout=30.0,
                expected_exception=(Exception,)
            ),
            'stripe_connect': CircuitBreakerConfig(
                failure_threshold=3,
                recovery_timeout=120,
                success_threshold=2,
                timeout=30.0,
                expected_exception=(Exception,)
            ),
            'sendgrid_email': CircuitBreakerConfig(
                failure_threshold=5,
                recovery_timeout=300,  # 5 minutes
                success_threshold=3,
                timeout=10.0,
                expected_exception=(Exception,)
            ),
            'twilio_sms': CircuitBreakerConfig(
                failure_threshold=5,
                recovery_timeout=300,  # 5 minutes
                success_threshold=3,
                timeout=10.0,
                expected_exception=(Exception,)
            ),
            'google_calendar': CircuitBreakerConfig(
                failure_threshold=4,
                recovery_timeout=180,  # 3 minutes
                success_threshold=2,
                timeout=20.0,
                expected_exception=(Exception,)
            ),
            'google_my_business': CircuitBreakerConfig(
                failure_threshold=4,
                recovery_timeout=300,  # 5 minutes
                success_threshold=3,
                timeout=15.0,
                expected_exception=(Exception,)
            ),
            'database': CircuitBreakerConfig(
                failure_threshold=2,  # Lower threshold for critical service
                recovery_timeout=30,   # Quick recovery
                success_threshold=1,
                timeout=5.0,
                expected_exception=(Exception,)
            ),
            'redis_cache': CircuitBreakerConfig(
                failure_threshold=3,
                recovery_timeout=60,
                success_threshold=2,
                timeout=5.0,
                expected_exception=(Exception,)
            ),
            'default': CircuitBreakerConfig(
                failure_threshold=5,
                recovery_timeout=120,
                success_threshold=3,
                timeout=30.0,
                expected_exception=(Exception,)
            )
        }
        
        logger.info("Circuit breaker manager initialized")
    
    def get_breaker(self, name: str, config: Optional[CircuitBreakerConfig] = None) -> CircuitBreaker:
        """
        Get or create a circuit breaker.
        
        Args:
            name: Circuit breaker name
            config: Optional custom configuration
            
        Returns:
            CircuitBreaker instance
        """
        if name not in self.breakers:
            if config is None:
                config = self.default_configs.get(name, self.default_configs['default'])
            
            self.breakers[name] = CircuitBreaker(name, config)
            logger.info(f"Created circuit breaker '{name}'")
        
        return self.breakers[name]
    
    def protect(self, service_name: str, config: Optional[CircuitBreakerConfig] = None):
        """
        Decorator to protect a function with circuit breaker.
        
        Args:
            service_name: Name of the service being protected
            config: Optional circuit breaker configuration
            
        Returns:
            Decorated function
        """
        def decorator(func: Callable):
            breaker = self.get_breaker(service_name, config)
            
            @wraps(func)
            async def wrapper(*args, **kwargs):
                return await breaker.call(func, *args, **kwargs)
            
            return wrapper
        return decorator
    
    async def execute_with_breaker(self, service_name: str, func: Callable, *args, **kwargs) -> Any:
        """
        Execute function with circuit breaker protection.
        
        Args:
            service_name: Name of the service
            func: Function to execute
            *args: Function arguments
            **kwargs: Function keyword arguments
            
        Returns:
            Function result
        """
        breaker = self.get_breaker(service_name)
        return await breaker.call(func, *args, **kwargs)
    
    def get_all_stats(self) -> Dict[str, Dict[str, Any]]:
        """Get statistics for all circuit breakers."""
        stats = {}
        for name, breaker in self.breakers.items():
            breaker_stats = breaker.get_stats()
            stats[name] = {
                'state': breaker_stats.state.value,
                'failure_count': breaker_stats.failure_count,
                'success_count': breaker_stats.success_count,
                'total_requests': breaker_stats.total_requests,
                'success_rate': (breaker_stats.success_count / breaker_stats.total_requests * 100) if breaker_stats.total_requests > 0 else 0,
                'last_failure_time': datetime.fromtimestamp(breaker_stats.last_failure_time).isoformat() if breaker_stats.last_failure_time else None,
                'last_success_time': datetime.fromtimestamp(breaker_stats.last_success_time).isoformat() if breaker_stats.last_success_time else None,
                'next_attempt_time': datetime.fromtimestamp(breaker_stats.next_attempt_time).isoformat() if breaker_stats.next_attempt_time else None
            }
        return stats
    
    def reset_breaker(self, name: str) -> bool:
        """Reset specific circuit breaker."""
        if name in self.breakers:
            self.breakers[name].reset()
            return True
        return False
    
    def reset_all_breakers(self) -> None:
        """Reset all circuit breakers."""
        logger.info("Resetting all circuit breakers")
        for breaker in self.breakers.values():
            breaker.reset()
    
    def get_health_status(self) -> Dict[str, Any]:
        """Get overall health status of all circuit breakers."""
        total_breakers = len(self.breakers)
        if total_breakers == 0:
            return {
                'status': 'healthy',
                'total_breakers': 0,
                'open_breakers': 0,
                'half_open_breakers': 0,
                'closed_breakers': 0
            }
        
        open_count = 0
        half_open_count = 0
        closed_count = 0
        
        for breaker in self.breakers.values():
            stats = breaker.get_stats()
            if stats.state == CircuitBreakerState.OPEN:
                open_count += 1
            elif stats.state == CircuitBreakerState.HALF_OPEN:
                half_open_count += 1
            else:
                closed_count += 1
        
        # Determine overall health
        if open_count == 0:
            status = 'healthy'
        elif open_count <= total_breakers * 0.3:  # Less than 30% open
            status = 'degraded'
        else:
            status = 'critical'
        
        return {
            'status': status,
            'total_breakers': total_breakers,
            'open_breakers': open_count,
            'half_open_breakers': half_open_count,
            'closed_breakers': closed_count,
            'health_percentage': (closed_count / total_breakers) * 100
        }


# Global circuit breaker manager instance
circuit_breaker_manager = CircuitBreakerManager()


# Convenience functions for common use cases
async def stripe_payment_with_breaker(func: Callable, *args, **kwargs) -> Any:
    """Execute Stripe payment function with circuit breaker protection."""
    return await circuit_breaker_manager.execute_with_breaker('stripe_payments', func, *args, **kwargs)


async def sendgrid_email_with_breaker(func: Callable, *args, **kwargs) -> Any:
    """Execute SendGrid email function with circuit breaker protection."""
    return await circuit_breaker_manager.execute_with_breaker('sendgrid_email', func, *args, **kwargs)


async def twilio_sms_with_breaker(func: Callable, *args, **kwargs) -> Any:
    """Execute Twilio SMS function with circuit breaker protection."""
    return await circuit_breaker_manager.execute_with_breaker('twilio_sms', func, *args, **kwargs)


async def google_calendar_with_breaker(func: Callable, *args, **kwargs) -> Any:
    """Execute Google Calendar function with circuit breaker protection."""
    return await circuit_breaker_manager.execute_with_breaker('google_calendar', func, *args, **kwargs)


# Usage examples:
"""
# Method 1: Using decorator
@circuit_breaker_manager.protect("stripe_payments")
async def create_payment_intent(amount: int, currency: str = "usd"):
    return await stripe_client.create_payment_intent(amount=amount, currency=currency)

# Method 2: Using context manager
async def send_notification_email(email: str, message: str):
    return await sendgrid_email_with_breaker(
        sendgrid_client.send_email,
        to_email=email,
        content=message
    )

# Method 3: Direct execution
async def sync_calendar_event(event_data):
    return await circuit_breaker_manager.execute_with_breaker(
        'google_calendar',
        google_calendar_service.create_event,
        event_data
    )
"""