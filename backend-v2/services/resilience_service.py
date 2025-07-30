"""
Resilience and High Availability Service
Circuit breakers, failover mechanisms, load balancing, and graceful degradation
for the 6fb-booking platform with business context awareness
"""

import asyncio
import time
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Callable, Union
from dataclasses import dataclass, asdict, field
from collections import defaultdict, deque
from enum import Enum
import statistics
import random
from contextlib import asynccontextmanager
import httpx
from functools import wraps

from services.enhanced_sentry_monitoring import enhanced_sentry, AlertSeverity


logger = logging.getLogger(__name__)


class CircuitBreakerState(Enum):
    """Circuit breaker states"""
    CLOSED = "closed"           # Normal operation
    OPEN = "open"              # Failing, blocking requests
    HALF_OPEN = "half_open"    # Testing if service recovered


class FailoverStrategy(Enum):
    """Failover strategies"""
    IMMEDIATE = "immediate"           # Switch immediately on failure
    GRACEFUL = "graceful"            # Wait for existing requests to complete
    LOAD_SHEDDING = "load_shedding"  # Drop low-priority requests first
    CIRCUIT_BREAK = "circuit_break"   # Use circuit breakers


class ServiceTier(Enum):
    """Service tier classifications"""
    CRITICAL = "critical"       # Revenue blocking (payments, bookings)
    HIGH = "high"              # User blocking (auth, profiles)
    MEDIUM = "medium"          # Feature blocking (analytics, reports)
    LOW = "low"               # Background (notifications, sync)


@dataclass
class CircuitBreakerConfig:
    """Circuit breaker configuration"""
    name: str
    failure_threshold: int          # Number of failures to open circuit
    success_threshold: int          # Number of successes to close circuit
    timeout_seconds: int           # Time to wait before trying half-open
    failure_rate_threshold: float  # Percentage of failures to open (0-100)
    min_requests: int             # Minimum requests before evaluating
    window_size_seconds: int      # Time window for failure rate calculation
    service_tier: ServiceTier
    business_impact: str
    recovery_timeout: int = 60    # Seconds before reset attempt


@dataclass
class CircuitBreakerState:
    """Circuit breaker runtime state"""
    state: CircuitBreakerState
    failure_count: int
    success_count: int
    last_failure_time: datetime
    last_success_time: datetime
    state_changed_at: datetime
    request_count: int
    recent_requests: deque          # Recent request results
    metrics: Dict[str, Any] = field(default_factory=dict)


@dataclass 
class FailoverConfig:
    """Failover configuration"""
    primary_service: str
    fallback_services: List[str]
    strategy: FailoverStrategy
    health_check_interval: int     # Seconds
    max_retry_attempts: int
    retry_backoff_factor: float
    timeout_seconds: int
    priority_weights: Dict[str, float] = field(default_factory=dict)


@dataclass
class LoadBalancerConfig:
    """Load balancer configuration"""
    name: str
    algorithm: str                 # 'round_robin', 'weighted', 'least_connections'
    backends: List[Dict[str, Any]]
    health_check_path: str
    health_check_interval: int
    max_failures: int
    sticky_sessions: bool = False


@dataclass
class RateLimitConfig:
    """Rate limiting configuration"""
    name: str
    requests_per_second: int
    burst_size: int
    window_size_seconds: int
    strategy: str                  # 'sliding_window', 'token_bucket', 'fixed_window'
    service_tier: ServiceTier
    priority_levels: Dict[str, int] = field(default_factory=dict)


class ResilienceService:
    """Comprehensive resilience and high availability service"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        
        # Circuit breakers
        self.circuit_breakers = {}  # name -> CircuitBreakerState
        self.circuit_configs = {}   # name -> CircuitBreakerConfig
        
        # Failover management
        self.failover_configs = {}  # service -> FailoverConfig
        self.service_health = {}    # service -> health_status
        self.active_failovers = {}  # service -> current_backend
        
        # Load balancing
        self.load_balancers = {}    # name -> LoadBalancerConfig
        self.backend_health = {}    # backend_id -> health_status
        self.connection_counts = defaultdict(int)  # backend_id -> active_connections
        
        # Rate limiting
        self.rate_limiters = {}     # name -> RateLimitConfig
        self.rate_limit_state = {}  # (name, client_id) -> request_history
        
        # Graceful degradation
        self.degradation_rules = {}  # feature -> degradation_config
        self.current_degradations = set()  # active degradations
        
        # Health monitoring
        self._health_check_tasks = {}
        self._monitoring_task = None
        self._stop_monitoring = False
        
        # Metrics
        self.resilience_metrics = {
            'circuit_breaker_trips': defaultdict(int),
            'failover_events': defaultdict(int),
            'rate_limit_rejections': defaultdict(int),
            'degradation_activations': defaultdict(int),
            'recovery_events': defaultdict(int)
        }
        
        self._initialize_default_configs()
        self._start_monitoring()
    
    def _initialize_default_configs(self):
        """Initialize default resilience configurations"""
        
        # Circuit breakers for critical services
        self.add_circuit_breaker(CircuitBreakerConfig(
            name="stripe_payment_api",
            failure_threshold=5,
            success_threshold=3,
            timeout_seconds=60,
            failure_rate_threshold=50.0,
            min_requests=10,
            window_size_seconds=300,
            service_tier=ServiceTier.CRITICAL,
            business_impact="revenue_blocking",
            recovery_timeout=30
        ))
        
        self.add_circuit_breaker(CircuitBreakerConfig(
            name="booking_database",
            failure_threshold=3,
            success_threshold=2,
            timeout_seconds=30,
            failure_rate_threshold=30.0,
            min_requests=5,
            window_size_seconds=180,
            service_tier=ServiceTier.CRITICAL,
            business_impact="user_blocking",
            recovery_timeout=15
        ))
        
        self.add_circuit_breaker(CircuitBreakerConfig(
            name="sendgrid_email",
            failure_threshold=10,
            success_threshold=5,
            timeout_seconds=120,
            failure_rate_threshold=40.0,
            min_requests=20,
            window_size_seconds=600,
            service_tier=ServiceTier.MEDIUM,
            business_impact="notification_delay",
            recovery_timeout=60
        ))
        
        self.add_circuit_breaker(CircuitBreakerConfig(
            name="google_calendar_sync",
            failure_threshold=15,
            success_threshold=5,
            timeout_seconds=300,
            failure_rate_threshold=60.0,
            min_requests=10,
            window_size_seconds=900,
            service_tier=ServiceTier.LOW,
            business_impact="sync_delay",
            recovery_timeout=180
        ))
        
        # Rate limiting configurations
        self.add_rate_limiter(RateLimitConfig(
            name="booking_api",
            requests_per_second=10,
            burst_size=20,
            window_size_seconds=60,
            strategy="sliding_window",
            service_tier=ServiceTier.CRITICAL,
            priority_levels={"premium": 15, "standard": 10, "basic": 5}
        ))
        
        self.add_rate_limiter(RateLimitConfig(
            name="payment_api",
            requests_per_second=5,
            burst_size=10,
            window_size_seconds=60,
            strategy="token_bucket",
            service_tier=ServiceTier.CRITICAL,
            priority_levels={"payment": 5, "refund": 2}
        ))
        
        # Graceful degradation rules
        self.degradation_rules = {
            "real_time_analytics": {
                "fallback": "cached_analytics",
                "trigger_conditions": ["high_cpu_usage", "database_slow"],
                "business_impact": "delayed_insights"
            },
            "appointment_recommendations": {
                "fallback": "basic_availability",
                "trigger_conditions": ["ai_service_down", "high_latency"],
                "business_impact": "reduced_optimization"
            },
            "marketing_automation": {
                "fallback": "manual_triggers",
                "trigger_conditions": ["external_service_down"],
                "business_impact": "manual_intervention_required"
            }
        }
    
    def add_circuit_breaker(self, config: CircuitBreakerConfig):
        """Add a new circuit breaker"""
        
        self.circuit_configs[config.name] = config
        self.circuit_breakers[config.name] = CircuitBreakerState(
            state=CircuitBreakerState.CLOSED,
            failure_count=0,
            success_count=0,
            last_failure_time=datetime.min,
            last_success_time=datetime.min,
            state_changed_at=datetime.utcnow(),
            request_count=0,
            recent_requests=deque(maxlen=config.window_size_seconds)
        )
        
        self.logger.info(f"Circuit breaker added: {config.name}")
    
    def add_rate_limiter(self, config: RateLimitConfig):
        """Add a new rate limiter"""
        
        self.rate_limiters[config.name] = config
        self.logger.info(f"Rate limiter added: {config.name}")
    
    @asynccontextmanager
    async def circuit_breaker(self, name: str, operation_name: str = None):
        """Circuit breaker context manager"""
        
        if name not in self.circuit_breakers:
            # No circuit breaker configured, allow operation
            yield
            return
        
        breaker_state = self.circuit_breakers[name]
        config = self.circuit_configs[name]
        
        # Check if circuit is open
        if breaker_state.state == CircuitBreakerState.OPEN:
            # Check if timeout has passed
            if (datetime.utcnow() - breaker_state.state_changed_at).total_seconds() >= config.timeout_seconds:
                # Move to half-open state
                breaker_state.state = CircuitBreakerState.HALF_OPEN
                breaker_state.state_changed_at = datetime.utcnow()
                self.logger.info(f"Circuit breaker {name} moved to HALF_OPEN")
            else:
                # Circuit is still open, reject request
                await self._record_circuit_breaker_rejection(name, operation_name)
                raise CircuitBreakerOpenError(f"Circuit breaker {name} is OPEN")
        
        # Check if circuit is half-open and we should limit requests
        if breaker_state.state == CircuitBreakerState.HALF_OPEN:
            if breaker_state.request_count >= 1:  # Only allow one request in half-open
                await self._record_circuit_breaker_rejection(name, operation_name)
                raise CircuitBreakerOpenError(f"Circuit breaker {name} is HALF_OPEN")
        
        # Record request start
        start_time = time.time()
        breaker_state.request_count += 1
        
        try:
            # Execute the operation
            yield
            
            # Operation succeeded
            duration = time.time() - start_time
            await self._record_circuit_breaker_success(name, duration, operation_name)
            
        except Exception as e:
            # Operation failed
            duration = time.time() - start_time
            await self._record_circuit_breaker_failure(name, duration, str(e), operation_name)
            raise
    
    async def _record_circuit_breaker_success(self, name: str, duration: float, operation_name: str = None):
        """Record successful circuit breaker operation"""
        
        breaker_state = self.circuit_breakers[name]
        config = self.circuit_configs[name]
        current_time = datetime.utcnow()
        
        # Record success
        breaker_state.success_count += 1
        breaker_state.last_success_time = current_time
        breaker_state.recent_requests.append({
            'timestamp': current_time,
            'success': True,
            'duration': duration,
            'operation': operation_name
        })
        
        # Update state based on current state
        if breaker_state.state == CircuitBreakerState.HALF_OPEN:
            if breaker_state.success_count >= config.success_threshold:
                # Move to closed state
                breaker_state.state = CircuitBreakerState.CLOSED
                breaker_state.state_changed_at = current_time
                breaker_state.failure_count = 0
                breaker_state.success_count = 0
                
                self.logger.info(f"Circuit breaker {name} CLOSED after recovery")
                
                # Record recovery event
                await enhanced_sentry.capture_business_event(
                    "circuit_breaker_recovered",
                    f"Circuit breaker {name} recovered",
                    {
                        'circuit_breaker': name,
                        'business_impact': config.business_impact,
                        'service_tier': config.service_tier.value
                    }
                )
                
                self.resilience_metrics['recovery_events'][name] += 1
    
    async def _record_circuit_breaker_failure(self, name: str, duration: float, error: str, operation_name: str = None):
        """Record failed circuit breaker operation"""
        
        breaker_state = self.circuit_breakers[name]
        config = self.circuit_configs[name]
        current_time = datetime.utcnow()
        
        # Record failure
        breaker_state.failure_count += 1
        breaker_state.last_failure_time = current_time
        breaker_state.recent_requests.append({
            'timestamp': current_time,
            'success': False,
            'duration': duration,
            'error': error,
            'operation': operation_name
        })
        
        # Check if we should open the circuit
        should_open = False
        
        # Check failure threshold
        if breaker_state.failure_count >= config.failure_threshold:
            should_open = True
            reason = f"failure count ({breaker_state.failure_count}) >= threshold ({config.failure_threshold})"
        
        # Check failure rate if we have enough requests
        elif len(breaker_state.recent_requests) >= config.min_requests:
            # Calculate failure rate over window
            window_start = current_time - timedelta(seconds=config.window_size_seconds)
            recent_requests = [
                r for r in breaker_state.recent_requests
                if r['timestamp'] >= window_start
            ]
            
            if len(recent_requests) >= config.min_requests:
                failure_rate = (1 - sum(1 for r in recent_requests if r['success']) / len(recent_requests)) * 100
                
                if failure_rate >= config.failure_rate_threshold:
                    should_open = True
                    reason = f"failure rate ({failure_rate:.1f}%) >= threshold ({config.failure_rate_threshold}%)"
        
        if should_open and breaker_state.state != CircuitBreakerState.OPEN:
            # Open the circuit
            breaker_state.state = CircuitBreakerState.OPEN
            breaker_state.state_changed_at = current_time
            
            self.logger.warning(f"Circuit breaker {name} OPENED: {reason}")
            
            # Alert monitoring
            await enhanced_sentry.capture_business_error(
                CircuitBreakerOpenError(f"Circuit breaker {name} opened"),
                context={
                    'circuit_breaker': name,
                    'reason': reason,
                    'business_impact': config.business_impact,
                    'service_tier': config.service_tier.value,
                    'failure_count': breaker_state.failure_count,
                    'operation': operation_name
                },
                severity=AlertSeverity.HIGH if config.service_tier in [ServiceTier.CRITICAL, ServiceTier.HIGH] else AlertSeverity.MEDIUM
            )
            
            self.resilience_metrics['circuit_breaker_trips'][name] += 1
    
    async def _record_circuit_breaker_rejection(self, name: str, operation_name: str = None):
        """Record circuit breaker rejection"""
        
        config = self.circuit_configs[name]
        
        # Log rejection
        self.logger.debug(f"Circuit breaker {name} rejected request")
        
        # Record metrics
        if 'rejections' not in self.resilience_metrics:
            self.resilience_metrics['rejections'] = defaultdict(int)
        self.resilience_metrics['rejections'][name] += 1
    
    async def rate_limit(self, limiter_name: str, client_id: str, priority: str = "standard") -> bool:
        """Check rate limit for client"""
        
        if limiter_name not in self.rate_limiters:
            return True  # No rate limiter configured
        
        config = self.rate_limiters[limiter_name]
        current_time = datetime.utcnow()
        
        # Get client's request history
        state_key = (limiter_name, client_id)
        if state_key not in self.rate_limit_state:
            self.rate_limit_state[state_key] = deque()
        
        request_history = self.rate_limit_state[state_key]
        
        # Clean old requests outside window
        window_start = current_time - timedelta(seconds=config.window_size_seconds)
        while request_history and request_history[0] < window_start:
            request_history.popleft()
        
        # Get rate limit for this priority
        priority_limit = config.priority_levels.get(priority, config.requests_per_second)
        
        # Check if under limit
        if len(request_history) < priority_limit:
            # Allow request
            request_history.append(current_time)
            return True
        else:
            # Rate limited
            self.logger.debug(f"Rate limited: {limiter_name} for client {client_id}")
            self.resilience_metrics['rate_limit_rejections'][limiter_name] += 1
            return False
    
    async def check_degradation_conditions(self, feature: str) -> bool:
        """Check if feature should be degraded"""
        
        if feature not in self.degradation_rules:
            return False
        
        rule = self.degradation_rules[feature]
        
        # Check trigger conditions
        for condition in rule['trigger_conditions']:
            if await self._evaluate_degradation_condition(condition):
                if feature not in self.current_degradations:
                    await self._activate_degradation(feature, rule)
                return True
        
        # Check if we should deactivate degradation
        if feature in self.current_degradations:
            await self._deactivate_degradation(feature)
        
        return False
    
    async def _evaluate_degradation_condition(self, condition: str) -> bool:
        """Evaluate degradation trigger condition"""
        
        if condition == "high_cpu_usage":
            # This would check actual CPU metrics
            # For now, simulate based on circuit breaker states
            critical_breakers_open = sum(
                1 for name, state in self.circuit_breakers.items()
                if (state.state == CircuitBreakerState.OPEN and 
                    self.circuit_configs[name].service_tier == ServiceTier.CRITICAL)
            )
            return critical_breakers_open > 0
        
        elif condition == "database_slow":
            # Check database circuit breaker
            db_breaker = self.circuit_breakers.get("booking_database")
            return db_breaker and db_breaker.state != CircuitBreakerState.CLOSED
        
        elif condition == "ai_service_down":
            # This would check AI service availability
            return False  # Placeholder
        
        elif condition == "high_latency":
            # Check if multiple services are experiencing high latency
            slow_services = 0
            for name, state in self.circuit_breakers.items():
                if state.recent_requests:
                    recent_durations = [r.get('duration', 0) for r in list(state.recent_requests)[-10:]]
                    avg_duration = sum(recent_durations) / len(recent_durations)
                    if avg_duration > 2.0:  # 2 second threshold
                        slow_services += 1
            
            return slow_services >= 2
        
        elif condition == "external_service_down":
            # Check external service circuit breakers
            external_breakers_open = sum(
                1 for name, state in self.circuit_breakers.items()
                if (state.state == CircuitBreakerState.OPEN and 
                    name in ["sendgrid_email", "google_calendar_sync"])
            )
            return external_breakers_open > 0
        
        return False
    
    async def _activate_degradation(self, feature: str, rule: Dict[str, Any]):
        """Activate graceful degradation for feature"""
        
        self.current_degradations.add(feature)
        
        self.logger.warning(f"Activating degradation for {feature} -> {rule['fallback']}")
        
        # Record degradation activation
        await enhanced_sentry.capture_business_event(
            "graceful_degradation_activated",
            f"Feature {feature} degraded to {rule['fallback']}",
            {
                'feature': feature,
                'fallback': rule['fallback'],
                'business_impact': rule['business_impact']
            }
        )
        
        self.resilience_metrics['degradation_activations'][feature] += 1
    
    async def _deactivate_degradation(self, feature: str):
        """Deactivate graceful degradation for feature"""
        
        if feature in self.current_degradations:
            self.current_degradations.remove(feature)
            
            self.logger.info(f"Deactivating degradation for {feature}")
            
            # Record degradation deactivation
            await enhanced_sentry.capture_business_event(
                "graceful_degradation_deactivated",
                f"Feature {feature} restored to normal operation",
                {'feature': feature}
            )
    
    def get_fallback_implementation(self, feature: str) -> Optional[str]:
        """Get fallback implementation for degraded feature"""
        
        if feature in self.current_degradations:
            rule = self.degradation_rules.get(feature, {})
            return rule.get('fallback')
        
        return None
    
    async def perform_health_checks(self):
        """Perform health checks for all services"""
        
        # Check circuit breaker health
        for name, breaker_state in self.circuit_breakers.items():
            config = self.circuit_configs[name]
            
            # If circuit has been open for recovery timeout, try to reset
            if (breaker_state.state == CircuitBreakerState.OPEN and
                (datetime.utcnow() - breaker_state.state_changed_at).total_seconds() >= config.recovery_timeout):
                
                # Try health check
                if await self._perform_service_health_check(name):
                    # Reset circuit breaker
                    breaker_state.state = CircuitBreakerState.HALF_OPEN
                    breaker_state.state_changed_at = datetime.utcnow()
                    breaker_state.failure_count = 0
                    breaker_state.success_count = 0
                    
                    self.logger.info(f"Circuit breaker {name} reset to HALF_OPEN after health check")
    
    async def _perform_service_health_check(self, service_name: str) -> bool:
        """Perform health check for specific service"""
        
        try:
            if service_name == "stripe_payment_api":
                # Check Stripe API health
                async with httpx.AsyncClient() as client:
                    response = await client.get("https://status.stripe.com/api/v2/status.json", timeout=5.0)
                    return response.status_code == 200
            
            elif service_name == "sendgrid_email":
                # Check SendGrid API health
                # This would need actual API key, for now return True
                return True
            
            elif service_name == "booking_database":
                # Check database health
                # This would need actual database connection, for now return True
                return True
            
            else:
                # Default health check
                return True
                
        except Exception as e:
            self.logger.error(f"Health check failed for {service_name}: {e}")
            return False
    
    def _start_monitoring(self):
        """Start background monitoring tasks"""
        if self._monitoring_task is None:
            self._monitoring_task = asyncio.create_task(self._monitoring_loop())
    
    async def _monitoring_loop(self):
        """Background monitoring loop"""
        while not self._stop_monitoring:
            try:
                # Perform health checks
                await self.perform_health_checks()
                
                # Check degradation conditions
                for feature in self.degradation_rules:
                    await self.check_degradation_conditions(feature)
                
                # Clean up old rate limit state
                self._cleanup_rate_limit_state()
                
                # Wait for next check
                await asyncio.sleep(30)
                
            except Exception as e:
                self.logger.error(f"Resilience monitoring error: {e}")
                await asyncio.sleep(60)
    
    def _cleanup_rate_limit_state(self):
        """Clean up old rate limit state"""
        
        current_time = datetime.utcnow()
        
        # Clean up rate limit state older than 1 hour
        cutoff_time = current_time - timedelta(hours=1)
        
        for state_key in list(self.rate_limit_state.keys()):
            request_history = self.rate_limit_state[state_key]
            
            # Remove old requests
            while request_history and request_history[0] < cutoff_time:
                request_history.popleft()
            
            # Remove empty histories
            if not request_history:
                del self.rate_limit_state[state_key]
    
    async def get_resilience_dashboard_data(self) -> Dict[str, Any]:
        """Get resilience dashboard data"""
        
        current_time = datetime.utcnow()
        
        # Circuit breaker status
        circuit_breaker_status = {}
        for name, state in self.circuit_breakers.items():
            config = self.circuit_configs[name]
            circuit_breaker_status[name] = {
                'state': state.state.value,
                'failure_count': state.failure_count,
                'success_count': state.success_count,
                'request_count': state.request_count,
                'service_tier': config.service_tier.value,
                'business_impact': config.business_impact,
                'last_failure': state.last_failure_time.isoformat() if state.last_failure_time != datetime.min else None,
                'state_duration_minutes': (current_time - state.state_changed_at).total_seconds() / 60
            }
        
        # Active degradations
        active_degradations = {}
        for feature in self.current_degradations:
            rule = self.degradation_rules.get(feature, {})
            active_degradations[feature] = {
                'fallback': rule.get('fallback'),
                'business_impact': rule.get('business_impact')
            }
        
        # Rate limiter status
        rate_limiter_status = {}
        for name, config in self.rate_limiters.items():
            active_clients = len([key for key in self.rate_limit_state.keys() if key[0] == name])
            rate_limiter_status[name] = {
                'requests_per_second': config.requests_per_second,
                'service_tier': config.service_tier.value,
                'active_clients': active_clients,
                'rejections_total': self.resilience_metrics['rate_limit_rejections'][name]
            }
        
        return {
            'timestamp': current_time.isoformat(),
            'circuit_breakers': circuit_breaker_status,
            'active_degradations': active_degradations,
            'rate_limiters': rate_limiter_status,
            'metrics': {
                'circuit_breaker_trips': dict(self.resilience_metrics['circuit_breaker_trips']),
                'failover_events': dict(self.resilience_metrics['failover_events']),
                'rate_limit_rejections': dict(self.resilience_metrics['rate_limit_rejections']),
                'degradation_activations': dict(self.resilience_metrics['degradation_activations']),
                'recovery_events': dict(self.resilience_metrics['recovery_events'])
            },
            'overall_health': self._calculate_overall_resilience_health()
        }
    
    def _calculate_overall_resilience_health(self) -> str:
        """Calculate overall resilience health status"""
        
        # Check critical circuit breakers
        critical_breakers_open = [
            name for name, state in self.circuit_breakers.items()
            if (state.state == CircuitBreakerState.OPEN and 
                self.circuit_configs[name].service_tier == ServiceTier.CRITICAL)
        ]
        
        if critical_breakers_open:
            return "critical"
        
        # Check high priority circuit breakers
        high_breakers_open = [
            name for name, state in self.circuit_breakers.items()
            if (state.state == CircuitBreakerState.OPEN and 
                self.circuit_configs[name].service_tier == ServiceTier.HIGH)
        ]
        
        if high_breakers_open:
            return "degraded"
        
        # Check active degradations with business impact
        high_impact_degradations = [
            feature for feature in self.current_degradations
            if self.degradation_rules.get(feature, {}).get('business_impact') in ['reduced_optimization', 'manual_intervention_required']
        ]
        
        if high_impact_degradations:
            return "degraded"
        
        return "healthy"
    
    async def stop_monitoring(self):
        """Stop resilience monitoring"""
        self._stop_monitoring = True
        if self._monitoring_task:
            self._monitoring_task.cancel()
            try:
                await self._monitoring_task
            except asyncio.CancelledError:
                pass


class CircuitBreakerOpenError(Exception):
    """Exception raised when circuit breaker is open"""
    pass


# Global resilience service
resilience_service = ResilienceService()