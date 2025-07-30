"""
Scalability Enhancement Service
Implements circuit breakers, advanced rate limiting, and horizontal scaling patterns

Features:
- Circuit breaker patterns for external services
- Advanced rate limiting with burst handling
- Request throttling and backpressure
- Load balancing and request distribution
- Horizontal scaling preparation
- Service health monitoring
"""

import asyncio
import time
import logging
from typing import Dict, List, Optional, Callable, Any
from dataclasses import dataclass, field
from enum import Enum
from collections import defaultdict, deque
import random
import hashlib
import json
from concurrent.futures import ThreadPoolExecutor
import aiohttp
import redis.asyncio as redis

logger = logging.getLogger(__name__)

class CircuitBreakerState(Enum):
    """Circuit breaker states"""
    CLOSED = "closed"      # Normal operation
    OPEN = "open"         # Failing - reject requests
    HALF_OPEN = "half_open"  # Testing - allow limited requests

@dataclass
class CircuitBreakerConfig:
    """Circuit breaker configuration"""
    failure_threshold: int = 5  # Failures before opening
    timeout_seconds: int = 60   # Time before trying half-open
    success_threshold: int = 3  # Successes before closing from half-open
    request_timeout: float = 30.0  # Individual request timeout
    monitoring_window: int = 300   # Window for failure tracking (seconds)

@dataclass
class RateLimitConfig:
    """Rate limiting configuration"""
    requests_per_minute: int
    burst_size: int
    window_size: int = 60  # seconds
    penalty_multiplier: float = 2.0  # Penalty for exceeding limits

class CircuitBreakerException(Exception):
    """Exception raised when circuit breaker is open"""
    pass

class RateLimitExceededException(Exception):
    """Exception raised when rate limit is exceeded"""
    pass

class CircuitBreaker:
    """Circuit breaker implementation for external service calls"""
    
    def __init__(self, name: str, config: CircuitBreakerConfig):
        self.name = name
        self.config = config
        self.state = CircuitBreakerState.CLOSED
        self.failure_count = 0
        self.success_count = 0
        self.last_failure_time = 0
        self.last_request_time = 0
        self.request_history = deque(maxlen=1000)  # Keep last 1000 requests
        
    async def call(self, func: Callable, *args, **kwargs):
        """Execute function through circuit breaker"""
        self._update_state()
        
        if self.state == CircuitBreakerState.OPEN:
            raise CircuitBreakerException(f"Circuit breaker {self.name} is OPEN")
        
        if self.state == CircuitBreakerState.HALF_OPEN and self.success_count >= self.config.success_threshold:
            self.state = CircuitBreakerState.CLOSED
            self.failure_count = 0
            self.success_count = 0
            logger.info(f"Circuit breaker {self.name} closed after successful recovery")
        
        start_time = time.time()
        try:
            # Execute with timeout
            result = await asyncio.wait_for(
                func(*args, **kwargs),
                timeout=self.config.request_timeout
            )
            
            # Record success
            execution_time = time.time() - start_time
            self._record_success(execution_time)
            
            return result
            
        except (asyncio.TimeoutError, Exception) as e:
            # Record failure
            execution_time = time.time() - start_time
            self._record_failure(execution_time, str(e))
            raise
    
    def _update_state(self):
        """Update circuit breaker state based on current conditions"""
        current_time = time.time()
        
        if self.state == CircuitBreakerState.OPEN:
            if current_time - self.last_failure_time >= self.config.timeout_seconds:
                self.state = CircuitBreakerState.HALF_OPEN
                self.success_count = 0
                logger.info(f"Circuit breaker {self.name} moved to HALF_OPEN")
        
        # Clean old failures from monitoring window
        cutoff_time = current_time - self.config.monitoring_window
        self.request_history = deque([
            req for req in self.request_history 
            if req['timestamp'] > cutoff_time
        ], maxlen=1000)
        
        # Recalculate failure count based on recent history
        recent_failures = sum(1 for req in self.request_history if not req['success'])
        self.failure_count = recent_failures
    
    def _record_success(self, execution_time: float):
        """Record successful request"""
        self.request_history.append({
            'timestamp': time.time(),
            'success': True,
            'execution_time': execution_time
        })
        
        if self.state == CircuitBreakerState.HALF_OPEN:
            self.success_count += 1
        elif self.state == CircuitBreakerState.CLOSED and self.failure_count > 0:
            self.failure_count = max(0, self.failure_count - 1)  # Gradual recovery
    
    def _record_failure(self, execution_time: float, error: str):
        """Record failed request"""
        current_time = time.time()
        
        self.request_history.append({
            'timestamp': current_time,
            'success': False,
            'execution_time': execution_time,
            'error': error
        })
        
        self.failure_count += 1
        self.last_failure_time = current_time
        
        # Check if we should open the circuit
        if (self.state == CircuitBreakerState.CLOSED and 
            self.failure_count >= self.config.failure_threshold):
            self.state = CircuitBreakerState.OPEN
            logger.warning(f"Circuit breaker {self.name} opened after {self.failure_count} failures")
        elif self.state == CircuitBreakerState.HALF_OPEN:
            self.state = CircuitBreakerState.OPEN
            logger.warning(f"Circuit breaker {self.name} reopened during half-open test")
    
    def get_stats(self) -> Dict:
        """Get circuit breaker statistics"""
        recent_requests = len(self.request_history)
        recent_failures = sum(1 for req in self.request_history if not req['success'])
        
        avg_response_time = 0
        if self.request_history:
            avg_response_time = sum(req['execution_time'] for req in self.request_history) / len(self.request_history)
        
        return {
            "name": self.name,
            "state": self.state.value,
            "failure_count": self.failure_count,
            "success_count": self.success_count,
            "recent_requests": recent_requests,
            "recent_failures": recent_failures,
            "failure_rate": recent_failures / recent_requests if recent_requests > 0 else 0,
            "avg_response_time": avg_response_time,
            "last_failure_time": self.last_failure_time,
            "config": {
                "failure_threshold": self.config.failure_threshold,
                "timeout_seconds": self.config.timeout_seconds,
                "success_threshold": self.config.success_threshold
            }
        }

class AdvancedRateLimiter:
    """Advanced rate limiter with burst handling and adaptive limits"""
    
    def __init__(self, redis_client: Optional[redis.Redis] = None):
        self.redis_client = redis_client
        self.local_store = defaultdict(deque)  # Fallback for development
        self.rate_limits: Dict[str, RateLimitConfig] = {}
        self.adaptive_limits: Dict[str, float] = {}  # Dynamic limit adjustments
        
    def configure_rate_limit(self, path_pattern: str, config: RateLimitConfig):
        """Configure rate limit for a path pattern"""
        self.rate_limits[path_pattern] = config
        logger.info(f"Configured rate limit for {path_pattern}: {config.requests_per_minute}/min")
    
    async def check_rate_limit(self, key: str, path: str) -> bool:
        """Check if request is within rate limits"""
        config = self._get_rate_limit_config(path)
        if not config:
            return True  # No limit configured
        
        current_time = time.time()
        window_start = current_time - config.window_size
        
        # Get current request count
        if self.redis_client:
            request_count = await self._check_redis_rate_limit(key, window_start, config)
        else:
            request_count = await self._check_local_rate_limit(key, window_start, config)
        
        # Apply adaptive limits
        effective_limit = self._get_effective_limit(path, config)
        
        if request_count >= effective_limit:
            # Apply penalty for exceeding limits
            self._apply_rate_limit_penalty(key, config)
            return False
        
        # Record this request
        await self._record_request(key, current_time)
        return True
    
    def _get_rate_limit_config(self, path: str) -> Optional[RateLimitConfig]:
        """Get rate limit configuration for path"""
        import re
        
        for pattern, config in self.rate_limits.items():
            if re.match(pattern, path):
                return config
        return None
    
    def _get_effective_limit(self, path: str, config: RateLimitConfig) -> int:
        """Get effective rate limit (may be adjusted based on system load)"""
        base_limit = config.requests_per_minute
        
        # Apply adaptive adjustment if configured
        if path in self.adaptive_limits:
            adjustment_factor = self.adaptive_limits[path]
            return int(base_limit * adjustment_factor)
        
        return base_limit
    
    async def _check_redis_rate_limit(self, key: str, window_start: float, config: RateLimitConfig) -> int:
        """Check rate limit using Redis backend"""
        try:
            # Use Redis sorted set for time-based rate limiting
            pipe = self.redis_client.pipeline()
            
            # Remove old entries
            pipe.zremrangebyscore(key, 0, window_start)
            
            # Count current entries
            pipe.zcard(key)
            
            # Set expiration
            pipe.expire(key, config.window_size + 60)  # Add buffer
            
            results = await pipe.execute()
            return results[1]  # Count result
            
        except Exception as e:
            logger.error(f"Redis rate limiting error: {e}")
            # Fall back to local rate limiting
            return await self._check_local_rate_limit(key, window_start, config)
    
    async def _check_local_rate_limit(self, key: str, window_start: float, config: RateLimitConfig) -> int:
        """Check rate limit using local memory (development fallback)"""
        request_times = self.local_store[key]
        
        # Remove old entries
        while request_times and request_times[0] < window_start:
            request_times.popleft()
        
        return len(request_times)
    
    async def _record_request(self, key: str, timestamp: float):
        """Record a request for rate limiting"""
        if self.redis_client:
            try:
                # Add to Redis sorted set
                await self.redis_client.zadd(key, {str(timestamp): timestamp})
            except Exception as e:
                logger.error(f"Redis request recording error: {e}")
                # Fall back to local storage
                self.local_store[key].append(timestamp)
        else:
            self.local_store[key].append(timestamp)
    
    def _apply_rate_limit_penalty(self, key: str, config: RateLimitConfig):
        """Apply penalty for exceeding rate limits"""
        # Could implement progressive penalties, temporary bans, etc.
        logger.warning(f"Rate limit exceeded for key: {key}")
    
    def adjust_rate_limit(self, path: str, factor: float):
        """Dynamically adjust rate limit based on system conditions"""
        self.adaptive_limits[path] = factor
        logger.info(f"Adjusted rate limit for {path} by factor {factor}")
    
    def get_rate_limit_stats(self) -> Dict:
        """Get rate limiting statistics"""
        stats = {
            "configured_limits": len(self.rate_limits),
            "adaptive_adjustments": len(self.adaptive_limits),
            "backend": "redis" if self.redis_client else "local",
            "rate_limits": {}
        }
        
        for pattern, config in self.rate_limits.items():
            stats["rate_limits"][pattern] = {
                "requests_per_minute": config.requests_per_minute,
                "burst_size": config.burst_size,
                "window_size": config.window_size,
                "adaptive_factor": self.adaptive_limits.get(pattern, 1.0)
            }
        
        return stats

class RequestThrottler:
    """Request throttling with backpressure and queue management"""
    
    def __init__(self, max_concurrent: int = 100, queue_size: int = 1000):
        self.max_concurrent = max_concurrent
        self.queue_size = queue_size
        self.active_requests = 0
        self.request_queue = asyncio.Queue(maxsize=queue_size)
        self.semaphore = asyncio.Semaphore(max_concurrent)
        self.throttling_active = False
        
        # Statistics
        self.total_requests = 0
        self.throttled_requests = 0
        self.rejected_requests = 0
        
    async def throttle_request(self, func: Callable, *args, **kwargs):
        """Execute request through throttling mechanism"""
        self.total_requests += 1
        
        # Check if we should throttle
        if self.active_requests >= self.max_concurrent:
            if self.request_queue.full():
                self.rejected_requests += 1
                raise Exception("Request rejected - system overloaded")
            
            # Queue the request
            self.throttled_requests += 1
            await self.request_queue.put((func, args, kwargs))
            
            # Wait for queue processing
            return await self._process_queued_request()
        
        # Execute immediately
        return await self._execute_with_semaphore(func, *args, **kwargs)
    
    async def _execute_with_semaphore(self, func: Callable, *args, **kwargs):
        """Execute function with concurrency control"""
        async with self.semaphore:
            self.active_requests += 1
            try:
                return await func(*args, **kwargs)
            finally:
                self.active_requests -= 1
    
    async def _process_queued_request(self):
        """Process a queued request"""
        func, args, kwargs = await self.request_queue.get()
        return await self._execute_with_semaphore(func, *args, **kwargs)
    
    def get_throttle_stats(self) -> Dict:
        """Get throttling statistics"""
        return {
            "max_concurrent": self.max_concurrent,
            "active_requests": self.active_requests,
            "queue_size": self.request_queue.qsize(),
            "queue_capacity": self.queue_size,
            "total_requests": self.total_requests,
            "throttled_requests": self.throttled_requests,
            "rejected_requests": self.rejected_requests,
            "throttle_rate": self.throttled_requests / self.total_requests if self.total_requests > 0 else 0
        }

class LoadBalancer:
    """Simple load balancer for distributing requests across service instances"""
    
    def __init__(self):
        self.service_instances: Dict[str, List[Dict]] = defaultdict(list)
        self.round_robin_counters: Dict[str, int] = defaultdict(int)
        
    def register_instance(self, service_name: str, instance_info: Dict):
        """Register a service instance"""
        instance_info.setdefault('weight', 1)
        instance_info.setdefault('healthy', True)
        instance_info.setdefault('response_time', 0.0)
        
        self.service_instances[service_name].append(instance_info)
        logger.info(f"Registered instance for {service_name}: {instance_info}")
    
    def get_instance(self, service_name: str, strategy: str = "round_robin") -> Optional[Dict]:
        """Get service instance using specified strategy"""
        instances = [
            instance for instance in self.service_instances.get(service_name, [])
            if instance.get('healthy', True)
        ]
        
        if not instances:
            return None
        
        if strategy == "round_robin":
            return self._round_robin_selection(service_name, instances)
        elif strategy == "weighted":
            return self._weighted_selection(instances)
        elif strategy == "least_response_time":
            return self._least_response_time_selection(instances)
        else:
            return random.choice(instances)  # Random fallback
    
    def _round_robin_selection(self, service_name: str, instances: List[Dict]) -> Dict:
        """Round-robin instance selection"""
        counter = self.round_robin_counters[service_name]
        instance = instances[counter % len(instances)]
        self.round_robin_counters[service_name] = counter + 1
        return instance
    
    def _weighted_selection(self, instances: List[Dict]) -> Dict:
        """Weighted instance selection"""
        total_weight = sum(instance.get('weight', 1) for instance in instances)
        random_weight = random.uniform(0, total_weight)
        
        current_weight = 0
        for instance in instances:
            current_weight += instance.get('weight', 1)
            if random_weight <= current_weight:
                return instance
        
        return instances[-1]  # Fallback
    
    def _least_response_time_selection(self, instances: List[Dict]) -> Dict:
        """Select instance with lowest response time"""
        return min(instances, key=lambda x: x.get('response_time', float('inf')))
    
    def update_instance_health(self, service_name: str, instance_id: str, healthy: bool):
        """Update instance health status"""
        for instance in self.service_instances.get(service_name, []):
            if instance.get('id') == instance_id:
                instance['healthy'] = healthy
                logger.info(f"Updated health for {service_name}:{instance_id} -> {healthy}")
                break
    
    def update_instance_response_time(self, service_name: str, instance_id: str, response_time: float):
        """Update instance response time"""
        for instance in self.service_instances.get(service_name, []):
            if instance.get('id') == instance_id:
                instance['response_time'] = response_time
                break

class ScalabilityEnhancementService:
    """Main scalability enhancement service coordinating all components"""
    
    def __init__(self, redis_url: Optional[str] = None):
        self.circuit_breakers: Dict[str, CircuitBreaker] = {}
        self.rate_limiter = AdvancedRateLimiter()
        self.throttler = RequestThrottler()
        self.load_balancer = LoadBalancer()
        
        # Initialize Redis if available
        self.redis_client = None
        if redis_url:
            self.redis_client = redis.from_url(redis_url)
            self.rate_limiter.redis_client = self.redis_client
        
        # System health monitoring
        self.system_health = {
            "cpu_usage": 0.0,
            "memory_usage": 0.0,
            "active_connections": 0,
            "last_check": time.time()
        }
        
    def create_circuit_breaker(self, name: str, config: CircuitBreakerConfig) -> CircuitBreaker:
        """Create and register a circuit breaker"""
        circuit_breaker = CircuitBreaker(name, config)
        self.circuit_breakers[name] = circuit_breaker
        logger.info(f"Created circuit breaker: {name}")
        return circuit_breaker
    
    def get_circuit_breaker(self, name: str) -> Optional[CircuitBreaker]:
        """Get circuit breaker by name"""
        return self.circuit_breakers.get(name)
    
    def configure_rate_limits(self):
        """Configure default rate limits for common endpoints"""
        rate_limits = {
            r"/api/v2/auth/login": RateLimitConfig(requests_per_minute=10, burst_size=5),
            r"/api/v2/auth/register": RateLimitConfig(requests_per_minute=5, burst_size=2),
            r"/api/v2/payments/.*": RateLimitConfig(requests_per_minute=20, burst_size=10),
            r"/api/v2/appointments/.*": RateLimitConfig(requests_per_minute=100, burst_size=50),
            r"/api/v2/analytics/.*": RateLimitConfig(requests_per_minute=50, burst_size=25),
            r"/api/v2/public/.*": RateLimitConfig(requests_per_minute=200, burst_size=100)
        }
        
        for pattern, config in rate_limits.items():
            self.rate_limiter.configure_rate_limit(pattern, config)
    
    async def setup_default_circuit_breakers(self):
        """Setup circuit breakers for external services"""
        external_services = {
            "stripe": CircuitBreakerConfig(failure_threshold=3, timeout_seconds=60),
            "sendgrid": CircuitBreakerConfig(failure_threshold=5, timeout_seconds=120),
            "twilio": CircuitBreakerConfig(failure_threshold=5, timeout_seconds=120),
            "google_calendar": CircuitBreakerConfig(failure_threshold=3, timeout_seconds=180),
            "google_ads": CircuitBreakerConfig(failure_threshold=5, timeout_seconds=300)
        }
        
        for service_name, config in external_services.items():
            self.create_circuit_breaker(service_name, config)
    
    async def monitor_system_health(self):
        """Monitor system health and adjust limits accordingly"""
        import psutil
        
        cpu_usage = psutil.cpu_percent(interval=1)
        memory_usage = psutil.virtual_memory().percent
        
        self.system_health.update({
            "cpu_usage": cpu_usage,
            "memory_usage": memory_usage,
            "last_check": time.time()
        })
        
        # Adjust rate limits based on system health
        if cpu_usage > 80 or memory_usage > 85:
            # Reduce rate limits by 50% under high load
            for pattern in self.rate_limiter.rate_limits.keys():
                self.rate_limiter.adjust_rate_limit(pattern, 0.5)
            logger.warning(f"High system load detected - reducing rate limits (CPU: {cpu_usage}%, Memory: {memory_usage}%)")
        
        elif cpu_usage < 50 and memory_usage < 70:
            # Restore normal rate limits under low load
            for pattern in self.rate_limiter.rate_limits.keys():
                if pattern in self.rate_limiter.adaptive_limits:
                    self.rate_limiter.adjust_rate_limit(pattern, 1.0)
    
    def get_comprehensive_stats(self) -> Dict:
        """Get comprehensive scalability statistics"""
        return {
            "circuit_breakers": {
                name: cb.get_stats() 
                for name, cb in self.circuit_breakers.items()
            },
            "rate_limiting": self.rate_limiter.get_rate_limit_stats(),
            "request_throttling": self.throttler.get_throttle_stats(),
            "load_balancer": {
                "services": len(self.load_balancer.service_instances),
                "total_instances": sum(
                    len(instances) for instances in self.load_balancer.service_instances.values()
                )
            },
            "system_health": self.system_health,
            "redis_connected": self.redis_client is not None
        }

# Global scalability service instance
scalability_service = ScalabilityEnhancementService()

async def initialize_scalability_enhancements(redis_url: Optional[str] = None):
    """Initialize scalability enhancement service"""
    global scalability_service
    
    if redis_url:
        scalability_service = ScalabilityEnhancementService(redis_url)
    
    # Configure default settings
    scalability_service.configure_rate_limits()
    await scalability_service.setup_default_circuit_breakers()
    
    # Start system health monitoring
    asyncio.create_task(periodic_health_monitoring())
    
    logger.info("Scalability enhancements initialized successfully")

async def periodic_health_monitoring():
    """Periodic system health monitoring task"""
    while True:
        try:
            await scalability_service.monitor_system_health()
            await asyncio.sleep(60)  # Check every minute
        except Exception as e:
            logger.error(f"Error in health monitoring: {e}")
            await asyncio.sleep(60)

def get_scalability_stats() -> Dict:
    """Get scalability service statistics"""
    return scalability_service.get_comprehensive_stats()